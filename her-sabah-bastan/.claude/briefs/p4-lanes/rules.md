# Part 4 scene-code lanes — shared rules (architect: the part-4 main lane)

Repo C:\Users\burcu\Documents\klip-her-sabah (Windows, Git Bash, absolute paths). Do not commit, do not push. Any sub-agent
you spawn uses model "sonnet".

## Read first
- `.claude/briefs/prod-part4.md` (the scene you build is described there) and `.claude/briefs/prod-part2.md` sections
  "Approved foundations", "Burak's rules", "Typography and icons", "Measure and look". Burak reviews every frame; a careful
  viewer's defect is a defect. Calm pacing except where the music asks.
- The part-4 skeleton (written by the architect, read-only for you): `video/src/living/part4/common.ts` (events `ev()`,
  ONE sprite registry `sp/url/img/pose/hasSprite/isAi/headOf`, geometry `placeAt/project/projectRect`, easing, `beatPhase`,
  layer builders `canvasLayer/imageLayer/charLayer/spriteRectAt/spritePoint`, the Shot types), `part4/events.json` (the
  timeline in SONG frames), `part4/shots.ts` (which module owns which frames), `part4/Part4Scene.tsx` (how each Shot kind
  is rendered: `stage` = ThreeStage + optional screen-space `overlay` painter; `flat` = one 2D painter; `gl` = InkBleed /
  PlateShift / SqueegeePrint with both sides as 2D painters; `shatter` = the coda's own canvas), `part4/splitSet.ts` (the
  home split set and the pressed-palms pose), `part4/figures.ts` (AI body + blinking cursor eye, inverted / tinted sprites,
  paintNote), `part4/cracks.ts` (crack API; the run lane owns its look).
- References for idiom and quality: `video/src/living/part3/*` (street.ts, bus.ts, desk.ts), `part2/shots.ts` (split
  scenes, days montage, come-apart/version tag), `part1/shots.ts` (split set, pen). You may IMPORT from part1/part2/part3
  modules and the engine (`video/src/living/*.ts`, `video/src/transitions/*`, `video/src/style/*`), never edit them.

## Files
Edit ONLY the files your brief names. Not: part1/2/3, the engine, `video/scripts/living-checks.mjs`, the skeleton files
above, other lanes' files. If you need a helper the skeleton lacks, write it in your own file. If the skeleton blocks you,
work around it in your file and say so in the report.

## Drawings
New drawings are being generated in parallel. Ask for them ONLY through `pose('<new name>')` (common.ts): it returns the
new drawing when its list has it, else a stand-in. So place figures robustly: by head height (`headOf`) or bbox height and
the floor line, never by stand-in-specific points; when a key the brief names exists on the real sprite (`sp(n).palm`
etc.), use it, else fall back to bbox. Metadata keys the drawing lanes deliver are listed in your brief. Existing
drawings: `video/public/living/**`, lists `video/src/living/sprites*.json`; contact sheet
`video/out/part4-checks/ref/sprites.png`.
List every image your module draws in your module's `*_IMAGES` export with `spriteUrls(names)` from common.ts (AI sprites bring -eye/-noeye) plus any other
urls (never import part4/images.ts from a scene module: circular).

## Rules of the code
Frame purity: no Math.random / Date / performance.now / requestAnimationFrame / timers / useFrame in `video/src`; seeded
noise (`style/seeded.ts`). Palette navy #18203A, moon yellow #F0D35A, cream #F3EFE4; red only for emotion icons. No new
npm dependencies. Living illustration: big body actions are NOT animated — each beat is a complete drawn pose; poses
change by cuts on the beat, cuts on action, match cuts, camera reframes, print transitions; inside a pose only small life
(breath via charLayer/aiLayers, hair stir, blink, small rotation <= 8 deg for floating). The camera (multiplane depth
layers, `Cam {x,y,z}`) and the world carry the motion; the first 1.5 s of a shot is never dead. No line shimmer on
scaled drawings (use the existing layer builders). A transition's fast middle is stretched so it never jumps frame to
frame. Stamps/captions are the typography lane's; keep faces clear of the top ~170 px band where captions sit
(male captions top-left, female top-right).

## Look at your work
`cd /c/Users/burcu/Documents/klip-her-sabah/video`; typecheck `npx tsc --noEmit -p .` (must pass). Stills:
`npx remotion still src/living-index.ts Part4a out/part4-dev/<lane>/f<SONG>.png --frame=<SONG-4676> --log=error --timeout=120000`
(Part4b: `--frame=<SONG-6396>`). Short ranges as video for motion: `npx remotion render src/living-index.ts Part4a
out/part4-dev/<lane>/seg.mp4 --frames=<a>-<b> --concurrency=2 --log=error --timeout=120000` then frame sheets with
`ffmpeg -i seg.mp4 -vf "select='between(n\,A\,B)',scale=480:-1,tile=6x5" -vsync 0 sheet.png` (frame numbers, never -ss,
never drawtext). LOOK at the stills/sheets yourself at full size (Read the png): limbs, grips, perspective, faces, motion
continuity between consecutive frames, nothing popping that should not. Other lanes render too: keep concurrency <= 2
and your renders short. Put dev output only in `video/out/part4-dev/<lane>/`.

## Report (English, short)
Files written; per frame range what the viewer sees; which stills/sheets you looked at and what you fixed; stand-ins in
use; weak spots; anything you decided differently from the brief and why.
