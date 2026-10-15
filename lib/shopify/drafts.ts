// Abandoned checkouts, kept as Shopify draft orders.
//
// Shopify's own "Abandoned checkouts" list only knows about Shopify Checkout,
// which this store does not use: our form and PayU take the payment, and
// Shopify only hears about an order once it is paid (see docs/payu-checkout.md).
// A customer who fills in the form and leaves was therefore invisible.
//
// So the checkout keeps a draft order per bag, from the moment an email or
// phone number is typed:
//
//   qh-checkout          every draft this file writes
//   qh-cart-<hash>       which bag it belongs to — one draft per bag
//   qh-stage-form        details typed, Pay never pressed
//   qh-stage-payment     sent to PayU, payment not completed
//   qh-contacted         staff have reached out (set from /admin/abandoned)
//   qh-recovered         paid after being contacted; kept for the numbers
//
// When the bag is paid for, its draft is deleted — or, if staff had contacted
// the customer, tagged recovered — so the list only ever shows people who did
// not buy.
//
// Nothing here may ever stand in the way of a sale. Every caller treats a
// failure as something to log, never something to show the customer.

import crypto from "node:crypto";
import type { Cart } from "@/lib/shopify/cart";
import { txnTag } from "@/lib/shopify/admin";

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";
const TIMEOUT_MS = 8_000;

export const draftsConfigured = Boolean(DOMAIN && ADMIN_TOKEN);

export const TAG_CHECKOUT = "qh-checkout";
export const TAG_CONTACTED = "qh-contacted";
export const TAG_RECOVERED = "qh-recovered";
const STAGE_PREFIX = "qh-stage-";
const CART_PREFIX = "qh-cart-";

export type CheckoutStage = "form" | "payment";

/** The Admin app token lacks the draft-order permission. */
export class DraftAccessError extends Error {}

/** Stable, non-reversible tag for a bag. The cart id itself is a secret. */
export function cartTag(cartId: string): string {
  return CART_PREFIX + crypto.createHash("sha256").update(cartId).digest("hex").slice(0, 20);
}

