import type { Metadata } from "next";
import Link from "next/link";
import { Monogram } from "@/components/brand/logo";
import Image from "next/image";
import { journalNewestFirst } from "@/lib/data/journal";
import { FadeUp } from "@/components/motion/fade-up";

/** Without this the page inherited the layout's bare "Quint Home" title. */
export const metadata: Metadata = {
  title: "Home Fragrance Guides & Diffuser Tips",
  description:
    "Guides to waterless diffusers, scent notes and hotel-style home fragrance, written by the Quint Home team in Mumbai.",
  alternates: { canonical: "/journal" },
};

export default function JournalPage() {
  return (
    <div className="mx-auto max-w-[var(--container-page)] px-6 py-[var(--spacing-section)] md:px-10">
      <FadeUp>
        <div className="border-b border-[color:var(--color-rule)] pb-10">
          <p className="font-eyebrow"><Monogram className="mr-1.5 inline-block h-[0.9em] w-[0.9em] align-[-0.12em]" />The Journal</p>
          <h1
            className="mt-7 max-w-[18ch]"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-5xl)",
              lineHeight: 0.98,
              letterSpacing: "-0.02em",
            }}
          >
            Writing on scent, the device, and the home.
          </h1>
        </div>
      </FadeUp>

      <div className="mt-16 grid gap-14 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
        {journalNewestFirst().map((p, i) => (
          <FadeUp key={p.slug} delay={i * 0.06}>
            <Link href={`/journal/${p.slug}`} className="group block">
              <div className="relative aspect-[5/6] overflow-hidden bg-[color:var(--color-aerial-soft)]">
                <Image
                  src={p.cover}
                  alt={p.title}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-transform duration-[1400ms] ease-[var(--ease-quint)] group-hover:scale-[1.04]"
                />
              </div>
              <p className="font-eyebrow mt-6">{p.eyebrow}</p>
              <h2
                className="mt-3 text-balance transition-colors duration-500 group-hover:text-[color:var(--color-clay)]"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--text-xl)",
                  lineHeight: 1.2,
                  letterSpacing: "-0.008em",
                }}
              >
                {p.title}
              </h2>
              <p className="mt-3 max-w-[44ch] text-[0.95rem] leading-[1.7] text-[color:var(--color-charcoal-soft)]">
                {p.excerpt}
              </p>
            </Link>
          </FadeUp>
        ))}
      </div>
    </div>
  );
}
