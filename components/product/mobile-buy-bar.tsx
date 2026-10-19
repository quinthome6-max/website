"use client";

import { useEffect, useState } from "react";
import { PriceTag } from "@/components/product/price-tag";
import { cn } from "@/lib/utils";

/**
 * Sticky price + CTA bar for mobile PDPs. On small screens the gallery stacks
 * above the buy box, pushing the price below the fold — this keeps the price
 * and a jump-to-buy action visible at all times. Hidden on lg and up.
 *
 * It steps aside while the real buy box (#buy) is on screen, so the shopper
 * never sees two Add to bag buttons at once.
 */
export function MobileBuyBar({
  name,
  priceINR,
  listPriceINR,
}: {
  name: string;
  priceINR: number;
  listPriceINR?: number;
}) {
  const [buyBoxVisible, setBuyBoxVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById("buy");
    if (!target) return;
    const io = new IntersectionObserver(
      ([entry]) => setBuyBoxVisible(entry.isIntersecting),
      { threshold: 0.25 }
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  return (
    // data-mobile-buy-bar / data-hidden: the WhatsApp button and <body> read
    // these to clear the bar (see whatsapp-button.tsx and app/layout.tsx).
    <div
      data-mobile-buy-bar
      data-hidden={buyBoxVisible || undefined}
      aria-hidden={buyBoxVisible || undefined}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--color-rule)] bg-[color:var(--color-white)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform duration-300 ease-[var(--ease-quint)] lg:hidden",
        buyBoxVisible && "pointer-events-none translate-y-full"
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-[var(--container-page)] items-center justify-between gap-4 px-5">
        <div className="min-w-0">
          <p className="truncate text-[0.66rem] uppercase tracking-[0.2em] text-[color:var(--color-charcoal-soft)]">
            {name}
          </p>
          <PriceTag
            price={priceINR}
            listPrice={listPriceINR}
            className="leading-none"
            priceClassName="tabular-nums text-[color:var(--color-charcoal)]"
            priceStyle={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem" }}
            listClassName="text-[0.72rem]"
          />
        </div>
        <a
          href="#buy"
          tabIndex={buyBoxVisible ? -1 : undefined}
          className="shrink-0 bg-[color:var(--color-charcoal)] px-6 py-3 text-[0.7rem] uppercase tracking-[0.28em] text-[color:var(--color-ivory)] transition-colors hover:bg-[color:var(--color-clay-deep)]"
        >
          Add to bag
        </a>
      </div>
    </div>
  );
}
