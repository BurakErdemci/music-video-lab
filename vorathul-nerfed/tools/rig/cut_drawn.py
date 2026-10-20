"""Cuts the drawn Vorathul sheets into rig texture slots and writes video/src/rig/vorathul.drawn.rig.json.

    node tools/rig/build-drawn.mjs        (runs this twice: the second run fits the sword so its tip touches the floor in `base`)
    uv run --with pillow --with numpy python tools/rig/cut_drawn.py [--sword-scale S]

Reads video/public/rig/drawn/rig-M.png (master) and rig-V1..V5.png (variant sheets), tools/rig/drawn_spec.py (polygons and pivots),
and the placeholder rig JSON (parts, limits, poses, pipes). Writes video/public/rig/cut/<slot>.png and the drawn rig JSON, which
overrides texture src/size/pivot, part sockets and joint radii. Slots the sheets cannot fill keep their placeholder (rescaled).
The placeholder rig is untouched: a slot is swapped by path only (docs/rig.md section 4).
"""
import copy
import json
import math
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import drawn_spec as S  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "video/public"
SHEETS = PUB / "rig/drawn"
OUT = PUB / "rig/cut"
BASE = json.loads((ROOT / "video/src/rig/vorathul.rig.json").read_text())
H = S.FLOOR_Y - S.CROWN_Y
DEAD = (26, 26, 26)
INK = (10, 10, 10)
PAD = 6
SWORD_S = float(sys.argv[sys.argv.index("--sword-scale") + 1]) if "--sword-scale" in sys.argv else 0.685


def load(name):
    return Image.open(SHEETS / f"rig-{name}.png").convert("RGBA")


M_IMG, V1, V2, V3, V4, V5 = (load(n) for n in ("M", "V1", "V2", "V3", "V4", "V5"))


# ---------- masks ----------
def hsv(rgba):
    return np.asarray(Image.fromarray(rgba[..., :3]).convert("HSV")).astype(int)


def violet_mask(rgba):
    h = hsv(rgba)
    return (h[..., 0] >= 180) & (h[..., 0] <= 206) & (h[..., 1] > 89) & (h[..., 2] > 89) & (rgba[..., 3] > 60)


def poly_mask(size, poly):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    return m


def box_mask(size, b, pad=4):
    return poly_mask(size, [(b[0] - pad, b[1] - pad), (b[2] + pad, b[1] - pad), (b[2] + pad, b[3] + pad), (b[0] - pad, b[3] + pad)])


def grow(mask, n=5):
    return np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(n))) > 0


def components(mask):
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    out = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        q = deque([(y0, x0)])
        seen[y0, x0] = True
        pts = []
        while q:
            y, x = q.popleft()
            pts.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
        a = np.array(pts)
        out.append((a[:, 0], a[:, 1]))
    return out


# ---------- a crop with the map from source coordinates to crop pixels ----------
class Cut:
    def __init__(self, rgba, m):
        self.rgba = rgba
        self.m = m  # 3x3: source (x, y, 1) -> crop px

    def pt(self, x, y):
        v = self.m @ np.array([x, y, 1.0])
        return float(v[0]), float(v[1])

    def like(self, rgba):
        return Cut(rgba, self.m.copy())

    @property
    def w(self):
        return self.rgba.shape[1]

    @property
    def h(self):
        return self.rgba.shape[0]

    def crop(self, x0, y0, x1, y1):
        t = np.array([[1, 0, -x0], [0, 1, -y0], [0, 0, 1.0]])
        return Cut(self.rgba[y0:y1, x0:x1].copy(), t @ self.m)

    def trim(self, margin=2):
        ys, xs = np.nonzero(self.rgba[..., 3] > 8)
        return self.crop(max(0, xs.min() - margin), max(0, ys.min() - margin), min(self.w, xs.max() + 1 + margin), min(self.h, ys.max() + 1 + margin))

    def scaled(self, s):
        img = Image.fromarray(self.rgba).resize((max(1, round(self.w * s)), max(1, round(self.h * s))), Image.LANCZOS)
        sx, sy = img.width / self.w, img.height / self.h
        return Cut(np.asarray(img).copy(), np.diag([sx, sy, 1.0]) @ self.m)

    def rot180(self):
        img = Image.fromarray(self.rgba).rotate(180)
        return Cut(np.asarray(img).copy(), np.array([[-1, 0, self.w - 1], [0, -1, self.h - 1], [0, 0, 1.0]]) @ self.m)

    def overlay(self, mask):
        a = np.zeros_like(self.rgba)
        a[mask] = self.rgba[mask]
        return self.like(a)

    def kill(self, mask):
        """Violet pixels become the dead grey of the base card."""
        self.rgba[mask, 0], self.rgba[mask, 1], self.rgba[mask, 2] = DEAD


