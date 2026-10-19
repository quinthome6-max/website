import { splitInclusive, isInterState, totalSplits, type TaxSplit } from "./gst";
import { classifyBySku, DIFFUSER_HSN, OIL_HSN, type HsnClass } from "./hsn";
import { getCommerceMap, shopifyHandle } from "@/lib/shopify/commerce";
import { giftDisplayTitle } from "@/lib/cart-gift";
import { oils } from "@/lib/data/oils";

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";

/**
 * Reads paid orders back out of Shopify and turns them into invoice data.
 *
 * Shopify is the source of truth: the orders were written there by the PayU
 * callback, so an invoice is a rendering of what the store already holds rather
 * than a second ledger that could drift from it.
 *
 * Note the orders carry no tax_lines — createPaidOrder does not send any — so
 * every figure here is derived from the GST-inclusive price actually charged.
 * That is also why the invoices GST Pro produces reconcile with these.
 */

export interface InvoiceLine {
  title: string;
  variantTitle: string | null;
  sku: string | null;
  hsn: string;
  quantity: number;
  /** GST-inclusive unit price actually charged. */
  unitPrice: number;
  /**
   * What the item sells for when it is not being given away. Shown so a
   * complimentary bottle reads as a ₹899 product the customer was given,
   * rather than an oddity priced at nothing.
   */
  listPrice: number;
  /** Reduction from listPrice, inclusive of tax. Equals the whole list price
   *  on a gift line; on a paid line, its share of any discount code. */
  discount: number;
  /** The part of `discount` that came from a discount code (0 on a gift). */
  codeDiscount: number;
  tax: TaxSplit;
  /** Set when the line could not be classified and needs a human. */
  unclassified: boolean;
}

export interface InvoiceCustomer {
  name: string;
  addressLines: string[];
  city: string;
  province: string;
  provinceCode: string | null;
  zip: string;
  country: string;
  phone: string | null;
  email: string | null;
  /** Buyer's GSTIN when they gave one — makes the sale B2B for GSTR-1. */
  gstin: string | null;
}

export interface Invoice {
  /** Shopify's id for the order, for writing back to it (e.g. tags). */
  orderId: number;
  /** Tags already on the order. */
  tags: string[];
  orderName: string;
  orderNumber: number;
  invoiceNumber: string;
  createdAt: string;
  paymentMode: string;
  currency: string;
  customer: InvoiceCustomer;
  billTo: InvoiceCustomer;
  lines: InvoiceLine[];
  shipping: TaxSplit | null;
  totals: ReturnType<typeof totalSplits>;
  placeOfSupply: string;
  placeOfSupplyCode: string | null;
  interState: boolean;
  /** Lines we could not classify — the invoice must not be issued as-is. */
  needsAttention: string[];
  /** Total given away, inclusive of tax. */
  discountTotal: number;
  /** What Shopify recorded as charged for the order, after any discount code. */
  totalPaid: number;
  /** Value given away as complimentary bottles. */
  giftDiscount: number;
  /** Taken off by discount codes, across the items and shipping. */
  codeDiscount: number;
  /** The codes used, as entered. */
  discountCodes: string[];
}

interface RawAddress {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  province_code?: string | null;
  zip?: string | null;
  country?: string | null;
  phone?: string | null;
  company?: string | null;
}

interface RawOrder {
  id: number;
  name: string;
  tags?: string;
  order_number: number;
  created_at: string;
  currency: string;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
  note_attributes?: { name: string; value: string }[] | null;
  total_price: string;
  shipping_address?: RawAddress | null;
  billing_address?: RawAddress | null;
  shipping_lines?:
    | {
        title: string;
        price: string;
        /** After any discount code that applies to shipping. */
        discounted_price?: string | null;
      }[]
    | null;
  discount_codes?: { code: string; amount: string }[] | null;
  line_items: {
    title: string;
    variant_title?: string | null;
    sku?: string | null;
    quantity: number;
    price: string;
    properties?: { name: string; value: string }[] | null;
    /** Shopify's share-out of order discounts (codes) onto this line. */
    discount_allocations?: { amount: string }[] | null;
  }[];
}

export const adminConfigured = Boolean(DOMAIN && ADMIN_TOKEN);

