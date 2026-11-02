import Image from "next/image";
import Link from "next/link";
import { PriceTag } from "@/components/product/price-tag";
import { cn } from "@/lib/utils";

export interface ShopCard {
  slug: string;
  name: string;
  image: string;
  kind: string;
  line: string;
  badge?: string;
  price: number;
  listPrice?: number;
  soldOut: boolean;
}

/**
 * Products placed inside a journal piece, where the reader has just been told
 * why they suit: picture, what it is, the fact that matters, live price, and
 * a way to buy. One card runs across the column; two or three sit side by side.
 */
export function ShopBlock({ label, cards }: { label?: string; cards: ShopCard[] }) {
  if (!cards.length) return null;
  const single = cards.length === 1;
  return (
    <aside className="my-2 border border-[color:var(--color-rule)] bg-[color:var(--color-stardust-soft)] p-4 md:p-6">
      <p className="text-[0.6rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
        {label ?? "Shop the guide"}
      </p>
      <ul
        className={cn(
          "mt-4 grid gap-4",
          !single && (cards.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")
        )}
      >
        {cards.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/range/${c.slug}`}
              className={cn(
                "group flex h-full gap-4 bg-[color:var(--color-white)] p-3 transition-shadow duration-500 hover:shadow-[0_10px_30px_-18px_rgba(58,53,50,0.45)]",
                single ? "items-center sm:p-4" : "sm:flex-col"
              )}
            >
              <div
                className={cn(
                  "relative aspect-[4/5] shrink-0 overflow-hidden bg-[color:var(--color-aerial-soft)]",
                  single ? "w-28 sm:w-36" : "w-24 sm:w-full"
                )}
              >
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes={single ? "144px" : "(min-width: 640px) 220px, 96px"}
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-[0.58rem] uppercase tracking-[0.24em] text-[color:var(--color-charcoal-soft)]">
                  {c.kind}
                </p>
                <p
                  className="mt-1 leading-tight"
                  style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", fontWeight: 400 }}
                >
                  {c.name}
                </p>
                <p className="mt-1 text-[0.8rem] leading-[1.45] text-[color:var(--color-charcoal-soft)]">
                  {c.line}
                </p>
                {/* Beside the text, never over the photo. */}
                {c.badge && (
                  <span className="mt-2 w-fit whitespace-nowrap bg-[color:var(--color-clay)] px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-[color:var(--color-ivory)]">
                    {c.badge}
                  </span>
                )}
                <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pt-3">
                  <PriceTag price={c.price} listPrice={c.listPrice} className="text-[0.95rem]" />
                  <span
                    className={cn(
                      "text-[0.62rem] uppercase tracking-[0.22em]",
                      c.soldOut
                        ? "text-[color:var(--color-charcoal-soft)]"
                        : "text-[color:var(--color-clay)] group-hover:underline group-hover:underline-offset-4"
                    )}
                  >
                    {c.soldOut ? "Sold out" : "Shop now →"}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
