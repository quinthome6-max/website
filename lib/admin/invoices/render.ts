/**
 * A manual invoice, laid out exactly as the website's tax invoices are
 * (lib/admin/invoice-html.ts), so the accountant files one kind of document.
 *
 * The figures come from the quotation maths (lib/admin/quotes/calc.ts) and are
 * shown GST-inclusive per unit, as the website invoices show them: an
 * exclusive price is grossed up for display, and the taxable value, the tax and
 * the line total are calc's own. Totals are not rounded to the rupee.
 *
 * Pure and free of server imports: the editor's preview runs it in the browser.
 */
import { totalSplits, type TaxSplit } from "@/lib/admin/gst";
import { invoiceFilename, invoiceHtml } from "@/lib/admin/invoice-html";
import type { Invoice, InvoiceCustomer, InvoiceLine } from "@/lib/admin/orders";
import { calcQuote } from "@/lib/admin/quotes/calc";
import { stateCode } from "@/lib/data/indian-states";
import type { ManualInvoice, ManualInvoiceInput } from "./types";

const paise = (n: number): number => Math.round(n * 100) / 100;

type Renderable = ManualInvoiceInput & Partial<Pick<ManualInvoice, "number" | "status">>;

function party(inv: Renderable): InvoiceCustomer {
  const c = inv.client;
  const name = c.company || c.contactName;
  const lines = c.address.split("\n").map((l) => l.trim()).filter(Boolean);
  if (c.company && c.contactName) lines.unshift(`Attn: ${c.contactName}`);
  return {
    name,
    addressLines: lines,
    city: c.city,
    province: c.state,
    provinceCode: c.state ? stateCode(c.state) : null,
    zip: c.pin,
    country: "India",
    phone: c.phone || null,
    email: c.email || null,
    gstin: c.gstin || null,
  };
}

/** The manual invoice as the website invoice's data. */
export function toInvoice(inv: Renderable): Invoice {
  const calc = calcQuote(inv);
  const incl = inv.pricesIncludeGst;

  const lines: InvoiceLine[] = inv.lines.map((l) => {
    const r = calc.lines.find((x) => x.id === l.id);
    const unit = incl ? l.unitPrice : paise(l.unitPrice * (1 + l.gstRate / 100));
    const saved = r?.savedGross ?? 0;
    return {
      title: l.title,
      variantTitle: l.variant ?? null,
      sku: null,
      hsn: l.hsn || "—",
      quantity: l.quantity,
      unitPrice: unit,
      listPrice: unit,
      discount: saved,
      codeDiscount: saved,
      tax: r?.tax ?? { gross: 0, taxable: 0, gst: 0, cgst: 0, sgst: 0, igst: 0, ratePercent: l.gstRate, interState: calc.interState },
      unclassified: !l.hsn,
    };
  });
  const shipping: TaxSplit | null = calc.delivery;
  const totals = totalSplits([...lines.map((l) => l.tax), ...(shipping ? [shipping] : [])]);
  const discount = paise(lines.reduce((t, l) => t + l.discount, 0));

  const billTo = party(inv);
  const shipTo: InvoiceCustomer = inv.deliverTo.trim()
    ? {
        ...billTo,
        addressLines: inv.deliverTo.split("\n").map((l) => l.trim()).filter(Boolean),
        city: "",
        province: "",
        zip: "",
        gstin: null,
      }
    : billTo;

  const needsAttention: string[] = [];
  if (!inv.client.state) needsAttention.push("Set the buyer's state: it decides CGST + SGST or IGST");
  const noHsn = inv.lines.filter((l) => !l.hsn).map((l) => l.title);
  if (noHsn.length) needsAttention.push(`Add the HSN code for ${noHsn.join(", ")}`);
  if (!inv.lines.length) needsAttention.push("Add at least one item");

  return {
    orderId: 0,
    tags: [],
    orderName: inv.reference,
    orderNumber: 0,
    invoiceNumber: inv.number || "Draft",
    createdAt: `${inv.date}T12:00:00+05:30`,
    paymentMode: inv.paid ? inv.paymentMode : `${inv.paymentMode} · due`,
    currency: "INR",
    customer: shipTo,
    billTo,
    lines,
    shipping,
    totals,
    placeOfSupply: calc.placeOfSupply,
    placeOfSupplyCode: inv.client.state ? stateCode(inv.client.state) : null,
    interState: calc.interState,
    needsAttention,
    discountTotal: discount,
    totalPaid: totals.gross,
    giftDiscount: 0,
    codeDiscount: discount,
    discountCodes: [],
  };
}

export function manualInvoiceHtml(inv: Renderable, opts: { autoPrint?: boolean } = {}): string {
  const status = inv.status ?? "draft";
  const stamp = status === "draft" ? "draft" : status === "cancelled" ? "cancelled" : inv.paid ? "paid" : "none";
  return invoiceHtml(toInvoice(inv), { autoPrint: opts.autoPrint, stamp, orderLabel: "Reference", notes: inv.notes });
}

export function manualInvoiceFilename(inv: Renderable): string {
  return invoiceFilename(toInvoice(inv));
}
