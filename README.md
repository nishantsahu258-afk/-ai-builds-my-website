# AI Builds My Website

> **AI-Powered Business Website Generator SaaS**  
> Built for the Websites.co.in internship assignment.  
> An application that allows non-technical business owners to provide their business details, uploaded documents (PDFs, price lists, photos), and social links, and automatically generates a verified, editable, production-ready business website.

---

## 1. Project Introduction

Small business owners often lack the time and technical expertise to build a custom website from scratch. **AI Builds My Website** solves this by gathering whatever business information an owner already possesses (business name, location, price lists, PDFs, shop photos, Instagram, Facebook, and Google Business links), extracting and verifying key business facts, detecting conflicting information, and generating a professional, responsive, and editable website using Google Gemini AI.

### The Golden Rule
> **NEVER INVENT BUSINESS FACTS. WHEN INFORMATION IS MISSING, UNCERTAIN, OR CONFLICTING, ASK THE USER.**

The system strictly refuses to fabricate phone numbers, addresses, customer reviews, prices, operating hours, awards, or product claims. All facts displayed on the generated website are traceable to verified sources.

---

## 2. Features

- **Multi-Step Intake Wizard**: Smooth onboarding capturing business basics, online links, and uploaded files.
- **Multimodal Document Understanding**: Extracts text and facts from uploaded PDFs (using `pdf-parse`) and product/signboard photos (using Gemini Vision).
- **Automated Web Research & Scraping**: Discovers publicly accessible online details with SSRF-safe scraping and Gemini Grounding / Tavily search adapters.
- **Fact Verification & Conflict Resolution Engine**: Detects conflicting evidence (e.g. differing phone numbers between social media and directories) and forces explicit human resolution.
- **Structured Gemini Website Generation**: Generates strictly validated JSON schemas (not unvetted executable HTML) for safety, deterministic layout, and full editability.
- **Prompt Injection Defense**: Untrusted text from external documents and websites is strictly treated as data only within XML delimiters.
- **Visual Website Editor**: Live interactive preview, section visibility toggle, section reordering, and in-place text editing.
- **Single Section Regeneration**: Ability to regenerate an individual section (e.g. Hero or About) with Gemini without modifying or corrupting any other section.
- **One-Click Public Publishing**: Generates collision-resistant unique public slugs (e.g. `/sites/sharma-electronics-a81f`), saves immutable version snapshots, and serves public visitors without authentication.
- **SaaS Workspace & Dashboard**: Clean modern UI matching the Websites.co.in design specification (8-page UI reference).

---

## 3. Technology Stack

*Note on Stack Decision: The original assignment document mentioned PHP/Laravel and MySQL. As permitted in the Master Development Prompt, this project intentionally uses Node.js and MongoDB to provide native JSON document manipulation, unified ES Modules, and seamless official `@google/genai` integration.*

### Frontend
- **Framework**: React.js 18 + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router v6
- **HTTP Client**: Axios with credentials
- **State Management**: React Context API (`AuthContext`, `ToastContext`)

### Backend
- **Runtime**: Node.js (ES Modules `type: "module"`)
- **Server Framework**: Express.js
- **Database ODM**: Mongoose 8.x
- **Schema Validation**: Zod
- **Authentication**: JWT stored in secure `httpOnly` cookies with bcryptjs password hashing
- **Security Middleware**: Helmet, CORS, Express Rate Limiters, SSRF Protection
- **File Uploads**: Multer with MIME verification and size caps

### Database & Storage
- **Database**: MongoDB Atlas
- **Queue & Background Jobs**: BullMQ + Redis 7
- **File Storage**: Local filesystem adapter (dev) / Cloudinary adapter (production)

### AI & Research
- **AI Model**: Google Gemini 2.0 Flash (`@google/genai` official SDK)
- **Vision**: Gemini Multimodal Vision for business photo inspection
- **Web Scraping**: Cheerio + SSRF-safe fetch
- **Web Search**: Gemini Google Search Grounding / Tavily Search API

---

## 4. Application Architecture

```
ai-builds-my-website/
├── client/                     # Frontend React + Vite SPA
│   ├── public/                 # Static assets & favicons
│   ├── src/
│   │   ├── components/         # Common, layout, and UI components
│   │   ├── context/            # AuthContext and ToastContext
│   │   ├── pages/              # 8 Primary application screens
│   │   ├── routes/             # AppRoutes with ProtectedRoute guards
│   │   ├── services/           # Axios API services
│   │   ├── App.jsx             # Root React component
│   │   └── main.jsx            # Entry point
│   ├── package.json
│   ├── tailwind.config.js      # Custom theme tokens (#7064E8, #F3F5FA, #17182B)
│   └── vite.config.js          # Proxy configuration to Express backend
│
├── server/                     # Backend Node.js / Express REST API
│   ├── src/
│   │   ├── config/             # Environment, Database, and Storage config
│   │   ├── integrations/       # Gemini AI, Web Scraper, Search, and Storage
│   │   ├── middleware/         # Auth, Ownership, Upload, Rate Limiting, SSRF
│   │   ├── models/             # Mongoose Models (User, Business, Project, Source, Fact, Website, Version, Job)
│   │   ├── modules/            # Domain controllers & routes (Modular Monolith)
│   │   ├── queue/              # BullMQ queue definitions
│   │   ├── utils/              # Fact extractor, Prompt builder, Website validator
│   │   ├── validators/         # Zod schemas for request validation
│   │   ├── workers/            # BullMQ background workers
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Server entry point with graceful shutdown
│   ├── tests/                  # Automated unit and integration tests
│   └── package.json
│
├── docs/                       # Architecture & API documentation
│   ├── ARCHITECTURE.md
│   └── API.md
│
├── .env.example                # Sample environment variables
├── docker-compose.yml          # Redis local container definition
├── DECISIONS.md                # Architectural decisions and tradeoffs
└── README.md
```

