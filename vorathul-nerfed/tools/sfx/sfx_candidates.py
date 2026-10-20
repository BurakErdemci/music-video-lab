"""Sound-effect candidates, in-song previews and listening page for 'Vorathul Nerfed'.

Run (from anywhere):
  KENNEY_DIR=<clip>/sfx/_kenney uv run --with numpy --with scipy --with soundfile python tools/sfx/sfx_candidates.py
Needs the Kenney CC0 packs unzipped under KENNEY_DIR, one dir per pack (impact-sounds, interface-sounds,
ui-audio, rpg-audio, sci-fi-sounds; URLs in sfx/candidates/SOURCES.md) and audio/Vorathul.Nerfed.wav
(gitignored, from the vorathul-audio-input release). Reads the song, never modifies it.
Candidates are mono (halves the WAV size; the video mix places them); the song in previews stays stereo.
Outputs in sfx/candidates/: <id>.wav (alone, peak -6 dBFS), <id>-song.mp3 (~6 s of the song with the
candidate mixed in at its gain), manifest.json, index.html, SOURCES.md, _measurements.json.
"""
import os, json, subprocess, tempfile, shutil, html
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
CLIP = Path(__file__).resolve().parents[2]
SONG = f"{CLIP}/audio/Vorathul.Nerfed.wav"
OUT = f"{CLIP}/sfx/candidates"
KEN = os.environ.get("KENNEY_DIR", f"{CLIP}/sfx/_kenney")
TMP = tempfile.mkdtemp(prefix="sfxtmp_")
T = json.load(open(f"{CLIP}/data/timing.json"))

song, _sr = sf.read(SONG, always_2d=True)
assert _sr == SR
song_st = song
song = song.mean(1)    # mono copy for level measurement; previews keep the song stereo


# ---------------------------------------------------------------- helpers
_cache = {}
def load(pack, name):
    key = (pack, name)
    if key not in _cache:
        tmp = f"{TMP}/_l.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{KEN}/{pack}/Audio/{name}.ogg", "-ac", "1", "-ar", str(SR), tmp], check=True)
        _cache[key] = sf.read(tmp)[0]
    return _cache[key].copy()

def L(pack, name): return trim_lead(load(pack, name))
def sos(kind, f, order=4): return butter(order, f, btype=kind, fs=SR, output="sos")
def lp(x, f): return sosfilt(sos("low", f), x)
def hp(x, f): return sosfilt(sos("high", f), x)
def bp(x, lo, hi): return sosfilt(sos("band", [lo, hi], 2), x)
def peak(x): return float(np.max(np.abs(x)))
def tv(n): return np.arange(n) / SR
def rms_db(x): return 10 * np.log10(max(float(np.mean(np.square(x))), 1e-14))
def norm(x, db=-6.0): return x * (10 ** (db / 20) / (peak(x) or 1))
def vary(x, r):
    """Varispeed by ratio r (pitch and speed together)."""
    return np.interp(np.arange(int(len(x) / r)) * r, np.arange(len(x)), x)
def trim_lead(x, thr=-55):
    return x[int(np.argmax(np.abs(x) > peak(x) * 10 ** (thr / 20))):]
def cut(x, dur, fade_ms=15):
    x = x[:int(dur * SR)].copy(); n = min(len(x), int(fade_ms * SR / 1000)); x[-n:] *= np.linspace(1, 0, n); return x
def fadein(x, ms=2):
    x = x.copy(); n = int(ms * SR / 1000); x[:n] *= np.linspace(0, 1, n); return x
def delay(x, t): return np.concatenate([np.zeros(int(t * SR)), x])
def fit(x, n): return x[:n] if len(x) >= n else np.concatenate([x, np.zeros(n - len(x))])
def mix_at(base, add, t=0.0):
    at = int(t * SR); n = max(len(base), at + len(add)); o = np.zeros(n); o[:len(base)] += base; o[at:at + len(add)] += add; return o
def S(*xs):
    n = max(len(x) for x in xs); return sum(fit(x, n) for x in xs)
def noise(n, rng): return rng.standard_normal(n)
def expd(n, tau): return np.exp(-tv(n) / tau)
def env_peak(x, win=0.008):
    n = max(1, int(win * SR)); return int(np.argmax(np.convolve(np.abs(x), np.ones(n) / n, "same")))
def thump(f0, f1, dur, tau, amp=1.0):
    """Sine whose pitch falls exponentially f0 -> f1."""
    n = int(dur * SR); t = tv(n); f = f1 + (f0 - f1) * np.exp(-t / (dur / 4))
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(n, tau)
def noise_sweep(n, f0, f1, rng, q=0.35):
    out = np.zeros(n); w = rng.standard_normal(n); seg = 1200
    for i in range(0, n, seg):
        f = f0 * (f1 / f0) ** (i / n)
        out[i:i + seg] = sosfilt(butter(2, [f * (1 - q), min(f * (1 + q), 20000)], btype="band", fs=SR, output="sos"), w[i:i + seg])
    return out
def ticks(times, rng, fmin=2500, tau=0.004, amps=None):
    """Short high-passed noise click at each time (seconds)."""
    n = int((max(times) + 0.1) * SR); o = np.zeros(n)
    for i, t in enumerate(times):
        s = int(t * SR); m = 400; b = hp(noise(m, rng), fmin) * np.exp(-np.arange(m) / (tau * SR))
        o[s:s + m] += b[:n - s] * (1.0 if amps is None else amps[i])
    return o
