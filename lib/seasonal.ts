/**
 * Seasonal pieces of the storefront switch themselves off, so nothing seasonal
 * outstays its season if no one remembers to take it down. Pages re-render at
 * least every few minutes (ISR), so each disappears shortly after its date.
 */

/** Diwali 2026 is Sunday 8 November; the push runs to the end of Monday the 9th, IST. */
const DIWALI_ENDS = Date.parse("2026-11-09T23:59:59+05:30");

export const DIWALI_GUIDE = "/journal/diwali-gifting-guide";

export function diwaliSeason(now = Date.now()): boolean {
  return now < DIWALI_ENDS;
}
