import { Stars } from "@/components/reviews/stars";
import { WriteReview } from "@/components/reviews/write-review";
import { summarize, type PublicReview } from "@/lib/reviews/store";

/** Shown before "Show all", so a long list doesn't bury what follows. */
const FIRST = 6;

const date = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  );

/**
 * A product's reviews: the average and spread, the approved reviews (newest
 * first) and the button to write one. Only reviews staff have approved reach
 * this component, so everything shown here is something a customer wrote.
 */
export function ReviewsSection({
  slug,
  productName,
  reviews,
}: {
  slug: string;
  productName: string;
  reviews: PublicReview[];
}) {
  const summary = summarize(reviews);
  const first = reviews.slice(0, FIRST);
  const rest = reviews.slice(FIRST);

  return (
    <section
      id="reviews"
      className="scroll-mt-24 border-t border-[color:var(--color-rule)] py-[var(--spacing-section)]"
    >
      <div className="mx-auto max-w-[var(--container-page)] px-6 md:px-10">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-[color:var(--color-rule)] pb-6">
          <h2
            className="text-balance"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-3xl)",
              lineHeight: 1.06,
              letterSpacing: "-0.018em",
              fontWeight: 400,
            }}
          >
            Reviews of{" "}
            <em className="text-[color:var(--color-aerial-deep)]">{productName}</em>
          </h2>
          <WriteReview slug={slug} productName={productName} />
        </div>

        {summary.count === 0 ? (
          <div className="max-w-[46ch]">
            <Stars value={0} className="text-[1.3rem]" label="No reviews yet" />
            <p className="mt-4 text-[1.05rem] leading-[1.6] text-[color:var(--color-charcoal)]">
              No reviews yet. If you own {productName}, tell others how it suits
              your home.
            </p>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
            {/* Summary */}
            <div>
              <p
                className="tabular-nums"
                style={{ fontFamily: "var(--font-serif)", fontSize: "3.2rem", lineHeight: 1 }}
              >
                {summary.average.toFixed(1)}
              </p>
              <Stars
                value={summary.average}
                className="mt-3 text-[1.15rem]"
                label={`Rated ${summary.average} out of 5`}
              />
              <p className="mt-2 text-[0.86rem] text-[color:var(--color-charcoal-soft)]">
                Based on {summary.count} {summary.count === 1 ? "review" : "reviews"}
              </p>
              <dl className="mt-6 grid gap-2">
                {summary.histogram.map((n, i) => {
                  const stars = 5 - i;
                  const pct = summary.count ? (n / summary.count) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-[0.8rem]">
                      <dt className="w-10 shrink-0 tabular-nums text-[color:var(--color-charcoal-soft)]">
                        {stars} ★
                      </dt>
                      <dd className="flex flex-1 items-center gap-3">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--color-rule)]">
                          <span
                            className="block h-full rounded-full bg-[color:var(--color-clay)]"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="w-6 text-right tabular-nums text-[color:var(--color-charcoal-soft)]">
                          {n}
                        </span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>

            {/* List */}
            <div>
              <ul className="grid gap-x-10 md:grid-cols-2">
                {first.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </ul>
              {rest.length > 0 && (
                <details className="group mt-2">
                  <summary className="cursor-pointer list-none py-4 text-[0.72rem] uppercase tracking-[0.24em] text-[color:var(--color-clay)] [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">Show all {reviews.length} reviews</span>
                    <span className="hidden group-open:inline">Show fewer</span>
                  </summary>
                  <ul className="grid gap-x-10 md:grid-cols-2">
                    {rest.map((r) => (
                      <ReviewCard key={r.id} review={r} />
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: PublicReview }) {
  return (
    <li className="border-b border-[color:var(--color-rule)] py-6">
      <div className="flex items-center justify-between gap-4">
        <Stars value={review.rating} className="text-[0.9rem]" />
        <time
          dateTime={review.createdAt}
          className="text-[0.74rem] text-[color:var(--color-charcoal-soft)]"
        >
          {date(review.createdAt)}
        </time>
      </div>
      {review.title && (
        <p className="mt-3 font-[family-name:var(--font-serif)] text-[1.05rem] leading-snug">
          {review.title}
        </p>
      )}
      <p className="mt-2 whitespace-pre-line text-[0.92rem] leading-[1.65] text-[color:var(--color-charcoal)]">
        {review.body}
      </p>
      <p className="mt-3 text-[0.74rem] uppercase tracking-[0.16em] text-[color:var(--color-charcoal-soft)]">
        {review.name}
        {review.city ? ` · ${review.city}` : ""}
      </p>
    </li>
  );
}