def crackle(size, seed, fmin=2500):
    rng = np.random.default_rng(seed); dur = .15 + .6 * size; n = int(dur * SR); o = np.zeros(n); cnt = int(4 + 16 * size)
    for t in np.sort(rng.uniform(0, dur * .8, cnt)):
        s = int(t * SR); m = 600; o[s:s + m] += hp(noise(m, rng), fmin) * np.exp(-np.arange(m) / 70) * rng.uniform(.3, 1) * (1 - t / dur)
    return o


# ---------------------------------------------------------------- registry
SLOTS = {}
def slot(code, title, moment, anchors, x_db, win=(2.2, 3.8), ref=None, peak_db=None):
    """anchors: song times of the events in the preview. x_db: SFX loudness under the song's local RMS."""
    SLOTS[code] = dict(code=code, title=title, moment=moment, anchors=anchors, x_db=x_db, win=win, ref=ref, peak_db=peak_db, cands=[])
def cand(code, i, desc, src, make, kind):
    """kind: 'k' Kenney, 'kc' Kenney + synthesis, 's' synthesis. make(k) -> mono array for event k."""
    lic = {"k": "CC0 (Kenney.nl)", "kc": "CC0 (Kenney.nl) + original numpy synthesis", "s": "original numpy synthesis"}[kind]
    SLOTS[code]["cands"].append(dict(id=f"{code}{i}", desc=desc, src=src, make=make, lic=lic))

# ================================================================ A fight impact: one per bar on the riff
slot("A", "Fight impact", "Phase-1 riff (19.5-49.2 s): the hero party strikes Vorathul, one sword / pipe-wing hit per bar. Preview: three measured riff hits (19.55, 20.85, 23.44 s).",
     [19.55, 20.85, 23.44], 12.0, win=(1.0, 2.5))
def pickk(base, k, n=5): return L("impact-sounds", f"{base}_{k % n:03d}")
cand("A", 1, "Heavy metal clang, sword on armour", "Impact Sounds / impactMetal_heavy_000-002",
     lambda k: cut(lp(pickk("impactMetal_heavy", k, 3), 7000), .55), "k")
cand("A", 2, "Fist-weight thud with a metal ring (pipe strike)", "Impact Sounds / impactPunch_heavy_00x + impactMetal_light_00x",
     lambda k: cut(S(pickk("impactPunch_heavy", k) * .9, .5 * hp(pickk("impactMetal_light", k), 1500)), .5), "k")
cand("A", 3, "Plate hit plus a blade slice, comic slash", "Impact Sounds / impactPlate_heavy_00x + RPG Audio / knifeSlice, knifeSlice2",
     lambda k: cut(mix_at(pickk("impactPlate_heavy", k), .6 * L("rpg-audio", "knifeSlice2" if k % 2 else "knifeSlice")), .6), "k")
cand("A", 4, "Wooden club whack with a short metal edge", "Impact Sounds / impactWood_heavy_00x + Sci-Fi Sounds / impactMetal_002",
     lambda k: cut(S(pickk("impactWood_heavy", k), .4 * lp(L("sci-fi-sounds", "impactMetal_002"), 5000)), .5), "k")
def a5(k):
    rng = np.random.default_rng(10 + k); n = int(.4 * SR); t = tv(n)
    ring = sum(a * np.sin(2 * np.pi * f * (1 + .01 * k) * t) * np.exp(-t / d) for f, a, d in [(620, 1, .09), (1710, .7, .05), (3350, .5, .03), (5500, .3, .02)])
    return fadein(ring + hp(noise(n, rng), 2000) * np.exp(-t / .012) * 1.2 + fit(thump(160, 70, .15, .04), n))
cand("A", 5, "Synth clang: inharmonic metal ring, noise crack, low thump (very short, not tonal)", "Original numpy synthesis", a5, "s")

# ================================================================ B Vorathul's heavy landing
slot("B", "Heavy body impact / meteor landing", "Phase 3 in verse 1: Vorathul slams down / a meteor lands (measured hit 56.64 s).",
     [56.64], 9.0, win=(2.0, 4.2))
cand("B", 1, "Deep explosion thud with a punch on top", "Sci-Fi Sounds / lowFrequency_explosion_000 + Impact Sounds / impactPunch_heavy_001",
     lambda k: cut(S(lp(load("sci-fi-sounds", "lowFrequency_explosion_000"), 500), .8 * lp(L("impact-sounds", "impactPunch_heavy_001"), 900)), 1.8, 60), "k")
def b2(k):
    rng = np.random.default_rng(21); n = int(1.8 * SR)
    d = fit(thump(95, 32, .6, .22), n); rumble = lp(noise(n, rng), 140) * expd(n, .5) * 2.0; deb = np.zeros(n)
    for s in rng.uniform(.12, 1.3, 14):
        i = int(s * SR); deb[i:i + 900] += bp(noise(900, rng), 300, 1800) * np.exp(-np.arange(900) / 180) * rng.uniform(.05, .25)
    return fadein(cut(d + rumble + deb + hp(noise(n, rng), 1200) * expd(n, .02) * .6, 1.8, 60), 1)
cand("B", 2, "Synth: falling sub thump, rumble and scattered debris", "Original numpy synthesis", b2, "s")
cand("B", 3, "Soft heavy body slam, slowed down", "Impact Sounds / impactSoft_heavy_002 + impactPlate_heavy_003 (varispeed 0.6-0.7)",
     lambda k: cut(mix_at(lp(vary(L("impact-sounds", "impactSoft_heavy_002"), .7), 900) * 1.4, lp(vary(L("impact-sounds", "impactPlate_heavy_003"), .6), 1400) * .6), 1.5, 60), "k")
