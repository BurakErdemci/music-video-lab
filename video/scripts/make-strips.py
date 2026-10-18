"""Copy the key-pose strips into video/public/strips and measure them for the Actor.

usage (repo root): python video/scripts/make-strips.py [--sheet out.png]

Writes video/src/characters/stripData.ts. Each frame gets its size and a foot anchor measured from the
alpha channel (the strips are cropped to the figure, so the bottom-centre of the crop is NOT a stable
anchor: raised arms and strides change the crop width). Anchor modes:
  feet  - centre of the opaque pixels in the bottom 4% of rows (standing, sitting, kneeling)
  torso - centre of the opaque pixels in rows 30-60% (walk cycles: the hips stay put, the feet swing)
  right - the planted hands on the floor at the right edge (A02/A14, sitting with legs out)
  desk  - the right leg of the desk (strips drawn with the chair, desk and laptop): the furniture stays put
The AI strips also get the cursor slit (the dark vertical bar in the head), so a blink can paint over it.

Scale: every human strip is normalised so the figure is as tall on screen as the canonical frame
(H09-don-1, 888 px source = 675 px on screen). `ref` is the source height of that strip's figure standing
upright (measured with the --measure table below, posture noted next to it); strips drawn with the desk are
normalised through the desk height instead, so the furniture is the same size in every desk strip.
Walk strips also store the floor contacts of every frame (`ground`), which the walk uses to keep the
stance foot planted.
"""
import json
import os
import shutil
import sys
from collections import deque

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'stil', 'hareket', 'kare')
DST = os.path.join(ROOT, 'video', 'public', 'strips')
OUT = os.path.join(ROOT, 'video', 'src', 'characters', 'stripData.ts')

SCALE = 0.76  # the canonical human (H09-don-1) comes out 675 px tall on screen
CANON_H = 888  # source px of the canonical standing figure


def four(name):
    return [f'{name}-{i}' for i in range(1, 5)]


def interleave(keys, mids):
    return [x for pair in zip(four(keys), four(mids)) for x in pair]


