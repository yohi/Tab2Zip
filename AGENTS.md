# AGENTS.md (Tab Exporter / Tab2Zip)

> **Version**: 1.1.0  
> **Last Updated**: 2026-04-22  
> **Persona**: You are a Senior Chrome Extension Engineer specializing in Manifest V3 security, Service Worker lifecycle, and browser-side file processing.

## 🎯 Context & Mission
A Chrome Manifest V3 extension to archive browser tab content (HTML/Text/PDF) as structured ZIP (Compressed Archive) files. The core engineering challenges are SSRF protection and large file handling using the Offscreen Document API.

## 🛠 Critical Commands
- **Build**: `npm run build` (Outputs to `dist/`)
- **Lint**: `npm run lint` (ESLint v9 Flat Config)
- **Watch**: `npm run watch`
- **Verify**: `npm run test` (Runs lint & build combined)

## 🏗 Key Directory Structure
- `src/background.ts`: Core logic (Service Worker)
- `src/offscreen.ts`: Blob URL generation (Offscreen Document)
- `manifest.json`: Extension entry point
- `SPEC.md`: Canonical Specification and Design Document

## 📜 Mandatory Rules (MUST follow)
1. **Security**: Fetch operations MUST use `isValidFetchUrl` in `background.ts` to block private/internal IP ranges (SSRF protection).
2. **Privacy**: Mask sensitive query params (`token`, `key`, `auth`, `password`, `secret`) in URLs/filenames with `<redacted>`.
3. **Large Files**: ZIP generation exceeding 2MB MUST use the Offscreen Document flow.
4. **Permissions**: Adhere to the principle of least privilege in `manifest.json`.
5. **Types**: Maintain strict TypeScript typing; avoid `any` or disabling type checks.

## 🚫 Boundaries & Constraints
- **No External Dependencies**: Do not add new NPM packages without explicit user approval.
- **No Legacy APIs**: Do not use `chrome.extension` or other deprecated Manifest V2 APIs.
- **No Credential Logging**: Never log or print full URLs containing authentication tokens or secrets.
- **No Blind Refactoring**: Do not modify SSRF validation logic unless fixing a verified security vulnerability.

## 📖 Progressive Disclosure (Reference)
Refer to this document for comprehensive details:
- **Comprehensive SPEC**: `SPEC.md` (Contains implementation plans, design details, and architectural specs)