cand("B", 4, "Crunchy low explosion, filtered dark", "Sci-Fi Sounds / explosionCrunch_000 (varispeed 0.6, low-passed) + synth sub",
     lambda k: cut(mix_at(lp(vary(L("sci-fi-sounds", "explosionCrunch_000"), .6), 1600), .9 * thump(70, 30, .7, .25)), 1.8, 60), "kc")
cand("B", 5, "Metal slam with a long boom tail", "Sci-Fi Sounds / impactMetal_004 (varispeed 0.5) + lowFrequency_explosion_001",
     lambda k: cut(mix_at(.8 * lp(vary(L("sci-fi-sounds", "impactMetal_004"), .5), 2500), .8 * lp(load("sci-fi-sounds", "lowFrequency_explosion_001"), 300)), 1.8, 60), "k")

# ================================================================ C freeze in the true silence
slot("C", "The freeze", "The only true silence, 78.3-78.8 s: the world stops. The effect starts at 78.3 and is gone before the next hit at 78.80. Gain is set against the song just before the silence.",
     [78.3], 8.0, win=(2.5, 3.5), ref=(75.6, 78.0))
def c1(k):
    rng = np.random.default_rng(31); n = int(.5 * SR); t = tv(n); f = 520 * np.exp(-t / .13) + 30
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 - t / .5) ** .7 * .5
    return fadein(cut(tone + bp(noise(n, rng), 800, 5000) * (1 - t / .5) * .2, .5, 40), 1)
cand("C", 1, "Record / tape stop: pitch falls away to nothing in half a second", "Original numpy synthesis", c1, "s")
def c2(k):
    rng = np.random.default_rng(32); pre = noise_sweep(int(.28 * SR), 300, 5000, rng, .4) * np.linspace(0, 1, int(.28 * SR)) ** 2
    hit = thump(110, 40, .3, .09) * 1.1 + fit(hp(noise(int(.3 * SR), rng), 3000) * expd(int(.3 * SR), .004) * .5, int(.3 * SR))
    return cut(mix_at(pre, hit, .28), .5, 30)
cand("C", 2, "Time stop: swelling suck-in, then one dead thump", "Original numpy synthesis", c2, "s")
cand("C", 3, "Force field powering down", "Sci-Fi Sounds / forceField_001 (varispeed 0.55, low-passed)",
     lambda k: cut(lp(vary(L("sci-fi-sounds", "forceField_001"), .55), 3500), .5, 80), "k")
def c4(k):
    x = lp(vary(L("sci-fi-sounds", "spaceEngineLow_002"), .6), 2500)[:int(.5 * SR)]; return cut(x * np.linspace(1, 0, len(x)) ** .8, .5, 20)
cand("C", 4, "Engine spooling down to silence", "Sci-Fi Sounds / spaceEngineLow_002 (varispeed 0.6) with a falling fade", c4, "k")
def c5(k):
    rng = np.random.default_rng(35); n = int(.5 * SR); t = tv(n)
    suck = noise_sweep(n, 7000, 250, rng, .4) * np.linspace(.2, 1, n) ** 1.5 * (1 - np.clip((t - .4) / .15, 0, 1))
    return cut(suck + fit(delay(thump(80, 35, .15, .05), .38), n), .5, 20)
cand("C", 5, "Vacuum: noise sucked downward, ends in a tiny boom", "Original numpy synthesis", c5, "s")

# ================================================================ D giant eraser
slot("D", "Giant eraser rub", "'Meteor Rain: removed' (word starts 86.96 s): a huge eraser scrubs the meteors out of the painting.",
     [86.96], 12.0, win=(1.5, 4.5))
def d1(k):
    rng = np.random.default_rng(41); n = int(2.2 * SR); t = tv(n)
    return cut(bp(noise(n, rng), 1800, 7500) * np.abs(np.sin(2 * np.pi * 1.9 * t * (1 + .2 * t))) ** .6 * np.minimum(1, t / .1) * np.clip((2.2 - t) / .35, 0, 1), 2.2, 30)
cand("D", 1, "Synth: broad band-passed scrub, four strokes", "Original numpy synthesis", d1, "s")
cand("D", 2, "Dragged cloth strokes, slowed", "RPG Audio / clothBelt2, cloth3 (varispeed 0.5, chained)",
     lambda k: cut(np.concatenate([lp(vary(L("rpg-audio", n_), .5), 6000) for n_ in ("clothBelt2", "cloth3", "clothBelt2")]), 2.2, 40), "k")
cand("D", 3, "Interface scrolls stretched into a rub", "Interface Sounds / scroll_001, scroll_003 (varispeed 0.45)",
     lambda k: cut(np.concatenate([vary(L("interface-sounds", n_), .45) for n_ in ("scroll_001", "scroll_003", "scroll_001")]), 2.2, 40), "k")
def d4(k):
    rng = np.random.default_rng(44); n = int(2.2 * SR); t = tv(n); stick = (np.sin(2 * np.pi * 70 * t) > 0).astype(float)
    body = lp(noise(n, rng), 2500) * (.5 + .5 * stick) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 1.6 * t)))
    return cut(body * np.minimum(1, t / .08) * np.clip((2.2 - t) / .3, 0, 1), 2.2, 30)
cand("D", 4, "Synth: rubbery stick-slip scrub, darker", "Original numpy synthesis", d4, "s")
cand("D", 5, "Drawknife and page scrapes under a scrub", "RPG Audio / drawKnife1, bookFlip1, drawKnife2 (varispeed 0.5)",
     lambda k: cut(np.concatenate([lp(vary(L("rpg-audio", n_), .5), 5000) for n_ in ("drawKnife1", "bookFlip1", "drawKnife2")]), 2.2, 40), "k")