# sid: frames (source names without .png), anchor mode, normalisation.
#   ref  = source height of the upright standing figure in that strip (human strips)
#   k    = plain extra factor (AI strips that drifted against their family)
#   desk = normalise by desk height to the strip named (the desk family follows H16 f4, standing)
STRIPS = {
    # 12 drawings a step: the 4 keys, the 4 in-betweens and 4 more where the spacing left a gap (A01c, H05c);
    # the order follows the stance foot's measured position (see walkAdvance in characters/actor.ts)
    'A01': (['A01-yuru-1', 'A01b-yuru-ara-1', 'A01c-yuru-ara2-1', 'A01c-yuru-ara2-2', 'A01-yuru-2', 'A01b-yuru-ara-2', 'A01-yuru-3',
             'A01b-yuru-ara-3', 'A01-yuru-4', 'A01c-yuru-ara2-3', 'A01c-yuru-ara2-4', 'A01b-yuru-ara-4'], 'torso',
            {'k': 1.014, 'ref': 857, 'refs': {'A01b': 849, 'A01c': 'measure'}, 'walk': True}),
    'A02': (four('A02-sallan'), 'right', {'k': 1.15}),
    'A03': (four('A03-camciz'), 'feet', {'k': 1.0}),
    'A04': (four('A04-ay'), 'feet', {'k': 1.0}),
    'A05': (four('A05-hizala'), 'feet', {'k': 1.077}),
    'A06': (four('A06-merak'), 'feet', {'k': 1.0}),
    'A07': (four('A07-elsalla'), 'feet', {'k': 1.0}),
    'A08': (four('A08-sallanma'), 'feet', {'k': 1.0}),
    'A09': (four('A09-okuma'), 'feet', {'k': 0.80}),
    'A10': (four('A10-don'), 'feet', {'k': 0.952}),
    'A11': (four('A11-yaz'), 'feet', {'k': 0.984}),
    # AI continuity (test90-v5): every AI strip is scaled so her head is the canonical standing size (A08 f1: head 87 px
    # wide, slit 37 px on screen) and standing strips stand 660 px tall. Measured at the slit row; the reading strips
    # (A09/A17) were drawn ~25% big, the leg-swing family (A02/A14/A18 f1) ~13% small.
    'A14': (four('A14-oturma'), 'right', {'k': 1.12}),
    'H01': (four('H01v2-yaz'), 'desk', {'desk': 'H16'}),
    'H02': (four('H02v2-kahve'), 'feet', {'ref': 858}),  # f1 upright
    'H03': (four('H03v2-gerin'), 'feet', {'ref': 770}),  # f2 upright leaning back; f4 slumped 718 (head bowed)
    'H04': (four('H04v2-igne'), 'feet', {'ref': 801}),  # f1/f4 upright
    'H05': (['H05v2-yuru-1', 'H05b-yuru-ara-1', 'H05v2-yuru-2', 'H05b-yuru-ara-2', 'H05v2-yuru-3', 'H05b-yuru-ara-3',
             'H05c-yuru-ara2-1', 'H05c-yuru-ara2-2', 'H05c-yuru-ara2-3', 'H05c-yuru-ara2-4', 'H05v2-yuru-4', 'H05b-yuru-ara-4'],
            'torso', {'ref': 814, 'refs': {'H05b': 804, 'H05c': 'measure'}, 'walk': True}),  # "up" key
    'H06': (four('H06v2-defter'), 'feet', {'ref': 858}),  # sitting: head 126 px = H02's head 126 px
    'H07': (four('H07v2-cam'), 'feet', {'ref': 833}),  # f2 upright, knocking
    'H08': (four('H08-yorgun'), 'feet', {'ref': 797}),  # f1 head bowed 757 / 0.95
    'H09': (four('H09-don'), 'feet', {'ref': 888}),  # canonical
    'H10': (four('H10v2-elsalla'), 'feet', {'ref': 746}),  # f4 upright, hand low
    'H11': (four('H11v2-defter-goster'), 'feet', {'ref': 850}),  # f1 upright
    'H12': (four('H12v2-not-yapistir'), 'feet', {'ref': 809}),  # f2 upright
    'H15': (four('H15-masa'), 'desk', {'desk': 'H16'}),
    'H16': (four('H16-kalk'), 'desk', {'ref': 599}),  # f4 standing upright beside the desk
    # getting up from the desk (test90-v4). H01 -> H16 slid the chair ~150 px and melted. Picked from three
    # generations by the chair's back leg (distance from the desk leg / desk height): H15 1.23, H17d f1-f3 1.26,
    # H17b f4 1.28 (H17d f4 had pushed the chair back to 1.36). The rise starts from H15, not H01 (1.16).
    'H17': (['H17d-kalkis-1', 'H17d-kalkis-2', 'H17d-kalkis-3', 'H17b-kalkis-4'], 'desk', {'desk': 'H16'}),
    # walk drawn so the stance foot stays on one spot while the body passes over it (one support phase)
    'H20': (four('H20-yuru'), 'torso', {'ref': 800, 'refs': {'H20': 'measure'}, 'walk': True}),
    # ... and the second half of the support phase, two generations (they fill the gap where H05 has no drawing:
    # the stance toe jumped from 65 px ahead of the hips to 41 px behind them)
    'H22': (four('H22-yuru-ara') + four('H22b-yuru-ara'), 'torso', {'ref': 800, 'refs': {'H22-': 'measure', 'H22b': 'measure'}, 'walk': True}),
    # in-betweens generated between two pool drawings each (H22 f2 -> f3, H20 f2 -> f3), to close the stance-foot gaps
    # that still made the body jump 34-54 px in one frame once the foot was planted
    'H23': (four('H23-yuru-ara') + four('H24-yuru-ara'), 'torso', {'ref': 800, 'refs': {'H23': 'measure', 'H24': 'measure'}, 'walk': True}),
    'A20': (four('A20-yuru-ara') + four('A21-yuru-ara'), 'torso', {'k': 1.014, 'ref': 857, 'refs': {'A20': 'measure', 'A21': 'measure'}, 'walk': True}),
    # the AI's support phase, two generations, same reason (A01's stance toe jumped from 43 px behind to 43 ahead)
    'A19': (four('A19-yuru-ara') + four('A19b-yuru-ara'), 'torso', {'k': 1.014, 'ref': 857, 'refs': {'A19-': 'measure', 'A19b': 'measure'}, 'walk': True}),
    # the AI sitting down cross-legged with the notebook (A06 f1 -> A09 f1) and changing to legs out (A09 -> A02)
    # (per-frame 'ks': the in-betweens grow from the standing family's size to A09's, which is drawn ~8% bigger)
    'A15': (four('A15-cokme'), 'feet', {'k': 1.0, 'ks': [1.0, 0.99, 0.985, 0.98]}),
    'A16': (four('A16-uzan'), 'feet', {'k': 1.0, 'ks': [1.065, 1.07, 1.05, 1.15]}),
    'A17': (four('A17-okuma2'), 'feet', {'k': 0.81}),
    # bending down to the notebook (A06 f1 -> A15 f1 in four steps; that one morph lost her head): f1 741 px vs
    # A06 f1 845, f4 514 vs A15 f1 536
    'A22': (four('A22-egil'), 'feet', {'k': 1.0, 'ks': [1.14, 1.10, 1.07, 1.04]}),
    # getting up from the floor (A02 f1 -> A06 f1): A02 is drawn ~17% smaller than the standing family, so the
    # in-betweens grow from A02's size (f1 417 px vs A02 430) to A06's (f4 707 px vs A06 f1 845, bent less)
    'A18': (four('A18-kalk'), 'feet', {'k': 1.0, 'ks': [1.17, 1.17, 1.18, 1.19]}),  # more reading business, same size as A09
    'H18': (four('H18-yer'), 'feet', {'ref': 858}),  # more floor business, same size as H06
    'H19': (four('H19-not'), 'feet', {'ref': 809}),  # preparing a note at the glass, same size as H12
    # sitting down on the floor with the notebook (standing -> H06 f1); scaled by its standing first drawing
    'H21': (four('H21-otur'), 'feet', {'ref': 800, 'refs': {'H21': 'measure'}}),
    # the calendar decline at the glass (test90-v5): forehead on the glass, hand flat on it with the head down;
    # sliding down with his back to the glass (drawn facing right, played mirrored: his back on the glass); sitting
    # against it. H25 f1 stands slightly bowed (813 px; upright ~830); H26 f1 stands upright; H27 is seated like H26 f4
    # (393 px vs 387 px), so it takes H26's scale
    'H25': (four('H25-cam-yasla'), 'feet', {'ref': 830}),
    'H26': (four('H26-sirt-kay'), 'feet', {'ref': 793}),
    'H27': (four('H27-sirt-otur'), 'feet', {'ref': 800}),
    # one walking step in four drawings from ONE image (contact, down, passing, up), played in a fixed order at an
    # even rate (test90-v5: the planted-foot picker mixed 6 generations and stuttered). Measured: no generated set
    # spaces the planted foot evenly (H28, H28b, the 6-drawing H29 and the old single-image sets all put 1/2-3/4 of
    # the step into one change); H28b is the cleanest drawing set; scaled by its tallest drawing
    'H28': (four('H28b-yuru-adim'), 'torso', {'ref': 800, 'refs': {'H28b': 'measure'}, 'walk': True}),
    'DESK': (['MASA-dekor'], 'desk', {'desk': 'H16'}),
}


