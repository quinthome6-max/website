"use client";

import { useEffect } from "react";

/**
 * Loads gtag.js once the Meta Pixel's PageView has left the page.
 *
 * On a phone on slow 4G the two shared one link: gtag.js (177 KB) started just
 * as the pixel was fetching its config, and held the PageView back by about
 * half a second — on a site whose visitors mostly arrive from Meta ads, and
 * whose landing page views are counted only when that PageView arrives.
 * GA4 loses nothing by waiting: its config and every event are queued in
 * dataLayer (google-analytics.tsx, lib/analytics/ga4.ts) and read in order
 * when the script arrives.
 *
 * Waits for the PageView's request to finish (resource timing), or 2.5 s,
 * whichever comes first, so an ad-blocked pixel never holds GA4 back for long.
 */
export function GtagAfterMeta({ src }: { src: string }) {
  useEffect(() => {
    let done = false;
    let observer: PerformanceObserver | null = null;
    const isPageView = (e: PerformanceEntry) => e.name.includes("facebook.com/tr") && e.name.includes("ev=PageView");

    const load = () => {
      if (done) return;
      done = true;
      observer?.disconnect();
      clearTimeout(timer);
      if (document.querySelector(`script[src="${src}"]`)) return;
      const s = document.createElement("script");
      s.async = true;
      s.src = src;
      document.head.appendChild(s);
    };

    const timer = setTimeout(load, 2500);
    if (performance.getEntriesByType("resource").some(isPageView)) {
      load();
    } else if (typeof PerformanceObserver !== "undefined") {
      observer = new PerformanceObserver((list) => {
        if (list.getEntries().some(isPageView)) load();
      });
      try {
        observer.observe({ type: "resource", buffered: true });
      } catch {
        load();
      }
    }
    return () => {
      done = true;
      observer?.disconnect();
      clearTimeout(timer);
    };
  }, [src]);

  return null;
}
