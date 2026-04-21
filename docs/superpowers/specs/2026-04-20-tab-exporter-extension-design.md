# Tab Exporter Extension Design (2026-04-20)

## 1. Overview
A Chrome Manifest V3 extension that extracts URLs and Titles from tabs and allows downloading them in TXT, Markdown (MD), or PDF formats via the context menu.

## 2. Architecture & Approach
**Approach A (Service Worker Only)**: 
The extension will run entirely within the `background.ts` Service Worker. It will use `chrome.contextMenus` to trigger actions, query the `chrome.tabs` API for data, and format it. PDF generation will be handled by bundling `jspdf` into the Service Worker using `esbuild`. The resulting files will be downloaded via the `chrome.downloads` API using Data URIs.

## 3. Components
*   **Manifest (`manifest.json`)**: V3 definition requesting `contextMenus`, `tabs`, and `downloads` permissions.
*   **Service Worker (`src/background.ts`)**:
    *   Registers Context Menus on install.
    *   Handles menu clicks to query tabs (Highlighted/Selected or All).
    *   Formats the data (TXT, MD, PDF via `jspdf`).
    *   Triggers downloads via Data URIs.
*   **Development Environment (`.devcontainer/devcontainer.json`, `package.json`)**: Node.js-based Devcontainer to enforce consistent styling and linting (ESLint, Prettier) and provide build scripts via `esbuild`.

## 4. Data Flow
1.  User right-clicks anywhere on the page or extension icon.
2.  User selects a context menu option (e.g., "Download Highlighted Tabs as MD").
3.  Service Worker receives the click event.
4.  Service Worker queries `chrome.tabs` based on the selected scope (highlighted/selected or current window).
5.  Data is parsed and formatted into the requested type.
6.  A Data URI is constructed (using `jspdf` for PDF).
7.  `chrome.downloads.download` is called with the URI to save the file locally.

## 5. Error Handling & Policies
*   **Restricted URLs**: Tabs with `chrome://`, `file://`, or other restricted schemes will be skipped. A fallback placeholder or log entry will be created.
*   **Download Failures**: Failures in `chrome.downloads.download` (e.g., permission denied, disk full) will be caught using `chrome.runtime.lastError`. Errors will be logged, and the user will be notified where possible.
*   **Fallback Strings**: Default strings (e.g., "Untitled", "No URL") will be used for missing data to ensure consistent output.
*   **Long Text Processing (PDF)**: To prevent text from overflowing page boundaries:
    1.  **Auto-wrap**: Titles and URLs will be wrapped using `jspdf`'s `splitTextToSize`.
    2.  **Pagination**: If wrapped content exceeds the page height, a new page will be added automatically.

## 6. Security & Privacy Considerations
*   **Local Processing Only**: All tab data is processed locally within the extension's Service Worker. No data is transmitted off-device or stored permanently.
*   **Sensitive Data**: URLs containing sensitive tokens (e.g., `?token=...`, `?key=...`) should be handled with care. The extension does not perform additional redaction by default but adheres to a strict "no-telemetry" policy.
*   **Content Security Policy (CSP)**: The extension uses a strict CSP in `manifest.json`. No `unsafe-eval` or remote scripts are permitted.
*   **Minimal Permissions**: The extension only requests `tabs`, `downloads`, and `contextMenus`, providing clear rationale for each in the documentation.

## 7. Testing Strategy
*   Manual end-to-end testing by loading the unpacked extension.
*   Verify context menu creation.
*   Verify all 6 combinations (Highlighted/All x TXT/MD/PDF) output correct data.
*   Verify ESLint and Prettier pass in the Devcontainer.
*   Verify handling of long titles and restricted URLs.
