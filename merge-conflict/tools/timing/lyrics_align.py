"""Parse sarki/sozler.md (section headers + voice tags) and align whisper words to lyric words (monotone DP, fuzzy match)."""
import re, json, difflib

FOLD = str.maketrans({"ı": "i", "İ": "i", "I": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g", "ü": "u", "Ü": "u", "ö": "o", "Ö": "o", "ç": "c", "Ç": "c", "â": "a", "î": "i", "û": "u"})
def norm(w):
    w = w.replace("İ", "i").replace("I", "ı").lower()
    w = w.translate(FOLD)
    return re.sub(r"[^a-z0-9]", "", w)

def parse(path):
    """-> sections [{name, header, lines:[{text, voice_tag}]}] ; HTML comments skipped; a leading (Growled)/(Operatic) tag sets voice_tag"""
    secs = []; cur = None
    for raw in open(path, encoding="utf-8"):
        s = raw.strip()
        if not s or s.startswith("<!--"): continue
        m = re.match(r"^\[(.+)\]$", s)
        if m:
            hdr = m.group(1); name = hdr.split(":")[0].strip()
            cur = dict(name=name, header=hdr, lines=[]); secs.append(cur); continue
        if cur is None: continue
        tag = None
        m = re.match(r"^\((Growled|Operatic)\)\s*(.*)$", s)
        if m:
            tag = m.group(1).lower(); s = m.group(2)
        if not norm(s): continue
        cur["lines"].append(dict(text=s, voice_tag=tag))
    return secs

def sim(a, b):
    if a == b: return 1.0
    if not a or not b: return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()

def align(lyric_words, heard, thr=0.62, gap_l=-0.45, gap_h=-0.25):
    """lyric_words: list of normalized tokens; heard: list of normalized whisper tokens.
    Global monotone alignment. returns match[i] = heard index or None for each lyric word."""
    n, m = len(lyric_words), len(heard)
    NEG = -1e9
    D = [[0.0] * (m + 1) for _ in range(n + 1)]; P = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1): D[i][0] = D[i - 1][0] + gap_l; P[i][0] = 1
    for j in range(1, m + 1): D[0][j] = 0.0; P[0][j] = 2          # leading heard words free
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            s = sim(lyric_words[i - 1], heard[j - 1]); sc = (s * 2 - 1.0 + 0.0) if s >= thr else -1.0
            c = [(D[i - 1][j - 1] + sc, 0), (D[i - 1][j] + gap_l, 1), (D[i][j - 1] + (gap_h if j < m else 0.0), 2)]
            D[i][j], P[i][j] = max(c)
    i, j = n, m; match = [None] * n
    while i > 0 and j > 0:
        p = P[i][j]
        if p == 0:
            if sim(lyric_words[i - 1], heard[j - 1]) >= thr: match[i - 1] = j - 1
            i -= 1; j -= 1
        elif p == 1: i -= 1
        else: j -= 1
    return match
