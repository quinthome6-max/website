"use client";

import { FadeUp } from "@/components/motion/fade-up";
import { Breadcrumbs, CATEGORY_CRUMB } from "@/components/layout/breadcrumbs";
import { Monogram } from "@/components/brand/logo";
import { ProductGallery } from "@/components/product/product-gallery";
import { AddToBag } from "@/components/product/add-to-bag";
import { MobileBuyBar } from "@/components/product/mobile-buy-bar";
import { PairBundle, type PairOption } from "@/components/product/pair-bundle";
import { diffusers } from "@/lib/data/diffusers";
import type { FragranceOil } from "@/lib/types";
import { shopifyHandle, sellableVariant, type ShopifyCommerce } from "@/lib/shopify/commerce";
import { COMPLIMENTARY_OIL } from "@/lib/cart-gift";
import { RatingLine } from "@/components/reviews/rating-line";
import type { ReviewSummary } from "@/lib/reviews/store";

/**
 * Oil PDP – bottle study on the left (sticky), and a single right column that
 * carries the buy box, then the overview, the notes and the specifications.
 * Mirrors the diffuser PDP layout. (No subscription: it was never built, so
 * the page no longer offers one.)
 */
export function OilHero({
  oil,
  commerce,
  commerceMap,
  reviewSummary,
}: {
  oil: FragranceOil;
  /** Approved reviews only; shown as stars under the name. */
  reviewSummary: ReviewSummary;
  commerce?: ShopifyCommerce;
  /** Whole catalogue, so bundle partners can resolve their Shopify variant. */
  commerceMap?: Record<string, ShopifyCommerce>;
}) {
  const variant = sellableVariant(commerce);
  // Pair-with-a-diffuser options for the bundle control.
  const diffuserOptions: PairOption[] = diffusers.map((d) => {
    // Priced from Shopify, for the same reason as the oils on the diffuser PDP.
    const diffuserVariant = sellableVariant(commerceMap?.[shopifyHandle(d.name)]);
    return {
      slug: d.slug,
      name: d.name,
      priceINR: diffuserVariant?.price ?? d.priceINR,
      image: d.image,
      variantId: diffuserVariant?.id,
      meta: d.coverageLabel,
    };
  });

  const descriptionParagraphs = oil.description.split("\n\n");

  // A styled note-pyramid card per scent (top/heart/base ingredients, shot).
  const notesImage = `/images/oils/notes/${oil.slug}.webp`;

  const NOTES = [
    ["Top", oil.notes.top],
    ["Heart", oil.notes.heart],
    ["Base", oil.notes.base],
  ] as const;

  // Oil specifications – from the website brief's "Fragrance Oil Specifications".
  const techSpecs: { label: string; value: string }[] = [
    { label: "Volume", value: `${oil.volumeML} ml per bottle` },
    { label: "Concentration", value: "70–90% fragrance – no water dilution" },
    { label: "Composition", value: "Top, heart and base notes" },
    { label: "Compliance", value: "IFRA-compliant" },
    { label: "Lasts", value: "Approximately 45–60 days, depending on usage intensity" },
    { label: "Coverage", value: "A steady background scent over several hours" },
    { label: "Compatible with", value: "Quint Home waterless diffusers" },
  ];

  const sectionLabel =
    "text-[0.62rem] uppercase tracking-[0.42em] text-[color:var(--color-charcoal-soft)]";

  // Designed specifications slide – the third gallery photo (a visual spec
  // sheet, not a plain table).
  const specsCard = (
    <div className="flex h-full w-full flex-col justify-center overflow-hidden bg-[color:var(--color-stardust-soft)] px-7 py-6 md:px-9 md:py-8">
      <div className="flex items-center gap-3">
        <Monogram className="h-5 w-5 text-[color:var(--color-clay)]" />
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: oil.swatch }}
        />
      </div>
      <p className="mt-4 text-[0.54rem] uppercase tracking-[0.42em] text-[color:var(--color-charcoal-soft)]">
        Specifications
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
        {oil.name}
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
      <p className="mt-4 text-[0.58rem] leading-[1.45] text-[color:var(--color-charcoal-soft)]">
        For external use only. Do not spray directly on or near eyes, face, or
        skin.
      </p>
    </div>
  );

  return (
    <>
    <section className="border-b border-[color:var(--color-rule)] pt-10 md:pt-14">
      <div className="mx-auto grid max-w-[var(--container-page)] gap-12 px-6 pb-[var(--spacing-section)] md:px-10 lg:grid-cols-[minmax(0,38rem)_minmax(0,40rem)] lg:justify-center lg:gap-16">
        {/* ===== Bottle study – sticky on the left ===== */}
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <FadeUp>
            <Breadcrumbs
              className="mb-6"
              trail={[
                { label: "Home", href: "/" },
                { label: "The Range", href: "/range" },
                CATEGORY_CRUMB.oil,
                { label: oil.name },
              ]}
            />
          </FadeUp>
          <FadeUp delay={0.05}>
            <ProductGallery
              images={[oil.image, notesImage]}
              alt={`${oil.name} – bottle study`}
              cards={[
                { key: "specs", thumbLabel: "Specs", content: specsCard },
              ]}
            />
          </FadeUp>
        </div>

        {/* ===== Right column – buy box, overview, notes, specs ===== */}
        <aside className="min-w-0">
          {/* --- Buy box --- */}
          <FadeUp>
            <p className="flex items-center gap-3 text-[0.62rem] uppercase tracking-[0.42em] text-[color:var(--color-charcoal-soft)]">
              Fragrance Oil · {oil.volumeML} ml
              {oil.tier === "hotel-credential" && (
                <span className="rounded-full border border-current px-2 py-0.5 text-[0.5rem] tracking-[0.28em]">
                  Hotel Credential
                </span>
              )}
            </p>
          </FadeUp>

          <FadeUp delay={0.06}>
            <h1
              className="mt-6 text-balance"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "var(--text-5xl)",
                lineHeight: 1.0,
                letterSpacing: "-0.024em",
                fontWeight: 400,
              }}
            >
              {oil.name}
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
              {oil.tagline}
            </p>
          </FadeUp>

          <FadeUp delay={0.18}>
            <div id="buy" className="mt-8 scroll-mt-24">
              <AddToBag
                priceINR={variant?.price ?? oil.priceINR}
                listPriceINR={variant?.compareAt}
                variantId={variant?.id}
                // No Shopify variant means the product is not sellable yet (a new
                // listing not imported, or one unpublished from this channel).
                // Defaulting to "available" let a customer bag something that
                // cannot be bought.
                available={variant ? variant.available : false}
              />
            </div>
          </FadeUp>

          {/* Bundle – pair with a diffuser */}
          <FadeUp delay={0.22}>
            <div className="mt-8">
              <p className="mb-3 text-[0.62rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
                Make it a set
              </p>
              <PairBundle
                basePriceINR={variant?.price ?? oil.priceINR}
                baseName={oil.name}
                // A diffuser added here also ships with its complimentary
                // bottle, but this page has no scent picker — so it defaults to
                // the oil being bought. Change it on the order if the customer
                // asks for a different one.
                partnerAttributes={[
                  {
                    key: COMPLIMENTARY_OIL,
                    value: `${oil.name} · ${oil.volumeML} ml`,
                  },
                ]}
                partnerNoun="diffuser"
                heading="Add a diffuser"
                options={diffuserOptions}
              />
            </div>
          </FadeUp>

          {/* Assurances */}
          <FadeUp delay={0.26}>
            <ul className="mt-8 grid gap-2.5 border-t border-[color:var(--color-rule)] pt-8 text-[0.8rem] leading-[1.5] text-[color:var(--color-charcoal-soft)]">
              <li className="flex items-baseline gap-3">
                <span className="text-[color:var(--color-clay)]">–</span>
                IFRA-compliant, blended like fine perfumery.
              </li>
              <li className="flex items-baseline gap-3">
                <span className="text-[color:var(--color-clay)]">–</span>
                Compatible with Quint Home waterless diffusers.
              </li>
              <li className="flex items-baseline gap-3">
                <span className="text-[color:var(--color-clay)]">–</span>
                Free with every room diffuser: your first 50 ml.
              </li>
            </ul>
          </FadeUp>

          {/* --- Overview --- */}
          <FadeUp delay={0.06}>
            <div className="mt-14 border-t border-[color:var(--color-rule)] pt-10">
              <p className={sectionLabel}>Overview</p>
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
                  Profile
                </span>
                <span className="text-[0.9rem] text-[color:var(--color-charcoal)]">
                  {oil.mood} · {oil.origin}
                </span>
              </div>
            </div>
          </FadeUp>

          {/* --- The notes --- */}
          <FadeUp delay={0.06}>
            <div className="mt-12 border-t border-[color:var(--color-rule)] pt-10">
              <p className={sectionLabel}>The notes</p>
              <dl className="mt-6 border-t border-[color:var(--color-rule)]">
                {NOTES.map(([label, arr]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[8.5rem_1fr] gap-4 border-b border-[color:var(--color-rule)] py-3.5"
                  >
                    <dt className="pt-0.5 text-[0.56rem] uppercase tracking-[0.26em] text-[color:var(--color-charcoal-soft)]">
                      {label}
                    </dt>
                    <dd className="text-[0.9rem] leading-[1.5] text-[color:var(--color-charcoal)]">
                      {arr.join(", ")}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </FadeUp>

          {/* Specifications live as the designed "Specs" slide in the gallery
              (specsCard) — no duplicate text section here. */}
        </aside>
      </div>
    </section>
    <MobileBuyBar
      name={oil.name}
      priceINR={variant?.price ?? oil.priceINR}
      listPriceINR={variant?.compareAt}
    />
    </>
  );
}
