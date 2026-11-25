# AI Builds My Website

AI-assisted business website generator built with React, Vite, Node.js, Express, and MongoDB Atlas.

## Architecture Overview

- **Frontend:** React + Vite + Tailwind CSS (`client/`), configured for Vercel SPA deployment (`client/vercel.json`).
- **Backend:** Node.js + Express (`server/`), configured for single-instance Render deployment.
- **Database:** MongoDB Atlas (`MONGODB_URI` required in production).
- **Queue:** In-process async job runner (`setImmediate`) by default — **Redis is not required**. Because jobs run in-process, keep **1 backend instance**; in-flight jobs are not durable across process restarts.
- **Storage:** Local filesystem via Multer + `storage.service.js`. In production on Render, mount a Persistent Disk at `/var/data` and set `UPLOAD_DIR=/var/data/uploads`.
- **External Integrations:** Google Gemini (content generation & vision) and Tavily (public web research).
- **Local Preview vs Deployment:** `http://localhost:5173/sites/<slug>` is a local preview only, not internet hosting.

## Local Development

```bash
# Backend
cd server
npm install
npm test
npm run dev

# Frontend
cd client
npm install
npm run build
npm run dev
```
