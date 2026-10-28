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

## 2026-10-29 — Diwali push, better snippets for Monolith, Pillar and First Rain, email signups
- **What:**
  - **Snippets:** products can now carry their own search title and description (`seoTitle` / `seoDescription`, with "{price}" filled live).
    - Monolith: "The Monolith Cordless Waterless Diffuser" (cordless, gold or black, 1,075 sq ft, free oil).
    - Pillar: "The Pillar Dual-Scent Waterless Diffuser" (two oils at once, 540 sq ft).
    - First Rain: "First Rain Fragrance Oil: the Smell After Rain"; its page copy now says "first rain". Not "petrichor": the oil is fresh and floral, not earthy.
  - **Diwali guide:**
    - Search title "Diwali Gift Ideas 2026: Premium & Corporate Gifts", updatedAt 29 Oct.
    - The stale "order by Tuesday 27 October" line is replaced by advice that stays true: up to eight business days door to door, no promised date.
  - **Internal links to the guide:** a Diwali band under the homepage hero, and a link in the site-wide announcement bar. Both switch off after 9 Nov (`lib/seasonal.ts`).
  - **Email signups:** in the Diwali band, at the end of every journal piece, and in the footer as before.
    - Each signup now goes to the site's own list (Redis `qh:nl:subs`, with its source) as well as to Shopify as a customer accepting marketing.
    - The list is at /admin/subscribers: totals, source, unsubscribe and delete, and a CSV of subscribed addresses for Shopify Email. Open to staff and the marketing sign-in.
- **Why:**
  - From the Search Console export of 29 Oct: Monolith at position 4.6 with 35 impressions and no clicks; the Diwali guide at about 10.
  - The user asked to let visitors subscribe so they can be emailed.
- **Where:**
  - `lib/types.ts`, `app/range/[slug]/page.tsx`, `lib/data/{diffusers,oils,journal}.ts`
  - `lib/seasonal.ts`, `components/sections/diwali-band.tsx`, `components/layout/announcement-bar.tsx`, `components/home/home-sections.tsx`
  - `app/journal/[slug]/page.tsx`
  - `lib/newsletter/store.ts`, `app/actions/newsletter.ts`, `components/layout/newsletter-form.tsx`
  - `app/admin/(protected)/subscribers/page.tsx`, `app/api/admin/subscribers/route.ts`, the admin nav and dashboard
- **Check:**
  - **Local dev, file store:**
    - Signups from the Diwali band, a journal piece and the footer recorded their sources; a repeat says "already on the list"; a bad address is refused.
    - New titles and descriptions render with live prices.
  - **Admin:**
    - The dashboard tile and list work; unsubscribe and delete work; the CSV holds subscribed addresses only.
    - The marketing sign-in reaches Subscribers but not staff pages.
    - Signed-out export and actions return 401.
  - Production build passes.
  - **Watch:** Search Console CTR on /range/monolith, /range/pillar and the Diwali guide over 2–3 weeks.

## 2026-10-29 — Search Console export, 30 Sep–26 Oct (web)
- **Found:**
  - **Totals:** 41 clicks, 276 impressions, CTR 14.9%. Impressions by week: 58 → 64 → 79 → 75 (the last week has 6 days); clicks 11 → 3 → 15 → 12. Peak day 26 Oct: 23 impressions, 4 clicks.
  - **Brand-led:**
    - "quint home": 15 clicks, 31 impressions, position 1.19, CTR 48%.
    - Homepage: 27 of 41 clicks, position 2.7.
    - /contact, /about, /range, /shipping and /terms sit at positions 2.5–4 with few clicks, which reads as sitelinks under brand searches.
  - **Product snippets:** 101 impressions, 7 clicks, position 10.6 (product markup is working).
  - **Mobile vs desktop:** mobile position 4.9, CTR 16%; desktop 9.4, CTR 12.5%. India has 196 of 276 impressions and all clicks but one.
  - **Non-brand barely visible:** "pillar diffuser" 19, "first rain perfume" 54, "first rain" 27, "scenting services" 85. Listed queries cover only 51 of 276 impressions; the rest are hidden by Google.
  - **Impressions but no clicks:** /range/monolith (35, position 4.6), /businesses (27), /journal (23), /range/pillar (23), /journal/diwali-gifting-guide (18, position 10.3), /range/first-rain (21, position 30.7).
  - **Not in the data yet:** the 3 category pages (live 24 Oct) and 5 of 6 journal articles.
  - **Old URLs:** /shop/ember, /shop/the-arrival and /shop/shoreline still show; all 301 to /range/ (checked live).
