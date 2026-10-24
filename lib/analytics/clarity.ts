/**
 * Microsoft Clarity tags and events, so a recording can be found by what
 * happened in it: filter Recordings by Custom tags (order = #1012) or by the
 * Smart events purchase / begin_checkout / add_to_cart.
 *
 * Clarity loads late (lazyOnload, components/analytics/clarity.tsx), so calls
 * made before it arrives go onto the same queue its snippet uses, and Clarity
 * replays them when it starts. Never pass names, emails or phone numbers.
 */

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

function clarity(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { clarity?: ClarityFn };
  if (!w.clarity) {
    const stub: ClarityFn = (...a: unknown[]) => {
      (stub.q = stub.q || []).push(a);
    };
    w.clarity = stub;
  }
  try {
    w.clarity(...args);
  } catch {
    // Tracking must never break the page.
  }
}

/** A custom tag on this session, filterable in Clarity. */
export function clarityTag(key: string, value: string): void {
  clarity("set", key, value);
}

/** A custom event, listed under Smart events in Clarity. */
export function clarityEvent(name: string): void {
  clarity("event", name);
}

/** Asks Clarity to keep this session's recording even if it samples. */
export function clarityKeep(reason: string): void {
  clarity("upgrade", reason);
}
