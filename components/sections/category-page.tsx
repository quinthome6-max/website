import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { FadeUp } from "@/components/motion/fade-up";
import { PriceTag } from "@/components/product/price-tag";
import { diffusers } from "@/lib/data/diffusers";
import { oils, oilNoteSummary } from "@/lib/data/oils";
import { candles } from "@/lib/data/candles";
import { getCategoryPage, type CategorySlug } from "@/lib/data/category-pages";
import { getCommerceMap, pricePair, shopifyHandle } from "@/lib/shopify/commerce";
import { breadcrumbJsonLd, faqJsonLd, jsonLdScript } from "@/lib/structured-data";
import { SITE, abs, DEFAULT_OG_IMAGE, OG_LOCALE } from "@/lib/seo";

/**
 * A category landing page: /range/waterless-diffusers, /range/fragrance-oils
 * or /range/scented-candles (plan T9). Copy lives in lib/data/category-pages;
 * the products and their live prices come from the same sources as /range.
 */

export function categoryMetadata(slug: CategorySlug): Metadata {
  const c = getCategoryPage(slug);
  const path = `/range/${slug}`;
  return {
    title: c.title,
    description: c.description,
    alternates: { canonical: path },
    openGraph: {
      title: `${c.title} · Quint Home`,
      description: c.description,
      url: path,
      type: "website",
      locale: OG_LOCALE,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

interface Card {
  slug: string;
  name: string;
  image: string;
  line: string;
  sub: string;
  price: number;
  listPrice?: number;
  soldOut: boolean;
}

export async function CategoryPage({ slug }: { slug: CategorySlug }) {
  const c = getCategoryPage(slug);
  const commerce = await getCommerceMap();
  const priced = (name: string, price: number, list?: number) => {
    const live = commerce[shopifyHandle(name)];
    return { ...pricePair(live, price, list), soldOut: live ? !live.available : false };
  };

  const cards: Card[] =
    c.kind === "diffuser"
      ? diffusers.map((d) => ({
          slug: d.slug,
          name: d.name,
          image: d.image,
          line: d.coverageLabel,
          sub: d.tagline,
          ...priced(d.name, d.priceINR, d.listPriceINR),
        }))
      : c.kind === "oil"
        ? oils.map((o) => ({
            slug: o.slug,
            name: o.name,
            image: o.image,
            line: oilNoteSummary(o),
            sub: o.tier === "hotel-credential" ? `Hotel Credential · ${o.mood}` : o.mood,
            ...priced(o.name, o.priceINR),
          }))
        : candles.map((k) => ({
            slug: k.slug,
            name: k.name,
            image: k.image,
            line: k.notesLine,
            sub: `${k.volumeML} ml · up to ${k.burnHours} hours`,
            ...priced(k.name, k.priceINR, k.listPriceINR),
          }));

  // In stock first, so the page doesn't open on something no one can buy.
  cards.sort((a, b) => Number(a.soldOut) - Number(b.soldOut));

  const path = `/range/${slug}`;
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: c.label,
    url: abs(path),
    numberOfItems: cards.length,
    itemListElement: cards.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/range/${p.slug}`,
      name: p.name,
    })),
  };

  const serif = {
    fontFamily: "var(--font-serif)",
    fontWeight: 400,
  } as const;

  return (
    <article className="bg-[color:var(--color-white)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(itemList) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "The Range", path: "/range" },
              { name: c.label, path },
            ])
          ),
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(c.faq)) }} />

      {/* Masthead */}
      <section className="border-b border-[color:var(--color-rule)] pt-6 md:pt-8">
        <div className="mx-auto max-w-[var(--container-page)] px-6 md:px-10">
          <nav aria-label="Breadcrumb" className="text-[0.66rem] uppercase tracking-[0.24em] text-[color:var(--color-charcoal-soft)]">
            <ol className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <li><Link href="/" className="hover:text-[color:var(--color-clay)]">Home</Link></li>
              <li aria-hidden="true">›</li>
              <li><Link href="/range" className="hover:text-[color:var(--color-clay)]">The Range</Link></li>
              <li aria-hidden="true">›</li>
              <li aria-current="page" className="text-[color:var(--color-charcoal)]">{c.label}</li>
            </ol>
          </nav>
          <div className="grid items-end gap-8 pb-9 pt-8 md:grid-cols-12 md:gap-16">
            <FadeUp className="md:col-span-7">
              <h1
                className="max-w-[18ch] text-balance"
                style={{ ...serif, fontSize: "var(--text-5xl)", lineHeight: 0.98, letterSpacing: "-0.024em" }}
              >
                {c.h1}{" "}
                <em className="text-[color:var(--color-aerial-deep)]">{c.h1Accent}</em>
              </h1>
            </FadeUp>
            <FadeUp delay={0.08} className="md:col-span-5">
              <p className="max-w-[46ch] text-[var(--text-base)] leading-[1.8] text-[color:var(--color-charcoal-soft)]">
                {c.intro}
              </p>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* Products */}
      <section aria-labelledby="category-products" className="pt-[var(--spacing-section-sm)] pb-[var(--spacing-section)]">
        <div className="mx-auto max-w-[var(--container-page)] px-6 md:px-10">
          {/* The product names are h3s, so the grid needs an h2 above them
              for the outline to read in order. Seen by screen readers only. */}
          <h2 id="category-products" className="sr-only">
            Shop all {cards.length} {c.label.toLowerCase()}
          </h2>
          <ul className="grid gap-y-14 sm:grid-cols-2 sm:gap-x-6 md:grid-cols-3 md:gap-x-8 lg:gap-x-10">
            {cards.map((p, i) => (
              <li key={p.slug}>
                <FadeUp delay={Math.min(i, 5) * 0.04}>
                  <Link href={`/range/${p.slug}`} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--color-stardust-soft)]">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        priority={i < 2}
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                        className="object-cover transition-transform duration-[1600ms] ease-[var(--ease-quint)] group-hover:scale-[1.04]"
                      />
                      {p.soldOut && (
                        <span className="absolute left-4 top-4 bg-[color:var(--color-charcoal)] px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.2em] text-[color:var(--color-ivory)]">
                          Sold out
                        </span>
                      )}
                    </div>
                    <div className="mt-5 flex items-baseline justify-between gap-4 border-b border-[color:var(--color-rule)] pb-3">
                      <h3
                        className="transition-colors duration-500 group-hover:text-[color:var(--color-clay)]"
                        style={{ ...serif, fontSize: "var(--text-xl)", lineHeight: 1.1 }}
                      >
                        {p.name}
                      </h3>
                      <PriceTag
                        price={p.price}
                        listPrice={p.listPrice}
                        className="shrink-0 justify-end gap-x-2"
                        priceClassName="tabular-nums text-[0.95rem] text-[color:var(--color-charcoal)]"
                        listClassName="text-[0.78rem]"
                      />
                    </div>
                    <p className="mt-3 text-[0.82rem] uppercase tracking-[0.14em] text-[color:var(--color-charcoal-soft)]">
                      {p.line}
                    </p>
                    <p className="mt-1.5 text-[0.92rem] leading-[1.5] text-[color:var(--color-charcoal)]">{p.sub}</p>
                  </Link>
                </FadeUp>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The guide */}
      <section className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-ivory)] py-[var(--spacing-section)]">
        <div className="mx-auto grid max-w-[var(--container-content)] gap-14 px-6 md:px-10">
          {c.sections.map((s) => (
            <FadeUp key={s.h2}>
              <div className="grid gap-5 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-12">
                <h2 className="text-balance" style={{ ...serif, fontSize: "var(--text-2xl)", lineHeight: 1.15, letterSpacing: "-0.012em" }}>
                  {s.h2}
                </h2>
                <div className="min-w-0 space-y-4 text-[1rem] leading-[1.75] text-[color:var(--color-charcoal)]">
                  {s.paras.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                  {s.table && (
                    <div className="overflow-x-auto">
                      <table className="mt-2 w-full min-w-[34rem] border-collapse text-left text-[0.9rem]">
                        <thead>
                          <tr className="border-b border-[color:var(--color-charcoal)]">
                            {s.table.head.map((h) => (
                              <th key={h} className="py-3 pr-4 text-[0.62rem] font-normal uppercase tracking-[0.2em] text-[color:var(--color-charcoal-soft)]">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {s.table.rows.map(([space, product, why]) => {
                            const target = cards.find((p) => p.name === product);
                            return (
                              <tr key={product} className="border-b border-[color:var(--color-rule)] align-top">
                                <td className="py-3 pr-4">{space}</td>
                                <td className="py-3 pr-4 whitespace-nowrap">
                                  {target ? (
                                    <Link href={`/range/${target.slug}`} className="underline decoration-[color:var(--color-rule)] underline-offset-4 hover:text-[color:var(--color-clay)]">
                                      {product}
                                    </Link>
                                  ) : (
                                    product
                                  )}
                                </td>
                                <td className="py-3 text-[color:var(--color-charcoal-soft)]">{why}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* Questions */}
      <section className="py-[var(--spacing-section)]">
        <div className="mx-auto grid max-w-[var(--container-content)] gap-10 px-6 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-12 md:px-10">
          <h2 className="text-balance" style={{ ...serif, fontSize: "var(--text-2xl)", lineHeight: 1.15 }}>
            Questions about {c.label.toLowerCase()}
          </h2>
          <div className="min-w-0 border-t border-[color:var(--color-rule)]">
            {c.faq.map((f) => (
              <details key={f.q} className="group border-b border-[color:var(--color-rule)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1rem] text-[color:var(--color-charcoal)] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden="true" className="text-[color:var(--color-clay)] transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-5 pr-8 text-[0.95rem] leading-[1.7] text-[color:var(--color-charcoal-soft)]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-[var(--container-content)] px-6 md:px-10">
          <p className="text-[0.62rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">Read next</p>
          <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            {c.related.map((r) => (
              <li key={r.href}>
                <Link
                  href={r.href}
                  className="group inline-flex items-center gap-2 border-b border-[color:var(--color-charcoal)] pb-1 text-[0.75rem] uppercase tracking-[0.24em] hover:border-[color:var(--color-clay)] hover:text-[color:var(--color-clay)]"
                >
                  {r.label}
                  <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}
