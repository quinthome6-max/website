// Remembers which draft order this browser's bag was last saved to, so rapid
// saves update one draft instead of racing Shopify's search index and
// creating several. Only a hint: the server still checks the draft belongs to
// the bag before using it.

import { cartTag } from "@/lib/shopify/drafts";

export const DRAFT_HINT_COOKIE = "quint_checkout_draft";

export function writeDraftHintValue(cartId: string, draftId: string): string {
  return `${cartTag(cartId)}|${draftId}`;
}

/** The draft id, if the hint was written for this same bag. */
export function readDraftHint(value: string | undefined, cartId: string): string | null {
  if (!value) return null;
  const [tag, id] = value.split("|");
  return tag === cartTag(cartId) && id?.startsWith("gid://shopify/DraftOrder/") ? id : null;
}
