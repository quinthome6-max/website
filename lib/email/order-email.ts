// The order confirmation the store sends itself, in place of Shopify's
// receipt, with the GST tax invoice attached as a PDF.
//
// The figures come from the same Invoice the admin page prints (getInvoice),
// so the email, the attachment and the invoice staff see can't disagree.
//
// Email clients are a decade behind browsers, so the layout is tables and
// inline styles throughout, images are hosted JPG/PNG (no SVG, no WebP for
// Outlook), and fonts fall back to Georgia and Helvetica where Literata and
// Inter aren't available.

import { diffusers } from "@/lib/data/diffusers";
import { oils } from "@/lib/data/oils";
import { candles } from "@/lib/data/candles";
import { SITE } from "@/lib/seo";
import { WHATSAPP_NUMBER } from "@/lib/contact";
import { giftDisplayTitle } from "@/lib/cart-gift";
import { getInvoice, type Invoice } from "@/lib/admin/orders";
import { invoiceHtml, invoiceFilename } from "@/lib/admin/invoice-html";
import { SUPPLIER, supplierAddressLines, supplierGaps } from "@/lib/admin/supplier";
import { htmlToPdf } from "@/lib/pdf";
import { sendEmail } from "@/lib/email/resend";
import { addOrderTags } from "@/lib/shopify/admin";
import {
  EMAIL_FAILED_TAG,
  EMAILED_TAG,
  INVOICE_HELD_TAG,
  ORDER_EMAIL_FROM,
  ORDER_EMAIL_REPLY_TO,
} from "@/lib/email/config";

const C = {
  ivory: "#FAF8F3",
  stardust: "#EEE4D8",
  rule: "#E6DFD2",
  sage: "#5A7370",
  verdant: "#293329",
  clay: "#C15A27",
  charcoal: "#3A3532",
  soft: "#6A625E",
};
const SERIF = "Literata, Georgia, 'Times New Roman', serif";
const SANS = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (n: number): string =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const PRODUCTS = [...diffusers, ...oils, ...candles]
  .map((p) => ({ slug: p.slug, name: p.name }))
  // Longest name first, so "The Arrival" isn't taken for some shorter match.
  .sort((a, b) => b.name.length - a.name.length);

/** Our product for a Shopify line title, for its photo and page link. */
function productFor(title: string): { slug: string; name: string } | undefined {
  const t = title.toLowerCase();
  return PRODUCTS.find((p) => t.includes(p.name.toLowerCase()));
}

