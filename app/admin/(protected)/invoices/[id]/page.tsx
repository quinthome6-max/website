import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/session";
import { quoteCatalogue } from "@/lib/admin/quotes/catalogue";
import { getManualInvoice } from "@/lib/admin/invoices/store";
import { InvoiceEditor } from "@/components/admin/invoice-editor";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const { from } = await searchParams;
  const inv = await getManualInvoice(id);
  if (!inv) notFound();
  const catalogue = await quoteCatalogue();

  return (
    <InvoiceEditor
      key={inv.id}
      initial={inv}
      saved={{ id: inv.id, number: inv.number, status: inv.status, updatedAt: inv.updatedAt }}
      catalogue={catalogue}
      notice={from ? `Made from quotation ${from}, dated today. Check it, then issue it.` : undefined}
    />
  );
}
