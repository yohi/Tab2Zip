# Tab Exporter Extension Design (2026-04-20)

## 1. Overview
A Chrome Manifest V3 extension that extracts URLs and Titles from tabs and allows downloading them in TXT, Markdown (MD), or PDF formats via the context menu.

## 2. Architecture & Approach
**Approach A+ (Service Worker Driven with Offscreen Support)**: 
The extension is primarily driven by the `background.ts` Service Worker. It uses `chrome.contextMenus` to trigger actions and `chrome.tabs` to query data.
*   **Small Exports (< 2MB)**: Handled directly in the Service Worker via Data URIs.
*   **Large Exports (>= 2MB)**: To bypass the Data URI size limit, the extension launches a minimal Offscreen Document to create a Blob URL via `URL.createObjectURL`.
PDF generation is handled by `jspdf` bundled into the Service Worker.

## 3. Components
*   **Manifest (`manifest.json`)**: V3 definition requesting `contextMenus`, `tabs`, `downloads`, and `offscreen` permissions.
*   **Service Worker (`src/background.ts`)**:
    *   Registers Context Menus.
    *   Queries and filters tabs.
    *   Masks sensitive query parameters.
    *   Formats data and manages the download flow (Data URI vs. Offscreen Blob).
*   **Offscreen Document (`offscreen.html`/`.ts`)**: A lightweight page used solely for generating Blob URLs for large data sets.
*   **Development Environment**: Node.js-based Devcontainer with ESLint and Prettier.

## 4. Data Flow
1.  User clicks a context menu item (e.g., "Download Highlighted Tabs as PDF").
2.  Service Worker queries `chrome.tabs`.
3.  Data is parsed: Sensitive query parameters (`token`, `key`, etc.) are masked by default.
4.  Service Worker formats the data into a string or PDF binary.
5.  **Download Decision**:
    *   If encoded size < 2MB: Use `chrome.downloads.download` with a Data URI.
    *   If encoded size >= 2MB: Launch `offscreen.html`, send data via messaging, receive a Blob URL, and then call `chrome.downloads.download`.
6.  The file is saved locally.

## 5. Error Handling & Policies
*   **Restricted URLs**: Tabs with `chrome://` or `file://` schemes are skipped with a log entry.
*   **Download Failures**: Errors in `chrome.downloads.download` (captured via `chrome.runtime.lastError`) trigger a log and user notification.
*   **Long Text (PDF)**: 
    *   **Auto-wrap**: Uses `splitTextToSize` for titles and URLs.
    *   **Pagination**: Automatically adds new pages when vertical space is exhausted.
*   **機密データのリダクション**: 既定でクエリパラメータ名 `token`, `key`, `access_token`, `auth`, `password`, `secret` をマスク（`<redacted>` に置換）します。
    *   **オプトアウト**: `enableDefaultMasking: false` 設定（将来的にオプション画面で提供）により、この機能を無効化可能です。

## 6. Security & Privacy Considerations
*   **Local Processing**: Tab data never leaves the device.
*   **Sensitive Data Masking**: Active by default to prevent accidental exposure of credentials in exported files.
*   **CSP**: Strict policy in `manifest.json` disallowing `unsafe-eval` and remote scripts.
*   **Minimal Permissions**: Requests `tabs`, `downloads`, `contextMenus`, and `offscreen` with clear rationale.

## 7. Testing Strategy
*   **Confirm** context menu registration on extension installation.
*   **Ensure** all 6 combinations (Highlighted/All x TXT/MD/PDF) output accurate data.
*   **Verify** that sensitive tokens are correctly masked in the output files.
*   **Check** that large exports (tested with > 100 tabs) successfully download via the Offscreen/Blob path.
*   **Validate** ESLint and Prettier compliance within the Devcontainer.
*   **Evaluate** handling of long titles and pagination in the generated PDF.
