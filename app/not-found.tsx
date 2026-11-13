import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { NotFoundSuggestion } from "@/components/layout/not-found-suggestion";
import { WHATSAPP_NUMBER } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Page not found",
  // Never indexed, and no canonical: a missing page must not claim to be one.
  robots: { index: false, follow: true },
};

const categories = [
  { href: "/range/waterless-diffusers", label: "Waterless diffusers", line: "Six models, from the car to 1,075 sq ft", image: "/images/diffusers/a326-gold/gold-v2-03.webp" },
  { href: "/range/fragrance-oils", label: "Fragrance oils", line: "Eight scents, from ₹899", image: "/images/hero-oils-collection.webp" },
  { href: "/range/scented-candles", label: "Scented candles", line: "Hand-poured soy wax", image: "/images/candles/the-palace-01.webp" },
];

const guides = [
  { href: "/journal/best-aroma-diffuser-for-home-india", label: "How to choose a diffuser" },
  { href: "/journal/how-to-make-your-home-smell-like-a-luxury-hotel", label: "Make your home smell like a hotel" },
  { href: "/journal/fragrance-oil-vs-essential-oil", label: "Fragrance oil vs essential oil" },
  { href: "/find-your-scent", label: "Find your scent in two questions" },
];

/**
 * Every address the site doesn't have lands here, including links that AI
 * assistants assemble from a sentence. It offers the product the address
 * seems to name, then the range, the guides and a person to ask.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-[var(--container-page)] px-6 py-[var(--spacing-section)] text-center md:px-10">
      <p className="font-eyebrow mx-auto w-fit">Page not found</p>
      <h1
        className="mx-auto mt-6 max-w-[18ch] text-balance"
        style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-4xl)", lineHeight: 1.04, letterSpacing: "-0.02em", fontWeight: 400 }}
      >
        This page has drifted off.{" "}
        <em className="text-[color:var(--color-aerial-deep)]">The rest of the house is here.</em>
      </h1>
      <p className="mx-auto mt-6 max-w-[48ch] text-[var(--text-base)] leading-[1.75] text-[color:var(--color-charcoal-soft)]">
        The link may be old, or typed slightly wrong. Everything we make is a click away below.
      </p>

      <NotFoundSuggestion />

      <ul className="mt-14 grid gap-4 text-left sm:grid-cols-3">
        {categories.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="group block">
              <span className="relative block aspect-[4/3] overflow-hidden bg-[color:var(--color-aerial-soft)]">
                <Image src={c.image} alt={c.label} fill sizes="(min-width: 640px) 30vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              </span>
              <span className="mt-3 block" style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem" }}>
                {c.label} <span className="text-[color:var(--color-clay)]">→</span>
              </span>
              <span className="mt-1 block text-[0.85rem] text-[color:var(--color-charcoal-soft)]">{c.line}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-14 max-w-[44rem] border-t border-[color:var(--color-rule)] pt-8">
        <p className="mx-auto w-fit text-[0.6rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">Guides</p>
        <ul className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-3">
          {guides.map((g) => (
            <li key={g.href}>
              <Link href={g.href} className="text-[0.92rem] underline decoration-[color:var(--color-rule)] underline-offset-[5px] hover:text-[color:var(--color-clay)]">
                {g.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-[0.88rem] text-[color:var(--color-charcoal-soft)]">
          Looking for something in particular?{" "}
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-[color:var(--color-clay)]">
            Ask us on WhatsApp
          </a>{" "}
          or{" "}
          <Link href="/" className="underline underline-offset-4 hover:text-[color:var(--color-clay)]">
            go to the homepage
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
