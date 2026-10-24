import type { CSSProperties, ReactNode } from "react";
import { formatINR } from "@/lib/utils";

/**
 * A selling price with its list price struck through beside it.
 *
 * Both numbers come from Shopify at runtime (price and compareAtPrice); the
 * values in lib/data are only the fallback for when the store can't be
 * reached. The strikethrough renders solely when the list price is genuinely
 * higher, so a product that isn't marked down shows one plain price and this
 * behaves exactly as the old bare formatINR call did.
 */
export function percentOff(price: number, listPrice?: number): number | null {
  if (!listPrice || listPrice <= price) return null;
  const pc = Math.round((1 - price / listPrice) * 100);
  return pc > 0 ? pc : null;
}

export function PriceTag({
  price,
  listPrice,
  priceClassName = "tabular-nums",
  priceStyle,
  listClassName = "text-[0.8em]",
  badge = false,
  className = "",
  suffix,
}: {
  price: number;
  listPrice?: number;
  priceClassName?: string;
  priceStyle?: CSSProperties;
  /** Sizing for the struck-through figure; colour and rule come from here. */
  listClassName?: string;
  /** Show the "−20%" pill. Reserved for the buy box, where it does work. */
  badge?: boolean;
  className?: string;
  /** Rendered after the prices, inside the same baseline row. */
  suffix?: ReactNode;
}) {
  const off = percentOff(price, listPrice);

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1 ${className}`}>
      <span className={priceClassName} style={priceStyle}>
        {formatINR(price)}
      </span>
      {off !== null && (
        <>
          <span
            className={`tabular-nums text-[color:var(--color-charcoal-soft)] line-through decoration-[color:var(--color-charcoal-soft)]/50 ${listClassName}`}
          >
            {formatINR(listPrice!)}
          </span>
          {badge && (
            <span className="rounded-full bg-[color:var(--color-clay-text)] px-2 py-0.5 text-[0.58rem] uppercase leading-[1.6] tracking-[0.24em] text-[color:var(--color-ivory)]">
              −{off}%
            </span>
          )}
        </>
      )}
      {suffix}
    </span>
  );
}
