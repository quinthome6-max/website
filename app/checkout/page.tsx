import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CART_COOKIE } from "@/lib/shopify/cart-cookie";
import { checkoutPrefill } from "@/lib/checkout-prefill";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { SHIPPING_FLAT } from "@/lib/checkout-config";
import { TrackCheckout } from "@/components/analytics/track-checkout";
import { checkoutNotice } from "@/lib/checkout-notices";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Quint Home order.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Read on the server so the flat rate can be changed by env without a rebuild
  // of the client bundle.
  const { error } = await searchParams;
  // Details already on record for this bag (a payment that did not go
  // through, or a restore link), so the customer need not type them again.
  const prefill = await checkoutPrefill((await cookies()).get(CART_COOKIE)?.value);
  return (
    <>
      <TrackCheckout />
      <CheckoutForm
        shippingFlat={SHIPPING_FLAT}
        notice={checkoutNotice(error)}
        prefill={prefill}
      />
    </>
  );
}
