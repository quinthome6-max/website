"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { sendEmail } from "@/lib/email/resend";
import { RESEND_API_KEY } from "@/lib/email/config";
import { redisConfigured, redisPipeline } from "@/lib/redis";

// Business enquiries from /businesses (audit #4, plan T4). Until this, the
// form's button did nothing and every enquiry was lost.
//
// Each one is emailed to the team (ENQUIRY_TO, by default the address the
// page itself shows), with Reply-To set to the enquirer so a reply goes
// straight back. It is also kept in Redis, so an enquiry survives an email
// failure: qh:enq is a list of JSON records, newest first, capped at 500.

const TO = process.env.ENQUIRY_TO || "hello@quinthome.in";
const FROM = "Quint Home website <enquiries@quinthome.in>";
const LIST = "qh:enq";
const HOURLY_LIMIT = 5;

export interface EnquiryInput {
  company: string;
  name: string;
  email: string;
  phone: string;
  space: string;
  note: string;
  /** Hidden from people; a bot fills it in. */
  website: string;
  /** When the form was first touched, to tell an instant submission apart. */
  startedAt: number;
}

export interface EnquiryResult {
  ok: boolean;
  message: string;
  field?: "company" | "name" | "email" | "phone";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const CONTROL = /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g;
const clean = (v: unknown, max: number) =>
  String(v ?? "").replace(CONTROL, "").replace(/\r\n?/g, "\n").trim().slice(0, max);
const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const THANKS = "We’ll get back to you within 48 hours.";

export async function submitEnquiryAction(input: EnquiryInput): Promise<EnquiryResult> {
  // Bots are thanked and dropped, so the response teaches them nothing.
  if (clean(input.website, 200) || Date.now() - Number(input.startedAt) < 3000) {
    return { ok: true, message: THANKS };
  }

  const company = clean(input.company, 120);
  const name = clean(input.name, 80);
  const email = clean(input.email, 200).toLowerCase();
  const phone = clean(input.phone, 30);
  const space = clean(input.space, 80);
  const note = clean(input.note, 3000);

  if (company.length < 2) return { ok: false, field: "company", message: "Add your business or brand name." };
  if (name.length < 2) return { ok: false, field: "name", message: "Add your name." };
  if (!EMAIL.test(email)) return { ok: false, field: "email", message: "That email doesn’t look right." };
  if (phone && phone.replace(/\D/g, "").length < 10) {
    return { ok: false, field: "phone", message: "That number looks too short." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const who = crypto.createHash("sha256").update(`qh-enq:${ip}`).digest("hex").slice(0, 24);

  const record = {
    at: new Date().toISOString(),
    company,
    name,
    email,
    phone,
    space,
    note,
    page: h.get("referer") ?? "",
  };

  let stored = false;
  if (redisConfigured) {
    try {
      const [n] = await redisPipeline([
        ["INCR", `qh:enq:rl:${who}`],
        ["EXPIRE", `qh:enq:rl:${who}`, 3600, "NX"],
      ]);
      if (Number(n) > HOURLY_LIMIT) {
        return {
          ok: false,
          message: "We’ve had several enquiries from you this hour. Please write to hello@quinthome.in.",
        };
      }
      await redisPipeline([
        ["LPUSH", LIST, JSON.stringify(record)],
        ["LTRIM", LIST, 0, 499],
      ]);
      stored = true;
    } catch (e) {
      console.error("[enquiry] could not store", { error: e instanceof Error ? e.message : String(e) });
    }
  }

  let emailed = false;
  if (RESEND_API_KEY) {
    const rows: [string, string][] = [
      ["Company", company],
      ["Name", name],
      ["Email", email],
      ["Mobile", phone || "–"],
      ["Type of space", space || "–"],
    ];
    try {
      await sendEmail({
        from: FROM,
        to: [TO],
        replyTo: email,
        subject: `Business enquiry: ${company}${space ? ` (${space})` : ""}`,
        html: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#3A3532;line-height:1.55">
<p style="margin:0 0 14px">New enquiry from <a href="https://www.quinthome.in/businesses">quinthome.in/businesses</a>. Reply to this email to answer ${esc(name)} directly.</p>
<table cellpadding="6" style="border-collapse:collapse">${rows
          .map(([k, v]) => `<tr><td style="color:#6A625E;padding-right:18px">${k}</td><td>${esc(v)}</td></tr>`)
          .join("")}</table>
<p style="margin:16px 0 4px;color:#6A625E">Note</p>
<p style="margin:0;white-space:pre-line">${esc(note || "–")}</p></div>`,
        text: [...rows.map(([k, v]) => `${k}: ${v}`), "", "Note:", note || "–"].join("\n"),
      });
      emailed = true;
    } catch (e) {
      console.error("[enquiry] EMAIL NOT SENT — the enquiry is in Redis (qh:enq)", {
        company,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (!emailed && !stored) {
    return {
      ok: false,
      message: "Something went wrong sending this. Please write to hello@quinthome.in.",
    };
  }
  return { ok: true, message: THANKS };
}
