"""
Read Quint Home's search and analytics data: Google Search Console, Google
Analytics 4 and Microsoft Clarity. Read-only.

  python3 marketing/seo/tools/seo_data.py check
  python3 marketing/seo/tools/seo_data.py gsc     --days 28 --by query|page|device|country|date
  python3 marketing/seo/tools/seo_data.py ga4     --days 28 --by channel|source|landing|device|event|date
  python3 marketing/seo/tools/seo_data.py clarity --days 1|2|3 --by URL|Device|Channel|Source

Credentials live OUTSIDE the repository, in ~/.config/quinthome/ (set up as in
docs/seo/04-data-access.md):

  google-service-account.json   key for a read-only Google service account
  clarity-token.txt             Clarity "Data Export" API token
  seo.json                      {"gsc_site": "sc-domain:quinthome.in",
                                 "ga4_property": "123456789"}

Nothing secret is ever printed. Needs only `requests` and `cryptography`.
Clarity allows 10 requests a day, so each download is saved under
marketing/seo/data/ (git-ignored) and reused for the rest of the day.
"""
from __future__ import annotations

import argparse
import base64
import datetime as dt
import json
import os
import sys
import time
import urllib.parse
import warnings

warnings.filterwarnings("ignore", message=".*OpenSSL.*")  # macOS LibreSSL notice, harmless here

import requests  # noqa: E402
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

CONF = os.path.expanduser(os.environ.get("QUINT_CONFIG_DIR", "~/.config/quinthome"))
KEY_FILE = os.path.join(CONF, "google-service-account.json")
CLARITY_FILE = os.path.join(CONF, "clarity-token.txt")
SETTINGS_FILE = os.path.join(CONF, "seo.json")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"


# --------------------------------------------------------------------------- #
# Settings and Google auth                                                     #
# --------------------------------------------------------------------------- #

