// Whether our order email can actually be sent right now, checked before an
// order is written so Shopify's receipt is only switched off when ours will
// go. Setting ORDER_EMAILS=on before Resend had verified quinthome.in left
// customers with no confirmation at all: Shopify's was suppressed and ours
// was refused. So the switch is proven, not assumed.
//
// The proof is one send to delivered@resend.dev, Resend's test inbox (no
// person receives it). Its answer is kept for an hour, shared across server
// instances through Redis when there is one, so at most a send an hour is
// spent on it, and only when orders are coming in.

import { ORDER_EMAIL_FROM, ownOrderEmails } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/resend";
import { redisConfigured, redisPipeline } from "@/lib/redis";

const KEY = "qh:email:ready";
const TTL_S = 60 * 60;
let local: { ok: boolean; until: number } | null = null;

export async function orderEmailsReady(): Promise<boolean> {
  if (!ownOrderEmails) return false;
  const now = Date.now();
  if (local && local.until > now) return local.ok;

  if (redisConfigured) {
    try {
      const [cached] = await redisPipeline([["GET", KEY]]);
      if (cached === "1" || cached === "0") {
        local = { ok: cached === "1", until: now + 5 * 60_000 };
        return local.ok;
      }
    } catch {
      // Fall through to the probe; Redis being down says nothing about Resend.
    }
  }

  let ok = false;
  try {
    await sendEmail({
      from: ORDER_EMAIL_FROM,
      to: ["delivered@resend.dev"],
      subject: "Order email check",
      html: "<p>Order email check.</p>",
      text: "Order email check.",
    });
    ok = true;
  } catch (e) {
    console.error("[order-email] sending not ready; Shopify's receipt stays on", {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  local = { ok, until: now + 5 * 60_000 };
  if (redisConfigured) {
    await redisPipeline([["SET", KEY, ok ? "1" : "0", "EX", TTL_S]]).catch(() => undefined);
  }
  return ok;
}
