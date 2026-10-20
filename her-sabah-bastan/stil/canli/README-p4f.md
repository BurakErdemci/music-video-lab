# Part 4 finale v3 (`Part4bV3`): images

No new drawings were generated for the finale. Everything new is code-made (halftone dot screens, the union of the two
silhouettes, the shards) or reused:

- Figures (reused, unchanged): `h-palm-full`, `a-palm-full` (p4), `h-cross`, `a-cross` (p4), `h-hand`, `a-hand` (p1),
  `a-step1`, `a-step2` (p2). The reset room: Part 1's `room-morning`, `desk2`, `h-mug2`, p4's `h-desk-book`.
- Recap stills in `video/public/living/p4f/recap/` (printed inside the big shards): frame-exact stills from the film's
  own renders, extracted with `ffmpeg -vf "select='between(n\,N\,N)'"` and scaled to 960x540. Provenance per file in
  `recap.json` (render, frame in that render, song frame, focus point). Own work, same licence as the film.
  `r04-ai-redrawn.png` is extracted but not used (the figure is too small to read inside a shard).

So there is no `sprites-p4f.json`: it would list new drawings, and there are none.
