"""Chroma of the song around each tonal SFX event (ear-proxy for the ambiguous key)."""
import numpy as np, soundfile as sf, sys
from pathlib import Path
from scipy.signal import stft
SONG = str(Path(__file__).resolve().parents[2] / "sarki" / "her-sabah-bastan.wav")
NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
x, sr = sf.read(SONG, always_2d=True); m = x.mean(1)
events = {"B1 pop 15.6":15.6048,"A intro 3":4.3,"C verse1 21.2":21.2335,"G lamps 90.5":90.5,
          "H torch 104.6":104.6,"J solo 160":160.0,"J final 190":190.0,"K riser 209":209.5,"L shatter 213.2":213.2,"B2 fade 235":235.0,"D chorus 56.9":56.8553}
for k,t in events.items():
    seg = m[int((t-1.5)*sr):int((t+2.0)*sr)]
    f,_,Z = stft(seg, sr, nperseg=16384, noverlap=8192)
    P = np.abs(Z).mean(1)**2
    ch = np.zeros(12)
    for fi,p in zip(f,P):
        if 60<fi<2000:
            ch[int(round(12*np.log2(fi/440)+9))%12] += p
    ch/=ch.sum(); o=np.argsort(ch)[::-1][:4]
    print(f"{k:18s}", " ".join(f"{NAMES[i]}:{ch[i]:.2f}" for i in o))
