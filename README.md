# SENTINEL // Browser Security Auditor

Privacy-first browser security audit with a hacker-style UI.

## Stack
- Static HTML/CSS/JavaScript
- Vercel Functions
- No database
- No analytics
- No third-party runtime dependencies

## Deploy to Vercel
1. Create a GitHub repository and upload this folder.
2. Import the repository into Vercel.
3. Deploy with the default settings.
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
