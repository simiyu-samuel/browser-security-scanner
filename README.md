# SENTINEL // Browser Security Auditor

Privacy-first, mobile-first browser security audit with a hacker-style UI.

## Stack
- Static HTML/CSS/JavaScript
- Vercel Functions
- No database
- No analytics
- No third-party runtime dependencies

## What it does

The scanner runs checks locally in the visitor's browser and verifies the same-origin `/api/security` endpoint and its response security headers. It reports:

- HTTPS and secure-context state
- Content Security Policy, frame, referrer, permissions, and content-type headers
- Web Storage and Web Crypto availability
- Permission states without requesting access
- Service worker and cross-origin isolation surfaces
- Do Not Track and network signals
- Non-sensitive environment metadata

Completed results can be filtered, copied as a summary, or downloaded as JSON. No result is sent to a database.

## Deploy to Vercel
1. Create a GitHub repository and push this folder.
2. Import the repository into Vercel.
3. Deploy with the default settings; no build command is required.
4. Open the deployed HTTPS URL and press **START SECURITY SCAN**.

## Deploy to GitHub Pages
The static frontend (`index.html`, `css/`, `js/`) works on GitHub Pages. The `/api` directory is only useful when deployed on a platform that supports serverless functions, such as Vercel.

## Privacy boundary
A normal website cannot read the visitor's browser history, bookmarks, passwords, or arbitrary local files. This project deliberately does not attempt to bypass those browser protections.

## Current checks
- Secure context / HTTPS
- Cookie access boundary
- Web Storage availability
- Notifications permission state
- Geolocation permission state
- Camera permission state
- Microphone permission state
- Basic browser/environment metadata

Permission queries use the browser Permissions API where supported. Some browser APIs are restricted to secure contexts.
