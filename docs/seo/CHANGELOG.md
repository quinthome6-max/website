# SEO log

Every SEO change to quinthome.in, and every Search Console finding, newest
first. Add an entry **every time** something is changed, submitted, or
decided, even when the decision is "no action". Commit hashes point to the
change in `quinthome6-max/website`.

**Entry format**

```
## YYYY-MM-DD — short title
- **What:** what changed or was found
- **Why:** the reason (link the audit issue # or plan ticket T#)
- **Where:** files / commit, or the Search Console report
- **Check:** how it was verified, and what to watch next
```

Audit = `marketing/seo/Quint-Home-SEO-Audit-Report.pdf` (issues #1–#40).
Plan = `marketing/seo/Quint-Home-SEO-Plan-of-Action.pdf` (tickets T1–T26).

---

## 2026-10-17 — Search Console: product rich-result warnings reviewed
- **What:** Search Console shows 11 product items with *Missing field 'aggregateRating'* and *Missing field 'review'* (warnings, not errors).
- **Why:** star ratings need genuine per-product reviews. The site has none (placeholder reviews are switched off). Adding ratings without real reviews breaks Google's rules.
- **Decision:** no change for now. Don't validate. Next: collect real reviews (post-purchase email / review app), show them on product pages, then add `aggregateRating` + `review` markup.
- **Where:** Search Console → Shopping / Enhancements → Product snippets.

## 2026-10-17 — Search Console: "Crawled – currently not indexed" (1)
- **What:** the one URL is `https://www.quinthome.in/favicon.ico?favicon.…ico`, the browser-tab icon, not a page.
- **Decision:** no action. Icons are not meant to be indexed.

## 2026-10-17 — Search Console: "Page with redirect" (5) reviewed
- **What:** `http://quinthome.in/`, `https://quinthome.in/`, `http://www.quinthome.in/`, `https://www.quinthome.in/shop`, `https://quinthome.in/shop/shoreline`.
- **Check:** each traced live; all forward permanently (301/308) to the correct page (`https://www.quinthome.in/`, `/range`, `/range/shoreline`). Count already falling in the report (9 → 6 → 3 → 0).
- **Decision:** no action, don't validate. Two of them take two hops (Vercel adds https before www), which Google handles fine.

## 2026-10-17 — `/refunds` redirect made permanent
- **What:** `/refunds` → `/shipping` changed from temporary (307) to permanent (308).
- **Why:** audit #25.
- **Where:** `app/refunds/page.tsx`, commit `e2a18ad`.
- **Check:** live `/refunds` answers 308 → `/shipping`.

## 2026-10-17 — Sitemap submitted to Search Console
- **What:** `https://www.quinthome.in/sitemap.xml` submitted. Status **Success**, **32 pages discovered**.
- **Contents:** home, /range, 9 information pages, 17 products, 4 journal articles. Generated automatically from `lib/data/` (`app/sitemap.ts`).
- **Next:** request indexing for home, /range and key products; watch Indexing → Pages over the next 1–3 weeks.

## 2026-10-17 — Policy pages, bag and 404s no longer claim to be the homepage
- **What:** removed the site-wide default canonical. `/shipping`, `/privacy`, `/terms` now point to themselves; `/cart` is `noindex, follow`; 404s are `noindex` with no canonical.
- **Why:** audit #1 / plan T1 (critical). These pages were in the sitemap while their canonical said "homepage".
- **Where:** `app/layout.tsx`, `app/{shipping,privacy,terms,cart}/page.tsx`, commit `b17529a`.
- **Check:** live tags verified on /, /shipping, /privacy, /terms, /range/monolith, /journal, /cart and a 404.

## 2026-10-17 — Google Analytics 4 and verification tags added (off until IDs are set)
- **What:** GA4 tag plus shop events (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`) sent from the same helpers as the Meta Pixel. Search Console / Bing verification meta tags from Vercel env vars. Status endpoint shows a `tracking` block.
- **Why:** plan T2 / T3, audit #2 / #3. Organic traffic and revenue were unmeasured.
- **Where:** `lib/analytics/ga4.ts`, `components/analytics/google-analytics.tsx`, `lib/analytics/pixel.ts`, `app/layout.tsx`, commit `4a19152`. Guides in `docs/seo/01–05`. Data script `marketing/seo/tools/seo_data.py`.
- **Next:** create the GA4 property, add `NEXT_PUBLIC_GA_ID` in Vercel and redeploy (see 02-google-analytics.md); set up read-only data access (04-data-access.md).

## 2026-10-17 — Checkout autofill labels
- **What:** every checkout field carries a "shipping …" autofill token, so browsers offer the customer's saved address in one tap. Email/phone/PIN open the right phone keyboards.
- **Why:** conversion from organic traffic (not a ranking change).
- **Where:** `components/checkout/checkout-form.tsx`, commit `9673ce4`.

## 2026-10-15 — SEO audit and 2-month plan delivered
- **What:** audit (40 issues, scored 48/100) and plan of action (15 Oct – 13 Dec 2026, tickets T1–T26).
- **Key findings:** canonical bug (#1), no GA4 (#2), Search Console unconfirmed (#3), broken B2B form (#4), slow mobile homepage, LCP 12.6 s (#5), no category pages (#6).
- **Where:** `marketing/seo/` (PDFs and sources).
- **Data gaps then:** no Search Console / GA4 access, Semrush out of API units, no PageSpeed field data.
