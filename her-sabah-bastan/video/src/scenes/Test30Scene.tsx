// The film from frame 0 to 1:28.7: bars 1-8 are the zoom (ZoomIntro); from the bar 9 downbeat the split rooms are printed over
// the flat cream frame. Every later moment is read from events.ts; what the two characters do is scenes/acting.ts.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { Actor } from '../characters/Actor.tsx';
import { poseBounds, resolveActor } from '../characters/actor.ts';
import { DeskProp, humanHasDesk } from '../world/Desk.tsx';
import { handAt } from '../characters/poses.ts';
import { EVENTS, ev, evFrames } from '../events.ts';
import { FLOOR_Y, H, MOON_R, MOON_SEAM_Y, SEAM_X, W } from '../layout.ts';
import { lerp } from '../math.ts';
import { shuffled } from '../motion/extra.ts';
import { Halftone, Squeegee } from '../motion/entranceViews.tsx';
import { blinkAlpha, dotP, ENTER_FRAMES, glide, wipeP } from '../motion/entrances.ts';
import { palette } from '../style/palette.ts';
import { PaperGrain } from '../style/screenprint.tsx';
import { seeded } from '../style/seeded.ts';
import { BarFlood, floodPulse } from '../transitions/BarFlood.tsx';
import { SEAM_SWEEP, WhiteWave } from '../transitions/WhiteWave.tsx';
import { TIMING } from '../timing.ts';
import { LyricLine } from '../type/LyricLine.tsx';
import { LYRICS } from '../type/lyricLayout.ts';
import { StampWord } from '../type/StampWord.tsx';
import { STAMPS } from '../type/stamps.ts';
import { STAMP_EXIT_FRAMES } from '../motion/entrances.ts';
import { Bubble } from '../world/Bubble.tsx';
import { AI_BUBBLES, HUMAN_BUBBLE_SPECS } from '../world/bubbleLayout.ts';
import { GlassSeam } from '../world/GlassSeam.tsx';
import { NoteFly } from '../world/Notes.tsx';
import { PlateRoom, WallNotes } from '../world/Rooms.tsx';
import { SplitMoon } from '../world/SplitMoon.tsx';
import { Check, GlassNote, GlassNotes, GlassRipple, NotebookDrop, PageSketch } from '../world/Story.tsx';
import { AI, AI_BOOK_X, AI_FLOOR, AI_HOME, AI_PICKUP, AI_REACH_X, DESK_X, FLOOR_X, HUMAN, HUMAN_BUBBLES, HUMAN_FLOOR, LAPSE_FROM, LAPSE_TO, MORNINGS, NOTE_X, STICK_X, NOTE_UNDER_FROM, TALLY_STARTS, TORCH_BEAM, WAVE_X } from './acting.ts';
import { Crates, NotebookLine, OverflowNotes, TorchBeam } from '../world/Verse2.tsx';
import { cameraScale, cameraTransform, CROSS_DIST, CROSS_HOLD, CROSS_OUT, crossPush, HATA, SWAP_MATRIX } from '../world/verse2Geom.ts';
import { clearAmount, clearShift, GLASS_NOTE } from '../world/glassGeom.ts';
import { ZoomIntro } from './ZoomIntro.tsx';

const lineText = (n: number): string => (TIMING.lines[n] as { text: string }).text;

/** Soft edge of the navy room's squeegee, in px. */
const NAVY_SOFT_X = 140;

/** Where the AI's notebook lands: under her hand when she reaches for it (A15 f1); it goes when she picks it up. */
const BOOK_X = AI_BOOK_X;
const BOOK_W = 112;

/** Notes 1-2 leave the laptop; the later ones leave the human's hand at the glass (H12 f3, the offer). */
const LAPTOP = { x: DESK_X - 55, y: HUMAN_FLOOR - 340 };
const SEND_FROM = { x: NOTE_X + 215, y: HUMAN_FLOOR - 555 };
/** Where a note leaves the human at a frame (test90-v5: the first notes of "Baştan anlatıyorum" leave his hand while
 * he is still walking to the glass): his hand, at most at the glass. */
