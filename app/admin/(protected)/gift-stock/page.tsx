import { GiftStockRunner } from "@/components/admin/gift-stock-runner";
import { requireStaff } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export default async function GiftStockPage() {
  await requireStaff();
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem" }}>
        Complimentary oil stock
      </h1>
      <p className="mt-3 max-w-[60ch] text-[0.85rem] leading-[1.7] text-[color:var(--color-charcoal-soft)]">
        Creates a ₹0 <strong>Gift</strong> variant on each of the eight
        fragrance oils and stocks it, so complimentary bottles draw down
        separately from the ones you sell. Safe to run again — an oil that
        already has one is topped up rather than given a second.
      </p>
      <GiftStockRunner />
    </>
  );
}
