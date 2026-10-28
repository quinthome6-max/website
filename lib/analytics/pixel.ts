/**
 * Meta Pixel — the thin wrapper every component calls.
 *
 * Nothing here loads the pixel; components/analytics/meta-pixel.tsx does that
 * once in the layout. These helpers only push events onto the queue, so they
 * are safe to call before the script has finished loading and harmless when an
 * ad-blocker has removed it entirely.
 *
 * Catalogue matching: `content_ids` carry the numeric Shopify variant id,
 * which is the id Shopify's own Meta catalogue feed publishes for a variant.
 * If the catalogue is ever fed by handle instead, change `pixelId()` below and
 * every event follows.
 */

import { gaEvent } from "@/lib/analytics/ga4";
import { clarityEvent, clarityKeep, clarityTag } from "@/lib/analytics/clarity";

export const META_PIXEL_ID = "1843486567026202";

/** The browser pixel hashes these itself before they leave the page. */
export interface AdvancedMatch {
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  ct?: string;
  st?: string;
  zp?: string;
  country?: string;
}

export interface PixelContent {
  id: string;
  quantity: number;
  item_price: number;
}

/**
 * The catalogue id for a cart line. Shopify's Meta feed lists variants by their
 * numeric id, so "gid://shopify/ProductVariant/41234567890" becomes
 * "41234567890".
 */
export function pixelId(merchandiseId: string): string {
  return merchandiseId.split("/").pop() ?? merchandiseId;
}

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[] };

function fbq(): Fbq | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { fbq?: Fbq }).fbq ?? null;
}

/**
 * The base code is in the server HTML, so `fbq` normally exists before any
 * component mounts; on the back office it never does, and an ad-blocker can
 * remove it. Anything sent while it is missing is held here and replayed if
 * the script arrives.
 */
const waiting: unknown[][] = [];
let draining = false;

function drain(): void {
  if (draining) return;
  draining = true;
  let tries = 0;
  const tick = () => {
    const f = fbq();
    if (f) {
      while (waiting.length) f(...(waiting.shift() as unknown[]));
      draining = false;
      return;
    }
    // ~10s: longer than any realistic script load, then give up rather than
    // spin forever on a page where an ad-blocker removed the pixel.
    if (++tries > 100) {
      waiting.length = 0;
      draining = false;
      return;
    }
    setTimeout(tick, 100);
  };
  tick();
}

function send(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  const f = fbq();
  if (f) {
    f(...args);
    return;
  }
  waiting.push(args);
  drain();
}

/** Normalise before hashing: Meta lowercases and trims, phones go to digits. */
function clean(v: string | undefined, digitsOnly = false): string | undefined {
  if (!v) return undefined;
  const t = v.trim().toLowerCase();
  if (!t) return undefined;
  return digitsOnly ? t.replace(/[^\d]/g, "") || undefined : t;
}

export function advancedMatch(raw: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}): AdvancedMatch {
  const phone = clean(raw.phone, true);
  return {
    em: clean(raw.email),
    // India: Meta wants the country code on the number, and the form collects
    // a local 10-digit mobile.
    ph: phone ? (phone.length === 10 ? `91${phone}` : phone) : undefined,
    fn: clean(raw.firstName),
    ln: clean(raw.lastName),
    ct: clean(raw.city)?.replace(/\s/g, ""),
    st: clean(raw.state),
    zp: clean(raw.zip, true),
    country: isoCountry(raw.country),
  };
}

/** Meta wants a two-letter code; the form collects a country name. */
function isoCountry(raw: string | undefined): string {
  const v = clean(raw);
  if (!v) return "in";
  if (v.length === 2) return v;
  return { india: "in" }[v] ?? "in";
}

/** Re-init with what we now know about the person, then carry on tracking. */
export function identify(match: AdvancedMatch): void {
  const data = Object.fromEntries(Object.entries(match).filter(([, v]) => v));
  if (Object.keys(data).length === 0) return;
  send("init", META_PIXEL_ID, data);
}

export function track(event: string, params?: Record<string, unknown>): void {
  send("track", event, params);
}

/** PageView on client-side navigation, which the base snippet cannot see. */
export function pageView(): void {
  track("PageView");
}

export function viewContent(p: {
  id: string;
  name: string;
  value: number;
  category?: string;
}): void {
  gaEvent("view_item", {
    value: p.value,
    items: [{ item_id: p.id, item_name: p.name, item_category: p.category, price: p.value, quantity: 1 }],
  });
  track("ViewContent", {
    content_ids: [p.id],
    content_name: p.name,
    content_type: "product",
    ...(p.category ? { content_category: p.category } : {}),
    value: p.value,
    currency: "INR",
  });
}

export function addToCart(p: {
  contents: PixelContent[];
  value: number;
  name?: string;
}): void {
  clarityEvent("add_to_cart");
  gaEvent("add_to_cart", {
    value: p.value,
    items: p.contents.map((c, i) => ({
      item_id: c.id,
      ...(i === 0 && p.name ? { item_name: p.name } : {}),
      price: c.item_price,
      quantity: c.quantity,
    })),
  });
  track("AddToCart", {
    content_ids: p.contents.map((c) => c.id),
    contents: p.contents,
    content_type: "product",
    ...(p.name ? { content_name: p.name } : {}),
    value: p.value,
    currency: "INR",
  });
}

export function initiateCheckout(p: {
  contents: PixelContent[];
  value: number;
}): void {
  clarityEvent("begin_checkout");
  clarityKeep("checkout");
  gaEvent("begin_checkout", {
    value: p.value,
    items: p.contents.map((c) => ({ item_id: c.id, price: c.item_price, quantity: c.quantity })),
  });
  track("InitiateCheckout", {
    content_ids: p.contents.map((c) => c.id),
    contents: p.contents,
    content_type: "product",
    num_items: p.contents.reduce((n, c) => n + c.quantity, 0),
    value: p.value,
    currency: "INR",
  });
}

export function purchase(p: {
  contents: PixelContent[];
  value: number;
  orderId: string;
}): void {
  // Find this order's recording in Clarity: Custom tags → order.
  clarityTag("order", p.orderId);
  clarityEvent("purchase");
  clarityKeep("purchase");
  gaEvent("purchase", {
    transaction_id: p.orderId,
    value: p.value,
    items: p.contents.map((c) => ({ item_id: c.id, price: c.item_price, quantity: c.quantity })),
  });
  track("Purchase", {
    content_ids: p.contents.map((c) => c.id),
    contents: p.contents,
    content_type: "product",
    num_items: p.contents.reduce((n, c) => n + c.quantity, 0),
    value: p.value,
    currency: "INR",
    // Lets a Conversions API event for the same order be de-duplicated later.
    order_id: p.orderId,
  });
}