- **Why:** the user shared the export after asking how to keep impressions rising.
- **Where:** Search Console export supplied by the user (Chart, Queries, Pages, Countries, Devices, Search appearance).
- **Check / next:**
  - Request indexing for the 3 category pages and 5 articles.
  - Lift the Diwali guide from position about 10 before Diwali.
  - Make the Monolith and Pillar snippets more compelling.
  - Add petrichor / "smell of first rain" wording to First Rain.
  - Connect the Search Console API for weekly tracking.

## 2026-10-29 — Data connections and search health check (impressions at their highest)
- **Found, per source:**
  - **Search Console API:** not connected. `~/.config/quinthome/seo.json` names `sc-domain:quinthome.in`, but `google-service-account.json` was never added, so the impressions graph is visible only in the Search Console UI.
  - **GA4 Data API:** not connected (no property ID, no key).
  - **Semrush:** `no_api_units` on the corporate sub-account.
  - **Gmail (campaign@ inbox):** no Search Console mail for quinthome.in in 60 days, so the property belongs to another Google account.
  - **Clarity Data Export:** working. Last 3 days: 233 sessions; Google organic 18 (about 6 a day, against about 2.6 a day over the 30 days to 17 Oct); ChatGPT 24 (about 8 a day, against about 1.5); Facebook 118. Search and AI landings are on `/` only, which points to brand queries; no category, product or journal page landings showed.
  - **Bing:** `site:quinthome.in` shows no results; the site is still not in Bing's index.
- **Site health:** all 37 sitemap URLs return 200 with self canonicals, one H1, sensible title and description lengths and no noindex. Structured data: Product on 17 pages, AggregateRating on 2, FAQPage on 8, BreadcrumbList on 27. robots.txt, sitemap, llms.txt, the product feed and the IndexNow key all respond.
- **Why:** the user reported Search Console impressions at their highest and asked what is working and how to keep it rising.
- **Where:** `marketing/seo/tools/seo_data.py check`, `marketing/analytics/clarity.py` (Channel/Source and URL/Channel, 3 days), a live crawl of the sitemap.
- **Check / next:**
  - Connect Search Console (service account or a user on the property) to see queries and pages.
  - Verify Bing Webmaster (import from Search Console) and submit the sitemap.
  - Gather reviews: only 2 of 17 products have rating markup.
  - Merchant Center free listings with /feeds/products.xml.
  - Semrush units.

## 2026-10-28 — No hero video on phones; forced reflows; the № sign
- **What:** phones no longer get the homepage video.
  - The first slide on phones is the couple photograph (`hero-lounge-mobile.webp`, q75 via the image optimiser). It sits in the video's slot as a phone-only `<source>` in the same `<picture>`, so the HTML is the same for every screen.
  - The other phone slides are unchanged and advance every 5 s.
  - Tablet and desktop keep the video. On phones the `<video>` is hidden, never played and `preload="none"`, so the MP4 is never requested.
  - The lounge slide is now desktop-only, since phones already open on it.
- **Also, from the PageSpeed report of 1:36 PM (after the first deploy):**
  - **Mobile PageSpeed:** 60. FCP 2.9 s, LCP 6.7 s, TBT 350 ms, SI 5.0 s; the 1:08 PM run had FCP 3.2 s, LCP 8.9 s, TBT 130 ms, SI 5.6 s.
  - **Forced reflow (36 ms, first party):** `FadeUp` read `getBoundingClientRect` on mount (35 components), and the header read `offsetHeight` and the hero's rect, then wrote `--header-h`. Now:
    - FadeUp takes "on screen at mount" from an IntersectionObserver's first report.
    - The header measures itself with a ResizeObserver.
    - "Past the hero" comes from an IntersectionObserver with the header's height cut off the top.
    - Hide-on-scroll still uses scroll deltas, now only from scroll events.
  - **№ sign:** the "№" labels pulled in Inter's 19 KB Cyrillic file on the critical chain (PageSpeed's network dependency tree). It is now a 1.3 KB cut of the same glyph (`public/fonts/inter-numero.woff2`), in the same "Inter Extras" face as ₹.
