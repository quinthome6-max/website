"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { calcQuote } from "@/lib/admin/quotes/calc";
import type { CatalogueItem } from "@/lib/admin/quotes/catalogue";
import { manualInvoiceHtml } from "@/lib/admin/invoices/render";
import {
  DEFAULT_INVOICE_NOTES,
  INVOICE_STATUSES,
  PAYMENT_MODES,
  type InvoiceStatus,
  type ManualInvoiceInput,
} from "@/lib/admin/invoices/types";
import {
  cancelInvoiceAction,
  deleteInvoiceAction,
  issueInvoiceAction,
  saveInvoiceAction,
  type InvoiceResult,
} from "@/app/admin/(protected)/invoices/actions";
import { cn } from "@/lib/utils";
import { Box, btn, StatusBadge } from "./ui";
import { IconDownload, IconEye, IconPrint, IconTrash, IconX } from "./icons";
import {
  ClientBox,
  DiscountDeliveryBox,
  download,
  Field,
  field,
  ItemsBox,
  PricingToggle,
  SummaryBox,
} from "./doc-parts";

interface Saved {
  id: string;
  number: string;
  status: InvoiceStatus;
  updatedAt: string;
}

const TIME = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/**
 * A manual tax invoice: the quotation's client, items and totals (shared in
 * doc-parts), plus how it was paid. Saved as a draft without a number; "Issue
 * invoice" gives it the next MI/<year>/0001 number. An issued invoice can be
 * corrected and cancelled, never deleted, so the series has no gaps.
 */
