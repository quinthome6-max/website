// Turns a PayU payment into a Shopify order — once, whoever asks.
//
// A success is announced several ways: the customer's browser is sent back to
// us, PayU notifies us server-to-server, the customer refreshes the page, and
// staff can ask for a payment to be looked at again. Any of them may arrive
// first, any of them may never arrive, and two may arrive together. They all
// call settlePayment, which holds to three rules:
//
//   1. PayU decides whether it was paid. Not the browser.
//   2. One payment makes one order, however many times this runs.
//   3. A captured payment always leaves something in Shopify. If the proper
//      order cannot be written, a placeholder is, with the reason on it.
//
// Rule 3 is the one that was missing. Every check here used to end in a log
// line and a shrug when it failed, and a log line is not somewhere a shop
// looks for a customer who has paid.

import {
  cartGetRecord,
  cartLinesRemove,
  cartNoteSet,
  type Cart,
  type CartRecord,
} from "@/lib/shopify/cart";
import { getCommerceMap } from "@/lib/shopify/commerce";
import { auditCartGifts } from "@/lib/cart-gift-guard";
import { shippingFor } from "@/lib/checkout-config";
import { normalisePhone } from "@/lib/checkout-contact";
import {
  confirmPaymentWithPayu,
  decodeCartRef,
  type PayuVerification,
} from "@/lib/payu/client";
import {
  claimCart,
  lockIsLive,
  markCartSettled,
  readPendingOrder,
  readSettleState,
} from "@/lib/payu/pending";
import { abandonedStoreConfigured, closeCheckout } from "@/lib/abandoned/store";
import {
  ATTENTION_TAG,
  createAttentionOrder,
  createPaidOrder,
  findOrdersByTxnid,
  OrderRefusedError,
  shopifyAdminConfigured,
  type CreatedOrder,
  type ExistingOrder,
  type OrderCustomer,
} from "@/lib/shopify/admin";

export type SettleSource = "browser" | "webhook" | "admin";

export interface SettleInput {
  source: SettleSource;
  txnid: string;
  /**
   * PayU's own fields for this payment, and only if their signature checked
   * out. Null when there are none, or when they could not be authenticated.
   */
  signed: Record<string, string> | null;
  /**
   * The record from the old pending-order cookie, for a payment that was
   * started before the bag itself carried the details.
   */
  legacy?: { cartId: string; customer: OrderCustomer } | null;
}

