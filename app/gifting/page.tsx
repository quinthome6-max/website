import Link from "next/link";
import type { Metadata } from "next";
import { FadeUp } from "@/components/motion/fade-up";
import { ShopBlock } from "@/components/journal/shop-block";
import { getCommerceMap } from "@/lib/shopify/commerce";
import { shopCards } from "@/lib/shop-cards";
import { breadcrumbJsonLd, faqJsonLd, jsonLdScript } from "@/lib/structured-data";
import { DEFAULT_OG_IMAGE, OG_LOCALE } from "@/lib/seo";

const TITLE = "Gift Ideas by Budget: Diffusers, Candles & Oils";
const DESCRIPTION =
  "Gifts that scent a home, by budget: soy wax candles from ₹1,699, plug-in and car diffusers at ₹3,999, and room diffusers that come with their first oil.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/gifting" },
  openGraph: {
    title: `${TITLE} · Quint Home`,
    description: DESCRIPTION,
    url: "/gifting",
    type: "website",
    locale: OG_LOCALE,
    images: [DEFAULT_OG_IMAGE],
  },
};

const tiers = [
  {
    h2: "Under ₹2,000",
    body: "Hand-poured soy wax candles in 300 ml jars, burning for up to 45 hours: the safe choice when you don't know the home. A fragrance oil makes a small gift only for someone who already owns a Quint Home diffuser, since our diffusers take only our oils.",
    slugs: ["the-palace", "the-forest", "the-study"],
    label: "Soy wax candles",
  },
  {
    h2: "Under ₹5,000",
    body: "The Pebble plugs into a wall and scents a bathroom, passage or pooja corner; the Drift sits in a car cup holder and starts and stops with the engine. Both are sold without an oil, so add one: with a ₹899 oil the gift comes to ₹4,898.",
    slugs: ["pebble", "drift", "first-rain"],
    label: "Plug-in and car diffusers",
  },
  {
    h2: "₹8,000 to ₹12,000",
    body: "A room diffuser that arrives with a 50 ml oil of your choice, so it works the day it is unpacked. The Ember doubles as a bedside clock, the Pillar holds two scents, and the Loom has a soft fabric exterior and a warm glow.",
    slugs: ["ember", "pillar", "loom"],
    label: "Room diffusers, first oil free",
  },
  {
    h2: "The signature gift",
    body: "The Monolith, in brushed gold or matte black: cordless, covering up to 1,075 sq ft, with a 50 ml oil of your choice. Choose a Hotel Credential oil as that bottle for a ₹200 supplement.",
    slugs: ["monolith", "the-arrival", "grand-lobby"],
    label: "The Monolith, and the oils to give with it",
  },
];

const occasions = [
  { href: "/journal/housewarming-and-wedding-gifts-india", label: "Housewarming and wedding gifts", line: "Griha pravesh and wedding gifts by budget" },
  { href: "/journal/diwali-gifting-guide", label: "Festive gifting", line: "Premium, corporate and family gifts for the festive season" },
  { href: "/journal/diffuser-for-office", label: "For offices and clients", line: "Reception, cabins and gifting at scale" },
];

const faq = [
  { q: "Can you ship a gift directly to someone else?", a: "Yes. Enter their address at checkout and we ship to them anywhere in India." },
  { q: "How long does delivery take?", a: "Orders leave Mumbai within 3 business days and usually arrive 3–5 business days later. Order a week or more ahead of the occasion." },
  { q: "Is shipping free?", a: "On orders above ₹5,000. Below that, a flat ₹99 applies." },
  { q: "Which diffusers come with an oil?", a: "The Monolith, Pillar, Ember and Loom come with a 50 ml oil of your choice. The Pebble and the Drift are sold on their own, so add a bottle." },
  { q: "Can I order gifts in bulk?", a: "Yes. For corporate gifts, wedding favours or return gifts, send the details through our business page and we will get back within 48 hours." },
];

