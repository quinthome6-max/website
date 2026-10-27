import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The back office's building blocks: page header, boxes, figures, badges and
 * buttons, in the shop's palette. Plain components, usable from server and
 * client code alike.
 */

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 bg-[color:var(--color-verdant)] px-5 py-2.5 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-[color:var(--color-ivory)] transition-colors hover:bg-[color:var(--color-charcoal)] disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 border border-[color:var(--color-charcoal)]/25 bg-[color:var(--color-white)] px-5 py-2.5 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-[color:var(--color-charcoal)] transition-colors hover:border-[color:var(--color-charcoal)] disabled:cursor-not-allowed disabled:opacity-50",
  quiet:
    "inline-flex items-center gap-1.5 text-[0.66rem] font-medium uppercase tracking-[0.18em] text-[color:var(--color-charcoal-soft)] underline-offset-4 transition-colors hover:text-[color:var(--color-charcoal)] hover:underline",
  danger:
    "inline-flex items-center gap-1.5 text-[0.66rem] font-medium uppercase tracking-[0.18em] text-[color:var(--color-clay-text)] underline-offset-4 hover:underline",
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[0.62rem] font-medium uppercase tracking-[0.28em] text-[color:var(--color-aerial-deep)]">
            {eyebrow}
          </p>
        )}
        <h1
          className="mt-1.5 text-balance"
          style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.6rem, 2.4vw, 2.1rem)", lineHeight: 1.1, fontWeight: 400 }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[60ch] text-[0.85rem] leading-[1.6] text-[color:var(--color-charcoal-soft)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

export function Box({
  title,
  action,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "border border-[color:var(--color-rule)] bg-[color:var(--color-white)] shadow-[0_1px_0_rgba(58,53,50,0.03)]",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--color-rule)] px-5 py-3.5">
          <h2 className="font-sans text-[0.66rem] font-semibold uppercase leading-[1.65] tracking-[0.22em] text-[color:var(--color-charcoal)]">
            {title}
          </h2>
          {action}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/** A figure with its label, for the top of a page or inside a dashboard box. */
export function Figure({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "warn" }) {
  return (
    <div>
      <p className="text-[0.58rem] font-medium uppercase tracking-[0.24em] text-[color:var(--color-charcoal-soft)]">{label}</p>
      <p
        className={cn("mt-1 tabular-nums", tone === "warn" && "text-[color:var(--color-clay-text)]")}
        style={{ fontFamily: "var(--font-serif)", fontSize: "1.55rem", lineHeight: 1.15 }}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[0.74rem] text-[color:var(--color-charcoal-soft)]">{hint}</p>}
    </div>
  );
}

/** One tile on the dashboard: an icon, what the section is, its numbers, and a way in. */
export function Tile({
  href,
  icon,
  title,
  blurb,
  children,
  cta = "Open",
  extra,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  blurb: string;
  children?: ReactNode;
  cta?: string;
  extra?: ReactNode;
}) {
  return (
    <section className="group relative flex flex-col border border-[color:var(--color-rule)] bg-[color:var(--color-white)] p-5 transition-[border-color,box-shadow] hover:border-[color:var(--color-charcoal)]/30 hover:shadow-[0_6px_24px_-12px_rgba(41,51,41,0.25)]">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center bg-[color:var(--color-stardust-soft)] text-[color:var(--color-verdant)]">
          {icon}
        </span>
        {extra}
      </div>
      <h2 className="mt-4 font-sans text-[0.72rem] font-semibold uppercase leading-[1.65] tracking-[0.2em]">{title}</h2>
      <p className="mt-1 text-[0.8rem] leading-[1.55] text-[color:var(--color-charcoal-soft)]">{blurb}</p>
      {children && <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4">{children}</div>}
      <Link
        href={href}
        className="mt-auto pt-5 text-[0.66rem] font-medium uppercase tracking-[0.2em] text-[color:var(--color-verdant)] after:absolute after:inset-0 group-hover:text-[color:var(--color-clay-text)]"
      >
        {cta} →
      </Link>
    </section>
  );
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-[color:var(--color-stardust)] text-[color:var(--color-charcoal)]",
  sent: "bg-[color:var(--color-aerial)]/20 text-[color:var(--color-aerial-deep)]",
  accepted: "bg-[color:var(--color-verdant)] text-[color:var(--color-ivory)]",
  declined: "bg-[color:var(--color-clay-text)]/12 text-[color:var(--color-clay-text)]",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[0.56rem] font-semibold uppercase tracking-[0.18em]",
        STATUS_STYLE[status] ?? STATUS_STYLE.draft
      )}
    >
      {label ?? status}
    </span>
  );
}

export function Notice({ title, children, tone = "info" }: { title: string; children?: ReactNode; tone?: "info" | "warn" | "ok" }) {
  return (
    <div
      className={cn(
        "mb-6 border-l-2 bg-[color:var(--color-white)] px-4 py-3",
        tone === "warn" ? "border-[color:var(--color-clay-text)]" : tone === "ok" ? "border-[color:var(--color-verdant)]" : "border-[color:var(--color-aerial)]"
      )}
    >
      <p className="text-[0.82rem] font-medium">{title}</p>
      {children && <div className="mt-1 text-[0.78rem] leading-[1.6] text-[color:var(--color-charcoal-soft)]">{children}</div>}
    </div>
  );
}
