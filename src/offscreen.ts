// src/offscreen.ts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'create-blob-url') {
    const blob = new Blob([message.data], { type: message.mimeType });
    const url = URL.createObjectURL(blob);
    sendResponse(url);
    // Note: The Service Worker should revoke this URL after the download starts/completes
    // or we can handle it here with a timeout if needed.
    return true;
  }
});
