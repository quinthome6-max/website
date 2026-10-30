import { NextResponse } from "next/server";
import { currentStaffShop } from "@/lib/admin/session";
import { listManualInvoices } from "@/lib/admin/invoices/store";
import { toInvoice } from "@/lib/admin/invoices/render";

export const dynamic = "force-dynamic";

/** Quoted, and never read as a formula when the file is opened. */
function cell(v: string | number): string {
  const s = String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Issued and cancelled manual invoices, oldest first, one row each with the
 * figures a GST return needs: buyer GSTIN (B2B when present), place of supply,
 * taxable value and CGST / SGST / IGST. Drafts are not invoices and are left out.
 */
export async function GET() {
  if (!(await currentStaffShop())) {
    return new NextResponse("Not authorised", { status: 401 });
  }
  const invoices = (await listManualInvoices())
    .filter((i) => i.status !== "draft")
    .sort((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));

  const head = ["invoice_no", "date", "status", "buyer", "buyer_gstin", "place_of_supply", "reference", "taxable_value", "cgst", "sgst", "igst", "total", "payment", "paid"];
  const rows = invoices.map((mi) => {
    const t = toInvoice(mi).totals;
    const zero = mi.status === "cancelled";
    return [
      mi.number,
      mi.date,
      mi.status,
      mi.client.company || mi.client.contactName,
      mi.client.gstin,
      mi.client.state,
      mi.reference,
      zero ? 0 : t.taxable,
      zero ? 0 : t.cgst,
      zero ? 0 : t.sgst,
      zero ? 0 : t.igst,
      zero ? 0 : t.gross,
      mi.paymentMode,
      mi.paid ? "yes" : "no",
    ].map(cell).join(",");
  });
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return new Response([head.join(","), ...rows].join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quint-home-manual-invoices-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
