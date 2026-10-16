// Abandoned checkouts, kept in the site's own store — not in Shopify.
//
// Shopify's "Abandoned checkouts" list only knows about Shopify Checkout, which
// this store does not use: our form and PayU take the payment, and Shopify only
// hears about an order once it is paid (see docs/payu-checkout.md). A customer
// who filled in the form and left was therefore invisible.
//
// So the checkout keeps one record per bag, from the moment an email or phone
// is typed, in a Redis database (Upstash, added to the Vercel project from its
// Storage tab). Read through Upstash's REST API, so no client library:
//
//   qh:ab:<bag>     the record, JSON, kept 60 days
//   qh:ab:index     sorted set of bags by last activity, for the admin list
//
// When the bag is paid for, its record is deleted — or, if staff had contacted
// the customer, marked recovered — so the list only shows people who did not buy.
//
// Nothing here may stand in the way of a sale. Every caller treats a failure as
// something to log, never something to show the customer.

import crypto from "node:crypto";
import type { Cart } from "@/lib/shopify/cart";
import { txnTag } from "@/lib/shopify/admin";

/**
 * Vercel's Upstash integration has used several names, and lets the person
 * connecting it add a custom prefix (e.g. STORAGE_KV_REST_API_URL). Take the
 * standard names first, then any variable ending in one of them. The
 * read-only token is skipped: this store writes.
 */
function envEndingIn(suffixes: string[]): string | undefined {
  for (const s of suffixes) if (process.env[s]) return process.env[s];
  for (const s of suffixes) {
    const key = Object.keys(process.env).find(
      (k) => k.endsWith(`_${s}`) && !k.includes("READ_ONLY") && process.env[k]
    );
    if (key) return process.env[key];
  }
  return undefined;
}
const REDIS_URL = envEndingIn(["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"]);
const REDIS_TOKEN = envEndingIn(["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"]);

/** Names (never values) of variables that look like a Redis connection. */
export function redisEnvNames(): string[] {
  return Object.keys(process.env)
    .filter((k) => /KV_|REDIS|UPSTASH/i.test(k))
    .sort();
}
const TIMEOUT_MS = 6_000;
const RECORD_TTL_S = 60 * 24 * 60 * 60;
const INDEX = "qh:ab:index";

export const abandonedStoreConfigured = Boolean(REDIS_URL && REDIS_TOKEN);

export type CheckoutStage = "form" | "payment";

/** Stable, non-reversible key for a bag. The cart id itself is a secret. */
export function bagKey(cartId: string): string {
  return crypto.createHash("sha256").update(cartId).digest("hex").slice(0, 24);
}
const recordKey = (bag: string) => `qh:ab:${bag}`;

/* -------------------------------------------------------------------------- */
/* Redis over REST                                                            */
/* -------------------------------------------------------------------------- */

type Command = (string | number)[];

async function redis(commands: Command[]): Promise<unknown[]> {
  if (!abandonedStoreConfigured) throw new Error("Abandoned-checkout store is not configured");
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands.map((c) => c.map(String))),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Redis answered ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  const failed = out.find((r) => r.error);
  if (failed) throw new Error(`Redis: ${failed.error}`);
  return out.map((r) => r.result);
}

