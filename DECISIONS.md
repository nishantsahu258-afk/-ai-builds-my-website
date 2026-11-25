# Architecture & Technology Decisions

## 1. Stack Deviation: React + Vite + Node.js/Express + MongoDB Atlas
- **Original brief:** Laravel + MySQL.
- **Implemented stack:** React + Vite (`client/`), Node.js 24 + Express (`server/`), and MongoDB Atlas (Mongoose).
- **Rationale & Trade-offs:** Unified JavaScript/ESM across client and server, rapid JSON schema validation with Zod, and flexible document storage for multi-candidate `Fact` provenance and nested `Website` section schemas.

## 2. In-Process Job Queue (Single-Instance Requirement)
- **Decision:** Background tasks (PDF/image extraction, web research, website generation) run in-process via `setImmediate` in `server/src/queue/queue.js`.
- **Trade-off:** Eliminates Redis and Docker dependencies for local development and staging, but **in-flight jobs do not survive process restarts** and the backend **must run as a single instance** on Render.

## 3. Persistent Local Filesystem Storage
- **Decision:** Uploaded PDFs and images are stored on disk under `config.storage.uploadDir` (resolved relative to `server/` locally, and `/var/data/uploads` on Render Persistent Disk in production).
- **Trade-off:** Avoids external object-storage setup while persisting uploads across deploys when backed by Render's `/var/data` disk mount. `storage.service.js` normalizes Windows/POSIX paths and blocks path traversal.

## 4. Deterministic Manual-Only Generation
- **Decision:** When `manualOnly=true`, `executeWebsiteGeneration` bypasses Gemini copywriting and builds sections deterministically from confirmed `extractionMethod === 'manual'` candidates only, leaving missing fields as editable placeholders.
- **Trade-off:** Guarantees zero hallucinated marketing claims or external source leakage in manual-only mode.
