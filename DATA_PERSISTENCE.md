# Data Persistence Strategy

This Hacker News wrapper uses **client-side persistence only**:

## Browser Storage (Primary)
- All user data (lists, bookmarks, posts, comments) is stored in browser `localStorage`.
- Key: `hn-wrapper-static-store-v1`
- Schema: `{ users: {}, posts: [], comments: [] }`
- Each user gets a unique ID (generated once and stored in localStorage).

## Local Development
When running locally (`npm run dev`), the Node.js backend is available:
- API routes in `app/api/*` provide server-backed persistence
- Filesystem store at `data/wrapper-store.json` is used for multi-user sync
- Optional: can be used for sharing data across devices

## GitHub Pages Deployment
When deployed to GitHub Pages:
- **Static export only** (no server, no API routes)
- All operations use **browser `localStorage` as fallback**
- User data persists per browser/device (localStorage is per-origin)
- Each user's browser is independent

## Data Lifespan
- **Same browser**: Data persists indefinitely in localStorage
- **Different browser/device**: Fresh data (no sync between browsers)
- **Storage limit**: ~5-10MB per origin (varies by browser)
- **Manual backup**: User can export/download data via browser console or future UI feature

## Why No Server Sync?
GitHub Pages is fully static—no server can run to receive data from the browser and commit back to the repo. To enable cross-device sync, would need:
- A backend service (Vercel, Railway, AWS Lambda, etc.)
- GitHub API token (security risk in browser)
- Manual download/upload feature

Current approach keeps it simple: **one browser = one user instance**, no backend needed.
