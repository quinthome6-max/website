# Quint Home — www.quinthome.in

The storefront for Quint Home: waterless diffusers, fragrance oils and candles.
Next.js on Vercel, with Shopify for products and orders, PayU for payment and
Shiprocket for delivery.

## Project structure

```
app/            Pages and API routes (Next.js App Router)
  admin/        Staff area: GST invoices, gift stock, payments, abandoned checkouts
  api/          PayU, Shopify, delivery, admin and status endpoints
components/     UI, grouped by area (home, product, cart, checkout, layout, …)
lib/            Logic and data
  data/         The catalogue: diffusers, oils, candles, journal, reviews
  shopify/      Storefront and Admin API clients
  payu/         Payment signing, verification and order settlement
  abandoned/    Unpaid-checkout records (Upstash Redis) and restore links
public/         Images, videos and fonts served by the site
docs/           How the checkout and layout rules work

marketing/      Material made from the site's data, not part of the website
  catalogue/    Print catalogue: build.ts + tools/ → out/*.pdf
  seo/          SEO audit and plan: src/*.html → *.pdf

assets/         Local only, never committed: raw photos, design exports, zips
```

Generated output (`marketing/*/out`, the PDFs, `.next/`) and everything in
`assets/` are git-ignored.

## Working on it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # what Vercel runs
```

Environment variables live in the Vercel project (Shopify, PayU, Shiprocket,
Upstash). `/api/checkout/status` shows which ones the live site can see —
names only — and which commit it was built from.

## Deploying

Pushing to `main` on GitHub (`quinthome6-max/website`) deploys to production.

## Marketing material

```bash
npx tsx marketing/catalogue/build.ts && python3 marketing/catalogue/tools/render.py
python3 marketing/seo/render.py
```
