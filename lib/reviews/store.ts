// Customer reviews, written on the product pages and kept in the site's own
// Redis (the database the abandoned checkouts already use).
//
// Nothing a visitor writes is shown until staff approve it at /admin/reviews,
// so a page can only ever display reviews a person has read:
//
//   qh:rv:pending        hash, review id → JSON, waiting for a decision
//   qh:rv:ok:<slug>      hash, review id → JSON, approved, shown on that page
//   qh:rv:rl:<ip hash>   counter, submissions from one address this hour
//
// Approved reviews are read through a cached GET tagged reviews:<slug>; the
// admin route expires that tag when it approves or deletes one.
//
// Locally there is no Redis (its variables live only on Vercel), so outside
// production the same records go to .data/reviews.json instead, to let the
// flow be tried end to end. Production never falls back: without Redis,
// reviews simply can't be submitted and none are shown.

import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { diffusers } from "@/lib/data/diffusers";
import { oils } from "@/lib/data/oils";
import { candles } from "@/lib/data/candles";
import { redisConfigured, redisPipeline, redisRead } from "@/lib/redis";

export interface Review {
  id: string;
  slug: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  name: string;
  city: string;
  /** For staff to reach the reviewer. Never rendered on the storefront. */
  email: string;
  createdAt: string;
}

/** What a product page may show: everything but the email. */
export type PublicReview = Omit<Review, "email">;

export interface ReviewSummary {
  average: number;
  count: number;
  /** Counts for 5, 4, 3, 2 and 1 stars, in that order. */
  histogram: [number, number, number, number, number];
}

const PENDING = "qh:rv:pending";
const okKey = (slug: string) => `qh:rv:ok:${slug}`;
const rlKey = (ip: string) => `qh:rv:rl:${ip}`;
export const reviewsTag = (slug: string) => `reviews:${slug}`;

/** Submissions allowed from one address per hour. */
const HOURLY_LIMIT = 3;

const PRODUCTS = new Map<string, string>(
  [...diffusers, ...oils, ...candles].map((p) => [p.slug, p.name])
);
export const productName = (slug: string) => PRODUCTS.get(slug);
export const isProductSlug = (slug: string) => PRODUCTS.has(slug);
export const productSlugs = () => [...PRODUCTS.keys()];

const useFile = !redisConfigured && process.env.NODE_ENV !== "production";
export const reviewsAvailable = redisConfigured || useFile;

/* -------------------------------------------------------------------------- */
/* Local stand-in for Redis (development only)                                */
/* -------------------------------------------------------------------------- */

interface FileDb {
  pending: Record<string, string>;
  ok: Record<string, Record<string, string>>;
  rl: Record<string, { n: number; until: number }>;
}
const FILE = path.join(process.cwd(), ".data", "reviews.json");

async function readFileDb(): Promise<FileDb> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as FileDb;
  } catch {
    return { pending: {}, ok: {}, rl: {} };
  }
}
async function writeFileDb(db: FileDb): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

