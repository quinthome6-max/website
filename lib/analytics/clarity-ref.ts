/**
 * Links an order to its Clarity recording.
 *
 * Clarity keeps the visitor id in the _clck cookie and the session id in
 * _clsk; a recording's address is /player/<project>/<visitor>/<session>. The
 * checkout reads both when the customer presses Pay, and the order carries the
 * link, or a note that Clarity was not running in that browser (blocked, or
 * never loaded), which is itself worth knowing.
 */

export const CLARITY_PROJECT_ID = "ybcekf8e6g";

const ID = /^[a-z0-9]{3,20}$/;

/** "visitor.session" from document.cookie, or "none". Browser only. */
export function claritySessionRef(cookie: string): string {
  const get = (name: string) => {
    const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]).split("^")[0].split("|")[0] : "";
  };
  const visitor = get("_clck");
  const session = get("_clsk");
  return ID.test(visitor) && ID.test(session) ? `${visitor}.${session}` : "none";
}

/** Accepts only what claritySessionRef can produce; anything else is dropped. */
export function cleanClarityRef(raw: string): string | undefined {
  if (raw === "none") return raw;
  const [visitor, session, extra] = raw.split(".");
  return extra === undefined && ID.test(visitor ?? "") && ID.test(session ?? "") ? raw : undefined;
}

/** The value staff see on the order. Re-checked here, since it comes back
 *  from the cart, which anyone holding the cart id can write to. */
export function clarityRecordingNote(raw: string): string {
  const ref = cleanClarityRef(raw);
  if (!ref) return "Unknown";
  if (ref === "none") return "Not recorded: Clarity was not running in the buyer's browser";
  const [visitor, session] = ref.split(".");
  return `https://clarity.microsoft.com/player/${CLARITY_PROJECT_ID}/${visitor}/${session}`;
}
