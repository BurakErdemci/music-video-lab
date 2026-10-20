# Blender character test (v1)

Question: can the two characters be simple 3D rigs rendered flat, so they still read as the screenprint drawings,
and move without the limb stretching / doubling of the drawing morphs? Brief: `.claude/briefs/blender-test.md`.

Output: `video/out/blender-test-v1.mp4` (1920x1080, 30 fps, 540 frames = 18 s), composition `BlenderTest`
(`video/src/scenes/BlenderTestScene.tsx`), checks in `video/out/blender-test-checks/`.

## Run

Blender 5.2, nothing installed on top of it (factory settings, its bundled Python and numpy). The executable comes
from `BLENDER`; the default is the standard Windows install path:

```sh
export BLENDER="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"   # default, set only if different
bash blender/run.sh                 # everything below, in order
bash blender/run.sh build render    # or single steps
```

| step | command it runs | output |
|---|---|---|
| build | `"$BLENDER" -b --factory-startup -P blender/build.py` | `blender/test-v1.blend` (characters, rigs, props, camera, all keys) |
| render | `"$BLENDER" -b --factory-startup blender/test-v1.blend -P blender/render.py` | `video/public/blender/test-v1/{human,ai}/0001-0540.png` (alpha) |
| mattes | `... -P blender/render.py -- --bodies --out video/out/blender-test-checks/mattes` | the bodies alone (no mug, no book) for the checks |
| checks | `... -P blender/checks.py -- --bones` / `-- --sil <mattes>` | bone lengths per frame; silhouette area, change and pieces per frame (`mattes/silhouette.csv`) |
| video | `cd video && npx remotion render src/index.ts BlenderTest out/blender-test-v1.mp4` | the composited test |
| sheets | ffmpeg `select='between(n,A,B)'` + `tile` (frame-exact, no `-ss`, no drawtext) | `video/out/blender-test-checks/*.png` |
| board | `... -P blender/board.py` + ffmpeg | `same-person-board.png` (reference drawing next to the render, same pose) |

Paths in the scripts are relative to the repository (`blender/common.py`). Rendered frames live under
`video/public/blender/`, which is git-ignored (regenerate with `build render`). Previews:
`render.py -- --step 6 --percent 50 --out DIR` or `--list 0,100,192 --out DIR`.

## How it is built

- **Mesh** (`build.py: spec, body_mesh`): each body part is the convex hull of two (scaled) spheres: tapered limbs,
  ellipsoid torso slices, the AI's round head, the human's hair tufts and nose. The pieces are unioned with a voxel
  remesh (5.5 mm) and lightly smoothed: one closed skin per character.
- **Skin weights** (`skin_weights`): from the signed distance of each vertex to each part, soft across joints, at most
  three bones per vertex. No automatic heat weighting.
- **Rig** (`make_rig`): hand-built armature (hips, spine, chest, neck, head, clavicles, arms, hands, legs, feet).
  Two-bone IK on arms and legs with pole targets; hands and feet copy the rotation of their IK targets. IK stretch is
  off, so bone lengths are fixed. Pole angles are fitted by measurement (`fit_pole_angles`).
- **Look**: flat emission colours with the Standard view transform (exact palette hexes), outline by inverted hull
  (solidify outwards, flipped normals, back faces culled): navy 3.4 px on the AI, cream 2.4 px rim on the human. No
  lights, no shading. Sticky notes are small cards parented to the bone under them; hem lines (sleeves, shirt) are thin
  cream tubes on the skin. Orthographic camera, 1 m = 380 px, floor at y = 1000 px (human) / 1010 px (AI).
- **Motion** (`anim.py`): keyframes on the controls with Bezier easing; props are keyed first and hands are locked to
  them (mug, page corner) by sampling the evaluated scene every 2 frames. Grain and paper texture come from Remotion.

## Files

`common.py` constants and paths · `build.py` characters, rigs, props, camera · `anim.py` the take · `render.py`
passes · `checks.py` measurements · `board.py` same-person board · `run.sh` pipeline · `ASSETS.md` external assets
(none).
