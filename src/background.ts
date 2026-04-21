import { jsPDF } from 'jspdf';

// --- Constants & Types ---
const MASKED_PARAMS = ['token', 'key', 'access_token', 'auth', 'password', 'secret'];
const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2MB

type ExportFormat = 'txt' | 'md' | 'pdf';
type ExportScope = 'highlighted' | 'all';

// --- Initialization ---
chrome.runtime.onInstalled.addListener(() => {
  const scopes: { id: ExportScope; label: string }[] = [
    { id: 'highlighted', label: 'Highlighted Tabs' },
    { id: 'all', label: 'All Tabs' },
  ];

  const formats: { id: ExportFormat; label: string }[] = [
    { id: 'txt', label: 'TXT' },
    { id: 'md', label: 'Markdown' },
    { id: 'pdf', label: 'PDF' },
  ];

  scopes.forEach((scope) => {
    chrome.contextMenus.create({
      id: scope.id,
      title: `Download ${scope.label} as...`,
      contexts: ['action', 'page'],
    });

    formats.forEach((format) => {
      chrome.contextMenus.create({
        id: `${scope.id}-${format.id}`,
        parentId: scope.id,
        title: format.label,
        contexts: ['action', 'page'],
      });
    });
  });
});

// --- Event Handling ---
chrome.contextMenus.onClicked.addListener((info) => {
  const [scope, format] = (info.menuItemId as string).split('-') as [ExportScope, ExportFormat];
  if (scope && format) {
    handleExport(scope, format);
  }
});

async function handleExport(scope: ExportScope, format: ExportFormat) {
  try {
    const queryOptions = scope === 'highlighted' ? { highlighted: true, currentWindow: true } : {};
    const tabs = await chrome.tabs.query(queryOptions);

    const filteredTabs = tabs.filter(
      (t) => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('file://')
    );

    const processedData = filteredTabs.map((t) => ({
      title: t.title || 'No Title',
      url: maskUrl(t.url || ''),
    }));

    if (format === 'pdf') {
      await exportAsPdf(processedData);
    } else {
      await exportAsText(processedData, format);
    }
  } catch (error) {
    console.error('Export failed:', error);
  }
}

// --- Logic Helpers ---
function maskUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    MASKED_PARAMS.forEach((param) => {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, '<redacted>');
      }
    });
    return url.toString();
  } catch {
    return urlString;
  }
}

async function exportAsText(data: { title: string; url: string }[], format: ExportFormat) {
  let content = '';
  let mimeType = 'text/plain';
  let extension = 'txt';

  if (format === 'md') {
    content = data.map((t) => `- [${t.title}](${t.url})`).join('\n');
    mimeType = 'text/markdown';
    extension = 'md';
  } else {
    content = data.map((t) => `${t.title}\n${t.url}`).join('\n\n');
  }

  const filename = `tabs-export-${new Date().toISOString().split('T')[0]}.${extension}`;
  await downloadFile(content, mimeType, filename);
}

async function exportAsPdf(data: { title: string; url: string }[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  doc.setFontSize(16);
  doc.text('Tab Export', margin, y);
  y += 10;

  doc.setFontSize(10);
  for (const item of data) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }

    const titleLines = doc.splitTextToSize(`Title: ${item.title}`, contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 5;

    const urlLines = doc.splitTextToSize(`URL: ${item.url}`, contentWidth);
    doc.setTextColor(0, 0, 255);
    doc.text(urlLines, margin, y);
    doc.setTextColor(0, 0, 0);
    y += urlLines.length * 5 + 5;
  }

  const pdfOutput = doc.output('arraybuffer');
  const filename = `tabs-export-${new Date().toISOString().split('T')[0]}.pdf`;
  await downloadFile(pdfOutput, 'application/pdf', filename);
}

async function downloadFile(data: string | ArrayBuffer, mimeType: string, filename: string) {
  let url: string;

  const size = typeof data === 'string' ? new Blob([data]).size : data.byteLength;

  if (size < LARGE_FILE_THRESHOLD) {
    const base64 =
      typeof data === 'string'
        ? btoa(unescape(encodeURIComponent(data)))
        : arrayBufferToBase64(data);
    url = `data:${mimeType};base64,${base64}`;
  } else {
    url = await createBlobUrlOffscreen(data, mimeType);
  }

  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true,
  });

  if (url.startsWith('blob:')) {
    // Revoke URL would be good, but we need to ensure download started
    // For simplicity in this version, we leave it to browser cleanup or handle in offscreen
  }
}

async function createBlobUrlOffscreen(data: string | ArrayBuffer, mimeType: string): Promise<string> {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.LOCAL_STORAGE], // Using LOCAL_STORAGE as a generic reason
    justification: 'Generate Blob URL for large downloads',
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
