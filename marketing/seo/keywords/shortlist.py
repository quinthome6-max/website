import json, re, csv, collections
ac = json.load(open("autocomplete.json"))
exec(open("score.py").read().split("rows = []")[0])   # tokens, competitors(), intent(), page_for(), cluster()
allk = list(ac.keys())

# (keyword, theme, fit, action) — hand-picked from phrases Google autocomplete returned for India.
SHORT = [
 # Diffusers: buying
 ("best aroma diffuser for home in india", "Diffusers", "High", ""),
 ("best aroma diffuser in india", "Diffusers", "High", ""),
 ("aroma diffuser price in india", "Diffusers", "High", ""),
 ("aroma diffuser machine for home", "Diffusers", "High", ""),
 ("electric diffuser for home", "Diffusers", "High", ""),
 ("fragrance diffuser for home", "Diffusers", "High", ""),
 ("scent diffuser for home", "Diffusers", "High", ""),
 ("scent diffuser machine for home", "Diffusers", "High", ""),
 ("waterless diffuser for home", "Diffusers", "High", ""),
 ("waterless diffuser for fragrance oil", "Diffusers", "High", ""),
 ("waterless aroma diffuser price", "Diffusers", "High", ""),
 ("waterless diffuser cordless", "Diffusers", "High", "Optimise Monolith page for 'cordless waterless diffuser'"),
 ("waterless diffuser battery operated", "Diffusers", "High", "Optimise Monolith page for 'cordless waterless diffuser'"),
 ("best waterless diffuser quiet", "Diffusers", "High", "Add to bedroom guide (Pillar ≤35 dB)"),
 ("cold air diffuser india", "Diffusers", "High", ""),
 ("cold air diffuser for home", "Diffusers", "High", ""),
 ("best nebulizing diffuser for home", "Diffusers", "High", ""),
 # Room size
 ("best waterless diffuser for large room", "Room size", "High", ""),
 ("electric diffuser for large room", "Room size", "High", ""),
 ("aroma diffuser for big hall", "Room size", "High", ""),
 ("aroma diffuser for large space", "Room size", "High", ""),
 ("electric diffuser for home big size", "Room size", "High", ""),
 # Bedroom & sleep
 ("diffuser for bedroom", "Bedroom & sleep", "High", "New bedroom guide (week 3)"),
 ("fragrance diffuser for bedroom", "Bedroom & sleep", "High", "New bedroom guide (week 3)"),
 ("scent diffuser for bedroom", "Bedroom & sleep", "High", "New bedroom guide (week 3)"),
 ("diffuser oil for sleep", "Bedroom & sleep", "High", "New bedroom guide (week 3)"),
 ("best aroma oil for sleep", "Bedroom & sleep", "High", "New bedroom guide (week 3)"),
 ("room diffuser for sleep", "Bedroom & sleep", "High", "New bedroom guide (week 3)"),
 # Bathroom
 ("aroma diffuser for bathroom", "Bathroom", "High", "Optimise Pebble page; small-spaces section"),
 ("best aroma diffuser for bathroom", "Bathroom", "High", "Optimise Pebble page; small-spaces section"),
 ("electric diffuser for bathroom", "Bathroom", "High", "Optimise Pebble page; small-spaces section"),
 ("waterless diffuser for bathroom", "Bathroom", "High", "Optimise Pebble page; small-spaces section"),
 # Hotel scent
 ("best hotel scent for home", "Hotel scent", "High", ""),
 ("hotel fragrance for home", "Hotel scent", "High", ""),
 ("hotel fragrance oil", "Hotel scent", "High", ""),
 ("best hotel fragrance oil for diffuser", "Hotel scent", "High", ""),
 ("hotel fragrance diffuser for home", "Hotel scent", "High", ""),
 ("hotel scent diffuser", "Hotel scent", "High", ""),
 ("hotel lobby scent for home", "Hotel scent", "High", ""),
 ("how to make home smell like a hotel", "Hotel scent", "High", ""),
 ("how to make home smell like luxury hotel", "Hotel scent", "High", ""),
 ("waterless diffuser hotel scents", "Hotel scent", "High", ""),
 # Fragrance oils
 ("best fragrance oil for diffuser", "Fragrance oils", "High", ""),
 ("best aroma oil for diffuser india", "Fragrance oils", "High", ""),
 ("best fragrance oil in india for diffuser", "Fragrance oils", "High", ""),
 ("best aroma oil brands in india", "Fragrance oils", "High", ""),
 ("aroma oil for diffuser", "Fragrance oils", "High", ""),
 ("aroma oil for electric diffuser", "Fragrance oils", "High", ""),
 ("diffuser oil for home", "Fragrance oils", "High", ""),
 ("best diffuser oil for home", "Fragrance oils", "High", ""),
 ("best fragrance oil for waterless diffuser", "Fragrance oils", "High", ""),
 ("fragrance oil for cold air diffuser", "Fragrance oils", "High", ""),
 ("aroma oil price in india", "Fragrance oils", "High", ""),
 ("best diffuser oil for office", "Fragrance oils", "High", "Add oil picks to office guide"),
 ("fragrance oil vs essential oil", "Fragrance oils", "High", ""),
 # First rain / petrichor
 ("first rain fragrance oil", "First rain", "High", "Optimise First Rain page + new 'smell of the first rain at home' guide"),
 ("first rain home fragrance", "First rain", "High", "Optimise First Rain page + new 'smell of the first rain at home' guide"),
 ("first rain smell room freshener", "First rain", "High", "New 'smell of the first rain at home' guide"),
 ("first rain aroma oil", "First rain", "High", "Optimise First Rain page"),
 ("first rain scented candle", "First rain", "Medium", "Mention in First Rain guide (no first-rain candle yet)"),
 ("first rain smell car perfume", "First rain", "High", "First Rain in the Drift; add to car guide"),
 ("first rain smell perfume india", "First rain", "Medium", "Guide only; we sell home fragrance, not perfume"),
 ("smell of first rain", "First rain", "Medium", "New 'smell of the first rain at home' guide"),
 # Car
 ("best car diffuser in india", "Car", "High", ""),
 ("car diffuser for men", "Car", "High", ""),
 ("car diffuser gift", "Car", "High", "Add car diffuser to gift guide copy"),
 ("car perfume luxury", "Car", "High", "Retitle car guide around 'luxury car perfume'"),
 ("car perfume premium", "Car", "High", "Retitle car guide around 'luxury car perfume'"),
 ("car perfume long lasting", "Car", "High", "Add 'long-lasting' section to car guide"),
 ("car perfume for luxury cars", "Car", "High", "Retitle car guide around 'luxury car perfume'"),
 ("best car perfume in india", "Car", "High", ""),
 ("car diffuser essential oil", "Car", "Medium", ""),
 ("hotel scent for car", "Car", "High", "Hotel oils in the Drift: add to hotel page"),
 # Office & commercial
 ("aroma diffuser for office", "Office & commercial", "High", ""),
 ("best aroma diffuser for office", "Office & commercial", "High", ""),
 ("diffuser for office space", "Office & commercial", "High", ""),
 ("scent diffuser machine for office", "Office & commercial", "High", ""),
 ("aroma diffuser for hotels", "Office & commercial", "High", "New hotels sector page (T14)"),
 ("aroma diffuser for restaurant", "Office & commercial", "High", "New restaurants sector page (T14)"),
 ("fragrance diffuser for showroom", "Office & commercial", "High", "New retail sector page (T14)"),
 ("electric diffuser for hotel lobby", "Office & commercial", "High", "New hotels sector page (T14)"),
 ("aroma diffuser machine commercial", "Office & commercial", "High", "Business page: commercial machines"),
 ("scent diffuser for hvac", "Office & commercial", "Medium", "Business page: whole-floor systems (if offered)"),
 # Gifting
 ("best housewarming gift in india", "Gifting", "High", ""),
 ("housewarming gift ideas india", "Gifting", "High", ""),
 ("best wedding gift in india", "Gifting", "High", ""),
 ("best corporate gift for diwali", "Gifting", "High", "Corporate gifts guide (week 3)"),
 ("best corporate gift ideas for employees", "Gifting", "High", "Corporate gifts guide (week 3)"),
 ("corporate gift for clients", "Gifting", "High", "Corporate gifts guide (week 3)"),
 ("luxury candles for gifting", "Gifting", "High", ""),
 ("scented candles gift set", "Gifting", "High", ""),
 ("scented candles for return gifts", "Gifting", "High", "Bulk return gifts via business page"),
 ("home fragrance gift set", "Gifting", "High", ""),
 ("diffuser gift set", "Gifting", "High", ""),
 # Candles
 ("best scented candles in india", "Candles", "High", ""),
 ("luxury candles brands in india", "Candles", "High", "Optimise candles page for 'luxury candles India'"),
 ("luxury candles for home", "Candles", "High", "Optimise candles page for 'luxury candles India'"),
 ("scented candles for home", "Candles", "High", ""),
 ("scented candles for bedroom", "Candles", "High", "Add to bedroom guide"),
 ("soy wax candles india", "Candles", "High", ""),
 ("scented candles vs diffusers", "Candles", "High", "New 'diffuser vs candle' guide"),
 # Safety
 ("waterless diffuser safe for pets", "Safety", "High", "New safety guide (IFRA facts only)"),
 ("waterless diffuser safe for dogs", "Safety", "High", "New safety guide (IFRA facts only)"),
 ("cold air diffuser safe for pets", "Safety", "High", "New safety guide (IFRA facts only)"),
 ("plug in diffuser safe for cats", "Safety", "High", "New safety guide (IFRA facts only)"),
 ("room diffuser for baby", "Safety", "Medium", "New safety guide (IFRA facts only)"),
 ("aroma diffuser is it safe", "Safety", "High", "New safety guide (IFRA facts only)"),
 # Home smell (Indian homes)
 ("how to make home smell good", "Home smell", "High", "New 'how to make your home smell good' guide"),
 ("how to make home smell good naturally", "Home smell", "Medium", "New 'how to make your home smell good' guide"),
 ("how to make home smell expensive", "Home smell", "High", "New 'how to make your home smell good' guide"),
 ("how to make house smell better after cooking", "Home smell", "High", "New guide: kitchen smells in Indian homes"),
 ("how to make home smell good with pets", "Home smell", "High", "New guide + safety guide"),
 ("how to make home smell like temple", "Home smell", "High", "Pooja-room guide: optimise"),
 ("how to make home smell like mandir", "Home smell", "High", "Pooja-room guide: optimise"),
 ("how to make home smell like a spa", "Home smell", "High", "New 'how to make your home smell good' guide"),
 ("best diffuser to make home smell good", "Home smell", "High", ""),
 # Reed & alternatives
 ("waterless diffuser vs reed diffuser", "Comparisons", "High", ""),
 ("reed diffuser vs electric diffuser", "Comparisons", "High", ""),
 ("aroma diffuser vs candle", "Comparisons", "High", "New 'diffuser vs candle' guide"),
 ("nebulizer vs ultrasonic diffuser", "Comparisons", "High", ""),
 ("agarbatti vs diffuser", "Comparisons", "High", "New 'agarbatti vs diffuser' guide (plan week 7)"),
 ("waterless diffuser vs ultrasonic", "Comparisons", "High", ""),
 # Use & care
 ("how to use waterless diffuser", "Use & care", "High", ""),
 ("waterless diffuser how long does it last", "Use & care", "High", ""),
 ("waterless diffuser cleaning", "Use & care", "High", "Add cleaning section once manufacturer guidance confirmed"),
 ("waterless diffuser not working", "Use & care", "High", "Add troubleshooting to how-to guide"),
 ("cold air diffuser not misting", "Use & care", "High", "Add troubleshooting to how-to guide"),
]

