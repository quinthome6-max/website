import { NextResponse } from "next/server";
import { currentStaffShop } from "@/lib/admin/session";
import { getManualInvoice } from "@/lib/admin/invoices/store";
import { manualInvoiceFilename, manualInvoiceHtml } from "@/lib/admin/invoices/render";
import { htmlToPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";
// Headless Chromium needs the Node runtime and a little time to start.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * A manual invoice as a PDF, made with the same headless Chromium as the
 * quotation PDFs and the invoices attached to order emails (lib/pdf.ts).
 */
export async function GET(request: Request) {
  if (!(await currentStaffShop())) {
    return new NextResponse("Not authorised", { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const inv = await getManualInvoice(id);
  if (!inv) return new NextResponse("Invoice not found", { status: 404 });

  try {
    const pdf = await htmlToPdf(manualInvoiceHtml(inv));
    const name = manualInvoiceFilename(inv);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        // ASCII name for older clients, the full one (Hindi, Marathi…) for the rest.
        "Content-Disposition": `attachment; filename="${name.replace(/[^\x20-\x7E]/g, "") || "Tax-Invoice"}.pdf"; filename*=UTF-8''${encodeURIComponent(name)}.pdf`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (e) {
    console.error("[manual-invoice-pdf] could not render", { id, error: e instanceof Error ? e.message : String(e) });
    // Fall back to the printable page, where the browser makes the PDF.
    return NextResponse.redirect(new URL(`/api/admin/manual-invoice-document?id=${encodeURIComponent(id)}&print=1`, request.url), 303);
  }
}
