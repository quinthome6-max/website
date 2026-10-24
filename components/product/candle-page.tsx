import { AddToBag } from "@/components/product/add-to-bag";
import { ProductGallery } from "@/components/product/product-gallery";
import { CandleCompare } from "@/components/product/candle-compare";
import { CandleScenes } from "@/components/product/candle-scenes";
import { TrackView } from "@/components/analytics/track-view";
import { pixelId } from "@/lib/analytics/pixel";
import { FadeUp } from "@/components/motion/fade-up";
import { Breadcrumbs, CATEGORY_CRUMB } from "@/components/layout/breadcrumbs";
import { CANDLE_CARE, CANDLE_MAKE } from "@/lib/data/candles";
import { getCommerceByName } from "@/lib/shopify/commerce";
import { sellableVariant, variantPricePair } from "@/lib/shopify/commerce";
import {
  breadcrumbJsonLd,
  jsonLdScript,
  productJsonLd,
} from "@/lib/structured-data";
import type { Candle } from "@/lib/types";
import { RatingLine } from "@/components/reviews/rating-line";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { approvedReviews, summarize } from "@/lib/reviews/store";

/**
 * Candle PDP. Deliberately simpler than the diffuser and oil pages: a candle
 * has one variant, no app, no bundle. Everything printed here comes off the
 * label – weight, wax, burn time, the two-note fragrance line and the care
 * instructions – so the page and the product in the customer's hand agree.
 */
export async function CandleProductPage({ candle }: { candle: Candle }) {
  const commerce = await getCommerceByName(candle.name);
  const variant = sellableVariant(commerce);
  const { price, listPrice } = variantPricePair(
    variant,
    candle.priceINR,
    candle.listPriceINR
  );
  // Approved reviews only – pending ones never reach the page.
  const reviews = await approvedReviews(candle.slug);

  return (
    <div className="pb-[var(--spacing-section)]">
      <TrackView
        id={pixelId(variant?.id ?? candle.slug)}
        name={candle.name}
        value={price}
        category="Candle"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(productJsonLd(candle, commerce, price, reviews)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "The Range", path: "/range" },
              { name: CATEGORY_CRUMB.candle.label, path: CATEGORY_CRUMB.candle.href },
              { name: candle.name, path: `/range/${candle.slug}` },
            ])
          ),
        }}
      />
      <section className="mx-auto max-w-[var(--container-page)] px-6 pt-6 md:px-10 md:pt-10">
        <Breadcrumbs
          trail={[
            { label: "Home", href: "/" },
            { label: "The Range", href: "/range" },
            CATEGORY_CRUMB.candle,
            { label: candle.name },
          ]}
        />

        <div className="mt-8 grid gap-10 md:mt-12 lg:grid-cols-[minmax(0,32rem)_minmax(0,40rem)] lg:justify-center lg:gap-16">
          {/* ── Image ── */}
          <FadeUp>
            <ProductGallery
              images={candle.gallery}
              alt={`${candle.name} – ${candle.notesLine} soy wax candle – Quint Home`}
            />
          </FadeUp>

          {/* ── Detail ── */}
          <FadeUp delay={0.08}>
            <div className="md:pt-4">
              {/* One H1 for the name and the kind of product. Reversed so the
                  notes still show as the small label above the name. */}
              <h1 className="flex flex-col-reverse">
                <span
                  className="mt-4 block text-balance"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "var(--text-3xl)",
                    lineHeight: 1.06,
                    letterSpacing: "-0.018em",
                    fontWeight: 400,
                  }}
                >
                  {candle.name}.{" "}
                  <em className="text-[color:var(--color-aerial-deep)]">
                    {candle.tagline}
                  </em>
                </span>{" "}
                <span className="block font-sans text-[0.6rem] uppercase leading-[1.65] tracking-[0.32em] text-[color:var(--color-clay-text)]">
                  {candle.notesLine} soy candle
                </span>
              </h1>

              {/* Stars just under the name */}
              <div className="mt-4">
                <RatingLine summary={summarize(reviews)} />
              </div>

              <p className="mt-6 max-w-[46ch] text-[0.92rem] leading-[1.7] text-[color:var(--color-charcoal)]">
                {candle.description}
              </p>
              <p className="mt-4 max-w-[46ch] text-[0.86rem] leading-[1.7] text-[color:var(--color-charcoal-soft)]">
                {CANDLE_MAKE}
              </p>

              <dl className="mt-8 border-t border-[color:var(--color-rule)]">
                {[
                  ["Fragrance", candle.notesLine],
                  ["Volume", `${candle.volumeML} ml`],
                  ["Wax", "100% soy wax"],
                  ["Burn time", `Up to ${candle.burnHours} hours`],
                  ["Made", "Hand-poured in India"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-[color:var(--color-rule-soft)] py-3 text-[0.84rem]"
                  >
                    <dt className="text-[0.56rem] uppercase tracking-[0.24em] text-[color:var(--color-charcoal-soft)]">
                      {label}
                    </dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8">
                <AddToBag
                  priceINR={price}
                  listPriceINR={listPrice}
                  variantId={variant?.id}
                  available={variant ? variant.available : false}
                />
              </div>

              <p className="mt-6 max-w-[46ch] text-[0.78rem] leading-[1.65] text-[color:var(--color-charcoal-soft)]">
                {CANDLE_CARE}
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      <CandleScenes candle={candle} />

      {/* Reviews, just above the comparison */}
      <ReviewsSection slug={candle.slug} productName={candle.name} reviews={reviews} />

      <CandleCompare current={candle.slug} />

    </div>
  );
}
