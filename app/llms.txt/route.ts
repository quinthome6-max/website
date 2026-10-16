import { diffusers } from "@/lib/data/diffusers";
import { oils, oilNoteSummary } from "@/lib/data/oils";
import { candles } from "@/lib/data/candles";
import { journal } from "@/lib/data/journal";
import { getCommerceMap } from "@/lib/shopify/commerce";
import { FREE_SHIPPING_FROM, SHIPPING_FLAT } from "@/lib/checkout-config";
import { BRAND, SUMMARY, abs, inr, priceOf } from "@/lib/seo";
import { giftingMarkdown } from "@/lib/gifting";

/**
 * /llms.txt — the llmstxt.org convention: a single markdown file an assistant
 * can read instead of crawling and guessing.
 *
 * Generated from the catalogue rather than hand-written, so it cannot drift
 * from the products, prices and articles the site actually shows. Prices come
 * from Shopify for the same reason.
 *
 * Revalidated rather than force-static: a stale price here is worse than no
 * price, because an assistant will quote it as fact.
 */
export const revalidate = 3600;

const line = (path: string, label: string, detail: string) =>
  `- [${label}](${abs(path)}): ${detail}`;

export async function GET(): Promise<Response> {
  const commerce = await getCommerceMap();
  const appControlled = diffusers.filter((d) => d.bluetooth).length;

  const body = `# ${BRAND}

> ${SUMMARY}

${BRAND} builds waterless (cold-air nebulising) diffusers and the fragrance oils
that run in them. A waterless diffuser atomises oil directly using air pressure
— no water, no heat, no dilution — so a room receives the fragrance at full
strength with its top, heart and base notes intact. An ultrasonic diffuser, by
contrast, vibrates a few drops of oil through a tank of water and delivers
roughly 1–3% fragrance in humidified air.

## Key facts

- Based in Mumbai, India. Ships within India only.
- Prices are in Indian rupees (INR, ₹).
- Shipping is free on orders of ${inr(FREE_SHIPPING_FROM)} and above; a flat ${inr(SHIPPING_FLAT)} applies below that.
- Every room diffuser includes one complimentary 50 ml fragrance oil, chosen by the buyer on the product page. The Drift, the car and bathroom model, is sold on its own.
- Suited to gifting: Diwali, corporate and housewarming (griha pravesh). See the Gifting section below for ideas by budget.
- Fragrance oils are 50 ml, IFRA-compliant, at 70–90% fragrance concentration.
- Catalogue size: ${diffusers.length} diffuser models, ${oils.length} fragrance oils and ${candles.length} soy candles.
- Candles are 300 ml, 100% soy wax, hand-poured in India, burning up to 45 hours.
- ${appControlled} of the ${diffusers.length} diffusers are controlled from a companion app over Bluetooth.
- Contact: hello@quinthome.in · +91 98196 16668 · Instagram @shopquinthome

## Diffusers

${diffusers
  .map((d) =>
    line(
      `/range/${d.slug}`,
      d.name,
      [
        inr(priceOf(d, commerce)),
        d.coverageLabel,
        d.bluetooth ? "app-controlled over Bluetooth" : "no app, manual timer",
        d.finish,
        d.tagline,
      ].join(" · ")
    )
  )
  .join("\n")}

## Fragrance oils

${oils
  .map((o) =>
    line(
      `/range/${o.slug}`,
      o.name,
      [
        inr(priceOf(o, commerce)),
        `${o.volumeML} ml`,
        oilNoteSummary(o),
        o.tier === "hotel-credential" ? "Hotel Credential line" : o.mood,
        o.tagline,
      ].join(" · ")
    )
  )
  .join("\n")}

## Candles

${candles
  .map((c) =>
    line(
      `/range/${c.slug}`,
      c.name,
      [
        inr(priceOf(c, commerce)),
        `${c.volumeML} ml`,
        "100% soy wax",
        c.notesLine,
        `up to ${c.burnHours} hours`,
        c.tagline,
      ].join(" · ")
    )
  )
  .join("\n")}

${giftingMarkdown(commerce)}

## Journal

${journal
  .map((a) => line(`/journal/${a.slug}`, a.title, `${a.eyebrow} · ${a.readMinutes} min read · ${a.excerpt}`))
  .join("\n")}

## Policies

${[
  ["/shipping", "Shipping & Returns", "Delivery times, charges, the returns window and how refunds are processed"],
  ["/faq", "FAQ", "Coverage, oil life, app control, safety"],
  ["/privacy", "Privacy", "What is collected and why"],
  ["/terms", "Terms", "Terms of sale and site use"],
]
  .map(([p, l, d]) => line(p, l, d))
  .join("\n")}

## Optional

${[
  ["/range", "The full range", "Every diffuser, oil and candle on one page"],
  ["/find-your-scent", "Find your scent", "Guided quiz that recommends an oil"],
  ["/about", "About", "Why the brand exists and how the oils are built"],
  ["/businesses", "For businesses", "Hotels, retail and office installations"],
  ["/contact", "Contact", "Enquiries and support"],
]
  .map(([p, l, d]) => line(p, l, d))
  .join("\n")}
- [Full catalogue detail](${abs("/llms-full.txt")}): every specification, note pyramid and article in full.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