- **Why:** even after load, the 1.4 MB video was half the phone homepage's weight and kept Lighthouse's Speed Index at about 4.6 s.
- **Where:** `components/sections/hero.tsx`, `components/motion/fade-up.tsx`, `components/layout/header.tsx`, `app/globals.css`, `public/fonts/inter-numero.woff2`.
- **Check:**
  - Production build, phone: no .mp4 requests, the first image is the couple photo, the next slide arrives after 5 s, no console errors. Desktop still plays the video.
  - Lighthouse 13.5 mobile, local medians of 3: page weight 2,803 → 1,369 KB, Speed Index 4.6 → 1.4 s, FCP 1.4 → 1.1 s; LCP 4.6 → 4.8 s and score 73 → 71, within run-to-run noise.
  - The couple photo is about 38 KB as the first image, against the 20 KB video frame; the Peace poster would be about 10 KB.
  - **With the reflow and № fixes too (local medians of 3):** score 73, FCP 1.2 s, LCP 4.6 s, TBT 329 ms, Speed Index 2.1 s, 1,351 KB.
    - First-party forced reflows are gone. What remains is Embla's slide measurement (about 8 ms) and about 50 ms Lighthouse cannot attribute.
    - No Google extra font file is requested.
  - **Header and fade-ups checked on phone and desktop:**
    - The header is see-through over the hero, solid past it, hides on scroll down and returns on scroll up.
    - `--header-h` is 76/80 px.
    - Fade-ups: on screen at load stay visible; off screen they hide and slide in.
  - **Screenshots:** identical before and after on /about, /range/scented-candles, /range/the-forest, /range/monolith, the desktop homepage and a client-side navigation. Only the phone hero changed.

## 2026-10-28 — Meta Pixel in the first HTML; lighter first load on phones (page speed, Core Web Vitals)
- **Found:** the candle campaign (Digi_Sales_Candle_9/OCT) counted a landing page view for only 21% of link clicks. A phone on slow 4G (1.6 Mbps, 150 ms, 4× CPU), measured on the live site:
  - Pages appeared in 1.6–2.0 s.
  - Meta's PageView left only at 9.6 s (home), 6.2 s (/range/scented-candles) and 6.8 s (/range/the-forest), so anyone who left sooner was a click with no landing page view.
  - Cause: the pixel was added only after the app had loaded and hydrated (afterInteractive, then also gated by StorefrontOnly from 25 Oct).
  - Lighthouse mobile: home 42 (LCP 10.1 s), candles 83.
  - A third-party report flagged DOM size, INP and mobile-friendliness. DOM size is fine (713 nodes on home). The viewport tag is present, and the page is served normally to every bot UA tried, so those two flags were the tool failing to load the page. Taps after load measured 56–88 ms at 4× CPU, inside the 200 ms INP threshold.
- **What:**
  - **Meta Pixel:** its base code is a plain `<script>` in `<head>`, with a preload of fbevents.js and preconnects to both Meta hosts. It skips /admin and pdf.* itself. Route-change PageViews are unchanged.
  - **GA4:** gtag.js is fetched once the PageView has gone, or after 2.5 s. Its config and events still queue in order.
  - **Hero video:** starts after the load event; the still frame is the first paint as before.
  - **Hero images:** the hidden slides' images wait for the load event too.
  - **₹ sign:** comes from a 1.2 KB cut of Inter (`public/fonts/inter-rupee.woff2`) instead of the 84 KB latin-ext file every price pulled in.
- **Where:** `components/analytics/meta-pixel-base.tsx` (new), `app/layout.tsx`, `components/analytics/meta-pixel.tsx`, `components/analytics/gtag-after-meta.tsx` (new), `components/analytics/google-analytics.tsx`, `components/sections/hero.tsx`, `app/globals.css`, `public/fonts/inter-rupee.woff2`, `next.config.ts` (/fonts cached like /images), `components/sections/diffuser-showcase.tsx`.
- **Check:** the same test, against a production build:
  - Meta PageView at 5.2 s on home, 5.2–5.4 s on candles and 5.2 s on The Forest; 1.0–1.4 s on typical 4G (was 1.4–2.4 s).
  - One PageView per landing and one per client-side page change. ViewContent still sent on product pages. GA4 page_view and view_item still sent. No fbq and no events on /admin.
  - **Watch:** landing page views ÷ link clicks in Ads Manager over the 5–7 days after deploy, by placement.
  - **Not done (needs a design call):** Literata's optical-size axis costs 114 KB of the 219 KB serif download.
