// Google Customer Reviews: after an order, Google asks the buyer whether they
// will rate it later. The ratings become Quint Home's store rating (the stars
// beside the brand in Google Search and Shopping) and count towards Google's
// "Top Quality Store" badge. Needs the Customer Reviews programme switched on
// in Merchant Center (Growth → Manage programs); until then the box simply
// doesn't appear.
//
// The buyer's email never travels in a URL or through our server for this:
// the checkout keeps it in that browser tab's sessionStorage when Pay is
// pressed, and the thank-you page hands it to Google's box, then deletes it.

export const GCR_MERCHANT_ID = 5876359718;
const KEY = "qh:gcr";
/** Long enough for a slow PayU payment; short enough not to linger. */
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

export function rememberForReviewSurvey(email: string): void {
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ email, at: Date.now() }));
  } catch {
    /* private mode: no survey offer, nothing else changes */
  }
}

/** The email kept at checkout, once: reading it removes it. */
export function takeReviewSurveyEmail(): string | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const { email, at } = JSON.parse(raw) as { email?: string; at?: number };
    return email && at && Date.now() - at < MAX_AGE_MS ? email : null;
  } catch {
    return null;
  }
}

/**
 * When the order should have arrived, as YYYY-MM-DD: dispatch within 3
 * business days plus 3–5 in transit (see /shipping), counted as 8 weekdays.
 * Google sends its survey after this date, so erring late is the safe side.
 */
export function estimatedDeliveryDate(from: Date = new Date()): string {
  const d = new Date(from);
  let added = 0;
  while (added < 8) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
