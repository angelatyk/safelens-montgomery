# SafeLens Montgomery
**Community Safety Intelligence Platform**

*Built for the World Wide Vibes Hackathon 2026 | Public Safety, Emergency Response & City Analytics*
*City of Montgomery, Alabama | March 5–9, 2026*

[![Live Site](https://img.shields.io/badge/Live_Site-Ready-success?style=for-the-badge)](https://safelens-montgomery.vercel.app)
[![Demo](https://img.shields.io/badge/Interactive_Demo-Available-blue?style=for-the-badge)](https://safelens-montgomery.vercel.app/demo)

## 📖 Overview
**SafeLens Montgomery** is a bidirectional community safety intelligence platform purpose-built for the city of Montgomery. It replaces raw incident data and alarming crime maps with responsible, context-rich safety narratives powered by Claude Sonnet 4 and Gemini 2.0 Flash.

## ⚠️ The Problem
Montgomery, Alabama carries an extraordinary history, but today, community trust is under pressure from a public safety system stretched beyond its capacity. 
The police department is significantly understaffed. As a result, 911 queues are overloaded with non-emergency calls, officers lack the AI force-multiplication needed to intelligently prioritize responses, and residents are left with fragmented, decontextualized raw data that creates fear without understanding.

## 💡 The Solution
SafeLens acts as a force multiplier for an understaffed department by bridging the staffing gap with AI. 
It ingests data from six real-time sources, runs them through an AI pipeline that clusters and validates events across sources, and surfaces human-readable safety narratives. These narratives help officials prioritize their resources where they are needed most. Residents, in turn, can report and confirm incidents directly — staying more aware of what is happening around their city while actively contributing to the picture officials rely on.

---

## 🚀 How to Setup and Run Locally

### Prerequisites
- Node.js (v18+)
- A [Supabase](https://supabase.com) account and project
- An Anthropic API Key (Claude) and a Google Gemini API Key.

### 1. Clone & Install
```bash
git clone https://github.com/angelatyk/safelens-montgomery.git
cd safelens-montgomery
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root of the project with your keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

ANTHROPIC_API_KEY=your_claude_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to view the residential dashboard, or `http://localhost:3000/demo` to log into the official dashboard.

---

## ✨ Key Features
- **Data Ingestion Pipeline**: Python workers collect and score data from 6 sources (including Google News, RSS, Twitter/X, and 311 Reports).
- **Incident Card Feed**: Front-end feed displaying AI narratives, official statuses, and live community polling. 
- **Resident Report Submission**: Frictionless, potentially anonymous incident reporting with geolocation.
- **Official Narrative Queue**: Auth-gated dashboard for city officials offering structured decision support, source breakdown, and live polling results.

## 🧠 AI Strategy & Pipeline
The application utilizes a dual-model AI architecture:
1. **Gemini 2.0 Flash**: Handles fast, high-volume classification, clustering, and credibility scoring.
2. **Claude Sonnet 4**: Generates quality-sensitive, responsible narratives explicitly prompted to avoid stigmatizing language and to estimate resolution times based on verified data.

**The Pipeline Flow**: 
*Collect* → *Classify* → *Cluster (TF-IDF)* → *Score (Credibility)* → *Incident Validation* → *Narrative Generation* → *Community Feedback Loop*

## 🛠️ Architecture

### System Flow
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA SOURCES                                       │
│   AL.com RSS   │   WSFA RSS   │   Google News   │   311 Reports   │   Twitter   │
└─────────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
                         ┌────────────────────────────────┐
                         │     Python NLP Workers         │
                         │  Collect → Classify → Cluster  │
                         │     Credibility Score 0–100    │
                         └───────────────┬────────────────┘
                                         │
                        ┌────────────────┴────────────────┐
                        │                                 │
            ┌───────────▼───────────┐         ┌──────────▼──────────┐
            │   Gemini 2.0 Flash    │         │   Claude Sonnet 4   │
            │  Classify & Cluster   │────────▶│  Narrative Writer   │
            └───────────────────────┘         └──────────┬──────────┘
                                                         │
                                          ┌──────────────▼──────────────┐
                                          │     Supabase PostgreSQL     │
                                          └──────────────┬──────────────┘
                                                         │
                                          ┌──────────────▼──────────────┐
                                          │       Next.js 14 API       │
                                          │     + Supabase Realtime     │
                                          └──────────────┬──────────────┘
                                                         │
                             ┌───────────────────────────┴───────────────────────────┐
                             │                                                       │
                 ┌───────────▼───────────┐                               ┌───────────▼───────────┐
                 │     Resident View     │                               │     Official View     │
                 └───────────────────────┘                               └───────────────────────┘
```

### Technology Stack
- **Frontend / API Layer**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **Database & Auth**: Supabase (PostgreSQL, Auth, Realtime).
- **Data Ingestion/Backend**: Python NLP workers deployed via Railway.
- **AI Models**: Gemini 2.0 Flash & Anthropic Claude Sonnet 4.
- **Web Scraping**: Bright Data SERP API.
- **Hosting**: Vercel (Frontend) + Railway (Workers).

## 🔮 Future Improvements
SafeLens acts as a pilot for a deployable SaaS platform. Future roadmap items include:
- Official City-Wide Alert Broadcasts using Supabase Realtime.
- Interactive Map View with Mapbox heatmaps.
- NWS Weather & Event Calendar integrations.
- Extended Civic Engagement including public infrastructure reporting.

---

## 👥 The Team
- **Angela Kwok** (Team Lead) - [github.com/angelatyk](https://github.com/angelatyk)
- **Andres Linero** - [github.com/andres-linero](https://github.com/andres-linero)
- **Varoun Bajaj** - [github.com/varounbajaj-proj](https://github.com/varounbajaj-proj)
