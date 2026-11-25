# AI Builds My Website

AI-assisted business website generator that turns verified business details, uploaded documents (PDFs/images), and public web sources into structured, editable, and publishable websites.

## Live URLs

- **Frontend (Vercel):** https://client-murex-five-31.vercel.app
- **Backend (Render):** https://ai-builds-my-website.onrender.com
- **Published Sample Site:** https://client-murex-five-31.vercel.app/sites/lauda-shop-60cbed

## Key Features

- **Source Collection:** Upload PDFs/images or attach website, social, and Google listing URLs with SSRF protection.
- **Relevance & Fact Extraction:** Automatic source relevance assessment (`relevant`, `needs_review`, `mismatched`, `failed`) and structured fact extraction with source/evidence provenance.
- **Human Verification Gate:** Owner review for unverified facts, conflict resolution, source retry/exclude actions, and manual fact entry.
- **Fact-Safe Generation:**
  - *Normal mode:* Generates website sections using owner-confirmed facts from relevant sources.
  - *Manual-only mode (`manualOnly=true`):* Uses a deterministic conservative builder from confirmed manual facts only, with editable placeholders for missing fields.
- **Section Editor & Publishing:** Edit theme and sections, regenerate individual sections, validate content against unsupported claims, and publish immutable `WebsiteVersion` snapshots.

## Technology Stack

- **Frontend:** React 18, Vite, React Router, Tailwind CSS, Axios (`client/`)
- **Backend:** Node.js 24, Express (ES Modules), Mongoose, Zod, Multer, `express-rate-limit` (`server/`)
- **Database:** MongoDB Atlas
- **Queue:** In-process async job runner (`setImmediate`) — no Redis required
- **External Integrations:** Google Gemini (`gemini-2.0-flash`) and Tavily Search API

## Local Setup

### Prerequisites
- Node.js 24+
- MongoDB Atlas connection string (`MONGODB_URI`)
- Google Gemini API key (`GEMINI_API_KEY`)

### Commands

```bash
# 1. Backend
cd server
npm install
# Create server/.env based on ../.env.example
npm test
npm run dev

# 2. Frontend (in a separate terminal)
cd client
npm install
npm run build
npm run dev
```

## Required Environment Variables (Names Only)

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Backend HTTP port (default `5000`) |
| `MONGODB_URI` | MongoDB Atlas connection string (required in production) |
| `JWT_SECRET` | Signing secret for auth cookies (`>= 32` chars in production) |
| `CLIENT_URL` | Frontend origin for CORS |
| `PUBLIC_BASE_URL` | Backend public origin |
| `GEMINI_API_KEY` | Google Gemini API key |
| `WEB_SEARCH_PROVIDER` | `tavily` or `gemini` |
| `TAVILY_API_KEY` | Tavily API key (required if `WEB_SEARCH_PROVIDER=tavily`) |
| `UPLOAD_DIR` | Upload directory (`uploads` locally, `/var/data/uploads` on Render) |
| `COOKIE_SECURE` | `true` in production HTTPS, `false` locally |
| `COOKIE_SAME_SITE` | `none` for cross-origin production, `lax` locally |

## Testing

- **Backend tests:** `npm test --prefix server` — **35 passed, 0 failed** across **10 suites** (SSRF protection, auth/JWT, Zod validation, prompt injection defense, source exclusion, Golden Rule & manual-only isolation, in-process queue, Tavily fallback, rate limiters, storage path resolution).
- **Frontend build:** `npm run build --prefix client` — **PASS** (`vite build`, 1443 modules).
