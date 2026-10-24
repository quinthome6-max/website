// The order awaiting payment, kept on the Shopify cart.
//
// It used to live in a thirty-minute browser cookie, and then the order could
// only be written by that same browser coming back in time. A customer who
// paid by UPI and never returned to the tab, or returned in a different
// browser, left a captured payment with nothing to attach it to.
//
// The cart is already server-side and already holds the lines, so the rest of
// the order goes there too:
//
//   attributes  the delivery details, and the transaction they were given for
//   note        where settlement has got to: nothing, in progress, or done
//
// With the cart id carried inside the payment (see encodeCartRef), any process
// that hears a payment succeeded can rebuild the whole order — no cookie, and
// no browser, required.

import crypto from "node:crypto";
import {
  cartAttributesSet,
  cartGetRecord,
  cartNoteSet,
  type CartRecord,
} from "@/lib/shopify/cart";
import type { OrderCustomer } from "@/lib/shopify/admin";

const CUSTOMER_KEY = "_qh_customer";
const TXNID_KEY = "_qh_txnid";
const CLARITY_KEY = "_qh_clarity";

export interface PendingOrder {
  txnid: string;
  customer: OrderCustomer;
  /** The buyer's Clarity recording, "visitor.session" or "none" (clarity-ref). */
  clarity?: string;
}

/** Records who the bag is for, immediately before the payment page. */
export async function writePendingOrder(
  cartId: string,
  pending: PendingOrder
): Promise<void> {
  await cartAttributesSet(cartId, {
    [TXNID_KEY]: pending.txnid,
    [CUSTOMER_KEY]: JSON.stringify(pending.customer),
    ...(pending.clarity ? { [CLARITY_KEY]: pending.clarity } : {}),
  });
}

/** The delivery details on a cart, or null if none were ever recorded. */
export function readPendingOrder(
  attributes: Record<string, string>
): PendingOrder | null {
  const raw = attributes[CUSTOMER_KEY];
  if (!raw) return null;
  try {
    const customer = JSON.parse(raw) as OrderCustomer;
    if (!customer || typeof customer.firstName !== "string") return null;
    return {
      txnid: attributes[TXNID_KEY] ?? "",
      customer,
      ...(attributes[CLARITY_KEY] ? { clarity: attributes[CLARITY_KEY] } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Where settlement stands for a cart.
 *
 *   none  no payment has been settled against it
 *   lock  a process is writing its order right now
 *   done  an order has been written; the cart is spent
 */
export type SettleState =
  | { kind: "none" }
  | { kind: "lock"; txnid: string; owner: string; at: number }
  | { kind: "done"; txnid: string; order: string; at: number };

/** A lock older than this belongs to a process that died holding it. */
const LOCK_TTL_MS = 45_000;

/**
 * How long to wait before checking the lock is still ours.
 *
 * The note is a plain value — last write wins, there is no compare-and-set —
 * so two processes can each write a lock within the same instant. Waiting
 * before reading it back lets the later write land: whoever still sees their
 * own name owns it, and the other stands down.
 */
const LOCK_CONFIRM_MS = 900;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function readSettleState(note: string): SettleState {
  if (!note.startsWith('{"qh":')) return { kind: "none" };
  try {
    const v = JSON.parse(note) as {
      qh?: string;
      txnid?: string;
      owner?: string;
      order?: string;
      at?: number;
    };
    const at = Number(v.at) || 0;
    if (v.qh === "lock" && v.txnid && v.owner) {
      return { kind: "lock", txnid: v.txnid, owner: v.owner, at };
    }
    if (v.qh === "done" && v.txnid) {
      return { kind: "done", txnid: v.txnid, order: v.order ?? "", at };
    }
  } catch {
    /* not ours */
  }
  return { kind: "none" };
}

const encode = (state: Record<string, string | number>): string =>
  JSON.stringify(state);

/** True while another process may still be writing the order. */
export function lockIsLive(state: SettleState): boolean {
  return state.kind === "lock" && Date.now() - state.at < LOCK_TTL_MS;
}

/**
 * Claims the cart for one settlement.
 *
 * PayU reports a success twice — once through the customer's browser and once
 * server-to-server — and for a card payment the two arrive together. Without a
 * claim, both would look for an existing order, both find none, and both write
 * one. Returns the cart as read once the claim held, or null if another
 * process got there first.
 */
export async function claimCart(
  cartId: string,
  txnid: string
): Promise<CartRecord | null> {
  const owner = crypto.randomBytes(6).toString("hex");
  await cartNoteSet(
    cartId,
    encode({ qh: "lock", txnid, owner, at: Date.now() })
  );
  await sleep(LOCK_CONFIRM_MS);

  const record = await cartGetRecord(cartId);
  if (!record) return null;
  const state = readSettleState(record.note);
  return state.kind === "lock" && state.owner === owner ? record : null;
}

/** Marks the cart spent, naming the order it became. */
export async function markCartSettled(
  cartId: string,
  txnid: string,
  order: string
): Promise<void> {
  await cartNoteSet(
    cartId,
    encode({ qh: "done", txnid, order, at: Date.now() })
  );
}

/** Lets go of a claim that produced nothing, so a retry need not wait it out. */
export async function releaseCart(cartId: string): Promise<void> {
  await cartNoteSet(cartId, "");
}

/**
 * Clears a finished settlement when the same cart is being paid for again.
 *
 * A customer whose order was written without their browser still holds the
 * cart cookie. If they come back, refill that bag and pay, the old "done"
 * marker would make the new payment look like a second charge for the first
 * order. A live lock is left alone — something is mid-write.
 */
export async function reopenCart(cartId: string, note: string): Promise<void> {
  const state = readSettleState(note);
  if (state.kind === "none" && !note) return;
  if (lockIsLive(state)) return;
  await cartNoteSet(cartId, "");
}