/* -------------------------------------------------------------------------- */
/* Admin GraphQL                                                              */
/* -------------------------------------------------------------------------- */

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!draftsConfigured) throw new Error("Shopify Admin is not configured");
  const res = await fetch(`https://${DOMAIN}/admin/api/${VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": ADMIN_TOKEN as string,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 401 || res.status === 403) {
    throw new DraftAccessError(`Shopify Admin answered ${res.status}`);
  }
  const body = (await res.json()) as {
    data?: T;
    errors?: { message: string; extensions?: { code?: string } }[];
  };
  if (body.errors?.length) {
    const first = body.errors[0];
    if (first.extensions?.code === "ACCESS_DENIED" || /access denied/i.test(first.message)) {
      throw new DraftAccessError(first.message);
    }
    throw new Error(`Shopify Admin: ${first.message}`);
  }
  if (!body.data) throw new Error(`Shopify Admin answered ${res.status} with no data`);
  return body.data;
}

interface UserError {
  field?: string[] | null;
  message: string;
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

interface FoundDraft {
  id: string;
  tags: string[];
  status: string;
  customAttributes: { key: string; value: string }[];
}

const DRAFT_FIELDS = `id tags status customAttributes { key value }`;

async function draftById(id: string): Promise<FoundDraft | null> {
  const data = await gql<{ draftOrder: FoundDraft | null }>(
    `query d($id: ID!) { draftOrder(id: $id) { ${DRAFT_FIELDS} } }`,
    { id }
  );
  return data.draftOrder;
}

/** The open draft for a bag, if one exists. */
async function draftForCart(cartId: string): Promise<FoundDraft | null> {
  const data = await gql<{ draftOrders: { edges: { node: FoundDraft }[] } }>(
    `query d($q: String!) {
      draftOrders(first: 5, sortKey: UPDATED_AT, reverse: true, query: $q) {
        edges { node { ${DRAFT_FIELDS} } }
      }
    }`,
    { q: `tag:"${cartTag(cartId)}"` }
  );
  return data.draftOrders.edges.map((e) => e.node).find((d) => d.status !== "COMPLETED") ?? null;
}

const attr = (d: FoundDraft | null, key: string): string | undefined =>
  d?.customAttributes.find((a) => a.key === key)?.value || undefined;

function addressLine(c: CheckoutContact): string {
  return [c.address1, c.address2, c.city, c.province, c.zip].filter(Boolean).join(", ");
}

/**
 * Creates or updates the draft for a bag, and returns its id.
 *
 * `hintId` is the draft this browser last saved, so quick successive saves hit
 * the same draft even before Shopify's search has indexed it.
 */
export async function saveCheckoutDraft(
  snap: CheckoutSnapshot,
  hintId?: string | null
): Promise<string> {
  let existing: FoundDraft | null = null;
  if (hintId) existing = await draftById(hintId).catch(() => null);
  if (existing && (existing.status === "COMPLETED" || !existing.tags.includes(cartTag(snap.cartId)))) {
    existing = null;
  }
  if (!existing) existing = await draftForCart(snap.cartId);

  // A later save never loses what an earlier one knew: once a bag has been
  // to PayU it stays at the payment stage, and the details carry over.
  const prevStage = existing?.tags.find((t) => t.startsWith(STAGE_PREFIX))?.slice(STAGE_PREFIX.length);
  const stage: CheckoutStage = prevStage === "payment" ? "payment" : snap.stage;
  const c = snap.contact;
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || attr(existing, "Name");
  const phone = c.phone || attr(existing, "Phone");
  const email = c.email || attr(existing, "Email");
  const address = addressLine(c) || attr(existing, "Address");
  const txnid = snap.txnid || attr(existing, "PayU txnid");
  const restore = snap.restoreToken || attr(existing, "Restore token");

  const keep = (existing?.tags ?? []).filter(
    (t) => t === TAG_CONTACTED || t === TAG_RECOVERED
  );
  const tags = [TAG_CHECKOUT, cartTag(snap.cartId), STAGE_PREFIX + stage, ...keep];

  const customAttributes = [
    ["Stage", stage === "payment" ? "Reached PayU, not paid" : "Left at the checkout form"],
    ["Name", name],
    ["Email", email],
    ["Phone", phone],
    ["Address", address],
    ["Bag total", `${snap.cart.total}`],
    ["Discount code", snap.cart.discountCode ?? undefined],
    ["PayU txnid", txnid],
    ["Restore token", restore ?? undefined],
    ["Last activity", new Date().toISOString()],
  ]
    .filter((pair): pair is [string, string] => Boolean(pair[1]))
    .map(([key, value]) => ({ key, value: value.slice(0, 500) }));

  const base: Record<string, unknown> = {
    tags,
    customAttributes,
    note:
      "Checkout started on quinthome.in but not paid. Follow up from /admin/abandoned. " +
      "Do not send Shopify's invoice: payment is taken on quinthome.in through PayU.",
    lineItems: snap.cart.lines.map((l) => ({
      variantId: l.merchandiseId,
      quantity: l.quantity,
      customAttributes: l.attributes.map((a) => ({ key: a.key, value: a.value })),
    })),
  };
  if (email) base.email = email;

  // The richer form lets staff turn the draft into an order by hand. Shopify
  // is strict about phones and provinces, so if it objects, the details stay
  // in the custom attributes above and the draft is written without them.
  const rich: Record<string, unknown> = { ...base };
  if (phone) rich.phone = phone;
  if (c.address1 && c.city) {
    rich.shippingAddress = {
      firstName: c.firstName,
      lastName: c.lastName,
      address1: c.address1,
      address2: c.address2,
      city: c.city,
      province: c.province,
      zip: c.zip,
      countryCode: "IN",
      phone,
    };
  }

  const write = async (input: Record<string, unknown>) => {
    if (existing) {
      const data = await gql<{
        draftOrderUpdate: { draftOrder: { id: string } | null; userErrors: UserError[] };
      }>(
        `mutation u($id: ID!, $input: DraftOrderInput!) {
          draftOrderUpdate(id: $id, input: $input) { draftOrder { id } userErrors { field message } }
        }`,
        { id: existing.id, input }
      );
      return data.draftOrderUpdate;
    }
    const data = await gql<{
      draftOrderCreate: { draftOrder: { id: string } | null; userErrors: UserError[] };
    }>(
      `mutation c($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) { draftOrder { id } userErrors { field message } }
      }`,
      { input }
    );
    return data.draftOrderCreate;
  };

  let result = await write(rich);
  if (result.userErrors.length && rich !== base) result = await write(base);
  if (result.userErrors.length || !result.draftOrder) {
    throw new Error(`draft order: ${result.userErrors[0]?.message ?? "not written"}`);
  }
  return result.draftOrder.id;
}

/**
 * The bag has been paid for: take its draft off the abandoned list.
 *
 * Deleted outright, unless staff had contacted the customer — then it is kept
 * and tagged recovered, so the page can show what follow-up brought back.
 */
export async function closeCheckoutDraft(cartId: string, orderName: string): Promise<void> {
  const draft = await draftForCart(cartId);
  if (!draft) return;
  if (draft.tags.includes(TAG_CONTACTED)) {
    const tags = [...new Set([...draft.tags, TAG_RECOVERED])];
    const customAttributes = [
      ...draft.customAttributes.filter((a) => a.key !== "Order"),
      { key: "Order", value: orderName },
    ];
    await gql(
      `mutation u($id: ID!, $input: DraftOrderInput!) {
        draftOrderUpdate(id: $id, input: $input) { userErrors { message } }
      }`,
      { id: draft.id, input: { tags, customAttributes } }
    );
    return;
  }
  await deleteDraft(draft.id);
}

/* -------------------------------------------------------------------------- */
/* The admin list                                                             */
/* -------------------------------------------------------------------------- */

export interface AbandonedCheckout {
  id: string;
  legacyId: string;
  name: string;
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
  txnid: string;
  restoreToken: string;
  order: string;
  items: { title: string; quantity: number }[];
  /** Set when a Shopify order already carries this draft's PayU transaction. */
  paidAs: string | null;
}

interface RawDraft {
  id: string;
  legacyResourceId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  email: string | null;
  tags: string[];
  status: string;
  customAttributes: { key: string; value: string }[];
  totalPriceSet: { shopMoney: { amount: string } };
  lineItems: { edges: { node: { title: string; quantity: number; variantTitle: string | null } }[] };
}

/** The most recent checkout drafts, newest activity first. */
export async function listCheckoutDrafts(limit = 100): Promise<AbandonedCheckout[]> {
  const data = await gql<{ draftOrders: { edges: { node: RawDraft }[] } }>(
    `query l($n: Int!, $q: String!) {
      draftOrders(first: $n, sortKey: UPDATED_AT, reverse: true, query: $q) {
        edges { node {
          id legacyResourceId name createdAt updatedAt email tags status
          customAttributes { key value }
          totalPriceSet { shopMoney { amount } }
          lineItems(first: 20) { edges { node { title quantity variantTitle } } }
        } }
      }
    }`,
    { n: limit, q: `tag:"${TAG_CHECKOUT}"` }
  );

  // Newest first, so the first draft seen for a bag is the one to keep; two
  // can exist if a save raced the Pay button.
  const seenBags = new Set<string>();
  const rows = data.draftOrders.edges
    .map((e) => e.node)
    .filter((d) => d.status !== "COMPLETED")
    .filter((d) => {
      const bag = d.tags.find((t) => t.startsWith(CART_PREFIX));
      if (!bag) return true;
      if (seenBags.has(bag)) return false;
      seenBags.add(bag);
      return true;
    })
    .map((d): AbandonedCheckout => {
      const a = (key: string) => d.customAttributes.find((x) => x.key === key)?.value ?? "";
      const bag = Number(a("Bag total"));
      return {
        id: d.id,
        legacyId: d.legacyResourceId,
        name: d.name,
        createdAt: d.createdAt,
        updatedAt: a("Last activity") || d.updatedAt,
        stage: d.tags.includes(`${STAGE_PREFIX}payment`) ? "payment" : "form",
        contacted: d.tags.includes(TAG_CONTACTED),
        recovered: d.tags.includes(TAG_RECOVERED),
        customerName: a("Name"),
        email: d.email || a("Email"),
        phone: a("Phone"),
        address: a("Address"),
        total: Number.isFinite(bag) && bag > 0 ? bag : Number(d.totalPriceSet.shopMoney.amount) || 0,
        discountCode: a("Discount code"),
        txnid: a("PayU txnid"),
        restoreToken: a("Restore token"),
        order: a("Order"),
        items: d.lineItems.edges.map(({ node }) => ({
          title: node.variantTitle && node.variantTitle !== "Default Title"
            ? `${node.title} — ${node.variantTitle}`
            : node.title,
          quantity: node.quantity,
        })),
        paidAs: null,
      };
    });

  // A payment can succeed while closing its draft fails. Ask Shopify which of
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

async function ordersForTxnids(txnids: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (let i = 0; i < txnids.length; i += 25) {
    const chunk = txnids.slice(i, i + 25);
    const data = await gql<{ orders: { edges: { node: { name: string; tags: string[] } }[] } }>(
      `query o($q: String!) { orders(first: 50, query: $q) { edges { node { name tags } } } }`,
      { q: chunk.map((t) => `tag:"${txnTag(t)}"`).join(" OR ") }
    );
    for (const { node } of data.orders.edges) {
      for (const t of chunk) if (node.tags.includes(txnTag(t))) found.set(t, node.name);
    }
  }
  return found;
}

/** Staff have reached out to this customer. */
export async function markDraftContacted(id: string): Promise<void> {
  const draft = await draftById(id);
  if (!draft || !draft.tags.includes(TAG_CHECKOUT)) throw new Error("Not a checkout draft");
  await gql(
    `mutation u($id: ID!, $input: DraftOrderInput!) {
      draftOrderUpdate(id: $id, input: $input) { userErrors { message } }
    }`,
    { id, input: { tags: [...new Set([...draft.tags, TAG_CONTACTED])] } }
  );
}

/** Removes a draft for good. Only ever one this checkout wrote. */
export async function deleteDraft(id: string): Promise<void> {
  const draft = await draftById(id);
  if (!draft) return;
  if (!draft.tags.includes(TAG_CHECKOUT)) throw new Error("Not a checkout draft");
  const data = await gql<{ draftOrderDelete: { userErrors: UserError[] } }>(
    `mutation d($input: DraftOrderDeleteInput!) {
      draftOrderDelete(input: $input) { deletedId userErrors { message } }
    }`,
    { input: { id } }
  );
  if (data.draftOrderDelete.userErrors.length) {
    throw new Error(data.draftOrderDelete.userErrors[0].message);
  }
}
