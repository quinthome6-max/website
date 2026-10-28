import Link from "next/link";
import { DIWALI_GUIDE, diwaliSeason } from "@/lib/seasonal";

export function AnnouncementBar() {
  // During Diwali the bar also links to the gifting guide, from every page.
  // On phones the shipping line is shortened so the bar stays two lines.
  const diwali = diwaliSeason();
  return (
    <div
      data-site-chrome
      className="border-b border-[color:var(--color-verdant)] bg-[color:var(--color-verdant)] text-[color:var(--color-ivory)]"
    >
      <div className="mx-auto flex max-w-[var(--container-page)] flex-wrap items-center justify-center gap-x-6 gap-y-1 px-6 py-2.5 text-[0.68rem] uppercase tracking-[0.18em] md:px-10">
        {diwali && (
          <Link href={DIWALI_GUIDE} className="text-center underline-offset-4 hover:underline">
            Diwali gifting guide →
          </Link>
        )}
        {diwali ? (
          <span className="text-center">
            <span className="md:hidden">Free shipping above ₹5000</span>
            <span className="hidden md:inline">Complimentary shipping on orders above ₹5000</span>
          </span>
        ) : (
          <span className="text-center">Complimentary shipping on orders above ₹5000</span>
        )}
      </div>
    </div>
  );
}
