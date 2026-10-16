/**
 * Google Analytics 4 — the thin wrapper the Meta Pixel helpers call.
 *
 * Every shop event already passes through lib/analytics/pixel.ts; each one
 * there also calls into this file, so GA4 and Meta always count the same
 * moments. Nothing here loads gtag.js — components/analytics/google-analytics.tsx
 * does that once in the layout — and with no measurement id set, every call
 * is a no-op.
 *
 * Page views are GA4's own: "enhanced measurement" counts client-side route
 * changes from the browser history, so they are not sent by hand.
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

type Gtag = (...args: unknown[]) => void;

function gtag(...args: unknown[]): void {
  if (!GA_ID || typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: Gtag };
  // gtag.js reads the queue when it arrives, so an event sent before the
  // script has loaded is not lost.
  w.dataLayer = w.dataLayer || [];
  if (w.gtag) w.gtag(...args);
  else w.dataLayer.push(args);
}

export interface GaItem {
  item_id: string;
  item_name?: string;
  item_category?: string;
  price?: number;
  quantity?: number;
}

export function gaEvent(name: string, params: Record<string, unknown>): void {
  gtag("event", name, { currency: "INR", ...params });
}
