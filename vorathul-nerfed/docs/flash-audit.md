# Vorathul NERFED - photosensitivity audit of the planned flashing (read-only)

Rule: strict counting, every large frame-wide luminance swing = 1 flash, at most 3 in any 30-frame window (30 fps), window = frames [s, s+29]. Cost model: ImpactBurst `flash` n = n+1 swings; each DuotoneFlash cue change = 1 (a grade and its return = 2); hard cut between very different plates (ivory painting / black / office grey) = 1; white-out in / out = 1 each. A cut and a grade cue that land on the same frame are counted once.

Sources read: docs/storyboard-01-intro-to-unfair.md, docs/storyboard-02-chorus-to-end.md, data/timing.json, video/src/vfx/flash.ts, ImpactBurst.tsx, tools/flashcheck.py. No repo file was edited. The audit scripts were throwaway and are not in the repo; the counts below are their output.

## 1. Anchor check (beat / hit / word -> frame = round(t*30))

- All 523 Appendix A anchors (`beat[n]`, `hit[n]`, `word('x', n)`, both storyboards) were recomputed from data/timing.json with the same rules as video/src/timing.ts (`word` = normalised consecutive-token match, nth occurrence). **0 disagreements** with the frame written next to each anchor. The `by being hated` and `Voratho's` anchors resolve.
- Shot-table frame ranges (S01-S115): every range starts on the first Appendix event of the shot and ends where the next shot starts. Only S01 differs (table starts f0, first event is f13: first gold stroke, intended).
- Frames quoted in the X01-X29 table and in the part-1 'Colour collisions added' table are all Appendix event frames except two that are not events: f3715 (X06, end of the S56 growl flash) which equals `beat[382]` f3715 and is valid, and f2240 (S30-31 'band visible'), a descriptive frame with no event.
- **Real mismatch, not in the docs:** `data/timing.json` `hits[].frame` differs by 1 from `round(t*30)` for 20 hits (field / round): hit[10] 655/654, 17 1043/1042, 20 1294/1293, 21 1323/1322, 28 1584/1583, 32 1642/1641, 33 1700/1699, 35 1729/1728, 36 1758/1757, 41 2009/2008, 44 2125/2124, 54 2424/2425, 57 2485/2484, 64 3937/3936, 66 4081/4082, 69 4154/4155, 71 4176/4175, 84 7862/7861, 86 7891/7892, 87 7901/7902. The docs, events.ts and beatcheck use round(t*30); any code that reads `hits[i].frame` would be 1 frame off on those. Flash windows are unaffected (X27 recounted with the `.frame` values: still max 3).

## 2. Swing sources in the plan (literal reading)

94 planned sources, 141 swings. Cost in brackets when not 1. Ambiguous costs are discussed in section 6.

