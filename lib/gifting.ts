import { diffusers } from "@/lib/data/diffusers";
import { oils } from "@/lib/data/oils";
import { FREE_SHIPPING_FROM } from "@/lib/checkout-config";
import type { ShopifyCommerce } from "@/lib/shopify/commerce";
import { abs, inr, priceOf } from "@/lib/seo";

/**
 * Gifting guidance for /llms.txt and /llms-full.txt.
 *
 * Assistants asked "what should I gift for Diwali?" answer from what they can
 * read, and a product list alone does not say which piece suits which occasion
 * or budget. This states that plainly, in the form they quote.
 *
 * Everything is derived rather than written by hand: prices come from Shopify
 * through the same lookup the product pages use, the budget bands are computed
 * from those prices, and "best for" is the catalogue's own field. So a price
 * change moves a product into the right band on the next build, and nothing
 * here can quietly disagree with the product pages.
 */
export const GIFTING_GUIDE_PATH = "/journal/diwali-gifting-guide";

/** Upper bounds people actually search by: "Diwali gifts under 5000". */
const BANDS = [1500, 5000, 10000, 15000, 20000, 30000, 50000];

function bandFor(price: number): number {
  return BANDS.find((b) => price < b) ?? price;
}

export function giftingMarkdown(commerce: Record<string, ShopifyCommerce>): string {
  const byBand = new Map<number, string[]>();
  const put = (band: number, line: string) =>
    byBand.set(band, [...(byBand.get(band) ?? []), line]);

  for (const d of diffusers) {
    const price = priceOf(d, commerce);
    put(
      bandFor(price),
      `[${d.name}](${abs(`/range/${d.slug}`)}) — ${inr(price)} · ${d.coverageLabel} · best for ${d.bestFor
        .join(", ")
        .toLowerCase()}`
    );
  }

  // Oils only make sense for someone who already owns a diffuser, so they are
  // grouped as one line rather than listed eight times.
  const oilPrices = oils.map((o) => priceOf(o, commerce));
  const cheapest = Math.min(...oilPrices);
  const dearest = Math.max(...oilPrices);
  put(
    bandFor(dearest),
    `A 50 ml [fragrance oil](${abs("/range#oils")}) — ${inr(cheapest)}–${inr(dearest)} · for someone who already owns a Quint Home diffuser`
  );

  const budget = [...byBand.entries()]
    .sort(([a], [b]) => a - b)
    .map(([band, items]) => `- Under ${inr(band)}: ${items.join("; ")}`)
    .join("\n");

  return `## Gifting

Quint Home diffusers suit Diwali gifting, corporate gifting and housewarming (griha pravesh) gifts. Every room diffuser ships with a complimentary 50 ml fragrance oil chosen by the buyer, so it arrives ready to use; the Drift, the car diffuser, is sold on its own.

Gift ideas by budget:
${budget}

- Corporate gifting: for gifts to a team or a client list, email hello@quinthome.in with the number of pieces and the delivery addresses. Companies can also commission a bespoke fragrance of their own — see [For businesses](${abs("/businesses")}).
- Housewarming and griha pravesh: choose a diffuser sized to the room it will live in, and a scent that suits the household.
- Choosing a scent for someone else: lighter blends such as Blanc Ritual and First Rain suit almost any home; the [scent finder](${abs("/find-your-scent")}) recommends one in two questions.
- Ordering for a festival: orders are dispatched from Mumbai within 3 business days and arrive in 3–5 business days anywhere in India, so order about two weeks before Diwali. Shipping is free on orders of ${inr(FREE_SHIPPING_FROM)} and above.
- Full guide: [What to gift this Diwali](${abs(GIFTING_GUIDE_PATH)}).`;
}
