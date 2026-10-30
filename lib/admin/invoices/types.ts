/**
 * Manual tax invoices: sales made outside the website (a bulk order on
 * WhatsApp, a hotel paying by bank transfer), invoiced from /admin/invoices.
 *
 * The body is a quotation's: the same client, lines, discounts and delivery,
 * so the GST maths is lib/admin/quotes/calc.ts and an accepted quote turns
 * into an invoice without retyping. What makes it an invoice is the number,
 * given when it is issued, and how it was paid.
 *
 * Numbering. Website orders are invoiced under their Shopify order number, so
 * manual invoices run in a series of their own, MI/<financial year>/0001,
 * which can never collide with them. GST asks for consecutive numbers within a
 * series, so a number is given only when the invoice is issued (a draft has
 * none and can be deleted), and an issued invoice can be cancelled but never
 * deleted: the series has no gaps.
 */
import type { QuoteClient, QuoteInput, QuoteLine } from "@/lib/admin/quotes/types";
import { emptyQuote, financialYear } from "@/lib/admin/quotes/types";

export type InvoiceStatus = "draft" | "issued" | "cancelled";

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "cancelled", label: "Cancelled" },
];

export const PAYMENT_MODES = [
  "Bank transfer",
  "UPI",
  "Cash",
  "Card",
  "Cheque",
  "Payment link",
  "Credit (to be paid)",
] as const;

export interface ManualInvoice {
  id: string;
  /** MI/26-27/0001 once issued; "" while a draft. */
  number: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  issuedAt?: string;
  cancelledAt?: string;
  /** Invoice date, YYYY-MM-DD. */
  date: string;
  client: QuoteClient;
  deliverTo: string;
  pricesIncludeGst: boolean;
  lines: QuoteLine[];
  extraDiscount: QuoteInput["extraDiscount"];
  delivery: number;
  /** The buyer's PO, an order number, or the quotation it came from. */
  reference: string;
  paymentMode: string;
  paid: boolean;
  /** Printed under the totals: payment terms, bank details. */
  notes: string;
  /** The quotation it was made from, if any. */
  fromQuote?: string;
}

/** What the editor sends to be saved. Server-owned fields are filled there. */
export type ManualInvoiceInput = Omit<
  ManualInvoice,
  "id" | "number" | "status" | "createdAt" | "updatedAt" | "createdBy" | "issuedAt" | "cancelledAt"
> & { id?: string };

export const DEFAULT_INVOICE_NOTES = "Goods once sold are exchanged only as set out at quinthome.in/shipping.";

export function emptyInvoice(): ManualInvoiceInput {
  const q = emptyQuote();
  return {
    date: q.date,
    client: q.client,
    deliverTo: "",
    pricesIncludeGst: true,
    lines: [],
    extraDiscount: { type: "percent", value: 0 },
    delivery: 0,
    reference: "",
    paymentMode: "Bank transfer",
    paid: true,
    notes: DEFAULT_INVOICE_NOTES,
  };
}

export function invoiceNumber(fy: string, n: number): string {
  return `MI/${fy}/${String(n).padStart(4, "0")}`;
}

export { financialYear };
