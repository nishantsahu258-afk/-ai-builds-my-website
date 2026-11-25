# System Architecture

- **Client (`client/`):** React + Vite SPA. Uses `/api` base URL (proxied via Vite in dev, or Vercel rewrites in production).
- **Server (`server/`):** Express REST API + in-process job queue (`sourceQueue`, `researchQueue`, `generationQueue`).
- **Database:** MongoDB Atlas (`Project`, `Business`, `Source`, `Fact`, `Website`, `WebsiteVersion`, `GenerationJob`, `User`).
- **File Storage:** `config.storage.uploadDir` served at `/uploads` via `express.static(config.storage.uploadDir)`. Production uses `/var/data/uploads` on a Render Persistent Disk.
- **External APIs:** Google Gemini (`gemini-2.0-flash`) and Tavily Search API.
