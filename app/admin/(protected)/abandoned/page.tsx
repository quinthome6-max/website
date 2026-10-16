import Link from "next/link";
import { SITE } from "@/lib/seo";
import { currentViewer } from "@/lib/admin/session";
import {
  abandonedStoreConfigured,
  listCheckouts,
  type AbandonedCheckout,
} from "@/lib/abandoned/store";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

type View = "todo" | "contacted" | "recovered" | "all";
type Range = "7" | "30" | "all";

interface Query {
  view?: string;
  range?: string;
  done?: string;
}

const VIEWS: { key: View; label: string }[] = [
  { key: "todo", label: "To follow up" },
  { key: "contacted", label: "Contacted" },
  { key: "recovered", label: "Recovered" },
  { key: "all", label: "All" },
];

const RANGES: { key: Range; label: string }[] = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "all", label: "All time" },
];

/** Activity more recent than this may be someone still at the form. */
const IN_PROGRESS_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Request time. This page is dynamic, so every render is a fresh request. */
const requestTime = (): number => Date.now();

function href(view: View, range: Range): string {
  const p = new URLSearchParams();
  if (view !== "todo") p.set("view", view);
  if (range !== "30") p.set("range", range);
  const s = p.toString();
  return `/admin/abandoned${s ? `?${s}` : ""}`;
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const IST = "Asia/Kolkata";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

/** "2026-10-17" in India time, for grouping by day. */
const dayKey = (ms: number) =>
  new Date(ms).toLocaleDateString("en-CA", { timeZone: IST });

const dayLabel = (ms: number) =>
  new Date(ms).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" });

function ago(iso: string, now: number): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/* -------------------------------------------------------------------------- */
/* Follow-up message                                                          */
/* -------------------------------------------------------------------------- */

function restoreUrl(r: AbandonedCheckout): string | null {
  return r.restoreToken
    ? `${SITE}/api/cart/restore?t=${encodeURIComponent(r.restoreToken)}`
    : null;
}

function message(r: AbandonedCheckout): string {
  const first = r.customerName.split(" ")[0];
  const bag = r.items.map((i) => (i.quantity > 1 ? `${i.title} × ${i.quantity}` : i.title)).join(", ");
  const link = restoreUrl(r);
  return (
    `Hi${first ? ` ${first}` : ""}, this is Quint Home. ` +
    `We noticed you didn't finish your order${bag ? ` (${bag})` : ""}. ` +
    (link
      ? `Your bag is saved here, ready to complete: ${link} `
      : `Your bag is still waiting at ${SITE}/cart. `) +
    `Happy to help with any questions.`
  );
}

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

type Status = "form" | "payment" | "contacted" | "recovered" | "paid";

function statusOf(r: AbandonedCheckout): Status {
  if (r.paidAs) return "paid";
  if (r.recovered) return "recovered";
  if (r.contacted) return "contacted";
  return r.stage;
}

const STATUS: Record<Status, { label: string; hint: string; cls: string }> = {
  form: { label: "Left at form", hint: "Never pressed Pay", cls: "bg-[#f8e8d6] text-[#8a4a12]" },
  payment: { label: "Left at payment", hint: "Reached PayU, didn't pay", cls: "bg-[#f6dfd6] text-[#8f2f16]" },
  contacted: { label: "Contacted", hint: "Waiting for a reply", cls: "bg-[#e3ebe9] text-[#3f5754]" },
  recovered: { label: "Recovered", hint: "Paid after follow-up", cls: "bg-[#e2ece0] text-[#3d6340]" },
  paid: { label: "Paid", hint: "Has an order", cls: "bg-[#e2ece0] text-[#3d6340]" },
};

const DONE: Record<string, string> = {
  contacted: "Marked as contacted.",
  dismiss: "Removed from the list.",
  failed: "That didn't work — the store couldn't be reached. Try again.",
  invalid: "That request wasn't understood.",
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function AbandonedPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;
  const staff = (await currentViewer())?.role === "staff";
  const view: View = (VIEWS.find((v) => v.key === q.view)?.key ?? "todo") as View;
  const range: Range = (RANGES.find((r) => r.key === q.range)?.key ?? "30") as Range;
  const now = requestTime();

  let all: AbandonedCheckout[] = [];
  let problem: "config" | "error" | null = abandonedStoreConfigured ? null : "config";
  let detail = "";
  if (!problem) {
    try {
      all = await listCheckouts(300);
    } catch (e) {
      problem = "error";
      detail = e instanceof Error ? e.message : String(e);
    }
  }

  // Everything below is within the chosen time range.
  const since = range === "all" ? 0 : now - Number(range) * DAY_MS;
  const rows = all.filter((r) => Date.parse(r.updatedAt) >= since);

  const notPaid = rows.filter((r) => !r.recovered && !r.paidAs);
  const todo = notPaid.filter((r) => !r.contacted);
  const contacted = notPaid.filter((r) => r.contacted);
  const recovered = rows.filter((r) => r.recovered);
  const sum = (list: AbandonedCheckout[]) => list.reduce((t, r) => t + r.total, 0);
  const followedUp = contacted.length + recovered.length;
  const recoveryRate = followedUp ? Math.round((recovered.length / followedUp) * 100) : null;

  const lists: Record<View, AbandonedCheckout[]> = {
    todo,
    contacted,
    recovered,
    all: rows,
  };
  const shown = lists[view];

  // Daily trend: checkouts abandoned each day (by when they started),
  // including ones later recovered.
  const days = range === "7" ? 7 : 14;
  const trend = Array.from({ length: days }, (_, i) => {
    const ms = now - (days - 1 - i) * DAY_MS;
    const key = dayKey(ms);
    const onDay = all.filter((r) => !r.paidAs && dayKey(Date.parse(r.createdAt)) === key);
    return { key, label: dayLabel(ms), count: onDay.length, value: sum(onDay) };
  });
  const peak = Math.max(1, ...trend.map((d) => d.count));

  const rangeLabel = RANGES.find((r) => r.key === range)!.label.toLowerCase();

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.9rem", lineHeight: 1.1 }}>
            Abandoned checkouts
          </h1>
          <p className="mt-2 text-[0.85rem] text-[color:var(--color-charcoal-soft)]">
            People who started checkout but didn&rsquo;t pay. Message them, then mark them contacted.
          </p>
        </div>
        <nav aria-label="Time range" className="flex rounded-full border border-[color:var(--color-rule)] p-0.5 text-[0.72rem]">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={href(view, r.key)}
              aria-current={range === r.key ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 transition-colors ${
                range === r.key
                  ? "bg-[color:var(--color-charcoal)] text-[color:var(--color-ivory)]"
                  : "text-[color:var(--color-charcoal-soft)] hover:text-[color:var(--color-charcoal)]"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      {q.done && DONE[q.done] && (
        <p role="status" className="mt-6 rounded-md border border-[color:var(--color-rule)] bg-[color:var(--color-stardust-soft)] px-4 py-3 text-[0.82rem]">
          {DONE[q.done]}
        </p>
      )}

      {problem && (
        <div role="alert" className="mt-8 max-w-[48rem] rounded-md border border-[color:var(--color-rule)] bg-[color:var(--color-stardust-soft)] p-5 text-[0.85rem] leading-[1.65]">
          {problem === "config" ? (
            <>
              <p className="font-medium">The abandoned-checkout database isn&rsquo;t connected.</p>
              <p className="mt-2 text-[color:var(--color-charcoal-soft)]">
                In Vercel: this project → Storage → Upstash for Redis → connect it to
                Production, then redeploy. Until then, checkouts aren&rsquo;t being recorded.
              </p>
            </>
          ) : (
            <p>
              The list couldn&rsquo;t be loaded just now. Refresh in a minute.
              <span className="mt-1 block text-[0.72rem] text-[color:var(--color-charcoal-soft)]">{detail.slice(0, 200)}</span>
            </p>
          )}
        </div>
      )}

      {!problem && (
        <>
          {/* KPI cards */}
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="To follow up"
              value={`${todo.length}`}
              sub={`${inr(sum(todo))} in their bags`}
              accent
            />
            <Kpi
              label="Value not paid"
              value={inr(sum(notPaid))}
              sub={`${notPaid.length} checkout${notPaid.length === 1 ? "" : "s"} · ${
                notPaid.filter((r) => r.stage === "payment").length
              } reached payment`}
            />
            <Kpi
              label="Contacted"
              value={`${contacted.length}`}
              sub="waiting for a reply"
            />
            <Kpi
              label="Recovered"
              value={inr(sum(recovered))}
              sub={
                recoveryRate === null
                  ? `${recovered.length} orders`
                  : `${recovered.length} order${recovered.length === 1 ? "" : "s"} · ${recoveryRate}% of those contacted`
              }
            />
          </div>
          <p className="mt-2 text-[0.7rem] text-[color:var(--color-charcoal-soft)]">
            Figures for the last {rangeLabel === "all time" ? "60 days (records are kept that long)" : rangeLabel}.
          </p>

          {/* Daily trend */}
          <section className="mt-8 rounded-lg border border-[color:var(--color-rule)] p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[0.92rem] font-medium">Abandoned checkouts per day</h2>
              <p className="text-[0.72rem] text-[color:var(--color-charcoal-soft)]">Last {days} days · hover or tap a bar</p>
            </div>
            <div className="mt-5 flex h-[140px] items-end gap-[2px] border-b border-[color:var(--color-rule)]" role="img" aria-label={`Abandoned checkouts per day, last ${days} days`}>
              {trend.map((d) => (
                <div key={d.key} className="group relative flex h-full flex-1 items-end justify-center">
                  <div
                    className="w-[100%] max-w-[2.75rem] rounded-t-[4px] bg-[color:var(--color-aerial)] transition-opacity group-hover:opacity-80"
                    style={{ height: d.count ? `${Math.max(4, (d.count / peak) * 100)}%` : "0" }}
                  />
                  <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[color:var(--color-charcoal)] px-2.5 py-1.5 text-[0.7rem] text-[color:var(--color-ivory)] group-hover:block">
                    {d.label}: {d.count} checkout{d.count === 1 ? "" : "s"}
                    {d.count ? ` · ${inr(d.value)}` : ""}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[0.66rem] text-[color:var(--color-charcoal-soft)]">
              <span>{trend[0].label}</span>
              <span>Peak: {peak === 1 && !trend.some((d) => d.count) ? 0 : peak} a day</span>
              <span>Today</span>
            </div>
          </section>

          {/* Tabs */}
          <nav aria-label="Filter" className="mt-10 flex flex-wrap gap-1 border-b border-[color:var(--color-rule)]">
            {VIEWS.map((v) => (
              <Link
                key={v.key}
                href={href(v.key, range)}
                aria-current={view === v.key ? "page" : undefined}
                className={`-mb-px border-b-2 px-3 pb-2.5 pt-1 text-[0.8rem] transition-colors ${
                  view === v.key
                    ? "border-[color:var(--color-charcoal)] text-[color:var(--color-charcoal)]"
                    : "border-transparent text-[color:var(--color-charcoal-soft)] hover:text-[color:var(--color-charcoal)]"
                }`}
              >
                {v.label}
                <span className="ml-1.5 rounded-full bg-[color:var(--color-stardust-soft)] px-1.5 py-0.5 text-[0.66rem] tabular-nums">
                  {lists[v.key].length}
                </span>
              </Link>
            ))}
          </nav>

          {shown.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[0.95rem]">
                {view === "todo" ? "All caught up." : "Nothing here yet."}
              </p>
              <p className="mt-1 text-[0.8rem] text-[color:var(--color-charcoal-soft)]">
                {view === "todo"
                  ? `No one is waiting to be followed up in the last ${rangeLabel}.`
                  : "Try a longer time range."}
              </p>
            </div>
          ) : (
            <div className="mt-2">
              {/* Column headings (wide screens) */}
              <div className="hidden grid-cols-[1.4fr_1.6fr_0.7fr_1fr_1.3fr] gap-4 border-b border-[color:var(--color-rule)] px-3 py-2.5 text-[0.62rem] uppercase tracking-[0.18em] text-[color:var(--color-charcoal-soft)] lg:grid">
                <span>Customer</span>
                <span>Bag</span>
                <span className="text-right">Value</span>
                <span>Status</span>
                <span className="text-right">Follow up</span>
              </div>

              <ul>
                {shown.map((r) => {
                  const status = statusOf(r);
                  const s = STATUS[status];
                  const fresh = !r.paidAs && !r.recovered && now - Date.parse(r.updatedAt) < IN_PROGRESS_MS;
                  const digits = r.phone.replace(/\D/g, "");
                  const text = message(r);
                  const open = status === "form" || status === "payment" || status === "contacted";
                  return (
                    <li
                      key={r.bag}
                      className="grid gap-3 border-b border-[color:var(--color-rule)] px-3 py-4 transition-colors hover:bg-[color:var(--color-ivory)] lg:grid-cols-[1.4fr_1.6fr_0.7fr_1fr_1.3fr] lg:items-center lg:gap-4"
                    >
                      {/* Customer */}
                      <div className="min-w-0">
                        <p className="truncate text-[0.9rem] font-medium">{r.customerName || "Name not given"}</p>
                        {r.phone && <p className="text-[0.78rem] tabular-nums text-[color:var(--color-charcoal-soft)]">{r.phone}</p>}
                        {r.email && <p className="truncate text-[0.78rem] text-[color:var(--color-charcoal-soft)]">{r.email}</p>}
                      </div>

                      {/* Bag */}
                      <div className="min-w-0 text-[0.8rem] leading-[1.5]">
                        {r.items.slice(0, 3).map((i, n) => (
                          <p key={n} className="truncate">
                            {i.title}
                            {i.quantity > 1 && <span className="text-[color:var(--color-charcoal-soft)]"> × {i.quantity}</span>}
                          </p>
                        ))}
                        {r.items.length > 3 && (
                          <p className="text-[color:var(--color-charcoal-soft)]">+{r.items.length - 3} more</p>
                        )}
                        {r.address && <p className="mt-0.5 truncate text-[0.7rem] text-[color:var(--color-charcoal-soft)]">{r.address}</p>}
                      </div>

                      {/* Value */}
                      <div className="text-[0.95rem] tabular-nums lg:text-right">
                        {inr(r.total)}
                        {r.discountCode && (
                          <p className="text-[0.62rem] uppercase tracking-[0.14em] text-[color:var(--color-charcoal-soft)]">code {r.discountCode}</p>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[0.7rem] font-medium ${s.cls}`}>
                          {s.label}
                          {status === "paid" && r.paidAs ? ` · ${r.paidAs}` : ""}
                          {status === "recovered" && r.order ? ` · ${r.order}` : ""}
                        </span>
                        <p className="mt-1 text-[0.7rem] text-[color:var(--color-charcoal-soft)]">
                          {fresh ? "Active now — may still be checking out" : `${ago(r.updatedAt, now)} · ${when(r.updatedAt)}`}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {open && digits && (
                          <a
                            href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md bg-[color:var(--color-charcoal)] px-3 py-1.5 text-[0.72rem] text-[color:var(--color-ivory)] transition-colors hover:bg-[color:var(--color-clay-deep)]"
                          >
                            WhatsApp
                          </a>
                        )}
                        {open && r.email && (
                          <a
                            href={`mailto:${r.email}?subject=${encodeURIComponent("Your Quint Home bag")}&body=${encodeURIComponent(text)}`}
                            className="rounded-md border border-[color:var(--color-rule)] px-3 py-1.5 text-[0.72rem] transition-colors hover:border-[color:var(--color-charcoal)]"
                          >
                            Email
                          </a>
                        )}
                        {status === "form" || status === "payment" ? (
                          <ActionButton id={r.bag} action="contacted" view={view} range={range} label="Mark contacted" />
                        ) : null}
                        {open && (
                          <ActionButton id={r.bag} action="dismiss" view={view} range={range} label="Remove" quiet />
                        )}
                        {staff && r.txnid && status === "payment" && (
                          <Link href="/admin/payments" className="text-[0.7rem] text-[color:var(--color-charcoal-soft)] underline-offset-4 hover:underline">
                            Payment
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* How it works */}
          <details className="mt-10 rounded-lg border border-[color:var(--color-rule)] px-5 py-4 text-[0.8rem] leading-[1.7] text-[color:var(--color-charcoal-soft)]">
            <summary className="cursor-pointer text-[0.82rem] text-[color:var(--color-charcoal)]">How this works</summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Someone appears here once they type an email or phone at checkout and don&rsquo;t pay.</li>
              <li><b className="font-medium text-[color:var(--color-charcoal)]">Left at form</b>: never pressed Pay. <b className="font-medium text-[color:var(--color-charcoal)]">Left at payment</b>: reached PayU but didn&rsquo;t complete.</li>
              <li>The WhatsApp and email messages include a link that puts the customer&rsquo;s bag back, on any device. It works for about ten days.</li>
              <li>After messaging, press <b className="font-medium text-[color:var(--color-charcoal)]">Mark contacted</b>. If they then buy, they move to Recovered by themselves.</li>
              <li>If a customer says they were charged, {staff ? "check the transaction under Payments" : "pass their name to the admin"} before anything else.</li>
              <li>Records are kept for 60 days.</li>
            </ul>
          </details>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

function Kpi({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 md:p-5 ${
        accent
          ? "border-[color:var(--color-charcoal)] bg-[color:var(--color-stardust-soft)]"
          : "border-[color:var(--color-rule)]"
      }`}
    >
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--color-charcoal-soft)]">{label}</p>
      <p className="mt-2 tabular-nums" style={{ fontFamily: "var(--font-serif)", fontSize: "1.75rem", lineHeight: 1 }}>
        {value}
      </p>
      <p className="mt-2 text-[0.72rem] text-[color:var(--color-charcoal-soft)]">{sub}</p>
    </div>
  );
}

function ActionButton({
  id,
  action,
  view,
  range,
  label,
  quiet = false,
}: {
  id: string;
  action: "contacted" | "dismiss";
  view: View;
  range: Range;
  label: string;
  quiet?: boolean;
}) {
  return (
    <form action="/api/admin/abandoned" method="post">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="view" value={view === "todo" ? "" : view} />
      <input type="hidden" name="range" value={range === "30" ? "" : range} />
      <button
        name="action"
        value={action}
        className={
          quiet
            ? "px-1.5 py-1.5 text-[0.7rem] text-[color:var(--color-charcoal-soft)] underline-offset-4 hover:text-[color:var(--color-clay)] hover:underline"
            : "rounded-md border border-[color:var(--color-aerial)] px-3 py-1.5 text-[0.72rem] text-[color:var(--color-aerial-deep)] transition-colors hover:bg-[color:var(--color-aerial)] hover:text-white"
        }
      >
        {label}
      </button>
    </form>
  );
}
