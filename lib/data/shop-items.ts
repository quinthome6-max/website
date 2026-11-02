// Products as a journal piece shows them in a "[[shop: …]]" block: enough to
// sell from the page (picture, what it is, who it suits, price) and a link to
// the product. Prices here are the fallback; the page prices them live.

import { diffusers } from "./diffusers";
import { oils, oilNoteSummary } from "./oils";
import { candles } from "./candles";

export interface ShopItem {
  slug: string;
  name: string;
  image: string;
  /** What it is, e.g. "Waterless diffuser". */
  kind: string;
  /** The one fact that sells it: coverage, notes. */
  line: string;
  /** A short highlight, e.g. "Free 50 ml oil". */
  badge?: string;
  priceINR: number;
  listPriceINR?: number;
}

export function shopItem(slug: string): ShopItem | null {
  const d = diffusers.find((p) => p.slug === slug);
  if (d) {
    return {
      slug: d.slug,
      name: d.name,
      image: d.image,
      kind: d.slug === "drift" ? "Car diffuser" : d.slug === "pebble" ? "Plug-in diffuser" : "Waterless diffuser",
      line: d.coverageLabel,
      badge: d.includesOil ? "Free 50 ml oil" : undefined,
      priceINR: d.priceINR,
      listPriceINR: d.listPriceINR,
    };
  }
  const o = oils.find((p) => p.slug === slug);
  if (o) {
    return {
      slug: o.slug,
      name: o.name,
      image: o.image,
      kind: `Fragrance oil · ${o.volumeML} ml`,
      line: oilNoteSummary(o),
      badge: o.tier === "hotel-credential" ? "Hotel Credential" : undefined,
      priceINR: o.priceINR,
    };
  }
  const c = candles.find((p) => p.slug === slug);
  if (c) {
    return {
      slug: c.slug,
      name: c.name,
      image: c.image,
      kind: `Soy wax candle · ${c.volumeML} ml`,
      line: c.notesLine,
      badge: `Up to ${c.burnHours} hours`,
      priceINR: c.priceINR,
      listPriceINR: c.listPriceINR,
    };
  }
  return null;
}

/** "[[shop: monolith, loom | Shop the large-room diffusers]]" → slugs and label. */
export function parseShopBlock(raw: string): { slugs: string[]; label?: string } | null {
  const m = /^\[\[shop:\s*([a-z0-9,\s-]+?)\s*(?:\|\s*([^\]]+?)\s*)?\]\]$/.exec(raw.trim());
  if (!m) return null;
  return { slugs: m[1].split(",").map((s) => s.trim()).filter(Boolean), label: m[2] };
}
