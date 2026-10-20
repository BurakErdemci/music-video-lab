# NERFED — Vorathul

A music video for a symphonic metal song about a final boss who gets nerfed in a patch.
Song made with Suno (Pro). Video code, assets and audio are released open source;
finished videos are published as GitHub Releases.

## Success metric

Every beat-locked event lands on its beat with **0 frames drift**, no section breaks the
dead-air rule (`tools/beatcheck.mjs`), and the full render has **0 render errors**.

## Layout

- `sarki/sozler.md` — lyrics and the Suno style prompt
- `audio/` — song files (not in git; download from the `audio-input` release)
- `tools/timing/` — song measurement (tempo, downbeats, sections, word timings)
- `data/timing.json` — measured timing used by the video

## Video (Remotion + Three.js)

```
gh release download audio-input -p "Vorathul.Nerfed.wav" -D audio   # audio is gitignored (*.wav)
mkdir -p video/public/audio && cp audio/Vorathul.Nerfed.wav video/public/audio/song.wav
cd video && npm ci
npm run sync-timing   # copy ../data/timing.json into src/data/
npm run studio        # preview
npm run check         # tsc --noEmit
npm run purity        # frame-purity grep over src
npm run beatcheck     # drift + dead-air check against data/timing.json
npm run stills -- --frames 0,585,2349 --comp Nerfed
npm run render:test30
```
