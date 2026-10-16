import { permanentRedirect } from "next/navigation";

// Returns/exchange content now lives on the merged Shipping & Returns page.
// Permanent (308), so search engines move the old address's standing across
// rather than keep checking back.
export default function RefundsRedirect() {
  permanentRedirect("/shipping");
}