def from_sheet(src, mask_img, pivot=None, axis_to=None):
    """Masks a sheet with a polygon; with pivot+axis_to rotates so that axis points straight down; crops to the art."""
    arr = np.asarray(src).copy()
    arr[..., 3] = np.minimum(arr[..., 3], np.asarray(mask_img))
    img = Image.fromarray(arr)
    m = np.eye(3)
    if axis_to is not None:
        vx, vy = axis_to[0] - pivot[0], axis_to[1] - pivot[1]
        phi = math.pi / 2 - math.atan2(vy, vx)
        c, s = math.cos(phi), math.sin(phi)
        cx, cy = pivot
        # PIL wants output -> source (the inverse rotation about the pivot)
        img = img.transform(img.size, Image.AFFINE, (c, s, cx - (c * cx + s * cy), -s, c, cy - (-s * cx + c * cy)), resample=Image.BICUBIC)
        m = np.array([[c, -s, cx - c * cx + s * cy], [s, c, cy - s * cx - c * cy], [0, 0, 1.0]])
    cut = Cut(np.asarray(img).copy(), m)
    return cut.trim(PAD)


# ---------- the drawn parts ----------
slots = {}  # slot -> Cut
pivot_src = {}  # slot -> pivot in source coordinates (its own sheet frame, after cutting through Cut.pt)
MSZ = M_IMG.size


def m_part(slot, part, axis_to=None):
    cut = from_sheet(M_IMG, poly_mask(MSZ, S.POLY[part]), S.PIVOT[part], axis_to)
    slots[slot] = cut
    pivot_src[slot] = S.PIVOT[part]
    return cut


m_part("pelvis", "pelvis")
m_part("leg", "leg", axis_to=(345, 1330))
torso = m_part("torso_base", "torso")
m_part("collar", "collar")
m_part("pauldron", "pauldron")
m_part("upper_arm", "upper_arm", axis_to=(237, 590))
m_part("forearm", "forearm", axis_to=(205, 722))
m_part("hand_open", "hand_open", axis_to=(200, 830))
m_part("cape_upper", "cape_upper")
m_part("cape_lower", "cape_lower")
head = m_part("helm_closed", "head")
crown = m_part("crown_full", "crown")

# violet split: the base gets dead grey, the overlay keeps the violet (docs/rig.md section 4.3)
vm = violet_mask(torso.rgba)
slots["chest_studs"] = torso.overlay(vm)
pivot_src["chest_studs"] = S.PIVOT["torso"]
torso.kill(vm)

hm = violet_mask(head.rgba)
slit = head.overlay(hm)
slit_centre_in_head = tuple(float(v) for v in (np.nonzero(hm)[1].mean(), np.nonzero(hm)[0].mean()))  # (x, y) in head crop px
head.kill(hm)
slots["slit_lit"] = slit.trim(2)

gm = violet_mask(crown.rgba)
slots["gems_full"] = crown.overlay(gm)
pivot_src["gems_full"] = S.PIVOT["crown"]
crown.kill(gm)


# ---------- V1: small crown, sad slit, void head, seven eyes ----------
S_V1 = 0.27
crown_small = from_sheet(V1, box_mask(V1.size, (100, 372, 428, 656))).scaled(S_V1)
gm = violet_mask(crown_small.rgba)
slots["gems_small"] = crown_small.overlay(gm)
crown_small.kill(gm)
slots["crown_small"] = crown_small
face = from_sheet(V1, box_mask(V1.size, (592, 292, 924, 732))).scaled(S_V1)
slots["slit_sad"] = face.overlay(violet_mask(face.rgba)).trim(2)
void = from_sheet(V1, box_mask(V1.size, (1064, 236, 1468, 776))).scaled(S_V1)
vm = violet_mask(void.rgba)
comps = [c for c in components(vm) if len(c[0]) > 40]
eyes = sorted(((float(ys.mean()), float(xs.mean()), ys, xs) for ys, xs in comps), key=lambda e: (round(e[0] / 30), e[1]))
assert len(eyes) == 7, f"void head must show exactly 7 eyes, found {len(eyes)}"
eye_socket = {}
for i, (cy, cx, ys, xs) in enumerate(eyes, 1):
    m = np.zeros(vm.shape, bool)
    m[ys, xs] = True
    e = void.overlay(grow(m, 5) & (void.rgba[..., 3] > 8)).trim(1)
    slots[f"eye_{i}"] = e
    eye_socket[i] = (cx, cy)
