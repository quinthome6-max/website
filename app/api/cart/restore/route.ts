import { NextResponse, type NextRequest } from "next/server";
import { cartGet } from "@/lib/shopify/cart";
import { CART_COOKIE } from "@/lib/shopify/cart-cookie";
import { readRestoreToken } from "@/lib/abandoned/restore-token";

export const dynamic = "force-dynamic";

/**
 * Puts an abandoned bag back in the customer's browser and opens checkout.
 *
 * The link is sent by staff from /admin/abandoned, and works on any device —
 * the customer may have started on a laptop and be reading WhatsApp on a
 * phone. The token is signed (lib/abandoned/restore-token.ts), so it cannot be
 * made up to reach someone else's bag.
 */
export async function GET(request: NextRequest) {
  const to = (path: string) =>
    NextResponse.redirect(new URL(path, request.url), 303);

  const cartId = readRestoreToken(request.nextUrl.searchParams.get("t") ?? "");
  if (!cartId) return to("/range");

  let cart = null;
  try {
    cart = await cartGet(cartId);
  } catch {
    /* treated as gone */
  }
  // Shopify forgets a bag after ten idle days; a paid one has been emptied.
  if (!cart || cart.lines.length === 0) return to("/range");

  const res = to("/checkout");
  res.cookies.set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
