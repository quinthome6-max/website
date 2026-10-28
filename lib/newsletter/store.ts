// Newsletter subscribers, kept in the site's own Redis (the database reviews,
// enquiries and abandoned checkouts already use) so the back office can list
// and export them at /admin/subscribers. Each signup is also sent to Shopify
// as a customer who accepts email marketing (app/actions/newsletter.ts), so
// Shopify Email can reach them too; this list is the one staff can see.
//
//   qh:nl:subs           hash, email → JSON Subscriber
//   qh:nl:rl:<addr hash>  counter, signups from one address this hour
//
// Locally there is no Redis (its variables live only on Vercel), so outside
// production the same records go to .data/newsletter.json instead, to let the
// flow be tried end to end. Production never falls back.

import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { redisConfigured, redisPipeline } from "@/lib/redis";

export type SubscriberStatus = "subscribed" | "unsubscribed";

export interface Subscriber {
  email: string;
  /** Where they signed up: "footer", "diwali", or "journal:<slug>". */
  source: string;
  status: SubscriberStatus;
  createdAt: string;
  updatedAt: string;
}

export type SignupOutcome = "subscribed" | "already" | "resubscribed";

const SUBS = "qh:nl:subs";
const rlKey = (address: string) => `qh:nl:rl:${address}`;

/** Signups allowed from one address per hour. */
const HOURLY_LIMIT = 5;

const useFile = !redisConfigured && process.env.NODE_ENV !== "production";
export const newsletterAvailable = redisConfigured || useFile;

export class RateLimited extends Error {}

/** A non-reversible key for the visitor's address, for rate limiting only. */
export function addressKey(ip: string): string {
  return crypto.createHash("sha256").update(`qh-newsletter:${ip}`).digest("hex").slice(0, 24);
}

/** Where a signup came from, in words, for the back office. */
export function sourceLabel(source: string): string {
  if (source === "footer") return "Footer";
  if (source === "diwali") return "Diwali (homepage)";
  if (source.startsWith("journal:")) return `Journal: ${source.slice(8).replace(/-/g, " ")}`;
  return source;
}

/* -------------------------------------------------------------------------- */
/* Local stand-in for Redis (development only)                                */
/* -------------------------------------------------------------------------- */

interface FileDb {
  subs: Record<string, string>;
  rl: Record<string, { n: number; until: number }>;
}
const FILE = path.join(process.cwd(), ".data", "newsletter.json");

async function readFileDb(): Promise<FileDb> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as FileDb;
  } catch {
    return { subs: {}, rl: {} };
  }
}
async function writeFileDb(db: FileDb): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

/* -------------------------------------------------------------------------- */
/* Records                                                                    */
/* -------------------------------------------------------------------------- */

function parse(raw: unknown): Subscriber | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as Subscriber;
  } catch {
    return null;
  }
}

/** What a signup does to an existing record, if any. */
function afterSignup(
  prev: Subscriber | null,
  email: string,
  source: string,
  now: string
): { record: Subscriber; outcome: SignupOutcome } {
  if (prev?.status === "subscribed") return { record: prev, outcome: "already" };
  if (prev) return { record: { ...prev, status: "subscribed", updatedAt: now }, outcome: "resubscribed" };
  return {
    record: { email, source, status: "subscribed", createdAt: now, updatedAt: now },
    outcome: "subscribed",
  };
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                    */
/* -------------------------------------------------------------------------- */

/** Adds an address to the list. Throws RateLimited past the hourly limit. */
export async function addSubscriber(email: string, source: string, address: string): Promise<SignupOutcome> {
  const now = new Date().toISOString();

  if (useFile) {
    const db = await readFileDb();
    const t = Date.now();
    const rl = db.rl[address];
    const n = rl && rl.until > t ? rl.n + 1 : 1;
    db.rl[address] = { n, until: rl && rl.until > t ? rl.until : t + 3600_000 };
    if (n > HOURLY_LIMIT) {
      await writeFileDb(db);
      throw new RateLimited();
    }
    const { record, outcome } = afterSignup(parse(db.subs[email]), email, source, now);
    db.subs[email] = JSON.stringify(record);
    await writeFileDb(db);
    return outcome;
  }

  const [n, , prev] = await redisPipeline([
    ["INCR", rlKey(address)],
    ["EXPIRE", rlKey(address), 3600, "NX"],
    ["HGET", SUBS, email],
  ]);
  if (Number(n) > HOURLY_LIMIT) throw new RateLimited();
  const { record, outcome } = afterSignup(parse(prev), email, source, now);
  if (outcome !== "already") await redisPipeline([["HSET", SUBS, email, JSON.stringify(record)]]);
  return outcome;
}

/** Marks an address subscribed or unsubscribed. Returns false if it isn't on the list. */
export async function setSubscriberStatus(email: string, status: SubscriberStatus): Promise<boolean> {
  const now = new Date().toISOString();
  if (useFile) {
    const db = await readFileDb();
    const prev = parse(db.subs[email]);
    if (!prev) return false;
    db.subs[email] = JSON.stringify({ ...prev, status, updatedAt: now });
    await writeFileDb(db);
    return true;
  }
  const [raw] = await redisPipeline([["HGET", SUBS, email]]);
  const prev = parse(raw);
  if (!prev) return false;
  await redisPipeline([["HSET", SUBS, email, JSON.stringify({ ...prev, status, updatedAt: now })]]);
  return true;
}

/** Removes an address from the list entirely. */
export async function removeSubscriber(email: string): Promise<void> {
  if (useFile) {
    const db = await readFileDb();
    delete db.subs[email];
    await writeFileDb(db);
    return;
  }
  await redisPipeline([["HDEL", SUBS, email]]);
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

/** How many subscribed addresses signed up in the last seven days. */
export function joinedThisWeek(subs: Subscriber[], now = Date.now()): number {
  const since = now - 7 * 24 * 3600_000;
  return subs.filter((s) => s.status === "subscribed" && Date.parse(s.createdAt) >= since).length;
}

/** Everyone on the list, newest first. Never cached: the back office only. */
export async function listSubscribers(): Promise<Subscriber[]> {
  let values: unknown[];
  if (useFile) {
    values = Object.values((await readFileDb()).subs);
  } else {
    const [flat] = await redisPipeline([["HGETALL", SUBS]]);
    // HGETALL answers [field, value, field, value, …]; keep the values.
    values = Array.isArray(flat) ? flat.filter((_, i) => i % 2 === 1) : [];
  }
  return values
    .map(parse)
    .filter((s): s is Subscriber => s !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
