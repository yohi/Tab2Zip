// src/offscreen.ts

interface CreateBlobUrlMessage {
  type: 'create-blob-url';
  data: ArrayBuffer;
  mimeType: string;
}

interface RevokeBlobUrlMessage {
  type: 'revoke-blob-url';
  url: string;
}

type OffscreenMessage = CreateBlobUrlMessage | RevokeBlobUrlMessage;

function isOffscreenMessage(message: unknown): message is OffscreenMessage {
  if (message && typeof message === 'object') {
    const msg = message as Record<string, unknown>;
    return msg.type === 'create-blob-url' || msg.type === 'revoke-blob-url';
  }
  return false;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (isOffscreenMessage(message)) {
    if (message.type === 'create-blob-url') {
      const blob = new Blob([message.data], { type: message.mimeType });
      const url = URL.createObjectURL(blob);
      sendResponse(url);
    } else if (message.type === 'revoke-blob-url') {
      URL.revokeObjectURL(message.url);
      sendResponse(true);
    }
    return true;
  }
  return false;
});
