"""
Render the "Paired with" image for every product page, straight from the
catalogue's own copy.json (so the pairs can never drift from the text).

  python3 make_pairings.py                       # studio, all five, from copy.json
  python3 make_pairings.py --mode scene --plate vibe-19
  python3 make_pairings.py --pair monolith grand-lobby the-arrival   # override one

Output: composite/pair-<product>-<mode>.png (2400x1600, 300 dpi tag)
"""
import argparse, json, os
import numpy as np
from PIL import Image
import compose as C

COPY = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'copy.json')
HOTEL = {'grand-lobby', 'the-arrival'}          # Hotel Credential oils stand a touch forward
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'composite')


def pairs_from_copy():
    d = json.load(open(COPY))
    return {p['slug']: [x['oil'] for x in p['pairing']] for p in d['products']}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', default='studio', choices=['studio', 'scene'])
    ap.add_argument('--plate', default='vibe-19')
    ap.add_argument('--pair', nargs=3, action='append', metavar=('PRODUCT', 'OIL_A', 'OIL_B'))
    ap.add_argument('--only', nargs='*')
    a = ap.parse_args()
    pairs = pairs_from_copy()
    for prod, x, y in a.pair or []:
        pairs[prod] = [x, y]
    for prod, slugs in pairs.items():
        if a.only and prod not in a.only:
            continue
        front = 1 if (slugs[1] in HOTEL and slugs[0] not in HOTEL) else 0
        if a.mode == 'studio':
            img, bs = C.studio(slugs, front=front)
        else:
            from scene import scene
            img, bs = scene(slugs, a.plate, front=front)
        tag = a.mode if a.mode == 'studio' else f'scene-{a.plate}'
        path = f'{OUT}/pair-{prod}-{tag}.png'
        Image.fromarray(img.astype(np.uint8)).save(path, dpi=(300, 300))
        print(prod, slugs, 'front=', slugs[front], '->', path)


if __name__ == '__main__':
    main()
