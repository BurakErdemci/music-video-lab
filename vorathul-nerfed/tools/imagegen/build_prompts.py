"""Assemble the Codex image-generation rounds for the Vorathul "NERFED" clip.

Run from the clip root (vorathul-nerfed/):
    python -I tools/imagegen/build_prompts.py

Writes stil/prompts/<round>/<id>.prompt.txt and stil/prompts/<round>/round.json for the rounds
a-canonical-fix, b-test, c-rig-parts, d-assets and e-locations (docs/storyboard-03-locations.md). Every verbatim block (STYLE-P, FIXED, STYLE-O,
cut-out lines, NEGATIVE) is read from the approved prompt files or from the storyboards at build
time, never retyped, and every asset paragraph is parsed from the storyboard asset lists. The
script is idempotent: it rewrites the prompt files and round.json files and nothing else.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ONAYLI = ROOT / "stil" / "onayli"
OUT = ROOT / "stil" / "prompts"
SB1 = ROOT / "docs" / "storyboard-01-intro-to-unfair.md"
SB2 = ROOT / "docs" / "storyboard-02-chorus-to-end.md"
RIG = ROOT / "docs" / "rig.md"

REF_STYLE = "stil/onayli/01-tarz-cizgi-roman.jpg"
REF_CANON_OLD = "stil/onayli/02-kanonik-karakter-sayfasi.jpg"
REF_WING = "stil/onayli/03-kanat-yelpaze.jpg"
REF_OFFICE = "stil/onayli/07-ofis-tablo.jpg"
CANON_ID = "canon-sheet"
REF_CANON = f"stil/prompts/a-canonical-fix/out/{CANON_ID}.png"
REF_OFFICE_NEW = "stil/prompts/a-canonical-fix/out/office-frame.png"
REF_RIG_MASTER = "stil/prompts/c1-rig-master/out/rig-M.png"

LINE1 = ("Use your built-in image_gen tool to generate ONE image, then copy it from "
         "$CODEX_HOME/generated_images/... into the current directory as ./{id}.png")
LAST = "After copying, print the output path and pixel size."


def die(msg):
    sys.exit(f"build_prompts: {msg}")


def read(p):
    return Path(p).read_text(encoding="utf-8")


# ---------------------------------------------------------------- verbatim blocks
def line_starting(text, prefix):
    hits = [l for l in text.splitlines() if l.startswith(prefix)]
    if len(hits) != 1:
        die(f"expected exactly one line starting {prefix!r}, got {len(hits)}")
    return hits[0]


P06 = read(ONAYLI / "06-dovus-faz3.prompt.txt")
P07 = read(ONAYLI / "07-ofis-tablo.prompt.txt")
P02 = read(ONAYLI / "02-kanonik-karakter-sayfasi.prompt.txt")
STYLE_P = line_starting(P06, "The attached image is the APPROVED STYLE AND CHARACTER REFERENCE")
FIXED_HEAD = line_starting(P06, "Character (keep exactly)")
items = [l for l in read(ONAYLI / "KARAKTER.md").splitlines() if re.match(r"^\d+\. ", l)]
if len(items) != 10:
    die(f"KARAKTER.md should have 10 numbered items, found {len(items)}")
FIXED = FIXED_HEAD + "\n" + " ".join(items)

sb1 = read(SB1)
m = re.search(r"\*\*STYLE-O\*\* .*?\n\n> (.+?)\n", sb1, re.S)
if not m:
    die("STYLE-O block not found in storyboard 1")
STYLE_O = m.group(1).strip()
m = re.search(r"\*\*Cut-out line, painting:\*\* `(.+?)`", sb1)
if not m:
    die("painting cut-out line not found")
CUT_P = m.group(1)
CUT_O = CUT_P.replace("plain flat #808080 mid-grey", "plain flat #00FF00 green").replace(
    "The grey will be removed", "The green will be removed")
if CUT_O == CUT_P or "#00FF00" not in CUT_O:
    die("office cut-out derivation failed")
m = re.search(r"\*\*NEGATIVE\*\* \(verbatim\):\n\n((?:> .+\n?)+)", sb1)
if not m:
    die("NEGATIVE block not found")
NEGATIVE = "\n".join(l[2:] for l in m.group(1).strip().splitlines())


# ---------------------------------------------------------------- storyboard asset parsing
def parse_assets(path):
    text = read(path)
    alpha = {}
    for row in re.finditer(r"^\| (G\d+[a-z]?(?:/[a-z])?) \|.*\| (opaque|cut-out[^|]*?|office cut-out[^|]*?)\s*\|\s*$",
                           text, re.M):
        gid, a = row.group(1), row.group(2).strip()
        ids = [gid] if "/" not in gid else [gid.split("/")[0], gid[: gid.index("/") - 1] + gid.split("/")[1]]
        for i in ids:
            alpha[i] = a
    assets = {}
    for b in re.finditer(r"^- \*\*(G\d+[a-z]?(?: / G\d+[a-z])?)\*\* — (.+)$", text, re.M):
        head, body = b.group(1), b.group(2)
        ids = [x.strip() for x in head.split("/")]
        tag = ""
        tm = re.match(r"\(([^)]*)\)\s*", body)
        if tm:
            tag, body = tm.group(1), body[tm.end():]
        sm = re.search(r"Subject: (.*?) Composition: (.*)$", body)
        if not sm:
            die(f"{head}: no Subject/Composition")
        subj, comp = sm.group(1).strip(), sm.group(2).strip()
        comp = re.sub(r"\s*(Office cut-out|Cut-out)\.$", "", comp)
        for gid in ids:
            assets[gid] = dict(tag=tag, subject=subj, comp=comp, alpha=alpha.get(gid))
    return assets


ASSETS = {**parse_assets(SB1), **parse_assets(SB2)}
for gid, a in ASSETS.items():
    if a["alpha"] is None:
        die(f"{gid}: alpha column not found in the asset table")


def side_pair(gid):
    """G04a/b and G35a/b share one paragraph: keep only this image's side."""
    a = ASSETS[gid]
    side = "LEFT" if gid.endswith("a") else "RIGHT"
    comp = a["comp"]
    if "G04a is the left side" in comp or "G35a the left side" in comp:
        comp = re.sub(r"portrait 1024x1536, .*$",
                      f"portrait 1024x1536, this image is the {side} side "
                      + ("(galleries curve to the right)." if side == "LEFT"
                         else "(the mirror of the left side, galleries curve to the left)."), comp)
        a["comp"] = comp


