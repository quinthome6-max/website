import { NextResponse } from "next/server";
import { currentViewer } from "@/lib/admin/session";
import { dismissCheckout, markContacted } from "@/lib/abandoned/store";

export const dynamic = "force-dynamic";

/**
 * Staff actions on an abandoned checkout: mark it contacted, or dismiss it
 * (removes it from the list). Guarded here as well as by the /admin layout,
 * since a route handler does not inherit it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Staff and the marketing team alike: this is the page marketing is for.
  if (!(await currentViewer())) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const id = String(form.get("id") ?? "");
  const view = String(form.get("view") ?? "");
  const back = (done: string) =>
    NextResponse.redirect(
      new URL(
        `/admin/abandoned?${new URLSearchParams({ ...(view ? { view } : {}), done })}`,
        request.url
      ),
      303
    );

  if (!/^[0-9a-f]{24}$/.test(id)) return back("invalid");

  try {
    if (action === "contacted") await markContacted(id);
    else if (action === "dismiss") await dismissCheckout(id);
    else return back("invalid");
    return back(action);
  } catch (e) {
    console.error("[abandoned] admin action failed", {
      action,
      id,
      error: e instanceof Error ? e.message : String(e),
    });
    return back("failed");
  }
}
