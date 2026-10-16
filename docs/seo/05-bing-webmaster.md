# 05 · Bing Webmaster Tools

Bing's index also feeds **ChatGPT search** and **Microsoft Copilot**, so being in
it matters beyond Bing itself. Once Search Console is done, this takes five minutes.

1. Go to https://www.bing.com/webmasters and sign in (a Microsoft, Google or
   Facebook account works).
2. Choose **Import from Google Search Console** → **Continue** → allow access →
   tick `quinthome.in` → **Import**. Verification and the sitemap come across
   automatically.
3. *If importing isn't possible:* **Add a site manually** →
   `https://www.quinthome.in` → choose **HTML Meta Tag** → copy only the
   `content="…"` value → add it in Vercel as `BING_SITE_VERIFICATION`
   (Production) → redeploy → **Verify**. The site already prints the tag from
   that variable.
4. Left menu → **Sitemaps → Submit sitemap** → `https://www.quinthome.in/sitemap.xml`
   (skip if it came across with the import).
5. **Settings → IndexNow** → turn it on, so new pages are picked up within hours.
