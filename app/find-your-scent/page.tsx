import type { Metadata } from "next";
import Link from "next/link";
import { ScentFinder } from "@/components/sections/scent-finder";
import { oils, oilNoteSummary } from "@/lib/data/oils";

export const metadata: Metadata = {
  title: "Find Your Scent: Fragrance Oil Quiz",
  description:
    "Answer two quick questions and we'll match you to one of eight hotel-grade fragrance oils for your diffuser. 50 ml, 70–90% concentration.",
  alternates: { canonical: "/find-your-scent" },
};

export default function FindYourScentPage() {
  return (
    <article className="bg-[color:var(--color-white)] pt-6 md:pt-10">
      {/* The quiz renders step headings only, so the page carried no h1.
          Hidden rather than shown, since the first step is its own headline. */}
      <h1 className="sr-only">Find your home fragrance oil</h1>
      <ScentFinder />

      {/* All eight oils as plain links (plan T18). The quiz only reveals a
          match after it is answered, so without this the page carried no link
          to any oil for a reader who skips it, or for a search engine. */}
      <section className="border-t border-[color:var(--color-rule)] py-[var(--spacing-section)]">
        <div className="mx-auto max-w-[var(--container-content)] px-6 md:px-10">
          <h2
            className="text-balance"
            style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-2xl)", lineHeight: 1.15, fontWeight: 400 }}
          >
            Or browse all eight oils
          </h2>
          <ul className="mt-8 grid gap-x-10 border-t border-[color:var(--color-rule)] sm:grid-cols-2">
            {oils.map((o) => (
              <li key={o.slug} className="border-b border-[color:var(--color-rule)]">
                <Link href={`/range/${o.slug}`} className="group flex items-baseline justify-between gap-4 py-4">
                  <span>
                    <span className="block font-[family-name:var(--font-serif)] text-[1.1rem] transition-colors group-hover:text-[color:var(--color-clay)]">
                      {o.name}
                    </span>
                    <span className="mt-1 block text-[0.86rem] text-[color:var(--color-charcoal-soft)]">
                      {o.mood} · {oilNoteSummary(o)}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-[color:var(--color-clay)] transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}
