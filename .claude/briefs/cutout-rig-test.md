# Brief: 2D cut-out rig test in Blender (our drawings, bones, smooth bending)

Repo C:\Users\burcu\Documents\klip-her-sabah (Windows, Git Bash; local git, NEVER push; do not commit — the architect
commits). Files in English. Sub-agents you spawn must be `sonnet`; Burak wants parallel work — split independent tracks
(e.g. human rig, AI rig, checks/compositing) across sonnet helpers, keep design and the final look yourself. RESUME RULE:
if re-sent, read `git status`/`git diff` first and continue.

## Why
Morphing drew stretched/doubled limbs (`.claude/briefs/rig/burak-0[1-4]-*.png`); 3D Blender bodies kept anatomy but lost
the illustrated look (`video/out/blender-test-checks/same-person-board.png`). Burak: "bize lazım olan akıcı 2D animasyon".
Decision: 2D skeletal cut-out with mesh deformation in Blender (like Spine / Unity 2D Animation), using our own drawings.
The parts exist: `stil/kukla/insan-profil/` and `stil/kukla/ai-profil/` (PNG per part + `rig.json` with pivot, parent,
neutral offset/rotation, z-order; format in `stil/kukla/README.md`; reassembled they match the references within 0.5 %).
Use the PROFILE sets only (the front views are drafts).

## Goal
`video/out/cutout-test-v1.mp4` (1920x1080, 30 fps) with the same content as the 3D test so the two can be compared, plus
`video/out/cutout-test-v1-vs-old.mp4` and `video/out/cutout-checks/old-vs-new.png` against Burak's four example frames.
Content (~16 s, one continuous take per character, calm 2–5 s actions, natural easing, overlap and weight):
1. Human at the desk ~10 s: typing → stretches arms up and back → reaches for the mug, sips, puts it down → back to typing.
   AI on the cream side meanwhile: reads a notebook, turns a page, looks up toward the glass.
2. Human stands up from the chair and walks ~3 s across his room (feet planted, no sliding).
3. Human sits down on the floor cross-legged ~3 s.
Hair as its own layer with a little lag; the 9 notes with a slight flutter on big moves.

## Technique (requirements)
- Each part = an image plane (alpha) with enough mesh resolution in joint regions; parented/weighted to an armature built
  from `rig.json` pivots, so bones have the parts' real lengths. Joint regions use smooth vertex weights (mesh deformation)
  so elbows/knees/shoulders/hips BEND like rubber instead of hinging; outside the joint band the art stays rigid.
- Hands: swap the hand PNG per action (open / grip / point / notebook) at moments hidden by motion, or crossfade over
  ≥ 4 frames on a held hand — never a visible pop.
- Orthographic camera, flat (emission/unlit) materials so the PNG colours are exact; alpha output; composite in Remotion
  over the existing room plates, desk, glass seam and paper grain (reuse `video/src/scenes/BlenderTestScene.tsx` or a copy).
- Reuse the 3D test's pipeline in `blender/` where it fits: `run.sh` (headless build → render → matte → checks → video),
  `common.py` (repo-relative paths, `BLENDER` env var), `render.py`, `checks.py`, the `Keyer` in `anim.py` (IK, hand locked
  to the mug/page, walk step generator). Drop the 3D body/outline code. Put new code under `blender/cutout/` or refactor
  cleanly; keep the 3D test runnable or remove it — say which.
- No add-ons, no installs, no logins; all output paths inside the repo (last time a relative path wrote to `C:\video` —
  check every path before rendering; never delete outside the repo/scratchpad).
- Frame purity in Remotion code as before; no npm dependencies.

## Measure and look
- Per frame, per character: one connected silhouette (count components), silhouette area change frame to frame,
  bone length deviation, max screen jump of hands/feet/head. Report max values.
- Joint quality: crops of elbow/knee/shoulder/hip at their most bent frames — no gaps, no hard corners, no doubled outline,
  no stretched texture smear beyond the joint band.
- Full-rate frame-exact sheets of every action change, the walk and the floor sit (`ffmpeg select='between(n\,A\,B)'`;
  never `-ss`; drawtext crashes here) in `video/out/cutout-checks/`.
- Same-person board: rendered neutral frame next to `stil/hareket/ref-insan-kanonik.png` / `ref-ai.png`.

## Report (Turkish, plain language, short)
How the motion feels, the measurements, the boards, honest weak spots (especially joint bending and the walk), and what
it would take per minute of footage.