# ================================================================ E health bar drag
slot("E", "Health bar drag", "'forty percent' (word 'forty' starts 85.80 s): the bar is dragged down by 40 %.", [85.8], 12.0, win=(1.4, 4.6))
cand("E", 1, "Slow scroll drag with a settle tick", "Interface Sounds / scroll_002 (varispeed 0.5) + tick_002",
     lambda k: cut(np.concatenate([lp(vary(L("interface-sounds", "scroll_002"), .5), 5000), .8 * load("interface-sounds", "tick_002")]), 1.2, 40), "k")
cand("E", 2, "Synth: a decelerating run of ticks (a gauge counting down)", "Original numpy synthesis",
     lambda k: cut(ticks(np.cumsum(np.linspace(.03, .09, 16)), np.random.default_rng(52), 3000, .005) * 1.4, 1.2), "s")
cand("E", 3, "Falling noise slide ending in a drop", "Interface Sounds / drop_002 + synth falling noise sweep",
     lambda k: cut(mix_at(.7 * noise_sweep(int(1.0 * SR), 5000, 700, np.random.default_rng(53), .4), vary(L("interface-sounds", "drop_002"), .8), .8), 1.2), "kc")
cand("E", 4, "Descending UI switch clicks", "UI Audio / switch5, switch9, switch13, switch20 (falling varispeed)",
     lambda k: cut(np.concatenate([fit(vary(L("ui-audio", n_), r), int(.2 * SR)) for n_, r in (("switch5", 1.3), ("switch9", 1.1), ("switch13", .95), ("switch20", .8), ("switch5", .65))]), 1.2), "k")
def e5(k):
    rng = np.random.default_rng(55); n = int(1.1 * SR)
    return cut(noise_sweep(n, 6000, 500, rng, .3) * np.linspace(.4, 1, n) * np.minimum(1, tv(n) / .05) + fit(ticks(np.cumsum(np.linspace(.05, .12, 9)), rng, 2000) * .8, n), 1.1)
cand("E", 5, "Synth: falling filtered whoosh with a few ticks", "Original numpy synthesis", e5, "s")

# ================================================================ F sticky note slap
slot("F", "Sticky note slap", "'Phase three: removed' (word 'removed' starts 90.88 s): a sticky note is slapped on the painting.", [90.88], 10.0, win=(1.8, 4.2))
cand("F", 1, "Soft slap with a paper snap", "Impact Sounds / impactSoft_medium_001 + synth paper noise",
     lambda k: cut(mix_at(L("impact-sounds", "impactSoft_medium_001"), hp(noise(int(.3 * SR), np.random.default_rng(61)), 3000) * expd(int(.3 * SR), .012) * .5), .35), "kc")
cand("F", 2, "Book placed on a desk", "RPG Audio / bookPlace2", lambda k: cut(L("rpg-audio", "bookPlace2"), .4), "k")
cand("F", 3, "Light plank smack, low-passed", "Impact Sounds / impactPlank_medium_002", lambda k: cut(lp(L("impact-sounds", "impactPlank_medium_002"), 4500), .35), "k")
def f4(k):
    rng = np.random.default_rng(64); n = int(.3 * SR)
    return fadein(bp(noise(n, rng), 900, 4500) * expd(n, .035) * 1.2 + fit(thump(220, 110, .08, .025), n))
cand("F", 4, "Synth: palm-on-paper slap (band noise plus short body thump)", "Original numpy synthesis", f4, "s")
cand("F", 5, "Leather drop, slapped flat", "RPG Audio / dropLeather", lambda k: cut(L("rpg-audio", "dropLeather"), .4), "k")

# ================================================================ G UI click / patch window opens
slot("G", "UI click / patch window opens", "Announcer 1: the dev opens the patch editor over the painting (measured hit 80.08 s).", [80.08], 13.0)
cand("G", 1, "Window open pop", "Interface Sounds / open_002", lambda k: cut(L("interface-sounds", "open_002"), .5), "k")
cand("G", 2, "Maximize blip, high-passed", "Interface Sounds / maximize_004", lambda k: cut(hp(L("interface-sounds", "maximize_004"), 400), .5), "k")
cand("G", 3, "Mouse click and release", "UI Audio / mouseclick1 + mouserelease1",
     lambda k: cut(np.concatenate([L("ui-audio", "mouseclick1"), np.zeros(int(.06 * SR)), L("ui-audio", "mouserelease1")]), .5), "k")
cand("G", 4, "Toggle plus soft confirmation", "Interface Sounds / toggle_002 + confirmation_002",
     lambda k: cut(np.concatenate([L("interface-sounds", "toggle_002"), .7 * L("interface-sounds", "confirmation_002")]), .6), "k")
cand("G", 5, "Synth: three crisp clicks", "Original numpy synthesis",
     lambda k: cut(ticks([0, .07, .13], np.random.default_rng(75), 1800, .006, [1, .7, .9]), .3), "s")

# ================================================================ H cork pop
slot("H", "Cork pop into a pipe", "'volume reduced' (word 'reduced' starts 146.28 s): a cork pops into a pipe mouth.", [146.28], 11.0, win=(2.0, 4.0))
def h1(k):
    rng = np.random.default_rng(81); n = int(.45 * SR); t = tv(n)
    pop = np.sin(2 * np.pi * np.cumsum(1100 * np.exp(-t / .02) + 180) / SR) * np.exp(-t / .03)
    return fadein(pop * .9 + bp(noise(n, rng), 350, 520) * np.exp(-t / .09) * 2.5 + hp(noise(n, rng), 3000) * np.exp(-t / .004) * .4)