void.kill(grow(vm, 5) & (void.rgba[..., 3] > 8))
slots["void_head"] = void

# ---------- V2: hands (rotated to hang), scaled so the wrist stub matches the forearm's wrist end ----------
FOREARM_WRIST = 96.0
HAND_BOX = {"hand_fist": (616, 128, 908, 496), "hand_palm": (1060, 20, 1372, 512), "hand_spread": (184, 464, 768, 984), "hand_clutch": (848, 500, 1248, 976)}
hand_pivot_local = {}
for slot, b in HAND_BOX.items():
    sub = np.asarray(V2)[b[3] - 40 : b[3], b[0] : b[2], 3] > 100
    xs = np.nonzero(sub.any(0))[0]
    s = FOREARM_WRIST / max(xs.max() - xs.min(), 1)
    c = from_sheet(V2, box_mask(V2.size, b)).rot180().scaled(s)
    # wrist stub centre in sheet coordinates -> crop px (the stub sits at the bottom of the sheet art, the top after the turn)
    hand_pivot_local[slot] = c.pt(b[0] + (xs.min() + xs.max()) / 2, b[3] - 18)
    slots[slot] = c
# the grip hand: the arm comes in from the right, the hilt is vertical; turn it so wrist -> fist points down
GRIP_BOX = (132, 20, 492, 512)
GRIP_WRIST, GRIP_FIST = (445.0, 385.0), (270.0, 330.0)
fore_axis = (GRIP_FIST[0], GRIP_FIST[1])
grip = from_sheet(V2, box_mask(V2.size, GRIP_BOX), GRIP_WRIST, fore_axis)
gs = FOREARM_WRIST / 150.0
grip = grip.scaled(gs)
slots["hand_grip"] = grip
hand_pivot_local["hand_grip"] = grip.pt(*GRIP_WRIST)
grip_fist_local = grip.pt(*GRIP_FIST)

# ---------- V3: the sword, blade down, pommel up ----------
sw_arr = np.asarray(V3.rotate(90, expand=True)).copy()  # (x, y) -> (y, W - 1 - x)
sw = Cut(sw_arr, np.array([[0, 1, 0], [-1, 0, V3.width - 1], [0, 0, 1.0]])).trim(PAD).scaled(SWORD_S)
vm = violet_mask(sw.rgba)
slots["sword_runes"] = sw.overlay(vm)
sw.kill(vm)
slots["sword_base"] = sw
sword_grip_local = sw.pt(1347, 510)  # the handle centre, 0.08 H below the pommel at the fitted scale

# ---------- V4: pipes, cork, hub ----------
PIPE_S = 0.375
TUBES = {"s": (64, 92, 760, 220), "m": (64, 296, 1076, 424), "l": (64, 492, 1476, 620)}
tube_h = {}
for k, b in TUBES.items():
    t = from_sheet(V4, box_mask(V4.size, b), None, None)
    a = t.rgba
    vio = violet_mask(a)
    h_tube = b[3] - b[1]
    mouth_len = int(1.2 * h_tube)
    w = a.shape[1]
    body, mouth, glow = a.copy(), a.copy(), np.zeros_like(a)
    glow[vio] = a[vio]
    body[:, w - mouth_len :, 3] = 0
    mouth[:, : w - mouth_len, 3] = 0
    glow[:, : w - mouth_len, 3] = 0
    for arr in (body, mouth):
        arr[vio, 0], arr[vio, 1], arr[vio, 2] = DEAD
    slots[f"body_{k}"] = t.like(body).trim(0).scaled(PIPE_S)
    slots[f"mouth_{k}"] = t.like(mouth).trim(0).scaled(PIPE_S)
    slots[f"glow_{k}"] = t.like(glow).trim(0).scaled(PIPE_S)
    tube_h[k] = slots[f"body_{k}"].h
