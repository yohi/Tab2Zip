# AGENTS.md (Tab Exporter / Tab2Zip)

## 🎯 Context & Mission
A Chrome Manifest V3 extension to archive browser tab content (HTML/Text/PDF) as structured ZIP files. The core engineering challenges are SSRF protection and large file handling (Offscreen Document).

## 🛠 Critical Commands
- **Build**: `npm run build` (Outputs to `dist/`)
- **Lint**: `npm run lint` (ESLint v9 Flat Config)
- **Watch**: `npm run watch`
- **Verify**: `npm run test` (Runs lint & build combined)

## 🏗 Key Directory Structure
- `src/background.ts`: Core logic (Service Worker)
- `src/offscreen.ts`: Blob URL generation (Offscreen Document)
- `manifest.json`: Extension entry point
- `docs/superpowers/`: Detailed designs and implementation plans

## 📜 Mandatory Rules
1. **Security**: Fetch operations MUST use `isValidFetchUrl` in `background.ts` to block private/internal IP ranges (SSRF protection).
2. **Privacy**: Mask sensitive query params (`token`, `key`, `auth`, `password`, `secret`) in URLs/filenames with `<redacted>`.
3. **Large Files**: ZIP generation exceeding 2MB MUST use the Offscreen Document flow.
4. **Permissions**: Adhere to the principle of least privilege in `manifest.json`.
5. **Types**: Maintain strict TypeScript typing; avoid `any` or disabling type checks.

## 📖 Progressive Disclosure (Reference)
Refer to these documents for deep dives:
- **Comprehensive Spec**: `SPEC.md`
- **Implementation Plans**: `docs/superpowers/plans/`
- **Design Details**: `docs/superpowers/specs/`
