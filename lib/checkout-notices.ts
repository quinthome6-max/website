// What the customer is told when the checkout sends them back.
//
// The payment route has always redirected with an ?error= code, but neither
// page read it — the customer was returned to where they started with no word
// as to why. Every code the route can send has its sentence here.

const BAG: Record<string, string> = {
  gift:
    "Your bag holds more complimentary oils than diffusers. One oil is included with each diffuser except the Pebble and the Drift — remove the extra to continue.",
  "payments-unavailable":
    "Payment is not available right now. Nothing has been charged — please try again in a little while.",
};

const CHECKOUT: Record<string, string> = {
  "missing-details":
    "Please fill in your name, email, phone number and full delivery address.",
  phone:
    "That phone number does not look right. Enter a 10-digit Indian mobile number — it is the one the courier will ring.",
  email:
    "That email address does not look right. Your receipt and tracking link are sent there.",
  pin: "Enter the six-digit PIN code of the delivery address.",
  start:
    "We could not start the payment. Nothing has been charged — please try again.",
};

/** The sentence for a bag error, or null if there is nothing to say. */
export function bagNotice(error?: string, item?: string): string | null {
  if (error === "stock") {
    return item
      ? `${item} has sold out, or there are fewer left than you had in your bag. Your bag now shows what is available — please check it before paying.`
      : "Something in your bag has sold out since you added it. Your bag now shows what is available — please check it before paying.";
  }
  return (error && BAG[error]) || null;
}

/** The sentence for a checkout error, or null if there is nothing to say. */
export function checkoutNotice(error?: string): string | null {
  return (error && CHECKOUT[error]) || null;
}
