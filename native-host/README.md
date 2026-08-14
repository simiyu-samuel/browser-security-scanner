# SENTINEL native host

This is an optional, read-only native-messaging host for the local extension. It reports coarse OS posture, browser processes, and browser CLI versions. It does not read browser profile databases, history, credentials, or arbitrary files, and it makes no network requests.

## Registration

1. Package and sign the extension so its ID is stable.
2. Copy `com.sentinel.local_auditor.json.template` to the platform-specific native-messaging host directory.
3. Replace `REPLACE_WITH_MANAGED_EXTENSION_ID` and the launcher path.
4. Mark `launcher` executable on macOS/Linux.
5. Deploy the host and registration through the endpoint-management platform.

The exact registration mechanism is platform-specific:

- Windows: register the manifest under the Chrome and/or Edge `NativeMessagingHosts` registry key.
- macOS: install the manifest under the managed Chrome/Edge `NativeMessagingHosts` directory.
- Linux: install the manifest under the managed Chrome/Chromium/Edge native-messaging-hosts directory.

Do not register a wildcard allowed origin. The host must allow only the signed SENTINEL extension ID.
