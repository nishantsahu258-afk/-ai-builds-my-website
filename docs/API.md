# REST API SPECIFICATION: AI Builds My Website

All API endpoints are prefixed with `/api` (except health check at `/health`).

All requests and responses use `Content-Type: application/json` unless handling multipart file uploads.

---

## Standard Response Envelope

### Success
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user. Sets httpOnly `token` cookie. |
| POST | `/api/auth/login` | No | Sign in existing user. Sets httpOnly `token` cookie. |
| POST | `/api/auth/logout` | Yes | Clears authentication cookie. |
| GET | `/api/auth/me` | Yes | Get authenticated user profile. |

---

## 2. Projects & Businesses (`/api/projects`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/projects` | Yes | List all projects owned by user with business data. |
| POST | `/api/projects` | Yes | Create business + project atomically. |
| GET | `/api/projects/:id` | Yes (Owner) | Get single project with business & current website. |
| PATCH | `/api/projects/:id` | Yes (Owner) | Update project title/status or business fields. |
| DELETE | `/api/projects/:id` | Yes (Owner) | Soft-delete project and cascade to sources & facts. |

---

## 3. Sources (`/api/projects/:id/sources`, `/api/sources`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/api/projects/:id/sources/files` | Yes (Owner) | Upload document (PDF/Image) via `multipart/form-data`. |
| POST | `/api/projects/:id/sources/links` | Yes (Owner) | Add web/social link (SSRF protected). |
| GET | `/api/projects/:id/sources` | Yes (Owner) | List all sources for project. |
| DELETE | `/api/sources/:sourceId` | Yes (Owner) | Delete source and unlinks physical file. |

---

## 4. Business Facts (`/api/facts`, `/api/projects/:id/facts`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/projects/:id/facts` | Yes (Owner) | List all extracted facts (conflicts sorted first). |
| POST | `/api/projects/:id/facts/manual` | Yes (Owner) | Manually add a verified fact with immediate confirmation. |
| PATCH | `/api/facts/:factId` | Yes (Owner) | Edit fact value. |
| POST | `/api/facts/:factId/confirm` | Yes (Owner) | User confirms fact value, clears conflict. |
| POST | `/api/facts/:factId/reject` | Yes (Owner) | Reject fact candidate. |

---

## 5. Web Research & Background Jobs

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/api/projects/:id/research` | Yes (Owner) | Trigger web research via search provider & scraper. |
| GET | `/api/projects/:id/research-status` | Yes (Owner) | Check status of sources and research jobs. |
| GET | `/api/jobs/:jobId` | Yes (Owner) | Get real-time status & progress of BullMQ job. |

---

## 6. Website Generation (`/api/projects/:id/generate`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/api/projects/:id/generate` | Yes (Owner) | Generate structured website JSON with Gemini. Requires 0 conflicts. |

---

## 7. Websites & Section Editor (`/api/websites`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/websites/:id` | Yes (Owner) | Get full website document with sections. |
| PATCH | `/api/websites/:id` | Yes (Owner) | Update website theme colors/font. |
| PATCH | `/api/websites/:id/sections/:sectionId` | Yes (Owner) | Edit section content manually. |
| POST | `/api/websites/:id/sections/:sectionId/regenerate` | Yes (Owner) | Regenerate ONLY selected section using Gemini. |
| PATCH | `/api/websites/:id/sections/:sectionId/toggle` | Yes (Owner) | Toggle section visibility (enabled/disabled). |
| PATCH | `/api/websites/:id/reorder` | Yes (Owner) | Reorder sections array. |

---

## 8. Publishing & Public Websites (`/api/publishing`, `/api/public`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/api/websites/:id/publish` | Yes (Owner) | Create version snapshot & publish website. |
| POST | `/api/websites/:id/unpublish` | Yes (Owner) | Unpublish website. |
| GET | `/api/websites/:id/versions` | Yes (Owner) | List all published version snapshots. |
| GET | `/api/public/sites/:slug` | **NO** | Public endpoint to render live published website. |