---

## 5. Getting Started & Installation

### Prerequisites
- Node.js 18+ (tested on Node.js v20/v24)
- npm or pnpm
- MongoDB Atlas cluster URL (or local MongoDB)
- Google Gemini API Key ([Get one free from Google AI Studio](https://aistudio.google.com/app/apikey))
- Redis (optional for development; required for multi-threaded BullMQ background workers)

### Step 1: Clone and Configure Environment

```bash
cd ai-builds-my-website

# Copy environment example
cp .env.example server/.env
```

Open `server/.env` and provide your real credentials:
```ini
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
PUBLIC_BASE_URL=http://localhost:5000

# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/ai-builds-my-website?retryWrites=true&w=majority

# JWT Auth
JWT_SECRET=super-secret-random-key-at-least-32-chars
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# Google Gemini API
GEMINI_API_KEY=AIzaSy...your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
GEMINI_VISION_MODEL=gemini-2.0-flash

# Redis (optional for dev, docker-compose provided)
REDIS_URL=redis://localhost:6379

# Search Provider
WEB_SEARCH_PROVIDER=gemini
```

### Step 2: Start Redis (Optional)

If running background BullMQ workers in Docker:
```bash
docker-compose up -d
```
*(If Redis is not started, the application automatically handles job execution in-process without crashing).*

### Step 3: Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Step 4: Run the Application

In terminal 1 (Backend API):
```bash
cd server
npm run dev
```

In terminal 2 (Frontend Client):
```bash
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 6. Running Tests

Run the backend test suite:
```bash
cd server
npm test
```

The automated test suite verifies:
1. SSRF URL protection and blocking of loopback/private/metadata ranges.
2. User password hashing and JWT authentication cookie verification.
3. Strict Zod website JSON schema validation.
4. Prompt injection defense and safe XML delimiters.
5. Section regeneration logic and fact conflict resolution.

---

## 7. 5-Minute Demo Workflow

1. **Register / Sign in**: Create an account or log in to the clean SaaS dashboard (`/`).
2. **Create Website Project**: Click **"Create website"**, enter business basics (e.g., `Sharma Electronics`, City: `Durg`, State: `Chhattisgarh`).
3. **Add Sources**: Paste an Instagram link, Google Maps link, or upload a product PDF / photo.
4. **Review & Verify Facts**:
   - The system displays extracted facts and identifies source origins.
   - If conflicting information exists (e.g. differing phone numbers), choose the preferred candidate or type a custom verified value.
5. **AI Website Generation**: Click **"Generate website"**. Watch the real processing steps execute.
6. **Visual Website Editor**:
   - Preview the generated website.
   - Edit headlines, descriptions, or contact information.
   - Click **"✦ Regenerate this section"** to regenerate only that specific section using Gemini while keeping all other sections unchanged.
7. **Publish & Share**: Click **"Publish website ↗"**. The system creates an immutable version snapshot and gives a public link (e.g. `/sites/sharma-electronics-a81f`).
8. **Public Access**: Open the public URL in an incognito window without logging in to see the live, mobile-responsive business website.

---

## 8. Deployment Architecture

- **Frontend**: Deploy `client` to **Vercel** or **Netlify** with environment variable `VITE_API_URL` pointing to backend.
- **Backend API**: Deploy `server` to **Render**, **Railway**, or **AWS ECS/App Runner**.
- **Database**: **MongoDB Atlas** M0/M10 cluster.
- **Queue**: **Upstash Redis** or managed Redis instance.
- **Storage**: Set `STORAGE_PROVIDER=cloudinary` in production for persistent cloud media storage.

---

## 9. Known Limitations

- **Social Media Scrape Barriers**: Instagram and Facebook strictly enforce login walls and anti-bot challenges. In accordance with safety guidelines, the app does not attempt unauthorized bypasses; instead, it marks the link and provides a friendly manual entry fallback.
- **Third-Party API Rate Limits**: Free tier Gemini API keys are subject to Google AI Studio RPM rate limits. The system handles rate limits with exponential backoff retries.
