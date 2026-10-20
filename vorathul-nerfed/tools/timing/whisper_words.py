"""Word-level English transcription of the song (faster-whisper, CPU int8).
usage: uv run --with faster-whisper python whisper_words.py OUT.json [model] [clip_start,clip_end] [prompt]"""
import json, sys, time, subprocess
import numpy as np
from faster_whisper import WhisperModel
import os
from pathlib import Path
SRC = os.environ.get("WHISPER_SRC", str(Path(__file__).resolve().parents[2] / "audio" / "Vorathul.Nerfed.wav"))
out = sys.argv[1]; model = sys.argv[2] if len(sys.argv) > 2 else "large-v3"
clip = sys.argv[3] if len(sys.argv) > 3 else "0"
prompt = sys.argv[4] if len(sys.argv) > 4 else None
t0 = time.time()
# decode ourselves: faster-whisper's PyAV decode crashes with the av build uv resolves here
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", SRC, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(raw, dtype=np.float32)
m = WhisperModel(model, device="cpu", compute_type="int8")
segs, info = m.transcribe(audio, word_timestamps=True, language="en", vad_filter=False,
                          condition_on_previous_text=False, temperature=0.0, clip_timestamps=clip, initial_prompt=prompt)
res = []
for s in segs:
    res.append({"text": s.text, "start": s.start, "end": s.end,
                "words": [{"w": w.word.strip(), "s": w.start, "e": w.end, "p": w.probability} for w in s.words]})
    print(round(s.start, 1), s.text, flush=True)
json.dump({"model": model, "runtime_s": time.time() - t0, "segments": res}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("segments", len(res), "runtime_s", round(time.time() - t0))
