import { diffusers } from "@/lib/data/diffusers";
import { oils } from "@/lib/data/oils";
import { candles, CANDLE_CARE, CANDLE_MAKE } from "@/lib/data/candles";
import { journal } from "@/lib/data/journal";
import { getCommerceMap } from "@/lib/shopify/commerce";
import { FREE_SHIPPING_FROM, SHIPPING_FLAT } from "@/lib/checkout-config";
import { BRAND, SUMMARY, abs, inr, priceOf } from "@/lib/seo";
import { giftingMarkdown } from "@/lib/gifting";

/**
 * /llms-full.txt — the expanded companion to /llms.txt. Where that file is an
 * index an assistant reads to decide where to look, this one carries the whole
 * catalogue inline: full copy, every specification row, every note pyramid and
 * every article in full, so a question can be answered without fetching the
 * individual pages.
 */
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const commerce = await getCommerceMap();

  const diffuserBlocks = diffusers.map((d) => {
    const finishes = d.colors?.length
      ? `\nFinishes: ${d.colors.map((c) => c.name).join(", ")}`
      : "";
    return `### ${d.name}

URL: ${abs(`/range/${d.slug}`)}
Model: ${d.model}
Price: ${inr(priceOf(d, commerce))}
Coverage: ${d.coverageLabel}${d.coverageSqFt ? ` (${d.coverageSqFt[0]}–${d.coverageSqFt[1]} sq ft)` : ""}
Control: ${d.bluetooth ? "Companion app over Bluetooth, plus on-device controls" : `On-device controls only${d.specs.find((sp) => sp.label === "Timer") ? `, ${d.specs.find((sp) => sp.label === "Timer")!.value.toLowerCase()} timer` : ""}`}
Finish: ${d.finish}
Height: ${d.height}
Best for: ${d.bestFor.join(", ")}${finishes}

${d.tagline}

${d.description}

Key features:
${d.keyFeatures.map((f) => `- ${f}`).join("\n")}

Specifications:
${d.specs.map((s) => `- ${s.label}: ${s.value}`).join("\n")}`;
  });

  const oilBlocks = oils.map((o) => {
    const credential = o.credential
      ? `\nHotel credential: ${o.credential.line} — ${o.credential.story}`
      : "";
    return `### ${o.name}

URL: ${abs(`/range/${o.slug}`)}
Price: ${inr(priceOf(o, commerce))}
Volume: ${o.volumeML} ml
Line: ${o.tier === "hotel-credential" ? "Hotel Credential" : "Signature"}
Mood: ${o.mood}
Origin: ${o.origin}
Top notes: ${o.notes.top.join(", ")}
Heart notes: ${o.notes.heart.join(", ")}
Base notes: ${o.notes.base.join(", ")}${credential}

${o.tagline}

${o.description}`;
  });

  const candleBlocks = candles.map(
    (k) => `### ${k.name}

URL: ${abs(`/range/${k.slug}`)}
Price: ${inr(priceOf(k, commerce))}
Fragrance: ${k.notesLine}
Size: ${k.volumeML} ml, 100% soy wax, hand-poured
Burn time: up to ${k.burnHours} hours

${k.tagline}

${k.description}`
  );

  const articleBlocks = journal.map(
    (a) => `### ${a.title}

URL: ${abs(`/journal/${a.slug}`)}
Category: ${a.eyebrow}
Published: ${a.publishedAt}
Reading time: ${a.readMinutes} minutes

${a.body.join("\n\n")}`
  );

  const body = `# ${BRAND} — full catalogue

> ${SUMMARY}

This is the expanded companion to ${abs("/llms.txt")}. Everything below is the
site's own copy, reproduced in full.

## How the products work

A waterless (cold-air nebulising) diffuser atomises fragrance oil directly using
air pressure. There is no water, no heat and no dilution, so the room receives
the oil at 70–90% concentration with its top, heart and base notes intact and
the scent holds for hours. An ultrasonic diffuser instead vibrates a few drops
of oil through a tank of water, delivering roughly 1–3% fragrance in humidified
air. Every ${BRAND} diffuser is waterless.

## Commercial terms

- All prices in Indian rupees (INR, ₹).
- Ships within India only, from Mumbai.
- Shipping is free at ${inr(FREE_SHIPPING_FROM)} and above, otherwise a flat ${inr(SHIPPING_FLAT)}.
- Every room diffuser includes one complimentary 50 ml oil, chosen by the buyer on the diffuser's page. The Drift, the car and bathroom model, is sold on its own.
- Oils are IFRA-compliant.
- Contact: hello@quinthome.in · +91 98196 16668 · Instagram @shopquinthome

${giftingMarkdown(commerce)}

## Diffusers (${diffusers.length})

${diffuserBlocks.join("\n\n")}

## Fragrance oils (${oils.length})

${oilBlocks.join("\n\n")}

## Candles (${candles.length})

${CANDLE_MAKE}

${CANDLE_CARE}

${candleBlocks.join("\n\n")}

## Journal (${journal.length})

${articleBlocks.join("\n\n")}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
