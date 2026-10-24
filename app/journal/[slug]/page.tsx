import Image from "next/image";
import { Monogram } from "@/components/brand/logo";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { journal, getJournalPost, journalNewestFirst } from "@/lib/data/journal";
import { FadeUp } from "@/components/motion/fade-up";
import { OG_LOCALE } from "@/lib/seo";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  jsonLdScript,
} from "@/lib/structured-data";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return journal.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getJournalPost(slug);
  if (!post) return { title: "Not found" };
  const url = `/journal/${post.slug}`;
  return {
    // The editorial headline runs long; search results would cut it off.
    title: post.seoTitle ?? post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: OG_LOCALE,
      title: post.title,
      description: post.excerpt,
      url,
      publishedTime: post.publishedAt,
      ...(post.updatedAt ? { modifiedTime: post.updatedAt } : {}),
      images: [{ url: post.cover, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.cover],
    },
    ...(post.keywords?.length ? { keywords: post.keywords } : {}),
  };
}

/**
 * Body blocks are plain strings with three light conventions, kept deliberately
 * small so the copy stays readable in lib/data/journal.ts and passes straight
 * through to /llms-full.txt as ordinary markdown.
 */
type Block =
  | { kind: "h2"; text: string; id: string }
  | { kind: "img"; alt: string; src: string }
  | { kind: "p"; text: string };

function toBlock(raw: string): Block {
  if (raw.startsWith("## ")) {
    const text = raw.slice(3).trim();
    return { kind: "h2", text, id: anchorFor(text) };
  }
  const img = /^!\[([^\]]*)\]\((\/[^)\s]+)\)$/.exec(raw.trim());
  if (img) return { kind: "img", alt: img[1], src: img[2] };
  return { kind: "p", text: raw };
}

/** "Corporate Diwali gifts for clients and teams" → "corporate-diwali-gifts…",
 *  so a section can be linked to directly and answer engines can cite it. */
function anchorFor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Inline [label](/path) links. Only paths on this site are honoured: anything
 * not beginning with "/" is left as text, so a stray URL pasted into the copy
 * can never send a reader off-site.
 */