for _g in ("G04a", "G04b", "G35a", "G35b"):
    side_pair(_g)


def assemble(gid):
    a = ASSETS[gid]
    office = "STYLE-O" in a["tag"]
    fixed = "FIXED" in a["tag"] or a["tag"] == "+ FIXED"
    cut = a["alpha"].startswith(("cut-out", "office cut-out"))
    parts = [LINE1.format(id=gid), STYLE_O if office else STYLE_P]
    if fixed:
        parts.append(FIXED)
    parts.append(f"Subject: {a['subject']}\nComposition: {a['comp']}")
    if cut:
        parts.append(CUT_O if office else CUT_P)
    parts += [NEGATIVE, LAST]
    # the character ref only goes to assets that show Vorathul; plates and heroes get the style ref alone
    refs = [REF_OFFICE_NEW] if office else ([REF_STYLE, REF_CANON] if fixed else [REF_STYLE])
    key = ("#00FF00" if office else "#808080") if cut else None
    return "\n\n".join(parts) + "\n", refs, key


# ---------------------------------------------------------------- round a: canonical fix
def canon_prompt():
    head = LINE1.format(id=CANON_ID)
    items_block = "\n".join(items)
    return f"""{head}

Three images are attached. The FIRST is the approved ART STYLE: bold graphic comic panel in a noir style, huge flat solid black areas, very simplified shapes, thick brush-ink edges with dry-brush breaks, flat colour, no gradients, slight screen-print paper texture. The SECOND is the CURRENT turnaround sheet of the character: keep its overall design, layout, three views and drawing style, but it has two errors that you must fix (see CORRECTIONS). The THIRD shows the approved WING design: black organ pipes fanned out like the primary feathers of a huge angel wing in a wide upward ARC, short pipes near the body and very long pipes at the outer edge, every pipe mouth glowing violet.

Subject: The official model turnaround sheet of the character Vorathul for animation, redrawn with the corrections below: the same character three times: FRONT view, SIDE view (profile facing left, wings seen edge-on) and BACK view (cape and the roots of the pipe wings visible). Standing neutral, both gauntlets on the sword pommel in the front view. Identical proportions, height and details in all three. These features are FIXED and must appear exactly:
{items_block}

CORRECTIONS (both are mandatory):
A. EYE SLIT: in the FRONT view the closed great-helm has EXACTLY ONE eye slit: a single narrow horizontal violet slit, one single continuous shape. NOT two eyes, NOT two glowing dots, NOT two separate slits, no pupils. The side view shows the same single slit in profile. The back view has no eye.
B. SWORD IN THE SIDE VIEW: the greatsword in the SIDE view must be just as thick and heavy as in the FRONT view. Draw it as a massive broad blade, with the same blade width as the front view (about one twelfth of the figure's height), a thick violet-runed fuller and the spiked crossguard with its violet gem, point down in front of him. NOT a thin needle, NOT a narrow rapier: turn the blade so that its broad face shows even in the profile view.
C. WINGS: the wings follow the THIRD image, a wide upward ARC fan of organ pipes (about eight pipes on each side as in item 6), clearly spread wider than the body in the front and back views; edge-on in the side view.

Composition: three full figures in a row on a plain flat ivory #F4ECD8 background with no scenery and no ground shadow except a thin flat line, even spacing, each figure 85 percent of the frame height, landscape 1536x1024.

- ABSOLUTELY NO text, letters, numbers, labels, arrows, logos or watermarks.
- NOT glossy digital painting, NOT 3D, no gradients, no colours other than black, ivory and violet.

{LAST}
"""


