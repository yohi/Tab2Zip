# Tab Exporter Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Extension to extract URLs and titles of selected or all tabs and download them as TXT, MD, or PDF files.

**Architecture:** A Manifest V3 extension relying entirely on a Service Worker (`background.ts`). Context menus trigger the actions, tabs are queried, and data is formatted into Data URIs which are downloaded. `jspdf` is bundled into the Service Worker via `esbuild`.

**Tech Stack:** Chrome Manifest V3 API, TypeScript, Node.js (for build/lint tools), `jspdf`, `esbuild`, `eslint`, `prettier`.

---

### Task 1: Setup Development Environment

**Files:**
- Create: `.devcontainer/devcontainer.json`
- Create: `package.json`
- Create: `tsconfig.json`

- [ ] **Step 1: Create devcontainer configuration**
  Create `.devcontainer/devcontainer.json`:
  ```json
  {
    "name": "Node.js Environment",
    "image": "mcr.microsoft.com/devcontainers/javascript-node:1-22-bullseye",
    "customizations": {
      "vscode": {
        "extensions": [
          "dbaeumer.vscode-eslint",
          "esbenp.prettier-vscode"
        ],
        "settings": {
          "editor.formatOnSave": true,
          "editor.defaultFormatter": "esbenp.prettier-vscode",
          "editor.codeActionsOnSave": {
            "source.fixAll.eslint": "explicit"
          }
        }
      }
    },
    "postCreateCommand": "npm install"
  }
  ```

- [ ] **Step 2: Create package.json**
  Create `package.json`:
  ```json
  {
    "name": "tab-exporter-extension",
    "version": "1.0.0",
    "description": "Chrome Extension to export tabs to TXT, MD, and PDF",
    "scripts": {
      "build": "esbuild src/background.ts --bundle --outfile=dist/background.js --format=esm",
      "watch": "esbuild src/background.ts --bundle --outfile=dist/background.js --format=esm --watch",
      "lint": "eslint . --ext .ts",
      "format": "prettier --write \"src/**/*.ts\"",
      "test": "npm run lint && npm run build"
    },
    "dependencies": {
      "jspdf": "^2.5.1"
    },
    "devDependencies": {
      "@types/chrome": "^0.0.280",
      "@typescript-eslint/eslint-plugin": "^7.0.0",
      "@typescript-eslint/parser": "^7.0.0",
      "esbuild": "^0.20.0",
      "eslint": "^8.56.0",
      "prettier": "^3.2.5",
      "typescript": "^5.3.3"
    }
  }
  ```

- [ ] **Step 3: Create tsconfig.json**
  Create `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "node",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "outDir": "./dist",
      "rootDir": "./src"
    },
    "include": ["src/**/*"]
  }
  ```

- [ ] **Step 4: Install dependencies and verify environment**
  Run: `npm install`
  Run: `npm run test`
  Expected: Command fails or warns about missing `src/background.ts`. This confirms scripts are wired.

- [ ] **Step 5: Commit**
  ```bash
  git add .devcontainer/devcontainer.json package.json tsconfig.json package-lock.json
  git commit -m "chore: setup development environment"
  ```

---

### Task 2: Setup Extension Manifest and Boilerplate

**Files:**
- Create: `manifest.json`
- Create: `src/background.ts`

- [ ] **Step 1: Create manifest.json**
  Create `manifest.json`:
  ```json
  {
    "manifest_version": 3,
    "name": "Tab Exporter",
    "version": "1.0.0",
    "description": "Export selected or all tabs to TXT, MD, or PDF.",
    "permissions": [
      "contextMenus",
      "tabs",
      "downloads"
    ],
    "background": {
      "service_worker": "dist/background.js",
      "type": "module"
    },
    "minimum_chrome_version": "92"
  }
  ```

- [ ] **Step 2: Create boilerplate background script**
  Create `src/background.ts`:
  ```typescript
  console.log("Tab Exporter Service Worker initialized.");
  ```

- [ ] **Step 3: Verify build succeeds**
  Run: `npm run build`
  Expected: Generates `dist/background.js` successfully.

- [ ] **Step 4: Commit**
  ```bash
  git add manifest.json src/background.ts
  git commit -m "feat: add manifest and basic background script"
  ```

---

### Task 3: Implement Context Menu Registration

**Files:**
- Modify: `src/background.ts`

- [ ] **Step 1: Write context menu registration logic**
  Update `src/background.ts` to include context menus:
  ```typescript
  chrome.runtime.onInstalled.addListener(() => {
    const scopes = [
      { id: 'selected', title: 'Selected Tabs' },
      { id: 'all', title: 'All Tabs' }
    ];
    const formats = ['TXT', 'MD', 'PDF'];

    scopes.forEach(scope => {
      formats.forEach(format => {
        chrome.contextMenus.create({
          id: `export_${scope.id}_${format.toLowerCase()}`,
          title: `Download ${scope.title} as ${format}`,
          contexts: ['action', 'page']
        });
      });
    });
  });
  ```