/** /gifting: gifts by budget, priced live, with the occasion guides (plan T20). */
export default async function GiftingPage() {
  const commerce = await getCommerceMap();
  const serif = { fontFamily: "var(--font-serif)", fontWeight: 400 } as const;

  return (
    <article className="bg-[color:var(--color-white)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Gift guide", path: "/gifting" }])) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faq)) }} />

      <section className="border-b border-[color:var(--color-rule)] py-[var(--spacing-section-sm)]">
        <div className="mx-auto max-w-[var(--container-page)] px-6 md:px-10">
          <nav aria-label="Breadcrumb" className="text-[0.66rem] uppercase tracking-[0.24em] text-[color:var(--color-charcoal-soft)]">
            <Link href="/" className="hover:text-[color:var(--color-clay)]">Home</Link> <span aria-hidden="true">›</span>{" "}
            <span aria-current="page" className="text-[color:var(--color-charcoal)]">Gift guide</span>
          </nav>
          <FadeUp>
            <h1 className="mt-8 max-w-[18ch] text-balance" style={{ ...serif, fontSize: "var(--text-4xl)", lineHeight: 1.02, letterSpacing: "-0.02em" }}>
              Gifts that scent a home.{" "}
              <em className="text-[color:var(--color-aerial-deep)]">By budget.</em>
            </h1>
            <p className="mt-6 max-w-[56ch] text-[var(--text-base)] leading-[1.8] text-[color:var(--color-charcoal-soft)]">
              Something they will use every day and wouldn&rsquo;t buy for themselves: a candle, a diffuser for the car or the bathroom, or a room diffuser that arrives with its first oil.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="py-[var(--spacing-section)]">
        <div className="mx-auto grid max-w-[var(--container-content)] gap-16 px-6 md:px-10">
          {tiers.map((t) => (
            <FadeUp key={t.h2}>
              <div>
                <h2 style={{ ...serif, fontSize: "var(--text-2xl)", lineHeight: 1.15 }}>{t.h2}</h2>
                <p className="mt-3 max-w-[64ch] text-[var(--text-base)] leading-[1.8] text-[color:var(--color-charcoal-soft)]">{t.body}</p>
                <div className="mt-5">
                  <ShopBlock label={t.label} cards={shopCards(t.slugs, commerce)} />
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-ivory)] py-[var(--spacing-section)]">
        <div className="mx-auto max-w-[var(--container-content)] px-6 md:px-10">
          <h2 style={{ ...serif, fontSize: "var(--text-2xl)" }}>Gifts by occasion</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {occasions.map((o) => (
              <li key={o.href}>
                <Link href={o.href} className="group block h-full border border-[color:var(--color-rule)] bg-[color:var(--color-white)] p-5">
                  <span className="block" style={{ ...serif, fontSize: "1.2rem" }}>
                    {o.label} <span className="text-[color:var(--color-clay)]">→</span>
                  </span>
                  <span className="mt-2 block text-[0.88rem] leading-[1.55] text-[color:var(--color-charcoal-soft)]">{o.line}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-[color:var(--color-rule)] py-[var(--spacing-section)]">
        <div className="mx-auto max-w-[var(--container-content)] px-6 md:px-10">
          <h2 style={{ ...serif, fontSize: "var(--text-2xl)" }}>Questions about gifting</h2>
          <dl className="mt-6 divide-y divide-[color:var(--color-rule)] border-y border-[color:var(--color-rule)]">
            {faq.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="font-medium">{f.q}</dt>
                <dd className="mt-2 max-w-[64ch] text-[color:var(--color-charcoal-soft)]">
                  {f.q.startsWith("Can I order gifts in bulk") ? (
                    <>
                      Yes. For corporate gifts, wedding favours or return gifts, send the details through our{" "}
                      <Link href="/businesses" className="underline underline-offset-4">business page</Link> and we will get back within 48 hours.
                    </>
                  ) : (
                    f.a
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </article>
  );
}
