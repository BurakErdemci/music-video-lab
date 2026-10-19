# Part 3 lane pl (plates and props): 7 generations (6 + 1 retry), all rc=0, Codex window not full

Raw: `ham/p3-pl-*.png`, md5 pairs in `ham/md5-p3-pl.txt` (7 lines, equal). Prompts `prompts/p3-pl-*.txt` (from `make_p3_pl.py`).
Prep: `python stil/canli/prep_p3_pl.py` (reads `p3-pl-measured.json`). Out `video/public/living/p3/st-*.png`, `video/src/living/sprites-p3-pl.json`.

## Chosen / rejected
- st-shops-a (clothing + bakery), st-shops-b (bookshop + flower shop), st-tv (10 CRT screens), st-cafe, st-props: first attempt kept.
- st-table = `p3-pl-table` (2.7:1 incl. legs, target 3.2). REJECTED `p3-pl-table-r1`: asked for shorter legs, came out 2243x701 with ~5.3:1, a flat bench.
- Plates are untrimmed at 1672x941, magenta keyed to alpha (sky; TV screens become transparent holes). Table and props trimmed with 12 px padding.

## Measured numbers (px)
- shops plates: `windows` = ground-floor shop window glass rects (doors excluded), `upperWindows` extra; `sidewalkY`, `roofY` (top edge of the roofline wall, chimneys rise above). Eyeballed on `boards/p3-pl-shops-{a,b}-points.png` (about +-5 px).
- st-tv: `window` [133,355,1402,400]; `screens` = 10 magenta holes found by connected components (exact), order left-to-right, top-to-bottom per row (row 1: 5 sets, row 2: 5). sidewalkY 848, roofY 72.
- st-cafe: `frame` [665,905] (street edge to the right edge of the navy frame/mullion band), `glassX` 905, `floorY` null (no floor line visible). A second thin navy post sits at x about 1340-1385 inside the café.
- st-table (1505x572 sprite): topY 12, floorY 559, legs [56,122] and [1382,1448] (computed from alpha).
- st-tree 746x906 baseY 893; st-lamp 173x905 baseY 892 (split by connected component).

## Deviations
- Table ratio 2.7:1, not 3.2:1; top surface barely visible as a sliver, as asked. Legs have an apron under the top.
- Shop interiors have a yellow-lit glass rim (glass is mostly yellow-lit, not dim navy as asked); opaque anyway.
- Tree: a faint pink magenta fringe between leaves remains after a defringe pass.
- Boards: `boards/p3-pl-*-points.png`, `p3-pl-table-props.png`, `p3-pl-tree-check.png`.
