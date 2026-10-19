// Sending through Resend's REST API (https://resend.com/docs/api-reference),
// called with fetch like the site's other services, so no client library.

import { RESEND_API_KEY } from "@/lib/email/config";

export interface OutgoingEmail {
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Buffer }[];
  /**
   * Resend keeps this for 24 hours and refuses a second send under the same
   * key, so a retried request can never mail a customer twice.
   */
  idempotencyKey?: string;
}

/** Sends one email; returns Resend's id. Throws with Resend's message on refusal. */
export async function sendEmail(mail: OutgoingEmail): Promise<string> {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(mail.idempotencyKey ? { "Idempotency-Key": mail.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: mail.from,
      to: mail.to,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(mail.attachments?.length
        ? {
            attachments: mail.attachments.map((a) => ({
              filename: a.filename,
              content: a.content.toString("base64"),
            })),
          }
        : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok || !body.id) {
    throw new Error(`Resend ${res.status}: ${body.message ?? "no id returned"}`);
  }
  return body.id;
}