| ID | Shot | Source | Frames (cost) | Anchor | Note |
|---|---|---|---|---|---|
| W01 | S02 | hard cut black->painting | f104 | word('VORASOL', 0) | S01 black field to the wide painting |
| W02 | S07 | ImpactBurst flash 2 (posterise black/ivory) | f587 (3) | hit[4] | part-1 collision table; in, change, out |
| W03 | S09 | ImpactBurst flash 2 (posterise black/ivory) | f640 (3) | hit[9] | part-1 collision table; in, change, out |
| W04 | S11 | ImpactBurst flash 2 (posterise black/ivory) | f742 (3) | hit[14] | part-1 collision table; in, change, out |
| W05 | S15 | ImpactBurst flash 2 (posterise black/ivory) | f1042 (3) | hit[17] | part-1 collision table; in, change, out |
| W06 | S16 | ImpactBurst flash 2 (posterise black/ivory) | f1120 (3) | hit[18] | part-1 collision table; in, change, out |
| W07 | S19 | ImpactBurst flash 2 (posterise black/ivory) | f1371 (3) | hit[25] | part-1 collision table; in, change, out |
| W08 | S19 | ImpactBurst flash 2 (posterise black/ivory) | f1439 (3) | beat[148] | part-1 collision table; in, change, out |
| W09 | S22 | ImpactBurst flash 2 (posterise black/ivory) | f1583 (3) | hit[28] | part-1 collision table; in, change, out |
| W10 | S24 | ImpactBurst flash 2 (posterise black/ivory) | f1699 (3) | hit[33] | part-1 collision table; in, change, out |
| W11 | S28 | ImpactBurst flash 2 (posterise black/ivory) | f2087 (3) | word('all', 0) | part-1 collision table; in, change, out |
| W12 | S22 | DuotoneFlash hard V grade, 1 beat | f1583, f1593 | hit[28] | in on hit[28], return assumed ~1 beat (10 f) later (return frame not given) |
| W13 | S24 | DuotoneFlash hard V grade, 1 beat | f1699, f1709 | hit[33] | same; return frame not given |
| W14 | S26 | hard cut P->O + soft O grade 2 frames | f1850, f1852 | word('controllers', 0) | cut and grade-in coincide (1); grade out at f1852 (1) |
| W15 | S27 | hard cut O->P | f1930 | word('wall', 0) | cut back to meteor rain |
| W16 | S31 | soft gold->grey drain snaps back + "100 % flash" | f2313 | word('update', 0) | snap-back counted 1; the extra "gold flash" on update is ambiguous (+1 or +2) |
| W17 | S33 | freeze soft grade in / out | f2347, f2364 | beat[242] | soft cue on f2347, null on f2364 |
| W18 | S37 | hard cut O->P (inside painting) | f2574 | word('forty', 0) |  |
| W19 | S37 | hard 1-frame M/ink grade on delete | f2593, f2594 | word('percent', 0) | 1 frame = in + out |
| W20 | S39 | hard 1-frame M/ink grade on delete | f2657, f2658 | word('removed', 0) |  |
| W21 | S40 | hard cut P->O | f2695 | word('Phase', 0) |  |
| W22 | S41 | hard cut O->P | f2726 | word('removed', 1) |  |
| W23 | S41 | hard 1-frame M/ink grade on delete | f2735, f2736 | beat[281] |  |
| W24 | S42 | hard cut P->O | f2772 | word('Players', 1) |  |
| W25 | S43 | hard cut O->P | f2821 | word('fight', 0) |  |
| W26 | S45 | sky-only black/violet grade, 1 beat | f2963, f2973 | word('unfair', 1) | P0 layer only (area < full frame); return frame not given |
| W27 | S48 | soft grey bleed (X03) in / out | f3272, f3290 | word('gloom', 0) |  |
| W28 | S49 | cut to torn-paper ground | f3299 | word('I', 2) | black/violet collage ground |
| W29 | S49 | X04 hard V duotone on, held (reading a) | f3328, f3425 | word('was', 2) | on at panel 1, off when the kid bursts through; panels 2-3 same colours = no new swing |
| W30 | S53 | ImpactBurst flash 2 (shoe posterise) | f3576 (3) | word('shoe', 0) | X05; the sole-fills-frame cut coincides |
| W31 | S54 | growl flash hard V, 1 beat | f3590, f3599 | word('They', 0) | X06; out on beat[370] |
| W32 | S56 | growl flash hard V | f3702, f3715 | word('My', 3) | X06; out on beat[382] (13 f, not 9) |
| W33 | S57 | cut ECU slit -> wide sky | f3751 | word('my', 4) | dark ECU to sky wide; lightning f3766 not counted (ambiguous) |
| W34 | S59 | hard cut P->O (X12) | f3930 | word('Now', 1) |  |
| W35 | S60 | hard cut O->P (letterboxed cutscene) | f3968 | word('skips', 0) |  |
| W36 | S62 | hard cut P->O | f4117 | word('Patch', 3) |  |
| W37 | S64 | hard cut O->P | f4260 | hit[73] |  |
| W38 | S64 | letterbox guillotine closes | f4280 | word('skipped', 0) | counted 1 if bars close to full black; ambiguous |
| W39 | S65 | guillotine bars gone / cut to wide | f4317 | word('Voratho's', 1) |  |
| W40 | S67 | X14 MY hard V cue | f4427 | word('My', 5) |  |
| W41 | S67 | X14 THEME hard O cue | f4443 | word('theme', 1) |  |
| W42 | S67 | X14 SONG null (P) cue | f4465 | word('song', 1) |  |
| W43 | S70 | soft grey bleed (X03) in / out | f4785, f4802 | word('gloom', 1) |  |
| W44 | S73 | ImpactBurst flash 2 (shoe posterise) | f5087 (3) | word('shoe', 1) | X05 |
| W45 | S76 | memory panel soft duotone / cut | f5464 | word('So', 0) |  |
| W46 | S76 | pull back to monitor (cue out / cut to office) | f5564 | word('finally', 1) |  |
| W47 | S77 | cut back inside ECU slit | f5627 | word('You', 1) |  |
| W48 | S79 | cut inside -> POV through weave (office blurred) | f5882 | word('by being hated', 0) |  |
| W49 | S81 | hard cut P<->O | f5946 | beat[605] |  |
| W50 | S82 | hard cut P<->O | f6023 | beat[613] |  |
| W51 | S83 | hard cut P<->O | f6100 | beat[621] |  |
| W52 | S84 | hard cut P<->O | f6178 | beat[629] |  |
| W53 | S85 | hard cut P<->O | f6255 | beat[637] |  |
| W54 | S86 | hard cut P<->O | f6294 | beat[641] |  |
| W55 | S87 | hard cut P<->O | f6332 | beat[645] |  |
| W56 | S88 | hard cut P<->O | f6371 | beat[649] |  |
| W57 | S89 | strobe cut P<->O (2-beat) | f6410 | beat[653] |  |
| W58 | S89 | strobe cut P<->O (2-beat) | f6429 | beat[655] |  |
| W59 | S89 | strobe cut P<->O (2-beat) | f6448 | beat[657] |  |
| W60 | S89 | strobe cut P<->O (2-beat) | f6468 | beat[659] |  |
| W61 | S89 | strobe cut P<->O (2-beat) | f6487 | beat[661] |  |
| W62 | S89 | strobe cut P<->O (2-beat) | f6506 | beat[663] |  |
| W63 | S89 | strobe cut P<->O (2-beat) | f6526 | beat[665] |  |
| W64 | S89 | strobe cut P<->O (2-beat) | f6545 | beat[667] |  |
| W65 | S90 | strobe cut P<->O (1-beat) | f6564 | beat[669] |  |
| W66 | S90 | strobe cut P<->O (1-beat) | f6574 | beat[670] |  |
| W67 | S90 | strobe cut P<->O (1-beat) | f6584 | beat[671] |  |
| W68 | S90 | strobe cut P<->O (1-beat) | f6593 | beat[672] |  |
| W69 | S90 | strobe cut P<->O (1-beat) | f6603 | beat[673] |  |
| W70 | S90 | strobe cut P<->O (1-beat) | f6613 | beat[674] |  |
| W71 | S90 | strobe cut P<->O (1-beat) | f6622 | beat[675] |  |
| W72 | S90 | strobe cut P<->O (1-beat) | f6632 | beat[676] |  |
| W73 | S90 | strobe cut P<->O (1-beat) | f6642 | beat[677] |  |
| W74 | S90 | strobe cut P<->O (1-beat) | f6651 | beat[678] |  |
| W75 | S90 | strobe cut P<->O (1-beat) | f6661 | beat[679] |  |
| W76 | S90 | white-out in then out (ivory, 2 frames) | f6671, f6673 | beat[680] |  |
| W77 | S91 | ImpactBurst flash 3 (X19) | f6680 (4) | beat[681] | shot table says "posterise 2 frames" (= 3 swings): X19 says flash 3 (= 4) |
| W78 | S95 | ImpactBurst flash 2 (K3 slam posterise) | f6944 (3) | word('tomb', 0) |  |
| W79 | S99 | cut office -> ECU seven eyes (dark) | f7076 | word('rage', 1) | counted 1; see ambiguities |
| W80 | S99 | ImpactBurst flash 2 (A7 posterise, K2 swap) | f7087 (3) | beat[723] |  |
| W81 | S100 | cut K2/dark -> office cursor swarm | f7098 | word('let', 0) |  |
| W82 | S101 | X23 boss band hard black/gold 2 frames | f7153, f7155 | word('boss', 0) |  |
| W83 | S112 | X27 panel cut + hard grade (rotating) | f7852 | hit[83] |  |
| W84 | S112 | X27 panel cut + hard grade (rotating) | f7861 | hit[84] |  |
| W85 | S112 | X27 panel cut + hard grade (rotating) | f7877 | hit[85] |  |
| W86 | S112 | X27 panel cut + hard grade (rotating) | f7892 | hit[86] |  |
| W87 | S112 | X27 panel cut + hard grade (rotating) | f7902 | hit[87] |  |
| W88 | S112 | X27 panel cut + hard grade (rotating) | f7924 | hit[88] |  |
| W89 | S113 | S112 grade returns to ungraded on cut | f7949 | word('Vorathul', 5) | return frame not stated; assumed on the S113 cut |
| W90 | S113 | white-out in then out (ivory, 2 frames) | f7991, f7993 | beat[815] |  |
| W91 | S113 | grade beat 816 (black/violet) | f8000 | beat[816] |  |
| W92 | S113 | grade beat 817 (gold/ivory) | f8010 | (unanchored: derived) |  |
| W93 | S113 | grade beat 818 (grey/white) | f8020 | beat[818] |  |
| W94 | S114 | grade returns to ungraded | f8030 | (unanchored: derived) | return not stated; assumed beat[819] |

Not counted (local, under the 25 % area rule, or gradual): stamps (X01), PaintSpread/PaintSeep rings (S36-S41), CrackGrow, CanvasBulge, Shards, EchoTrail, shakes, speed lines, ink splashes, the S30-S31 edge-masked gold-to-grey drain (f2234-f2305), pipe relights, K1-K4 still swaps that are not under a posterise, the S115 ink flood (one fade at most).

## 3. Sliding 30-frame window: violations (plan as written)

Windows over 3: 165 start frames, merging into **6 violation zones**.

| Zone | Window starts | Shots | Swings inside | Max in one window |
|---|---|---|---|---|
| Z1 | f1554-f1583 | S22 (helm split) | f1583 ImpactBurst flash 2 (3) + hard V grade in f1583 and out ~f1593 (2) | 5 |
| Z2 | f1670-f1699 | S24 (second-form slam) | f1699 ImpactBurst flash 2 (3) + hard V grade (2) | 5 |
| Z3 | f3561-f3576 | S53 + S54 | f3576 shoe posterise (3), f3590 growl flash in (1), f3599 out (1) | 5 |
| Z4 | f6564-f6680 (windows reach f6709) | S90 strobe + white-out + S91 shatter | S90 one-beat cuts f6564..f6661 (11 cuts about 9.8 f apart, so 4 fit in 30 frames), white-out f6671/f6673 (2), S91 ImpactBurst flash 3 f6680 (4) | 4 on the strobe alone, **8** in f6651-f6680 |
| Z5 | f7058-f7087 | S99 + S100 | f7076 cut to ECU eyes (1), f7087 A7 posterise (3), f7098 cut to cursor swarm (1) | 5 (4 if the f7076 cut is not counted) |
| Z6 | f7981-f7993 | S113 | f7991 white-out in/out (2) + grades on beats 816, 817, 818 = f8000, f8010, f8020 (3); 6 if the white-out is an ImpactBurst flash 2 | 5 |

Known suspects, verdict:

- **S113: violation (Z6).** 5 swings between f7991 and f8020 (29 frames). The doc's 'at most 3 flashes a second' holds for the three grades alone and breaks once the white-out is added. The return to ungraded after beat 818 is not stated (assumed beat[819] f8030); it would be a 6th swing one frame outside the window.
- **X27: passes, zero margin.** Six panels f7852, f7861, f7877, f7892, f7902, f7924 (hit[83..88]): max 3 ([7852..7881] and [7877..7906]). Still 3 with the `hits[].frame` values (7862, 7891, 7901). It depends on each panel's cut and its grade cue landing on the same frame: staggered by one frame, each panel costs 2 and the max becomes 6.
- **X04: passes in the literal reading, fails in the 'per panel' reading.** Literal ('hard black/violet', same colours, and duotoneSwings skips a cue with identical colours): cut f3299 (1) + on f3328 (1) + off f3425 (1), max 3 with X03's f3290 nearby. If every panel (f3328, f3347, f3362) gets its own hard cue with a return: 6 swings in 34 frames, max 4 in f3328-f3376.
- **S53 / S73 shoe smacks:** S53 violates (Z3, with the S54 growl). S73 f5087 is isolated (3 swings, nothing within 29 frames) and passes with zero margin; the three smacks before it (f5045/5064/5072) carry no flash in the plan. If any smack took ImpactBurst flash >= 1 the window [5058..5087] breaks.
- **S54 / S56 growl flashes:** S54 violates only because of S53 (Z3); alone it is 2 swings. S56 (f3702 in, f3715 out) is 2 and isolated, passes. Both are 'one beat' in the text but 9 frames (S54, out on beat[370]) vs 13 frames (S56, out on beat[382]).
- **X14 MY / THEME / SONG:** passes. f4427, f4443, f4465: gaps 16 and 22, span 38, so a 30-frame window holds at most 2. If cut and cue are staggered the max becomes 4.

## 4. Proposed respacing (each recounted with the same window code)

| Zone | Fix (beat sync kept) | Recount |
|---|---|---|
| Z1 S22 f1583 | `ImpactBurst flash 0` (star, shake, speed lines stay) and let the existing hard black/violet grade be the impact flash: in on hit[28] f1583, out f1593. Alternative: keep flash 2 and drop the V grade. | 5 -> 2 (alt 3) |
| Z2 S24 f1699 | Same: flash 0 + V grade f1699 / f1709 (alt: flash 2, no V grade). | 5 -> 2 (alt 3) |
| Z3 S53/S54 | `ImpactBurst flash 0` on the shoe frame f3576 (the sole filling the lens is the picture; keep shake and the flight arc), keep the S54 growl flash f3590-f3599. S73 f5087 keeps flash 2 (the one posterise of the pair; the joke is that he does not react). Fallback: keep S53 flash 2 and start the growl on beat[371] f3608, out beat[372] f3618 (>= 30 frames after f3576); this squeezes A2's antic (f3599) to 20 frames. | 5 -> 3 (cut 1 + growl 2); fallback 3 |
| Z4 S90/S91 | (a) S90 cuts at the S89 2-beat cadence: f6564 (b669), f6584 (b671), f6603 (b673), f6622 (b675), f6642 (b677, crack 19 reaches the frame), f6661 (b679, office: crack crosses into the wall, moved from b678 f6651 by one beat; drop the 'eye full violet inside' cut). (b) White-out in f6671 (b680), **held ivory** to f6680, no separate out swing. (c) S91 f6680: `ImpactBurst flash 0` (shards, shake); the end of the white-out is the cut to the shatter. | 8 -> 3. Windows [6651..6680] = f6661, f6671, f6680 and [6642..6671] = f6642, f6661, f6671: zero margin. Dropping the f6661 cut gives 2 but loses the wall-crossing cut |
| Z5 S99/S100 | `ImpactBurst flash 0` at f7087 (the K2 swap happens dark-on-dark inside the ECU of the void; mask it with the EchoTrail smear and window Shards). Keep the cuts f7076 and f7098. | 5 -> 2. Flash 1 would give 4 and still fail; flash 1 passes only if the f7076 cut is judged not a swing (2+1 = 3) |
| Z6 S113 | f7991 white-out in, **held ivory 9 frames** straight into the beat-816 black/violet cue (no separate out swing); f8000 b816 black/violet; f8010 b817 gold/ivory; f8030 b819 grey/white (moved from b818); f8040 b820 return to ungraded. S114 still cuts on b818 f8020 and sits under the gold/ivory then grey/white grade for two beats. | 5 -> 3. Windows [7991..8020] = 7991, 8000, 8010; [8010..8039] = 8010, 8030. Five swings over f7991-f8040. Fallback if a grade over the smoke clearing is unwanted: drop the grey/white grade and return at b819 f8030 (4 swings, max 3) |

Recount of the whole film with all six fixes applied: 120 swings, **max 3 in any 30-frame window, 0 violating windows**.

Spots that sit at exactly 3 in the fixed plan (any extra swing within 29 frames breaks them): single ImpactBurst posterise at f587, f640, f742, f1042, f1120, f1371, f1439, f2087, f5087, f6944; X03/X04 f3272-f3299; f2574-f2594 and f2726-f2736 (cut + 1-frame M grade); f3576-f3599; f6642-f6680; X27 f7852-f7877 and f7877-f7902; S113 f7991-f8010.

## 5. Fixed-plan swing schedule used for the recount

| Frame | Swings | Shot | Source |
|---|---|---|---|
| f104 | 1 | S02 | hard cut black->painting |
| f587 | 3 | S07 | ImpactBurst flash 2 (posterise black/ivory) |
| f640 | 3 | S09 | ImpactBurst flash 2 (posterise black/ivory) |
| f742 | 3 | S11 | ImpactBurst flash 2 (posterise black/ivory) |
| f1042 | 3 | S15 | ImpactBurst flash 2 (posterise black/ivory) |
| f1120 | 3 | S16 | ImpactBurst flash 2 (posterise black/ivory) |
| f1371 | 3 | S19 | ImpactBurst flash 2 (posterise black/ivory) |
| f1439 | 3 | S19 | ImpactBurst flash 2 (posterise black/ivory) |
| f1583 | 1 | S22 | DuotoneFlash hard V grade, 1 beat |
| f1593 | 1 | S22 | DuotoneFlash hard V grade, 1 beat |
| f1699 | 1 | S24 | DuotoneFlash hard V grade, 1 beat |
| f1709 | 1 | S24 | DuotoneFlash hard V grade, 1 beat |
| f1850 | 1 | S26 | hard cut P->O + soft O grade 2 frames |
| f1852 | 1 | S26 | hard cut P->O + soft O grade 2 frames |
| f1930 | 1 | S27 | hard cut O->P |
| f2087 | 3 | S28 | ImpactBurst flash 2 (posterise black/ivory) |
| f2313 | 1 | S31 | soft gold->grey drain snaps back + "100 % flash" |
| f2347 | 1 | S33 | freeze soft grade in / out |
| f2364 | 1 | S33 | freeze soft grade in / out |
| f2574 | 1 | S37 | hard cut O->P (inside painting) |
| f2593 | 1 | S37 | hard 1-frame M/ink grade on delete |
| f2594 | 1 | S37 | hard 1-frame M/ink grade on delete |
| f2657 | 1 | S39 | hard 1-frame M/ink grade on delete |
| f2658 | 1 | S39 | hard 1-frame M/ink grade on delete |
| f2695 | 1 | S40 | hard cut P->O |
| f2726 | 1 | S41 | hard cut O->P |
| f2735 | 1 | S41 | hard 1-frame M/ink grade on delete |
| f2736 | 1 | S41 | hard 1-frame M/ink grade on delete |
| f2772 | 1 | S42 | hard cut P->O |
| f2821 | 1 | S43 | hard cut O->P |
| f2963 | 1 | S45 | sky-only black/violet grade, 1 beat |
| f2973 | 1 | S45 | sky-only black/violet grade, 1 beat |
| f3272 | 1 | S48 | soft grey bleed (X03) in / out |
| f3290 | 1 | S48 | soft grey bleed (X03) in / out |
| f3299 | 1 | S49 | cut to torn-paper ground |
| f3328 | 1 | S49 | X04 hard V duotone on, held (reading a) |
| f3425 | 1 | S49 | X04 hard V duotone on, held (reading a) |
| f3576 | 1 | S53 | cut to boot sole filling frame (ImpactBurst flash 0) |
| f3590 | 1 | S54 | growl flash hard V, 1 beat |
| f3599 | 1 | S54 | growl flash hard V, 1 beat |
| f3702 | 1 | S56 | growl flash hard V |
| f3715 | 1 | S56 | growl flash hard V |
| f3751 | 1 | S57 | cut ECU slit -> wide sky |
| f3930 | 1 | S59 | hard cut P->O (X12) |
| f3968 | 1 | S60 | hard cut O->P (letterboxed cutscene) |
| f4117 | 1 | S62 | hard cut P->O |
| f4260 | 1 | S64 | hard cut O->P |
| f4280 | 1 | S64 | letterbox guillotine closes |
| f4317 | 1 | S65 | guillotine bars gone / cut to wide |
| f4427 | 1 | S67 | X14 MY hard V cue |
| f4443 | 1 | S67 | X14 THEME hard O cue |
| f4465 | 1 | S67 | X14 SONG null (P) cue |
| f4785 | 1 | S70 | soft grey bleed (X03) in / out |
| f4802 | 1 | S70 | soft grey bleed (X03) in / out |
| f5087 | 3 | S73 | ImpactBurst flash 2 (shoe posterise) |
| f5464 | 1 | S76 | memory panel soft duotone / cut |
| f5564 | 1 | S76 | pull back to monitor (cue out / cut to office) |
| f5627 | 1 | S77 | cut back inside ECU slit |
| f5882 | 1 | S79 | cut inside -> POV through weave (office blurred) |
| f5946 | 1 | S81 | hard cut P<->O |
| f6023 | 1 | S82 | hard cut P<->O |
| f6100 | 1 | S83 | hard cut P<->O |
| f6178 | 1 | S84 | hard cut P<->O |
| f6255 | 1 | S85 | hard cut P<->O |
| f6294 | 1 | S86 | hard cut P<->O |
| f6332 | 1 | S87 | hard cut P<->O |
| f6371 | 1 | S88 | hard cut P<->O |
| f6410 | 1 | S89 | strobe cut P<->O (2-beat) |
| f6429 | 1 | S89 | strobe cut P<->O (2-beat) |
| f6448 | 1 | S89 | strobe cut P<->O (2-beat) |
| f6468 | 1 | S89 | strobe cut P<->O (2-beat) |
| f6487 | 1 | S89 | strobe cut P<->O (2-beat) |
| f6506 | 1 | S89 | strobe cut P<->O (2-beat) |
| f6526 | 1 | S89 | strobe cut P<->O (2-beat) |
| f6545 | 1 | S89 | strobe cut P<->O (2-beat) |
| f6564 | 1 | S90 | strobe cut P<->O (2-beat, beats 669..679) |
| f6584 | 1 | S90 | strobe cut P<->O (2-beat, beats 669..679) |
| f6603 | 1 | S90 | strobe cut P<->O (2-beat, beats 669..679) |
| f6622 | 1 | S90 | strobe cut P<->O (2-beat, beats 669..679) |
| f6642 | 1 | S90 | strobe cut P<->O (2-beat, beats 669..679) |
| f6661 | 1 | S90 | strobe cut P<->O (2-beat, beats 669..679) |
| f6671 | 1 | S90 | white-out in, held ivory 9 f |
| f6680 | 1 | S91 | white-out out into shatter (ImpactBurst flash 0) |
| f6944 | 3 | S95 | ImpactBurst flash 2 (K3 slam posterise) |
| f7076 | 1 | S99 | cut office -> ECU seven eyes (dark) |
| f7098 | 1 | S100 | cut K2/dark -> office cursor swarm |
| f7153 | 1 | S101 | X23 boss band hard black/gold 2 frames |
| f7155 | 1 | S101 | X23 boss band hard black/gold 2 frames |
| f7852 | 1 | S112 | X27 panel cut + hard grade (rotating) |
| f7861 | 1 | S112 | X27 panel cut + hard grade (rotating) |
| f7877 | 1 | S112 | X27 panel cut + hard grade (rotating) |
| f7892 | 1 | S112 | X27 panel cut + hard grade (rotating) |
| f7902 | 1 | S112 | X27 panel cut + hard grade (rotating) |
| f7924 | 1 | S112 | X27 panel cut + hard grade (rotating) |
| f7949 | 1 | S113 | S112 grade returns to ungraded on cut |
| f7991 | 1 | S113 | white-out in, held ivory 9 f -> V cue |
| f8000 | 1 | S113 | V cue beat 816 (replaces ivory) |
| f8010 | 1 | S113 | gold/ivory cue beat 817 |
| f8030 | 1 | S113 | grey/white cue beat 819 (moved from 818) |
| f8040 | 1 | S114 | return to ungraded beat 820 |

## 6. Ambiguities in the wording (cost unclear)

1. **Impact recipe vs collision table.** storyboard-01 s0.2 says every fight impact draws N, N+1 as a black-on-ivory silhouette (= flash 2, 3 swings). The 'Colour collisions added' table applies the posterise only to 10 big impacts. Literal reading = 29 impacts (S07-S28) with flash 2: extra violations at f684/f703 (19 apart), f936/f965 (29), f1371/f1400 (29), f1989/f2008/f2028. Resolve: state that the silhouette frames belong to the 10 listed impacts only; all others flash 0.
2. **S16 f1120** ladder s2.2 says 'gold flash 2 frames' next to the table's ImpactBurst flash: same flash or an extra one? Extra = +2 swings, 5 in the window (new violation).
3. **S31 f2313** 'snaps back to full colour with the 100 % flash' / 'gold flash on update': counted 1 (the snap); a separate gold flash would be +1 to +2, still <= 3 here.
4. **'One beat' grades with no return frame:** S22, S24, S45 (return assumed +10 f), S54 (9 f, b370), S56 (13 f, b382), S112 last panel and S113/S114 (assumed b819). The return is a swing; where it is missing the cost is unknown.
5. **X04 'DuotoneFlash hard per panel'**: one held cue, or a cue per panel with a return (2 swings each)? 2 vs 6 swings.
6. **S57** 'boil', 'lightning strike' f3766, 'freezes magenta checker': a lightning flash or lit-sky frame would be 1-2 swings; not counted. **S60** 'poses hard-cut every 2 frames' (25 cuts in 50 frames = a 15 Hz alternation of a black figure on gold, plus ScribbleBoil scribbles and a racing scrub head): counted 0 because each cut changes part of the frame, but this is the one place where area may pass 25 %: render and measure.
7. **S58 / S64 letterbox:** 'slams in' (bars = 26 % of the frame, counted 0) and 'guillotine ... shut' f4280 (counted 1, to full black) with the matching reopen at f4317 (counted 1). If the guillotine only closes the letterbox it is 0.
8. **S89 / S90 'Strobe':** counted 1 per painting<->office cut by the contract's plate rule. The doc argues gold vs office grey is similar brightness; flashcheck.py only registers a cell when its luminance moves >= 0.10 and the darker state is < 0.80, so some of these cuts may measure as 0. Not measured here; do not rely on it. S90 'cut every beat' is about 9.8 frames, i.e. 4 cuts in 29 frames.
9. **S91 posterise:** shot table 'posterise black/ivory 2 frames' (3 swings) vs X19 'ImpactBurst flash 3' (4 swings). The white-out 'ivory field' at f6671 has no stated out frame; S113 'white-out 2 frames' could be a plain in/out (2) or an ImpactBurst flash 2 (3).
10. **S99 f7076** 'ECU on the seven eyes' (black void) and S100 f7098 'cursor swarm' office: counted as hard plate cuts (1 each); the first is borderline and decides whether flash 1 would be acceptable.
11. **S94 A4** 'whole body clears the frame', 'grows to fill the frame height' (a black mass filling the frame): not counted. **S95** gold floor wave f6951 (radial, not counted).
12. **S107 TimeRemap** (f7417-f7445) replays part-1 edit frames f2726 -> f2532 at about 6.9 source frames per output frame: the 1-frame hard M/ink grades at f2735, f2657, f2593 may re-appear as flashes (up to +4 swings, a 4-swing window around f7412-f7461). Exclude DuotoneFlash/ImpactBurst tracks from the remap, or assert that it skips 1-frame cues.
13. **Soft grades / fades:** flash.ts `duotoneSwings` counts every palette change (soft too) as 1, and flashcheck.py merges a multi-frame fade into one change. The edge-masked drain (f2234-f2305) and the S115 flood were counted 0 (area-limited / gradual) but could each register as one change.
14. **Wording only, no luminance meaning:** 'blinks in the silence' (S64 f4306, a character blink), 'slit flicker' (S61), 'slit flickers to sad' (S56), 'wing flap'. Real and counted: 'Growl flash', 'Strobe', 'white-out'. Unclear: 'gold flash' (items 2, 3).

## 7. Other readings, recounted (plan as written, one change at a time)

| Reading | Extra violation zones beyond Z1-Z6 |
|---|---|
| Recipe silhouette on all 29 IMPACT events (ambiguity 1) | f674-f713, f936-f965, f1371-f1400, f1979-f2037 (6 swings each) |
| X04 per-panel cues (ambiguity 5) | f3328-f3376 (4 swings) |
| Separate gold flashes at f1120 and f2313 (ambiguities 2, 3) | f1091-f1149 (5 swings) |
| TimeRemap replays part-1 grades (ambiguity 12) | f7412-f7461 (4 swings) |
| Painting<->office cuts counted 0 (similar brightness) | Z4 shrinks to f6651-f6709 only (white-out + shatter); the others are unchanged |