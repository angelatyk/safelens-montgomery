"""
nlp_pipeline.py — SafeLens Montgomery NLP Pipeline

8-step pipeline:
  1. Load articles + alerts from Supabase
  2. Geo-join incidents → neighborhoods (optional, --geojoin)
  3. Classify: 12 incident types + 4 severity levels
  4. Cluster: TF-IDF cosine similarity groups same-event articles
  5. Score: credibility 0-100 based on source count, quality, severity
  6. Create validated incidents + link source articles
  7. Update neighborhood safety scores
  8. Feedback loop: user votes adjust source reputation over time

Usage:
    python nlp_pipeline.py              # standard run
    python nlp_pipeline.py --geojoin    # includes geo-join (slow, run once)
"""

import os
import sys
import re
import math
from collections import Counter, defaultdict
from datetime import datetime, timezone
import requests
from dotenv import load_dotenv
from supabase import create_client

try:
    from shapely.geometry import shape, Point
    HAS_SHAPELY = True
except ImportError:
    HAS_SHAPELY = False

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Incident type classification ──────────────────────────────────

INCIDENT_TYPES = {
    "shooting": [
        "shooting", "shot", "gunfire", "gunshot", "shooter", "active shooter",
        "shots fired", "gun violence",
    ],
    "homicide": [
        "homicide", "murder", "murdered", "killing", "killed", "fatal shooting",
        "death investigation", "body found",
    ],
    "robbery": [
        "robbery", "robbed", "armed robbery", "holdup", "stick-up",
        "carjacking", "carjacked",
    ],
    "assault": [
        "assault", "assaulted", "stabbing", "stabbed", "attack", "attacked",
        "beating", "domestic violence", "battery",
    ],
    "burglary": [
        "burglary", "break-in", "breaking and entering", "home invasion",
        "theft", "stolen", "larceny", "shoplifting",
    ],
    "fire": [
        "fire", "blaze", "arson", "structure fire", "house fire",
        "apartment fire", "warehouse fire", "fire department",
    ],
    "traffic": [
        "crash", "accident", "collision", "hit and run", "hit-and-run",
        "traffic fatality", "fatal crash", "vehicle accident", "wreck",
        "pedestrian struck", "dui",
    ],
    "missing_person": [
        "missing person", "missing child", "missing", "amber alert",
        "endangered", "silver alert", "blue alert",
    ],
    "drug": [
        "drug bust", "drug arrest", "narcotics", "drug trafficking",
        "overdose", "fentanyl", "meth", "cocaine seized",
    ],
    "weather": [
        "tornado", "tornado warning", "severe weather", "flash flood",
        "flood warning", "thunderstorm warning", "winter storm",
        "hurricane", "tropical storm", "weather advisory",
    ],
    "police": [
        "arrest", "arrested", "warrant", "manhunt", "pursuit", "chase",
        "standoff", "swat", "fugitive", "wanted",
    ],
    "other_emergency": [
        "evacuation", "bomb threat", "hazmat", "gas leak", "power outage",
        "boil water", "water main break", "emergency declaration",
    ],
}

SEVERITY_RULES = {
    "critical": {
        "types": {"shooting", "homicide"},
        "keywords": [
            "active shooter", "mass casualty", "multiple victims", "fatal",
            "killed", "dead", "tornado warning", "evacuation order",
            "officer down", "hostage",
        ],
    },
    "high": {
        "types": {"robbery", "assault", "missing_person"},
        "keywords": [
            "breaking", "armed", "stabbing", "carjacking", "manhunt",
            "standoff", "pursuit", "amber alert", "fire", "severe",
            "flash flood warning",
        ],
    },
    "medium": {
        "types": {"burglary", "traffic", "drug", "police"},
        "keywords": [
            "arrest", "crash", "accident", "emergency", "warning",
            "advisory", "drug bust", "road closure",
        ],
    },
}


def classify_type(text):
    """Classify incident type from text. Returns (type, confidence)."""
    text_lower = text.lower()
    scores = {}

    for inc_type, keywords in INCIDENT_TYPES.items():
        score = 0
        for kw in keywords:
            if kw in text_lower:
                # Longer keyword matches are more specific → higher weight
                score += len(kw.split())
        if score > 0:
            scores[inc_type] = score

    if not scores:
        return "general", 0.0

    best_type = max(scores, key=scores.get)
    # Normalize confidence: best score / max possible for that type
    max_possible = sum(len(kw.split()) for kw in INCIDENT_TYPES[best_type])
    confidence = min(scores[best_type] / max(max_possible * 0.3, 1), 1.0)
    return best_type, round(confidence, 2)


