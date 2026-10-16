"""
Mark the print edition's trim so a printer's imposition reads it as A4 with
3 mm bleed, not as a 216 × 303 mm page:

  python3 marketing/catalogue/tools/set_boxes.py marketing/catalogue/out/Quint-Home-Catalogue-print-bleed.pdf

Chromium writes MediaBox = TrimBox = the whole sheet. The layout sits 3 mm in
from the top-left edge, so TrimBox is an exact A4 at that offset and BleedBox
is the sheet. (Chromium rounds the sheet to whole CSS pixels, so the right-hand
bleed comes out at 2.9 mm; the trim itself is exact.)
"""
from __future__ import annotations

import os
import sys

from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject

MM = 72 / 25.4
A4_W, A4_H = 210 * MM, 297 * MM
BLEED = 3 * MM


def main(path: str) -> None:
    reader = PdfReader(path)
    writer = PdfWriter(clone_from=reader)
    for page in writer.pages:
        sheet_h = float(page.mediabox.height)
        top = sheet_h - BLEED
        page.trimbox = RectangleObject([BLEED, top - A4_H, BLEED + A4_W, top])
        page.bleedbox = RectangleObject(page.mediabox)
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        writer.write(f)
    os.replace(tmp, path)
    box = writer.pages[0].trimbox
    print(f"TrimBox {[round(float(v), 3) for v in box]} on {len(writer.pages)} pages")


if __name__ == "__main__":
    main(sys.argv[1])
