import { cn } from "@/lib/utils";

const STAR =
  "M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z";

/**
 * Five stars filled to `value` (0–5, fractions allowed), for display only.
 * The filled row is clipped over an outlined one, so 4.6 reads as 4.6.
 */
export function Stars({
  value,
  className,
  label,
}: {
  value: number;
  /** Sizes the stars via text size, e.g. "text-[0.95rem]". */
  className?: string;
  /** Spoken instead of the visual; defaults to "Rated x out of 5". */
  label?: string;
}) {
  const pct = Math.max(0, Math.min(5, value)) * 20;
  const row = (filled: boolean) => (
    <span className="flex gap-[0.12em]">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-[1em] w-[1em] shrink-0"
          fill={filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={filled ? 0 : 1.4}
          strokeLinejoin="round"
        >
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );

  return (
    <span
      role="img"
      aria-label={label ?? `Rated ${value} out of 5`}
      className={cn("relative inline-flex text-[color:var(--color-clay)]", className)}
    >
      <span className="text-[color:var(--color-clay)]/45">{row(false)}</span>
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row(true)}
      </span>
    </span>
  );
}
