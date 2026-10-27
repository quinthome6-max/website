/**
 * Every amount on a quotation, from its lines and terms.
 *
 * Order of work, as a buyer reads it:
 *   1. each line: quantity × unit price, less that line's discount
 *   2. the additional discount, shared across the lines in proportion to
 *      their value (so each line's GST is still worked out at its own rate)
 *   3. GST on each line, at its rate. Inclusive prices have the tax taken out
 *      of them, exactly as the tax invoices do (lib/admin/gst.ts); exclusive
 *      prices have it added on.
 *   4. delivery, taxed at the goods' rate (the highest, if they differ)
 *   5. the grand total, rounded to the rupee, with the round-off shown
 *
 * Pure and free of server imports: the editor runs it on every keystroke and
 * the PDF runs it again on the saved quote.
 */
import { isInterState, splitInclusive, type TaxSplit } from "@/lib/admin/gst";
import { stateCode } from "@/lib/data/indian-states";
import type { Quote, QuoteInput, QuoteLine } from "./types";

const paise = (n: number): number => Math.round(n * 100) / 100;

/** GST added on top of a taxable value. */
function splitExclusive(taxable: number, ratePercent: number, interState: boolean): TaxSplit {
  const t = paise(taxable);
  const gst = paise((t * ratePercent) / 100);
  const half = paise(gst / 2);
  return {
    gross: paise(t + gst),
    taxable: t,
    gst,
    cgst: interState ? 0 : paise(gst - half),
    sgst: interState ? 0 : half,
    igst: interState ? gst : 0,
    ratePercent,
    interState,
  };
}

/** Delivery is taxed at the rate of the goods it carries; with goods at
 *  several rates, the highest (a mixed supply). 18% with no goods. */
export function deliveryRate(lines: Pick<QuoteLine, "quantity" | "unitPrice" | "gstRate">[]): number {
  const charged = lines.filter((l) => l.quantity > 0 && l.unitPrice > 0 && l.gstRate > 0).map((l) => l.gstRate);
  return charged.length ? Math.max(...charged) : 18;
}

export interface LineCalc {
  id: string;
  /** Quantity × unit price, on the quote's pricing basis. */
  base: number;
  lineDiscount: number;
  /** This line's part of the additional discount. */
  extraShare: number;
  /** What the line comes to after both discounts, on the pricing basis. */
  net: number;
  tax: TaxSplit;
  /** Discount on this line in money the buyer pays, GST included. */
  savedGross: number;
}

export interface QuoteCalc {
  lines: LineCalc[];
  interState: boolean;
  placeOfSupply: string;
  subtotal: number;
  lineDiscounts: number;
  extraDiscount: number;
  delivery: TaxSplit | null;
  /** Goods and delivery together. */
  taxable: number;
  gst: number;
  cgst: number;
  sgst: number;
  igst: number;
  /** Tax grouped by rate, for the summary ("CGST @ 9%"). */
  byRate: { rate: number; taxable: number; gst: number; cgst: number; sgst: number; igst: number }[];
  total: number;
  roundOff: number;
  grandTotal: number;
  /** Everything taken off, GST included. */
  savings: number;
  units: number;
}

type Calculable = Pick<Quote | QuoteInput, "lines" | "client" | "pricesIncludeGst" | "extraDiscount" | "delivery">;

export function calcQuote(q: Calculable): QuoteCalc {
  const inter = isInterState(q.client.state);
  const incl = q.pricesIncludeGst;

  const first = q.lines.map((l) => {
    const base = paise(Math.max(0, l.quantity) * Math.max(0, l.unitPrice));
    const lineDiscount = paise((base * Math.min(100, Math.max(0, l.discountPercent))) / 100);
    return { l, base, lineDiscount, after: paise(base - lineDiscount) };
  });
  const subtotal = paise(first.reduce((t, x) => t + x.base, 0));
  const lineDiscounts = paise(first.reduce((t, x) => t + x.lineDiscount, 0));
  const afterLines = paise(subtotal - lineDiscounts);

  const wanted =
    q.extraDiscount.type === "percent"
      ? (afterLines * Math.min(100, Math.max(0, q.extraDiscount.value))) / 100
      : Math.max(0, q.extraDiscount.value);
  const extraDiscount = paise(Math.min(afterLines, wanted));

  // Shared in proportion to value; the last line with any value takes the
  // stray paise so the shares add up to the discount exactly.
  let left = extraDiscount;
  const lastValued = first.map((x) => x.after > 0).lastIndexOf(true);
  const lines: LineCalc[] = first.map((x, i) => {
    let share = 0;
    if (extraDiscount > 0 && x.after > 0) {
      share = i === lastValued ? left : paise((extraDiscount * x.after) / afterLines);
      left = paise(left - share);
    }
    const net = paise(x.after - share);
    const rate = x.l.gstRate;
    const tax = incl ? splitInclusive(net, rate, inter) : splitExclusive(net, rate, inter);
    const off = paise(x.lineDiscount + share);
    return {
      id: x.l.id,
      base: x.base,
      lineDiscount: x.lineDiscount,
      extraShare: share,
      net,
      tax,
      savedGross: incl ? off : paise(off * (1 + rate / 100)),
    };
  });

  const deliveryAmount = paise(Math.max(0, q.delivery));
  const dRate = deliveryRate(q.lines);
  const delivery = deliveryAmount > 0
    ? incl
      ? splitInclusive(deliveryAmount, dRate, inter)
      : splitExclusive(deliveryAmount, dRate, inter)
    : null;

  const splits = [...lines.map((l) => l.tax), ...(delivery ? [delivery] : [])];
  const sum = (pick: (s: TaxSplit) => number) => paise(splits.reduce((t, s) => t + pick(s), 0));

  const rates = new Map<number, QuoteCalc["byRate"][number]>();
  for (const s of splits) {
    if (s.ratePercent === 0) continue;
    const r = rates.get(s.ratePercent) ?? { rate: s.ratePercent, taxable: 0, gst: 0, cgst: 0, sgst: 0, igst: 0 };
    r.taxable = paise(r.taxable + s.taxable);
    r.gst = paise(r.gst + s.gst);
    r.cgst = paise(r.cgst + s.cgst);
    r.sgst = paise(r.sgst + s.sgst);
    r.igst = paise(r.igst + s.igst);
    rates.set(s.ratePercent, r);
  }

  const total = sum((s) => s.gross);
  const grandTotal = Math.round(total);
  const state = q.client.state.trim();
  const code = state ? stateCode(state) : null;

  return {
    lines,
    interState: inter,
    placeOfSupply: state ? (code ? `${state} (${code})` : state) : "Not set",
    subtotal,
    lineDiscounts,
    extraDiscount,
    delivery,
    taxable: sum((s) => s.taxable),
    gst: sum((s) => s.gst),
    cgst: sum((s) => s.cgst),
    sgst: sum((s) => s.sgst),
    igst: sum((s) => s.igst),
    byRate: [...rates.values()].sort((a, b) => b.rate - a.rate),
    total,
    roundOff: paise(grandTotal - total),
    grandTotal,
    savings: paise(lines.reduce((t, l) => t + l.savedGross, 0)),
    units: q.lines.reduce((t, l) => t + Math.max(0, l.quantity), 0),
  };
}

export const formatINR = (n: number, decimals = 2): string =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
