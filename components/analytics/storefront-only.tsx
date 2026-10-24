"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Renders the trackers (Clarity, Meta Pixel, GA4) on the shop only, never in
 * the back office. Clarity records the page itself, and the invoice and order
 * pages show customers' names, phone numbers and addresses, which must not be
 * sent to a third party. It also keeps operators' visits out of ad audiences
 * and analytics.
 *
 * The back office is /admin/* on quinthome.in and every path on
 * pdf.quinthome.in (rewritten onto /admin, see next.config.ts), so both the
 * path and the host are checked, in the browser, where the host is known.
 */
const noSubscribe = () => () => {};

export function StorefrontOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  // "" on the server and during hydration; the real host once in the browser.
  const host = useSyncExternalStore(noSubscribe, () => window.location.hostname, () => "");
  if (!host) return null;

  const backOffice =
    pathname === "/admin" || pathname.startsWith("/admin/") || host.startsWith("pdf.");
  return backOffice ? null : <>{children}</>;
}
