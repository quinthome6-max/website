import type { MetadataRoute } from "next";
import { diffusers } from "@/lib/data/diffusers";
import { oils } from "@/lib/data/oils";
import { candles } from "@/lib/data/candles";
import { journal } from "@/lib/data/journal";
import { SITE } from "@/lib/seo";

/**
 * Only URLs that answer 200 belong in here.
 *
 * /shop used to be listed, but it 301s to /range (see next.config.ts), so every
 * crawl spent budget confirming a redirect and Search Console reported the rows
 * back as "Page with redirect" — while /range itself, the actual listing page,
 * was never submitted at all. /refunds is deliberately
 * absent: it is a redirect stub to /shipping (app/refunds/page.tsx), so listing
 * it would reintroduce the same fault.
 *
 * lastModified is set only where the data genuinely knows it, which today means
 * journal posts. Stamping every row with the build time claims the whole site
 * changed on every deploy; crawlers respond by discounting the signal, so an
 * absent lastmod is worth more than a false one.
 *
 * changeFrequency and priority are kept for the crawlers that still read them.
 * Google ignores both, and has said so — they are not why this file works.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE}/range`, changeFrequency: "weekly", priority: 0.9 },
    // Category landing pages (plan T9).
    { url: `${SITE}/range/waterless-diffusers`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/range/fragrance-oils`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/range/scented-candles`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/find-your-scent`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/journal`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/businesses`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/faq`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/shipping`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Product rows carry their photography, which puts the catalogue in front of
  // Google Images — a real channel for objects people shop by appearance.
  const products: MetadataRoute.Sitemap = [...diffusers, ...oils, ...candles].map((p) => {
    const shots = [p.image, ...("gallery" in p ? p.gallery : [])];
    return {
      url: `${SITE}/range/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: p.category === "diffuser" ? 0.8 : 0.7,
      images: [...new Set(shots)].map((s) => `${SITE}${s}`),
    };
  });

  const articles: MetadataRoute.Sitemap = journal.map((a) => ({
    url: `${SITE}/journal/${a.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
    lastModified: new Date(a.publishedAt),
    images: [`${SITE}${a.cover}`],
  }));

  return [...pages, ...products, ...articles];
}
