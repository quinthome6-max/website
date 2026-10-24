"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatINR } from "@/lib/utils";
import { DiscountField } from "@/components/cart/discount-field";
import { FadeUp } from "@/components/motion/fade-up";
import { Monogram } from "@/components/brand/logo";
import { FREE_SHIPPING_FROM } from "@/lib/checkout-config";
import { deliveryEstimate, deliveryEstimateFromTransit } from "@/lib/delivery";
import { saveCheckoutProgress } from "@/app/actions/checkout-progress";
import { claritySessionRef } from "@/lib/analytics/clarity-ref";
import type { CheckoutPrefill } from "@/lib/checkout-prefill";

const inputClass =
  "w-[100%] border-b border-[color:var(--color-rule)] bg-transparent py-2.5 text-[0.95rem] outline-none transition-colors placeholder:text-[color:var(--color-charcoal-soft)]/60 focus:border-[color:var(--color-charcoal)]";

const labelClass =
  "block text-[0.6rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)]";

function Field({
  name,
  label,
  type = "text",
  required = false,
  className = "",
  // Anything else (value/onChange, inputMode, maxLength…) goes straight to the
  // input, so a controlled field like the PIN code behaves as written.
  ...inputProps
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type" | "required" | "className">) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className={inputClass}
        {...inputProps}
      />
    </label>
  );
}

/**
 * Details remembered on this device for the next order, when the customer
 * leaves "Remember my details" ticked. Kept in the browser only — never sent
 * anywhere by this — and cleared by "Not you? Clear".
 */
const REMEMBER_KEY = "quint_checkout_details";
const FIELD_NAMES = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "address1",
  "address2",
  "city",
  "state",
  "zip",
] as const;

function readRemembered(): Partial<CheckoutPrefill> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    return raw ? (JSON.parse(raw) as Partial<CheckoutPrefill>) : null;
  } catch {
    return null;
  }
}

