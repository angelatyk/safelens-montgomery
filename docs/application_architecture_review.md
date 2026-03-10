# System Design & Architecture Review: SafeLens Montgomery

## 1. Executive Summary
This document provides a comprehensive system design and architecture review of the **SafeLens Montgomery** end-to-end application (excluding the data ingestion Python workers). Overall, the application demonstrates a high degree of maturity, professional software engineering practices, and production readiness. The architecture successfully leverages the Next.js 14 App Router, Supabase (for Auth, Database, and Realtime), and Tailwind CSS to deliver a highly responsive, bilingual (Resident vs. Official) safety intelligence platform. 

The codebase is highly modular, with clean separation of concerns between API routes, UI components, and database logic. Security boundaries between public routes and authenticated official routes are well respected.

---

## 2. Best Practices & Codebase Evaluation

The application layer adheres strictly to modern full-stack TypeScript/Next.js best practices:

* **Modularity and Server/Client Boundaries**: The codebase correctly distinguishes between Server Components (fetching data, handling API logic) and Client Components (interactive UI, state management, hooks). Features like `IncidentFeed` and `AuthForm` correctly encapsulate their specific domain logic.
* **Database Access**: Backend routes use a dedicated `supabaseAdmin` client bypassing RLS only where server authoritative actions are required (e.g., generating AI narratives, recording feedback), while standard operations respect user roles.
* **Performance & Deduplication**: The AI generation endpoint (`/api/narratives/generate`) handles idempotency beautifully by utilizing a SHA-256 hash (`source_data_hash`) of the raw incident/news data. This prevents redundant, costly LLM calls for data that has already been analyzed.
* **Error Handling & Resilience**: API routes wrap logic in proper `try/catch` blocks, returning strict, standard HTTP status codes (`400`, `401`, `429`, `500`). 
* **State & Feedback Loops**: The use of Supabase junction tables (`narrative_feedback`, `narrative_incidents`, `narrative_news_articles`) to track many-to-many relationships and compute real-time statistics (vote tallies, source reputations) is textbook relational database design.

### Areas for Future Polish
* **IP-based Rate Limiting**: The feedback endpoint (`/api/narratives/[id]/feedback`) correctly checks for a 15-minute rate limit window. However, it notes that true L2 IP-based rate limiting requires storing the IP or using an external sliding window cache (like Redis). Implementing Vercel KV or Upstash Redis for IP rate limiting would make this bulletproof against spam bots.

---

## 3. REST API Endpoint Summary

The Next.js API routes are clean and resource-oriented. Here is a summary of the available endpoints:

