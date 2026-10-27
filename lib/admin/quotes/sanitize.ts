/**
 * Turns whatever the editor posted into a QuoteInput the store can keep.
 *
 * A server action is reachable by a direct POST, so nothing here trusts the
 * shape it is given: strings are trimmed and capped, numbers clamped to sane
 * ranges, and unknown values replaced by defaults rather than stored.
 */
import { GST_RATES, QUOTE_STATUSES, type QuoteInput, type QuoteLine, type QuoteStatus } from "./types";

const MAX_LINES = 150;

const str = (v: unknown, max = 200): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, min: number, max: number, fallback = 0): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const date = (v: unknown, fallback: string): string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

function line(v: unknown, i: number): QuoteLine | null {
  const l = obj(v);
  const title = str(l.title, 160);
  if (!title) return null;
  const rate = num(l.gstRate, 0, 28, 18);
  const image = str(l.image, 300);
  return {
    id: str(l.id, 40) || `line-${i}`,
    productSlug: str(l.productSlug, 80) || undefined,
    title,
    variant: str(l.variant, 80) || undefined,
    description: str(l.description, 300) || undefined,
    // Only the shop's own photos: the PDF fetches whatever this points at.
    image: image.startsWith("/images/") ? image : undefined,
    hsn: str(l.hsn, 12).replace(/[^0-9]/g, ""),
    gstRate: (GST_RATES as readonly number[]).includes(rate) ? rate : 18,
    quantity: Math.round(num(l.quantity, 0, 1_000_000, 1)),
    unitPrice: Math.round(num(l.unitPrice, 0, 100_000_000) * 100) / 100,
    discountPercent: Math.round(num(l.discountPercent, 0, 100) * 100) / 100,
    needsTaxCheck: l.needsTaxCheck === true || undefined,
  };
}

export function sanitizeQuoteInput(raw: unknown, today: string): QuoteInput {
  const q = obj(raw);
  const c = obj(q.client);
  const d = obj(q.extraDiscount);
  const status = (QUOTE_STATUSES.map((s) => s.value) as string[]).includes(q.status as string)
    ? (q.status as QuoteStatus)
    : "draft";
  const lines = (Array.isArray(q.lines) ? q.lines : [])
    .slice(0, MAX_LINES)
    .map(line)
    .filter((l): l is QuoteLine => l !== null);

  return {
    id: /^[a-z0-9]{6,32}$/.test(String(q.id ?? "")) ? String(q.id) : undefined,
    status,
    date: date(q.date, today),
    validUntil: date(q.validUntil, today),
    client: {
      company: str(c.company, 160),
      contactName: str(c.contactName, 120),
      email: str(c.email, 160),
      phone: str(c.phone, 40),
      gstin: str(c.gstin, 15).toUpperCase(),
      address: str(c.address, 600),
      city: str(c.city, 80),
      state: str(c.state, 80),
      pin: str(c.pin, 10).replace(/[^0-9]/g, ""),
    },
    deliverTo: str(q.deliverTo, 600),
    pricesIncludeGst: q.pricesIncludeGst !== false,
    lines,
    extraDiscount: {
      type: d.type === "amount" ? "amount" : "percent",
      value: d.type === "amount" ? num(d.value, 0, 100_000_000) : num(d.value, 0, 100),
    },
    delivery: num(q.delivery, 0, 10_000_000),
    message: str(q.message, 2000),
    terms: str(q.terms, 4000),
  };
}
