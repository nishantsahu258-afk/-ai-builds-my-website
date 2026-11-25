# API Reference

All routes are mounted under `/api` (plus `GET /health` at root). Protected routes require a valid JWT cookie (`authenticate`).

## Auth (`/api/auth`)
- `POST /api/auth/register` — Register a new user (`{ name, email, password }`).
- `POST /api/auth/login` — Authenticate and set HTTP-only JWT cookie (`{ email, password }`).
- `POST /api/auth/logout` — Clear auth cookie.
- `GET /api/auth/me` — Return current authenticated user.

## Projects (`/api/projects`)
- `GET /api/projects` — List projects owned by the current user.
- `POST /api/projects` — Create a project and initial manual business facts.
- `GET /api/projects/:id` — Get project details.
- `PATCH /api/projects/:id` — Update project metadata.
- `DELETE /api/projects/:id` — Delete project.

## Sources (`/api/projects/:id/sources`, `/api/sources/:sourceId`)
- `POST /api/projects/:id/sources/files` — Upload PDF/image (`multipart/form-data`, field `file`).
- `POST /api/projects/:id/sources/links` — Add website, social, or Google listing URL.
- `GET /api/projects/:id/sources` — List all sources for a project.
- `POST /api/sources/:sourceId/exclude` — Exclude a source without overwriting its `relevance`.
- `POST /api/sources/:sourceId/retry` — Re-queue extraction for a failed source.
- `DELETE /api/sources/:sourceId` — Remove a source.

## Facts (`/api/projects/:id/facts`, `/api/facts/:factId`)
- `GET /api/projects/:id/facts` — List all facts for a project.
- `POST /api/projects/:id/facts/manual` — Add or update a confirmed manual fact.
- `PATCH /api/facts/:factId` — Update fact value.
- `POST /api/facts/:factId/confirm` — Confirm a fact/candidate.
- `POST /api/facts/:factId/reject` — Reject an unverified fact.

## Research, Generation & Jobs (AI-rate-limited where noted)
- `POST /api/projects/:id/research` *(aiLimiter)* — Start public web research.
- `GET /api/projects/:id/research-status` — Poll research status.
- `POST /api/projects/:id/generate` *(aiLimiter)* — Queue website generation (`{ manualOnly?: boolean }`).
- `GET /api/projects/:id/jobs` — List generation/source jobs for a project.

## Websites & Publishing
- `GET /api/websites/:id` — Fetch website draft.
- `PATCH /api/websites/:id` — Update website theme/settings.
- `PATCH /api/websites/:id/sections/:sectionId` — Update a section.
- `POST /api/websites/:id/sections/:sectionId/regenerate` — Regenerate a single section.
- `PATCH /api/websites/:id/sections/:sectionId/toggle` — Enable/disable a section.
- `PATCH /api/websites/:id/reorder` — Reorder sections.
- `POST /api/websites/:id/publish` — Validate content and publish a new `WebsiteVersion`.
- `POST /api/websites/:id/unpublish` — Unpublish website.
- `GET /api/websites/:id/versions` — List published versions.
- `GET /api/public/sites/:slug` *(public)* — Serve published `WebsiteVersion` snapshot.
