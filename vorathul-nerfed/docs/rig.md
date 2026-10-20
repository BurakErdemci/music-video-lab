# Vorathul cut-out rig — design (contract §2)

Status: design only, no code and no images yet. Inputs: `docs/scene-map.md`,
`stil/onayli/KARAKTER.md`, approved frames 02–05, `video/src/stage/{Stage,Card,Part}.tsx`,
`video/src/timing.ts`, and the lessons of the previous clip (`her-sabah-bastan/stil/kukla/README.md`,
`her-sabah-bastan/blender/cutout/README.md`, `her-sabah-bastan/docs/process-log.md`).

## 0. Decisions in one screen

- **One view: front.** Every rig shot in the scene map faces the picture plane (section 1.1).
- **Parts are cut from one generated "rig master" drawing**, so the neutral pose reassembles on
  model. Separate image calls are used only for what the master cannot show: hand shapes, the
  sword, pipes and cork, the nerfed and second-form head pieces, and the seated lower body.
  Total: **6 image calls** (plus retries).
- **109 cards, 39 rotating joints, 54 texture files.** Of the textures, 31 are drawn, 22 are
  derived by deterministic tools (violet glow masks, helm halves cut from the closed helm, pipe
  mouths cropped from the tubes) and 1 is drawn by code (the magenta checkerboard).
- **The character's left side is the right side mirrored** (`scale.x = -1` on the subtree), so one
  set of angles drives both sides.
- **The rig does poses and small life, not acting.** Big actions are a strong pose plus an impact
  frame (scene-map rule "fights are comic panels"). Standing↔sitting is only ever a cut.
  Lesson from the previous clip: a 2D bone rig there measured perfect geometry (bone deviation
  0.0001 %, foot slip 0.13 px) and still failed on acting (legs through the chair, a bending walk).
  Geometry numbers do not show whether the acting reads.
- **Glow is an overlay.** Every violet item (eye slit, crown gems, chest studs, sword runes, pipe
  mouths, the seven eyes) is a separate card cut from the violet pixels of its own drawing, laid
  over a base whose violet has been replaced by dead black-grey. "Dead" means opacity 0, "lit"
  means 1, so dying and relighting are continuous and the silhouette cannot change.

Units: **H** = figure height in the rig master, from floor to crown tip (horns excluded), = 1.0.
For tests, the film is 1920×1080 with a full figure 900 px tall (1 H = 900 px).

Angle convention (semantic, per joint): limbs are measured from **hanging straight down = 0°**,
positive = **away from the body / upward on the outside** (abduction). Elbow flex is positive when
the forearm folds toward the body. The engine turns a semantic angle into `rotation.z` with a
per-joint sign table. Mirrored subtrees flip automatically because of `scale.x = -1`. "Char R" is
the character's right, which is **screen left**; it is the sword arm.

---

## 1. Part list

### 1.1 Views: front only

| Story need (scene map) | Seen from |
|---|---|
| Base pose, sword raise/strike, conducting, fight panels (sc. 2–3) | front, low angle (frames 03, 04) |
| Pipe wings spread/fold, pipes deleted, corks, relighting (sc. 2, 8, 9, 14) | front (wings read as a fan only from the front; a side view sees them edge-on, frame 02 middle) |
| Checkerboard wings, small crown, dead runes, slump (sc. 7–11) | front (frame 05) |
| Helm split, void with 7 eyes (sc. 3, growl flashes sc. 8) | front (frame 04) |
| Clutching the throat (sc. 9) | front |
| Sitting alone (sc. 12) | front: a seated replacement lower body |
| Gauntlet on the inside of the canvas, cracks (sc. 12–13) | front: the canvas *is* the picture plane, so we see his palm |
| Bursting through the frame (sc. 14) | front, toward the camera (root moves in z) |

There is no walk, no profile action and no shot from behind. A second view would double the
drawings and the pose library. The biggest failure mode of AI-made parts, two views that disagree
about the same armour, would then appear in every shot. The previous clip's front and 3/4 sets
stayed drafts with a hole at the far shoulder at 90°. Here the front view is safe for two reasons:
the huge pauldrons cover the shoulder joint, and the body is flat black, so overlapping parts never
show. Only gaps would.

A slight turn is sold by the 2.5D stage instead: camera yaw up to **±12°** with the wings 0.04 H
and the cape 0.06 H behind the body. If a shot ever needs another angle, it uses a single drawn
still (a comic panel), not the rig.

### 1.2 Tree

Depth (`z`) is the explicit `renderOrder` (higher = in front). All cards of one character sit
within ±0.06 H of the root plane. Order comes from `renderOrder`, not from depth sorting, so a camera
move can never swap two parts. A pose may override the `z` of a part (section 5.3).

```
root                       ground point between the feet (no card)
└─ pelvis
   ├─ leg_R, leg_L(mirror)
   ├─ legs_seated          (visible only in sit_alone)
   └─ torso
      ├─ chest_studs       (overlay)
      ├─ cape_upper
      │  └─ cape_lower     [standing | seated]
      │     └─ hem_1 … hem_6
      ├─ wing_R, wing_L(mirror)   = wing_root card + wing_missing + pipe_0 … pipe_7
      │  └─ pipe_i         = body + mouth + glow + cork
      ├─ head  (helm_closed)
      │  ├─ eye_slit       [lit | sad]
      │  ├─ crown          [full | small] └─ crown_gems [full | small]
      │  ├─ void_head      └─ eye_1 … eye_7
      │  ├─ helm_half_R    └─ crown_half_R
      │  └─ helm_half_L    └─ crown_half_L
      ├─ collar
      ├─ pauldron_R, pauldron_L(mirror)
      └─ upper_arm_R, upper_arm_L(mirror)
         └─ forearm
            └─ hand        [open | grip | fist | palm | spread | clutch]
               └─ sword (attached: hand_R | ground) └─ sword_runes (overlay)
```

