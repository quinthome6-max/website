// Shopify Admin API (server-side only).
//
// Used after PayU confirms a payment: the order is written into Shopify already
// marked as paid, so Shopify stays the source of truth for orders, inventory,
// customers and fulfilment — without the payment passing through Shopify
// Checkout (which is what attracts the third-party transaction fee).
//
// Requires a custom app token with `write_orders` (and `write_inventory` if you
// want stock decremented).
//
// Everything here runs after the money has been taken, which sets the rule for
// the whole file: a captured payment always ends up as an order in Shopify.
// If Shopify will not take the order as the customer placed it, it is written
// with less; if it will not take that either, a plainly-labelled placeholder
// goes in its place for a person to finish. What never happens is nothing.

import { clarityRecordingNote } from "@/lib/analytics/clarity-ref";
import { orderEmailsReady } from "@/lib/email/ready";
import { txnStartedAt } from "@/lib/payu/client";

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";

/** True once an Admin API token is present. */
export const shopifyAdminConfigured = Boolean(DOMAIN && ADMIN_TOKEN);

/** Storefront ids are GIDs ("gid://shopify/ProductVariant/123"); Admin wants 123. */
export function numericId(gid: string): number | null {
  const m = /(\d+)\s*$/.exec(gid);
  return m ? Number(m[1]) : null;
}

export interface OrderLine {
  merchandiseId: string; // Storefront GID
  quantity: number;
  /** Buyer choices, e.g. the included oil — recorded on the order line. */
  attributes?: { key: string; value: string }[];
  /** Shipping weight per unit, in grams, from the Shopify variant. */
  weightGrams?: number;
}

export interface OrderCustomer {
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
}

export interface CreateOrderInput {
  lines: OrderLine[];
  customer: OrderCustomer;
  /** Amount actually captured, in rupees. */
  amountPaid: number;
  /** Shipping charged, in rupees. */
  shipping?: number;
  /**
   * What a discount took off the goods, in rupees, and the code if there was
   * one. Without it Shopify totals the lines at full price and the order reads
   * as costing more than was paid.
   */
  discount?: { amount: number; code: string | null };
  /** The buyer's Clarity recording ("visitor.session" or "none"), if known. */
  clarity?: string;
  /** PayU transaction id (ours) and PayU's own id, for reconciliation. */
  txnid: string;
  mihpayid?: string;
  paymentMode?: string;
}

export interface CreatedOrder {
  id: number;
  name: string; // e.g. "#1001"
  /** Written with Shopify's receipt off, so the store's own email must go. */
  ownEmail: boolean;
  /**
   * Anything about the order that is not as the customer placed it, in plain
   * sentences. Empty for a clean order; the same text is in the order's note.
   */
  attention: string[];
}

/** Marks every order written by this checkout. */
const PAYU_TAG = "PayU";
/** Marks an order someone has to look at before it is dispatched. */
export const ATTENTION_TAG = "PayU-needs-attention";
/** Marks the second and later orders written for a single payment. */
export const DUPLICATE_TAG = "PayU-duplicate";

/**
 * Thrown when the order itself is the problem: Shopify considered it and said
 * no, in every form it was offered.
 *
 * Kept distinct from Shopify simply being unreachable, because the two call
 * for opposite responses. An outage is waited out — the bag is left as it is
 * and the next attempt writes the proper order. A refusal will be a refusal
 * tomorrow as well, so the payment is recorded as a placeholder instead.
 */
export class OrderRefusedError extends Error {}

/** The tag that ties an order to one PayU transaction. */
export const txnTag = (txnid: string): string => `txn-${txnid}`;

/**
 * Long enough for Shopify to write an order, short enough that a hung call
 * does not hold the customer on a blank page. A call cut off here may still
 * have gone through, which is why postOrder looks before it tries again.
 */
const TIMEOUT_MS = 10_000;
/** How long postOrder keeps trying before reporting Shopify unreachable. */
const POST_BUDGET_MS = 25_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface AdminResponse {
  status: number;
  ok: boolean;
  body: string;
  /** The Link header, which carries the next page of a listing. */
  link: string | null;
  retryAfter: number;
}

