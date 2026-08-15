# SENTINEL local extension

This is the full-power local layer for the SENTINEL browser audit. It targets Chromium-based Chrome/Edge on Windows, macOS, and Linux endpoints.

## Local-only guarantees

- The extension makes zero network requests.
- Reports are assembled in memory and are not written to `chrome.storage`.
- The popup export is user initiated.
- History, bookmarks, cookies, tabs, downloads, and extension inventory are reduced to counts and policy metrics; raw URLs, cookie names/values, and credential material are not included in the report.
- No browser data is modified or deleted.
- The native host is optional and read-only.

## Permissions and public release

The manifest intentionally requests broad permissions because the user-facing feature is a full local browser posture audit. Every permission is explained in `store-listing.md`, and the extension links to the hosted privacy policy. Start with **Unlisted** Chrome Web Store visibility and trusted testers; broad history/cookie/bookmark access may require additional review before a public listing.

Keep the extension package signed. The native host must allow only the exact signed extension ID and must never use a wildcard origin.

## Load for development

1. Open the browser’s extensions page.
2. Enable developer mode.
3. Choose **Load unpacked** and select this `extension/` directory.
4. Open the extension popup and choose **RUN LOCAL AUDIT**.

For production, force-install the signed package through the company’s Chrome/Edge policy channel and register the optional native host from `native-host/`.
