import { candles } from "@/lib/data/candles";
import { getCommerceMap, sellableVariant, shopifyHandle } from "@/lib/shopify/commerce";

/**
 * The candles offered in the bag ("Add a candle"), priced and stocked from
 * Shopify like the candle pages.
 *
 * Only candles Shopify can actually sell are offered: no variant id means the
 * button could not add anything, and a sold-out candle would be refused at
 * checkout. If the store can't be reached the list is simply empty and the bag
 * shows no offer, rather than a price that might be wrong.
 */
export interface CandleOffer {
  slug: string;
  name: string;
  notes: string;
  image: string;
  price: number;
  /** compareAtPrice, when genuinely higher. */
  listPrice?: number;
  variantId: string;
}

export async function candleOffers(): Promise<CandleOffer[]> {
  try {
    const commerce = await getCommerceMap();
    return candles.flatMap((c) => {
      const variant = sellableVariant(commerce[shopifyHandle(c.name)]);
      if (!variant || !variant.available) return [];
      return [
        {
          slug: c.slug,
          name: c.name,
          notes: c.notesLine,
          image: c.image,
          price: variant.price,
          listPrice: variant.compareAt,
          variantId: variant.id,
        },
      ];
    });
  } catch {
    return [];
  }
}
