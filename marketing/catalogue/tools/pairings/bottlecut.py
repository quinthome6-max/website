"""
Clean, halo-free cutouts of the Quint 50 ml oil bottle from the v2 product photos.

The bottle is never warped or redrawn and its label is never touched: the ALPHA
matte is built, a 1-2 px band of edge pixels takes its colour from just inside
the bottle so the old background does not show as a fringe, and a styling prop
lying across the lower glass (PROP_STROKES) is filled from the glass around it.

Matte recipe
  1. rembg mask (isnet-general-use by default; u2net optional) -> keep only the
     connected component that is the bottle (drops cups, stones, twigs...).
  2. The bottle is a lathe-turned object shot square-on, so each row of it is one
     span symmetric about a vertical axis. Per row we measure the sub-pixel
     half-width on the left and on the right from the soft mask, and keep the
     SMALLER one (background bleed only ever makes one side too wide).
  3. alpha(x, y) = clamp(h(y) - |x - axis| + 0.5) -> an anti-aliased edge with no
     stair-steps and no bleed. Top of cap / base get sub-pixel vertical coverage.
  4. Where the base is hidden (fabric, sand, twig) a per-oil override sets the
     base row, and the bottom corner radius is copied from a clean bottle.
"""
from __future__ import annotations
import os, json
import numpy as np
from PIL import Image
import cv2

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', 'public', 'images', 'oils')
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cut')
os.makedirs(CACHE, exist_ok=True)

# Where the photo does not show a clean glass base, say where the base is
# (row in the 1215x1519 source) - found by eye at 300 % zoom.
#   slug: (base_row, geometry_from_row)  - below geometry_from_row the matte is the
#   straight body width + the clean corner profile, not the (occluded) rembg mask.
BASE_OVERRIDE = {
    'grand-lobby': (1234, 1165),   # rembg loses the dark glass in the fabric shadow
    'soft-hour':   (1236, 1175),   # a twig crosses in front of the right side of the base
    'shoreline':   (1218, 1182),   # wet sand piled against the base
}


def rembg_mask(slug: str, model: str = 'isnet-general-use') -> np.ndarray:
    p = os.path.join(CACHE, f'{slug}.{model}.mask.png')
    if not os.path.exists(p):
        from rembg import remove, new_session
        im = Image.open(f'{SRC}/{slug}-v2.webp').convert('RGB')
        remove(im, session=new_session(model), only_mask=True).save(p)
    return np.asarray(Image.open(p).convert('L'), dtype=np.float32) / 255.0


def _component(m: np.ndarray) -> np.ndarray:
    h, w = m.shape
    bw = (m > 0.5).astype(np.uint8)
    n, lab, stats, cent = cv2.connectedComponentsWithStats(bw, 8)
    # the bottle: the component nearest the image centre column with the biggest area
    best, score = 0, -1
    for i in range(1, n):
        x, y, ww, hh, area = stats[i]
        cx = x + ww / 2
        s = area - 4 * abs(cx - w / 2) * hh
        if s > score:
            best, score = i, s
    keep = (lab == best).astype(np.uint8)
    keep = cv2.dilate(keep, np.ones((5, 5), np.uint8))
    return m * keep


# Styling props that lie across the glass in a source photo. Cut out with the
# bottle they would end in a hard edge at its silhouette and read as glued on,
# so the glass under them is filled from the surrounding glass. Only ever below
# the label (which ends above row ~1165); the label is never touched.
#   slug: [(x0, y0, x1, y1, thickness_px), ...]  - strokes along each prop.
PROP_STROKES = {
    'soft-hour': [
        (553, 1222, 744, 1177, 21),   # the twig across the lower glass
        (700, 1188, 712, 1214, 11),   # its side branch
        (556, 1210, 578, 1232, 16),   # the knot at its left end
    ],
}
LABEL_BOTTOM = 1165