# ---------------------------------------------------------------- round c: rig parts
def rig_template():
    """Pull the verbatim prompt template out of rig.md section 4.4."""
    text = read(RIG)
    s = text.index("### 4.4 Prompt template")
    block = re.search(r"```\n(.*?)\n```", text[s:], re.S)
    if not block:
        die("rig.md 4.4 template block not found")
    return block.group(1)


RIG_SUBJECT_M = ("Vorathul standing, FRONT view, full figure, symmetric neutral pose: both arms hanging "
                 "straight, held 25 degrees away from the body so they do not overlap the torso, gauntlets "
                 "open and relaxed; NO wings (only two small spiky stubs at the shoulder blades); NO sword; "
                 "the cape hangs straight down behind him with its ragged hem fully visible between and "
                 "beside the legs; feet slightly apart. Figure fills 90 percent of the image height.")

# Sheet contents come from rig.md 4.2 (one row per sheet); the part lists below only spell out what
# that table names, plus the joint-end rules of 1.3 / 4.4 (rounded wrist stub, plain root end).
RIG_SHEETS = [
    ("rig-M", "1024x1536", RIG_SUBJECT_M, None),
    ("rig-V1", "1536x1024",
     "a sheet of three separate HEAD EXTRAS of Vorathul, front view, same scale as each other.",
     ["a small, lopsided version of the jagged crown: clearly smaller and crooked, with fewer and "
      "blunter spikes, its three gems small and dull violet, base flat at the bottom",
      "a great-helm eye slit seen alone as a flat shape: a narrow horizontal violet slit curved DOWN "
      "at both ends like a frown (a sad slit), drawn on a plain black oval patch",
      "a VOID HEAD: a flat pure black ovoid head shape, a little larger than the great-helm's inner "
      "outline, with seven small glowing violet eyes laid out in three rows of 2, 3 and 2; no other "
      "detail, no face"]),
    ("rig-V2", "1536x1024",
     "a sheet of five separate GAUNTLETS of Vorathul (spiked black armoured hands), all the same "
     "scale; each gauntlet ends in a plain ROUNDED wrist stub with no detail.",
     ["GRIP: a hand closed around a sword hilt, seen from the front",
      "FIST: a clenched fist, seen from the front",
      "PALM: an open hand with the palm toward the viewer, fingers together",
      "SPREAD: an open hand with fingers spread wide, as if conducting an orchestra",
      "CLUTCH: a hand curled into a claw, fingers bent as if gripping a throat"]),
    ("rig-V3", "1536x1024",
     "a sheet with ONE item: the greatsword of Vorathul alone, laid HORIZONTALLY, blade pointing "
     "left, pommel on the right, drawn large across the sheet.",
     ["the greatsword: black blade with one violet rune line in the fuller, runes lit, spiked black "
      "crossguard with a violet gem in the centre, grip and pommel; nothing holds it, no hand, no "
      "scabbard"]),
    ("rig-V4", "1536x1024",
     "a sheet of organ-pipe parts for the wings of Vorathul, all drawn parallel and HORIZONTAL, "
     "all at the same scale as each other.",
     ["a SHORT black organ-pipe tube, the mouth (open end, violet glow inside) on the RIGHT, plain "
      "root end on the left",
      "a MEDIUM-length black organ-pipe tube, the same width as the short one, mouth on the RIGHT, "
      "violet glow inside",
      "a LONG black organ-pipe tube, the same width as the others, mouth on the RIGHT, violet glow "
      "inside",
      "one round warm gold #E2B33C cork, seen from the side as a small cylinder",
      "one spiky black hub, the cluster of spikes where the pipes of one wing meet, flat, roughly "
      "round"]),
    ("rig-V5", "1536x1024",
     "a sheet with ONE item: the LOWER BODY of Vorathul SEATED on a stone step, seen from the FRONT "
     "(thighs pointing toward the camera, knees, shins and boots), cut off at the belt line: a "
     "plain flat top edge at the belt, no torso, no arms, no head.",
     ["the seated lower body: belt and hip plates at the top edge, thighs toward the camera, knees, "
      "shins, black armoured boots resting on the floor; he sits on a low ivory stone step drawn "
      "under him; the ragged cape pools over the step and around the legs"]),
]


