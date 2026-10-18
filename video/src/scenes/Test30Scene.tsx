// The film from frame 0 to 1:28.7: bars 1-8 are the zoom (ZoomIntro); from the bar 9 downbeat the split rooms are printed over
// the flat cream frame and every later moment (verse 1 to the post-chorus) is read from events.ts.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { CrossingFigure, PoseFigure, poseBox } from '../characters/Figure.tsx';
import { PoseTrack, type PoseKey } from '../characters/PoseTrack.tsx';
import { handAt } from '../characters/poses.ts';
import { EVENTS, ev, evFrames } from '../events.ts';
import { AI_X, FLOOR_Y, H, MOON_R, MOON_SEAM_Y, SEAM_X, W } from '../layout.ts';
import { lerp, onTwos } from '../math.ts';
import { shuffled } from '../motion/extra.ts';
import { Halftone, Squeegee } from '../motion/entranceViews.tsx';
import { blinkAlpha, dotP, ENTER_FRAMES, glide, wipeP } from '../motion/entrances.ts';
import { palette } from '../style/palette.ts';
import { PaperGrain } from '../style/screenprint.tsx';
import { seeded } from '../style/seeded.ts';
import { SEAM_SWEEP, WhiteWave } from '../transitions/WhiteWave.tsx';
import { TIMING } from '../timing.ts';
import { LyricLine } from '../type/LyricLine.tsx';
import { StampWord } from '../type/StampWord.tsx';
import { Bubble } from '../world/Bubble.tsx';
import { GlassSeam } from '../world/GlassSeam.tsx';
import { NoteFly } from '../world/Notes.tsx';
import { PlateRoom, WallNotes } from '../world/Rooms.tsx';
import { SplitMoon } from '../world/SplitMoon.tsx';
import { Check, GlassRipple, HeldNote, NotebookDrop, OpenBook, PageSketch, TallyBoard } from '../world/Story.tsx';
import { ZoomIntro } from './ZoomIntro.tsx';

const lineText = (n: number): string => (TIMING.lines[n] as { text: string }).text;

/** Pose h06 carries its own desk: it stands where the old plate's desk was, chair and desk legs on the plate floor. */
const DESK_X = 278;
const HUMAN_FLOOR = 1000;
/** Soft edge of the navy room's squeegee, in px. */
const NAVY_SOFT_X = 140;
const GLASS_GAP = 7;

/** Where the human stands from 0:30 on: his reaching hand (h04) ends GLASS_GAP before the seam. */
const HX = SEAM_X - GLASS_GAP - (handAt('h04', 0, HUMAN_FLOOR).x);
/** The AI's reaching hand (a04) starts GLASS_GAP behind the seam. */
const AI_REACH_X = SEAM_X + GLASS_GAP - handAt('a04', 0, FLOOR_Y).x;
/** Where the AI's notebook lands: left of the bending pose a06, whose own notebook is drawn there. */
const BOOK_X = AI_X - 93;
const BOOK_W = 112;

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
}
/** Every wave that sweeps the AI side, in time order. Items born before a wave starts are wiped by the next wave. */
const WAVES: WaveInfo[] = EVENTS.filter((e) => e.kind === 'wave')
  .slice()
  .sort((a, b) => a.frame - b.frame)
  .map((e) => ({ id: e.id, start: e.frame, end: e.frame + e.enter.frames, bits: e.id.startsWith('morning') ? 12 : e.id.startsWith('wave.c') ? 44 : 30 }));

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
const TALLY_FRAMES = (EVENTS.find((e) => e.id.startsWith('tally.')) as (typeof EVENTS)[number]).enter.frames;
const HAND_FROM = { x: HX + 118, y: HUMAN_FLOOR - 500 };

