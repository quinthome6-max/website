"""
Two Quint oils in one frame, for the catalogue "Paired with" band.

  python3 compose.py grand-lobby the-arrival --mode studio  --out composite/monolith_studio.png
  python3 compose.py grand-lobby the-arrival --mode scene   --plate vibe-19 --out ...
  python3 compose.py grand-lobby the-arrival --mode blend   --out ...

Bottles and labels are never redrawn or warped: they are cut out (bottlecut.py),
scaled uniformly (Lanczos), white-balanced with one per-channel gain each (so both
label papers read as the same stock), and placed. Everything else - backdrop,
shadows, reflection, grain - is built around them.
"""
from __future__ import annotations
import argparse, os
import numpy as np
import cv2
from PIL import Image
import bottlecut as bc

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', 'public', 'images')
STARDUST = np.array([0xee, 0xe4, 0xd8], np.float32)
STARDUST_SOFT = np.array([0xf5, 0xef, 0xe6], np.float32)
SHADOW_INK = np.array([74, 56, 44], np.float32)      # warm brown, never grey/green


# ─── helpers ────────────────────────────────────────────────────────────────
def srgb_to_lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return 255.0 * np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def grain(h, w, sigma, seed, blur=0.7):
    rng = np.random.default_rng(seed)
    n = rng.normal(0, 1, (h, w)).astype(np.float32)
    if blur:
        n = cv2.GaussianBlur(n, (0, 0), blur)
        n /= n.std() + 1e-6
    return n * sigma


def scale_rgba(rgba, s):
    h, w = rgba.shape[:2]
    nh, nw = int(round(h * s)), int(round(w * s))
    # premultiply so the edge does not pick up black
    pm = rgba.copy(); a = pm[..., 3:4] / 255.0
    pm[..., :3] *= a
    im = cv2.resize(pm, (nw, nh), interpolation=cv2.INTER_LANCZOS4 if s > 1 else cv2.INTER_AREA)
    im[..., 3] = np.clip(im[..., 3], 0, 255)
    a = im[..., 3:4] / 255.0
    im[..., :3] = np.where(a > 1e-3, im[..., :3] / np.maximum(a, 1e-3), 0)
    return np.clip(im, 0, 255)


def over(dst, src_rgb, src_a, x, y):
    """alpha-composite src (float rgb, alpha 0..1) onto dst at integer (x, y)."""
    H, W = dst.shape[:2]
    h, w = src_a.shape
    x0, y0 = max(x, 0), max(y, 0)
    x1, y1 = min(x + w, W), min(y + h, H)
    if x1 <= x0 or y1 <= y0:
        return
    s = (slice(y0 - y, y1 - y), slice(x0 - x, x1 - x))
    a = src_a[s][..., None]
    dst[y0:y1, x0:x1] = dst[y0:y1, x0:x1] * (1 - a) + src_rgb[s] * a


def multiply_shadow(dst, mask, ink=SHADOW_INK):
    """darken dst by mask (0..1) towards ink, in linear light."""
    lin = srgb_to_lin(dst)
    ink_l = srgb_to_lin(ink)[None, None, :]
    m = mask[..., None]
    lin = lin * (1 - m) + lin * ink_l / np.maximum(srgb_to_lin(STARDUST)[None, None, :], 1e-3) * m
    dst[:] = lin_to_srgb(lin)


