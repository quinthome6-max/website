import Link from "next/link";
import { requireStaff } from "@/lib/admin/session";
import { listManualInvoices, manualInvoicesAvailable } from "@/lib/admin/invoices/store";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/lib/admin/invoices/types";
import { calcQuote, formatINR } from "@/lib/admin/quotes/calc";
import { Box, btn, Figure, Notice, PageHeader, StatusBadge } from "@/components/admin/ui";
import { IconDownload, IconPlus, IconSearch } from "@/components/admin/icons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const day = (iso: string) => DATE.format(new Date(`${iso}T12:00:00+05:30`));
const BADGE: Record<InvoiceStatus, string> = { draft: "draft", issued: "accepted", cancelled: "declined" };

/**
 * Manual tax invoices: sales made off the website. Website orders are
 * invoiced from Orders & GST; these run in their own MI/ series.
 */
export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; deleted?: string }>;
}) {
  await requireStaff();
  const { status, q, deleted } = await searchParams;

  if (!manualInvoicesAvailable) {
    return (
      <>
        <PageHeader eyebrow="Manual invoices" title="Manual invoices" />
        <Notice title="Manual invoices are not available here" tone="warn">
          They are kept in the shop&rsquo;s Upstash Redis database, which this deployment cannot reach.
        </Notice>
      </>
    );
  }

  const rows = (await listManualInvoices()).map((inv) => ({ inv, calc: calcQuote(inv) }));
  const filter = INVOICE_STATUSES.some((s) => s.value === status) ? (status as InvoiceStatus) : null;
  const term = (q ?? "").trim().toLowerCase();
  const shown = rows.filter(
    ({ inv }) =>
      (!filter || inv.status === filter) &&
      (!term ||
        [inv.number, inv.reference, inv.client.company, inv.client.contactName, inv.client.gstin, inv.client.city]
          .join(" ")
          .toLowerCase()
          .includes(term))
  );

  const issued = rows.filter((r) => r.inv.status === "issued");
  const due = issued.filter((r) => !r.inv.paid);
  const drafts = rows.filter((r) => r.inv.status === "draft");

  const tabs: { value: InvoiceStatus | null; label: string; count: number }[] = [
    { value: null, label: "All", count: rows.length },
    ...INVOICE_STATUSES.map((s) => ({ value: s.value, label: s.label, count: rows.filter((r) => r.inv.status === s.value).length })),
  ];
  const href = (s: InvoiceStatus | null) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (term) p.set("q", term);
    const qs = p.toString();
    return qs ? `/admin/invoices?${qs}` : "/admin/invoices";
  };

  return (
    <>
      <PageHeader
        eyebrow="Manual invoices"
        title="Tax invoices for sales off the website"
        description="For orders taken on WhatsApp, by phone or from a quotation. Website orders are invoiced under Orders & GST; these run in their own series, MI/26-27/0001."
        actions={
          <>
            {issued.length > 0 && (
              <a href="/api/admin/manual-invoices-csv" className={btn.secondary}>
                <IconDownload /> Export for GST
              </a>
            )}
            <Link href="/admin/invoices/new" className={btn.primary}>
              <IconPlus /> New invoice
            </Link>
          </>
        }
      />

      {deleted && <Notice title="Draft deleted" tone="ok" />}

      <div className="mb-6 grid gap-px border border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[color:var(--color-white)] p-5"><Figure label="Issued" value={issued.length} /></div>
        <div className="bg-[color:var(--color-white)] p-5"><Figure label="Invoiced" value={formatINR(issued.reduce((t, r) => t + r.calc.total, 0), 0)} hint="Issued, GST included" /></div>
        <div className="bg-[color:var(--color-white)] p-5"><Figure label="Payment due" value={formatINR(due.reduce((t, r) => t + r.calc.total, 0), 0)} tone={due.length ? "warn" : undefined} hint={`${due.length} invoice${due.length === 1 ? "" : "s"}`} /></div>
        <div className="bg-[color:var(--color-white)] p-5"><Figure label="Drafts" value={drafts.length} hint="Not yet numbered" /></div>
      </div>

      <Box padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--color-rule)] px-4 py-3">
          <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
            {tabs.map((t) => (
              <Link
                key={t.label}
                href={href(t.value)}
                aria-current={filter === t.value ? "page" : undefined}
                className={cn(
                  "px-3 py-1.5 text-[0.66rem] font-medium uppercase tracking-[0.16em] transition-colors",
                  filter === t.value ? "bg-[color:var(--color-verdant)] text-[color:var(--color-ivory)]" : "text-[color:var(--color-charcoal-soft)] hover:bg-[color:var(--color-ivory)] hover:text-[color:var(--color-charcoal)]"
                )}
              >
                {t.label} <span className="ml-1 opacity-60">{t.count}</span>
              </Link>
            ))}
          </nav>
          <form action="/admin/invoices" className="flex items-center gap-2 border border-[color:var(--color-rule)] bg-[color:var(--color-white)] px-3 py-1.5">
            {filter && <input type="hidden" name="status" value={filter} />}
            <IconSearch className="text-[color:var(--color-charcoal-soft)]" />
            <input name="q" defaultValue={q ?? ""} placeholder="Search buyer, number, GSTIN" className="w-52 bg-transparent text-[0.82rem] outline-none placeholder:text-[color:var(--color-charcoal-soft)]/70" />
          </form>
        </div>

        {shown.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[0.9rem] text-[color:var(--color-charcoal-soft)]">{rows.length === 0 ? "No manual invoices yet." : "No invoices match."}</p>
            {rows.length === 0 && (
              <Link href="/admin/invoices/new" className={cn(btn.primary, "mt-4")}><IconPlus /> Make the first one</Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-[100%] min-w-[56rem] border-collapse text-[0.85rem]">
              <thead>
                <tr className="border-b border-[color:var(--color-rule)] text-left">
                  {["Invoice", "Buyer", "Date", "Reference", "Total", "Payment", "Status"].map((h, i) => (
                    <th key={h} className={cn("px-4 py-3 text-[0.58rem] font-medium uppercase tracking-[0.2em] text-[color:var(--color-charcoal-soft)]", i === 4 && "text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map(({ inv, calc }) => (
                  <tr key={inv.id} className={cn("border-b border-[color:var(--color-rule-soft)] hover:bg-[color:var(--color-ivory)]", inv.status === "cancelled" && "text-[color:var(--color-charcoal-soft)]")}>
                    <td className="px-4 py-3 tabular-nums">
                      <Link href={`/admin/invoices/${inv.id}`} className={cn("font-medium underline-offset-4 hover:underline", inv.status === "cancelled" && "line-through")}>
                        {inv.number || "Draft"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{inv.client.company || inv.client.contactName}</span>
                      <span className="block text-[0.74rem] text-[color:var(--color-charcoal-soft)]">
                        {[inv.client.gstin, inv.client.state].filter(Boolean).join(" · ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[color:var(--color-charcoal-soft)]">{day(inv.date)}</td>
                    <td className="px-4 py-3 text-[color:var(--color-charcoal-soft)]">{inv.reference || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatINR(calc.total)}</td>
                    <td className={cn("px-4 py-3 whitespace-nowrap", !inv.paid && inv.status === "issued" && "text-[color:var(--color-clay-text)]")}>
                      {inv.paid ? inv.paymentMode : "Due"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={BADGE[inv.status]} label={INVOICE_STATUSES.find((s) => s.value === inv.status)?.label} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Box>
    </>
  );
}
