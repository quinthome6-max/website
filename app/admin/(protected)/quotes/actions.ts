"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/admin/session";
import { sanitizeQuoteInput } from "@/lib/admin/quotes/sanitize";
import { deleteQuote, getQuote, quotesAvailable, saveQuote } from "@/lib/admin/quotes/store";
import { emptyQuote, QUOTE_STATUSES, type QuoteStatus } from "@/lib/admin/quotes/types";

// Server actions answer any POST, so each one checks the session itself
// rather than relying on the page that shows its button.

const today = () => new Date().toISOString().slice(0, 10);

export type SaveResult =
  | { ok: true; id: string; number: string; updatedAt: string }
  | { ok: false; error: string };

export async function saveQuoteAction(raw: unknown): Promise<SaveResult> {
  const by = await requireStaff();
  if (!quotesAvailable) return { ok: false, error: "Quotes need the shop's Redis database, which this deployment cannot reach." };
  const input = sanitizeQuoteInput(raw, today());
  if (!input.client.company && !input.client.contactName) {
    return { ok: false, error: "Add the client's company or contact name first." };
  }
  try {
    const saved = await saveQuote(input, by);
    revalidatePath("/admin/quotes");
    revalidatePath("/admin");
    return { ok: true, id: saved.id, number: saved.number, updatedAt: saved.updatedAt };
  } catch (e) {
    console.error("[quotes] save failed", e);
    return { ok: false, error: "Could not save the quotation. Try again in a moment." };
  }
}

export async function duplicateQuoteAction(id: string): Promise<void> {
  const by = await requireStaff();
  const source = await getQuote(id);
  if (!source) redirect("/admin/quotes");
  const fresh = emptyQuote();
  const copy = await saveQuote(
    {
      ...source,
      id: undefined,
      status: "draft",
      date: fresh.date,
      validUntil: fresh.validUntil,
    },
    by
  );
  revalidatePath("/admin/quotes");
  redirect(`/admin/quotes/${copy.id}?copied=${encodeURIComponent(source.number)}`);
}

export async function deleteQuoteAction(id: string): Promise<void> {
  await requireStaff();
  await deleteQuote(id);
  revalidatePath("/admin/quotes");
  revalidatePath("/admin");
  redirect("/admin/quotes?deleted=1");
}

export async function setQuoteStatusAction(formData: FormData): Promise<void> {
  const by = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as QuoteStatus;
  if (!QUOTE_STATUSES.some((s) => s.value === status)) return;
  const quote = await getQuote(id);
  if (!quote) return;
  await saveQuote({ ...quote, status }, by);
  revalidatePath("/admin/quotes");
  revalidatePath("/admin");
}
