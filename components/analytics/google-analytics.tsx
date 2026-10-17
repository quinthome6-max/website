import Script from "next/script";
import { GA_ID } from "@/lib/analytics/ga4";

/**
 * Google Analytics 4 (measurement id in lib/analytics/ga4.ts).
 *
 * afterInteractive, like Clarity and the Meta Pixel: analytics must never sit
 * in front of the page rendering. Events sent earlier wait in dataLayer.
 */
export function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script
        id="ga4-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
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
