import Link from "next/link";
import { requireStaff } from "@/lib/admin/session";
import { listQuotes, quotesAvailable } from "@/lib/admin/quotes/store";
import { calcQuote, formatINR } from "@/lib/admin/quotes/calc";
import { QUOTE_STATUSES, type QuoteStatus } from "@/lib/admin/quotes/types";
import { Box, btn, Figure, Notice, PageHeader } from "@/components/admin/ui";
import { IconDownload, IconPlus, IconSearch } from "@/components/admin/icons";
import { cn } from "@/lib/utils";
import { QuoteStatusSelect } from "@/components/admin/quote-status-select";

export const dynamic = "force-dynamic";

const rupees = (n: number) => formatINR(n, 0);
const DATE = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const day = (iso: string) => DATE.format(new Date(`${iso}T12:00:00+05:30`));

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; deleted?: string }>;
}) {
  await requireStaff();
  const { status, q, deleted } = await searchParams;

  if (!quotesAvailable) {
    return (
      <>
        <PageHeader eyebrow="Quotations" title="Quotations" />
        <Notice title="Quotations are not available here" tone="warn">
          They are kept in the shop&rsquo;s Upstash Redis database, which this deployment cannot reach.
        </Notice>
      </>
    );
  }

  const all = await listQuotes();
  const rows = all.map((quote) => ({ quote, calc: calcQuote(quote) }));
  const today = new Date().toISOString().slice(0, 10);

  const filter = QUOTE_STATUSES.some((s) => s.value === status) ? (status as QuoteStatus) : null;
  const term = (q ?? "").trim().toLowerCase();
  const shown = rows.filter(
    ({ quote }) =>
      (!filter || quote.status === filter) &&
      (!term ||
        [quote.number, quote.client.company, quote.client.contactName, quote.client.email, quote.client.city]
          .join(" ")
          .toLowerCase()
          .includes(term))
  );

  const open = rows.filter((r) => r.quote.status === "draft" || r.quote.status === "sent");
  const accepted = rows.filter((r) => r.quote.status === "accepted");
  const decided = rows.filter((r) => r.quote.status === "accepted" || r.quote.status === "declined").length;

  const tabs: { value: QuoteStatus | null; label: string; count: number }[] = [
    { value: null, label: "All", count: rows.length },
    ...QUOTE_STATUSES.map((s) => ({ value: s.value, label: s.label, count: rows.filter((r) => r.quote.status === s.value).length })),
  ];
  const href = (s: QuoteStatus | null) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (term) p.set("q", term);
    const qs = p.toString();
    return qs ? `/admin/quotes?${qs}` : "/admin/quotes";
  };

  return (
    <>
      <PageHeader
        eyebrow="Quotations"
        title="Bulk & business quotes"
        description="Build a quote from the range or custom lines, set discounts and delivery, and send it as a PDF."
        actions={
          <Link href="/admin/quotes/new" className={btn.primary}>
            <IconPlus /> New quotation
          </Link>
        }
      />

      {deleted && <Notice title="Quotation deleted" tone="ok" />}

      <div className="mb-6 grid gap-px border border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[color:var(--color-white)] p-5"><Figure label="Open quotes" value={open.length} hint="Draft or sent" /></div>
        <div className="bg-[color:var(--color-white)] p-5"><Figure label="Open value" value={rupees(open.reduce((t, r) => t + r.calc.grandTotal, 0))} /></div>
        <div className="bg-[color:var(--color-white)] p-5"><Figure label="Accepted" value={rupees(accepted.reduce((t, r) => t + r.calc.grandTotal, 0))} hint={`${accepted.length} quote${accepted.length === 1 ? "" : "s"}`} /></div>
        <div className="bg-[color:var(--color-white)] p-5"><Figure label="Win rate" value={decided ? `${Math.round((accepted.length / decided) * 100)}%` : "—"} hint="Of accepted + declined" /></div>
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
          <form action="/admin/quotes" className="flex items-center gap-2 border border-[color:var(--color-rule)] bg-[color:var(--color-white)] px-3 py-1.5">
            {filter && <input type="hidden" name="status" value={filter} />}
            <IconSearch className="text-[color:var(--color-charcoal-soft)]" />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search client or number"
              className="w-52 bg-transparent text-[0.82rem] outline-none placeholder:text-[color:var(--color-charcoal-soft)]/70"
            />
          </form>
        </div>

        {shown.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[0.9rem] text-[color:var(--color-charcoal-soft)]">
              {rows.length === 0 ? "No quotations yet." : "No quotations match."}
            </p>
            {rows.length === 0 && (
              <Link href="/admin/quotes/new" className={cn(btn.primary, "mt-4")}><IconPlus /> Make the first one</Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-[100%] min-w-[56rem] border-collapse text-[0.85rem]">
              <thead>
                <tr className="border-b border-[color:var(--color-rule)] text-left">
                  {["Quotation", "Client", "Date", "Valid until", "Items", "Total", "Status", ""].map((h, i) => (
                    <th key={h || i} className={cn("px-4 py-3 text-[0.58rem] font-medium uppercase tracking-[0.2em] text-[color:var(--color-charcoal-soft)]", (i === 4 || i === 5) && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map(({ quote, calc }) => {
                  const expired = quote.validUntil < today && (quote.status === "draft" || quote.status === "sent");
                  return (
                    <tr key={quote.id} className="border-b border-[color:var(--color-rule-soft)] hover:bg-[color:var(--color-ivory)]">
                      <td className="px-4 py-3 tabular-nums">
                        <Link href={`/admin/quotes/${quote.id}`} className="font-medium underline-offset-4 hover:underline">{quote.number}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block">{quote.client.company || quote.client.contactName}</span>
                        <span className="block text-[0.74rem] text-[color:var(--color-charcoal-soft)]">
                          {[quote.client.company ? quote.client.contactName : "", quote.client.city].filter(Boolean).join(" · ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[color:var(--color-charcoal-soft)]">{day(quote.date)}</td>
                      <td className={cn("px-4 py-3 whitespace-nowrap", expired ? "text-[color:var(--color-clay-text)]" : "text-[color:var(--color-charcoal-soft)]")}>
                        {day(quote.validUntil)}{expired && " · expired"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{calc.units.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{rupees(calc.grandTotal)}</td>
                      <td className="px-4 py-3">
                        <QuoteStatusSelect key={quote.status} id={quote.id} status={quote.status} label={`Status of ${quote.number}`} />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <a href={`/api/admin/quote-pdf?id=${quote.id}`} className={btn.quiet} title="Download PDF">
                          <IconDownload /> PDF
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Box>
    </>
  );
}
