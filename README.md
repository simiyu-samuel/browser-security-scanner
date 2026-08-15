# SENTINEL // Browser Security Auditor

Privacy-first, mobile-first browser security auditing for two modes:

1. **Web mode** — a zero-install client-side posture scan that stays within normal browser sandbox rules.
2. **Managed local mode** — a Chromium MV3 extension for company-owned Chrome/Edge endpoints, with an optional native host for Windows, macOS, and Linux.

## Stack

- Static HTML/CSS/JavaScript frontend
- Vercel Function for deployment health checks
- Chromium MV3 local extension
- Optional Python native-messaging host
- No database, analytics, or third-party runtime dependencies

## Web mode checks

The public web UI checks the current origin and browser context without requesting permissions or transmitting scan results. It covers:

- HTTPS, secure context, HSTS, CSP, Referrer Policy, Permissions Policy
- COOP, COEP, CORP, and cross-origin isolation
- Web Storage, IndexedDB, Cache Storage, quota, cookies, and Web Crypto
- Permission states and capability surfaces for camera, microphone, WebRTC, WebAuthn, service workers, clipboard, and file access
- Do Not Track, Global Privacy Control, referrer, automation, and network signals
- Browser-protected history, saved-password, bookmark, file, opener, and cross-origin boundaries

Results can be filtered by status or audit area, copied as a summary, or exported as JSON.

## Managed local mode

The `extension/` directory contains the local-only privileged layer for managed Chrome/Edge browsers. It summarizes browser-level data such as history, bookmarks, cookies, tabs, downloads, installed extensions, content settings, and privacy settings.

Local-only guarantees:

- The extension makes zero network requests.
- Reports are assembled locally and are not written to remote services.
- Raw URLs, cookie names/values, passwords, and credential material are not included in reports.
- No browser data is modified or deleted.
- JSON export is user initiated.

The optional `native-host/` directory adds coarse OS posture, browser processes, and browser CLI versions. It does not read browser profile databases, credentials, or arbitrary files.

The extension targets Chrome/Edge MV3. Firefox requires a separate browser adapter.

## Development

### Web UI

Open the project through a local web server or deploy it to Vercel. No build command is required.

### Extension

1. Open the browser extensions page.
2. Enable developer mode.
3. Choose **Load unpacked**.
4. Select the `extension/` directory.
5. Open the SENTINEL extension popup and choose **RUN LOCAL AUDIT**.

For production, sign the extension and force-install it through the company’s Chrome/Edge device-management policy.

### Chrome Web Store release

The release package is built from `extension/` and contains the manifest, icons, popup, options page, and service worker. Store-facing drafts and source artwork live in `extension/store-listing.md` and `store-assets/`; generated upload assets are placed in `dist/store-assets/`.

Because this full-power build handles sensitive browser metadata locally, the listing must accurately disclose its permissions and privacy practices. Begin with **Unlisted** visibility and trusted testers, then request **Public** review after the workflow and disclosures have been verified.

### Native host

1. Use a stable signed extension ID.
2. Replace the extension ID and absolute launcher path in `native-host/com.sentinel.local_auditor.json.template`.
3. Register the host through endpoint management:
   - Windows: `install-windows.ps1`
   - macOS/Linux: `install-unix.sh`
4. Allow only the signed SENTINEL extension origin; never use a wildcard origin.

The native host is optional. The browser extension works without it.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Deploy with the default settings.
4. Open the HTTPS URL and press **START SECURITY SCAN**.

Vercel hosts the web UI and deployment health endpoint. Sensitive managed-endpoint findings remain local to the extension.

## Privacy boundary

A normal website cannot read browser history, saved passwords, bookmarks, arbitrary local files, or permission-gated hardware. SENTINEL does not attempt to bypass those browser protections. The managed extension uses explicit enterprise permissions for local browser posture checks, while credential extraction and destructive browser operations remain out of scope.

## Favicon

The web UI uses `favicon.svg`, a self-contained shield/circuit mark with no external assets.
