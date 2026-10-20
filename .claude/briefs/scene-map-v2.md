# Brief: scene map v2 — break the single split screen, flow like water, stay with the lyrics

Repo C:\Users\burcu\Documents\klip-her-sabah (Windows, Git Bash; local git, NEVER push; do not commit). Files in English.
Sub-agents you spawn must be `sonnet` (e.g. extracting the lyric/time table). This is design work: no video code.

## Burak's direction (verbatim, Turkish; this is the brief's authority)
- "klibin tamamının tek bir ekranda olması bence sürekli tek bir ekran 2 karakter var evet bu güzel bir tema ama sürekli bu
  olunca durağan ve monoton bir klip oluyor onun yerine girişte ki gibi girişler belki insan dışardayken bile ai ile ilgili düş
  kuruyor tarzı böyle bazen tek rengin hakim olduğu işte ai kendini eğitip model yükseltiyor model değişiyor ama akış
  değişmiyor gibi bu tarz geçişler ve farklılıklar klibe renk katar diye düşünüyorum burada tamamen yaratıcı ve cesur gitmek
  isterim"
- "bazı hareketler sözlerden ve kliptende çok bağımsız oluyor gibi daha anlamlı hareketler de olsa daha iyi olur birden fazla
  hareket değil farklı state değil ama bir animasyon uzun olsun mesela bilgisayar başında kod yazsın gitsin kahve alsın
  gerilsin ve sonra tekrar bilgisayar başına geçsin gibi ayrıca böyle işte günler geçiyor efekti de verebiliriz karakterlerin
  duygularını böyle ufak simgelerle verebiliriz üstünde kırmızı sinir ikonu böyle yorgunluk şaşırma ikonları falan bazen
  gerektiği yerlerde"
- "sahne geçişleride pürüssüz olsa böyle gerçekten bir su gibi geçişler akıcı bir bütün gibi hissettirse harika olur"
- "şarkının sözleri ile uyumlu olmalı tabi sahnelerde ayrıca şarkı bambaşka sahne bambaşka olursa saçma olur"
- He loves the visual style ("görsel tarz harika"). Keep: the navy human world / cream AI world, the glass between them, the
  yellow notes, the moon, the stamped key words, the screenprint/halftone look, the 3-colour palette.

## Context
- Characters will be re-made in Blender (3D, rendered flat so they read as 2D) — a parallel test is running. So new
  locations, camera moves, long continuous actions and walking are now affordable. Backgrounds can be generated images,
  Blender sets, or both. Typography/notes/stamps stay in Remotion.
- Read: `sahne-haritasi.md` (current story, scene table, line moments, identity, palette, typography, crossing rules),
  `data/timing.json` (sections, lines, words with times, energy_per_bar, vocal_db_per_bar, hits — the song is a human/AI
  duet; male = human, female = AI), `data/timing-summary.md`, `.claude/session-state.md`, style frames in `stil/tur1..3/`.

## Deliverable 1: `.claude/briefs/sahne-haritasi-v2.md`
A full 0:00–4:01 scene map, section by section and LINE BY LINE (every lyric line with its measured time and singer):
- Location/mode per scene, mixing at least: the glass split (home base, returned to, not permanent); the human outside
  (street, bus, café, night walk) daydreaming the AI into reflections; full-frame cream AI world (training / model upgrade:
  the body comes apart and re-forms as a new version but walks the same path — "model değişiyor ama akış değişmiyor"); a
  full-frame single-colour flood (one world overtakes the other, e.g. at the solo cracks); days passing (sun/moon,
  calendar, cups piling, a day counter); close-ups (hands on keys, the screen, a pen on a note, the notebook page).
- What each character DOES: long, meaningful, continuous actions tied to the line (e.g. a work routine across a verse),
  not pose-hopping. Action per character per line, with rough duration.
- Emotion icons (anger vein, sweat drop, "!", "?", zzz, small heart…) — where and why, sparingly; in-palette.
- The TRANSITION into every next scene, designed to flow like water: match cuts on shape/motion, a camera passing through
  the glass/an object (coffee surface → reflection → AI world), colour floods, ink/paper spreading, the frame folding,
  the seam opening — name the device and the beat it lands on. No hard cut unless it is a deliberate musical hit.
- For each line: one sentence on why the image serves the words (the lyric–image check). Flag any line where the current
  map's image is unrelated to the words and propose a replacement.
- Energy: match visual intensity to `energy_per_bar` (quietest bridge half is −25.7 dB; the solo has a +9 dB jump).
- Mark which existing scenes from the current map are kept as they are, kept but re-staged, or replaced.
- A feasibility note per scene for a Blender-character pipeline (simple set? new character pose library? crowd? props?),
  and a rough cost ranking so we can cut if needed.

## Deliverable 2: style frames for 5–6 NEW scenes
- The most important new ideas (e.g. human on the bus with the AI in the window reflection; the AI's model-upgrade
  sequence; a full navy flood; days-passing desk routine; a water-like transition mid-frame; one emotion-icon moment).
- Generate with Codex image_gen, model gpt-6.1-sol, `-i` with `stil/hareket/ref-insan-kanonik.png` and/or
  `stil/hareket/ref-ai.png` (and a tur3 frame for the palette/print look), flat 16:9, ONE image per `codex exec`, take the
  file from `~/.codex/generated_images/<session id from the log>` (never let Codex copy it), verify with md5 and by looking.
  Save to `stil/tur4/` with prompts in `stil/tur4/prompts/` and a contact sheet `stil/tur4/kontak-tur4.jpg`.
- No text in generated images (typography is ours).

## Report (Turkish, plain language, short; the reader is not a specialist)
The new arc in a few sentences, the 5–6 boldest ideas, how the transitions flow, which lines got a better image, and what
you are unsure about (questions for Burak).
