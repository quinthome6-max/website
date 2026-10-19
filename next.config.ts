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
    // Next 16 defaults this to 4h, which makes swapped-in images look stale
    // during editing; a short TTL re-optimises promptly.
    minimumCacheTTL: 60,
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
