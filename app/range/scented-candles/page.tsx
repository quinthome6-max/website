import { CategoryPage, categoryMetadata } from "@/components/sections/category-page";

export const metadata = categoryMetadata("scented-candles");

export default function Page() {
  return <CategoryPage slug="scented-candles" />;
}
