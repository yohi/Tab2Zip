# Tab Exporter Extension Design

## 1. Overview
A Chrome Manifest V3 extension that extracts URLs and Titles from tabs and allows downloading them in TXT, Markdown (MD), or PDF formats via the context menu.

## 2. Architecture & Approach
**Approach A (Service Worker Only)**: 
The extension will run entirely within the `background.ts` Service Worker. It will use `chrome.contextMenus` to trigger actions, query the `chrome.tabs` API for data, and format it. PDF generation will be handled by bundling `jspdf` into the Service Worker using `esbuild`. The resulting files will be downloaded via the `chrome.downloads` API using Data URIs.

## 3. Components
*   **Manifest (`manifest.json`)**: V3 definition requesting `contextMenus`, `tabs`, and `downloads` permissions.
*   **Service Worker (`src/background.ts`)**:
    *   Registers Context Menus on install.
    *   Handles menu clicks to query tabs (Selected or All).
    *   Formats the data (TXT, MD, PDF via `jspdf`).
    *   Triggers downloads via Data URIs.
*   **Development Environment (`.devcontainer/devcontainer.json`, `package.json`)**: Node.js based Devcontainer to enforce consistent styling and linting (ESLint, Prettier) and provide build scripts via `esbuild`.

## 4. Data Flow
1.  User right-clicks anywhere on the page or extension icon.
2.  User selects a context menu option (e.g., "Download Selected Tabs as MD").
3.  Service Worker receives the click event.
4.  Service Worker queries `chrome.tabs` based on the selected scope (highlighted or current window).
5.  Data is parsed and formatted into the requested type.
6.  A Data URI is constructed (using `jspdf` for PDF).
7.  `chrome.downloads.download` is called with the URI to save the file locally.

## 5. Error Handling
*   If tab querying fails (e.g., restricted URLs), the error is caught and logged.
*   Default fallback strings are used for missing tab titles or URLs.

## 6. Testing Strategy
*   Manual end-to-end testing by loading the unpacked extension.
*   Verify context menu creation.
*   Verify all 6 combinations (Selected/All x TXT/MD/PDF) output correct data.
*   Verify ESLint and Prettier pass in the Devcontainer.
