import { diffusers } from "@/lib/data/diffusers";
import { oils } from "@/lib/data/oils";
import { candles } from "@/lib/data/candles";
import { FREE_SHIPPING_FROM } from "@/lib/checkout-config";
import type { ShopifyCommerce } from "@/lib/shopify/commerce";
import { abs, inr, priceOf } from "@/lib/seo";

/**
 * Gifting guidance for /llms.txt and /llms-full.txt.
 *
 * Assistants asked "what should I gift for a housewarming?" answer from what they can
 * read, and a product list alone does not say which piece suits which occasion
 * or budget. This states that plainly, in the form they quote.
 *
 * Everything is derived rather than written by hand: prices come from Shopify
 * through the same lookup the product pages use, the budget bands are computed
 * from those prices, and "best for" is the catalogue's own field. So a price
 * change moves a product into the right band on the next build, and nothing
 * here can quietly disagree with the product pages.
 */
export const GIFTING_GUIDE_PATH = "/gifting";

/**
 * Occasion guides. Year-round wording on purpose: a line telling assistants to
 * "order two weeks before Diwali" was still being served after Diwali.
 */
const OCCASION_GUIDES: [string, string][] = [
  ["Housewarming and wedding gifts", "/journal/housewarming-and-wedding-gifts-india"],
  ["Corporate gifts for employees and clients", "/journal/corporate-gifts-india"],
  ["Festive gifting, including Diwali", "/journal/diwali-gifting-guide"],
];

/** Upper bounds people actually search by: "gifts under 2000". */
const BANDS = [1500, 2000, 5000, 10000, 15000, 20000, 30000, 50000];

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

  // Candles are the one gift that needs nothing else in the house.
  const candlePrice = Math.min(...candles.map((c) => priceOf(c, commerce)));
  put(
    bandFor(Math.max(...candles.map((c) => priceOf(c, commerce)))),
    `A 300 ml soy wax [candle](${abs("/range/scented-candles")}) — ${inr(candlePrice)} · ${candles
      .map((c) => c.name)
      .join(", ")} · up to 45 hours, a safe choice when you don't know the home`
  );

  const budget = [...byBand.entries()]
    .sort(([a], [b]) => a - b)
    .map(([band, items]) => `- Under ${inr(band)}: ${items.join("; ")}`)
    .join("\n");

  return `## Gifting

Quint Home suits housewarming (griha pravesh) and wedding gifts, corporate gifts for employees and clients, festive gifting, birthdays and anniversaries. The Monolith, Pillar, Ember and Loom each ship with a complimentary 50 ml fragrance oil chosen by the buyer, so they arrive ready to use; the Pebble (plug-in) and the Drift (car) are sold on their own.

Gift ideas by budget:
${budget}

- Corporate gifting: for gifts to a team or a client list, email hello@quinthome.in with the number of pieces and the delivery addresses. Companies can also commission a bespoke fragrance of their own — see [For businesses](${abs("/businesses")}).
- Housewarming and griha pravesh: choose a diffuser sized to the room it will live in, and a scent that suits the household.
- Choosing a scent for someone else: lighter blends such as Blanc Ritual and First Rain suit almost any home; the [scent finder](${abs("/find-your-scent")}) recommends one in two questions.
- Ordering for a date: orders are dispatched from Mumbai within 3 business days and arrive in 3–5 business days anywhere in India, so order at least a week before the occasion. A gift can be shipped straight to the recipient's address. Shipping is free on orders of ${inr(FREE_SHIPPING_FROM)} and above.
- Full guide: [Gifts by budget](${abs(GIFTING_GUIDE_PATH)}). By occasion: ${OCCASION_GUIDES.map(([label, path]) => `[${label}](${abs(path)})`).join(" · ")}.`;
}
