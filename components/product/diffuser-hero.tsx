"use client";

import { useState } from "react";
import { FadeUp } from "@/components/motion/fade-up";
import { Breadcrumbs, CATEGORY_CRUMB } from "@/components/layout/breadcrumbs";
import { Monogram } from "@/components/brand/logo";
import { ProductGallery } from "@/components/product/product-gallery";
import { AddToBag } from "@/components/product/add-to-bag";
import { MobileBuyBar } from "@/components/product/mobile-buy-bar";
import { OilPicker } from "@/components/product/oil-picker";
import { PairBundle, type PairOption } from "@/components/product/pair-bundle";
import { oils, oilNoteSummary } from "@/lib/data/oils";
import { cn } from "@/lib/utils";
import { RatingLine } from "@/components/reviews/rating-line";
import type { ReviewSummary } from "@/lib/reviews/store";
import type { Diffuser } from "@/lib/types";
import {
  shopifyHandle,
  sellableVariant,
  variantPricePair,
  type ShopifyCommerce,
} from "@/lib/shopify/commerce";
import { COMPLIMENTARY_OIL, giftVariantFor } from "@/lib/cart-gift";

/**
 * Diffuser PDP – images on the left (sticky), and a single right column. The
 * buy box (price + add to bag) sits at the top, followed immediately by the
 * overview and key features so the product story is reachable without scrolling
 * past the configurators; the "included oil" picker and bundle sit below. The
 * technical specifications live as their own slide in the gallery carousel.
 */
