"""
ingest_311.py — Montgomery 311 Service Requests → Supabase incidents table

Reads the downloaded CSV from data/Received_311_Service_Request.csv,
transforms each row to match the incidents table schema, and upserts
into Supabase in batches.

Usage:
    python ingest_311.py
"""

import csv
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "Received_311_Service_Request.csv")
BATCH_SIZE = 500


def parse_date(date_str):
    """Parse date string from CSV into ISO format."""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str.split("+")[0], "%Y/%m/%d %H:%M:%S")
        return dt.isoformat() + "Z"
    except ValueError:
        return None


def transform_row(row):
    """Transform a CSV row into an incidents table record."""
    lat = row.get("Latitude")
    lng = row.get("Longitude")

    return {
        "source": "montgomery_311",
        "type": row.get("Request_Type", "Unknown"),
        "lat": float(lat) if lat and lat != "0" else None,
        "lng": float(lng) if lng and lng != "0" else None,
        "occurred_at": parse_date(row.get("Create_Date")),
        "raw_data": {
            "request_id": row.get("Request_ID"),
            "department": row.get("Department"),
            "address": row.get("Address"),
            "district": row.get("District"),
            "status": row.get("Status"),
            "close_date": row.get("Close_Date"),
            "origin": row.get("Origin"),
            "year": row.get("Year"),
            "global_id": row.get("GlobalID"),
        },
    }


def ingest():
    if not os.path.exists(CSV_PATH):
        print(f"ERROR: CSV not found at {CSV_PATH}")
        sys.exit(1)

    print(f"Reading {CSV_PATH}...")

    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        batch = []
        total = 0
        errors = 0

        for row in reader:
            record = transform_row(row)

            # Skip rows with no useful data
            if not record["type"] or record["type"] == "Unknown":
                continue

            batch.append(record)

            if len(batch) >= BATCH_SIZE:
                try:
                    supabase.table("incidents").insert(batch).execute()
                    total += len(batch)
                    print(f"  Inserted {total} records...")
                except Exception as e:
                    errors += len(batch)
                    print(f"  Error inserting batch: {e}")
                batch = []

        # Insert remaining records
        if batch:
            try:
                supabase.table("incidents").insert(batch).execute()
                total += len(batch)
            except Exception as e:
                errors += len(batch)
                print(f"  Error inserting final batch: {e}")

    print(f"\nDone! Inserted {total} records, {errors} errors.")


if __name__ == "__main__":
    ingest()
