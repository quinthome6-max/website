import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { bagNotice } from "@/lib/checkout-notices";

export const metadata: Metadata = {
  title: "Your Bag",
  // A bag is per visitor; nothing here belongs in search results.
  robots: { index: false, follow: true },
  description:
    "Review the diffusers and fragrance oils in your Quint Home bag, then proceed to checkout.",
};

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; item?: string }>;
}) {
  // Set when the checkout turned the bag away, so the customer is told why.
  const { error, item } = await searchParams;
  return <CartView notice={bagNotice(error, item)} />;
}
