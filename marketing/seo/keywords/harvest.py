import json, time, urllib.parse, urllib.request, string, collections
SEEDS = [
 "waterless diffuser", "aroma diffuser", "aroma oil diffuser", "scent diffuser", "fragrance diffuser", "electric diffuser",
 "nebulizer diffuser", "cold air diffuser", "room diffuser", "home fragrance", "hotel fragrance", "hotel scent",
 "fragrance oil for diffuser", "diffuser oil", "aroma oil", "essential oil diffuser", "reed diffuser",
 "car diffuser", "car perfume", "car air freshener", "plug in diffuser", "room freshener", "air freshener for home",
 "scented candles", "soy candles", "luxury candles", "home fragrance gift", "diwali gift", "housewarming gift",
 "corporate gift", "wedding gift", "diffuser for", "best diffuser", "best aroma", "scent machine", "aroma machine",
 "office fragrance", "scent marketing", "petrichor", "first rain smell", "hotel lobby smell", "how to make home smell",
]
SUFFIX = [""] + [" " + c for c in string.ascii_lowercase] + [" for", " in india", " price", " best", " vs", " how"]
def suggest(q):
    url = "https://suggestqueries.google.com/complete/search?client=firefox&hl=en-IN&gl=in&q=" + urllib.parse.quote(q)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=10) as r:
                return json.loads(r.read().decode("utf-8", "replace"))[1]
        except Exception:
            time.sleep(1.5)
    return []
found = collections.defaultdict(set)
for seed in SEEDS:
    for suf in SUFFIX:
        for s in suggest(seed + suf):
            found[s.strip().lower()].add(seed)
        time.sleep(0.12)
json.dump({k: sorted(v) for k, v in found.items()}, open("autocomplete.json", "w"), indent=0)
print("keywords:", len(found))