cand("H", 1, "Synth: bottle-pop plus a hollow tube resonance (short ring)", "Original numpy synthesis", h1, "s")
cand("H", 2, "Wooden knock with a plucked tail, pitched down", "Impact Sounds / impactWood_light_001 + Interface Sounds / pluck_001 (varispeed 0.6)",
     lambda k: cut(mix_at(L("impact-sounds", "impactWood_light_001"), .5 * vary(L("interface-sounds", "pluck_001"), .6)), .45), "k")
cand("H", 3, "Tin pipe thunk", "Impact Sounds / impactTin_medium_001 (varispeed 0.8, low-passed)",
     lambda k: cut(lp(vary(L("impact-sounds", "impactTin_medium_001"), .8), 3500), .45), "k")
cand("H", 4, "Bubbly interface drop", "Interface Sounds / drop_003 (varispeed 1.2)", lambda k: cut(vary(L("interface-sounds", "drop_003"), 1.2), .4), "k")
cand("H", 5, "Plank pop with a dry click", "Impact Sounds / impactPlank_medium_000 (varispeed 1.3) + UI Audio / click3",
     lambda k: cut(mix_at(lp(vary(L("impact-sounds", "impactPlank_medium_000"), 1.3), 3000), .6 * L("ui-audio", "click3")), .4), "k")

# ================================================================ I canvas crack, escalating
def isize(k): return [.3, .5, .75, 1.0][min(k, 3)]
slot("I", "Canvas crack (build)", "Build, awareness step 4: one crack per downbeat, each larger. Preview: the last four downbeats before the breakout (217.52, 218.81, 220.09, 221.38 s).",
     [217.52, 218.81, 220.09, 221.38], 13.0, win=(1.0, 2.8))
GL = ["impactGlass_light_000", "impactGlass_medium_001", "impactGlass_medium_003", "impactGlass_heavy_000"]
cand("I", 1, "Glass cracks, light to heavy", "Impact Sounds / impactGlass_light_000, medium_001, medium_003, heavy_000",
     lambda k: cut(hp(L("impact-sounds", GL[min(k, 3)]), 600) * (.4 + .6 * isize(k)), .4 + .5 * isize(k)), "k")
cand("I", 2, "Synth: branching crackle of ticks, longer as it grows", "Original numpy synthesis",
     lambda k: cut(crackle(isize(k), 90 + k) * (.4 + .6 * isize(k)), .2 + .6 * isize(k)), "s")
cand("I", 3, "Canvas strain: creak, then a snap", "RPG Audio / creak1-3 (varispeed) + Impact Sounds / impactWood_light_00x",
     lambda k: cut(np.concatenate([lp(vary(L("rpg-audio", f"creak{1 + k % 3}"), 1.1 + .1 * k), 4000) * .5, L("impact-sounds", f"impactWood_light_00{k % 5}") * (.5 + .5 * isize(k))]), .5 + .5 * isize(k), 40), "k")
cand("I", 4, "Plate crack, sharp, with a glitch edge", "Impact Sounds / impactPlate_light_00x (high-passed) + Interface Sounds / glitch_001-004",
     lambda k: cut(mix_at(hp(pickk("impactPlate_light", k), 1500) * (.4 + .6 * isize(k)), .4 * isize(k) * L("interface-sounds", f"glitch_00{1 + k % 4}")), .3 + .3 * isize(k)), "k")
def i5(k):
    rng = np.random.default_rng(95 + k); s = isize(k); n = int((.3 + .5 * s) * SR)
    return fadein(cut(noise_sweep(n, 9000, 2500, rng, .4) * expd(n, .15) * .5 * (.4 + .6 * s) + fit(crackle(s, 95 + k), n) * (.5 + .5 * s), .3 + .5 * s))
cand("I", 5, "Synth: ice-like crack, falling sweep plus ticks", "Original numpy synthesis", i5, "s")

# ================================================================ J breakout shatter: the one big blast
slot("J", "Frame / canvas shatter (the big blast)", "3:42.7 (222.67 s): Vorathul bursts through the frame. The ONE big blast: its peak is set to -3 dBFS; every other slot stays 8-14 dB under the song.",
     [222.67], 0.0, win=(1.5, 4.5), peak_db=-3.0)
cand("J", 1, "Heavy glass shatter with a deep boom", "Impact Sounds / impactGlass_heavy_001, 002 + Sci-Fi Sounds / lowFrequency_explosion_000",
     lambda k: cut(mix_at(mix_at(L("impact-sounds", "impactGlass_heavy_001"), .8 * L("impact-sounds", "impactGlass_heavy_002"), .05), 1.2 * lp(load("sci-fi-sounds", "lowFrequency_explosion_000"), 400)), 2.6, 80), "k")
def j2(k):
    x = L("sci-fi-sounds", "explosionCrunch_002")
    for n_, o in (("glass_002", .1), ("glass_004", .35), ("glass_006", .6), ("glass_002", .9)):
        x = mix_at(x, .8 * hp(L("interface-sounds", n_), 1000), o)
    return cut(x, 2.6, 80)
cand("J", 2, "Explosion crunch with a glass sparkle shower", "Sci-Fi Sounds / explosionCrunch_002 + Interface Sounds / glass_002, 004, 006", j2, "k")
def j3(k):
    rng = np.random.default_rng(103); n = int(2.6 * SR); t = tv(n)
    burst = hp(noise(n, rng), 1500) * np.exp(-t / .25) + lp(noise(n, rng), 600) * np.exp(-t / .5) * 1.4
    shards = np.zeros(n)
    for s in rng.uniform(.05, 1.8, 90):
        i = int(s * SR); shards[i:i + 900] += hp(noise(900, rng), 3500) * np.exp(-np.arange(900) / 120) * rng.uniform(.05, .35) * np.exp(-s / .9)
    return fadein(cut(burst + fit(thump(80, 28, 1.2, .35, 1.6), n) + shards, 2.6, 100), 1)
