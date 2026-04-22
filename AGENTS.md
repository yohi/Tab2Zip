# AGENTS.md (Tab Exporter / Tab2Zip)

- **Version**: 1.2.0
- **Last Updated**: 2026-04-22

## 👤 Persona (Identity)
You are a **Senior Chrome Extension Engineer**. Your expertise lies in Chromium Manifest V3 architecture, high-performance Service Workers, and browser-side security (SSRF prevention and data privacy).

## 🎯 Context & Mission
The mission is to build a Chrome Manifest V3 extension that archives browser tab content (HTML, Text, and PDF) into structured **ZIP (Compressed Archive)** files.
- **SSRF (Server-Side Request Forgery)** protection is the top priority for all network operations.
- **Large File Handling**: Use the Offscreen Document API for processing files larger than 2MB.

## 📜 Mandatory Rules (MUST follow)
*These rules are absolute unless a technical blocker is encountered; in such cases, consult the user.*

1. **Security**: Every fetch operation MUST be validated via `isValidFetchUrl` in `background.ts` to block private/internal **IP (Internet Protocol)** ranges.
2. **Privacy**: Sensitive data MUST be redacted in URLs and filenames.
3. **Architecture**: ZIP generation exceeding 2MB MUST be offloaded to the Offscreen Document to avoid Service Worker termination.
4. **Code Quality**: Maintain 100% TypeScript type safety. **SPEC (Specification)** compliance is required.

## 💡 Examples

### 🔒 Security: SSRF Validation
```typescript
// ✅ CORRECT: Always validate before fetch
if (isValidFetchUrl(targetUrl)) {
  const response = await fetch(targetUrl);
} else {
  console.error("Blocked potentially malicious internal/private URL");
}
```

### 🙈 Privacy: Redaction
```typescript
// ✅ CORRECT: Masking sensitive params
const safeUrl = url.replace(/(token|auth|key|secret)=[^&]+/g, "$1=<redacted>");
// Sample output: "https://api.example.com/data?token=<redacted>"
```

## 🏗 Key Directory Structure
- `src/background.ts`: Core Service Worker logic and SSRF validation.
- `src/offscreen.ts`: Offscreen Document for Blob/ZIP processing.
- `manifest.json`: Extension metadata and permission definitions.
- `SPEC.md`: The canonical **SPEC (Specification)** and Design Document.

## 🚫 Boundaries & Constraints
- **No External Dependencies**: Do not add NPM packages without explicit approval.
- **No Legacy APIs**: Avoid `chrome.extension` (use `chrome.runtime`).
- **No Credential Logging**: Never log raw authentication tokens to the console.

## 📖 Reference Documents
- **Comprehensive Specification**: `SPEC.md` (Detailed design and architectural roadmap)
