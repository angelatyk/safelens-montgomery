"""Quick preview: what Twitter data looks like for resident_reports."""
import os, requests
from dotenv import load_dotenv
load_dotenv()
token = os.getenv("BEARER_TOKEN").strip()
headers = {"Authorization": f"Bearer {token}"}
params = {
    "query": "Montgomery Alabama (robbery OR carjacking OR gunshot OR wreck OR flood OR power outage OR break-in OR fight OR stabbing OR missing) -is:retweet lang:en",
    "max_results": 10,
    "tweet.fields": "created_at,author_id,text,public_metrics,geo",
    "user.fields": "name,username,location",
    "expansions": "author_id",
}
resp = requests.get("https://api.twitter.com/2/tweets/search/recent", headers=headers, params=params, timeout=15)
if resp.status_code != 200:
    print(f"Error: {resp.status_code} - {resp.text[:200]}")
    exit()
data = resp.json()
tweets = data.get("data", [])
users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}
print(f"Found {len(tweets)} community-style tweets\n")
for i, t in enumerate(tweets, 1):
    user = users.get(t["author_id"], {})
    m = t.get("public_metrics", {})
    print(f"--- Tweet {i} ---")
    print(f"User: @{user.get('username', '?')} | Location: {user.get('location', 'none')}")
    print(f"Date: {t.get('created_at', '?')}")
    print(f"Text: {t['text'][:250]}")
    print(f"Likes: {m.get('like_count', 0)} | RT: {m.get('retweet_count', 0)}")
    print()
print("== MAPPING TO resident_reports ==")
print("category    = auto-detect from keywords")
print("description = tweet text")
print("lat/lng     = null (Twitter rarely gives coords)")
print("status      = submitted")
