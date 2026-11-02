// Sample reviews, for showing the review moderation in /admin/reviews. Staff
// load them with "Add sample reviews"; they arrive as pending, so nothing
// shows on the storefront unless someone approves them. "Remove sample
// reviews" takes every one out again, pending or approved.
//
// They are never put into the rating markup Google reads
// (lib/structured-data.ts). Delete this file and its callers once done.

import { diffusers } from "@/lib/data/diffusers";
import { oils } from "@/lib/data/oils";
import { candles } from "@/lib/data/candles";
import type { Review } from "@/lib/reviews/store";

export const SAMPLE_PREFIX = "test-";
export const isSampleReview = (r: { id?: string }): boolean => Boolean(r.id?.startsWith(SAMPLE_PREFIX));

const FIRST = ["Aarav", "Ananya", "Rohan", "Priya", "Vikram", "Neha", "Arjun", "Kavya", "Siddharth", "Ishita", "Karan", "Meera", "Aditya", "Pooja", "Rahul", "Sneha", "Nikhil", "Riya", "Varun", "Divya", "Harsh", "Tanvi", "Manish", "Shreya", "Kunal", "Anjali", "Yash", "Nisha", "Amit", "Radhika", "Deepak", "Swati", "Gaurav", "Aditi", "Sameer", "Kritika", "Vivek", "Pallavi", "Rajat", "Simran", "Akash", "Bhavna", "Tushar", "Lakshmi", "Arnav", "Zoya", "Farhan", "Gurpreet", "Harini", "Sanjay"];
const LAST = ["Sharma", "Mehta", "Iyer", "Reddy", "Kapoor", "Nair", "Patel", "Desai", "Joshi", "Malhotra", "Gupta", "Rao", "Menon", "Bose", "Chatterjee", "Shah", "Kulkarni", "Agarwal", "Pillai", "Singh", "Verma", "Khanna", "Banerjee", "Bhatt", "Sethi", "Krishnan", "Saxena", "Shetty", "Kaur", "Ali"];
const CITIES = ["Mumbai", "Pune", "Bengaluru", "Delhi", "Gurugram", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Noida", "Chandigarh", "Kochi", "Indore", "Surat", "Lucknow", "Goa", "Nagpur", "Thane", "Navi Mumbai"];

type Kind = "diffuser" | "oil" | "candle";
type Text = [title: string, body: string];
const TEXT: Record<Kind, Record<3 | 4 | 5, Text[]>> = {
  diffuser: {
    5: [["Hotel feel at home", "The living room smells like a hotel lobby within minutes. Quiet, no water to refill, and it looks lovely on the console."], ["Worth every rupee", "Set the schedule once and forgot about it. Guests always ask what the scent is."], ["Beautiful object", "Feels solid and premium. The scent throw is even across the room, never overpowering."], ["Best purchase this year", "Replaced reed diffusers and candles with this. Far more consistent and much cleaner."], ["Elegant and quiet", "Runs silently in the bedroom at night."]],
    4: [["Very good", "Lovely scent throw. Took a day to find the right intensity setting for our space."], ["Great, small learning curve", "Works well once set up. Instructions could be a little clearer."], ["Happy with it", "Looks premium and fills the room. Wish delivery had been a day quicker."]],
    3: [["Good, but", "Nice diffuser, though I expected a stronger throw in a large open-plan room."]],
  },
  oil: {
    5: [["Signature scent for our home", "Layered and long-lasting, nothing like the sharp oils I've tried before."], ["Smells expensive", "Clean and sophisticated. A bottle has lasted well past six weeks."], ["Instantly calming", "Our evenings start with this now. Soft, never cloying."], ["Guests keep asking", "Everyone who visits asks what it is. Will reorder."], ["Gorgeous blend", "Top notes are fresh and it settles into a warm base by evening."]],
    4: [["Lovely", "Beautiful scent. I'd like a larger bottle option."], ["Really nice", "Subtle and refined. I run it a step higher than I expected."], ["Good value", "Lasts a long time in the diffuser. Very pleasant."]],
    3: [["Pleasant", "Nice, but a little lighter than I prefer. Might try a deeper blend next."]],
  },
  candle: {
    5: [["Clean, even burn", "Burns evenly with no soot, and the scent fills the room without being heavy."], ["Perfect gift", "Gave one for Diwali and bought another for myself. The jar is beautiful."], ["Cosy evenings", "Lovely throw even before lighting. Burns slowly too."], ["Beautifully made", "Hand-poured feel, lovely wick, and the fragrance is spot on."]],
    4: [["Very nice", "Lovely scent and burn. A bigger size would be great."], ["Good candle", "Even burn and gentle scent. Packaging was excellent."]],
    3: [["Okay", "Pretty candle, but the scent was subtler than I hoped."]],
  },
};

/** 20–25 sample reviews for every product, the same set each time. */
export function buildSampleReviews(now = Date.now()): Review[] {
  let seed = 20261102;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
  const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

  const products: { slug: string; kind: Kind }[] = [
    ...diffusers.map((p) => ({ slug: p.slug, kind: "diffuser" as const })),
    ...oils.map((p) => ({ slug: p.slug, kind: "oil" as const })),
    ...candles.map((p) => ({ slug: p.slug, kind: "candle" as const })),
  ];

  const out: Review[] = [];
  for (const p of products) {
    const n = int(20, 25);
    for (let i = 0; i < n; i++) {
      const r = rnd();
      const rating = r < 0.68 ? 5 : r < 0.93 ? 4 : 3;
      const [title, body] = pick(TEXT[p.kind][rating]);
      out.push({
        // Within the admin route's id check (6–24 characters).
        id: `${SAMPLE_PREFIX}${p.slug}-${i}`,
        slug: p.slug,
        rating,
        title,
        body,
        name: `${pick(FIRST)} ${pick(LAST)[0]}.`,
        city: pick(CITIES),
        email: `sample+${p.slug}-${i}@example.com`,
        createdAt: new Date(now - int(1, 60) * 86_400_000 - int(0, 86_399) * 1000).toISOString(),
      });
    }
  }
  return out;
}
