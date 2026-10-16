// What the checkout form can be filled in with before the customer types.
//
// A customer who comes back to checkout for the same bag — after a payment
// that failed or was cancelled, or through a restore link from the team —
// should not have to type their details again. Both are already on record:
//
//   1. the bag itself, once Pay was pressed (lib/payu/pending.ts)
//   2. the abandoned-checkout record, from the moment they typed
//      (lib/abandoned/store.ts)
//
// Only the holder of the bag's cookie gets them back, which is the customer
// themselves. Anything that fails here just means an empty form.

import { cartGetRecord } from "@/lib/shopify/cart";
import { readPendingOrder } from "@/lib/payu/pending";
import { checkoutContactFor, type CheckoutContact } from "@/lib/abandoned/store";

export interface CheckoutPrefill {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
}

/** "+919876543210" → "9876543210": what people expect to see in the box. */
function displayPhone(phone: string | undefined): string {
  if (!phone) return "";
  return phone.startsWith("+91") && phone.length === 13 ? phone.slice(3) : phone;
}

function fromContact(c: CheckoutContact): CheckoutPrefill {
  return {
    firstName: c.firstName ?? "",
    lastName: c.lastName ?? "",
    email: c.email ?? "",
    phone: displayPhone(c.phone),
    address1: c.address1 ?? "",
    address2: c.address2 ?? "",
    city: c.city ?? "",
    state: c.province ?? "",
    zip: c.zip ?? "",
  };
}

export async function checkoutPrefill(cartId: string | undefined): Promise<CheckoutPrefill | null> {
  if (!cartId) return null;
  try {
    // The bag's own record is the more complete one: it was written whole,
    // after the form had been checked, when Pay was pressed.
    const record = await cartGetRecord(cartId);
    const pending = record ? readPendingOrder(record.attributes) : null;
    if (pending) return fromContact({ ...pending.customer });
  } catch {
    /* fall through to the typed record */
  }
  try {
    const typed = await checkoutContactFor(cartId);
    if (typed && (typed.email || typed.phone)) return fromContact(typed);
  } catch {
    /* nothing to fill in */
  }
  return null;
}
