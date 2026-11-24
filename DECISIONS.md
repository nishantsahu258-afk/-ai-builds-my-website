# ARCHITECTURAL DECISIONS & TRADEOFFS (DECISIONS.md)

This document records the foundational architectural decisions, rationale, security considerations, and deliberate engineering tradeoffs made during the design and development of **AI Builds My Website**.

---

## 1. Node.js & MongoDB in Place of Laravel & MySQL

### Context & Decision
The original internship assignment prompt mentioned PHP/Laravel and MySQL. We intentionally selected a modern JavaScript (ES Modules) stack: **Node.js, Express.js, and MongoDB Atlas with Mongoose**.

### Rationale
1. **Unstructured & Semi-Structured Data**: Business sources (scraped HTML, extracted PDF text, Vision image labels, and flexible section content) have fluid, heterogeneous schemas. MongoDB's document model natively supports polymorphic website section definitions, dynamic candidate arrays, and variable metadata without requiring awkward EAV (Entity-Attribute-Value) relational workarounds.
2. **Unified Language across Stack**: Using modern JavaScript (ESM) across both backend and frontend enables unified validation logic (Zod), shared TypeScript-compatible contracts, and reduces context switching.
3. **First-Class AI SDK Support**: The official `@google/genai` SDK and asynchronous Node event loop provide native streaming, non-blocking I/O for web scraping and AI inference, and seamless integration with BullMQ for background workers.

---

## 2. Modular Monolith Architecture

### Context & Decision
We adopted a **Modular Monolith** pattern instead of microservices or a single monolithic file.

### Rationale
- **High Cohesion, Low Coupling**: Modules (Auth, Projects, Sources, Facts, Generation, Websites, Publishing) each encapsulate their own routes, controllers, and domain logic.
- **Operational Simplicity**: Microservices introduce distributed transaction complexity, network latency, and operational overhead that harm an early-stage SaaS MVP.
- **Future Scalability**: If the `extraction` or `generation` service requires independent scaling in the future, the clear module boundaries allow extracting them into standalone serverless functions or containerized services with minimal refactoring.

---

## 3. Structured JSON Generation vs. Executable HTML

### Context & Decision
The system **never asks Gemini to generate raw HTML, CSS, or JavaScript code**. Instead, Gemini produces strongly-typed, validated JSON matching a predefined schema, which is then rendered by vetted React components.

### Rationale
1. **Security & Prompt Injection / XSS Defense**: Executing arbitrary AI-generated HTML/scripts creates massive XSS and injection vulnerabilities. Malicious content in uploaded documents or external websites could easily hijack the generated site.
2. **Deterministic UI & Component Reusability**: Predefined React components guarantee responsiveness, accessibility, typography consistency, and strict alignment with the design system.
3. **Granular Editability**: With structured JSON, the user can edit individual text fields, toggle section visibility, reorder sections, and regenerate isolated sections without risking layout corruption or broken HTML tags.

---

## 4. Fact Verification Engine & Conflict Resolution

### Context & Decision
The product enforces the **Golden Rule**: *Never invent business facts. When information is missing, uncertain, or conflicting, ask the user.*

### How Fact Verification Works
1. When documents, photos, or links are parsed, candidate values are extracted along with exact quoted evidence and source attribution.
2. If multiple sources report conflicting data (e.g. Phone A on Instagram vs. Phone B on Google Maps), the system flags the fact with `status: 'conflict'`.
3. **The system NEVER silently or arbitrarily chooses between conflicting facts.**
4. The business owner must review the candidates on the Verification screen and select or manually type the correct value.
5. The AI website generation pipeline **actively blocks execution** until all conflicting facts are explicitly confirmed or resolved by the owner.

---

## 5. Background Jobs & Worker Architecture

### Context & Decision
Background processing handles source extraction, PDF parsing, web research, and AI website generation using **BullMQ and Redis**.

### Fallback Resilience
In local development environments where Redis might not be immediately available, the system incorporates an **in-process async fallback pattern**: when BullMQ fails to connect, jobs are processed in the background event loop without crashing or blocking standard REST API responses.

---

## 6. Publishing Architecture & Versioned Snapshots

### Context & Decision
Publishing does not deploy a new static site or bundle for each user. Instead:
1. One high-performance, responsive **Public Website Renderer** (`/sites/:slug`) dynamically renders the published website.
2. When the user publishes, an immutable **`WebsiteVersion` snapshot** is created.
3. Visitors only see the snapshot from the latest published version. Draft changes made in the Visual Editor remain private and unexposed until the user clicks "Republish".

---

## 7. Deliberate Cuts & Deferred Scope

To deliver a rock-solid, production-minded MVP within timeline constraints, the following features were intentionally deferred:
- **Custom Domain CNAME mapping**: Using slug-based URLs (`/sites/:slug`) first.
- **E-Commerce Checkout & Payment Gateways**: The MVP focuses on business discovery, contact, and product catalogs rather than payment processing.
- **Multi-user Team Collaboration**: Single-owner workspace architecture was prioritized.

---

## 8. Known Technical Limitations
1. **Social Media Access Restrictions**: Major platforms (Instagram, Facebook) enforce anti-scraping gates and login barriers. Our system gracefully detects these barriers, informs the user, and provides clean manual entry fallback rather than fragile bypasses.
2. **Third-Party API Rate Limits**: Gemini API quotas and rate limits apply; the system handles these with retry backoff and persistent job states.

---

## 9. Next Planned Milestones
1. Custom domain DNS routing (via Cloudflare for SaaS).
2. Direct image upload to Cloudinary/S3 with automatic responsive webp resizing.
3. Theme style presets (custom typography, color palettes, dark mode toggles).
4. Direct WhatsApp click-to-chat integration for local business inquiries.