function withLinks(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <Link
        key={m.index}
        href={m[2]}
        className="underline decoration-[color:var(--color-rule)] decoration-1 underline-offset-[5px] transition-colors duration-300 hover:text-[color:var(--color-clay)] hover:decoration-[color:var(--color-clay)]"
      >
        {m[1]}
      </Link>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default async function JournalPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = getJournalPost(slug);
  if (!post) notFound();

  // Newest others first, so every older entry links forward to fresh writing.
  const others = journalNewestFirst().filter((p) => p.slug !== slug).slice(0, 2);
  const index = journal.findIndex((p) => p.slug === slug) + 1;

  const blocks = post.body.map(toBlock);
  const firstParagraph = blocks.findIndex((b) => b.kind === "p");

  return (
    <article className="bg-[color:var(--color-white)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(articleJsonLd(post)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Journal", path: "/journal" },
              { name: post.title, path: `/journal/${post.slug}` },
            ])
          ),
        }}
      />
      {/* ====================================================
          § HERO – Editorial Masthead
          ==================================================== */}
      <section className="border-b border-[color:var(--color-rule)] pt-10 md:pt-14">
        <div className="mx-auto max-w-[var(--container-page)] px-6 md:px-10">
          <FadeUp>
            <div className="mb-10 flex items-center gap-5 text-[0.62rem] uppercase tracking-[0.36em] text-[color:var(--color-charcoal-soft)]">
              <Link href="/journal" className="hover:text-[color:var(--color-clay)]">
                Journal
              </Link>
              <span className="h-px flex-1 bg-[color:var(--color-rule)]" />
              <span>
                Entry № {String(index).padStart(2, "0")} · {post.eyebrow}
              </span>
            </div>
          </FadeUp>

          <div className="grid items-end gap-10 pb-14 md:grid-cols-12 md:gap-16">
            <FadeUp delay={0.05} className="md:col-span-8">
              <p className="text-[0.62rem] uppercase tracking-[0.42em] text-[color:var(--color-charcoal-soft)]">
                <Monogram className="mr-1.5 inline-block h-[0.9em] w-[0.9em] align-[-0.12em]" />{post.eyebrow}
              </p>
              <h1
                className="mt-7 max-w-[22ch] text-balance"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--text-5xl)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.022em",
                  fontWeight: 400,
                }}
              >
                {post.title}
              </h1>
            </FadeUp>

            <FadeUp delay={0.1} className="md:col-span-4">
              <dl className="grid gap-4 border-t border-[color:var(--color-rule)] pt-6 text-[0.78rem]">
                <div className="flex items-baseline justify-between">
                  <dt className="text-[0.6rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
                    Published
                  </dt>
                  <dd>{formatDate(post.publishedAt)}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-[0.6rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
                    Read
                  </dt>
                  <dd>{post.readMinutes} min</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-[0.6rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
                    By
                  </dt>
                  <dd>Quint Editorial</dd>
                </div>
              </dl>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ====================================================
          § COVER PLATE (matches PDP "The Form" composition)
          ==================================================== */}
      <FadeUp>
        <section className="bg-[color:var(--color-stardust-soft)] py-12 md:py-16">
          <div className="mx-auto max-w-[var(--container-content)] px-6 md:px-10">
            <figure>
              <div className="relative aspect-[16/9] overflow-hidden bg-[color:var(--color-aerial-soft)]">
                <Image
                  src={post.cover}
                  alt={post.title}
                  fill
                  sizes="(min-width: 768px) 70vw, 100vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 flex items-center justify-between text-[0.6rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
                <span>{post.eyebrow}</span>
                <span>{formatDate(post.publishedAt)}</span>
              </figcaption>
            </figure>
          </div>
        </section>
      </FadeUp>

      {/* ====================================================
          § BODY
          ==================================================== */}
      <section className="py-[var(--spacing-section)]">
        <div className="mx-auto max-w-[var(--container-page)] px-6 md:px-10">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <FadeUp className="md:col-span-4">
              <div className="md:sticky md:top-32 text-[0.62rem] uppercase tracking-[0.42em] text-[color:var(--color-charcoal-soft)]">
                <p><Monogram className="mr-1.5 inline-block h-[0.9em] w-[0.9em] align-[-0.12em]" />The Letter</p>
                <p className="mt-1.5">{formatDate(post.publishedAt)}</p>
              </div>
            </FadeUp>

            <div className="md:col-span-8">
              <FadeUp delay={0.06}>
                <p
                  className="text-balance"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "var(--text-2xl)",
                    lineHeight: 1.32,
                    letterSpacing: "-0.012em",
                    fontStyle: "italic",
                  }}
                >
                  {post.excerpt}
                </p>
              </FadeUp>

              <div className="mt-12 space-y-7 text-[var(--text-base)] leading-[1.95] text-[color:var(--color-charcoal)]">
                {blocks.map((block, i) => {
                  const delay = 0.04 + Math.min(i, 12) * 0.02;
                  if (block.kind === "h2") {
                    return (
                      <FadeUp key={i} delay={delay}>
                        <h2
                          id={block.id}
                          className="max-w-[30ch] scroll-mt-32 pt-8 text-balance"
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: "var(--text-2xl)",
                            lineHeight: 1.18,
                            letterSpacing: "-0.012em",
                            fontWeight: 400,
                          }}
                        >
                          {block.text}
                        </h2>
                      </FadeUp>
                    );
                  }
                  if (block.kind === "img") {
                    return (
                      <FadeUp key={i} delay={delay}>
                        <figure className="py-4">
                          <div className="relative aspect-[3/2] overflow-hidden bg-[color:var(--color-aerial-soft)]">
                            <Image
                              src={block.src}
                              alt={block.alt}
                              fill
                              sizes="(min-width: 768px) 60vw, 100vw"
                              className="object-cover"
                            />
                          </div>
                          {block.alt && (
                            <figcaption className="mt-3 text-[0.6rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
                              {block.alt}
                            </figcaption>
                          )}
                        </figure>
                      </FadeUp>
                    );
                  }
                  return (
                    <FadeUp key={i} delay={delay}>
                      <p
                        className={
                          i === firstParagraph
                            ? "max-w-[64ch] [&::first-letter]:float-left [&::first-letter]:mr-2 [&::first-letter]:font-[family-name:var(--font-serif)] [&::first-letter]:text-[3.6rem] [&::first-letter]:font-normal [&::first-letter]:leading-[0.9] [&::first-letter]:text-[color:var(--color-charcoal)]"
                            : "max-w-[64ch]"
                        }
                      >
                        {withLinks(block.text)}
                      </p>
                    </FadeUp>
                  );
                })}
              </div>

              <FadeUp delay={0.2}>
                <div className="mt-16 flex items-center gap-5 border-t border-[color:var(--color-rule)] pt-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--color-rule)] text-[0.65rem] uppercase tracking-[0.18em] text-[color:var(--color-charcoal-soft)]">
                    QH
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontStyle: "italic",
                        fontSize: "0.95rem",
                      }}
                    >
                      Quint Editorial
                    </p>
                    <p className="text-[0.62rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
                      Mumbai · {formatDate(post.publishedAt)}
                    </p>
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================
          § BROWSE THE RANGE – nudge from editorial into product
          ==================================================== */}
      <section className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-stardust-soft)] py-[var(--spacing-section)]">
        <div className="mx-auto max-w-[var(--container-content)] px-6 text-center md:px-10">
          <FadeUp>
            <p className="mx-auto w-fit text-[0.62rem] uppercase tracking-[0.42em] text-[color:var(--color-charcoal-soft)]">
              <Monogram className="mr-1.5 inline-block h-[0.9em] w-[0.9em] align-[-0.12em]" />
              Interested?
            </p>
            <h2
              className="mx-auto mt-6 max-w-[20ch] text-balance"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "var(--text-3xl)",
                lineHeight: 1.1,
                letterSpacing: "-0.016em",
                fontWeight: 400,
              }}
            >
              Bring the feeling home.{" "}
              <em className="text-[color:var(--color-aerial-deep)]">
                Browse the range.
              </em>
            </h2>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              <Link
                href="/range#diffusers"
                className="group inline-flex items-center gap-3 border-b border-[color:var(--color-charcoal)] pb-1.5 text-[0.72rem] uppercase tracking-[0.32em] transition-colors duration-500 hover:border-[color:var(--color-clay)] hover:text-[color:var(--color-clay)]"
              >
                Shop diffusers
                <span className="transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <Link
                href="/range#oils"
                className="text-[0.72rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)] transition-colors duration-500 hover:text-[color:var(--color-charcoal)]"
              >
                Or the oils →
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ====================================================
          § CONTINUE READING
          ==================================================== */}
      <section className="border-t border-[color:var(--color-rule)] py-[var(--spacing-section)]">
        <div className="mx-auto max-w-[var(--container-page)] px-6 md:px-10">
          <FadeUp>
            <div className="mb-14 flex items-center gap-4 text-[0.6rem] uppercase tracking-[0.42em] text-[color:var(--color-charcoal-soft)]">
              <span className="h-px w-12 bg-[color:var(--color-rule)]" />
              <span><Monogram className="mr-1.5 inline-block h-[0.9em] w-[0.9em] align-[-0.12em]" />Continue Reading</span>
              <span className="h-px flex-1 bg-[color:var(--color-rule)]" />
            </div>
          </FadeUp>

          <div className="grid gap-12 md:grid-cols-2 md:gap-10">
            {others.map((p, i) => (
              <FadeUp key={p.slug} delay={i * 0.08}>
                <Link href={`/journal/${p.slug}`} className="group block">
                  <div className="relative aspect-[5/6] overflow-hidden bg-[color:var(--color-aerial-soft)]">
                    <Image
                      src={p.cover}
                      alt={p.title}
                      fill
                      sizes="(min-width: 768px) 48vw, 100vw"
                      className="object-cover transition-transform duration-[1600ms] ease-[var(--ease-quint)] group-hover:scale-[1.04]"
                    />
                    <div className="absolute left-5 top-5 text-[0.58rem] uppercase tracking-[0.36em] text-[color:var(--color-stardust)]">
                      Next →
                    </div>
                  </div>
                  <p className="mt-7 text-[0.62rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
                    {p.eyebrow}
                  </p>
                  <h3
                    className="mt-3 text-balance transition-colors duration-500 group-hover:text-[color:var(--color-clay)]"
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "var(--text-2xl)",
                      lineHeight: 1.12,
                      letterSpacing: "-0.012em",
                      fontWeight: 400,
                    }}
                  >
                    {p.title}
                  </h3>
                  <p className="mt-3 max-w-[44ch] text-[0.92rem] leading-[1.65] text-[color:var(--color-charcoal-soft)]">
                    {p.excerpt}
                  </p>
                </Link>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
