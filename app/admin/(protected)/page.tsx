import Link from "next/link";
import { requireStaff } from "@/lib/admin/session";
import { listInvoices, adminConfigured } from "@/lib/admin/orders";
import { supplierGaps } from "@/lib/admin/supplier";

export const dynamic = "force-dynamic";

const money = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
});

/** Orders with their GST, newest first — the "all info in one place" view. */
export default async function AdminHome() {
  await requireStaff();
  const gaps = supplierGaps();

  if (!adminConfigured) {
    return (
      <Note title="Shopify Admin API not configured">
        Set <code>SHOPIFY_ADMIN_TOKEN</code> in Vercel, then redeploy. Visit{" "}
        <code>/api/shopify/install</code> to mint one.
      </Note>
    );
  }

  let invoices;
  try {
    invoices = await listInvoices(100);
  } catch (e) {
    return (
      <Note title="Could not read orders from Shopify">
        {e instanceof Error ? e.message : String(e)}
      </Note>
    );
  }

  // Totals across everything shown, so the figure to reconcile against is on
  // screen rather than something to add up by hand.
  const t = invoices.reduce(
    (a, i) => ({
      taxable: a.taxable + i.totals.taxable,
      cgst: a.cgst + i.totals.cgst,
      sgst: a.sgst + i.totals.sgst,
      igst: a.igst + i.totals.igst,
      gross: a.gross + i.totals.gross,
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, gross: 0 }
  );
  const attention = invoices.filter((i) => i.needsAttention.length > 0);

  return (
    <>
      {gaps.length > 0 && (
        <Note title="Supplier details incomplete">
          Missing: {gaps.join(", ")}. Invoices will render, but should not be
          issued until this is filled in (<code>lib/admin/supplier.ts</code>).
        </Note>
      )}
      {attention.length > 0 && (
        <Note title={`${attention.length} order${attention.length > 1 ? "s" : ""} need attention`}>
          A line could not be classified to an HSN code:{" "}
          {attention.map((i) => i.orderName).join(", ")}.
        </Note>
      )}

      <div className="grid gap-px overflow-hidden border border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Paid orders" value={String(invoices.length)} />
        <Stat label="Taxable value" value={money(t.taxable)} />
        <Stat label="CGST" value={money(t.cgst)} />
        <Stat label="SGST" value={money(t.sgst)} />
        <Stat label={t.igst > 0 ? "IGST" : "Total collected"} value={money(t.igst > 0 ? t.igst : t.gross)} />
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-[100%] min-w-[52rem] border-collapse text-[0.85rem]">
          <thead>
            <tr className="border-b border-[color:var(--color-charcoal)] text-left">
              {["Invoice", "Date", "Customer", "Place of supply", "Taxable", "GST", "Total", ""].map(
                (h, i) => (
                  <th
                    key={h || i}
                    className={`py-3 pr-4 text-[0.58rem] uppercase tracking-[0.22em] text-[color:var(--color-charcoal-soft)] ${
                      i >= 4 && i <= 6 ? "text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.orderName} className="border-b border-[color:var(--color-rule)]">
                <td className="py-3 pr-4 tabular-nums">
                  {i.invoiceNumber}
                  {i.needsAttention.length > 0 && (
                    <span className="ml-2 rounded-full bg-[color:var(--color-clay)] px-2 py-0.5 text-[0.52rem] uppercase tracking-[0.18em] text-[color:var(--color-ivory)]">
                      check
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 whitespace-nowrap text-[color:var(--color-charcoal-soft)]">
                  {DATE.format(new Date(i.createdAt))}
                </td>
                <td className="py-3 pr-4">
                  {i.customer.name}
                  {i.customer.gstin && (
                    <span className="ml-2 text-[0.62rem] uppercase tracking-[0.14em] text-[color:var(--color-charcoal-soft)]">
                      B2B
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-[color:var(--color-charcoal-soft)]">
                  {i.placeOfSupply}
                  <span className="ml-2 text-[0.62rem] uppercase tracking-[0.14em]">
                    {i.interState ? "IGST" : "CGST+SGST"}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">{money(i.totals.taxable)}</td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {money(i.totals.cgst + i.totals.sgst + i.totals.igst)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums font-medium">
                  {money(i.totals.gross)}
                </td>
                <td className="py-3 text-right whitespace-nowrap">
                  <Link
                    href={`/admin/invoice/${i.orderNumber}`}
                    className="text-[0.62rem] uppercase tracking-[0.22em] underline-offset-4 hover:text-[color:var(--color-clay)] hover:underline"
                  >
                    Invoice →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invoices.length === 0 && (
        <p className="mt-8 text-[0.85rem] text-[color:var(--color-charcoal-soft)]">
          No paid orders yet.
        </p>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[color:var(--color-white)] p-5">
      <p className="text-[0.56rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)]">
        {label}
      </p>
      <p className="mt-2 tabular-nums" style={{ fontFamily: "var(--font-serif)", fontSize: "1.35rem" }}>
        {value}
      </p>
    </div>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 border-l-2 border-[color:var(--color-clay)] bg-[color:var(--color-stardust-soft)] p-4">
      <p className="text-[0.8rem] font-medium">{title}</p>
      <p className="mt-1 text-[0.78rem] leading-[1.6] text-[color:var(--color-charcoal-soft)]">
        {children}
      </p>
    </div>
  );
}
