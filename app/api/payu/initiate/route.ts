// Starts a PayU payment for the current bag.
//
// The customer's browser posts the checkout form here; we rebuild the order
// server-side (never trusting amounts from the client), sign it with the PayU
// salt, and hand back a self-submitting form that carries the customer to
// PayU's hosted payment page.
//
// This is also the last point at which an order can be turned down for free.
// Once the customer is on PayU's page the money moves before Shopify is asked
// anything, so whatever Shopify might refuse an order for — a phone number it
// will not accept, an item that has sold out — is checked here instead.

import { NextResponse, after, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { cartGetRecord, cartRecheckStock } from "@/lib/shopify/cart";
import { CART_COOKIE } from "@/lib/shopify/cart-cookie";
import {
  PAYU_PAYMENT_URL,
  buildPayuFields,
  encodeCartRef,
  formatAmount,
  newTxnId,
  payuConfigured,
} from "@/lib/payu/client";
import { reopenCart, writePendingOrder } from "@/lib/payu/pending";
import { shippingFor } from "@/lib/checkout-config";
import { isPinCode, isPlausibleEmail, normalisePhone } from "@/lib/checkout-contact";
import { getCommerceMap } from "@/lib/shopify/commerce";
import { auditCartGifts } from "@/lib/cart-gift-guard";
import { issueRestoreToken } from "@/lib/abandoned/restore-token";
import { DRAFT_HINT_COOKIE, readDraftHint } from "@/lib/abandoned/hint";
import { draftsConfigured, saveCheckoutDraft } from "@/lib/shopify/drafts";

/** Payment must never be served from a cache. */
export const dynamic = "force-dynamic";

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );

function field(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

export async function POST(request: NextRequest) {
  const back = (path: string) =>
    NextResponse.redirect(new URL(path, request.url), 303);

  if (!payuConfigured) {
    // Nothing is configured yet — fall back to the bag rather than 500.
    return back("/cart?error=payments-unavailable");
  }

  const form = await request.formData();

  const firstName = field(form, "firstName");
  const lastName = field(form, "lastName");
  const email = field(form, "email");
  const address1 = field(form, "address1");
  const address2 = field(form, "address2");
  const city = field(form, "city");
  const state = field(form, "state");
  const zip = field(form, "zip");
  const country = field(form, "country") || "India";

  if (!firstName || !email || !field(form, "phone") || !address1 || !city || !state) {
    return back("/checkout?error=missing-details");
  }
  // Shopify checks these when the order is written, which is too late to ask
  // the customer to fix them. A number it rejects is rejected here.
  const phone = normalisePhone(field(form, "phone"));
  if (!phone) return back("/checkout?error=phone");
  if (!isPlausibleEmail(email)) return back("/checkout?error=email");
  if (!isPinCode(zip)) return back("/checkout?error=pin");

  try {
    // Rebuild the order from Shopify — the browser never dictates the amount.
    const cartId = (await cookies()).get(CART_COOKIE)?.value;
    const record = cartId ? await cartGetRecord(cartId) : null;
    if (!record || record.cart.lines.length === 0) {
      return back("/cart?error=empty");
    }

    // A bag is not a reservation. Ask Shopify what it can still fill before
    // asking the customer to pay for it.
    const { cart, shortfalls } = await cartRecheckStock(record.cart);
    if (shortfalls.length > 0) {
      console.warn("[payu] refused: stock changed since the bag was filled", {
        shortfalls,
      });
      return back(
        `/cart?error=stock&item=${encodeURIComponent(shortfalls[0].title)}`
      );
    }
    if (cart.lines.length === 0) return back("/cart?error=empty");

    // The complimentary oil is a real ₹0 variant, which means it is publicly
    // addressable. Refuse a bag claiming more free oils than diffusers before a
    // payment page is ever shown.
    const commerce = await getCommerceMap();
    const gifts = auditCartGifts(cart, commerce);
    if (!gifts.ok) {
      console.warn("[payu] refused: unearned complimentary oils", {
        giftQuantity: gifts.giftQuantity,
        diffuserQuantity: gifts.diffuserQuantity,
      });
      return back("/cart?error=gift");
    }

    // cart.total is what Shopify says the goods cost after any discount code on
    // the cart. Charging the subtotal would ignore the code the customer was
    // shown, and charging anything the browser sent would be worse.
    const goods = cart.total;
    const shipping = shippingFor(goods);
    const total = goods + shipping;
    if (total <= 0) return back("/cart?error=empty");
    const txnid = newTxnId();

    // Everything needed to write the order once payment clears, kept on the
    // cart itself. Amounts are re-derived from Shopify at that point, so only
    // delivery details are recorded. This used to be a cookie, which tied the
    // order to this one browser coming back within half an hour.
    await reopenCart(cart.id, record.note);
    await writePendingOrder(cart.id, {
      txnid,
      customer: {
        email,
        phone: phone.e164,
        firstName,
        lastName,
        address1,
        address2,
        city,
        province: state,
        zip,
        country,
      },
    });

    // Keep the abandoned-checkout draft in step: this bag has now gone to
    // PayU. Run once the customer is already on their way, and never allowed
    // to fail the payment — see lib/shopify/drafts.ts.
    if (draftsConfigured) {
      const hint = readDraftHint(
        (await cookies()).get(DRAFT_HINT_COOKIE)?.value,
        cart.id
      );
      after(async () => {
        try {
          await saveCheckoutDraft(
            {
              cartId: cart.id,
              cart,
              stage: "payment",
              txnid,
              restoreToken: issueRestoreToken(cart.id),
              contact: {
                email,
                phone: phone.e164,
                firstName,
                lastName,
                address1,
                address2,
                city,
                province: state,
                zip,
              },
            },
            hint
          );
        } catch (e) {
          console.warn("[abandoned] could not record the checkout at payment", {
            txnid,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const callback = `${origin}/api/payu/callback`;

    const fields = buildPayuFields({
      txnid,
      amount: formatAmount(total),
      productinfo: "Quint Home order",
      firstname: firstName,
      email,
      phone: phone.national,
      surl: callback,
      furl: callback,
      lastname: lastName,
      address1,
      address2,
      city,
      state,
      country,
      zipcode: zip,
      udf1: txnid,
      // Which bag this payment is for, signed along with the amount, so the
      // order can be written from PayU's answer alone.
      ...encodeCartRef(cart.id),
    });

    const inputs = Object.entries(fields)
      .map(
        ([k, v]) =>
          `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}" />`
      )
      .join("");

    const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Redirecting to payment…</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#3a3532">
<noscript><p>Please continue to payment.</p></noscript>
<p>Taking you to the secure payment page…</p>
<form id="payu" method="post" action="${PAYU_PAYMENT_URL}">${inputs}
<noscript><button type="submit">Continue</button></noscript></form>
<script>document.getElementById('payu').submit();</script>
</body></html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    // Shopify could not be read or written. Nothing has been charged, so the
    // honest thing is to say so and let the customer try again.
    console.error("[payu] could not start the payment", {
      error: e instanceof Error ? e.message : String(e),
    });
    return back("/checkout?error=start");
  }
}
