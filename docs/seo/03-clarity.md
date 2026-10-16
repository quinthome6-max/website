# 03 · Microsoft Clarity

Clarity records anonymised sessions and builds heatmaps: where people click,
how far they scroll, where they get stuck (rage clicks, dead clicks). It is
**already installed** on every page of quinthome.in (project `ybcekf8e6g`,
`components/analytics/clarity.tsx`). This guide is about access and settings.

## Step 1 — Make sure you can see the project

1. Go to https://clarity.microsoft.com and sign in.
2. If **quinthome** (project `ybcekf8e6g`) is in your project list, open it.
3. If not, whoever created it must add you: in the project → **Settings →
   Team → Add team member** → your email → role **Admin** (needed to create the
   API token in Step 3).

## Step 2 — Recommended settings

In the project → **Settings**:

1. **Masking → Strict** or **Balanced**. Make sure the checkout fields (name,
   phone, address) are masked. Balanced masks typed text by default.
2. **Setup → Google Analytics integration → Connect**, pick the GA4 property.
   Clarity sessions then link to GA4 and the other way round.
3. **IP blocking**: add your office IP so your own visits don't get recorded.

## Step 3 — API token for reports

1. Project → **Settings → Data Export → Generate new API token**.
2. Name it `seo-reports` (letters, numbers, - _ . only, 4–32 characters).
3. **Copy the token** and keep it safe. It is shown once.
4. Save it as described in [04 · Data access](04-data-access.md). Don't paste it into chat or email.

**Limits:** 10 API requests per day, covering only the last 1–3 days. The report
script saves each download and reuses it for the rest of the day.

## Useful views

| View | Where | Use it for |
|---|---|---|
| Dashboard | Dashboard tab | Dead clicks, rage clicks, quick-backs, scroll depth |
| Heatmaps | Heatmaps → enter a URL (e.g. `/checkout`, `/range/monolith`) | What gets clicked and how far people scroll |
| Recordings | Recordings → filter by page or by "Rage clicks" | Watch where checkout confuses people |
