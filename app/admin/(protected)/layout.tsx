import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStaffShop } from "@/lib/admin/session";

/**
 * Gate for everything under /admin.
 *
 * The check lives here rather than in proxy.ts because this Next.js renamed the
 * middleware convention to proxy and its docs advise against using it for auth.
 * A layout also keeps the decision beside the pages it protects.
 *
 * force-dynamic matters as much as the check itself: without it a protected
 * page could be prerendered and served from the CDN to anyone.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shop = await currentStaffShop();
  if (!shop) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-[76rem] px-6 py-10 md:px-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b border-[color:var(--color-rule)] pb-5">
        <div className="flex items-baseline gap-6">
          <Link
            href="/admin"
            className="text-[0.62rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal)]"
          >
            GST &amp; Invoices
          </Link>
          <Link
            href="/admin/gift-stock"
            className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)] underline-offset-4 hover:underline"
          >
            Gift stock
          </Link>
          <Link
            href="/admin/payments"
            className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)] underline-offset-4 hover:underline"
          >
            Payments
          </Link>
          <Link
            href="/admin/abandoned"
            className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)] underline-offset-4 hover:underline"
          >
            Abandoned
          </Link>
          <Link
            href="/"
            className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)] underline-offset-4 hover:underline"
          >
            ← Storefront
          </Link>
        </div>
        <div className="flex items-baseline gap-5 text-[0.7rem] text-[color:var(--color-charcoal-soft)]">
          <span>{shop}</span>
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="text-[0.62rem] uppercase tracking-[0.28em] underline-offset-4 hover:text-[color:var(--color-charcoal)] hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
