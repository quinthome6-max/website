import Link from "next/link";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { DIWALI_GUIDE, diwaliSeason } from "@/lib/seasonal";

/**
 * Diwali on the homepage: the gifting guide, the candles, and a signup for our
 * picks by email. Gone by itself after Diwali (lib/seasonal.ts).
 *
 * It states delivery times rather than promising arrival before the festival:
 * orders take up to eight business days door to door.
 */
export function DiwaliBand() {
  if (!diwaliSeason()) return null;
  return (
    <section aria-labelledby="diwali-heading" className="bg-[color:var(--color-stardust)]">
      <div className="mx-auto grid max-w-[var(--container-page)] gap-12 px-6 py-14 md:grid-cols-[1.15fr_1fr] md:items-end md:gap-20 md:px-10 md:py-20">
        <div>
          <p className="font-eyebrow">Diwali · Sunday 8 November</p>
          <h2
            id="diwali-heading"
            className="mt-5 max-w-[20ch] text-balance"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-3xl)",
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              fontWeight: 400,
            }}
          >
            A gift that stays lit{" "}
            <em className="text-[color:var(--color-aerial-deep)]">long after the diyas.</em>
          </h2>
          <p className="mt-5 max-w-[48ch] text-[0.95rem] leading-[1.7] text-[color:var(--color-charcoal-soft)]">
            A waterless diffuser or a hand-poured soy candle: a gift for the home, used every day, that
            quietly recalls who gave it. Orders leave Mumbai within 3 business days and usually arrive 3–5
            business days later, so order early.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-5">
            <Link
              href={DIWALI_GUIDE}
              className="group inline-flex items-center gap-3 border-b border-[color:var(--color-charcoal)] pb-1.5 text-[0.72rem] uppercase tracking-[0.32em] transition-colors duration-500 hover:border-[color:var(--color-clay)] hover:text-[color:var(--color-clay)]"
            >
              Read the Diwali gifting guide <span aria-hidden>→</span>
            </Link>
            <Link
              href="/range/scented-candles"
              className="inline-flex items-center gap-3 pb-1.5 text-[0.72rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)] transition-colors duration-500 hover:text-[color:var(--color-clay)]"
            >
              Shop candles
            </Link>
          </div>
        </div>

        <div>
          <p className="font-eyebrow">Our Diwali picks, by email</p>
          <NewsletterForm
            source="diwali"
            className="mt-6 max-w-md"
            note="Gifting picks before Diwali, and first word of new scents after it. Occasional, never daily. Unsubscribe any time."
          />
        </div>
      </div>
    </section>
  );
}
