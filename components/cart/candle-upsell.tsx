"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "./cart-provider";
import { cn, formatINR } from "@/lib/utils";
import { clarityEvent } from "@/lib/analytics/clarity";
import type { CandleOffer } from "@/lib/candle-offers";

/**
 * "Add a candle": the soy candles as small cards, photo first, in the bag
 * drawer (which opens on every add) and on the bag page.
 *
 * Candles already in the bag are left out, and the block disappears once all
 * of them are. On the bag page an add stays on the page rather than sliding
 * the drawer open over it.
 */
export function CandleUpsell({
  offers,
  variant,
}: {
  offers: CandleOffer[];
  variant: "drawer" | "page";
}) {
  const { cart, add, pending, setOpen } = useCart();
  const [adding, setAdding] = useState<string | null>(null);
  const inBag = new Set((cart?.lines ?? []).map((l) => l.merchandiseId));
  const shown = offers.filter((o) => !inBag.has(o.variantId));
  if (shown.length === 0) return null;

  const drawer = variant === "drawer";

  return (
    <section
      aria-label="Add a candle"
      className={cn(
        drawer ? "pb-4 pt-6" : "mt-12 border-t border-[color:var(--color-rule)] pt-10"
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[0.62rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
          Add a candle
        </p>
        <p className="text-[0.7rem] text-[color:var(--color-charcoal-soft)]">
          Soy wax · up to 45 hours
        </p>
      </div>

      <ul className={cn("mt-4 grid grid-cols-3", drawer ? "gap-3" : "gap-5")}>
        {shown.map((o) => {
          const busy = adding === o.slug && pending;
          return (
            <li key={o.slug} className="flex min-w-0 flex-col">
              <Link
                href={`/range/${o.slug}`}
                onClick={() => drawer && setOpen(false)}
                className="group relative block aspect-[4/5] overflow-hidden bg-[color:var(--color-white)]"
              >
                <Image
                  src={o.image}
                  alt={`${o.name} soy wax candle`}
                  fill
                  sizes={drawer ? "120px" : "(min-width: 768px) 200px, 30vw"}
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </Link>
              <p
                className={cn("mt-2.5 truncate leading-tight", drawer ? "text-[0.85rem]" : "text-[1rem]")}
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {o.name}
              </p>
              <p className="mt-0.5 truncate text-[0.66rem] text-[color:var(--color-charcoal-soft)]">
                {o.notes}
              </p>
              <p className="mt-1 text-[0.8rem] tabular-nums">
                {formatINR(o.price)}
                {o.listPrice && (
                  <span className="ml-1.5 text-[0.7rem] text-[color:var(--color-charcoal-soft)] line-through">
                    {formatINR(o.listPrice)}
                  </span>
                )}
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setAdding(o.slug);
                  clarityEvent("candle_upsell_add");
                  add(o.variantId, 1, undefined, { openDrawer: drawer });
                }}
                className="mt-2.5 border border-[color:var(--color-charcoal)] py-2 text-[0.6rem] uppercase tracking-[0.24em] transition-colors duration-300 hover:bg-[color:var(--color-charcoal)] hover:text-[color:var(--color-ivory)] disabled:opacity-50"
              >
                {busy ? "Adding…" : "+ Add"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
