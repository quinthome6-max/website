"""Per-page summary of a saved Clarity URL export (see clarity.py).

  python3 marketing/analytics/clarity_pages.py [file]

Ad clicks carry their own fbclid/utm query string, so rows are grouped by
path and by where the visit came from (Meta ad or not).
"""
import collections, glob, json, os, sys, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
f = sys.argv[1] if len(sys.argv) > 1 else sorted(glob.glob(os.path.join(HERE, "clarity-data", "*_URL.json")))[-1]
data = {m["metricName"]: m["information"] for m in json.load(open(f))}

def key(u):
    p = urllib.parse.urlparse(u or "")
    q = urllib.parse.parse_qs(p.query)
    meta = "fbclid" in q or q.get("utm_source", [""])[0].lower() in ("facebook", "ig", "instagram", "fb")
    return (p.path or "/", "Meta ad" if meta else "other")

sess = collections.Counter(); users = collections.Counter(); bots = collections.Counter()
w = collections.defaultdict(lambda: collections.defaultdict(lambda: [0.0, 0.0]))  # page -> metric -> [sum(x*n), sum(n)]
traffic_by_url = {}
for i in data.get("Traffic", []):
    k = key(i.get("Url")); n = i.get("totalSessionCount") or 0
    sess[k] += n; users[k] += i.get("distinctUserCount") or 0; bots[k] += i.get("totalBotSessionCount") or 0
    traffic_by_url[i.get("Url")] = n
def add(k, metric, x, n):
    if x is None or not n: return
    w[k][metric][0] += x * n; w[k][metric][1] += n
for i in data.get("ScrollDepth", []):
    add(key(i["Url"]), "scroll %", i.get("averageScrollDepth"), traffic_by_url.get(i["Url"], 0))
for i in data.get("EngagementTime", []):
    n = traffic_by_url.get(i["Url"], 0)
    add(key(i["Url"]), "active s", i.get("activeTime"), n); add(key(i["Url"]), "total s", i.get("totalTime"), n)
for m, label in [("DeadClickCount", "dead %"), ("RageClickCount", "rage %"), ("QuickbackClick", "quickback %"),
                 ("ScriptErrorCount", "js error %"), ("ErrorClickCount", "error click %"), ("ExcessiveScroll", "excess scroll %")]:
    for i in data.get(m, []):
        add(key(i["Url"]), label, i.get("sessionsWithMetricPercentage"), i.get("sessionsCount") or 0)

cols = ["scroll %", "active s", "total s", "dead %", "rage %", "quickback %", "js error %", "error click %"]
print(f"{'page':44s} {'from':8s} {'sess':>5s} {'users':>5s} {'bots':>5s} " + " ".join(f"{c:>9s}" for c in cols))
tot = collections.Counter()
for k in sorted(set(sess) | set(bots), key=lambda k: -sess[k]):
    if sess[k] == 0 and bots[k] == 0: continue
    vals = [(w[k][c][0] / w[k][c][1]) if w[k][c][1] else None for c in cols]
    print(f"{k[0][:44]:44s} {k[1]:8s} {sess[k]:5d} {users[k]:5d} {bots[k]:5d} " + " ".join(f"{v:9.0f}" if v is not None else f"{'-':>9s}" for v in vals))
    tot[k[1]] += sess[k]; tot["bots"] += bots[k]
print("\nsessions by source:", dict(tot))
