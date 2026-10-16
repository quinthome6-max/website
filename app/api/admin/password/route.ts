import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  MARKETING_PRINCIPAL,
  PASSWORD_PRINCIPAL,
  adminPasswordConfigured,
  issueSession,
  marketingPasswordConfigured,
  marketingPasswordMatches,
  passwordMatches,
} from "@/lib/admin/session";

export const dynamic = "force-dynamic";

/**
 * Passphrase sign-in.
 *
 * A shared secret is guessable in a way an OAuth round trip is not, so attempts
 * are throttled per IP. The window is in memory: a serverless instance may be
 * recycled and the count reset, which makes this a speed bump rather than a
 * wall — the real protection is a long passphrase. It is enough to stop casual
 * scripted guessing, and it costs nothing to run.
 */
const LOCKOUT_MS = 2 * 60 * 60 * 1000; // Two hours.
const MAX_ATTEMPTS = 2;
const attempts = new Map<string, { count: number; resetAt: number }>();

/** Keeps the map from growing without bound on a long-lived instance. */
function sweep(now: number): void {
  for (const [key, entry] of attempts) {
    if (now > entry.resetAt) attempts.delete(key);
  }
}

function tooManyAttempts(ip: string, now: number): boolean {
  sweep(now);
  const entry = attempts.get(ip);
  if (!entry) {
    attempts.set(ip, { count: 1, resetAt: now + LOCKOUT_MS });
    return false;
  }
  if (now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + LOCKOUT_MS });
    return false;
  }
  entry.count += 1;
  // Each failure inside the window pushes the lockout out again, so an
  // attacker cannot simply wait out the original expiry and continue.
  entry.resetAt = now + LOCKOUT_MS;
  return entry.count > MAX_ATTEMPTS;
}

/**
 * Obvious automation, refused before the passphrase is even examined.
 *
 * This is not a security boundary — a determined attacker sets a browser user
 * agent — but it turns away the indiscriminate scanners that find a login form
 * and start guessing, which is most of what a URL like this ever sees.
 */
const BOT_UA =
  /bot|crawl|spider|scrap|curl|wget|python|java|go-http|libwww|httpclient|okhttp|axios|postman|insomnia|headless|phantom|selenium|puppeteer/i;

function looksAutomated(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  // No user agent at all is a script that did not bother to set one.
  if (ua.trim().length < 8) return true;
  if (BOT_UA.test(ua)) return true;
  // A real submission comes from the form on our own login page.
  const dest = request.headers.get("sec-fetch-dest");
  const site = request.headers.get("sec-fetch-site");
  if (dest && dest !== "document") return true;
  if (site && site !== "same-origin") return true;
  return false;
}

export async function POST(request: NextRequest) {
  const back = (reason: string) =>
    NextResponse.redirect(new URL(`/admin/login?error=${reason}`, request.url), 303);

  if (!adminPasswordConfigured() && !marketingPasswordConfigured()) return back("denied");

  if (looksAutomated(request)) return back("denied");

  const now = Date.now();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (tooManyAttempts(ip, now)) return back("throttled");

  // A honeypot the real form leaves empty. Automation that fills every input
  // it finds gives itself away here.
  const form = await request.formData();
  if (String(form.get("company") ?? "").length > 0) return back("denied");

  // Each form opens only its own door: the guest form checks the marketing
  // passphrase alone, the main form the admin passphrase alone.
  const candidate = String(form.get("password") ?? "");
  const guest = form.get("as") === "guest";
  const principal = !candidate
    ? null
    : guest
      ? marketingPasswordMatches(candidate)
        ? MARKETING_PRINCIPAL
        : null
      : passwordMatches(candidate)
        ? PASSWORD_PRINCIPAL
        : null;
  if (!principal) return back("denied");

  // Correct passphrase: clear the count so a valid user is not locked out by
  // their own earlier typos.
  attempts.delete(ip);

  const session = issueSession(principal, now + ADMIN_SESSION_MAX_AGE * 1000);
  if (!session) return back("config");

  const home = principal === MARKETING_PRINCIPAL ? "/admin/abandoned" : "/admin";
  const res = NextResponse.redirect(new URL(home, request.url), 303);
  res.cookies.set(ADMIN_COOKIE, session, {
    httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: ADMIN_SESSION_MAX_AGE,
  });
  return res;
}
