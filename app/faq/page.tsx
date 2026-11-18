import Link from "next/link";
import { Monogram } from "@/components/brand/logo";
import type { Metadata } from "next";
import { FadeUp } from "@/components/motion/fade-up";

export const metadata: Metadata = {
  title: "Diffuser & Fragrance Oil FAQs",
  description:
    "How long an oil lasts, what coverage each diffuser gives, how waterless diffusion differs from ultrasonic, and how shipping and returns work.",
  alternates: { canonical: "/faq" },
};

import { faqJsonLd, breadcrumbJsonLd, jsonLdScript } from "@/lib/structured-data";
import { faqGroups } from "@/lib/data/faq";

const groups = faqGroups;

export default function FAQPage() {
  const faqEntries = groups.flatMap((g) =>
    g.items.map((it) => ({ q: it.q, a: it.a }))
  );

  return (
    <>
      {/* Built from `groups` above rather than written out separately: Google
          requires the marked-up question and answer to be visible on the page,
          and a hand-kept copy would drift out of step with it. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faqEntries)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "FAQ", path: "/faq" },
            ])
          ),
        }}
      />

    <article className="bg-[color:var(--color-white)]">
      {/* ====================================================
          § HERO
          ==================================================== */}
      <section className="border-b border-[color:var(--color-rule)] pt-10 md:pt-14">
        <div className="mx-auto max-w-[var(--container-page)] px-6 md:px-10">
          <div className="grid items-end gap-10 pb-12 md:grid-cols-12 md:gap-16">
            <FadeUp delay={0.05} className="md:col-span-7">
              <h1>
                <span className="block font-sans leading-[1.65] text-[0.62rem] uppercase tracking-[0.42em] text-[color:var(--color-charcoal-soft)]">
                  Diffuser &amp; fragrance oil FAQs
                </span>
                <span className="sr-only">. </span>
                <span className="block mt-7 max-w-[18ch] text-balance" style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--text-5xl)",
                  lineHeight: 0.96,
                  letterSpacing: "-0.024em",
                  fontWeight: 400,
                }}>
                  Your questions,{" "}
                  <em className="text-[color:var(--color-aerial-deep)]">
                    answered.
                  </em>
                </span>
              </h1>
            </FadeUp>

            <FadeUp delay={0.1} className="md:col-span-5">
              <p className="max-w-[40ch] text-[var(--text-base)] leading-[1.85] text-[color:var(--color-charcoal-soft)]">
                If your question isn’t answered below, write to us at
                hello@quinthome.in – we reply within 24 hours.
              </p>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ====================================================
          § GROUPS
          ==================================================== */}
      <section className="py-[var(--spacing-section)]">
        <div className="mx-auto max-w-[var(--container-page)] px-6 md:px-10">
          <div className="grid gap-y-16 md:gap-y-24">
            {groups.map((group) => (
              <div key={group.chapter} className="grid gap-10 md:grid-cols-12 md:gap-16">
                <FadeUp className="md:col-span-4">
                  <div className="md:sticky md:top-32">
                    <p className="text-[0.62rem] uppercase tracking-[0.42em] text-[color:var(--color-charcoal-soft)]">
                      <Monogram className="mr-1.5 inline-block h-[0.9em] w-[0.9em] align-[-0.12em]" />{group.chapter}                    </p>
                    <h2
                      className="mt-5"
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "var(--text-2xl)",
                        lineHeight: 1.1,
                        letterSpacing: "-0.014em",
                        fontWeight: 400,
                      }}
                    >
                      {group.label}
                    </h2>
                  </div>
                </FadeUp>

                <div className="md:col-span-8">
                  <div className="grid gap-px overflow-hidden border-y border-[color:var(--color-rule)] bg-[color:var(--color-rule)]">
                    {group.items.map((item, i) => (
                      <FadeUp key={i} delay={i * 0.04} as="div" className="bg-[color:var(--color-white)]">
                        <details className="group">
                          <summary className="flex cursor-pointer items-baseline justify-between gap-6 py-7 list-none hover:text-[color:var(--color-clay)] transition-colors duration-300">
                            <h3
                              className="max-w-[48ch] text-[var(--text-base)]"
                              style={{
                                fontFamily: "var(--font-serif)",
                                fontSize: "var(--text-lg)",
                                lineHeight: 1.3,
                                letterSpacing: "-0.008em",
                                fontWeight: 400,
                              }}
                            >
                              {item.q}
                            </h3>
                            <span className="shrink-0 text-[0.78rem] text-[color:var(--color-charcoal-soft)] transition-transform duration-500 group-open:rotate-45">
                              +
                            </span>
                          </summary>
                          <div className="max-w-[58ch] space-y-4 pb-7 text-[var(--text-base)] leading-[1.85] text-[color:var(--color-charcoal-soft)]">
                            {item.a.split("\n\n").map((para, pi) => (
                              <p key={pi}>{para}</p>
                            ))}
                          </div>
                        </details>
                      </FadeUp>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          § CLOSING
          ==================================================== */}
      <section className="bg-[color:var(--color-stardust-soft)] py-[var(--spacing-section)]">
        <div className="mx-auto max-w-[var(--container-content)] px-6 text-center md:px-10">
          <FadeUp>
            <p className="mx-auto w-fit text-[0.62rem] uppercase tracking-[0.42em] text-[color:var(--color-charcoal-soft)]">
              <Monogram className="mr-1.5 inline-block h-[0.9em] w-[0.9em] align-[-0.12em]" />Still curious
            </p>
          </FadeUp>
          <FadeUp delay={0.08}>
            <h2
              className="mx-auto mt-6 max-w-[22ch] text-balance"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "var(--text-3xl)",
                lineHeight: 1.1,
                letterSpacing: "-0.016em",
                fontWeight: 400,
              }}
            >
              Write to us.{" "}
              <em className="text-[color:var(--color-aerial-deep)]">
                We answer everything personally.
              </em>
            </h2>
          </FadeUp>
          <FadeUp delay={0.16}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-3 border-b border-[color:var(--color-charcoal)] pb-1.5 text-[0.72rem] uppercase tracking-[0.32em] transition-colors duration-500 hover:text-[color:var(--color-clay)] hover:border-[color:var(--color-clay)]"
              >
                Contact us
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
              <a
                href="mailto:hello@quinthome.in"
                className="text-[0.72rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)] hover:text-[color:var(--color-charcoal)]"
              >
                hello@quinthome.in
              </a>
            </div>
          </FadeUp>
        </div>
      </section>
    </article>
    </>
  );
}
