import { NextResponse } from "next/server";
import { currentStaffShop } from "@/lib/admin/session";
import { getQuote } from "@/lib/admin/quotes/store";
import { quoteFilename, quoteHtml } from "@/lib/admin/quotes/quote-html";
import { htmlToPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";
// Headless Chromium needs the Node runtime and a little time to start.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The quotation as a PDF file, made on the server with the same headless
 * Chromium that prints the invoice attached to order emails (lib/pdf.ts), so
 * staff get a file to send on WhatsApp or by email in one click.
 */
export async function GET(request: Request) {
  if (!(await currentStaffShop())) {
    return new NextResponse("Not authorised", { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const quote = await getQuote(id);
  if (!quote) return new NextResponse("Quotation not found", { status: 404 });

  try {
    // 94%: a typical quote (four or five lines) then fits on one page.
    const pdf = await htmlToPdf(quoteHtml(quote), { scale: 0.94 });
    const name = quoteFilename(quote);
    const inline = url.searchParams.get("view") === "1";
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        // ASCII name for older clients, the full one (Hindi, Marathi…) for the rest.
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name.replace(/[^\x20-\x7E]/g, "") || "Quotation"}.pdf"; filename*=UTF-8''${encodeURIComponent(name)}.pdf`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (e) {
    console.error("[quote-pdf] could not render", { id, error: e instanceof Error ? e.message : String(e) });
    // Fall back to the printable page, where the browser makes the PDF.
    return NextResponse.redirect(new URL(`/api/admin/quote-document?id=${encodeURIComponent(id)}&print=1`, request.url), 303);
  }
}
