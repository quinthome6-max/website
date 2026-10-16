"""
(b) The two cut-out bottles on a warm tabletop, with a real room / vibe photo as
the out-of-focus background - the way a shallow-focus product shot looks.

The plate is mirrored when its window light comes from the right, so that its
light direction matches the bottles' front-left key. It is enlarged to the
scale a room 3-4 m behind a bottle 0.5 m from the lens would have, and lens-
blurred accordingly, so its resolution never shows.
"""
from __future__ import annotations
import numpy as np
import cv2
from PIL import Image
import compose as C
import bottlecut as bc

PLATES = {
    # name: (path under public/images, mirror?, crop box in source px (x0,y0,x1,y1))
    'indoor-03': ('indoor/indoor-03.webp', True, (230, 160, 1030, 693)),
    'indoor-02': ('indoor/indoor-02.webp', True, (560, 140, 1360, 673)),
    'vibe-19':   ('vibe/vibe-19.webp', False, (0, 120, 520, 467)),
    'vibe-21':   ('vibe/vibe-21.webp', False, (0, 430, 700, 897)),
}


def lens_blur(img, radius):
    """disc (bokeh) blur rather than gaussian - reads as a lens, not a filter."""
    r = int(radius)
    k = np.zeros((2 * r + 1, 2 * r + 1), np.float32)
    cv2.circle(k, (r, r), r, 1.0, -1, lineType=cv2.LINE_AA)
    k /= k.sum()
    lin = C.srgb_to_lin(img)
    out = cv2.filter2D(lin, -1, k, borderType=cv2.BORDER_REFLECT)
    return C.lin_to_srgb(out)


PLATE_GRADE = {'vibe-19': (0.55, 10)}    # (chroma factor, L lift): tame the clay wall


def plate_image(name, W, H, horizon, blur=38):
    path, mirror, box = PLATES[name]
    im = Image.open(f'{C.ROOT}/{path}').convert('RGB')
    if mirror:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im = im.crop(box)
    # cover W x horizon+margin (the table hides the rest)
    ph = int(horizon + H * 0.12)
    s = max(W / im.width, ph / im.height)
    im = im.resize((int(im.width * s) + 1, int(im.height * s) + 1), Image.BICUBIC)
    a = np.asarray(im, np.float32)
    a = a[:ph, (a.shape[1] - W) // 2:(a.shape[1] - W) // 2 + W]
    a = lens_blur(a, blur)
    # grade toward the brand's warm neutrals: lift, soften contrast, pull green
    lab = cv2.cvtColor((a / 255).astype(np.float32), cv2.COLOR_RGB2LAB)
    cf, lift = PLATE_GRADE.get(name, (0.85, 6))
    lab[..., 0] = 50 + (lab[..., 0] - 50) * 0.80 + lift
    lab[..., 1] = np.maximum(lab[..., 1], 0) * cf + 1.5        # no negative a* (green)
    lab[..., 2] = lab[..., 2] * cf * 0.95 + 3
    a = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB) * 255
    out = np.zeros((H, W, 3), np.float32)
    out[:ph] = a
    return out


def tabletop(canvas, edge_y, seed=11):
    """warm honed limestone tabletop from edge_y down, key light from the left.
    The back edge sits behind the plane of focus, so it is soft."""
    H, W = canvas.shape[:2]
    y = np.arange(H, dtype=np.float32)[:, None]
    x = np.linspace(0, 1, W, dtype=np.float32)[None, :]
    base = np.array([0xe8, 0xdd, 0xcd], np.float32)
    t = np.clip((y - edge_y) / (H - edge_y), 0, 1)
    # far part of the table is further from the key light -> darker; pool of light left-centre
    shade = (0.86 + 0.16 * np.sqrt(t))
    pool = np.exp(-(((x - 0.35) / 0.55) ** 2 + ((t - 0.55) / 0.6) ** 2))
    shade = shade * (0.95 + 0.08 * pool)
    col = base[None, None, :] * shade[..., None]
    rng = np.random.default_rng(seed)
    lf = cv2.resize(rng.normal(0, 1, (10, 30)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
    mf = cv2.GaussianBlur(rng.normal(0, 1, (H, W)).astype(np.float32), (0, 0), sigmaX=10, sigmaY=2.0)
    mf /= mf.std() + 1e-6
    pores = (rng.random((H, W)) > 0.9985).astype(np.float32)
    pores = cv2.GaussianBlur(pores, (0, 0), 0.9) * -40
    col += (lf * 2.0 + mf * 1.2 + pores)[..., None]
    # depth of field on the table itself: blur rows by distance from the focus line
    focus = H * 0.84
    far = np.clip((focus - y) / (focus - edge_y), 0, 1)
    blurred = cv2.GaussianBlur(col, (0, 0), 5)
    col = col * (1 - far[..., None] * 0.9) + blurred * (far[..., None] * 0.9)
    # soft edge (out of focus): smooth 0..1 over ~10 px
    m = np.clip((y - edge_y + 5) / 10.0, 0, 1)
    m = m * m * (3 - 2 * m)
    canvas[:] = canvas * (1 - m[..., None]) + col * m[..., None]


def scene(slugs, plate='indoor-03', W=2400, H=1600, front=0, body_frac=0.15, gap=0.30,
          depth=0.035, seed=7, glass=True):
    bodyw = W * body_frac
    papers = [bc.build_cutout(s)['paper'] for s in slugs]
    horizon = int(H * 0.60)
    edge_y = int(H * 0.655)
    canvas = plate_image(plate, W, H, horizon)
    # the room's white point decides how warm the labels should read
    wall = canvas[:edge_y].reshape(-1, 3)
    lum = wall @ np.array([0.299, 0.587, 0.114])
    room_white = np.median(wall[lum > np.percentile(lum, 90)], axis=0)
    target = np.mean(papers, axis=0)
    target = target * 0.85 + (room_white / room_white.max() * target.max()) * 0.15
    bs = []
    for i, s in enumerate(slugs):
        k = (1 + depth) if i == front else 1.0
        bs.append(C.prepared_bottle(s, bodyw * k, target))
    if glass:
        C.match_glass(bs)
    tabletop(canvas, edge_y, seed)
    rear_base = H * 0.84
    front_base = rear_base + H * 0.028
    span = bodyw * (1 + gap)
    cxs = [W / 2 - span / 2, W / 2 + span / 2]
    order = [i for i in range(2) if i != front] + [front]
    for i in order:
        C.ground_bottle(canvas, bs[i], cxs[i], front_base if i == front else rear_base,
                        reflect=0.035, contact=0.75, cast=0.28, reflect_blur=5.0)
    canvas += C.grain(H, W, 1.3, seed + 3, 0.6)[..., None]
    return np.clip(canvas, 0, 255), bs
