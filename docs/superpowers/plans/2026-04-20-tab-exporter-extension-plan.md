# Tab Exporter Extension Implementation Plan (2026-04-20)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Extension to extract URLs and titles of highlighted or all tabs and download them as TXT, MD, or PDF files, including sensitive data masking and large file support.

**Architecture:** A Manifest V3 extension. Service Worker handles core logic. Small files (<2MB) use Data URIs. Large files (>=2MB) use an Offscreen Document to generate Blob URLs. `jspdf` is bundled for PDF generation.

**Tech Stack:** Chrome Manifest V3 API, TypeScript, Node.js, `jspdf`, `esbuild`, `eslint` (v9+ with Flat Config).

---

## Task 1: Setup Development Environment

**Files:**
- Create: `.devcontainer/devcontainer.json`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
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

- [ ] **Step 2: Create package.json with secure dependencies**
  Create `package.json`:
  ```json
  {
    "name": "tab-exporter-extension",
    "version": "1.0.0",
    "description": "Chrome Extension to export tabs to TXT, MD, and PDF",
    "type": "module",
    "scripts": {
      "build": "esbuild src/background.ts src/offscreen.ts --bundle --outdir=dist --format=esm",
      "watch": "esbuild src/background.ts src/offscreen.ts --bundle --outdir=dist --format=esm --watch",
      "lint": "eslint .",
      "format": "prettier --write \"src/**/*.ts\"",
      "test": "npm run lint && npm run build"
    },
    "dependencies": {
      "jspdf": "^4.2.1"
    },
    "devDependencies": {
      "@eslint/js": "^9.26.0",
      "@types/chrome": "^0.0.280",
      "esbuild": "^0.25.0",
      "eslint": "^9.26.0",
      "globals": "^15.9.0",
      "prettier": "^3.2.5",
      "typescript": "^5.3.3",
      "typescript-eslint": "^8.2.0"
    }
  }
  ```

- [ ] **Step 3: Create configuration files (eslint.config.mjs, .prettierrc, .gitignore, tsconfig.json)**
  Create `eslint.config.mjs` (Flat Config):
  ```javascript
  import eslint from '@eslint/js';
  import tseslint from 'typescript-eslint';
  import globals from 'globals';

  export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
      languageOptions: {
        globals: {
          ...globals.browser,
          ...globals.webextensions,
        },
      },
    },
    {
      ignores: ['dist/', 'node_modules/'],
    }
  );
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
  git add .devcontainer/devcontainer.json package.json tsconfig.json eslint.config.mjs .prettierrc .gitignore
  git commit -m "chore: setup development environment with ESLint v9 Flat Config and secure dependencies"
  ```

---

## Task 2: Setup Extension Manifest and Offscreen Boilerplate
(Following steps remain largely the same, but ensure they match the updated tech stack)

- [ ] **Step 1: Update manifest.json**
  (Details as per updated Spec in previous turn)

- [ ] **Step 2: Create offscreen.html and src/offscreen.ts**
  (Details as per updated Spec in previous turn)

---

## Task 3: Implement Context Menu and Masking Logic
- [ ] **Step 1: Implement sensitive data masking helper**
  (Details as per updated Spec in previous turn)

---

## Task 4: Implement Download Flow (Data URI vs. Blob)
- [ ] **Step 1: Implement smart download function**
  (Details as per updated Spec in previous turn)

---

## Task 5: Integrate PDF Generation with Wrapping
- [ ] **Step 1: Update PDF export with splitTextToSize**
  (Details as per updated Spec in previous turn)

---

## Task 6: Final Verification
- [ ] **Step 1: Confirm masking, large download, and Lint passing**
  Run: `npm run lint`
  Expected: PASS (ESLint v9 configuration is valid).
- [ ] **Step 2: Commit**
  ```bash
  git add .
  git commit -m "feat: implement masking and large file support with secure build pipeline"
  ```