def solid_of(im):
    w, h = im.size
    a = im.split()[3].load()
    return [[a[x, y] > 40 for x in range(w)] for y in range(h)]


def anchor(solid, w, h, mode):
    if mode == 'torso':
        y0, y1 = int(h * 0.30), int(h * 0.60)
        xs = [x for y in range(y0, y1) for x in range(w) if solid[y][x]]
    elif mode == 'right':
        xs = [w - 60]
    elif mode == 'desk':
        return desk_leg(solid, w, h)[0]
    else:
        y0 = int(h * 0.96)
        xs = [x for y in range(y0, h) for x in range(w) if solid[y][x]]
    return round(sum(xs) / max(1, len(xs)))


def desk_leg(solid, w, h):
    """(x of the desk's right leg, desk height): the rightmost opaque column run that touches the floor."""
    bottom = [x for y in range(h - max(8, int(h * 0.03)), h) for x in range(w) if solid[y][x]]
    right = max(bottom)
    col = right - 3
    y = h - 1
    while y > 0 and not solid[y][col]:
        y -= 1
    run = 0
    while y - run > 0 and solid[y - run][col]:
        run += 1
    return col, run


def ground(solid, w, h):
    """Floor contacts: opaque x runs in the bottom 1.5% rows, as [x0, x1] pairs (source px)."""
    y0 = h - max(3, int(h * 0.015))
    cols = [any(solid[y][x] for y in range(y0, h)) for x in range(w)]
    runs, start = [], None
    for x, c in enumerate(cols + [False]):
        if c and start is None:
            start = x
        elif not c and start is not None:
            if x - start >= 6:
                runs.append([start, x - 1])
            start = None
    return runs


