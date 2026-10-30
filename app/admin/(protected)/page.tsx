import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentViewer } from "@/lib/admin/session";
import { adminConfigured, listInvoices } from "@/lib/admin/orders";
import { listQuotes, quotesAvailable } from "@/lib/admin/quotes/store";
import { calcQuote, formatINR } from "@/lib/admin/quotes/calc";
import { QUOTE_STATUSES } from "@/lib/admin/quotes/types";
import { listCheckouts } from "@/lib/abandoned/store";
import { reviewsForAdmin } from "@/lib/reviews/store";
import { joinedThisWeek, listSubscribers, newsletterAvailable } from "@/lib/newsletter/store";
import { listManualInvoices, manualInvoicesAvailable } from "@/lib/admin/invoices/store";
import { Box, btn, Figure, PageHeader, StatusBadge, Tile } from "@/components/admin/ui";
import {
  IconCard,
  IconCart,
  IconGift,
  IconInvoice,
  IconMail,
  IconPlus,
  IconQuote,
  IconReceipt,
  IconStar,
} from "@/components/admin/icons";

export const dynamic = "force-dynamic";

const rupees = (n: number) => formatINR(n, 0);
const DAY = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** The back office's front page: one box per section, with its live numbers. */
export default async function Dashboard() {
  const viewer = await currentViewer();
  if (!viewer) redirect("/admin/login");
  if (viewer.role !== "staff") redirect("/admin/abandoned");

  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <>
      <PageHeader
        eyebrow={today}
        title={`${greeting()}.`}
        description="Everything in the back office, one box per section. Open a box to work in it."
        actions={
          <>
            <Link href="/admin/quotes/new" className={btn.primary}>
              <IconPlus /> New quotation
            </Link>
            <Link href="/admin/invoices/new" className={btn.primary}>
              <IconPlus /> New invoice
            </Link>
            <Link href="/admin/orders" className={btn.secondary}>
              View orders
            </Link>
          </>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Tile href="/admin/orders" icon={<IconReceipt />} title="Orders & GST" blurb="Paid orders, their GST split and tax invoices." cta="Open orders">
          <Suspense fallback={<Loading n={2} />}><OrderFigures /></Suspense>
        </Tile>
        <Tile href="/admin/quotes" icon={<IconQuote />} title="Quotations" blurb="Bulk and business quotes, saved and sent as PDFs." cta="Open quotations">
          <Suspense fallback={<Loading n={2} />}><QuoteFigures /></Suspense>
        </Tile>
        <Tile href="/admin/invoices" icon={<IconInvoice />} title="Manual invoices" blurb="Tax invoices for sales off the website, in their own MI/ series." cta="Open invoices">
          <Suspense fallback={<Loading n={2} />}><ManualInvoiceFigures /></Suspense>
        </Tile>
        <Tile href="/admin/abandoned" icon={<IconCart />} title="Abandoned checkouts" blurb="Shoppers who reached checkout and did not pay." cta="Follow up">
          <Suspense fallback={<Loading n={2} />}><AbandonedFigures /></Suspense>
        </Tile>
        <Tile href="/admin/reviews" icon={<IconStar />} title="Reviews" blurb="Approve customer reviews before they go live." cta="Moderate">
          <Suspense fallback={<Loading n={2} />}><ReviewFigures /></Suspense>
        </Tile>
        <Tile href="/admin/subscribers" icon={<IconMail />} title="Subscribers" blurb="Who signed up for emails, and where. Export for Shopify Email." cta="Open subscribers">
          <Suspense fallback={<Loading n={2} />}><SubscriberFigures /></Suspense>
        </Tile>
        <Tile href="/admin/payments" icon={<IconCard />} title="Payments" blurb="Look up a PayU payment and recover an order for it." cta="Open payments" />
        <Tile href="/admin/gift-stock" icon={<IconGift />} title="Gift stock" blurb="Stock of the complimentary 50 ml oils sent with diffusers." cta="Open gift stock" />
      </div>

      <Box
        className="mt-8"
        title="Recent quotations"
        padded={false}
        action={<Link href="/admin/quotes" className={btn.quiet}>All quotations →</Link>}
      >
        <Suspense fallback={<p className="px-5 py-6 text-[0.8rem] text-[color:var(--color-charcoal-soft)]">Loading…</p>}>
          <RecentQuotes />
        </Suspense>
      </Box>
    </>
  );
}

function Loading({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="w-24">
          <div className="h-2.5 w-16 animate-pulse bg-[color:var(--color-rule)]" />
          <div className="mt-2.5 h-6 w-20 animate-pulse bg-[color:var(--color-rule-soft)]" />
        </div>
      ))}
    </>
  );
}

const Unavailable = ({ what }: { what: string }) => (
  <p className="text-[0.76rem] text-[color:var(--color-charcoal-soft)]">Could not load {what} just now.</p>
);

/** Runs a loader, turning a failure into null so the box can say so. */
async function attempt<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch {
    return null;
  }
}

