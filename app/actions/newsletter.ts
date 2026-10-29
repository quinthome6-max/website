"use server";

import { headers } from "next/headers";
import { shopifyAdminConfigured, subscribeToNewsletter } from "@/lib/shopify/admin";
import {
  addressKey,
  addSubscriber,
  newsletterAvailable,
  RateLimited,
  type SignupOutcome,
} from "@/lib/newsletter/store";

export interface SubscribeResult {
  ok: boolean;
  message: string;
  /** A first-time signup, as opposed to an address already on the list. */
  isNew?: boolean;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
/** Where a form may say it is: the footer, the Diwali band, a journal piece. */
const SOURCE = /^(footer|diwali|journal:[a-z0-9-]{1,80})$/;

/**
 * Newsletter signup. The address goes on the site's own list (lib/newsletter,
 * shown at /admin/subscribers) and to Shopify as a customer who accepts email
 * marketing, so Shopify Email can send to it. Either one succeeding is a
 * signup. Never leaks the underlying error to the visitor — a failure here is
 * ours to fix, not theirs to decode.
 */
export async function subscribeAction(email: string, source = "footer"): Promise<SubscribeResult> {
  const address = email.trim().toLowerCase();
  if (!EMAIL.test(address) || address.length > 200) {
    return { ok: false, message: "That email doesn’t look right." };
  }
  const from = SOURCE.test(source) ? source : "footer";

  let listed: SignupOutcome | null = null;
  if (newsletterAvailable) {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    try {
      listed = await addSubscriber(address, from, addressKey(ip));
    } catch (e) {
      if (e instanceof RateLimited) {
        return { ok: false, message: "Too many signups from here just now. Please try again in an hour." };
      }
      console.error("[newsletter] list write failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  let shopify: "subscribed" | "already" | null = null;
  if (shopifyAdminConfigured) {
    try {
      shopify = await subscribeToNewsletter(address);
    } catch (e) {
      console.error("[newsletter] Shopify signup failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (!listed && !shopify) {
    return { ok: false, message: "Something went wrong. Please try again shortly." };
  }
  const already = listed ? listed === "already" : shopify === "already";
  return {
    ok: true,
    isNew: !already,
    message: already ? "You’re already on the list — thank you." : "Thank you. Look out for the next one.",
  };
}
