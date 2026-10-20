# NERFED — storyboard 05: the empty cathedral (part 4)

Round `h-empty`, built by `tools/imagegen/build_prompts.py` from the table and paragraphs below (same
format as storyboard 03). Nothing is wired into the scenes.

Part 4 (S74–S78, f5140–5627, title "LATER · THE EMPTY CATHEDRAL") is built today from flat cream and
gold code slabs. It becomes the same nave as G01–G10 and `01-tarz-cizgi-roman.jpg`, after the fight
and the nerfs: no crowd, no soldiers, banners only torn and fallen, dust in the air, quiet and lonely.

**Drained palette** (storyboard 02 X16): palette P with the sky gone to ivory (no pale blue anywhere),
the gold faint and sparse, mostly bare ivory #F4ECD8 and cream with black #0A0A0A ink shadows; no
violet in any layer (his glow is his own, on the rig).

**Layers** (front view only, as storyboard 03 §2):

| Depth | Layer |
|---|---|
| P0/P1 far | L4-wall-a + L4-wall-b, a 3072×1024 pair placed edge to edge |
| P3 | L4-dais, the steps he sits on (`sit_alone` on the top step) |
| P4 floor | L4-floor |
| P4/P5 | L4-helm, L4-banner, L4-candelabra props |
| P6 near | L4-pillar (left, mirror for right) |
| light | L4-dust, screen blend on black |

**L4-painting-empty** is a single opaque plate: the whole empty cathedral as one painting, the
composition of `01` with Vorathul and every figure gone. It is what the office wall shows in part 5
after he has broken out, so it must read at a glance as "the painting, now empty". `image_gen` gives
3:2, so it is drawn with plain margins top and bottom and cropped to 16:9 (1536×864) in code.

Refs: `style` = stil/onayli/01-tarz-cizgi-roman.jpg, `d:<id>` = that d-assets image, a bare id = an
image of this round.

| Id | Size | Alpha | Role | Palette | Shots | Refs |
|---|---|---|---|---|---|---|
| L4-wall-a | 1536×1024 | opaque | far wall, left half | drained P | S74, S75, S77 | style, d:G03 |
| L4-wall-b | 1536×1024 | opaque | far wall, right half | drained P | S74, S75, S77 | style, d:G03, L4-wall-a |
| L4-dais | 1536×1024 | cut-out | P3 steps where he sits | drained P | S74, S77 | style |
| L4-floor | 1536×1024 | opaque | P4 floor | drained P | S74, S75, S77 | style, d:G06 |
| L4-pillar | 1024×1536 | cut-out | P6 near pillar, left (mirror for right) | drained P | S74, S77 | style, d:G09 |
| L4-helm | 1024×1024 | cut-out | prop: a fallen hero's helm and shield | drained P | S74, S75 | style |
| L4-banner | 1536×1024 | cut-out | prop: one torn fallen banner on its broken pole | drained P | S74 | style |
| L4-candelabra | 1024×1024 | cut-out | prop: a toppled candelabra | drained P | S74, S75 | style |
| L4-dust | 1536×1024 | opaque (screen blend on black) | dust motes and faint shafts | ivory on ink | S74–S77 | style |
| L4-painting-empty | 1536×1024 | opaque | the empty painting on the office wall | drained P | part 5 office shots | style |

