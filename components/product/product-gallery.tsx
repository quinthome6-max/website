"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A designed (non-photo) slide appended after the images, e.g. a spec sheet. */
export interface GalleryCard {
  key: string;
  /** Short label shown in the thumbnail. */
  thumbLabel: string;
  /** Fills the main 4/5 stage. */
  content: ReactNode;
}

interface Props {
  images: string[];
  alt: string;
  /** Optional designed slides (rendered after the photos), each with a thumb. */
  cards?: GalleryCard[];
  /** Images shown after the cards, e.g. the key-features sheet, last. */
  after?: string[];
}

type Slide =
  | { kind: "image"; key: string; src: string }
  | { kind: "card"; key: string; card: GalleryCard };

/**
 * Editorial gallery – vertically stacked thumbs on the left,
 * large image on the right (desktop). Stacks on mobile.
 * No carousels with dots – switch via small numbered thumbs.
 * Photos come first; optional designed `cards` (e.g. a specifications sheet)
 * follow as their own slides, then any `after` images.
 */
export function ProductGallery({ images, alt, cards = [], after = [] }: Props) {
  const slides: Slide[] = [
    ...images.map((src) => ({ kind: "image" as const, key: src, src })),
    ...cards.map((card) => ({ kind: "card" as const, key: card.key, card })),
    ...after.map((src) => ({ kind: "image" as const, key: src, src })),
  ];
  const total = slides.length;
  const [active, setActive] = useState(0);
  const single = total <= 1;

  return (
    <div
      className={cn(
        "grid gap-4 md:max-w-[37rem]",
        !single && "md:grid-cols-[60px_1fr] md:gap-5"
      )}
    >
      {/* Thumbnails – vertical on desktop, horizontal scroll on mobile.
          Hidden when there's only one slide. */}
      {!single && (
        <div className="order-2 flex gap-3 overflow-x-auto md:order-1 md:flex-col md:gap-3">
          {slides.map((slide, i) => {
            const on = active === i;
            const select = () => setActive(i);
            return slide.kind === "image" ? (
              <button
                key={slide.key}
                type="button"
                onMouseEnter={select}
                onFocus={select}
                onClick={select}
                className={cn(
                  "relative aspect-[4/5] w-14 shrink-0 overflow-hidden border transition-all duration-500",
                  on
                    ? "border-[color:var(--color-charcoal)]"
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
                aria-label={`View image ${i + 1} of ${total}`}
              >
                <Image src={slide.src} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ) : (
              <button
                key={slide.key}
                type="button"
                onMouseEnter={select}
                onFocus={select}
                onClick={select}
                className={cn(
                  "relative flex aspect-[4/5] w-14 shrink-0 items-center justify-center overflow-hidden border bg-[color:var(--color-stardust-soft)] px-1 text-center text-[0.42rem] uppercase leading-tight tracking-[0.12em] transition-all duration-500",
                  on
                    ? "border-[color:var(--color-charcoal)] text-[color:var(--color-charcoal)]"
                    : "border-transparent text-[color:var(--color-charcoal-soft)] opacity-60 hover:opacity-100"
                )}
                aria-label={`View ${slide.card.thumbLabel} (${i + 1} of ${total})`}
              >
                {slide.card.thumbLabel}
              </button>
            );
          })}
        </div>
      )}

      {/* Main stage */}
      <div className="relative order-1 aspect-[4/5] overflow-hidden bg-[color:var(--color-stardust-soft)] md:order-2">
        {slides.map((slide, i) => (
          <div
            key={slide.key}
            className={cn(
              "absolute inset-0 transition-opacity duration-[900ms] ease-[var(--ease-quint)]",
              active === i ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            {slide.kind === "image" ? (
              <Image
                src={slide.src}
                alt={alt}
                fill
                priority={i === 0}
                sizes="(min-width: 768px) 520px, 100vw"
                className="object-cover"
              />
            ) : (
              slide.card.content
            )}
          </div>
        ))}

        {/* Slide counter */}
        <div className="absolute bottom-5 left-5 text-[0.6rem] uppercase tracking-[0.32em] text-[color:var(--color-stardust)]/85 mix-blend-difference tabular-nums">
          {String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}