const sendFrom = (f: number): { x: number; y: number } => {
  const st = resolveActor(HUMAN, f);
  const x = st ? (st.tween ? st.tween.x : st.cur.x) : NOTE_X;
  return { x: Math.min(SEND_FROM.x, x + 200), y: SEND_FROM.y };
};
/** The human's yellow note on the glass (H12 f4 presses it at x = STICK_X). */


const pad = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x - 12, y: b.y - 12, w: b.w + 24, h: b.h + 24 });

/** Free slots on the AI's wall (right of her), in a seeded order; the two notes of lines 1-2 keep their old places. */
const USED = [
  { x: 1560, y: 330 },
  { x: 1690, y: 470 },
];
const SLOTS = (() => {
  const all: { x: number; y: number }[] = [];
  for (const x of [1450, 1560, 1670, 1780, 1860]) for (const y of [190, 300, 410, 520, 620]) all.push({ x, y });
  const free = all.filter((p) => USED.every((u) => Math.hypot(u.x - p.x, u.y - p.y) > 80));
  return shuffled(free.length, seeded('ai-wall-slots')).map((i) => free[i] as { x: number; y: number });
})();

interface WaveInfo {
  id: string;
  start: number;
  end: number;
  bits: number;
  /** 'flood': the chorus bar (navy over the whole frame, cream behind it on the AI side). 'cream': the AI side only. */
  kind: 'flood' | 'cream';
  /** How far behind the glass the front starts (px; the morning resets vary it). */
  back?: number;
}
/** Every wave that resets the AI side, in time order. Items born before a wave starts are wiped by it. */
const WAVES: WaveInfo[] = (() => {
  const out: WaveInfo[] = [];
  for (const e of EVENTS) {
    if (e.kind !== 'wave' || /^(morning|lapse|final)\./.test(e.id)) continue;
    out.push({ id: e.id, start: e.frame, end: e.frame + e.enter.frames, bits: e.id.startsWith('wave.c') ? 44 : 30, kind: e.id.startsWith('wave.c') ? 'flood' : 'cream' });
  }
  for (const mm of MORNINGS) {
    const frames = mm.kind === 'slow' ? 22 : mm.kind === 'beat' ? 11 : mm.dur;
    // each morning's reset tears a different number of notes and starts a little further back (test90-v5: the 15
    // identical resets read as a copied loop); the beat it starts on stays
    out.push({ id: `m.${mm.id}`, start: mm.start, end: mm.start + frames, bits: 9 + ((mm.n * 7) % 9), kind: 'cream', back: (mm.n * 37) % 90 });
  }
  const fin = ev('final.reset');
  out.push({ id: 'm.final', start: fin.frame, end: fin.frame + fin.enter.frames, bits: 12, kind: 'cream' });
  return out.sort((a, b) => a.start - b.start);
})();
const FLOOD_WAVES = WAVES.filter((w) => w.kind === 'flood');

// ---- 1:28.7 -> 2:12
/** "satir satir": the notebook's lines, one per beat, at these heights (clear of the lyric line). */
const SATIR = EVENTS.filter((e) => e.id.startsWith('satir.')).slice().sort((a, b) => a.frame - b.frame);
const SATIR_Y = [214, 452, 300, 560, 170, 390, 640, 258, 506];
/** "ayni hata": the same crossed-out card, three times, floating up out of her writing hand (A11). */
const AI_PAD = { x: AI_HOME - 70, y: AI_FLOOR - 470 };
const LAMPS = EVENTS.filter((e) => e.kind === 'lamp' && /^lamp\.\d/.test(e.id)).map((e) => e.frame).sort((a, b) => a - b);
const LAMP_GLOW = ev('lamp.glow');
const CAM_IN = ev('camera.in');
const CAM_OUT = ev('camera.out');
/** Chorus 2: two notes a beat in the human's room (OverflowNotes draws two per start). */
const OVER_STARTS = evFrames('over.').sort((a, b) => a - b);
const CROSS = ev('cross.hands');
/** How far the hands lean through the glass (px) and the height of the ripple where they meet. */
/** The palms (his fingertips y 422 at x 955, hers 407 at x 967; the palms ~420-500): the glow and the ring centre. */
const CROSS_Y = 455;
const pushAt = (frame: number): number => crossPush(frame, CROSS.frame, CROSS.enter.frames, CROSS_HOLD, CROSS_OUT, CROSS_DIST);
/** The notes around the palms move out of the way before the hands move and come back after (glassGeom.ts). */
const clearAt = (frame: number): number => clearAmount(frame, CROSS.frame - CROSS.enter.frames - 2, CROSS.frame + CROSS_HOLD + CROSS_OUT + 2);
/** The torch beam: on at "bakiyorum" towards the AI's face, swung onto his own wall with the H30 f2 -> f3 morph
 * ("hatirlarim"), off with the first chorus-2 flood. The lens follows the drawing (acting.ts TORCH_BEAM). */