- **PageSpeed list, same day (Lighthouse 13.5, homepage), item by item:**
  - **Improve image delivery:** diffuser cards had `sizes` of 100vw on phones and 30vw on tablets, but the cards are 84% and 46% wide. Now `(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 80vw` (`components/sections/diffuser-showcase.tsx`). The rest of the estimate is recompression of hero photos at q90. Those now load after the page, so they were left alone (design call).
  - **Render-blocking requests:** tried `experimental.inlineCss` and reverted it. It put the CSS in the HTML three times (32 → 80 KB compressed) and lowered the mobile score from 76 to 66 (TBT 280 → 500 ms). Noted in `next.config.ts`.
  - **Use efficient cache lifetimes:** only Meta and Clarity scripts, whose cache times are set by those companies. Own assets are already long-cached; /fonts added.
  - **Legacy JavaScript:** 14 KB is Next.js's own built-in polyfills (no opt-out), 12.5 KB is in fbevents.js.
  - **Reduce unused JavaScript:** mostly gtag.js, fbevents.js and the pixel config.
  - **Avoid enormous network payloads:** the hero video (1.4 MB phone, 3.6 MB desktop; already 0.6 and 1.5 Mbps). It now loads after the page.
  - **Forced reflow and DOM size:** pass.
- **Live after deploy (66eb80b, live about 45 s after the push), same tests:**
  - **Slow 4G:** the page appears at about 1.1 s (was 1.6–2.0 s). Meta PageView at 5.5 s on home (was 9.6 s), 5.2 s on /range/scented-candles (was 6.2 s) and 5.8 s on /range/the-forest (was 6.8 s).
  - **Typical 4G:** PageView at 1.2–1.4 s (was 1.4–2.4 s).
  - **Events:** PageView + ViewContent on a product landing, PageView per client-side page change, nothing on /admin.
  - **Lighthouse 13.5 mobile, 3 runs:** before 67/73/71, after 73/64/60, a swing of 60–73 for one page on one machine. Medians: FCP 1.7 → 1.2 s and LCP 4.2 → 3.8 s; TBT and Speed Index within noise. Speed Index may be slightly worse because the hero video now starts after load.
  - **Found, not caused by this change:** GA4 `view_item` is missing when a visitor lands directly on a product page; it is only sent after a client-side page change.
- **Lighthouse on localhost vs live:** mobile medians of 3 runs, live 71 against 73 locally, with blocking time 432 → 307 ms and first paint 1.7 → 1.4 s. Localhost is HTTP/1.1 with no CDN, which inflates Lantern's simulated LCP (4.6 vs 4.2 s live), so re-run PageSpeed on the live site after deploy. Removing the fbevents preload made no Lighthouse difference but delayed the PageView by up to 0.5 s, so it stays.

## 2026-10-24 — H1s with search phrases, favicon fix, shop and site-name markup (plan §07, T19)
- **Found (brand search for "quint home"):**
  - **Favicon:** blank white circle. The icon was a white mark on a transparent ground, which disappears on Google's white circle.
  - **Site name:** shown as "quinthome.in".
  - **Old title and description:** Google showed "Quint Home — Waterless Diffusers & Fragrance Oils, Mumbai", from before T13. It hasn't re-crawled since.
  - **Sitelinks:** Contact, About, Shipping, Terms and "Scent your space." (the /businesses H1). Not yet the category pages, which went live this week.
  - **Business Profile panel:** "E-commerce service", no phone, no reviews. Its description lists reed diffusers and wardrobe products the site doesn't sell.
