import Script from "next/script";
import { GA_ID } from "@/lib/analytics/ga4";
import { GtagAfterMeta } from "@/components/analytics/gtag-after-meta";

/**
 * Google Analytics 4 (measurement id in lib/analytics/ga4.ts).
 *
 * The queue and its config are set up afterInteractive, as before, so the
 * order of commands never changes. gtag.js itself is fetched only once the
 * Meta Pixel's PageView has gone (see GtagAfterMeta); until then everything
 * waits in dataLayer.
 */
export function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <GtagAfterMeta src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
