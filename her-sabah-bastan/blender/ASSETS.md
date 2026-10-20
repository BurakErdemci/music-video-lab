# External assets of the Blender character test

Licence rule (the finished clip goes on YouTube and this repository is published): an external asset may be used only
if its licence allows commercial use and redistribution. Non-commercial licences (CC BY-NC and similar) are excluded.

| Asset | Source URL | Licence | Used by |
|---|---|---|---|
| — | — | — | — |

**None.** Test v1 uses no external asset: no motion capture, no models, no textures, no fonts, no add-ons.

- The two characters, the mug and the notebook are built from primitives by `blender/build.py`.
- All motion is keyframed by `blender/anim.py` (IK targets on a hand-built armature). The CMU Graphics Lab Motion
  Capture Database was allowed by the brief but was not needed, so nothing was downloaded.
- The room backgrounds, desk drawing, glass seam, moon and paper grain composited in Remotion
  (`video/src/scenes/BlenderTestScene.tsx`) are the project's own existing files.
- Tools: Blender 5.2 (GPL, the program only; GPL does not apply to its output) with its factory settings and bundled
  Python/numpy; Remotion and ffmpeg as already used by the project.

If an asset is added later, add a row above with its exact source URL, licence name and the file that uses it.
