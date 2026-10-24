import { CategoryPage, categoryMetadata } from "@/components/sections/category-page";

export const metadata = categoryMetadata("fragrance-oils");

export default function Page() {
  return <CategoryPage slug="fragrance-oils" />;
}
