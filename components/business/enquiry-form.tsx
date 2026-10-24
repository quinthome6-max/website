"use client";

import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { submitEnquiryAction, type EnquiryResult } from "@/app/actions/enquiry";
import { gaEvent } from "@/lib/analytics/ga4";
import { track } from "@/lib/analytics/pixel";

const SPACES = ["Hotel", "Restaurant or café", "Retail store", "Office", "Spa or salon", "Other"];

/**
 * The /businesses enquiry form. Sends through submitEnquiryAction, which
 * emails the team and keeps a copy; a sent enquiry is counted as a lead in
 * GA4 (generate_lead) and Meta (Lead).
 */
export function EnquiryForm() {
  const [result, setResult] = useState<EnquiryResult | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef(0);
  const touch = () => {
    if (!startedAt.current) startedAt.current = Date.now();
  };

  if (result?.ok) {
    return (
      <div className="mt-10 border-t border-[color:var(--color-stardust)]/20 pt-10" role="status">
        <p className="font-[family-name:var(--font-serif)] text-[1.5rem] text-[color:var(--color-stardust)]">
          Thank you.
        </p>
        <p className="mt-3 max-w-[48ch] text-[1rem] leading-[1.6] text-[color:var(--color-stardust)]/80">
          {result.message} If it&rsquo;s urgent, message us on WhatsApp or write to
          hello@quinthome.in.
        </p>
      </div>
    );
  }

  const bad = (f: EnquiryResult["field"]) =>
    result && !result.ok && result.field === f ? "border-[color:var(--color-clay)]" : "";

  return (
    <form
      noValidate
      onFocus={touch}
      onSubmit={(e) => {
        e.preventDefault();
        touch();
        const d = new FormData(e.currentTarget);
        const get = (k: string) => String(d.get(k) ?? "");
        startTransition(async () => {
          const res = await submitEnquiryAction({
            company: get("company"),
            name: get("name"),
            email: get("email"),
            phone: get("phone"),
            space: get("space"),
            note: get("note"),
            website: get("website"),
            startedAt: startedAt.current,
          });
          setResult(res);
          if (res.ok) {
            gaEvent("generate_lead", { lead_source: "businesses_form", space: get("space") || undefined });
            track("Lead", { content_name: "Business enquiry" });
          }
        });
      }}
      className="mt-10 grid gap-7 md:grid-cols-2 md:gap-x-10"
    >
      <Field name="company" label="Company" placeholder="Business or brand name" autoComplete="organization" className={bad("company")} />
      <Field name="name" label="Your name" placeholder="First and last" autoComplete="name" className={bad("name")} />
      <Field name="email" label="Email" placeholder="you@company.com" type="email" autoComplete="email" inputMode="email" className={bad("email")} />
      <Field name="phone" label="Mobile number" placeholder="+91 98765 43210" type="tel" autoComplete="tel" inputMode="tel" className={bad("phone")} />
      <label className="block">
        <span className="text-[0.6rem] uppercase tracking-[0.32em] text-[color:var(--color-stardust)]/60">
          Type of space
        </span>
        <select
          name="space"
          defaultValue=""
          className="mt-2 w-[100%] border-b border-[color:var(--color-stardust)]/25 bg-transparent py-2.5 text-[0.96rem] text-[color:var(--color-stardust)] outline-none focus:border-[color:var(--color-stardust)]"
        >
          <option value="" className="text-[color:var(--color-charcoal)]">
            Choose one
          </option>
          {SPACES.map((s) => (
            <option key={s} value={s} className="text-[color:var(--color-charcoal)]">
              {s}
            </option>
          ))}
        </select>
      </label>
      <div className="md:col-span-2">
        <Field name="note" label="A note" placeholder="Area, number of sites, or anything specific." textarea />
      </div>

      {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
      <label aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <div className="md:col-span-2 mt-2 flex flex-wrap items-center justify-between gap-4">
        {result && !result.ok ? (
          <p role="alert" className="text-[0.86rem] text-[color:var(--color-ivory)]">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[color:var(--color-clay)] align-middle" />
            {result.message}
          </p>
        ) : (
          <p className="text-[0.62rem] uppercase tracking-[0.32em] text-[color:var(--color-stardust)]/55">
            Or write directly:{" "}
            <a
              href="mailto:hello@quinthome.in"
              className="underline-offset-4 hover:text-[color:var(--color-aerial-soft)] hover:underline"
            >
              hello@quinthome.in
            </a>
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex h-12 items-center justify-center gap-3 bg-[color:var(--color-clay)] px-8 text-[0.72rem] uppercase tracking-[0.32em] text-[color:var(--color-ivory)] transition-colors duration-500 hover:bg-[color:var(--color-clay-deep)] disabled:opacity-60"
        >
          {pending ? "Sending…" : "Submit enquiry"}
          {!pending && (
            <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = "text",
  textarea = false,
  autoComplete,
  inputMode,
  className,
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
  autoComplete?: string;
  inputMode?: "email" | "tel" | "text";
  className?: string;
}) {
  const base =
    "mt-2 w-[100%] border-b border-[color:var(--color-stardust)]/25 bg-transparent py-2.5 text-[0.96rem] text-[color:var(--color-stardust)] placeholder:text-[color:var(--color-stardust)]/40 outline-none focus:border-[color:var(--color-stardust)]";
  return (
    <label className="block">
      <span className="text-[0.6rem] uppercase tracking-[0.32em] text-[color:var(--color-stardust)]/60">
        {label}
      </span>
      {textarea ? (
        <textarea name={name} rows={4} maxLength={3000} placeholder={placeholder} className={cn(base, "resize-none", className)} />
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className={cn(base, className)}
        />
      )}
    </label>
  );
}
