"use client";

import { useEffect } from "react";
import {
  estimatedDeliveryDate,
  GCR_MERCHANT_ID,
  takeReviewSurveyEmail,
} from "@/lib/analytics/customer-reviews";

type Gapi = {
  load: (name: string, cb: () => void) => void;
  surveyoptin: { render: (opts: Record<string, unknown>) => void };
};

declare global {
  interface Window {
    gapi?: Gapi;
    qhRenderSurveyOptIn?: () => void;
  }
}

/**
 * Google's "rate this order later?" box on the thank-you page. Shown once per
 * order, only when the checkout kept the buyer's email in this tab.
 */
export function GoogleCustomerReviews({ orderId }: { orderId: string }) {
  useEffect(() => {
    if (window.qhRenderSurveyOptIn) return; // already offered on this page
    const email = takeReviewSurveyEmail();
    if (!email) return;

    window.qhRenderSurveyOptIn = () => {
      window.gapi?.load("surveyoptin", () => {
        window.gapi?.surveyoptin.render({
          merchant_id: GCR_MERCHANT_ID,
          order_id: orderId,
          email,
          delivery_country: "IN",
          estimated_delivery_date: estimatedDeliveryDate(),
          // Bottom left: the WhatsApp button sits bottom right.
          opt_in_style: "BOTTOM_LEFT_DIALOG",
        });
      });
    };
    const s = document.createElement("script");
    s.src = "https://apis.google.com/js/platform.js?onload=qhRenderSurveyOptIn";
    s.async = true;
    s.defer = true;
    document.body.appendChild(s);
  }, [orderId]);

  return null;
}
