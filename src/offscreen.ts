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

function isOffscreenMessage(message: any): message is OffscreenMessage {
  return (
    message &&
    typeof message === 'object' &&
    (message.type === 'create-blob-url' || message.type === 'revoke-blob-url')
  );
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isOffscreenMessage(message)) {
    return;
  }

  if (message.type === 'create-blob-url') {
    const blob = new Blob([message.data], { type: message.mimeType });
    const url = URL.createObjectURL(blob);
    sendResponse(url);
    return true;
  } else if (message.type === 'revoke-blob-url') {
    URL.revokeObjectURL(message.url);
    sendResponse(true);
    return true;
  }
});
