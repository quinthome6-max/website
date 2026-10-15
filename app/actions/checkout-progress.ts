"use server";

// Saves an unfinished checkout as the customer types, so a bag that is never
// paid for still shows up in /admin/abandoned. See lib/abandoned/store.ts.
//
// Called in the background from the checkout form. It must never surface an
// error to the customer or slow the form down: every failure is logged and
// swallowed.

import { cookies } from "next/headers";
import { cartGetRecord } from "@/lib/shopify/cart";
import { CART_COOKIE } from "@/lib/shopify/cart-cookie";
import { isPlausibleEmail, normalisePhone } from "@/lib/checkout-contact";
import { readSettleState } from "@/lib/payu/pending";
import { issueRestoreToken } from "@/lib/abandoned/restore-token";
import { abandonedStoreConfigured, saveCheckout } from "@/lib/abandoned/store";

const FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "address1",
  "address2",
  "city",
  "state",
  "zip",
] as const;

type Progress = Partial<Record<(typeof FIELDS)[number], string>>;

export async function saveCheckoutProgress(input: Progress): Promise<void> {
  try {
    if (!abandonedStoreConfigured || !input || typeof input !== "object") return;

    const clean: Progress = {};
    for (const key of FIELDS) {
      const v = input[key];
      if (typeof v === "string") clean[key] = v.trim().slice(0, 200);
    }

    const email = clean.email && isPlausibleEmail(clean.email) ? clean.email : undefined;
    const phone = clean.phone ? normalisePhone(clean.phone)?.e164 : undefined;
    // Nothing worth keeping until there is a way to reach the customer.
    if (!email && !phone) return;

    const jar = await cookies();
    const cartId = jar.get(CART_COOKIE)?.value;
    if (!cartId) return;
    const record = await cartGetRecord(cartId);
    if (!record || record.cart.lines.length === 0) return;
    // A bag already turned into an order is not abandoned.
    if (readSettleState(record.note).kind === "done") return;

    await saveCheckout(
      {
        cartId,
        cart: record.cart,
        stage: "form",
        restoreToken: issueRestoreToken(cartId),
        contact: {
          email,
          phone,
          firstName: clean.firstName,
          lastName: clean.lastName,
          address1: clean.address1,
          address2: clean.address2,
          city: clean.city,
          province: clean.state,
          zip: clean.zip,
        },
      }
    );
  } catch (e) {
    console.warn("[abandoned] could not save checkout progress", {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
