# Chrome Web Store listing draft

## Name

SENTINEL Browser Security Auditor

## Short description

Run a local browser security posture audit with clear, privacy-first results.

## Detailed description

SENTINEL helps users understand the security posture of their current Chrome or Edge browser profile. Run an audit from the extension popup and receive a readable local report.

The audit can summarize:

- Browser history and bookmark metrics
- Cookie security attributes without exposing cookie values
- Open-tab, download, and installed-extension metrics
- Browser privacy and content settings
- Operating-system and browser-process posture when the optional local host is installed

SENTINEL is local-first:

- No audit data is uploaded
- No advertising or analytics
- No raw passwords or credential material
- No destructive actions
- No browser data is deleted or modified
- JSON export is user initiated

SENTINEL is designed for informed, user-initiated browser security testing. Review the permission disclosure in the popup before running an audit.

Privacy policy: https://browserscanner.vercel.app/privacy.html

## Single purpose

Provide a user-facing, local browser security posture audit and an optional local operating-system posture summary.

## Permission rationale

- `history`: calculate local history metrics for the audit; raw URLs are not included in reports.
- `bookmarks`: calculate local bookmark metrics; bookmark URLs are not included in reports.
- `cookies` + `<all_urls>`: calculate local cookie security-attribute metrics; names and values are discarded.
- `tabs`: calculate open-tab metrics; tab URLs are not included in reports.
- `sessions`: count recently closed browser sessions without returning URLs.
- `downloads`: calculate download-state metrics.
- `management`: calculate installed-extension counts and permission totals.
- `privacy` and `contentSettings`: read browser privacy/content setting posture.
- `system.cpu`, `system.memory`, `system.storage`: read coarse local device posture.
- `nativeMessaging`: optionally communicate with the read-only local posture host.
- `storage`: reserved for local extension settings; audit reports are not persisted.
- `<all_urls>`: required for cookie metrics across the browser profile.

## Distribution recommendation

Start with **Unlisted** visibility for trusted testers. Move to **Public** only after the listing, privacy policy, screenshots, permission disclosure, and review feedback are complete. Full-power permissions may require additional Chrome Web Store review.
