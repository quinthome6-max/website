import { NextResponse } from "next/server";
import { currentStaffShop } from "@/lib/admin/session";
import { getManualInvoice } from "@/lib/admin/invoices/store";
import { manualInvoiceHtml } from "@/lib/admin/invoices/render";

export const dynamic = "force-dynamic";

/**
 * The printable manual invoice. ?print=1 opens the print dialog on load, the
 * fallback way to a PDF. Guarded here as well as by the /admin layout.
 */
export async function GET(request: Request) {
  if (!(await currentStaffShop())) {
    return new NextResponse("Not authorised", { status: 401 });
  }
  const url = new URL(request.url);
  const inv = await getManualInvoice(url.searchParams.get("id") ?? "");
  if (!inv) return new NextResponse("Invoice not found", { status: 404 });
  return new NextResponse(manualInvoiceHtml(inv, { autoPrint: url.searchParams.get("print") === "1" }), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
