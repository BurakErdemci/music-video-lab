# Brief: Blender character test (replace image morphing)

Repo C:\Users\burcu\Documents\klip-her-sabah (Windows, Git Bash; local git, NEVER push; do not commit — the architect
commits). Files in English. Sub-agents you spawn must be `sonnet`. RESUME RULE: if re-sent after an interruption, read
`git status` / `git diff` first and continue; do not restart.

## Why
Burak watched test90-v6 and test2-v2 and said the animation is not fluid: "karakterler garip şekillere giriyor, uzuvları
uzuyor". Root cause: characters are separate still drawings and the in-betweens are shape morphs between them, so limbs
stretch, blob and double. His four example frames are in `.claude/briefs/rig/burak-0[1-4]-*.png`: an arm turning into a
smear, a doubled body while standing up from the chair, legs smearing into a tail while walking, and the AI's arm becoming a
lump. The navy human is worst. The decision (Burak, today) is to move characters to Blender: simple 3D characters rendered
flat so they read as the existing 2D screenprint illustration, animated with a real skeleton.

## Goal (one test, not the whole clip)
Prove or disprove that Blender characters can (a) look like our two characters in our style and (b) move fluidly with
no limb distortion. Deliver `video/out/blender-test-v1.mp4` (1920x1080, 30 fps) with the existing room backgrounds and the
glass seam, composited in Remotion, plus a side-by-side against the current version.

## Read first
- `sahne-haritasi.md` (palette, identity, typography), `stil/hareket/ref-insan-kanonik.png` (human), `stil/hareket/ref-ai.png`
  (AI), `stil/tur2/07-toon-3d.png` (an earlier toon-3D style frame), `stil/tur3/01-giris.png`, `stil/tur3/04-teselli.png`.
- How the current scene is composed in Remotion: `video/src/Root.tsx`, `video/src/world/Story.tsx`, `video/src/world/Rooms.tsx`,
  `video/src/scenes/Test30Scene.tsx` (only to learn where backgrounds, seam, grain and character layers sit).
- Blender 5.2 is installed: `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe`. Drive it headless with Python
  (`blender -b --factory-startup -P script.py -- args`). Verify the path first.

## Look (the bar: a viewer should not think "3D")
- AI: plain cream mannequin, round head with the single vertical slit eye, flat cream fill (#F0EAD8-ish; take exact hexes
  from the scene map/refs), navy outline of steady weight, no shading gradients (at most one flat shadow tone).
- Human: navy silhouette with messy hair, thin light rim/outline as in the ref, yellow sticky notes attached to the body
  (small planes parented to bones so they move and bend with him), simple clothes folds as flat tone only.
- Proportions and silhouettes on-model with the refs; make a same-person board (ref next to your render, same pose).
- Outline via inverted hull or Line Art (no third-party add-ons); flat emission/toon shading; render with alpha, film grain /
  halftone added in Remotion like today. Orthographic or long-lens camera matching the current framing.

## Motion
- Real armature (Rigify or a hand-built rig), fixed bone lengths, IK for feet/hands, natural easing, overlap and weight.
- Motion source: keyframing with IK is fine; you may also use free public mocap with a permissive licence (e.g. the CMU
  Graphics Lab Motion Capture Database BVH) for walk/stretch and retarget it. Do NOT log into any service (no Mixamo) and do
  NOT install Blender add-ons, Python packages or other software — if something would clearly help, stop and list it in the
  report for Burak to approve.
- Test content (song audio not required; ~16 s):
  1. Human at the desk, ~10 s, ONE continuous meaningful routine: typing → stretches arms up and back → reaches for the coffee
     mug, sips, puts it down → back to typing. AI on the cream side meanwhile: reads a notebook and turns a page, then looks up
     toward the glass (calm, 2–3 actions).
  2. Human walks ~3 s across his room (the old walk was buggy: legs smeared).
  3. Human sits down on the floor cross-legged ~3 s (the old floor sit/stand blobbed).
- Every transition is part of continuous motion; no pose pops. Each action 2–5 s, calm.

## Measure and look (do not trust the render log)
- Full frame rate frame-exact sheets (`ffmpeg -vf "select='between(n\,A\,B)',..."`, never `-ss`; ffmpeg drawtext crashes on
  this machine) of every action change, the walk and the sit. Put them in `video/out/blender-test-checks/`.
- A per-frame check that the character silhouette never doubles or tears: silhouette area per frame and its frame-to-frame
  change, connected components = 1 per character; report max values.
- Side by side: the same four kinds of moment as Burak's examples (arm reaching, standing/sitting, walk, AI arm) old vs new,
  one sheet `video/out/blender-test-checks/old-vs-new.png`.

## Files
- New: `blender/` (build scripts, rig, animation scripts, a README with the exact commands). Rendered frames go under
  `video/public/blender/test-v1/` (or another ignored path — check `.gitignore` and say which). Large `.blend` files: keep
  them, report the size.
- Remotion: a new composition `BlenderTest` only; do not change existing compositions or their output.

## Report (Turkish, plain language, short; the reader is not a specialist)
What it looks like, how the motion feels, the measurements, honest weak spots (especially "does it look 3D/plastic?" and
"does the human read as the same person?"), what it would take to do the whole clip this way (time per minute of footage),
and anything you would want installed.
