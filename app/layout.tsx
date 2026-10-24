import type { Metadata } from "next";
import "./globals.css";
import { literata, inter } from "@/lib/fonts";
import { LenisProvider } from "@/components/motion/lenis-provider";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Grain } from "@/components/atmosphere/grain";
import { ImageGuard } from "@/components/atmosphere/image-guard";
import { Clarity } from "@/components/analytics/clarity";
import { MetaPixel } from "@/components/analytics/meta-pixel";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { payuConfigured } from "@/lib/payu/client";
import { shopifyAdminConfigured } from "@/lib/shopify/admin";
import { DEFAULT_OG_IMAGE, OG_LOCALE } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    default: "Quint Home",
    template: "%s · Quint Home",
  },
  description:
    "Hotel-grade home fragrance from Mumbai. Waterless electronic diffusers and IFRA-compliant fragrance oils, designed to be displayed.",
  metadataBase: new URL("https://www.quinthome.in"),
  // Ownership proof for Google Search Console and Bing Webmaster Tools, from
  // Vercel env vars (the "content" value of each tool's meta tag). Not needed
  // when the domain is verified by DNS instead. See docs/seo/.
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
      : {}),
  },
  // No site-wide canonical: a default here is inherited by every page that
  // does not set its own, which told Google the policy pages, the bag and
  // every 404 were the homepage. Each indexable page sets its own.
  // Inherited by every page that doesn't set openGraph itself. A page that
  // does replaces the whole object (Next merges metadata shallowly), so pages
  // with their own openGraph spread DEFAULT_OG_IMAGE / OG_LOCALE in as well.
  openGraph: {
    type: "website",
    locale: OG_LOCALE,
    images: [DEFAULT_OG_IMAGE],
    title: "Quint Home",
    description:
      "Hotel-grade home fragrance from Mumbai. Designed for the considered Indian home.",
    siteName: "Quint Home",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${literata.variable} ${inter.variable} antialiased`}
    >
      <body
        suppressHydrationWarning
        // Product pages on mobile carry a sticky buy bar (68px + the home
        // indicator); pad the page so the footer's last lines clear it.
        className="flex min-h-screen flex-col bg-[color:var(--color-white)] text-[color:var(--color-charcoal)] max-lg:has-[[data-mobile-buy-bar]]:pb-[calc(68px+env(safe-area-inset-bottom))]"
      >
        {/* Names the home page as the brand's entity, which is what search
            engines use to decide the page to show for a brand query — without
            it a listing page can outrank the home page. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  // OnlineStore is Google's type for a shop that sells online
                  // only. City and PIN only: the registered address is a home.
                  "@type": "OnlineStore",
                  "@id": "https://www.quinthome.in/#organization",
                  name: "Quint Home",
                  legalName: "Rusera Lifestyle",
                  url: "https://www.quinthome.in",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://www.quinthome.in/icon.png",
                    width: 512,
                    height: 512,
                  },
                  image: "https://www.quinthome.in/images/og/quint-home.jpg",
                  email: "hello@quinthome.in",
                  telephone: "+91 98196 16668",
                  contactPoint: {
                    "@type": "ContactPoint",
                    contactType: "customer service",
                    telephone: "+91 98196 16668",
                    email: "hello@quinthome.in",
                    areaServed: "IN",
                  },
                  address: {
                    "@type": "PostalAddress",
                    addressLocality: "Mumbai",
                    addressRegion: "Maharashtra",
                    postalCode: "400019",
                    addressCountry: "IN",
                  },
                  description:
                    "Hotel-grade home fragrance from Mumbai: waterless aroma diffusers, IFRA-compliant fragrance oils and hand-poured soy candles.",
                  // Same policy as each product's offer (see /shipping).
                  hasMerchantReturnPolicy: {
                    "@type": "MerchantReturnPolicy",
                    applicableCountry: "IN",
                    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
                    merchantReturnDays: 3,
                    returnMethod: "https://schema.org/ReturnByMail",
                    refundType: "https://schema.org/ExchangeRefund",
                    merchantReturnLink: "https://www.quinthome.in/shipping",
                  },
                  sameAs: ["https://www.instagram.com/shopquinthome/"],
                },
                {
                  // name + alternateName decide the site name Google shows
                  // above the result ("Quint Home" rather than "quinthome.in").
                  "@type": "WebSite",
                  "@id": "https://www.quinthome.in/#website",
                  url: "https://www.quinthome.in",
                  name: "Quint Home",
                  alternateName: ["QuintHome", "Quint Home India"],
                  inLanguage: "en-IN",
                  publisher: { "@id": "https://www.quinthome.in/#organization" },
                },
              ],
            }),
          }}
        />

        {/* Checkout only moves off Shopify once payment *and* order creation
            are both configured — see docs/payu-checkout.md. */}
        <CartProvider
          headlessCheckout={payuConfigured && shopifyAdminConfigured}
        >
          <LenisProvider />
          <ImageGuard />
          <Grain />
          <AnnouncementBar />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
          <WhatsAppButton />
          <Clarity />
          <MetaPixel />
          <GoogleAnalytics />
        </CartProvider>
      </body>
    </html>
  );
}
