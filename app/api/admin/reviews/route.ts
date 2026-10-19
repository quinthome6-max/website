import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { currentStaffShop } from "@/lib/admin/session";
import {
  approveReview,
  deleteReview,
  isProductSlug,
  reviewsTag,
} from "@/lib/reviews/store";

export const dynamic = "force-dynamic";

/**
 * Staff decisions on a review: approve it onto its product page, or delete it.
 * Guarded here as well as by the /admin layout, since a route handler does not
 * inherit it, and staff-only: the marketing passphrase cannot moderate.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await currentStaffShop())) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const id = String(form.get("id") ?? "");
  const slug = String(form.get("slug") ?? "");
  const back = (done: string) =>
    NextResponse.redirect(new URL(`/admin/reviews?done=${done}`, request.url), 303);

  if (!/^[A-Za-z0-9_-]{6,24}$/.test(id) || !isProductSlug(slug)) return back("invalid");

  try {
    let changed: string | null = slug;
    if (action === "approve") changed = await approveReview(id);
    else if (action === "delete") await deleteReview(id, slug);
    else return back("invalid");
    if (!changed) return back("missing");

    // The product page reads approved reviews through a cached, tagged fetch:
    // expire it now so the change shows on the next visit, not in an hour.
    revalidateTag(reviewsTag(changed), { expire: 0 });
    revalidatePath(`/range/${changed}`);
    return back(action);
  } catch (e) {
    console.error("[reviews] admin action failed", {
      action,
      id,
      error: e instanceof Error ? e.message : String(e),
    });
    return back("failed");
  }
}