export function InvoiceEditor({
  initial,
  saved: savedInitially,
  catalogue,
  notice,
}: {
  initial: ManualInvoiceInput;
  saved?: Saved;
  catalogue: CatalogueItem[];
  notice?: string;
}) {
  const [inv, setInv] = useState<ManualInvoiceInput>(initial);
  const [saved, setSaved] = useState<Saved | null>(savedInitially ?? null);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [message, setMessage] = useState<{ tone: "ok" | "warn"; text: string } | null>(
    notice ? { tone: "ok", text: notice } : null
  );
  const [pending, start] = useTransition();
  const calc = useMemo(() => calcQuote(inv), [inv]);
  const status: InvoiceStatus = saved?.status ?? "draft";
  const locked = status === "cancelled";

  const update = (fn: (d: ManualInvoiceInput) => ManualInvoiceInput) => {
    if (locked) return;
    setInv(fn);
    setDirty(true);
  };

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // ⌘S / Ctrl+S saves.
  const saveRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Applies what the server answered, then opens what was asked for. */
  function settle(res: InvoiceResult, said: (r: Extract<InvoiceResult, { ok: true }>, first: boolean) => string, tab: Window | null, then?: "pdf" | "print") {
    if (!res.ok) {
      tab?.close();
      setMessage({ tone: "warn", text: res.error });
      return;
    }
    const first = !saved;
    setSaved({ id: res.id, number: res.number, status: res.status, updatedAt: res.updatedAt });
    setInv((d) => ({ ...d, id: res.id }));
    setDirty(false);
    setMessage({ tone: "ok", text: said(res, first) });
    if (first) window.history.replaceState(null, "", `/admin/invoices/${res.id}`);
    if (then === "pdf") download(`/api/admin/manual-invoice-pdf?id=${res.id}`);
    if (tab) tab.location.href = `/api/admin/manual-invoice-document?id=${res.id}&print=1`;
  }

  function save(then?: "pdf" | "print") {
    if (locked) return;
    // A tab opened inside the click survives popup blockers.
    const tab = then === "print" ? window.open("", "_blank") : null;
    start(async () => {
      const res = await saveInvoiceAction(inv);
      settle(res, (r, first) => (first ? "Saved as a draft. Issue it when it is ready." : r.status === "issued" ? `Saved. ${r.number} keeps its number.` : "Saved."), tab, then);
    });
  }
  useEffect(() => {
    saveRef.current = () => save();
  });

  function issue() {
    if (!window.confirm("Issue this invoice? It gets the next invoice number. After that it can be corrected or cancelled, but not deleted.")) return;
    start(async () => {
      const res = await issueInvoiceAction(inv);
      settle(res, (r) => `Issued as ${r.number}.`, null);
    });
  }

  function cancel() {
    if (!saved) return;
    if (!window.confirm(`Cancel ${saved.number}? It stays in the list, marked cancelled, and its number is not reused. This cannot be undone.`)) return;
    start(async () => {
      const res = await cancelInvoiceAction(saved.id);
      settle(res, (r) => `${r.number} is cancelled.`, null);
    });
  }

  function pdf() {
    if (saved && !dirty) download(`/api/admin/manual-invoice-pdf?id=${saved.id}`);
    else save("pdf");
  }
  function print() {
    if (saved && !dirty) window.open(`/api/admin/manual-invoice-document?id=${saved.id}&print=1`, "_blank");
    else save("print");
  }

  const preview = useMemo(() => {
    if (view !== "preview") return "";
    return manualInvoiceHtml({ ...inv, number: saved?.number ?? "", status });
  }, [view, inv, saved, status]);

  const label = INVOICE_STATUSES.find((s) => s.value === status)?.label;

  return (
    <div>
      {/* Title row */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/invoices" className={btn.quiet}>← All invoices</Link>
          <h1 className="mt-2 flex flex-wrap items-center gap-3" style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.5rem, 2.2vw, 1.95rem)", lineHeight: 1.15, fontWeight: 400 }}>
            {saved?.number || (saved ? "Draft invoice" : "New invoice")}
            <StatusBadge status={status === "issued" ? "accepted" : status === "cancelled" ? "declined" : "draft"} label={label} />
            {status === "issued" && !inv.paid && <StatusBadge status="sent" label="Payment due" />}
          </h1>
          <p className="mt-1 text-[0.78rem] text-[color:var(--color-charcoal-soft)]" aria-live="polite">
            {pending ? "Working…" : dirty ? "Unsaved changes" : saved ? `Last saved ${TIME.format(new Date(saved.updatedAt))}` : "Not saved yet"}
            {inv.fromQuote ? ` · from quotation ${inv.fromQuote}` : ""}
          </p>
        </div>
        <div className="flex border border-[color:var(--color-rule)] bg-[color:var(--color-white)] p-1" role="tablist" aria-label="View">
          {(["edit", "preview"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-[0.66rem] font-medium uppercase tracking-[0.18em] transition-colors",
                view === v ? "bg-[color:var(--color-verdant)] text-[color:var(--color-ivory)]" : "text-[color:var(--color-charcoal-soft)] hover:text-[color:var(--color-charcoal)]"
              )}
            >
              {v === "preview" && <IconEye />}
              {v === "edit" ? "Edit" : "Preview PDF"}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div
          role="status"
          className={cn(
            "mb-5 flex items-start justify-between gap-4 border-l-2 bg-[color:var(--color-white)] px-4 py-3 text-[0.84rem]",
            message.tone === "ok" ? "border-[color:var(--color-verdant)]" : "border-[color:var(--color-clay-text)]"
          )}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss" className="text-[color:var(--color-charcoal-soft)]"><IconX /></button>
        </div>
      )}
      {status === "issued" && (
        <p className="mb-5 border-l-2 border-[color:var(--color-aerial)] bg-[color:var(--color-white)] px-4 py-3 text-[0.8rem] text-[color:var(--color-charcoal-soft)]">
          This invoice is issued. Correct only mistakes (an address, a typo): a changed amount should be a new invoice, with this one cancelled.
        </p>
      )}
      {locked && (
        <p className="mb-5 border-l-2 border-[color:var(--color-clay-text)] bg-[color:var(--color-white)] px-4 py-3 text-[0.8rem]">
          This invoice is cancelled and can no longer be changed. Its number stays in the series.
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        {/* ── Left: the form, or the preview ── */}
        <div className={cn("min-w-0 space-y-6", locked && view === "edit" && "pointer-events-none opacity-60")}>
          {view === "preview" ? (
            <Box title="Preview" padded={false} action={<span className="text-[0.72rem] text-[color:var(--color-charcoal-soft)]">Exactly what the PDF will show</span>}>
              <iframe title="Invoice preview" srcDoc={preview} className="h-[80vh] w-[100%] bg-white" />
            </Box>
          ) : (
            <>
              <ClientBox doc={inv} update={update} calc={calc} title="Bill to" />

              <Box title="Invoice">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Invoice date"><input type="date" className={field} value={inv.date} onChange={(e) => update((d) => ({ ...d, date: e.target.value }))} /></Field>
                  <Field label="Reference" hint="PO, order or quotation no.">
                    <input className={field} value={inv.reference} onChange={(e) => update((d) => ({ ...d, reference: e.target.value }))} placeholder="Optional" />
                  </Field>
                  <Field label="Payment mode">
                    <select className={field} value={inv.paymentMode} onChange={(e) => update((d) => ({ ...d, paymentMode: e.target.value }))}>
                      {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Payment">
                    <div className="flex border border-[color:var(--color-rule)]">
                      {[true, false].map((p) => (
                        <button
                          key={String(p)}
                          type="button"
                          onClick={() => update((d) => ({ ...d, paid: p }))}
                          className={cn(
                            "flex-1 px-2 py-2 text-[0.7rem] font-medium transition-colors",
                            inv.paid === p ? "bg-[color:var(--color-verdant)] text-[color:var(--color-ivory)]" : "bg-[color:var(--color-white)] text-[color:var(--color-charcoal-soft)]"
                          )}
                        >
                          {p ? "Paid" : "Due"}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <PricingToggle doc={inv} update={update} />
                </div>
              </Box>

              <ItemsBox doc={inv} update={update} calc={calc} catalogue={catalogue} checkBefore="issuing" />

              <DiscountDeliveryBox doc={inv} update={update} />

              <Box title="Notes">
                <Field
                  label="Printed under the totals"
                  hint={
                    <>
                      Payment terms, bank details, one per line.{" "}
                      <button type="button" className="underline underline-offset-2" onClick={() => update((d) => ({ ...d, notes: DEFAULT_INVOICE_NOTES }))}>
                        Reset
                      </button>
                    </>
                  }
                >
                  <textarea rows={4} className={field} value={inv.notes} onChange={(e) => update((d) => ({ ...d, notes: e.target.value }))} />
                </Field>
              </Box>
            </>
          )}
        </div>

        {/* ── Right: live summary and actions ── */}
        <aside className="space-y-4 xl:sticky xl:top-6">
          <SummaryBox doc={inv} calc={calc} exact />

          <Box>
            <div className="grid gap-2.5">
              {status === "draft" && (
                <button type="button" onClick={issue} disabled={pending} className={cn(btn.primary, "w-[100%] py-3")}>
                  {pending ? "Working…" : "Issue invoice"}
                </button>
              )}
              {!locked && (
                <button type="button" onClick={() => save()} disabled={pending} className={cn(status === "draft" ? btn.secondary : btn.primary, "w-[100%] py-3")}>
                  {pending ? "Saving…" : saved && !dirty ? "Saved" : status === "draft" ? "Save draft" : "Save corrections"}
                </button>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={pdf} disabled={pending} className={btn.secondary}><IconDownload /> PDF</button>
                <button type="button" onClick={print} disabled={pending} className={btn.secondary}><IconPrint /> Print</button>
              </div>
              <p className="text-[0.7rem] leading-[1.5] text-[color:var(--color-charcoal-soft)]">
                {status === "draft"
                  ? "A draft prints marked DRAFT and has no number. Issue it to give it the next invoice number."
                  : "PDF downloads a file to send on WhatsApp or by email. ⌘S / Ctrl+S saves."}
              </p>
            </div>
            {saved && status !== "cancelled" && (
              <div className="mt-4 flex items-center justify-end border-t border-[color:var(--color-rule)] pt-4">
                {status === "draft" ? (
                  <button
                    type="button"
                    className={btn.danger}
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm("Delete this draft? This cannot be undone.")) return;
                      setDirty(false);
                      start(async () => {
                        const r = await deleteInvoiceAction(saved.id);
                        if (r && !r.ok) setMessage({ tone: "warn", text: r.error });
                      });
                    }}
                  >
                    <IconTrash /> Delete draft
                  </button>
                ) : (
                  <button type="button" className={btn.danger} disabled={pending} onClick={cancel}>
                    <IconX /> Cancel invoice
                  </button>
                )}
              </div>
            )}
          </Box>
        </aside>
      </div>
    </div>
  );
}