def rig_prompt(sid, size, subject, parts, master_ref=False):
    t = rig_template()
    first = "Generate exactly ONE image with your built-in image_gen tool. Do not copy or move any files and do\nnot run shell commands."
    if first not in t:
        die("rig.md 4.4 first paragraph changed")
    t = t.replace(first, LINE1.format(id=sid))
    part_marker = ('{PART_LIST — one numbered line per part: what it is, its orientation, and its joint end, e.g.\n'
                   '"the wrist end is a plain ROUNDED stub with no detail" / "the top of the upper arm is a full\n'
                   'round cap"}')
    if part_marker not in t or "{SHEET_SUBJECT}" not in t or "{SIZE}" not in t:
        die("rig.md 4.4 placeholders changed")
    if parts:
        plist = "\n".join(f"{i}. {p}" for i, p in enumerate(parts, 1))
    else:
        plist = ("Only ONE figure on this sheet; the figure is drawn complete, nothing overlaps or "
                 "touches the frame.")
    t = t.replace(part_marker, plist)
    if master_ref:
        two = "Two images are attached."
        use = "(use its FRONT view)."
        if two not in t or use not in t:
            die("rig.md 4.4 intro changed")
        t = t.replace(two, "Three images are attached.", 1).replace(
            use, use + " The THIRD is the rig master of this same puppet (front view, wings and sword left "
            "out): match its brush-stroke weight, line quality, scale and armour details exactly.", 1)
    t = t.replace("{SHEET_SUBJECT}", subject)
    t = t.replace("{SIZE}", size)
    t = t.replace("{, warm gold #E2B33C for the cork}", ", warm gold #E2B33C for the cork" if sid == "rig-V4" else "")
    t = t.replace("After generating, print the generated file's path and pixel size.", LAST)
    for ph in ("{SHEET_SUBJECT}", "{SIZE}", "{PART_LIST", "{, warm gold"):
        if ph in t:
            die(f"unfilled placeholder {ph} in {sid}")
    return t + "\n"


# ---------------------------------------------------------------- round d: office frame
def office_frame_prompt():
    head = LINE1.format(id="office-frame")
    p = P07
    a1 = ("The attached image is the APPROVED STYLE AND CHARACTER REFERENCE. Match its art style EXACTLY: ")
    if a1 not in p:
        die("07 prompt layout changed (intro)")
    intro = ("Three images are attached. The FIRST is the approved OFFICE REFERENCE: the previous version "
             "of this scene; keep its office style, its layout and its characters, except for the two "
             "corrections in the Subject. The SECOND is the approved PAINTING STYLE reference. The THIRD "
             "is the canonical turnaround sheet of Vorathul (use its FRONT view). The painting on the wall "
             "must match the SECOND image's art style EXACTLY: ")
    body = p.split("\n\n", 1)[1]
    body = body.replace(a1, intro, 1)
    for old, new in [
        ("containing a painting in EXACTLY the reference comic style: Vorathul black in the golden cathedral.",
         "containing a painting in EXACTLY the painting style of the SECOND image: Vorathul black in the "
         "golden cathedral, front view as on the THIRD image. CORRECTION 1: the painting is EXACTLY 16:9 "
         "(wide landscape, width : height = 16 : 9); the frame's inner opening is 16:9 and the painting "
         "fills it edge to edge, with no wall visible between the painting and the black frame."),
        ("holding a giant pink eraser and a grey paint roller;",
         "holding a giant eraser and a grey paint roller; CORRECTION 2: the eraser is flat vector white "
         "and grey with a UI-blue sleeve, NOT pink, no pink anywhere in the image;"),
        ("the framed painting is the focal point and takes 45 percent of the frame width;",
         "the framed 16:9 painting is the focal point and takes 45 percent of the frame width;"),
    ]:
        if old not in body:
            die(f"07 prompt layout changed: {old[:40]!r}")
        body = body.replace(old, new, 1)
    return head + "\n\n" + body


