import JSZip from 'jszip';

// --- Constants & Types ---
const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2MB
type ExportScope = 'highlighted' | 'all';

const BLACKLIST_SCHEMES = ['chrome://', 'file://', 'edge://', 'about:', 'brave://', 'view-source:', 'moz-extension://'];

interface TabCaptureResult {
  title: string;
  extension: string;
  fileContent: string | Blob;
}

interface ChromeContext {
  contextId: string;
  contextType: string;
}

type ChromeRuntimeWithContexts = typeof chrome.runtime & {
  getContexts: (filter: { contextTypes: string[] }) => Promise<ChromeContext[]>;
};

// --- Initialization ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'export-zip-highlighted',
      title: 'Download Highlighted Tabs as ZIP',
      contexts: ['action', 'page'],
    });

    chrome.contextMenus.create({
      id: 'export-zip-all',
      title: 'Download All Tabs as ZIP',
      contexts: ['action', 'page'],
    });
  });
});

// --- Event Handling ---
chrome.contextMenus.onClicked.addListener(async (info) => {
  try {
    if (info.menuItemId === 'export-zip-highlighted') {
      await handleExport('highlighted');
    } else if (info.menuItemId === 'export-zip-all') {
      await handleExport('all');
    }
  } catch (error) {
    console.error('Menu click handler failed:', error);
  }
});

let offscreenCreationPromise: Promise<void> | null = null;

/**
 * Validates the URL to mitigate SSRF risks.
 */
function isValidFetchUrl(url: URL): boolean {
  // Only allow http and https
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  // Block common local/private hostnames
  const blockedHosts = ['localhost'];
  if (blockedHosts.includes(hostname)) return false;

  // Simple IP check for RFC1918, link-local, loopback, etc.
  // Note: True DNS resolution isn't available via standard extension APIs,
  // but we can block literal IP addresses in restricted ranges.
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^\[([a-fA-F0-9:]+)\]$/;
  if (ipRegex.test(hostname)) {
    // IPv4 check
    if (!hostname.includes(':')) {
      const parts = hostname.split('.').map(Number);
      if (parts[0] === 10) return false; // 10.0.0.0/8
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false; // 172.16.0.0/12
      if (parts[0] === 192 && parts[1] === 168) return false; // 192.168.0.0/16
      if (parts[0] === 127) return false; // 127.0.0.0/8
      if (parts[0] === 169 && parts[1] === 254) return false; // 169.254.0.0/16
      if (parts[0] === 0) return false; // 0.0.0.0/8
      if (parts[0] >= 224) return false; // Multicast/Reserved
    } else {
      // IPv6 check (basic)
      const v6 = hostname.replace(/[\[\]]/g, '').toLowerCase();
      if (v6 === '::1' || v6 === '::' || v6.startsWith('fe80:') || v6.startsWith('fc') || v6.startsWith('fd')) return false;
    }
  }

  return true;
}

async function captureTabData(tab: { id: number; url: string; title?: string }, index: number): Promise<TabCaptureResult> {
  try {
    const url = new URL(tab.url);
    if (!isValidFetchUrl(url)) {
      throw new Error(`Invalid or insecure URL: ${tab.url}`);
    }

    const safeTitle = (tab.title || `tab-${index}`).replace(/[\/\\?%*:|"<>]/g, '_');

    const scriptingResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        contentType: document.contentType,
        outerHTML: document.documentElement.outerHTML,
        innerText: document.body?.innerText ?? document.documentElement?.innerText ?? document.body?.textContent ?? '',
      }),
    });
    
    const info = scriptingResults[0]?.result;
    const contentType = info?.contentType || '';
    const pathParts = url.pathname.split('.');
    const urlExt = pathParts.length > 1 ? pathParts.pop()?.toLowerCase() : '';

    let ext = 'html';
    let content: string | Blob = info?.outerHTML || '';

    if (contentType === 'application/pdf' || url.pathname.toLowerCase().endsWith('.pdf')) {
      ext = 'pdf';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url.toString(), { 
          credentials: 'omit',
          redirect: 'error',
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        content = await response.blob();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') throw new Error('Timeout');
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    } else if (contentType === 'text/plain') {
      ext = urlExt || 'txt';
      content = info?.innerText || '';
    } else if (urlExt && ['md', 'txt', 'json', 'xml', 'csv'].includes(urlExt)) {
      ext = urlExt;
      content = info?.innerText || info?.outerHTML || '';
    }

    return { title: safeTitle, extension: ext, fileContent: content };
  } catch (e) {
    console.error(`Failed ${tab.id}:`, e);
    return { title: `failed-${index}`, extension: 'txt', fileContent: `URL: ${tab.url}\nError: ${e}` };
  }
}

