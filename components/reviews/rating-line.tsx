import { Stars } from "@/components/reviews/stars";
import type { ReviewSummary } from "@/lib/reviews/store";

/**
 * The stars just under a product's name. With approved reviews it shows the
 * average and the count and jumps to them; with none yet it invites the first
 * one rather than showing an empty "0 reviews".
 */
export function RatingLine({ summary }: { summary: ReviewSummary }) {
  if (!summary.count) {
    return (
      <a
        href="#write-review"
        className="group inline-flex items-center gap-2.5 text-[0.84rem] text-[color:var(--color-charcoal-soft)]"
      >
        <Stars value={0} className="text-[0.95rem]" label="No reviews yet" />
        <span className="underline-offset-4 group-hover:text-[color:var(--color-clay)] group-hover:underline">
          Be the first to review
        </span>
      </a>
    );
  }
  return (
    <a
      href="#reviews"
      className="group inline-flex items-center gap-2.5 text-[0.84rem] text-[color:var(--color-charcoal)]"
    >
      <Stars
        value={summary.average}
        className="text-[0.95rem]"
        label={`Rated ${summary.average} out of 5`}
      />
      <span className="tabular-nums">{summary.average.toFixed(1)}</span>
      <span className="text-[color:var(--color-charcoal-soft)] underline-offset-4 group-hover:text-[color:var(--color-clay)] group-hover:underline">
        ({summary.count} {summary.count === 1 ? "review" : "reviews"})
      </span>
    </a>
  );
}
