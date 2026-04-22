import JSZip from 'jszip';

// --- Constants & Types ---
const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2MB
type ExportScope = 'highlighted' | 'all';

const BLACKLIST_SCHEMES = ['chrome://', 'file://', 'edge://', 'about:', 'brave://', 'view-source:', 'moz-extension://'];

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
  if (info.menuItemId === 'export-zip-highlighted') {
    await handleExport('highlighted');
  } else if (info.menuItemId === 'export-zip-all') {
    await handleExport('all');
  }
});

async function handleExport(scope: ExportScope) {
  try {
    const queryOptions = scope === 'highlighted' ? { highlighted: true, currentWindow: true } : {};
    const tabs = await chrome.tabs.query(queryOptions);

    const filteredTabs = tabs.filter(
      (t) => t.id !== undefined && t.url !== undefined && !BLACKLIST_SCHEMES.some(s => t.url?.startsWith(s))
    );

    if (filteredTabs.length === 0) {
      console.warn('No valid tabs to export.');
      return;
    }

    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // 1. Collect all data first
    const results = await Promise.all(
      filteredTabs.map(async (t, index) => {
        try {
          const urlString = t.url || '';
          const url = new URL(urlString);
          const rawTitle = (t.title || `tab-${index}`).replace(/[\/\\?%*:|"<>]/g, '_');

          // 1. Get info from the tab
          const scriptingResults = await chrome.scripting.executeScript({
            target: { tabId: t.id! }, // id is checked in filter
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
          let data: string | Blob = info?.outerHTML || '';

          if (contentType === 'application/pdf' || url.pathname.toLowerCase().endsWith('.pdf')) {
            extension = 'pdf';
            const response = await fetch(urlString, { credentials: 'include' });
            data = await response.blob();
          } else if (contentType === 'text/plain') {
            extension = urlExtension || 'txt';
            data = info?.innerText || '';
          } else if (urlExtension && ['md', 'txt', 'json', 'xml', 'csv'].includes(urlExtension)) {
            extension = urlExtension;
            data = info?.innerText || info?.outerHTML || '';
          }

          return { title: rawTitle, extension, data };
        } catch (e) {
          console.error(`Failed to capture tab ${t.id}:`, e);
          return { title: `failed-tab-${index}`, extension: 'txt', data: `URL: ${t.url}\nError: ${e}` };
        }
      })
    );

    // 2. Add to ZIP with uniqueness check
    const usedNames = new Map<string, number>();
    for (const item of results) {
      let fileName = `${item.title}.${item.extension}`;
      if (usedNames.has(fileName)) {
        const count = (usedNames.get(fileName) || 0) + 1;
        usedNames.set(fileName, count);
        fileName = `${item.title} (${count}).${item.extension}`;
      } else {
        usedNames.set(fileName, 0);
      }
      zip.file(fileName, item.data);
    }

    const zipContent = await zip.generateAsync({ type: 'uint8array' });
    const filename = `tabs-archive-${timestamp}.zip`;
    await downloadFile(zipContent.buffer, 'application/zip', filename);
  } catch (error) {
    console.error('Export failed:', error);
  }
}

async function downloadFile(data: ArrayBuffer, mimeType: string, filename: string) {
  let url: string;
  const size = data.byteLength;
  let isBlob = false;

  if (size < LARGE_FILE_THRESHOLD) {
    url = `data:${mimeType};base64,${arrayBufferToBase64(data)}`;
  } else {
    url = await createBlobUrlOffscreen(data, mimeType);
    isBlob = true;
  }

  try {
    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true,
    });

    if (isBlob) {
      // Small timeout to ensure browser has started the download process
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'revoke-blob-url', url: url }).catch(e => {
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
  const contexts = await (chrome.runtime as any).getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  return contexts.length > 0;
}

async function createBlobUrlOffscreen(data: ArrayBuffer, mimeType: string): Promise<string> {
  if (!(await hasOffscreenDocument())) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.BLOBS],
      justification: 'Generate Blob URL for large ZIP downloads',
    });
  }

  const url = await chrome.runtime.sendMessage({
    type: 'create-blob-url',
    data: data,
    mimeType: mimeType,
  });

  return url;
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
