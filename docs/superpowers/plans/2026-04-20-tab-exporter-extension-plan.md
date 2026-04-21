# Tab Exporter Extension Implementation Plan (2026-04-20)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Extension to extract URLs and titles of highlighted or all tabs and download them as TXT, MD, or PDF files.

**Architecture:** A Manifest V3 extension relying entirely on a Service Worker (`background.ts`). Context menus trigger the actions, tabs are queried, and data is formatted into Data URIs which are downloaded. `jspdf` is bundled into the Service Worker via `esbuild`.

**Tech Stack:** Chrome Manifest V3 API, TypeScript, Node.js (for build/lint tools), `jspdf`, `esbuild`, `eslint`, `prettier`.

---

## Task 1: Setup Development Environment

**Files:**
- Create: `.devcontainer/devcontainer.json`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.eslintrc.json`
- Create: `.prettierrc`
- Create: `.gitignore`

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

- [ ] **Step 2: Create package.json with updated dependencies**
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
      "jspdf": "^2.5.2"
    },
    "devDependencies": {
      "@types/chrome": "^0.0.280",
      "@typescript-eslint/eslint-plugin": "^7.0.0",
      "@typescript-eslint/parser": "^7.0.0",
      "esbuild": "^0.20.2",
      "eslint": "^8.57.0",
      "prettier": "^3.2.5",
      "typescript": "^5.3.3"
    }
  }
  ```

- [ ] **Step 3: Create configuration files (.eslintrc.json, .prettierrc, .gitignore, tsconfig.json)**
  Create `.eslintrc.json`:
  ```json
  {
    "parser": "@typescript-eslint/parser",
    "plugins": ["@typescript-eslint"],
    "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    "env": {
      "webextensions": true,
      "es2022": true
    }
  }
  ```
  Create `.prettierrc`:
  ```json
  {
    "singleQuote": true,
    "trailingComma": "es5",
    "tabWidth": 2
  }
  ```
  Create `.gitignore`:
  ```text
  node_modules/
  dist/
  package-lock.json
  .DS_Store
  ```
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
  Expected: Command fails due to missing `src/background.ts`.

- [ ] **Step 5: Commit**
  ```bash
  git add .devcontainer/devcontainer.json package.json tsconfig.json .eslintrc.json .prettierrc .gitignore
  git commit -m "chore: setup development environment with configs and updated dependencies"
  ```

---

## Task 2: Setup Extension Manifest and Boilerplate

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
    "description": "Export highlighted or all tabs to TXT, MD, or PDF.",
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

## Task 3: Implement Context Menu Registration

**Files:**
- Modify: `src/background.ts`

- [ ] **Step 1: Write context menu registration logic**
  Update `src/background.ts`:
  ```typescript
  chrome.runtime.onInstalled.addListener(() => {
    const scopes = [
      { id: 'highlighted', title: 'Highlighted Tabs (Current selection)' },
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
  Expected: Successful build.

- [ ] **Step 3: Commit**
  ```bash
  git add src/background.ts
  git commit -m "feat: register context menus for highlighted/all tabs"
  ```

---

## Task 4: Implement Tab Querying Logic

**Files:**
- Modify: `src/background.ts`

- [ ] **Step 1: Write Context Menu onClick listener**
  Update `src/background.ts`:
  ```typescript
  async function exportData(tabs: { title: string; url: string }[], format: string) {
    console.log(`Exporting ${tabs.length} tabs as ${format}`);
  }

  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (typeof info.menuItemId !== 'string' || !info.menuItemId.startsWith('export_')) return;

    const parts = info.menuItemId.split('_');
    const scope = parts[1]; // 'highlighted' | 'all'
    const format = parts[2]; // 'txt' | 'md' | 'pdf'

    try {
      const queryOptions: chrome.tabs.QueryInfo = { currentWindow: true };
      if (scope === 'highlighted') {
        queryOptions.highlighted = true;
      }

      const tabs = await chrome.tabs.query(queryOptions);
      // Skip restricted URLs
      const tabData = tabs
        .filter(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('file://'))
        .map(t => ({
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

- [ ] **Step 3: Commit**
  ```bash
  git add src/background.ts
  git commit -m "feat: handle menu clicks with tab filtering"
  ```

---

## Task 5: Implement Export Logic (TXT and MD with escaping)

**Files:**
- Modify: `src/background.ts`

- [ ] **Step 1: Add Markdown escaping helper and implement TXT/MD exports**
  Update `src/background.ts`:
  ```typescript
  function escapeMarkdown(text: string): string {
    return text.replace(/[\\`*_{}[\]()#+-.!]/g, '\\$&');
  }

  async function exportData(tabs: { title: string; url: string }[], format: string) {
    let dataUri = '';
    let filename = `tabs_export_${Date.now()}`;

    if (format === 'txt') {
      const content = tabs.map(t => `${t.title}\n${t.url}`).join('\n\n');
      dataUri = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
      filename += '.txt';
    } else if (format === 'md') {
      const content = tabs
        .map(t => `- [${escapeMarkdown(t.title)}](${t.url})`)
        .join('\n');
      dataUri = `data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`;
      filename += '.md';
    } else if (format === 'pdf') {
      // To be implemented in Task 6
      return;
    }

    if (dataUri) {
      chrome.downloads.download({
        url: dataUri,
        filename: filename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError.message);
        } else {
          console.log('Download started with ID:', downloadId);
        }
      });
    }
  }
  ```

- [ ] **Step 2: Verify build**
  Run: `npm run build`

- [ ] **Step 3: Commit**
  ```bash
  git add src/background.ts
  git commit -m "feat: implement TXT and MD exports with escaping and error handling"
  ```

---

## Task 6: Implement Export Logic (PDF with text wrapping)

**Files:**
- Modify: `src/background.ts`

- [ ] **Step 1: Import jsPDF and implement wrapped PDF export**
  Update `src/background.ts`:
  ```typescript
  import { jsPDF } from 'jspdf';
  // ... rest of imports/helpers

  // Inside exportData format === 'pdf' block:
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const maxLineWidth = pageWidth - margin * 2;
  let yPos = margin;

  tabs.forEach((t, index) => {
    const titleLines = doc.splitTextToSize(`${index + 1}. ${t.title}`, maxLineWidth);
    const urlLines = doc.splitTextToSize(t.url, maxLineWidth - 5);
    const itemHeight = (titleLines.length + urlLines.length) * 7 + 5;

    if (yPos + itemHeight > 280) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(titleLines, margin, yPos);
    yPos += titleLines.length * 7;

    doc.setFont('helvetica', 'normal');
    doc.text(urlLines, margin + 5, yPos);
    yPos += urlLines.length * 7 + 5;
  });
  dataUri = doc.output('datauristring');
  filename += '.pdf';
  ```

- [ ] **Step 2: Final Verification and Formatting**
  Run: `npm run lint`
  Run: `npm run format`
  Run: `npm run build`

- [ ] **Step 3: Commit**
  ```bash
  git add src/background.ts
  git commit -m "feat: implement PDF export with text wrapping and pagination"
  ```
