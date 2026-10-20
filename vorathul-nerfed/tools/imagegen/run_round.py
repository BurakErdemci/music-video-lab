"""Run one image-generation round: one `codex exec` per image, then verify what came back.

    uv run --with pillow python -I tools/imagegen/run_round.py stil/prompts/<round>
        [--model gpt-6.1-sol] [--dry-run] [--only id,id] [--max-parallel 6] [--timeout 900]

Paths in round.json are relative to the clip root (the parent of tools/). Needs only the standard
library and Pillow. Exit 0 only when every selected image exists, opens with PIL and has a unique
md5 (within the round, against stil/onayli/ and against the other rounds' out/ folders).
"""
import argparse
import concurrent.futures as cf
import hashlib
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ONAYLI = ROOT / "stil" / "onayli"
SESSION_RE = re.compile(r"^session id:\s*([0-9a-fA-F-]{36})\s*$", re.M)
IMG_EXT = {".png", ".jpg", ".jpeg", ".webp"}


def codex_home():
    return Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex")


def md5_file(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


# ------------------------------------------------------------------ pure helpers (unit-tested)
def find_duplicates(round_md5, known_md5):
    """round_md5: {id: md5} for this round; known_md5: {label: md5} of other files.

    Returns {id: [other ids or labels sharing the md5]} for every duplicate."""
    by_md5 = {}
    for i, m in round_md5.items():
        by_md5.setdefault(m, []).append(i)
    dups = {}
    for m, ids in by_md5.items():
        others = [lab for lab, km in known_md5.items() if km == m]
        for i in ids:
            peers = [j for j in ids if j != i] + others
            if peers:
                dups[i] = peers
    return dups


def session_id_from_log(text):
    """The session id that `codex exec` printed in its header, or None. Last one wins."""
    ids = SESSION_RE.findall(text)
    return ids[-1].lower() if ids else None


def recover_from_session(gen_root, session_id):
    """Return (path, reason). Only a session directory with exactly one image is accepted."""
    if not session_id:
        return None, "no session id in the log"
    d = Path(gen_root) / session_id
    if not d.is_dir():
        return None, f"no generated_images/{session_id}"
    files = sorted(p for p in d.iterdir() if p.is_file() and p.suffix.lower() in IMG_EXT)
    if len(files) == 1:
        return files[0], "ok"
    if not files:
        return None, f"generated_images/{session_id} is empty"
    return None, f"generated_images/{session_id} has {len(files)} images, refusing to guess: " + \
        ", ".join(p.name for p in files)


def key_stats(im, key_hex, tol=40, band=16, corner=32):
    """Fraction of border-band pixels within `tol` (RGB distance) of the key colour, and the worst
    corner-patch mean distance."""
    from PIL import Image
    key = tuple(int(key_hex[i:i + 2], 16) for i in (1, 3, 5))
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    near = total = 0
    for y in range(h):
        edge_row = y < band or y >= h - band
        xs = range(w) if edge_row else list(range(band)) + list(range(w - band, w))
        for x in xs:
            r, g, b = px[x, y]
            total += 1
            if ((r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2) ** 0.5 <= tol:
                near += 1
    worst = 0.0
    for cx, cy in ((0, 0), (w - corner, 0), (0, h - corner), (w - corner, h - corner)):
        patch = rgb.crop((cx, cy, cx + corner, cy + corner)).resize((1, 1), Image.BOX).getpixel((0, 0))
        d = sum((a - k) ** 2 for a, k in zip(patch, key)) ** 0.5
        worst = max(worst, d)
    return dict(border_fraction=round(near / total, 4), corner_max_dist=round(worst, 1),
                tol=tol, key=key_hex.upper())


# ------------------------------------------------------------------ round loading / checks
def load_round(round_dir):
    rj = round_dir / "round.json"
    if not rj.is_file():
        sys.exit(f"run_round: {rj} not found")
    entries = json.loads(rj.read_text(encoding="utf-8"))
    ids = [e["id"] for e in entries]
    if len(set(ids)) != len(ids):
        sys.exit("run_round: duplicate ids in round.json")
    return entries


def check_inputs(entries):
    """Return {id: [problems]} and {id: [pending dependency refs]}."""
    problems, pending = {}, {}
    for e in entries:
        pr, pd = [], []
        if not (ROOT / e["prompt"]).is_file():
            pr.append(f"prompt missing: {e['prompt']}")
        deps = set(e.get("depends_on", []))
        for r in e["refs"]:
            if (ROOT / r).is_file():
                continue
            (pd if r in deps else pr).append(r if r in deps else f"ref missing: {r}")
        problems[e["id"]] = pr
        pending[e["id"]] = pd
    return problems, pending


def build_cmd(codex, model, workdir, refs):
    cmd = [codex, "exec", "--skip-git-repo-check", "--sandbox", "workspace-write",
           "-C", str(workdir), "-m", model]
    for r in refs:
        cmd += ["-i", str(ROOT / r)]
    return cmd


def fmt_cmd(cmd, prompt):
    return " ".join(shlex.quote(c) for c in cmd) + f" < {shlex.quote(str(prompt))}"


# ------------------------------------------------------------------ one call
def kill_tree(proc):
    if os.name == "nt":
        subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True)
    else:
        proc.kill()


def run_one(e, codex, model, round_dir, timeout):
    work = round_dir / "work" / e["id"]
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    log = work / "out.log"
    cmd = build_cmd(codex, model, work, e["refs"])
    t0 = time.time()
    rc = None
    with open(ROOT / e["prompt"], "rb") as fin, open(log, "wb") as fout:
        proc = subprocess.Popen(cmd, stdin=fin, stdout=fout, stderr=subprocess.STDOUT, cwd=work)
        try:
            rc = proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            kill_tree(proc)
            proc.wait()
            rc = "timeout"
    return dict(id=e["id"], rc=rc, seconds=round(time.time() - t0, 1), work=str(work), log=str(log))


# ------------------------------------------------------------------ collecting results
def open_ok(path):
    from PIL import Image
    try:
        with Image.open(path) as im:
            im.verify()
        with Image.open(path) as im:
            im.load()
            return True, im.mode, im.size, None
    except Exception as ex:  # noqa: BLE001 - any decode failure is a FAIL with the reason
        return False, None, None, f"{type(ex).__name__}: {ex}"


def collect(e, run, out_dir, gen_root):
    """Put the image for one id at out_dir/<id>.png. Returns a result dict (without md5 checks)."""
    from PIL import Image
    res = dict(id=e["id"], status="FAIL", notes=[], source=None, session_id=None,
               rc=run.get("rc") if run else None, seconds=run.get("seconds") if run else None)
    if run and run.get("rc") != 0:
        res["notes"].append(f"codex rc={run['rc']}")
    dest = out_dir / f"{e['id']}.png"
    work = Path(run["work"]) if run else None
    log_text = ""
    if run and Path(run["log"]).is_file():
        log_text = Path(run["log"]).read_text(encoding="utf-8", errors="replace")
    sid = session_id_from_log(log_text)
    res["session_id"] = sid
    sess_files = []
    if sid and (gen_root / sid).is_dir():
        sess_files = [p for p in (gen_root / sid).iterdir() if p.suffix.lower() in IMG_EXT]

    src = None
    if work:
        mine = work / f"{e['id']}.png"
        if mine.is_file():
            ok, *_ = open_ok(mine)
            if ok:
                src, res["source"] = mine, "work"
                if sess_files and md5_file(mine) not in {md5_file(p) for p in sess_files}:
                    res["notes"].append("WARN: the copied file is not byte-identical to any image of "
                                        "this call's generated_images session")
            else:
                res["notes"].append("work file exists but does not open; trying session recovery")
    if src is None:
        rec, why = recover_from_session(gen_root, sid)
        if rec is None:
            res["notes"].append(f"no image: {why}")
            return res
        src, res["source"] = rec, "recovered"
        res["notes"].append(f"recovered {rec.name} from session {sid}")
    out_dir.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        prev = out_dir / "prev"
        prev.mkdir(exist_ok=True)
        dest.replace(prev / f"{e['id']}.{int(time.time())}.png")
    if src.suffix.lower() == ".png":
        shutil.copyfile(src, dest)
    else:
        with Image.open(src) as im:
            im.save(dest, "PNG")
    return res


def describe(e, res, dest):
    ok, mode, size, err = open_ok(dest) if dest.is_file() else (False, None, None, "missing")
    res["opens"] = ok
    if not ok:
        res["notes"].append(f"does not open: {err}")
        res["status"] = "FAIL"
        return
    res["mode"], res["size"] = mode, list(size)
    res["md5"] = md5_file(dest)
    res["bytes"] = dest.stat().st_size
    res["status"] = "OK"
    if mode in ("RGBA", "LA", "P"):
        res["notes"].append(f"mode {mode}: image carries alpha/palette; check that no checkerboard was "
                            "drawn as pixels")
    if e.get("key"):
        from PIL import Image
        with Image.open(dest) as im:
            ks = key_stats(im, e["key"])
        res["key"] = ks
        if ks["corner_max_dist"] > 30:
            res["notes"].append(f"WARN key: a 32x32 corner patch is {ks['corner_max_dist']} RGB away from "
                                f"{ks['key']} (rig.md 4.3 rejects above 30)")
        if ks["border_fraction"] < 0.9:
            res["notes"].append(f"WARN key: only {ks['border_fraction']:.1%} of the border band is within "
                                f"{ks['tol']} of {ks['key']}")


# ------------------------------------------------------------------ contact sheet
def contact_sheet(results, out_dir, width=1600):
    from PIL import Image, ImageDraw, ImageFont
    n = len(results)
    cols = min(n, 4) if n else 1
    rows = (n + cols - 1) // cols
    cw = width // cols
    th = int(cw * 2 / 3)
    lh = 30
    sheet = Image.new("RGB", (cw * cols, (th + lh) * rows), (60, 60, 60))
    d = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for i, r in enumerate(results):
        x, y = (i % cols) * cw, (i // cols) * (th + lh)
        p = out_dir / f"{r['id']}.png"
        label = f"{r['id']}  {r.get('mode', '-')} {r.get('size', '')}  {str(r.get('md5', ''))[:8]}  {r['status']}"
        if r["status"] == "OK" and p.is_file():
            with Image.open(p) as im:
                im = im.convert("RGBA")
                im.thumbnail((cw - 6, th - 6))
                bg = Image.new("RGBA", im.size, (128, 128, 128, 255))
                bg.alpha_composite(im)
                sheet.paste(bg.convert("RGB"), (x + 3, y + 3))
        else:
            d.rectangle((x + 3, y + 3, x + cw - 4, y + th - 4), outline=(220, 50, 50), width=3)
            d.text((x + 12, y + th // 2), "MISSING / FAIL", fill=(220, 50, 50), font=font)
        d.text((x + 6, y + th + 8), label, fill=(240, 240, 240), font=font)
    sheet.save(out_dir / "contact.jpg", "JPEG", quality=85)


# ------------------------------------------------------------------ main
def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("round_dir")
    ap.add_argument("--model", default="gpt-6.1-sol")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", default="")
    ap.add_argument("--max-parallel", type=int, default=6)
    ap.add_argument("--timeout", type=int, default=900)
    a = ap.parse_args(argv)

    rd = Path(a.round_dir)
    if not rd.is_absolute():
        rd = ROOT / rd if (ROOT / rd).is_dir() else Path.cwd() / rd
    rd = rd.resolve()
    entries = load_round(rd)
    only = [s for s in a.only.split(",") if s]
    unknown = sorted(set(only) - {e["id"] for e in entries})
    if unknown:
        sys.exit(f"run_round: unknown ids in --only: {unknown}")
    sel = [e for e in entries if not only or e["id"] in only]
    problems, pending = check_inputs(sel)
    codex = shutil.which("codex")

    if a.dry_run:
        try:
            shown = rd.relative_to(ROOT).as_posix()
        except ValueError:
            shown = str(rd)
        print(f"round {shown}  model={a.model}  images={len(sel)}  "
              f"max-parallel={a.max_parallel}  timeout={a.timeout}s  codex={codex}")
        bad = 0
        for e in sel:
            work = rd / "work" / e["id"]
            print(f"\n[{e['id']}] out={e['out']}")
            print("  " + fmt_cmd(build_cmd("codex", a.model, work, e["refs"]), ROOT / e["prompt"]))
            for p in problems[e["id"]]:
                print(f"  ERROR {p}")
                bad += 1
            for p in pending[e["id"]]:
                print(f"  pending dependency (produced by an earlier round): {p}")
        if not codex:
            print("\nERROR codex not found on PATH")
            bad += 1
        print(f"\ndry-run: {len(sel)} commands, {bad} errors, "
              f"{sum(len(v) for v in pending.values())} pending dependency refs")
        return 1 if bad else 0

    blocked = {i: p + [f"dependency missing: {d}" for d in pending[i]] for i, p in problems.items()
               if p or pending[i]}
    if blocked or not codex:
        for i, p in blocked.items():
            print(f"[{i}] cannot run: {'; '.join(p)}")
        if not codex:
            print("codex not found on PATH")
        return 2

    out_dir = rd / "out"
    out_dir.mkdir(exist_ok=True)
    gen_root = codex_home() / "generated_images"
    runs = {}
    print(f"launching {len(sel)} calls, {a.max_parallel} at a time, model {a.model}")
    with cf.ThreadPoolExecutor(max_workers=max(1, a.max_parallel)) as ex:
        futs = {ex.submit(run_one, e, codex, a.model, rd, a.timeout): e for e in sel}
        for f in cf.as_completed(futs):
            r = f.result()
            runs[r["id"]] = r
            print(f"  [{r['id']}] rc={r['rc']} {r['seconds']}s")

    results = {}
    for e in sel:
        res = collect(e, runs[e["id"]], out_dir, gen_root)
        describe(e, res, out_dir / f"{e['id']}.png")
        results[e["id"]] = res
    # unselected ids keep whatever an earlier run left in out/
    for e in entries:
        if e["id"] in results:
            continue
        p = out_dir / f"{e['id']}.png"
        res = dict(id=e["id"], status="NOT-RUN", notes=[], source="earlier-run")
        if p.is_file():
            describe(e, res, p)
            res["source"] = "earlier-run"
        results[e["id"]] = res

    round_md5 = {i: r["md5"] for i, r in results.items() if r.get("md5")}
    known = {f"onayli/{p.name}": md5_file(p) for p in ONAYLI.iterdir() if p.is_file()}
    for other in sorted((rd.parent).glob("*/out/*.png")):
        if other.parent.parent != rd:
            known[f"{other.parent.parent.name}/{other.stem}"] = md5_file(other)
    for i, peers in find_duplicates(round_md5, known).items():
        results[i]["status"] = "FAIL"
        results[i]["duplicate_of"] = peers
        results[i]["notes"].append("FAIL duplicate md5 with: " + ", ".join(peers))

    ordered = [results[e["id"]] for e in entries]
    contact_sheet([r for r in ordered if r["status"] != "NOT-RUN"], out_dir)
    (out_dir / "report.json").write_text(json.dumps(
        dict(round=rd.name, model=a.model, generated=time.strftime("%Y-%m-%d %H:%M:%S"), results=ordered),
        indent=2), encoding="utf-8")

    fails = [r for r in ordered if r["id"] in {e["id"] for e in sel} and r["status"] != "OK"]
    print()
    for r in ordered:
        extra = f"{r.get('mode', '-')} {r.get('size', '')} md5={str(r.get('md5', ''))[:8]}"
        print(f"{r['status']:8} {r['id']:14} {extra}  {'; '.join(r['notes'])}")
        if r.get("key"):
            k = r["key"]
            print(f"{'':8} {'':14} key {k['key']}: border {k['border_fraction']:.1%}, "
                  f"corner max dist {k['corner_max_dist']}")
    print(f"\n{len(sel) - len(fails)}/{len(sel)} ok; contact sheet {out_dir / 'contact.jpg'}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
