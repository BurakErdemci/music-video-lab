# Part 2 magnifying-glass scene (song 1:45.2-1:52.6, replaces the torch of scene 8b)

Director note (20 Oct): the torch sequence does not read; "trust, but verify" becomes a magnifying glass.

## Drawing (1 new, 3 generated, 1 chosen)
- `h-ots-lens` (`video/public/living/p2/h-ots-lens.png`, list `video/src/living/sprites-p2m.json`): over-the-shoulder back of his
  head and back (same view as `h-ots`), right arm raised, hand wrapped around the HANDLE of a magnifier, lens ring seen face-on
  (inside the ring is transparent; `lens` = [cx, cy, inner radius] in sprite px, measured from the keyed hole).
- Prompt `prompts/p2m-h-lens.txt` (made by `prompts/make_p2m.py`), refs: canonical man, `h-ots.png`, `stil/tur4/06-sinir-ikonu.png`.
  Three parallel runs (`ham/p2m-h-lens-a|b|c.png`, md5 in `ham/md5-p2m.txt`, board `boards/p2m-lens-abc.png`); c chosen:
  largest lens, clearest grip (four fingers around the handle), arm anatomy clean, head turn well under 30 degrees.
  Prep: `prep_p2m.py` (magenta key, trim keeping the bottom edge, hole measurement).
- Retired from this scene (files left in place): `h-torch`, `h-torch-back`, `paintTorchLight` (still in paintProps.ts, unused).

## Camera decision
The side-view split shows the glass wall edge-on, so a lens could only be a stick there. The lens scene therefore uses scene 8a's
over-the-shoulder set (glass wall hole, his back in front, her boxes behind the glass). The calm side-view cut (3165-3213)
is kept unchanged.

## Code (`video/src/living/part2/`)
- `paintLens.ts`: the lens disc (scene redrawn at 1.6x about the lens centre, 36 rings give a slight barrel bulge, cream rim
  highlight, two glare bands), the yellow glass note, the iris.
- `paintProps.ts`: `paintBoxes` got optional `items` (paper sheets in the open box), `ticks`, `erase` (left-to-right wipe).
- `icons2.ts`: `paintTick` (moon-yellow check, our icon style, pop-in with overshoot).
- `shots.ts` "Scene 8b": `calmShot`, `lensShot`, `paintOff`; her row of boxes slides under the fixed lens (the camera rides
  the plate; plate and wall are shifted by the same amount so they stay put on screen).
- `events.json`: renamed the four torch events, added ticks / note / wipe events.
