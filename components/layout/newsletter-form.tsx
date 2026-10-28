"use client";

import { useState, useTransition } from "react";
import { subscribeAction } from "@/app/actions/newsletter";

/**
 * Email signup. `source` records where on the site it was filled in ("footer",
 * "diwali", "journal:<slug>"), shown beside each address at /admin/subscribers.
 */
export function NewsletterForm({
  source = "footer",
  className = "mt-8 max-w-md",
  note,
}: {
  source?: string;
  className?: string;
  /** A line under the form, e.g. how often we write. */
  note?: string;
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
          startTransition(async () => setResult(await subscribeAction(email, source)));
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
