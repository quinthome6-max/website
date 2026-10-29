"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { DIWALI_GUIDE } from "@/lib/seasonal";

/**
 * Diwali on the homepage, as a popup: our gifting picks by email, and the
 * gifting guide. Rendered only during the season (home-sections checks
 * lib/seasonal.ts), and shown at most once per visitor.
 *
 * It waits — eight seconds, or a third of the way down the page — rather than
 * covering the page on arrival: Google treats a popup that hides the content
 * the moment a visitor lands from search as intrusive, and ad visitors should
 * see the page they clicked through to first. On a phone it is a panel from
 * the bottom with the "Have a शुद्ध Diwali" picture as a banner; on a
 * computer, a card in the middle with the whole picture beside the form.
 */

const PICTURE = "/images/diwali/shuddh-diwali-2026.webp";

const KEY = "qh:diwali-popup-2026";
const DELAY_MS = 8000;
const SCROLL_SHARE = 0.33;

function seenBefore(): boolean {
  try {
    return Boolean(window.localStorage.getItem(KEY));
  } catch {
    return false;
  }
}
function remember(how: "closed" | "subscribed" | "guide"): void {
  try {
    window.localStorage.setItem(KEY, how);
  } catch {
    // Private mode or storage blocked: it may show again on the next visit.
  }
}

export function DiwaliPopup() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false); // drives the fade/slide in
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  // When to appear.
  useEffect(() => {
    if (seenBefore()) return;
    let timer = 0;
    const stop = () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
    const show = () => {
      stop();
      setOpen(true);
    };
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= SCROLL_SHARE) show();
    }
    timer = window.setTimeout(show, DELAY_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    return stop;
  }, []);

  const close = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    if (!seenBefore()) remember("closed");
    setShown(false);
    window.setTimeout(() => setOpen(false), 250);
  }, []);

  // While open: fade in, focus the dialog, Escape closes, Tab stays inside,
  // and the page behind holds still.
  useEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(() => setShown(true));
    const dialog = dialogRef.current;
    dialog?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const items = dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])");
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    window.__lenis?.stop();

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      root.style.overflow = before;
      window.__lenis?.start();
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:px-6">
      {/* The backdrop: a click outside the card closes it. */}
      <div
        aria-hidden
        onClick={close}
        className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="diwali-popup-title"
        tabIndex={-1}
        className={`relative w-full max-w-[52rem] bg-[color:var(--color-stardust-soft)] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] outline-none transition-[opacity,transform] duration-300 ease-[var(--ease-quint)] md:grid md:grid-cols-[21rem_1fr] ${
          shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        {/* Phones: a banner across the top, cropped to the lettering, the gifts
            and the Monolith. Computers: the whole 4:5 picture (21 × 26.25 rem). */}
        <div className="relative h-[14rem] md:h-auto md:min-h-[26.25rem]">
          <Image
            src={PICTURE}
            alt="Have a Shuddh Diwali: the Monolith diffuser and The Study soy candle on a festive table with diyas and gifts"
            fill
            sizes="(min-width: 768px) 21rem, 100vw"
            className="object-cover object-[50%_36%] md:object-center"
          />
        </div>

        <div className="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 md:px-10 md:py-11">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-stardust-soft)]/85 text-[color:var(--color-charcoal)] backdrop-blur-sm transition-colors hover:bg-[color:var(--color-stardust-soft)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="h-5 w-5" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          <p className="font-eyebrow">Diwali · Sunday 8 November</p>
          <h2
            id="diwali-popup-title"
            className="mt-4 max-w-[18ch] text-balance"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-2xl)",
              lineHeight: 1.12,
              letterSpacing: "-0.012em",
              fontWeight: 400,
            }}
          >
            Our Diwali gifting picks,{" "}
            <em className="text-[color:var(--color-aerial-deep)]">in your inbox.</em>
          </h2>
          {/* Hidden on phones, where the picture already says it and the panel
              should stay short. */}
          <p className="mt-4 hidden max-w-[40ch] text-[0.9rem] leading-[1.65] text-[color:var(--color-charcoal-soft)] md:block">
            Gifts for the home that stay in use long after the festival, from hand-poured soy candles to waterless
            diffusers.
          </p>

          <NewsletterForm
            source="diwali"
            className="mt-6 max-w-md"
            note="Occasional emails, never daily. Unsubscribe any time."
            onResult={(res) => {
              if (!res.ok) return;
              remember("subscribed");
              closeTimer.current = window.setTimeout(close, 2600);
            }}
          />

          <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <Link
              href={DIWALI_GUIDE}
              onClick={() => remember("guide")}
              className="border-b border-[color:var(--color-charcoal)] pb-1 text-[0.66rem] uppercase tracking-[0.28em] transition-colors hover:border-[color:var(--color-clay)] hover:text-[color:var(--color-clay)]"
            >
              Read the gifting guide →
            </Link>
            <button
              type="button"
              onClick={close}
              className="text-[0.66rem] uppercase tracking-[0.24em] text-[color:var(--color-charcoal-soft)] transition-colors hover:text-[color:var(--color-charcoal)]"
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
