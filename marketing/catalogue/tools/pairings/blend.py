"""
(c) One continuous frame from the two existing oil photos: each photo scaled
uniformly so the bottles match in size and stand on the same line, the two
frames overlapped, and the seam replaced by a wide feathered blend. The two
photos are nudged toward each other's overall tone (50 % Reinhard transfer in
Lab) so the join is gradual. Nothing inside the bottles is changed except that
global tone.
"""
from __future__ import annotations
import numpy as np
import cv2
from PIL import Image
import bottlecut as bc


def _tone_meet(a, b, amount=0.5):
    la = cv2.cvtColor((a / 255).astype(np.float32), cv2.COLOR_RGB2LAB)
    lb = cv2.cvtColor((b / 255).astype(np.float32), cv2.COLOR_RGB2LAB)
    ma, sa = la.reshape(-1, 3).mean(0), la.reshape(-1, 3).std(0)
    mb, sb = lb.reshape(-1, 3).mean(0), lb.reshape(-1, 3).std(0)
    m, s = (ma + mb) / 2, (sa + sb) / 2
    out = []
    for l, mu, sd in ((la, ma, sa), (lb, mb, sb)):
        t = (l - mu) / sd * s + m
        l2 = l * (1 - amount) + t * amount
        out.append(np.clip(cv2.cvtColor(l2, cv2.COLOR_LAB2RGB) * 255, 0, 255))
    return out


def blend(slugs, W=2400, H=1600, body_frac=0.15, feather=0.085, tone=0.5):
    photos, cuts = [], []
    for s in slugs:
        photos.append(np.asarray(Image.open(f'{bc.SRC}/{s}-v2.webp').convert('RGB'), np.float32))
        cuts.append(bc.build_cutout(s))
    base_y = H * 0.84
    cx = [W * 0.33, W * 0.67]
    layers = []
    for p, c, x in zip(photos, cuts, cx):
        s = W * body_frac / c['body_w']
        im = cv2.resize(p, None, fx=s, fy=s, interpolation=cv2.INTER_LANCZOS4)
        ax = (c['src_box'][0] + c['axis']) * s
        by = (c['src_box'][1] + c['base']) * s
        M = np.float32([[1, 0, x - ax], [0, 1, base_y - by]])
        layers.append(cv2.warpAffine(im, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT))
    layers = _tone_meet(layers[0], layers[1], tone)
    xs = np.linspace(0, 1, W, dtype=np.float32)
    t = np.clip((xs - (0.5 - feather)) / (2 * feather), 0, 1)
    t = t * t * (3 - 2 * t)
    return layers[0] * (1 - t)[None, :, None] + layers[1] * t[None, :, None]
