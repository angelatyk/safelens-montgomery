"""
run_pipeline.py — Orchestrator for Railway deployment

Runs the full SafeLens data pipeline on a schedule loop:
  1. Scrape news from all sources (RSS, Google News)
  2. Run NLP pipeline (classify, cluster, score, create incidents)
  3. Sleep for PIPELINE_INTERVAL_MINUTES (default: 60)
  4. Repeat forever

Set PIPELINE_INTERVAL_MINUTES env var to change the interval.

Usage:
    python run_pipeline.py
"""

import subprocess
import sys
import os
import time
import signal
from datetime import datetime

INTERVAL_MINUTES = int(os.environ.get("PIPELINE_INTERVAL_MINUTES", "60"))

shutdown = False

def handle_signal(signum, frame):
    global shutdown
    log(f"Received signal {signum}, shutting down gracefully...")
    shutdown = True

signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}", flush=True)

def run_script(name):
    """Run a Python script and return True if successful."""
    log(f"Starting {name}...")
    result = subprocess.run(
        [sys.executable, name],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=False
    )
    if result.returncode == 0:
        log(f"{name} completed successfully.")
    else:
        log(f"{name} failed with exit code {result.returncode}")
    return result.returncode == 0

def run_pipeline():
    log("=== SafeLens Pipeline Starting ===")

    # Step 1: Collect data
    run_script("scrape_news.py")

    # Step 2: Run NLP pipeline (classify, cluster, score, create incidents)
    run_script("nlp_pipeline.py")

    log("=== SafeLens Pipeline Complete ===")

def main():
    log(f"SafeLens worker started. Running every {INTERVAL_MINUTES} minutes.")
    log("Press Ctrl+C or send SIGTERM to stop.")

    # Run immediately on startup
    run_pipeline()

    while not shutdown:
        log(f"Sleeping {INTERVAL_MINUTES} minutes until next run...")
        # Sleep in small increments so we can respond to shutdown signals
        for _ in range(INTERVAL_MINUTES * 60):
            if shutdown:
                break
            time.sleep(1)

        if not shutdown:
            run_pipeline()

    log("Worker shut down cleanly.")

if __name__ == "__main__":
    main()