async function adminGet<T>(path: string): Promise<T> {
  if (!adminConfigured) {
    throw new Error("Shopify Admin API is not configured (missing SHOPIFY_ADMIN_TOKEN).");
  }
  const res = await fetch(`https://${DOMAIN}/admin/api/${VERSION}/${path}`, {
    headers: { "X-Shopify-Access-Token": ADMIN_TOKEN as string },
    cache: "no-store",
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Shopify Admin ${path} ${res.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body) as T;
}

/** Shopify spells the buyer's GSTIN differently depending on how it was
 *  collected, so accept the usual variants rather than one exact key. */
function findGstin(order: RawOrder): string | null {
  const candidates = [
    ...(order.note_attributes ?? []),
    ...order.line_items.flatMap((l) =>
      (l.properties ?? []).map((p) => ({ name: p.name, value: p.value }))
    ),
  ];
  const hit = candidates.find((a) => /gst(in)?[\s_-]*(no|number)?/i.test(a.name ?? ""));
  const value = (hit?.value ?? "").trim().toUpperCase();
  return /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value) ? value : null;
}

function toCustomer(a: RawAddress | null | undefined, order: RawOrder): InvoiceCustomer {
  const name =
    [a?.first_name, a?.last_name].filter(Boolean).join(" ").trim() ||
    (a?.name ?? "").trim() ||
    "—";
  return {
    name,
    addressLines: [a?.company, a?.address1, a?.address2].filter(Boolean).map(String),
    city: a?.city ?? "",
    province: a?.province ?? "",
    provinceCode: a?.province_code ?? null,
    zip: a?.zip ?? "",
    country: a?.country ?? "India",
    phone: a?.phone ?? order.phone ?? null,
    email: order.email ?? null,
    gstin: findGstin(order),
  };
}

/**
 * Classify a line. SKU is the reliable signal, but the Storefront query never
 * fetched it, so older orders may have none — fall back to the product title,
 * and mark the line when neither resolves rather than stamping a guess onto a
 * filed return.
 */
function classifyLine(title: string, sku: string | null): { hsn: HsnClass; unclassified: boolean } {
  const bySku = classifyBySku(sku);
  if (bySku) return { hsn: bySku, unclassified: false };

  const t = title.toLowerCase();
  // The Drift is a diffuser too (category "diffuser" in lib/data); its title
  // carries neither "diffuser" nor an A-series SKU, so it is named here.
  if (/diffuser|pebble|monolith|loom|pillar|ember|drift/.test(t)) {
    return { hsn: DIFFUSER_HSN, unclassified: false };
  }
  if (/oil|ritual|terrain|rain|hour|solitude|shoreline|lobby|arrival/.test(t)) {
    return { hsn: OIL_HSN, unclassified: false };
  }
  return { hsn: OIL_HSN, unclassified: true };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Sum of Shopify's discount allocations on a line, in rupees. */
const allocated = (a?: { amount: string }[] | null): number =>
  round2((a ?? []).reduce((t, x) => t + (Number(x.amount) || 0), 0));

/** Build the invoice view of one Shopify order. */
export function toInvoice(
  order: RawOrder,
  listPriceFor?: (title: string) => number | undefined
): Invoice {
  const ship = order.shipping_address ?? order.billing_address ?? null;
  const customer = toCustomer(ship, order);
  const billTo = toCustomer(order.billing_address ?? ship, order);

  // Place of supply is the delivery address — that is what decides CGST/SGST
  // against IGST, not where the buyer is billed.
  const interState = isInterState(customer.province || customer.provinceCode);

  const needsAttention: string[] = [];
  const lines: InvoiceLine[] = order.line_items.map((li) => {
    const { hsn, unclassified } = classifyLine(li.title, li.sku ?? null);
    if (unclassified) needsAttention.push(`"${li.title}" has no HSN classification`);
    const unit = Number(li.price);
    const isGift = unit === 0;

    // A gift is priced at what it normally sells for, then discounted away in
    // full. Prices here are GST-inclusive, so a discount of the whole ₹899
    // removes the ₹137.14 of tax inside it as well — which is why the taxable
    // value and the tax on the line are nil rather than charged and refunded.
    // Section 15(3)(a) treats a discount shown on the invoice at the time of
    // supply as reducing the transaction value, so this is also the figure
    // that belongs in the return.
    const listPrice = isGift ? listPriceFor?.(li.title) ?? 0 : unit;
    // A discount code is shared out over the lines by Shopify. The same rule
    // applies: it is shown on the invoice at the time of supply, so the tax is
    // worked on what was actually charged for the line, not its list price.
    const codeDiscount = isGift ? 0 : allocated(li.discount_allocations);
    const discount = isGift ? listPrice * li.quantity : codeDiscount;

    return {
      title: li.title,
      variantTitle: li.variant_title ?? null,
      sku: li.sku ?? null,
      hsn: hsn.hsn,
      quantity: li.quantity,
      unitPrice: unit,
      listPrice,
      discount,
      codeDiscount,
      tax: splitInclusive(unit * li.quantity - codeDiscount, hsn.ratePercent, interState),
      unclassified,
    };
  });

  // Shipping is a supply too. It follows the rate of what is being shipped,
  // which is 18% for everything in this catalogue.
  // What shipping actually cost, after a code that discounts it.
  const shippingList = (order.shipping_lines ?? []).reduce((t, s) => t + Number(s.price), 0);
  const shippingGross = (order.shipping_lines ?? []).reduce(
    (t, s) => t + Number(s.discounted_price ?? s.price),
    0
  );
  const shipping = shippingGross > 0 ? splitInclusive(shippingGross, 18, interState) : null;

  const totals = totalSplits([...lines.map((l) => l.tax), ...(shipping ? [shipping] : [])]);

  const mode = /mode\s+(\w+)/i.exec(order.note ?? "")?.[1] ?? "PayU";

  return {
    orderId: order.id,
    tags: (order.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    orderName: order.name,
    orderNumber: order.order_number,
    // Invoice number tracks the order number: unique and consecutive per
    // financial year, which is what the rules require.
    invoiceNumber: String(order.order_number),
    createdAt: order.created_at,
    paymentMode: mode,
    currency: order.currency,
    customer,
    billTo,
    lines,
    shipping,
    totals,
    placeOfSupply: [customer.city, customer.province].filter(Boolean).join(", "),
    placeOfSupplyCode: customer.provinceCode,
    interState,
    needsAttention,
    discountTotal:
      Math.round(lines.reduce((t, l) => t + l.discount, 0) * 100) / 100,
    totalPaid: Number(order.total_price) || 0,
    giftDiscount: round2(lines.reduce((t, l) => t + (l.discount - l.codeDiscount), 0)),
    codeDiscount: round2(
      lines.reduce((t, l) => t + l.codeDiscount, 0) + (shippingList - shippingGross)
    ),
    discountCodes: (order.discount_codes ?? []).map((d) => d.code).filter(Boolean),
  };
}

/**
 * What a gift bottle sells for when it is not being given away.
 *
 * Read from Shopify rather than the catalogue file, since the two have drifted
 * before — an oil was ₹1,499 in Shopify while the code still said ₹899, and
 * quoting the stale figure cost ₹600 on a real order. The catalogue is the
 * fallback for when Shopify cannot be reached.
 */
async function listPriceResolver(): Promise<(title: string) => number | undefined> {
  let commerce: Awaited<ReturnType<typeof getCommerceMap>> = {};
  try {
    commerce = await getCommerceMap();
  } catch {
    /* fall back to the catalogue */
  }
  return (title: string) => {
    // "Terrain Free" is the gift product; the oil it stands for is "Terrain".
    const name = giftDisplayTitle(title);
    const live = commerce[shopifyHandle(name)]?.variants.find((v) => v.price > 0);
    if (live) return live.price;
    const known = oils.find(
      (o) => o.name.toLowerCase() === name.trim().toLowerCase()
    );
    return known?.priceINR;
  };
}

/** Paid orders, newest first. */
export async function listInvoices(limit = 50): Promise<Invoice[]> {
  const data = await adminGet<{ orders: RawOrder[] }>(
    `orders.json?status=any&financial_status=paid&limit=${limit}`
  );
  const listPriceFor = await listPriceResolver();
  return data.orders.map((o) => toInvoice(o, listPriceFor));
}

/** One order by its Shopify order number, e.g. 1012. */
export async function getInvoice(orderNumber: number): Promise<Invoice | null> {
  const data = await adminGet<{ orders: RawOrder[] }>(
    `orders.json?status=any&name=%23${orderNumber}&limit=1`
  );
  const order = data.orders?.[0];
  if (!order) return null;
  return toInvoice(order, await listPriceResolver());
}
