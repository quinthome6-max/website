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
 * lastModified is never the build time. Stamping every row with it claims the
 * whole site changed on every deploy, and crawlers respond by discounting the
 * signal. Instead each row carries the date its content last really changed:
 * journal posts from their own publishedAt/updatedAt, everything else from
 * UPDATED below, taken from the git history of the files that render it.
 * Bing (and through it ChatGPT search) leans on lastmod to decide what to
 * recrawl, so a true date here is how a change gets picked up quickly.
 *
 * changeFrequency and priority are kept for the crawlers that still read them.
 * Google ignores both, and has said so — they are not why this file works.
 */
/**
 * When each page's content last changed, from `git log` on the files that
 * render it. Bump the date in the same commit as a real content change (copy,
 * prices shown, products listed), not for refactors or styling.
 *
 * PRODUCTS covers every /range/[slug] page: they share one template and the
 * catalogue files, so a change to either changes them all (17 Nov 2026: JPEG
 * main images in the page's share image and Product markup).
 */
const UPDATED = {
  home: "2026-11-13",
  range: "2026-11-16",
  categories: "2026-11-16",
  gifting: "2026-11-16",
  findYourScent: "2026-10-24",
  about: "2026-10-24",
  businesses: "2026-10-24",
  contact: "2026-11-12",
  faq: "2026-10-24",
  shipping: "2026-10-17",
  privacy: "2026-11-12",
  terms: "2026-10-17",
  products: "2026-11-17",
} as const;

/** Written as a plain date: a Date would print as the evening before, in UTC. */
const day = (iso: string) => iso.slice(0, 10);

export default function sitemap(): MetadataRoute.Sitemap {
  // The journal index changes whenever a post is added or revised.
  const journalUpdated = journal
    .map((a) => a.updatedAt ?? a.publishedAt)
    .sort()
    .at(-1)!;

  const pages: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: day(UPDATED.home), changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE}/range`, lastModified: day(UPDATED.range), changeFrequency: "weekly", priority: 0.9 },
    // Category landing pages (plan T9).
    { url: `${SITE}/range/waterless-diffusers`, lastModified: day(UPDATED.categories), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/range/fragrance-oils`, lastModified: day(UPDATED.categories), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/range/scented-candles`, lastModified: day(UPDATED.categories), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/range/hotel-fragrance-oils`, lastModified: day(UPDATED.categories), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/gifting`, lastModified: day(UPDATED.gifting), changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/find-your-scent`, lastModified: day(UPDATED.findYourScent), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/about`, lastModified: day(UPDATED.about), changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/journal`, lastModified: day(journalUpdated), changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/businesses`, lastModified: day(UPDATED.businesses), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/contact`, lastModified: day(UPDATED.contact), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/faq`, lastModified: day(UPDATED.faq), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/shipping`, lastModified: day(UPDATED.shipping), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified: day(UPDATED.privacy), changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/terms`, lastModified: day(UPDATED.terms), changeFrequency: "yearly", priority: 0.2 },
  ];

  // Product rows carry their photography, which puts the catalogue in front of
  // Google Images — a real channel for objects people shop by appearance.
  const products: MetadataRoute.Sitemap = [...diffusers, ...oils, ...candles].map((p) => {
    const shots = [p.image, ...("gallery" in p ? p.gallery : [])];
    return {
      url: `${SITE}/range/${p.slug}`,
      lastModified: day(UPDATED.products),
      changeFrequency: "weekly" as const,
      priority: p.category === "diffuser" ? 0.8 : 0.7,
      images: [...new Set(shots)].map((s) => `${SITE}${s}`),
    };
  });

  const articles: MetadataRoute.Sitemap = journal.map((a) => ({
    url: `${SITE}/journal/${a.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
    lastModified: day(a.updatedAt ?? a.publishedAt),
    images: [`${SITE}${a.cover}`],
  }));

  return [...pages, ...products, ...articles];
}