/** One Admin API call. Throws only when Shopify could not be reached at all. */
async function admin(
  pathOrUrl: string,
  init?: { method: "POST" | "PUT"; body: unknown }
): Promise<AdminResponse> {
  const url = pathOrUrl.startsWith("https://")
    ? pathOrUrl
    : `https://${DOMAIN}/admin/api/${VERSION}/${pathOrUrl}`;
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": ADMIN_TOKEN as string,
    },
    body: init ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return {
    status: res.status,
    ok: res.ok,
    body: await res.text(),
    link: res.headers.get("link"),
    retryAfter: Number(res.headers.get("retry-after")) || 0,
  };
}

const rupees = (n: number): string =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** First line of every order note. lib/admin/orders.ts reads the mode from it. */
function paymentLine(input: {
  txnid: string;
  mihpayid?: string;
  paymentMode?: string;
}): string {
  return `Paid via PayU · txnid ${input.txnid}${
    input.mihpayid ? ` · mihpayid ${input.mihpayid}` : ""
  }${input.paymentMode ? ` · mode ${input.paymentMode}` : ""}`;
}

/* -------------------------------------------------------------------------- */
/* Finding the order a payment already has                                    */
/* -------------------------------------------------------------------------- */

export interface ExistingOrder {
  id: number;
  name: string;
  total: number;
  cancelled: boolean;
  tags: string[];
  /** "variantId:quantity:price" per line, as the confirmation page wants it. */
  items: string;
}

interface ListedOrder {
  id: number;
  name: string;
  note?: string | null;
  tags?: string | null;
  total_price?: string | null;
  cancelled_at?: string | null;
  line_items?:
    | { variant_id?: number | null; quantity: number; price: string }[]
    | null;
}

const MAX_PAGES = 6;

/** `<https://…page_info=…>; rel="next"` → the URL, or null on the last page. */
function nextPage(link: string | null): string | null {
  if (!link) return null;
  for (const part of link.split(",")) {
    const m = /<([^>]+)>\s*;\s*rel="next"/.exec(part);
    if (m) return m[1];
  }
  return null;
}

/**
 * Every order written for one PayU transaction, oldest first.
 *
 * This is what makes settlement safe to repeat. A success is reported more
 * than once — the browser's return, PayU's server-to-server notice, a customer
 * refreshing the page, a retry after a timeout — and each of them asks here
 * first. Orders are matched on the transaction tag, and on the note as well so
 * that orders written before the tag existed are still found.
 *
 * Read from the orders list rather than Shopify's search, because search lags
 * a few seconds behind a write and those few seconds are exactly when a
 * duplicate would be made. Cancelled orders count: a payment whose order was
 * cancelled by hand must not quietly grow a new one.
 */