- **L4-wall-a** — Subject: the far end of the same golden gothic cathedral as the SECOND attached image, now EMPTY and drained after a long fight: the same tiers of pointed arches, empty gallery balconies with balustrades and black spires, seen perfectly straight on, but mostly bare ivory and cream stone with only faint thin touches of gold, long black ink shadows, a few chipped and cracked stones; every opening where the sky shows is flat plain ivory (no blue sky); no people, no crowd, no banners, no figures, no organ pipes. This is the LEFT half of a wide panorama. DRAINED: gold covers at most one tenth of the image, only as thin lines and small touches; everything else is bare ivory and cream stone and black ink, clearly much paler than the SECOND attached image. No gold-filled shapes at all: no gold columns, no gold panels; gold appears only as a few thin outlines on capitals and arch edges. Composition: landscape 1536x1024, frontal and flat, no perspective, the gallery tiers continue past both side edges, the bottom edge is the base of the wall.
- **L4-wall-b** — Subject: the RIGHT half of the same empty drained cathedral wall as the THIRD attached image, which is its LEFT half: the same arches, gallery tiers, spires and scale, the same bare ivory stone with faint gold and flat ivory sky in the openings; its left edge continues the THIRD image's right edge exactly (the tiers at the same heights) so the two images placed side by side form one continuous panorama; a different arrangement, not a copy or a mirror; no people, no banners. DRAINED: gold covers at most one tenth of the image, only as thin lines and small touches; everything else is bare ivory and cream stone and black ink, clearly much paler than the SECOND attached image. STYLE MATCH: draw it in EXACTLY the technique of the THIRD image, not a new technique: the same thick bold brush-ink strokes, the same tall solid black pillar shapes, the same very simplified shapes and the same amount of thin gold; NOT fine pen line art, NOT engraving, NOT hatching, NOT detailed tracery. Composition: landscape 1536x1024, frontal and flat, no perspective, the bottom edge is the base of the wall.
- **L4-dais** — Subject: a wide low flight of four ivory stone steps seen straight from the front, worn and chipped, thin faded gold edges on each step, a broad flat top step wide enough for a colossal knight to sit on, a little dust and two small fallen stones on the steps; nothing on top, no throne, no figures. Composition: frontal and symmetric, the steps span 80 percent of the width, the top step at about 45 percent of the image height, landscape 1536x1024.
- **L4-floor** — Subject: the same cathedral floor as the SECOND attached image, now dull and dusty: worn black and ivory tiles with only faint gold, the reflections gone matt, thin cracks and drifts of pale dust, receding to a central vanishing point; the floor fills the whole image: no sky, no wall, no steps and no figures, only floor running up to the top edge. DRAINED: gold covers at most one tenth of the image, only as thin lines and small touches; everything else is bare ivory and cream stone and black ink, clearly much paler than the SECOND attached image. Composition: landscape 1536x1024, viewed from a low eye level straight ahead, the far edge flat.
- **L4-pillar** — Subject: one massive gothic entrance pillar like the left pillar of the SECOND attached image, seen straight on and very close, now drained: bare ivory stone with only faint gold on the carved capital, cracks and chips, heavy black ink shadow on its inner side, a strand of torn cloth hanging from a bracket. Composition: portrait 1024x1536, the pillar fills the full height from the bottom edge to the top edge; this is the LEFT side piece.
- **L4-helm** — Subject: a fallen hero's empty knight helmet lying on its side next to a cracked kite shield with a faded sun emblem, a little dust on both, black ink silhouette with ivory and faint gold edges; comic, lonely, not grim: no body, no blood. Composition: one small group, centred, square 1024x1024.
- **L4-banner** — Subject: one long gold-and-ivory banner with a faded sun emblem lying crumpled on the ground, torn in two places, still tied to its snapped black pole, a little dust on it; the gold faded almost to cream. Composition: one object lying across the frame, centred, landscape 1536x1024.
- **L4-candelabra** — Subject: one tall gothic iron candelabra knocked over and lying on its side, three snuffed candles fallen out of it, a thin wisp of black ink smoke, ivory candles, black iron with faint gold rings. Composition: one object, lying across the frame, centred, square 1024x1024.
- **L4-dust** — Subject: dust in still air: hundreds of small ivory #F4ECD8 dust motes of different sizes drawn as dry-brush dots and specks, denser in three faint soft diagonal shafts falling from the upper left made of sparse ivory halftone dots; the background is solid flat black #0A0A0A everywhere else; no buildings, no figures. Composition: landscape 1536x1024, the motes spread over the whole frame.
- **L4-painting-empty** — Subject: the composition of the attached image (the colossal knight-king in the golden cathedral) with Vorathul and EVERY figure removed: the same cathedral nave, the same galleries, arches and spires, the same floor and the same centred point of view, but EMPTY and drained: no knight, no sword, no soldiers, no crowd on the balconies, banners fallen on the floor; bare ivory stone with faint gold, flat ivory sky with no blue, long black ink shadows, a few motes of dust; at the centre of the nave floor, exactly where he stood, an empty patch of floor with a faint dark outline, so the absence is the focal point. DRAINED: gold covers at most one tenth of the image, only as thin lines and small touches; everything else is bare ivory and cream stone and black ink, clearly much paler than the attached image. Composition: landscape 1536x1024 drawn so that it reads as a 16:9 painting: all important content between 7 and 93 percent of the image height (the top and bottom bands are plain wall and plain floor and will be cropped to 16:9), frontal and symmetric.
