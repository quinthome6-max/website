import Link from "next/link";
import { redirect } from "next/navigation";
import { currentViewer } from "@/lib/admin/session";

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
  const viewer = await currentViewer();
  if (!viewer) redirect("/admin/login");
  // The marketing passphrase opens abandoned checkouts only. Its menu shows
  // nothing else, and each staff page also checks for itself (requireStaff).
  const staff = viewer.role === "staff";
  const link =
    "text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)] underline-offset-4 hover:underline";

  return (
    <div className="mx-auto max-w-[76rem] px-6 py-10 md:px-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b border-[color:var(--color-rule)] pb-5">
        <div className="flex items-baseline gap-6">
          {staff && (
            <>
              <Link
                href="/admin"
                className="text-[0.62rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal)]"
              >
                GST &amp; Invoices
              </Link>
              <Link href="/admin/gift-stock" className={link}>
                Gift stock
              </Link>
              <Link href="/admin/payments" className={link}>
                Payments
              </Link>
              <Link href="/admin/reviews" className={link}>
                Reviews
              </Link>
            </>
          )}
          <Link href="/admin/abandoned" className={link}>
            Abandoned checkouts
          </Link>
          <Link href="/" className={link}>
            ← Storefront
          </Link>
        </div>
        <div className="flex items-baseline gap-5 text-[0.7rem] text-[color:var(--color-charcoal-soft)]">
          <span>{staff ? viewer.principal : "Marketing"}</span>
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
