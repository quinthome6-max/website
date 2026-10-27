/**
 * Quotations for bulk and business orders, built in /admin/quotes.
 *
 * A quote is plain data: who it is for, the lines, and the commercial terms.
 * Every amount on it is derived by calc.ts, so the editor, the PDF and the
 * list page can never disagree about a total.
 */

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";

export const QUOTE_STATUSES: { value: QuoteStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

/** GST slabs offered on a line. */
export const GST_RATES = [0, 5, 12, 18, 28] as const;

export interface QuoteLine {
  /** Stable key for the editor; not shown. */
  id: string;
  /** Catalogue slug, when picked from the range. Custom lines have none. */
  productSlug?: string;
  title: string;
  /** Finish or size, e.g. "Gold". */
  variant?: string;
  /** One short line under the title. */
  description?: string;
  /** /images/… path of the product photo. */
  image?: string;
  hsn: string;
  gstRate: number;
  quantity: number;
  /** Per unit, on the quote's pricing basis (pricesIncludeGst). */
  unitPrice: number;
  discountPercent: number;
  /** True for products whose HSN or GST rate has not been confirmed. */
  needsTaxCheck?: boolean;
}

export interface QuoteClient {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
  city: string;
  /** Place of supply: decides CGST + SGST or IGST. */
  state: string;
  pin: string;
}

export interface Quote {
  id: string;
  /** e.g. QT/26-27/0007, assigned on first save. */
  number: string;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** YYYY-MM-DD */
  date: string;
  validUntil: string;
  client: QuoteClient;
  /** Delivery address, when it differs from the client's. */
  deliverTo: string;
  /** Whether unit prices and the delivery charge include GST. */
  pricesIncludeGst: boolean;
  lines: QuoteLine[];
  extraDiscount: { type: "percent" | "amount"; value: number };
  /** Delivery charge, on the same pricing basis as the lines. */
  delivery: number;
  /** A short message to the client, printed above the items. */
  message: string;
  /** One term per line. */
  terms: string;
}

/** What the editor sends to be saved. Server-owned fields are filled there. */
export type QuoteInput = Omit<Quote, "id" | "number" | "createdAt" | "updatedAt" | "createdBy"> & {
  id?: string;
};

export const DEFAULT_TERMS = [
  "This quotation is valid until the date shown above.",
  "Orders are dispatched from Mumbai once confirmed; the delivery timeline is confirmed with the order.",
  "Payment terms as agreed in writing before dispatch.",
  "Diffusers carry a 1-year limited warranty. Fragrance oils are IFRA-compliant and made for Quint Home waterless diffusers.",
  "Damaged or defective items are exchanged as set out at quinthome.in/shipping.",
].join("\n");

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function emptyQuote(): QuoteInput {
  const today = new Date();
  const valid = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
  return {
    status: "draft",
    date: iso(today),
    validUntil: iso(valid),
    client: { company: "", contactName: "", email: "", phone: "", gstin: "", address: "", city: "", state: "", pin: "" },
    deliverTo: "",
    pricesIncludeGst: true,
    lines: [],
    extraDiscount: { type: "percent", value: 0 },
    delivery: 0,
    message: "",
    terms: DEFAULT_TERMS,
  };
}

/** Indian financial year label for a date: Oct 2026 → "26-27". */
export function financialYear(date: Date): string {
  const y = date.getFullYear();
  const start = date.getMonth() >= 3 ? y : y - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}