/** For the status probe: true if the store answers. */
export async function pingAbandonedStore(): Promise<boolean> {
  try {
    const [pong] = await redis([["PING"]]);
    return pong === "PONG";
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* The record                                                                 */
/* -------------------------------------------------------------------------- */

export interface AbandonedCheckout {
  bag: string;
  createdAt: string;
  updatedAt: string;
  stage: CheckoutStage;
  contacted: boolean;
  recovered: boolean;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  total: number;
  discountCode: string;
  items: { title: string; quantity: number }[];
  txnid: string;
  restoreToken: string;
  /** The order it became, once recovered. */
  order: string;
  /** The details as typed, field by field, to fill the form in again. */
  contact?: CheckoutContact;
  /** Filled in by the list: a Shopify order already carries this PayU txnid. */
  paidAs?: string | null;
}

async function readRecord(bag: string): Promise<AbandonedCheckout | null> {
  const [raw] = await redis([["GET", recordKey(bag)]]);
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as AbandonedCheckout;
  } catch {
    return null;
  }
}

async function writeRecord(r: AbandonedCheckout): Promise<void> {
  await redis([
    ["SET", recordKey(r.bag), JSON.stringify(r), "EX", RECORD_TTL_S],
    ["ZADD", INDEX, Date.parse(r.updatedAt) || Date.now(), r.bag],
  ]);
}

async function removeRecord(bag: string): Promise<void> {
  await redis([
    ["DEL", recordKey(bag)],
    ["ZREM", INDEX, bag],
  ]);
}

/* -------------------------------------------------------------------------- */
/* Saving a checkout                                                          */
/* -------------------------------------------------------------------------- */

export interface CheckoutContact {
  email?: string;
  /** E.164, already checked. */
  phone?: string;
  firstName?: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
}

export interface CheckoutSnapshot {
  cartId: string;
  cart: Cart;
  contact: CheckoutContact;
  stage: CheckoutStage;
  txnid?: string;
  /** Signed link token that refills this bag in any browser. */
  restoreToken?: string | null;
}

/** Creates or updates the record for a bag. */
export async function saveCheckout(snap: CheckoutSnapshot): Promise<void> {
  const bag = bagKey(snap.cartId);
  const prev = await readRecord(bag);
  const c = snap.contact;
  const now = new Date().toISOString();
  const address = [c.address1, c.address2, c.city, c.province, c.zip].filter(Boolean).join(", ");

  // A later save never loses what an earlier one knew: once a bag has been to
  // PayU it stays at the payment stage, and typed details carry over.
  await writeRecord({
    bag,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    stage: prev?.stage === "payment" ? "payment" : snap.stage,
    contacted: prev?.contacted ?? false,
    recovered: false,
    customerName: [c.firstName, c.lastName].filter(Boolean).join(" ") || prev?.customerName || "",
    email: c.email || prev?.email || "",
    phone: c.phone || prev?.phone || "",
    address: address || prev?.address || "",
    total: snap.cart.total,
    discountCode: snap.cart.discountCode ?? "",
    items: snap.cart.lines.map((l) => ({
      title:
        l.variantTitle && l.variantTitle !== "Default Title"
          ? `${l.productTitle} — ${l.variantTitle}`
          : l.productTitle,
      quantity: l.quantity,
    })),
    txnid: snap.txnid || prev?.txnid || "",
    restoreToken: snap.restoreToken || prev?.restoreToken || "",
    order: "",
    contact: mergeContact(prev?.contact, c),
  });
}

/** Later typing wins field by field; a field left blank keeps what came before. */
function mergeContact(
  prev: CheckoutContact | undefined,
  next: CheckoutContact
): CheckoutContact {
  const out: CheckoutContact = { ...(prev ?? {}) };
  for (const [k, v] of Object.entries(next) as [keyof CheckoutContact, string | undefined][]) {
    if (v) out[k] = v;
  }
  return out;
}

/** The details last typed for a bag, to fill its checkout form in again. */
export async function checkoutContactFor(cartId: string): Promise<CheckoutContact | null> {
  if (!abandonedStoreConfigured) return null;
  const record = await readRecord(bagKey(cartId));
  if (!record) return null;
  if (record.contact) return record.contact;
  // Saved before the details were kept field by field: name, email and phone
  // are still enough to spare the customer most of the typing.
  const [firstName = "", ...rest] = record.customerName.split(" ");
  return {
    firstName,
    lastName: rest.join(" "),
    email: record.email,
    phone: record.phone,
  };
}

/**
 * The bag has been paid for: take it off the abandoned list.
 *
 * Deleted outright, unless staff had contacted the customer — then kept and
 * marked recovered, so the page can show what follow-up brought back.
 */
export async function closeCheckout(cartId: string, orderName: string): Promise<void> {
  const bag = bagKey(cartId);
  const prev = await readRecord(bag);
  if (!prev) return;
  if (prev.contacted) {
    await writeRecord({ ...prev, recovered: true, order: orderName, updatedAt: new Date().toISOString() });
    return;
  }
  await removeRecord(bag);
}

/* -------------------------------------------------------------------------- */
/* The admin list                                                             */
/* -------------------------------------------------------------------------- */

/** The most recent checkouts, newest activity first. */
export async function listCheckouts(limit = 100): Promise<AbandonedCheckout[]> {
  const [bags] = await redis([["ZREVRANGE", INDEX, 0, limit - 1]]);
  const keys = Array.isArray(bags) ? (bags as string[]) : [];
  if (keys.length === 0) return [];

  const [values] = await redis([["MGET", ...keys.map(recordKey)]]);
  const rows: AbandonedCheckout[] = [];
  const expired: string[] = [];
  (values as (string | null)[]).forEach((raw, i) => {
    if (typeof raw !== "string") return void expired.push(keys[i]);
    try {
      rows.push({ ...(JSON.parse(raw) as AbandonedCheckout), paidAs: null });
    } catch {
      expired.push(keys[i]);
    }
  });
  // Records age out on their own; drop their index entries to match.
  if (expired.length) await redis([["ZREM", INDEX, ...expired]]).catch(() => undefined);

  // A payment can succeed while closing its record fails. Ask Shopify which of
  // these transactions already have an order, so none is chased by mistake.
  const txnids = rows.filter((r) => r.txnid && !r.recovered).map((r) => r.txnid);
  if (txnids.length) {
    try {
      const paid = await ordersForTxnids(txnids);
      for (const r of rows) if (r.txnid && paid.has(r.txnid)) r.paidAs = paid.get(r.txnid)!;
    } catch (e) {
      console.warn("[abandoned] could not cross-check orders", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return rows;
}

/** Staff have reached out to this customer. */
export async function markContacted(bag: string): Promise<void> {
  const prev = await readRecord(bag);
  if (!prev) throw new Error("No such checkout");
  // Keep its place in the list: contacting is not customer activity.
  await redis([["SET", recordKey(bag), JSON.stringify({ ...prev, contacted: true }), "EX", RECORD_TTL_S]]);
}

/** Removes a checkout from the list for good. */
export async function dismissCheckout(bag: string): Promise<void> {
  await removeRecord(bag);
}

/* -------------------------------------------------------------------------- */
/* Shopify read: which payments already have orders                           */
/* -------------------------------------------------------------------------- */

async function ordersForTxnids(txnids: string[]): Promise<Map<string, string>> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION || "2024-10";
  const found = new Map<string, string>();
  if (!domain || !token) return found;

  for (let i = 0; i < txnids.length; i += 25) {
    const chunk = txnids.slice(i, i + 25);
    const res = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({
        query: `query o($q: String!) { orders(first: 50, query: $q) { edges { node { name tags } } } }`,
        variables: { q: chunk.map((t) => `tag:"${txnTag(t)}"`).join(" OR ") },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await res.json()) as {
      data?: { orders: { edges: { node: { name: string; tags: string[] } }[] } };
      errors?: { message: string }[];
    };
    if (!body.data) throw new Error(body.errors?.[0]?.message ?? `Shopify answered ${res.status}`);
    for (const { node } of body.data.orders.edges) {
      for (const t of chunk) if (node.tags.includes(txnTag(t))) found.set(t, node.name);
    }
  }
  return found;
}