def intent_fixed(k):
    if re.match(r"(how|what|why|can|does|do|is|are)\b", k): return "Learn"
    return intent(k)

NOISE = re.compile(r"pakistan|bangladesh|nepal|sri lanka|ghana|nigeria|kenya|uganda|philippines|qatar|uae|dubai|\buk\b|usa|australia|canada|\bnz\b|singapore|malaysia|walmart|amazon|flipkart|meesho|clicks|dischem|mr price|costco|argos|aldi|asda|coles|bunnings|david jones|chemist warehouse|home depot|hobby lobby|hair|curly|dyson|babyliss|attar|cologne|perfume for (men|women)|fragrantica|clone|dupe|quotes|caption|meaning|hindi|bacteria|recipe|diy|wholesale|manufacturer|indiamart|alibaba|aliexpress")
RELEVANT = re.compile(r"diffus|fragran|scent|aroma|perfume|candle|freshener|smell|oil|gift|hotel|petrichor|rain")
THEME_RX = {
 "Diffusers": r"(aroma|scent|fragrance|electric|room|waterless|cold air|nebuli[sz]\w*) (oil )?diffuser",
 "Room size": r"diffuser.*(large|big|hall|space|sq ft|bhk)",
 "Bedroom & sleep": r"bedroom|sleep", "Bathroom": r"bathroom|toilet|washroom", "Hotel scent": r"hotel",
 "Fragrance oils": r"(fragrance|aroma|diffuser) oils?\b", "First rain": r"first rain|petrichor|smell of rain|rain smell|mitti",
 "Car": r"\bcar (diffuser|perfume|aroma|fragrance|air freshener)", "Office & commercial": r"office|restaurant|showroom|lobby|commercial|hvac|reception",
 "Gifting": r"(housewarming|wedding|corporate|return) gifts?|gift set|gifting", "Candles": r"candle",
 "Safety": r"\bsafe|\bpets?\b|\bdogs?\b|\bcats?\b|baby|pregnan", "Home smell": r"(home|house) smell",
 "Comparisons": r"\bvs\b", "Use & care": r"how to use|clean|not working|not misting|how long",
}
clean_keys = [a for a in allk if RELEVANT.search(a) and not NOISE.search(a)]
THEME_SIZE = {t: sum(1 for a in clean_keys if re.search(rx, a)) for t, rx in THEME_RX.items()}
print("theme sizes:", THEME_SIZE)

