import type { MetadataRoute } from "next";

/** Name, colours and icon for "Add to Home Screen" and browser UI (plan T24). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quint Home",
    short_name: "Quint Home",
    description:
      "Waterless aroma diffusers, fragrance oils and soy wax candles, from Mumbai.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F3",
    theme_color: "#293329",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/images/brand/favicon-tile-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
