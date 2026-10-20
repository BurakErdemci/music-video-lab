# Stand-in take for tuning the joints (same interface as take.py: FRAMES, poses(char)). The character stands still while
# every joint bends through its range, one at a time (slow part), followed by held frames at the exact angles of
# rig.json "bend_angles" for the bend boards (BOARD: label -> {angle: frame}).
import pose as P

SLOW = 45  # frames per joint for the slow 0 -> max -> 0 sweep
ROOT = {"human": (560.0, 560.0), "ai": (1360.0, 560.0)}
ANGLES = (0, 45, 90, 120)
ELBOW_KNEE_MAX = 130


def tests(char):
    """[(label, part, sign, max_degrees, hide_parts)] one entry per joint, near and far."""
    r = P.rig(char)
    bt = {t["part"]: t for t in r.get("bend_tests", [])}
    out = []
    for part, p in r["parts"].items():
        if not p.get("joint") or p["joint"] == "note" or p.get("hidden"):
            continue
        lo, hi = p.get("range", [0, 0])
        sign, mx = (1, hi) if abs(hi) >= abs(lo) else (-1, -lo)
        mirror = part.replace("_far", "_near")
        t = bt.get(part) or bt.get(mirror)
        if t:
            sign, mx = t["sign"], t["max"]
        if p["joint"] in ("elbow", "knee"):
            mx = ELBOW_KNEE_MAX
        hide = []
        if "_far" in part:  # the near limb of the same kind would cover the far one
            arm = p["joint"] in ("shoulder", "elbow", "wrist")
            hide = [n for n in r["parts"] if n.endswith("_near") or "_near_" in n or n == "note_05"]
            hide = [n for n in hide if (("arm" in n or "hand" in n or n == "note_05") == arm)]
        out.append((part, part, sign, mx, hide))
    return out


def _plan(char):
    """[(label, part, sign, max, hide, slow_start, {angle: frame})]"""
    plan, f = [], 1
    for label, part, sign, mx, hide in tests(char):
        plan.append([label, part, sign, mx, hide, f, {}])
        f += SLOW
    for e in plan:
        e[6] = {}
        for a in sorted({a for a in ANGLES if a < e[3]} | {e[3]}):
            e[6][a] = f
            f += 1
    return plan, f


FRAMES = max(_plan("human")[1], _plan("ai")[1])


def board(char):
    """[(label, part, hide_parts, {angle: film frame})]"""
    return [(e[0], e[1], e[4], e[6]) for e in _plan(char)[0]]


def poses(char):
    plan, _ = _plan(char)
    out = [P.neutral(char, ROOT[char]) for _ in range(FRAMES)]
    for label, part, sign, mx, hide, start, frames in plan:
        for i in range(SLOW):
            ph = i / (SLOW - 1)
            a = mx * (1 - abs(2 * ph - 1))
            out[start + i]["rot"][part] = sign * a
        for a, f in frames.items():
            out[f]["rot"][part] = sign * a
    return out