### 1.3 Part table

Pivot = the joint, described in the part's **own image**. Socket = where the child's pivot sits,
marked in the **parent's image**. Both are stored in pixels (section 7). Limits are semantic
degrees, or H for translations.

| id | what | z | pivot (own image) | limits | texture variants |
|---|---|---|---|---|---|
| root | ground anchor | — | — | rot ±10° (whole-body tilt for impacts), tx/ty/tz free | — |
| pelvis | belt, hip plates, top of the tassets | 62 | centre of the belt buckle | rot ±10°; ty −0.04…+0.06 H standing, −0.30 H seated | pelvis |
| leg_R / leg_L | greave + boot, one piece (the cape hides the knee) | 60 | top centre of the thigh, under the tasset; round cap r = ½ thigh width | −8…+25° | leg |
| legs_seated | thighs toward the camera, knees, shins and boots on a step, one piece | 61 | centre of the belt line at its top edge | rot ±5° | legs_seated |
| torso | chest, abdomen, studs area; extends under the collar and pauldrons | 70 | bottom centre (waist), 0.03 H above its bottom edge | rot ±15° | torso_base |
| chest_studs | the two violet diamonds only | 71 | same as torso | follows torso; opacity 0…1 | chest_studs |
| collar | high spiky collar, front half | 82 | bottom centre | fixed to torso | collar |
| pauldron_R / _L | spiky fur pauldron | 74 | centre of the shoulder socket (= the arm's pivot) | follows upper arm × 0.35, clamped ±40° | pauldron |
| upper_arm_R / _L | upper arm with a round cap at the top and a round couter (elbow plate) at the bottom | 72 | top centre, at the centre of the top cap | a −40…+160° | upper_arm |
| forearm_R / _L | vambrace with a round elbow cap | 73 | centre of the elbow cap | flex −10…+150° | forearm |
| hand_R / _L | gauntlet; every variant shares one wrist pivot | 90 / 91 | centre of the wrist stub | ±45° | hand_open, hand_grip, hand_fist, hand_palm, hand_spread, hand_clutch |
| sword | greatsword, base with dead runes | 64 (raised: 92) | centre of the grip, 0.08 H below the pommel | via hand; ground: rot ±25° | sword_base |
| sword_runes | violet rune line and crossguard gem only | +1 over sword | same as sword | opacity 0…1 | sword_runes |
| cape_upper | cape from the shoulders to the waist, behind the body | 5 | top centre, between the shoulder sockets | fixed to torso | cape_upper |
| cape_lower | cape from the waist to the floor, flared, hem cut away | 6 | top centre, 0.04 H below its top edge (overlap) | auto: −0.8 × (torso+pelvis world angle) + sway, clamped ±8° | cape_lower, cape_lower_seated |
| hem_1…6 | ragged flame-like hem strips | 7 | top centre, 15 % below the strip's top edge | ±7° | hem_a, hem_b, hem_c (each used twice, one copy mirrored) |
| wing_R / _L root | spiky hub where the pipes meet, behind the shoulder blade | 52 | centre of the hub | rot −25…+15° (wing strike / flare) | wing_root |
| wing_missing_R / _L | magenta checkerboard in the shape of a spread wing (frame 05) | 10 | the wing socket | follows the wing root; opacity 0/1 | wing_missing (code) |
| pipe_i body | black tube without its mouth | 20+4(7−i) | centre of the root end | see section 2 | body_s / body_m / body_l |
| pipe_i mouth | rim ellipse at the tip, dead | +1 | centre of the rim ellipse | fixed at the tube tip | mouth_s / mouth_m / mouth_l |
| pipe_i glow | violet inside the rim | +2 | same as mouth | opacity 0…1 | glow_s / glow_m / glow_l |
| pipe_i cork | round gold cork | +3 | centre of the cork | travel 0…1 along the pipe axis | cork |
| head | closed great-helm with both horns, eye slit keyed to black | 78 | bottom centre (neck), hidden by the collar | rot ±20°; sink −0.01…+0.03 H (sinks into the collar) | helm_closed |
| eye_slit | the slit only | 79 | centre of the slit | opacity 0…1 | slit_lit, slit_sad |
| crown | jagged five-spike crown, gems keyed out | 80 | bottom centre (where it sits on the helm) | rot ±8° | crown_full, crown_small |
| crown_gems | the three gems only | 81 | same as crown | opacity 0…1 | gems_full, gems_small |
| helm_half_R / _L | the closed helm cut down the middle, one horn each | 78 | bottom outer corner of the half | open t 0…1 → rot 0…35° outward + tx 0…0.03 H | derived: half_R, half_L |
| crown_half_R / _L | the full crown cut along the same line | 80 | same socket as the crown | rides on its half | derived: crown_half_R, crown_half_L |
| void_head | flat black ovoid, a little larger than the helm's inner outline | 76 | bottom centre | visible only when split | void_head |
| eye_1…7 | one violet eye each, laid out 2-3-2 as in frame 04 | 77 | centre of the eye | opacity 0…1, scale.y 0.1…1 (blink) | eye_1…eye_7 (connected components) |

The counts above are measured from this table. **Cards:** 4 legs/pelvis, 3 torso, collar and studs,
8 arm cards (pauldron, upper arm, forearm and hand per side), 2 sword cards, 8 cape cards, 4 head
cards, 4 helm-half cards, 8 void and eye cards, 4 wing-root and missing-wing cards, and 64 pipe cards.
That is **109 cards**.
**Rotating joints:** root, pelvis, torso, head, crown, 2 halves, 2×upper arm, 2×forearm, 2×hand,
2×leg, cape_lower, 6 hems, 2 wing roots, 16 pipes, sword (ground) = **39**.

### 1.4 Joint rules (how nothing tears)

This is the previous clip's disk method. It is easier here because the body is flat black.

1. Every joint has a pivot `p` and a radius `r` = half the limb width at `p`. **Both** parts get a
   filled disk `(p, r)` added in their image (a code step, `#0A0A0A` plus the paper speckle). A
   rigid rotation about `p` can then never open a gap.
2. Inside `1.3 r` of a pivot, interior ivory brush lines are painted over with plain black. A line
   that crosses a joint would visibly bend at the seam.
3. Areas hidden under another part (torso under the arms, cape under the torso) are filled with
   plain black and speckle.
4. The shoulder is the hard joint (a range of 200°). It is also the best hidden one: the pauldron
   (z 74) is drawn over the upper arm's top cap (z 72) and turns at 0.35× the arm angle, so the
   cap is never exposed. The **wing root** sits behind the pauldron for the same reason.
5. The neck is hidden by the collar (z 82 over the head at 78). "Head sink" moves the head down
   into the collar instead of bending a neck.

---

## 2. The 16 pipes

### 2.1 Arrangement

Each wing is a fan of 8 pipes `i = 0…7`, bottom to top. As in frames 02/03, the short pipes are low
and point down and out; the long ones are high and point up and out. All values are for the
screen-right wing (character's left). The other wing is the mirrored subtree.

| i | θ open (° from horizontal, outward, + up) | θ folded | length L (H) | texture | length scale |
|---|---|---|---|---|---|
| 0 | −38 | 76 | 0.14 | body_s (0.155) | 0.90 |
| 1 | −27 | 78 | 0.17 | body_s | 1.10 |
| 2 | −16 | 80 | 0.20 | body_m (0.225) | 0.89 |
| 3 | −5 | 82 | 0.23 | body_m | 1.02 |
| 4 | 6 | 84 | 0.26 | body_m | 1.16 |
| 5 | 17 | 86 | 0.29 | body_l (0.300) | 0.97 |
| 6 | 28 | 88 | 0.32 | body_l | 1.07 |
| 7 | 39 | 90 | 0.34 | body_l | 1.13 |

- **Base offset:** pipe `i`'s root end sits on a small arc around the hub,
  `b_i = r0 · (cos θ_i, sin θ_i)` with `r0 = 0.02 H`, so the bases radiate from one point and stay
  hidden under the hub card (z 52).
- **Draw order:** lower pipes are in front of upper ones (`z = 20 + 4(7−i)`), which reads as
  overlapping feathers.
- **Folded** = the pipes stand almost upright behind the shoulders, as in frame 05. The lower
  halves are hidden behind the pauldrons and collar because the whole wing is behind the torso.
- **Spread** `s ∈ [0,1]` per wing, with an outward cascade:
  `s_i = clamp((s − 0.3·i/7) / 0.7, 0, 1)` and `θ_i = θ_fold_i + (θ_open_i − θ_fold_i)·ease(s_i)`.
- **Pipe limits:** θ relative to the hub within −45…+95°. Length scale 0.85…1.20, applied to the
  body only.

### 2.2 Textures: three drawn tubes, never one shared stretched image

A single tube stretched from 0.14 H to 0.34 H (2.4×) would smear the dry-brush strokes and turn the
mouth ellipse into an egg. So the pipe sheet draws **three tubes** (short, medium, long). A
deterministic crop splits each one into a **body** (stretched along its axis only, within
0.85–1.20) and a **mouth** (the last 1.2 tube widths, never stretched). The mouth card sits at the
body tip with a 0.25 × width overlap. Mirroring and the length variation make the 16 pipes look
hand-made enough.

### 2.3 Per-pipe state (all pure functions of the frame)

| state | body | mouth | glow | cork | notes |
|---|---|---|---|---|---|
| lit | base | base | 1 | hidden | default |
| dark | base | base | 0 | hidden | dimmed (nerf) |
| corked | base | base | 0 | travel = 1 (seated) | "volume reduced" (sc. 9) |
| missing | checker material masked by the body + mouth alpha | — | 0 | hidden | 4 frames (2 rig steps) at the delete frame, then hidden: "deleted" reads as a missing texture |
| gone | hidden | hidden | — | — | |
| returning | flies in along its own axis from 0.6 H outside, arriving on its beat | | 0 → 1 over 6 frames after arrival | popped off | final chorus (sc. 14), one per beat |

- **Cork pop:** the cork starts 0.08 H outside the mouth along the pipe axis and moves to a seat
  0.15 × tube width inside the rim, ease-out over 3 frames, with a one-frame 1.15× uniform scale
  punch. The cork is a prop, so it moves on ones (30 fps) inside its parent; the parent pipe still
  steps on the rig cadence. The smoke wisp belongs to the effects lane, not the rig.
- **Checkerboard:** `#E0129A` / `#0A0A0A` squares of 0.02 H, drawn by code, fixed in texture space
  so they turn with the part ("a placeholder texture stuck to the geometry"). The wing-shaped
  `wing_missing` outline is a polygon of about 24 points traced once from the left wing of frame 05
  and stored in the rig JSON. It is drawn behind the pipes (z 10), so the folded, corked pipes stand
  in front of it as in frame 05.

---

## 3. The cape (no morphing)

The cape has two rigid panels plus loose hem strips. It never uses one bending mesh.

- `cape_upper`, from the shoulders to the waist, is fixed to the torso.
- `cape_lower`, from the waist to the floor, hangs from `cape_upper` with a 0.04 H overlap. The
  seam is hidden because both are flat black and the upper panel's ragged bottom edge lies over it.
  Its angle is computed so that the hem stays near the floor when the body leans:
  `cape_lower = clamp(−0.8·(torso + pelvis world angle) + sway, −8°, +8°)`.
- `hem_1…6` hang from `cape_lower`, each with its top 15 % tucked under the cape's ragged edge.
  Their angle is idle sway plus a damped response to body motion, ±7° maximum:
  - sway: `A·sin(2π·f·t + φ_k)`, with `A ≤ 2°`, `f` 0.3–0.6 Hz and `φ_k` a seeded hash of k;
  - damped response: after each pose arrival, `x(t) = A₀·e^(−ζωt)·cos(ω_d t)`, with ω = 2π·1.2,
    ζ = 0.4 and `A₀` proportional to the root/torso change. This closed form is a pure function of
    the frame; no integration state is kept. The previous clip used the same kind of damped spring
    (hair: ω 2π·2.2, ζ 0.45).
- **Limits and what the cape cannot do:** it cannot wrap forward, billow sideways past ±8°, or pile
  up. Burst flares the strips to their +7° limit, and a big wind or flutter is an effects card.
  Nerfed "limp" is sway amplitude 0. Seated is a texture swap (`cape_lower_seated`, pooled over the
  step), reached only by a cut.

---

## 4. Producing the part images

### 4.1 Method

Lesson from the previous clip: parts **cut with polygon masks from one canonical drawing**
reassembled to within 0.5 % of the reference. Separately drawn limbs never match in line weight or
proportion. So:

1. **One rig-master call.** A front view in a neutral open pose, drawn large: portrait 1024×1536,
   figure about 1380 px tall.
2. **Cut** the head, crown, torso, collar, pauldron, upper arm, forearm, open hand, pelvis, leg,
   cape panels and hem strips from it. Cut the character's right side only; the left side is the
   mirror.
3. **Five variant calls** for things the master cannot show (table 4.2). Each is scaled to the
   master with one measured feature.
4. **Derive** glow overlays, dead bases, helm halves, crown halves, pipe mouths and the 7 eyes
   with deterministic tools.

### 4.2 Sheet plan (6 image calls)

| # | sheet | contents | size | scaled to the master by |
|---|---|---|---|---|
| M | rig master | full figure, front, arms hanging 25° away from the body so they do not overlap the torso, hands open; wings OFF (bare shoulder blades, hub stubs); sword NOT held; cape hanging straight | 1024×1536 | defines H |
| V1 | head extras | small lopsided crown; sad slit curved down like a frown (violet); void head (black ovoid with 7 violet eyes, 2-3-2) | 1536×1024 | crown base width = 0.70 × crown_full |
| V2 | gauntlets | grip, fist, palm (open, palm toward the viewer), spread (conducting), clutch (claw); each ends in a plain rounded wrist stub | 1536×1024 | wrist width = forearm wrist end |
| V3 | sword | greatsword alone, laid horizontally (rotated 90° in post), runes lit | 1536×1024 | crossguard width = 0.20 H (canonical) |
| V4 | pipes | three tubes short/medium/long, parallel and horizontal, mouth to the right and lit; one cork; one spiky hub | 1536×1024 | tube width at the mouth = 0.032 H |
| V5 | seated | lower body seated on a stone step seen from the front (thighs toward the camera, knees, shins, boots); the cape pooled over the step | 1536×1024 | belt width = pelvis belt width |

Layout rules for every sheet: one row (or two), parts at the **same scale**, **at least 64 px of
key colour** between parts and from the edges, nothing touching, nothing cropped. Scale factors
after cutting must fall in **0.6–1.6**, so that brush-stroke thickness stays within ±30 % of the
master. Outside that range the sheet is regenerated with the size restated.

### 4.3 Key colour

Background: **flat pure green `#00FF00`**. It is the colour farthest from everything in the
character (black, violet `#9B5CE0`, cork gold, ivory paper breaks). Magenta, the previous clip's
key, is ruled out: it sits next to the violet glows and is the story's "deleted" colour.
Fallback if a sheet comes back with green-tinted ink: regenerate on flat ivory `#F4ECD8` and flood
fill from the border.

The checkerboard trap: the image model sometimes paints a "transparent" checkerboard as pixels.
Prompts never say "transparent". The cut-out tool **rejects** a sheet instead of trying to clean it
when either is true:
- any 32×32 corner patch is more than 30 RGB away from the key, or
- a corner patch splits into two colour clusters of more than 20 % each (a painted checker).

Cut-out steps (a tool, `tools/parts/cut.py` later; Python + Pillow/numpy, see open question 6):
1. Green dominance `gd = g − max(r, b)`; `alpha = 1 − clip((gd − 20) / 140, 0, 1)`.
2. Despill where alpha > 0: `g = min(g, max(r, b))`.
3. Remove 8-connected opaque specks under 20 px. On variant sheets, keep the piece nearest the
   pivot and drop extra pieces of 200 px or more. The previous clip measured that hand sheets
   still came back with 2–3 hands.
4. Fill enclosed holes (dry-brush breaks painted as key) with ivory `#F4ECD8` at alpha 1. That
   is the paper showing through the ink, as in the style frame.
5. Add the joint disks (1.4), trim to the alpha bounding box plus 8 px, and record the pivot.

Derivations (same tool):
- **Violet split:** pixels with hue 255–290°, saturation > 0.35 and value > 0.35 go to the glow
  overlay (alpha kept). In the base they are replaced by `#1A1A1A`, the "dead rune" colour.
- **Helm halves:** cut `helm_closed` along a jagged vertical polyline stored in the rig JSON, so
  halves at t = 0 reassemble the closed helm exactly. Cut `crown_full` along the same line.
- **Eyes:** the connected components of the void head's violet mask must be exactly 7, otherwise
  regenerate V1.
- **Pipe mouths:** crop the last 1.2 tube widths of each tube.

### 4.4 Prompt template

Rules carried over from the measured image-gen practice:
- one image per `codex exec`, with `-i` attachments;
- take the file from `$CODEX_HOME/generated_images/<session id from the log>` and never let Codex
  copy files;
- check the md5 against every earlier generation.

Attachments, in this order: `-i stil/onayli/01-tarz-cizgi-roman.jpg` (style frame) and
`-i stil/onayli/02-kanonik-karakter-sayfasi.jpg` (canonical sheet).

```
Generate exactly ONE image with your built-in image_gen tool. Do not copy or move any files and do
not run shell commands.

Two images are attached. The FIRST is the approved ART STYLE: bold graphic comic panel in a noir
style, huge flat solid black areas, very simplified shapes, thick brush-ink edges with dry-brush
breaks, flat colour, no gradients. The SECOND is the approved character model sheet of Vorathul;
match its armour, proportions and details exactly (use its FRONT view).

This is a PUPPET PARTS SHEET for 2D cut-out animation: {SHEET_SUBJECT}
{PART_LIST — one numbered line per part: what it is, its orientation, and its joint end, e.g.
"the wrist end is a plain ROUNDED stub with no detail" / "the top of the upper arm is a full
round cap"}
Every part is drawn ISOLATED and COMPLETE, as if cut out of card: no part overlaps or touches
another, nothing is cropped by the frame, all parts at the same scale as each other.

These character features are FIXED and must stay exactly as on the model sheet:
1. Closed black great-helm, ONE narrow horizontal violet eye slit, no visible face.
2. Two long black horns that curve outward and up like a crescent moon, from the sides of the helm.
3. Jagged black crown on the helm: five sharp spikes, three violet gems across the front.
4. Spiky black fur-like pauldrons on both shoulders, a high spiky collar.
5. Two small violet diamond studs on the upper chest, one on each side.
6. WINGS: on each side about eight long black organ pipes fan out sideways from the shoulder
   blades like a spread wing, short pipes near the body, long pipes at the outer edge; every pipe
   mouth glows violet.
7. Long tattered black cape reaching the floor, ragged flame-like lower edge.
8. Greatsword: black blade with one violet rune line in the fuller, spiked black crossguard with a
   violet gem in the centre.
9. Body is solid flat black #0A0A0A; violet #9B5CE0 ONLY on items 1, 3, 5, 6 (pipe mouths) and 8.
10. Proportions: very tall, broad shoulders, the helm is small relative to the shoulders.
(Only the features that belong to the parts on this sheet are drawn; the list keeps the design
consistent.)

Background: ONE flat solid pure green #00FF00, completely uniform, no paper texture on the
background, no shadow, no floor line, no scenery. Leave at least 64 pixels of plain green between
parts and around the edges. {SIZE} pixels.

- ABSOLUTELY NO text, letters, numbers, labels, arrows, guide lines, logos or watermarks.
- NOT glossy digital painting, NOT 3D, no gradients, no soft shading, no glow halos; no colours
  other than black, ivory brush breaks, violet{, warm gold #E2B33C for the cork}.

After generating, print the generated file's path and pixel size.
```

The rig master's `SHEET_SUBJECT`: "Vorathul standing, FRONT view, full figure, symmetric neutral
pose: both arms hanging straight, held 25 degrees away from the body so they do not overlap the
torso, gauntlets open and relaxed; NO wings (only two small spiky stubs at the shoulder blades); NO
sword; the cape hangs straight down behind him with its ragged hem fully visible between and beside
the legs; feet slightly apart. Figure fills 90 percent of the image height." With the wings and
sword left out, nothing overlaps the body and every body part can be cut cleanly.

### 4.5 Verification per part (all must pass before a part enters the rig JSON)

| check | how | pass |
|---|---|---|
| alpha clean | count pixels with alpha > 0 and `g > r+40 && g > b+40` | 0 |
| no halo | composite over `#E0129A` and over white and look at full size; count light pixels (luma > 200) in the 2 px band inside the alpha edge that are not interior paper breaks | ≤ 0.5 % of edge pixels |
| one piece | 8-connected components at alpha > 20 | exactly 1 (overlays: as specified, e.g. 7 eyes, 2 studs) |
| pivot marked | overlay PNG: part + crosshair at the pivot + joint disk circle `r` + the child sockets; an agent looks at it | crosshair on the joint centre; disk inside the silhouette |
| scale matches | measured feature (table 4.2) after scaling vs target | within ±2 %; scale factor within 0.6–1.6 |
| on model | the reassembled neutral pose (M parts at zero angles) vs the master | > 40/255 difference in ≤ 0.5 % of the window |
| features | the 10 KARAKTER.md items checked by looking at the reassembled pose and each variant | all present, no extra violet |
| md5 distinct | md5 of every texture file, pairwise | 54 distinct values; each generation differs from all earlier ones |
| derived ≠ base | md5 of `*_base` vs source; glow overlays have alpha > 0 pixels | distinct; overlay non-empty |

---

## 5. Pose library

### 5.1 Poses

Semantic angles (section 0). Arms: `a` = upper arm, `f` = elbow flex, `h` = hand. φ is the
resulting forearm direction (`a − f`, from straight down, + toward the outside). The sword is fixed
in the char-R hand at **+95° from the forearm** (blade below the little finger), so the sword
direction is `a − f + h + 95`. Translations are in H.

| pose | pelvis (rot, ty) | torso | head (rot, sink) | arm R (a, f, h, hand) | arm L (a, f, h, hand) | legs R/L | wings (s, rot) | sword | sword dir |
|---|---|---|---|---|---|---|---|---|---|
| base | 0, 0 | 0 | 0, 0 | −25, 70, 0, grip | −25, 70, 0, fist (over R) | 3 / 3 | 1, 0 | hand_R | 0 (point down, tip on the floor) |
| raise_sword | 0, +0.01 | +6 | +5, −0.005 | 155, 10, −30, grip | 40, 30, 0, fist | 8 / 12 | 1, +10 | hand_R, z 92 | 210 (over the head) |
| strike_down | −4, −0.02 | −10 | −8, +0.01 | −30, 70, −40, grip | 70, 40, +20, spread | 14 / 14 | 1, −20 | hand_R, z 64 | −45 (down across the body) |
| conduct_wide | 0, 0 | 0 | +4, −0.01 | 100, 30, +20, spread | 100, 30, +20, spread | 5 / 5 | 1, +12 | ground | planted, rot 0 |
| slump | 0, −0.03 | −3 | −6, +0.025 | −15, 55, −25, fist | 6, 10, 0, open | 2 / 2 | 0, −10 | hand_R | 0 (leans on it) |
| clutch_throat | 0, 0 | −4 | +10, −0.01 | −35, 140, +10, clutch | −30, 135, +5, clutch | 4 / 4 | per state | ground | planted |
| sit_alone (cut only) | 0, −0.30, legs_seated | −3 | −12, +0.025 | 10, 50, −20, open | 10, 50, −20, open | hidden | 0.15, −15 | ground | leaning, rot +18 |
| hand_on_canvas | 0, 0 | +5 | +8, 0 | 125, −5, +40, palm | 6, 10, 0, open | 3 / 3 | per state | ground | planted |
| burst | 0, +0.04 | 0 | 0, −0.01 | 150, 15, −25, grip | 150, 15, 0, fist | 22 / 22 | 1, +15 | hand_R, z 92 | 205 |

Every value is inside the limits of table 1.3 (arm a −40…160, flex −10…150, hand ±45, legs
−8…25, torso ±15, head ±20, sink −0.01…0.03, wing rot −25…+15). `tools/rigcheck.mjs`
(section 7) asserts this for every pose and every evaluated frame, not just the keys.

Two rough geometry checks with shoulder sockets at x = ±0.13 H, upper arm 0.12 H and forearm
0.11 H:
- In **base** the wrists meet at x ≈ ±0.03 H, so the hands overlap at the midline.
- In **hand_on_canvas** the palm lands beside the helm at about 0.92 H, next to his head. The
  canvas is the picture plane, so the root moves +0.05 H in z until the palm card touches it.

Wing state, crown, slit, runes and helm form are **not** part of a pose. They are separate state
tracks (section 7.3), because the nerf changes them independently of the body.

### 5.2 Transitions

- **Minimum 12 frames.** A **big body change** takes **18–30 frames**. Big means any of: torso or
  pelvis delta > 8°, pelvis ty delta > 0.05 H, any arm delta > 90°, or the sword attachment
  changes.
- **Hold ≥ 30 frames (1 s)** between the arrival of one transition and the start of the next. The
  scene map's dead-air rule (≤ 2 beats ≈ 0.65 s in a chorus) is met by camera, effect and state
  events (pipes, glow, corks, cape sway), not by more body poses.
- **Keys are arrival-anchored:** `key.at` is the frame the pose is reached. It comes from
  `hit()` / `word()` / `beatFrame()` in `timing.ts`, so a strike's contact lands exactly on a
  measured hit. The transition runs over `[at − dur, at]`.
- **Rig cadence 12 fps, camera 30 fps.** Within a transition the progress is sampled at
  `n_q = floor(n · 12 / 30) · 30 / 12`, with `n = frame − (at − dur)`. That makes a 2-3-2-3 frame
  cadence that restarts at every transition, so the first and last frames of each transition are
  exact. Holds, cape sway and glow also step at 12 fps; corks, effects and the camera run at 30.
  Note: "twos" at 30 fps is 15 fps, not 12 — see open question 4.
- **Easing:** in-out cubic. Strikes get a 6-frame anticipation (8 % of the delta in the opposite
  direction) and arrive on the hit with no overshoot. An overshoot is clamped to the limits.
- **Hand variant swaps:** either a crossfade of 6 frames (the incoming hand fades in on top, the
  outgoing fades out after) or instant on a declared impact/hit frame. Never a bare swap
  mid-motion.
- **Sword attachment:** switching to `ground` freezes the sword's world transform at the switch
  frame, so it cannot pop. Switching back to `hand_R` is allowed only if the grip socket of the
  hand is within 4 px of the sword grip at that frame; otherwise only across a cut.
- **Cut-only edges:** anything ↔ `sit_alone`. A helm form change (closed ↔ split) happens only
  on a hit or beat frame, with a 2-frame violet impact flash from the effects lane.
- **z overrides** (e.g. the sword moving to z 92 when raised) change only on a frame where the
  part's ID-pass pixels do not overlap any part whose order it crosses (test 6.3).

---

## 6. Test plan (before any shot uses the rig)

Everything is rendered by a `RigTest` composition through the real `Stage` at 1920×1080, character
900 px tall, on a flat `#808080` background. Each render produces three passes:
- **beauty**;
- **alpha** (the character only, background transparent);
- **ID**: every card with a flat unique colour, alpha-tested at 0.5, no blending.

PNG frames are extracted frame-exactly (`ffmpeg select='between(n,A,B)'`, never `-ss`, which
returned wrong frames last time). An analysis script measures them.

### 6.1 Renders

1. **Joint sweep:** for each of the 39 joints, sweep its range in 5° steps with everything else at
   base, including the exact limit angles.
2. **Pose carousel ("turntable"):** base → raise_sword → strike_down → base → conduct_wide →
   slump → clutch_throat → hand_on_canvas → burst → base. Each pose holds 30 frames, with the
   transition lengths of 5.2. Then the same carousel under a camera yaw sweep of −12° → +12°. A
   contact sheet shows each pose at its hold frame next to frames 02, 03 and 05.
3. **Fan:** `s` 0 → 1 → 0 over 60 frames per wing, plus wing rot −25 → +15. Also run with the
   camera yaw at ±12°.
4. **Pipe sequence:** delete pipes 0…7 of each wing one per beat, then fold, then show
   wing_missing, then cork the 6 remaining pipes one per beat, then the return and relight of all
   16, one per beat.
5. **Helm split:** closed → split t 0 → 1 over 18 frames → eyes open one by one → hold → back.
   Also crown full ↔ small and slit lit ↔ sad.
6. **Runes and glow:** every overlay 1 → 0 → 1.
7. **Determinism:** render 20 random frames twice, in different order and concurrency.

### 6.2 Measurements and acceptance numbers

| # | measures | acceptance |
|---|---|---|
| A | **joint gap** at every sweep angle: holes in the alpha union of parent + child inside a circle of 1.5 r around the pivot | **0 hole pixels** |
| B | **joint notch**: area of (morphological closing with a 6 px disk − union) inside that circle | **≤ 30 px** |
| C | **joint bridge**: union eroded by 3 px is still one 8-connected piece | **pass at every angle** |
| D | **silhouette pieces** per frame in all renders (alpha > 20, 8-connected; wing_missing, corks in flight and detached helm halves are declared extra pieces) | **= declared count, every frame** |
| E | **silhouette continuity**: IoU of consecutive rig steps (alpha pass) | **≥ 0.85** outside declared impact steps |
| F | **no popping**: every change of texture, visibility or z in the ID pass vs the timeline's declared events | **0 undeclared changes** |
| G | **no jumps**: largest one-step move of the hand, head and sword tips | **≤ 0.06 H (54 px)** outside declared impact steps; **0** single-frame spikes (a move followed by its reverse) |
| H | **cadence**: distinct rig poses per second during transitions | **12** (pattern 2-3-2-3) |
| I | **limits** (numeric, no render): every joint at every frame of every timeline | **0 violations** |
| J | **pipe roots hidden**: ID-pass pixels of any pipe body within 0.03 H of its root that are not covered by the hub, pauldron or torso, for s ∈ [0,1] and yaw ±12° | **0 px** |
| K | **one deletion at a time**: at each delete frame only that pipe's ID pixels change; others identical | **exact** |
| L | **cork seat**: cork centroid vs mouth seat target | **≤ 2 px** |
| M | **helm split**: halves at t = 0 vs helm_closed in the alpha pass | **identical** (cut from it); no holes in the head region for t ∈ [0,1] |
| N | **sword on the floor** in base and slump: tip y vs floor | **≤ 3 px** |
| O | **hands meet** in base: R/L hand ID regions overlap | **> 0 px** |
| P | **determinism**: md5 of the same frame across renders | **identical** |
| Q | **looks** (architect, full size): joint crops at the most bent frames, the contact sheet vs the approved frames | no visible seam, hard corner, doubled outline or off-model part |

Passing A–P is necessary but not enough: last time the geometry was perfect and the acting still
failed, so Q decides.

---

## 7. Code shape (proposal, not code)

### 7.1 `video/src/rig/vorathul.rig.json`

```
{
  "unitPx": 1380,                       // master px per H
  "textures": {
    "upper_arm": { "src": "rig/upper_arm.png", "w": 212, "h": 410, "md5": "…" },
    "body_m":    { "src": "rig/body_m.png", "w": …, "h": …, "derivedFrom": null },
    "glow_m":    { "src": "rig/glow_m.png", "derivedFrom": "pipe_m_src" },
    "wing_missing": { "code": "checker", "polygon": [[x,y], …] }
  },
  "parts": [
    { "id": "upper_arm_R", "parent": "torso", "texture": "upper_arm",
      "variants": null, "pivot": [106, 38], "socket": "shoulder_R",
      "jointRadius": 52, "z": 72, "limits": { "rot": [-40, 160] },
      "sign": -1, "mirrorOf": null },
    { "id": "upper_arm_L", "mirrorOf": "upper_arm_R", "socket": "shoulder_L" },
    { "id": "hand_R", "variants": ["hand_open","hand_grip","hand_fist","hand_palm","hand_spread","hand_clutch"], … }
  ],
  "sockets": { "torso": { "shoulder_R": [x,y], "wing_R": [x,y], … }, … },  // in the parent's image px
  "pipes": { "r0": 0.02, "pipes": [ { "i": 0, "open": -38, "fold": 76, "len": 0.14, "tex": "s" }, … ] },
  "poses": { "base": { "pelvis": [0, 0], "torso": 0, "upper_arm_R": -25, "forearm_R": 70,
                       "hand_R": [0, "hand_grip"], …, "sword": "hand_R" }, … },
  "helmCut": [[x,y], …]
}
```

### 7.2 How `Part.tsx` consumes it

A `<Rig rig={json} state={rigState(frame)} />` component walks the tree and renders the existing
`Part` for every part.

- **Size:** `width/height` = texture px / unitPx × the world height of H.
- **Pivot:** `pivot` = (pivotPx − centre) converted to world units, with y flipped (Part already
  rotates its card around this offset).
- **Position:** = (socketPx in the parent − parent pivotPx) in world units. This is because Part's
  children live in the parent's joint space.
- **Rotation:** `rotation.z` = `sign · angle` in radians; **renderOrder** = character base + z.
- **Mirroring:** a mirrored subtree is wrapped in a `<group scale={[-1,1,1]}>` at its socket.

Two small changes the stage will need:
- **Card must render `side: DoubleSide`.** A −1 scale flips the triangle winding, and the default
  `FrontSide` would make every mirrored part vanish.
- **Card needs an optional `idColor`** for the ID pass.

Variant swaps pass a different `src`. All variants are preloaded (`useLoader.preload`), so a swap
never suspends mid-shot. Overlays (glow, runes, studs, gems, eyes) use the existing `opacity` prop.
Missing pipes use a checker material masked by the part's own texture alpha.

### 7.3 Timeline as pure functions of the frame

```
type Key   = { at: number; pose: PoseName | Partial<JointSet>; dur: number;
               ease?: 'inOutCubic' | 'strike'; cut?: true; hands?: HandSwap };
type Track<T> = { at: number; value: T }[];          // step functions, declared change frames

rigState(frame) = {
  joints:  blendPoses(keys, frame),            // previous arrival → this key, 12 fps quantised
                                               // + cape auto angles + closed-form sway/spring
  helm:    step(helmTrack, frame),             // 'closed' | { split: t }
  crown:   step(crownTrack, frame),            // 'full' | 'small'
  slit:    step(slitTrack, frame),             // 'lit' | 'sad', opacity
  runes:   ramp(runesTrack, frame),            // 0…1
  wings:   { R: wingState(wingR, frame), L: … },   // s, rot, missing, pipes[8]: state from event lists
}
```

- Keys and tracks are built only from `timing.ts` helpers (`hit`, `word`, `beatFrame`), never from
  literal seconds.
- Seeded hashes replace randomness (frame-purity rule): no `Math.random`, `Date.now` or
  `useFrame`.
- `tools/rigcheck.mjs` imports the same pure functions under node, as `beatcheck.mjs` does. It
  checks: limits at every frame (I), minimum durations, 30-frame holds, big-change durations,
  cut-only edges, sword re-attach distance, and the declared-event list later compared by test F.

---

## 8. Risks and open questions

1. **Risk — part consistency from image generation.** Five variant sheets must match the master
   in brush weight and armour detail. Mitigation: cut from one master where possible, a scale
   window of 0.6–1.6, the reassembly check (≤ 0.5 %), and a look at every variant next to the
   neutral pose. Budget: about 2 retries per sheet.
2. **Risk — alpha on dry-brush edges.** The style's broken brush edges are the worst case for
   keying: green fringe, eaten edges, and painted checkerboards. Mitigation: green key + despill,
   the reject rules in 4.3, and checks A/alpha-clean. The ivory flood-fill fallback costs a
   regeneration.
3. **Risk — a front-only rig may read flat in the strikes and the burst toward the camera.**
   Mitigation: root z moves, camera yaw ±12°, impact frames and effects. Strikes are sold as comic
   panels, not choreography. If a shot still reads flat, it gets a drawn still, not a second rig
   view.
4. **Open — 12 fps vs "twos".** At 30 fps, twos is 15 fps. 12 fps gives an uneven 2-3 cadence that
   may judder against a 30 fps camera. The design uses 12 fps as briefed behind one constant;
   decide after watching render 6.1.2. Also open: the 1 s hold rule makes the dead-air rule depend
   on non-body events.
5. **Open — the shape of the checkerboard wing.** This design follows the approved frame 05
   (a feathered wing outline). The alternative is the outline of the deleted pipe fan itself (the
   union of the 16 pipes at s = 1), which fits the "missing texture of exactly what was deleted"
   joke better. Similarly: helm halves cut from the closed helm (exact, no pop) lose the inner-shell
   rims visible in frame 04. Accept that, or generate halves and hide the swap under the flash?
6. **Open — a new tool dependency.** Cutting and measuring need Python + Pillow/numpy, as in the
   previous clip, but this repo has none yet. Burak must approve the dependency.

## 9. Architect decisions (20 Oct 2026)

- **Pose cadence = true twos, 15 fps** (one new rig pose every 2 frames at 30 fps), not 12 fps:
  an even cadence cannot judder against the 30 fps camera. Keep it behind the one constant; the
  6.1.2 test render confirms it.
- **Helm halves are cut from the closed helm** (no pop at the split). The inner-shell rims of frame
  04 are restored as a code-drawn ink edge along each cut line (same dry-brush stroke as the VFX
  library), so nothing is generated twice.
- **Python tooling uses temporary environments** (`uv run --with pillow --with numpy python ...`),
  exactly like `tools/timing/`. Nothing is added to the repo's dependencies, so no new dependency
  is introduced.
- **Checkerboard wing shape:** asked to the director (open until answered). Recommendation: the
  outline of the deleted pipe fan itself, because it reads as "the missing texture of exactly what
  was deleted" and it is derived from the rig, not drawn.
- **Stage changes for later:** `Card` renders `DoubleSide` (mirrored subtrees) and gets an
  `idColor` for the measurement tests — part of the rig code lane.