def find_slit(im, solid):
    """The AI's cursor slit: a dark, elongated blob fully inside the head."""
    w, h = im.size
    px = im.load()
    rows = [y for y in range(h) if any(solid[y])]
    top = rows[0]
    limit = min(h, top + 230)
    dark = [[solid[y][x] and px[x, y][3] > 200 and sum(px[x, y][:3]) < 230 for x in range(w)] for y in range(h)]
    seen = set()
    best = None
    for y in range(top, limit):
        for x in range(w):
            if not dark[y][x] or (x, y) in seen:
                continue
            q = deque([(x, y)])
            seen.add((x, y))
            pts = []
            while q:
                cx, cy = q.popleft()
                pts.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and top <= ny < limit and dark[ny][nx] and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        q.append((nx, ny))
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
            if len(pts) < 150 or bh < 28 or bh > 95 or bw > 44:
                continue
            margin = 6
            ok = all(
                0 <= yy < h and 0 <= xx < w and solid[yy][xx]
                for yy in range(min(ys) - margin, max(ys) + margin + 1, 2)
                for xx in range(min(xs) - margin, max(xs) + margin + 1, 2)
            )
            if ok and (best is None or len(pts) > best[0]):
                best = (len(pts), min(xs), min(ys), bw, bh)
    if not best:
        return None
    return {'x': best[1], 'y': best[2], 'w': best[3], 'h': best[4]}


def load(name):
    im = Image.open(os.path.join(SRC, f'{name}.png')).convert('RGBA')
    if name == 'MASA-dekor':
        return im
    return im


