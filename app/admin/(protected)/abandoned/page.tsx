import Link from "next/link";
import { SITE } from "@/lib/seo";
import {
  DraftAccessError,
  draftsConfigured,
  listCheckoutDrafts,
  type AbandonedCheckout,
} from "@/lib/shopify/drafts";

export const dynamic = "force-dynamic";

type View = "open" | "recovered" | "all";

interface Query {
  view?: string;
  done?: string;
}

/** Activity more recent than this may be someone still at the form. */
const IN_PROGRESS_MS = 30 * 60 * 1000;

/** Request time. This page is dynamic, so every render is a fresh request. */
const requestTime = (): number => Date.now();

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

function ago(iso: string, now: number): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

const shopHandle = () =>
  (process.env.SHOPIFY_STORE_DOMAIN ?? "").replace(/\.myshopify\.com$/, "");

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

const DONE: Record<string, string> = {
  contacted: "Marked as contacted.",
  dismiss: "Dismissed. The draft order has been deleted from Shopify.",
  failed: "That did not work — Shopify refused or could not be reached. Try again.",
  invalid: "That request was not understood.",
};

const pill = "inline-block rounded-full px-2.5 py-0.5 text-[0.6rem] uppercase tracking-[0.16em]";

export default async function AbandonedPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;
  const view: View = q.view === "recovered" || q.view === "all" ? q.view : "open";
  const now = requestTime();

  let rows: AbandonedCheckout[] = [];
  let problem: "config" | "access" | "error" | null = draftsConfigured ? null : "config";
  let detail = "";
  if (!problem) {
    try {
      rows = await listCheckoutDrafts(100);
    } catch (e) {
      problem = e instanceof DraftAccessError ? "access" : "error";
      detail = e instanceof Error ? e.message : String(e);
    }
  }

  const open = rows.filter((r) => !r.recovered && !r.paidAs);
  const recovered = rows.filter((r) => r.recovered);
  const shown = view === "open" ? open : view === "recovered" ? recovered : rows;

  const stats = [
    { label: "Not paid", value: `${open.length}`, sub: inr(open.reduce((t, r) => t + r.total, 0)) },
    { label: "Left at the form", value: `${open.filter((r) => r.stage === "form").length}`, sub: "never pressed Pay" },
    { label: "Left at PayU", value: `${open.filter((r) => r.stage === "payment").length}`, sub: "reached payment" },
    { label: "Contacted", value: `${open.filter((r) => r.contacted).length}`, sub: "awaiting a reply" },
    { label: "Recovered", value: `${recovered.length}`, sub: inr(recovered.reduce((t, r) => t + r.total, 0)) },
  ];

  const tab = (v: View, label: string, count: number) => (
    <Link
      href={v === "open" ? "/admin/abandoned" : `/admin/abandoned?view=${v}`}
      className={`text-[0.62rem] uppercase tracking-[0.28em] underline-offset-4 ${
        view === v
          ? "text-[color:var(--color-charcoal)] underline"
          : "text-[color:var(--color-charcoal-soft)] hover:underline"
      }`}
    >
      {label} ({count})
    </Link>
  );

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.9rem", lineHeight: 1.1 }}>
        Abandoned checkouts
      </h1>
      <p className="mt-4 max-w-[48rem] text-[0.88rem] leading-[1.7] text-[color:var(--color-charcoal-soft)]">
        Everyone who typed an email or phone number at checkout and did not
        pay. Each is a draft order in Shopify (Orders → Drafts, tag{" "}
        <code>qh-checkout</code>). A paid bag leaves this list by itself.
        Message the customer, then mark them contacted; if they buy, they move
        to Recovered.
      </p>

      {q.done && DONE[q.done] && (
        <p role="status" className="mt-6 border-l-2 border-[color:var(--color-clay)] bg-[color:var(--color-stardust-soft)] p-3 text-[0.82rem]">
          {DONE[q.done]}
        </p>
      )}

      {problem && (
        <div role="alert" className="mt-8 max-w-[48rem] border-l-2 border-[color:var(--color-clay)] bg-[color:var(--color-stardust-soft)] p-4 text-[0.85rem] leading-[1.65]">
          {problem === "config" && <p>Shopify Admin is not configured on this deployment.</p>}
          {problem === "access" && (
            <>
              <p className="font-medium">The Shopify app does not have permission to use draft orders yet.</p>
              <p className="mt-2 text-[color:var(--color-charcoal-soft)]">
                Open <code>/api/shopify/install</code> on this site, approve the
                new <code>write_draft_orders</code> permission in Shopify, then
                paste the token it shows into Vercel as{" "}
                <code>SHOPIFY_ADMIN_TOKEN</code> and redeploy. If Shopify does
                not ask for the new permission, add it to the app&rsquo;s Admin
                API scopes in the Shopify app settings first. Until then
                checkouts are not being recorded.
              </p>
            </>
          )}
          {problem === "error" && (
            <p>
              Shopify could not be read just now. Refresh in a minute.
              <span className="mt-1 block text-[0.72rem] text-[color:var(--color-charcoal-soft)]">{detail.slice(0, 200)}</span>
            </p>
          )}
        </div>
      )}

      {!problem && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {stats.map((s) => (
              <div key={s.label} className="border border-[color:var(--color-rule)] p-4">
                <p className="text-[0.58rem] uppercase tracking-[0.24em] text-[color:var(--color-charcoal-soft)]">{s.label}</p>
                <p className="mt-2 tabular-nums" style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", lineHeight: 1 }}>{s.value}</p>
                <p className="mt-1 text-[0.72rem] text-[color:var(--color-charcoal-soft)]">{s.sub}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.7rem] text-[color:var(--color-charcoal-soft)]">From the latest 100 checkouts.</p>

          <div className="mt-8 flex flex-wrap gap-6 border-b border-[color:var(--color-rule)] pb-3">
            {tab("open", "Not paid", open.length)}
            {tab("recovered", "Recovered", recovered.length)}
            {tab("all", "All", rows.length)}
          </div>

          {shown.length === 0 && (
            <p className="mt-8 text-[0.88rem] text-[color:var(--color-charcoal-soft)]">
              {view === "open" ? "Nobody is waiting to be followed up." : "Nothing here yet."}
            </p>
          )}

          <ul className="mt-2">
            {shown.map((r) => {
              const fresh = now - Date.parse(r.updatedAt) < IN_PROGRESS_MS;
              const digits = r.phone.replace(/\D/g, "");
              const text = message(r);
              return (
                <li key={r.id} className="grid gap-4 border-b border-[color:var(--color-rule)] py-5 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <p className="text-[0.95rem]">{r.customerName || "Name not given"}</p>
                    {r.email && <p className="mt-1 break-all text-[0.8rem] text-[color:var(--color-charcoal-soft)]">{r.email}</p>}
                    {r.phone && <p className="mt-0.5 text-[0.8rem] tabular-nums text-[color:var(--color-charcoal-soft)]">{r.phone}</p>}
                    {r.address && <p className="mt-1 text-[0.72rem] leading-[1.5] text-[color:var(--color-charcoal-soft)]">{r.address}</p>}
                  </div>

                  <div className="md:col-span-4">
                    <ul className="text-[0.84rem] leading-[1.6]">
                      {r.items.map((i, n) => (
                        <li key={n}>
                          {i.title}
                          {i.quantity > 1 && <span className="text-[color:var(--color-charcoal-soft)]"> × {i.quantity}</span>}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[0.95rem] tabular-nums">
                      {inr(r.total)}
                      {r.discountCode && (
                        <span className="ml-2 text-[0.62rem] uppercase tracking-[0.18em] text-[color:var(--color-charcoal-soft)]">code {r.discountCode}</span>
                      )}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex flex-wrap gap-1.5">
                      {r.paidAs ? (
                        <span className={`${pill} bg-[#e2ece0] text-[#3d6340]`}>Paid · {r.paidAs}</span>
                      ) : r.recovered ? (
                        <span className={`${pill} bg-[#e2ece0] text-[#3d6340]`}>Recovered{r.order ? ` · ${r.order}` : ""}</span>
                      ) : (
                        <span className={`${pill} ${r.stage === "payment" ? "bg-[#f6dfd6] text-[#8f2f16]" : "bg-[#f8e8d6] text-[#8a4a12]"}`}>
                          {r.stage === "payment" ? "Left at PayU" : "Left at form"}
                        </span>
                      )}
                      {r.contacted && !r.recovered && <span className={`${pill} bg-[#e3ebe9] text-[#3f5754]`}>Contacted</span>}
                      {fresh && !r.recovered && !r.paidAs && <span className={`${pill} bg-[#efece6] text-[#6a625e]`}>May still be checking out</span>}
                    </div>
                    <p className="mt-2 text-[0.72rem] text-[color:var(--color-charcoal-soft)]">
                      {when(r.updatedAt)} · {ago(r.updatedAt, now)}
                    </p>
                    {r.txnid && (
                      <p className="mt-0.5 text-[0.66rem] tabular-nums text-[color:var(--color-charcoal-soft)]">{r.txnid}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap content-start gap-x-4 gap-y-2 text-[0.62rem] uppercase tracking-[0.2em] md:col-span-3 md:justify-end">
                    {digits && (
                      <a
                        href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        WhatsApp
                      </a>
                    )}
                    {r.email && (
                      <a
                        href={`mailto:${r.email}?subject=${encodeURIComponent("Your Quint Home bag")}&body=${encodeURIComponent(text)}`}
                        className="underline-offset-4 hover:underline"
                      >
                        Email
                      </a>
                    )}
                    {r.legacyId && shopHandle() && (
                      <a
                        href={`https://admin.shopify.com/store/${shopHandle()}/draft_orders/${r.legacyId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[color:var(--color-charcoal-soft)] underline-offset-4 hover:underline"
                      >
                        Shopify
                      </a>
                    )}
                    {r.txnid && (
                      <Link href="/admin/payments" className="text-[color:var(--color-charcoal-soft)] underline-offset-4 hover:underline">
                        Payments
                      </Link>
                    )}
                    {!r.recovered && !r.contacted && !r.paidAs && (
                      <form action="/api/admin/abandoned" method="post">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="view" value={view === "open" ? "" : view} />
                        <button name="action" value="contacted" className="uppercase tracking-[0.2em] text-[color:var(--color-aerial-deep)] underline-offset-4 hover:underline">
                          Mark contacted
                        </button>
                      </form>
                    )}
                    {!r.recovered && (
                      <form action="/api/admin/abandoned" method="post">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="view" value={view === "open" ? "" : view} />
                        <button name="action" value="dismiss" className="uppercase tracking-[0.2em] text-[color:var(--color-clay)] underline-offset-4 hover:underline">
                          Dismiss
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-10 max-w-[48rem] text-[0.78rem] leading-[1.7] text-[color:var(--color-charcoal-soft)]">
            <p>
              <span className="text-[color:var(--color-charcoal)]">The link in each message</span>{" "}
              puts that customer&rsquo;s bag back in their browser, on any device,
              and opens checkout. It works while Shopify keeps the bag — about ten
              days without activity.
            </p>
            <p className="mt-3">
              <span className="text-[color:var(--color-charcoal)]">Left at PayU</span>{" "}
              means the customer reached the payment page. If they say they were
              charged, check the transaction id under Payments before anything else.
              Don&rsquo;t use Shopify&rsquo;s &ldquo;Send invoice&rdquo; on these drafts.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
