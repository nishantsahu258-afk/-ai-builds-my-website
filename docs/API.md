# API Reference

Base path: `/api`

- **Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- **Projects:** `GET /projects`, `POST /projects`, `GET /projects/:id`, `PATCH /projects/:id`, `DELETE /projects/:id`
- **Sources:** `POST /projects/:id/sources/files`, `POST /projects/:id/sources/links`, `GET /projects/:id/sources`, `POST /sources/:sourceId/exclude`, `POST /sources/:sourceId/retry`, `DELETE /sources/:sourceId`
- **Facts:** `GET /projects/:id/facts`, `POST /projects/:id/facts/manual`, `PATCH /facts/:factId`, `POST /facts/:factId/confirm`, `POST /facts/:factId/reject`
- **Research & Generation (AI-rate-limited):** `POST /projects/:id/research`, `GET /projects/:id/research-status`, `POST /projects/:id/generate` (`{ manualOnly?: boolean }`)
- **Websites & Publishing:** `GET /websites/:id`, `PATCH /websites/:id`, `POST /websites/:id/publish`, `POST /websites/:id/unpublish`, `GET /websites/:id/versions`, `GET /public/sites/:slug`
