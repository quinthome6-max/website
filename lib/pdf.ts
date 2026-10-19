// HTML → PDF on the server, for documents that are emailed rather than
// printed from a browser (the tax invoice attached to the order email).
//
// It prints the very HTML /api/admin/invoice serves, with a headless
// Chromium, so the emailed PDF and the one staff save from the admin page are
// the same document, not two layouts kept in step by hand.
//
// On Vercel the browser is @sparticuz/chromium, a build made for serverless
// functions (its binary is traced into the functions that need it, see
// next.config.ts). Locally it uses an installed Chrome, or the path in
// LOCAL_CHROME_PATH.

import { existsSync } from "node:fs";
import puppeteer, { type Browser } from "puppeteer-core";

const LOCAL_CHROMES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

async function launch(): Promise<Browser> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const local =
    process.env.LOCAL_CHROME_PATH || LOCAL_CHROMES.find((p) => existsSync(p));
  if (!local) {
    throw new Error("No Chrome found for PDF rendering; set LOCAL_CHROME_PATH.");
  }
  return puppeteer.launch({ executablePath: local, headless: true });
}

/**
 * A4 PDF of an HTML document, once its fonts have loaded. `scale` shrinks the
 * page contents (1 = as the browser prints it).
 */
export async function htmlToPdf(html: string, { scale = 1 }: { scale?: number } = {}): Promise<Buffer> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    // The invoice takes its typefaces from Google Fonts; printing before they
    // arrive would set it in a fallback face. So: load, a quiet network, and
    // the fonts declared ready.
    await page.setContent(html, { waitUntil: "load", timeout: 20_000 });
    await page.waitForNetworkIdle({ idleTime: 300, timeout: 10_000 }).catch(() => undefined);
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      scale,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