export function DiffuserHero({
  product,
  commerce,
  commerceMap,
  reviewSummary,
}: {
  product: Diffuser;
  /** Approved reviews only; shown as stars under the name. */
  reviewSummary: ReviewSummary;
  commerce?: ShopifyCommerce;
  /** Whole catalogue, so bundle partners can resolve their Shopify variant. */
  commerceMap?: Record<string, ShopifyCommerce>;
}) {
  const colors = product.colors;
  const [active, setActive] = useState(0);
  const color = colors?.[active];

  // Match the Shopify variant to the selected finish (or the sole variant).
  const variant =
    colors && colors.length > 1
      ? commerce?.variants.find((v) => v.options.Finish === color?.name)
      : sellableVariant(commerce);

  // Price and list price for the selected finish, resolved together so the
  // strikethrough can never be measured against a price from the other source.
  const buy = variantPricePair(variant, product.priceINR, product.listPriceINR);

  const gallery = color?.gallery ?? product.gallery;

  // Finish-specific copy – when a colour variant carries its own tagline /
  // description / key features, they replace the product-level defaults while
  // that finish is selected (e.g. the A326 in gold vs black).
  const tagline = color?.tagline ?? product.tagline;
  const keyFeatures = color?.keyFeatures ?? product.keyFeatures;

  // Included starting oil – chosen here rather than at checkout. A scent can
  // only be offered when the store actually holds a free bottle of it:
  // otherwise the diffuser goes in the bag alone and the customer is quietly
  // short a ₹899 oil the page promised them.
  const giftableOils = oils.filter((o) => giftVariantFor(o.name, commerceMap));
  const offeredOils = giftableOils.length ? giftableOils : oils;
  const [oilSlug, setOilSlug] = useState(offeredOils[0].slug);
  const selectedOil =
    offeredOils.find((o) => o.slug === oilSlug) ?? offeredOils[0];

  // The complimentary bottle that ships with every diffuser. It is not a line
  // item of its own, so this note is the only record of it — in the bag, on the
  // Shopify order and on the packing slip. Every path that puts a diffuser in
  // the bag has to carry it, or the scent the customer picked is lost (which is
  // exactly what the bundle button used to do).
  // The ₹0 variant of whichever scent is selected. Null when the store has no
  // gift variant for it yet — the note still records what is owed.
  const giftVariantId = product.includesOil
    ? (giftVariantFor(selectedOil.name, commerceMap)?.id ?? null)
    : null;

  const complimentaryOil = product.includesOil
    ? [
        {
          key: COMPLIMENTARY_OIL,
          value: `${selectedOil.name} · ${selectedOil.volumeML} ml`,
        },
      ]
    : undefined;

  const descriptionParagraphs = (color?.description ?? product.description).split(
    "\n\n"
  );

  // Bundle – add an extra oil to the order at a discount. Carry the note
  // summary so the picker reads as a fragrance, not just a name.
  const oilOptions: PairOption[] = oils.map((o) => {
    // Shopify is the source of truth for price. Quoting the catalogue figure
    // here while adding the Shopify variant to the bag is how the bundle came
    // to promise one total and charge another.
    const oilVariant = sellableVariant(commerceMap?.[shopifyHandle(o.name)]);
    return {
      slug: o.slug,
      name: o.name,
      priceINR: oilVariant?.price ?? o.priceINR,
      image: o.image,
      variantId: oilVariant?.id,
      meta: o.mood,
      note: oilNoteSummary(o),
    };
  });

  // Technical specifications – the per-model spec sheet, taken verbatim from the
  // Aroma Diffuser Collection product catalogue.
  const techSpecs = product.specs;

  const sectionLabel =
    "text-[0.62rem] uppercase tracking-[0.42em] text-[color:var(--color-charcoal-soft)]";

  // Designed specifications slide – the last gallery photo (a visual spec sheet,
  // not a plain table in the column).
  const specsCard = (
    <div className="flex h-full w-full flex-col justify-center overflow-hidden bg-[color:var(--color-stardust-soft)] px-7 py-6 md:px-9 md:py-8">
      <div className="flex items-center gap-3">
        <Monogram className="h-5 w-5 text-[color:var(--color-clay)]" />
        {color && (
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color.swatch }}
          />
        )}
      </div>
      <p className="mt-4 text-[0.54rem] uppercase tracking-[0.42em] text-[color:var(--color-charcoal-soft)]">
        Technical specifications
      </p>
      <p
        className="mt-1.5 text-[color:var(--color-charcoal)]"
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.35rem",
          lineHeight: 1.05,
          letterSpacing: "-0.01em",
        }}
      >
        {product.name}
      </p>
      <dl className="mt-4 border-t border-[color:var(--color-rule)]">
        {techSpecs.map((s) => (
          <div
            key={s.label}
            className="grid grid-cols-[6.5rem_1fr] gap-3 border-b border-[color:var(--color-rule)] py-1.5"
          >
            <dt className="pt-0.5 text-[0.54rem] uppercase tracking-[0.18em] text-[color:var(--color-charcoal-soft)]">
              {s.label}
            </dt>
            <dd className="text-[0.75rem] leading-snug text-[color:var(--color-charcoal)]">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <>
    <section className="border-b border-[color:var(--color-rule)] pt-10 md:pt-14">
      <div className="mx-auto grid max-w-[var(--container-page)] gap-12 px-6 pb-[var(--spacing-section)] md:px-10 lg:grid-cols-[minmax(0,38rem)_minmax(0,40rem)] lg:justify-center lg:gap-16">
        {/* ===== Gallery – sticky on the left ===== */}
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <FadeUp>
            <Breadcrumbs
              className="mb-6"
              trail={[
                { label: "Home", href: "/" },
                { label: "The Range", href: "/range" },
                CATEGORY_CRUMB.diffuser,
                { label: product.name },
              ]}
            />
          </FadeUp>
          <FadeUp delay={0.05}>
            {/* key={active} remounts the gallery so it resets to the new colour's first image */}
            <ProductGallery
              key={active}
              images={gallery}
              alt={`${product.name}${color ? ` – ${color.name}` : ""} – Quint Home`}
              cards={[{ key: "specs", thumbLabel: "Specs", content: specsCard }]}
              // The key-features sheet closes the gallery, after the specs.
              after={product.featuresImage ? [product.featuresImage] : []}
            />
          </FadeUp>
        </div>

        {/* ===== Right column – buy box, overview, key features, then configurators ===== */}
        <aside className="min-w-0">
          {/* --- Buy box --- */}
          {/* One H1 for the name and the kind of product ("The Monolith,
              waterless aroma diffuser"). Reversed so the kind still shows as
              the small label above the name. */}
          <FadeUp>
            <h1 className="flex flex-col-reverse">
              <span
                className="mt-6 block text-balance"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--text-5xl)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.024em",
                  fontWeight: 400,
                }}
              >
                {product.name}
              </span>
              <span className="sr-only">, </span>
              <span className={cn(sectionLabel, "block font-sans leading-[1.65]")}>
                {product.coverageSqFt ? "Waterless aroma diffuser" : "Waterless car diffuser"}
              </span>
            </h1>
          </FadeUp>

          {/* Stars just under the name: the average and count of approved
               reviews, or an invitation to write the first one. */}
          <FadeUp delay={0.09}>
            <div className="mt-4">
              <RatingLine summary={reviewSummary} />
            </div>
          </FadeUp>

          <FadeUp delay={0.12}>
            <p className="mt-5 max-w-[40ch] text-[var(--text-lg)] leading-[1.5] text-[color:var(--color-charcoal-soft)]">
              {tagline}
            </p>
          </FadeUp>

          {/* Overview – the reasons to buy, straight under the name, before the
               price. Open by default so the pointers are read, not hunted for;
               a native <details> so it collapses without any script. */}
          <FadeUp delay={0.14}>
            <details
              open
              className="group mt-7 border-y border-[color:var(--color-rule)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between py-4 [&::-webkit-details-marker]:hidden">
                <span className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-[color:var(--color-charcoal)]">
                  Overview
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                  className="h-4 w-4 text-[color:var(--color-charcoal-soft)] transition-transform duration-300 group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <ul className="grid gap-2.5 pb-5">
                {product.highlights.map((h) => (
                  <li
                    key={h}
                    className="flex gap-3 text-[0.95rem] leading-[1.45] text-[color:var(--color-charcoal)]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="mt-[0.2em] h-4 w-4 shrink-0 text-[color:var(--color-clay)]"
                    >
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                    {h}
                  </li>
                ))}
              </ul>
            </details>
          </FadeUp>

          {/* Colour selector – only when the model ships in more than one finish */}
          {colors && colors.length > 1 && (
            <FadeUp delay={0.16}>
              <div className="mt-7">
                <p className="text-[0.66rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)]">
                  Finish – {color?.name}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  {colors.map((c, i) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setActive(i)}
                      aria-label={c.name}
                      aria-pressed={i === active}
                      title={c.name}
                      className={cn(
                        "relative h-8 w-8 rounded-full transition-transform duration-300 hover:scale-105",
                        i === active
                          ? "ring-1 ring-[color:var(--color-charcoal)] ring-offset-2 ring-offset-[color:var(--color-white)]"
                          : "ring-1 ring-[color:var(--color-rule)]"
                      )}
                      style={{ backgroundColor: c.swatch }}
                    />
                  ))}
                </div>
              </div>
            </FadeUp>
          )}

          {/* Price + Add to bag – directly under the finish, so the price and
               the button are in view with the product. The included oil is a
               single bar above the button; its tiles open in a popup. */}
          <FadeUp delay={0.18}>
            <div id="buy" className="mt-8 scroll-mt-24">
              {/* No subscribe & save on diffusers – that offer is for the oils only */}
              <AddToBag
                priceINR={buy.price}
                listPriceINR={buy.listPrice}
                subscribeOffer={false}
                variantId={variant?.id}
                // No Shopify variant means the product is not sellable yet (a new
                // listing not imported, or one unpublished from this channel).
                // Defaulting to "available" let a customer bag something that
                // cannot be bought.
                available={variant ? variant.available : false}
                attributes={complimentaryOil}
                giftVariantId={giftVariantId}
                warranty
                // The included oil is chosen in a bar right above the button;
                // its tiles open in a popup rather than filling the column.
                beforeButton={
                  product.includesOil ? (
                    <OilPicker
                      oils={offeredOils}
                      value={selectedOil.slug}
                      onChange={setOilSlug}
                    />
                  ) : undefined
                }
              />
            </div>
          </FadeUp>

          {/* Bundle – add another oil to the set */}
          <FadeUp delay={0.24}>
            <div className="mt-12 border-t border-[color:var(--color-rule)] pt-10">
              <p className="mb-3 text-[0.62rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
                Build your set
              </p>
              <PairBundle
                basePriceINR={variant?.price ?? product.priceINR}
                baseName={product.name}
                partnerNoun="oil"
                // The Drift ships without an oil, so there is no "another".
                heading={product.includesOil ? "Add another oil" : "Add an oil"}
                options={oilOptions}
              />
            </div>
          </FadeUp>

          {/* Assurances */}
          <FadeUp delay={0.24}>
            <ul className="mt-8 grid gap-2.5 border-t border-[color:var(--color-rule)] pt-8 text-[0.8rem] leading-[1.5] text-[color:var(--color-charcoal-soft)]">
              {/* The warranty now sits in the trust strip under the button. */}
              {product.includesOil && (
                <li className="flex items-baseline gap-3">
                  <span className="text-[color:var(--color-clay)]">–</span>
                  Ships with your chosen 50 ml oil, ready to use.
                </li>
              )}
              <li className="flex items-baseline gap-3">
                <span className="text-[color:var(--color-clay)]">–</span>
                IFRA-compliant oils at 70–90% concentration.
              </li>
            </ul>
          </FadeUp>

          {/* --- Description – the long-form story, after the configurators --- */}
          <FadeUp delay={0.06}>
            <div className="mt-14 border-t border-[color:var(--color-rule)] pt-10">
              <h2 className={cn(sectionLabel, "font-sans leading-[1.65]")}>About the {product.name.replace(/^The /, "")}</h2>
              <div className="mt-6 space-y-5">
                {descriptionParagraphs.map((para, i) => (
                  <p
                    key={i}
                    className={
                      i === 0
                        ? "text-[var(--text-lg)] leading-[1.6] text-[color:var(--color-charcoal)]"
                        : "text-[0.95rem] leading-[1.8] text-[color:var(--color-charcoal-soft)]"
                    }
                  >
                    {para}
                  </p>
                ))}
              </div>
              <div className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[color:var(--color-rule)] pt-5">
                <span className="text-[0.58rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
                  Best for
                </span>
                <span className="text-[0.9rem] text-[color:var(--color-charcoal)]">
                  {product.bestFor.join("  ·  ")}
                </span>
              </div>
            </div>
          </FadeUp>

          {/* --- Key features – moved up --- */}
          <FadeUp delay={0.06}>
            <div className="mt-12 border-t border-[color:var(--color-rule)] pt-10">
              <h2 className={cn(sectionLabel, "font-sans leading-[1.65]")}>Key features</h2>
              <ul className="mt-6 grid gap-4">
                {keyFeatures.map((feature, i) => {
                  const dash = feature.indexOf(" – ");
                  const lead = dash > -1 ? feature.slice(0, dash) : feature;
                  const desc = dash > -1 ? feature.slice(dash + 3) : "";
                  return (
                    <li key={i} className="flex gap-4">
                      <span className="shrink-0 pt-0.5 text-[0.7rem] tabular-nums text-[color:var(--color-clay)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.95rem] leading-[1.4] text-[color:var(--color-charcoal)]">
                          {lead}
                        </p>
                        {desc && (
                          <p className="mt-1 text-[0.84rem] leading-[1.55] text-[color:var(--color-charcoal-soft)]">
                            {desc}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </FadeUp>

        </aside>
      </div>
    </section>
    <MobileBuyBar
      name={product.name}
      priceINR={buy.price}
      listPriceINR={buy.listPrice}
    />
    </>
  );
}
