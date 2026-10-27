/**
 * Where quotations are kept: the shop's Upstash Redis, the same database as
 * abandoned checkouts, reviews and enquiries.
 *
 *   qh:quote:<id>         the quote, as JSON
 *   qh:quotes             sorted set of ids by creation time, for the list
 *   qh:quote:seq:<fy>     the running number for a financial year
 *
 * Off Vercel with no Redis (a local build), quotes go to .data/quotes.json
 * instead, so the editor can be tried without touching the live data.
 */
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { redisConfigured, redisPipeline } from "@/lib/redis";
import { financialYear, type Quote, type QuoteInput } from "./types";

const useFile = !redisConfigured && !process.env.VERCEL;
export const quotesAvailable = redisConfigured || useFile;

const KEY = (id: string) => `qh:quote:${id}`;
const INDEX = "qh:quotes";
const SEQ = (fy: string) => `qh:quote:seq:${fy}`;
const MAX_LISTED = 300;

/* Local stand-in for Redis ------------------------------------------------ */

interface FileDb {
  quotes: Record<string, Quote>;
  seq: Record<string, number>;
}
const FILE = path.join(process.cwd(), ".data", "quotes.json");

async function readFileDb(): Promise<FileDb> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as FileDb;
  } catch {
    return { quotes: {}, seq: {} };
  }
}
async function writeFileDb(db: FileDb): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

/* Reading ----------------------------------------------------------------- */

function parse(raw: unknown): Quote | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as Quote;
  } catch {
    return null;
  }
}

export async function listQuotes(): Promise<Quote[]> {
  if (useFile) {
    const db = await readFileDb();
    return Object.values(db.quotes).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const [ids] = (await redisPipeline([["ZREVRANGE", INDEX, 0, MAX_LISTED - 1]])) as [string[]];
  if (!ids?.length) return [];
  const [values] = (await redisPipeline([["MGET", ...ids.map(KEY)]])) as [unknown[]];
  return values.map(parse).filter((q): q is Quote => q !== null);
}

export async function getQuote(id: string): Promise<Quote | null> {
  if (!/^[a-z0-9]{6,32}$/.test(id)) return null;
  if (useFile) return (await readFileDb()).quotes[id] ?? null;
  const [raw] = await redisPipeline([["GET", KEY(id)]]);
  return parse(raw);
}

/* Writing ----------------------------------------------------------------- */

async function nextNumber(date: Date): Promise<string> {
  const fy = financialYear(date);
  let n: number;
  if (useFile) {
    const db = await readFileDb();
    n = (db.seq[fy] ?? 0) + 1;
    db.seq[fy] = n;
    await writeFileDb(db);
  } else {
    const [v] = await redisPipeline([["INCR", SEQ(fy)]]);
    n = Number(v);
  }
  return `QT/${fy}/${String(n).padStart(4, "0")}`;
}

/** Saves a quote, numbering it the first time. Returns it as stored. */
export async function saveQuote(input: QuoteInput, by: string): Promise<Quote> {
  const now = new Date().toISOString();
  const existing = input.id ? await getQuote(input.id) : null;

  const quote: Quote = existing
    ? { ...existing, ...input, id: existing.id, number: existing.number, createdAt: existing.createdAt, createdBy: existing.createdBy, updatedAt: now }
    : {
        ...input,
        id: crypto.randomBytes(8).toString("hex"),
        number: await nextNumber(new Date(input.date || now)),
        createdAt: now,
        updatedAt: now,
        createdBy: by,
      };

  if (useFile) {
    const db = await readFileDb();
    db.quotes[quote.id] = quote;
    await writeFileDb(db);
  } else {
    await redisPipeline([
      ["SET", KEY(quote.id), JSON.stringify(quote)],
      ["ZADD", INDEX, Date.parse(quote.createdAt), quote.id],
    ]);
  }
  return quote;
}

export async function deleteQuote(id: string): Promise<void> {
  if (useFile) {
    const db = await readFileDb();
    delete db.quotes[id];
    await writeFileDb(db);
    return;
  }
  await redisPipeline([
    ["DEL", KEY(id)],
    ["ZREM", INDEX, id],
  ]);
}
