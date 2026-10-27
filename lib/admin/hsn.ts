import type { Product } from "@/lib/types";

/**
 * HSN classification and GST rates.
 *
 * Supplied by the business (confirmed against its GST advice), not inferred
 * here. Intra-state supply splits the rate into equal CGST and SGST halves,
 * inter-state charges it all as IGST; that split is handled in
 * lib/admin/gst.ts, which only needs the combined rate.
 *
 *   84248990  Aroma diffusers  18%  (mechanical appliances for spraying liquids)
 *   33029090  Fragrance oils   18%  (mixtures of odoriferous substances)
 *   340600    Soy candles       5%  (confirmed by the business, 27 Oct 2026)
 *
 * A future product that is none of these (a gift set, a refill kit) needs its
 * own classification before it can be invoiced.
 * classify() throws rather than guessing, so that surfaces as a loud failure at
 * invoice time instead of a wrong code on a filed return.
 */
export interface HsnClass {
  hsn: string;
  ratePercent: number;
  /** Wording for the invoice's description column. */
  category: string;
}

export const DIFFUSER_HSN: HsnClass = {
  hsn: "84248990",
  ratePercent: 18,
  category: "Aroma diffuser",
};

export const OIL_HSN: HsnClass = {
  hsn: "33029090",
  ratePercent: 18,
  category: "Fragrance oil",
};

export const CANDLE_HSN: HsnClass = {
  hsn: "340600",
  ratePercent: 5,
  category: "Scented candle",
};

/** The classification for a catalogue product. */
export function classify(product: Product): HsnClass {
  if (product.category === "diffuser") return DIFFUSER_HSN;
  if (product.category === "oil") return OIL_HSN;
  if (product.category === "candle") return CANDLE_HSN;
  throw new Error(
    `No HSN classification for "${(product as { name?: string }).name ?? "unknown product"}". ` +
      `Add one to lib/admin/hsn.ts before invoicing it.`
  );
}

/**
 * Classification for an order line that may not resolve to a catalogue entry —
 * a renamed or deleted Shopify product, say. Falls back on the SKU prefix the
 * store uses (OIL-… for oils, A-… / model codes for devices) and returns null
 * when nothing matches, so the invoice can flag the line instead of inventing
 * a code for it.
 */
export function classifyBySku(sku: string | null | undefined): HsnClass | null {
  const s = (sku ?? "").trim().toUpperCase();
  if (!s) return null;
  if (s.startsWith("OIL-")) return OIL_HSN;
  if (/^A-?T?\d/.test(s)) return DIFFUSER_HSN;
  return null;
}
