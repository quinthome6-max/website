# 01 · Google Search Console

Search Console is Google's own report on the site: which searches show
quinthome.in, how often people click, which pages are indexed, and what Google
thinks is broken. It is free and the most important SEO tool.

**Use a Domain property.** It covers every version of the address (www and
non-www, http and https) in one place. It is verified with a DNS record at
GoDaddy, where quinthome.in's DNS is managed.

## Step 1 — Check whether it already exists

quinthome.in's DNS already contains **two** Google verification records, so
someone has very likely verified it before.

1. Go to https://search.google.com/search-console and sign in with the Google
   account the business uses.
2. Click the property menu at the **top left**.
3. If you see **`quinthome.in`** (Domain property) or
   **`https://www.quinthome.in/`** (URL prefix), it exists. Go to Step 4.
4. If it is not listed, someone else owns it. Ask the client, the previous
   developer or agency, whoever manages the GoDaddy account, to open Search
   Console → **Settings → Users and permissions → Add user**, add your email
   as **Owner**, then skip to Step 4. Only if nobody has it, do Step 2.

## Step 2 — Add the property (only if nobody has it)

1. In Search Console: property menu → **Add property**.
2. Choose the **Domain** box (left), type `quinthome.in` (no `www`, no
   `https`) → **Continue**.
3. Google shows a TXT record like `google-site-verification=AbC123…`. Click
   **Copy**.

## Step 3 — Add the record at GoDaddy

1. Sign in at https://dcc.godaddy.com → **Domains** → **quinthome.in** →
   **DNS** (or **Manage DNS**).
2. Click **Add New Record**.
   - **Type:** TXT
   - **Name:** `@`
   - **Value:** paste the whole `google-site-verification=…` text
   - **TTL:** default (1 hour)
3. **Save**. Do **not** delete the existing TXT records (the SPF record
   `v=spf1 …` handles email).
4. Back in Search Console, click **Verify**. If it fails, wait 10–30 minutes
   and click Verify again; DNS takes a little time.

*No GoDaddy access?* Use the meta-tag method instead: Add property → **URL
prefix** → `https://www.quinthome.in/` → **HTML tag**. Copy only the
`content="…"` value, add it in Vercel as `GOOGLE_SITE_VERIFICATION` (Production),
redeploy, then click Verify. The site already prints the tag from that
variable.

## Step 4 — Submit the sitemap

1. In the property, left menu → **Sitemaps**.
2. Under **Add a new sitemap**, enter `sitemap.xml` (the box already shows
   `https://www.quinthome.in/`) → **Submit**.
3. It should say **Success** with about 32 discovered pages.

## Step 5 — Ask Google to look at the key pages now

1. Top search bar (**Inspect any URL**): paste `https://www.quinthome.in/` →
   Enter → **Request indexing**.
2. Repeat for `https://www.quinthome.in/range` and the six diffuser pages,
   e.g. `https://www.quinthome.in/range/monolith`.

There is a daily limit of roughly 10 requests; the sitemap covers everything else.

## Step 6 — Give the reports read access

Follow [04 · Data access](04-data-access.md): add the service account email
as a user (**Restricted** is enough).

## What to look at

| Report | Where | What it tells you |
|---|---|---|
| Performance | Left menu → Performance → Search results | Searches, clicks, impressions, position |
| Pages | Indexing → Pages | Indexed vs not, and why not |
| Sitemaps | Indexing → Sitemaps | Whether Google read the sitemap |
| Core Web Vitals | Experience → Core Web Vitals | Real-user speed on mobile and desktop |
| Manual actions | Security & Manual Actions | Penalties (should say none) |

New properties show data after **2–3 days**. Search data always runs 2 days behind.
