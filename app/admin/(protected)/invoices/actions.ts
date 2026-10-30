"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/admin/session";
import { sanitizeInvoiceInput } from "@/lib/admin/invoices/sanitize";
import {
  cancelManualInvoice,
  deleteManualInvoice,
  InvoiceStateError,
  issueManualInvoice,
  manualInvoicesAvailable,
  saveManualInvoice,
} from "@/lib/admin/invoices/store";
import { DEFAULT_INVOICE_NOTES } from "@/lib/admin/invoices/types";
import { getQuote } from "@/lib/admin/quotes/store";

// Server actions answer any POST, so each one checks the session itself
// rather than relying on the page that shows its button. Staff only: the
// marketing passphrase never reaches invoices.

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export type InvoiceResult =
  | { ok: true; id: string; number: string; status: "draft" | "issued" | "cancelled"; updatedAt: string }
  | { ok: false; error: string };

// Only actions that leave the editor (delete, make from a quote) revalidate.
// Revalidating from save, issue or cancel makes the router refetch the page
// the editor is on, which remounts it and loses its "Saved" message; the list
// and the dashboard are dynamic pages, fresh on every visit anyway.
const refresh = () => {
  revalidatePath("/admin/invoices");
  revalidatePath("/admin");
};

export async function saveInvoiceAction(raw: unknown): Promise<InvoiceResult> {
  const by = await requireStaff();
  if (!manualInvoicesAvailable) return { ok: false, error: "Invoices need the shop's Redis database, which this deployment cannot reach." };
  const input = sanitizeInvoiceInput(raw, today());
  if (!input.client.company && !input.client.contactName) {
    return { ok: false, error: "Add the buyer's company or name first." };
  }
  try {
    const saved = await saveManualInvoice(input, by);
    return { ok: true, id: saved.id, number: saved.number, status: saved.status, updatedAt: saved.updatedAt };
  } catch (e) {
    if (e instanceof InvoiceStateError) return { ok: false, error: e.message };
    console.error("[invoices] save failed", e);
    return { ok: false, error: "Could not save the invoice. Try again in a moment." };
  }
}

/**
 * Checks the invoice is complete, saves it, then gives it the next number.
 * The checks come first, so a refused issue saves nothing: the editor never
 * ends up holding a draft the server has but it doesn't know the id of.
 */
export async function issueInvoiceAction(raw: unknown): Promise<InvoiceResult> {
  await requireStaff();
  const input = sanitizeInvoiceInput(raw, today());
  if (!input.client.state) return { ok: false, error: "Set the buyer's state before issuing: it decides CGST + SGST or IGST." };
  if (!input.lines.length) return { ok: false, error: "Add at least one item before issuing." };
  const noHsn = input.lines.filter((l) => !l.hsn).map((l) => l.title);
  if (noHsn.length) return { ok: false, error: `Add the HSN code for ${noHsn.join(", ")} before issuing.` };
  const saved = await saveInvoiceAction(raw);
  if (!saved.ok) return saved;
  try {
    const inv = await issueManualInvoice(saved.id);
    return { ok: true, id: inv.id, number: inv.number, status: inv.status, updatedAt: inv.updatedAt };
  } catch (e) {
    if (e instanceof InvoiceStateError) return { ok: false, error: e.message };
    console.error("[invoices] issue failed", e);
    return { ok: false, error: "Could not issue the invoice. Try again in a moment." };
  }
}

export async function cancelInvoiceAction(id: string): Promise<InvoiceResult> {
  await requireStaff();
  try {
    const inv = await cancelManualInvoice(id);
    return { ok: true, id: inv.id, number: inv.number, status: inv.status, updatedAt: inv.updatedAt };
  } catch (e) {
    if (e instanceof InvoiceStateError) return { ok: false, error: e.message };
    console.error("[invoices] cancel failed", e);
    return { ok: false, error: "Could not cancel the invoice. Try again in a moment." };
  }
}

export async function deleteInvoiceAction(id: string): Promise<{ ok: false; error: string } | void> {
  await requireStaff();
  try {
    await deleteManualInvoice(id);
  } catch (e) {
    if (e instanceof InvoiceStateError) return { ok: false, error: e.message };
    throw e;
  }
  refresh();
  redirect("/admin/invoices?deleted=1");
}

/** A draft invoice with a quotation's client, items and terms of sale. */
export async function createInvoiceFromQuoteAction(quoteId: string): Promise<void> {
  const by = await requireStaff();
  const quote = await getQuote(quoteId);
  if (!quote) redirect("/admin/quotes");
  const inv = await saveManualInvoice(
    {
      date: today(),
      client: quote.client,
      deliverTo: quote.deliverTo,
      pricesIncludeGst: quote.pricesIncludeGst,
      lines: quote.lines,
      extraDiscount: quote.extraDiscount,
      delivery: quote.delivery,
      reference: quote.number,
      paymentMode: "Bank transfer",
      paid: true,
      notes: DEFAULT_INVOICE_NOTES,
      fromQuote: quote.number,
    },
    by
  );
  refresh();
  redirect(`/admin/invoices/${inv.id}?from=${encodeURIComponent(quote.number)}`);
}
