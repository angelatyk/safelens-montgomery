"""
ingest_alerts.py — Bright Data SERP API → Supabase alerts table

Searches ONLY official/primary sources for breaking safety alerts:
  - Montgomery Police Dept (montgomeryal.gov)
  - WSFA 12 NBC (wsfa.com) — primary local TV
  - WAKA 8 CBS (waka.com) — primary local TV
  - Montgomery Advertiser (montgomeryadvertiser.com) — primary newspaper
  - National Weather Service (weather.gov)
  - Alabama Law Enforcement Agency (alea.gov)

NO secondary accounts, blogs, or unofficial sources.

Usage:
    python ingest_alerts.py
"""

import os
import sys
import json
import re
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client
import requests

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BRIGHT_DATA_API_KEY = os.getenv("BRIGHT_DATA", "").strip()
BRIGHT_DATA_ZONE = os.getenv("BRIGHT_DATA_ZONE", "web_unlocker1")
BRIGHT_DATA_ZONE_WEB = os.getenv("BRIGHT_DATA_ZONE_WEB_SCRAPING", "web_unlocker_full_page")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)
if not BRIGHT_DATA_API_KEY:
    print("ERROR: Set BRIGHT_DATA in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Official sources ONLY ──────────────────────────────────────────

OFFICIAL_DOMAINS = [
    "montgomeryal.gov",
    "wsfa.com",
    "waka.com",
    "montgomeryadvertiser.com",
    "weather.gov",
    "alea.gov",
]

# NOTE: These queries focus on BREAKING/URGENT content only.
# General news coverage is handled by scrape_news.py (RSS) and scrape_local_news.py (SERP).
# Alerts = active incidents, emergencies, warnings, missing persons.
ALERT_QUERIES = [
    # TV stations — breaking news only
    'site:wsfa.com Montgomery "breaking news" OR "active shooter" OR "evacuation" OR "amber alert" OR "manhunt"',
    'site:waka.com Montgomery "breaking news" OR "emergency" OR "evacuation" OR "tornado warning"',
    # City/police — press releases and active alerts
    'site:montgomeryal.gov "press release" OR "alert" OR "emergency declaration" OR "boil water"',
    # Newspaper — breaking only (not general crime reporting)
    'site:montgomeryadvertiser.com Montgomery "breaking" OR "developing" OR "active scene" OR "manhunt"',
    # Weather — active warnings only
    'site:weather.gov Montgomery Alabama "warning" OR "watch" OR "advisory"',
    # State law enforcement — alerts only
    'site:alea.gov Montgomery "amber alert" OR "blue alert" OR "missing" OR "endangered"',
]

# ── Severity classification ────────────────────────────────────────

CRITICAL_KEYWORDS = [
    "active shooter", "shooting", "homicide", "murder", "tornado warning",
    "amber alert", "evacuation", "bomb threat", "hostage", "fatal",
    "mass casualty", "officer down",
]
HIGH_KEYWORDS = [
    "breaking", "stabbing", "robbery", "armed", "assault", "fire",
    "flash flood warning", "severe thunderstorm warning", "missing child",
    "carjacking", "hit and run", "pursuit", "standoff",
]
MEDIUM_KEYWORDS = [
    "arrest", "police", "crash", "accident", "emergency", "warning",
    "advisory", "flood watch", "missing person", "drug bust", "burglary",
    "road closure",
]


def classify_severity(title, snippet=""):
    """Classify alert severity based on keywords in title and snippet."""
    text = (title + " " + snippet).lower()

    for kw in CRITICAL_KEYWORDS:
        if kw in text:
            return "critical"
    for kw in HIGH_KEYWORDS:
        if kw in text:
            return "high"
    for kw in MEDIUM_KEYWORDS:
        if kw in text:
            return "medium"
    return "low"


# ── Neighborhood matching ──────────────────────────────────────────

def load_neighborhoods():
    """Load neighborhood names and IDs from Supabase."""
    resp = supabase.table("neighborhoods").select("id,name").execute()
    return {r["name"].lower(): r["id"] for r in resp.data}


def match_neighborhoods(title, snippet, hood_map, article_text=""):
    """Find which neighborhoods are mentioned in alert + article text."""
    text = (title + " " + snippet + " " + article_text).lower()
    matched = []

    for name_lower, uid in hood_map.items():
        if name_lower in text:
            matched.append(uid)
            continue
        short = name_lower.replace(" montgomery", "")
        if short != name_lower and re.search(rf"\b{re.escape(short)}\b", text):
            matched.append(uid)

    return matched


# ── Article fetching for location extraction ───────────────────────

# Map known Montgomery streets/roads to neighborhoods
STREET_TO_NEIGHBORHOOD = {
    "norman bridge": "south montgomery",
    "mobile highway": "west montgomery",
    "atlanta highway": "east montgomery",
    "troy highway": "south montgomery",
    "eastern boulevard": "east montgomery",
    "eastern blvd": "east montgomery",
    "taylor road": "mcgehee estates",
    "vaughn road": "vaughn park",
    "zelda road": "dalraida",
    "mcgehee road": "mcgehee estates",
    "bell street": "downtown montgomery",
    "dexter avenue": "downtown montgomery",
    "court street": "downtown montgomery",
    "madison avenue": "downtown montgomery",
    "perry street": "capitol heights",
    "hall street": "centennial hill",
    "holt street": "centennial hill",
    "cleveland avenue": "south montgomery",
    "south boulevard": "south montgomery",
    "south blvd": "south montgomery",
    "fairview avenue": "old cloverdale",
    "cloverdale road": "old cloverdale",
    "narrow lane": "old cloverdale",
    "highland avenue": "garden district",
    "woodley road": "woodley park",
    "coliseum boulevard": "chisholm",
    "coliseum blvd": "chisholm",
    "wares ferry": "east montgomery",
    "chantilly": "dalraida",
    "lower wetumpka": "north montgomery",
    "upper wetumpka": "north montgomery",
    "carter hill": "west montgomery",
    "rosa parks": "downtown montgomery",
    "federal drive": "east montgomery",
    "ann street": "capitol heights",
    "day street": "south montgomery",
    "mulberry street": "capitol heights",
    "eastdale": "eastdale",
    "arrowhead": "arrowhead",
    "dalraida": "dalraida",
    "hillwood": "hillwood",
    "edgewood": "edgewood",
    "ridgefield": "ridgefield",
    "cottage hill": "cottage hill",
}


def fetch_article_text(url):
    """Fetch full article via Bright Data Web Unlocker and extract plain text."""
    import html as html_mod

    # Try Bright Data Web Unlocker first, fall back to direct request
    raw_html = ""

    if BRIGHT_DATA_API_KEY and BRIGHT_DATA_ZONE_WEB:
        try:
            headers = {
                "Authorization": f"Bearer {BRIGHT_DATA_API_KEY}",
                "Content-Type": "application/json",
            }
            payload = {
                "zone": BRIGHT_DATA_ZONE_WEB,
                "url": url,
                "format": "raw",
            }
            resp = requests.post(
                "https://api.brightdata.com/request",
                headers=headers, json=payload, timeout=30,
            )
            if resp.status_code == 200 and len(resp.text) > 500:
                raw_html = resp.text
        except Exception:
            pass

    # Fallback: direct fetch
    if not raw_html:
        try:
            resp = requests.get(url, timeout=10, headers={
                "User-Agent": "Mozilla/5.0 (compatible; SafeLens/1.0)"
            })
            if resp.status_code == 200:
                raw_html = resp.text
        except Exception:
            pass

    if not raw_html:
        return ""

    # Strip HTML to plain text
    text = re.sub(r"<script[^>]*>.*?</script>", "", raw_html, flags=re.DOTALL)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html_mod.unescape(text)
    text = re.sub(r"\s+", " ", text)
    return text


def extract_neighborhoods_from_article(article_text, hood_map):
    """Extract neighborhood IDs from article text using street/address mapping."""
    text_lower = article_text.lower()
    matched_ids = set()

    # 1. Find "block of [Street]" patterns (most reliable)
    blocks = re.findall(r"\d{2,5}\s+block\s+of\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,3})", text_lower)
    for block_street in blocks:
        for street, hood_name in STREET_TO_NEIGHBORHOOD.items():
            if street in block_street:
                if hood_name in hood_map:
                    matched_ids.add(hood_map[hood_name])

    # 2. Check for known street names directly
    for street, hood_name in STREET_TO_NEIGHBORHOOD.items():
        if street in text_lower:
            if hood_name in hood_map:
                matched_ids.add(hood_map[hood_name])

    # 3. Check for neighborhood names directly
    for name_lower, uid in hood_map.items():
        if name_lower in text_lower:
            matched_ids.add(uid)

    return list(matched_ids)


# ── SERP API ───────────────────────────────────────────────────────

SERP_API_URL = "https://api.brightdata.com/request"


def search_serp(query):
    """Call Bright Data SERP API."""
    headers = {
        "Authorization": f"Bearer {BRIGHT_DATA_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "zone": BRIGHT_DATA_ZONE,
        "url": f"https://www.google.com/search?q={requests.utils.quote(query)}&gl=us&hl=en&tbs=qdr:w",
        "format": "json",
    }

    try:
        resp = requests.post(SERP_API_URL, headers=headers, json=payload, timeout=60)
        if resp.status_code != 200:
            print(f"  SERP error {resp.status_code}: {resp.text[:200]}")
            return []

        data = resp.json()
        body = data.get("body", data)
        if isinstance(body, str):
            body = json.loads(body)
        return body.get("organic", [])

    except Exception as e:
        print(f"  SERP request error: {e}")
        return []


def is_official(url):
    """Only allow results from official/primary domains."""
    return any(domain in url for domain in OFFICIAL_DOMAINS)


# ── Main ───────────────────────────────────────────────────────────

def ingest():
    hood_map = load_neighborhoods()
    print(f"Loaded {len(hood_map)} neighborhoods for matching.\n")

    # Get existing alert titles to avoid duplicates
    existing = supabase.table("alerts").select("title").execute()
    existing_titles = {r["title"] for r in existing.data}
    print(f"Found {len(existing_titles)} existing alerts.\n")

    total_new = 0

    for query in ALERT_QUERIES:
        source = query.split("site:")[1].split()[0] if "site:" in query else "general"
        print(f"--- {source} ---")

        results = search_serp(query)
        count = 0

        for r in results:
            url = r.get("link", "")
            title = r.get("title", "").strip()
            snippet = r.get("description", "").strip()

            if not title or not url:
                continue

            # ONLY official sources
            if not is_official(url):
                continue

            # Must mention Montgomery/Alabama or a known neighborhood
            text_lower = (title + " " + snippet).lower()
            has_location = (
                "montgomery" in text_lower
                or "alabama" in text_lower
                or any(name in text_lower for name in hood_map)
            )
            if not has_location:
                continue

            # Skip generic pages (calendars, lists, archives, product ads)
            skip_patterns = [
                "calendar", "news list", "archives", "meeting list",
                "open data portal", "home page", "bestseller",
                "expands", "comparison:", "memory foam", "rooftop tent",
                "product for", "weber recalls",
            ]
            if any(pat in text_lower for pat in skip_patterns):
                continue

            # Skip duplicates (by title similarity)
            if title in existing_titles:
                continue

            severity = classify_severity(title, snippet)

            # Fetch full article to extract street/neighborhood info
            article_text = fetch_article_text(url)
            if article_text:
                article_hoods = extract_neighborhoods_from_article(article_text, hood_map)
            else:
                article_hoods = []

            # Combine: neighborhoods from title/snippet + from article body
            title_hoods = match_neighborhoods(title, snippet, hood_map, article_text)
            all_hoods = list(set(title_hoods + article_hoods))

            # Build richer body from article if available
            body_text = snippet if snippet else title
            if article_text and len(article_text) > len(snippet):
                # Extract first ~500 chars of article body (skip nav/header junk)
                clean = article_text.strip()
                # Try to find article start (after common patterns)
                for marker in ["MONTGOMERY, Ala.", "MONTGOMERY —", "MONTGOMERY,", "Montgomery police"]:
                    idx = clean.find(marker)
                    if idx >= 0:
                        clean = clean[idx:]
                        break
                body_text = clean[:500].strip()

            alert = {
                "title": title,
                "body": body_text,
                "severity": severity,
                "neighborhoods": all_hoods,
                "is_active": True,
            }

            try:
                supabase.table("alerts").insert(alert).execute()
                existing_titles.add(title)
                count += 1
                hood_names = ", ".join(
                    name for name, uid in hood_map.items() if uid in all_hoods
                ) or "city-wide"
                print(f"  [{severity.upper()}] {title[:80]}")
                print(f"         -> {hood_names}")
            except Exception as e:
                print(f"  Error inserting: {e}")

        print(f"  {count} new alerts\n")
        total_new += count

    print(f"{'='*50}")
    print(f"Done! {total_new} new alerts inserted.")
    print(f"SERP queries used: {len(ALERT_QUERIES)}")
    print(f"Estimated cost: ~${len(ALERT_QUERIES) * 0.0015:.4f}")


if __name__ == "__main__":
    ingest()
