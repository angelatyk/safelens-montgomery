"""
scrape_news.py — All free RSS sources → Supabase news_articles table

Combines:
  1. Direct RSS feeds (feedparser) — AL.com, WSFA → has article summaries
  2. Google News RSS — broad, 55+ sources → volume & diversity
  3. Twitter/X API — real-time social signal

Direct RSS gives summaries (better for NLP). Google gives breadth.
Together they feed the NLP pipeline with max coverage.

Usage:
    python scrape_news.py
"""

import os
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from urllib.parse import quote
from dotenv import load_dotenv
from supabase import create_client
import requests

try:
    import feedparser
    from bs4 import BeautifulSoup
    HAS_FEEDPARSER = True
except ImportError:
    HAS_FEEDPARSER = False

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BEARER_TOKEN = os.getenv("BEARER_TOKEN", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Direct RSS feeds (with article summaries for NLP) ────────────

DIRECT_FEEDS = [
    {"name": "AL.com Montgomery", "url": "https://www.al.com/arc/outboundfeeds/rss/category/news/montgomery/"},
    {"name": "AL.com Crime", "url": "https://www.al.com/arc/outboundfeeds/rss/category/news/crime/"},
    {"name": "WSFA 12 Local", "url": "https://www.wsfa.com/rss/section/local-news.rss"},
    {"name": "WSFA Crime", "url": "https://www.wsfa.com/rss/section/crime.rss"},
]

# ── Google News RSS (broad aggregation) ───────────────────────────

GOOGLE_QUERIES = [
    "Montgomery Alabama crime",
    "Montgomery Alabama police",
    "Montgomery Alabama safety",
    "Montgomery Alabama shooting",
    "Montgomery Alabama fire department",
    "Montgomery AL accident OR incident",
    "Montgomery Alabama arrest OR homicide",
]

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"

# ── Twitter/X config ──────────────────────────────────────────────

TWITTER_QUERIES = [
    "Montgomery Alabama (crime OR shooting OR police OR fire OR 911) -is:retweet lang:en",
    "Montgomery AL (accident OR emergency OR arrest OR homicide) -is:retweet lang:en",
]

TWITTER_SEARCH_URL = "https://api.twitter.com/2/tweets/search/recent"

# ── Relevance keywords ───────────────────────────────────────────

SAFETY_KWS = [
    "crime", "robbery", "theft", "assault", "shooting", "stabbing",
    "burglary", "stolen", "carjacking", "911", "police", "mpd",
    "fire", "emergency", "officer", "arrest", "suspect",
    "unsafe", "dangerous", "suspicious", "safety", "incident", "crash",
]
HIGH_KWS = ["shooting", "stabbing", "robbery", "assault", "arrest", "homicide", "murder"]


def score_relevance(title, summary=""):
    """Score relevance 0.0-1.0 using keyword matching."""
    text = f"{title} {summary}".lower()
    s = sum(0.15 for kw in SAFETY_KWS if kw in text)
    s += sum(0.25 for kw in HIGH_KWS if kw in text)
    if "montgomery" in text:
        s += 0.2
    return round(max(0.0, min(1.0, s)), 2)


# ── Direct RSS functions (feedparser) ─────────────────────────────

def fetch_direct_rss(feed):
    """Fetch a direct RSS feed. Returns articles with summaries."""
    if not HAS_FEEDPARSER:
        return []

    name = feed["name"]
    try:
        parsed = feedparser.parse(feed["url"], agent="SafeLens-Montgomery/1.0")
        entries = parsed.entries
        if not entries:
            return []
    except Exception as e:
        print(f"  Error fetching {name}: {e}")
        return []

    articles = []
    for entry in entries:
        title = entry.get("title", "").strip()
        url = entry.get("link", "")
        summary = entry.get("summary", entry.get("description", ""))

        if not title or not url:
            continue

        # Strip HTML from summary
        if summary and HAS_FEEDPARSER:
            summary = BeautifulSoup(summary, "html.parser").get_text()[:400]

        # Parse date
        published_at = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            try:
                dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                published_at = dt.isoformat()
            except Exception:
                pass

        relevance = score_relevance(title, summary)

        # Include summary in headline for NLP (separated by |)
        headline = f"{title} | {summary}" if summary else title

        articles.append({
            "headline": headline,
            "source": name,
            "url": url,
            "published_at": published_at,
            "relevance_score": relevance,
        })

    return articles


# ── Google News RSS functions ─────────────────────────────────────

def parse_pub_date(date_str):
    try:
        dt = datetime.strptime(date_str.strip(), "%a, %d %b %Y %H:%M:%S %Z")
        return dt.isoformat() + "Z"
    except ValueError:
        return None


def extract_source(title):
    if " - " in title:
        parts = title.rsplit(" - ", 1)
        return parts[0].strip(), parts[1].strip()
    return title.strip(), "Unknown"


def fetch_google_news(query):
    url = GOOGLE_NEWS_RSS.format(query=quote(query))
    articles = []
    try:
        resp = requests.get(url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (compatible; SafeLens/1.0)"
        })
        resp.raise_for_status()
        root = ET.fromstring(resp.content)

        for item in root.findall(".//item"):
            title_raw = item.findtext("title", "")
            headline, source = extract_source(title_raw)
            link = item.findtext("link", "")
            pub_date = item.findtext("pubDate", "")

            if not headline or not link:
                continue

            relevance = score_relevance(headline)

            articles.append({
                "headline": headline,
                "source": source,
                "url": link,
                "published_at": parse_pub_date(pub_date),
                "relevance_score": relevance,
            })
    except Exception as e:
        print(f"  Error fetching '{query}': {e}")
    return articles


