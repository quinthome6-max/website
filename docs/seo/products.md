# Products — SEO status

All 17 products on quinthome.in, with their page address and where each stands
for search. Update a row whenever its page, copy or markup changes, and log the
change in [CHANGELOG.md](CHANGELOG.md).

Prices are the catalogue figures in `lib/data/`. The live price on the site
comes from Shopify and may differ (e.g. during a sale).

**Columns**
- **In sitemap:** listed in `sitemap.xml` (all products are, automatically).
- **Product schema:** structured data Google reads for product results.
- **Reviews / stars:** real customer reviews shown on the page and in the markup. Google's "Missing aggregateRating / review" warnings clear when this is ✅.
- **Merchant fields:** shipping, returns, price-valid-until and SKU in the markup (plan ticket T10), needed for free Google Shopping listings.
- **Copy:** unique words on the page (audit: oils ~50, candles ~60; target 200+).

## Diffusers (6)

| # | Product | Page | Price | Model | In sitemap | Product schema | Reviews / stars | Merchant fields | Copy |
|---|---|---|---|---|---|---|---|---|---|
| 1 | The Monolith | [/range/monolith](https://www.quinthome.in/range/monolith) | ₹18,999 (list ₹23,750) | A326 | ✅ | ✅ (uses AggregateOffer, to change to Offer) | ⬜ none yet | ⬜ | ✅ 84–123 words |
| 2 | The Loom | [/range/loom](https://www.quinthome.in/range/loom) | ₹11,999 (list ₹14,999) | A974 | ✅ | ✅ | ⬜ | ⬜ | ✅ |
| 3 | The Ember | [/range/ember](https://www.quinthome.in/range/ember) | ₹8,799 (list ₹10,999) | A-T370 | ✅ | ✅ | ⬜ | ⬜ | ✅ |
| 4 | The Pillar | [/range/pillar](https://www.quinthome.in/range/pillar) | ₹11,999 (list ₹14,999) | A-T302 | ✅ | ✅ | ⬜ | ⬜ | ✅ |
| 5 | The Pebble | [/range/pebble](https://www.quinthome.in/range/pebble) | ₹3,999 | A815 | ✅ | ✅ | ⬜ | ⬜ | ⚠️ copy says "add drops… mist" (conflicts with waterless) |
| 6 | The Drift | [/range/drift](https://www.quinthome.in/range/drift) | ₹3,999 | M22 | ✅ | ✅ | ⬜ | ⬜ | ✅ (no app, no free oil — check claims elsewhere) |

## Fragrance oils, 50 ml (8)

| # | Product | Page | Price | In sitemap | Product schema | Reviews / stars | Merchant fields | Copy |
|---|---|---|---|---|---|---|---|---|
| 7 | Blanc Ritual | [/range/blanc-ritual](https://www.quinthome.in/range/blanc-ritual) | ₹899 | ✅ | ✅ (no SKU) | ⬜ | ⬜ | ⚠️ ~50 unique words |
| 8 | Terrain | [/range/terrain](https://www.quinthome.in/range/terrain) | ₹899 | ✅ | ✅ (no SKU) | ⬜ | ⬜ | ⚠️ thin |
| 9 | First Rain | [/range/first-rain](https://www.quinthome.in/range/first-rain) | ₹899 | ✅ | ✅ (no SKU) | ⬜ | ⬜ | ⚠️ thin |
| 10 | Soft Hour | [/range/soft-hour](https://www.quinthome.in/range/soft-hour) | ₹899 | ✅ | ✅ (no SKU) | ⬜ | ⬜ | ⚠️ thin |
| 11 | Solitude | [/range/solitude](https://www.quinthome.in/range/solitude) | ₹899 | ✅ | ✅ (no SKU) | ⬜ | ⬜ | ⚠️ thin |
| 12 | Shoreline | [/range/shoreline](https://www.quinthome.in/range/shoreline) | ₹899 | ✅ | ✅ (no SKU) | ⬜ | ⬜ | ⚠️ thin |
| 13 | Grand Lobby *(Hotel Credential)* | [/range/grand-lobby](https://www.quinthome.in/range/grand-lobby) | ₹1,099 | ✅ | ✅ (no SKU) | ⬜ | ⬜ | ⚠️ thin |
| 14 | The Arrival *(Hotel Credential)* | [/range/the-arrival](https://www.quinthome.in/range/the-arrival) | ₹1,099 | ✅ | ✅ (no SKU) | ⬜ | ⬜ | ⚠️ thin |

## Soy candles, 300 ml (3)

| # | Product | Page | Price | Notes | In sitemap | Product schema | Reviews / stars | Merchant fields | Copy |
|---|---|---|---|---|---|---|---|---|---|
| 15 | The Forest | [/range/the-forest](https://www.quinthome.in/range/the-forest) | ₹1,699 (list ₹2,125) | Bergamot & vetiver | ✅ | ✅ (no SKU) | ⬜ | ⬜ | ⚠️ ~60 unique words |
| 16 | The Palace | [/range/the-palace](https://www.quinthome.in/range/the-palace) | ₹1,699 (list ₹2,125) | Violet & amber | ✅ | ✅ (no SKU) | ⬜ | ⬜ | ⚠️ thin |
| 17 | The Study | [/range/the-study](https://www.quinthome.in/range/the-study) | ₹1,699 (list ₹2,125) | Oud & wood | ✅ | ✅ (no SKU) | ⬜ | ⬜ | ⚠️ thin |

## Search Console note (17 Oct 2026)

Search Console reported **11 product items** with the warnings *Missing field
'aggregateRating'* and *Missing field 'review'*. These are suggestions, not
errors. They clear only with **genuine** customer reviews (see CHANGELOG). The
other 6 products had not yet been processed by Google at that date.
