# Brief: transition test — make three scene changes flow like water

Repo ~\Documents\klip-her-sabah (Windows, Git Bash; local git, NEVER push; do not commit — the architect
commits). Files in English. Sub-agents you spawn must be `sonnet`. RESUME RULE: if re-sent, read `git status`/`git diff`
first and continue.

## Why
Burak approved scene map v2 (`.claude/briefs/sahne-haritasi-v2.md`, frames `stil/tur4/`) and said: "o smooth yumuşak
animasyonlar ve yüksek kalitede geçişler yapabilirsek ortaya bir başyapıt çıkacak"; transitions should be "gerçekten bir su
gibi geçişler, akıcı bir bütün gibi". Characters are being rebuilt in Blender by a parallel agent; transitions are
independent of that, so prove them now with still plates.

## Goal
`video/out/transitions-test-v1.mp4` (1920x1080, 30 fps, about 20 s, song audio at the real times), containing three of the
map's transitions at their real beats, each with ~2 s of the scene before and after:
1. G1 "dive into the screen" (scene 2, lands bar 14 downbeat 0:24.99): the monitor screen surface ripples like water and
   the camera passes through it into the split world. Plates: `stil/tur4/07-ekran-yakin.png` → the split (reuse the
   existing room plates/composition from Test90 as a still, or `stil/tur3/01-giris.png`); mid frame ref `G1-ekrana-dalis.png`.
2. G2 "ink spreads into the seam" (scene 4 → 5, bar 31 downbeat 0:56.86): ink lifts off the notebook page and bleeds outward
   like ink on wet paper; the navy spreads across the cream and its edge settles into the glass seam. Plates:
   `08-defter-krem.png` → split; mid ref `G2-murekkep-yayilma.png`.
3. G5 "the street folds into the paper city" (scene 9 → 10, bar 70 downbeat 2:09.79): the street's buildings fold flat like
   paper, the frame folds with them and lands as the paper city on his desk. Plates: `09-sokak-vitrin.png` → a desk/paper
   city plate; mid ref `G5-sokak-katlanma.png`.
Static plates are fine for the test (characters will come later), but give each "before" scene slow life (a gentle camera
drift/parallax, a few moving notes) so the transition starts from motion, not from a frozen image.

## Quality bar
- Continuous, eased, organic: no linear wipes, no visible tiling or blocky noise, no single-frame pops; the transition has
  a clear shape (it reads as water / ink / paper, not a generic dissolve). 1.0–2.5 s each, landing exactly on the beat.
- The screenprint look survives the effect: halftone/grain on top, the 3-colour palette (+ the plates' own colours).
- Techniques are your call (WebGL/three.js shaders already in the project? check `video/package.json`; SVG displacement
  filters; canvas; masks from noise fields; 2.5D card folding with CSS 3D transforms). Frame purity: no Math.random,
  Date.now, new Date, performance.now, requestAnimationFrame, setTimeout, setInterval, useFrame in `video/src`; seeded noise
  only. Do NOT add npm dependencies without asking — if one would clearly help, stop and say which and why.

## Files (avoid the parallel Blender agent: it is editing `video/src/Root.tsx` and `video/src/scenes/BlenderTestScene.tsx`)
- Do NOT edit `video/src/Root.tsx` or `video/src/index.ts`. Create your own entry: `video/src/transitions-index.ts`
  (registerRoot) + `video/src/TransitionsRoot.tsx` with a composition `TransitionsTest`.
- Put reusable transition components in `video/src/transitions/` (they will be used by the real clip later), with clean
  props (progress, from/to layers) so a scene can wrap any two layers.
- Render: from `video/`: `npx remotion render src/transitions-index.ts TransitionsTest out/transitions-test-v1.mp4
  --concurrency=4 --crf 23`.

## Measure and look
- Frame-exact sheets of each transition at full rate (`ffmpeg -vf "select='between(n\,A\,B)',scale=480:-1,tile=8x4"
  -frames:v 1 -update 1`; never `-ss`; drawtext crashes here) into `video/out/transitions-checks/`.
- A per-frame mean-abs-difference curve per transition: it should rise and fall smoothly (no spikes); report the max
  single-frame change.
- tsc clean, purity grep clean, beat landing frames printed against `data/timing.json` downbeats (0 frame drift).

## Report (Turkish, plain language, short)
What each transition looks like, how it was made, the measurements, honest weak spots, and how reusable the components are.
