import Script from "next/script";
import { CLARITY_PROJECT_ID } from "@/lib/analytics/clarity-ref";

/**
 * Clarity — heatmaps and session replay, so we can see where people hesitate
 * rather than guess.
 *
 * lazyOnload: it waits for the browser to be idle after the page has loaded.
 * Clarity is replay and heatmaps, not attribution, so starting a moment later
 * loses nothing that matters, and it no longer competes with the page for the
 * phone's CPU while it loads (it cost the product pages several points of
 * Lighthouse mobile score). An id is required for Next to track an inline
 * script.
 */
export function Clarity() {
  return (
    <Script id="ms-clarity" strategy="lazyOnload">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
    </Script>
  );
}
