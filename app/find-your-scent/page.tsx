import type { Metadata } from "next";
import { ScentFinder } from "@/components/sections/scent-finder";

export const metadata: Metadata = {
  title: "Find Your Scent: Fragrance Oil Quiz",
  description:
    "Answer two quick questions and we'll match you to one of eight hotel-grade fragrance oils for your diffuser. 50 ml, 70–90% concentration.",
  alternates: { canonical: "/find-your-scent" },
};

export default function FindYourScentPage() {
  return (
    <article className="bg-[color:var(--color-white)] pt-6 md:pt-10">
      {/* The quiz renders step headings only, so the page carried no h1.
          Hidden rather than shown, since the first step is its own headline. */}
      <h1 className="sr-only">Find your home fragrance oil</h1>
      <ScentFinder />
    </article>
  );
}
