"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { calcQuote } from "@/lib/admin/quotes/calc";
import { quoteHtml } from "@/lib/admin/quotes/quote-html";
import {
  DEFAULT_TERMS,
  QUOTE_STATUSES,
  type Quote,
  type QuoteInput,
  type QuoteStatus,
} from "@/lib/admin/quotes/types";
import type { CatalogueItem } from "@/lib/admin/quotes/catalogue";
import {
  deleteQuoteAction,
  duplicateQuoteAction,
  saveQuoteAction,
} from "@/app/admin/(protected)/quotes/actions";
import { createInvoiceFromQuoteAction } from "@/app/admin/(protected)/invoices/actions";
import { cn } from "@/lib/utils";
import { Box, btn, StatusBadge } from "./ui";
import { IconCopy, IconDownload, IconEye, IconPrint, IconReceipt, IconTrash, IconX } from "./icons";
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
  updatedAt: string;
}

const TIME = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export function QuoteEditor({
  initial,
  saved: savedInitially,
  catalogue,
  notice,
}: {
  initial: QuoteInput;
  saved?: Saved;
  catalogue: CatalogueItem[];
  notice?: string;
}) {
  const [quote, setQuote] = useState<QuoteInput>(initial);
  const [saved, setSaved] = useState<Saved | null>(savedInitially ?? null);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [message, setMessage] = useState<{ tone: "ok" | "warn"; text: string } | null>(
    notice ? { tone: "ok", text: notice } : null
  );
  const [pending, start] = useTransition();
  const calc = useMemo(() => calcQuote(quote), [quote]);

  const update = (fn: (q: QuoteInput) => QuoteInput) => {
    setQuote(fn);
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

  /** Saves, then (optionally) opens what was asked for once the quote exists. */
  function save(then?: "pdf" | "print") {
    // A tab opened inside the click survives popup blockers; it is pointed at
    // the document once the save has given the quote an id.
    const tab = then === "print" ? window.open("", "_blank") : null;
    start(async () => {
      const res = await saveQuoteAction(quote);
      if (!res.ok) {
        tab?.close();
        setMessage({ tone: "warn", text: res.error });
        return;
      }
      const first = !saved;
      setSaved({ id: res.id, number: res.number, updatedAt: res.updatedAt });
      setQuote((q) => ({ ...q, id: res.id }));
      setDirty(false);
      setMessage({ tone: "ok", text: first ? `Saved as ${res.number}.` : "Saved." });
      if (first) window.history.replaceState(null, "", `/admin/quotes/${res.id}`);
      if (then === "pdf") download(`/api/admin/quote-pdf?id=${res.id}`);
      if (tab) tab.location.href = `/api/admin/quote-document?id=${res.id}&print=1`;
    });
  }
  useEffect(() => {
    saveRef.current = () => save();
  });

  function pdf() {
    if (saved && !dirty) download(`/api/admin/quote-pdf?id=${saved.id}`);
    else save("pdf");
  }
  function print() {
    if (saved && !dirty) window.open(`/api/admin/quote-document?id=${saved.id}&print=1`, "_blank");
    else save("print");
  }

  const preview = useMemo(() => {
    if (view !== "preview") return "";
    const doc: Quote = {
      ...quote,
      id: saved?.id ?? "draft",
      number: saved?.number ?? "Draft",
      createdAt: "",
      updatedAt: "",
      createdBy: "",
    };
    return quoteHtml(doc);
  }, [view, quote, saved]);

  return (
    <div>
      {/* Title row */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/quotes" className={btn.quiet}>← All quotations</Link>
          <h1 className="mt-2 flex flex-wrap items-center gap-3" style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.5rem, 2.2vw, 1.95rem)", lineHeight: 1.15, fontWeight: 400 }}>
            {saved ? saved.number : "New quotation"}
            <StatusBadge status={quote.status} label={QUOTE_STATUSES.find((s) => s.value === quote.status)?.label} />
          </h1>
          <p className="mt-1 text-[0.78rem] text-[color:var(--color-charcoal-soft)]" aria-live="polite">
            {pending ? "Saving…" : dirty ? "Unsaved changes" : saved ? `Last saved ${TIME.format(new Date(saved.updatedAt))}` : "Not saved yet"}
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

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        {/* ── Left: the form, or the preview ── */}
        <div className="min-w-0 space-y-6">
          {view === "preview" ? (
            <Box title="Preview" padded={false} action={<span className="text-[0.72rem] text-[color:var(--color-charcoal-soft)]">Exactly what the PDF will show</span>}>
              <iframe title="Quotation preview" srcDoc={preview} className="h-[80vh] w-[100%] bg-white" />
            </Box>
          ) : (
            <>
              <ClientBox doc={quote} update={update} calc={calc} />

              <Box title="Quotation">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Date"><input type="date" className={field} value={quote.date} onChange={(e) => update((q) => ({ ...q, date: e.target.value }))} /></Field>
                  <Field label="Valid until"><input type="date" className={field} value={quote.validUntil} onChange={(e) => update((q) => ({ ...q, validUntil: e.target.value }))} /></Field>
                  <Field label="Status">
                    <select className={field} value={quote.status} onChange={(e) => update((q) => ({ ...q, status: e.target.value as QuoteStatus }))}>
                      {QUOTE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </Field>
                  <PricingToggle doc={quote} update={update} />
                </div>
              </Box>

              <ItemsBox doc={quote} update={update} calc={calc} catalogue={catalogue} />

              <DiscountDeliveryBox doc={quote} update={update} />

              <Box title="Message & terms">
                <div className="grid gap-4">
                  <Field label="Message to the client" hint="Printed above the items. Optional.">
                    <textarea rows={3} className={field} value={quote.message} onChange={(e) => update((q) => ({ ...q, message: e.target.value }))} placeholder="Thank you for your interest in scenting your space with Quint Home. As discussed, here is our quotation for…" />
                  </Field>
                  <Field
                    label="Terms & conditions"
                    hint={
                      <>
                        One term per line.{" "}
                        <button type="button" className="underline underline-offset-2" onClick={() => update((q) => ({ ...q, terms: DEFAULT_TERMS }))}>
                          Reset to the standard terms
                        </button>
                      </>
                    }
                  >
                    <textarea rows={6} className={field} value={quote.terms} onChange={(e) => update((q) => ({ ...q, terms: e.target.value }))} />
                  </Field>
                </div>
              </Box>
            </>
          )}
        </div>

        {/* ── Right: live summary and actions ── */}
        <aside className="space-y-4 xl:sticky xl:top-6">
          <SummaryBox doc={quote} calc={calc} />

          <Box>
            <div className="grid gap-2.5">
              <button type="button" onClick={() => save()} disabled={pending} className={cn(btn.primary, "w-[100%] py-3")}>
                {pending ? "Saving…" : saved && !dirty ? "Saved" : "Save quotation"}
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={pdf} disabled={pending} className={btn.secondary}><IconDownload /> PDF</button>
                <button type="button" onClick={print} disabled={pending} className={btn.secondary}><IconPrint /> Print</button>
              </div>
              <p className="text-[0.7rem] leading-[1.5] text-[color:var(--color-charcoal-soft)]">
                PDF downloads a file to send on WhatsApp or by email. Saving happens first if needed. ⌘S / Ctrl+S saves.
              </p>
            </div>
            {saved && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[color:var(--color-rule)] pt-4">
                <button
                  type="button"
                  className={btn.quiet}
                  disabled={pending}
                  onClick={() => start(async () => { if (dirty) { const r = await saveQuoteAction(quote); if (!r.ok) return setMessage({ tone: "warn", text: r.error }); } setDirty(false); await duplicateQuoteAction(saved.id); })}
                >
                  <IconCopy /> Duplicate
                </button>
                <button
                  type="button"
                  className={btn.quiet}
                  disabled={pending}
                  title="A draft tax invoice with this client and these items"
                  onClick={() => start(async () => { if (dirty) { const r = await saveQuoteAction(quote); if (!r.ok) return setMessage({ tone: "warn", text: r.error }); } setDirty(false); await createInvoiceFromQuoteAction(saved.id); })}
                >
                  <IconReceipt /> Create invoice
                </button>
                <button
                  type="button"
                  className={btn.danger}
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(`Delete ${saved.number}? This cannot be undone.`)) return;
                    setDirty(false);
                    start(async () => { await deleteQuoteAction(saved.id); });
                  }}
                >
                  <IconTrash /> Delete
                </button>
              </div>
            )}
          </Box>
        </aside>
      </div>
    </div>
  );
}
