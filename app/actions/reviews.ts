"use server";

import { headers } from "next/headers";
import {
  addressKey,
  isProductSlug,
  RateLimited,
  reviewsAvailable,
  submitReview,
  type Review,
} from "@/lib/reviews/store";

export interface ReviewInput {
  slug: string;
  rating: number;
  name: string;
  email: string;
  city: string;
  title: string;
  body: string;
  /** Hidden field a person never sees; a bot fills it in. */
  website: string;
  /** When the form was opened, so an instant submission can be told apart. */
  openedAt: number;
}

export interface ReviewResult {
  ok: boolean;
  message: string;
  /** Which field to point the shopper at, when one is the problem. */
  field?: "rating" | "name" | "email" | "city" | "title" | "body";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
// Control characters other than line breaks have no place in a review.
const CONTROL = /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g;
const clean = (v: unknown, max: number) =>
  String(v ?? "").replace(CONTROL, "").replace(/\r\n?/g, "\n").trim().slice(0, max);

const THANKS =
  "Thank you. Your review will appear on the page once we’ve read it.";

/**
 * A review from the product page. It is filed as pending: nothing a visitor
 * writes reaches the storefront until staff approve it in /admin/reviews.
 * Never leaks an underlying error to the visitor.
 */
export async function submitReviewAction(input: ReviewInput): Promise<ReviewResult> {
  // Bots: a filled honeypot, or a form "completed" in under three seconds,
  // is thanked and dropped, so there is nothing to learn from the response.
  if (clean(input.website, 200) || Date.now() - Number(input.openedAt) < 3000) {
    return { ok: true, message: THANKS };
  }

  const slug = clean(input.slug, 80);
  if (!isProductSlug(slug)) {
    return { ok: false, message: "We couldn’t tell which product this is for." };
  }
  if (!reviewsAvailable) {
    return { ok: false, message: "Reviews can’t be sent just now. Please try again later." };
  }

  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, field: "rating", message: "Choose a star rating." };
  }
  const name = clean(input.name, 60);
  if (name.length < 2) {
    return { ok: false, field: "name", message: "Add your name as it should appear." };
  }
  const email = clean(input.email, 200).toLowerCase();
  if (!EMAIL.test(email)) {
    return { ok: false, field: "email", message: "That email doesn’t look right." };
  }
  const city = clean(input.city, 40);
  const title = clean(input.title, 80);
  const body = clean(input.body, 1500);
  if (body.length < 20) {
    return {
      ok: false,
      field: "body",
      message: "Tell us a little more – at least 20 characters.",
    };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";

  try {
    await submitReview(
      {
        slug,
        rating: rating as Review["rating"],
        name,
        email,
        city,
        title,
        body,
      },
      addressKey(ip)
    );
    return { ok: true, message: THANKS };
  } catch (e) {
    if (e instanceof RateLimited) {
      return {
        ok: false,
        message: "We’ve had several reviews from you this hour. Please try again later.",
      };
    }
    console.error("[reviews] submit failed", {
      slug,
      error: e instanceof Error ? e.message : String(e),
    });
    return { ok: false, message: "Something went wrong. Please try again shortly." };
  }
}
