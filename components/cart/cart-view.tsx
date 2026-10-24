"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";
import { formatINR } from "@/lib/utils";
import { DiscountField } from "@/components/cart/discount-field";
import { FadeUp } from "@/components/motion/fade-up";
import { Monogram } from "@/components/brand/logo";
import { FREE_SHIPPING_FROM, shippingFor } from "@/lib/checkout-config";
import {
  cartHasRealGiftLine,
  giftDisplayTitle,
  giftOnLine,
  lineIsGift,
  otherAttributes,
} from "@/lib/cart-gift";
import { GiftLine, InTheBox } from "./gift-line";

export function CartView({ notice = null }: { notice?: string | null }) {
  // headlessCheckout comes from the provider (set in the root layout) so the
  // bag and the drawer can never disagree about where checkout goes.
  const { cart, update, remove, pending, headlessCheckout } = useCart();
  const lines = cart?.lines ?? [];
  const hasRealGift = cartHasRealGiftLine(lines);
  const subtotal = cart?.subtotal ?? 0;
  const discount = cart?.discount ?? 0;
  // Goods after any code. Shipping is judged on what is actually being paid
  // for the goods, which is how Shopify applies its own thresholds.
  const goods = cart?.total ?? subtotal;
  const shipping = shippingFor(goods);
  const freeShipping = shipping === 0;
  const total = goods + shipping;

  /* ── Empty bag ─────────────────────────────────────────────── */
  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-[var(--container-content)] flex-col items-center px-6 py-[var(--spacing-section)] text-center md:px-10">
        <FadeUp>
          {notice && (
            <p
              role="alert"
              className="mb-10 max-w-[52ch] border-l-2 border-[color:var(--color-clay)] bg-[color:var(--color-stardust-soft)] p-4 text-left text-[0.85rem] leading-[1.65] text-[color:var(--color-charcoal)]"
            >
              {notice}
            </p>
          )}
          <p className="font-eyebrow">
            <Monogram className="mr-1.5 inline-block h-[0.9em] w-[0.9em] align-[-0.12em]" />
            Bag
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
            Your bag is currently empty.
          </h1>
          <p className="mt-8 max-w-[44ch] text-[var(--text-base)] leading-[1.75] text-[color:var(--color-charcoal-soft)]">
            Every Quint Home diffuser ships with the fragrance oil of your
            choice. Start with the range.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <Link
              href="/range#diffusers"
              className="group inline-flex items-center gap-3 bg-[color:var(--color-charcoal)] px-8 py-4 text-[0.75rem] uppercase tracking-[0.32em] text-[color:var(--color-ivory)] transition-colors duration-500 hover:bg-[color:var(--color-clay-deep)]"
            >
              Shop diffusers
              <span className="transition-transform duration-500 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              href="/find-your-scent"
              className="text-[0.72rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)] underline-offset-4 transition-colors duration-500 hover:text-[color:var(--color-charcoal)] hover:underline"
            >
              Find your scent
            </Link>
          </div>
        </FadeUp>
      </div>
    );
  }

  /* ── Bag with items ────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-[var(--container-page)] px-6 py-[var(--spacing-section-sm)] md:px-10">
      <FadeUp>
        <div className="border-b border-[color:var(--color-rule)] pb-8">
          <p className="font-eyebrow">
            <Monogram className="mr-1.5 inline-block h-[0.9em] w-[0.9em] align-[-0.12em]" />
            Bag
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
            Your bag{" "}
            <em className="text-[color:var(--color-aerial-deep)]">
              ({cart?.totalQuantity ?? 0}).
            </em>
          </h1>
        </div>
      </FadeUp>

      {/* Why the checkout sent them back here, when it did. */}
      {notice && (
        <p
          role="alert"
          className="mt-8 border-l-2 border-[color:var(--color-clay)] bg-[color:var(--color-stardust-soft)] p-4 text-[0.85rem] leading-[1.65] text-[color:var(--color-charcoal)]"
        >
          {notice}
        </p>
      )}

      <div className="grid gap-12 pt-10 md:grid-cols-12 md:gap-16">
        {/* Line items */}
        <div className="md:col-span-7">
          <ul>
            {lines.map((l) => {
              // The gift now arrives as its own ₹0 line, so the synthetic row is only
              // drawn when this line is the diffuser rather than the bottle itself.
              const isGift = lineIsGift(l);
              // The synthetic row is a fallback for bags with no real gift line —
              // drawing both would list the same bottle twice.
              const gift = isGift || hasRealGift ? null : giftOnLine(l.attributes);
              const row = (
                <div className="flex gap-5">
                <Link
                  href={`/range/${l.handle}`}
                  className="relative h-32 w-24 shrink-0 overflow-hidden bg-[color:var(--color-stardust-soft)] sm:h-40 sm:w-32"
                >
                  {/* Shopify CDN images are not in next.config remotePatterns,
                      so use a plain img (same as the drawer). */}
                  {l.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.image}
                      alt={isGift ? giftDisplayTitle(l.productTitle) : l.productTitle}
                      className="h-[100%] w-[100%] object-cover"
                    />
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-baseline justify-between gap-4">
                    <Link
                      href={`/range/${l.handle}`}
                      className="transition-colors duration-500 hover:text-[color:var(--color-clay)]"
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "var(--text-xl)",
                        lineHeight: 1.1,
                        letterSpacing: "-0.012em",
                        fontWeight: 400,
                      }}
                    >
                      {isGift ? giftDisplayTitle(l.productTitle) : l.productTitle}
                    </Link>
                    <span
                      className={`shrink-0 text-[0.95rem] tabular-nums ${
                        isGift ? "text-[color:var(--color-clay)]" : ""
                      }`}
                      style={isGift ? { fontFamily: "var(--font-serif)" } : undefined}
                    >
                      {/* "Free", never ₹0 — a zero in the price column reads as
                          a bug rather than as a gift. */}
                      {isGift ? "Free" : formatINR(l.price * l.quantity)}
                    </span>
                  </div>

                  {l.variantTitle && l.variantTitle !== "Default Title" && (
                    <p className="mt-1.5 text-[0.72rem] uppercase tracking-[0.2em] text-[color:var(--color-charcoal-soft)]">
                      {l.variantTitle}
                    </p>
                  )}
                  {/* A bag is not a reservation: this can sell out while it
                      sits here, and the checkout will not take payment for it. */}
                  {!l.available && (
                    <p className="mt-1.5 text-[0.72rem] uppercase tracking-[0.2em] text-[color:var(--color-clay)]">
                      Sold out — remove to continue
                    </p>
                  )}
                  {otherAttributes(l.attributes).map((a) => (
                    <p
                      key={a.key}
                      className="mt-1.5 text-[0.78rem] text-[color:var(--color-charcoal-soft)]"
                    >
                      {a.key}: <span className="text-[color:var(--color-charcoal)]">{a.value}</span>
                    </p>
                  ))}

                  {l.quantity > 1 && (
                    <p className="mt-1.5 text-[0.78rem] tabular-nums text-[color:var(--color-charcoal-soft)]">
                      {formatINR(l.price)} each
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-5">
                    {/* Same reasoning as the drawer: the gift is tied to its
                        diffuser and is not separately adjustable. */}
                    {isGift ? (
                      <span className="text-[0.6rem] uppercase tracking-[0.26em] text-[color:var(--color-clay)]">
                        Complimentary with your order
                      </span>
                    ) : (
                    <div className="flex items-center border border-[color:var(--color-rule)]">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${l.productTitle}`}
                        disabled={pending}
                        onClick={() => update(l.id, l.quantity - 1)}
                        className="px-3 py-1.5 text-[0.95rem] transition-colors hover:text-[color:var(--color-clay)] disabled:opacity-50"
                      >
                        −
                      </button>
                      <span className="min-w-[2.5ch] text-center text-[0.85rem] tabular-nums">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${l.productTitle}`}
                        disabled={pending}
                        onClick={() => update(l.id, l.quantity + 1)}
                        className="px-3 py-1.5 text-[0.95rem] transition-colors hover:text-[color:var(--color-clay)] disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                    )}
                    {!isGift && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(l.id)}
                      className="text-[0.68rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)] underline-offset-4 transition-colors hover:text-[color:var(--color-clay)] hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                    )}
                  </div>
                </div>
                </div>
              );

              return (
                <li
                  key={l.id}
                  className={
                    gift
                      // No first:pt-0 here: the "In the box" legend sits on the
                      // frame's top rule and needs padding above it to sit in.
                      ? "py-7"
                      : "border-b border-[color:var(--color-rule)] py-7 first:pt-0"
                  }
                >
                  {gift ? (
                    // The diffuser and its complimentary oil arrive as one
                    // parcel, so the bag shows them inside one frame.
                    <InTheBox>
                      {row}
                      <GiftLine gift={gift} quantity={l.quantity} />
                    </InTheBox>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>

          <Link
            href="/range"
            className="mt-8 inline-block text-[0.72rem] uppercase tracking-[0.28em] text-[color:var(--color-charcoal-soft)] underline-offset-4 transition-colors duration-500 hover:text-[color:var(--color-charcoal)] hover:underline"
          >
            ← Continue shopping
          </Link>
        </div>

        {/* Order summary */}
        <div className="md:col-span-5">
          <div className="border border-[color:var(--color-rule)] bg-[color:var(--color-stardust-soft)] p-7 md:sticky md:top-32 md:p-8">
            <p className="font-eyebrow">Order summary</p>

            <dl className="mt-7 grid gap-3.5 text-[0.9rem]">
              <div className="flex items-baseline justify-between">
                <dt className="text-[color:var(--color-charcoal-soft)]">
                  Subtotal
                </dt>
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
                <dt className="text-[color:var(--color-charcoal-soft)]">
                  Shipping
                </dt>
                <dd
                  className={
                    freeShipping
                      ? "text-[color:var(--color-aerial-deep)]"
                      : "text-[color:var(--color-charcoal-soft)]"
                  }
                >
                  {freeShipping ? "Complimentary" : formatINR(shipping)}
                </dd>
              </div>
            </dl>

            <div className="mt-5">
              <DiscountField />
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

            {!freeShipping && (
              <p className="mt-4 text-[0.78rem] leading-[1.6] text-[color:var(--color-charcoal-soft)]">
                Add {formatINR(FREE_SHIPPING_FROM - goods)} more for
                complimentary shipping.
              </p>
            )}

            {/* Checkout hand-off: our own checkout + PayU once configured,
                otherwise the Shopify-hosted checkout. */}
            {headlessCheckout ? (
              <Link
                href="/checkout"
                className="group mt-7 flex items-center justify-center gap-3 bg-[color:var(--color-charcoal)] px-8 py-4 text-[0.75rem] uppercase tracking-[0.32em] text-[color:var(--color-ivory)] transition-colors duration-500 hover:bg-[color:var(--color-clay-deep)]"
              >
                Proceed to checkout
                <span className="transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            ) : (
              <a
                href={cart?.checkoutUrl ?? "#"}
                aria-disabled={!cart?.checkoutUrl}
                className="group mt-7 flex items-center justify-center gap-3 bg-[color:var(--color-charcoal)] px-8 py-4 text-[0.75rem] uppercase tracking-[0.32em] text-[color:var(--color-ivory)] transition-colors duration-500 hover:bg-[color:var(--color-clay-deep)]"
              >
                Proceed to checkout
                <span className="transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </a>
            )}

            <p className="mt-5 text-[0.75rem] leading-[1.65] text-[color:var(--color-charcoal-soft)]">
              Prices include GST. A tracking link is emailed to you once your
              order ships.
            </p>

            <p className="mt-5 border-t border-[color:var(--color-rule)] pt-5 text-[0.75rem] leading-[1.65] text-[color:var(--color-charcoal-soft)]">
              Questions before you order? See our{" "}
              <Link
                href="/shipping"
                className="underline-offset-4 hover:text-[color:var(--color-charcoal)] hover:underline"
              >
                Shipping &amp; Returns
              </Link>{" "}
              policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
