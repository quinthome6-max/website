"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { oilNoteSummary } from "@/lib/data/oils";
import type { FragranceOil } from "@/lib/types";

/**
 * The included-oil choice as one bar above Add to bag, rather than a wall of
 * tiles between the price and the rest of the page. The bar names the scent
 * already chosen (the first one is preselected, so the shopper can buy without
 * opening it); tapping it opens the photographed tiles in a dialog – a bottom
 * sheet on phones, a centred panel from sm up.
 *
 * A native <dialog> opened with showModal(): it traps focus, closes on Escape
 * and is announced as a dialog, with no script of ours doing any of that.
 */
export function OilPicker({
  oils,
  value,
  onChange,
}: {
  oils: FragranceOil[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const selected = oils.find((o) => o.slug === value) ?? oils[0];

  // The page behind a modal shouldn't scroll under the shopper's thumb.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [open]);

  const show = () => {
    ref.current?.showModal();
    setOpen(true);
  };
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        className="group flex w-full items-center gap-4 border border-[color:var(--color-rule)] bg-[color:var(--color-stardust-soft)] p-2.5 pr-4 text-left transition-colors duration-300 hover:border-[color:var(--color-clay)]"
      >
        <span className="relative block h-14 w-12 shrink-0 overflow-hidden bg-[color:var(--color-white)]">
          <Image
            src={selected.image}
            alt=""
            fill
            sizes="3rem"
            className="object-cover"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="rounded-[4px] bg-[color:var(--color-clay)] px-1.5 py-0.5 text-[0.58rem] font-medium uppercase tracking-[0.12em] text-[color:var(--color-ivory)]">
              Free
            </span>
            <span className="text-[0.66rem] uppercase tracking-[0.16em] text-[color:var(--color-charcoal-soft)]">
              Your 50 ml oil · worth ₹899
            </span>
          </span>
          <span className="mt-1 block truncate font-[family-name:var(--font-serif)] text-[1rem] leading-tight text-[color:var(--color-charcoal)]">
            {selected.name}
            <span className="font-[family-name:var(--font-sans)] text-[0.8rem] text-[color:var(--color-charcoal-soft)]">
              {" "}
              · {oilNoteSummary(selected)}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-[color:var(--color-clay)]">
          Change
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </span>
      </button>

      <dialog
        ref={ref}
        aria-labelledby="oil-picker-title"
        onClose={() => setOpen(false)}
        // A click on the backdrop lands on the <dialog> itself, not its panel.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-0 mt-auto max-h-[88vh] w-full max-w-none overflow-y-auto rounded-t-[14px] bg-[color:var(--color-white)] p-0 text-[color:var(--color-charcoal)] backdrop:bg-[color:var(--color-charcoal)]/45 sm:m-auto sm:max-w-[34rem] sm:rounded-[8px]"
      >
        <div className="px-5 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                id="oil-picker-title"
                className="font-[family-name:var(--font-serif)] text-[1.35rem] leading-tight"
              >
                Choose your free oil
              </p>
              <p className="mt-1 text-[0.82rem] text-[color:var(--color-charcoal-soft)]">
                A 50 ml bottle ships in the box with your diffuser.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="-mr-1 -mt-1 p-1 text-[1rem] text-[color:var(--color-charcoal-soft)] hover:text-[color:var(--color-charcoal)]"
            >
              ✕
            </button>
          </div>

          {/* Native radios under the tiles, so arrow keys and screen readers
              behave as a single choice. */}
          <fieldset className="mt-5 min-w-0">
            <legend className="sr-only">Included oil</legend>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {oils.map((o) => {
                const active = o.slug === selected.slug;
                return (
                  <label
                    key={o.slug}
                    className="group cursor-pointer"
                    title={`${o.name} – ${oilNoteSummary(o)}`}
                  >
                    <input
                      type="radio"
                      name="starting-oil"
                      value={o.slug}
                      checked={active}
                      onChange={() => onChange(o.slug)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "relative block aspect-[4/5] overflow-hidden bg-[color:var(--color-stardust-soft)] outline-offset-2 transition-all duration-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[color:var(--color-clay)]",
                        active
                          ? "ring-2 ring-[color:var(--color-clay)] ring-offset-2 ring-offset-[color:var(--color-white)]"
                          : "opacity-[0.78] group-hover:opacity-100"
                      )}
                    >
                      <Image
                        src={o.image}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 7.5rem, 22vw"
                        className="object-cover"
                      />
                      {o.tier === "hotel-credential" && (
                        <span className="absolute right-0 top-0 bg-[color:var(--color-clay)] px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.1em] text-[color:var(--color-ivory)]">
                          +₹200
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "mt-1.5 block font-[family-name:var(--font-serif)] text-[0.8rem] leading-tight",
                        active
                          ? "text-[color:var(--color-clay)]"
                          : "text-[color:var(--color-charcoal)]"
                      )}
                    >
                      {o.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Live scent profile for the chosen oil, so a name is never a mystery. */}
          <div className="mt-5 border-t border-[color:var(--color-rule)] pt-4">
            <p className="font-[family-name:var(--font-serif)] text-[0.95rem] italic leading-[1.5]">
              {selected.tagline}
            </p>
            <dl className="mt-2.5 grid gap-1.5">
              {([
                ["Top", selected.notes.top],
                ["Heart", selected.notes.heart],
                ["Base", selected.notes.base],
              ] as const).map(([label, notes]) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-11 shrink-0 pt-0.5 text-[0.62rem] uppercase tracking-[0.18em] text-[color:var(--color-charcoal-soft)]">
                    {label}
                  </dt>
                  <dd className="text-[0.84rem] leading-[1.5]">
                    {notes.join(" · ")}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[0.75rem] leading-[1.5] text-[color:var(--color-charcoal-soft)]">
              Hotel Credential oils carry a ₹200 supplement. Swap scents or add
              more anytime.
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            className="mt-5 inline-flex h-12 w-full items-center justify-center bg-[color:var(--color-charcoal)] text-[0.72rem] uppercase tracking-[0.28em] text-[color:var(--color-ivory)] transition-colors hover:bg-[color:var(--color-clay-deep)]"
          >
            Choose {selected.name}
          </button>
        </div>
      </dialog>
    </>
  );
}
