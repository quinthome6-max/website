import type { Candle, Diffuser, FragranceOil, Product } from "@/lib/types";
import type { ShopifyCommerce } from "@/lib/shopify/commerce";
import { SITE, BRAND, abs } from "@/lib/seo";
import { FREE_SHIPPING_FROM, SHIPPING_FLAT } from "@/lib/checkout-config";
import { numericId } from "@/lib/shopify/admin";
import { summarize, type PublicReview } from "@/lib/reviews/store";

/**
 * JSON-LD for the storefront.
 *
 * Everything emitted here has to be true of the rendered page: Google's
 * structured-data policy treats markup that contradicts the visible content as
 * spam, and the penalty is manual. So price comes from the same Shopify lookup
 * the page renders, and nothing is invented. Ratings come only from reviews
 * staff have approved, which the same page shows in its reviews section; with
 * none approved, no aggregateRating or review is emitted at all.
 */

const ORG_ID = `${SITE}/#organization`;

/** Shopify availability → the schema.org term Google expects. */
function availability(available: boolean): string {
  return available
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
}

/**
 * Shipping as /shipping states it, for one unit bought on its own: free at
 * ₹5,000 and over, otherwise the flat rate; dispatched within 3 business days,
 * delivered in 3–5. Google Shopping and ChatGPT shopping read these.
 */
function shippingDetails(price: number): Record<string, unknown> {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: price >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FLAT,
      currency: "INR",
    },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 3, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 5, unitCode: "DAY" },
    },
  };
}

/**
 * /shipping: no refunds; a damaged or defective item reported within 3 days is
 * exchanged. The closest schema.org reading of that is a 3-day window with an
 * exchange rather than money back.
 */
const RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "IN",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 3,
  returnMethod: "https://schema.org/ReturnByMail",
  refundType: "https://schema.org/ExchangeRefund",
  merchantReturnLink: `${SITE}/shipping`,
};

/** Prices are reviewed at least yearly; the end of next year is a true bound. */
function priceValidUntil(): string {
  return `${new Date().getFullYear() + 1}-12-31`;
}

export function productJsonLd(
  product: Product,
  commerce: ShopifyCommerce | undefined,
  price: number,
  /** Approved reviews, exactly as the page renders them. */
  reviews: PublicReview[] = []
): Record<string, unknown> {
  const isOil = product.category === "oil";
  const isCandle = product.category === "candle";
  const url = abs(`/range/${product.slug}`);
  const oil = isOil ? (product as FragranceOil) : null;
  const candle = isCandle ? (product as Candle) : null;
  const diffuser = isOil || isCandle ? null : (product as Diffuser);

  // Every finish is a real, separately purchasable variant, so each is its
  // own Offer with its own SKU. (An AggregateOffer is not accepted by Google's
  // merchant listings.) ₹0 complimentary variants are never offers.
  const paid = (commerce?.variants ?? []).filter((v) => v.price > 0);
  const offerBase = {
    "@type": "Offer",
    priceCurrency: "INR",
    priceValidUntil: priceValidUntil(),
    itemCondition: "https://schema.org/NewCondition",
    url,
    seller: { "@id": ORG_ID },
    hasMerchantReturnPolicy: RETURN_POLICY,
  };
  const offers =
    paid.length > 1
      ? paid.map((v) => ({
          ...offerBase,
          name: `${product.name} — ${v.title}`,
          sku: String(numericId(v.id) ?? v.id),
          price: v.price,
          availability: availability(v.available),
          shippingDetails: shippingDetails(v.price),
        }))
      : {
          ...offerBase,
          ...(paid[0] ? { sku: String(numericId(paid[0].id) ?? paid[0].id) } : {}),
          price,
          availability: availability(commerce?.available ?? true),
          shippingDetails: shippingDetails(price),
        };

  const additional = [
    ...(oil
      ? [
          { "@type": "PropertyValue", name: "Volume", value: `${oil.volumeML} ml` },
          { "@type": "PropertyValue", name: "Top notes", value: oil.notes.top.join(", ") },
          { "@type": "PropertyValue", name: "Heart notes", value: oil.notes.heart.join(", ") },
          { "@type": "PropertyValue", name: "Base notes", value: oil.notes.base.join(", ") },
        ]
      : []),
    ...(candle
      ? [
          { "@type": "PropertyValue", name: "Fragrance", value: candle.notesLine },
          { "@type": "PropertyValue", name: "Volume", value: `${candle.volumeML} ml` },
          { "@type": "PropertyValue", name: "Wax", value: "100% soy wax" },
          { "@type": "PropertyValue", name: "Burn time", value: `Up to ${candle.burnHours} hours` },
        ]
      : []),
    ...(diffuser
      ? [
          { "@type": "PropertyValue", name: "Coverage", value: diffuser.coverageLabel },
          { "@type": "PropertyValue", name: "Finish", value: diffuser.finish },
          {
            "@type": "PropertyValue",
            name: "App control",
            value: diffuser.bluetooth ? "App-controllable" : "No app (on-device controls)",
          },
        ]
      : []),
  ];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.description.split("\n\n")[0],
    image: [abs(product.image)],
    url,
    category: isOil
      ? "Home Fragrance Oil"
      : isCandle
        ? "Scented Candle"
        : "Electric Aroma Diffuser",
    brand: { "@type": "Brand", name: BRAND },
    // Model codes are real manufacturer identifiers; oils and candles have
    // none, so their SKU is the Shopify variant id, on the offer.
    ...(diffuser ? { mpn: diffuser.model, sku: diffuser.model } : {}),
    offers,
    ...(additional.length ? { additionalProperty: additional } : {}),
    ...ratingJsonLd(reviews),
  };
}

/** aggregateRating plus the latest few reviews, only when there are some. */
function ratingJsonLd(reviews: PublicReview[]): Record<string, unknown> {
  if (!reviews.length) return {};
  const { average, count } = summarize(reviews);
  return {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: average,
      reviewCount: count,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      author: { "@type": "Person", name: r.name },
      datePublished: r.createdAt.slice(0, 10),
      ...(r.title ? { name: r.title } : {}),
      reviewBody: r.body,
    })),
  };
}

/** home → range → product, so Google can render the trail under the result. */
export function breadcrumbJsonLd(
  trail: { name: string; path: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: abs(step.path),
    })),
  };
}

/**
 * FAQPage. Google requires the question and answer to be visible on the page,
 * so this is built from the same array the page renders rather than a
 * hand-written copy that could drift out of step.
 */
export function faqJsonLd(
  entries: { q: string; a: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.q,
      acceptedAnswer: { "@type": "Answer", text: e.a },
    })),
  };
}

/**
 * BlogPosting for a journal entry.
 *
 * The byline on the page reads "Quint Editorial", so the author is the brand
 * rather than an invented person — Google accepts an Organization here, and a
 * made-up name would be exactly the kind of claim this file refuses to make.
 */
export function articleJsonLd(post: {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  publishedAt: string;
  updatedAt?: string;
  keywords?: string[];
  body: string[];
}): Record<string, unknown> {
  const url = abs(`/journal/${post.slug}`);
  const words = post.body
    .filter((b) => !b.startsWith("!["))
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .split(/\s+/)
    .filter(Boolean).length;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.excerpt,
    image: [abs(post.cover)],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: { "@type": "Organization", name: BRAND, url: SITE },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: url,
    inLanguage: "en-IN",
    wordCount: words,
    ...(post.keywords?.length ? { keywords: post.keywords.join(", ") } : {}),
  };
}

/** Renders a JSON-LD block. */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data);
}
