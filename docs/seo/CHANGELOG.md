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

## 2026-10-19 — Customer reviews on every product page; product-page CRO pass
- **What:** customers can now write reviews on all 17 product pages. Each page shows stars + average + count under the product name, and a reviews section (average, star breakdown, review list, "Write a review") above the comparison block. Reviews are held for staff approval at `/admin/reviews` and only approved ones are shown. The Product markup now carries `aggregateRating` and up to 5 `review` entries, built from the same approved reviews the page renders. With none approved, nothing is emitted, so no product has stars in the markup yet. Same release: a 5-point overview dropdown under each diffuser's name; a trust strip under Add to bag (free shipping rule, 3-day dispatch, secure PayU checkout, warranty/exchange); a key-features image as gallery slide 2 on each diffuser; the included-oil picker moved into a popup; the Drift no longer says it ships with an oil.
- **Why:** audit item "Missing aggregateRating / review" (Search Console product snippets). Stars can only be real: the site had no review data, so ratings were not invented.
- **Where:** `lib/reviews/store.ts`, `lib/redis.ts`, `app/actions/reviews.ts`, `components/reviews/*`, `app/admin/(protected)/reviews/`, `app/api/admin/reviews/route.ts`, `lib/structured-data.ts`, `app/range/[slug]/page.tsx`, product components; images in `public/images/diffusers/key-features/`.
- **Check:** after the first reviews are approved, run the page through Google's Rich Results Test and watch Search Console → Product snippets for the warning clearing. Add a line about reviews (name and city published, email private) to the privacy policy.

## 2026-10-17 — Google Analytics 4 switched on (G-T5Y716X7TM)
- **What:** GA4 measurement id `G-T5Y716X7TM` set as the default in `lib/analytics/ga4.ts` (public id, like the Clarity and Pixel ids; `NEXT_PUBLIC_GA_ID` in Vercel would override it). The site's own GA4 code is used; the snippet from Google was not pasted in, which would double-count.
- **Where:** commit `166946b`.
- **Check:** live status `tracking.googleAnalytics: true`; a real browser on /range/grand-lobby loaded gtag.js for G-T5Y716X7TM and sent `page_view` to Google Analytics. Shop events (view_item, add_to_cart, begin_checkout, purchase) were verified on a local build earlier.
- **Next (in GA4):** add `payu.in` and `secure.payu.in` as unwanted referrals, link Search Console, data retention 14 months, mark `purchase` as a key event (docs/seo/02, steps 4–7).

## 2026-10-17 — All pages pushed to Bing via IndexNow
- **What:** all 32 sitemap URLs submitted through IndexNow (answered 202 Accepted). Shared with Bing, Yandex, Seznam and Naver.
- **Why:** Bing returned no quinthome.in results, and ChatGPT search draws on Bing.
- **Where:** key file `public/5ed755914118f6e5f3030d2349826e16.txt`; script `marketing/seo/tools/indexnow.py` (re-run after publishing or changing pages, or pass specific paths).
- **Next:** Bing Webmaster Tools import (docs/seo/05) to see Bing's index status directly.

## 2026-10-17 — Catalogue made legible to shopping and answer engines (AEO/GEO)
- **Product markup:** one `Offer` per paid variant (Monolith's Gold and Black, replacing `AggregateOffer`), each with SKU (Shopify variant id; diffusers also keep model as MPN), `priceValidUntil`, `shippingDetails` (₹99 under ₹5,000, otherwise free; 0–3 days handling, 3–5 days transit; India) and `hasMerchantReturnPolicy` (3-day window, exchange, by mail), matching /shipping. Plan T10, audit #7.
- **Product feed:** `/feeds/products.xml`, Google Merchant format, 18 items (Monolith per finish), live Shopify prices with compare-at as sale price, stock, shipping. For Google Merchant Center and ChatGPT's merchant programme. Plan T11.
- **llms-full.txt** now includes the 3 candles (audit #29).
- **Contradictions fixed** (audit #27/#28): the Drift ships without an oil (Diwali guide, gifting text) and without an app (FAQ, two answers); the Pebble described as waterless, no "drops… mist"; /range meta no longer says "Bluetooth"; llms.txt "/range" line includes candles.
- **Where:** `lib/structured-data.ts`, `app/feeds/products.xml/route.ts`, `app/llms-full.txt/route.ts`, `app/llms.txt/route.ts`, `app/faq/page.tsx`, `lib/gifting.ts`, `lib/data/journal.ts`, `lib/data/diffusers.ts`, `app/range/page.tsx`. Commit `e172ff9`.
- **Check:** verified on a local build (feed 18 items, Monolith two offers, oil shipping ₹99, candles in llms-full, FAQ text), then live (feed 200, key file served). Next: Google Rich Results Test on a product page; submit the feed in Merchant Center; apply to ChatGPT merchants.

## 2026-10-17 — Investigation: ChatGPT orders stopped
- **Reported:** many earlier orders came from ChatGPT, then orders stopped suddenly.
- **Checked on the live site (all fine):**
  - AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot) plus Googlebot and Bingbot get full pages and `/llms.txt`, identical to a browser, with no firewall challenge. robots.txt allows them all.
  - ChatGPT-style links (`?utm_source=chatgpt.com`), old `/shop/…` links and the Diwali guide all open (200).
  - Checkout end to end, up to PayU's payment page, works for a diffuser with its free oil, a hotel oil, a candle and the Pebble. PayU showed "Total Payable ₹1798" with UPI, cards, net banking, wallets and EMI.
  - All products in stock except Blanc Ritual (sold out, marked OutOfStock).
- **Found:** Bing returns no quinthome.in results for the brand (automated check, not conclusive). ChatGPT search leans on Bing, and the site was never added to Bing Webmaster Tools.
- **Clarity, last 30 days (user):** sessions by source: Facebook 155, Google 77, ChatGPT 44, Instagram 24, Direct 7, WhatsApp (l.wl.co) 7, secure.payu.in 5 (returns from the payment page). Real-user speed 82/100 from 186 page views: LCP 3.9 s, INP 200 ms, CLS 0.
- **Not yet checkable:** whether payments since 10 Oct reached Shopify as orders (PayU webhook set-up and a live paid test were still pending from the 10 Oct checkout rework), and the ChatGPT traffic trend (needs Clarity or GA4).
- **Next:** (1) compare PayU successful transactions with Shopify orders since 10 Oct, (2) Clarity referrer chatgpt.com trend, (3) Bing Webmaster import + IndexNow, (4) AEO/GEO work below.
- **Side effect:** the test created about 5 abandoned checkouts named "Test Claude-Check" and opened one PayU page (transaction QHMVBGH4720018D004B5, unpaid). Dismiss them.

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