def settings() -> dict:
    try:
        with open(SETTINGS_FILE) as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def google_token(scope: str) -> str:
    """A short-lived access token for the service account (JWT bearer flow)."""
    with open(KEY_FILE) as f:
        key = json.load(f)
    now = int(time.time())
    header = b64(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    claims = b64(json.dumps({
        "iss": key["client_email"], "scope": scope,
        "aud": "https://oauth2.googleapis.com/token", "iat": now, "exp": now + 3600,
    }).encode())
    private = serialization.load_pem_private_key(key["private_key"].encode(), password=None)
    signature = private.sign(f"{header}.{claims}".encode(), padding.PKCS1v15(), hashes.SHA256())
    res = requests.post("https://oauth2.googleapis.com/token", data={
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": f"{header}.{claims}.{b64(signature)}",
    }, timeout=20)
    if res.status_code != 200:
        raise SystemExit(f"Google sign-in failed ({res.status_code}): {res.json().get('error_description', res.text[:200])}")
    return res.json()["access_token"]


def service_account_email() -> str:
    with open(KEY_FILE) as f:
        return json.load(f)["client_email"]


def table(rows: list[list], headers: list[str]) -> None:
    widths = [max(len(str(h)), *(len(str(r[i])) for r in rows)) if rows else len(h) for i, h in enumerate(headers)]
    print("  ".join(str(h).ljust(w) for h, w in zip(headers, widths)))
    print("  ".join("-" * w for w in widths))
    for r in rows:
        print("  ".join(str(c).ljust(w) for c, w in zip(r, widths)))


def date_range(days: int) -> tuple[str, str]:
    # Search Console data lags 2–3 days; ending 2 days ago avoids a false dip.
    end = dt.date.today() - dt.timedelta(days=2)
    return (end - dt.timedelta(days=days - 1)).isoformat(), end.isoformat()


# --------------------------------------------------------------------------- #
# Search Console                                                               #
# --------------------------------------------------------------------------- #

def gsc(days: int, by: str, limit: int) -> None:
    site = settings().get("gsc_site", "sc-domain:quinthome.in")
    token = google_token(GSC_SCOPE)
    start, end = date_range(days)
    url = f"https://www.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(site, safe='')}/searchAnalytics/query"
    res = requests.post(url, headers={"Authorization": f"Bearer {token}"}, json={
        "startDate": start, "endDate": end, "dimensions": [by], "rowLimit": limit,
    }, timeout=30)
    if res.status_code != 200:
        raise SystemExit(f"Search Console answered {res.status_code}: {res.json().get('error', {}).get('message', res.text[:200])}")
    rows = res.json().get("rows", [])
    print(f"Search Console · {site} · {start} → {end} · by {by}\n")
    table([[r["keys"][0][:70], r["clicks"], r["impressions"], f"{r['ctr']*100:.1f}%", f"{r['position']:.1f}"] for r in rows],
          [by, "clicks", "impressions", "ctr", "position"])
    if not rows:
        print("(no data yet — new properties take 2–3 days to fill)")


# --------------------------------------------------------------------------- #
# Google Analytics 4                                                           #
# --------------------------------------------------------------------------- #

GA4_DIMENSIONS = {
    "channel": "sessionDefaultChannelGroup",
    "source": "sessionSourceMedium",
    "landing": "landingPagePlusQueryString",
    "device": "deviceCategory",
    "event": "eventName",
    "date": "date",
}


def ga4(days: int, by: str, limit: int) -> None:
    prop = settings().get("ga4_property")
    if not prop:
        raise SystemExit(f"Add the GA4 property id to {SETTINGS_FILE} as \"ga4_property\".")
    token = google_token(GA4_SCOPE)
    metrics = ["eventCount"] if by == "event" else ["sessions", "totalUsers", "engagementRate", "ecommercePurchases", "purchaseRevenue"]
    res = requests.post(f"https://analyticsdata.googleapis.com/v1beta/properties/{prop}:runReport",
                        headers={"Authorization": f"Bearer {token}"}, json={
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": GA4_DIMENSIONS[by]}],
        "metrics": [{"name": m} for m in metrics],
        "orderBys": [{"metric": {"metricName": metrics[0]}, "desc": True}] if by != "date" else [{"dimension": {"dimensionName": "date"}}],
        "limit": limit,
    }, timeout=30)
    if res.status_code != 200:
        raise SystemExit(f"GA4 answered {res.status_code}: {res.json().get('error', {}).get('message', res.text[:200])}")
    data = res.json()
    print(f"Google Analytics 4 · property {prop} · last {days} days · by {by}\n")
    rows = []
    for r in data.get("rows", []):
        dims = [d["value"][:70] for d in r["dimensionValues"]]
        vals = []
        for m, v in zip(metrics, r["metricValues"]):
            x = float(v["value"])
            vals.append(f"{x*100:.1f}%" if m == "engagementRate" else f"₹{x:,.0f}" if m == "purchaseRevenue" else f"{x:,.0f}")
        rows.append(dims + vals)
    table(rows, [by] + metrics)
    if not rows:
        print("(no data yet — GA4 shows data a few hours after the tag goes live)")


# --------------------------------------------------------------------------- #
# Clarity                                                                      #
# --------------------------------------------------------------------------- #

def clarity(days: int, by: str, refresh: bool) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    cache = os.path.join(DATA_DIR, f"clarity-{dt.date.today().isoformat()}-{days}d-{by}.json")
    if os.path.exists(cache) and not refresh:
        with open(cache) as f:
            data = json.load(f)
        print(f"(from today's saved copy: {os.path.relpath(cache)}; --refresh spends one of the 10 daily requests)\n")
    else:
        with open(CLARITY_FILE) as f:
            token = f.read().strip()
        res = requests.get("https://www.clarity.ms/export-data/api/v1/project-live-insights",
                           params={"numOfDays": str(days), "dimension1": by},
                           headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, timeout=30)
        if res.status_code == 429:
            raise SystemExit("Clarity: the 10 requests for today are used up. Try again tomorrow.")
        if res.status_code != 200:
            raise SystemExit(f"Clarity answered {res.status_code}. A 401 means the token is wrong or expired.")
        data = res.json()
        with open(cache, "w") as f:
            json.dump(data, f, indent=1)
    print(f"Microsoft Clarity · last {days} day(s) · by {by}\n")
    for block in data:
        info = block.get("information", [])
        if not info:
            continue
        print(f"## {block.get('metricName')}")
        keys = [k for k in info[0].keys()]
        table([[str(row.get(k, ""))[:60] for k in keys] for row in info[:25]], keys)
        print()


# --------------------------------------------------------------------------- #
# Check                                                                        #
# --------------------------------------------------------------------------- #

def check() -> None:
    print(f"Credentials folder: {CONF}\n")
    s = settings()
    # Google
    if not os.path.exists(KEY_FILE):
        print("Google ........ key file missing (google-service-account.json)")
    else:
        print(f"Google ........ service account {service_account_email()}")
        try:
            token = google_token(GSC_SCOPE)
            sites = requests.get("https://www.googleapis.com/webmasters/v3/sites",
                                 headers={"Authorization": f"Bearer {token}"}, timeout=20).json().get("siteEntry", [])
            names = [x["siteUrl"] + f" ({x['permissionLevel']})" for x in sites]
            print("Search Console  " + (", ".join(names) if names else "NO ACCESS — add the service account as a user in Search Console"))
        except SystemExit as e:
            print(f"Search Console  {e}")
        prop = s.get("ga4_property")
        if not prop:
            print("GA4 ........... property id not set in seo.json")
        else:
            try:
                token = google_token(GA4_SCOPE)
                r = requests.get(f"https://analyticsdata.googleapis.com/v1beta/properties/{prop}/metadata",
                                 headers={"Authorization": f"Bearer {token}"}, timeout=20)
                print(f"GA4 ........... property {prop}: " + ("OK" if r.status_code == 200 else f"NO ACCESS ({r.status_code}) — add the service account as Viewer in GA4"))
            except SystemExit as e:
                print(f"GA4 ........... {e}")
    # Clarity — the check does not spend a request; it only looks for the token.
    print("Clarity ....... " + ("token saved (not tested, to save the daily quota)" if os.path.exists(CLARITY_FILE) else "token missing (clarity-token.txt)"))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check")
    g = sub.add_parser("gsc"); g.add_argument("--days", type=int, default=28); g.add_argument("--by", default="query", choices=["query", "page", "device", "country", "date"]); g.add_argument("--limit", type=int, default=50)
    a = sub.add_parser("ga4"); a.add_argument("--days", type=int, default=28); a.add_argument("--by", default="channel", choices=list(GA4_DIMENSIONS)); a.add_argument("--limit", type=int, default=50)
    c = sub.add_parser("clarity"); c.add_argument("--days", type=int, default=3, choices=[1, 2, 3]); c.add_argument("--by", default="URL", choices=["URL", "Device", "Channel", "Source", "Browser", "OS", "Country/Region"]); c.add_argument("--refresh", action="store_true")
    args = ap.parse_args()
    if args.cmd == "check":
        check()
    elif args.cmd == "gsc":
        gsc(args.days, args.by, args.limit)
    elif args.cmd == "ga4":
        ga4(args.days, args.by, args.limit)
    else:
        clarity(args.days, args.by, args.refresh)


if __name__ == "__main__":
    main()
