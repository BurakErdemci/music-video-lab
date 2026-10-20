# Brief: cut-out puppet parts for both characters (2D bone animation)

Repo ~\Documents\klip-her-sabah (Windows, Git Bash; local git, NEVER push; do not commit). Files in English.
Sub-agents you spawn must be `sonnet`. RESUME RULE: if re-sent, read `git status`/`git diff` first and continue.

## Why
Burak: the clip is 2D and needs fluid 2D animation. Morphing between pose drawings distorted limbs (`.claude/briefs/rig/`),
and 3D Blender bodies (just tested, `video/out/blender-test-checks/same-person-board.png`) lost the illustrated look.
The chosen technique is 2D skeletal cut-out animation with mesh deformation (as in Spine / Live2D / Unity 2D Animation):
our OWN drawings split into layered parts, bones inside, the art bends smoothly at the joints. The animation tool (Blender
image planes + armature, or Unity 2D Animation) is decided separately — your output must work for both.

## Goal
For each character, a set of separate transparent PNG parts that, reassembled on their pivots, reproduce the canonical
character exactly, and that bend cleanly at every joint.

## Characters and views
- Human: `stil/hareket/ref-insan-kanonik.png` (also `ref-insan.png`, the tur4 frames for how he looks in scenes). Main view:
  SIDE PROFILE facing right (most of the clip). Second priority: 3/4 front.
- AI: `stil/hareket/ref-ai.png`. Main view: side profile facing left; second: front.
- Do the two PROFILE sets first and completely; do the second views only if time allows.

## Parts (per view)
head (+ hair as its own layer for the human, so it can lag/bounce), neck, upper torso/chest, pelvis/hips, upper arm ×2,
forearm ×2, hand ×2 in a few shapes (open/relaxed, gripping a mug handle, typing/pointing, holding a notebook), thigh ×2,
shin ×2, foot ×2. The human's yellow sticky notes: separate small layers (so they can flutter), positioned on the torso/arms
as in the reference. The far-side limbs may be a darker shade as in the art.
- Joint ends: generous rounded OVERLAP (the hidden part under the neighbouring segment is drawn too), so rotation up to
  ~120° at elbow/knee and ~90° at shoulder/hip never shows a gap or a hard corner. The bend region must contain plain
  fill/outline, not detail that would smear when deformed.
- Same line weight, palette, halftone/grain as the references. No text.

## How (your call; suggestions)
- Generate with Codex image_gen, model gpt-6.1-sol, `-i` the canonical reference, flat magenta #FF00FF background, ONE image
  per `codex exec`; take the file from `~/.codex/generated_images/<session id from the log>` (never let Codex copy it);
  verify md5 + by looking. Prompts in `stil/kukla/prompts/`. Codex quota is not a concern.
- A "paper-doll / cut-out puppet parts sheet" prompt, parts laid out separately with space between them, is one route;
  generating a rig-friendly full pose and cutting it with masks, then redrawing the hidden overlaps, is another. Pick
  whatever gives parts that reassemble on-model.
- Extract parts with Python (connected components / masks), trim, keep full alpha, consistent scale (same pixels per unit
  for all parts of a character).

## Deliverables
- `stil/kukla/<character>-<view>/` with one PNG per part (clear names: `upper_arm_near.png` …).
- `stil/kukla/<character>-<view>/rig.json`: for each part its pivot (joint) in part pixels, its parent, the default
  offset/rotation to assemble the neutral pose, and draw order (z). Units documented.
- `stil/kukla/<character>-<view>/assembled.png`: the parts reassembled from rig.json by a script (`stil/kukla/assemble.py`),
  next to the canonical reference at the same scale — the same-person board.
- `stil/kukla/<character>-<view>/bend-test.png`: the same script rotating elbow, knee, shoulder and hip through their range
  (e.g. 0/45/90/120°) with rigid rotation: no gaps, no hard corners, no doubled outlines at the joints.
- A short `stil/kukla/README.md`: the part list, the rig.json format, how to re-run assemble.py.

## Report (Turkish, plain language, short)
What was produced, how close the reassembled characters are to the references (show the boards), the weak joints, and
what is missing.