def _remove_props(img: np.ndarray, slug: str) -> np.ndarray:
    strokes = PROP_STROKES.get(slug)
    if not strokes:
        return img
    m = np.zeros(img.shape[:2], np.uint8)
    for x0, y0, x1, y1, t in strokes:
        cv2.line(m, (x0, y0), (x1, y1), 255, t)
    m = cv2.dilate(m, np.ones((7, 7), np.uint8))
    m[:LABEL_BOTTOM] = 0
    u8 = np.clip(img, 0, 255).astype(np.uint8)
    return cv2.inpaint(u8, m, 7, cv2.INPAINT_TELEA).astype(np.float32)


def build_cutout(slug: str, model: str = 'isnet-general-use', shrink: float = 0.9,
                 base_override: int | None = None, debug: bool = False) -> dict:
    img = np.asarray(Image.open(f'{SRC}/{slug}-v2.webp').convert('RGB'), dtype=np.float32)
    img = _remove_props(img, slug)
    H, W, _ = img.shape
    m = _component(rembg_mask(slug, model))

    rows = np.where(m.max(axis=1) > 0.5)[0]
    top_i, bot_i = rows.min(), rows.max()
    hgt = bot_i - top_i

    # axis: centroid of mask in clean body rows (label band)
    xs = np.arange(W, dtype=np.float32)
    band = range(int(top_i + 0.45 * hgt), int(top_i + 0.8 * hgt))
    cents = [(m[y] * xs).sum() / max(m[y].sum(), 1e-6) for y in band]
    axis = float(np.median(cents))

    # per-row sub-pixel half widths, left and right of the axis
    left_w = np.clip(axis - xs + 0.5, 0, 1)          # fraction of pixel left of axis
    right_w = 1 - left_w
    hl = (m * left_w[None, :]).sum(axis=1)
    hr = (m * right_w[None, :]).sum(axis=1)
    h = np.minimum(hl, hr)
    body_h = float(np.median(h[band.start:band.stop]))

    # base: last row whose width is still >= 60% of the body, then allow the
    # rounded corner rows below while the width keeps shrinking smoothly
    base = int(bot_i)
    ok = np.where(h > 0.6 * body_h)[0]
    ok = ok[(ok > top_i + 0.5 * hgt)]
    if len(ok):
        base = int(ok.max())
    geo_from = None
    if base_override is not None:
        base, geo_from = base_override
    elif BASE_OVERRIDE.get(slug):
        base, geo_from = BASE_OVERRIDE[slug]

    # smooth the profile a touch (keeps the cap/collar steps)
    prof = h.copy()
    prof[top_i:base + 1] = cv2.medianBlur(h[top_i:base + 1].astype(np.float32).reshape(-1, 1), 3).ravel()
    if geo_from is not None:
        prof[geo_from:base + 1] = body_h
    prof = np.clip(prof - shrink, 0, None)

    # bottom corners: copy the measured corner profile of a clean bottle
    # (in units of body half-width) so an occluded base still ends in glass.
    corner = CORNER_TEMPLATE
    K = len(corner)
    for k in range(K):
        y = base - k
        prof[y] = min(prof[y], body_h * corner[k] - shrink)

    # sub-pixel top (cap) from the centre columns
    c0 = int(round(axis))
    colcov = m[:top_i + 40, c0 - 20:c0 + 20].mean(axis=1)
    top_sub = float(top_i + 40 - colcov.sum())

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    alpha = np.clip(prof[:, None] - np.abs(xx - axis) + 0.5, 0, 1)
    vert = np.clip(yy - top_sub + 0.5, 0, 1) * np.clip(base + 0.5 - yy, 0, 1)
    alpha *= vert
    # cap crown: its top edge is a shallow ellipse that a per-row profile turns
    # into stair-steps. Use the model's soft mask there, symmetrised about the axis.
    crown = int(top_sub) + 14
    mirror = cv2.remap(m, (2 * axis - xx).astype(np.float32), yy, cv2.INTER_LINEAR,
                       borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    sym = np.minimum(m, mirror)
    side = np.clip(prof[:, None] - np.abs(xx - axis) + 0.5, 0, 1)
    blend_w = np.clip((yy - (crown - 6)) / 6.0, 0, 1)          # hand over smoothly
    top_alpha = np.minimum(sym, side)
    rows = slice(0, crown + 1)
    alpha[rows] = top_alpha[rows] * (1 - blend_w[rows]) + alpha[rows] * blend_w[rows]

    # edge decontamination: pixels within 2 px of the side edge borrow colour
    # from 2.5 px further in, on the same row (the edge is near-vertical).
    dist_in = prof[:, None] - np.abs(xx - axis)        # px inside the side edge
    sgn = np.sign(xx - axis)
    pull = np.clip(2.5 - dist_in, 0, 2.5)               # how far to move inward
    pull[dist_in > 2.5] = 0
    srcx = (xx - sgn * pull).astype(np.float32)
    dist_top = yy - top_sub
    pull_y = np.clip(2.5 - dist_top, 0, 2.5); pull_y[dist_top > 2.5] = 0
    srcy = (yy + pull_y).astype(np.float32)
    rgb = cv2.remap(img, srcx, srcy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

    # crop to the bottle
    y0, y1 = int(max(top_sub - 4, 0)), int(min(base + 4, H))
    xw = int(np.ceil(prof[y0:y1].max())) + 4
    x0, x1 = int(axis - xw), int(axis + xw + 1)
    rgba = np.dstack([rgb, alpha * 255.0])[y0:y1, x0:x1]

    # label paper colour (brightest 35 % of pixels inside the label band)
    lab = img[int(top_i + 0.42 * hgt):int(top_i + 0.62 * hgt), int(axis - 0.55 * body_h):int(axis + 0.55 * body_h)].reshape(-1, 3)
    lum = lab @ np.array([0.299, 0.587, 0.114])
    paper = np.median(lab[lum >= np.percentile(lum, 65)], axis=0)

    return dict(slug=slug, rgba=rgba.astype(np.float32), axis=axis - x0, top=top_sub - y0,
                base=base - y0, body_w=2 * body_h, paper=paper, src_box=(x0, y0, x1, y1))


def _measure_corner(slug='the-arrival', model='isnet-general-use', K=40):
    m = _component(rembg_mask(slug, model))
    H, W = m.shape
    xs = np.arange(W, dtype=np.float32)
    rows = np.where(m.max(axis=1) > 0.5)[0]
    top_i, bot_i = rows.min(), rows.max(); hgt = bot_i - top_i
    band = range(int(top_i + 0.45 * hgt), int(top_i + 0.8 * hgt))
    axis = float(np.median([(m[y] * xs).sum() / m[y].sum() for y in band]))
    lw = np.clip(axis - xs + 0.5, 0, 1)
    h = np.minimum((m * lw).sum(1), (m * (1 - lw)).sum(1))
    body = float(np.median(h[band.start:band.stop]))
    ok = np.where(h > 0.6 * body)[0]; ok = ok[ok > top_i + 0.5 * hgt]; base = int(ok.max())
    prof = [min(1.0, h[base - k] / body) for k in range(K)]
    # make monotone (the corner only ever widens going up)
    for k in range(1, K):
        prof[k] = max(prof[k], prof[k - 1])
    return np.array(prof, dtype=np.float32)


CORNER_JSON = os.path.join(CACHE, 'corner.json')
if os.path.exists(CORNER_JSON):
    CORNER_TEMPLATE = np.array(json.load(open(CORNER_JSON)), dtype=np.float32)
else:
    CORNER_TEMPLATE = np.ones(1, dtype=np.float32)
    CORNER_TEMPLATE = _measure_corner()
    json.dump(CORNER_TEMPLATE.tolist(), open(CORNER_JSON, 'w'))


if __name__ == '__main__':
    import sys
    print('corner', np.round(CORNER_TEMPLATE, 3).tolist())
    out = os.path.join(CACHE, 'png'); os.makedirs(out, exist_ok=True)
    for s in sys.argv[1:] or ['grand-lobby', 'the-arrival']:
        c = build_cutout(s)
        Image.fromarray(np.clip(c['rgba'], 0, 255).astype(np.uint8), 'RGBA').save(f'{out}/{s}.png')
        print(s, 'axis', round(c['axis'], 1), 'body_w', round(c['body_w'], 1), 'base', c['base'], 'top', round(c['top'], 1),
              'paper', np.round(c['paper']).tolist(), 'box', c['src_box'])
