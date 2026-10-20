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
