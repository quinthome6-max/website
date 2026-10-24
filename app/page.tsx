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
    // The page's H1 is the first line under the hero video, in SmartHome.
    <HomeSections />
  );
}