def classify_severity(text, incident_type="general"):
    """Classify severity: critical > high > medium > low."""
    text_lower = text.lower()

    for level in ["critical", "high", "medium"]:
        rule = SEVERITY_RULES[level]
        if incident_type in rule["types"]:
            return level
        for kw in rule["keywords"]:
            if kw in text_lower:
                return level

    return "low"


# ── Text similarity for clustering ────────────────────────────────

STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "has", "have", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "this", "that", "these",
    "those", "it", "its", "not", "no", "as", "if", "so", "than", "too",
    "very", "just", "about", "up", "out", "all", "also", "new", "one",
    "two", "said", "says", "al", "com", "www", "https", "http",
}


def tokenize(text):
    """Extract meaningful tokens from text."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    tokens = text.split()
    return [t for t in tokens if t not in STOP_WORDS and len(t) > 2]


def compute_idf(documents):
    """Compute IDF scores across all documents."""
    n = len(documents)
    if n == 0:
        return {}

    df = Counter()
    for doc_tokens in documents:
        unique = set(doc_tokens)
        for token in unique:
            df[token] += 1

    return {token: math.log(n / count) for token, count in df.items()}


def tfidf_vector(tokens, idf):
    """Compute TF-IDF vector as a dict."""
    tf = Counter(tokens)
    total = len(tokens) if tokens else 1
    vec = {}
    for token, count in tf.items():
        if token in idf:
            vec[token] = (count / total) * idf[token]
    return vec


def cosine_similarity(vec_a, vec_b):
    """Cosine similarity between two sparse vectors (dicts)."""
    if not vec_a or not vec_b:
        return 0.0

    common = set(vec_a.keys()) & set(vec_b.keys())
    if not common:
        return 0.0

    dot = sum(vec_a[k] * vec_b[k] for k in common)
    mag_a = math.sqrt(sum(v * v for v in vec_a.values()))
    mag_b = math.sqrt(sum(v * v for v in vec_b.values()))

    if mag_a == 0 or mag_b == 0:
        return 0.0

    return dot / (mag_a * mag_b)


# ── Clustering ────────────────────────────────────────────────────

SIMILARITY_THRESHOLD = 0.35  # Minimum cosine similarity to consider same event
TIME_WINDOW_HOURS = 48       # Only cluster articles within this time window


def parse_timestamp(ts_str):
    """Parse various timestamp formats to datetime."""
    if not ts_str:
        return None
    try:
        # Handle ISO format with timezone
        ts_str = ts_str.replace("Z", "+00:00")
        return datetime.fromisoformat(ts_str)
    except (ValueError, TypeError):
        pass
    try:
        return datetime.strptime(ts_str, "%a, %d %b %Y %H:%M:%S %Z").replace(
            tzinfo=timezone.utc
        )
    except (ValueError, TypeError):
        return None


def cluster_articles(articles):
    """
    Cluster articles about the same event using TF-IDF cosine similarity.
    Returns list of clusters, each cluster is a list of article dicts.
    """
    if not articles:
        return []

    # Tokenize all articles
    doc_tokens = []
    for a in articles:
        text = a.get("headline", "") or a.get("title", "")
        tokens = tokenize(text)
        doc_tokens.append(tokens)

    # Compute IDF
    idf = compute_idf(doc_tokens)

    # Compute TF-IDF vectors
    vectors = [tfidf_vector(tokens, idf) for tokens in doc_tokens]

    # Parse timestamps
    timestamps = []
    for a in articles:
        ts = a.get("published_at") or a.get("created_at")
        timestamps.append(parse_timestamp(ts))

    # Greedy clustering
    assigned = [False] * len(articles)
    clusters = []

    for i in range(len(articles)):
        if assigned[i]:
            continue

        cluster = [i]
        assigned[i] = True

        for j in range(i + 1, len(articles)):
            if assigned[j]:
                continue

            # Check time window
            if timestamps[i] and timestamps[j]:
                diff = abs((timestamps[i] - timestamps[j]).total_seconds())
                if diff > TIME_WINDOW_HOURS * 3600:
                    continue

            sim = cosine_similarity(vectors[i], vectors[j])
            if sim >= SIMILARITY_THRESHOLD:
                cluster.append(j)
                assigned[j] = True

        clusters.append(cluster)

    # Convert indices to article dicts
    return [[articles[i] for i in c] for c in clusters]


# ── Credibility scoring ──────────────────────────────────────────

def score_cluster(cluster, reputation=None):
    """
    Score cluster credibility 0-100:
      - Source count (0-60 pts): more independent sources = higher trust
      - Source quality (0-25 pts): official news > social media, uses reputation if available
      - Severity (0-15 pts): critical incidents get a boost
    """
    if reputation is None:
        reputation = {}

    sources = set()
    for article in cluster:
        src = (article.get("source") or "").lower()
        sources.add(src)

    unique_sources = len(sources)

    # Base score from source count (0-60 points)
    if unique_sources >= 4:
        source_score = 60
    elif unique_sources == 3:
        source_score = 50
    elif unique_sources == 2:
        source_score = 35
    else:
        source_score = 10  # Single source = low credibility

    # Source quality bonus (0-25 points) — uses reputation if available
    quality_score = 0
    for src in sources:
        quality_score += get_source_quality_score(src, reputation)
    quality_score = min(quality_score, 25)

    # Severity bonus (0-15 points)
    combined_text = " ".join(
        a.get("headline", "") or a.get("title", "") for a in cluster
    )
    severity = classify_severity(combined_text)
    severity_scores = {"critical": 15, "high": 10, "medium": 5, "low": 2}
    sev_score = severity_scores.get(severity, 2)

    return min(source_score + quality_score + sev_score, 100)


# ── Neighborhood matching ────────────────────────────────────────

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


def match_neighborhoods(text, hood_map):
    """Find which neighborhoods are mentioned in text."""
    text_lower = text.lower()
    matched = set()

    # Direct neighborhood name match
    for name_lower, uid in hood_map.items():
        if name_lower in text_lower:
            matched.add(uid)

    # Street-to-neighborhood mapping
    for street, hood_name in STREET_TO_NEIGHBORHOOD.items():
        if street in text_lower and hood_name in hood_map:
            matched.add(hood_map[hood_name])

    return list(matched)


# ── Shapely geo-join (point-in-polygon) ──────────────────────────

def build_polygon_index(hood_rows):
    """Build Shapely polygon objects from neighborhood geojson for point-in-polygon."""
    if not HAS_SHAPELY:
        return []

    polygons = []
    for row in hood_rows:
        geojson = row.get("geojson")
        if not geojson:
            continue
        try:
            poly = shape(geojson)
            polygons.append((row["id"], row["name"], poly))
        except Exception:
            pass
    return polygons


def geo_join_incidents(polygons, batch_size=500):
    """
    Assign neighborhood_id to incidents that have lat/lng but no neighborhood.
    Uses Shapely point-in-polygon — much more accurate than street-name matching.
    """
    if not HAS_SHAPELY or not polygons:
        print("  Shapely not available or no polygons — skipping geo-join")
        return 0

    offset = 0
    total_updated = 0

    while True:
        batch = supabase.table("incidents") \
            .select("id,lat,lng") \
            .is_("neighborhood_id", "null") \
            .not_.is_("lat", "null") \
            .not_.is_("lng", "null") \
            .range(offset, offset + batch_size - 1) \
            .execute()

        if not batch.data:
            break

        for incident in batch.data:
            lat = incident.get("lat")
            lng = incident.get("lng")
            if not lat or not lng:
                continue

            pt = Point(float(lng), float(lat))  # GeoJSON = [lng, lat]
            for hood_id, _hood_name, poly in polygons:
                if poly.contains(pt):
                    try:
                        supabase.table("incidents").update(
                            {"neighborhood_id": hood_id}
                        ).eq("id", incident["id"]).execute()
                        total_updated += 1
                    except Exception:
                        pass
                    break

        if len(batch.data) < batch_size:
            break
        offset += batch_size

    return total_updated


# ── Incident creation & article linking ───────────────────────────

def create_incidents_from_clusters(scored_clusters, hood_map):
    """
    Create validated incidents from multi-source clusters.
    Returns mapping: cluster_index → incident_id for article linking.
    """
    # Load existing incident sources to avoid duplicates
    existing = supabase.table("incidents").select("source,type,occurred_at").execute()
    existing_keys = set()
    for r in existing.data:
        key = f"{r.get('source', '')}|{r.get('type', '')}|{r.get('occurred_at', '')}"
        existing_keys.add(key)

    cluster_to_incident = {}
    created = 0

    for i, sc in enumerate(scored_clusters):
        # Only create incidents for clusters with credibility >= 25
        if sc["credibility_score"] < 25:
            continue

        headline = sc["representative_headline"][:200]
        inc_type = sc["incident_type"]
        sources_str = ", ".join(sc["sources"][:5])
        timestamp = None

        # Get earliest timestamp from cluster articles
        for article in sc["articles"]:
            ts = article.get("published_at") or article.get("created_at")
            if ts:
                timestamp = ts
                break

        # Dedupe key
        dedup_key = f"nlp_cluster|{inc_type}|{timestamp}"
        if dedup_key in existing_keys:
            continue

        # Pick first matching neighborhood
        neighborhood_id = sc["neighborhoods"][0] if sc["neighborhoods"] else None

        record = {
            "source": "nlp_cluster",
            "type": inc_type,
            "neighborhood_id": neighborhood_id,
            "occurred_at": timestamp,
            "raw_data": {
                "headline": headline,
                "severity": sc["severity"],
                "credibility_score": sc["credibility_score"],
                "source_count": sc["source_count"],
                "sources": sources_str,
            },
        }

        try:
            result = supabase.table("incidents").insert(record).execute()
            if result.data:
                incident_id = result.data[0]["id"]
                cluster_to_incident[i] = incident_id
                existing_keys.add(dedup_key)
                created += 1
        except Exception as e:
            if "duplicate" not in str(e).lower():
                print(f"    Error creating incident: {e}")

    return cluster_to_incident, created


def link_articles_to_incidents(scored_clusters, cluster_to_incident, news):
    """Update matched_incident_ids on news_articles to link them to incidents."""
    # Build url → incident_ids mapping
    url_to_incidents = defaultdict(list)
    for cluster_idx, incident_id in cluster_to_incident.items():
        for article in scored_clusters[cluster_idx]["articles"]:
            url = article.get("url", "")
            if url:
                url_to_incidents[url].append(incident_id)

    linked = 0
    for article in news:
        url = article.get("url", "")
        if url in url_to_incidents:
            incident_ids = url_to_incidents[url]
            existing_ids = article.get("matched_incident_ids") or []
            new_ids = list(set(existing_ids + incident_ids))
            if new_ids != existing_ids:
                try:
                    supabase.table("news_articles").update(
                        {"matched_incident_ids": new_ids}
                    ).eq("id", article["id"]).execute()
                    linked += 1
                except Exception:
                    pass

    return linked


# ── Feedback loop (reinforcement learning) ───────────────────────

def table_exists(table_name):
    """Check if a table exists by trying to query it."""
    try:
        supabase.table(table_name).select("id").limit(1).execute()
        return True
    except Exception:
        return False


def load_source_reputation():
    """
    Load source reputation scores from DB.
    Returns dict: source_name → accuracy_score (0-100).
    Falls back to empty dict if table doesn't exist yet.
    """
    if not table_exists("source_reputation"):
        return {}

    resp = supabase.table("source_reputation").select("*").execute()
    return {
        r["source_name"]: {
            "accuracy_score": float(r.get("accuracy_score", 50)),
            "total_votes": r.get("total_votes", 0),
            "accurate_votes": r.get("accurate_votes", 0),
            "not_relevant_votes": r.get("not_relevant_votes", 0),
        }
        for r in resp.data
    }


def process_feedback(reputation):
    """
    Read user votes from incident_feedback, aggregate per source,
    and update source_reputation table.
    Returns updated reputation dict.
    """
    if not table_exists("incident_feedback"):
        return reputation

    # Get unprocessed feedback (all votes — we recompute from scratch)
    votes = supabase.table("incident_feedback").select(
        "incident_id, vote"
    ).execute().data

    if not votes:
        return reputation

    # Get incidents to find their sources
    incident_ids = list({v["incident_id"] for v in votes if v.get("incident_id")})
    if not incident_ids:
        return reputation

    # Fetch incident raw_data which contains source info
    source_votes = defaultdict(lambda: {"accurate": 0, "not_relevant": 0})

    for iid in incident_ids:
        try:
            inc = supabase.table("incidents").select(
                "id, raw_data, source"
            ).eq("id", iid).execute()
            if not inc.data:
                continue

            row = inc.data[0]
            raw = row.get("raw_data") or {}
            sources_str = raw.get("sources", "")

            # Get votes for this incident
            inc_votes = [v for v in votes if v["incident_id"] == iid]

            # Attribute votes to each source in the cluster
            source_names = [s.strip() for s in sources_str.split(",") if s.strip()]
            for src in source_names:
                for v in inc_votes:
                    source_votes[src][v["vote"]] += 1
        except Exception:
            continue

    # Update source_reputation table
    for src_name, tallies in source_votes.items():
        total = tallies["accurate"] + tallies["not_relevant"]
        accurate = tallies["accurate"]
        not_relevant = tallies["not_relevant"]

        # Score: starts at 50, moves toward 100 (all accurate) or 0 (all irrelevant)
        if total > 0:
            accuracy = round((accurate / total) * 100, 1)
        else:
            accuracy = 50

        try:
            supabase.table("source_reputation").upsert({
                "source_name": src_name,
                "accuracy_score": accuracy,
                "total_votes": total,
                "accurate_votes": accurate,
                "not_relevant_votes": not_relevant,
            }, on_conflict="source_name").execute()

            reputation[src_name] = {
                "accuracy_score": accuracy,
                "total_votes": total,
                "accurate_votes": accurate,
                "not_relevant_votes": not_relevant,
            }
        except Exception as e:
            print(f"    Error updating reputation for {src_name}: {e}")

    return reputation


def get_source_quality_score(source_name, reputation):
    """
    Get quality score for a source, using dynamic reputation if available,
    falling back to static heuristics.
    """
    src = source_name.lower()

    # If we have reputation data with enough votes, use it
    if src in reputation and reputation[src]["total_votes"] >= 3:
        # Map 0-100 accuracy to 0-10 quality points
        return round(reputation[src]["accuracy_score"] / 10, 1)

    # Fallback: static quality heuristics
    official_domains = [
        "wsfa", "waka", "advertiser", "montgomeryal.gov",
        "al.com", "weather.gov", "alea.gov",
    ]
    social_sources = ["twitter", "x.com"]

    if any(d in src for d in official_domains):
        return 8
    elif any(s in src for s in social_sources):
        return 2
    else:
        return 4


# ── Main pipeline ─────────────────────────────────────────────────

def load_neighborhoods():
    """Load neighborhood name→id mapping."""
    resp = supabase.table("neighborhoods").select("id,name").execute()
    return {r["name"].lower(): r["id"] for r in resp.data}


def load_neighborhoods_full():
    """Load full neighborhood rows (with geojson) for geo-join."""
    resp = supabase.table("neighborhoods").select("id,name,geojson").execute()
    return resp.data


def load_news_articles():
    """Load all news articles."""
    resp = supabase.table("news_articles").select("*").execute()
    return resp.data


def load_alerts():
    """Load all alerts."""
    resp = supabase.table("alerts").select("*").execute()
    return resp.data


def run_pipeline():
    print("=" * 60)
    print("SafeLens NLP Pipeline")
    print("=" * 60)

    # ── Step 1: Load data ──
    print("\n[1/8] Loading data...")
    hood_map = load_neighborhoods()
    hood_rows = load_neighborhoods_full()
    print(f"  {len(hood_map)} neighborhoods")

    news = load_news_articles()
    print(f"  {len(news)} news articles")

    alerts = load_alerts()
    print(f"  {len(alerts)} alerts")

    if not news and not alerts:
        print("\nNo data to process. Run ingestion workers first.")
        return

    # ── Step 2: Geo-join incidents (optional — slow on large datasets) ──
    run_geojoin = "--geojoin" in sys.argv
    if run_geojoin:
        print("\n[2/8] Geo-joining incidents to neighborhoods (Shapely)...")
        if HAS_SHAPELY:
            polygons = build_polygon_index(hood_rows)
            print(f"  Built {len(polygons)} polygon objects")
            geo_count = geo_join_incidents(polygons)
            print(f"  Assigned neighborhood_id to {geo_count} incidents")
        else:
            print("  Shapely not installed — pip install shapely")
    else:
        print("\n[2/8] Geo-join skipped (use --geojoin flag to enable)")

    # ── Step 3: Classify articles ──
    print("\n[3/8] Classifying articles by incident type & severity...")
    classified = []
    type_counts = Counter()

    for article in news:
        text = article.get("headline", "")
        inc_type, confidence = classify_type(text)
        severity = classify_severity(text, inc_type)

        classified.append({
            **article,
            "_type": inc_type,
            "_confidence": confidence,
            "_severity": severity,
            "_source_kind": "news",
        })
        type_counts[inc_type] += 1

    for alert in alerts:
        text = (alert.get("title", "") + " " + alert.get("body", ""))
        inc_type, confidence = classify_type(text)
        severity = alert.get("severity", classify_severity(text, inc_type))

        classified.append({
            "headline": alert.get("title", ""),
            "source": "alert",
            "url": "",
            "published_at": alert.get("created_at"),
            **{k: v for k, v in alert.items() if k not in ("title", "body")},
            "_type": inc_type,
            "_confidence": confidence,
            "_severity": severity,
            "_source_kind": "alert",
        })
        type_counts[inc_type] += 1

    print("  Type distribution:")
    for t, c in type_counts.most_common():
        print(f"    {t}: {c}")

    # ── Step 4: Cluster related articles ──
    print(f"\n[4/8] Clustering {len(classified)} items (same-event detection)...")
    clusters = cluster_articles(classified)
    multi_source = [c for c in clusters if len(c) > 1]
    single_source = [c for c in clusters if len(c) == 1]

    print(f"  {len(clusters)} total clusters")
    print(f"  {len(multi_source)} multi-source clusters (validated)")
    print(f"  {len(single_source)} single-source items (low credibility)")

    if multi_source:
        print("\n  Top multi-source clusters:")
        for cluster in sorted(multi_source, key=lambda c: -len(c))[:10]:
            sources = {a.get("source", "?") for a in cluster}
            headline = cluster[0].get("headline", "")[:70]
            print(f"    [{len(cluster)} sources: {', '.join(sources)}]")
            print(f"      {headline}")

    # ── Step 5: Score credibility ──
    print(f"\n[5/8] Scoring credibility for {len(clusters)} clusters...")

    # Load source reputation for dynamic quality scoring
    reputation = load_source_reputation()
    if reputation:
        print(f"  Loaded reputation data for {len(reputation)} sources")
    else:
        print("  No reputation data yet (feedback tables may not exist)")

    scored_clusters = []
    for cluster in clusters:
        cred_score = score_cluster(cluster, reputation)
        combined_text = " ".join(
            a.get("headline", "") for a in cluster
        )
        inc_type, confidence = classify_type(combined_text)
        severity = classify_severity(combined_text, inc_type)
        neighborhoods = match_neighborhoods(combined_text, hood_map)
        sources = list({a.get("source", "") for a in cluster})

        scored_clusters.append({
            "articles": cluster,
            "credibility_score": cred_score,
            "incident_type": inc_type,
            "severity": severity,
            "confidence": confidence,
            "source_count": len(sources),
            "sources": sources,
            "neighborhoods": neighborhoods,
            "representative_headline": cluster[0].get("headline", ""),
        })

    # Sort by credibility
    scored_clusters.sort(key=lambda c: -c["credibility_score"])

    print("  Credibility distribution:")
    high_cred = sum(1 for c in scored_clusters if c["credibility_score"] >= 50)
    med_cred = sum(1 for c in scored_clusters if 25 <= c["credibility_score"] < 50)
    low_cred = sum(1 for c in scored_clusters if c["credibility_score"] < 25)
    print(f"    High (50+):  {high_cred}")
    print(f"    Medium (25-49): {med_cred}")
    print(f"    Low (<25):   {low_cred}")

    # ── Step 6: Create incidents + link articles ──
    print(f"\n[6/8] Creating validated incidents & linking articles...")

    cluster_to_incident, incidents_created = create_incidents_from_clusters(
        scored_clusters, hood_map
    )
    print(f"  Created {incidents_created} new incidents in DB")

    linked = link_articles_to_incidents(scored_clusters, cluster_to_incident, news)
    print(f"  Linked {linked} articles to incidents (matched_incident_ids)")

    # Update relevance_score on news_articles
    url_to_score = {}
    for sc in scored_clusters:
        for article in sc["articles"]:
            url = article.get("url", "")
            if url:
                url_to_score[url] = sc["credibility_score"]

    update_count = 0
    for article in news:
        url = article.get("url", "")
        if url in url_to_score:
            new_score = url_to_score[url]
            old_score = article.get("relevance_score", 0) or 0
            if new_score != old_score:
                try:
                    supabase.table("news_articles").update(
                        {"relevance_score": new_score}
                    ).eq("id", article["id"]).execute()
                    update_count += 1
                except Exception as e:
                    print(f"    Error updating {url[:50]}: {e}")

    print(f"  Updated {update_count} article relevance scores")

    # ── Step 7: Update neighborhood safety scores ──
    print(f"\n[7/8] Updating neighborhood safety scores...")

    hood_incidents = Counter()
    hood_severity_sum = Counter()
    severity_weights = {"critical": 10, "high": 5, "medium": 2, "low": 1}

    for sc in scored_clusters:
        if sc["credibility_score"] < 15:
            continue
        weight = severity_weights.get(sc["severity"], 1)
        for hood_id in sc["neighborhoods"]:
            hood_incidents[hood_id] += 1
            hood_severity_sum[hood_id] += weight

    max_severity = max(hood_severity_sum.values()) if hood_severity_sum else 1

    hood_update_count = 0
    for name_lower, hood_id in hood_map.items():
        incident_count = hood_incidents.get(hood_id, 0)
        severity_total = hood_severity_sum.get(hood_id, 0)

        avg_rate = round(incident_count, 2)

        if max_severity > 0:
            danger_ratio = severity_total / max_severity
        else:
            danger_ratio = 0
        safety = round((1 - danger_ratio) * 100, 1)

        try:
            supabase.table("neighborhoods").update({
                "avg_incident_rate": avg_rate,
                "safety_score": safety,
            }).eq("id", hood_id).execute()
            hood_update_count += 1
        except Exception as e:
            print(f"    Error updating {name_lower}: {e}")

    print(f"  Updated {hood_update_count} neighborhood safety scores")

    # ── Step 8: Feedback loop ──
    print(f"\n[8/8] Processing user feedback (reinforcement learning)...")
    feedback_updated = 0
    if table_exists("incident_feedback") and table_exists("source_reputation"):
        reputation = process_feedback(reputation)
        feedback_updated = len(reputation)
        if feedback_updated:
            print(f"  Updated reputation for {feedback_updated} sources")
        else:
            print("  No user feedback to process yet")
    else:
        print("  Feedback tables not created yet — skipping")
        print("  (Ask Angela to run 005_feedback_loop.sql)")

    # ── Summary ──
    print(f"\n{'=' * 60}")
    print("Pipeline complete!")
    print(f"  Articles processed:    {len(news)}")
    print(f"  Alerts processed:      {len(alerts)}")
    print(f"  Clusters found:        {len(clusters)}")
    print(f"  Multi-source:          {len(multi_source)} (validated)")
    print(f"  Incidents created:     {incidents_created}")
    print(f"  Articles linked:       {linked}")
    print(f"  Scores updated:        {update_count} articles, {hood_update_count} neighborhoods")

    if scored_clusters:
        print(f"\n--- Top 10 Validated Incidents ---")
        for i, sc in enumerate(scored_clusters[:10], 1):
            print(f"  {i}. [{sc['severity'].upper()}] {sc['incident_type']} "
                  f"(cred: {sc['credibility_score']}, sources: {sc['source_count']})")
            print(f"     {sc['representative_headline'][:80]}")
            if sc["neighborhoods"]:
                hood_names = [
                    name for name, uid in hood_map.items()
                    if uid in sc["neighborhoods"]
                ]
                print(f"     Neighborhoods: {', '.join(hood_names)}")


def trigger_narrative_generation(base_url="http://localhost:3000"):
    """Trigger AI narrative generation after pipeline completes."""
    try:
        resp = requests.post(f"{base_url}/api/narratives/generate", timeout=120)
        if resp.status_code == 200:
            data = resp.json()
            print(f"  Generated {data.get('generated', 0)} narratives")
        else:
            print(f"  Narrative generation returned {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"  Could not reach narrative endpoint: {e}")


if __name__ == "__main__":
    run_pipeline()

    print("\n[9/9] Triggering AI narrative generation...")
    trigger_narrative_generation()
