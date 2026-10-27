import { candles } from "@/lib/data/candles";
import { diffusers } from "@/lib/data/diffusers";
import { oils } from "@/lib/data/oils";
import { DIFFUSER_HSN, OIL_HSN } from "@/lib/admin/hsn";
import {
  getCommerceMap,
  handleCandidates,
  sellableVariant,
  shopifyHandle,
  type ShopifyCommerce,
} from "@/lib/shopify/commerce";

/** One product the quote editor can add, priced as the shop sells it today. */
export interface CatalogueItem {
  key: string;
  slug: string;
  group: "Diffusers" | "Fragrance oils" | "Candles";
  title: string;
  variant?: string;
  description: string;
  image: string;
  hsn: string;
  gstRate: number;
  /** Shop price, GST included (live from Shopify when it answers). */
  price: number;
  /** Candles have no confirmed HSN code or rate yet (lib/admin/hsn.ts). */
  needsTaxCheck?: boolean;
}

function commerceFor(map: Record<string, ShopifyCommerce>, name: string) {
  for (const h of handleCandidates(shopifyHandle(name))) if (map[h]) return map[h];
  return undefined;
}

export async function quoteCatalogue(): Promise<CatalogueItem[]> {
  const map = await getCommerceMap();
  const items: CatalogueItem[] = [];

  for (const d of diffusers) {
    const commerce = commerceFor(map, d.name);
    const finishes = d.colors?.length ? d.colors : [null];
    for (const c of finishes) {
      // A finish's own variant, else the cheapest sellable one, else the code price.
      const variant = c
        ? commerce?.variants.find((v) => v.price > 0 && Object.values(v.options).includes(c.name))
        : undefined;
      const price = variant?.price ?? sellableVariant(commerce)?.price ?? d.priceINR;
      items.push({
        key: c ? `${d.slug}:${c.name}` : d.slug,
        slug: d.slug,
        group: "Diffusers",
        title: d.name,
        variant: c?.name,
        description: `Waterless aroma diffuser · ${d.coverageLabel}`,
        image: c?.image ?? d.image,
        hsn: DIFFUSER_HSN.hsn,
        gstRate: DIFFUSER_HSN.ratePercent,
        price,
      });
    }
  }

  for (const o of oils) {
    const commerce = commerceFor(map, o.name);
    items.push({
      key: o.slug,
      slug: o.slug,
      group: "Fragrance oils",
      title: o.name,
      variant: `${o.volumeML} ml`,
      description: `${o.tier === "hotel-credential" ? "Hotel Credential fragrance oil" : "Fragrance oil"} · 70–90% concentration`,
      image: o.image,
      hsn: OIL_HSN.hsn,
      gstRate: OIL_HSN.ratePercent,
      price: sellableVariant(commerce)?.price ?? o.priceINR,
    });
  }

  for (const c of candles) {
    const commerce = commerceFor(map, c.name);
    items.push({
      key: c.slug,
      slug: c.slug,
      group: "Candles",
      title: c.name,
      variant: `${c.volumeML} ml`,
      description: `Soy wax candle · ${c.notesLine}`,
      image: c.image,
      hsn: "",
      gstRate: 18,
      price: sellableVariant(commerce)?.price ?? c.priceINR,
      needsTaxCheck: true,
    });
  }

  return items;
}
