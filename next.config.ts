import type { NextConfig } from "next";

// Old model-code product paths → new title-based slugs. Permanent (301) so the
// SEO value of any indexed/linked old URLs carries over to the new URLs.
const SLUG_REDIRECTS: Record<string, string> = {
  "tabletop-a326": "monolith",
  "tabletop-fabric-a974": "loom",
  "clock-at370": "ember",
  "dual-mist-at302": "pillar",
  "plug-in-a815": "pebble",
  quietude: "terrain",
};

const nextConfig: NextConfig = {
  images: {
    // Allow a crisper quality for hero/editorial imagery (Next 16 requires
    // whitelisting any quality value used via the `quality` prop).
    qualities: [75, 90],
    // AVIF first (smaller than WebP at the same quality), WebP for browsers
    // that don't take AVIF. Plan T7.
    formats: ["image/avif", "image/webp"],
    // 31 days (plan T7, audit #17). It was 60 s so a swapped image showed at
    // once during editing; with a long cache, replace a photo under a NEW file
    // name (the -v2 / -v3 convention already used in public/images) rather
    // than overwriting the old one.
    minimumCacheTTL: 2678400,
  },
  // The order email attaches the tax invoice as a PDF, printed by the headless
  // Chromium in @sparticuz/chromium (lib/pdf.ts). Its browser ships as
  // compressed files read at run time, which tracing can't see, so they are
  // named here for every route that can send that email.
  outputFileTracingIncludes: {
    "/api/payu/callback": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/payu/webhook": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/admin/payu/recover": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/admin/order-email": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    // Quotations, printed to PDF the same way (lib/admin/quotes).
    "/api/admin/quote-pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  // pdf.quinthome.in serves the invoice back office. A rewrite rather than a
  // second deployment: one project, one set of environment variables, and no
  // chance of the two drifting apart.
  //
  // beforeFiles, because the host has to be inspected before the filesystem is
  // consulted — otherwise "/" on the subdomain would resolve to the storefront
  // home page before this rule was ever reached.
  // The back office holds customer names, addresses and order totals, so it is
  // locked down at the edge as well as in the app: never framed (no
  // clickjacking a signed-in operator), never indexed, and no referrer leaking
  // the URL to anything it links out to.
  async headers() {
    return [
      {
        source: "/:path(admin|admin/.*|api/admin/.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      // Browsers re-downloaded every image and video on each visit
      // (max-age=0). 30 days, then a week of serving the old copy while it
      // refreshes. Same rule as above: a changed file needs a new name.
      {
        source: "/:dir(images|videos)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=604800" }],
      },
    ];
  },

  async rewrites() {
    const onPdfHost = [{ type: "host" as const, value: "pdf.quinthome.in" }];
    return {
      beforeFiles: [
        // The subdomain root is the dashboard.
        { source: "/", has: onPdfHost, destination: "/admin" },
        // Everything else maps onto /admin/*, so pdf.quinthome.in/invoice/1012
        // is the same page as quinthome.in/admin/invoice/1012.
        { source: "/:path((?!api|_next|admin).*)", has: onPdfHost, destination: "/admin/:path" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  async redirects() {
    return [
      // Old model-code paths first, so they win over the catch-all below.
      ...Object.entries(SLUG_REDIRECTS).flatMap(([from, to]) => [
        { source: `/shop/${from}`, destination: `/range/${to}`, statusCode: 301 as const },
        { source: `/range/${from}`, destination: `/range/${to}`, statusCode: 301 as const },
      ]),
      // /shop moved to /range. Permanent redirects rather than dead links, so
      // anything already indexed or shared keeps working and passes its ranking on.
      { source: "/shop", destination: "/range", statusCode: 301 as const },
      { source: "/shop/:slug*", destination: "/range/:slug*", statusCode: 301 as const },
    ];
  },
};

export default nextConfig;