def main():
    os.makedirs(DST, exist_ok=True)
    data = {}
    desk_h = {}
    # pass 1: measure, so the desk family can be normalised to H16
    measured = {}
    for sid, (names, mode, norm) in STRIPS.items():
        frames = []
        for name in names:
            im = load(name)
            w, h = im.size
            solid = solid_of(im)
            fr = {'file': f'{name}.png', 'w': w, 'h': h, 'ax': anchor(solid, w, h, mode)}
            fr['_top'] = h - next(y for y in range(h) if any(solid[y]))
            if mode == 'desk':
                fr['_desk'] = desk_leg(solid, w, h)[1]
            if norm.get('walk'):
                fr['ground'] = ground(solid, w, h)
            if sid.startswith('A'):
                slit = find_slit(im, solid)
                if slit:
                    fr['slit'] = slit
            frames.append(fr)
        measured[sid] = frames
        if mode == 'desk':
            desk_h[sid] = sorted(f['_desk'] for f in frames)[len(frames) // 2]
    for sid, (names, mode, norm) in STRIPS.items():
        frames = measured[sid]
        if sid.startswith('A'):
            scale = SCALE * norm['k']
        elif 'desk' in norm:
            base = STRIPS[norm['desk']][2]['ref']
            scale = SCALE * CANON_H / base * desk_h[norm['desk']] / desk_h[sid]
        else:
            scale = SCALE * CANON_H / norm['ref']
        per_frame = None
        if 'refs' in norm:  # walk keys and in-betweens come from separate images: each image keeps its own size
            def ref_of(fr):
                for prefix, r in norm['refs'].items():
                    if fr['file'].startswith(prefix):
                        if r == 'measure':  # tallest frame of that image = the upright 'up' phase
                            return max(f['_top'] for f in frames if f['file'].startswith(prefix))
                        return r
                return norm['ref']
            # humans: to the canonical height; the AI: to her own walk keys (A01 'up', 857 px)
            top = CANON_H if sid.startswith('H') else norm['ref']
            per_frame = [SCALE * top / ref_of(fr) * (1 if sid.startswith('H') else norm['k']) for fr in frames]
        if 'ks' in norm:
            per_frame = [scale * k for k in norm['ks']]
        for i, fr in enumerate(frames):
            fr.pop('_desk', None)
            fr.pop('_top', None)
            if per_frame:
                fr['k'] = round(per_frame[i] / scale, 4)
            shutil.copyfile(os.path.join(SRC, fr['file']), os.path.join(DST, fr['file']))
        meta = {'who': 'ai' if sid.startswith('A') else 'human', 'scale': round(scale, 4), 'frames': frames}
        if norm.get('walk'):
            meta['walk'] = True
        if mode == 'desk':
            meta['desk'] = True
        data[sid] = meta
        print(sid, mode, round(scale, 3), [(f['w'], f['ax']) for f in frames], 'desk h' if mode == 'desk' else '', desk_h.get(sid, ''))
    lines = [
        '// Generated by video/scripts/make-strips.py from stil/hareket/kare. Do not edit by hand.',
        'export interface StripFrame {',
        '  file: string;',
        '  w: number;',
        '  h: number;',
        '  ax: number;',
        '  slit?: { x: number; y: number; w: number; h: number };',
        '  /** Extra scale of this frame against the strip scale (walk keys and in-betweens drawn in two images). */',
        '  k?: number;',
        '  /** Floor contacts [x0, x1] in source px (walk strips): the stance foot is kept planted on one of them. */',
        '  ground?: [number, number][];',
        '}',
        "export interface StripMeta { who: 'human' | 'ai'; scale: number; /** Folder under public/. */ dir: 'strips' | 'poses'; frames: StripFrame[]; walk?: boolean; desk?: boolean }",
        'export const STRIPS: Record<string, StripMeta> = ' + json.dumps({k: dict(v, dir='strips') for k, v in data.items()}, indent=1) + ';',
        '',
    ]
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print('wrote', OUT)
    if '--sheet' in sys.argv:
        contact_sheet(data, sys.argv[sys.argv.index('--sheet') + 1])


def contact_sheet(data, out):
    """One frame per human strip at its on-screen size, feet on one baseline: the same-person check."""
    pick = {'H01': 0, 'H02': 0, 'H03': 1, 'H04': 0, 'H05': 6, 'H06': 1, 'H07': 1, 'H09': 0, 'H10': 3, 'H11': 0, 'H12': 1, 'H15': 2, 'H16': 3, 'H25': 1, 'H26': 0, 'H27': 1, 'H28': 2}
    tiles = []
    for sid, k in pick.items():
        m = data[sid]
        f = m['frames'][k]
        s = m['scale'] * f.get('k', 1)
        im = Image.open(os.path.join(SRC, f['file'])).convert('RGBA')
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        tiles.append((sid, im, round(im.getbbox()[1]) if im.getbbox() else 0))
    W = sum(t[1].width for t in tiles) + 20 * len(tiles) + 20
    H = max(t[1].height for t in tiles) + 60
    sheet = Image.new('RGB', (W, H), (240, 211, 90))
    d = ImageDraw.Draw(sheet)
    x = 20
    base = H - 10
    canon_top = base - round(CANON_H * SCALE)
    d.line([(0, canon_top), (W, canon_top)], fill=(200, 60, 60), width=2)
    for sid, im, _ in tiles:
        sheet.paste(im, (x, base - im.height), im)
        d.text((x + 4, 6), sid, fill='black')
        x += im.width + 20
    sheet.save(out)
    print('sheet', out)


if __name__ == '__main__':
    sys.exit(main())
