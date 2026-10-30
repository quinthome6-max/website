/**
 * Turns whatever the invoice editor posted into an input the store can keep.
 * The body (client, lines, discounts, delivery) goes through the quotation's
 * sanitiser, so both documents accept exactly the same values.
 */
import { sanitizeQuoteInput } from "@/lib/admin/quotes/sanitize";
import { PAYMENT_MODES, type ManualInvoiceInput } from "./types";

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function sanitizeInvoiceInput(raw: unknown, today: string): ManualInvoiceInput {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const body = sanitizeQuoteInput(raw, today);
  const mode = str(r.paymentMode, 40);
  return {
    id: body.id,
    date: body.date,
    client: body.client,
    deliverTo: body.deliverTo,
    pricesIncludeGst: body.pricesIncludeGst,
    lines: body.lines,
    extraDiscount: body.extraDiscount,
    delivery: body.delivery,
    reference: str(r.reference, 80),
    paymentMode: (PAYMENT_MODES as readonly string[]).includes(mode) ? mode : "Bank transfer",
    paid: r.paid !== false,
    notes: str(r.notes, 2000),
    fromQuote: str(r.fromQuote, 40) || undefined,
  };
}