# ── Twitter/X functions ───────────────────────────────────────────

def fetch_tweets(query):
    if not BEARER_TOKEN:
        return []

    headers = {"Authorization": f"Bearer {BEARER_TOKEN}"}
    params = {
        "query": query,
        "max_results": 50,
        "tweet.fields": "created_at,author_id,text,public_metrics",
        "user.fields": "name,username,location",
        "expansions": "author_id",
    }

    try:
        resp = requests.get(TWITTER_SEARCH_URL, headers=headers, params=params, timeout=15)
        if resp.status_code in (401, 402, 403):
            print(f"  X API auth issue ({resp.status_code}) — skipping")
            return []
        if resp.status_code != 200:
            print(f"  X API error {resp.status_code}: {resp.text[:200]}")
            return []

        data = resp.json()
        tweets = data.get("data", [])
        users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}

        results = []
        for t in tweets:
            user = users.get(t["author_id"], {})
            username = user.get("username", "unknown")
            tweet_id = t["id"]

            results.append({
                "headline": t["text"][:500],
                "source": f"twitter:@{username}",
                "url": f"https://x.com/{username}/status/{tweet_id}",
                "published_at": t.get("created_at"),
                "relevance_score": 0,
            })
        return results
    except Exception as e:
        print(f"  Error: {e}")
        return []


# ── Main scraper ──────────────────────────────────────────────────

def scrape():
    existing = supabase.table("news_articles").select("url").execute()
    existing_urls = {r["url"] for r in existing.data}
    print(f"Found {len(existing_urls)} existing articles in database.\n")

    total_new = 0

    # ── Direct RSS feeds (with summaries) ──
    print("=== DIRECT RSS FEEDS (with summaries for NLP) ===")
    if HAS_FEEDPARSER:
        for feed in DIRECT_FEEDS:
            print(f"  {feed['name']}...")
            articles = fetch_direct_rss(feed)
            new = [a for a in articles if a["url"] not in existing_urls and a["relevance_score"] >= 0.15]
            if new:
                supabase.table("news_articles").insert(new).execute()
                total_new += len(new)
                for a in new:
                    existing_urls.add(a["url"])
                print(f"    +{len(new)} new (with summaries)")
            else:
                print(f"    No new articles")
    else:
        print("  feedparser not installed — pip install feedparser beautifulsoup4")

    # ── Google News ──
    print("\n=== GOOGLE NEWS (broad coverage) ===")
    for query in GOOGLE_QUERIES:
        print(f"  '{query}'...")
        articles = fetch_google_news(query)
        new = [a for a in articles if a["url"] not in existing_urls and a["relevance_score"] >= 0.15]
        if new:
            supabase.table("news_articles").insert(new).execute()
            total_new += len(new)
            for a in new:
                existing_urls.add(a["url"])
            print(f"    +{len(new)} new articles")
        else:
            print(f"    No new articles")

    # ── Twitter/X ──
    print("\n=== TWITTER/X ===")
    if not BEARER_TOKEN:
        print("  No BEARER_TOKEN set — skipping Twitter")
    else:
        for query in TWITTER_QUERIES:
            short = query[:50] + "..."
            print(f"  '{short}'")
            tweets = fetch_tweets(query)
            new = [t for t in tweets if t["url"] not in existing_urls]
            if new:
                supabase.table("news_articles").insert(new).execute()
                total_new += len(new)
                for t in new:
                    existing_urls.add(t["url"])
                print(f"    +{len(new)} new tweets")
            else:
                print(f"    No new tweets")

    print(f"\nDone! {total_new} new items inserted into news_articles.")


if __name__ == "__main__":
    scrape()