export async function findOrdersByTxnid(txnid: string): Promise<ExistingOrder[]> {
  if (!shopifyAdminConfigured) {
    throw new Error("Shopify Admin API is not configured.");
  }

  // Only orders placed since the payment was started can belong to it.
  const started = txnStartedAt(txnid);
  const since = new Date(
    started ? started.getTime() - 10 * 60_000 : Date.now() - 7 * 86_400_000
  );

  const tag = txnTag(txnid);
  const inNote = new RegExp(`\\btxnid ${txnid}\\b`);
  const found: ExistingOrder[] = [];

  let url: string | null =
    `orders.json?status=any&limit=250` +
    `&created_at_min=${encodeURIComponent(since.toISOString())}` +
    `&fields=id,name,note,tags,total_price,cancelled_at,line_items`;

  for (let page = 0; url && page < MAX_PAGES; page++) {
    const res: AdminResponse = await admin(url);
    if (!res.ok) {
      throw new Error(`Shopify Admin orders.json ${res.status}: ${res.body.slice(0, 300)}`);
    }
    const { orders } = JSON.parse(res.body) as { orders?: ListedOrder[] };
    for (const o of orders ?? []) {
      const tags = (o.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
      if (!tags.includes(tag) && !inNote.test(o.note ?? "")) continue;
      found.push({
        id: o.id,
        name: o.name,
        total: Number(o.total_price) || 0,
        cancelled: Boolean(o.cancelled_at),
        tags,
        items: (o.line_items ?? [])
          .filter((l) => l.variant_id)
          .map((l) => `${l.variant_id}:${l.quantity}:${Math.round(Number(l.price))}`)
          .join(","),
      });
    }
    url = nextPage(res.link);
  }

  return found.sort((a, b) => a.id - b.id);
}

/** The order a transaction already has, or null. Never throws. */
async function existingOrder(txnid: string): Promise<ExistingOrder | null> {
  try {
    return (await findOrdersByTxnid(txnid))[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Flags the extra orders if one payment has ended up with more than one.
 *
 * The claim on the cart makes this rare, not impossible. Nothing is cancelled
 * automatically — stock has moved and a receipt has gone out, and undoing that
 * is a person's call — but the duplicate is tagged so it cannot be shipped
 * unnoticed. Returns how many were flagged.
 */
export async function flagDuplicateOrders(txnid: string): Promise<number> {
  const live = (await findOrdersByTxnid(txnid)).filter((o) => !o.cancelled);
  if (live.length < 2) return 0;

  console.error("[payu] ONE PAYMENT, SEVERAL ORDERS — cancel all but the first", {
    txnid,
    orders: live.map((o) => o.name),
  });

  for (const extra of live.slice(1)) {
    if (extra.tags.includes(DUPLICATE_TAG)) continue;
    await admin(`orders/${extra.id}.json`, {
      method: "PUT",
      body: {
        order: { id: extra.id, tags: [...extra.tags, DUPLICATE_TAG].join(", ") },
      },
    });
  }
  return live.length - 1;
}

/**
 * Adds tags to an order, keeping the ones it has. Used to mark whether our
 * order email went out, so the order list shows who still needs one.
 */
export async function addOrderTags(
  orderId: number,
  existing: string[],
  add: string[],
  remove: string[] = []
): Promise<void> {
  const tags = [...new Set([...existing.filter((t) => !remove.includes(t)), ...add])];
  const res = await admin(`orders/${orderId}.json`, {
    method: "PUT",
    body: { order: { id: orderId, tags: tags.join(", ") } },
  });
  if (!res.ok) throw new Error(`Shopify orders/${orderId} tags ${res.status}`);
}

/* -------------------------------------------------------------------------- */
/* Writing the order                                                          */
/* -------------------------------------------------------------------------- */

type PostResult =
  | { ok: true; order: { id: number; name: string } }
  | { ok: false; status: number; body: string };

/**
 * Posts an order, riding out the failures that are Shopify's and not the
 * order's: a dropped connection, a 5xx, a rate limit.
 *
 * A request that timed out may still have been carried out, so before trying
 * again it checks whether the order now exists. Retrying blind is how one
 * payment becomes two orders.
 */
async function postOrder(
  order: Record<string, unknown>,
  txnid: string
): Promise<PostResult> {
  let last = { status: 0, body: "Shopify Admin did not respond." };
  const giveUpAt = Date.now() + POST_BUDGET_MS;

  for (let attempt = 0; attempt < 3 && Date.now() < giveUpAt; attempt++) {
    let res: AdminResponse | null = null;
    try {
      res = await admin("orders.json", { method: "POST", body: { order } });
    } catch (e) {
      last = { status: 0, body: e instanceof Error ? e.message : String(e) };
    }

    if (res?.ok) {
      const json = JSON.parse(res.body) as { order?: { id: number; name: string } };
      if (json.order?.id) return { ok: true, order: json.order };
      last = { status: res.status, body: `No order in the response: ${res.body.slice(0, 300)}` };
    } else if (res && res.status !== 429 && res.status < 500) {
      // Shopify read the order and said no. Asking again will not change that.
      return { ok: false, status: res.status, body: res.body };
    } else if (res) {
      last = { status: res.status, body: res.body };
    }

    await sleep(Math.min(3000, Math.max(700 * (attempt + 1), (res?.retryAfter ?? 0) * 1000)));
    const already = await existingOrder(txnid);
    if (already) return { ok: true, order: { id: already.id, name: already.name } };
  }

  return { ok: false, ...last };
}

/** Which parts of the order are being sent. Each can be dropped if refused. */
interface Shape {
  /** Shopify's receipt is suppressed because ours will be sent. */
  ownEmail: boolean;
  /** A customer record, linking the order to the buyer's history. */
  customer: boolean;
  /** The phone on that record and on the order itself. */
  customerPhone: boolean;
  /** The phone on the delivery address. */
  addressPhone: boolean;
  email: boolean;
  discount: boolean;
  /** Refuse the order rather than oversell. */
  obeyStock: boolean;
}

function buildOrder(
  input: CreateOrderInput,
  shape: Shape,
  attention: string[]
): Record<string, unknown> {
  const line_items = input.lines
    // A line at quantity zero is a sold-out variant Shopify left in the cart;
    // sending it gets the whole order refused.
    .filter((l) => l.quantity > 0)
    .map((l) => ({
      variant_id: numericId(l.merchandiseId),
      quantity: l.quantity,
      // Shopify shows these as line-item properties on the order.
      properties: (l.attributes ?? []).map((a) => ({ name: a.key, value: a.value })),
      // Carried explicitly rather than left to Shopify: orders created through
      // the API do not get an order-level weight the way checkout orders do,
      // and a courier reading zero grams either refuses the shipment or bills
      // against the wrong slab.
      ...(l.weightGrams ? { grams: l.weightGrams } : {}),
    }))
    .filter(
      (l): l is {
        variant_id: number;
        quantity: number;
        properties: { name: string; value: string }[];
        grams?: number;
      } => l.variant_id !== null
    );

  if (line_items.length === 0) {
    throw new OrderRefusedError("The bag has no lines that can be put on an order.");
  }

  // Sum of the parcel, for the same reason.
  const total_weight = input.lines.reduce(
    (g, l) => g + (l.weightGrams ?? 0) * l.quantity,
    0
  );

  const c = input.customer;
  const address = {
    first_name: c.firstName,
    last_name: c.lastName ?? "",
    address1: c.address1 ?? "",
    address2: c.address2 ?? "",
    city: c.city ?? "",
    province: c.province ?? "",
    zip: c.zip ?? "",
    country: c.country ?? "India",
    ...(shape.addressPhone && c.phone ? { phone: c.phone } : {}),
  };

  const email = shape.email && c.email ? c.email : null;
  const phone = shape.customerPhone && c.phone ? c.phone : null;
  const discount =
    shape.discount && input.discount && input.discount.amount > 0
      ? input.discount
      : null;

  const order: Record<string, unknown> = {
    line_items,
    ...(total_weight > 0 ? { total_weight } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(shape.customer
      ? {
          customer: {
            first_name: c.firstName,
            last_name: c.lastName ?? "",
            ...(email ? { email } : {}),
            ...(phone ? { phone } : {}),
          },
        }
      : {}),
    billing_address: address,
    shipping_address: address,
    financial_status: "paid",
    currency: "INR",
    // Records the money as captured against a manual "PayU" gateway.
    transactions: [
      {
        kind: "sale",
        status: "success",
        amount: input.amountPaid.toFixed(2),
        gateway: "PayU",
      },
    ],
    // Without this Shopify does not touch stock levels for API-created orders.
    inventory_behaviour: shape.obeyStock
      ? "decrement_obeying_policy"
      : "decrement_ignoring_policy",
    // Shopify's receipt, unless the store's own confirmation (with the
    // invoice attached) is switched on and proven able to send right now.
    send_receipt: Boolean(email) && !shape.ownEmail,
    send_fulfillment_receipt: false,
    tags: [PAYU_TAG, txnTag(input.txnid), ...(attention.length ? [ATTENTION_TAG] : [])].join(", "),
    note: [paymentLine(input), ...attention.map((a) => `NEEDS ATTENTION — ${a}`)]
      .join("\n")
      .slice(0, 4900),
    // Staff-only "Additional details" on the order: the buyer's recording.
    ...(input.clarity
      ? { note_attributes: [{ name: "Clarity recording", value: clarityRecordingNote(input.clarity) }] }
      : {}),
  };

  if (discount) {
    order.discount_codes = [
      {
        code: discount.code || "DISCOUNT",
        amount: discount.amount.toFixed(2),
        type: "fixed_amount",
      },
    ];
  }

  if (input.shipping && input.shipping > 0) {
    order.shipping_lines = [
      { title: "Shipping", price: input.shipping.toFixed(2), code: "Standard" },
    ];
  }

  return order;
}

/** Shopify's refusal as one line of text, whatever shape it came in. */
function refusalText(body: string): string {
  try {
    const { errors } = JSON.parse(body) as { errors?: unknown };
    if (typeof errors === "string") return errors;
    if (errors) return JSON.stringify(errors);
  } catch {
    /* not JSON */
  }
  return body.slice(0, 300);
}

/**
 * Decides what to send without, given what Shopify objected to.
 *
 * The payment is already in. An order missing its customer record can be put
 * right in a minute; an order that was never written is a customer who paid
 * and heard nothing. So each refusal costs the order one optional part — the
 * part Shopify named if it named one, otherwise the likeliest — and it is sent
 * again. Returns what was given up, for the note, or nothing when there is
 * nothing left to give.
 */
function giveGround(
  shape: Shape,
  refusal: string,
  input: CreateOrderInput
): string[] {
  const text = refusal.toLowerCase();
  const c = input.customer;
  const gave: string[] = [];

  if (/phone/.test(text)) {
    if (shape.customerPhone) {
      shape.customerPhone = false;
      gave.push(
        `Shopify would not put ${c.phone} on the customer record (${refusal}) — ` +
          `usually because another customer already has that number. It is on the delivery address.`
      );
    } else if (shape.addressPhone) {
      shape.addressPhone = false;
      gave.push(`Shopify refused the phone number altogether. The customer gave: ${c.phone}.`);
    }
  }

  if (/e-?mail/.test(text) && shape.email) {
    shape.email = false;
    shape.customer = false;
    gave.push(
      `Shopify refused the email address "${c.email}" (${refusal}). ` +
        `The order has no customer record and no receipt was sent — contact them on ${c.phone ?? "the phone number given"}.`
    );
  }

  if (/inventory|stock|reserve|sold out|unavailable/.test(text) && shape.obeyStock) {
    shape.obeyStock = false;
    gave.push(
      `An item sold out between the bag and the payment (${refusal}). ` +
        `The order was written anyway and stock has gone negative — check what can be sent before dispatch.`
    );
  }

  if (/discount/.test(text) && shape.discount) {
    shape.discount = false;
    gave.push(discountLost(input, refusal));
  }

  if (gave.length > 0) return gave;

  // Shopify did not say what it disliked, or said something unfamiliar. The
  // details about the person are the usual cause, so those go first; the
  // money and stock settings go only if that was not enough.
  if (shape.customer || shape.customerPhone || shape.addressPhone || shape.email) {
    shape.customer = shape.customerPhone = shape.addressPhone = shape.email = false;
    gave.push(
      `Shopify refused the order as placed (${refusal}), so it was written without a customer record ` +
        `and no receipt was sent. Customer: ${[c.firstName, c.lastName].filter(Boolean).join(" ")} · ` +
        `${c.email || "no email"} · ${c.phone ?? "no phone"}.`
    );
    return gave;
  }

  if (shape.discount || shape.obeyStock) {
    if (shape.discount && input.discount && input.discount.amount > 0) {
      gave.push(discountLost(input, refusal));
    }
    if (shape.obeyStock) {
      gave.push(`Stock limits were ignored to get the order in (${refusal}) — check availability before dispatch.`);
    }
    shape.discount = shape.obeyStock = false;
  }
  return gave;
}

function discountLost(input: CreateOrderInput, refusal: string): string {
  const d = input.discount;
  return (
    `The discount${d?.code ? ` ${d.code}` : ""} of ${rupees(d?.amount ?? 0)} could not be recorded (${refusal}). ` +
    `The order total shows full price; the customer paid ${rupees(input.amountPaid)}, which is correct.`
  );
}

/**
 * Creates a paid order in Shopify.
 *
 * Tries the order exactly as placed, and on each refusal gives up one optional
 * part and tries again (see giveGround). Whatever was given up is written into
 * the order's note and returned in `attention`, and the order is tagged so it
 * stands out in the list.
 *
 * Throws OrderRefusedError if Shopify refuses even the barest form — the
 * caller should then record the payment with createAttentionOrder — and a
 * plain Error if Shopify could not be reached or rejected the token, in which
 * case nothing was written and the same call is worth making again later.
 */
export async function createPaidOrder(
  input: CreateOrderInput
): Promise<CreatedOrder> {
  if (!shopifyAdminConfigured) {
    throw new Error(
      "Shopify Admin API is not configured (missing SHOPIFY_ADMIN_TOKEN)."
    );
  }

  // Decided once, before the first attempt: either Shopify's receipt goes
  // or ours will, never neither. A failed check leaves Shopify's on.
  const ownEmail = await orderEmailsReady().catch(() => false);
  const shape: Shape = {
    customer: true,
    customerPhone: true,
    addressPhone: true,
    email: true,
    discount: true,
    obeyStock: true,
    ownEmail,
  };
  const attention: string[] = [];
  let refusal = "";

  // One attempt as placed, plus one for each part that can be given up.
  for (let attempt = 0; attempt < 7; attempt++) {
    const result = await postOrder(buildOrder(input, shape, attention), input.txnid);
    if (result.ok) return { ...result.order, attention, ownEmail };

    // Not a verdict on the order: Shopify is down, or the token is wrong.
    // Sending less would not help, and would only strip a good order.
    if (
      result.status === 0 ||
      result.status === 401 ||
      result.status === 403 ||
      result.status === 404 ||
      result.status === 429 ||
      result.status >= 500
    ) {
      throw new Error(
        `Shopify Admin orders.json ${result.status}: ${result.body.slice(0, 500)}`
      );
    }

    refusal = refusalText(result.body);
    const gave = giveGround(shape, refusal, input);
    if (gave.length === 0) break;
    console.error("[shopify] order refused, retrying with less", {
      txnid: input.txnid,
      refusal,
      gave,
    });
    attention.push(...gave);
  }

  throw new OrderRefusedError(`Shopify refused the order: ${refusal}`);
}

export interface AttentionOrderInput {
  txnid: string;
  mihpayid?: string;
  paymentMode?: string;
  /** Amount actually captured, in rupees. */
  amountPaid: number;
  /** One sentence: why this could not be written as a normal order. */
  reason: string;
  /** Whatever is known about the buyer. Any of it may be missing. */
  customer?: Partial<OrderCustomer> | null;
  /** The bag as it stood, one item per entry, for whoever picks this up. */
  bag?: string[];
}

/**
 * Writes a placeholder order for a payment that could not become a real one.
 *
 * The bag was gone, or had changed, or Shopify refused every form of the
 * order — but the money is in, and the worst outcome is a payment nobody at
 * the store knows about. So it is recorded where orders are looked for: one
 * custom line for the amount received, tagged for attention, with everything
 * known written into the note.
 *
 * A custom line touches no variant and no stock, and no receipt is sent, so
 * there is very little here for Shopify to object to. If it objects to the
 * address or the email anyway, the order goes in without them; they are in
 * the note regardless.
 */
export async function createAttentionOrder(
  input: AttentionOrderInput
): Promise<CreatedOrder> {
  if (!shopifyAdminConfigured) {
    throw new Error("Shopify Admin API is not configured.");
  }

  const c = input.customer ?? {};
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  const street = [c.address1, c.address2].filter(Boolean).join(", ");
  const place = [c.city, c.province, c.zip].filter(Boolean).join(", ");

  const note = [
    paymentLine(input),
    `NEEDS ATTENTION — ${input.reason}`,
    `Amount received: ${rupees(input.amountPaid)}`,
    name || c.email || c.phone
      ? `Customer: ${[name, c.email, c.phone].filter(Boolean).join(" · ")}`
      : "Customer: not recorded here — see this transaction in the PayU dashboard.",
    street || place ? `Deliver to: ${[street, place].filter(Boolean).join(", ")}` : null,
    input.bag?.length ? `Bag:\n${input.bag.map((b) => `  ${b}`).join("\n")}` : null,
    "This is a placeholder, not the customer's order. Create the real order by hand " +
      "(or refund the payment in PayU), then cancel this one.",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 4900);

  const base: Record<string, unknown> = {
    line_items: [
      {
        title: "PayU payment to review",
        price: input.amountPaid.toFixed(2),
        quantity: 1,
        requires_shipping: false,
        taxable: false,
      },
    ],
    financial_status: "paid",
    currency: "INR",
    transactions: [
      {
        kind: "sale",
        status: "success",
        amount: input.amountPaid.toFixed(2),
        gateway: "PayU",
      },
    ],
    inventory_behaviour: "bypass",
    send_receipt: false,
    send_fulfillment_receipt: false,
    tags: [PAYU_TAG, txnTag(input.txnid), ATTENTION_TAG].join(", "),
    note,
  };

  const address =
    c.firstName && (street || place)
      ? {
          first_name: c.firstName,
          last_name: c.lastName ?? "",
          address1: c.address1 ?? "",
          address2: c.address2 ?? "",
          city: c.city ?? "",
          province: c.province ?? "",
          zip: c.zip ?? "",
          country: c.country ?? "India",
        }
      : null;

  const withDetails: Record<string, unknown> = {
    ...base,
    ...(c.email ? { email: c.email } : {}),
    ...(address ? { shipping_address: address, billing_address: address } : {}),
  };

  let result = await postOrder(withDetails, input.txnid);
  if (!result.ok && result.status >= 400 && result.status < 500 && result.status !== 429) {
    result = await postOrder(base, input.txnid);
  }
  if (!result.ok) {
    throw new Error(
      `Shopify Admin orders.json ${result.status}: ${result.body.slice(0, 500)}`
    );
  }
  // A placeholder is not the customer's order: no receipt from either side.
  return { ...result.order, attention: [input.reason], ownEmail: false };
}

/**
 * Adds a newsletter subscriber as a Shopify customer with marketing consent, so
 * the list lives with everything else rather than in a separate tool.
 *
 * Returns "subscribed" for a new signup and "already" when Shopify reports the
 * address is taken — from the visitor's side both are a success.
 */
export async function subscribeToNewsletter(
  email: string
): Promise<"subscribed" | "already"> {
  if (!shopifyAdminConfigured) {
    throw new Error("Shopify Admin API is not configured.");
  }

  const res = await fetch(
    `https://${DOMAIN}/admin/api/${VERSION}/customers.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": ADMIN_TOKEN as string,
      },
      body: JSON.stringify({
        customer: {
          email,
          tags: "newsletter",
          email_marketing_consent: {
            state: "subscribed",
            opt_in_level: "single_opt_in",
            consent_updated_at: new Date().toISOString(),
          },
        },
      }),
      cache: "no-store",
    }
  );

  const body = await res.text();
  if (res.ok) return "subscribed";

  // Shopify answers 422 when the address already belongs to a customer.
  if (res.status === 422 && /already been taken/i.test(body)) return "already";

  throw new Error(`Shopify customers.json ${res.status}: ${body.slice(0, 300)}`);
}
