import { NextResponse } from "next/server";
import { currentStaffShop } from "@/lib/admin/session";
import { getQuote } from "@/lib/admin/quotes/store";
import { quoteHtml } from "@/lib/admin/quotes/quote-html";

export const dynamic = "force-dynamic";

/**
 * The printable quotation, as its own document. ?print=1 opens the browser's
 * print dialog on load, which is the fallback way to a PDF if the server-made
 * one (/api/admin/quote-pdf) is ever unavailable.
 *
 * Guarded here as well as by the /admin layout: a route handler does not
 * inherit a layout.
 */
export async function GET(request: Request) {
  if (!(await currentStaffShop())) {
    return new NextResponse("Not authorised", { status: 401 });
  }
  const url = new URL(request.url);
  const quote = await getQuote(url.searchParams.get("id") ?? "");
  if (!quote) return new NextResponse("Quotation not found", { status: 404 });

  const autoPrint = url.searchParams.get("print") === "1";
  return new NextResponse(quoteHtml(quote, { autoPrint, printHint: autoPrint }), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
