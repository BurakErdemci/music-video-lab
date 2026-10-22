"""Build the w-wide round: a 16:9 canvas per painting (original centred, mirrored-blur placeholder sides),
one outpaint prompt each, and round.json for tools/imagegen/run_round.py."""
import glob, json, os, sys
from PIL import Image, ImageFilter
root = sys.argv[1]
rd = os.path.join(root, 'stil/prompts/w-wide'); os.makedirs(rd + '/work', exist_ok=True); os.makedirs(rd + '/out', exist_ok=True)
PROMPT = open(sys.argv[2], encoding='utf-8').read()
items = []
for src in sorted(glob.glob(root + '/stil/prompts/q-panels/out/QK*.png') + glob.glob(root + '/stil/prompts/r-panels/out/RK*.png')):
    name = os.path.basename(src)[:-4]; pid = name.split('-')[0]
    im = Image.open(src).convert('RGB'); H = 1024; w0 = round(im.width * H / im.height); im = im.resize((w0, H), Image.LANCZOS)
    W = round(H * 16 / 9); W += W % 2; pad = (W - w0) // 2
    c = Image.new('RGB', (W, H))
    c.paste(im.crop((0, 0, pad, H)).transpose(Image.FLIP_LEFT_RIGHT).filter(ImageFilter.GaussianBlur(24)), (0, 0))
    c.paste(im.crop((w0 - pad, 0, w0, H)).transpose(Image.FLIP_LEFT_RIGHT).filter(ImageFilter.GaussianBlur(24)), (pad + w0, 0))
    c.paste(im, (pad, 0))
    cv = f'stil/prompts/w-wide/work/{pid}-canvas.png'; c.save(os.path.join(root, cv))
    pp = f'stil/prompts/w-wide/{pid}-wide.prompt.txt'
    open(os.path.join(root, pp), 'w', encoding='utf-8').write(PROMPT.replace('{OUT}', f'{pid}-wide.png'))
    items.append({'id': f'{pid}-wide', 'prompt': pp, 'refs': [cv], 'out': f'stil/prompts/w-wide/out/{pid}-wide.png', 'src': __import__('pathlib').Path(os.path.relpath(src, root)).as_posix()})
json.dump(items, open(rd + '/round.json', 'w'), indent=1)
print(len(items), 'items')
