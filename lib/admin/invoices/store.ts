/**
 * Where manual invoices are kept: the shop's Upstash Redis, beside quotations.
 *
 *   qh:minv:<id>          the invoice, as JSON
 *   qh:minvs              sorted set of ids by creation time, for the list
 *   qh:minv:seq:<fy>      the last number issued in a financial year
 *
 * Off Vercel with no Redis (a local build), invoices go to
 * .data/manual-invoices.json instead, so the flow can be tried without
 * touching the live series.
 */
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { redisConfigured, redisPipeline } from "@/lib/redis";
import { financialYear, invoiceNumber, type ManualInvoice, type ManualInvoiceInput } from "./types";

const useFile = !redisConfigured && !process.env.VERCEL;
export const manualInvoicesAvailable = redisConfigured || useFile;

const KEY = (id: string) => `qh:minv:${id}`;
const INDEX = "qh:minvs";
const SEQ = (fy: string) => `qh:minv:seq:${fy}`;
const MAX_LISTED = 500;

export class InvoiceStateError extends Error {}

/* Local stand-in for Redis ------------------------------------------------ */

interface FileDb {
  invoices: Record<string, ManualInvoice>;
  seq: Record<string, number>;
}
const FILE = path.join(process.cwd(), ".data", "manual-invoices.json");

async function readFileDb(): Promise<FileDb> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as FileDb;
  } catch {
    return { invoices: {}, seq: {} };
  }
}
async function writeFileDb(db: FileDb): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

/* Reading ----------------------------------------------------------------- */

function parse(raw: unknown): ManualInvoice | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as ManualInvoice;
  } catch {
    return null;
  }
}

export async function listManualInvoices(): Promise<ManualInvoice[]> {
  if (useFile) {
    const db = await readFileDb();
    return Object.values(db.invoices).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const [ids] = (await redisPipeline([["ZREVRANGE", INDEX, 0, MAX_LISTED - 1]])) as [string[]];
  if (!ids?.length) return [];
  const [values] = (await redisPipeline([["MGET", ...ids.map(KEY)]])) as [unknown[]];
  return values.map(parse).filter((i): i is ManualInvoice => i !== null);
}

export async function getManualInvoice(id: string): Promise<ManualInvoice | null> {
  if (!/^[a-z0-9]{6,32}$/.test(id)) return null;
  if (useFile) return (await readFileDb()).invoices[id] ?? null;
  const [raw] = await redisPipeline([["GET", KEY(id)]]);
  return parse(raw);
}

/* Writing ----------------------------------------------------------------- */

async function put(inv: ManualInvoice): Promise<void> {
  if (useFile) {
    const db = await readFileDb();
    db.invoices[inv.id] = inv;
    await writeFileDb(db);
    return;
  }
  await redisPipeline([
    ["SET", KEY(inv.id), JSON.stringify(inv)],
    ["ZADD", INDEX, Date.parse(inv.createdAt), inv.id],
  ]);
}

/**
 * Saves the editor's work. A new invoice starts as a draft with no number; an
 * issued one can still be corrected (an address, a typo), keeping its number;
 * a cancelled one is final.
 */
export async function saveManualInvoice(input: ManualInvoiceInput, by: string): Promise<ManualInvoice> {
  const now = new Date().toISOString();
  const existing = input.id ? await getManualInvoice(input.id) : null;
  if (existing?.status === "cancelled") throw new InvoiceStateError("A cancelled invoice can't be changed.");

  const inv: ManualInvoice = existing
    ? {
        ...existing,
        ...input,
        id: existing.id,
        number: existing.number,
        status: existing.status,
        createdAt: existing.createdAt,
        createdBy: existing.createdBy,
        issuedAt: existing.issuedAt,
        updatedAt: now,
      }
    : {
        ...input,
        id: crypto.randomBytes(8).toString("hex"),
        number: "",
        status: "draft",
        createdAt: now,
        updatedAt: now,
        createdBy: by,
      };
  await put(inv);
  return inv;
}

/** Gives a draft the next number in its financial year and issues it. */
export async function issueManualInvoice(id: string): Promise<ManualInvoice> {
  // Two clicks at once must not take two numbers: hold a short lock while
  // the number is taken. (The local file store has one user, no lock needed.)
  if (!useFile) {
    const [got] = await redisPipeline([["SET", `qh:minv:lock:${id}`, "1", "NX", "EX", 30]]);
    if (got !== "OK") throw new InvoiceStateError("This invoice is already being issued. Reload in a moment.");
  }
  const inv = await getManualInvoice(id);
  if (!inv) throw new InvoiceStateError("That invoice no longer exists.");
  if (inv.status !== "draft") return inv; // issuing twice must not burn a number
  const fy = financialYear(new Date(`${inv.date}T00:00:00+05:30`));
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
  const now = new Date().toISOString();
  const issued: ManualInvoice = { ...inv, number: invoiceNumber(fy, n), status: "issued", issuedAt: now, updatedAt: now };
  await put(issued);
  return issued;
}

/** Cancels an issued invoice. It keeps its number, marked cancelled. */
export async function cancelManualInvoice(id: string): Promise<ManualInvoice> {
  const inv = await getManualInvoice(id);
  if (!inv) throw new InvoiceStateError("That invoice no longer exists.");
  if (inv.status !== "issued") throw new InvoiceStateError("Only an issued invoice can be cancelled.");
  const now = new Date().toISOString();
  const cancelled: ManualInvoice = { ...inv, status: "cancelled", cancelledAt: now, updatedAt: now };
  await put(cancelled);
  return cancelled;
}

/** Deletes a draft. Issued invoices are never deleted: cancel them instead. */
export async function deleteManualInvoice(id: string): Promise<void> {
  const inv = await getManualInvoice(id);
  if (!inv) return;
  if (inv.status !== "draft") throw new InvoiceStateError("An issued invoice can't be deleted. Cancel it instead.");
  if (useFile) {
    const db = await readFileDb();
    delete db.invoices[id];
    await writeFileDb(db);
    return;
  }
  await redisPipeline([
    ["DEL", KEY(id)],
    ["ZREM", INDEX, id],
  ]);
}
