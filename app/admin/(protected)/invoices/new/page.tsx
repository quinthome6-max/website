import { requireStaff } from "@/lib/admin/session";
import { quoteCatalogue } from "@/lib/admin/quotes/catalogue";
import { emptyInvoice } from "@/lib/admin/invoices/types";
import { InvoiceEditor } from "@/components/admin/invoice-editor";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  await requireStaff();
  const catalogue = await quoteCatalogue();
  return <InvoiceEditor initial={emptyInvoice()} catalogue={catalogue} />;
}