/** Moon phase: 0.82 until the "Ay" line, then one step per beat (waxes, then wanes), each glided over the event's frames. */
const MOON_BASE = 0.82;
const MOON_EVENTS = EVENTS.filter((e) => e.id.startsWith('moon.'));
const moonPhaseAt = (frame: number): number => {
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

  const hold = onTwos(frame);
  const aiBob = Math.round(Math.sin(hold * 0.11 + 1.7) * 2);
  const aiBlink = 1 - blinkAlpha(frame, [ev('ai.blink.imlec').frame]);
  const aiY = FLOOR_Y + aiBob;
  const headY = FLOOR_Y - 670 + 40;

  const wallFrames = evFrames('wall.');
  const tallyFrames = evFrames('tally.');

  // ---- the two figures over time (every switch dissolves over its event's frames)
  const standF = ev('human.stand').frame;
  const standP = dotP(frame, standF, enterFrames('human.stand'));
  const deskP = frame < standF ? humanP : 1 - standP;
  const humanKeys: PoseKey[] = [
    { f: standF, pose: 'h01', x: HX },
    { f: ev('pose.reach').frame, pose: 'h04', x: HX, blend: enterFrames('pose.reach') },
    { f: ev('pose.release').frame, pose: 'h01', x: HX, blend: enterFrames('pose.release') },
    { f: ev('human.sit').frame, pose: 'h03', x: 520, blend: enterFrames('human.sit') },
    { f: ev('pose.chorus').frame, pose: 'h01', x: HX, flip: true, blend: enterFrames('pose.chorus') },
    { f: ev('pose.face').frame, pose: 'h01', x: HX, blend: enterFrames('pose.face') },
  ];
  const aiKeys: PoseKey[] = [
    { f: 0, pose: 'a01', x: AI_X },
    { f: ev('ai.pin').frame, pose: 'a05', x: AI_X, flip: true, blend: enterFrames('ai.pin') },
    { f: ev('pose.reach').frame, pose: 'a04', x: AI_REACH_X, blend: enterFrames('pose.reach') },
    { f: ev('pose.release').frame, pose: 'a01', x: AI_X, blend: enterFrames('pose.release') },
    { f: ev('ai.bend').frame, pose: 'a06', x: AI_X, blend: enterFrames('ai.bend') },
    { f: ev('ai.read').frame, pose: 'a03', x: AI_X + 55, blend: enterFrames('ai.read') },
    { f: ev('pose.chorus').frame, pose: 'a01', x: AI_X, flip: true, blend: enterFrames('pose.chorus') },
    { f: ev('pose.face').frame, pose: 'a01', x: AI_X, blend: enterFrames('pose.face') },
  ];

  // ---- everything that lives on the AI side, born at a frame; the next wave after its birth wipes it
  const items: AiItem[] = [];
  items.push({
    key: 'bubble-verse',
    born: ev('bubble.merhaba').frame,
    node: <Bubble frame={frame} startFrame={ev('bubble.merhaba').frame} frames={enterFrames('bubble.merhaba')} x={AI_X + 22} y={headY + 20} />,
  });
  const restNote = (key: string, fly: number, land: number, settle: number, to: { x: number; y: number }, arc: number) => {
    items.push({
      key,
      born: fly,
      noteY: to.y,
      node: <NoteFly frame={frame} startFrame={fly} duration={land - fly} from={HAND_FROM} to={to} seed={key} arc={arc} settle={settle} phase="rest" />,
    });
  };
  restNote('n1', ev('note1.fly').frame, ev('note1.land').frame, enterFrames('note1.land'), USED[0] as { x: number; y: number }, 160);
  restNote('n2', ev('note2.fly').frame, ev('note2.land').frame, enterFrames('note2.land'), USED[1] as { x: number; y: number }, 120);
  VERSE_FLIGHTS.forEach((f, k) => restNote(`vn${k}`, f.fly, f.land, f.enterLand, SLOTS[k % SLOTS.length] as { x: number; y: number }, 220));
  CHORUS_FLIGHTS.forEach((f, k) => restNote(`cn${k}`, f.fly, f.land, f.enterLand, SLOTS[(k * 3 + 2) % SLOTS.length] as { x: number; y: number }, 220));
  items.push({
    key: 'book-drop',
    born: ev('book.drop').frame,
    node: <NotebookDrop frame={frame} start={ev('book.drop').frame} frames={enterFrames('book.drop')} x={BOOK_X} floorY={FLOOR_Y - 2} w={BOOK_W} until={ev('ai.bend').frame} />,
  });
  items.push({
    key: 'book-open',
    born: ev('book.open').frame,
    node: <OpenBook frame={frame} start={ev('book.open').frame} frames={enterFrames('book.open')} cx={1570} cy={420} />,
  });
  const sketches = [
    { id: 'sketch.1', kind: 'tag', x: 1425, y: 405, rot: -4 },
    { id: 'sketch.2', kind: 'road', x: 1712, y: 345, rot: 3 },
    { id: 'sketch.3', kind: 'cross', x: 1690, y: 488, rot: -2 },
  ] as const;
  for (const s of sketches) {
    items.push({ key: s.id, born: ev(s.id).frame, node: <PageSketch kind={s.kind} frame={frame} start={ev(s.id).frame} frames={enterFrames(s.id)} x={s.x} y={s.y} rot={s.rot} /> });
  }
  items.push({
    key: 'check',
    born: ev('check.on').frame,
    node: <Check frame={frame} start={ev('check.on').frame} frames={enterFrames('check.on')} endFrame={ev('check.off').frame} endFrames={enterFrames('check.off')} x={1226} y={566} />,
  });
  for (const e of EVENTS.filter((x) => x.id.startsWith('morning.'))) {
    // the same "Merhaba" returns as soon as the wave has passed its place
    const born = e.frame + Math.round(e.enter.frames * 0.42);
    items.push({ key: `m-${e.id}`, born, node: <Bubble frame={frame} startFrame={born} frames={ENTER_FRAMES.drift} x={AI_X + 22} y={headY + 20} /> });
  }

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
        <g key={`wv${e}`} clipPath="url(#ai-side)">
          <WhiteWave frame={frame} startFrame={w.start} endFrame={w.end} seed={`wave:${w.id}`} baseFrom={SEAM_SWEEP.from} baseTo={SEAM_SWEEP.to} bits={w.bits} noteRows={rows} ink />
        </g>,
      );
    }
  }

  const moonPhase = moonPhaseAt(frame);

  const handReach = { y: handAt('h04', HX, HUMAN_FLOOR).y };

  return (
    <AbsoluteFill style={{ background: palette.cream }}>
      <svg key={frame} data-frame={frame} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <clipPath id="ai-side">
            <rect x={SEAM_X} y={0} width={W - SEAM_X} height={H} />
          </clipPath>
        </defs>
        <rect width={W} height={H} fill={palette.cream} />

        {/* left room: the navy plates are squeegeed in from the left edge towards the glass */}
        <Squeegee id="sq-navy" p={navyP} axis="x" from={0} to={SEAM_X} soft={NAVY_SOFT_X}>
          <PlateRoom key1={{ p: 1 }} moon={{ p: yellowP }} notes={{ p: notesP }} />
          <WallNotes frame={frame} starts={wallFrames} frames={ENTER_FRAMES.drift} />
          <TallyBoard frame={frame} starts={tallyFrames} frames={TALLY_FRAMES} x={70} y={575} />
        </Squeegee>

        {/* right room: what the AI has pinned or been given, wiped by the cream waves */}
        {layers}
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

        {deskP > 0 && (
          <Halftone
            id="ht-human"
            p={deskP}
            box={pad(poseBox('h06', DESK_X, HUMAN_FLOOR))}
            seed="human"
            reg="human"
            proof={<CrossingFigure uid="human-proof" pose="h06" x={DESK_X} y={HUMAN_FLOOR} leftBg="cream" rightBg="cream" />}
          >
            <PoseFigure uid="human" frame={frame} keys={[[0, 'h06']]} x={DESK_X} y={HUMAN_FLOOR} />
          </Halftone>
        )}
        {standP > 0 && (
          <Halftone
            id="ht-stand"
            p={standP}
            box={pad(poseBox('h01', HX, HUMAN_FLOOR))}
            seed="human-stand"
            proof={<CrossingFigure uid="stand-proof" pose="h01" x={HX} y={HUMAN_FLOOR} leftBg="cream" rightBg="cream" />}
          >
            <PoseTrack frame={frame} keys={humanKeys} y={HUMAN_FLOOR} />
          </Halftone>
        )}
        <HeldNote frame={frame} start={ev('note.held').frame} frames={enterFrames('note.held')} end={VERSE_FLIGHTS[0]?.fly ?? ev('note.held').frame + 1} x={HAND_FROM.x} y={HAND_FROM.y} />

        {aiP > 0 && (
          <Halftone id="ht-ai" p={aiP} box={pad(poseBox('a01', AI_X, aiY))} seed="ai" reg="ai">
            <PoseTrack frame={frame} keys={aiKeys} y={aiY} blink={aiBlink} />
          </Halftone>
        )}

        {VERSE_FLIGHTS.map((f, k) => (
          <NoteFly key={`vf${k}`} frame={frame} startFrame={f.fly} duration={f.land - f.fly} from={HAND_FROM} to={SLOTS[k % SLOTS.length] as { x: number; y: number }} seed={`vn${k}`} arc={220} settle={f.enterLand} phase="fly" />
        ))}
        {CHORUS_FLIGHTS.map((f, k) => (
          <NoteFly key={`cf${k}`} frame={frame} startFrame={f.fly} duration={f.land - f.fly} from={HAND_FROM} to={SLOTS[(k * 3 + 2) % SLOTS.length] as { x: number; y: number }} seed={`cn${k}`} arc={220} settle={f.enterLand} phase="fly" />
        ))}
        <NoteFly frame={frame} startFrame={ev('note1.fly').frame} duration={ev('note1.land').frame - ev('note1.fly').frame} from={HAND_FROM} to={USED[0] as { x: number; y: number }} seed="n1" settle={enterFrames('note1.land')} phase="fly" />
        <NoteFly frame={frame} startFrame={ev('note2.fly').frame} duration={ev('note2.land').frame - ev('note2.fly').frame} from={HAND_FROM} to={USED[1] as { x: number; y: number }} seed="n2" arc={120} settle={enterFrames('note2.land')} phase="fly" />

        <GlassRipple frame={frame} start={ev('glass.ripple').frame} frames={enterFrames('glass.ripple')} y={(handReach.y + handAt('a04', AI_REACH_X, FLOOR_Y).y) / 2} />
      </svg>

      {/* lyric lines: left = human, right = AI, seam = both */}
      <LyricLine frame={frame} startFrame={ev('line1.show').frame} endFrame={ev('line1.hide').frame} text={lineText(1)} side="left" y={48} size={26} />
      <LyricLine frame={frame} startFrame={ev('line2.show').frame} endFrame={ev('line2.hide').frame} text={lineText(2)} side="left" y={48} size={26} />
      {([3, 4, 9, 11] as const).map((n) => (
        <LyricLine key={n} frame={frame} startFrame={ev(`line${n}.show`).frame} endFrame={ev(`line${n}.hide`).frame} text={lineText(n)} side="left" y={48} size={26} />
      ))}
      {([5, 6, 7, 8, 10, 12, 15] as const).map((n) => (
        <LyricLine key={n} frame={frame} startFrame={ev(`line${n}.show`).frame} endFrame={ev(`line${n}.hide`).frame} text={lineText(n)} side="right" y={48} size={26} inset={150} />
      ))}
      {([13, 14] as const).map((n) => (
        <LyricLine key={n} frame={frame} startFrame={ev(`line${n}.show`).frame} endFrame={ev(`line${n}.hide`).frame} text={lineText(n)} side="seam" y={1030} size={26} />
      ))}

      {/* key words: left = human (yellow on navy), right = AI (outlined on cream), seam = both colours */}
      <StampWord frame={frame} startFrame={ev('stamp.imlec').frame} endFrame={ev('line1.hide').frame} text="imleç" x={588} y={490} size={104} width={340} />
      <StampWord frame={frame} startFrame={ev('stamp.merhaba').frame} endFrame={ev('line2.hide').frame} text="merhaba" x={588} y={490} size={104} width={340} />
      <StampWord frame={frame} startFrame={ev('stamp.dun').frame} endFrame={ev('line3.hide').frame} text="dün gece" x={96} y={500} size={118} width={560} />
      <StampWord frame={frame} startFrame={ev('stamp.bastan1').frame} endFrame={ev('line4.hide').frame} text="baştan" x={96} y={500} size={118} width={560} />
      <StampWord frame={frame} startFrame={ev('stamp.defter').frame} endFrame={ev('line5.hide').frame} text="defter" x={1250} y={620} size={110} width={640} on="cream" />
      <StampWord frame={frame} startFrame={ev('stamp.anliyorum').frame} endFrame={ev('line7.hide').frame} text="anlıyorum" x={1250} y={620} size={110} width={640} on="cream" />
      <StampWord frame={frame} startFrame={ev('stamp.hatirla').frame} endFrame={ev('line8.hide').frame} text="hatırlamıyorum" x={1275} y={620} size={94} width={640} on="cream" />
      <StampWord frame={frame} startFrame={ev('stamp.bastan2').frame} endFrame={ev('line9.hide').frame} text="baştan" x={96} y={500} size={118} width={560} />
      <StampWord frame={frame} startFrame={ev('stamp.ay').frame} endFrame={ev('line10.hide').frame} text="ay" x={1250} y={620} size={130} width={640} on="cream" />
      <StampWord frame={frame} startFrame={ev('stamp.biliyorum').frame} endFrame={ev('line11.hide').frame} text="biliyorum" x={96} y={500} size={118} width={560} />
      <StampWord frame={frame} startFrame={ev('stamp.bilmiyorum').frame} endFrame={ev('line12.hide').frame} text="bilmiyorum" x={1250} y={500} size={118} width={620} on="cream" ink="navy" />
      {(
        [
          ['stamp.buradayiz', 'line13.hide', 'buradayız'],
          ['stamp.birdaha', 'line14.hide', 'bir daha'],
        ] as const
      ).map(([id, hide, text]) => (
        <div key={id}>
          <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${W - SEAM_X}px 0 0)` }}>
            <StampWord frame={frame} startFrame={ev(id).frame} endFrame={ev(hide).frame} text={text} x={SEAM_X - 380} y={500} size={124} width={760} center />
          </div>
          <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${SEAM_X}px)` }}>
            <StampWord frame={frame} startFrame={ev(id).frame} endFrame={ev(hide).frame} text={text} x={SEAM_X - 380} y={500} size={124} width={760} center on="cream" />
          </div>
        </div>
      ))}

      <PaperGrain frame={frame} />
    </AbsoluteFill>
  );
};
