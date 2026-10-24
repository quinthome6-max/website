import Link from "next/link";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  /** Omit for the current page. */
  href?: string;
}

/** The categories a product page climbs back to (plan T16). */
export const CATEGORY_CRUMB = {
  diffuser: { label: "Waterless Diffusers", href: "/range/waterless-diffusers" },
  oil: { label: "Fragrance Oils", href: "/range/fragrance-oils" },
  candle: { label: "Scented Candles", href: "/range/scented-candles" },
} as const;

/**
 * Visible breadcrumb trail, e.g. Home › The Range › Waterless Diffusers ›
 * The Monolith. Every step but the last links back up. The matching
 * BreadcrumbList markup is emitted by the page, from the same steps.
 */
export function Breadcrumbs({ trail, className }: { trail: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[0.62rem] uppercase tracking-[0.24em] text-[color:var(--color-charcoal-soft)]", className)}>
      <ol className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {trail.map((c, i) => (
          <li key={c.label} className="flex items-center gap-x-2.5">
            {i > 0 && <span aria-hidden="true">›</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-[color:var(--color-clay)]">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-[color:var(--color-charcoal)]">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
