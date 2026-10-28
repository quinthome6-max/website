import { META_PIXEL_ID } from "@/lib/analytics/pixel";

/**
 * The Meta Pixel base code, as a plain <script> in the <head> of the HTML the
 * server sends (rendered from the root layout's <head>).
 *
 * Meta counts a landing page view only when this PageView reaches it. Loaded
 * afterInteractive (and, since the back-office rule, only after hydration) it
 * left 5.7–9.6 s after the click on a phone on slow 4G, and anyone who left
 * sooner was a click with no landing page view: the candle campaign counted
 * one view for every five clicks. Here it runs as soon as the browser reads
 * the head; fbevents.js is loaded async, so the page never waits for it.
 *
 * Not next/script: its beforeInteractive inline scripts are queued in
 * self.__next_s and run by Next's own runtime, which only starts once the
 * app's scripts have arrived — the delay this exists to remove.
 *
 * The back office is skipped here, in the browser, where the path and host are
 * known: /admin/* on quinthome.in and every path on pdf.quinthome.in (see
 * StorefrontOnly, which still gates the route-change PageViews).
 */
const SNIPPET = `(function(w,d){var p=w.location.pathname,h=w.location.hostname;
if(p==='/admin'||p.indexOf('/admin/')===0||h.indexOf('pdf.')===0)return;
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(w,d,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');
fbq('track','PageView');})(window,document);`;

/**
 * The PageView leaves only after fbevents.js and then its config (about 210 KB
 * between them) have arrived, and the inline script itself waits for the
 * stylesheet. The preload lets the browser start fbevents.js as soon as it
 * reads the head, at high priority, instead of at low priority behind the
 * fonts; the preconnects open both Meta hosts in the meantime. On the back
 * office these hints cost one script download and send nothing: the snippet
 * never runs there, and its pages are served with Referrer-Policy: no-referrer
 * (next.config.ts), so the request does not even say where it came from.
 */
export function MetaPixelBase() {
  return (
    <>
      <link rel="preconnect" href="https://connect.facebook.net" />
      <link rel="preconnect" href="https://www.facebook.com" />
      <link rel="preload" href="https://connect.facebook.net/en_US/fbevents.js" as="script" />
      <script id="meta-pixel" dangerouslySetInnerHTML={{ __html: SNIPPET }} />
    </>
  );
}
