"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { submitReviewAction, type ReviewResult } from "@/app/actions/reviews";

const RATING_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/**
 * "Write a review" and its form, in a native <dialog> (a bottom sheet on
 * phones). Also opens when the page is visited at #write-review, which is
 * where "Be the first to review" under the product name points.
 */
export function WriteReview({ slug, productName }: { slug: string; productName: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [pending, startTransition] = useTransition();
  const openedAt = useRef(0);

  const show = () => {
    openedAt.current = Date.now();
    setResult(null);
    ref.current?.showModal();
    setOpen(true);
  };
  const close = () => ref.current?.close();

  // The link under the product name lands here.
  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#write-review" && !ref.current?.open) show();
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [open]);

  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form);
    startTransition(async () => {
      const res = await submitReviewAction({
        slug,
        rating,
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        city: String(data.get("city") ?? ""),
        title: String(data.get("title") ?? ""),
        body: String(data.get("body") ?? ""),
        website: String(data.get("website") ?? ""),
        openedAt: openedAt.current,
      });
      setResult(res);
      if (res.ok) {
        form.reset();
        setRating(0);
      }
    });
  };

  const field =
    "mt-1.5 w-full border border-[color:var(--color-rule)] bg-[color:var(--color-white)] px-3.5 py-3 text-[0.95rem] text-[color:var(--color-charcoal)] outline-none transition-colors focus:border-[color:var(--color-charcoal)]";
  const label = "text-[0.66rem] uppercase tracking-[0.2em] text-[color:var(--color-charcoal-soft)]";
  const bad = (f: ReviewResult["field"]) =>
    result && !result.ok && result.field === f ? "border-[color:var(--color-clay)]" : "";
  const shown = hover || rating;

  return (
    <>
      <button
        id="write-review"
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        className="inline-flex h-12 scroll-mt-28 items-center justify-center border border-[color:var(--color-charcoal)] px-7 text-[0.72rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal)] transition-colors hover:bg-[color:var(--color-charcoal)] hover:text-[color:var(--color-ivory)]"
      >
        Write a review
      </button>

      <dialog
        ref={ref}
        aria-labelledby="write-review-title"
        onClose={() => {
          setOpen(false);
          if (window.location.hash === "#write-review") {
            history.replaceState(null, "", window.location.pathname + window.location.search);
          }
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-0 mt-auto max-h-[92vh] w-full max-w-none overflow-y-auto rounded-t-[14px] bg-[color:var(--color-white)] p-0 text-[color:var(--color-charcoal)] backdrop:bg-[color:var(--color-charcoal)]/45 sm:m-auto sm:max-w-[34rem] sm:rounded-[8px]"
      >
        <div className="px-5 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                id="write-review-title"
                className="font-[family-name:var(--font-serif)] text-[1.35rem] leading-tight"
              >
                Review {productName}
              </p>
              <p className="mt-1 text-[0.82rem] text-[color:var(--color-charcoal-soft)]">
                Reviews are read before they appear on the page.
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

          {result?.ok ? (
            <div className="py-10 text-center">
              <p className="font-[family-name:var(--font-serif)] text-[1.2rem]">Thank you.</p>
              <p className="mx-auto mt-2 max-w-[32ch] text-[0.9rem] leading-[1.55] text-[color:var(--color-charcoal-soft)]">
                {result.message}
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-6 inline-flex h-12 items-center justify-center bg-[color:var(--color-charcoal)] px-8 text-[0.72rem] uppercase tracking-[0.28em] text-[color:var(--color-ivory)]"
              >
                Done
              </button>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                submit(e.currentTarget);
              }}
              className="mt-5 grid gap-4"
            >
              <fieldset>
                <legend className={label}>Your rating</legend>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(n)}>
                        <input
                          type="radio"
                          name="rating"
                          value={n}
                          checked={rating === n}
                          onChange={() => setRating(n)}
                          className="peer sr-only"
                        />
                        <span className="sr-only">
                          {n} {n === 1 ? "star" : "stars"}
                        </span>
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className={cn(
                            "h-8 w-8 rounded-sm text-[color:var(--color-clay)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[color:var(--color-clay)]",
                            n <= shown ? "" : "text-[color:var(--color-clay)]/40"
                          )}
                          fill={n <= shown ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth={n <= shown ? 0 : 1.4}
                          strokeLinejoin="round"
                        >
                          <path d="M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z" />
                        </svg>
                      </label>
                    ))}
                  </div>
                  <span className="text-[0.86rem] text-[color:var(--color-charcoal-soft)]">
                    {RATING_WORDS[shown]}
                  </span>
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={label}>Name</span>
                  <input name="name" autoComplete="name" maxLength={60} className={cn(field, bad("name"))} />
                </label>
                <label className="block">
                  <span className={label}>City (optional)</span>
                  <input name="city" autoComplete="address-level2" maxLength={40} className={field} />
                </label>
              </div>
              <label className="block">
                <span className={label}>Email – never shown</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={200}
                  className={cn(field, bad("email"))}
                />
              </label>
              <label className="block">
                <span className={label}>Headline (optional)</span>
                <input name="title" maxLength={80} className={field} />
              </label>
              <label className="block">
                <span className={label}>Your review</span>
                <textarea
                  name="body"
                  rows={5}
                  maxLength={1500}
                  placeholder="How does it look, sound and scent your room?"
                  className={cn(field, "resize-y leading-[1.55]", bad("body"))}
                />
              </label>

              {/* Honeypot: hidden from people and screen readers, filled by bots. */}
              <label aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>

              {result && !result.ok && (
                <p role="alert" className="text-[0.86rem] text-[color:var(--color-clay)]">
                  {result.message}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-1 inline-flex h-12 w-full items-center justify-center bg-[color:var(--color-charcoal)] text-[0.72rem] uppercase tracking-[0.28em] text-[color:var(--color-ivory)] transition-colors hover:bg-[color:var(--color-clay-deep)] disabled:opacity-60"
              >
                {pending ? "Sending…" : "Submit review"}
              </button>
              <p className="text-[0.72rem] leading-[1.5] text-[color:var(--color-charcoal-soft)]">
                Your name and city appear with your review. Your email is only
                used if we need to ask about your order.
              </p>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
