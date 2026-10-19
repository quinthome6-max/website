// Whether the store sends its own order confirmation (lib/email/order-email.ts)
// instead of Shopify's. Kept in a module of its own, free of imports, because
// lib/shopify/admin.ts reads it when it creates an order.
//
// Two switches, both set in Vercel's environment:
//
//   RESEND_API_KEY    a Resend key with sending access
//   ORDER_EMAILS=on   turn ours on once quinthome.in is verified in Resend
//
// With the key but not the flag, nothing changes: Shopify keeps sending its
// receipt. The flag exists so the switch-over is one deliberate step, taken
// after the domain is verified; flipping Shopify's receipt off while our
// sender is still refused would leave customers with no confirmation at all.

export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";

export const ORDER_EMAIL_FROM =
  process.env.ORDER_EMAIL_FROM || "Quint Home <orders@quinthome.in>";
export const ORDER_EMAIL_REPLY_TO = "hello@quinthome.in";

/** Our confirmation replaces Shopify's. */
export const ownOrderEmails = Boolean(RESEND_API_KEY) && process.env.ORDER_EMAILS === "on";

/** Tags written to the Shopify order, so the order list shows what went out. */
export const EMAILED_TAG = "Order email sent";
export const EMAIL_FAILED_TAG = "Order email failed";
export const INVOICE_HELD_TAG = "Invoice not emailed";
