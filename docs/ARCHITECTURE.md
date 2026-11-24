# ARCHITECTURE: AI Builds My Website

## 1. High-Level Architecture Overview

"AI Builds My Website" is designed as a **Modular Monolith** full-stack AI SaaS application. It strictly adheres to the core principle: **NEVER INVENT BUSINESS FACTS. WHEN INFORMATION IS MISSING, UNCERTAIN, OR CONFLICTING, ASK THE USER.**

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT (SPA)                                      |
|  React 18 + Vite + Tailwind CSS + Lucide React + React Router + Axios Context API |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | HTTP / JSON (CORS + Cookies)
                                          v
+-----------------------------------------------------------------------------------+
|                                 SERVER (REST API)                                 |
|                     Node.js (ES Modules) + Express.js Framework                  |
|                                                                                   |
|  [Security & Middleware]                                                          |
|    - Helmet (HTTP headers)                                                        |
|    - CORS (credentials, whitelisted origin)                                       |
|    - express-rate-limit (API, Auth, Upload limiters)                              |
|    - httpOnly JWT authentication cookie                                           |
|    - SSRF Protection (DNS / IP address blocking & hop validation)                 |
|    - Zod request body validation & error formatting                               |
|                                                                                   |
|  [Modular Business Domains]                                                       |
|    - Auth (/api/auth)              - Extraction (/api/sources)                    |
|    - Projects (/api/projects)      - Research (/api/projects/:id/research)        |
|    - Sources (/api/sources)        - AI Generation (/api/projects/:id/generate)   |
|    - Facts (/api/facts)            - Websites & Editor (/api/websites)            |
|    - Publishing (/api/websites)    - Public Renderer (/api/public/sites/:slug)    |
+-------------------+-----------------------------------+---------------------------+
                    |                                   |
         Mongoose   v                        Job Queue  v (BullMQ)
+-----------------------+                   +---------------+
|     MongoDB Atlas     |                   |  Redis 7.0+   |
|  - Users              |                   +-------+-------+
|  - Businesses         |                           |
|  - Projects           |                           v
|  - Sources            |                   +---------------+
|  - Facts              |                   |  Background   |
|  - Websites           |                   |    Workers    |
|  - WebsiteVersions    |                   | - Source/PDF  |
|  - GenerationJobs     |                   | - Research    |
+-----------------------+                   | - Generation  |
                                            +---------------+
                                                    |
                                                    v
                                    +-------------------------------+
                                    |     External Integrations     |
                                    | - Google Gemini 2.0 API       |
                                    | - Gemini Vision               |
                                    | - Web Scraper (Cheerio)       |
                                    | - Search (Grounding / Tavily) |
                                    +-------------------------------+
```

---

## 2. Key Data Flows

### A. Intake & Source Extraction Flow
1. User creates a project with business basics (Name, City, State, Country, Category).
2. User attaches online links (Instagram, Facebook, Google Maps) and uploads documents (PDF, JPG, PNG).
3. Sources are saved in MongoDB with `extractionStatus: 'pending'`.
4. Jobs are dispatched to BullMQ `source-processing` queue (with in-process fallback for local dev).
5. Workers process sources:
   - **PDF documents**: Extracted using `pdf-parse`. Text is analyzed using Gemini with prompt injection defense.
   - **Images**: Read as base64 and analyzed using Gemini Vision for signage, products, and prices.
   - **Web & Social**: Accessible HTML is scraped using Cheerio after SSRF verification. If blocked (e.g. Instagram login barrier), marked failed with friendly manual entry instructions.

### B. Fact Extraction & Conflict Detection Flow
1. Extracted text is fed into `extractFactsFromText` with strict prompt delimiters (`<SOURCE_DATA>`) and instructions to treat all text as untrusted data.
2. `normalizeAndStoreFacts` saves candidates to the `Fact` collection:
   - If key does not exist: Saved as `status: 'unverified'`.
   - If key exists with same value: Additional candidate added as corroborating evidence.
   - If key exists with **conflicting value**: Fact marked `status: 'conflict'`. **The system never automatically chooses between conflicting candidate values.**
3. On the Verification Screen (UI Reference Page 3), the business owner reviews extracted facts and explicitly resolves conflicts before website generation can proceed.

### C. AI Generation & Structured Website Flow
1. Server verifies 0 unresolved conflicts exist.
2. Confirmed business facts are formatted into a clean JSON context.
3. Dedicated prompt instructs Gemini to output **strictly validated JSON** matching the website schema.
4. Response is validated against Zod `websitePayloadSchema`.
5. Website document is persisted in MongoDB with separate modular sections (Navbar, Hero, About, Services, Hours, Contact, Footer).

### D. Single Section Regeneration Flow
1. In the Visual Editor (UI Reference Page 5), the user selects a single section (e.g. Hero) and enters optional tone instructions.
2. Server loads existing section and confirmed business facts.
3. Server invokes Gemini to regenerate **only that single section**.
4. Validated replacement section is updated in MongoDB while all unrelated sections remain completely untouched.

### E. Publishing & Public Versioning Flow
1. User clicks "Publish website ↗" on Publish screen (UI Reference Page 6).
2. Server creates an immutable `WebsiteVersion` snapshot storing the exact content and timestamp.
3. Unique URL slug (e.g. `sharma-electronics-a81f`) is assigned.
4. Public visitors load `/sites/:slug` without authentication. The public website renderer renders the published version snapshot, keeping uncommitted drafts private.