function parseAll(values: string[]): Review[] {
  const out: Review[] = [];
  for (const v of values) {
    try {
      out.push(JSON.parse(v) as Review);
    } catch {
      // A record that will not parse is skipped, not shown half-formed.
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** HGETALL answers [field, value, field, value, …]; keep the values. */
const hashValues = (flat: unknown): string[] =>
  Array.isArray(flat) ? flat.filter((_, i) => i % 2 === 1).map(String) : [];

const toPublic = (r: Review): PublicReview => {
  const pub: Partial<Review> = { ...r };
  delete pub.email;
  return pub as PublicReview;
};

/**
 * Approved reviews for one product, newest first. A failure to read shows no
 * reviews rather than breaking the product page.
 */
export async function approvedReviews(slug: string): Promise<PublicReview[]> {
  if (!reviewsAvailable || !isProductSlug(slug)) return [];
  try {
    if (useFile) {
      const db = await readFileDb();
      return parseAll(Object.values(db.ok[slug] ?? {})).map(toPublic);
    }
    const flat = await redisRead(["HGETALL", okKey(slug)], {
      tags: [reviewsTag(slug)],
      revalidate: 3600,
    });
    return parseAll(hashValues(flat)).map(toPublic);
  } catch (e) {
    console.error("[reviews] read failed", {
      slug,
      error: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}

export function summarize(reviews: Pick<Review, "rating">[]): ReviewSummary {
  const histogram: ReviewSummary["histogram"] = [0, 0, 0, 0, 0];
  let total = 0;
  for (const r of reviews) {
    histogram[5 - r.rating] += 1;
    total += r.rating;
  }
  const count = reviews.length;
  return {
    count,
    average: count ? Math.round((total / count) * 10) / 10 : 0,
    histogram,
  };
}

/** For the admin page: everything waiting, and everything approved. */
export async function reviewsForAdmin(): Promise<{
  pending: Review[];
  approved: Review[];
}> {
  if (useFile) {
    const db = await readFileDb();
    return {
      pending: parseAll(Object.values(db.pending)),
      approved: parseAll(Object.values(db.ok).flatMap((h) => Object.values(h))),
    };
  }
  const slugs = productSlugs();
  const results = await redisPipeline([
    ["HGETALL", PENDING],
    ...slugs.map((s) => ["HGETALL", okKey(s)]),
  ]);
  return {
    pending: parseAll(hashValues(results[0])),
    approved: parseAll(results.slice(1).flatMap(hashValues)),
  };
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                    */
/* -------------------------------------------------------------------------- */

export class RateLimited extends Error {}

/** A non-reversible key for the submitter's address, for rate limiting only. */
export function addressKey(ip: string): string {
  return crypto.createHash("sha256").update(`qh-reviews:${ip}`).digest("hex").slice(0, 24);
}

/** Files a new review as pending. Throws RateLimited past the hourly limit. */
export async function submitReview(
  input: Omit<Review, "id" | "createdAt">,
  address: string
): Promise<void> {
  const review: Review = {
    ...input,
    id: crypto.randomBytes(9).toString("base64url"),
    createdAt: new Date().toISOString(),
  };

  if (useFile) {
    const db = await readFileDb();
    const now = Date.now();
    const rl = db.rl[address];
    const n = rl && rl.until > now ? rl.n + 1 : 1;
    db.rl[address] = { n, until: rl && rl.until > now ? rl.until : now + 3600_000 };
    if (n > HOURLY_LIMIT) {
      await writeFileDb(db);
      throw new RateLimited();
    }
    db.pending[review.id] = JSON.stringify(review);
    await writeFileDb(db);
    return;
  }

  const [n] = await redisPipeline([
    ["INCR", rlKey(address)],
    ["EXPIRE", rlKey(address), 3600, "NX"],
  ]);
  if (Number(n) > HOURLY_LIMIT) throw new RateLimited();
  await redisPipeline([["HSET", PENDING, review.id, JSON.stringify(review)]]);
}

/** Moves a pending review onto its product page. Returns its slug. */
export async function approveReview(id: string): Promise<string | null> {
  if (useFile) {
    const db = await readFileDb();
    const raw = db.pending[id];
    if (!raw) return null;
    const review = JSON.parse(raw) as Review;
    (db.ok[review.slug] ??= {})[id] = raw;
    delete db.pending[id];
    await writeFileDb(db);
    return review.slug;
  }
  const [raw] = await redisPipeline([["HGET", PENDING, id]]);
  if (typeof raw !== "string") return null;
  const review = JSON.parse(raw) as Review;
  await redisPipeline([
    ["HSET", okKey(review.slug), id, raw],
    ["HDEL", PENDING, id],
  ]);
  return review.slug;
}

/** Deletes a review, pending or approved. */
export async function deleteReview(id: string, slug: string): Promise<void> {
  if (useFile) {
    const db = await readFileDb();
    delete db.pending[id];
    if (db.ok[slug]) delete db.ok[slug][id];
    await writeFileDb(db);
    return;
  }
  await redisPipeline([
    ["HDEL", PENDING, id],
    ["HDEL", okKey(slug), id],
  ]);
}