export function CheckoutForm({
  shippingFlat,
  notice = null,
  prefill = null,
}: {
  shippingFlat: number;
  /** Why the payment could not be started, when the customer was sent back. */
  notice?: string | null;
  /** Details already on record for this bag, from the server. */
  prefill?: CheckoutPrefill | null;
}) {
  const { cart } = useCart();

  // What to fill the form in with: this bag's own record first (it is the
  // newest), then whatever this device remembered from a previous order. The
  // form itself only renders once the bag has loaded in the browser, so
  // reading the device here never disagrees with a server render.
  const [initial] = useState<Partial<CheckoutPrefill> | null>(() => {
    const device = readRemembered();
    if (!prefill && !device) return null;
    const merged: Partial<CheckoutPrefill> = { ...(device ?? {}) };
    for (const k of FIELD_NAMES) if (prefill?.[k]) merged[k] = prefill[k];
    return merged;
  });
  const [welcome, setWelcome] = useState(Boolean(initial?.email || initial?.phone));
  const [remember, setRemember] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  const forget = () => {
    try {
      window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* nothing stored */
    }
    const form = formRef.current;
    if (form) {
      for (const k of FIELD_NAMES) {
        const el = form.elements.namedItem(k) as HTMLInputElement | null;
        if (el) el.value = "";
      }
    }
    setPin("");
    setWelcome(false);
  };

  const rememberOnSubmit = (form: HTMLFormElement) => {
    try {
      if (!remember) {
        window.localStorage.removeItem(REMEMBER_KEY);
        return;
      }
      const data: Partial<CheckoutPrefill> = {};
      for (const k of FIELD_NAMES) {
        data[k] = (form.elements.namedItem(k) as HTMLInputElement | null)?.value.trim() ?? "";
      }
      window.localStorage.setItem(REMEMBER_KEY, JSON.stringify(data));
    } catch {
      /* private mode or storage full: just not remembered */
    }
  };
  // Worked out on the customer's own clock after mount, so the date always
  // agrees with their device and the server never renders a stale one.
  const [eta, setEta] = useState<string | null>(null);
  useEffect(() => setEta(deliveryEstimate()), []);
  const lines = cart?.lines ?? [];

  // Once a full PIN is typed we ask Shiprocket what the couriers actually
  // quote for that pincode, and show that instead of our standing window.
  // Anything less than a clean answer leaves the static estimate in place —
  // a shipping lookup must never be able to hold up a sale.
  const [live, setLive] = useState<
    { etd: string | null; days: number | null; courier: string } | null
  >(null);
  const [pin, setPin] = useState(initial?.zip ?? "");

  const shipWeight = Math.max(
    0.5,
    lines.reduce((sum, l) => sum + (l.weightKg || 0.3) * l.quantity, 0)
  );

  useEffect(() => {
    if (!/^\d{6}$/.test(pin)) {
      setLive(null);
      return;
    }
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/delivery/estimate?pin=${pin}&weight=${shipWeight.toFixed(2)}`,
          { signal: ac.signal }
        );
        const data = await res.json();
        setLive(data.status === "ok" ? data : null);
      } catch {
        setLive(null); // keep the static estimate
      }
    }, 400); // let them finish typing
    return () => {
      ac.abort();
      clearTimeout(t);
    };
  }, [pin, shipWeight]);

  // Saves the details typed so far as an unfinished checkout (see
  // app/actions/checkout-progress.ts), so a customer who leaves before paying
  // can still be followed up. Runs when a field loses focus, only once there
  // is an email or phone, only when something changed, and in the background:
  // it never waits on, or reports anything to, the customer.
  const lastSaved = useRef("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);
  const saveProgress = (form: HTMLFormElement) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const get = (name: string) =>
        (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? "";
      const fields = {
        firstName: get("firstName"),
        lastName: get("lastName"),
        email: get("email"),
        phone: get("phone"),
        address1: get("address1"),
        address2: get("address2"),
        city: get("city"),
        state: get("state"),
        zip: get("zip"),
      };
      const hasEmail = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(fields.email);
      const hasPhone = fields.phone.replace(/\D/g, "").length >= 10;
      if (!hasEmail && !hasPhone) return;
      const key = JSON.stringify(fields);
      if (key === lastSaved.current) return;
      lastSaved.current = key;
      // Kept on this device as they type, not only when they pay, so someone
      // who leaves and comes back on their own finds the form filled in even
      // after the bag itself has expired.
      if (remember) {
        try {
          window.localStorage.setItem(REMEMBER_KEY, key);
        } catch {
          /* private mode or storage full: just not remembered */
        }
      }
      saveCheckoutProgress(fields).catch(() => {
        lastSaved.current = ""; // try again on the next change
      });
    }, 600);
  };

  const subtotal = cart?.subtotal ?? 0;
  const discount = cart?.discount ?? 0;
  const goods = cart?.total ?? subtotal;
  const shipping = goods >= FREE_SHIPPING_FROM ? 0 : shippingFlat;
  const total = goods + shipping;

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-[var(--container-content)] flex-col items-center px-6 py-[var(--spacing-section)] text-center md:px-10">
        <FadeUp>
          <p className="font-eyebrow">
            <Monogram className="mr-1.5 inline-block h-[0.9em] w-[0.9em] align-[-0.12em]" />
            Checkout
          </p>
          <h1
            className="mt-7 max-w-[18ch]"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-4xl)",
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
            }}
          >
            There is nothing to check out.
          </h1>
          <Link
            href="/range"
            className="group mt-10 inline-flex items-center gap-3 bg-[color:var(--color-charcoal)] px-8 py-4 text-[0.75rem] uppercase tracking-[0.32em] text-[color:var(--color-ivory)] transition-colors duration-500 hover:bg-[color:var(--color-clay-deep)]"
          >
            Shop the range
            <span className="transition-transform duration-500 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </FadeUp>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[var(--container-page)] px-6 py-[var(--spacing-section-sm)] md:px-10">
      <FadeUp>
        <div className="border-b border-[color:var(--color-rule)] pb-8">
          <p className="font-eyebrow">
            <Monogram className="mr-1.5 inline-block h-[0.9em] w-[0.9em] align-[-0.12em]" />
            Checkout
          </p>
          <h1
            className="mt-6"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-4xl)",
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              fontWeight: 400,
            }}
          >
            Where should it{" "}
            <em className="text-[color:var(--color-aerial-deep)]">go?</em>
          </h1>
        </div>
      </FadeUp>

      {notice && (
        <p
          role="alert"
          className="mt-8 border-l-2 border-[color:var(--color-clay)] bg-[color:var(--color-stardust-soft)] p-4 text-[0.85rem] leading-[1.65] text-[color:var(--color-charcoal)]"
        >
          {notice}
        </p>
      )}

      {/* A plain form post: the route builds the signed PayU payload server-side
          so the merchant salt never reaches the browser. */}
      {/* Every field carries a "shipping …" autofill token, so Chrome, Safari
          and password managers offer the customer's saved address and fill
          the whole form in one tap. A site cannot read saved addresses
          itself; it can only label the fields well enough to be offered them. */}
      <form
        method="POST"
        autoComplete="on"
        action="/api/payu/initiate"
        ref={formRef}
        onBlur={(e) => saveProgress(e.currentTarget)}
        // Pay records everything itself; a save racing it would only duplicate.
        onSubmit={(e) => {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          rememberOnSubmit(e.currentTarget);
          // Which Clarity recording this order belongs to (see clarity-ref).
          const clarity = e.currentTarget.elements.namedItem("clarity");
          if (clarity instanceof HTMLInputElement) clarity.value = claritySessionRef(document.cookie);
        }}
        className="grid gap-12 pt-10 md:grid-cols-12 md:gap-16"
      >
        <input type="hidden" name="clarity" defaultValue="" />
        <div className="md:col-span-7">
          <FadeUp>
            {welcome && (
              <p className="mb-8 flex flex-wrap items-baseline justify-between gap-3 border-l-2 border-[color:var(--color-aerial)] bg-[color:var(--color-stardust-soft)] px-4 py-3 text-[0.85rem] leading-[1.6]">
                <span>
                  Welcome back{initial?.firstName ? `, ${initial.firstName}` : ""}. We&rsquo;ve filled in
                  your details — check them and pay.
                </span>
                <button
                  type="button"
                  onClick={forget}
                  className="text-[0.72rem] uppercase tracking-[0.2em] text-[color:var(--color-charcoal-soft)] underline-offset-4 hover:text-[color:var(--color-charcoal)] hover:underline"
                >
                  Not you? Clear
                </button>
              </p>
            )}
            <p className="font-eyebrow">Contact</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <Field
                name="firstName"
                defaultValue={initial?.firstName ?? ""}
                label="First name"
                required
                autoComplete="shipping given-name"
              />
              <Field
                name="lastName"
                defaultValue={initial?.lastName ?? ""}
                label="Last name"
                autoComplete="shipping family-name"
              />
              <Field
                name="email"
                defaultValue={initial?.email ?? ""}
                label="Email"
                type="email"
                required
                autoComplete="shipping email"
                inputMode="email"
                placeholder="you@example.com"
              />
              <Field
                name="phone"
                defaultValue={initial?.phone ?? ""}
                label="Phone"
                type="tel"
                required
                autoComplete="shipping tel"
                inputMode="tel"
                placeholder="10-digit mobile"
                // The hyphen is escaped on purpose: browsers compile patterns
                // in a mode where a bare "-" in a class is an error, and an
                // invalid pattern is ignored rather than enforced.
                pattern="[0-9+\s\-]{10,16}"
                title="A 10-digit mobile number"
              />
            </div>

            <p className="font-eyebrow mt-12">Shipping address</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <Field
                name="address1"
                defaultValue={initial?.address1 ?? ""}
                label="Address"
                required
                autoComplete="shipping address-line1"
                className="sm:col-span-2"
              />
              <Field
                name="address2"
                defaultValue={initial?.address2 ?? ""}
                label="Apartment, floor (optional)"
                autoComplete="shipping address-line2"
                className="sm:col-span-2"
              />
              <Field name="city" label="City" required autoComplete="shipping address-level2" defaultValue={initial?.city ?? ""} />
              <Field name="state" label="State" required autoComplete="shipping address-level1" defaultValue={initial?.state ?? ""} />
              <Field
                name="zip"
                label="PIN code"
                required
                autoComplete="shipping postal-code"
                pattern="[0-9]{6}"
                placeholder="400019"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
              <label className="block">
                <span className={labelClass}>Country</span>
                <input
                  name="country"
                  autoComplete="shipping country-name"
                  value="India"
                  readOnly
                  className={`${inputClass} text-[color:var(--color-charcoal-soft)]`}
                />
              </label>
            </div>

            <p className="mt-10 text-[0.78rem] leading-[1.7] text-[color:var(--color-charcoal-soft)]">
              We ship within India only. Your details are used to fulfil this
              order, and are saved as you type so you can finish it later if
              you are interrupted — see our{" "}
              <Link
                href="/privacy"
                className="underline-offset-4 hover:text-[color:var(--color-charcoal)] hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>

            <label className="mt-6 flex cursor-pointer items-center gap-3 text-[0.82rem] text-[color:var(--color-charcoal)]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => {
                  setRemember(e.target.checked);
                  // Unticked means forget now, not only at the next payment.
                  if (!e.target.checked) {
                    try {
                      window.localStorage.removeItem(REMEMBER_KEY);
                    } catch {
                      /* nothing stored */
                    }
                  }
                }}
                className="h-4 w-4 accent-[color:var(--color-charcoal)]"
              />
              Remember my details on this device for next time
            </label>

            <Link
              href="/cart"
              className="mt-8 inline-block text-[0.72rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)] underline-offset-4 transition-colors duration-500 hover:text-[color:var(--color-charcoal)] hover:underline"
            >
              ← Back to bag
            </Link>
          </FadeUp>
        </div>

        {/* Order summary */}
        <div className="md:col-span-5">
          <div className="border border-[color:var(--color-rule)] bg-[color:var(--color-stardust-soft)] p-7 md:sticky md:top-32 md:p-8">
            <p className="font-eyebrow">Your order</p>

            <ul className="mt-6 grid gap-4">
              {lines.map((l) => (
                <li key={l.id} className="flex items-baseline justify-between gap-4">
                  <span className="text-[0.9rem] leading-snug">
                    {l.productTitle}
                    {l.quantity > 1 && (
                      <span className="text-[color:var(--color-charcoal-soft)]">
                        {" "}
                        × {l.quantity}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[0.9rem] tabular-nums">
                    {formatINR(l.price * l.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-6 grid gap-3 border-t border-[color:var(--color-rule)] pt-5 text-[0.9rem]">
              <div className="flex items-baseline justify-between">
                <dt className="text-[color:var(--color-charcoal-soft)]">Subtotal</dt>
                <dd className="tabular-nums">{formatINR(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex items-baseline justify-between">
                  <dt className="text-[color:var(--color-charcoal-soft)]">
                    Discount
                    {cart?.discountCode ? (
                      <span className="ml-2 text-[0.62rem] uppercase tracking-[0.2em]">
                        {cart.discountCode}
                      </span>
                    ) : null}
                  </dt>
                  <dd className="tabular-nums text-[color:var(--color-clay)]">
                    − {formatINR(discount)}
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <dt className="text-[color:var(--color-charcoal-soft)]">Shipping</dt>
                <dd
                  className={
                    shipping === 0
                      ? "text-[color:var(--color-aerial-deep)]"
                      : "tabular-nums"
                  }
                >
                  {shipping === 0 ? "Complimentary" : formatINR(shipping)}
                </dd>
              </div>
              {(live?.days || eta) && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[color:var(--color-charcoal-soft)]">
                    Estimated delivery
                  </dt>
                  <dd className="text-right text-[color:var(--color-charcoal)]">
                    {live?.days ? deliveryEstimateFromTransit(live.days) : eta}
                    {live?.courier && (
                      <span className="mt-0.5 block text-[0.62rem] uppercase tracking-[0.18em] text-[color:var(--color-charcoal-soft)]">
                        via {live.courier}
                      </span>
                    )}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-5 border-t border-[color:var(--color-rule)] pt-5">
              <DiscountField compact />
            </div>

            <div className="mt-5 flex items-baseline justify-between border-t border-[color:var(--color-rule)] pt-5">
              <span className="text-[0.62rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
                Total
              </span>
              <span
                className="tabular-nums"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--text-2xl)",
                  fontWeight: 400,
                }}
              >
                {formatINR(total)}
              </span>
            </div>

            <button
              type="submit"
              className="group mt-7 flex w-[100%] items-center justify-center gap-3 bg-[color:var(--color-charcoal)] px-8 py-4 text-[0.75rem] uppercase tracking-[0.32em] text-[color:var(--color-ivory)] transition-colors duration-500 hover:bg-[color:var(--color-clay-deep)]"
            >
              Pay {formatINR(total)}
              <span className="transition-transform duration-500 group-hover:translate-x-1">
                →
              </span>
            </button>

            <p className="mt-5 text-[0.75rem] leading-[1.65] text-[color:var(--color-charcoal-soft)]">
              You will be taken to PayU to complete the payment securely. Cards,
              UPI, net banking and wallets are accepted.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
