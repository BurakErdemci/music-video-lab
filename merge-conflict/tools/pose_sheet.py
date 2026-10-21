#!/usr/bin/env python3
"""pose_sheet.py - skeleton overlay contact sheet of the pose keypoints (public/cards/<id>.pose.json).

  uv run --with pillow python -I tools/pose_sheet.py OUT.jpg [--cols N] [ID ...]

Draws each card on grey with its bones (image-left side cyan, image-right magenta, spine white, hair
yellow), the joints labelled, and a faint 0.1 grid, so a wrong joint is visible at a glance.
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

CARDS = Path(__file__).resolve().parent.parent / 'video' / 'public' / 'cards'
BONES = [('hips', 'chest', 'w'), ('chest', 'neck', 'w'), ('neck', 'head', 'w'),
         ('chest', 'lShoulder', 'l'), ('lShoulder', 'lElbow', 'l'), ('lElbow', 'lWrist', 'l'),
         ('chest', 'rShoulder', 'r'), ('rShoulder', 'rElbow', 'r'), ('rElbow', 'rWrist', 'r'),
         ('hips', 'lKnee', 'l'), ('lKnee', 'lAnkle', 'l'), ('hips', 'rKnee', 'r'), ('rKnee', 'rAnkle', 'r')]
COL = {'w': (255, 255, 255), 'l': (0, 230, 255), 'r': (255, 60, 220), 'h': (255, 230, 0)}
ABBR = {'head': 'hd', 'neck': 'nk', 'chest': 'ch', 'hips': 'hp', 'lShoulder': 'lS', 'lElbow': 'lE', 'lWrist': 'lW',
        'rShoulder': 'rS', 'rElbow': 'rE', 'rWrist': 'rW', 'lKnee': 'lK', 'lAnkle': 'lA', 'rKnee': 'rK', 'rAnkle': 'rA', 'hairRoot': 'hr'}

def tile(cid, H=640):
    im = Image.open(CARDS / f'{cid}.png').convert('RGBA')
    W = round(im.width * H / im.height)
    im = im.resize((W, H), Image.LANCZOS)
    bg = Image.new('RGBA', (W, H + 26), (90, 90, 100, 255))
    bg.alpha_composite(im, (0, 26))
    d = ImageDraw.Draw(bg)
    f = ImageFont.truetype('C:/Windows/Fonts/consolab.ttf', 15)
    for k in range(1, 10):
        d.line([(W * k / 10, 26), (W * k / 10, H + 26)], fill=(255, 255, 0, 50))
        d.line([(0, 26 + H * k / 10), (W, 26 + H * k / 10)], fill=(255, 255, 0, 50))
    p = json.loads((CARDS / f'{cid}.pose.json').read_text())
    xy = lambda q: (q[0] * W, 26 + q[1] * H)
    for a, b, c in BONES:
        if p.get(a) and p.get(b):
            d.line([xy(p[a]), xy(p[b])], fill=COL[c], width=4)
    for t in p.get('hairTips', []):
        if p.get('hairRoot'):
            d.line([xy(p['hairRoot']), xy(t)], fill=COL['h'], width=3)
    for k, ab in ABBR.items():
        if p.get(k):
            x, y = xy(p[k])
            d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(0, 0, 0), outline=(255, 255, 255), width=2)
            d.text((x + 7, y - 8), ab, fill=(255, 255, 255), font=f, stroke_width=2, stroke_fill=(0, 0, 0))
    d.text((4, 4), cid, fill=(255, 255, 255), font=f)
    return bg.convert('RGB')

def main():
    args = sys.argv[1:]
    out = args.pop(0)
    cols = 6
    if args[:1] == ['--cols']:
        cols = int(args[1]); args = args[2:]
    ids = args or sorted(p.name.split('.')[0] for p in CARDS.glob('*.pose.json'))
    tiles = [tile(i) for i in ids]
    w = max(t.width for t in tiles); h = max(t.height for t in tiles)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (w + 6), rows * (h + 6)), (20, 20, 26))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
    sheet.save(out, quality=90)
    print(out, len(tiles), 'cards')

if __name__ == '__main__':
    main()