export type SettleResult =
  /** There is an order for this payment — just written, or already there. */
  | {
      state: "ordered";
      order: string;
      /** Rupees paid, for the confirmation page. */
      value: number;
      /** "variantId:quantity:price" per line. */
      items: string;
      /** The order is a placeholder, or is missing something. */
      attention: boolean;
      /**
       * Not the customer's order at all: a marker for the payment, waiting on
       * a person. The customer is told it is being finalised, not quoted it.
       */
      placeholder: boolean;
      /** It was already there; this call wrote nothing. */
      existing: boolean;
    }
  /** PayU says this was not paid (yet). */
  | { state: "not-paid"; status: string }
  /** PayU could not be asked, and nothing signed says it succeeded. */
  | { state: "unconfirmed" }
  /** Another process is writing this order right now. */
  | { state: "busy" }
  /** Paid, and Shopify could not be written to at all. Must be retried. */
  | { state: "failed"; reason: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const inr = (n: number): string => `₹${n.toLocaleString("en-IN")}`;

/**
 * Settlements under way in this process, by transaction.
 *
 * A second request for the same payment — a refreshed page, a repeated
 * notification — joins the first instead of starting again. It only helps
 * when both land on the same server instance; the claim on the cart covers
 * the rest.
 */
const underWay = new Map<string, Promise<SettleResult>>();

export function settlePayment(input: SettleInput): Promise<SettleResult> {
  const running = underWay.get(input.txnid);
  if (running) return running;
  const run = settle(input).finally(() => underWay.delete(input.txnid));
  underWay.set(input.txnid, run);
  return run;
}

/** The order a transaction already has. Null if none, or if Shopify could not say. */
async function findExisting(txnid: string): Promise<ExistingOrder | null> {
  try {
    return (await findOrdersByTxnid(txnid))[0] ?? null;
  } catch (e) {
    // Carry on without the check rather than refuse to write an order: not
    // being able to look is no reason to leave a payment unrecorded.
    console.error("[payu] could not look up existing orders", {
      txnid,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

const alreadyOrdered = (o: ExistingOrder): SettleResult => ({
  state: "ordered",
  order: o.name,
  value: o.total,
  items: o.items,
  attention: o.tags.includes(ATTENTION_TAG),
  // A placeholder is one custom line; it carries no variants.
  placeholder: o.tags.includes(ATTENTION_TAG) && o.items === "",
  existing: true,
});

/** Waits out another process's claim, watching for the order it is writing. */
async function waitForOrder(txnid: string): Promise<SettleResult> {
  for (let i = 0; i < 8; i++) {
    const order = await findExisting(txnid);
    if (order) return alreadyOrdered(order);
    await sleep(1500);
  }
  return { state: "busy" };
}

/** Reads the cart, allowing Shopify a bad moment or two. Throws on the third. */
async function readCart(cartId: string): Promise<CartRecord | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await cartGetRecord(cartId);
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(600 * (attempt + 1));
    }
  }
}

/** Numbers arrive from the form as typed; Shopify wants them one way. */
function tidy(customer: OrderCustomer): OrderCustomer {
  const phone = customer.phone ? normalisePhone(customer.phone)?.e164 : undefined;
  return { ...customer, phone: phone ?? customer.phone };
}

/** The buyer as PayU echoes them back — the fallback when the bag has no record. */
function customerFromPayu(
  signed: Record<string, string> | null,
  verified: PayuVerification | null
): OrderCustomer | null {
  if (signed?.firstname) {
    return {
      firstName: signed.firstname,
      lastName: signed.lastname || undefined,
      email: signed.email ?? "",
      phone: signed.phone || undefined,
      address1: signed.address1 || undefined,
      address2: signed.address2 || undefined,
      city: signed.city || undefined,
      province: signed.state || undefined,
      zip: signed.zipcode || undefined,
      country: signed.country || "India",
    };
  }
  return verified?.firstname ? { firstName: verified.firstname, email: "" } : null;
}

/** The bag in words, for the note on a placeholder order. */
function describeBag(cart: Cart): string[] {
  return cart.lines.map((l) => {
    const variant =
      l.variantTitle && l.variantTitle !== "Default Title" ? ` (${l.variantTitle})` : "";
    const choices = l.attributes.map((a) => `${a.key}: ${a.value}`).join("; ");
    return (
      `${l.quantity} × ${l.productTitle}${variant} — ${inr(l.price * l.quantity)}` +
      (choices ? ` [${choices}]` : "")
    );
  });
}

/** Ids, quantities and prices only — nothing about the buyer leaves in a URL. */
const itemsOf = (cart: Cart): string =>
  cart.lines
    .map((l) => `${l.merchandiseId.split("/").pop()}:${l.quantity}:${l.price}`)
    .join(",");

async function settle(input: SettleInput): Promise<SettleResult> {
  const { txnid, source, signed } = input;
  const signedSuccess = (signed?.status ?? "").toLowerCase() === "success";

  /* 1. Was it paid? PayU's servers say, not the message that brought us here. */

  const verified = await confirmPaymentWithPayu(txnid, signedSuccess ? 3 : 2);
  if (verified && verified.status !== "success") {
    return { state: "not-paid", status: verified.status };
  }
  if (!verified) {
    if (!signedSuccess) return { state: "unconfirmed" };
    // PayU's API cannot be reached, but a success carrying PayU's signature
    // is in hand, and that signature cannot be made without the salt. Holding
    // a paid order hostage to an API outage helps nobody; a replay of the
    // same message would find the order already written and add nothing.
    console.warn("[payu] verify API unreachable — settling on the signed result", {
      txnid,
      source,
    });
  }

  const payment = {
    txnid,
    mihpayid: verified?.mihpayid || signed?.mihpayid || undefined,
    paymentMode: verified?.mode || signed?.mode || undefined,
  };
  const amounts = verified?.amounts.length
    ? verified.amounts
    : [Number(signed?.amount)].filter((n) => Number.isFinite(n) && n > 0);
  const received = Number(verified?.amount || signed?.amount) || amounts[0] || 0;

  if (!shopifyAdminConfigured) {
    console.error("[payu] PAID BUT ADMIN API NOT CONFIGURED — reconcile manually", payment);
    return { state: "failed", reason: "Shopify Admin API is not configured." };
  }

  /* 2. Which bag was it for? */

  const cartId =
    decodeCartRef(verified?.udf) ??
    decodeCartRef(signed) ??
    input.legacy?.cartId ??
    null;
  const fallbackCustomer = input.legacy?.customer ?? customerFromPayu(signed, verified);

  /** A placeholder order for a payment with no usable bag behind it. */
  const withoutBag = async (reason: string): Promise<SettleResult> => {
    const existing = await findExisting(txnid);
    if (existing) return alreadyOrdered(existing);
    console.error("[payu] PAID, NO USABLE BAG — writing a placeholder order", {
      ...payment,
      reason,
    });
    try {
      const order = await createAttentionOrder({
        ...payment,
        amountPaid: received,
        reason,
        customer: fallbackCustomer ? tidy(fallbackCustomer) : null,
      });
      return {
        state: "ordered",
        order: order.name,
        value: received,
        items: "",
        attention: true,
        placeholder: true,
        existing: false,
      };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.error("[payu] PAID BUT NOTHING WRITTEN TO SHOPIFY — reconcile manually", {
        ...payment,
        error,
      });
      return { state: "failed", reason: error };
    }
  };

  if (!cartId) {
    return withoutBag(
      "The payment does not say which bag it was for, so the items could not be read."
    );
  }

  let record: CartRecord | null;
  try {
    record = await readCart(cartId);
  } catch (e) {
    // Shopify is not answering. The bag is still there, so this is a reason
    // to come back, not to settle for a placeholder that knows the amount and
    // nothing about what was bought.
    const error = e instanceof Error ? e.message : String(e);
    console.error("[payu] PAID BUT THE BAG COULD NOT BE READ — will need retrying", {
      ...payment,
      error,
    });
    return { state: "failed", reason: `Shopify could not be asked for the bag: ${error}` };
  }
  if (!record) {
    return withoutBag(
      "The bag this payment was for no longer exists in Shopify (bags expire after ten idle days)."
    );
  }

  /* 3. Has it been settled, or is it being settled right now? */

  const before = readSettleState(record.note);
  if (before.kind === "done" && before.txnid === txnid) {
    const existing = await findExisting(txnid);
    if (existing) return alreadyOrdered(existing);
    if (before.order) {
      return {
        state: "ordered",
        order: before.order,
        value: received,
        items: "",
        attention: false,
        placeholder: false,
        existing: true,
      };
    }
  }
  if (lockIsLive(before)) return waitForOrder(txnid);

  // Started now, awaited once the claim is held. Any order this payment
  // already has was committed before the note read above, so it is visible to
  // a lookup begun after it — and the lookup can use the wait the claim needs.
  const lookup = findExisting(txnid);
  const commerce = getCommerceMap();

  let claimed: CartRecord | null;
  try {
    claimed = await claimCart(cartId, txnid);
  } catch (e) {
    // The claim guards against a double order; it is not worth losing the
    // order over. Go ahead unguarded and let the lookup do what it can.
    console.error("[payu] could not claim the cart — settling without the lock", {
      txnid,
      error: e instanceof Error ? e.message : String(e),
    });
    claimed = record;
  }
  if (!claimed) return waitForOrder(txnid);

  /** Hands the cart back as it was, when this run wrote nothing. */
  const letGo = async () => {
    try {
      await cartNoteSet(cartId, before.kind === "done" ? record.note : "");
    } catch {
      /* the claim expires on its own */
    }
  };

  /** The cart has become an order: mark it spent and empty it. */
  const finish = async (order: string, cart: Cart) => {
    const emptied =
      cart.lines.length > 0
        ? cartLinesRemove(cartId, cart.lines.map((l) => l.id))
        : Promise.resolve();
    // Best effort. The order exists either way; these only keep the customer
    // from finding a full bag for something they have already bought.
    const results = await Promise.allSettled([
      markCartSettled(cartId, txnid, order),
      emptied,
      // Off the abandoned-checkout list: this bag was bought.
      // Capped, so a slow store never holds the customer's confirmation
      // page; a record left behind is still recognised as paid by its txnid.
      abandonedStoreConfigured
        ? Promise.race([
            closeCheckout(cartId, order),
            sleep(4_000).then(() => {
              throw new Error("closing the abandoned-checkout record timed out");
            }),
          ])
        : Promise.resolve(),
    ]);
    for (const r of results) {
      if (r.status === "rejected") {
        console.error("[payu] order written, but the bag could not be closed", {
          txnid,
          order,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    }
  };

  const existing = await lookup;
  if (existing) {
    await finish(existing.name, claimed.cart);
    return alreadyOrdered(existing);
  }

  /* 4. Write the order — the real one if every check passes. */

  const cart = claimed.cart;
  const pending = readPendingOrder(claimed.attributes);
  const known = pending?.customer ?? fallbackCustomer;
  const customer = known ? tidy(known) : null;

  try {
    /** A placeholder order for a bag that cannot be trusted as it stands. */
    const placeholder = async (reason: string): Promise<SettleResult> => {
      console.error("[payu] PAID, BAG NOT AS EXPECTED — writing a placeholder order", {
        ...payment,
        reason,
      });
      const order = await createAttentionOrder({
        ...payment,
        amountPaid: received,
        reason,
        customer,
        bag: describeBag(cart),
      });
      await finish(order.name, cart);
      return {
        state: "ordered",
        order: order.name,
        value: received,
        items: "",
        attention: true,
        placeholder: true,
        existing: false,
      };
    };

    if (cart.lines.length === 0) {
      return await placeholder(
        before.kind === "done"
          ? `This is a second payment for a bag already ordered as ${before.order} ` +
              `(transaction ${before.txnid}). The customer has most likely been charged twice — ` +
              `refund this payment in PayU unless they meant to order again.`
          : "The bag was empty when the payment arrived, so there is nothing to say what was bought."
      );
    }

    // Re-checked here as well as before payment: the bag belongs to the
    // buyer, and it can change between the payment page and this moment.
    const gifts = auditCartGifts(cart, await commerce);
    if (!gifts.ok) {
      return await placeholder(
        `The bag claims ${gifts.giftQuantity} complimentary oil(s) against ` +
          `${gifts.diffuserQuantity} diffuser(s), so it was not written automatically. ` +
          `If the bag below is right, create the order by hand.`
      );
    }

    // Same figure the initiate route signed: goods after the discount, plus
    // shipping judged on that.
    const goods = cart.total;
    const shipping = shippingFor(goods);
    const expected = goods + shipping;
    const paid = amounts.find((a) => Math.abs(a - expected) <= 1);
    if (paid === undefined) {
      return await placeholder(
        `${inr(received)} was paid, but the bag now comes to ${inr(expected)} — ` +
          `it was changed while the payment was in progress. Agree with the customer what they ` +
          `are getting before anything is sent.`
      );
    }

    if (!customer || !customer.firstName || !(customer.address1 || customer.zip)) {
      return await placeholder(
        "The delivery details for this payment were not found, so there is nowhere to send it. " +
          "The customer's details are on this transaction in the PayU dashboard."
      );
    }

    let order: CreatedOrder;
    try {
      order = await createPaidOrder({
        lines: cart.lines.map((l) => ({
          merchandiseId: l.merchandiseId,
          quantity: l.quantity,
          attributes: l.attributes,
          weightGrams: Math.round((l.weightKg ?? 0) * 1000),
        })),
        customer,
        amountPaid: paid,
        shipping,
        // Shopify prices an API order's lines at list, so whatever stands
        // between that and what the goods actually came to has to be stated,
        // or the order reads as costing more than was paid. Taken from the
        // lines rather than the cart's own discount figure, which leaves out
        // codes that apply to particular products.
        discount: {
          amount: Math.max(
            0,
            cart.lines.reduce((t, l) => t + l.price * l.quantity, 0) - goods
          ),
          code: cart.discountCode,
        },
        ...payment,
      });
    } catch (e) {
      // Shopify being unreachable is not a verdict on the order. Leave the
      // bag alone and report failure, so the next attempt — PayU's webhook
      // retrying, or staff — writes the proper order rather than finding a
      // placeholder already in its place.
      if (!(e instanceof OrderRefusedError)) throw e;
      return await placeholder(`Shopify would not accept the order. ${e.message}`);
    }

    if (order.attention.length > 0) {
      console.error("[payu] order written, but not as placed — needs a look", {
        ...payment,
        order: order.name,
        attention: order.attention,
      });
    }

    await finish(order.name, cart);
    return {
      state: "ordered",
      order: order.name,
      value: paid,
      items: itemsOf(cart),
      attention: order.attention.length > 0,
      placeholder: false,
      existing: false,
    };
  } catch (e) {
    // Not even the placeholder went in: Shopify is down, or the token is bad.
    const error = e instanceof Error ? e.message : String(e);
    console.error("[payu] PAID BUT NOTHING WRITTEN TO SHOPIFY — reconcile manually", {
      ...payment,
      amount: received,
      error,
    });
    await letGo();
    return { state: "failed", reason: error };
  }
}
