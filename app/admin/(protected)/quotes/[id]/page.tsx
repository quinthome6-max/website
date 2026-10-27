import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/session";
import { quoteCatalogue } from "@/lib/admin/quotes/catalogue";
import { getQuote } from "@/lib/admin/quotes/store";
import { QuoteEditor } from "@/components/admin/quote-editor";

export const dynamic = "force-dynamic";

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ copied?: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const { copied } = await searchParams;
  const quote = await getQuote(id);
  if (!quote) notFound();
  const catalogue = await quoteCatalogue();

  return (
    <QuoteEditor
      key={quote.id}
      initial={quote}
      saved={{ id: quote.id, number: quote.number, updatedAt: quote.updatedAt }}
      catalogue={catalogue}
      notice={copied ? `Copied from ${copied}. This is a new draft with today's date.` : undefined}
    />
  );
}
