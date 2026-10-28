"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * FadeUp – content is visible by default (works in SSR / no-JS / headless tools).
 * When the component mounts on the client, it temporarily hides itself and replays
 * an entrance animation as it scrolls into view.
 */
export function FadeUp({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "span" | "li" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);
  // SSR + first client render: hydrated. Only enable the animation
  // after mount, so screenshots / no-JS / RSS bots always see content.
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion – leave visible, no entrance.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setHydrated(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setHydrated(true);
      return;
    }

    // Reveal as it scrolls into view.
    const reveal = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          reveal.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    // Was it on screen at mount? The observer's first report answers that
    // after layout. Reading getBoundingClientRect here instead forced a
    // reflow for every FadeUp on the page (PageSpeed, 28 Oct 2026). On
    // screen: no entrance, so above-the-fold content never flashes out.
    // Off screen: hide it, and let `reveal` bring it in.
    const initial = new IntersectionObserver(([entry]) => {
      initial.disconnect();
      setHydrated(true);
      if (entry.isIntersecting) return;
      setVisible(false);
      reveal.observe(el);
    });
    initial.observe(el);

    return () => {
      initial.disconnect();
      reveal.disconnect();
    };
  }, []);

  const Tag = as as keyof React.JSX.IntrinsicElements;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RefTag = Tag as any;

  // While not yet hydrated on the client: render plain (visible).
  // After hydration: apply the slide-up transition.
  return (
    <RefTag
      ref={ref}
      className={cn(
        hydrated &&
          "transition-[opacity,transform] duration-[900ms] ease-[var(--ease-quint)]",
        hydrated && (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"),
        className
      )}
      style={hydrated ? { transitionDelay: `${delay * 1000}ms` } : undefined}
    >
      {children}
    </RefTag>
  );
}

export function RevealLines({
  lines,
  className,
  lineClassName,
  lineStyle,
  delayStart = 0,
}: {
  lines: string[];
  className?: string;
  lineClassName?: string;
  lineStyle?: React.CSSProperties;
  delayStart?: number;
}) {
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden">
          <span
            className={`block animate-reveal-line ${lineClassName ?? ""}`}
            style={{
              animationDelay: `${delayStart + i * 0.08}s`,
              ...lineStyle,
            }}
          >
            {line}
          </span>
        </span>
      ))}
    </span>
  );
}