# The office-frame run came back with a 3:2 painting although its prompt asked for 16:9 twice (20 Oct 2026).
# The plate leaves the wall empty instead: the 16:9 frame and the live painting are drawn in code on top.
def office_plate_prompt():
    head = LINE1.format(id="office-plate")
    body = (
        "Two images are attached. The FIRST is the approved OFFICE scene; the SECOND is its earlier version. "
        "Draw the SAME office room with EXACTLY the FIRST image's art style, palette, line weight, camera angle "
        "and layout: flat vector illustration, thin uniform lines, greys #E9ECEF / #CED4DA / #ADB5BD, white, one "
        "UI blue #3B82F6, sterile and calm.\n\n"
        "Subject: the EMPTY office. CHANGES: (1) remove the framed painting completely; where it hung, the back "
        "wall is plain, flat, empty light grey, with nothing on it in a wide horizontal area across the upper "
        "middle of the wall (no frame, no shadow, no hooks, no notes, no posters there). (2) remove ALL people: "
        "no developer in the middle, no person at the left desk, no person at the right desk; the two desks, "
        "monitors, chairs, shelves, plants, ceiling lights and window stay exactly where they are, chairs empty.\n\n"
        "Composition: same framing as the FIRST image, landscape; the empty wall area is the visual centre.\n\n"
        "ABSOLUTELY NO text, letters, numbers or logos. No pink, no magenta, no gold, no violet anywhere. "
        "No photorealism, no 3D rendering, no gradients beyond the flat greys.\n\n" + LAST)
    return head + "\n\n" + body


# ---------------------------------------------------------------- round e: locations + hero panels
SB3 = ROOT / "docs" / "storyboard-03-locations.md"
REF_FIGHT = "stil/onayli/06-dovus-faz3.jpg"
HERO_REFS = [f"stil/prompts/b-test/out/G{n}.png" for n in (15, 16, 17, 18)]
REF_LABELS = {
    REF_STYLE: "the approved STYLE frame (style and palette)",
    REF_FIGHT: "the approved FIGHT frame (how the heroes and the action read in this style)",
    REF_CANON: "the canonical turnaround sheet of Vorathul (use its FRONT view)",
    HERO_REFS[0]: "the KNIGHT model sheet (sun shield, sword): keep his design exactly",
    HERO_REFS[1]: "the MAGE model sheet (hooded, sun-ring staff): keep her design exactly",
    HERO_REFS[2]: "the ARCHER model sheet (long hair, bow): keep her design exactly",
    HERO_REFS[3]: "the ROGUE model sheet (hood, twin daggers): keep his design exactly",
}
ORDINALS = ["FIRST", "SECOND", "THIRD", "FOURTH", "FIFTH", "SIXTH", "SEVENTH"]


def parse_locations():
    """Table rows `| id | size | alpha | ... | refs |` plus `- **id** — Subject: ... Composition: ...`."""
    text = read(SB3)
    table = {}
    for row in re.finditer(r"^\| `?((?:L\d|H|LX)-[a-z0-9-]+)`? \|(.+)\|\s*$", text, re.M):
        cells = [c.strip() for c in row.group(2).split("|")]
        table[row.group(1)] = dict(size=cells[0], alpha=cells[1], refs=cells[-1])
    assets = {}
    for b in re.finditer(r"^- \*\*((?:L\d|H|LX)-[a-z0-9-]+)\*\* — (.+)$", text, re.M):
        aid, body = b.group(1), b.group(2)
        sm = re.search(r"Subject: (.*?) Composition: (.*)$", body)
        if not sm:
            die(f"{aid}: no Subject/Composition")
        if aid not in table:
            die(f"{aid}: no row in the asset table")
        assets[aid] = dict(subject=sm.group(1).strip(), comp=sm.group(2).strip(), **table[aid])
    missing = set(table) - set(assets)
    if missing:
        die(f"table rows without a prompt paragraph: {sorted(missing)}")
    return assets


