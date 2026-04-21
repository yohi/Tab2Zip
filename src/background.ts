import JSZip from 'jszip';

// --- Constants & Types ---
const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2MB
type ExportScope = 'highlighted' | 'all';

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
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'export-zip-highlighted') {
    handleExport('highlighted');
  } else if (info.menuItemId === 'export-zip-all') {
    handleExport('all');
  }
});

async function handleExport(scope: ExportScope) {
  try {
    const queryOptions = scope === 'highlighted' ? { highlighted: true, currentWindow: true } : {};
    const tabs = await chrome.tabs.query(queryOptions);

    const filteredTabs = tabs.filter(
      (t) => t.id && t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('file://')
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
          const urlString = t.url!;
          const url = new URL(urlString);
          const rawTitle = (t.title || `tab-${index}`).replace(/[\/\\?%*:|"<>]/g, '_');

          // 1. Get info from the tab
          const scriptingResults = await chrome.scripting.executeScript({
            target: { tabId: t.id! },
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
            const response = await fetch(urlString);
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
        const count = usedNames.get(fileName)! + 1;
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

  if (size < LARGE_FILE_THRESHOLD) {
    url = `data:${mimeType};base64,${arrayBufferToBase64(data)}`;
  } else {
    url = await createBlobUrlOffscreen(data, mimeType);
  }

  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true,
  });
}

async function createBlobUrlOffscreen(data: ArrayBuffer, mimeType: string): Promise<string> {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.LOCAL_STORAGE],
    justification: 'Generate Blob URL for large ZIP downloads',
  });

  const url = await chrome.runtime.sendMessage({
    type: 'create-blob-url',
    data: data,
    mimeType: mimeType,
  });

  await chrome.offscreen.closeDocument();
  return url;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
