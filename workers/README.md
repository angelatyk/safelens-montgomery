# SafeLens Montgomery — Data & AI Backend

Community safety intelligence for Montgomery, AL. We collect news from everywhere, then use AI to figure out what's real and what matters.

**Team:** Andres, VB, Angela

---

## The Big Picture

```
        COLLECT                    THINK                     SHOW
    ┌─────────────┐         ┌──────────────┐         ┌──────────────┐
    │  News RSS   │         │              │         │              │
    │  Google News│         │  Classify    │         │  Dashboard   │
    │  Twitter/X  │───────> │  Cluster     │───────> │  Safety Map  │
    │  311 Reports│         │  Validate    │         │  Alerts Feed │
    │  Alerts     │         │  Score       │         │  Scores      │
    └─────────────┘         └──────────────┘         └──────────────┘
      6 data sources       NLP Pipeline (AI)         Next.js Frontend
                           nlp_pipeline.py            Supabase DB
```

**Why?** One news article alone isn't proof. But when AL.com, WSFA, and a tweet all report the same shooting — that's validated. Our pipeline detects when different sources talk about the same event, then scores how trustworthy it is.

---

## What Each Script Does

**Collecting data:**
- `scrape_news.py` — Grabs articles from RSS feeds (AL.com, WSFA), Google News (400+ articles), and Twitter
- `scrape_local_news.py` — Searches specific local news sites using Bright Data SERP API
- `ingest_alerts.py` — Pulls breaking alerts from official sources only (police, NWS, local TV)
- `ingest_311.py` — Loads Montgomery's 311 service request data (279K reports)
- `seed_neighborhoods.py` — Sets up neighborhood boundaries from Census data

**Processing data:**
- `nlp_pipeline.py` — The AI brain. Takes everything collected and turns it into validated incidents

---

## How the NLP Pipeline Works

```
  Articles come in
        │
        v
  ┌─────────────────┐
  │  1. CLASSIFY     │  What type? (shooting, robbery, fire...)
  │     12 types     │  How severe? (critical / high / medium / low)
  └────────┬────────┘
           v
  ┌─────────────────┐
  │  2. CLUSTER      │  "These 3 articles are about the SAME event"
  │     TF-IDF       │  Groups by text similarity + time window
  └────────┬────────┘
           v
  ┌─────────────────┐
  │  3. SCORE        │  How trustworthy is this?
  │     0-100        │  More sources = higher score
  └────────┬────────┘  Official news > social media
           v
  ┌─────────────────┐
  │  4. CREATE       │  High-scoring clusters become real incidents
  │     INCIDENTS    │  Articles get linked back to them
  └────────┬────────┘
           v
  ┌─────────────────┐
  │  5. UPDATE       │  Each neighborhood gets a live safety score
  │     SAFETY MAP   │  Based on incident count + severity
  └────────┬────────┘
           v
  ┌─────────────────┐
  │  6. LEARN        │  Users vote: "Accurate" or "Not Relevant"
  │     FEEDBACK     │  Pipeline adjusts source trust over time
  └─────────────────┘
```

**Credibility scoring breakdown:**
- **Source count** (up to 60 pts) — 4+ sources = 60, single source = 10
- **Source quality** (up to 25 pts) — official news > random tweets. Adjusts dynamically from user feedback.
- **Severity boost** (up to 15 pts) — critical events score higher

Only clusters scoring 25+ become real incidents in the database.

---

## How to Run

```bash
cd workers
pip install -r requirements.txt
```

**Step 1 — Seed the map:**
```bash
python seed_neighborhoods.py
```

**Step 2 — Collect data:**
```bash
python scrape_news.py
python ingest_alerts.py
python ingest_311.py
```

**Step 3 — Run the AI:**
```bash
python nlp_pipeline.py
```

---

## Environment Variables

Create a `.env` file in the `workers/` folder:

```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
BEARER_TOKEN=twitter-api-token
BRIGHT_DATA=bright-data-customer-id
BRIGHT_DATA_ZONE=web_unlocker1
```

---

<!-- ## Team

- **Angela** — Database schema, auth, frontend
- **VB** — FBI/Weather data, RSS feeds, geo-mapping (notebook)
- **Andres** — NLP pipeline, scrapers, feedback loop, integration -->