async function OrderFigures() {
  if (!adminConfigured) return <Unavailable what="orders (Shopify Admin is not connected)" />;
  const invoices = await attempt(() => listInvoices(100));
  if (!invoices) return <Unavailable what="orders" />;
  const collected = invoices.reduce((t, i) => t + i.totals.gross, 0);
  const latest = invoices[0];
  return (
    <>
      <Figure label="Paid orders" value={invoices.length} hint={latest ? `Latest ${DAY.format(new Date(latest.createdAt))}` : undefined} />
      <Figure label="Collected" value={rupees(collected)} />
    </>
  );
}

async function QuoteFigures() {
  if (!quotesAvailable) return <Unavailable what="quotations" />;
  const quotes = await attempt(listQuotes);
  if (!quotes) return <Unavailable what="quotations" />;
  const open = quotes.filter((q) => q.status === "draft" || q.status === "sent");
  const openValue = open.reduce((t, q) => t + calcQuote(q).grandTotal, 0);
  const won = quotes.filter((q) => q.status === "accepted").reduce((t, q) => t + calcQuote(q).grandTotal, 0);
  return (
    <>
      <Figure label="Open" value={open.length} hint={rupees(openValue)} />
      <Figure label="Accepted" value={rupees(won)} />
    </>
  );
}

async function AbandonedFigures() {
  const rows = await attempt(() => listCheckouts(100));
  if (!rows) return <Unavailable what="abandoned checkouts" />;
  const todo = rows.filter((r) => !r.recovered && !r.contacted && !r.paidAs);
  return (
    <>
      <Figure label="To follow up" value={todo.length} tone={todo.length ? "warn" : undefined} hint={todo.length ? rupees(todo.reduce((t, r) => t + r.total, 0)) : "All caught up"} />
      <Figure label="Recovered" value={rows.filter((r) => r.recovered || r.paidAs).length} />
    </>
  );
}

async function ReviewFigures() {
  const reviews = await attempt(reviewsForAdmin);
  if (!reviews) return <Unavailable what="reviews" />;
  return (
    <>
      <Figure label="Waiting" value={reviews.pending.length} tone={reviews.pending.length ? "warn" : undefined} />
      <Figure label="Live" value={reviews.approved.length} />
    </>
  );
}

async function ManualInvoiceFigures() {
  if (!manualInvoicesAvailable) return <Unavailable what="invoices (Redis is not connected)" />;
  const all = await attempt(listManualInvoices);
  if (!all) return <Unavailable what="invoices" />;
  const issued = all.filter((i) => i.status === "issued");
  const due = issued.filter((i) => !i.paid);
  return (
    <>
      <Figure label="Issued" value={issued.length} hint={rupees(issued.reduce((t, i) => t + calcQuote(i).total, 0))} />
      <Figure label="Payment due" value={due.length} tone={due.length ? "warn" : undefined} />
    </>
  );
}

async function SubscriberFigures() {
  if (!newsletterAvailable) return <Unavailable what="subscribers (Redis is not connected)" />;
  const subs = await attempt(listSubscribers);
  if (!subs) return <Unavailable what="subscribers" />;
  const active = subs.filter((s) => s.status === "subscribed");
  return (
    <>
      <Figure label="Subscribed" value={active.length} />
      <Figure label="This week" value={joinedThisWeek(subs)} />
    </>
  );
}

async function RecentQuotes() {
  if (!quotesAvailable) return <p className="px-5 py-6 text-[0.8rem]">Quotations need the shop&rsquo;s Redis database.</p>;
  const all = await attempt(listQuotes);
  if (!all) return <p className="px-5 py-6 text-[0.8rem] text-[color:var(--color-charcoal-soft)]">Could not load quotations just now.</p>;
  const quotes = all.slice(0, 6);
  if (quotes.length === 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-6">
        <p className="text-[0.85rem] text-[color:var(--color-charcoal-soft)]">No quotations yet. Make the first one for a business enquiry.</p>
        <Link href="/admin/quotes/new" className={btn.secondary}><IconPlus /> New quotation</Link>
      </div>
    );
  }
  const label = (s: string) => QUOTE_STATUSES.find((x) => x.value === s)?.label ?? s;
  return (
    <ul className="divide-y divide-[color:var(--color-rule-soft)]">
      {quotes.map((q) => (
        <li key={q.id}>
          <Link href={`/admin/quotes/${q.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 px-5 py-3.5 transition-colors hover:bg-[color:var(--color-ivory)] sm:grid-cols-[9rem_1fr_auto_6rem]">
            <span className="text-[0.78rem] tabular-nums text-[color:var(--color-charcoal-soft)]">{q.number}</span>
            <span className="truncate text-[0.9rem]">{q.client.company || q.client.contactName}</span>
            <span className="tabular-nums text-[0.9rem]">{rupees(calcQuote(q).grandTotal)}</span>
            <span className="justify-self-end"><StatusBadge status={q.status} label={label(q.status)} /></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