slots["cork"] = from_sheet(V4, box_mask(V4.size, (356, 736, 520, 900))).scaled(PIPE_S)
slots["wing_root"] = from_sheet(V4, box_mask(V4.size, (608, 640, 996, 980))).scaled(PIPE_S)

# ---------- V5: seated lower body ----------
S_V5 = 0.93
slots["cape_lower_seated"] = from_sheet(V5, box_mask(V5.size, (0, 0, V5.width, V5.height), 0)).scaled(S_V5)
slots["legs_seated"] = from_sheet(V5, box_mask(V5.size, (430, 100, 1110, 900), 0)).scaled(S_V5)
seated_pivot = {"legs_seated": slots["legs_seated"].pt(765, 125), "cape_lower_seated": slots["cape_lower_seated"].pt(765, 122)}

# ---------- hems from the ragged cape edge of the master ----------
HEM_BOX = {"hem_a": (150, 1150, 250, 1400), "hem_b": (250, 1150, 335, 1340), "hem_c": (452, 1180, 532, 1350)}
for slot, b in HEM_BOX.items():
    slots[slot] = from_sheet(M_IMG, box_mask(MSZ, b, 0))
    pivot_src[slot] = ((b[0] + b[2]) / 2, b[1] + 0.15 * (b[3] - b[1]))
# hems sit on the art they were cut from (mirrored copies on the other side), so at rest they coincide with the cape card
HEM_POS = [pivot_src["hem_a"], pivot_src["hem_b"], pivot_src["hem_c"], (1024 - pivot_src["hem_c"][0], pivot_src["hem_c"][1]), (1024 - pivot_src["hem_b"][0], pivot_src["hem_b"][1]), (1024 - pivot_src["hem_a"][0], pivot_src["hem_a"][1])]

# ---------- helm halves and crown halves, cut from the closed helm / crown along a jagged line (section 9) ----------
def split(cut, cx_src, jag):
    w, h = cut.w, cut.h
    cx = cut.pt(cx_src, 0)[0]
    line = [(cx + jag[i % len(jag)], h * i / (len(jag) - 1)) for i in range(len(jag))]
    out = []
    for side in ("R", "L"):
        m = Image.new("L", (w, h), 0)
        if side == "R":
            ImageDraw.Draw(m).polygon([(0, 0)] + [(x + 1, y) for x, y in line] + [(0, h)], fill=255)  # 1 px overlap across the cut
        else:
            ImageDraw.Draw(m).polygon([(w, 0)] + [(x - 1, y) for x, y in line] + [(w, h)], fill=255)
        a = cut.rgba.copy()
        a[..., 3] = np.minimum(a[..., 3], np.asarray(m))
        out.append(cut.like(a).trim(1))
    return out, line


(half_R, half_L), helm_line = split(head, 512, [0, -5, 4, -3, 5, 0])
slots["half_R"], slots["half_L"] = half_R, half_L
(chalf_R, chalf_L), _ = split(crown, 512, [0, 3, -3, 2, 0])
slots["crown_half_R"], slots["crown_half_L"] = chalf_R, chalf_L

# ---------- pivots in each slot's own crop ----------
piv = {}
for slot, p in pivot_src.items():
    piv[slot] = slots[slot].pt(*p)
for slot, p in hand_pivot_local.items():
    piv[slot] = p
piv["hand_open"] = slots["hand_open"].pt(*S.PIVOT["hand_open"])
piv["slit_lit"] = (slots["slit_lit"].w / 2, slots["slit_lit"].h / 2)
piv["slit_sad"] = (slots["slit_sad"].w / 2, slots["slit_sad"].h / 2)
piv["sword_base"] = piv["sword_runes"] = sword_grip_local
for k in "sml":
    piv[f"body_{k}"] = (0.0, slots[f"body_{k}"].h / 2)
    piv[f"mouth_{k}"] = (slots[f"mouth_{k}"].w / 2, slots[f"mouth_{k}"].h / 2)
    piv[f"glow_{k}"] = (slots[f"glow_{k}"].w / 2, slots[f"glow_{k}"].h / 2)