- **Favicon:** the same monogram in white on a solid verdant (#293329) square: `app/favicon.ico` (16/32/48), `app/icon.png` (512) and a new `app/apple-icon.png` (180). Source tile in `public/images/brand/favicon-tile-512.png`.
- **H1s:** every page still has exactly one, and each now carries the search phrase from the plan. The brand line stays as the large type.
  - **Home:** the hidden H1 is gone. The first line under the video is now the H1: "Waterless diffusers that elevate your home. Fragrance oils that stay with you." (was "Objects… / Fragrances…", an H2).
  - **/range, /journal, /businesses, /faq, /contact:** the small label above the headline is now part of the H1. Each has a search phrase, e.g. "Scent marketing for hotels, offices & retail" + "Scent your space."
  - **/about:** "Quintessence" plus a screen-reader-only ": the story of Quint Home".
  - **/find-your-scent:** a visible H1, "Find your fragrance oil".
  - **Products:** the H1 is the name plus its kind, e.g. "The Monolith, Waterless aroma diffuser", "Terrain, Fragrance oil for diffusers · 50 ml", "The Forest… Bergamot & Vetiver soy candle". On Hotel Credential oils the badge moved beside the stars.
- **H2s:**
  - **Home:** "A waterless diffuser for every room", "A library of fragrance oils, made the way perfumers do", "Set your diffuser once…".
  - **Duplicate fixed:** the homepage's "It started in Udaipur." (same as /about) is now "It started in a hotel in Udaipur."
  - **Product pages:** the section labels are now H2s: Overview / The notes on oil pages, About the… / Key features on diffuser pages, and "The other soy candles" on candle pages.
  - **/faq:** groups renamed "The Diffusers", "The Fragrance Oils", "The App & Controls", and each question is an H3.
  - **/businesses:** "Commercial Diffusers", "Bulk Diffusers & Oils".
- **Homepage links:** "Waterless Diffusers", "Fragrance Oils" and "Soy Candles" now go to the three category pages. The old "Reed Diffusers & Candles" link is gone, since reed diffusers aren't sold.
- **Markup:**
  - **Organization:** now `OnlineStore`, with legalName Rusera Lifestyle, an ImageObject logo, a customer-service contactPoint, an address (Mumbai, Maharashtra, 400019, IN; no street, as the registered address is a home) and the return policy.
  - **WebSite:** gains alternateName "QuintHome" and "Quint Home India", and inLanguage en-IN.
  - **Product:** up to 5 images (was 1).
- **Accessibility:** a small-text terracotta (`--color-clay-text` #b55423) for the candle notes label and the discount pills (was 4.4:1). The FAQ list was an invalid `<dl>`.
- **Where:** app/page.tsx, layout.tsx, range, about, journal, businesses, faq, contact, find-your-scent pages; components/sections (smart-home, diffuser-showcase, scent-library, how-to-use, founder-teaser); components/product (diffuser-hero, oil-hero, candle-page, candle-compare, price-tag, add-to-bag); lib/structured-data.ts; app/globals.css.
- **Check:**
  - Lighthouse on the production build: accessibility 100 and SEO 100 on /, /range, /businesses, /faq, /journal, /find-your-scent, /range/monolith, /range/loom, /range/grand-lobby and /range/the-forest.
  - Watch the brand result in Google over 1–3 weeks for the new favicon, "Quint Home" as site name, the new title and description, and category sitelinks.
  - Request indexing of the homepage in Search Console to speed it up.

## 2026-10-24 — The Loom: Bluetooth and app control removed
- **What:** The Loom was listed as Bluetooth and app-controlled. It is set by hand at its knob only (client correction). Removed from:
  - the product data: the Bluetooth setting, description, overview bullets, key features and the "Connectivity" spec. Its meta description no longer says "with app scheduling", and its Product markup now reads "No app".
  - the key-features image, remade as `key-features/loom-v2.webp` ("Simple knob control").
  - /range/waterless-diffusers: the room table, the box copy and the FAQ. The meta description now says "App control on three" (was "on most").
  - /faq: two answers.
  - three articles: the waterless article, the Diwali gift guide and the hotel-scent article.
  - the comparison table on every diffuser page ("Knob (no app)", was "App + knob").
  - llms.txt, the print catalogue copy, and the Loom Meta ad image and copy (in "PPC Creatives").
- **Why:** an untrue feature claim on the page, in search results and in ads.
- **Where:** `lib/data/diffusers.ts`, `category-pages.ts`, `journal.ts`, `app/faq/page.tsx`, `app/llms.txt/route.ts`, `marketing/catalogue/copy.json`.
- **Check:** /range/loom shows no Bluetooth or app. The Shopify product description for the Loom (Admin) and any live Meta ad using the old image still need checking by hand. The printed catalogue PDF needs re-exporting from the updated copy.

## 2026-10-24 — Site QA sweep: accessibility and legibility fixes
- **What:** A full check of the live site after the week's changes.
  - Crawl of all 37 sitemap pages: no broken links or assets (1,615 checked).
  - Phone-width check of every page: no layout breaks or console errors.
  - Shopping flow: add to bag, bag, checkout all work.
  - Lighthouse found and these were fixed:
    - **Closed bag drawer** was hidden from screen readers but its buttons could still be reached by keyboard (`aria-hidden-focus`, every page). It is now `inert` when closed.
    - **Low contrast:** the "Specs" gallery thumbnail (2.35:1, 6.7 px) and "Swipe to compare" (3.1:1). Both now in full secondary grey at a readable size.
    - **Heading order:** category pages went H1 → H3 (product names); a screen-reader-only H2 now heads the grid. The footer newsletter heading was an H3 straight after the page H1 on short pages such as /checkout; it is now an H2.
    - **Legible text (SEO):** oil pages had 59.7% of text at 12 px or more, just under Lighthouse's 60% bar. The most common small size, 11.84 px, is now 12 px (21 places, no visible change), and the oil spec labels went from 7.4 px to 8.6 px, matching the diffuser pages.
  - **Bag wording:** said "Shipping & taxes calculated at checkout" though prices include GST. Now "Prices include GST. Shipping is free over ₹5,000, otherwise ₹99." The full bag page no longer says taxes are added at checkout.
- **Why:** not a plan ticket; found in this sweep. Lighthouse accessibility and legibility feed Google's page-experience signals, and the old bag wording could make shoppers expect a higher total.
- **Where:** `components/cart/cart-drawer.tsx`, `cart-view.tsx`, `product/product-gallery.tsx`, `product/oil-hero.tsx`, `sections/diffuser-compare.tsx`, `sections/category-page.tsx`, `layout/footer.tsx`, `app/range/page.tsx`.
- **Check:** Lighthouse on the production build: accessibility 100 on /, /range/terrain, /range/monolith, /range/waterless-diffusers, /range/fragrance-oils and /checkout (was 93–96); SEO 100 except /checkout at 63, which is noindex on purpose. Best practices stays at 79 because Meta Pixel and Clarity set third-party cookies; that clears only with a consent banner (T23).

## 2026-10-24 — Four articles, breadcrumbs, oil list on the quiz page (plan Weeks 1–2, T16, T18)
- **Articles (journal now 6):**
  - Rewritten: "Waterless vs Ultrasonic Diffuser: Which Is Better?" (`what-is-a-waterless-diffuser`, 1,539 words, was ~250).
  - New: "How to Make Your Home Smell Like a Luxury Hotel" (1,492 words).
  - New: "Diwali Scents for the Pooja Room and Living Room" (1,402 words).
  - Updated: the Diwali gift guide (1,510 words). It adds the three soy candles, the Drift as sold without an oil or app, and order timing for Diwali on 8 Nov (Dhanteras 6 Nov), with no promised dates.
  - Each answers the question in its first two sentences, uses question H2s, links 2–4 products plus a category page and a related article, and closes with "Questions". All facts come from lib/data, the FAQ and /shipping. The unsupported "1 to 3 percent" figure from the old waterless post is gone.
- **Article pages:** `**bold**` now renders. A closing "## Questions" block is emitted as FAQPage markup (6, 6, 3 and 4 questions). The " · Quint Home" suffix is added only where the title stays within 60 characters. Each article has its own `seoDescription` (≤155).
- **Breadcrumbs (T16):** every product page shows a linked trail, Home › The Range › {Category} › {Product}, and its BreadcrumbList now includes the category page.
- **Find Your Scent (T18):** all eight oils listed as links under the quiz, server-rendered.
- **Copy fixes:** The Palace / The Forest / The Study room suggestions on /range/scented-candles now match lib/data/candles.ts. The FAQ's Pebble answer says "24-hour cyclic timer" (8 h on, 16 off), not "8-hour".
- **Where:** `lib/data/journal.ts`, `app/journal/[slug]/page.tsx`, `components/layout/breadcrumbs.tsx`, the three product components, `app/range/[slug]/page.tsx`, `app/find-your-scent/page.tsx`, `lib/data/category-pages.ts`, `app/faq/page.tsx`.
- **Check:** local build: all five article pages 200, no literal asterisks, FAQPage present, no broken images, phone width; sitemap 37 URLs. Next: IndexNow and Search Console indexing requests for the two new articles. Watch: the gift guide's price bands assume today's markdowns.

## 2026-10-24 — Titles and descriptions from the plan's rewrite sheet (plan T13)
- **What:** every page in the sitemap now has a title of 60 characters or fewer and a description of 155 or fewer. Home, /range, /about, /journal, /businesses, /faq, /find-your-scent and /contact take the section 07 wording. /businesses says "We reply within 48 hours" (what the page promises) instead of "Proposal in 48 hours"; /faq keeps its description until the FAQ is expanded.
- **Product templates:** diffusers read "The Monolith Waterless Diffuser, 1,075 sq ft" (coverage as the page shows it, so the Ember and Pillar say 540, not the raw 538), the Drift "Waterless Car Diffuser". Oils read "{Name} Fragrance Oil for Diffusers, 50 ml"; the Hotel Credential oils "{Name} Hotel Fragrance Oil, 50 ml". Candles read "{Name} Soy Candle, {Notes}". Descriptions carry the live Shopify price.
- **Journal:** new `seoDescription` field (falls back to the excerpt), set on the two articles not being rewritten; "Top, Heart and Base Notes, Explained" and "Why Your Home Deserves Scent That Was Designed" as their search titles.
- **Not changed:** H1s. The plan's H1 wording changes visible design (e.g. the homepage hero), so it waits for the client's approval.
- **Where:** `app/range/[slug]/page.tsx`, the eight page files, `app/journal/[slug]/page.tsx`, `lib/data/journal.ts`, `lib/types.ts`.
- **Check:** local build, all 35 sitemap pages measured: no title over 60, no description over 155 apart from the two articles being rewritten today.

## 2026-10-24 — Homepage video, caching, AVIF and share images (plan T5, T7, T12)
- **Hero video (T5):** one 4.7 MB file for every device is now two: a 3.6 MB desktop file and a 1.4 MB phone file cut to the 4:5 crop phones already showed (same framing). A still of the first frame shows at once under each (`fetchpriority=high`), so the hero is never blank and the first paint is a 20–50 KB image. Three unused videos removed (`hero-3.mp4`, `hero-5.mp4`, `hero-deep.mp4`, 15.8 MB).
- **Caching (T7):** `/images/*` and `/videos/*` cached 30 days (`max-age=2592000, stale-while-revalidate=604800`) instead of `max-age=0`; optimised images cached 31 days and served as AVIF first, WebP second. **Rule from now on:** replace a photo under a new file name (the `-v2` convention), never overwrite one.
- **Share images (T12):** a 1200×630 default (`/images/og/quint-home.jpg`) on every page without its own, and `og:locale en_IN` everywhere. Product and journal pages keep their own photographs. Still open: product share images are WebP, which some WhatsApp versions won't preview; og:url is set only on product, journal and category pages.
- **Where:** `components/sections/hero.tsx`, `public/videos/`, `public/images/hero-3-poster*.webp`, `next.config.ts`, `lib/seo.ts`, `app/layout.tsx`, `app/range/[slug]/page.tsx`, `app/journal/[slug]/page.tsx`, `components/sections/category-page.tsx`.
- **Check:** local build: cache headers present, `/_next/image` returns `image/avif`; phones request only `hero-3-mobile.mp4`, desktops only `hero-3-desktop.mp4`, both play with the still shown first; og:image on /journal, /faq, /businesses, /about. Lighthouse on the live homepage after deploy.

## 2026-10-24 — Three category pages live (plan T9)
- **What:** `/range/waterless-diffusers`, `/range/fragrance-oils` and `/range/scented-candles`. Each has the plan's title, description and H1 (section 07), a visible breadcrumb, every product in the category with its live price (sold-out last), 370–560 words of guide copy under question-style H2s, an FAQ, and ItemList + BreadcrumbList + FAQPage markup. The diffuser page has a room-size table; the candle page pairs each candle with the oil that shares its notes. The header Range menu, the footer and the product pages' "All scents" / candle links now point to these pages instead of `/range#…` anchors or `/range?category=oils`. They're added to the sitemap (32 → 35 URLs) and to llms.txt.
- **Also:** the FAQ's "Under 18 dB" claim is replaced. No spec supports it; the Pillar is rated at 35 dB or less, and the answer now says so.
- **Why:** audit #6 / plan T9: nothing on the site could rank for "waterless diffuser", "fragrance oil for diffuser" or "soy candles". Also T8: no false claims.
- **Where:** `lib/data/category-pages.ts` (copy, from lib/data facts only), `components/sections/category-page.tsx`, `app/range/{waterless-diffusers,fragrance-oils,scented-candles}/page.tsx`, header, footer, sitemap, llms.txt, `app/faq/page.tsx`.
- **Check:** local build: titles 56/52/43 characters, descriptions 152/144/131, canonical self, 6/8/3 products, no JS errors, no sideways scroll on a phone. Next: request indexing for the three URLs in Search Console and push them through IndexNow.

## 2026-10-24 — Business enquiry form works; false subscription claims removed
- **What:** the /businesses form now sends. Each enquiry is emailed to hello@quinthome.in (`ENQUIRY_TO` overrides), with Reply-To set to the enquirer, and a copy is kept in Redis (`qh:enq`, newest 500). A sent enquiry fires GA4 `generate_lead` and Meta `Lead`. There's a honeypot, a 3-second timing check and 5 per hour per address. Type of space is now a list. The three invented client testimonials on /businesses are removed. "Subscribe and save 15% on refills" (/range) and "Subscribe & Save on refills" (oil pages) are replaced with the real offer: the free first 50 ml, 45–60 days a bottle, refills from ₹899.
- **Why:** audit #4 (critical) / plan T4: every enquiry was being lost. Audit #8 / #9 / plan T8: placeholder testimonials and a subscription that was never built.
- **Where:** `app/actions/enquiry.ts`, `components/business/enquiry-form.tsx`, `app/businesses/page.tsx`, `app/range/page.tsx`, `components/product/oil-hero.tsx`.
- **Check:** on a local build: a bad email is refused with a message, a send reaches Resend's test inbox and shows the thank-you, `generate_lead` is queued, no JS errors. Not yet done: tagging the enquirer in Shopify (the rest of T4).

## 2026-10-24 — Plan status review (end of Week 1)
- **Done (7 of 26 tickets):** T1 canonicals, T10 product schema, T11 product feed, T21 llms files (candles), plus most of T2 (GA4 + shop events), T3 (Search Console) and T6 (Clarity after load, 20 Oct; Meta Pixel kept as is for ad optimisation). /refunds is permanent (half of T15). Off-plan but on the brief: real customer reviews with aggregateRating markup (brief item #9), placeholder testimonials no longer shown.
- **Found live, still wrong:** the /businesses "Submit enquiry" button does nothing (`type="button"`, no handler), so business enquiries are lost (audit #4, T4, critical). "Subscribe & Save" is still promised on /range and the oil pages, although subscriptions are off (T8). Candles are not linked from the homepage (T8). Product titles run past 60 characters, e.g. the Monolith at 66 (T13).
- **Not started:** T4, T5 (hero still `preload="auto"`, 4.7 MB, no poster), T7 (images and videos `max-age=0`, WebP only), T9 category pages, T12 share images (none on /journal, /faq, /businesses), T14, T16–T20, T22–T26. ISR runs in iad1 (Washington), not Mumbai (T25); http://quinthome.in takes 2 hops.
- **Content and off-page:** 0 of 16 articles; no email platform chosen, so the 27 Oct Diwali email is at risk; Bing Webmaster Tools, Merchant Center submission and Business Profile not confirmed.
- **KPI check:** homepage mobile Lighthouse 30 → 63 (target 70+); product pages 75 → 67–78 after the Clarity change; sitemap 32 URLs (target 50+).

## 2026-10-19 — Key-features sheet moved to the last gallery slide
- **What:** on each diffuser page the key-features image is now the last slide, after the Specs card, instead of slide 2. It is now a separate `featuresImage` field rather than an entry in `gallery`, so it no longer appears as an extra image in `/feeds/products.xml` or the image sitemap. Those carry product photos only, which is what Google Merchant expects for additional images.
- **Why:** client's request (gallery order).
- **Where:** `components/product/product-gallery.tsx` (new `after` slides), `components/product/diffuser-hero.tsx`, `lib/data/diffusers.ts`, `lib/types.ts`.
- **Check:** all 6 diffusers show photos, then Specs, then Features (Monolith in both finishes).

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