def location_refs(a):
    """refs cell: comma list of `style`, `fight`, `canon`, `heroes`, or another asset id (its out/)."""
    refs = []
    for r in (x.strip() for x in a["refs"].split(",")):
        if r == "style":
            refs.append(REF_STYLE)
        elif r == "fight":
            refs.append(REF_FIGHT)
        elif r == "canon":
            refs.append(REF_CANON)
        elif r == "heroes":
            refs += HERO_REFS
        elif re.match(r"^(L\d|H|LX)-", r):
            refs.append(f"stil/prompts/e-locations/out/{r}.png")
        else:
            die(f"unknown ref {r!r}")
    if not refs or refs[0] != REF_STYLE:
        die(f"refs must start with style: {a['refs']!r}")
    return refs


def location_entry(aid, a):
    refs = location_refs(a)
    cut = a["alpha"].startswith("cut-out")
    parts = [LINE1.format(id=aid), STYLE_P]
    if len(refs) > 1:
        lines = []
        for k, r in enumerate(refs):
            label = REF_LABELS.get(r) or (f"the already generated image {Path(r).stem} (see the Subject "
                                          "for how this image relates to it)")
            lines.append(f"The {ORDINALS[k]} attached image is {label}.")
        parts.append(f"{len(refs)} images are attached. " + " ".join(lines))
    if REF_CANON in refs:
        parts.append(FIXED)
    parts.append(f"Subject: {a['subject']}\nComposition: {a['comp']}")
    if cut:
        parts.append(CUT_P)
    parts += [NEGATIVE, LAST]
    return dict(id=aid, text="\n\n".join(parts) + "\n", refs=refs, key="#808080" if cut else None)


# ---------------------------------------------------------------- write rounds
def write_round(name, entries):
    d = OUT / name
    d.mkdir(parents=True, exist_ok=True)
    rows = []
    for e in entries:
        (d / f"{e['id']}.prompt.txt").write_text(e.pop("text"), encoding="utf-8", newline="\n")
        row = dict(id=e["id"], prompt=f"stil/prompts/{name}/{e['id']}.prompt.txt", refs=e["refs"],
                   out=f"stil/prompts/{name}/out/{e['id']}.png")
        deps = [r for r in e["refs"] if r.startswith("stil/prompts/")]
        if deps:
            row["depends_on"] = deps
        if e.get("key"):
            row["key"] = e["key"]
        rows.append(row)
    (d / "round.json").write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8", newline="\n")
    return rows


def asset_entry(gid):
    text, refs, key = assemble(gid)
    return dict(id=gid, text=text, refs=refs, key=key)


def main():
    rounds = {}
    rounds["a-canonical-fix"] = [
        dict(id=CANON_ID, text=canon_prompt(), refs=[REF_STYLE, REF_CANON_OLD, REF_WING]),
        dict(id="office-frame", text=office_frame_prompt(), refs=[REF_OFFICE, REF_STYLE, REF_CANON_OLD]),
        dict(id="office-plate", text=office_plate_prompt(), refs=[REF_OFFICE_NEW, REF_OFFICE])]
    b_ids = ["G15", "G16", "G17", "G18", "G11", "G42", "G43", "G44", "G45", "G32"]
    rounds["b-test"] = [asset_entry(g) for g in b_ids]
    rig = {sid: (size, subj, parts) for sid, size, subj, parts in RIG_SHEETS}
    rounds["c1-rig-master"] = [dict(id="rig-M", text=rig_prompt("rig-M", *rig["rig-M"]),
                                    refs=[REF_STYLE, REF_CANON], key="#00FF00")]
    rounds["c2-rig-views"] = [
        dict(id=sid, text=rig_prompt(sid, *rig[sid], master_ref=True),
             refs=[REF_STYLE, REF_CANON, REF_RIG_MASTER], key="#00FF00")
        for sid in ("rig-V1", "rig-V2", "rig-V3", "rig-V4", "rig-V5")]
    d_ids = sorted((g for g in ASSETS if g not in set(b_ids)),
                   key=lambda g: (int(re.match(r"G(\d+)", g).group(1)), g))
    rounds["d-assets"] = [asset_entry(g) for g in d_ids]
    if SB3.is_file():
        rounds["e-locations"] = [location_entry(i, a) for i, a in parse_locations().items()]
    for name, entries in rounds.items():
        rows = write_round(name, entries)
        print(f"{name}: {len(rows)} prompts")


if __name__ == "__main__":
    main()
