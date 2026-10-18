# Her Sabah Baştan — music video

A Turkish duet (human / AI) about an AI that meets you for the first time every morning.
Story, scene map and typography rules: `sahne-haritasi.md`. Lyrics: `sarki/sozler.md`.

## Success metric (fixed before the first commit)

Every beat-locked event drifts **0 frames** from its measured beat (`data/timing.json`,
checked by `tools/beatcheck`), and the final render has **0 render errors**.

## Layout

- `sarki/` — lyrics, Suno brief; the master WAV lives here but is not committed (46 MB).
- `data/timing.json` — measured beats, downbeats, sections, words (tempo drifts 127.9 → 130.9 BPM).
- `stil/` — approved style frames (tur 2/03 is the style; tur 3 the key moments) with prompts.
- `tools/timing/` — measurement scripts.
