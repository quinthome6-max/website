import { requireStaff } from "@/lib/admin/session";
import { quoteCatalogue } from "@/lib/admin/quotes/catalogue";
import { emptyQuote } from "@/lib/admin/quotes/types";
import { QuoteEditor } from "@/components/admin/quote-editor";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  await requireStaff();
  const catalogue = await quoteCatalogue();
  return <QuoteEditor initial={emptyQuote()} catalogue={catalogue} />;
}