def variants(k):
    # How many harvested phrases extend this one: breadth of demand Google sees.
    return sum(1 for a in allk if k in a)

def priority(intent_, fit, crowd, status, theme_size=0):
    buy = intent_ in ("Buy / compare", "Buy (use case)", "Gift", "Compare")
    gap = not status.startswith("Live")
    if fit == "High" and (buy or theme_size >= 150) and crowd in ("Open", "Moderate") and gap: return "P1"
    if fit == "High" and (buy or gap) and crowd != "Crowded": return "P2"
    return "P3"

rows = []
for k, theme, fit, action in SHORT:
    present = k in ac
    close = present or any(k in a or a in k for a in allk if len(a) > 12)
    c = competitors(k)
    crowd = "Crowded" if len(c) >= 4 else "Moderate" if len(c) >= 2 else "Open"
    page, status = page_for(k)
    if action.startswith("New") or action.startswith("Corporate") or "(T14)" in action: status = "New page"
    elif action.startswith(("Optimise", "Retitle", "Add")): status = "Optimise"
    it = intent_fixed(k)
    rows.append({
        "Keyword": k, "Theme": theme, "Intent": it, "Fit for Quint Home": fit,
        "Seen in Google autocomplete (India)": "Yes" if present else ("Close variant" if close else "No"),
        "Autocomplete variants (demand breadth)": variants(k),
        "Competitor brands targeting": len(c), "Which competitors": ", ".join(c) or "-",
        "Crowding": crowd, "Quint Home page": page, "Status": "Live" if status.startswith("Live") and not action else status,
        "Action": action or ("Keep; strengthen links" if status.startswith("Live") else "Map to page"),
        "Theme demand (autocomplete phrases in theme)": THEME_SIZE.get(theme, 0),
        "Priority": priority(it, fit, crowd, status, THEME_SIZE.get(theme, 0)),
        "Monthly searches India (Keyword Planner)": "", "Keyword Planner competition": "", "Top-of-page bid ₹ (low–high)": "",
    })
