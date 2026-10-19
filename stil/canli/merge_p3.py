# Merges the part-3 lane sprite lists (sprites-p3-{h,bus,a,pl}.json) into video/src/living/sprites-p3.json.
# Run from the repo root: python stil/canli/merge_p3.py
import json, os
D = os.path.join('video', 'src', 'living')
out = {}
for lane in ('h', 'bus', 'a', 'pl'):
    p = os.path.join(D, 'sprites-p3-%s.json' % lane)
    if os.path.exists(p):
        part = json.load(open(p))
        dup = set(part) & set(out)
        if dup:
            raise SystemExit('duplicate sprite names: %s' % dup)
        out.update(part)
        print(lane, len(part), sorted(part))
json.dump(out, open(os.path.join(D, 'sprites-p3.json'), 'w'), indent=1)
print('total', len(out))