- [ ] **Step 2: Verify build**
  Run: `npm run build`
  Expected: Successful build with no TypeScript errors.

- [ ] **Step 3: Commit**
  ```bash
  git add src/background.ts
  git commit -m "feat: register context menus on install"
  ```

---

### Task 4: Implement Tab Querying Logic

**Files:**
- Modify: `src/background.ts`

- [ ] **Step 1: Write Context Menu onClick listener**
  Append to `src/background.ts`:
  ```typescript
  // Stub for exportData (to be implemented later)
  async function exportData(tabs: {title: string, url: string}[], format: string) {
    console.log(`Exporting ${tabs.length} tabs as ${format}`);
  }

  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (typeof info.menuItemId !== 'string' || !info.menuItemId.startsWith('export_')) return;

    const parts = info.menuItemId.split('_');
    if (parts.length !== 3) return;
    const scope = parts[1]; // 'selected' | 'all'
    const format = parts[2]; // 'txt' | 'md' | 'pdf'

    try {
      const queryOptions: chrome.tabs.QueryInfo = { currentWindow: true };
      if (scope === 'selected') {
        queryOptions.highlighted = true;
      }

      const tabs = await chrome.tabs.query(queryOptions);
      const tabData = tabs.map(t => ({
        title: t.title || 'Untitled',
        url: t.url || 'No URL'
      }));

      await exportData(tabData, format);
    } catch (error) {
      console.error('Failed to query tabs:', error);
    }
  });
  ```

- [ ] **Step 2: Verify build**
  Run: `npm run build`
  Expected: Successful build.

- [ ] **Step 3: Commit**
  ```bash
  git add src/background.ts
  git commit -m "feat: handle context menu clicks and query tabs"
  ```

---

### Task 5: Implement Export Logic (TXT and MD)

**Files:**
- Modify: `src/background.ts`

- [ ] **Step 1: Implement basic exports**
  Update the `exportData` function in `src/background.ts`:
  ```typescript
  async function exportData(tabs: {title: string, url: string}[], format: string) {
    let dataUri = '';
    let filename = `tabs_export_${Date.now()}`;

    if (format === 'txt') {
      const content = tabs.map(t => `${t.title}\n${t.url}\n`).join('\n');
      dataUri = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
      filename += '.txt';
    } else if (format === 'md') {
      const content = tabs.map(t => `- [${t.title}](${t.url})`).join('\n');
      dataUri = `data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`;
      filename += '.md';
    } else if (format === 'pdf') {
      console.log('PDF export not yet implemented');
      return;
    }

    if (dataUri) {
      chrome.downloads.download({
        url: dataUri,
        filename: filename,
        saveAs: true
      });
    }
  }
  ```

- [ ] **Step 2: Verify build**
  Run: `npm run build`
  Expected: Successful build.

- [ ] **Step 3: Commit**
  ```bash
  git add src/background.ts
  git commit -m "feat: implement TXT and MD export formats"
  ```

---

### Task 6: Implement Export Logic (PDF via jspdf)

**Files:**
- Modify: `src/background.ts`

- [ ] **Step 1: Import jsPDF and implement PDF export**
  Add the import at the top of `src/background.ts`:
  ```typescript
  import { jsPDF } from 'jspdf';
  ```
  And update the `format === 'pdf'` block in `exportData`:
  ```typescript
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      let yPos = 10;
      
      tabs.forEach((t, index) => {
        doc.text(`${index + 1}. ${t.title}`, 10, yPos);
        doc.text(t.url, 15, yPos + 7);
        yPos += 20;
        
        if (yPos > 280) {
          doc.addPage();
          yPos = 10;
        }
      });
      dataUri = doc.output('datauristring');
      filename += '.pdf';
    }
  ```

- [ ] **Step 2: Verify build**
  Run: `npm run build`
  Expected: Successful build with esbuild correctly bundling jsPDF.

- [ ] **Step 3: Verify formatting and linting**
  Run: `npm run lint`
  Run: `npm run format`
  Expected: Passes, potentially auto-fixing any style issues.

- [ ] **Step 4: Commit**
  ```bash
  git add src/background.ts
  git commit -m "feat: implement PDF export format using jspdf"
  ```

---
**Verification (Manual):**
After all tasks are complete:
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode".
3. Click "Load unpacked" and select the extension directory.
4. Open a few tabs. Right-click on a page and verify the context menus appear.
5. Click each menu item and verify that a file is downloaded and its contents are correct.