function getFilteredTabs(tabs: chrome.tabs.Tab[]) {
  return tabs.flatMap((t) => {
    if (t.id !== undefined && t.url !== undefined && !BLACKLIST_SCHEMES.some(s => t.url?.startsWith(s))) {
      return [{ id: t.id, url: t.url, title: t.title }];
    }
    return [];
  });
}

async function handleExport(scope: ExportScope) {
  try {
    const queryOptions = scope === 'highlighted' ? { highlighted: true, currentWindow: true } : {};
    const rawTabs = await chrome.tabs.query(queryOptions);
    const validTabs = getFilteredTabs(rawTabs);

    if (validTabs.length === 0) return;

    const zip = new JSZip();
    const results = await Promise.all(validTabs.map((t, i) => captureTabData(t, i)));

    const usedNames = new Map<string, number>();
    for (const item of results) {
      let fileName = `${item.title}.${item.extension}`;
      const count = usedNames.get(fileName);
      if (count !== undefined) {
        const newCount = count + 1;
        usedNames.set(fileName, newCount);
        fileName = `${item.title} (${newCount}).${item.extension}`;
      } else {
        usedNames.set(fileName, 0);
      }
      zip.file(fileName, item.fileContent);
    }

    const zipContent = await zip.generateAsync({ type: 'uint8array' });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    await downloadFile(zipContent.buffer, 'application/zip', `tabs-${ts}.zip`);
  } catch (error) {
    console.error('Export failed:', error);
  }
}

async function downloadFile(data: ArrayBufferLike, mime: string, name: string) {
  let url: string = '';
  let isBlob = false;

  try {
    if (data.byteLength < LARGE_FILE_THRESHOLD) {
      url = `data:${mime};base64,${arrayBufferToBase64(data)}`;
    } else {
      url = await createBlobUrlOffscreen(data, mime);
      isBlob = true;
    }

    const dId = await chrome.downloads.download({ url, filename: name, saveAs: true });
    if (isBlob) {
      const cleanup = () => {
        chrome.downloads.onChanged.removeListener(onChange);
        chrome.runtime.sendMessage({ type: 'revoke-blob-url', url }).catch(() => {});
        clearTimeout(timer);
      };
      const onChange = (d: chrome.downloads.DownloadDelta) => {
        if (d.id === dId && d.state && (d.state.current === 'complete' || d.state.current === 'interrupted')) cleanup();
      };
      chrome.downloads.onChanged.addListener(onChange);
      const timer = setTimeout(cleanup, 300000);
    }
  } catch (err) {
    console.error('Download error:', err);
    if (isBlob && url) {
      chrome.runtime.sendMessage({ type: 'revoke-blob-url', url }).catch(() => {});
    }
  }
}

async function hasOffscreenDocument(): Promise<boolean> {
  // @ts-ignore
  if (typeof chrome.offscreen.hasDocument === 'function') return await chrome.offscreen.hasDocument();
  const rt = chrome.runtime as unknown as ChromeRuntimeWithContexts;
  if (typeof rt.getContexts === 'function') {
    const ctxs = await rt.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    return ctxs.length > 0;
  }
  return false;
}

async function createBlobUrlOffscreen(data: ArrayBufferLike, mime: string): Promise<string> {
  if (!(await hasOffscreenDocument())) {
    if (!offscreenCreationPromise) {
      offscreenCreationPromise = (async () => {
        try {
          await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: [chrome.offscreen.Reason.BLOBS],
            justification: 'Large ZIP download',
          });
        } catch (e: any) {
          if (!e.message?.includes('Only a single offscreen document may be created')) {
            throw e;
          }
        } finally {
          offscreenCreationPromise = null;
        }
      })();
    }
    await offscreenCreationPromise;
  }
  return (await chrome.runtime.sendMessage({ type: 'create-blob-url', data, mimeType: mime })) as string;
}

function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);

  const CHUNK = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    chunks.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK))));
  }
  return btoa(chunks.join(''));
}
