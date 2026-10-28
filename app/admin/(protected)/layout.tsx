import { redirect } from "next/navigation";
import { currentViewer, PASSWORD_PRINCIPAL } from "@/lib/admin/session";
import { AdminNav } from "@/components/admin/admin-nav";

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
  // The marketing passphrase opens abandoned checkouts and subscribers only.
  // Its menu shows nothing else, and each staff page also checks for itself
  // (requireStaff).
  const staff = viewer.role === "staff";
  const who =
    viewer.principal === PASSWORD_PRINCIPAL ? "Signed in with passphrase" : staff ? viewer.principal : "Marketing";

  return (
    <div className="min-h-screen bg-[color:var(--color-ivory)] lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <AdminNav staff={staff} who={who} />
      <main className="min-w-0 px-5 py-7 md:px-9 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-[82rem]">{children}</div>
      </main>
    </div>
  );
}
