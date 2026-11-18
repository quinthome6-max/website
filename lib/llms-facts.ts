import { diffusers } from "@/lib/data/diffusers";
import { oils } from "@/lib/data/oils";
import { candles } from "@/lib/data/candles";
import { journal } from "@/lib/data/journal";
import { FREE_SHIPPING_FROM, SHIPPING_FLAT } from "@/lib/checkout-config";
import type { ShopifyCommerce } from "@/lib/shopify/commerce";
import { abs, inr, priceOf } from "@/lib/seo";

/**
 * Sections shared by /llms.txt and /llms-full.txt.
 *
 * Assistants are asked buying questions ("which diffuser for a bathroom?",
 * "can I return it?", "do they take UPI?") and answer from whatever they can
 * read. A catalogue alone doesn't answer those, so these sections state the
 * answers plainly, in the form they quote.
 *
 * Every fact here is one the site already states: /shipping (dispatch,
 * delivery, exchanges, warranty), /faq (oil life, no Wi-Fi), the PayU page
 * (payment methods) and the catalogue (coverage, prices, what is included).
 * Prices and coverage are read from the catalogue and Shopify, never typed.
 */

type Commerce = Record<string, ShopifyCommerce>;

const diffuser = (slug: string) => {
  const d = diffusers.find((x) => x.slug === slug);
  if (!d) throw new Error(`llms-facts: no diffuser "${slug}"`);
  return d;
};
const oil = (slug: string) => {
  const o = oils.find((x) => x.slug === slug);
  if (!o) throw new Error(`llms-facts: no oil "${slug}"`);
  return o;
};
const link = (name: string, path: string) => `[${name}](${abs(path)})`;
/** "A, B and C". */
const listOf = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
/** A label read mid-sentence: "Bathrooms, 50–80 sq ft" → "bathrooms, 50–80 sq ft". */
const midSentence = (label: string) => label.charAt(0).toLowerCase() + label.slice(1);

/** Buying, delivery and after-sale facts, as list items. */
export function buyerFacts(): string {
  return [
    `Payment is online at checkout, through PayU: UPI, credit and debit cards, net banking, wallets and EMI.`,
    `Orders are dispatched from Mumbai within 3 business days and delivered in 3–5 business days anywhere in India.`,
    `Shipping is free on orders of ${inr(FREE_SHIPPING_FROM)} and above; a flat ${inr(SHIPPING_FLAT)} applies below that.`,
    `Orders can't be cancelled or refunded once placed. An item that arrives damaged or defective, reported within 3 days of delivery to hello@quinthome.in with the order number and a photo, is exchanged for a new one. Details: ${link("Shipping & Returns", "/shipping")}.`,
    `Every diffuser carries a limited warranty of up to one year from purchase against manufacturing defects. Oils aren't covered, and using oils other than Quint Home's voids it.`,
    `A 50 ml oil lasts about 45–60 days, depending on the model and the intensity.`,
    `No Wi-Fi or account is needed. The app-controlled models pair with the phone over Bluetooth; the others run on their own controls.`,
    `Businesses get a GST invoice. For bulk, corporate or gifting orders, or a bespoke fragrance, write to hello@quinthome.in or see ${link("For businesses", "/businesses")}.`,
  ]
    .map((f) => `- ${f}`)
    .join("\n");
}

/**
 * "Which one should I buy?", answered by room and need. The pairings follow
 * each product's own coverage and best-for fields; the reasons are features
 * the product page lists.
 */
