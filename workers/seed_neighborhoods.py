"""
seed_neighborhoods.py — Seed Montgomery AL neighborhoods into Supabase

Fetches real Census tract polygons from the TIGER/Line API and merges
them into neighborhood boundaries using a tract→neighborhood mapping.

Usage:
    python seed_neighborhoods.py          # first run — inserts all
    python seed_neighborhoods.py --reset  # deletes existing + re-inserts
"""

import os
import sys
import math
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Neighborhood centers ───────────────────────────────────────────
# Used to map Census tracts to neighborhood names via nearest-center.

NEIGHBORHOOD_CENTERS = {
    "Old Cloverdale": (32.354, -86.310),
    "Garden District": (32.366, -86.305),
    "Capitol Heights": (32.379, -86.298),
    "Centennial Hill": (32.382, -86.304),
    "Cottage Hill": (32.361, -86.315),
    "Highland Park": (32.371, -86.312),
    "Forest Park": (32.366, -86.319),
    "South Hull": (32.374, -86.310),
    "Downtown Montgomery": (32.382, -86.309),
    "Midtown": (32.371, -86.313),
    "Hillwood": (32.364, -86.343),
    "Dalraida": (32.398, -86.260),
    "Chisholm": (32.363, -86.250),
    "Arrowhead": (32.383, -86.210),
    "Eastdale": (32.383, -86.230),
    "McGehee Estates": (32.343, -86.350),
    "Vaughn Park": (32.344, -86.333),
    "Ridgefield": (32.353, -86.348),
    "Normandale": (32.389, -86.273),
    "West Montgomery": (32.383, -86.335),
    "North Montgomery": (32.410, -86.305),
    "South Montgomery": (32.330, -86.305),
    "East Montgomery": (32.370, -86.235),
    "Edgewood": (32.354, -86.293),
    "Allendale": (32.370, -86.283),
    "Woodley Park": (32.370, -86.333),
    "Pike Road": (32.310, -86.150),
    "Millbrook": (32.475, -86.360),
    "Prattville": (32.455, -86.460),
    "Wetumpka": (32.545, -86.200),
}


def fetch_census_tracts():
    """Fetch Census tract polygons for Montgomery County AL from TIGER/Line API."""
    url = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/8/query"
    params = {
        "where": "STATE='01' AND COUNTY='101'",
        "outFields": "GEOID,NAME,CENTLAT,CENTLON",
        "f": "geojson",
        "outSR": "4326",
        "resultRecordCount": 200,
    }

    print("Fetching Census tracts from TIGER/Line API...")
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    features = data.get("features", [])
    print(f"  Got {len(features)} Census tracts\n")
    return features


def assign_tract_to_neighborhood(tract_feature):
    """Map a Census tract to the nearest neighborhood by center distance."""
    props = tract_feature["properties"]
    clat = float(props["CENTLAT"])
    clon = float(props["CENTLON"])

    best_name = None
    best_dist = float("inf")

    for name, (nlat, nlon) in NEIGHBORHOOD_CENTERS.items():
        d = math.sqrt((clat - nlat) ** 2 + (clon - nlon) ** 2)
        if d < best_dist:
            best_dist = d
            best_name = name

    return best_name


def merge_polygons(features):
    """Group tract polygons by neighborhood and create MultiPolygon GeoJSON."""
    groups = {}
    for f in features:
        hood = assign_tract_to_neighborhood(f)
        if hood not in groups:
            groups[hood] = []

        geom = f["geometry"]
        if geom["type"] == "Polygon":
            groups[hood].append(geom["coordinates"])
        elif geom["type"] == "MultiPolygon":
            groups[hood].extend(geom["coordinates"])

    result = {}
    for name, polygons in groups.items():
        if len(polygons) == 1:
            result[name] = {"type": "Polygon", "coordinates": polygons[0]}
        else:
            result[name] = {"type": "MultiPolygon", "coordinates": polygons}

    return result


def seed():
    reset = "--reset" in sys.argv

    if reset:
        print("Resetting neighborhoods table...")
        existing = supabase.table("neighborhoods").select("id").execute()
        for row in existing.data:
            supabase.table("neighborhoods").delete().eq("id", row["id"]).execute()
        print(f"  Deleted {len(existing.data)} rows\n")

    # Check existing
    existing = supabase.table("neighborhoods").select("name").execute()
    existing_names = {r["name"] for r in existing.data}

    if existing_names and not reset:
        print(f"Found {len(existing_names)} existing neighborhoods. Use --reset to replace.")
        return

    # Fetch real polygons
    tracts = fetch_census_tracts()
    neighborhoods = merge_polygons(tracts)

    print(f"Merged into {len(neighborhoods)} neighborhoods:\n")

    new_count = 0
    for name, geojson in sorted(neighborhoods.items()):
        if name in existing_names:
            print(f"  Skip (exists): {name}")
            continue

        n_polys = len(geojson["coordinates"]) if geojson["type"] == "MultiPolygon" else 1
        record = {
            "name": name,
            "geojson": geojson,
            "avg_incident_rate": 0,
            "safety_score": 0,
        }

        try:
            supabase.table("neighborhoods").insert(record).execute()
            new_count += 1
            print(f"  + {name} ({n_polys} polygon{'s' if n_polys > 1 else ''})")
        except Exception as e:
            print(f"  Error: {name}: {e}")

    print(f"\nDone! Inserted {new_count} neighborhoods with real Census boundaries.")


if __name__ == "__main__":
    seed()