piv["cork"] = (slots["cork"].w / 2, slots["cork"].h / 2)
piv["wing_root"] = (slots["wing_root"].w / 2, slots["wing_root"].h / 2)
piv["legs_seated"], piv["cape_lower_seated"] = seated_pivot["legs_seated"], seated_pivot["cape_lower_seated"]
piv["crown_small"] = (slots["crown_small"].w / 2, slots["crown_small"].h * 0.93)
piv["gems_small"] = piv["crown_small"]
piv["void_head"] = (slots["void_head"].w / 2, slots["void_head"].h - 8.0)
for i in range(1, 8):
    piv[f"eye_{i}"] = (slots[f"eye_{i}"].w / 2, slots[f"eye_{i}"].h / 2)
piv["half_R"] = slots["half_R"].pt(452, 270)
piv["half_L"] = slots["half_L"].pt(572, 270)
piv["crown_half_R"] = slots["crown_half_R"].pt(512, 128)
piv["crown_half_L"] = slots["crown_half_L"].pt(512, 128)

# ---------- sockets (the child's pivot seen in the parent's crop) ----------
sock = {}  # part id -> socket px in the parent crop
sock["leg"] = slots["pelvis"].pt(*S.PIVOT["leg"])
sock["legs_seated"] = slots["pelvis"].pt(*S.PIVOT["pelvis"])
sock["torso"] = slots["pelvis"].pt(*S.PIVOT["torso"])
sock["chest_studs"] = slots["torso_base"].pt(*S.PIVOT["torso"])
sock["collar"] = slots["torso_base"].pt(*S.PIVOT["collar"])
sock["cape_upper"] = slots["torso_base"].pt(*S.PIVOT["cape_upper"])
sock["cape_lower"] = slots["cape_upper"].pt(*S.PIVOT["cape_lower"])
for k, (hx, hy) in enumerate(HEM_POS):
    sock[f"hem_{k + 1}"] = slots["cape_lower"].pt(hx, hy)
sock["wing_root"] = slots["torso_base"].pt(584, 330)
sock["head"] = slots["torso_base"].pt(*S.PIVOT["head"])
sock["eye_slit"] = slit_centre_in_head
sock["crown"] = slots["helm_closed"].pt(*S.PIVOT["crown"])
sock["crown_gems"] = sock["crown"]
sock["void_head"] = slots["helm_closed"].pt(*S.PIVOT["head"])
for i in range(1, 8):
    sock[f"eye_{i}"] = eye_socket[i]
sock["helm_half_R"] = slots["helm_closed"].pt(452, 270)
sock["helm_half_L"] = slots["helm_closed"].pt(572, 270)
sock["crown_half_R"] = slots["half_R"].pt(512, 128)
sock["crown_half_L"] = slots["half_L"].pt(512, 128)
sock["pauldron"] = sock["upper_arm"] = slots["torso_base"].pt(*S.PIVOT["upper_arm"])
sock["forearm"] = slots["upper_arm"].pt(*S.PIVOT["forearm"])
sock["hand"] = slots["forearm"].pt(*S.PIVOT["hand_open"])
sock["sword"] = grip_fist_local
sock["sword_runes"] = sword_grip_local

# ---------- joint disks: a filled ink disk (p, r) in both images of every rotating joint (docs/rig.md 1.4 rule 1) ----------
def disk(cut, p, r):
    img = Image.fromarray(cut.rgba)
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=INK + (255,))
    a = cut.rgba.copy()
    l = np.asarray(lay)
    fill = (l[..., 3] > 0) & (a[..., 3] < 255)
    a[fill] = l[fill]
    cut.rgba = a


def margin(cut, p):
    return min(p[0], p[1], cut.w - p[0], cut.h - p[1])


rig = copy.deepcopy(BASE)
rig["unitPx"] = H
ph = H / BASE["unitPx"]
drawn_slots = {s for s in slots}
# placeholder-only slots keep their art, rescaled to the new px per H so their world size is unchanged
for slot, t in rig["textures"].items():
    if slot not in drawn_slots:
        t["w"], t["h"] = round(t["w"] * ph), round(t["h"] * ph)
        t["pivot"] = [round(t["pivot"][0] * ph, 1), round(t["pivot"][1] * ph, 1)]
for p in rig["parts"]:
    p["socket"] = [round(p["socket"][0] * ph, 1), round(p["socket"][1] * ph, 1)]
    if "jointRadius" in p:
        p["jointRadius"] = round(p["jointRadius"] * ph, 1)

