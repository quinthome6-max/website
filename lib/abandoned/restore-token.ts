// A link that puts an abandoned bag back in a customer's browser.
//
// The bag lives in a Shopify cart whose id is a bearer secret: whoever holds it
// can read the delivery details on it. So the id is never written anywhere a
// customer could see it raw. Staff send a signed token instead, and only this
// server can turn it back into a cart.

import crypto from "node:crypto";
import { apiSecret } from "@/lib/shopify/oauth";

/** Shopify drops an untouched cart after ten days; the link outlives it a little. */
const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function secret(): string | undefined {
  return process.env.ADMIN_SESSION_SECRET || apiSecret();
}

const sign = (payload: string, key: string): string =>
  crypto.createHmac("sha256", key).update(payload).digest("base64url");

/** `<cartId, base64url>.<expiry>.<signature>`, or null with no secret set. */
export function issueRestoreToken(cartId: string, nowMs = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const payload = `${Buffer.from(cartId, "utf8").toString("base64url")}.${nowMs + TOKEN_TTL_MS}`;
  return `${payload}.${sign(payload, key)}`;
}

/** The cart id a token was issued for, or null if it is forged or expired. */
export function readRestoreToken(token: string, nowMs = Date.now()): string | null {
  const key = secret();
  if (!key || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [cartPart, expiryPart, signature] = parts;

  const expected = Buffer.from(sign(`${cartPart}.${expiryPart}`, key), "utf8");
  const given = Buffer.from(signature, "utf8");
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return null;
  }
  const expiresAt = Number(expiryPart);
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return null;

  const cartId = Buffer.from(cartPart, "base64url").toString("utf8");
  return cartId.startsWith("gid://shopify/Cart/") ? cartId : null;
}