const BEAM_ON = ev('beam.on');
const BEAM_WALL = ev('beam.wall');
const BEAM_OFF = ev('beam.off');
const AT_AI = { x: AI_HOME - 20, y: AI_FLOOR - 600 };
const AT_WALL = { x: 250, y: 330 };
const beamAt = (frame: number) => {
  const sw = TORCH_BEAM.swing;
  const u = frame < sw.from ? 0 : frame >= sw.from + sw.frames ? 1 : glide(frame, sw.from, sw.frames);
  const from = { x: lerp(TORCH_BEAM.aim.x, TORCH_BEAM.wall.x, u), y: lerp(TORCH_BEAM.aim.y, TORCH_BEAM.wall.y, u) };
  const to = { x: lerp(AT_AI.x, AT_WALL.x, u), y: lerp(AT_AI.y, AT_WALL.y, u) };
  const grow = frame < BEAM_ON.frame ? 0 : glide(frame, BEAM_ON.frame, BEAM_ON.enter.frames);
  const op = frame < BEAM_OFF.frame ? 1 : 1 - glide(frame, BEAM_OFF.frame, BEAM_OFF.enter.frames);
  const settle = frame < BEAM_WALL.frame ? 0 : Math.min(1, (frame - BEAM_WALL.frame) / BEAM_WALL.enter.frames);
  return { from, to, spot: lerp(70, 150, u), grow, op, bright: settle };
};

interface AiItem {
  key: string;
  born: number;
  /** Row of a pinned note (the wave tears it into dots there). */
  noteY?: number;
  node: ReactNode;
}

const flightsOf = (prefix: string): { fly: number; land: number; enterLand: number }[] =>
  EVENTS.filter((e) => e.id.startsWith(prefix) && e.id.endsWith('.fly')).map((e) => {
    const land = ev(e.id.replace('.fly', '.land'));
    return { fly: e.frame, land: land.frame, enterLand: land.enter.frames };
  });

const VERSE_FLIGHTS = flightsOf('vnote.');
const CHORUS_FLIGHTS = flightsOf('cnote.').sort((a, b) => a.fly - b.fly || a.land - b.land);
const CHORUS2_FLIGHTS = flightsOf('c2note.').sort((a, b) => a.fly - b.fly || a.land - b.land);
const c2Slot = (k: number) => SLOTS[(k * 5 + 1) % SLOTS.length] as { x: number; y: number };
const TALLY_FRAMES = (EVENTS.find((e) => e.id.startsWith('tally.')) as (typeof EVENTS)[number]).enter.frames;
/** Moon phase: 0.82 until the "Ay" line, then one step per beat (waxes, then wanes); in the time-lapse it spins, faster and faster. */
const MOON_BASE = 0.82;
const MOON_EVENTS = EVENTS.filter((e) => e.id.startsWith('moon.'));
const chorusPhaseAt = (frame: number): number => {
  const n = MOON_EVENTS.length;
  let from = MOON_BASE;
  for (let j = 0; j < n; j++) {
    const e = MOON_EVENTS[j] as (typeof MOON_EVENTS)[number];
    const half = n / 2;
    const tri = j + 1 <= half ? (j + 1) / half : (n - j) / half;
    const to = 0.12 + 0.84 * Math.min(1, tri);
    if (frame < e.frame) return from;
    if (frame < e.frame + e.enter.frames) return lerp(from, to, glide(frame, e.frame, e.enter.frames));
    from = to;
  }
  return from;
};
/** Mornings 1-5 (before the time-lapse): the moon wanes one step each morning, so the same wave and the same
 * "Merhaba" happen under a different sky every day (test90-v4: the 15 s read as one GIF). */
