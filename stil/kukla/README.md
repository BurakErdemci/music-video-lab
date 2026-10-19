# Cut-out puppets (2D bone animation)

Layered transparent PNG parts of both characters, with a `rig.json` per view, for skeletal cut-out
animation with rigid rotation or mesh deformation (Blender image planes + armature, Unity 2D Animation,
Spine). The parts are cut from the canonical drawings themselves, so the neutral pose reassembles
on-model; only hidden overlaps, joint caps and extra hand shapes are new art.

| Folder | Character | View | Reference |
|---|---|---|---|
| `insan-profil/` | human | side profile, facing right | `stil/hareket/ref-insan-kanonik.png` |
| `ai-profil/` | AI | side profile, facing left | `stil/hareket/ref-ai.png` |
| `insan-34on/` | human | 3/4 front | generated neutral reference (in the folder) |
| `ai-on/` | AI | front | generated neutral reference (in the folder) |

Each folder holds one PNG per part, `rig.json`, `build.py` (the script that cut the parts),
`assembled.png` (reference | reassembly | difference mask), `bend-test.png` (joints rotated rigidly)
and, in the profile sets, `hands-test.png` (each hand shape on a bent forearm).

Status (19 Oct 2026, measured with `assemble.py`; difference = share of the reference window off by >40/255):

| Set | Difference | Joints |
|---|---|---|
| `insan-profil` | 0.51% | shoulder, hip clean; elbow and knee leave a short crease line on the inner side at 90-120 |
| `ai-profil` | 0.34% | elbow clean; faint crease taper at hip 90 and knee 90-120, faint disk edge at shoulder 45 |
| `insan-34on` | 0.38% | DRAFT: elbows/knees fine; shoulders rotate as boxes and the far shoulder opens a hole at 90 |
| `ai-on` | 0.32% | DRAFT: elbows/knees/hips fine; armpit bump at shoulder 60-90 |

Sticky notes: the canonical profile has nine separate yellow pieces (`note_01`..`note_09`, the first
is the collar sliver); the generated 3/4 reference has seven (`note_01`..`note_07`).
Sign convention in the profiles: the human faces right, so his forward shoulder/elbow/hip swing is
negative and his knee fold positive; the AI faces left, so hers are the opposite (see `bend_tests`).
The second-view references and hand sheets are Codex image_gen output (prompts in `prompts/`).

## Parts

`pelvis` (root), `chest`, `neck`, `head`, `hair` (human only, own layer so it can lag),
`upper_arm_near`, `forearm_near`, `hand_near_open`, `hand_near_grip` (mug handle), `hand_near_point`
(typing / pointing), `hand_near_notebook`, the same four for `_far`, `thigh_near`, `shin_near`,
`foot_near`, the same three for `_far`, and for the human `note_01` ... `note_08` (sticky notes, own
layers so they can flutter). Far-side limbs are darker copies of the near ones, drawn behind the body.
Only `hand_*_open` is visible in the neutral pose; the other hand shapes are `"hidden": true` with the
same pivot meaning (wrist centre), so a rig swaps them in place.

## rig.json

```json
{
  "character": "insan", "view": "profile-right",
  "units": "pixels of the reference image (1 px = 1 px of the canonical drawing); angles in degrees, positive = clockwise on screen (y down)",
  "reference": "../../hareket/ref-insan-kanonik.png",
  "reference_crop": [x0, y0, x1, y1],
  "canvas": [w, h],
  "parts": {
    "pelvis": {"file": "pelvis.png", "pivot": [px, py], "parent": null, "offset": [x, y], "rotation": 0, "z": 10},
    "thigh_near": {"file": "thigh_near.png", "pivot": [px, py], "parent": "pelvis", "offset": [x, y],
                   "rotation": 0, "z": 14, "joint": "hip", "range": [-30, 95]},
    "hand_near_grip": {"...": "...", "hidden": true, "variant_of": "hand_near_open"}
  },
  "bend_tests": [{"part": "forearm_near", "sign": -1, "max": 120}],
  "bend_angles": [0, 45, 90, 120]
}
```

- `pivot`: the joint in the part's own pixels (origin top-left of its PNG).
- `offset`: where that joint sits in the parent's pixels; for the root, in reference pixels, so the
  neutral assembly lands exactly on the reference (`canvas` = reference image size).
- `rotation`: neutral rotation (0 for parts cut straight from the reference).
- `z`: draw order, ascending. `range`: the tested rotation range of the joint, informative.
- world(part) = world(parent) · T(offset) · R(rotation) · T(-pivot).

## Re-running

```
python stil/kukla/assemble.py stil/kukla/insan-profil     # rewrites assembled.png and bend-test.png
python stil/kukla/assemble.py stil/kukla/insan-profil --pose pose.json --out x.png   # {part: extra degrees}
```

`assemble.py` needs only Pillow. The `build.py` scripts also need numpy; on this machine the system
Python has Pillow and Blender's bundled Python has numpy, and the scripts add Blender's
`site-packages` to `sys.path` (same Python 3.13 ABI).

## How the joints are made (method)

1. Every part is a polygon mask on the reference, placed by reading coordinates off gridded crops.
   Pixels inside keep the original art, so the neutral reassembly is the reference.
2. Each joint has a pivot `p` and a radius `r` (half the limb width at the joint). BOTH parts get the
   disk `(p, r)` added, so rigid rotation about `p` can never open a gap.
3. The part drawn on top fills its disk with plain fill out to `r - rim` and has no line inside the
   disk; the part underneath gets the full disk with a fresh rim on its new outer boundary only. The
   visible outline at any angle is then the union's outline: no doubled line, no hard corner.
4. Inner detail lines within about `1.3 r` of a pivot are painted over with plain fill (the bend
   region holds only fill and outline), so mesh deformation there does not smear detail.
5. Areas that were hidden under another part in the reference (the torso under the near arm, the body
   under a sticky note) are filled with plain fill plus the reference's speckle, and any silhouette edge
   they hid is redrawn as a smooth contour with the rim.
6. Far limbs: copies of the near ones, darkened, drawn behind the torso. Extra hand shapes come from a
   Codex image_gen hand sheet (`prompts/`), scaled to the canonical wrist width.
