import { FREE_SHIPPING_FROM } from "@/lib/checkout-config";

/**
 * Four reassurances directly under Add to bag, where the doubt is. Each line
 * is a policy the site already publishes, so none of it can drift from what
 * actually happens to the order:
 *
 *   shipping  – free from FREE_SHIPPING_FROM (lib/checkout-config)
 *   dispatch  – within 3 business days, from Mumbai (/shipping)
 *   payment   – PayU: cards, UPI, net banking, wallets (checkout form)
 *   cover     – the 1-year device warranty, or the damage exchange (/shipping)
 *
 * There is no cash on delivery and no published order count, so neither
 * appears here.
 */
export function TrustStrip({
  priceINR,
  warranty,
}: {
  priceINR: number;
  /** Devices carry the 1-year limited warranty; oils and candles don't. */
  warranty: boolean;
}) {
  const shipsFree = priceINR >= FREE_SHIPPING_FROM;
  const items = [
    {
      icon: TRUCK,
      title: "Free shipping",
      sub: shipsFree ? "On this order" : "Over ₹5,000",
    },
    { icon: BOX, title: "Ships in 3 days", sub: "From Mumbai" },
    { icon: SHIELD, title: "Secure checkout", sub: "UPI, cards, wallets" },
    warranty
      ? { icon: BADGE, title: "1-year warranty", sub: "On the device" }
      : { icon: BADGE, title: "Easy exchange", sub: "If it arrives damaged" },
  ];

  return (
    // Top rule only: every block that follows draws its own top rule, so a
    // bottom one here doubled up into two lines with a gap between.
    <ul className="grid grid-cols-4 gap-1 border-t border-[color:var(--color-rule)] pt-5 sm:gap-2">
      {items.map((it) => (
        <li key={it.title} className="flex flex-col items-center text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-6 w-6 text-[color:var(--color-aerial-deep)]"
          >
            {it.icon}
          </svg>
          <span className="mt-2 text-[0.66rem] font-medium uppercase leading-[1.25] tracking-[0.08em] text-[color:var(--color-charcoal)] sm:text-[0.7rem]">
            {it.title}
          </span>
          <span className="mt-0.5 text-[0.66rem] leading-[1.3] text-[color:var(--color-charcoal-soft)] sm:text-[0.7rem]">
            {it.sub}
          </span>
        </li>
      ))}
    </ul>
  );
}

const TRUCK = (
  <>
    <path d="M2.5 6.5h11v9h-11z" />
    <path d="M13.5 9.5h4l3 3v3h-7" />
    <circle cx="6.5" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </>
);
const BOX = (
  <>
    <path d="M12 2.8 20.5 7.3v9.4L12 21.2l-8.5-4.5V7.3z" />
    <path d="M3.5 7.3 12 11.8l8.5-4.5M12 11.8v9.4" />
  </>
);
const SHIELD = (
  <>
    <path d="M12 2.8 19.5 5.6v6c0 4.6-3.2 8.2-7.5 9.6-4.3-1.4-7.5-5-7.5-9.6v-6z" />
    <path d="m8.8 12 2.2 2.2 4.2-4.4" />
  </>
);
const BADGE = (
  <>
    <circle cx="12" cy="9.5" r="6" />
    <path d="m8.6 14.4-1.4 6.8 4.8-2.6 4.8 2.6-1.4-6.8" />
  </>
);