const FIRST_MORNING = (MORNINGS[0] as (typeof MORNINGS)[number]).start;
const morningPhaseAt = (frame: number): number => {
  const base = chorusPhaseAt(FIRST_MORNING - 1);
  let from = base;
  let out = base;
  for (const mm of MORNINGS) {
    if (mm.kind === 'lapse' || frame < mm.start) break;
    const to = Math.max(0.12, base - 0.14 * (mm.n + 1));
    out = lerp(from, to, glide(frame, mm.start, 8));
    from = to;
  }
  return out;
};
/** Chorus 2: the same waxing and waning, one step per beat of "Ay dolar, ay kucukur", from where the calendar's spin
 * stopped. */
const MOON2_EVENTS = EVENTS.filter((e) => e.id.startsWith('moon2.'));
const chorus2PhaseAt = (frame: number, base: number): number => {
  const n = MOON2_EVENTS.length;
  let from = base;
  for (let j = 0; j < n; j++) {
    const e = MOON2_EVENTS[j] as (typeof MOON2_EVENTS)[number];
    const half = n / 2;
    const tri = j + 1 <= half ? (j + 1) / half : (n - j) / half;
    const to = 0.12 + 0.84 * Math.min(1, tri);
    if (frame < e.frame) return from;
    if (frame < e.frame + e.enter.frames) return lerp(from, to, glide(frame, e.frame, e.enter.frames));
    from = to;
  }
  return from;
};
const moonPhaseAt = (frame: number): number => {
  const m2 = MOON2_EVENTS[0];
  if (m2 && frame >= m2.frame) return chorus2PhaseAt(frame, moonPhaseAt(m2.frame - 1));
  if (frame < FIRST_MORNING) return chorusPhaseAt(frame);
  if (frame < LAPSE_FROM) return morningPhaseAt(frame);
  const s = Math.min(1, (frame - LAPSE_FROM) / (LAPSE_TO - LAPSE_FROM));
  const cycles = 2 + 7 * s * s;
  const tri = 1 - Math.abs(2 * (cycles - Math.floor(cycles)) - 1);
  const spin = 0.12 + 0.84 * tri;
  return lerp(morningPhaseAt(LAPSE_FROM - 1), spin, glide(frame, LAPSE_FROM, 10));
};

