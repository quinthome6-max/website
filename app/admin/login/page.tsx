import { redirect } from "next/navigation";
import {
  adminPasswordConfigured,
  currentViewer,
  marketingPasswordConfigured,
} from "@/lib/admin/session";
import { oauthConfigured } from "@/lib/shopify/oauth";

export const dynamic = "force-dynamic";

/**
 * Sign-in is Shopify's own: completing the OAuth round trip proves the person
 * can log into this store's admin, so there is no separate password to manage
 * or leak.
 */
export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const viewer = await currentViewer();
  if (viewer) redirect(viewer.role === "marketing" ? "/admin/abandoned" : "/admin");
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[26rem] flex-col justify-center px-6">
      {/* Deliberately says nothing: no brand, no purpose, no hint about what
          is behind it. Somebody who reaches this URL without being told what it
          is should learn nothing from it. */}
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", lineHeight: 1.1 }}>
        Sign in
      </h1>

      {error && (
        <p className="mt-5 border-l-2 border-[color:var(--color-clay)] bg-[color:var(--color-stardust-soft)] p-3 text-[0.78rem] leading-[1.6]">
          {/* One message for every failure except the lockout. Naming the
              reason would tell an attacker whether a passphrase was close, or
              whether this deployment even has one. */}
          {error === "throttled"
            ? "Locked. Try again in 2 hours."
            : "Sign-in failed."}
        </p>
      )}

      {oauthConfigured() ? (
        <a
          href="/api/admin/login"
          className="mt-8 inline-flex items-center justify-center gap-3 bg-[color:var(--color-charcoal)] px-8 py-4 text-[0.72rem] uppercase tracking-[0.3em] text-[color:var(--color-ivory)] transition-colors hover:bg-[color:var(--color-clay-deep)]"
        >
          Continue with Shopify
        </a>
      ) : null}

      {/* Passphrase, for somebody who needs the invoices but has no Shopify
          account — an accountant, typically. Hidden entirely when unset, so an
          unconfigured deployment shows no way in rather than a dead form. */}
      {(adminPasswordConfigured() || marketingPasswordConfigured()) && (
        <>
          {oauthConfigured() && (
          <div className="mt-10 flex items-center gap-4">
            <span className="h-px flex-1 bg-[color:var(--color-rule)]" />
            <span className="text-[0.56rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)]">
              or
            </span>
            <span className="h-px flex-1 bg-[color:var(--color-rule)]" />
          </div>
          )}

          <form action="/api/admin/password" method="post" className="mt-8">
            {/* Honeypot. Hidden from people and from assistive technology, but
                present in the markup, so automation that fills every field it
                finds identifies itself. */}
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute h-0 w-0 overflow-hidden opacity-0"
            />
            <label className="block">
              <span className="text-[0.56rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)]">
                Passphrase
              </span>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="mt-2 w-[100%] border-b border-[color:var(--color-charcoal)] bg-transparent py-2.5 text-[0.95rem] outline-none transition-colors focus:border-[color:var(--color-clay)]"
              />
            </label>
            <button
              type="submit"
              className="mt-6 w-[100%] border border-[color:var(--color-charcoal)] px-8 py-3.5 text-[0.68rem] uppercase tracking-[0.28em] transition-colors hover:bg-[color:var(--color-charcoal)] hover:text-[color:var(--color-ivory)]"
            >
              Sign in with passphrase
            </button>
          </form>
        </>
      )}
    </div>
  );
}