# ─── bottles ────────────────────────────────────────────────────────────────
def glass_mask(rgb, a, top):
    """plain amber glass only: inside the bottle, below the cap collar, outside
    the label rectangle (feathered). The label is never touched."""
    h, w = a.shape
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    inside = a > 0.98
    bright = (lum > 150) & inside
    rows = np.where(bright.mean(axis=1) > 0.35)[0]
    lab = np.zeros((h, w), np.float32)
    if len(rows):
        r0, r1 = rows.min(), rows.max()
        # the label's printed artwork (sage botanicals, rose, rings) is darker
        # than the paper, so accept any column where the paper shows in >15 % of rows
        # the label wraps round the bottle, so its far edge is in shade: find its
        # columns with a low threshold that the dark amber glass never reaches
        paperish = (lum > 95) & inside
        cols = np.where(paperish[r0:r1 + 1].mean(axis=0) > 0.3)[0]
        lab[max(r0 - 4, 0):r1 + 5, max(cols.min() - 4, 0):cols.max() + 5] = 1
    # the cap + collar: dark, near-neutral rows at the top
    cap_rows = np.where(((lum < 45) & inside)[:int(h * 0.3)].mean(axis=1) > 0.5)[0]
    cap_end = int(cap_rows.max()) + 3 if len(cap_rows) else int(top)
    m = inside.astype(np.float32) * (1 - lab)
    m[:cap_end] = 0
    m = cv2.erode(m, np.ones((3, 3), np.uint8))           # feather inward, never onto the label
    return cv2.GaussianBlur(m, (0, 0), 1.5) * inside * (1 - lab)


def match_glass(bottles, strength=1.0, flatten=0.5):
    """move each bottle's glass a*/b* to the pair's mean and compress local
    chroma deviations (reflections of the old set) by `flatten`. L is kept."""
    labs, masks, means = [], [], []
    for b in bottles:
        m = glass_mask(b['rgb'], b['a'], b['top'])
        lab = cv2.cvtColor((b['rgb'] / 255.0).astype(np.float32), cv2.COLOR_RGB2LAB)
        sel = m > 0.5
        means.append(lab[sel].mean(axis=0))
        labs.append(lab); masks.append(m)
    target = np.mean(means, axis=0)
    for b, lab, m, mu in zip(bottles, labs, masks, means):
        new = lab.copy()
        for ch in (1, 2):
            dev = lab[..., ch] - mu[ch]
            new[..., ch] = target[ch] + dev * (1 - flatten)
        out = lab * (1 - strength * m[..., None]) + new * (strength * m[..., None])
        rgb = cv2.cvtColor(out, cv2.COLOR_LAB2RGB) * 255.0
        b['rgb'] = np.clip(rgb, 0, 255)
        b['glass_shift'] = (target - mu)[1:].round(2).tolist()
    return bottles


def prepared_bottle(slug, body_w_px, paper_target, max_gain=0.12):
    c = bc.build_cutout(slug)
    s = body_w_px / c['body_w']
    rgba = scale_rgba(c['rgba'], s)
    gain = np.clip(paper_target / c['paper'], 1 - max_gain, 1 + max_gain)
    rgb = np.clip(rgba[..., :3] * gain[None, None, :], 0, 255)
    return dict(slug=slug, rgb=rgb, a=rgba[..., 3] / 255.0, axis=c['axis'] * s,
                base=c['base'] * s, top=c['top'] * s, gain=gain, scale=s)


# ─── backdrops ──────────────────────────────────────────────────────────────
def studio_backdrop(W, H, horizon, seed=7):
    """seamless stardust sweep: a touch deeper at the top wall, lifting to
    stardust-soft on the floor; soft key pool from the left; paper grain."""
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    x = np.linspace(0, 1, W, dtype=np.float32)[None, :]
    hz = horizon / H
    # wall -> floor: smoothstep centred on the horizon, very wide (a sweep, not a line)
    t = np.clip((y - (hz - 0.30)) / 0.55, 0, 1); t = t * t * (3 - 2 * t)
    # Printed inside a stardust-soft band, so the sweep must never go darker
    # than Stardust itself or it reads as a grey mat around the bottles.
    wall_top = STARDUST
    col = (wall_top[None, None, :] * (1 - t[..., None]) + STARDUST_SOFT[None, None, :] * t[..., None])
    col = np.broadcast_to(col, (H, W, 3)).copy()
    mid = (y > hz - 0.3) & (y < hz + 0.3)
    col = np.where(mid[..., None], col, col)
    # key light pool: from upper-left, falls off to the right
    d = np.sqrt(((x - 0.28) / 0.75) ** 2 + ((y - 0.35) / 0.9) ** 2)
    pool = np.clip(1.0 - d, 0, 1) ** 1.6
    col *= (1.0 + 0.02 * pool)[..., None]   # light lifts, never darkens
    # gentle vignette
    v = 1 - 0.015 * (((x - 0.5) / 0.5) ** 2 + ((y - 0.45) / 0.55) ** 2)
    col *= np.clip(v, 0.99, 1)[..., None]
    # paper grain (monochrome + a whisper of fibre)
    g = grain(H, W, 1.8, seed, 0.8)
    fib = cv2.GaussianBlur(grain(H, W, 1.0, seed + 1, 0), (0, 0), sigmaX=6, sigmaY=0.8)
    col += (g + fib * 3.0)[..., None]
    return np.clip(col, 0, 255)


