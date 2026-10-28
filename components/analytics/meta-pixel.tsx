"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { pageView } from "@/lib/analytics/pixel";

/**
 * Meta Pixel: the PageViews after the first.
 *
 * The base code, and the landing page's own PageView, are in the server HTML
 * (meta-pixel-base.tsx, in the root layout). This app navigates on the client,
 * so every route after the first would go uncounted — the listener below sends
 * a PageView when the path changes, and skips the first render so the landing
 * page is not counted twice.
 */
function RouteChangePageViews() {
  const pathname = usePathname();
  const search = useSearchParams();
  const first = useRef(true);
  // useSearchParams returns a fresh object on every render, so depending on it
  // directly sent a PageView each time the tree re-rendered — adding to the bag
  // counted as a page view. The serialised string only changes with the URL.
  const query = search.toString();

  useEffect(() => {
    if (first.current) {
      first.current = false; // the snippet already sent this one
      return;
    }
    pageView();
  }, [pathname, query]);

  return null;
}

export function MetaPixel() {
  // useSearchParams needs a boundary, or every page opts out of static
  // rendering.
  return (
    <Suspense fallback={null}>
      <RouteChangePageViews />
    </Suspense>
  );
}
