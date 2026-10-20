# 2D cut-out puppets in Blender

Our own drawings (`stil/kukla/{insan,ai}-profil`, cleaned copies in `parts/`) as deformable image planes on an armature.
The motion is `take.py` (`FRAMES`, `poses(char)`); `bendtest.py` has the same interface and bends every joint through its
range, for tuning. `pose.py` is the 2D pose model both share; `preview.py` is a fast rigid PIL preview.

## Run (repo root; `BLENDER` = Blender 5.2 exe)

```
"$BLENDER" -b --factory-startup -P blender/cutout/build.py -- [--take take|bendtest] [--out F.blend] [--k 1.2] [--cell 3] [--dq 1|0] [--method BLENDED|DITHERED]
"$BLENDER" -b --factory-startup blender/cutout/cutout-v1.blend -P blender/cutout/render.py -- [--who human|ai|both] [--frames A-B] [--list f,f] [--step N] [--percent P] [--out DIR] [--bodies] [--hide part,part]
"$BLENDER" -b --factory-startup blender/cutout/cutout-v1.blend -P blender/cutout/checks.py -- --bones --joints
"$BLENDER" -b --factory-startup -P blender/cutout/checks.py -- --sil video/out/cutout-checks/mattes
```

`build.py --take bendtest` writes `video/out/cutout-checks/bendtest.blend`; `board.py` (bend boards, neutral frame),
`colorcheck.py` and `tile.py` (boards, system Python + Pillow) work on it, see their headers. Film frame t is Blender frame
t + 1 and file `NNNN.png` with NNNN = t + 1.

## How it is built

- One collection per character; one armature; one bone per rig.json part (head = pivot, tail = `pose.rig()["tail"]`, real
  part lengths); one mesh per part (about 3 film px grid over the PNG, cells kept where the alpha dilated by one cell is
  non-zero, UVs onto the PNG) at its rest screen position; a rigid quad per prop. Depth: object y = -z * 0.002 m (camera at
  -Y), keyed when the take overrides z.
- Material: image emission mixed with transparent by `image alpha * Opacity` (keyed: hand variants, props). EEVEE
  BLENDED, 32 samples, Standard view transform.
- Keying: per frame and part D = Bl(W_t) Bl(W_rest)^-1 from `pose.world` (hand variants copy their `_open` hand's rot/len),
  pose-bone matrix D * bone.matrix_local, linear interpolation. Bones are NOT parented: `pose.py` lets a parent's len{} move
  the child joint without squashing the child, which Blender's inherit scale cannot reproduce (it still scales the child's
  offset), so every bone gets its exact world matrix (evaluated pose vs wanted matrix: 4e-7). The rig.json parent is a custom
  property of each bone.

## Weights (the bending)

For the joint of child C at its pivot p (rest), with u = C's bone axis, hw = half the limb width at the pivot (measured on
C's alpha perpendicular to u), b = k * kj * hw (`k` 1.2, `kj` per joint: 1.0, head 0.6, neck 0.8, wrist and ankle 0.7):
`s = (v - p) . u`, `w_C = smoothstep(-b, b, s)`, `w_parent = 1 - w_C`. Applied to C's vertices and to the parent's vertices
near the joint (full inside 1.5 b and 1.0 hw from the limb axis, gone at 2.5 b and 1.7 hw). A part with joints at both ends
combines both bands; the forearm's wrist band moves weight to `hand_*_open`, and every hand variant is blended with the
forearm around the same band, so all variants deform identically. Notes and hair are rigid on their own bone. Armature
modifier with Preserve Volume (dual quaternion): linear blending doubled the knee outline and collapsed the inner side of the
band at 90-130 degrees.
