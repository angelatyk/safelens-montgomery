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

## How the AI Writes Safety Narratives

After the NLP pipeline validates incidents, **Claude Sonnet 4** turns raw data into safety updates that everyday people can understand.

### What Gets Turned Into a Narrative

The AI pulls from **three sources** — each one creates a different kind of update:

| Source | Narrative Style | Example |
|--------|----------------|---------|
| Validated incidents | Full safety advisory with neighborhood context, severity, and resolution timeline | "Hey Montgomery — there's been a confirmed shooting near Fairview Ave. The area usually clears in 6-12 hours..." |
| News articles (relevance >= 0.3) | Summary of what happened and why it matters locally | "Heads up — strong storms may be headed our way Saturday. Now's a good time to secure anything loose in your yard..." |
| Resident reports | Community-sourced alert that thanks the reporter | "Thanks to a neighbor who flagged suspicious activity near Dexter Ave. If you're nearby, stay aware..." |

### How the Prompts Work

Claude is told to write like a **trusted neighbor** — not a police scanner, not a news anchor. The prompts include:

- **Neighborhood safety context** — Claude knows which areas are typically safe (score >= 90) vs. hotspots (score < 70), so it can say things like "this is unusual for Cloverdale" or "this area has been a hotspot recently"
- **Resolution time estimates** — For each incident type (shooting: 6-12 hours, traffic: 1-3 hours, fire: 2-6 hours), so people know what to expect
- **Credibility awareness** — If confidence is below 40, Claude says "we're still getting details on this"
- **Actionable advice** — Every narrative ends with something the reader can DO (avoid the area, check on neighbors, call 911)

### Source Cross-Linking

When a narrative is created, the system also links it back to its sources:

```
Narrative: "Armed Robbery Suspect Search Underway"
  ├── Linked Incident: nlp_cluster #4133 (robbery, credibility: 72)
  ├── Linked Article: AL.com "Man arrested in armed robbery"
  └── Linked Article: WSFA "MPD investigating robbery on Bell St"
```

This happens through junction tables (`narrative_incidents`, `narrative_news_articles`). The system uses `matched_incident_ids` from the NLP pipeline to cross-link — so if a narrative is generated from a news article that was part of a validated cluster, both the article AND the incident get linked.

Officers see these counts in the dashboard: "2 Incidents, 3 News Articles, 1 Resident Report" — which helps them decide how seriously to take each narrative.

---

## News Feed Filtering

The public safety news feed (`/api/news`) applies **three layers of filtering** to make sure residents only see relevant safety content:

**Layer 1 — Scraper level:** Articles scoring below 0.15 relevance never enter the database.

**Layer 2 — API level:** Only articles with relevance >= 0.3 are returned. Additionally:
- **Excluded sources:** Twitter, X.com, Facebook (social media is too noisy for the public feed)
- **Noise keywords removed:** "history", "picture of the day", "best restaurant", "top 10", "years ago", "throwback", "recipe", "review"

**Layer 3 — Display level:** Headlines stored as "Title | Summary" are split into clean title + AI summary fields.

---

## Data Quality — What's Good and What Needs Work

### What Works Well

- **Multi-source validation** catches real events. A single tweet can't create an incident — it needs corroboration from other sources.
- **Keyword filtering** keeps "Best Restaurants 2026" out of the safety feed.
- **Credibility scoring** gives officers a clear signal: 80+ score = high confidence, below 40 = still unverified.
- **Feedback loop** means the system gets smarter — unreliable sources get automatically downweighted over time.

### What Needs Improvement

| Issue | Impact | Potential Fix |
|-------|--------|--------------|
| **Clustering misses** — Related articles with different wording end up in separate clusters ("MPD officer involved in shooting" vs. "Police shoot suspect on Ann Street") | Splits one event into multiple incidents, reducing credibility scores | Use embedding-based similarity (LLM embeddings) instead of TF-IDF keywords |
| **311 data is underused** — 279K service requests sit in the DB but aren't linked to safety events | Missing ground-truth signals that could corroborate news reports | Classify 311 requests by safety relevance, link to nearby incidents |
| **Neighborhood matching is fragile** — Relies on finding street/neighborhood names in headlines | Many incidents don't get assigned to a neighborhood | Geocode addresses to lat/lng, use point-in-polygon matching |
| **Twitter noise** — Social posts pass keyword filters but aren't about real safety events | Clutters the pipeline with irrelevant data | Pre-filter with LLM classification ("is this a real safety event?") |
| **No temporal decay** — Old articles keep their high relevance scores forever | Stale news competes with fresh events | Decay relevance_score over time (e.g., halve it after 7 days) |
| **Hash-based dedup is brittle** — JSON key ordering differences produce different hashes for the same data | Some narratives get generated twice | Use content-similarity dedup instead of exact hash matching |
| **Narratives aren't real-time** — Generated only when pipeline runs or is manually triggered | Resident reports sit in DB until next batch run | Trigger generation on report submission or use short polling interval |
| **Source attribution in narratives** — Claude doesn't always cite which specific sources informed the narrative | Officers have to check linked sources separately | Add explicit attribution to prompts ("According to WSFA and AL.com...") |

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