# ─── shadows / reflection for one bottle standing at (cx, base_y) ──────────
def ground_bottle(canvas, b, cx, base_y, light_from='left', reflect=0.08,
                  contact=0.70, cast=0.30, floor_rgb=None, reflect_blur=1.6):
    H, W = canvas.shape[:2]
    bw = b['a'].shape[1]
    bodyw = b['a'][int(b['base'] * 0.75)].sum()          # px width at the body
    x = int(round(cx - b['axis']))
    y = int(round(base_y - b['base']))

    # 1. cast shadow: silhouette laid flat on the floor, falling back and to the
    #    side away from the key light. Row r of the layer = r px behind the base.
    sil = b['a'][:int(b['base'])].astype(np.float32)
    hh = sil.shape[0]
    fh = max(4, int(hh * 0.20))
    flat = cv2.resize(sil[::-1], (bw, fh), interpolation=cv2.INTER_AREA)   # row 0 = base
    shear = 0.9 if light_from == 'left' else -0.9
    pad = int(bodyw * 1.2)
    Lw = bw + 2 * pad + int(abs(shear) * fh)
    layer = np.zeros((fh + 2 * pad, Lw), np.float32)
    ox0 = pad if shear > 0 else pad + int(abs(shear) * fh)
    layer[pad:pad + fh, ox0:ox0 + bw] = flat
    M = np.float32([[1, shear, -shear * pad], [0, 1, 0]])
    layer = cv2.warpAffine(layer, M, (Lw, layer.shape[0]))
    soft = cv2.GaussianBlur(layer, (0, 0), bodyw * 0.08)
    softer = cv2.GaussianBlur(layer, (0, 0), bodyw * 0.22)
    r = (np.arange(layer.shape[0], dtype=np.float32)[:, None] - pad) / fh
    dist = np.clip(r, 0, 1)
    shadow = (soft * (1 - dist) + softer * dist) * (1 - 0.7 * dist) * cast
    shadow = shadow[::-1]                       # far rows go up the frame
    base_row = shadow.shape[0] - 1 - pad
    full = np.zeros((H, W), np.float32)
    _paste_max(full, shadow, x - ox0, int(round(base_y)) - base_row)

    # 2. contact line + ambient occlusion. The camera is almost level, so the
    #    floor under the bottle is foreshortened: the occlusion is a thin, wide
    #    ellipse that shows mostly either side of the base and just in front.
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ex = (xx - cx) / (bodyw * 0.50)
    ey = (yy - base_y - 1.0) / (bodyw * 0.018)
    core = np.exp(-(np.abs(ex) ** 8 + ey ** 2)) * contact
    side = 0.08 if light_from == 'left' else -0.08
    ex2 = (xx - cx - side * bodyw) / (bodyw * 0.78)
    ey2 = (yy - base_y + bodyw * 0.015) / (bodyw * 0.075)
    ao = np.exp(-(ex2 ** 2 + ey2 ** 2) * 1.3) * contact * 0.60
    ex3 = (xx - cx - side * 2 * bodyw) / (bodyw * 1.25)
    ey3 = (yy - base_y + bodyw * 0.03) / (bodyw * 0.20)
    ao2 = np.exp(-(ex3 ** 2 + ey3 ** 2) * 1.2) * contact * 0.22
    full = 1 - (1 - np.clip(full, 0, 1)) * (1 - core) * (1 - ao) * (1 - ao2)
    full = np.clip(full, 0, 0.9)
    multiply_shadow(canvas, full)

    # 3. faint reflection on a satin floor: flipped, fading, slightly soft
    if reflect > 0:
        rh = int(b['base'] * 0.28)
        rb = b['rgb'][int(b['base']) - rh:int(b['base'])][::-1]
        ra = b['a'][int(b['base']) - rh:int(b['base'])][::-1].copy()
        fade = np.linspace(1, 0, rh, dtype=np.float32)[:, None] ** 1.6
        ra = cv2.GaussianBlur(ra * fade * reflect, (0, 0), reflect_blur)
        rb = cv2.GaussianBlur(rb, (0, 0), reflect_blur)
        over(canvas, rb, ra, x, int(round(base_y)) + 1)

    # 4. the bottle
    over(canvas, b['rgb'], b['a'], x, y)


