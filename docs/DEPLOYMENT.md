# Deployment Guide (Render + Vercel)

## 1. Backend (Render Web Service)
- **Root Directory:** `server`
- **Build Command:** `npm ci`
- **Start Command:** `node src/server.js`
- **Node Version:** `24`
- **Instances:** **1** (required because the job queue runs in-process)
- **Persistent Disk:** Mount at `/var/data` and set `UPLOAD_DIR=/var/data/uploads`

### Required Render Environment Variables
Set these in the Render dashboard (never commit values to Git):
- `NODE_ENV=production`
- `MONGODB_URI`
- `JWT_SECRET` (32+ characters)
- `GEMINI_API_KEY`
- `WEB_SEARCH_PROVIDER` (`tavily` or `gemini`)
- `TAVILY_API_KEY` (if using `tavily`)
- `CLIENT_URL=https://client-murex-five-31.vercel.app`
- `PUBLIC_BASE_URL=https://ai-builds-my-website.onrender.com`
- `UPLOAD_DIR=/var/data/uploads`
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=none`

## 2. Frontend (Vercel)
- **Framework Preset:** Vite
- **Root Directory:** `client`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Proxy & SPA Rewrites (`client/vercel.json`):**
  1. `/api/:path*` -> `https://ai-builds-my-website.onrender.com/api/:path*`
  2. `/uploads/:path*` -> `https://ai-builds-my-website.onrender.com/uploads/:path*`
  3. `/(.*)` -> `/index.html`
