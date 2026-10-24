"""Pull Microsoft Clarity's Data Export API for quinthome.in.

  python3 marketing/analytics/clarity.py [days] [dimension1] [dimension2] [dimension3]
  python3 marketing/analytics/clarity.py 3 URL
  python3 marketing/analytics/clarity.py 3 Device Source

days is 1-3 (the API keeps no more). Dimensions: Browser, Device, Country/Region,
OS, Source, Medium, Campaign, Channel, URL. The API allows 10 calls a day for
the project, so every answer is saved to marketing/analytics/clarity-data/
(git-ignored) and re-read from there for the rest of the day.

The token is CLARITY_API_TOKEN in .env.local (Clarity > Settings > Data Export).
"""
import datetime, json, os, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(ROOT, "marketing", "analytics", "clarity-data")
API = "https://www.clarity.ms/export-data/api/v1/project-live-insights"


def token() -> str:
    for line in open(os.path.join(ROOT, ".env.local")):
        if line.startswith("CLARITY_API_TOKEN="):
            return line.split("=", 1)[1].strip()
    sys.exit("CLARITY_API_TOKEN is not in .env.local")


def fetch(days: int, dims: list[str]) -> list:
    os.makedirs(CACHE, exist_ok=True)
    name = f"{datetime.date.today()}_{days}d_{'-'.join(dims) or 'all'}.json".replace("/", "")
    path = os.path.join(CACHE, name)
    if os.path.exists(path):
        return json.load(open(path))
    q = {"numOfDays": days, **{f"dimension{i + 1}": d for i, d in enumerate(dims)}}
    req = urllib.request.Request(f"{API}?{urllib.parse.urlencode(q)}",
                                 headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"})
    data = json.load(urllib.request.urlopen(req, timeout=60))
    json.dump(data, open(path, "w"), indent=1)
    return data


if __name__ == "__main__":
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    data = fetch(days, sys.argv[2:5])
    print(json.dumps(data, indent=1)[:20000])