part_slot = {"pelvis": "pelvis", "leg": "leg", "legs_seated": "legs_seated", "torso": "torso_base", "chest_studs": "chest_studs", "collar": "collar",
             "cape_upper": "cape_upper", "cape_lower": "cape_lower", "wing_root": "wing_root", "head": "helm_closed", "eye_slit": "slit_lit",
             "crown": "crown_full", "crown_gems": "gems_full", "void_head": "void_head", "helm_half_R": "half_R", "helm_half_L": "half_L",
             "crown_half_R": "crown_half_R", "crown_half_L": "crown_half_L", "pauldron": "pauldron", "upper_arm": "upper_arm", "forearm": "forearm",
             "hand": "hand_open", "sword": "sword_base", "sword_runes": "sword_runes"}
parts_by_id = {p["id"]: p for p in rig["parts"]}
for k in range(1, 7):
    part_slot[f"hem_{k}"] = ["hem_a", "hem_b", "hem_c", "hem_c", "hem_b", "hem_a"][k - 1]
for i in range(1, 8):
    part_slot[f"eye_{i}"] = f"eye_{i}"
parent_slot_of = lambda pid: part_slot[("hand" if parts_by_id[pid]["parent"] == "hand_R" else parts_by_id[pid]["parent"])]  # noqa: E731

for pid, p in parts_by_id.items():
    if pid not in part_slot or pid == "pelvis":
        continue
    p["socket"] = [round(sock[pid][0], 1), round(sock[pid][1], 1)]
rig["parts"][[q["id"] for q in rig["parts"]].index("pelvis")]["offsetH"] = [0, round((S.FLOOR_Y - S.PIVOT["pelvis"][1]) / H, 5)]

rotating = [pid for pid, p in parts_by_id.items() if pid in part_slot and p.get("limits", {}).get("rot") and p["parent"] != "root" and not pid.startswith(("helm_half", "crown_half"))]
for pid in rotating:
    p = parts_by_id[pid]
    child = slots[part_slot[pid]]
    cp = piv[part_slot[pid]]
    parent_id = p["parent"] if p["parent"] in part_slot else p["parent"]
    par = slots[parent_slot_of(pid)]
    r = max(4.0, min(margin(child, cp), margin(par, sock[pid]), 34.0))
    p["jointRadius"] = round(r, 1)
    disk(child, cp, r)
    disk(par, sock[pid], r)
for pid in ("helm_half_R", "helm_half_L", "crown_half_R", "crown_half_L"):
    parts_by_id[pid]["jointRadius"] = 14.0

# ---------- write textures and the drawn rig JSON ----------
OUT.mkdir(parents=True, exist_ok=True)
for slot, cut in slots.items():
    Image.fromarray(cut.rgba).save(OUT / f"{slot}.png", compress_level=9)
    t = rig["textures"].get(slot)
    if t is None:
        raise SystemExit(f"slot {slot} is not in the placeholder rig")
    t["src"] = f"rig/cut/{slot}.png"
    t["w"], t["h"] = cut.w, cut.h
    t["pivot"] = [round(piv[slot][0], 1), round(piv[slot][1], 1)]
    t.pop("shape", None)

# pipes: lengths and tube width from the cut art (H)
pipes = rig["pipes"]
pipes["widthH"] = round(tube_h["m"] / H, 5)
for k in "sml":
    pipes["bodyLen"][k] = round(slots[f"body_{k}"].w / H, 5)
# seated: the drawn legs are taller than the placeholder, so the belt sits lower by exactly their height (pose limit -0.30 .. +0.06)
legs_h = slots["legs_seated"].h / H
rig["poses"]["sit_alone"]["pelvis"][1] = round(legs_h - (S.FLOOR_Y - S.PIVOT["pelvis"][1]) / H, 4)
rig["helmCut"] = [[round(x, 1), round(y, 1)] for x, y in helm_line]
# blade length below the grip so the tip touches the floor in `base`: filled in by build-drawn.mjs through --sword-scale
rig["bladeBelow"] = round((sword_grip_local[1] * 0 + (slots["sword_base"].h - sword_grip_local[1])) / H, 5)
(ROOT / "video/src/rig/vorathul.drawn.rig.json").write_text(json.dumps(rig, indent=1) + "\n")
print(f"drawn rig: {len(slots)} slots cut, H = {H} px, sword scale {SWORD_S:.4f}, blade below grip {rig['bladeBelow']} H")
