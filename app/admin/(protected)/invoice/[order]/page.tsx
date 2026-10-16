import Link from "next/link";
import { requireStaff } from "@/lib/admin/session";
import { notFound } from "next/navigation";
import { getInvoice } from "@/lib/admin/orders";
import { invoiceHtml } from "@/lib/admin/invoice-html";

export const dynamic = "force-dynamic";

/**
 * One invoice, shown in an iframe so the printable document is byte-identical
 * to what /api/admin/invoice/[order] serves and what a PDF is made from — the
 * page you check is the page the customer gets.
 */
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ order: string }>;
}) {
  await requireStaff();
  const { order } = await params;
  const orderNumber = Number(order);
  if (!Number.isInteger(orderNumber) || orderNumber <= 0) notFound();

  const invoice = await getInvoice(orderNumber);
  if (!invoice) notFound();

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)] underline-offset-4 hover:underline"
          >
            ← All orders
          </Link>
          <h1 className="mt-2" style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem" }}>
            Invoice {invoice.invoiceNumber}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Opens in a new tab and calls print() on load, so the PDF is two
              clicks away rather than hidden in a browser menu. */}
          <a
            href={`/api/admin/invoice/${orderNumber}?print=1`}
            target="_blank"
            rel="noreferrer"
            className="bg-[color:var(--color-charcoal)] px-6 py-3 text-[0.68rem] uppercase tracking-[0.28em] text-[color:var(--color-ivory)] transition-colors hover:bg-[color:var(--color-clay-deep)]"
          >
            Print / Save as PDF
          </a>
          {/* Saves the document itself, for anyone who wants the file rather
              than a printout. */}
          <a
            href={`/api/admin/invoice/${orderNumber}?download=1`}
            className="border border-[color:var(--color-charcoal)] px-6 py-3 text-[0.68rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal)] transition-colors hover:bg-[color:var(--color-charcoal)] hover:text-[color:var(--color-ivory)]"
          >
            Download
          </a>
        </div>
      </div>

      <iframe
        title={`Invoice ${invoice.invoiceNumber}`}
        srcDoc={invoiceHtml(invoice)}
        className="h-[80vh] w-[100%] border border-[color:var(--color-rule)] bg-white"
      />
    </>
  );
}
