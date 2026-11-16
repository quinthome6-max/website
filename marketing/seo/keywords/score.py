import json, re, csv, collections
ac = json.load(open("autocomplete.json"))
comp = json.load(open("competitor_urls.json"))
BRAND = {"https://azhara.in": "Azhara", "https://thearomaaisle.com": "Aroma Aisle", "https://sosahomeandbody.com": "SOSA",
         "https://www.isakfragrances.com": "Isak", "https://houseofaroma.in": "House of Aroma", "https://thefruik.com": "Fruik"}
# InstaCuppa's diffuser articles, from the 2 Nov research (its sitemap refused us today).
INSTACUPPA = ["best aroma diffuser india", "aroma oil diffuser guide indian homes", "aroma diffuser vs humidifier", "nebulizer vs ultrasonic diffuser",
              "aroma diffuser for car", "aroma diffuser for office", "aroma diffuser for pooja room", "aroma diffuser safe for pets babies", "aroma diffuser pregnancy",
              "lavender oil benefits", "eucalyptus oil benefits", "frankincense oil loban", "best essential oils for diffuser"]

STOP = set("the a an for in of to with and or vs is are how what which best my your near me online india indian buy price".split())
def tokens(k): return [t for t in re.findall(r"[a-z0-9]+", k) if t not in STOP]
def norm(t): return t[:-1] if len(t) > 3 and t.endswith("s") else t
index = {}   # brand -> token -> set of page ids
for site, urls in comp.items():
    if site not in BRAND: continue
    inv = collections.defaultdict(set)
    for i, u in enumerate(urls):
        path = u.lower().split("://", 1)[-1].split("/", 1)[-1]
        for t in set(re.findall(r"[a-z0-9]+", path)): inv[norm(t)].add(i)
    index[BRAND[site]] = inv
inv = collections.defaultdict(set)
for i, title in enumerate(INSTACUPPA):
    for t in set(re.findall(r"[a-z0-9]+", title)): inv[norm(t)].add(i)
index["InstaCuppa"] = inv

def competitors(k):
    t = [norm(x) for x in tokens(k)]
    if not t: return []
    hit = []
    for b, inv in index.items():
        sets = [inv.get(x, set()) for x in t]
        if all(sets) and set.intersection(*sets): hit.append(b)
    return hit

# Relevance: drop phrases about things Quint Home doesn't sell or other brands' names.
DROP = re.compile(r"\b(amazon|flipkart|meesho|walmart|indiamart|myntra|nykaa|dmart|blinkit|zepto|bath and body|bbw|airwick|air wick|ambi ?pur|godrej|odonil|pura|vitruvi|muji|ikea|westin|marriott|ritz|taj|oberoi|hilton|hyatt|itc|leela|zara|jo malone|diptyque|yankee|nest|rituals|aroma360|scentsy|kenya|nigeria|pakistan|bangladesh|uk|usa|dubai|uae|qatar|nepal|sri lanka|philippines|ghana|uganda|australia|canada|wax melt|wax melts|diy|how to make|recipe|making|kit|wholesale|manufacturer|supplier|bulk|job|jobs|meaning in hindi|png|logo|drawing|sticker|nebulizer machine|nebuliser machine|nebulizer for|asthma nebulizer|medical|humidifier only|price in pakistan)\b")
def intent(k):
    if re.search(r"\b(buy|price|cost|online|under \d+|shop|sale|best|top)\b", k): return "Buy / compare"
    if re.search(r"\b(vs|or|better|difference|which)\b", k): return "Compare"
    if re.search(r"\b(gift|gifts|gifting|hamper|return gift)\b", k): return "Gift"
    if re.search(r"\b(how|what|why|can|does|do|is|are|safe|use|clean|refill|long|last|work)\b", k): return "Learn"
    if re.search(r"\b(for (home|room|bedroom|living room|office|car|bathroom|hotel|large room|large space|kitchen|pooja))\b", k): return "Buy (use case)"
    return "Browse"

