import Image from "next/image";
import Link from "next/link";
import { FadeUp } from "@/components/motion/fade-up";
import { candles } from "@/lib/data/candles";
import { PriceTag } from "@/components/product/price-tag";
import { getCommerceMap, shopifyHandle, pricePair } from "@/lib/shopify/commerce";

/**
 * The two scents you are not looking at, side by side: a small portrait and a
 * line or two beside it. With only three candles a full comparison table said
 * the same thing six times over — the useful difference is the room each one
 * suits, which fits in a sentence.
 */
export async function CandleCompare({ current }: { current?: string }) {
  const others = candles.filter((c) => c.slug !== current);
  if (!others.length) return null;

  // Same live prices the candle pages themselves show.
  const commerce = await getCommerceMap();

  return (
    <section className="border-t border-[color:var(--color-rule)] py-[var(--spacing-section-sm)]">
      <div className="mx-auto max-w-[var(--container-page)] px-6 md:px-10">
        <FadeUp>
          <h2 className="font-sans text-[0.6rem] uppercase leading-[1.65] tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
            The other soy candles
          </h2>
        </FadeUp>

        <div className="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-2 md:gap-x-10">
          {others.map((c, i) => (
            <FadeUp key={c.slug} delay={i * 0.06}>
              <Link
                href={`/range/${c.slug}`}
                className="group grid grid-cols-[12rem_1fr] items-center gap-5 border-t border-[color:var(--color-rule)] pt-6 md:grid-cols-[minmax(0,24rem)_1fr] md:gap-7 md:pt-8"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--color-stardust-soft)]">
                  <Image
                    src={c.image}
                    alt={`${c.name} – ${c.notesLine} soy wax candle`}
                    fill
                    sizes="(min-width: 768px) 24rem, 12rem"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-quint)] group-hover:scale-[1.05]"
                  />
                </div>

                <div>
                  <p className="text-[0.52rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)]">
                    {c.notesLine}
                  </p>
                  <h3
                    className="mt-1.5 transition-colors group-hover:text-[color:var(--color-clay)]"
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "var(--text-lg)",
                      letterSpacing: "-0.012em",
                      fontWeight: 400,
                    }}
                  >
                    {c.name}
                  </h3>
                  <p className="mt-1.5 max-w-[32ch] text-[0.82rem] leading-[1.55] text-[color:var(--color-charcoal-soft)]">
                    {c.tagline} For {c.placement.toLowerCase().replace(" · ", " and ")}.
                  </p>
                  <p className="mt-2.5 flex items-center gap-3 text-[0.54rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)]">
                    <PriceTag
                      {...pricePair(
                        commerce[shopifyHandle(c.name)],
                        c.priceINR,
                        c.listPriceINR
                      )}
                      className="tracking-normal text-[0.78rem] text-[color:var(--color-charcoal)]"
                      listClassName="text-[0.7rem]"
                    />
                    <span className="transition-transform duration-500 group-hover:translate-x-1">
                      View →
                    </span>
                  </p>
                </div>
              </Link>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
