import { shopifyHandle, type ShopifyCommerce } from "@/lib/shopify/commerce";
import type { Product } from "@/lib/types";

/**
 * One origin for every absolute URL the site emits — canonicals, the sitemap,
 * robots.txt, llms.txt and the JSON-LD graph. When these disagree (www against
 * bare, http against https) search engines treat the variants as separate
 * sites and split the ranking between them.
 */
export const SITE = "https://www.quinthome.in";

export const BRAND = "Quint Home";

/** The one-sentence description of the business, used wherever a summary is
 *  asked for. Kept here so the site never describes itself two ways. */
export const SUMMARY =
  "Hotel-grade home fragrance from Mumbai: waterless electronic diffusers and IFRA-compliant fragrance oils at 70–90% concentration, designed to be displayed rather than hidden away.";

/** Default share image (WhatsApp, Facebook, LinkedIn), 1200×630, for pages
 *  without one of their own (plan T12). Product and journal pages use their
 *  own photograph instead. */
export const DEFAULT_OG_IMAGE = {
  url: "/images/og/quint-home.jpg",
  width: 1200,
  height: 630,
  alt: "The Quint Home range on a walnut sideboard",
};

/** Open Graph locale for every page: English, India. */
export const OG_LOCALE = "en_IN";

/** Absolute URL for a site-relative path. */
export function abs(path: string): string {
  return `${SITE}${path}`;
}

/** ₹1,234 — Indian digit grouping, no decimals. */
export function inr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * The price a visitor is actually quoted: Shopify's, with the catalogue figure
 * as a fallback for when Shopify is unreachable. Mirrors what the product pages
 * render, so a machine-readable summary can never advertise a price the site
 * itself no longer charges.
 */
export function priceOf(
  product: Product,
  commerce: Record<string, ShopifyCommerce>
): number {
  return commerce[shopifyHandle(product.name)]?.minPrice ?? product.priceINR;
}
