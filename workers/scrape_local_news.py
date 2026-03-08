"""
scrape_local_news.py — Bright Data SERP API → Supabase news_articles table

Searches Montgomery AL local news sources via Bright Data's SERP API
to catch real-time reporting from:
  - Montgomery Advertiser (montgomeryadvertiser.com)
  - AL.com (al.com)
  - WSFA 12 NBC (wsfa.com)
  - WAKA 8 CBS (waka.com)
  - City of Montgomery (montgomeryal.gov)

Usage:
    python scrape_local_news.py
"""

import os
import sys
import json
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client
import requests

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BRIGHT_DATA_API_KEY = os.getenv("BRIGHT_DATA", "").strip()
BRIGHT_DATA_ZONE = os.getenv("BRIGHT_DATA_ZONE", "web_unlocker1")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

if not BRIGHT_DATA_API_KEY:
    print("ERROR: Set BRIGHT_DATA in .env (your API key)")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Local news sources ─────────────────────────────────────────────
LOCAL_SOURCES = {
    "montgomeryadvertiser.com": "Montgomery Advertiser",
    "al.com": "AL.com",
    "wsfa.com": "WSFA 12 (NBC)",
    "waka.com": "WAKA 8 (CBS)",
    "montgomeryal.gov": "City of Montgomery",
}

# Safety-related search terms paired with site: operators
SAFETY_KEYWORDS = [
    "crime",
    "shooting",
    "police",
    "fire",
    "accident",
    "arrest",
    "emergency",
    "homicide",
    "robbery",
    "assault",
    "safety",
    "911",
    "incident",
    "missing person",
    "traffic fatality",
    "drug bust",
    "break-in",
    "stabbing",
]

# NOTE: No general queries here — those are handled by scrape_news.py (RSS + Twitter).
# This worker ONLY does site-specific SERP searches to avoid overlap.

# ── Bright Data SERP API ───────────────────────────────────────────

SERP_API_URL = "https://api.brightdata.com/request"


def search_serp(query, num_results=20):
    """Call Bright Data SERP API and return organic results."""
    headers = {
        "Authorization": f"Bearer {BRIGHT_DATA_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "zone": BRIGHT_DATA_ZONE,
        "url": f"https://www.google.com/search?q={requests.utils.quote(query)}&gl=us&hl=en",
        "format": "json",
    }

    try:
        resp = requests.post(SERP_API_URL, headers=headers, json=payload, timeout=60)
        if resp.status_code != 200:
            print(f"  SERP API error {resp.status_code}: {resp.text[:300]}")
            return []

        data = resp.json()

        # Bright Data wraps SERP results: {status_code, headers, body}
        # body is a JSON string containing {organic: [...], ...}
        body = data.get("body", data)
        if isinstance(body, str):
            body = json.loads(body)

        results = body.get("organic", [])
        return results

    except Exception as e:
        print(f"  SERP request error: {e}")
        return []


def parse_serp_result(result, source_name=None):
    """Convert a Bright Data SERP organic result into a news_articles record."""
    url = result.get("link", "")
    title = result.get("title", "")
    snippet = result.get("description", "")
    serp_source = result.get("source", "")  # e.g. "City of Montgomery (.gov)"

    if not url or not title:
        return None

    # Try to identify the source from the URL
    if not source_name:
        for domain, name in LOCAL_SOURCES.items():
            if domain in url:
                source_name = name
                break
        if not source_name:
            source_name = serp_source or "Web"

    return {
        "headline": (title.strip() + " | " + snippet.strip()) if snippet else title.strip(),
        "source": source_name,
        "url": url,
        "published_at": result.get("date") or datetime.now(timezone.utc).isoformat(),
        "relevance_score": 0,
    }


# ── Scraping strategies ────────────────────────────────────────────

def scrape_by_source(existing_urls):
    """Strategy 1: Site-specific searches for each local outlet."""
    new_articles = []

    for domain, source_name in LOCAL_SOURCES.items():
        print(f"\n--- {source_name} ({domain}) ---")

        # Build a combined query for this source
        safety_terms = " OR ".join(SAFETY_KEYWORDS[:8])  # Top 8 to keep query manageable
        query = f"site:{domain} Montgomery ({safety_terms})"

        results = search_serp(query, num_results=20)
        count = 0

        for r in results:
            article = parse_serp_result(r, source_name)
            if article and article["url"] not in existing_urls:
                new_articles.append(article)
                existing_urls.add(article["url"])
                count += 1

        print(f"  Found {len(results)} results, {count} new")

    return new_articles


# ── Main ───────────────────────────────────────────────────────────

def scrape():
    # Load existing URLs to avoid duplicates
    existing = supabase.table("news_articles").select("url").execute()
    existing_urls = {r["url"] for r in existing.data}
    print(f"Found {len(existing_urls)} existing articles in database.\n")

    total_new = 0

    # Site-specific searches only (general queries handled by scrape_news.py)
    print("=== LOCAL SOURCE SEARCHES (site-specific) ===")
    articles = scrape_by_source(existing_urls)
    if articles:
        for i in range(0, len(articles), 50):
            batch = articles[i:i + 50]
            supabase.table("news_articles").insert(batch).execute()
        total_new += len(articles)
        print(f"\nInserted {len(articles)} from local sources")

    print(f"\n{'=' * 50}")
    print(f"Done! {total_new} new articles inserted into news_articles.")
    print(f"SERP API queries used this run: {len(LOCAL_SOURCES)}")
    print(f"Estimated cost: ~${len(LOCAL_SOURCES) * 0.0015:.4f}")


if __name__ == "__main__":
    scrape()
