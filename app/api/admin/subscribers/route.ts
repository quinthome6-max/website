import { NextResponse } from "next/server";
import { currentViewer } from "@/lib/admin/session";
import {
  listSubscribers,
  removeSubscriber,
  setSubscriberStatus,
  sourceLabel,
} from "@/lib/newsletter/store";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * A cell for a spreadsheet: quoted, and never read as a formula. A value that
 * starts with = + - or @ is prefixed with an apostrophe, so an address typed
 * as a formula can't run when the file is opened.
 */
function cell(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * The subscribed addresses as CSV, for Shopify Email or any mailing tool.
 * Guarded here as well as by the /admin layout, since a route handler does not
 * inherit it. Open to staff and the marketing sign-in, as the page is.
 */
export async function GET(request: Request): Promise<Response> {
  if (!(await currentViewer())) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  if (new URL(request.url).searchParams.get("format") !== "csv") {
    return NextResponse.json({ error: "Ask for ?format=csv" }, { status: 400 });
  }
  const subs = (await listSubscribers()).filter((s) => s.status === "subscribed");
  const rows = [
    ["email", "signed_up", "source"].join(","),
    ...subs.map((s) => [cell(s.email), cell(s.createdAt), cell(sourceLabel(s.source))].join(",")),
  ];
  // The date in India, as YYYY-MM-DD (en-CA formats that way).
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return new Response(rows.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quint-home-subscribers-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Unsubscribe, resubscribe or delete one address, then back to the list. */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await currentViewer())) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const back = (done: string) =>
    NextResponse.redirect(new URL(`/admin/subscribers?done=${done}`, request.url), 303);

  if (!EMAIL.test(email) || email.length > 200) return back("invalid");
  try {
    if (action === "unsubscribe" || action === "resubscribe") {
      const found = await setSubscriberStatus(email, action === "unsubscribe" ? "unsubscribed" : "subscribed");
      return back(found ? action : "missing");
    }
    if (action === "delete") {
      await removeSubscriber(email);
      return back("delete");
    }
    return back("invalid");
  } catch (e) {
    console.error("[newsletter] admin action failed", {
      action,
      error: e instanceof Error ? e.message : String(e),
    });
    return back("failed");
  }
}