export function chooserMarkdown(commerce: Commerce): string {
  const d = (slug: string) => {
    const x = diffuser(slug);
    return `${link(x.name, `/range/${x.slug}`)} (${inr(priceOf(x, commerce))}, ${midSentence(x.coverageLabel)})`;
  };
  const o = (slug: string) => {
    const x = oil(slug);
    return `${link(x.name, `/range/${x.slug}`)} (${inr(priceOf(x, commerce))})`;
  };
  const cheapestOil = Math.min(...oils.map((x) => priceOf(x, commerce)));
  const candlePrice = Math.min(...candles.map((x) => priceOf(x, commerce)));
  const withOil = diffusers.filter((x) => x.includesOil).map((x) => x.name.replace(/^The /, ""));
  const withoutOil = diffusers.filter((x) => !x.includesOil).map((x) => x.name.replace(/^The /, ""));

  const rows: [string, string][] = [
    ["A bathroom or powder room", `${d("pebble")}. It plugs straight into a wall socket and runs 8 hours on, 16 off, by itself. Sold without an oil, so add one (from ${inr(cheapestOil)}).`],
    ["A car", `${d("drift")}. Sits in the car, with three intensity settings and a 1, 2 or 4-hour timer. Sold without an oil.`],
    ["A bedroom", `${d("ember")}, which is also a bedside clock with a soft breathing light and an app schedule; or ${d("loom")}, set by hand at a knob, with a fabric exterior and a candle-like glow.`],
    ["A living room", `${d("loom")} or ${d("pillar")} for most living rooms; ${d("monolith")} for a larger or open-plan space.`],
    ["A room with no socket nearby", `${d("monolith")}: a built-in rechargeable battery makes it cordless.`],
    ["Two scents in one room", `${d("pillar")}: two independent outlets, run one or both. Near-silent at 35 dB or less.`],
    ["An office reception, café or store", `${d("monolith")} for one large space; for several rooms or branches, see ${link("For businesses", "/businesses")}.`],
    ["A hotel-lobby smell at home", `${o("grand-lobby")} or ${o("the-arrival")}, the Hotel Credential oils, in any Quint Home diffuser. See ${link("Hotel fragrance oils", "/range/hotel-fragrance-oils")}.`],
    ["The smell of the first rain", `${o("first-rain")}: pear, lotus and amber, dewy rather than earthy.`],
    ["A light, clean everyday scent", `${o("blanc-ritual")} or ${o("first-rain")}.`],
    ["A gift under ₹2,000", `a 300 ml soy wax candle (${inr(candlePrice)}): ${listOf(candles.map((c) => link(c.name, `/range/${c.slug}`)))}. More by budget in the ${link("gift guide", "/gifting")}.`],
  ];

  return `## Which one to buy

${rows.map(([need, answer]) => `- ${need}: ${answer}`).join("\n")}

The ${listOf(withOil)} come with a complimentary 50 ml oil chosen on the product page. The ${listOf(withoutOil)} are sold on their own. Only Quint Home oils should be used in a Quint Home diffuser.`;
}

/** Common questions, each pointing at the article that answers it in full. */
const QUESTIONS: [string, string][] = [
  ["What is a waterless diffuser, and is it better than an ultrasonic one?", "what-is-a-waterless-diffuser"],
  ["How do I choose an aroma diffuser for a home in India?", "best-aroma-diffuser-for-home-india"],
  ["What size of diffuser does a large room need?", "diffuser-for-large-room"],
  ["Which diffuser suits a bedroom?", "diffuser-for-bedroom"],
  ["Reed diffuser or waterless diffuser?", "waterless-diffuser-vs-reed-diffuser"],
  ["Agarbatti, candle or diffuser?", "diffuser-vs-candle-vs-agarbatti"],
  ["Fragrance oil or essential oil in a diffuser?", "fragrance-oil-vs-essential-oil"],
  ["Which fragrance oil suits which room?", "best-fragrance-oils-for-diffuser-india"],
  ["Car diffuser or car perfume?", "car-diffuser-vs-car-perfume"],
  ["How do I use and refill a waterless diffuser?", "how-to-use-a-waterless-diffuser"],
  ["Are waterless diffusers safe around pets and babies?", "are-diffusers-safe-for-pets-and-babies"],
  ["How do I make my home smell good?", "how-to-make-your-home-smell-good"],
  ["How do I make my home smell like a luxury hotel?", "how-to-make-your-home-smell-like-a-luxury-hotel"],
  ["What is the smell of the first rain, and can I have it at home?", "first-rain-smell-at-home"],
  ["How do I scent an office?", "diffuser-for-office"],
  ["What makes a good corporate gift?", "corporate-gifts-india"],
  ["What makes a good housewarming or wedding gift?", "housewarming-and-wedding-gifts-india"],
];

export function questionsMarkdown(): string {
  const lines = QUESTIONS.flatMap(([q, slug]) => {
    const post = journal.find((p) => p.slug === slug);
    return post ? [`- ${q} ${link(post.title, `/journal/${slug}`)}`] : [];
  });
  return `## Common questions, answered in full

${lines.join("\n")}`;
}