cand("J", 3, "Synth: full-band burst, sub boom and 90 falling shards", "Original numpy synthesis", j3, "s")
cand("J", 4, "Glass plus metal slam, tight and loud", "Impact Sounds / impactGlass_heavy_000 + impactMetal_heavy_003 + Sci-Fi Sounds / lowFrequency_explosion_001",
     lambda k: cut(S(L("impact-sounds", "impactGlass_heavy_000"), .9 * L("impact-sounds", "impactMetal_heavy_003"), lp(load("sci-fi-sounds", "lowFrequency_explosion_001"), 300)), 2.2, 80), "k")
def j5(k):
    ff = lp(load("sci-fi-sounds", "forceField_003"), 4000)[::-1][-int(.4 * SR):] * .6
    return cut(mix_at(ff, S(L("sci-fi-sounds", "explosionCrunch_004"), .8 * L("impact-sounds", "impactGlass_heavy_003")), .4), 2.8, 80)
cand("J", 5, "Suck-in then blast: reversed force field into crunch and glass", "Sci-Fi Sounds / forceField_003 (reversed) + explosionCrunch_004 + Impact Sounds / impactGlass_heavy_003", j5, "k")

# ================================================================ K SKIP button
slot("K", "SKIP button press", "Announcer 2: 'can now be skipped' (word 'skipped.' starts 142.66 s): the SKIP button is pressed on his cutscene.", [142.66], 12.0)
cand("K", 1, "Mouse click, crisp", "UI Audio / mouseclick1", lambda k: cut(L("ui-audio", "mouseclick1"), .25), "k")
cand("K", 2, "Selection tick", "Interface Sounds / select_004", lambda k: cut(L("interface-sounds", "select_004"), .3), "k")
cand("K", 3, "Synth: plastic button down-up click", "Original numpy synthesis",
     lambda k: cut(fit(ticks([0, .055], np.random.default_rng(113), 1500, .006, [1, .6]) * 1.2, int(.25 * SR)) + fit(thump(500, 160, .04, .015), int(.25 * SR)) * .5, .25), "s")
cand("K", 4, "Switch flick", "UI Audio / switch18", lambda k: cut(L("ui-audio", "switch18"), .3), "k")
cand("K", 5, "Metal click, heavy-handed", "RPG Audio / metalClick", lambda k: cut(L("rpg-audio", "metalClick"), .3), "k")

# ================================================================ L keyboard typing for the end card
GAPS = [.11, .09, .12, .1, .1, .22, .1, .09, .1, .21, .11, .1, .09, .12, .1]   # "Patch 2.6 notes:" 16 keys, longer at the two spaces
KEYT = np.concatenate([[0], np.cumsum(GAPS)])
slot("L", "Keyboard typing: end card", "Outro: 'Patch 2.6 notes:' types out and is cut off (starts ~271.75 s, 16 keystrokes over 1.6 s; the song ends at 273.84 s).",
     [271.75], 14.0, win=(4.0, 99), ref=(271.7, 272.3))
def typing(keyfn, seed):
    rng = np.random.default_rng(seed); n = int((KEYT[-1] + .4) * SR); o = np.zeros(n)
    for i, t in enumerate(KEYT):
        s = int((t + rng.uniform(0, .008)) * SR); a = keyfn(i, rng) * rng.uniform(.7, 1.0)
        o[s:s + len(a)] += a[:n - s]
    return o
def l_ui(i, rng): return L("ui-audio", f"click{1 + i % 5}")
def l_tick(i, rng): return hp(L("interface-sounds", ["tick_001", "tick_002", "tick_004"][i % 3]), 800)
def l_syn(i, rng):
    m = int(.07 * SR); return fadein(bp(noise(m, rng), 1500, 6000) * np.exp(-tv(m) / .006) + fit(thump(260 + 40 * rng.random(), 120, .03, .01), m) * .6, 1)
def l_type(i, rng): return mix_at(L("rpg-audio", "metalClick") * .6, lp(L("impact-sounds", f"impactPlate_light_00{i % 5}"), 1500) * .5)
def l_soft(i, rng): return mix_at(lp(L("impact-sounds", f"impactSoft_medium_00{i % 5}"), 2500) * .6, .4 * l_tick(i, rng))
cand("L", 1, "Mouse-click keycaps", "UI Audio / click1-5", lambda k: typing(l_ui, 121), "k")
cand("L", 2, "Thin ticks, laptop keyboard", "Interface Sounds / tick_001, tick_002, tick_004 (high-passed)", lambda k: typing(l_tick, 122), "k")
cand("L", 3, "Synth: mechanical key clacks (noise click plus thud)", "Original numpy synthesis", lambda k: typing(l_syn, 123), "s")
cand("L", 4, "Typewriter-ish metal clicks", "RPG Audio / metalClick + Impact Sounds / impactPlate_light_00x", lambda k: typing(l_type, 124), "k")
cand("L", 5, "Soft membrane keys", "Impact Sounds / impactSoft_medium_00x (low-passed) + Interface Sounds / tick", lambda k: typing(l_soft, 125), "k")

