# SENTINEL local extension

This is the privileged local layer for the company browser audit. It targets Chromium-based Chrome/Edge on managed Windows, macOS, and Linux endpoints.

## Local-only guarantees

- The extension makes zero network requests.
- Reports are assembled in memory and are not written to `chrome.storage`.
- The popup export is user initiated.
- History, bookmarks, cookies, tabs, downloads, and extension inventory are reduced to counts and policy metrics; raw URLs, cookie names/values, and credential material are not included in the report.
- No browser data is modified or deleted.
- The native host is optional and read-only.

## Permissions

The manifest intentionally requests broad managed-endpoint permissions because this is an internal, force-installed audit extension. Keep the extension package signed and distribute it only through company device management. If the scope is narrowed later, move host access into `optional_host_permissions` and request it only for approved domains.

## Load for development

1. Open the browser’s extensions page.
2. Enable developer mode.
3. Choose **Load unpacked** and select this `extension/` directory.
4. Open the extension popup and choose **RUN LOCAL AUDIT**.

For production, force-install the signed package through the company’s Chrome/Edge policy channel and register the optional native host from `native-host/`.