order = {"P1": 0, "P2": 1, "P3": 2}
rows.sort(key=lambda r: (order[r["Priority"]], r["Theme"], -r["Autocomplete variants (demand breadth)"]))
with open("shortlist.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print(len(rows), collections.Counter(r["Priority"] for r in rows), collections.Counter(r["Seen in Google autocomplete (India)"] for r in rows))
for r in rows[:30]:
    print(r["Priority"], "|", r["Keyword"][:46].ljust(46), "|", r["Intent"][:12].ljust(12), "| var", str(r["Autocomplete variants (demand breadth)"]).rjust(3), "| comp", r["Competitor brands targeting"], "|", r["Status"][:9], "|", r["Action"][:50])

long = []
for a in sorted(clean_keys):
    th = next((t for t, rx in THEME_RX.items() if re.search(rx, a)), "Other")
    if th == "Other": continue
    c = competitors(a); pg, stt = page_for(a)
    long.append({"Keyword": a, "Theme": th, "Intent": intent_fixed(a), "Competitor brands targeting": len(c),
                 "Which competitors": ", ".join(c) or "-", "Quint Home page": pg, "Status": stt,
                 "Monthly searches India (Keyword Planner)": ""})
with open("longlist.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=list(long[0].keys())); w.writeheader(); w.writerows(long)
with open("keyword-planner-upload.txt", "w") as f:
    f.write("\n".join(r["Keyword"] for r in rows))
print("long list:", len(long), collections.Counter(r["Theme"] for r in long).most_common())
