import Link from "next/link";
import { requireStaff } from "@/lib/admin/session";
import {
  productName,
  reviewsAvailable,
  reviewsForAdmin,
  type Review,
} from "@/lib/reviews/store";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  approve: "Approved – it's on the product page now.",
  delete: "Deleted.",
  invalid: "That action didn't make sense; nothing changed.",
  failed: "That didn't go through. Try again in a moment.",
  missing: "That review was already handled.",
};

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

/**
 * Review moderation. Everything a visitor submits waits here, unseen on the
 * storefront, until someone approves it; approved reviews can be taken down
 * again. Staff only – the marketing passphrase does not reach this page.
 */
export default async function ReviewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  await requireStaff();
  const { done } = await searchParams;

  let data: { pending: Review[]; approved: Review[] } | null = null;
  let problem: "config" | "error" | null = reviewsAvailable ? null : "config";
  if (!problem) {
    try {
      data = await reviewsForAdmin();
    } catch (e) {
      console.error("[reviews] admin list failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      problem = "error";
    }
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-serif)] text-[1.8rem] leading-tight">Reviews</h1>
      <p className="mt-2 max-w-[60ch] text-[0.86rem] text-[color:var(--color-charcoal-soft)]">
        New reviews wait here and appear on their product page only once approved.
        The reviewer&rsquo;s email is for you only and is never shown.
      </p>

      {done && NOTICES[done] && (
        <p className="mt-6 border-l-2 border-[color:var(--color-clay)] bg-[color:var(--color-stardust-soft)] px-4 py-3 text-[0.86rem]">
          {NOTICES[done]}
        </p>
      )}

      {problem === "config" && (
        <p className="mt-8 text-[0.9rem]">
          The review store isn&rsquo;t connected. It uses the same Upstash Redis
          database as abandoned checkouts.
        </p>
      )}
      {problem === "error" && (
        <p className="mt-8 text-[0.9rem]">The review store didn&rsquo;t answer. Try reloading.</p>
      )}

      {data && (
        <>
          <Group title={`Waiting for approval (${data.pending.length})`} empty="Nothing waiting.">
            {data.pending.map((r) => (
              <Row key={r.id} review={r} pending />
            ))}
          </Group>
          <Group title={`On the site (${data.approved.length})`} empty="No approved reviews yet.">
            {data.approved.map((r) => (
              <Row key={r.id} review={r} />
            ))}
          </Group>
        </>
      )}
    </div>
  );
}

function Group({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <section className="mt-10">
      <h2 className="border-b border-[color:var(--color-rule)] pb-3 text-[0.66rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)]">
        {title}
      </h2>
      {children.length ? (
        <ul>{children}</ul>
      ) : (
        <p className="py-6 text-[0.86rem] text-[color:var(--color-charcoal-soft)]">{empty}</p>
      )}
    </section>
  );
}

function Row({ review: r, pending = false }: { review: Review; pending?: boolean }) {
  const button =
    "h-9 px-4 text-[0.62rem] uppercase tracking-[0.22em] transition-colors";
  return (
    <li className="grid gap-4 border-b border-[color:var(--color-rule)] py-5 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <p className="text-[0.75rem] text-[color:var(--color-charcoal-soft)]">
          <Link href={`/range/${r.slug}#reviews`} className="underline-offset-4 hover:underline">
            {productName(r.slug) ?? r.slug}
          </Link>
          {" · "}
          {when(r.createdAt)}
        </p>
        <p className="mt-1.5 text-[0.95rem]">
          <span className="text-[color:var(--color-clay)]">
            {"★".repeat(r.rating)}
            <span className="opacity-30">{"★".repeat(5 - r.rating)}</span>
          </span>
          {r.title && <span className="ml-3 font-[family-name:var(--font-serif)]">{r.title}</span>}
        </p>
        <p className="mt-2 max-w-[75ch] whitespace-pre-line text-[0.88rem] leading-[1.6]">{r.body}</p>
        <p className="mt-2 text-[0.75rem] text-[color:var(--color-charcoal-soft)]">
          {r.name}
          {r.city ? ` · ${r.city}` : ""} · <a href={`mailto:${r.email}`} className="underline-offset-4 hover:underline">{r.email}</a>
        </p>
      </div>
      <form action="/api/admin/reviews" method="post" className="flex items-start gap-2">
        <input type="hidden" name="id" value={r.id} />
        <input type="hidden" name="slug" value={r.slug} />
        {pending && (
          <button
            name="action"
            value="approve"
            className={`${button} bg-[color:var(--color-charcoal)] text-[color:var(--color-ivory)] hover:bg-[color:var(--color-clay-deep)]`}
          >
            Approve
          </button>
        )}
        <button
          name="action"
          value="delete"
          className={`${button} border border-[color:var(--color-rule)] text-[color:var(--color-charcoal)] hover:border-[color:var(--color-clay)] hover:text-[color:var(--color-clay)]`}
        >
          Delete
        </button>
      </form>
    </li>
  );
}