/** Whether the invoice is fit to hand a customer as it stands. */
export function invoiceIssues(inv: Invoice): string[] {
  return [
    ...supplierGaps().map((g) => `supplier ${g} missing`),
    ...inv.needsAttention,
    ...inv.lines.filter((l) => l.unclassified).map((l) => `HSN unconfirmed for ${l.title}`),
    // The invoice prices lines as listed and has no row for an order-level
    // discount code, so on such an order its total would exceed the charge.
    ...(Math.abs(inv.totals.gross - inv.totalPaid) > 1
      ? [`invoice total ${inv.totals.gross} does not match ${inv.totalPaid} paid`]
      : []),
  ];
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

/** The confirmation for one order. `invoiceAttached` changes one sentence. */
export function buildOrderEmail(inv: Invoice, invoiceAttached: boolean): BuiltEmail {
  const firstName = (inv.customer.name || inv.billTo.name || "").split(/\s+/)[0] || "there";
  const lines = inv.lines.map((l) => {
    const gift = l.tax.gross === 0;
    const product = productFor(l.title);
    return {
      name: gift ? giftDisplayTitle(l.title) : l.title,
      // Shopify's "Default Title", and a gift variant named "Complimentary",
      // say nothing the row doesn't already.
      variant:
        l.variantTitle && !/^(default title|complimentary|free|gift)$/i.test(l.variantTitle.trim())
          ? l.variantTitle
          : "",
      quantity: l.quantity,
      amount: l.tax.gross,
      gift,
      image: product ? `${SITE}/images/email/products/${product.slug}.jpg` : null,
      url: product ? `${SITE}/range/${product.slug}` : SITE,
    };
  });
  const items = lines.reduce((t, l) => t + l.amount, 0);
  const shipping = inv.shipping?.gross ?? 0;
  // What was actually charged; anything between that and the lines is a
  // discount code applied to the whole order.
  const total = inv.totalPaid || items + shipping;
  const codeDiscount = Math.max(0, Math.round((items + shipping - total) * 100) / 100);
  const address = [
    inv.customer.name,
    ...inv.customer.addressLines,
    [inv.customer.city, inv.customer.province, inv.customer.zip].filter(Boolean).join(", "),
  ].filter(Boolean);
  const whatsapp = `https://wa.me/${WHATSAPP_NUMBER}`;
  const subject = `Your Quint Home order ${inv.orderName} is confirmed`;

  const lineRows = lines
    .map(
      (l) => `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid ${C.rule};width:72px;vertical-align:top">
          ${
            l.image
              ? `<a href="${esc(l.url)}"><img src="${esc(l.image)}" width="60" height="75" alt="" style="display:block;border:0;width:60px;height:75px;background:${C.stardust}"></a>`
              : ""
          }
        </td>
        <td style="padding:16px 12px 16px 0;border-bottom:1px solid ${C.rule};vertical-align:top;font-family:${SANS};font-size:14px;line-height:1.45;color:${C.charcoal}">
          <span style="font-family:${SERIF};font-size:16px">${esc(l.name)}</span>
          ${l.variant ? `<br><span style="color:${C.soft};font-size:13px">${esc(l.variant)}</span>` : ""}
          ${l.gift ? `<br><span style="color:${C.clay};font-size:12px;letter-spacing:.08em;text-transform:uppercase">Complimentary</span>` : ""}
          <br><span style="color:${C.soft};font-size:13px">Qty ${l.quantity}</span>
        </td>
        <td align="right" style="padding:16px 0;border-bottom:1px solid ${C.rule};vertical-align:top;font-family:${SANS};font-size:14px;color:${C.charcoal};white-space:nowrap">
          ${l.gift ? "Free" : money(l.amount)}
        </td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.stardust}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Thank you, ${esc(firstName)}. Your order ${esc(inv.orderName)} is confirmed and your GST invoice is ${invoiceAttached ? "attached" : "on its way"}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.stardust}">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.ivory}">

  <tr><td align="center" style="padding:28px 24px 22px">
    <a href="${SITE}"><img src="${SITE}/images/email/wordmark.png" width="92" height="32" alt="Quint Home" style="display:block;border:0;width:92px;height:32px"></a>
  </td></tr>

  <tr><td><img src="${SITE}/images/email/hero.jpg" width="600" alt="" style="display:block;border:0;width:100%;max-width:600px;height:auto"></td></tr>

  <tr><td style="padding:36px 36px 8px">
    <p style="margin:0;font-family:${SANS};font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:${C.sage}">Order ${esc(inv.orderName)} · confirmed</p>
    <h1 style="margin:14px 0 0;font-family:${SERIF};font-weight:400;font-size:32px;line-height:1.15;color:${C.charcoal}">Thank you, ${esc(firstName)}.<br><em style="color:#6A2E0C">We&rsquo;re preparing your order.</em></h1>
    <p style="margin:18px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.charcoal}">We&rsquo;ve received your payment and your order is confirmed. It leaves our Mumbai studio within 3 business days and usually arrives in 3&ndash;5 business days after that.</p>
  </td></tr>

  <tr><td style="padding:28px 36px 0">
    <p style="margin:0 0 4px;font-family:${SANS};font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:${C.soft}">Your order</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lineRows}
      ${shipping > 0 ? `<tr><td></td><td style="padding:14px 12px 0 0;font-family:${SANS};font-size:14px;color:${C.soft}">Shipping</td><td align="right" style="padding:14px 0 0;font-family:${SANS};font-size:14px;color:${C.charcoal}">${money(shipping)}</td></tr>` : `<tr><td></td><td style="padding:14px 12px 0 0;font-family:${SANS};font-size:14px;color:${C.soft}">Shipping</td><td align="right" style="padding:14px 0 0;font-family:${SANS};font-size:14px;color:${C.charcoal}">Free</td></tr>`}
      ${codeDiscount > 0 ? `<tr><td></td><td style="padding:10px 12px 0 0;font-family:${SANS};font-size:14px;color:${C.soft}">Discount</td><td align="right" style="padding:10px 0 0;font-family:${SANS};font-size:14px;color:${C.charcoal}">−${money(codeDiscount)}</td></tr>` : ""}
      <tr><td></td><td style="padding:10px 12px 0 0;font-family:${SERIF};font-size:18px;color:${C.charcoal}">Total paid</td><td align="right" style="padding:10px 0 0;font-family:${SERIF};font-size:18px;color:${C.charcoal};white-space:nowrap">${money(total)}</td></tr>
      <tr><td></td><td colspan="2" style="padding:4px 0 0;font-family:${SANS};font-size:12px;color:${C.soft}">Inclusive of GST · paid via ${esc(inv.paymentMode || "PayU")}</td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:28px 36px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.stardust}">
      <tr><td style="padding:20px 22px;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.charcoal}">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:${C.soft}">Delivering to</p>
        ${address.map(esc).join("<br>")}
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:24px 36px 0;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.charcoal}">
    ${
      invoiceAttached
        ? `Your GST tax invoice (<strong>${esc(inv.invoiceNumber)}</strong>) is attached to this email as a PDF.`
        : `Your GST tax invoice will follow in a separate email shortly.`
    }
  </td></tr>

  <tr><td style="padding:28px 36px 0">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="background:${C.verdant}"><a href="${SITE}/range" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:${C.ivory};text-decoration:none">Explore the range</a></td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:32px 36px 36px;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.charcoal}">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:${C.soft}">Questions?</p>
    Reply to this email, write to <a href="mailto:${ORDER_EMAIL_REPLY_TO}" style="color:${C.clay}">${ORDER_EMAIL_REPLY_TO}</a>, or message us on <a href="${whatsapp}" style="color:${C.clay}">WhatsApp</a>.
  </td></tr>

  <tr><td style="padding:22px 36px;background:${C.verdant};font-family:${SANS};font-size:11px;line-height:1.6;color:#C9CFC7">
    <strong style="color:${C.ivory};letter-spacing:.2em">QUINT HOME</strong><br>
    ${esc(SUPPLIER.legalName)} · ${supplierAddressLines().map(esc).join(", ")}<br>
    GSTIN ${esc(SUPPLIER.gstin)} · <a href="${SITE}" style="color:#C9CFC7">quinthome.in</a>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  const text = [
    `Thank you, ${firstName}.`,
    ``,
    `Your Quint Home order ${inv.orderName} is confirmed. It leaves our Mumbai studio within 3 business days and usually arrives in 3–5 business days after that.`,
    ``,
    ...lines.map(
      (l) =>
        `${l.name}${l.variant ? ` (${l.variant})` : ""} × ${l.quantity} — ${l.gift ? "Free" : money(l.amount)}`
    ),
    `Shipping — ${shipping > 0 ? money(shipping) : "Free"}`,
    ...(codeDiscount > 0 ? [`Discount — −${money(codeDiscount)}`] : []),
    `Total paid — ${money(total)} (inclusive of GST)`,
    ``,
    `Delivering to:`,
    ...address,
    ``,
    invoiceAttached
      ? `Your GST tax invoice (${inv.invoiceNumber}) is attached as a PDF.`
      : `Your GST tax invoice will follow in a separate email shortly.`,
    ``,
    `Questions? Reply to this email, write to ${ORDER_EMAIL_REPLY_TO}, or WhatsApp ${whatsapp}`,
    ``,
    `Quint Home · ${SUPPLIER.legalName} · ${supplierAddressLines().join(", ")}`,
  ].join("\n");

  return { subject, html, text };
}

export type OrderEmailResult =
  | { sent: true; to: string; invoiceAttached: boolean }
  | { sent: false; reason: string };

/**
 * Sends the confirmation for an order, with its invoice attached when the
 * invoice is fit to send. Never throws: a payment must not fail because an
 * email did. The outcome is tagged on the Shopify order instead, so staff can
 * see who still needs one and send it from /admin.
 *
 * `resend` is for the admin button: it allows a second send of the same
 * order, which the idempotency key otherwise prevents within a day.
 */
export async function sendOrderEmail(
  orderNumber: number,
  { resend = false }: { resend?: boolean } = {}
): Promise<OrderEmailResult> {
  let inv: Invoice | null = null;
  try {
    inv = await getInvoice(orderNumber);
    if (!inv) return { sent: false, reason: "order not found" };
    const to = inv.customer.email || inv.billTo.email;
    if (!to) return { sent: false, reason: "the order has no email address" };

    const issues = invoiceIssues(inv);
    let attachment: { filename: string; content: Buffer } | null = null;
    if (!issues.length) {
      try {
        attachment = {
          filename: `${invoiceFilename(inv)}.pdf`,
          // At full size the invoice runs a few lines onto a second sheet;
          // at 80% an order of up to three lines is one A4 page.
          content: await htmlToPdf(invoiceHtml(inv), { scale: 0.8 }),
        };
      } catch (e) {
        issues.push(`PDF could not be made: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const mail = buildOrderEmail(inv, Boolean(attachment));
    await sendEmail({
      from: ORDER_EMAIL_FROM,
      to: [to],
      replyTo: ORDER_EMAIL_REPLY_TO,
      ...mail,
      ...(attachment ? { attachments: [attachment] } : {}),
      idempotencyKey: resend
        ? `order-email/${inv.orderNumber}/${Date.now()}`
        : `order-email/${inv.orderNumber}`,
    });

    if (issues.length) {
      console.error("[order-email] sent without the invoice", {
        order: inv.orderName,
        issues,
      });
    }
    await addOrderTags(
      inv.orderId,
      inv.tags,
      [EMAILED_TAG, ...(attachment ? [] : [INVOICE_HELD_TAG])],
      [EMAIL_FAILED_TAG, ...(attachment ? [INVOICE_HELD_TAG] : [])]
    ).catch((e) =>
      console.error("[order-email] could not tag the order", { order: inv?.orderName, error: String(e) })
    );
    return { sent: true, to, invoiceAttached: Boolean(attachment) };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error("[order-email] NOT SENT — send it from /admin", { orderNumber, reason });
    if (inv) {
      await addOrderTags(inv.orderId, inv.tags, [EMAIL_FAILED_TAG]).catch(() => undefined);
    }
    return { sent: false, reason };
  }
}