| Endpoint | Method | Description & Functionality |
| :--- | :---: | :--- |
| `/api/health` | [GET](file:///d:/Projects/safelens-montgomery/app/api/narratives/%5Bid%5D/public-updates/route.ts#4-35) | Health check endpoint to verify backend uptime. Used by cron jobs to prevent Supabase auto-pause. |
| `/api/auth/signout` | [POST](file:///d:/Projects/safelens-montgomery/app/api/narratives/%5Bid%5D/public-updates/route.ts#36-69) | Safely destroys the user session via Supabase Auth. |
| `/api/incidents` | [GET](file:///d:/Projects/safelens-montgomery/app/api/narratives/%5Bid%5D/public-updates/route.ts#4-35) | Fetches raw incidents (911 calls, crime data). Includes pagination and filtering by neighborhood or incident type. |
| `/api/news` | [GET](file:///d:/Projects/safelens-montgomery/app/api/narratives/%5Bid%5D/public-updates/route.ts#4-35) | Aggregates safety-relevant local news. Employs regex/keyword filtering to strip out noise (e.g., listicles, history articles) and social media (Twitter/Facebook). |
| `/api/reports` | [POST](file:///d:/Projects/safelens-montgomery/app/api/narratives/%5Bid%5D/public-updates/route.ts#36-69) | Allows residents to submit geolocated hazard/safety reports. Handles both authenticated and anonymous workflows. |
| `/api/narratives` | [GET](file:///d:/Projects/safelens-montgomery/app/api/narratives/%5Bid%5D/public-updates/route.ts#4-35) | Lists AI-generated neighborhood safety narratives. Dynamically computes accurate vote counts, incident counts, and news counts via junction tables. |
| `/api/narratives/[id]` | [GET](file:///d:/Projects/safelens-montgomery/app/api/narratives/%5Bid%5D/public-updates/route.ts#4-35) | Fetches detailed view of a specific narrative, along with its statistical upvotes and recent official updates. |
| `/api/narratives/[id]/sources` | [GET](file:///d:/Projects/safelens-montgomery/app/api/narratives/%5Bid%5D/public-updates/route.ts#4-35) | Transparency endpoint. Returns the raw, unedited source incidents, news articles, and resident reports that the AI used to write the narrative. |
| `/api/narratives/[id]/comments`| `GET/POST`| Handles threaded discussion under narratives. Supports both public neighborhood chatter and private official notes. |
| `/api/narratives/[id]/feedback`| `GET/POST`| Handles the core community feedback loop (Accurate vs. Not Relevant). Contains auto-resolve logic: if a narrative gets >=5 downvotes constituting 60% of all votes, it auto-resolves. Updates dynamic `source_reputation` scoring. |
| `/api/narratives/[id]/public-updates` | `GET/POST`| Appends official city updates (e.g., "Police dispatched") directly to the narrative timeline. |
| `/api/narratives/[id]/verify` | [PATCH](file:///d:/Projects/safelens-montgomery/app/api/narratives/%5Bid%5D/verify/route.ts#4-65) | State machine endpoint for Officials to mark incidents/narratives as `verified`, `dispatched`, or `resolved`. Syncs status across linked Resident Reports. |
| `/api/narratives/generate`| [POST](file:///d:/Projects/safelens-montgomery/app/api/narratives/%5Bid%5D/public-updates/route.ts#36-69) | **Core AI Engine.** Triggered via cron. Evaluates unprocessed incidents, news, and reports. Invokes Anthropic Claude 3.5 Sonnet to write clear, non-alarmist neighborhood updates. Hashes data to prevent duplicate runs. |

---

## 4. Frontend Design & Authentication UX

The frontend structure fulfills all architectural and functional requirements while delivering a premium user experience.

### Landing Page & Open Access
The main dashboard landing page (`/(dashboard)/page.tsx`) correctly serves as an unauthenticated entry point. It displays the `IncidentFeed`, `LocalNewsFeed`, and `AISafetyInsights` components grid style. This ensures that any resident can instantly get value out of the platform without encountering a login friction barrier.

### Authentication Workflows
* **Resident Flow**: Residents can use the platform entirely anonymously. If they choose to log in (to track their personal reports or comment publicly), they use standard Supabase Auth.
* **Official Flow**: The Official Operations panel (`/(dashboard)/official/page.tsx`) is cleanly separated into its own route segment. It provides a secure, two-column layout consisting of a `NarrativeQueue` on the left and a highly detailed triage workspace (`NarrativeDetailPanel`) on the right. 

### The Demo Experience
The [demo/page.tsx](file:///d:/Projects/safelens-montgomery/app/demo/page.tsx) is an exceptionally well-thought-out artifact. It bypasses tedious testing steps by providing one-click "Enter as Resident" and "Enter as Official" buttons mapped to pre-configured Supabase user credentials. 
* Visually, it utilizes glowing borders, distinct accent colors (`blue` for residents, `amber` for officials), and clear micro-copy explaining what each role does. 
* Smooth asynchronous loading states are handled natively during the authentication hand-off.

### Design Principles
Across the frontend, the code relies heavily on modern CSS principles (CSS variables for colors: `var(--color-bg-canvas)`), responsive grid layouts, and headless UI paradigms (accessible HeroIcons). The codebase shows high UI maturity with conditional rendering for toasts, error states, and responsive hiding of columns on smaller viewports.

---

### Conclusion
The SafeLens Montgomery application layer is brilliantly executed. It successfully marries deep AI integration to a traditional, stable CRUD framework without sacrificing clarity or user experience. It passes this architectural code review with top marks.
