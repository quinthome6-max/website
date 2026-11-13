// Product cards for "Shop" blocks (journal pieces, the gift guide), priced
// and stocked from Shopify like the range pages, with lib/data as fallback.
import type { ShopCard } from "@/components/journal/shop-block";
import { shopItem } from "@/lib/data/shop-items";
import { pricePair, shopifyHandle, type ShopifyCommerce } from "@/lib/shopify/commerce";

export function shopCards(slugs: string[], commerce: Record<string, ShopifyCommerce>): ShopCard[] {
  return slugs.flatMap((s) => {
    const item = shopItem(s);
    if (!item) return [];
    const live = commerce[shopifyHandle(item.name)];
    return [{ ...item, ...pricePair(live, item.priceINR, item.listPriceINR), soldOut: live ? !live.available : false }];
  });
}
