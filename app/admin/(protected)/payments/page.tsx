import { requireStaff } from "@/lib/admin/session";
export const dynamic = "force-dynamic";

interface Query {
  txn?: string;
  state?: string;
  order?: string;
  existing?: string;
  placeholder?: string;
  attention?: string;
  detail?: string;
}

/** What happened, in a sentence someone can act on. */
function outcome(q: Query): { title: string; body: string } | null {
  switch (q.state) {
    case "ordered":
      if (q.existing === "1") {
        return {
          title: `Already in Shopify as ${q.order}`,
          body:
            q.placeholder === "1"
              ? "That order is a placeholder waiting to be finished by hand. Nothing new was written."
              : "This payment already has its order. Nothing new was written.",
        };
      }
      if (q.placeholder === "1") {
        return {
          title: `Placeholder order ${q.order} written`,
          body:
            "PayU confirms the payment, but the bag behind it could not be used, so the order holds only the amount received. Open it in Shopify — the note says why and what is known about the customer — then create the real order by hand and cancel the placeholder.",
        };
      }
      return {
        title: `Order ${q.order} written`,
        body:
          q.attention === "1"
            ? "The order is in Shopify, but not quite as the customer placed it. Its note says what was left off — read it before dispatch."
            : "PayU confirmed the payment and the order is now in Shopify, with the customer's receipt sent.",
      };
    case "not-paid":
      return {
        title: "PayU says this was not paid",
        body: `Its status for the transaction is "${q.detail || "unknown"}". There is nothing to write an order for.`,
      };
    case "unconfirmed":
      return {
        title: "PayU could not be reached",
        body: "Nothing was changed. Try again in a minute.",
      };
    case "busy":
      return {
        title: "This payment is being settled right now",
        body: "Another process is writing its order. Check Shopify in a moment before trying again.",
      };
    case "failed":
      return {
        title: "Paid, but Shopify could not be written to",
        body: q.detail || "Shopify refused the request. Try again shortly.",
      };
    case "invalid":
      return {
        title: "That is not one of this site's transaction ids",
        body: "They begin with QH and are letters and digits only. In the PayU dashboard it is the Transaction ID column — not the PayU ID, which is all digits.",
      };
    default:
      return null;
  }
}

/**
 * Recover a payment that has no order.
 *
 * Every captured payment is meant to reach Shopify on its own — through the
 * customer's return, or PayU's webhook. This page is for the one that did not.
 */
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  await requireStaff();
  const q = await searchParams;
  const result = outcome(q);

  return (
    <div className="max-w-[44rem]">
      <h1
        style={{ fontFamily: "var(--font-serif)", fontSize: "1.9rem", lineHeight: 1.1 }}
      >
        Payments
      </h1>
      <p className="mt-4 text-[0.88rem] leading-[1.7] text-[color:var(--color-charcoal-soft)]">
        Every payment PayU captures should have an order in Shopify. If PayU
        shows one that Shopify does not, paste its Transaction ID here. PayU is
        asked whether it was paid; if it was and no order exists, one is
        written. Pressing it on a payment that already has its order changes
        nothing.
      </p>

      {result && (
        <div
          role="status"
          className="mt-6 border-l-2 border-[color:var(--color-clay)] bg-[color:var(--color-stardust-soft)] p-4"
        >
          <p className="text-[0.85rem] font-medium">{result.title}</p>
          <p className="mt-1 text-[0.8rem] leading-[1.6] text-[color:var(--color-charcoal-soft)]">
            {result.body}
          </p>
          {q.txn && (
            <p className="mt-2 text-[0.7rem] tabular-nums text-[color:var(--color-charcoal-soft)]">
              {q.txn}
            </p>
          )}
        </div>
      )}

      <form action="/api/admin/payu/recover" method="post" className="mt-8">
        <label className="block">
          <span className="block text-[0.6rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)]">
            PayU Transaction ID
          </span>
          <input
            name="txnid"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="QH…"
            className="mt-2 w-[100%] border-b border-[color:var(--color-rule)] bg-transparent py-2.5 text-[0.95rem] uppercase tabular-nums outline-none placeholder:normal-case focus:border-[color:var(--color-charcoal)]"
          />
        </label>
        <button
          type="submit"
          className="mt-6 bg-[color:var(--color-charcoal)] px-7 py-3.5 text-[0.7rem] uppercase tracking-[0.3em] text-[color:var(--color-ivory)] transition-colors duration-500 hover:bg-[color:var(--color-clay-deep)]"
        >
          Check and settle
        </button>
      </form>

      <div className="mt-12 border-t border-[color:var(--color-rule)] pt-6 text-[0.8rem] leading-[1.7] text-[color:var(--color-charcoal-soft)]">
        <p>
          <span className="text-[color:var(--color-charcoal)]">Where to find the id.</span>{" "}
          PayU dashboard → Transactions. Use the Transaction ID (begins QH), not
          the PayU ID.
        </p>
        <p className="mt-3">
          <span className="text-[color:var(--color-charcoal)]">Orders to look at.</span>{" "}
          In Shopify, filter orders by the tag{" "}
          <code>PayU-needs-attention</code>. Each one explains itself in its
          note. <code>PayU-duplicate</code> marks a second order written for a
          single payment — cancel it.
        </p>
      </div>
    </div>
  );
}
