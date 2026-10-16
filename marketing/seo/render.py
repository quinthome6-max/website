"""
Render the SEO reports to PDF:

  python3 marketing/seo/render.py

Reads seo/src/*.html and writes one A4 PDF per file into marketing/seo/, named by the
file's <meta name="pdf-name">. Uses the Playwright Chromium the catalogue
already relies on (catalogue/tools/render.py).
"""
from __future__ import annotations

import os
import re
import sys

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")


def main(names: list[str]) -> None:
    files = names or sorted(f for f in os.listdir(SRC) if f.endswith(".html"))
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for name in files:
            path = os.path.join(SRC, name)
            html = open(path, encoding="utf-8").read()
            m = re.search(r'<meta name="pdf-name" content="([^"]+)"', html)
            out = os.path.join(HERE, m.group(1) if m else name.replace(".html", ".pdf"))
            page = browser.new_page()
            page.goto("file://" + path, wait_until="networkidle")
            page.evaluate("() => document.fonts.ready")
            page.pdf(path=out, prefer_css_page_size=True, print_background=True)
            page.close()
            print("wrote", os.path.relpath(out, os.getcwd()))
        browser.close()


if __name__ == "__main__":
    main(sys.argv[1:])
