"""
Render the catalogue to PDF, after `npx tsx marketing/catalogue/build.ts`:

  python3 marketing/catalogue/tools/render.py

Writes, in marketing/catalogue/out:

  Quint-Home-Catalogue-print-bleed.pdf   for the printer: A4 + 3 mm bleed, trim marked
  Quint-Home-Catalogue-raw.pdf           the screen edition at full image quality
  Quint-Home-Catalogue.pdf               the same, compressed for email and phones

Before anything is written, every page is checked for content running past
its bottom margin. A page clips what does not fit, so an overflow would
otherwise go to print as a line quietly missing from the foot of a column.
"""
from __future__ import annotations

import os
import subprocess
import sys

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "out")

# Content must stop short of the folio; on a page without one, short of the
# bottom margin. Measured in the page, in CSS pixels, with a pixel of slack.
CHECK = """
() => [...document.querySelectorAll('.page')].map((page, i) => {
  const box = page.getBoundingClientRect();
  const folio = page.querySelector('.folio');
  const pad = parseFloat(getComputedStyle(page).paddingBottom);
  const limit = folio ? folio.getBoundingClientRect().top : box.bottom - pad;
  let lowest = 0, culprit = '';
  for (const el of page.querySelectorAll('*')) {
    if (el.closest('.folio')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.bottom > lowest) { lowest = r.bottom; culprit = el.className || el.tagName; }
  }
  return { page: i + 1, key: page.dataset.key, over: Math.round((lowest - limit) * 10) / 10, culprit: String(culprit) };
})
"""


def render(pw, html: str, pdf: str, width: str, height: str) -> list[dict]:
    browser = pw.chromium.launch()
    page = browser.new_page()
    page.goto("file://" + os.path.join(OUT, html), wait_until="networkidle")
    page.evaluate("() => document.fonts.ready")
    page.wait_for_function("() => [...document.images].every((i) => i.complete && i.naturalWidth > 0)")
    report = page.evaluate(CHECK)
    page.pdf(path=os.path.join(OUT, pdf), width=width, height=height, print_background=True, prefer_css_page_size=True)
    browser.close()
    return report


def main() -> None:
    with sync_playwright() as pw:
        report = render(pw, "catalogue.html", "Quint-Home-Catalogue-raw.pdf", "210mm", "297mm")
        render(pw, "catalogue-print-bleed.html", "Quint-Home-Catalogue-print-bleed.pdf", "216mm", "303mm")

    over = [r for r in report if r["over"] > 1]
    for r in report:
        mark = "OVERFLOWS" if r["over"] > 1 else "ok"
        print(f"  {r['page']:>2} {r['key']:<14} {mark:<9} {-r['over']:>7.1f}px to spare")
    if over:
        print("\nContent runs past the bottom margin on:")
        for r in over:
            print(f"  page {r['page']} ({r['key']}): {r['over']}px, at .{r['culprit']}")

    subprocess.run([sys.executable, os.path.join(HERE, "set_boxes.py"), os.path.join(OUT, "Quint-Home-Catalogue-print-bleed.pdf")], check=True)

    # The screen edition: photographs capped at 300 ppi and stored as JPEG in
    # sRGB, as the first catalogue's was. Sharp when zoomed on a phone, and a
    # tenth of the file to send. (Ghostscript's /printer preset reaches the
    # same resolution but writes device-independent colour with an empty ICC
    # profile, which some readers choke on — hence /ebook with the resolution
    # raised.)
    subprocess.run(
        [
            "gs", "-q", "-dNOPAUSE", "-dBATCH", "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.6",
            "-dPDFSETTINGS=/ebook", "-dColorImageResolution=300", "-dGrayImageResolution=300",
            "-dEmbedAllFonts=true", "-dSubsetFonts=true",
            "-sOutputFile=" + os.path.join(OUT, "Quint-Home-Catalogue.pdf"),
            os.path.join(OUT, "Quint-Home-Catalogue-raw.pdf"),
        ],
        check=True,
    )
    for name in ("Quint-Home-Catalogue-print-bleed.pdf", "Quint-Home-Catalogue-raw.pdf", "Quint-Home-Catalogue.pdf"):
        print(f"  {name}: {os.path.getsize(os.path.join(OUT, name)) / 1e6:.1f} MB")
    if over:
        sys.exit(1)


if __name__ == "__main__":
    main()
