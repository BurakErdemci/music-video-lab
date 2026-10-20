# NERFED — storyboard 03: locations and hero panels

Director's notes on part 1 (Burak, 20 Oct 2026): the visual style stays; (1) one cathedral for the whole
painting world is monotonous, so **each fight phase gets its own location**; (2) the code-drawn hero
panels and insets look cheap and are all replaced by real illustrations; (3) flat solid-colour light
beams are banned.

This document lists the new image assets (round `e-locations`, built by `tools/imagegen/build_prompts.py`
from the tables and paragraphs below; nothing is retyped there). It does **not** wire anything into the
scenes: the main loop shows the contact sheets to Burak first.

## 1. Location plan

| Time | Shots (painting world only) | Location | Layer ids |
|---|---|---|---|
| 0:00–0:53 | S01–S21 | Cathedral nave (G01–G10, unchanged) | G01–G10 |
| 0:53–0:59 (optionally from 0:40) | S22–S24 (optionally S18–S21) | **Organ loft**, Vorathul's home | L1-* |
| 0:59–1:40 | S25, S27–S30, S37–S39, S41, S43, S45 | **Rooftop** of the cathedral, open sky, Meteor Rain | L2-* |
| 1:40–2:51 | S46–S48, S50–S58, S60, S61, S64–S73 | **Throne room**, crumbling as the nerfs land | L3-* |
| 2:51–3:03 | S74–S75 | Drained cathedral (G35, G36, unchanged) | G35, G36 |

The office shots (S26, S31–S36, S40, S42, S59, S62, S63) are unchanged.

## 2. Stage rule for every layer

Everything is a flat card on the 2.5D stage and the camera always looks at it from the **front**
(yaw within ±15°). So every asset is drawn **straight on**: no side views, no three-quarter views of
architecture, no vanishing point that moves sideways. Depth comes from stacking cards, as the nave does
(storyboard 01 §0.1):

| Depth | z | Nave | Organ loft | Rooftop | Throne room |
|---|---|---|---|---|---|
| P0 sky / far | −80 | G01 sky, G02 clouds | L1-wall-a + L1-wall-b | L2-sky-a + L2-sky-b | — |
| P0.5 horizon | −65 | progress-bar sun (code) | — | L2-land | — |
| P1 back | −50 | G03 back wall | L1-console | L2-spires | L3-wall / L3-wall-ruin, L3-cracks on top |
| P2 mid | −30 | G04a/b galleries | L1-pipes-near (far copy, scaled down) | L2-buttress (scaled down) | L3-column (scaled down) |
| P4 floor | −8 | G06 floor | L1-floor | L2-roof | L3-floor |
| P5 foreground | −3 | G07, G08 | L1-bellows | L2-gargoyle | L3-rubble |
| P6 pass-by | +6…+20 | G09 pillars | L1-pipes-near | L2-buttress | L3-column / L3-column-broken |

**Width.** `image_gen` returns at most 1536×1024. The two far layers that have to survive slow trucks
(organ pipe wall, rooftop sky) are generated as a **left half and a right half** (`-a`, `-b`, the
`-b` image is generated with `-a` attached and continues its right edge), giving a 3072×1024 (3:1)
panorama when the two cards are placed edge to edge, the same way G04a/G04b are a pair. The
mid and near pieces are single cut-outs; symmetric pieces (near pipes, buttress, column) are drawn once
as the LEFT piece and mirrored in code for the right side.

