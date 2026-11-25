# Architecture & Technical Decisions

## 1. Key Technical Choices
- **Frontend:** React 18 + Vite + Tailwind CSS (`client/`) deployed on Vercel with SPA and `/api/*` + `/uploads/*` proxy rewrites.
- **Backend:** Node.js 24 + Express (ES Modules) (`server/`) deployed as a single-instance Web Service on Render.
- **Database:** MongoDB Atlas (Mongoose ODM) for `User`, `Project`, `Business`, `Source`, `Fact`, `Website`, `WebsiteVersion`, and `GenerationJob`.
- **Fact-Safe AI Pipeline:**
  - Source relevance assessment (`assessSourceRelevance`) flags mismatched or failed sources before fact import.
  - Multi-candidate `Fact` schema preserves `sourceId`, `sourceURL`, `evidenceExcerpt`, and `extractionMethod`.
  - Manual-only mode (`manualOnly=true`) uses a deterministic builder from confirmed `extractionMethod === 'manual'` candidates only, without calling Gemini to invent marketing copy.
  - Publishing validates enabled sections (`findUnsupportedClaims`) before creating immutable `WebsiteVersion` snapshots.

## 2. Original Laravel + MySQL Requirement vs. Implemented Stack
- **Original assignment brief:** Laravel (PHP) + MySQL.
- **Actually implemented stack:** Node.js 24 + Express + MongoDB Atlas + React/Vite.
- **Rationale:** Unified JavaScript/ESM across frontend and backend, schema-level Zod validation for structured AI JSON outputs, and document-oriented storage for nested `Website` sections and multi-candidate `Fact` provenance.

## 3. What Was Cut or Deferred
- **Redis / BullMQ:** Replaced with an in-process async job runner (`setImmediate` in `server/src/queue/queue.js`) to avoid external Redis/Docker infrastructure in staging.
- **Cloud Object Storage (Cloudinary/S3):** Deferred in favor of local filesystem storage backed by Render Persistent Disk (`/var/data/uploads`).
- **Custom Domain & Multi-Tenant Billing:** Deferred; public sites are served under `/sites/<slug>` on the Vercel frontend.

## 4. Known Limitations & What Is Planned Next
- **Known Limitations:**
  - In-process jobs do not survive server restarts; the backend must run as a **single instance** on Render.
  - Automated browser E2E tests were not run in this environment (verified via backend unit/integration tests and manual browser checks).
- **Planned Next:**
  - Move background extraction/generation jobs to a persistent queue (e.g., BullMQ + managed Redis) for multi-instance scaling.
  - Add object storage (S3/Cloudinary) for uploaded media/PDFs.
