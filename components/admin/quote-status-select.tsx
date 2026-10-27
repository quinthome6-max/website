"use client";

import { useTransition } from "react";
import { setQuoteStatusAction } from "@/app/admin/(protected)/quotes/actions";
import { QUOTE_STATUSES, type QuoteStatus } from "@/lib/admin/quotes/types";
import { cn } from "@/lib/utils";

const TONE: Record<QuoteStatus, string> = {
  draft: "bg-[color:var(--color-stardust)] text-[color:var(--color-charcoal)]",
  sent: "bg-[color:var(--color-aerial)]/20 text-[color:var(--color-aerial-deep)]",
  accepted: "bg-[color:var(--color-verdant)] text-[color:var(--color-ivory)]",
  declined: "bg-[color:var(--color-clay-text)]/12 text-[color:var(--color-clay-text)]",
};

/** The quote's status as a menu that saves the moment another is chosen. */
export function QuoteStatusSelect({ id, status, label }: { id: string; status: QuoteStatus; label: string }) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={label}
      defaultValue={status}
      disabled={pending}
      onChange={(e) => {
        const data = new FormData();
        data.set("id", id);
        data.set("status", e.target.value);
        start(() => setQuoteStatusAction(data));
      }}
      className={cn(
        "cursor-pointer border-0 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] outline-none",
        TONE[status],
        pending && "opacity-60"
      )}
    >
      {QUOTE_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
