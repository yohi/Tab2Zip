import JSZip from 'jszip';

// --- Constants & Types ---
const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2MB
type ExportScope = 'highlighted' | 'all';

const BLACKLIST_SCHEMES = ['chrome://', 'file://', 'edge://', 'about:', 'brave://', 'view-source:', 'moz-extension://'];

interface TabCaptureResult {
  title: string;
  extension: string;
  capturedData: string | Blob;
}

// Define extension of chrome.runtime for getContexts
interface ChromeContext {
  contextType: string;
}

interface ChromeRuntimeWithContexts extends typeof chrome.runtime {
  getContexts: (filter: { contextTypes: string[] }) => Promise<ChromeContext[]>;
}

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

async function captureTabData(tab: { id: number; url: string; title?: string }, index: number): Promise<TabCaptureResult> {
  try {
    const urlString = tab.url;
    const url = new URL(urlString);
    
    // Secure scheme check for fetch
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Insecure protocol: ${url.protocol}`);
    }

    const rawTitle = (tab.title || `tab-${index}`).replace(/[\/\\?%*:|"<>]/g, '_');

    // 1. Get info from the tab
    const scriptingResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        contentType: document.contentType,
        outerHTML: document.documentElement.outerHTML,
        innerText: document.body.innerText,
      }),
    });
    const info = scriptingResults[0]?.result;
    const contentType = info?.contentType || '';

    // 2. Determine extension
    const pathParts = url.pathname.split('.');
    const urlExtension = pathParts.length > 1 ? pathParts.pop()?.toLowerCase() : '';

    let extension = 'html';
    let capturedHtmlOrBlob: string | Blob = info?.outerHTML || '';

    if (contentType === 'application/pdf' || url.pathname.toLowerCase().endsWith('.pdf')) {
      extension = 'pdf';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(urlString, { 
          credentials: 'include',
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        capturedHtmlOrBlob = await response.blob();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('PDF download timed out');
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    } else if (contentType === 'text/plain') {
      extension = urlExtension || 'txt';
      capturedHtmlOrBlob = info?.innerText || '';
    } else if (urlExtension && ['md', 'txt', 'json', 'xml', 'csv'].includes(urlExtension)) {
      extension = urlExtension;
      capturedHtmlOrBlob = info?.innerText || info?.outerHTML || '';
    }

    return { title: rawTitle, extension, capturedData: capturedHtmlOrBlob };
  } catch (e) {
    console.error(`Failed to capture tab ${tab.id}:`, e);
    return { title: `failed-tab-${index}`, extension: 'txt', capturedData: `URL: ${tab.url}\nError: ${e}` };
  }
}

async function handleExport(scope: ExportScope) {
  try {
    const queryOptions = scope === 'highlighted' ? { highlighted: true, currentWindow: true } : {};
    const tabs = await chrome.tabs.query(queryOptions);

    const filteredTabs = tabs.flatMap((t) => {
      if (t.id !== undefined && t.url !== undefined && !BLACKLIST_SCHEMES.some(s => t.url?.startsWith(s))) {
        return [{ id: t.id, url: t.url, title: t.title }];
      }
      return [];
    });

    if (filteredTabs.length === 0) {
      console.warn('No valid tabs to export.');
      return;
    }

    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // 1. Collect all data first
    const results = await Promise.all(
      filteredTabs.map((t, index) => captureTabData(t, index))
    );

    // 2. Add to ZIP with uniqueness check
    const usedNames = new Map<string, number>();
    for (const item of results) {
      let fileName = `${item.title}.${item.extension}`;
      const existingCount = usedNames.get(fileName);
      if (existingCount !== undefined) {
        const newCount = existingCount + 1;
        usedNames.set(fileName, newCount);
        fileName = `${item.title} (${newCount}).${item.extension}`;
      } else {
        usedNames.set(fileName, 0);
      }
      zip.file(fileName, item.capturedData);
    }

    const zipContent = await zip.generateAsync({ type: 'uint8array' });
    const filename = `tabs-archive-${timestamp}.zip`;
    await downloadFile(zipContent.buffer, 'application/zip', filename);
  } catch (error) {
    console.error('Export failed:', error);
  }
}

async function downloadFile(data: ArrayBuffer, mimeType: string, filename: string) {
  let downloadUrl: string;
  const size = data.byteLength;
  let isBlob = false;

  if (size < LARGE_FILE_THRESHOLD) {
    downloadUrl = `data:${mimeType};base64,${arrayBufferToBase64(data)}`;
  } else {
    downloadUrl = await createBlobUrlOffscreen(data, mimeType);
    isBlob = true;
  }

  try {
    await chrome.downloads.download({
      url: downloadUrl,
      filename: filename,
      saveAs: true,
    });

    if (isBlob) {
      // Small timeout to ensure browser has started the download process
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'revoke-blob-url', url: downloadUrl }).catch(e => {
          console.error('Failed to send revoke message:', e);
        });
      }, 10000);
    }
  } catch (err) {
    console.error('Download failed:', err);
  }
}

async function hasOffscreenDocument(): Promise<boolean> {
  // @ts-ignore: chrome.offscreen.hasDocument is available in newer versions
  if (typeof chrome.offscreen.hasDocument === 'function') {
    // @ts-ignore
    return await chrome.offscreen.hasDocument();
  }
  // Fallback: check all clients
  const runtime = chrome.runtime as unknown as ChromeRuntimeWithContexts;
  if (typeof runtime.getContexts === 'function') {
    const contexts = await runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    return contexts.length > 0;
  }
  return false;
}

async function createBlobUrlOffscreen(data: ArrayBuffer, mimeType: string): Promise<string> {
  if (!(await hasOffscreenDocument())) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.BLOBS],
      justification: 'Generate Blob URL for large ZIP downloads',
    });
  }

  const blobUrl = await chrome.runtime.sendMessage({
    type: 'create-blob-url',
    data: data,
    mimeType: mimeType,
  }) as string;

  return blobUrl;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 0x8000; // 32KB
  const chunks: string[] = [];
  
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    chunks.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK_SIZE))));
  }
  
  return btoa(chunks.join(''));
}