# Where each phrase lands on quinthome.in today, by theme.
PAGES = [
 (r"car (perfume|diffuser|air freshener|fragrance|scent)|diffuser for car|aroma diffuser for car", "/journal/car-diffuser-vs-car-perfume", "Live"),
 (r"hotel (fragrance|scent|smell|perfume|lobby)|smell like (a )?hotel|hotel.*diffuser", "/range/hotel-fragrance-oils", "Live"),
 (r"reed diffuser.*vs|vs.*reed diffuser", "/journal/waterless-diffuser-vs-reed-diffuser", "Live"),
 (r"essential oil.*vs|vs.*essential oil|fragrance oil vs|aroma oil vs", "/journal/fragrance-oil-vs-essential-oil", "Live"),
 (r"ultrasonic|nebuli[sz]|cold air", "/journal/what-is-a-waterless-diffuser", "Live"),
 (r"how to use|how does .*work|how long|refill|how to clean|clean", "/journal/how-to-use-a-waterless-diffuser", "Live"),
 (r"large (room|space|hall)|living room|3 ?bhk|2 ?bhk|sq ?ft|what size", "/journal/diffuser-for-large-room", "Live"),
 (r"office|reception|workspace|corporate fragrance|scent marketing|commercial", "/journal/diffuser-for-office", "Live"),
 (r"corporate gift|gifts? for (clients|employees|staff)|employee gift", "(new) corporate gifts guide", "Planned (week 3)"),
 (r"housewarming|griha pravesh|wedding gift|return gift|gifts? for (couple|new home|parents)", "/journal/housewarming-and-wedding-gifts-india", "Live"),
 (r"diwali", "/journal/diwali-gifting-guide", "Live (seasonal)"),
 (r"gift", "/gifting", "Live"),
 (r"bedroom|sleep", "(new) bedroom guide", "Planned (week 3)"),
 (r"bathroom|toilet|washroom|plug in|plug-in", "/range/pebble", "Product page"),
 (r"pooja|puja|mandir|agarbatti|incense", "/journal/diwali-scents-for-the-pooja-room-and-living-room", "Live (partial)"),
 (r"candle", "/range/scented-candles", "Live"),
 (r"petrichor|first rain|rain smell|smell of rain|geeli mitti", "/range/first-rain", "Product page"),
 (r"fragrance oil|aroma oil|diffuser oil|scented oil|essential oils? for diffuser|oils? for diffuser", "/journal/best-fragrance-oils-for-diffuser-india", "Live"),
 (r"pet|baby|babies|child|pregnan|asthma|safe", "(new) safety guide", "Gap"),
 (r"waterless|aroma diffuser|scent diffuser|fragrance diffuser|electric diffuser|room diffuser|diffuser machine|aroma machine|scent machine", "/journal/best-aroma-diffuser-for-home-india", "Live"),
 (r"home fragrance|room freshener|air freshener|make (my |your )?home smell|house smell", "/journal/how-to-make-your-home-smell-like-a-luxury-hotel", "Live"),
]
def page_for(k):
    for rx, page, status in PAGES:
        if re.search(rx, k): return page, status
    return "(none)", "Gap"

def cluster(k):
    for name, rx in [("Car", r"\bcar\b"), ("Hotel scent", r"hotel"), ("Gifting", r"gift|hamper|diwali|housewarming|wedding"),
                     ("Candles", r"candle"), ("Fragrance oils", r"\boils?\b"), ("Reed diffusers", r"reed"),
                     ("Office & commercial", r"office|commercial|marketing|reception"), ("Safety", r"safe|pet|baby|pregnan|asthma"),
                     ("Room & home fragrance", r"freshener|home fragrance|smell"), ("Diffusers", r"diffuser|machine|nebuli|cold air")]:
        if re.search(rx, k): return name
    return "Other"

rows = []
for k, seeds in ac.items():
    if len(k) < 6 or DROP.search(k) or not re.search(r"diffus|fragran|scent|aroma|perfume|candle|freshener|smell|oil|gift|hotel|petrichor|rain", k): continue
    c = competitors(k)
    page, status = page_for(k)
    it = intent(k)
    buy = it in ("Buy / compare", "Buy (use case)", "Gift")
    long_tail = len(k.split()) >= 3
    # Opportunity: buying intent and few competitors targeting it count most.
    score = (3 if buy else 1 if it == "Compare" else 0) + (2 if len(c) <= 1 else 1 if len(c) <= 3 else 0) + (1 if long_tail else 0) + min(len(seeds), 3) - 1
    rows.append({"keyword": k, "cluster": cluster(k), "intent": it, "autocomplete_hits": len(seeds),
                 "competitor_brands_targeting": len(c), "which_competitors": ", ".join(c),
                 "quinthome_page": page, "status": status, "opportunity_score": score})
rows.sort(key=lambda r: (-r["opportunity_score"], r["competitor_brands_targeting"], r["keyword"]))
print(len(rows), "relevant phrases")
json.dump(rows, open("scored.json", "w"))