# ================================================================ M error / notification blip for the announcer cards
slot("M", "Announcer card blip", "Announcer 2's patch card appears (measured hit 138.48 s, 'two point four'); the same blip can open cards 1 (77.76 s) and 3 (244.02 s).", [138.48], 13.0)
cand("M", 1, "Short error beep", "Interface Sounds / error_004", lambda k: cut(L("interface-sounds", "error_004"), .4), "k")
cand("M", 2, "Soft question chime", "Interface Sounds / question_002", lambda k: cut(L("interface-sounds", "question_002"), .4), "k")
def m3(k):
    o = np.zeros(int(.3 * SR))
    for f, s in ((1250, 0), (940, int(.1 * SR))):
        m = int(.08 * SR); o[s:s + m] += np.sin(2 * np.pi * f * tv(m)) * np.hanning(m)
    return o
cand("M", 3, "Synth: two-note descending notification blip (80 ms each)", "Original numpy synthesis", m3, "s")
cand("M", 4, "Short error buzz with a glitch tick", "Interface Sounds / error_002 + glitch_001", lambda k: cut(mix_at(L("interface-sounds", "error_002"), L("interface-sounds", "glitch_001"), .2), .4), "k")
cand("M", 5, "Bright confirmation ping", "Interface Sounds / confirmation_003", lambda k: cut(L("interface-sounds", "confirmation_003"), .4), "k")


# ---------------------------------------------------------------- rendering
# Level rule: SFX loudest 150 ms RMS = song 0.6 s RMS at that spot minus the slot x_db; SFX peak capped at -10 dBFS (J: -3 dBFS).
def vd(path, a=None, b=None):
    cmd = ["ffmpeg", "-hide_banner", "-nostats"]
    if a is not None: cmd += ["-ss", f"{a:.3f}", "-t", f"{b - a:.3f}"]
    r = subprocess.run(cmd + ["-i", path, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    g = lambda key: float(r.split(key)[1].split(" dB")[0])
    return g("mean_volume: "), g("max_volume: ")

def song_rms(a, b): return rms_db(song[int(a * SR):int(b * SR)])

def build_track(sl, c):
    """All events of the candidate laid out at their real spacing; returns (track, anchor index of first event)."""
    evs = []
    for k, t in enumerate(sl["anchors"]):
        x = np.asarray(c["make"](k), float); evs.append((t - sl["anchors"][0], x, 0 if sl["code"] == "L" else env_peak(x)))
    lead = max(a for _, _, a in evs); n = int(lead + max(t * SR + len(x) - a for t, x, a in evs)) + 1
    tr = np.zeros(n)
    for t, x, a in evs:
        s = int(t * SR) + lead - a; tr[s:s + len(x)] += x
    return tr, lead

def render(sl, c):
    tr, lead = build_track(sl, c)
    alone = norm(tr, -6.0)
    # loudest 150 ms of the candidate (so clicks are not diluted by silence) is matched to the song's 0.6 s RMS there
    w = int(.15 * SR); hop = int(.05 * SR)
    spans = [(i, rms_db(alone[i:i + w])) for i in range(0, max(1, len(alone) - w), hop)] or [(0, rms_db(alone))]
    i0, sfx_db = max(spans, key=lambda s: s[1])
    t0 = sl["anchors"][0] + (i0 - lead) / SR
    if sl["ref"]: ref_db = song_rms(*sl["ref"])
    else: ref_db = song_rms(max(0, t0), min(len(song) / SR, t0 + .6))
    if sl["peak_db"] is not None: gain = sl["peak_db"] + 6.0       # alone file peaks at -6 dBFS
    else: gain = min(ref_db - sl["x_db"] - sfx_db, -10.0 + 6.0)    # never above -10 dBFS peak
    end = len(song) / SR
    a = max(0.0, sl["anchors"][0] - sl["win"][0]); b = min(end, sl["anchors"][-1] + sl["win"][1])
    if sl["code"] == "L": b = end; a = end - 6.0
    seg = song_st[int(a * SR):int(b * SR)].copy(); m = seg.copy()
    s = int((sl["anchors"][0] - a) * SR) - lead
    add = alone * 10 ** (gain / 20); lo = max(0, -s); hi = min(len(add), len(m) - s)
    m[s + lo:s + hi] += add[lo:hi, None]
    return dict(alone=alone, gain=gain, a=a, b=b, seg=seg, mix=m, ref_db=ref_db, sfx_db=sfx_db, lead=lead, t0=t0, dur=len(tr) / SR)

def main():
    os.makedirs(OUT, exist_ok=True)
    manifest, meas = [], []
    for sl in SLOTS.values():
        for c in sl["cands"]:
            r = render(sl, c)
            wav = f"{c['id']}.wav"; mp3 = f"{c['id']}-song.mp3"
            sf.write(f"{OUT}/{wav}", r["alone"], SR, subtype="PCM_16")
            mixw, sngw = f"{TMP}/{c['id']}_mix.wav", f"{TMP}/{c['id']}_song.wav"
            sf.write(mixw, r["mix"], SR, subtype="FLOAT"); sf.write(sngw, r["seg"], SR, subtype="FLOAT")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mixw, "-codec:a", "libmp3lame", "-b:a", "128k", f"{OUT}/{mp3}"], check=True)
            ea = max(0.0, sl["anchors"][0] - r["a"] - .05); eb = min(r["b"] - r["a"], sl["anchors"][0] - r["a"] + r["dur"] - r["lead"] / SR + .05)
            mm, mx = vd(mixw, ea, eb); sm, smx = vd(sngw, ea, eb); _, mxw = vd(mixw)
            manifest.append(dict(id=c["id"], slot=sl["code"], desc=c["desc"], source=c["src"], licence=c["lic"], anchor_s=sl["anchors"][0],
                                 anchors_s=sl["anchors"], preview_window_s=[round(r["a"], 2), round(r["b"], 2)], gain_db=round(r["gain"], 1),
                                 target=(f"peak {sl['peak_db']} dBFS" if sl["peak_db"] is not None else f"{sl['x_db']} dB under song local RMS"),
                                 wav=wav, preview=mp3, duration_s=round(r["dur"], 2)))
            meas.append(dict(id=c["id"], event_mean_song=sm, event_mean_mix=mm, delta_mean=round(mm - sm, 1), event_max_song=smx, event_max_mix=mx, excerpt_max_mix=mxw))
            print(f"{c['id']:3s} gain {r['gain']:6.1f} dB | event mean song {sm:6.1f} mix {mm:6.1f} (+{mm - sm:.1f}) | max song {smx:5.1f} mix {mx:5.1f} | excerpt max {mxw:5.1f}")
    json.dump(manifest, open(f"{OUT}/manifest.json", "w"), indent=1)
    json.dump(meas, open(f"{OUT}/_measurements.json", "w"), indent=1)
    write_page(manifest, {m["id"]: m for m in meas}); write_sources(manifest)
    shutil.rmtree(TMP, ignore_errors=True)