**Palette.** Every location uses palette **P** (ivory #F4ECD8, gold #E2B33C, sky #8EC5E8, ink
#0A0A0A) with violet #9B5CE0 only where Vorathul's own power is (pipe mouths, his energy). The throne
room has a second, ruined state (L3-wall-ruin, L3-column-broken) that drains toward the drained
cathedral of S74: much less gold, more bare ivory and black, and patches of flat office grey #ADB5BD
where the paint has worn away (the "office-grey seep" of S48 / S70). Magenta #E0129A stays code-only.

**Crumble steps in the throne room** (code reveals, not new images): S46–S53 intact wall; from S54
(wings deleted) each deletion adds one step of L3-cracks over the wall (S54, S55, S56, S57, S61);
from S64 the wall swaps to L3-wall-ruin and the near column to L3-column-broken; L3-rubble enters the
foreground at S65.

## 3. Light

The flat gold strips (C01 `RAY_SVG`, world.tsx) are replaced by one painted layer, **LX-rays**: gold
and ivory shafts drawn as hatched ink and halftone dots on solid black. It is used with an additive /
screen blend (black = no light), so it needs no cut-out key and its halftone dots survive. Use it only
where a shot asks for light (S02/S03 rays, the S30 sun rising over the roofline); otherwise nothing.

## 4. Hero panels

Every code-drawn hero panel/inset (fx.tsx `Panel`, intro.tsx `PanelClip`, fight.tsx `ActionInset`)
becomes one full illustration with its own background. Ten panels, counted in `video/src/scenes/p1`:

| Shot | Frames | Code | Panel ids |
|---|---|---|---|
| S06 | f548–587 | intro.tsx:301–335, four diagonal panels | H-s06-knight, H-s06-mage, H-s06-archer, H-s06-rogue |
| S14 | f996–1020 | fight.tsx:178–189 `ActionInset` | H-s14-double |
| S17 | f1197–1279 | fight.tsx:372–436, four quadrant panels | H-s17-knight, H-s17-mage, H-s17-archer, H-s17-rogue |
| S19 | f1419–1445 | fight.tsx:623–631 `ActionInset` | H-s19-charge |

Not hero panels, left as they are: the S17 helm insert (fight.tsx:445), the S22 plate crop
(verse.tsx:255), the S44 zoom panels (p2/PaintShots.tsx). The code panels are clipped polygons, so
every panel image keeps its subject inside the central 70 % and its background fills the frame to all
four edges. No text, captions or speech bubbles in any panel.

## 5. Asset table

Refs: `style` = stil/onayli/01-tarz-cizgi-roman.jpg, `fight` = stil/onayli/06-dovus-faz3.jpg,
`canon` = the canonical Vorathul sheet, `heroes` = the four hero model sheets G15–G18
(stil/prompts/b-test/out/), an asset id = that asset's generated image.

| Id | Size | Alpha | Depth role | Palette | Shots | Refs |
|---|---|---|---|---|---|---|
| L1-wall-a | 1536×1024 | opaque | P0 far, left half of the 3072×1024 pipe wall | P + violet mouths | S22–S24 | style |
| L1-wall-b | 1536×1024 | opaque | P0 far, right half | P + violet mouths | S22–S24 | style, L1-wall-a |
| L1-console | 1536×1024 | cut-out | P1 back, organ console behind him | P + violet | S22, S24 | style |
| L1-pipes-near | 1024×1536 | cut-out | P2 / P6, near pipe cluster, left (mirror for right) | P + violet | S22, S24 | style |
| L1-floor | 1536×1024 | opaque | P4 floor | P | S22, S24 | style |
| L1-bellows | 1536×1024 | cut-out | P5 foreground prop | P | S24 | style |
| L2-sky-a | 1536×1024 | opaque | P0 far, left half of the 3072×1024 sky | P | S25–S45 painting | style |
| L2-sky-b | 1536×1024 | opaque | P0 far, right half | P | S25–S45 painting | style, L2-sky-a |
| L2-land | 1536×1024 | cut-out | P0.5 distant land strip | P | S25, S27, S29, S30, S45 | style |
| L2-spires | 1536×1024 | cut-out | P1 roof skyline | P | all rooftop wides | style |
| L2-buttress | 1024×1536 | cut-out | P2 / P6, flying buttress, left (mirror for right) | P | S25, S27, S29, S30 | style |
| L2-roof | 1536×1024 | cut-out | P4 roof walkway (floor) | P | all rooftop shots | style |
| L2-gargoyle | 1024×1024 | cut-out | P5 foreground prop | P | S27, S28, S43 | style |
| L3-wall | 1536×1024 | opaque | P1 back wall with the throne, intact | P | S46–S61 | style |
| L3-wall-ruin | 1536×1024 | opaque | P1 back wall, ruined (drained) | P drained + #ADB5BD | S64–S73 | style, L3-wall |
| L3-cracks | 1536×1024 | cut-out | P1 overlay on L3-wall, revealed step by step | ink + #ADB5BD | S54–S61 | style |
| L3-column | 1024×1536 | cut-out | P2 / P6 column, left (mirror for right) | P | S46–S61 | style |
| L3-column-broken | 1024×1536 | cut-out | P2 / P6 broken column | P drained + #ADB5BD | S64–S73 | style, L3-column |
| L3-floor | 1536×1024 | opaque | P4 floor | P | all throne-room shots | style |
| L3-rubble | 1536×1024 | cut-out | P5 foreground rubble and fallen banners | P drained | S65–S73 | style |
| LX-rays | 1536×1024 | opaque (screen blend on black) | light layer above P1 | gold, ivory on ink | S02, S03, S30 | style |
| H-s06-knight | 1536×1024 | opaque | screen-space panel | P | S06 | style, fight, heroes |
| H-s06-mage | 1536×1024 | opaque | screen-space panel | P | S06 | style, fight, heroes |
| H-s06-archer | 1536×1024 | opaque | screen-space panel | P | S06 | style, fight, heroes |
| H-s06-rogue | 1536×1024 | opaque | screen-space panel | P | S06 | style, fight, heroes |
| H-s14-double | 1536×1024 | opaque | screen-space inset | P + V | S14 | style, fight, canon, heroes |
| H-s17-knight | 1536×1024 | opaque | screen-space panel | P | S17 | style, fight, heroes |
| H-s17-mage | 1536×1024 | opaque | screen-space panel | P | S17 | style, fight, heroes |
| H-s17-archer | 1536×1024 | opaque | screen-space panel | P | S17 | style, fight, heroes |
| H-s17-rogue | 1536×1024 | opaque | screen-space panel | P | S17 | style, fight, heroes |
| H-s19-charge | 1536×1024 | opaque | screen-space inset | P + V | S19 | style, fight, canon, heroes |

## 6. Prompt paragraphs

Same format as storyboard 01 §5.2: the builder adds the style block, the reference list, FIXED (when
`canon` is a ref), the cut-out line for cut-outs and the NEGATIVE block.

### Organ loft (L1) — Vorathul's home

- **L1-wall-a** — Subject: the inside of a colossal cathedral organ loft seen perfectly straight on: a towering wall made of hundreds of tall matte black organ pipes standing side by side in stepped ranks, their tops rising out of the top edge of the image, set in carved warm gold and ivory gothic casework with pointed arches and tracery; every pipe mouth (the slit near the foot of each pipe) glows violet #9B5CE0; deep solid black ink shadows between the pipes; no characters, no keyboards. This is the LEFT half of a wide panorama. Composition: landscape 1536x1024, frontal and flat, no perspective, pipe feet along one straight horizontal line at 75 percent of the image height, the ranks continue past both side edges.
- **L1-wall-b** — Subject: the RIGHT half of the same organ pipe wall as the SECOND attached image, which is its LEFT half: the same black pipes in gold and ivory casework, the same pipe width and scale, the same violet pipe mouths; its left edge continues the SECOND image's right edge exactly (the pipe feet on the same horizontal line, the casework at the same heights), so the two images placed side by side form one continuous panorama; a different arrangement of pipe ranks, not a copy or a mirror. Composition: landscape 1536x1024, frontal and flat, no perspective, pipe feet on a straight horizontal line at 75 percent of the image height.
- **L1-console** — Subject: the organ console of the loft seen straight from the front: a massive carved gold and ivory desk with five stepped black-and-ivory keyboards, rows of round black stop knobs on both sides, a carved gold canopy with spikes on top and small violet-glowing pipe mouths set into it; heavy black ink shadow; no bench, no player, no characters. Composition: frontal and symmetric, wide and low, centred, landscape 1536x1024.
- **L1-pipes-near** — Subject: a close cluster of five enormous matte black organ pipes of different heights, bound by gold bands, standing on a carved gold and ivory plinth, seen straight on and very close, each pipe mouth glowing violet #9B5CE0, thick dry-brush ink edges. Composition: portrait 1024x1536, the cluster fills the full height from the bottom edge to just below the top edge, this is the LEFT side piece.
- **L1-floor** — Subject: the floor of the organ loft: wide dark planks of black wood inlaid with gold strips and ivory dry-brush highlights, receding to a central vanishing point, a straight gold balustrade rail along the far edge; the floor fills the whole image: no sky, no wall, no arches and no windows above the rail, only the dark floor running up to the top edge; no figures. Composition: landscape 1536x1024, viewed from a low eye level straight ahead, the far edge flat.
- **L1-bellows** — Subject: one giant organ bellows of black leather with gold ribs and gold hinges, folded like an accordion, a carved gold handle on top, seen straight from the front. Composition: one object, centred, landscape 1536x1024.

### Rooftop (L2) — Phase III, Meteor Rain

- **L2-sky-a** — Subject: the open sky above the cathedral roof, flat pale sky blue #8EC5E8 with long low bands of large flat ivory clouds outlined in thick dry-brush black ink and one flat gold shadow band each, the clouds denser toward the lower third; no buildings, no ground, no meteors, no figures. This is the LEFT half of a wide panorama. Composition: landscape 1536x1024, the cloud bands run off both side edges, no horizon.
- **L2-sky-b** — Subject: the RIGHT half of the same sky as the SECOND attached image, which is its LEFT half: the same flat pale sky blue, the same cloud style, scale and band heights; its left edge continues the SECOND image's right edge exactly so the two placed side by side form one continuous panorama; different cloud shapes, not a copy or a mirror; no buildings, no meteors, no figures. Composition: landscape 1536x1024, the cloud bands run off both side edges, no horizon.
- **L2-land** — Subject: the distant painted land seen far below the cathedral roof: a long low band of rolling ivory and gold hills, a winding pale sky blue river, tiny black castles, villages and towers drawn as simple flat silhouettes, everything very small and far away; everything above the hill line is plain #808080. Composition: a low horizontal strip across the lower 40 percent of the frame, running off both side edges, landscape 1536x1024.
- **L2-spires** — Subject: the skyline of the cathedral roof seen straight on from the roof itself: a row of tall black and gold gothic spires, pinnacles, crockets and the steep ridge of the nave roof with a gold ridge crest, varied heights, the tallest spire left of centre; heavy black ink shadows and ivory highlights; every gap where the sky would show is plain #808080. Composition: frontal, the row spans the whole width, the bottom edge of the image is solid roof, landscape 1536x1024.
- **L2-buttress** — Subject: one massive flying buttress of the cathedral seen from the side of its arch so the arch spans the image: a tall gold and ivory pier topped by a spiky black pinnacle on the left, a sweeping half-arch of stone leaping from it up to the right edge, carved tracery, heavy black ink shadow underneath. Composition: portrait 1024x1536, the pier stands on the bottom edge and fills the full height, the arch leaves the image at the right edge; this is the LEFT side piece.
- **L2-roof** — Subject: the walkway on top of the cathedral roof: broad gold and ivory stone slabs with black ink cracks and dry-brush wear, receding to a central vanishing point, ending at a low carved ivory parapet with small gold pinnacles along the far edge; everything above the parapet is plain #808080; no figures. Composition: landscape 1536x1024, viewed from a low eye level straight ahead, the parapet a straight horizontal line at 35 percent of the image height.
- **L2-gargoyle** — Subject: one stone gargoyle crouching on a block of parapet, seen straight from the front, a grinning horned beast with folded wings, carved in ivory stone with gold edges and heavy black ink shadow, comic and slightly funny, not scary. Composition: one object, centred, square 1024x1024.

### Throne room (L3) — Verse 2, Announcer 2, Chorus 2

- **L3-wall** — Subject: the far wall of the great throne room seen perfectly straight on: a towering gold and ivory gothic wall with tall black-shadowed pointed arches, two huge hanging gold banners with an ivory sun emblem on either side, a high round rose window filled with flat pale sky blue in the centre; below it a wide flight of seven ivory steps rises to a colossal empty black throne with tall spiky back spires and violet gems; heavy black ink shadows; no characters. Composition: frontal and symmetric, landscape 1536x1024, the throne centred and its seat at 55 percent of the image height.
- **L3-wall-ruin** — Subject: the SAME throne room wall as the SECOND attached image, now crumbling: the same layout, arches, steps and throne in the same places, but long black ink cracks run through the wall, chunks of arch have fallen out showing flat black behind, one banner has torn down and hangs by one corner, the other is gone, the rose window is broken; the colours drain: much less gold, mostly bare ivory and black, with ragged patches of flat cold grey #ADB5BD where the paint has worn away. Composition: frontal and symmetric, landscape 1536x1024, exactly the framing of the SECOND image.
- **L3-cracks** — Subject: a network of jagged black ink cracks only, as if drawn on a wall: three large crack systems that branch outward from three points, thick black lines with dry-brush edges and a thin cold grey #ADB5BD inner edge, nothing else; everything that is not a crack is plain #808080. Composition: the crack systems spread over the whole frame, left, centre and right, landscape 1536x1024.
- **L3-column** — Subject: one massive gothic column of the throne room seen straight on and very close: an ivory and gold shaft with fluting, a carved gold capital with leaves at the top, a square base at the bottom, heavy black ink shadow on its right side, a gold banner bracket on it. Composition: portrait 1024x1536, the column fills the full height from the bottom edge to the top edge; this is the LEFT side piece.
- **L3-column-broken** — Subject: the SAME column as the SECOND attached image, now broken: the upper half has snapped off at a jagged diagonal break, the stump stands on the same base, black ink cracks climb the shaft, the gold is mostly worn to bare ivory with patches of flat cold grey #ADB5BD. Composition: portrait 1024x1536, the base on the bottom edge in the same place as the SECOND image, the broken stump reaches about 60 percent of the image height.
- **L3-floor** — Subject: the throne room floor: big ivory and gold stone slabs with a long gold-edged black runner carpet down the middle, ivory dry-brush reflections, receding to a central vanishing point; no figures. Composition: landscape 1536x1024, viewed from a low eye level straight ahead, the far edge flat.
- **L3-rubble** — Subject: a low wide heap of fallen masonry for the foreground: broken ivory and gold stone blocks, a snapped column drum, a torn gold banner with an ivory sun emblem lying crumpled across the stones, small chips and dust puffs; colours partly drained, some blocks bare ivory with patches of cold grey #ADB5BD. Composition: one low wide heap, its base along the bottom edge, landscape 1536x1024.

### Light (LX)

- **LX-rays** — Subject: six wide shafts of light falling diagonally from the upper left to the lower right, painted in the comic print style: each shaft is made of warm gold #E2B33C and ivory #F4ECD8 dry-brush hatching strokes and a coarse halftone dot screen that fades from dense at the top to sparse at the bottom, ragged ink-brush edges; the background is solid flat black #0A0A0A everywhere else; no buildings, no figures. Composition: landscape 1536x1024, the shafts fan out slightly, wide dark gaps between them.

### Hero panels (H)

The hero designs come from the attached model sheets: knight = black armour, short ivory cape with gold trim, big gold kite shield with a sun emblem, short sword; mage = tall hooded black robe, ivory mantle, gold staff topped with a sun ring; archer = slim, long flowing ink ponytail, short ivory cape, gold longbow; rogue = small and hunched, hood, ivory scarf, two gold daggers. No violet on any hero.

- **H-s06-knight** — Subject: a full comic panel: the knight charges into battle toward the viewer, sun shield raised high in front of him, short sword drawn back, cape snapping behind him, one boot stamping forward; behind him a burst of bold gold and ivory radial speed lines and the ivory arches of the golden cathedral in flat shapes; black ink silhouette with ivory and gold. Composition: landscape 1536x1024, the knight large in the centre from the knees up, the background fills the whole frame to every edge.
- **H-s06-mage** — Subject: a full comic panel: the mage plants her gold sun-ring staff and lifts it as a ring of flat gold light symbols flares around the sun ring, hood and ivory mantle blown back by the force; behind her gold and ivory radial speed lines and flat cathedral arches. Composition: landscape 1536x1024, the mage large in the centre, the background fills the whole frame to every edge.
- **H-s06-archer** — Subject: a full comic panel: the archer kneels on one knee and draws her gold longbow to full draw, aiming up and to the right, her long ink ponytail whipping sideways; her face is a plain solid black silhouette under the hair: no eyes, no glowing eye slit, no violet anywhere on her; behind her gold and ivory radial speed lines and flat cathedral arches. Composition: landscape 1536x1024, the archer large in the centre, the background fills the whole frame to every edge.
- **H-s06-rogue** — Subject: a full comic panel: the rogue flips his two gold daggers in a low crouch, about to spring, ivory scarf trailing, a sly grin under the hood is only a white crescent; behind him gold and ivory radial speed lines and flat cathedral arches. Composition: landscape 1536x1024, the rogue large in the centre, the background fills the whole frame to every edge.
- **H-s14-double** — Subject: a full comic action panel: the knight and the archer strike Vorathul at the same moment: the knight leaps in from the left with his short sword slamming into Vorathul's black gauntlet, the archer's gold arrow hits beside it, a big jagged ivory and gold comic impact burst where they connect; only a part of the colossal Vorathul shows on the right: his solid black armoured forearm, gauntlet and the edge of his tattered black cape, with the violet-runed greatsword; ivory background with bold gold radial speed lines. Composition: landscape 1536x1024, the impact burst in the centre, the heroes left of it, Vorathul's black mass filling the right third, the background fills the whole frame to every edge.
- **H-s17-knight** — Subject: a full comic panel of the knight charging up his special attack: he holds his short sword high with both hands and it blazes with flat gold light, his sun shield on his back glowing, crackling ivory sparks, feet planted wide; behind him a dense gold radial burst. Composition: landscape 1536x1024, the knight large in the centre from the waist up, the background fills the whole frame to every edge.
- **H-s17-mage** — Subject: a full comic panel of the mage charging up her special attack: she holds the staff level in both hands while a huge flat gold sun circle with ivory rays grows around her, her robe and mantle lifting in the updraft; ivory background with gold radial lines. Composition: landscape 1536x1024, the mage large in the centre, the background fills the whole frame to every edge.
- **H-s17-archer** — Subject: a full comic panel of the archer charging up her special attack: three gold arrows nocked at once on her drawn longbow, each arrow tip burning with flat gold light, her ponytail and cape blown upward; her face is a plain solid black silhouette under the hair: no eyes, no glowing eye slit, no violet anywhere on her; behind her a dense gold radial burst. Composition: landscape 1536x1024, the archer large in the centre, the background fills the whole frame to every edge.
- **H-s17-rogue** — Subject: a full comic panel of the rogue charging up his special attack: he leaps high with both gold daggers crossed in front of his chest, a gold X-shaped flash between the blades, scarf whipping; ivory background with gold radial speed lines. Composition: landscape 1536x1024, the rogue large in the centre, the background fills the whole frame to every edge.
- **H-s19-charge** — Subject: a full comic action panel: all four heroes, the knight, the mage, the archer and the rogue, run in together from the left toward the right in one dynamic line, weapons forward, capes streaming, about to unleash a combined strike; a big ivory and gold comic impact burst at the right edge where the solid black wall of Vorathul's cape and armoured leg fills the right edge of the panel; gold background with bold black radial speed lines. Composition: landscape 1536x1024, the four heroes across the left two thirds, overlapping slightly, the background fills the whole frame to every edge.
