"""
Print assets for the catalogue that the website does not already have.

  python3 marketing/catalogue/tools/prepare_assets.py      → marketing/catalogue/assets/*.jpg

"Paired with" images: each product page shows its two oils in one frame. The
frames come from tools/pairings/make_pairings.py (the bottles cut from the
site's own oil photographs and set together on a stardust sweep; labels are
never redrawn). Those renders are 3:2 with generous backdrop, so here each one
is trimmed to the band's proportion, centred on the pair, and saved as JPEG so
the PDF stays a sensible size.

Also: a warmer Grand Lobby for the oils page, and trimmed, true-to-scale
diffuser cut-outs for the comparison page.
"""
from __future__ import annotations

import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CAT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "pairings", "composite")
OUT = os.path.join(CAT, "assets")

# The band on a product page is 70 × 50 mm.
FRAME = 70 / 50
# How much of the frame's height the taller bottle fills.
FILL = 0.74


def pair_bbox(rgb: np.ndarray) -> tuple[int, int, int, int]:
    """Bounds of the two bottles: amber glass and black caps sit far darker
    than the stardust sweep, so a luminance cut finds them. The faint floor
    reflection stays lighter than the cut and is kept as margin, not content."""
    lum = rgb[..., :3].astype(np.float32) @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    mask = lum < 150
    rows = np.where(mask.sum(axis=1) > mask.shape[1] * 0.004)[0]
    cols = np.where(mask.sum(axis=0) > mask.shape[0] * 0.004)[0]
    return int(cols[0]), int(rows[0]), int(cols[-1]), int(rows[-1])


def crop_pair(slug: str) -> str:
    src = os.path.join(SRC, f"pair-{slug}-studio.png")
    im = Image.open(src).convert("RGB")
    W, H = im.size
    x0, y0, x1, y1 = pair_bbox(np.asarray(im))
    h = min(H, (y1 - y0) / FILL)
    w = h * FRAME
    if w > W:
        w, h = W, W / FRAME
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 + h * 0.03  # a touch more floor than sky
    left = int(round(min(max(cx - w / 2, 0), W - w)))
    top = int(round(min(max(cy - h / 2, 0), H - h)))
    out = im.crop((left, top, left + int(w), top + int(h)))
    path = os.path.join(OUT, f"pair-{slug}.jpg")
    out.save(path, quality=90, subsampling=0, dpi=(300, 300))
    return f"{slug}: bottles {x1 - x0}×{y1 - y0}px → frame {out.size[0]}×{out.size[1]}px"


SITE = os.path.join(os.path.dirname(os.path.dirname(CAT)), "public", "images")


def warm_grand_lobby() -> str:
    """Grand Lobby was shot on olive fabric: in print it is the one green photo
    among eight warm ones. Outside the bottle (its cached cutout mask, feathered)
    the hue is turned toward the walnut of the other oil photos and eased a
    little; the bottle and label pixels are left exactly as they are."""
    import cv2
    from PIL import ImageFilter

    src = Image.open(os.path.join(SITE, "oils", "grand-lobby-v2.webp")).convert("RGB")
    mask = Image.open(os.path.join(HERE, "pairings", "cut", "grand-lobby.isnet-general-use.mask.png")).convert("L")
    keep = np.asarray(mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(6)), np.float32) / 255
    lab = cv2.cvtColor(np.asarray(src, np.float32) / 255, cv2.COLOR_RGB2LAB)
    a, b = lab[..., 1], lab[..., 2]
    t = np.deg2rad(-18.0)
    a2 = (a * np.cos(t) - b * np.sin(t)) * 0.85
    b2 = (a * np.sin(t) + b * np.cos(t)) * 0.85
    graded = cv2.cvtColor(np.dstack([lab[..., 0], a2, b2]).astype(np.float32), cv2.COLOR_LAB2RGB)
    rgb = np.asarray(src, np.float32) / 255
    out = rgb * keep[..., None] + graded * (1 - keep[..., None])
    path = os.path.join(OUT, "oil-grand-lobby.jpg")
    Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8)).save(path, quality=92, subsampling=0, dpi=(300, 300))
    return "grand-lobby: backdrop warmed, bottle untouched"


# Real heights in mm, from lib/data (the comparison page draws them to scale).
CMP_HEIGHT_MM = {"monolith": 342, "loom": 293, "pillar": 218, "pebble": 160.5, "ember": 132}
CMP_SOURCE = {
    "monolith": "diffusers/monolith-v3.webp",
    "ember": "diffusers/ember-v3.webp",
    "pillar": "diffusers/pillar-v3.webp",
    "pebble": "diffusers/pebble-v3.webp",
}


def trim_on_white(im: Image.Image) -> Image.Image:
    """Crop a studio cut-out on white to the product itself, so the page can
    size it by the product's real height rather than by its picture frame."""
    g = np.asarray(im.convert("L"))
    ys, xs = np.where(g < 244)
    pad = 6
    return im.crop((max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad, im.width), min(ys.max() + pad, im.height)))


def loom_on_white() -> Image.Image:
    """The site's comparison render shows the Loom in sage; every photograph of
    it in the book (its own page, the project page) is the oatmeal unit. Cut the
    oatmeal Loom from its product photograph so the book shows one Loom."""
    from rembg import new_session, remove

    src = Image.open(os.path.join(SITE, "diffusers", "fabric-a974", "loom-v2-01.webp")).convert("RGB")
    cache = os.path.join(HERE, "pairings", "cut", "loom-v2-01.isnet-general-use.mask.png")
    if not os.path.exists(cache):
        remove(src, session=new_session("isnet-general-use"), only_mask=True).save(cache)
    m = np.asarray(Image.open(cache).convert("L"), np.float32) / 255
    import cv2

    bw = (m > 0.5).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(bw, 8)
    best = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    keep = cv2.dilate((lab == best).astype(np.uint8), np.ones((5, 5), np.uint8))
    a = m * keep
    white = np.full((src.height, src.width, 3), 255, np.float32)
    out = np.asarray(src, np.float32) * a[..., None] + white * (1 - a[..., None])
    return Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))


def comparison_cutouts() -> list[str]:
    done = []
    for key in CMP_HEIGHT_MM:
        im = loom_on_white() if key == "loom" else Image.open(os.path.join(SITE, CMP_SOURCE[key])).convert("RGB")
        t = trim_on_white(im)
        t.save(os.path.join(OUT, f"cmp-{key}.jpg"), quality=92, subsampling=0, dpi=(300, 300))
        done.append(f"cmp-{key}: {t.size[0]}x{t.size[1]}px")
    return done


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(CAT, "copy.json"), encoding="utf-8") as f:
        slugs = [p["slug"] for p in json.load(f)["products"]]
    for slug in slugs:
        print(crop_pair(slug))
    print(warm_grand_lobby())
    for line in comparison_cutouts():
        print(line)


if __name__ == "__main__":
    main()
