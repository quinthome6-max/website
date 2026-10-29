"use client";

import { useState, useTransition } from "react";
import { subscribeAction, type SubscribeResult } from "@/app/actions/newsletter";
import { gaEvent } from "@/lib/analytics/ga4";
import { track } from "@/lib/analytics/pixel";

/**
 * Email signup. `source` records where on the site it was filled in ("footer",
 * "diwali", "journal:<slug>"), shown beside each address at /admin/subscribers.
 *
 * A first-time signup is reported as a lead, as the business enquiry form
 * does: Meta "Lead" and GA4 "generate_lead", told apart by their source.
 */
export function NewsletterForm({
  source = "footer",
  className = "mt-8 max-w-md",
  note,
  onResult,
}: {
  source?: string;
  className?: string;
  /** A line under the form, e.g. how often we write. */
  note?: string;
  /** Called with the outcome, e.g. so a popup can remember a signup. */
  onResult?: (result: SubscribeResult) => void;
}) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );
  const [pending, startTransition] = useTransition();

  return (
    <div className={className}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setResult(null);
          startTransition(async () => {
            const res = await subscribeAction(email, source);
            setResult(res);
            if (res.ok && res.isNew) {
              gaEvent("generate_lead", { lead_source: `newsletter_${source.split(":")[0]}` });
              track("Lead", { content_name: "Newsletter signup", content_category: source.split(":")[0] });
            }
            onResult?.(res);
          });
        }}
        className="flex items-end gap-3 border-b border-[color:var(--color-charcoal)] pb-2"
      >
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          placeholder="Your email"
          className="flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-[color:var(--color-charcoal-soft)] disabled:opacity-60"
          aria-label="Email"
        />
        <button
          type="submit"
          disabled={pending || email.trim().length === 0}
          className="shrink-0 text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--color-charcoal)] transition-colors hover:text-[color:var(--color-clay)] disabled:opacity-40"
        >
          {pending ? "Sending…" : "Subscribe"}
        </button>
      </form>

      {result ? (
        <p
          role="status"
          className={`mt-3 text-[0.8rem] leading-[1.6] ${
            result.ok
              ? "text-[color:var(--color-aerial-deep)]"
              : "text-[color:var(--color-clay)]"
          }`}
        >
          {result.message}
        </p>
      ) : (
        note && (
          <p className="mt-3 text-[0.78rem] leading-[1.6] text-[color:var(--color-charcoal-soft)]">{note}</p>
        )
      )}
    </div>
  );
}
