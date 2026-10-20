"""Sound-effect candidates + in-song excerpts + listening page for 'Her Sabah Bastan'.

Run:  uv run --with numpy --with scipy --with soundfile python tools/sfx/sfx_candidates.py
Needs the Kenney CC0 packs unzipped under KENNEY_DIR (env var), one dir per pack:
  impact-sounds interface-sounds ui-audio digital-audio rpg-audio sci-fi-sounds
(URLs are in sfx/candidates/SOURCES.md). Never modifies the song; only reads it.
"""
import os, re, json, subprocess, bisect, tempfile, shutil
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
ROOT = (Path(__file__).resolve().parents[3] / "her-sabah-bastan").as_posix()
SONG = f"{ROOT}/sarki/her-sabah-bastan.wav"
OUT = f"{ROOT}/sfx/candidates"
KEN = os.environ["KENNEY_DIR"]
TMP = tempfile.mkdtemp(prefix="sfxtmp_", dir=os.environ.get("SFX_TMP", None))
T = json.load(open(f"{ROOT}/data/timing.json"))
BEATS, DOWN = T["beats"], T["downbeats"]

PCS = {"F": 87.3071, "C": 65.4064, "G#": 103.826, "D#": 77.7817}   # octave-2 reference per pitch class

song, _sr = sf.read(SONG, always_2d=True)
assert _sr == SR and song.shape[1] == 2


# ---------------------------------------------------------------- helpers
def nearest(arr, t): return min(arr, key=lambda x: abs(x - t))
def down_after(t, k=0):
    i = bisect.bisect_left(DOWN, t - 1e-6); return DOWN[i + k]
def beat_idx(t): return min(range(len(BEATS)), key=lambda i: abs(BEATS[i] - t))

_cache = {}
def load(pack, name):
    key = (pack, name)
    if key in _cache: return _cache[key].copy()
    p = f"{KEN}/{pack}/Audio/{name}.ogg"
    tmp = f"{TMP}/_l.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", p, "-ac", "2", "-ar", str(SR), tmp], check=True)
    x, _ = sf.read(tmp, always_2d=True); _cache[key] = x; return x.copy()

def mono(x): return x.mean(1) if x.ndim == 2 else x
def st(x):
    x = np.asarray(x, float)
    return np.stack([x, x], 1) if x.ndim == 1 else x
def sos(kind, f, order=4):
    return butter(order, f, btype=kind, fs=SR, output="sos")
def lp(x, f): return sosfilt(sos("low", f), x, axis=0)
def hp(x, f): return sosfilt(sos("high", f), x, axis=0)
def bp(x, lo, hi): return sosfilt(sos("band", [lo, hi], 2), x, axis=0)
def db(x): return 20 * np.log10(max(x, 1e-12))
def peak(x): return float(np.max(np.abs(x)))
def tvec(n): return np.arange(n) / SR
def fade(x, a=0.002, b=0.01):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)[:, None]
    if nb: x[-nb:] *= np.linspace(1, 0, nb)[:, None]
    return x
def pad_to(x, n):
    return x[:n] if len(x) >= n else np.vstack([x, np.zeros((n - len(x), 2))])
def vary(x, r):
    """Varispeed (pitch+speed) by ratio r."""
    n = int(len(x) / r); pos = np.arange(n) * r
    return np.stack([np.interp(pos, np.arange(len(x)), x[:, c]) for c in range(2)], 1)
def trim_lead(x, thr_db=-55):
    m = np.abs(mono(x)); i = np.argmax(m > peak(x) * 10 ** (thr_db / 20)); return x[i:]
def trim_tail(x, thr_db=-50):
    m = np.abs(mono(x)); idx = np.where(m > peak(x) * 10 ** (thr_db / 20))[0]; return x[:idx[-1] + 1]
def f0_of(x, lo=100, hi=4000):
    m = mono(x)[:int(0.4 * SR)]
    n = 1 << 16; sp = np.abs(np.fft.rfft(m * np.hanning(len(m)), n)); f = np.fft.rfftfreq(n, 1 / SR)
    msk = (f > lo) & (f < hi); return f[msk][np.argmax(sp[msk])]
def tune(x, pc, lo=100, hi=4000):
    """Varispeed so the dominant partial lands on the nearest pitch of class pc."""
    f = f0_of(x, lo, hi); base = PCS[pc]
    k = round(np.log2(f / base)); target = base * 2 ** k
    return vary(x, target / f)
def norm(x, peak_db=-3.0): return x * (10 ** (peak_db / 20) / (peak(x) or 1))
def env_peak_idx(x, win=0.01):
    m = np.abs(mono(x)); n = max(1, int(win * SR)); e = np.convolve(m, np.ones(n) / n, "same"); return int(np.argmax(e))
def noise(n, rng): return np.stack([rng.standard_normal(n), rng.standard_normal(n)], 1)
def swell(n, p=2.0): return (np.arange(n) / n) ** p
def mix_at(base, add, at):
    n = max(len(base), at + len(add)); o = np.zeros((n, 2)); o[:len(base)] += base; o[at:at + len(add)] += add; return o

def noise_sweep(n, f0, f1, rng, q=0.35):
    out = np.zeros((n, 2)); seg = 1200; w = rng.standard_normal((n, 2))
    for i in range(0, n, seg):
        f = f0 * (f1 / f0) ** (i / n)
        out[i:i + seg] = sosfilt(butter(2, [f * (1 - q), min(f * (1 + q), 20000)], btype="band", fs=SR, output="sos"), w[i:i + seg], axis=0)
    return out

def sine_ping(f, dur, tau, amp=1.0, att=0.002):
    t = tvec(int(dur * SR)); e = np.exp(-t / tau); e[:int(att * SR)] *= np.linspace(0, 1, int(att * SR))
    return st(amp * np.sin(2 * np.pi * f * t) * e)

PENTA = [5, 7, 9, 0, 2]   # F major pentatonic pitch classes F G A C D (semitone offsets handled below)
def penta_freqs(lo_oct=6, n=9):
    """F-major-pentatonic frequencies from F6 up (F G A C D)."""
    names = [0, 2, 4, 7, 9]; f = 87.3071 * 2 ** (lo_oct - 2); out = []
    for o in range(3):
        for s in names: out.append(f * 2 ** ((s + 12 * o) / 12))
    return out[:n + 6]

# ---------------------------------------------------------------- candidate registry
EVENTS = []   # filled below


def cand(ev, cid, desc, src, make, contexts, x_db):
    ev["cands"].append(dict(id=cid, desc=desc, src=src, make=make, contexts=contexts, x_db=x_db))


def mk_event(code, title, scene, when):
    e = dict(code=code, title=title, scene=scene, when=when, cands=[]); EVENTS.append(e); return e


def ctx(name, times, pc="F", win=None, pad=(2.0, 4.0), anchor_mode=None):
    return dict(name=name, times=times, pc=pc, win=win or (times[0] - pad[0], times[-1] + pad[1]), anchor_mode=anchor_mode)


# ================================================================ A cursor tick
EA = mk_event("A", "İmleç yanıp sönme tiki", "Giriş: lacivert boşluk, yanıp sönen imleç (0:00–0:15.6)", "0:02–0:08, 2 vuruşta bir")
a_times = [BEATS[i] for i in range(4, 20, 2) if BEATS[i] < 7.9]
A_ctx = [ctx("0:01.4–0:07.9 (imleç tikleri)", a_times, win=(1.4, 7.9))]
rngA = np.random.default_rng(11)
cand(EA, "A1", "Çok kısa, kuru Kenney tiki (hafif yumuşatılmış)", "Kenney Interface Sounds / tick_001 (CC0)",
     lambda pc, i: lp(trim_lead(load("interface-sounds", "tick_001")), 5000) * 1.0, A_ctx, 15)
cand(EA, "A2", "Biraz daha dolgun Kenney tiki, yumuşak", "Kenney Interface Sounds / tick_004 (CC0)",
     lambda pc, i: lp(trim_lead(load("interface-sounds", "tick_004")), 4500), A_ctx, 15)
cand(EA, "A3", "Klavye benzeri küçük tık, alçak geçirgen", "Kenney Interface Sounds / click_003 (CC0)",
     lambda pc, i: lp(trim_lead(load("interface-sounds", "click_003")), 3500), A_ctx, 15)