PAGE_CSS = """
:root{--bg:#F4F1EA;--ink:#1c1a24;--mut:#5f5b70;--card:#fbf9f3;--line:#d9d3c4;--acc:#7a2fc2}
@media (prefers-color-scheme:dark){:root{--bg:#14121c;--ink:#efeaf7;--mut:#a9a2bd;--card:#1e1b2b;--line:#342f48;--acc:#c79bff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:980px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:28px;margin:8px 0 4px}.sub{color:var(--mut);margin:0 0 16px}
nav{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 28px;position:sticky;top:0;background:var(--bg);padding:8px 0}
nav a{padding:3px 10px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--ink);font-weight:600}
section{margin:0 0 36px}h2{font-size:21px;margin:0 0 2px}h2 span{color:var(--acc)}.when{margin:0 0 12px;font-size:14px;color:var(--mut)}
.c{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:0 0 10px}
.c h3{margin:0;font-size:17px}.c h3 b{color:var(--acc);margin-right:6px}.s{font-size:12.5px;color:var(--mut);margin:2px 0 8px}
.p{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px 14px}.p label{display:block;font-size:12.5px;color:var(--mut);margin:0 0 2px}audio{width:100%;height:36px}
.m{font-size:12px;color:var(--mut);margin-top:2px}
"""

def write_page(manifest, meas):
    h = ['<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
         '<title>Vorathul Nerfed - sound effect candidates</title><style>' + PAGE_CSS + '</style></head><body><main>',
         '<h1>Sound effect candidates</h1><p class="sub">Two players per candidate: <b>alone</b>, and <b>in the song</b> (about 6 s around the moment, candidate mixed at its gain). '
         'Reply with ids, e.g. "A2 B5 C1 ...". Sources and licences: SOURCES.md (Kenney CC0 + own synthesis). The song is heavily compressed, so effects sit 8-14 dB under it; only J is a full blast.</p><nav>']
    h += [f'<a href="#{s["code"]}">{s["code"]}</a>' for s in SLOTS.values()]
    h.append('</nav>')
    for s in SLOTS.values():
        h.append(f'<section id="{s["code"]}"><h2><span>{s["code"]}</span> &middot; {html.escape(s["title"])}</h2><p class="when">{html.escape(s["moment"])}</p>')
        for m in [m for m in manifest if m["slot"] == s["code"]]:
            q = meas[m["id"]]
            h.append(f'<div class="c"><h3><b>{m["id"]}</b>{html.escape(m["desc"])}</h3><p class="s">Source: {html.escape(m["source"])}</p><div class="p">'
                     f'<div><label>Alone ({m["duration_s"]} s)</label><audio controls preload="none" src="{m["wav"]}"></audio></div>'
                     f'<div><label>In the song at {m["anchor_s"]} s</label><audio controls preload="none" src="{m["preview"]}"></audio>'
                     f'<div class="m">Gain {m["gain_db"]:+.1f} dB on the alone file ({html.escape(m["target"])}); event mean {q["delta_mean"]:+.1f} dB over the song, excerpt peak {q["excerpt_max_mix"]:.1f} dBFS.</div></div></div></div>')
        h.append('</section>')
    h.append('</main></body></html>')
    open(f"{OUT}/index.html", "w", encoding="utf-8").write("\n".join(h))

def write_sources(manifest):
    packs = {"Impact Sounds": "https://kenney.nl/assets/impact-sounds", "Interface Sounds": "https://kenney.nl/assets/interface-sounds",
             "UI Audio": "https://kenney.nl/assets/ui-audio", "RPG Audio": "https://kenney.nl/assets/rpg-audio", "Sci-Fi Sounds": "https://kenney.nl/assets/sci-fi-sounds"}
    L_ = ["# SFX sources and licences", "",
          "All Kenney.nl packs are CC0 1.0 (public domain), no attribution required, https://creativecommons.org/publicdomain/zero/1.0/ (License.txt in each pack).",
          "Packs used (downloaded 2026-10-20 into the gitignored `sfx/_kenney/`):", ""]
    L_ += [f"- {k}: {v}" for k, v in packs.items()]
    L_ += ["", "Synthesized parts: generated by `tools/sfx/sfx_candidates.py` (numpy), original, no licence encumbrance.", "",
           "Song excerpts in `*-song.mp3` are cut from the project's own track for audition only (the song itself is not committed).", "",
           "| Candidate | Source (file / synthesis) | Licence |", "|---|---|---|"]
    L_ += [f"| {m['id']} | {m['source']} | {m['licence']} |" for m in manifest]
    open(f"{OUT}/SOURCES.md", "w", encoding="utf-8").write("\n".join(L_) + "\n")


if __name__ == "__main__":
    main()