export const Test30Scene = ({ frame, lOverride }: { frame: number; lOverride?: number }) => {
  // bars 1-8: the zoom; from the bar 9 downbeat the room is printed over the flat cream frame
  if (frame < ev('room.seam').frame) {
    return (
      <AbsoluteFill style={{ background: palette.cream }}>
        <ZoomIntro frame={frame} lOverride={lOverride} />
        <PaperGrain frame={frame} />
      </AbsoluteFill>
    );
  }
  const enterFrames = (id: string): number => ev(id).enter.frames;
  const navyP = wipeP(frame, ev('room.navy').frame, enterFrames('room.navy'));
  const seamP = wipeP(frame, ev('room.seam').frame, enterFrames('room.seam'));
  const moonP = wipeP(frame, ev('room.moon').frame, enterFrames('room.moon'));
  const yellowP = wipeP(frame, ev('room.yellow').frame, enterFrames('room.yellow'));
  const notesP = wipeP(frame, ev('room.notes').frame, enterFrames('room.notes'));
  const humanP = dotP(frame, ev('room.human').frame, enterFrames('room.human'));
  const aiP = dotP(frame, ev('room.ai').frame, enterFrames('room.ai'));

  const aiBlink = 1 - blinkAlpha(frame, [ev('ai.blink.imlec').frame]);
  const wallFrames = evFrames('wall.');

  // ---- everything that lives on the AI side, born at a frame; the next wave after its birth wipes it
  const items: AiItem[] = [];
  // the verse "Merhaba" and every morning's (world/bubbleLayout.ts: placed clear of her head, each morning a little different)
  for (const b of AI_BUBBLES) {
    items.push({
      key: b.key,
      born: b.start,
      node: <Bubble frame={frame} startFrame={b.start} frames={b.frames} x={b.x} y={b.y} endFrame={b.end} rot={b.rot} scale={b.scale} />,
    });
  }
  const restNote = (key: string, fly: number, land: number, settle: number, to: { x: number; y: number }, from: { x: number; y: number }, arc: number) => {
    items.push({
      key,
      born: fly,
      noteY: to.y,
      node: <NoteFly frame={frame} startFrame={fly} duration={land - fly} from={from} to={to} seed={key} arc={arc} settle={settle} phase="rest" />,
    });
  };
  restNote('n1', ev('note1.fly').frame, ev('note1.land').frame, enterFrames('note1.land'), USED[0] as { x: number; y: number }, LAPTOP, 160);
  restNote('n2', ev('note2.fly').frame, ev('note2.land').frame, enterFrames('note2.land'), USED[1] as { x: number; y: number }, LAPTOP, 120);
  VERSE_FLIGHTS.forEach((f, k) => restNote(`vn${k}`, f.fly, f.land, f.enterLand, SLOTS[k % SLOTS.length] as { x: number; y: number }, sendFrom(f.fly), 220));
  CHORUS_FLIGHTS.forEach((f, k) => restNote(`cn${k}`, f.fly, f.land, f.enterLand, SLOTS[(k * 3 + 2) % SLOTS.length] as { x: number; y: number }, sendFrom(f.fly), 220));
  items.push({
    key: 'book-drop',
    born: ev('book.drop').frame,
    node: <NotebookDrop frame={frame} start={ev('book.drop').frame} frames={enterFrames('book.drop')} x={BOOK_X} floorY={FLOOR_Y - 2} w={BOOK_W} until={AI_PICKUP - 2} fadeFrames={2} />,
  });
  // the page sketches float up out of the notebook in her hands (a thought trail leads from the book to each card)
  const BOOK = { x: AI_HOME + 28, y: AI_FLOOR - 205 };
  const sketches = [
    { id: 'sketch.1', kind: 'tag', x: 1380, y: 430, rot: -4 },
    { id: 'sketch.2', kind: 'road', x: 1600, y: 360, rot: 3 },
    { id: 'sketch.3', kind: 'cross', x: 1810, y: 450, rot: -2 },
  ] as const;
  for (const s of sketches) {
    items.push({ key: s.id, born: ev(s.id).frame - 6, node: <PageSketch kind={s.kind} frame={frame} start={ev(s.id).frame} frames={enterFrames(s.id)} x={s.x} y={s.y} rot={s.rot} trail={BOOK} /> });
  }
  items.push({
    key: 'check',
    born: ev('check.on').frame,
    node: <Check frame={frame} start={ev('check.on').frame} frames={enterFrames('check.on')} endFrame={ev('check.off').frame} endFrames={enterFrames('check.off')} x={1118} y={AI_FLOOR - 470} />,
  });
  CHORUS2_FLIGHTS.forEach((f, k) => restNote(`c2n${k}`, f.fly, f.land, f.enterLand, c2Slot(k), sendFrom(f.fly), 240));
  // verse 2: the same crossed-out note out of her writing hand, three times; the crates the lamps sit on
  HATA.forEach((h, k) => {
    const e = ev(`hata.${k + 1}`);
    items.push({ key: `hata${k}`, born: e.frame - 6, node: <PageSketch kind="cross" frame={frame} start={e.frame} frames={e.enter.frames} x={h.x} y={h.y} rot={h.rot} trail={AI_PAD} /> });
  });
  items.push({
    key: 'crates',
    born: ev('crates.in').frame,
    node: <Crates frame={frame} start={ev('crates.in').frame} inFrames={enterFrames('crates.in')} lamps={LAMPS} lampFrames={enterFrames('lamp.1')} glow={LAMP_GLOW.frame} glowFrames={LAMP_GLOW.enter.frames} openAt={CAM_OUT.frame + 4} openFrames={16} />,
  });
  const epochOf = (born: number): number => WAVES.filter((w) => w.start <= born).length;
  const alive = (it: AiItem): boolean => {
    if (frame < it.born) return false;
    const next = WAVES.find((w) => w.start > it.born);
    return !next || frame <= next.end + 1;
  };
  const layers: ReactNode[] = [];
  for (let e = 0; e <= WAVES.length; e++) {
    const mine = items.filter((it) => epochOf(it.born) === e && alive(it));
    if (mine.length) layers.push(<g key={`ep${e}`}>{mine.map((it) => <g key={it.key}>{it.node}</g>)}</g>);
    const w = WAVES[e];
    if (w && frame >= w.start && frame <= w.end + 1) {
      const rows = items.filter((it) => it.noteY !== undefined && epochOf(it.born) === e - 1 && it.born < w.start).map((it) => (it.noteY as number) / H);
      layers.push(
        w.kind === 'flood' ? (
          <BarFlood key={`wv${e}`} frame={frame} startFrame={w.start} endFrame={w.end} seed={`flood:${w.id}`} bits={w.bits} noteRows={rows} />
        ) : (
          <g key={`wv${e}`} clipPath="url(#ai-side)">
            <WhiteWave frame={frame} startFrame={w.start} endFrame={w.end} seed={`wave:${w.id}`} baseFrom={SEAM_SWEEP.from - (w.back ?? 0)} baseTo={SEAM_SWEEP.to} bits={w.bits} noteRows={rows} ink />
          </g>
        ),
      );
    }
  }
  // the whole picture breathes on every chorus bar
  const pulse = FLOOD_WAVES.reduce((m, w) => Math.max(m, floodPulse(frame, w.start, w.end)), 1);
  // verse 2: the camera leans in on the lamps and pulls back to show the crates are empty
  const camT = cameraTransform(cameraScale(frame, CAM_IN.frame, CAM_IN.enter.frames, CAM_OUT.frame, CAM_OUT.enter.frames));
  // 2:02 "buradayiz": the hands lean through the glass for one beat
  const pushH = pushAt(frame);
  const crossing = pushH > 0;
  const clear = clearAt(frame);

  const moonPhase = moonPhaseAt(frame);
  // H12 f4: the palm pressed on the glass at head height
  const handReach = { y: HUMAN_FLOOR - 540 };

  // the first frame of each character's timeline sizes the halftone that prints it in
  const humanFirst = resolveActor(HUMAN, ev('room.human').frame);
  const aiFirst = resolveActor(AI, ev('room.ai').frame);
  const humanBox = humanFirst ? pad(poseBounds(humanFirst.cur)) : { x: 0, y: 0, w: 1, h: 1 };
  const aiBox = aiFirst ? pad(poseBounds(aiFirst.cur)) : { x: 0, y: 0, w: 1, h: 1 };
  const finalNote = ev('final.note');
  const deskProp = !humanHasDesk(frame);
  const glassNote = (
    <g transform={clear > 0 ? `translate(0 ${clearShift(GLASS_NOTE.x, GLASS_NOTE.y, GLASS_NOTE.size / 2, clear, true).toFixed(2)})` : undefined}>
      <GlassNote frame={frame} start={finalNote.frame} frames={finalNote.enter.frames} x={GLASS_NOTE.x} y={GLASS_NOTE.y} from={{ x: STICK_X + 200, y: GLASS_NOTE.y }} text="Merhaba" />
    </g>
  );

  return (
    <AbsoluteFill style={{ background: palette.cream }}>
      <svg key={frame} data-frame={frame} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0, transform: pulse === 1 ? undefined : `scale(${pulse.toFixed(4)})`, transformOrigin: '50% 50%' }}>
        <defs>
          <clipPath id="ai-side">
            <rect x={SEAM_X} y={0} width={W - SEAM_X} height={H} />
          </clipPath>
          <clipPath id="human-side">
            <rect x={0} y={0} width={SEAM_X} height={H} />
          </clipPath>
          <filter id="swap-world" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={SWAP_MATRIX} />
          </filter>
        </defs>
        <g transform={camT ?? undefined}>
        <rect width={W} height={H} fill={palette.cream} />

        {/* left room: the navy plates are squeegeed in from the left edge towards the glass */}
        <Squeegee id="sq-navy" p={navyP} axis="x" from={0} to={SEAM_X} soft={NAVY_SOFT_X}>
          <PlateRoom key1={{ p: 1 }} moon={{ p: yellowP }} notes={{ p: notesP }} />
          <WallNotes frame={frame} starts={wallFrames} frames={ENTER_FRAMES.drift} />
          <OverflowNotes frame={frame} starts={OVER_STARTS} frames={ENTER_FRAMES.drift} clear={clear} />
        </Squeegee>

        {/* right room: what the AI has pinned or been given, reset by the waves */}
        {layers}
        {SATIR.map((e, k) => (
          <NotebookLine key={e.id} frame={frame} start={e.frame} frames={e.enter.frames} y={SATIR_Y[k % SATIR_Y.length] as number} seed={e.id} />
        ))}
        <rect x={SEAM_X} y={FLOOR_Y - 1} width={W - SEAM_X} height={4} fill={palette.navy} />

        {moonP > 0 && (
          <Squeegee id="sq-crescent" p={moonP} from={20} to={270} soft={80} reg="crescent" regAmp={14}>
            <SplitMoon cx={SEAM_X} cy={MOON_SEAM_Y} r={MOON_R} phase={moonPhase} split />
          </Squeegee>
        )}

        {seamP > 0 && (
          <Squeegee id="sq-seam" p={seamP} from={0} to={H} soft={140}>
            <GlassSeam />
          </Squeegee>
        )}

        {/* the calendar's count: one more note on his side of the glass every morning */}
        <GlassNotes frame={frame} starts={TALLY_STARTS} frames={TALLY_FRAMES} clear={clear} />

        {frame >= NOTE_UNDER_FROM && glassNote}
        {/* 2:02: a soft moon-yellow glow on the glass where the palms pass through: yellow is the one colour both
            worlds share, so his cream hand and her navy hand both read on it */}
        {clear > 0 && (
          <g opacity={clear}>
            <defs>
              <radialGradient id="cross-glow">
                <stop offset="0" stopColor={palette.moonYellow} stopOpacity={0.95} />
                <stop offset="0.55" stopColor={palette.moonYellow} stopOpacity={0.75} />
                <stop offset="1" stopColor={palette.moonYellow} stopOpacity={0} />
              </radialGradient>
            </defs>
            <ellipse cx={SEAM_X} cy={CROSS_Y} rx={150} ry={170} fill="url(#cross-glow)" />
          </g>
        )}

        {/* the two characters: strips played from scenes/acting.ts */}
        <Halftone id="ht-human" p={humanP} box={humanBox} seed="human" reg="human">
          {deskProp && <DeskProp />}
          {crossing ? (
            <g transform={`translate(${pushH.toFixed(2)} 0)`}>
              <g clipPath="url(#human-side)">
                <Actor frame={frame} acts={HUMAN} phase={0.6} />
              </g>
            </g>
          ) : (
            <Actor frame={frame} acts={HUMAN} phase={0.6} />
          )}
        </Halftone>
        <Halftone id="ht-ai" p={aiP} box={aiBox} seed="ai" reg="ai">
          {crossing ? (
            <g transform={`translate(${(-pushH).toFixed(2)} 0)`}>
              <g clipPath="url(#ai-side)">
                <Actor frame={frame} acts={AI} phase={3.1} blink={aiBlink} />
              </g>
            </g>
          ) : (
            <Actor frame={frame} acts={AI} phase={3.1} blink={aiBlink} />
          )}
        </Halftone>
        {/* the light at the contact point, over both bodies and under the crossing hands: his cream hand passes in
            front of her cream head, and only a yellow ground between them makes it read */}
        {crossing && (
          <g opacity={(0.8 * pushH) / CROSS_DIST}>
            <defs>
              <radialGradient id="cross-core">
                <stop offset="0" stopColor={palette.moonYellow} stopOpacity={0.9} />
                <stop offset="0.6" stopColor={palette.moonYellow} stopOpacity={0.6} />
                <stop offset="1" stopColor={palette.moonYellow} stopOpacity={0} />
              </radialGradient>
            </defs>
            <ellipse cx={SEAM_X} cy={CROSS_Y} rx={110} ry={120} fill="url(#cross-core)" />
          </g>
        )}
        {/* the parts past the glass, in the other world's colours (navy <-> cream) */}
        {crossing && (
          <g filter="url(#swap-world)">
            <g clipPath="url(#ai-side)">
              <g transform={`translate(${pushH.toFixed(2)} 0)`}>
                <Actor frame={frame} acts={HUMAN} phase={0.6} />
              </g>
            </g>
            <g clipPath="url(#human-side)">
              <g transform={`translate(${(-pushH).toFixed(2)} 0)`}>
                <Actor frame={frame} acts={AI} phase={3.1} blink={aiBlink} />
              </g>
            </g>
          </g>
        )}
        <TorchBeam {...beamAt(frame)} />

        {HUMAN_BUBBLE_SPECS.map((b) => (
          <Bubble key={b.key} frame={frame} startFrame={b.start} endFrame={b.end} x={b.x} y={b.y} text={b.text} dir={b.dir} size={b.size} frames={b.frames} />
        ))}
        {frame < NOTE_UNDER_FROM && glassNote}

        {VERSE_FLIGHTS.map((f, k) => (
          <NoteFly key={`vf${k}`} frame={frame} startFrame={f.fly} duration={f.land - f.fly} from={sendFrom(f.fly)} to={SLOTS[k % SLOTS.length] as { x: number; y: number }} seed={`vn${k}`} arc={220} settle={f.enterLand} phase="fly" />
        ))}
        {CHORUS_FLIGHTS.map((f, k) => (
          <NoteFly key={`cf${k}`} frame={frame} startFrame={f.fly} duration={f.land - f.fly} from={sendFrom(f.fly)} to={SLOTS[(k * 3 + 2) % SLOTS.length] as { x: number; y: number }} seed={`cn${k}`} arc={220} settle={f.enterLand} phase="fly" />
        ))}
        <NoteFly frame={frame} startFrame={ev('note1.fly').frame} duration={ev('note1.land').frame - ev('note1.fly').frame} from={LAPTOP} to={USED[0] as { x: number; y: number }} seed="n1" settle={enterFrames('note1.land')} phase="fly" />
        <NoteFly frame={frame} startFrame={ev('note2.fly').frame} duration={ev('note2.land').frame - ev('note2.fly').frame} from={LAPTOP} to={USED[1] as { x: number; y: number }} seed="n2" arc={120} settle={enterFrames('note2.land')} phase="fly" />

        <GlassRipple frame={frame} start={ev('glass.ripple').frame} frames={enterFrames('glass.ripple')} y={(handReach.y + handAt('a04', AI_REACH_X, AI_FLOOR).y) / 2} />
        {CHORUS2_FLIGHTS.map((f, k) => (
          <NoteFly key={`c2f${k}`} frame={frame} startFrame={f.fly} duration={f.land - f.fly} from={sendFrom(f.fly)} to={c2Slot(k)} seed={`c2n${k}`} arc={240} settle={f.enterLand} phase="fly" />
        ))}
        </g>
      </svg>

      {/* lyric lines: left = human, right = AI, seam = both (type/lyricLayout.ts: one line per row at a time) */}
      {LYRICS.map((l) => (
        <LyricLine key={l.n} frame={frame} startFrame={l.show} endFrame={l.end} text={lineText(l.n)} side={l.side} y={l.y} size={l.size} inset={l.inset} />
      ))}

      {/* key words: left = human (yellow on navy), right = AI (outlined on cream), seam = both colours; placed by
          type/stampLayout.ts inside their room and clear of both characters */}
      {STAMPS.map((st) =>
        st.seam ? (
          <div key={st.id}>
            <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${W - SEAM_X}px 0 0)` }}>
              <StampWord frame={frame} startFrame={ev(st.id).frame} endFrame={ev(st.hide).frame} text={st.text} x={st.spot.x} y={st.spot.y} size={st.spot.size} width={st.spot.width} center />
            </div>
            <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${SEAM_X}px)` }}>
              <StampWord frame={frame} startFrame={ev(st.id).frame} endFrame={ev(st.hide).frame} text={st.text} x={st.spot.x} y={st.spot.y} size={st.spot.size} width={st.spot.width} center on="cream" />
            </div>
          </div>
        ) : (
          <StampWord key={st.id} frame={frame} startFrame={ev(st.id).frame} endFrame={ev(st.hide).frame} text={st.text} x={st.spot.x} y={st.spot.y} size={st.spot.size} width={st.spot.width} on={st.on} ink={st.ink} />
        ),
      )}

      <PaperGrain frame={frame} />
    </AbsoluteFill>
  );
};
