import { NextResponse } from "next/server";
import { currentStaffShop } from "@/lib/admin/session";
import { sendOrderEmail } from "@/lib/email/order-email";

export const dynamic = "force-dynamic";
// Building the invoice PDF starts a headless browser; give it room.
export const maxDuration = 60;

/**
 * Sends (or re-sends) an order's confirmation email with its invoice, from
 * the button on /admin. Staff only, checked here because a route handler
 * does not inherit the /admin layout's guard.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await currentStaffShop())) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  const form = await request.formData();
  const order = Number(form.get("order"));
  if (!Number.isInteger(order) || order <= 0) {
    return NextResponse.redirect(new URL("/admin/orders", request.url), 303);
  }

  const result = await sendOrderEmail(order, { resend: true });
  const outcome = !result.sent ? "failed" : result.invoiceAttached ? "sent" : "sent-no-invoice";
  return NextResponse.redirect(
    new URL(`/admin/orders?email=${outcome}&order=${order}`, request.url),
    303
  );
}
