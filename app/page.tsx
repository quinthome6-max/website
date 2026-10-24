import type { Metadata } from "next";
import { ComingSoon } from "@/components/home/coming-soon";
import { HomeSections } from "@/components/home/home-sections";

/**
 * The home page inherited the layout's bare "Quint Home" title, which says
 * nothing about what is sold here. Search engines had no category signal for
 * the most important page on the site.
 */
export const metadata: Metadata = {
  title: {
    absolute: "Quint Home | Waterless Aroma Diffusers & Fragrance Oils",
  },
  description:
    "Hotel-grade home fragrance from Mumbai: waterless aroma diffusers, IFRA-compliant fragrance oils and soy candles. Free shipping across India over ₹5,000.",
  alternates: { canonical: "/" },
};

/**
 * The real home page is live. To put the launch teaser back up, set
 *
 *     COMING_SOON=1
 *
 * in Vercel and redeploy — no code change needed. Every other route (shop,
 * product pages, checkout, journal, legal) stays live either way.
 */
export default function Home() {
  const teaser = process.env.COMING_SOON === "1";
  if (teaser) return <ComingSoon />;

  return (
    <>
      {/* The hero is a silent video with no text headline, so the page had no
          h1 at all. Visually hidden keeps the design untouched while giving
          crawlers and screen readers the heading every page needs. */}
      <h1 className="sr-only">
        Waterless electronic diffusers and IFRA-compliant fragrance oils, made
        in Mumbai
      </h1>
      <HomeSections />
    </>
  );
}