cand(EA, "A4", "Fare tıkı, çok yumuşak ve kısa", "Kenney UI Audio / mouseclick1 (CC0)",
     lambda pc, i: lp(trim_lead(load("ui-audio", "mouseclick1")), 3000) * 0.8, A_ctx, 15)
cand(EA, "A5", "Sentez: F6 tonlu minik 'pıt' (şarkı anahtarında)", "Sentez (sine 1397 Hz, 30 ms)",
     lambda pc, i: sine_ping(1396.9, 0.06, 0.012, 1.0, 0.001), A_ctx, 15)

# ================================================================ B bubble pop
EB = mk_event("B", "'Merhaba' balonu patlaması", "Giriş sonu: ritim girince imleç ilk 'Merhaba' balonunu açar (0:15.6); kapanışta tekrar (~3:55)", "0:15.6 ve ~3:55 (3:55.2 vuruşu)")
b_open = 15.6048; b_close = nearest(BEATS, 235.0)
B_ctx = [ctx("0:15.6 açılış (Fa ayarlı)", [b_open], "F", win=(b_open - 2, b_open + 4)),
         ctx("3:55 kapanış (Do ayarlı)", [b_close], "C", win=(b_close - 2, b_close + 4))]
def bubble(pc, i, f_top=None):
    base = PCS[pc] * 8                       # 8th octave above ref octave 2 -> F5 / C5
    n = int(0.28 * SR); t = tvec(n)
    f = base * (0.72 + 0.28 * (1 - np.exp(-t / 0.035)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    e = np.exp(-t / 0.06); e[:int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))
    return st(np.sin(ph) * e + 0.25 * np.sin(2 * ph) * np.exp(-t / 0.03))
cand(EB, "B1", "Sentez: yukarı kayan sabun balonu 'blup' (F5/C5 ayarlı)", "Sentez (glissando sine)", bubble, B_ctx, 11)
cand(EB, "B2", "Kenney damla, anahtara perdelendi", "Kenney Interface Sounds / drop_002 (CC0), perde: F/C",
     lambda pc, i: tune(trim_lead(load("interface-sounds", "drop_002")), pc, 300, 3000), B_ctx, 11)
cand(EB, "B3", "Kenney 'pluck' pop, anahtara perdelendi", "Kenney Interface Sounds / pluck_001 (CC0), perde: F/C",
     lambda pc, i: tune(trim_lead(load("interface-sounds", "pluck_001")), pc, 300, 3000), B_ctx, 11)
cand(EB, "B4", "Kenney 'bong' yumuşak çan-pop, anahtara perdelendi", "Kenney Interface Sounds / bong_001 (CC0), perde: F/C",
     lambda pc, i: tune(trim_lead(load("interface-sounds", "bong_001")), pc, 300, 3000), B_ctx, 11)
cand(EB, "B5", "Kenney onay sesi, balon gibi kısaltılmış, anahtara perdelendi", "Kenney Interface Sounds / confirmation_001 (CC0), perde: F/C",
     lambda pc, i: fade(tune(trim_lead(load("interface-sounds", "confirmation_001")), pc, 300, 3000)[:int(0.25 * SR)], 0.002, 0.08), B_ctx, 11)

# ================================================================ C paper whoosh + pin tap
EC = mk_event("C", "Camdan geçen kâğıt notu + raptiye tıkı", "Dize 1: insanın yazdığı her cümle kâğıt not olur, camdan geçer; yapay zekâ duvara iğneler (0:15.6–0:43.7)", "0:21.2 ve 0:23.1 (aşağı vuruşlar)")
c1, c2 = down_after(21.2335), down_after(21.2335, 1)
C_ctx = [ctx("0:19.8–0:25.8 (iki not)", [c1, c2], win=(19.8, 25.8))]
def whoosh_tap(wh, tap, lead=0.04, tap_gain=0.9):
    """Whoosh whose energy peak lands `lead` before the tap; tap at the end. anchor = tap time."""
    wi = env_peak_idx(wh, 0.03); tap_i = int((wi / SR + lead) * SR)
    o = np.zeros((max(tap_i + len(tap), len(wh)) + 100, 2)); o[:len(wh)] += wh; o[tap_i:tap_i + len(tap)] += tap * tap_gain
    return o, tap_i
def c_make(wh_fn, tap_fn, lead=0.04, tap_gain=0.9):
    return lambda pc, i: whoosh_tap(wh_fn(i), tap_fn(i), lead, tap_gain)
cand(EC, "C1", "Kâğıt çevirme + ince metal raptiye tıkı", "Kenney RPG Audio / bookFlip3 + Interface Sounds / click_001 (CC0)",
     c_make(lambda i: fade(trim_lead(load("rpg-audio", "bookFlip3")) * 0.9), lambda i: hp(trim_lead(load("interface-sounds", "click_001")), 800)), C_ctx, 11)
cand(EC, "C2", "Uzun kâğıt süpürme (scroll) + tahta tık", "Kenney Interface Sounds / scroll_002 + Impact Sounds / impactWood_light_000 (CC0)",
     c_make(lambda i: fade(hp(trim_lead(load("interface-sounds", "scroll_002"))[:int(0.6 * SR)], 400), 0.01, 0.15),
            lambda i: vary(trim_lead(load("impact-sounds", "impactWood_light_000")), 1.4)[:int(0.12 * SR)]), C_ctx, 11)
rngC = np.random.default_rng(5)
cand(EC, "C3", "Sentez: filtrelenmiş hava süpürmesi + fare tıkı", "Sentez (bant geçiren gürültü 1k→6k) + Kenney UI Audio / mouseclick1 (CC0)",
     c_make(lambda i: fade(noise_sweep(int(0.5 * SR), 1000, 6000, np.random.default_rng(5 + i)) * swell(int(0.5 * SR), 1.6)[:, None] * 6, 0.01, 0.03),
            lambda i: trim_lead(load("ui-audio", "mouseclick1"))), C_ctx, 11)
cand(EC, "C4", "Kumaş/kâğıt hışırtısı + ince plaka 'ting' raptiyesi", "Kenney RPG Audio / cloth2 + Impact Sounds / impactPlate_light_000 (CC0)",
     c_make(lambda i: fade(hp(trim_lead(load("rpg-audio", "cloth2")), 600)),
            lambda i: hp(vary(trim_lead(load("impact-sounds", "impactPlate_light_000")), 1.5)[:int(0.25 * SR)], 1500)), C_ctx, 11)
cand(EC, "C5", "Keskin bıçak savrulması (kâğıt kesme gibi) + seçim tıkı", "Kenney RPG Audio / knifeSlice2 + Interface Sounds / select_001 (CC0)",
     c_make(lambda i: fade(lp(trim_lead(load("rpg-audio", "knifeSlice2")), 6000) * 0.8),
            lambda i: trim_lead(load("interface-sounds", "select_001"))), C_ctx, 11)

# ================================================================ D white wave wipe
ED = mk_event("D", "Beyaz dalga silmesi", "Nakarat 1: her ölçüde bir beyaz dalga yapay zekâ odasını siler (0:56.9–1:11.8); son silme ~3:48", "1:00.6 civarı üç ölçü; 3:47.9 son silme")
d0 = down_after(56.8553)
D_ctx = [ctx("0:55.6–1:01.6 (üç ölçü üst üste)", [d0, down_after(56.8553, 1), down_after(56.8553, 2)], win=(55.6, 62.2))]
def wipe(n_s, f0, f1, rng_seed, lowcut=250, peak_pos=0.8, tail_lp=7000):
    rng = np.random.default_rng(rng_seed); n = int(n_s * SR)
    x = noise_sweep(n, f0, f1, rng, 0.5)
    t = np.arange(n) / n
    env = np.where(t < peak_pos, (t / peak_pos) ** 2.2, np.cos((t - peak_pos) / (1 - peak_pos) * np.pi / 2) ** 2)
    x = x * env[:, None]
    return hp(x, lowcut), int(peak_pos * n)
cand(ED, "D1", "Yumuşak hava dalgası: bant süpürmesi 500→3500 Hz, ölçü başına", "Sentez (gürültü süpürmesi)",
     lambda pc, i: wipe(1.5, 500, 3500, 20 + i), D_ctx, 12)
cand(ED, "D2", "Kâğıt süpürme (scroll), alçak geçirgen ve şişen zarf", "Kenney Interface Sounds / scroll_003 (CC0)",
     lambda pc, i: (lambda w: (w * (np.sin(np.pi * np.linspace(0, 1, len(w))) ** 1.6)[:, None], len(w) // 2))(lp(trim_lead(load("interface-sounds", "scroll_003")), 5000)), D_ctx, 12)
cand(ED, "D3", "Kumaş kemer savrulması, uzatılmış ve yumuşatılmış", "Kenney RPG Audio / clothBelt2 (CC0)",
     lambda pc, i: (lambda w: (w * (np.sin(np.pi * np.linspace(0, 1, len(w))) ** 1.3)[:, None], len(w) // 2))(vary(lp(trim_lead(load("rpg-audio", "clothBelt2")), 6000), 0.6)), D_ctx, 12)
def d4(pc, i):
    sy, a = wipe(1.4, 700, 4500, 40 + i, 400)
    bk = vary(trim_lead(load("rpg-audio", "bookFlip1")), 0.8) * 0.5
    bi = env_peak_idx(bk, 0.05); o = np.zeros((len(sy), 2)); s = max(0, a - bi); L = min(len(bk), len(o) - s); o[s:s + L] += bk[:L]
    return o + sy * 0.9, a
cand(ED, "D4", "Katman: hava dalgası + yarım hızda kitap sayfası", "Sentez + Kenney RPG Audio / bookFlip1 (CC0)", d4, D_ctx, 12)
final_erase = nearest(DOWN, 227.8948)
D_fin = [ctx("3:46.4–3:54.4 (son silme)", [final_erase], win=(final_erase - 1.5, final_erase + 6.5))]
def erase_syn(pc, i):
    n = int(3.6 * SR); rng = np.random.default_rng(77)
    x = noise_sweep(n, 300, 6000, rng, 0.55) * swell(n, 1.3)[:, None]
    f = PCS["F"] * 4; t = tvec(n)
    pad = st(np.sin(2 * np.pi * f * t) * 0.35 + np.sin(2 * np.pi * f * 1.5 * t) * 0.18) * (swell(n, 1.0) * np.cos(np.linspace(0, np.pi / 2, n)) ** 0.5)[:, None] * 0.45
    return fade(x * 4 + pad, 0.01, 0.4), 0
cand(ED, "D5", "Son silme: 3,6 sn'lik şişen hava dalgası + Fa pedi (F3 + C4)", "Sentez (gürültü süpürmesi + sine pad)", erase_syn, D_fin, 12)
def erase_cloth(pc, i):
    w = vary(lp(trim_lead(load("rpg-audio", "clothBelt")), 5500), 0.3)[:int(3.6 * SR)]
    return fade(w * swell(len(w), 1.1)[:, None] * 2.0, 0.01, 0.6), 0
cand(ED, "D6", "Son silme: kumaş savrulması 3,3x uzatılmış, kâğıt gibi uzun akış", "Kenney RPG Audio / clothBelt (CC0), uzatma: varispeed 0.3", erase_cloth, D_fin, 12)

# ================================================================ E notes scattering into dots
EE = mk_event("E", "Notların noktalara dağılması", "Nakarat 1: kâğıt notlar dalganın altında noktalara dağılır (0:56.9–1:11.8)", "0:58.7 ve 1:00.6 (aşağı vuruşlar)")
e1, e2 = down_after(58.7285), down_after(58.7285, 1)
E_ctx = [ctx("0:57.2–1:03.2 (iki dağılma)", [e1, e2], win=(57.2, 63.2))]
def flutter_build(grain_fns, n_g, span, seed, pc_notes=None):
    rng = np.random.default_rng(seed); o = np.zeros((int((span + 0.5) * SR), 2))
    ts = np.sort(rng.random(n_g) ** 1.6) * span   # denser at the start, spreading out
    for k, t in enumerate(ts):
        g = grain_fns(rng, k); a = 0.9 ** (k * 0.4) * (0.5 + 0.5 * rng.random())
        s = int(t * SR); L = min(len(g), len(o) - s); o[s:s + L] += g[:L] * a
    return o
def e_flip(rng, k):
    nm = rng.choice(["bookFlip3", "bookFlip2", "cloth4", "cloth3"]); g = trim_lead(load("rpg-audio", nm))
    return fade(hp(vary(g, 1.1 + 0.6 * rng.random())[:int(0.2 * SR)], 900), 0.002, 0.05)
cand(EE, "E1", "Kâğıt hışırtısı: hızlı sayfa/kumaş parçacıkları, hızla seyreliyor", "Kenney RPG Audio / bookFlip2,3 + cloth3,4 (CC0)",
     lambda pc, i: flutter_build(e_flip, 9, 0.9, 100 + i), E_ctx, 13)
fz = penta_freqs(6, 9)
def e_ping(rng, k):
    f = fz[rng.integers(0, len(fz))]; return sine_ping(f, 0.25, 0.04 + 0.05 * rng.random(), 1.0, 0.001)
cand(EE, "E2", "Sentez: Fa majör pentatonik minik ışıltı noktaları (dağılan noktalar)", "Sentez (sine pingleri, F6 pentatonik)",
     lambda pc, i: flutter_build(e_ping, 14, 1.1, 200 + i), E_ctx, 13)
def e_glint(rng, k):
    nm = rng.choice(["glass_002", "glass_003", "glass_005", "glass_006"]); g = trim_lead(load("interface-sounds", nm))
    return hp(vary(g, 1.2 + 0.8 * rng.random()), 1500)[:int(0.15 * SR)]
cand(EE, "E3", "Cam parıltıları: çok küçük cam tınıları dağılıyor", "Kenney Interface Sounds / glass_002,3,5,6 (CC0)",
     lambda pc, i: flutter_build(e_glint, 11, 1.0, 300 + i), E_ctx, 13)
def e_scratch(rng, k):
    nm = rng.choice(["scratch_001", "scratch_002", "scratch_003", "tick_001", "tick_002"]); g = trim_lead(load("interface-sounds", nm))
    return hp(vary(g, 1.0 + 0.5 * rng.random()), 1200)[:int(0.15 * SR)]
cand(EE, "E4", "Kuru çıtırtı: minik kâğıt kaşıntıları + tikler", "Kenney Interface Sounds / scratch_001-003 + tick_001-002 (CC0)",
     lambda pc, i: flutter_build(e_scratch, 13, 0.9, 400 + i), E_ctx, 13)
def e_pluck(rng, k):
    nm = rng.choice(["pluck_001", "pluck_002"]); g = trim_lead(load("interface-sounds", nm))
    return hp(tune(g, "F", 300, 3000) * 1.0, 300)
def e5(pc, i):
    rng = np.random.default_rng(500 + i); o = np.zeros((int(1.5 * SR), 2))
    for k, t in enumerate(np.sort(rng.random(7)) * 0.9):
        g = vary(tune(trim_lead(load("interface-sounds", "pluck_001")), "F", 300, 3000), 2 ** (rng.choice([0, 2, 4, 7, 9, 12]) / 12) * 2)
        s = int(t * SR); L = min(len(g), len(o) - s); o[s:s + L] += g[:L] * (0.85 ** k)
    return o
cand(EE, "E5", "Kenney pluck ile dağılan pentatonik damlalar (F ayarlı)", "Kenney Interface Sounds / pluck_001 (CC0), perde: F pentatonik", e5, E_ctx, 13)

# ================================================================ F morning tick
EF = mk_event("F", "Sabah tiki (takvim hızlanırken)", "Nakarat sonrası 'bir daha': hızlanan takvim, her vuruşta yeni bir sabah (1:11.8–1:28.7)", "1:11.8'den itibaren her vuruş")
f0 = down_after(71.8362)
f_times = [BEATS[beat_idx(f0) + k] for k in range(0, 12)]
F_ctx = [ctx("1:11.8–1:17.9 (her vuruşta)", f_times, win=(f0 - 0.6, f_times[-1] + 1.0))]
def rr(names, pack, proc=lambda x: x):
    return lambda pc, i: proc(trim_lead(load(pack, names[i % len(names)])))
cand(EF, "F1", "İki Kenney tiki sırayla (makine gibi olmasın)", "Kenney Interface Sounds / tick_001, tick_002 (CC0)",
     rr(["tick_001", "tick_002"], "interface-sounds"), F_ctx, 14)
cand(EF, "F2", "Çok kısa ahşap tık, yumuşak", "Kenney Interface Sounds / click_004, click_005 (CC0)",
     rr(["click_004", "click_005"], "interface-sounds", lambda x: lp(x, 4500)), F_ctx, 14)
cand(EF, "F3", "Küçük seçim bip'i (tonal değil, ince)", "Kenney Interface Sounds / select_001, select_002 (CC0)",
     rr(["select_001", "select_002"], "interface-sounds", lambda x: lp(x, 5000)), F_ctx, 14)
cand(EF, "F4", "Mekanik klavye tıkı, çok kısa", "Kenney UI Audio / click5, click4 (CC0)",
     rr(["click5", "click4"], "ui-audio", lambda x: lp(x, 4500)), F_ctx, 14)
def f5(pc, i):
    f = [2093.0, 2349.3][i % 2]; return sine_ping(f, 0.05, 0.008, 1.0, 0.001)
cand(EF, "F5", "Sentez: C7/D7 tonlu minik tik (Fa majör ile uyumlu)", "Sentez (sine 2093/2349 Hz, 25 ms)", f5, F_ctx, 14)

# ================================================================ G lamp switch-on
EG = mk_event("G", "Lamba açılışı (hafif uğultu)", "Dize 2: 'Tamam / bitti' — boş kutuların üstünde sarı-yeşil lambalar yanar (1:28.7–1:43.6)", "1:30.5 civarı üç lamba, birer vuruş arayla")
g0 = down_after(90.5); gi = beat_idx(g0)
g_times = [BEATS[gi], BEATS[gi + 2], BEATS[gi + 4]]
G_ctx = [ctx("1:29.5–1:35.5 (üç lamba)", g_times, win=(g0 - 1.0, g0 + 5.4))]
def hum(dur, f=87.3071, buzz=0.0, seed=0):
    n = int(dur * SR); t = tvec(n); rng = np.random.default_rng(seed)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) + 0.25 * np.sin(2 * np.pi * 3 * f * t)
    if buzz:
        x = x + buzz * lp(rng.standard_normal(n), 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
    e = np.minimum(1, t / 0.15) * np.exp(-t / (dur / 3))
    return st(x * e) * 0.5
def with_hum(click, h, hum_gain):
    n = max(len(click), len(h)); o = np.zeros((n, 2)); o[:len(click)] += click; o[:len(h)] += h * hum_gain; return o
cand(EG, "G1", "Kenney anahtar + F2 uğultu (alçak, ince)", "Kenney Interface Sounds / switch_002 (CC0) + sentez uğultu",
     lambda pc, i: with_hum(trim_lead(load("interface-sounds", "switch_002")), hum(1.8), 0.12), G_ctx, 10)
cand(EG, "G2", "Kenney düğme + floresan benzeri cızırtılı uğultu", "Kenney UI Audio / switch10 (CC0) + sentez uğultu",
     lambda pc, i: with_hum(trim_lead(load("ui-audio", "switch10")), hum(2.0, buzz=0.5, seed=i), 0.12), G_ctx, 10)
def g3(pc, i):
    click = trim_lead(load("interface-sounds", "toggle_001")); n = int(0.5 * SR); t = tvec(n)
    f = 349.23 * 2 ** (np.arange(n) / n * 1.0)    # F4 -> F5 glide
    glide = st(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.15) * np.minimum(1, t / 0.01)) * 0.22
    return with_hum(click, mix_at(glide, hum(1.6) * 0.15, 0), 1.0)
cand(EG, "G3", "Kenney toggle + yukarı kayan F4→F5 ısınma tonu ('yandı')", "Kenney Interface Sounds / toggle_001 (CC0) + sentez glissando", g3, G_ctx, 10)
cand(EG, "G4", "Metal mandal tıkı (ağır) + hafif uğultu", "Kenney RPG Audio / metalLatch (CC0) + sentez uğultu",
     lambda pc, i: with_hum(trim_lead(load("rpg-audio", "metalLatch")), hum(1.8, seed=i), 0.14), G_ctx, 10)
def g5(pc, i):
    t = tvec(int(0.02 * SR)); rl = st(hp(np.random.default_rng(9 + i).standard_normal(len(t)), 800) * np.exp(-t / 0.004))
    base = [1396.9, 1760.0, 2093.0][i % 3]   # F6, A6, C7 = F major triad, one per lamp
    ch = sine_ping(base, 0.9, 0.18, 0.5, 0.002)
    return with_hum(mix_at(rl, ch, int(0.03 * SR)), hum(1.5, seed=i), 0.1)
cand(EG, "G5", "Sentez: röle tıkı + 'sahte başarı' çanı (Fa majör üçlüsü, lamba başına bir nota) + uğultu", "Sentez (sine F6/A6/C7)", g5, G_ctx, 10)

# ================================================================ H torch click
EH = mk_event("H", "El feneri tıkı", "Nakarat öncesi 2: insan camın ardından el feneri tutar (1:43.6–1:51.1)", "1:43.6 (bölümün ilk aşağı vuruşu)")
h0 = down_after(103.6389)
H_ctx = [ctx("1:41.8–1:47.8", [h0], win=(h0 - 1.8, h0 + 4.2))]
cand(EH, "H1", "Metal tık (fener düğmesi gibi)", "Kenney RPG Audio / metalClick (CC0)",
     lambda pc, i: trim_lead(load("rpg-audio", "metalClick"))[:int(0.25 * SR)], H_ctx, 10)
cand(EH, "H2", "Kenney toggle, kısa ve temiz", "Kenney Interface Sounds / toggle_004 (CC0)",
     lambda pc, i: trim_lead(load("interface-sounds", "toggle_004")), H_ctx, 10)
cand(EH, "H3", "İki aşamalı tıklama: basma + bırakma (fare tıkı)", "Kenney UI Audio / mouseclick1 + mouserelease1 (CC0)",
     lambda pc, i: mix_at(trim_lead(load("ui-audio", "mouseclick1")), trim_lead(load("ui-audio", "mouserelease1")), int(0.09 * SR)), H_ctx, 10)
cand(EH, "H4", "Plastik anahtar, orta uzunlukta", "Kenney Interface Sounds / switch_004 (CC0)",
     lambda pc, i: trim_lead(load("interface-sounds", "switch_004"))[:int(0.35 * SR)], H_ctx, 10)
def h5(pc, i):
    n = int(1.4 * SR); t = tvec(n)
    th = st(lp(np.random.default_rng(3).standard_normal(n), 400) * np.exp(-t / 0.02) * 2.0)
    warm = st((np.sin(2 * np.pi * 174.61 * t) + 0.5 * np.sin(2 * np.pi * 349.23 * t)) * np.minimum(1, t / 0.25) * np.exp(-t / 0.8)) * 0.18
    ck = hp(sine_ping(3200, 0.02, 0.003, 0.8, 0.0005), 1000)
    return th * 0.8 + warm + mix_at(np.zeros((n, 2)), ck, 0)
cand(EH, "H5", "Sentez: yumuşak tık + F3 sıcak 'ışık yandı' pedi", "Sentez", h5, H_ctx, 10)

# ================================================================ I line-rain / collapse bed
EI = mk_event("I", "Satır yağmuru / çöken kâğıt şehir (zemin)", "Köprü (erkek): duvar satır yağmuru olarak akar, ardından kâğıt şehir çöker (2:09.8–2:24.7)", "2:09.8–2:24.7 (14,9 sn), 2:17'den sonra çöküş ağırlığı")
i0, i1 = 129.7923, 144.7095
I_ctx = [ctx("2:08.8–2:25.8 (tüm köprü)", [i0], win=(i0 - 1.0, i1 + 1.1))]
LEN = i1 - i0
def bed_env(n, up=1.5, dn=2.0):
    e = np.ones(n); a, b = int(up * SR), int(dn * SR); e[:a] = np.linspace(0, 1, a); e[-b:] = np.linspace(1, 0, b); return e
def i1_make(pc, i):
    n = int(LEN * SR); rng = np.random.default_rng(1)
    rain = np.zeros((n, 2)); k = 0
    # many thin vertical 'line' ticks: dense high-passed bursts at a swelling then collapsing rate
    rate = 80 + 160 * np.sin(np.pi * np.linspace(0, 1, 40)) ** 1.2
    t = 0.0
    while t < LEN:
        r = np.interp(t / LEN * 39, np.arange(40), rate)
        t += rng.exponential(1.0 / r); s = int(t * SR)
        if s + 400 >= n: break
        b = hp(rng.standard_normal((300, 2)), 3500) * np.exp(-np.arange(300) / 40.0)[:, None]
        rain[s:s + 300] += b * (0.4 + rng.random())
    rain = lp(rain, 9000)
    cs = int(0.55 * n)
    rumble = np.zeros((n, 2)); rumble[cs:] = lp(noise(n - cs, rng), 160) * (np.sin(np.pi * np.linspace(0, 1, n - cs)) ** 1.2)[:, None] * 6
    return (rain * 3 + rumble) * bed_env(n)[:, None], 0
cand(EI, "I1", "Sentez: ince dikey 'çizgi' tikleri yağmuru + 2:17'den sonra alçak çöküş gürüldemesi", "Sentez (yüksek geçiren darbe yağmuru + 160 Hz altı gürültü)", i1_make, I_ctx, 11)
def i2_make(pc, i):
    n = int(LEN * SR); rng = np.random.default_rng(2); o = np.zeros((n, 2)); t = 0.0
    names = [("interface-sounds", "tick_001"), ("interface-sounds", "tick_002"), ("interface-sounds", "click_003"),
             ("interface-sounds", "glitch_002"), ("interface-sounds", "scratch_003")]
    dens = lambda t: 18 + 70 * np.sin(np.pi * t / LEN) ** 1.5
    while t < LEN - 0.3:
        t += rng.exponential(1.0 / dens(t)); s = int(t * SR)
        p, nm = names[rng.integers(0, len(names))]; g = hp(vary(trim_lead(load(p, nm)), 0.8 + 0.8 * rng.random()), 1200)
        L = min(len(g), n - s)
        if L <= 0: break
        o[s:s + L] += g[:L] * (0.3 + 0.7 * rng.random())
    c0 = int(0.58 * n)
    for _ in range(26):
        s = c0 + int(rng.random() ** 0.8 * (n - c0 - SR)); nm = ["impactWood_light_001", "impactWood_light_000"][rng.integers(0, 2)]
        g = lp(vary(trim_lead(load("impact-sounds", nm)), 0.7 + 0.5 * rng.random()), 2500) * (0.3 + 0.7 * rng.random())
        o[s:s + len(g)] += g[:n - s] * 1.2
    return o * bed_env(n)[:, None], 0
cand(EI, "I2", "Kenney tik/çizik taneleri yağmuru, sonra ahşap-kâğıt yıkıntı darbeleri", "Kenney Interface Sounds (tick, click_003, glitch_002, scratch_003) + Impact Sounds / impactWood_light (CC0)", i2_make, I_ctx, 11)
def i3_make(pc, i):
    n = int(LEN * SR); rng = np.random.default_rng(3); o = np.zeros((n, 2)); t = 0.0
    src = ["bookFlip1", "bookFlip2", "bookFlip3", "cloth1", "cloth3"]
    dens = lambda t: 3 + 8 * np.sin(np.pi * t / LEN) ** 1.3
    while t < LEN - 0.5:
        t += rng.exponential(1.0 / dens(t)); s = int(t * SR); g = trim_lead(load("rpg-audio", src[rng.integers(0, len(src))]))
        g = hp(vary(g, 0.9 + 0.7 * rng.random()), 1000) * (0.3 + 0.7 * rng.random()); L = min(len(g), n - s)
        if L <= 0: break
        o[s:s + L] += g[:L]
    c0 = int(0.58 * n)
    lowbed = lp(noise(n - c0, rng), 220) * (np.sin(np.pi * np.linspace(0, 1, n - c0)) ** 1.1)[:, None] * 5
    o[c0:] += lowbed
    return o * bed_env(n)[:, None], 0
cand(EI, "I3", "Kâğıt akışı: sayfa/kumaş çevirmelerinden yağan kâğıt, sonda alçak gürleme", "Kenney RPG Audio / bookFlip1-3 + cloth1,3 (CC0) + sentez gürleme", i3_make, I_ctx, 11)
def i4_make(pc, i):
    n = int(LEN * SR); rng = np.random.default_rng(4)
    sh = np.zeros((n, 2)); sh += bp(noise(n, rng), 3000, 9000) * 0.25
    mod = (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(np.interp(np.arange(n) / SR, [0, LEN], [7, 11])) / SR)) ** 2
    sh = sh * mod[:, None]
    e = np.minimum(1, np.arange(n) / (2 * SR))
    cr = lp(load("sci-fi-sounds", "explosionCrunch_004"), 600) * 0.5; lf = lp(load("sci-fi-sounds", "lowFrequency_explosion_001"), 220)
    c0 = int(0.57 * n); o = sh * e[:, None] * 3
    o = mix_at(o, cr * 0.7, c0); o = mix_at(o, lf * 0.9, c0 + int(0.4 * SR)); o = mix_at(o, lp(cr[::1], 900) * 0.4, c0 + int(2.0 * SR))
    return o[:n] * bed_env(n, 1.5, 2.5)[:, None], 0
cand(EI, "I4", "Sentez 'cızırtılı' satır yağmuru + gerçek patlama dokusu (kısılmış) ile çöküş", "Sentez + Kenney Sci-Fi Sounds / explosionCrunch_004, lowFrequency_explosion_001 (CC0)", i4_make, I_ctx, 11)

# ================================================================ J glass crack, growing
EJ = mk_event("J", "Büyüyen cam çatlağı", "Gitar solosu: cam çatlamaya başlar, çatlaklar vuruşlarda büyür (2:35.9–2:52.6); son nakaratta da tekrar", "2:37.7'den itibaren dört ardışık ölçü başı, küçükten büyüğe")
j0 = down_after(157.0)
j_times = [down_after(157.0, k) for k in range(4)]
J_ctx = [ctx("2:36.5–2:48.5 (küçük→büyük, dört çatlak)", j_times, win=(j_times[0] - 1.2, j_times[-1] + 3.0))]
SIZES = [0.28, 0.45, 0.7, 1.0]
def crackle(size, seed, fmin=3000):
    rng = np.random.default_rng(seed); dur = 0.15 + 0.7 * size; n = int(dur * SR); o = np.zeros((n, 2)); cnt = int(3 + 14 * size)
    ts = np.cumsum(rng.exponential(dur / cnt * 0.6, cnt)); ts = ts / ts.max() * (dur * 0.75) ** 1.0
    for k, t in enumerate(ts):
        s = int(t * SR); L = 400
        b = hp(rng.standard_normal((L, 2)), fmin) * np.exp(-np.arange(L) / 35.0)[:, None] * (1.0 - 0.6 * t / dur)
        o[s:s + L] += b[:n - s] * (0.4 + rng.random())
        if rng.random() < 0.5:
            f = 2500 + 4500 * rng.random(); pg = sine_ping(f, 0.03, 0.01, 0.25); Lp = min(len(pg), n - s); o[s:s + Lp] += pg[:Lp]
    if size > 0.5:
        t = tvec(int(0.2 * SR)); th = st(lp(rng.standard_normal(len(t)), 220) * np.exp(-t / 0.05)) * 3 * (size - 0.4)
        o[:len(th)] += th
    return o
cand(EJ, "J1", "Sentez: buz/cam çıtırtısı; çatlak büyüdükçe daha çok ve daha uzun, en büyükte alçak 'tok'", "Sentez (yüksek geçiren darbe kümeleri + cam pingleri)",
     lambda pc, i: crackle(SIZES[i % 4], 600 + i) * SIZES[i % 4] ** 0.7, J_ctx, 9)
GL = [("impact-sounds", "impactGlass_light_000"), ("impact-sounds", "impactGlass_light_002"), ("impact-sounds", "impactGlass_medium_001"), ("impact-sounds", "impactGlass_heavy_001")]
def j2(pc, i):
    p, nm = GL[i % 4]; g = trim_lead(load(p, nm)); g = fade(hp(g, 600)[:int((0.12 + 0.2 * (i % 4)) * SR)], 0.001, 0.08)
    return g * SIZES[i % 4] ** 0.8 / max(1e-6, peak(g))
cand(EJ, "J2", "Kenney cam darbeleri: hafif→orta→ağır, kısaltılıp kırpılarak 'çatırtı' yapıldı", "Kenney Impact Sounds / impactGlass_light_000,002, medium_001, heavy_001 (CC0)", j2, J_ctx, 9)
GI = ["glass_005", "glass_002", "glass_003", "glass_001"]
def j3(pc, i):
    g = trim_lead(load("interface-sounds", GI[i % 4])); g = hp(vary(g, 1.3 - 0.1 * (i % 4)), 800)
    if i % 4 == 3: g = mix_at(g, trim_lead(load("interface-sounds", "glass_004"))[:int(0.5 * SR)] * 0.6, int(0.03 * SR))
    return g / max(1e-6, peak(g)) * SIZES[i % 4] ** 0.8
cand(EJ, "J3", "Kenney arayüz cam sesleri: küçük tınılardan uzun cam tıngırtısına", "Kenney Interface Sounds / glass_005,002,003,001 + glass_004 (CC0)", j3, J_ctx, 9)
def j4(pc, i):
    k = i % 4; syn = crackle(SIZES[k], 700 + i, 2500)
    p, nm = GL[k]; g = fade(hp(trim_lead(load(p, nm)), 500)[:int((0.2 + 0.15 * k) * SR)], 0.001, 0.1)
    o = pad_to(syn * (0.6 + 0.4 * SIZES[k]), max(len(syn), len(g))) ; o[:len(g)] += g / max(1e-6, peak(g)) * 0.7
    if k >= 2:
        n = int(0.9 * SR); t = tvec(n); sub = st(np.sin(2 * np.pi * 43.65 * t * (1 + 0.25 * np.exp(-t / 0.05))) * np.exp(-t / 0.28)) * (0.35 if k == 2 else 0.6)
        o = pad_to(o, max(len(o), n)); o[:n] += sub
    return o * SIZES[k] ** 0.6
cand(EJ, "J4", "Karma: çıtırtı + gerçek cam darbesi, iki büyük çatlakta Fa1 alt 'tok' (anahtara uygun)", "Sentez + Kenney Impact Sounds / impactGlass_* (CC0) + F1 sub (43,65 Hz)", j4, J_ctx, 9)

# ================================================================ K riser into shatter
EK = mk_event("K", "Cama doğru yükselen gerilim (riser)", "Outro sözleri: cam titrer, iki ay yarısı hizalanır (3:25.9–3:33.2)", "3:25.9 → 3:33.2 (7,35 sn, kırılmada biter)")
k0, k1 = 205.8525, 213.2079
K_ctx = [ctx("3:24.9–3:34.2 (yükseliş, kırılma yok)", [k0], win=(k0 - 1.0, k1 + 1.0))]
KD = int((k1 - k0) * SR); KT = tvec(KD); KTT = KD / SR
kenv = (KT / KTT) ** 2.2
def chirp(f0, f1, n=KD):
    t = tvec(n); ph = 2 * np.pi * np.cumsum(f0 * (f1 / f0) ** (t / (n / SR))) / SR; return np.sin(ph) + 0.35 * np.sin(2 * ph)
def k_finish(x):
    x = x * kenv[:, None]; x[-int(0.012 * SR):] *= np.linspace(1, 0, int(0.012 * SR))[:, None]; return x, 0
cand(EK, "K1", "Gürültü süpürmesi 300→9000 Hz, kuvvetli üstel şişme", "Sentez (bant geçiren gürültü süpürmesi)",
     lambda pc, i: k_finish(noise_sweep(KD, 300, 9000, np.random.default_rng(1), 0.35) * 3), K_ctx, 9)
def k2(pc, i):
    a = chirp(87.307, 698.46); c = chirp(130.81, 1046.5) * 0.5
    return k_finish(st(a + c) * 0.5)
cand(EK, "K2", "Tonal yükseliş: Fa2→Fa5 + Do3→Do6 (beşli birlikte, anahtara uygun)", "Sentez (üstel kayan sine, F ve C)", k2, K_ctx, 9)
def k3(pc, i):
    eng = load("sci-fi-sounds", "spaceEngineLow_002")[:, 0]; t = KT
    rate = 1.0 + 2.2 * (t / KTT) ** 1.5; pos = np.cumsum(rate) % (len(eng) - 2)
    x = np.interp(pos, np.arange(len(eng)), eng); return k_finish(st(x) * 1.0)
cand(EK, "K3", "Kenney uzay motoru, hız ramp'iyle perde yükselir", "Kenney Sci-Fi Sounds / spaceEngineLow_002 (CC0), varispeed ramp", k3, K_ctx, 9)
def k4(pc, i):
    ns = noise_sweep(KD, 300, 8000, np.random.default_rng(2), 0.35) * 3; ch = st(chirp(87.307, 698.46)) * 0.5
    eng = load("sci-fi-sounds", "spaceEngineLow_002")[:, 0]; rate = 1.0 + 2.2 * (KT / KTT) ** 1.5; pos = np.cumsum(rate) % (len(eng) - 2)
    return k_finish(ns * 0.6 + ch * 0.6 + st(np.interp(pos, np.arange(len(eng)), eng)) * 0.4)
cand(EK, "K4", "Karışım: gürültü + Fa tonu + motor", "Sentez + Kenney Sci-Fi Sounds / spaceEngineLow_002 (CC0)", k4, K_ctx, 9)
def k5(pc, i):
    rng = np.random.default_rng(5); o = np.zeros((KD, 2)); t = 0.3
    while t < KTT - 0.1:
        p, nm = ("interface-sounds", ["glass_005", "glass_002", "glass_003", "glass_006"][rng.integers(0, 4)])
        g = hp(vary(trim_lead(load(p, nm)), 1.0 + 0.5 * rng.random()), 1500) * (0.3 + 0.7 * (t / KTT)); s = int(t * SR)
        L = min(len(g), KD - s); o[s:s + L] += g[:L]
        t += 0.55 * (1 - 0.92 * (t / KTT)) ** 1.1 + 0.04
    sub = st(np.sin(2 * np.pi * np.cumsum(np.linspace(40, 87.3, KD)) / SR)) * (0.5 * (KT / KTT) ** 1.5)[:, None]
    return k_finish(o * 2.5 + sub * 2.0)
cand(EK, "K5", "'Cam titriyor': hızlanan cam tıngırtıları + yükselen Fa alt tonu", "Kenney Interface Sounds / glass_002,3,5,6 (CC0) + sentez alt ton", k5, K_ctx, 9)

# ================================================================ L the big shatter
EL = mk_event("L", "BÜYÜK cam kırılması", "Sözsüz koda (şarkının en yüksek anı): cam kırılır, ay ilk kez bütün olur, iki oda birleşir (3:33.2–3:47.9)", "3:33.2 (Outro part 2 başlangıcı, aşağı vuruş)")
l0 = 213.2079
L_ctx = [ctx("3:31.2–3:39.2", [l0], win=(l0 - 2.0, l0 + 6.0))]
def sub_f1(dur=1.6, f_start=80, amp=1.0):
    n = int(dur * SR); t = tvec(n); f = 43.65 + (f_start - 43.65) * np.exp(-t / 0.06)
    return st(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55) * amp)
def f2_body(dur=1.0, amp=0.5):
    n = int(dur * SR); t = tvec(n); return st(np.sin(2 * np.pi * 87.31 * t) * np.exp(-t / 0.22) * amp)
def layer(*parts):
    n = max(int(at * SR) + len(a) for a, at in parts); o = np.zeros((n, 2))
    for a, at in parts:
        s = int(at * SR); o[s:s + len(a)] += a
    return o
def l1(pc, i):
    gh1 = trim_lead(load("impact-sounds", "impactGlass_heavy_001")); gh4 = trim_lead(load("impact-sounds", "impactGlass_heavy_004"))
    g4 = trim_lead(load("interface-sounds", "glass_004")); cr = trim_lead(load("sci-fi-sounds", "explosionCrunch_002"))
    lf = lp(trim_lead(load("sci-fi-sounds", "lowFrequency_explosion_001")), 300)
    return layer((norm(gh1) * 1.0, 0), (norm(gh4) * 0.8, 0.01), (hp(norm(g4), 1500) * 0.7, 0.02), (hp(norm(cr), 200) * 0.5, 0), (norm(lf) * 0.8, 0), (sub_f1(), 0), (f2_body(), 0)), 0
cand(EL, "L1", "Katmanlı: iki ağır cam + cam kırığı + patlama çıtırtısı + F1 alt darbe + F2 gövde", "Kenney Impact Sounds / impactGlass_heavy_001,004 + Interface Sounds / glass_004 + Sci-Fi Sounds / explosionCrunch_002, lowFrequency_explosion_001 (CC0) + sentez F1/F2", l1, L_ctx, 0)
def l2(pc, i):
    gl = [trim_lead(load("impact-sounds", f"impactGlass_heavy_00{k}")) for k in (0, 2, 3, 1)]
    parts = [(norm(g) * a, t) for g, a, t in zip(gl, [1.0, 0.8, 0.7, 0.6], [0, 0.04, 0.09, 0.16])]
    parts += [(hp(norm(trim_lead(load("interface-sounds", "glass_001"))), 1200) * 0.6, 0.05), (norm(trim_lead(load("impact-sounds", "impactPlate_heavy_001"))) * 0.6, 0), (sub_f1(1.8, 90), 0), (f2_body(1.2, 0.55), 0)]
    return layer(*parts), 0
cand(EL, "L2", "Çağlayan: dört ağır cam art arda (0–160 ms) + ağır plaka + F1 alt darbe", "Kenney Impact Sounds / impactGlass_heavy_000-003 + impactPlate_heavy_001 + Interface Sounds / glass_001 (CC0) + sentez F1/F2", l2, L_ctx, 0)
def l3(pc, i):
    lf0 = trim_lead(load("sci-fi-sounds", "lowFrequency_explosion_000")); cr0 = trim_lead(load("sci-fi-sounds", "explosionCrunch_000"))
    pu = trim_lead(load("impact-sounds", "impactPunch_heavy_003")); gh = trim_lead(load("impact-sounds", "impactGlass_heavy_001")); gh4 = trim_lead(load("impact-sounds", "impactGlass_heavy_003"))
    return layer((norm(lf0) * 0.9, 0), (hp(norm(cr0), 250) * 0.5, 0), (norm(pu) * 0.5, 0), (hp(norm(gh), 400) * 0.9, 0), (hp(norm(gh4), 400) * 0.7, 0.03), (sub_f1(2.0, 85), 0), (f2_body(1.3, 0.55), 0)), 0
cand(EL, "L3", "Ağır: derin patlama + yumruk + üstte cam; sinematik düşük uğultu", "Kenney Sci-Fi Sounds / lowFrequency_explosion_000, explosionCrunch_000 + Impact Sounds / impactPunch_heavy_003, impactGlass_heavy_001,003 (CC0) + sentez F1/F2", l3, L_ctx, 0)
def l4(pc, i):
    rng = np.random.default_rng(88); n = int(3.2 * SR); o = np.zeros((n, 2)); t = tvec(n)
    burst = hp(noise(n, rng), 1200) * np.exp(-t / 0.09)[:, None]; o += burst * 1.2
    pf = np.array(penta_freqs(6, 9)) ; s_t = 0.0
    while s_t < 2.8:
        s_t += rng.exponential(0.012 + 0.9 * (s_t / 2.8) ** 1.5 * 0.2 + 0.002); s = int(s_t * SR)
        if s >= n - 6000: break
        f = pf[rng.integers(0, len(pf))] * (1 if rng.random() < 0.8 else 2)
        a = np.exp(-s_t / 1.1) * (0.5 + 0.5 * rng.random()); o[s:s + 6000] += sine_ping(f, 0.125, 0.015 + 0.06 * rng.random(), 0.45 * a)[:n - s]
        k = hp(rng.standard_normal((200, 2)), 3500) * np.exp(-np.arange(200) / 25.0)[:, None] * a; o[s:s + 200] += k[:n - s]
    o += pad_to(sub_f1(2.0, 85), n) * 1.4 + pad_to(f2_body(1.2, 0.6), n)
    return o, 0
cand(EL, "L4", "Tamamen sentez: gürültü patlaması + Fa pentatonik cam kıymıkları serpintisi + F1 darbe", "Sentez (parçacık sine pingleri F6-C8 pentatonik, F1/F2)", l4, L_ctx, 0)
def l5(pc, i):
    base, _ = l1(pc, i); gh = trim_lead(load("impact-sounds", "impactGlass_heavy_001"))
    pre = vary(gh, 0.9)[::-1]; pre = hp(pre, 1500) * np.linspace(0, 1, len(pre))[:, None] ** 2 * 0.6    # reversed glass suck-in
    lead = 0.35; ln = int(lead * SR); pre = pre[-ln:] if len(pre) >= ln else pad_to(pre, ln)
    return layer((pre, 0), (base, lead)), ln
cand(EL, "L5", "L1 + vuruştan 0,35 sn önce ters cam 'emme' (kırılmayı öne çeker)", "L1 ile aynı + Kenney impactGlass_heavy_001 ters (CC0)", l5, L_ctx, 0)


# ================================================================ rendering / measurement
def build_track(events):
    """events: [(t_song, arr, anchor_idx)] -> (track, t_start)."""
    t_start = min(t - a / SR for t, arr, a in events)
    n = int(max((t - t_start) * SR + len(arr) - a for t, arr, a in events) + 1) + 200
    tr = np.zeros((n, 2))
    for t, arr, a in events:
        s = int(round((t - a / SR - t_start) * SR)); tr[s:s + len(arr)] += arr
    return tr, t_start

def active_db(x, thr=-35):
    m = (mono(x) ** 2); nb = len(m) // 480
    if nb == 0: return -120.0
    p = m[:nb * 480].reshape(nb, 480).mean(1); mx = p.max()
    if mx <= 0: return -120.0
    sel = p > mx * 10 ** (thr / 10); return 10 * np.log10(p[sel].mean())

def song_db(a, b):
    seg = song[int(a * SR):int(b * SR)]; return 10 * np.log10((seg ** 2).mean() + 1e-12)

def vd(wav, a, b):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", wav, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True)
    mean = float(re.search(r"mean_volume: (-?[\d.inf]+) dB", r.stderr).group(1)); mx = float(re.search(r"max_volume: (-?[\d.inf]+) dB", r.stderr).group(1))
    return mean, mx

def render_context(tr, t_start, win, x_db, special_l):
    a, b = win; seg = song[int(a * SR):int(b * SR)].copy()
    off = int(round((t_start - a) * SR))
    act = np.where(np.abs(mono(tr)) > peak(tr) * 10 ** (-40 / 20))[0]
    t_act0, t_act1 = t_start + act[0] / SR, t_start + act[-1] / SR
    sd = song_db(max(a, t_act0 - 0.3), min(b, t_act1 + 0.3))
    if special_l:
        lo, hi = -60.0, 60.0                                    # bisect gain so the mix peak is -2.0 dBFS
        for _ in range(40):
            g_db = (lo + hi) / 2; m = np.zeros_like(seg); s0 = max(off, 0); sl = tr[s0 - off:]
            L = min(len(sl), len(m) - s0); m[:] = seg; m[s0:s0 + L] += sl[:L] * 10 ** (g_db / 20)
            if db(peak(m)) > -2.0: hi = g_db
            else: lo = g_db
        g_db = lo
    else:
        g_db = (sd - x_db) - active_db(tr)
        g_db = min(g_db, sd - x_db + 18 - db(peak(tr)))     # peak at most 18 dB above the target mean level
    g = 10 ** (g_db / 20); m = seg.copy(); s0 = max(off, 0); sl = tr[s0 - off:]; L = min(len(sl), len(m) - s0); m[s0:s0 + L] += sl[:L] * g
    pk = db(peak(m))
    if pk > -1.0:
        g *= 10 ** ((-1.0 - pk) / 20); g_db = db(g); m = seg.copy(); m[s0:s0 + L] += sl[:L] * g
    return m, seg, g, dict(sfx_gain_db=round(g_db, 1), song_local_mean_db=round(sd, 1), a=a, b=b, t_act0=t_act0, t_act1=t_act1)


def main():
    os.makedirs(OUT, exist_ok=True)
    report = []
    for ev in EVENTS:
        for c in ev["cands"]:
            cid = c["id"]; c["players"] = []
            for ci, cx in enumerate(c["contexts"]):
                evs = []
                for k, t in enumerate(cx["times"]):
                    r = c["make"](cx["pc"], k)
                    arr, anc = (r if isinstance(r, tuple) else (r, None))
                    arr = np.asarray(arr, float); arr = st(arr)
                    if anc is None: anc = env_peak_idx(arr, 0.01)
                    evs.append((t, arr, int(anc)))
                tr, t_start = build_track(evs)
                special_l = (ev["code"] == "L")
                m, seg, g, info = render_context(tr, t_start, cx["win"], c["x_db"], special_l)
                suffix = "" if ci == 0 else f"-{'kapanis' if ev['code']=='B' else 'son'}"
                alone_name = f"{cid}{suffix}.wav"
                alone = norm(tr, -3.0 if special_l else -6.0)
                if ci == 0 or True:
                    sf.write(f"{OUT}/{alone_name}", alone, SR, subtype="PCM_16")
                mixwav = f"{TMP}/{cid}{suffix}_mix.wav"; sngwav = f"{TMP}/{cid}{suffix}_song.wav"
                sf.write(mixwav, m, SR, subtype="FLOAT"); sf.write(sngwav, seg, SR, subtype="FLOAT")
                ev_a, ev_b = max(info["t_act0"] - 0.1, info["a"]) - info["a"], min(info["t_act1"] + 0.1, info["b"]) - info["a"]
                if ev_b - ev_a < 0.3: ev_b = ev_a + 0.3
                h0, h1 = cx["times"][0] - info["a"] - 0.05, cx["times"][0] - info["a"] + 0.45
                hm, _ = vd(mixwav, h0, h1); hs, _ = vd(sngwav, h0, h1)
                mm, mmx = vd(mixwav, ev_a, ev_b); sm, smx = vd(sngwav, ev_a, ev_b); _, whole_max = vd(mixwav, 0, info["b"] - info["a"])
                mp3 = f"{cid}{suffix}-sarkida.mp3"
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mixwav, "-codec:a", "libmp3lame", "-b:a", "192k", f"{OUT}/{mp3}"], check=True)
                rec = dict(name=cx["name"], alone=alone_name, ctx=mp3, gain_db=info["sfx_gain_db"], song_local_mean=sm, mix_local_mean=mm,
                           delta_mean=round(mm - sm, 1), delta_hit=round(hm - hs, 1), mix_max_event=mmx, mix_max_whole=whole_max, song_max_event=smx)
                c["players"].append(rec); report.append(dict(id=cid + suffix, **rec))
                print(f"{cid+suffix:12s} gain {info['sfx_gain_db']:6.1f} dB | song mean {sm:6.1f} mix mean {mm:6.1f} (d {mm-sm:+.1f}) | mix max whole {whole_max:6.1f}")
    json.dump(report, open(f"{OUT}/_measurements.json", "w"), indent=1)
    write_page()
    shutil.rmtree(TMP, ignore_errors=True)


PAGE_CSS = """
:root{--bg:#F3EFE4;--ink:#18203A;--mut:#5b6178;--card:#fbf8ef;--line:#d8d2c0;--acc:#B8941A}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#171c30;--ink:#F3EFE4;--mut:#aab0c5;--card:#1f2540;--line:#323a5c;--acc:#F0D35A}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:980px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:28px;margin:8px 0 4px}.sub{color:var(--mut);margin:0 0 20px}
nav{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 28px}nav a{padding:3px 10px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--ink);font-weight:600}
section{margin:0 0 36px}h2{font-size:21px;margin:0 0 2px}h2 span{color:var(--acc)}.scene{color:var(--mut);margin:0 0 2px}.when{margin:0 0 12px;font-size:14px;color:var(--mut)}
.c{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:0 0 10px}
.c h3{margin:0;font-size:17px}.c h3 b{color:var(--acc);margin-right:6px}.d{margin:2px 0 2px}.s{font-size:12.5px;color:var(--mut);margin:0 0 8px}
.p{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px 14px}.p label{display:block;font-size:12.5px;color:var(--mut);margin:0 0 2px}audio{width:100%;height:36px}
.m{font-size:12px;color:var(--mut);margin-top:2px}
@media (max-width:480px){h1{font-size:23px}}
"""

def write_page():
    h = ['<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
         '<title>Her Sabah Baştan — ses efekti adayları</title><style>' + PAGE_CSS + '</style></head><body><main>',
         '<h1>Ses efekti adayları</h1><p class="sub">Her aday için iki oynatıcı: <b>tek başına</b> ve <b>şarkının içinde</b> (olay anında, ~6 sn). '
         'Cevabı etiketlerle ver: örn. "A2 B1 C4 …". Kenney paketleri CC0; kaynaklar SOURCES.md içinde.</p><nav>']
    for ev in EVENTS: h.append(f'<a href="#{ev["code"]}">{ev["code"]}</a>')
    h.append('</nav>')
    for ev in EVENTS:
        h.append(f'<section id="{ev["code"]}"><h2><span>{ev["code"]}</span> · {ev["title"]}</h2><p class="scene">{ev["scene"]}</p><p class="when">Zamanlama: {ev["when"]}</p>')
        for c in ev["cands"]:
            h.append(f'<div class="c"><h3><b>{c["id"]}</b>{c["desc"]}</h3><p class="s">Kaynak: {c["src"]}</p><div class="p">')
            for k, p in enumerate(c["players"]):
                h.append(f'<div><label>Tek başına{(" — " + p["name"].split(" (")[0]) if k else ""}</label><audio controls preload="none" src="{p["alone"]}"></audio></div>')
                h.append(f'<div><label>Şarkıda: {p["name"]}</label><audio controls preload="none" src="{p["ctx"]}"></audio>'
                         f'<div class="m">SFX ort. şarkıdan {p["gain_db"]-0:+.1f} dB kazançla; ilk vuruşta (0,5 sn) ort. fark {p["delta_hit"]:+.1f} dB, olay boyunca {p["delta_mean"]:+.1f} dB, tepe {p["mix_max_whole"]:.1f} dBFS</div></div>')
            h.append('</div></div>')
        h.append('</section>')
    h.append('</main></body></html>')
    open(f"{OUT}/index.html", "w", encoding="utf-8").write("\n".join(h))
    write_sources()

def write_sources():
    L = ["# SFX sources and licences", "",
         "All Kenney.nl packs are CC0 1.0 (public domain), no attribution required, https://creativecommons.org/publicdomain/zero/1.0/ (License.txt in each pack).",
         "Packs used (downloaded 2026-10-18):", ""]
    packs = {"Interface Sounds": "https://kenney.nl/assets/interface-sounds", "Impact Sounds": "https://kenney.nl/assets/impact-sounds",
             "UI Audio": "https://kenney.nl/assets/ui-audio", "Digital Audio": "https://kenney.nl/assets/digital-audio",
             "RPG Audio": "https://kenney.nl/assets/rpg-audio", "Sci-Fi Sounds": "https://kenney.nl/assets/sci-fi-sounds"}
    for k, v in packs.items(): L.append(f"- {k}: {v}")
    L += ["", "Synthesized parts: generated by `tools/sfx/sfx_candidates.py` (numpy), original, no licence encumbrance.", "",
          "Song excerpts in `*-sarkida.mp3` are cut from the project's own track for audition only.", "",
          "| Candidate | Source (file / synthesis) | Licence |", "|---|---|---|"]
    for ev in EVENTS:
        for c in ev["cands"]:
            lic = "CC0 (Kenney) + original synthesis" if "Kenney" in c["src"] and "Sentez" in c["src"] else ("CC0 (Kenney)" if "Kenney" in c["src"] else "original synthesis")
            L.append(f"| {c['id']} | {c['src']} | {lic} |")
    open(f"{OUT}/SOURCES.md", "w", encoding="utf-8").write("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
