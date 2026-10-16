# SEO setup — Search Console, Google Analytics, Clarity

How quinthome.in is connected to Google Search Console, Google Analytics 4 (GA4)
and Microsoft Clarity, and how the data is read for SEO reports.

| Guide | What it sets up | Time |
|---|---|---|
| [01 · Google Search Console](01-search-console.md) | Google's view of the site: searches, clicks, indexing, errors | 15 min |
| [02 · Google Analytics 4](02-google-analytics.md) | Visitors, traffic sources, sales and revenue | 20 min |
| [03 · Microsoft Clarity](03-clarity.md) | Heatmaps and session recordings (already installed) | 5 min |
| [04 · Data access for reports](04-data-access.md) | Read-only access so reports can be pulled automatically | 15 min |
| [05 · Bing Webmaster Tools](05-bing-webmaster.md) | Bing, plus ChatGPT search and Copilot, which use Bing | 5 min |

**Records**

- [CHANGELOG.md](CHANGELOG.md): every SEO change and Search Console finding, dated. **Add an entry for anything done.**
- [products.md](products.md): all 17 products with their page address and SEO status.

## Status

Tick these off as they are done.

- [x] Search Console: property verified, you have access
- [x] Search Console: sitemap `https://www.quinthome.in/sitemap.xml` submitted (17 Oct 2026, 32 pages)
- [ ] GA4: property created, `NEXT_PUBLIC_GA_ID` added in Vercel, redeployed
- [ ] GA4: `payu.in` added as an unwanted referral
- [ ] GA4: linked to Search Console
- [ ] Clarity: you have Admin access to project `ybcekf8e6g`
- [ ] Data access: service account added to Search Console and GA4
- [ ] Data access: Clarity API token saved
- [ ] `python3 marketing/seo/tools/seo_data.py check` shows every line OK
- [ ] Bing Webmaster Tools imported from Search Console

## Where things live

| Thing | Where |
|---|---|
| GA4 tag and shop events | `components/analytics/google-analytics.tsx`, `lib/analytics/ga4.ts` (events are sent from `lib/analytics/pixel.ts`, alongside the Meta Pixel) |
| Verification meta tags | `app/layout.tsx`, from Vercel env vars `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` |
| Clarity tag | `components/analytics/clarity.tsx` (project `ybcekf8e6g`) |
| Data script | `marketing/seo/tools/seo_data.py` |
| Credentials for the data script | `~/.config/quinthome/` on the computer that runs reports — **never in the repository** |
| Downloaded data | `marketing/seo/data/` (git-ignored) |

## Check the live site

https://www.quinthome.in/api/checkout/status shows a `tracking` block saying which
tools are switched on in the current deployment (true/false, no IDs).

## Shop events sent to GA4

| GA4 event | When | Same moment as Meta Pixel |
|---|---|---|
| `page_view` | Every page, including in-app navigation (GA4 enhanced measurement) | PageView |
| `view_item` | A product page opens | ViewContent |
| `add_to_cart` | Something is added to the bag (from the bag Shopify returned) | AddToCart |
| `begin_checkout` | Checkout opens with items in the bag | InitiateCheckout |
| `purchase` | Order confirmation page, once per order, with the amount PayU confirmed | Purchase |

All values are in INR. Item ids are the numeric Shopify variant id, the same as the Meta catalogue.
