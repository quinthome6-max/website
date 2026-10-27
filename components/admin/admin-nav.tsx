"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import {
  IconCard,
  IconCart,
  IconDashboard,
  IconGift,
  IconLogout,
  IconQuote,
  IconReceipt,
  IconStar,
  IconStore,
} from "./icons";

interface Item {
  href: string;
  label: string;
  icon: ReactNode;
  /** Other paths that belong to this section (an invoice is part of Orders). */
  also?: string[];
  staffOnly: boolean;
}

const ITEMS: Item[] = [
  { href: "/admin", label: "Dashboard", icon: <IconDashboard />, staffOnly: true },
  { href: "/admin/orders", label: "Orders & GST", icon: <IconReceipt />, also: ["/admin/invoice"], staffOnly: true },
  { href: "/admin/quotes", label: "Quotations", icon: <IconQuote />, staffOnly: true },
  { href: "/admin/abandoned", label: "Abandoned checkouts", icon: <IconCart />, staffOnly: false },
  { href: "/admin/payments", label: "Payments", icon: <IconCard />, staffOnly: true },
  { href: "/admin/reviews", label: "Reviews", icon: <IconStar />, staffOnly: true },
  { href: "/admin/gift-stock", label: "Gift stock", icon: <IconGift />, staffOnly: true },
];

/** On pdf.quinthome.in the paths arrive without the /admin prefix. */
function normalise(path: string): string {
  if (path === "/admin" || path.startsWith("/admin/")) return path;
  return path === "/" ? "/admin" : `/admin${path}`;
}

function isActive(item: Item, path: string): boolean {
  if (item.href === "/admin") return path === "/admin";
  return [item.href, ...(item.also ?? [])].some((h) => path === h || path.startsWith(`${h}/`));
}

/**
 * The back office's navigation: a fixed sidebar on a computer, a row of
 * swipeable tabs along the top on a phone.
 */
export function AdminNav({ staff, who }: { staff: boolean; who: string }) {
  const path = normalise(usePathname() ?? "/admin");
  const items = ITEMS.filter((i) => staff || !i.staffOnly);

  return (
    <>
      {/* Phone and tablet: brand bar, then tabs */}
      <div className="sticky top-0 z-30 border-b border-black/20 bg-[color:var(--color-verdant)] text-[color:var(--color-ivory)] lg:hidden">
        <div className="flex items-center justify-between px-5 py-3">
          <Brand />
          <SignOut compact />
        </div>
        <nav aria-label="Back office" className="flex gap-1 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none]">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={isActive(i, path) ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 px-3 py-2 text-[0.66rem] font-medium uppercase tracking-[0.16em] transition-colors",
                isActive(i, path) ? "bg-[color:var(--color-ivory)] text-[color:var(--color-verdant)]" : "text-[color:var(--color-ivory)]/75 hover:text-[color:var(--color-ivory)]"
              )}
            >
              {i.icon}
              {i.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Computer: sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col bg-[color:var(--color-verdant)] text-[color:var(--color-ivory)] lg:flex">
        <div className="px-6 pb-6 pt-7">
          <Brand />
        </div>
        <nav aria-label="Back office" className="flex flex-1 flex-col gap-0.5 px-3">
          {items.map((i) => {
            const on = isActive(i, path);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 text-[0.8rem] transition-colors",
                  on
                    ? "bg-white/10 text-[color:var(--color-ivory)] before:absolute before:inset-y-1.5 before:left-0 before:w-[2px] before:bg-[color:var(--color-stardust)]"
                    : "text-[color:var(--color-ivory)]/70 hover:bg-white/5 hover:text-[color:var(--color-ivory)]"
                )}
              >
                {i.icon}
                {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-3 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 text-[0.8rem] text-[color:var(--color-ivory)]/70 transition-colors hover:text-[color:var(--color-ivory)]"
          >
            <IconStore />
            Storefront
          </Link>
          <SignOut />
          <p className="mt-3 truncate px-3 text-[0.62rem] uppercase tracking-[0.18em] text-[color:var(--color-ivory)]/45" title={who}>
            {who}
          </p>
        </div>
      </aside>
    </>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="block" aria-label="Quint Home back office">
      <Logo className="h-9 w-auto text-[color:var(--color-ivory)]" />
      <span className="mt-2.5 block text-[0.52rem] uppercase tracking-[0.42em] text-[color:var(--color-ivory)]/55">Back office</span>
    </Link>
  );
}

function SignOut({ compact }: { compact?: boolean }) {
  return (
    <form action="/api/admin/logout" method="post">
      <button
        type="submit"
        className={cn(
          "flex items-center gap-3 text-[color:var(--color-ivory)]/70 transition-colors hover:text-[color:var(--color-ivory)]",
          compact ? "text-[0.62rem] uppercase tracking-[0.18em]" : "w-full px-3 py-2 text-[0.8rem]"
        )}
      >
        <IconLogout />
        Sign out
      </button>
    </form>
  );
}
