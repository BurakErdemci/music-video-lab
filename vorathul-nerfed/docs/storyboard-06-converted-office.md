# NERFED — storyboard 06: the converted office furniture (part 5)

Round `i-converted`, built by `tools/imagegen/build_prompts.py` from the table and paragraphs below
(same format as storyboard 03). Nothing is wired into the scenes.

In part 5 the office turns into Vorathul's world, but the office chairs (G41-1..6) stay grey office
vector. Each piece gets a **converted** twin in the painting comic style (palette P: ink black, gold,
ivory, violet glow accents), drawn in the same pose and orientation as the original so the code can
swap or cross-fade it in place: a small black-and-gold gothic throne with a spiky backrest, gold trim
and a worn ivory cushion. Cut-outs on the #808080 key (painting palette).

**Shape references:** each chair is generated with its own G41 cut-out attached (`a:<file>` =
`video/public/assets/<file>.png`). The desk and the monitor have no stand-alone original; both take the
left desk group G28-1 as the shape reference (desk and monitor only, without the developer).

**Same aspect as the original:** after `cutout.py` the converted chair cut-outs are padded with
transparent pixels to the exact aspect ratio of their G41 twin (bottom-aligned, centred), and the
manifest sizes are updated, so a swap keeps the card's shape.

Refs: `style` = stil/onayli/01-tarz-cizgi-roman.jpg, `e:L3-wall` = the throne room plate.

| Id | Size | Alpha | Converts | Palette | Shots | Refs |
|---|---|---|---|---|---|---|
| G41c-1 | 1024×1024 | cut-out | G41-1 upright front | P + violet | S104, S109–S114 | style, e:L3-wall, a:G41-1 |
| G41c-2 | 1024×1024 | cut-out | G41-2 upright side | P + violet | S104, S109–S114 | style, e:L3-wall, a:G41-2 |
| G41c-3 | 1024×1024 | cut-out | G41-3 tipped on its side | P + violet | S104, S109–S114 | style, e:L3-wall, a:G41-3 |
| G41c-4 | 1024×1024 | cut-out | G41-4 upside down | P + violet | S104, S109–S114 | style, e:L3-wall, a:G41-4 |
| G41c-5 | 1024×1024 | cut-out | G41-5 tilted back | P + violet | S104, S109–S114 | style, e:L3-wall, a:G41-5 |
| G41c-6 | 1024×1024 | cut-out | G41-6 spinning, seen from above | P + violet | S104, S109–S114 | style, e:L3-wall, a:G41-6 |
| G40c | 1536×1024 | cut-out | the office desk (from G28-1) | P + violet | part 5 office | style, e:L3-wall, a:G28-1 |
| G42c-monitor | 1024×1024 | cut-out | the desk monitor (from G28-1) | P + violet | part 5 office | style, e:L3-wall, a:G28-1 |

- **G41c-1** — Subject: the office chair of the THIRD attached image converted into Vorathul's world: the SAME chair in EXACTLY the same pose, orientation and silhouette (upright, seen from the front, five-star base on castors, gas lift, seat and backrest), now drawn in the comic style of the FIRST image as a small black-and-gold gothic throne: the backrest a tall spiky black shape with gold trim and a small violet #9B5CE0 gem at the top, the seat a worn ivory cushion, the base black iron with gold claw-like castors. Composition: one chair, centred, the same framing as the THIRD image, filling about 85 percent of the image, square 1024x1024.
- **G41c-2** — Subject: the office chair of the THIRD attached image converted into Vorathul's world: the SAME chair in EXACTLY the same pose, orientation and silhouette (upright, seen from the side), now drawn in the comic style of the FIRST image as a small black-and-gold gothic throne: a spiky black backrest with gold trim and a small violet #9B5CE0 gem, a worn ivory cushion, a black iron base with gold claw-like castors. Composition: one chair, centred, the same framing as the THIRD image, filling about 85 percent of the image, square 1024x1024.
- **G41c-3** — Subject: the office chair of the THIRD attached image converted into Vorathul's world: the SAME chair in EXACTLY the same pose, orientation and silhouette (tipped over, lying on its side), now drawn in the comic style of the FIRST image as a small black-and-gold gothic throne: a spiky black backrest with gold trim and a small violet #9B5CE0 gem, a worn ivory cushion, a black iron base with gold claw-like castors. Composition: one chair, centred, the same framing as the THIRD image, filling about 85 percent of the image width, square 1024x1024.
- **G41c-4** — Subject: the office chair of the THIRD attached image converted into Vorathul's world: the SAME chair in EXACTLY the same pose, orientation and silhouette (upside down, castors in the air), now drawn in the comic style of the FIRST image as a small black-and-gold gothic throne: a spiky black backrest with gold trim and a small violet #9B5CE0 gem, a worn ivory cushion, a black iron base with gold claw-like castors. Composition: one chair, centred, the same framing as the THIRD image, filling about 85 percent of the image, square 1024x1024.
- **G41c-5** — Subject: the office chair of the THIRD attached image converted into Vorathul's world: the SAME chair in EXACTLY the same pose, orientation and silhouette (tilted back on its base), now drawn in the comic style of the FIRST image as a small black-and-gold gothic throne: a spiky black backrest with gold trim and a small violet #9B5CE0 gem, a worn ivory cushion, a black iron base with gold claw-like castors. Composition: one chair, centred, the same framing as the THIRD image, filling about 85 percent of the image, square 1024x1024.
- **G41c-6** — Subject: the office chair of the THIRD attached image converted into Vorathul's world: the SAME chair in EXACTLY the same pose, orientation and silhouette (spinning, the seat seen from above), now drawn in the comic style of the FIRST image as a small black-and-gold gothic throne: a spiky black backrest with gold trim and a small violet #9B5CE0 gem, a worn ivory cushion, a black iron base with gold claw-like castors. Composition: one chair, centred, the same framing as the THIRD image, filling about 85 percent of the image, square 1024x1024.
- **G40c** — Subject: the office DESK of the THIRD attached image converted into Vorathul's world: the same simple rectangular desk with the drawer cabinet under one side, in the same view and proportions, but with NO person, NO chair and NO monitor on it; drawn in the comic style of the FIRST image as gothic furniture: a black wooden top with a carved gold edge, legs like small black gothic pillars with gold capitals, the drawer cabinet carved with tracery and gold handles, a thin violet #9B5CE0 glow in the cracks between the drawers. Composition: one desk, centred, filling about 85 percent of the image width, landscape 1536x1024.
- **G42c-monitor** — Subject: the computer MONITOR of the THIRD attached image converted into Vorathul's world: the same monitor on its stand in the same front view and proportions, alone, no desk and no person; drawn in the comic style of the FIRST image: a heavy black gothic frame with gold corner spikes and a small spiky crown on top, the stand a black iron claw foot with gold rings, the screen glowing flat violet #9B5CE0 with one large black eye-slit sigil in the middle (a single narrow horizontal slit inside a jagged black ring); no text, no letters. Composition: one monitor, centred, filling about 85 percent of the image, square 1024x1024.
