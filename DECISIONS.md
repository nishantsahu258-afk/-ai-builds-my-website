# Architecture Decisions

## 1. In-Process Job Queue (Default)
- Background source extraction, research, and website generation run via an in-process queue (`server/src/queue/queue.js`) using `setImmediate`.
- **Trade-off:** Zero Redis/Docker dependency for local development and staging, at the cost of jobs not surviving a process restart. Staging/production must run a **single backend instance**.

## 2. Local Filesystem Storage with Render Persistent Disk
- Uploaded PDFs and images are stored on disk under `config.storage.uploadDir` (resolved relative to `server/` in development, and `/var/data/uploads` on Render Persistent Disk in production).
- `storageKey` is stored as `<projectId>/<filename>` and resolved safely with path-traversal protection.

## 3. Fact-Safe Generation & Publishing Gate
- Normal generation uses only owner-confirmed facts from relevant, non-excluded sources.
- Manual-only generation (`manualOnly=true`) uses a deterministic builder from confirmed `extractionMethod === 'manual'` candidates only, without calling Gemini to invent marketing copy.
- Publishing validates enabled sections against unsupported promotional claims before creating a `WebsiteVersion` snapshot.
