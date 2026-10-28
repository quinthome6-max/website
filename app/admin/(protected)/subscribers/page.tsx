import { redirect } from "next/navigation";
import { currentViewer } from "@/lib/admin/session";
import {
  joinedThisWeek,
  listSubscribers,
  newsletterAvailable,
  sourceLabel,
  type Subscriber,
} from "@/lib/newsletter/store";
import { btn, Box, Figure, Notice, PageHeader } from "@/components/admin/ui";
import { IconDownload } from "@/components/admin/icons";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  unsubscribe: "Unsubscribed. They stay on the list, marked, and are left out of the export.",
  resubscribe: "Subscribed again.",
  delete: "Removed from the list.",
  invalid: "That action didn't make sense; nothing changed.",
  missing: "That address isn't on the list any more.",
  failed: "That didn't go through. Try again in a moment.",
};

const WHEN = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

/**
 * Newsletter subscribers: everyone who signed up on the site (footer, the
 * Diwali band on the homepage, the end of a journal piece), with where they
 * signed up. Open to staff and to the marketing sign-in, who will write to
 * them. Each signup is also in Shopify as a customer who accepts marketing.
 */
export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const viewer = await currentViewer();
  if (!viewer) redirect("/admin/login");
  const { done } = await searchParams;

  let subs: Subscriber[] | null = null;
  let problem: "config" | "error" | null = newsletterAvailable ? null : "config";
  if (!problem) {
    try {
      subs = await listSubscribers();
    } catch (e) {
      console.error("[newsletter] admin list failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      problem = "error";
    }
  }

  const active = subs?.filter((s) => s.status === "subscribed") ?? [];
  const thisWeek = subs ? joinedThisWeek(subs) : 0;
  const left = (subs?.length ?? 0) - active.length;

  return (
    <div>
      <PageHeader
        eyebrow="Email"
        title="Subscribers"
        description="Everyone who signed up for emails on the site, and where they signed up. The export holds subscribed addresses only, ready for Shopify Email or any mailing tool; every signup is also in Shopify as a customer who accepts marketing."
        actions={
          active.length ? (
            <a href="/api/admin/subscribers?format=csv" className={btn.primary}>
              <IconDownload className="h-4 w-4" /> Export CSV
            </a>
          ) : null
        }
      />

      {done && NOTICES[done] && <Notice title={NOTICES[done]} tone={done === "failed" ? "warn" : "ok"} />}

      {problem === "config" && (
        <Notice title="The subscriber list isn't connected." tone="warn">
          It uses the same Upstash Redis database as reviews and abandoned checkouts.
        </Notice>
      )}
      {problem === "error" && <Notice title="The subscriber list didn't answer. Try reloading." tone="warn" />}

      {subs && (
        <>
          <div className="mb-8 flex flex-wrap gap-x-12 gap-y-5">
            <Figure label="Subscribed" value={active.length} />
            <Figure label="New this week" value={thisWeek} />
            <Figure label="Unsubscribed" value={left} />
          </div>

          <Box title={`All signups (${subs.length})`} padded={false}>
            {subs.length === 0 ? (
              <p className="px-5 py-6 text-[0.85rem] text-[color:var(--color-charcoal-soft)]">
                No one has signed up yet. Signups come from the footer, the Diwali section on the homepage and the
                end of each journal piece.
              </p>
            ) : (
              <ul>
                {subs.map((s) => (
                  <Row key={s.email} sub={s} />
                ))}
              </ul>
            )}
          </Box>
        </>
      )}
    </div>
  );
}

function Row({ sub: s }: { sub: Subscriber }) {
  const on = s.status === "subscribed";
  return (
    <li className="grid items-center gap-x-6 gap-y-2 border-b border-[color:var(--color-rule)] px-5 py-3.5 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_10rem_auto]">
      <a
        href={`mailto:${s.email}`}
        className={`min-w-0 truncate text-[0.88rem] underline-offset-4 hover:underline ${on ? "" : "text-[color:var(--color-charcoal-soft)] line-through"}`}
      >
        {s.email}
      </a>
      <span className="text-[0.78rem] text-[color:var(--color-charcoal-soft)]">{sourceLabel(s.source)}</span>
      <span className="text-[0.78rem] tabular-nums text-[color:var(--color-charcoal-soft)]">
        {WHEN.format(new Date(s.createdAt))}
      </span>
      <form action="/api/admin/subscribers" method="post" className="flex items-center gap-4 md:justify-end">
        <input type="hidden" name="email" value={s.email} />
        {on ? (
          <button name="action" value="unsubscribe" className={btn.quiet}>
            Unsubscribe
          </button>
        ) : (
          <button name="action" value="resubscribe" className={btn.quiet}>
            Resubscribe
          </button>
        )}
        <button name="action" value="delete" className={btn.danger}>
          Delete
        </button>
      </form>
    </li>
  );
}
