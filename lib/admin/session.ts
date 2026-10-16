import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiSecret, normalizeShop, shopDomain } from "@/lib/shopify/oauth";

/**
 * Staff session for /admin.
 *
 * Access is proven by completing Shopify's OAuth flow: only somebody who can
 * log into this store's Shopify admin can finish it. Rather than keep a session
 * store, the cookie is a value signed with the app secret — the same secret
 * Shopify signs its own callbacks with — so it cannot be forged without it.
 *
 * The check runs in a server layout rather than in proxy.ts: the Next docs are
 * explicit that proxy should be a last resort, and a layout keeps the decision
 * next to the pages it protects. Every /admin page is dynamic for this reason,
 * so nothing protected is ever prerendered into the CDN.
 */
export const ADMIN_COOKIE = "quint_admin_session";

/** Marks a passphrase sign-in, so the header can show how someone got in. It is
 *  deliberately not a valid shop domain, so it cannot collide with one. */
export const PASSWORD_PRINCIPAL = "passphrase";

/** Marks a sign-in with the marketing passphrase: abandoned checkouts only,
 *  nothing else in /admin. Likewise not a valid shop domain. */
export const MARKETING_PRINCIPAL = "marketing";

/** Eight hours. Long enough for a working day, short enough that a forgotten
 *  laptop stops mattering by morning. */
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

const b64 = (v: string) => Buffer.from(v, "utf8").toString("base64url");

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Key the session cookie is signed with.
 *
 * ADMIN_SESSION_SECRET when set, otherwise the Shopify app secret, which every
 * deployment that can talk to Shopify already has. Tying it solely to the
 * Shopify secret would mean passphrase sign-in silently failing wherever that
 * secret is absent — which is precisely how it first behaved.
 */
function sessionSecret(): string | undefined {
  return process.env.ADMIN_SESSION_SECRET || apiSecret();
}

/** `<shop>.<expiry>.<signature>` — self-contained, so no session table. */
export function issueSession(shop: string, expiresAtMs: number): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const payload = `${b64(normalizeShop(shop))}.${expiresAtMs}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** The shop this cookie is good for, or null if it is absent, malformed,
 *  expired, for another shop, or not signed by us. */
export function verifySession(value: string | undefined, nowMs: number): string | null {
  const secret = sessionSecret();
  if (!secret || !value) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [shopPart, expiryPart, signature] = parts;

  const expected = sign(`${shopPart}.${expiryPart}`, secret);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  // Compare before trusting any of the payload.
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const expiresAt = Number(expiryPart);
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return null;

  let shop: string;
  try {
    shop = Buffer.from(shopPart, "base64url").toString("utf8");
  } catch {
    return null;
  }
  // A token minted for a different store must not open this one. The
  // passphrase principal is not a shop, so it is allowed through explicitly
  // rather than by loosening the comparison.
  if (shop === PASSWORD_PRINCIPAL || shop === MARKETING_PRINCIPAL) return shop;
  return shop && shop === normalizeShop(shopDomain()) ? shop : null;
}

/**
 * The signed-in staff member for the current request, or null.
 *
 * Staff means full access. A marketing sign-in is deliberately not staff, so
 * every existing check on this function — invoices, payments, gift stock and
 * their routes — keeps the marketing team out without each needing a change.
 */
export async function currentStaffShop(): Promise<string | null> {
  const viewer = await currentViewer();
  return viewer?.role === "staff" ? viewer.principal : null;
}

export type AdminRole = "staff" | "marketing";

/** Whoever is signed in to /admin, with what they may see, or null. */
export async function currentViewer(): Promise<{ principal: string; role: AdminRole } | null> {
  const jar = await cookies();
  const principal = verifySession(jar.get(ADMIN_COOKIE)?.value, Date.now());
  if (!principal) return null;
  return { principal, role: principal === MARKETING_PRINCIPAL ? "marketing" : "staff" };
}

/** For staff-only pages: sends a marketing sign-in to the one page it may use. */
export async function requireStaff(): Promise<string> {
  const viewer = await currentViewer();
  if (!viewer) redirect("/admin/login");
  if (viewer.role !== "staff") redirect("/admin/abandoned");
  return viewer.principal;
}

/**
 * A shared passphrase, as a second way in beside the Shopify sign-in — for an
 * accountant who needs the invoices but has no Shopify account.
 *
 * Optional: leave ADMIN_PASSWORD unset and this route is simply closed, rather
 * than the section falling open to anyone who guesses an empty string.
 */
export const adminPasswordConfigured = (): boolean =>
  Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8);

/**
 * Compared in constant time and over digests rather than the raw strings, so
 * neither the comparison's duration nor the inputs' differing lengths leak
 * anything about the secret.
 */
export function passwordMatches(candidate: string): boolean {
  return secretMatches(candidate, process.env.ADMIN_PASSWORD);
}

/**
 * A second passphrase for the performance-marketing team. It opens abandoned
 * checkouts and nothing else. Unset (or under 8 characters) means closed.
 */
export const marketingPasswordConfigured = (): boolean =>
  Boolean(process.env.MARKETING_PASSWORD && process.env.MARKETING_PASSWORD.length >= 8);

export function marketingPasswordMatches(candidate: string): boolean {
  return secretMatches(candidate, process.env.MARKETING_PASSWORD);
}

function secretMatches(candidate: string, expected: string | undefined): boolean {
  if (!expected || expected.length < 8) return false;
  const a = crypto.createHash("sha256").update(candidate, "utf8").digest();
  const b = crypto.createHash("sha256").update(expected, "utf8").digest();
  return crypto.timingSafeEqual(a, b);
}


