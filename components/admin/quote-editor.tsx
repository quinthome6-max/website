"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { calcQuote, deliveryRate, formatINR } from "@/lib/admin/quotes/calc";
import { quoteHtml } from "@/lib/admin/quotes/quote-html";
import {
  DEFAULT_TERMS,
  GST_RATES,
  QUOTE_STATUSES,
  type Quote,
  type QuoteInput,
  type QuoteLine,
  type QuoteStatus,
} from "@/lib/admin/quotes/types";
import type { CatalogueItem } from "@/lib/admin/quotes/catalogue";
import { INDIAN_STATES, stateFromGstin } from "@/lib/data/indian-states";
import {
  deleteQuoteAction,
  duplicateQuoteAction,
  saveQuoteAction,
} from "@/app/admin/(protected)/quotes/actions";
import { cn } from "@/lib/utils";
import { Box, btn, StatusBadge } from "./ui";
import {
  IconCopy,
  IconDown,
  IconDownload,
  IconEye,
  IconPlus,
  IconPrint,
  IconSearch,
  IconTrash,
  IconUp,
  IconX,
} from "./icons";

interface Saved {
  id: string;
  number: string;
  updatedAt: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const uid = () => Math.random().toString(36).slice(2, 10);
const TIME = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

const field =
  "w-[100%] border border-[color:var(--color-rule)] bg-[color:var(--color-white)] px-3 py-2 text-[0.88rem] text-[color:var(--color-charcoal)] outline-none transition-colors placeholder:text-[color:var(--color-charcoal-soft)]/55 focus:border-[color:var(--color-charcoal)]";
const labelCls = "mb-1.5 block text-[0.58rem] font-medium uppercase tracking-[0.2em] text-[color:var(--color-charcoal-soft)]";

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
  const setClient = (k: keyof QuoteInput["client"], v: string) =>
    update((q) => ({ ...q, client: { ...q.client, [k]: v } }));
  const setLine = (id: string, patch: Partial<QuoteLine>) =>
    update((q) => ({ ...q, lines: q.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));

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

  function addProduct(item: CatalogueItem) {
    update((q) => {
      const same = q.lines.find((l) => l.productSlug === item.slug && (l.variant ?? "") === (item.variant ?? ""));
      if (same) {
        return { ...q, lines: q.lines.map((l) => (l === same ? { ...l, quantity: l.quantity + 1 } : l)) };
      }
      const unit = q.pricesIncludeGst ? item.price : round2(item.price / (1 + item.gstRate / 100));
      return {
        ...q,
        lines: [
          ...q.lines,
          {
            id: uid(),
            productSlug: item.slug,
            title: item.title,
            variant: item.variant,
            description: item.description,
            image: item.image,
            hsn: item.hsn,
            gstRate: item.gstRate,
            quantity: 1,
            unitPrice: unit,
            discountPercent: 0,
            needsTaxCheck: item.needsTaxCheck,
          },
        ],
      };
    });
  }
  function addCustom() {
    update((q) => ({
      ...q,
      lines: [...q.lines, { id: uid(), title: "", hsn: "", gstRate: 18, quantity: 1, unitPrice: 0, discountPercent: 0 }],
    }));
  }
  function move(id: string, by: -1 | 1) {
    update((q) => {
      const i = q.lines.findIndex((l) => l.id === id);
      const j = i + by;
      if (i < 0 || j < 0 || j >= q.lines.length) return q;
      const lines = [...q.lines];
      [lines[i], lines[j]] = [lines[j], lines[i]];
      return { ...q, lines };
    });
  }

  /** Switching basis converts the prices, so what the client pays stays put. */
  function setBasis(incl: boolean) {
    update((q) => {
      if (q.pricesIncludeGst === incl) return q;
      // Back to inclusive, a price within 5 paise of a whole rupee is that
      // rupee: ₹899 → ₹761.86 → ₹899, not ₹898.99.
      const conv = (v: number, rate: number) => {
        if (!incl) return round2(v / (1 + rate / 100));
        const g = v * (1 + rate / 100);
        return Math.abs(g - Math.round(g)) < 0.05 ? Math.round(g) : round2(g);
      };
      return {
        ...q,
        pricesIncludeGst: incl,
        lines: q.lines.map((l) => ({ ...l, unitPrice: conv(l.unitPrice, l.gstRate) })),
        delivery: conv(q.delivery, deliveryRate(q.lines)),
      };
    });
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

  const gstinState = quote.client.gstin.length >= 2 ? stateFromGstin(quote.client.gstin) : null;
  const taxChecks = quote.lines.filter((l) => l.needsTaxCheck && !l.hsn);
  const basis = quote.pricesIncludeGst ? "incl. GST" : "excl. GST";
  const money = (n: number) => formatINR(n);

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
              <Box title="Client">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company / business *"><input className={field} value={quote.client.company} onChange={(e) => setClient("company", e.target.value)} placeholder="e.g. The Lalit, Mumbai" /></Field>
                  <Field label="Contact person"><input className={field} value={quote.client.contactName} onChange={(e) => setClient("contactName", e.target.value)} placeholder="Name of the buyer" /></Field>
                  <Field label="Email"><input type="email" className={field} value={quote.client.email} onChange={(e) => setClient("email", e.target.value)} /></Field>
                  <Field label="Phone"><input className={field} value={quote.client.phone} onChange={(e) => setClient("phone", e.target.value)} inputMode="tel" /></Field>
                  <Field label="GSTIN" hint={gstinState ? `Registered in ${gstinState}` : "Optional. Fills in the state when entered."}>
                    <input
                      className={cn(field, "uppercase")}
                      value={quote.client.gstin}
                      maxLength={15}
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                        const st = v.length >= 2 ? stateFromGstin(v) : null;
                        update((q) => ({ ...q, client: { ...q.client, gstin: v, state: st && !q.client.state ? st : q.client.state } }));
                      }}
                      placeholder="27ABCDE1234F1Z5"
                    />
                  </Field>
                  <Field label="State (place of supply) *" hint={quote.client.state ? (calc.interState ? "Outside Maharashtra: IGST" : "Maharashtra: CGST + SGST") : "Decides CGST + SGST or IGST"}>
                    <select className={field} value={quote.client.state} onChange={(e) => setClient("state", e.target.value)}>
                      <option value="">Choose a state</option>
                      {INDIAN_STATES.map((s) => <option key={s.code} value={s.name}>{s.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Address" className="sm:col-span-2"><textarea rows={2} className={field} value={quote.client.address} onChange={(e) => setClient("address", e.target.value)} placeholder="Building, street, area" /></Field>
                  <Field label="City"><input className={field} value={quote.client.city} onChange={(e) => setClient("city", e.target.value)} /></Field>
                  <Field label="PIN code"><input className={field} value={quote.client.pin} onChange={(e) => setClient("pin", e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" /></Field>
                  <Field label="Deliver to (if different)" className="sm:col-span-2"><textarea rows={2} className={field} value={quote.deliverTo} onChange={(e) => update((q) => ({ ...q, deliverTo: e.target.value }))} placeholder="Leave empty when it is the address above" /></Field>
                </div>
              </Box>

              <Box title="Quotation">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Date"><input type="date" className={field} value={quote.date} onChange={(e) => update((q) => ({ ...q, date: e.target.value }))} /></Field>
                  <Field label="Valid until"><input type="date" className={field} value={quote.validUntil} onChange={(e) => update((q) => ({ ...q, validUntil: e.target.value }))} /></Field>
                  <Field label="Status">
                    <select className={field} value={quote.status} onChange={(e) => update((q) => ({ ...q, status: e.target.value as QuoteStatus }))}>
                      {QUOTE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Unit prices">
                    <div className="flex border border-[color:var(--color-rule)]">
                      {[true, false].map((incl) => (
                        <button
                          key={String(incl)}
                          type="button"
                          onClick={() => setBasis(incl)}
                          className={cn(
                            "flex-1 px-2 py-2 text-[0.7rem] font-medium transition-colors",
                            quote.pricesIncludeGst === incl ? "bg-[color:var(--color-verdant)] text-[color:var(--color-ivory)]" : "bg-[color:var(--color-white)] text-[color:var(--color-charcoal-soft)]"
                          )}
                        >
                          {incl ? "Incl. GST" : "Excl. GST"}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </Box>

              <Box title={`Items · ${quote.lines.length} · prices ${basis}`} padded={false}>
                <div className="flex flex-wrap items-center gap-3 border-b border-[color:var(--color-rule)] px-5 py-4">
                  <ProductPicker items={catalogue} onPick={addProduct} />
                  <button type="button" onClick={addCustom} className={btn.secondary}><IconPlus /> Custom item</button>
                </div>

                {taxChecks.length > 0 && (
                  <div className="border-b border-[color:var(--color-rule)] bg-[color:var(--color-stardust-soft)] px-5 py-2.5 text-[0.78rem]">
                    <strong className="font-medium">Check the tax on these items.</strong> Their HSN code or GST rate is not confirmed. Fill in the HSN and set the rate before sending.
                  </div>
                )}

                {quote.lines.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[0.88rem] text-[color:var(--color-charcoal-soft)]">
                    Search the range above to add products, or add a custom item (installation, a signature scent, a bulk oil size).
                  </div>
                ) : (
                  // Sized by the space the list has, not the window, so the
                  // figures sit in one row only when there is room for them.
                  <ul className="@container divide-y divide-[color:var(--color-rule-soft)]">
                    {quote.lines.map((l, i) => {
                      const r = calc.lines.find((x) => x.id === l.id);
                      return (
                        <li key={l.id} className="px-5 py-4">
                          <div className="flex gap-3">
                            {l.image ? (
                              <Image src={l.image} alt="" width={44} height={55} className="h-[55px] w-[44px] shrink-0 border border-[color:var(--color-rule)] object-cover" />
                            ) : (
                              <span className="flex h-[55px] w-[44px] shrink-0 items-center justify-center border border-dashed border-[color:var(--color-rule)] text-[0.6rem] text-[color:var(--color-charcoal-soft)]">{i + 1}</span>
                            )}
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <input className={cn(field, "py-1.5 font-medium")} value={l.title} onChange={(e) => setLine(l.id, { title: e.target.value })} placeholder="Item name" aria-label="Item name" />
                              <div className="grid gap-1.5 @md:grid-cols-[9rem_minmax(0,1fr)]">
                                <input className={cn(field, "py-1 text-[0.78rem]")} value={l.variant ?? ""} onChange={(e) => setLine(l.id, { variant: e.target.value })} placeholder="Finish / size" aria-label="Finish or size" />
                                <input className={cn(field, "py-1 text-[0.78rem]")} value={l.description ?? ""} onChange={(e) => setLine(l.id, { description: e.target.value })} placeholder="Short description" aria-label="Description" />
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-center @md:flex-row @md:items-start">
                              <IconButton label="Move up" onClick={() => move(l.id, -1)} disabled={i === 0}><IconUp /></IconButton>
                              <IconButton label="Move down" onClick={() => move(l.id, 1)} disabled={i === quote.lines.length - 1}><IconDown /></IconButton>
                              <IconButton label="Remove" onClick={() => update((q) => ({ ...q, lines: q.lines.filter((x) => x.id !== l.id) }))}><IconTrash /></IconButton>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-[6.5rem_minmax(0,1fr)_4.75rem_5.25rem_6.75rem_minmax(0,1fr)] @2xl:pl-[3.5rem]">
                            <Cell label="Qty"><Stepper value={l.quantity} onChange={(n) => setLine(l.id, { quantity: n })} /></Cell>
                            <Cell label="Unit price"><NumberInput value={l.unitPrice} onValue={(n) => setLine(l.id, { unitPrice: n })} prefix="₹" /></Cell>
                            <Cell label="Disc. %"><NumberInput value={l.discountPercent} onValue={(n) => setLine(l.id, { discountPercent: Math.min(100, n) })} /></Cell>
                            <Cell label="GST">
                              <select className={cn(field, "px-2 py-1.5")} value={l.gstRate} onChange={(e) => setLine(l.id, { gstRate: Number(e.target.value) })}>
                                {GST_RATES.map((g) => <option key={g} value={g}>{g}%</option>)}
                              </select>
                            </Cell>
                            <Cell label="HSN">
                              <input
                                className={cn(field, "px-2 py-1.5 tabular-nums", l.needsTaxCheck && !l.hsn && "border-[color:var(--color-clay-text)]")}
                                value={l.hsn}
                                onChange={(e) => setLine(l.id, { hsn: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                                placeholder={l.needsTaxCheck ? "Confirm" : "—"}
                                inputMode="numeric"
                              />
                            </Cell>
                            <Cell label="Amount" className="text-right">
                              <span className="block pt-1.5 font-medium tabular-nums">{money(r?.tax.gross ?? 0)}</span>
                              {r && r.lineDiscount + r.extraShare > 0 && (
                                <span className="block text-[0.7rem] tabular-nums text-[color:var(--color-charcoal-soft)] line-through">{money(r.base)}</span>
                              )}
                            </Cell>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Box>

              <Box title="Discount & delivery">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Additional discount" hint="On top of any item discounts, shared across the items.">
                    <div className="flex">
                      <div className="flex border border-r-0 border-[color:var(--color-rule)]">
                        {(["percent", "amount"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => update((q) => ({ ...q, extraDiscount: { type: t, value: 0 } }))}
                            className={cn(
                              "w-10 text-[0.8rem] font-medium transition-colors",
                              quote.extraDiscount.type === t ? "bg-[color:var(--color-verdant)] text-[color:var(--color-ivory)]" : "bg-[color:var(--color-white)] text-[color:var(--color-charcoal-soft)]"
                            )}
                            aria-label={t === "percent" ? "Percent" : "Rupees"}
                          >
                            {t === "percent" ? "%" : "₹"}
                          </button>
                        ))}
                      </div>
                      <NumberInput
                        value={quote.extraDiscount.value}
                        onValue={(n) => update((q) => ({ ...q, extraDiscount: { ...q.extraDiscount, value: q.extraDiscount.type === "percent" ? Math.min(100, n) : n } }))}
                      />
                    </div>
                  </Field>
                  <Field label={`Delivery charge (${basis})`} hint="Taxed at the items' GST rate (the higher one if they differ). Leave at 0 for free delivery.">
                    <NumberInput value={quote.delivery} onValue={(n) => update((q) => ({ ...q, delivery: n }))} prefix="₹" />
                  </Field>
                </div>
              </Box>

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
          <Box title="Summary">
            <p className="text-[0.95rem]" style={{ fontFamily: "var(--font-serif)" }}>
              {quote.client.company || quote.client.contactName || <span className="text-[color:var(--color-charcoal-soft)]">No client yet</span>}
            </p>
            <p className="mt-0.5 text-[0.74rem] text-[color:var(--color-charcoal-soft)]">
              {calc.placeOfSupply} · {calc.interState ? "IGST" : "CGST + SGST"} · {calc.units.toLocaleString("en-IN")} unit{calc.units === 1 ? "" : "s"}
            </p>
            <dl className="mt-4 space-y-1.5 text-[0.84rem]">
              <Row k={`Subtotal (${basis})`} v={money(calc.subtotal)} />
              {calc.lineDiscounts > 0 && <Row k="Item discounts" v={`−${money(calc.lineDiscounts)}`} />}
              {calc.extraDiscount > 0 && <Row k="Additional discount" v={`−${money(calc.extraDiscount)}`} />}
              {calc.delivery && <Row k="Delivery" v={money(quote.delivery)} />}
              <div className="my-2 border-t border-[color:var(--color-rule)]" />
              <Row k="Taxable value" v={money(calc.taxable)} />
              {calc.byRate.map((r) =>
                calc.interState ? (
                  <Row key={r.rate} k={`IGST @ ${r.rate}%`} v={money(r.igst)} soft />
                ) : (
                  <div key={r.rate} className="space-y-1.5">
                    <Row k={`CGST @ ${r.rate / 2}%`} v={money(r.cgst)} soft />
                    <Row k={`SGST @ ${r.rate / 2}%`} v={money(r.sgst)} soft />
                  </div>
                )
              )}
              {calc.roundOff !== 0 && <Row k="Round off" v={`${calc.roundOff > 0 ? "+" : "−"}${money(Math.abs(calc.roundOff))}`} soft />}
            </dl>
            <div className="mt-4 flex items-baseline justify-between bg-[color:var(--color-verdant)] px-4 py-3 text-[color:var(--color-ivory)]">
              <span className="text-[0.62rem] font-medium uppercase tracking-[0.2em]">Grand total</span>
              <span className="tabular-nums" style={{ fontFamily: "var(--font-serif)", fontSize: "1.45rem" }}>{formatINR(calc.grandTotal, 0)}</span>
            </div>
            {calc.savings > 0 && (
              <p className="mt-2 text-[0.76rem] text-[color:var(--color-charcoal-soft)]">
                Client saves <strong className="font-medium text-[color:var(--color-clay-text)]">{formatINR(calc.savings, 0)}</strong>
                {calc.subtotal > 0 && ` (${Math.round((calc.savings / (calc.total + calc.savings)) * 100)}%)`}
              </p>
            )}
          </Box>

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
              <div className="mt-4 flex items-center justify-between border-t border-[color:var(--color-rule)] pt-4">
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

/* Small parts ------------------------------------------------------------- */

/** Starts a file download without leaving the editor. */
function download(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function Field({ label, hint, className, children }: { label: string; hint?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.7rem] text-[color:var(--color-charcoal-soft)]">{hint}</span>}
    </label>
  );
}

/** A figure on an item line, labelled above. */
function Cell({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("min-w-0", className)}>
      <span className="mb-1 block truncate text-[0.56rem] font-medium uppercase tracking-[0.16em] text-[color:var(--color-charcoal-soft)]">{label}</span>
      {children}
    </div>
  );
}

function Row({ k, v, soft }: { k: string; v: string; soft?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", soft && "text-[color:var(--color-charcoal-soft)]")}>
      <dt>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center text-[color:var(--color-charcoal-soft)] transition-colors hover:bg-[color:var(--color-ivory)] hover:text-[color:var(--color-charcoal)] disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** A number field that lets you type freely ("12.") and reports clean numbers. */
function NumberInput({ value, onValue, prefix }: { value: number; onValue: (n: number) => void; prefix?: string }) {
  const [text, setText] = useState(String(value || ""));
  const [lastValue, setLastValue] = useState(value);
  // The value changed from outside (a basis switch, say): show it.
  if (value !== lastValue) {
    setLastValue(value);
    if (Number(text || 0) !== value) setText(value ? String(value) : "");
  }
  return (
    <div className="flex w-[100%] items-center border border-[color:var(--color-rule)] bg-[color:var(--color-white)] focus-within:border-[color:var(--color-charcoal)]">
      {prefix && <span className="pl-2.5 text-[0.82rem] text-[color:var(--color-charcoal-soft)]">{prefix}</span>}
      <input
        inputMode="decimal"
        className="w-[100%] min-w-0 bg-transparent px-2.5 py-1.5 text-[0.88rem] tabular-nums outline-none"
        value={text}
        placeholder="0"
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
          setText(t);
          const n = Number(t || 0);
          if (Number.isFinite(n)) {
            setLastValue(n);
            onValue(n);
          }
        }}
      />
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-stretch border border-[color:var(--color-rule)] bg-[color:var(--color-white)]">
      <button type="button" aria-label="One fewer" onClick={() => onChange(Math.max(1, value - 1))} className="w-7 text-[color:var(--color-charcoal-soft)] hover:text-[color:var(--color-charcoal)]">−</button>
      <input
        inputMode="numeric"
        aria-label="Quantity"
        className="w-[100%] min-w-0 bg-transparent py-1.5 text-center text-[0.88rem] tabular-nums outline-none"
        value={value || ""}
        onChange={(e) => onChange(Math.max(0, Math.min(1_000_000, Number(e.target.value.replace(/\D/g, "") || 0))))}
      />
      <button type="button" aria-label="One more" onClick={() => onChange(value + 1)} className="w-7 text-[color:var(--color-charcoal-soft)] hover:text-[color:var(--color-charcoal)]">+</button>
    </div>
  );
}

/** Search the range and add a product with one click (or arrow keys + Enter). */
function ProductPicker({ items, onPick }: { items: CatalogueItem[]; onPick: (i: CatalogueItem) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const term = q.trim().toLowerCase();
  const shown = items.filter((i) => !term || `${i.title} ${i.variant ?? ""} ${i.group} ${i.description}`.toLowerCase().includes(term));

  const pick = (i: CatalogueItem) => {
    onPick(i);
    setQ("");
    setActive(0);
  };

  return (
    <div className="relative min-w-[16rem] flex-1">
      <div className="flex items-center gap-2 border border-[color:var(--color-charcoal)]/25 bg-[color:var(--color-white)] px-3 focus-within:border-[color:var(--color-charcoal)]">
        <IconSearch className="shrink-0 text-[color:var(--color-charcoal-soft)]" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(shown.length - 1, a + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            if (e.key === "Enter" && open && shown[active]) { e.preventDefault(); pick(shown[active]); }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Add a product: Monolith, Terrain, candle…"
          className="w-[100%] bg-transparent py-2.5 text-[0.88rem] outline-none placeholder:text-[color:var(--color-charcoal-soft)]/70"
          role="combobox"
          aria-expanded={open}
          aria-controls="quote-products"
          aria-autocomplete="list"
        />
      </div>
      {open && (
        <ul id="quote-products" role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[22rem] overflow-y-auto border border-[color:var(--color-rule)] bg-[color:var(--color-white)] shadow-[0_12px_32px_-12px_rgba(41,51,41,0.35)]">
          {shown.length === 0 && <li className="px-4 py-3 text-[0.82rem] text-[color:var(--color-charcoal-soft)]">Nothing matches. Add it as a custom item.</li>}
          {shown.map((i, n) => (
            <li key={i.key} role="option" aria-selected={n === active}>
              {(n === 0 || shown[n - 1].group !== i.group) && (
                <p className="bg-[color:var(--color-ivory)] px-4 py-1.5 text-[0.56rem] font-medium uppercase tracking-[0.2em] text-[color:var(--color-charcoal-soft)]">{i.group}</p>
              )}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(i); }}
                onMouseEnter={() => setActive(n)}
                className={cn("flex w-[100%] items-center gap-3 px-4 py-2 text-left", n === active && "bg-[color:var(--color-stardust-soft)]")}
              >
                <Image src={i.image} alt="" width={32} height={40} className="h-10 w-8 shrink-0 object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.88rem]">{i.title}{i.variant ? <span className="text-[color:var(--color-charcoal-soft)]"> · {i.variant}</span> : null}</span>
                  <span className="block truncate text-[0.72rem] text-[color:var(--color-charcoal-soft)]">{i.description}</span>
                </span>
                <span className="shrink-0 text-[0.82rem] tabular-nums">{formatINR(i.price, 0)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