def _paste_max(dst, src, x, y):
    H, W = dst.shape
    h, w = src.shape
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, W), min(y + h, H)
    if x1 > x0 and y1 > y0:
        dst[y0:y1, x0:x1] = np.maximum(dst[y0:y1, x0:x1], src[y0 - y:y1 - y, x0 - x:x1 - x])


# ─── modes ──────────────────────────────────────────────────────────────────
def studio(slugs, W=2400, H=1600, body_frac=0.15, front=0, gap=0.30, depth=0.035,
           reflect=0.05, seed=7, paper_target=None, glass=True, glass_flatten=0.5):
    bodyw = W * body_frac
    papers = [bc.build_cutout(s)['paper'] for s in slugs]
    if paper_target is None:            # meet in the middle: both move a little
        paper_target = np.mean(papers, axis=0)
    bs = []
    for i, s in enumerate(slugs):
        k = (1 + depth) if i == front else 1.0
        bs.append(prepared_bottle(s, bodyw * k, paper_target))
    if glass:
        match_glass(bs, flatten=glass_flatten)
    horizon = int(H * 0.66)
    canvas = studio_backdrop(W, H, horizon, seed)
    rear_base = H * 0.84
    front_base = rear_base + H * 0.028
    # x positions: centre the pair, rear first so the front one overlaps its shadow
    span = bodyw * (1 + gap)
    cxs = [W / 2 - span / 2, W / 2 + span / 2]
    order = [i for i in range(2) if i != front] + [front]
    for i in order:
        ground_bottle(canvas, bs[i], cxs[i], front_base if i == front else rear_base,
                      reflect=reflect)
    canvas += grain(H, W, 1.1, seed + 3, 0.6)[..., None]
    return np.clip(canvas, 0, 255), bs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slugs', nargs=2)
    ap.add_argument('--mode', default='studio', choices=['studio', 'scene', 'blend'])
    ap.add_argument('--out', required=True)
    ap.add_argument('--size', default='2400x1600')
    ap.add_argument('--front', type=int, default=0, help='index of the bottle a touch forward')
    ap.add_argument('--gap', type=float, default=0.30)
    ap.add_argument('--reflect', type=float, default=0.05)
    ap.add_argument('--plate', default='indoor-03')
    a = ap.parse_args()
    W, H = map(int, a.size.split('x'))
    if a.mode == 'studio':
        img, bs = studio(a.slugs, W, H, front=a.front, gap=a.gap, reflect=a.reflect)
    elif a.mode == 'scene':
        from scene import scene
        img, bs = scene(a.slugs, a.plate, W, H, front=a.front)
    else:
        from blend import blend
        img = blend(a.slugs, W, H); bs = []
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    Image.fromarray(img.astype(np.uint8)).save(a.out, dpi=(300, 300))
    for b in bs:
        print(b['slug'], 'scale', round(b['scale'], 3), 'gain', np.round(b['gain'], 3).tolist(), 'glass a*b* shift', b.get('glass_shift'))
    print('wrote', a.out)


if __name__ == '__main__':
    main()
