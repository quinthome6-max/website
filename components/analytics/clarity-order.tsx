"use client";

import { useEffect } from "react";
import { clarityEvent, clarityKeep, clarityTag } from "@/lib/analytics/clarity";

/**
 * Tags the Clarity session with the order reference on the confirmation page,
 * including orders still settling with PayU, which carry no amount and so
 * never reach the purchase event.
 */
export function ClarityOrder({ orderRef }: { orderRef: string }) {
  useEffect(() => {
    clarityTag("order", orderRef);
    clarityEvent("order_confirmed");
    clarityKeep("order_confirmed");
  }, [orderRef]);
  return null;
}
