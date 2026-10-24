import type { Metadata } from "next";
import Image from "next/image";
import { FadeUp } from "@/components/motion/fade-up";
import { EnquiryForm } from "@/components/business/enquiry-form";

export const metadata: Metadata = {
  title: "Scent Marketing & Commercial Diffusers",
  description:
    "Commercial aroma diffusers, bulk fragrance oil and signature scents for hotels, offices and retail across India. We reply within 48 hours.",
  alternates: { canonical: "/businesses" },
};

const offerings = [
  {
    no: "01",
    title: "Commercial Machines",
    body: "Designed for continuous use, from compact entryways to full-floor coverage.",
  },
  {
    no: "02",
    title: "Bulk Orders",
    body: "Preferential pricing on devices and oils for multi-site and multi-location rollouts.",
  },
  {
    no: "03",
    title: "Signature Scents",
    body: "A fragrance developed exclusively for you – and no one else.",
  },
];

export default function BusinessesPage() {
  return (
    <article className="bg-[color:var(--color-white)]">
      {/* ===== HERO – text on brand green ===== */}
      <section className="border-b border-[color:var(--color-stardust)]/10 bg-[color:var(--color-verdant)] pb-[var(--spacing-section)] pt-16 text-[color:var(--color-stardust)] md:pt-24">
        <div className="mx-auto w-[100%] max-w-[var(--container-page)] px-6 md:px-10">
          <FadeUp>
            <p className="text-[0.62rem] uppercase tracking-[0.42em] text-[color:var(--color-stardust)]/70">
              For Businesses
            </p>
          </FadeUp>
          <FadeUp delay={0.06}>
            <h1
              className="mt-6 max-w-[14ch] text-balance text-[color:var(--color-white)]"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "var(--text-6xl)",
                lineHeight: 0.95,
                letterSpacing: "-0.026em",
                fontWeight: 400,
              }}
            >
              Scent your{" "}
              <em className="not-italic text-[color:var(--color-aerial)]">
                space.
              </em>
            </h1>
          </FadeUp>
          <FadeUp delay={0.12}>
            <p className="mt-7 max-w-[44ch] text-[var(--text-base)] leading-[1.7] text-[color:var(--color-stardust)]/80">
              Fragrance devices and customization for hospitality, dining,
              retail and exclusive spaces.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ===== OFFERINGS – three tight columns ===== */}
      <section className="py-[var(--spacing-section)]">
        <div className="mx-auto max-w-[var(--container-page)] px-6 md:px-10">
          <div className="grid gap-x-12 gap-y-10 border-t border-[color:var(--color-rule)] pt-10 md:grid-cols-3">
            {offerings.map((o, i) => (
              <FadeUp key={o.no} delay={i * 0.06}>
                <div>
                  <span
                    className="block tabular-nums text-[color:var(--color-aerial-deep)]"
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "var(--text-3xl)",
                      lineHeight: 1,
                      fontWeight: 400,
                    }}
                  >
                    {o.no}
                  </span>
                  <h2
                    className="mt-4"
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "var(--text-2xl)",
                      lineHeight: 1.1,
                      letterSpacing: "-0.014em",
                      fontWeight: 400,
                    }}
                  >
                    {o.title}
                  </h2>
                  <p className="mt-3 max-w-[34ch] text-[0.95rem] leading-[1.7] text-[color:var(--color-charcoal-soft)]">
                    {o.body}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ===== EDITORIAL IMAGE BAND ===== */}
      <section className="relative isolate flex min-h-[56svh] items-center overflow-hidden text-[color:var(--color-stardust)]">
        <Image
          src="/images/indoor/indoor-01.webp"
          alt="A warm interior in evening light"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(28,35,28,0.92) 0%, rgba(28,35,28,0.62) 50%, rgba(28,35,28,0.22) 100%)",
          }}
        />
        <div className="relative z-10 mx-auto w-[100%] max-w-[var(--container-page)] px-6 md:px-10">
          <FadeUp>
            <h2
              className="max-w-[18ch] text-balance text-[color:var(--color-white)]"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "var(--text-4xl)",
                lineHeight: 1.04,
                letterSpacing: "-0.022em",
                fontWeight: 400,
              }}
            >
              The first thing people notice,{" "}
              <em className="not-italic text-[color:var(--color-white)]">
                before they see anything.
              </em>
            </h2>
          </FadeUp>
        </div>
      </section>

      {/* ===== ENQUIRY FORM ===== */}
      <section className="bg-[color:var(--color-verdant)] py-[var(--spacing-section)] text-[color:var(--color-stardust)]">
        <div className="mx-auto max-w-[var(--container-content)] px-6 md:px-10">
          <FadeUp>
            <h2
              className="max-w-[24ch] text-balance text-[color:var(--color-stardust)]"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "var(--text-3xl)",
                lineHeight: 1.1,
                letterSpacing: "-0.016em",
                fontWeight: 400,
              }}
            >
              Tell us about your space.{" "}
              <em className="not-italic text-[color:var(--color-aerial-soft)]">
                We&rsquo;ll get back within 48 hours.
              </em>
            </h2>
          </FadeUp>

          <FadeUp delay={0.1}>
            <EnquiryForm />
          </FadeUp>
        </div>
      </section>
    </article>
  );
}
