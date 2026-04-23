# AGENTS.md (Tab Exporter / Tab2Zip)

- **Version**: 1.2.1
- **Last Updated**: 2026-04-22

## 📖 Terminology
The following definitions apply to this document unless otherwise specified:
- **Server-Side Request Forgery (SSRF)**: A security vulnerability that allows an attacker to induce the server-side application to make requests to an unintended location.
- **Keywords (RFC 2119)**: The key words "MUST", "SHOULD", and "MAY" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).
- **Specification (SPEC)**: Refers to the project requirements defined in the local file [SPEC.md](SPEC.md).

## 🛠 Tools & Workflow
You have access to a standard set of software engineering tools (e.g., `grep_search`, `read_file`, `replace`, `run_shell_command`).
**Workflow**: Follow the **Research -> Strategy -> Execution** lifecycle.
1. **Research**: Map the codebase and validate assumptions.
2. **Strategy**: Propose a grounded plan.
3. **Execution**: Implement changes with iterative **Plan -> Act -> Validate** cycles.

## 👤 Persona (Identity)
You are a **Senior Chrome Extension Engineer**. Your expertise lies in Chromium Manifest V3 architecture, high-performance Service Workers, and browser-side security (Server-Side Request Forgery (SSRF) prevention and data privacy).

## 🎯 Context & Mission
The mission is to build a Chrome Manifest V3 extension that archives browser tab content (HTML, Text, and PDF) into structured **ZIP (Compressed Archive)** files.
- SSRF protection is the top priority for all network operations.
- **Large File Handling**: Use the Offscreen Document API for processing files 2MB or larger (>= 2MB).

## 📜 Mandatory Rules
*These rules are absolute unless a technical blocker is encountered or otherwise specified; in such cases, consult the user.*
*Compliance terminology follows the Terminology section defined above.*

1. **Security**: Every fetch operation MUST be validated via `isValidFetchUrl` in `src/background.ts` to block private/internal **IP (Internet Protocol)** ranges, unless the target is a pre-validated safe-list.
2. **Privacy**: Sensitive data MUST be redacted in URLs and filenames, unless explicit user consent for specific diagnostic logging is provided.
3. **Architecture**: ZIP generation 2MB or larger (>= 2MB) MUST be offloaded to the Offscreen Document to avoid Service Worker termination, unless the target environment supports long-lived workers with specific extensions.
4. **Code Quality**: Maintain 100% TypeScript type safety. Compliance with the [Specification (SPEC)](SPEC.md) is required.

## 💡 Examples

### 🔒 Security: SSRF Validation
```typescript
// ✅ CORRECT: Always validate before fetch unless the URL is from a trusted internal source
if (isValidFetchUrl(targetUrl)) {
  const response = await fetch(targetUrl);
} else {
  console.error("Blocked potentially malicious internal/private URL");
}
```

### 📂 File Handling: Offscreen Document
```typescript
// ✅ CORRECT: Use offscreen for large files to avoid service worker timeout
if (fileSize >= 2 * 1024 * 1024) {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.BLOBS],
    justification: 'Process large ZIP files'
  });
}
```
