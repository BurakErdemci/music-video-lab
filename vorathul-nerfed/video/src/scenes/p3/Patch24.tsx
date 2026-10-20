// Scenes 9-10 (S62-S67): Patch 2.4. The patch card, the cutscene editor, the SKIP pill and its guillotine
// letterbox, the volume slider that corks each pipe it passes, clutch_throat, and MY / THEME / SONG.
import { AbsoluteFill } from 'remotion';
import { frameAt, handheld, hold, OFF_WIDE, withShake, SHAKE_PCT, type CameraPath } from '../../camera/api.ts';
import type { PipeEvent } from '../../rig/pipes.ts';
import type { Key } from '../../rig/timeline.ts';
import type { Side } from '../../rig/types.ts';
import { Stage } from '../../stage/Stage.tsx';
import { Cursor, Monitor, PatchNotesCard, SkipButton, TypingText, VolumeSlider, C } from '../../ui/kit.ts';
import { easeInOut as uiEaseInOut, lerp as uiLerp, prog as uiProg } from '../../ui/theme.tsx';
import { INK, IVORY, VIOLET, VIOLET_LIGHT, seeded } from '../../vfx/effects.ts';
import { Throne } from './Throne.tsx';
import { at } from './events.ts';
import { Balloon, DustPuff } from './Figures.tsx';
import { Letterbox, ShotFrame } from './Frame.tsx';
import { G } from './grades.ts';
import { easeIn, easeOut, easeOutBack, lerp, project, prog, twos } from './lib.ts';
import { OfficeWall } from './Office.tsx';
import { PaintingWindow } from './PaintingView.tsx';
import { KEPT_PIPES, SCALE_C, helmAt, nerfTimeline, pipeMouthAt, slitAt, stateAt, Vorathul, withCorks, withHead, type Place } from './nerf.tsx';

const shakeHits = (list: [number, keyof typeof SHAKE_PCT][]) => list.map(([start, k], i) => ({ start, seed: start * 13 + i, amp: { pct: SHAKE_PCT[k] } }));
const ANTON = "'UiAnton', 'Anton', Impact, sans-serif";
const SIDES: Side[] = ['R', 'L'];

// ---------------------------------------------------------------- S62 PATCH 2.4
const C62 = at('s62-cut');
const DOT = at('s62-dot');
const CAM62 = withShake(handheld(hold(OFF_WIDE), { amp: 0.03, seed: 62 }), { hits: shakeHits([[DOT, 'medium']]) });
const title62 = (f: number): string => (f >= at('s62-four') ? 'PATCH 2.4' : f >= DOT ? 'PATCH 2.' : f >= at('s62-two') ? 'PATCH 2' : f >= at('s62-patch') ? 'PATCH' : '');

export const S62 = ({ frame }: { frame: number }) => {
  const jolt = frame >= DOT && frame < DOT + 6 ? Math.sin((frame - DOT) * 2.6) * 14 * (1 - (frame - DOT) / 6) : 0;
  const live = easeOutBack(prog(frame, at('s62-live'), 5), 2.5);
  return (
    <ShotFrame frame={frame} bg={C.bg}>
      <OfficeWall frame={frame} pose={CAM62(frame)} pose62 />
      <AbsoluteFill style={{ transform: `translate(${jolt}px, ${-jolt * 0.5}px)` }}>
        <PatchNotesCard frame={frame} x={1010} y={250} width={820} title={title62(frame)} enterAt={C62} lines={[{ text: 'Applying changes…', appearAt: at('s62-four') }]} />
        {live > 0 ? (
          <div style={{ position: 'absolute', left: 1610, top: 262, height: 52, padding: '0 22px', borderRadius: 26, background: C.blue, color: C.white, display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'UiInter', sans-serif", fontWeight: 800, fontSize: 30, transform: `scale(${live})` }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: C.white }} /> LIVE
          </div>
        ) : null}
      </AbsoluteFill>
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S63 the cutscene editor
const C63 = at('s63-cut');
const DRAG = at('s63-drag');
const DROP = DRAG + 20;
const PILL = { x: 30, y: 300 };
const TARGET = { x: 760, y: 360 };

export const S63 = ({ frame }: { frame: number }) => {
  const d = easeOut(prog(frame, DRAG, DROP - DRAG));
  const pill = { x: lerp(PILL.x, TARGET.x, d), y: lerp(PILL.y, TARGET.y, d) - Math.sin(d * Math.PI) * 60 };
  const dropped = frame >= DROP;
  return (
    <ShotFrame frame={frame} bg={C.dark}>
      <Monitor x={-80} y={-62} width={2080} screen={C.white}>
        <div style={{ position: 'absolute', inset: 0, fontFamily: "'UiInter', sans-serif", color: C.ink }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 44, background: C.bg, borderBottom: `2px solid ${C.mid}`, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 24, fontSize: 18, fontWeight: 700 }}>
            <span>Cutscene Editor</span><span style={{ color: C.slate, fontWeight: 500 }}>vorathul_lament.cut</span>
          </div>
          <div style={{ position: 'absolute', left: 0, top: 44, width: 250, height: 631, background: C.bg, borderRight: `2px solid ${C.mid}` }}>
            <div style={{ padding: '16px 18px', fontSize: 14, fontWeight: 800, letterSpacing: 2, color: C.slate }}>COMPONENTS</div>
            {['Dialogue box', 'Subtitles', 'Fade to black', 'Camera shake'].map((t, i) => (
              <div key={t} style={{ margin: '0 14px 10px', padding: '12px 14px', borderRadius: 8, background: C.white, border: `2px solid ${C.mid}`, fontSize: 18, fontWeight: 600, position: 'relative', top: i * 2 }}>{t}</div>
            ))}
          </div>
          <div style={{ position: 'absolute', left: 270, top: 64, width: 640, height: 360, borderRadius: 6, overflow: 'hidden', border: `2px solid ${C.dark}`, background: C.black }}>
            <PaintingWindow frame={frame} x={0} y={0} w={640} h={360} mood="slump" />
            {dropped ? <SkipButton frame={frame} appearAt={DROP - 8} width={150} margin={18} /> : null}
          </div>
          <div style={{ position: 'absolute', left: 270, top: 438, fontSize: 16, fontWeight: 700, color: C.slate }}>THE LAMENT OF VORATHUL · 7:00</div>
          <div style={{ position: 'absolute', left: 270, top: 470, width: 900, height: 150, borderRadius: 8, background: C.bg, border: `2px solid ${C.mid}` }}>
            {['DIALOGUE', 'MUSIC', 'CAMERA'].map((t, i) => (
              <div key={t} style={{ position: 'absolute', left: 12, top: 14 + i * 44, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 92, fontSize: 13, fontWeight: 800, letterSpacing: 1, color: C.slate }}>{t}</span>
                <div style={{ width: 760, height: 28, borderRadius: 6, background: i === 0 ? C.blue : C.mid }} />
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', left: 930, top: 64, width: 250, height: 360, borderRadius: 8, background: C.bg, border: `2px solid ${C.mid}`, padding: 16, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: C.slate }}>PATCH NOTE</div>
          </div>
          <TypingText frame={frame} x={940} y={110} width={232} text={"Vorathul's dialogue: can now be skipped"} startFrame={at('s63-line')} framesPerChar={1} />
          {!dropped ? (
            <div style={{ position: 'absolute', left: pill.x, top: pill.y, width: 190, height: 80 }}>
              <SkipButton frame={frame} appearAt={C63 - 20} width={150} margin={10} />
            </div>
          ) : null}
          <Cursor frame={frame} size={1.2} path={[{ f: C63, x: 640, y: 560 }, { f: DRAG - 2, x: PILL.x + 110, y: PILL.y + 50 }, { f: DROP, x: TARGET.x + 110, y: TARGET.y + 50 }, { f: DROP + 20, x: TARGET.x + 160, y: TARGET.y + 120 }]} grabRange={[DRAG - 1, DROP]} clicks={[DROP]} />
        </div>
      </Monitor>
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S64 SKIP pill, guillotine letterbox
const C64 = at('s64-cut');
const PRESS = at('s64-press');
const BLINK = at('s64-blink');
const TL64 = nerfTimeline(
  [
    { at: C64, pose: 'raise_sword', dur: 0, cut: true },
    { at: PRESS, pose: 'slump', dur: 0, cut: true },
  ],
  {
    phase: 'deleted',
    slit: [{ at: 0, value: 'lit' }, { at: PRESS, value: 'sad' }],
    slitOpacity: [{ at: 0, v: 0.9, dur: 0 }, { at: PRESS, v: 0.45, dur: 0 }, { at: BLINK, v: 0, dur: 0 }, { at: BLINK + 3, v: 0.45, dur: 0 }],
  },
);
const PLACE64: Place = { pos: [0, 0, -15], scale: SCALE_C };
const CAM64 = withShake(hold(frameAt([0, 2.6, -15], 6.6)), { hits: shakeHits([[C64, 'small'], [PRESS, 'medium']]) });
const SPEECH = 'BEHOLD, MORTALS! FOR SEVEN MINUTES I SHALL RECOUNT THE—';

export const S64 = ({ frame }: { frame: number }) => {
  const pose = CAM64(frame);
  const st = stateAt(TL64, frame);
  const helm = project(pose, helmAt(st, PLACE64));
  const close = easeIn(prog(frame, PRESS, 3));
  const chars = Math.min(SPEECH.length, Math.floor((frame - C64) * 2.2));
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM64}>
        <Throne frame={frame} />
        <Vorathul st={st} place={PLACE64} />
      </Stage>
      {frame < PRESS ? <Balloon x={helm.x + 120} y={170} w={700} text={SPEECH.slice(0, chars)} tx={helm.x + 40} ty={helm.y - 30 - 170} size={32} /> : null}
      <SkipButton frame={frame} appearAt={C64} hoverAt={at('s64-hover')} pressAt={PRESS} width={300} margin={180} />
      {frame < PRESS + 6 ? (
        <Cursor frame={frame} size={2.2} path={[{ f: C64 + 2, x: 1300, y: 640 }, { f: at('s64-hover'), x: 1660, y: 850 }, { f: PRESS + 6, x: 1665, y: 856 }]} clicks={[PRESS]} />
      ) : null}
      <Letterbox close={close} slotY={helm.y} slot={190} />
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S65 the volume slider corks each pipe it passes
const C65 = at('s65-cut');
const APPEAR = at('s65-slider');
const FULL = at('s65-100');
const SLIDE_A = at('s65-corks1') - 4;
const SLIDE_B = at('s65-corks2') - 4;
// Framed wide enough that the slider docks below his feet (a player bar) and never covers the helm.
const CAM65 = hold(frameAt([0, 2.0, -15], 9.6));
const PLACE65: Place = { pos: [0, 0, -15], scale: SCALE_C };
const SLIDER = { x: 110, width: 1700 };
const UI_S = SLIDER.width / 760;
const handleX = (level: number): number => SLIDER.x + (130 + (level / 100) * 500) * UI_S;
const KEYS65: Key[] = [
  { at: C65, pose: 'conduct_wide', dur: 0, cut: true },
  { at: SLIDE_A + 6, pose: { head: [-12, 0.01] }, dur: 8 },
];
const BASE65 = nerfTimeline(KEYS65, { phase: 'deleted', slit: [{ at: 0, value: 'lit' }], slitOpacity: 0.8 });
// Pipe mouths on screen at the slide (camera locked, pose held), sorted right to left: the order the handle meets them.
const MOUTHS65 = SIDES.flatMap((side) => KEPT_PIPES.map((i) => ({ side, i, x: project(CAM65(SLIDE_A), pipeMouthAt(stateAt(BASE65, SLIDE_A), PLACE65, side, i)).x }))).sort((a, b) => b.x - a.x);
const firstLeft = MOUTHS65.slice(3).reduce((m, p) => Math.max(m, p.x), -Infinity);
/** Level that parks the handle just between the two wings. */
const LEVEL_A = ((firstLeft + 60 - SLIDER.x) / UI_S - 130) / 5;
const SEGMENTS = [
  { from: 0, to: 100, start: APPEAR, dur: FULL - APPEAR },
  { from: 100, to: LEVEL_A, start: SLIDE_A, dur: 9 },
  { from: LEVEL_A, to: 20, start: SLIDE_B, dur: 12 },
];
const segmentAt = (f: number) => [...SEGMENTS].reverse().find((s) => f >= s.start) ?? SEGMENTS[0]!;
const levelAt = (f: number): number => {
  const s = segmentAt(f);
  return uiLerp(s.from, s.to, uiEaseInOut(uiProg(f, s.start, s.dur)));
};
/** Cause and effect: a pipe is corked on the first frame the handle is at or past its mouth. */
const CORKS65: PipeEvent[] = MOUTHS65.map((m) => {
  let f = SLIDE_A;
  while (handleX(levelAt(f)) > m.x && f < SLIDE_B + 40) f++;
  return { at: f, wing: m.side, pipe: m.i, op: 'cork' };
});
const TL65 = nerfTimeline(KEYS65, { phase: 'deleted', slit: [{ at: 0, value: 'lit' }], slitOpacity: 0.8, pipes: [...KEPT_PIPES.map((i): PipeEvent => ({ at: C65, wing: 'both', pipe: i, op: 'lit' })), ...CORKS65] });

/** Violet notes of his theme rising out of every pipe that is still open. */
const Notes = ({ frame, mouths, corkAt }: { frame: number; mouths: { x: number; y: number; key: string }[]; corkAt: Record<string, number> }) => (
  <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
    {mouths.flatMap((m, j) => [0, 1, 2, 3].map((n) => {
      const born = C65 + ((j * 5) % 9) + n * 9;
      const age = twos(frame) - born;
      const cork = corkAt[m.key] ?? Infinity;
      if (age < 0 || born >= cork || age > 34) return null;
      const r = seeded(`note:${j}:${n}`);
      return (
        <text key={`${j}-${n}`} x={m.x + Math.sin(age * 0.2 + j) * 24 + r.range(-10, 10)} y={m.y - age * 9} fill={n % 2 ? VIOLET : VIOLET_LIGHT} stroke={INK} strokeWidth={3} opacity={1 - age / 34} style={{ fontFamily: ANTON, fontSize: 64 }}>
          {n % 2 ? '♫' : '♪'}
        </text>
      );
    }))}
  </svg>
);

export const S65 = ({ frame }: { frame: number }) => {
  const pose = CAM65(frame);
  const st = stateAt(TL65, frame);
  const mouths = SIDES.flatMap((side) => KEPT_PIPES.map((i) => {
    const p = project(pose, pipeMouthAt(st, PLACE65, side, i));
    return { x: p.x, y: p.y, key: `${side}${i}` };
  }));
  const corkAt = Object.fromEntries(CORKS65.map((e) => [`${e.wing}${e.pipe}`, e.at]));
  const s = segmentAt(frame);
  const sliderY = 800;
  const pop = easeOutBack(prog(frame, APPEAR, 6));
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM65}>
        <Throne frame={frame} />
        <Vorathul st={st} place={PLACE65} />
      </Stage>
      <Notes frame={frame} mouths={mouths} corkAt={corkAt} />
      {mouths.map((m) => <DustPuff key={m.key} x={m.x} y={m.y} size={50} t={prog(frame, corkAt[m.key]!, 8)} seed={650 + m.x} />)}
      {frame >= APPEAR ? (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${pop})`, transformOrigin: `960px ${sliderY}px` }}>
          <VolumeSlider frame={frame} x={SLIDER.x} y={sliderY} width={SLIDER.width} from={s.from} to={s.to} startFrame={s.start} durationFrames={s.dur} />
        </div>
      ) : null}
      {frame >= SLIDE_A - 8 ? (
        <Cursor frame={frame} size={2} variant="grab" path={[{ f: SLIDE_A - 8, x: 1800, y: sliderY + 260 }, { f: SLIDE_A, x: handleX(100), y: sliderY + 120 }, ...[...Array(40).keys()].map((k) => ({ f: SLIDE_A + k, x: handleX(levelAt(SLIDE_A + k)), y: sliderY + 120 }))]} />
      ) : null}
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S66 clutch_throat, one thin wisp
const C66 = at('s66-cut');
const SMOKE = at('s66-smoke');
const PUFF = at('s66-puff');
const TL66 = nerfTimeline([{ at: C66, pose: 'clutch_throat', dur: 0, cut: true }], { phase: 'corked', slitOpacity: 0.5 });
const PLACE66: Place = { pos: [0, 0, -15], scale: SCALE_C };
const CAM66 = handheld(hold(frameAt([0, 3.3, -15], 2.9)), { amp: 0.015, seed: 66 });

export const S66 = ({ frame }: { frame: number }) => {
  const pose = CAM66(frame);
  const cough = frame >= C66 + 6 ? 3 * Math.sin((frame - C66) * 1.3) * Math.exp(-((frame - C66) % 14) / 6) : 0;
  const st = withHead(stateAt(TL66, frame), cough);
  const m1 = project(pose, pipeMouthAt(st, PLACE66, 'L', 7));
  const m2 = project(pose, pipeMouthAt(st, PLACE66, 'R', 6));
  const w = prog(frame, SMOKE, 16);
  const ring = prog(frame, PUFF, 14);
  const pts = [...Array(12).keys()].map((k) => {
    const t = k / 11;
    return `${(m1.x + Math.sin(t * 7 + twos(frame) * 0.15) * 22 * t).toFixed(1)} ${(m1.y - t * 380 * easeOut(w)).toFixed(1)}`;
  });
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM66}>
        <Throne frame={frame} />
        <Vorathul st={st} place={PLACE66} />
      </Stage>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {w > 0 ? <path d={`M${pts.join('L')}`} stroke={IVORY} strokeWidth={7} fill="none" strokeLinecap="round" opacity={1 - easeIn(prog(frame, SMOKE + 14, 12))} /> : null}
        {ring > 0 && ring < 1 ? <ellipse cx={m2.x} cy={m2.y - ring * 90} rx={10 + ring * 34} ry={5 + ring * 14} stroke={IVORY} strokeWidth={6} fill="none" opacity={1 - ring} /> : null}
      </svg>
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S67 MY / THEME / SONG
const C67 = at('s67-cut');
const THEME = at('s67-theme');
const SONG = at('s67-song');
const TL67 = nerfTimeline(
  [
    { at: C67, pose: { head: [14, -0.01], torso: 8 }, dur: 0, cut: true },
    { at: SONG, pose: 'blast_antic', dur: 0, cut: true },
    { at: at('s67-swell'), pose: { torso: 10, head: [10, 0], legs: [12, 12] }, dur: 10 },
  ],
  { phase: 'corked', slit: [{ at: 0, value: 'lit' }], slitOpacity: 1 },
);
const PLACE67: Place = { pos: [0, 0, -15], scale: SCALE_C };
const SLIT67 = slitAt(stateAt(TL67, C67), PLACE67);
const CAM67: CameraPath = (f) => {
  if (f < SONG) {
    const base = frameAt(SLIT67, 1.2);
    const k = 0.04 * Math.sin(f * 2.3);
    return { ...base, position: [base.position[0] + k, base.position[1] + k * 0.6, base.position[2]], target: [base.target[0] + k, base.target[1] + k * 0.6, base.target[2]] };
  }
  const strain = prog(f, SONG, at('s68-cut') - SONG);
  const base = frameAt([0, 2.5, -15], 6.2);
  const k = 0.02 * strain * Math.sin(f * 2.9);
  return { ...base, position: [base.position[0] + k, base.position[1], base.position[2]], target: [base.target[0] + k, base.target[1], base.target[2]] };
};

export const S67 = ({ frame }: { frame: number }) => {
  const pose = CAM67(frame);
  const tremble = frame >= at('s67-tremble') ? 0.06 * Math.sin(frame * 3.1) : 0;
  const swell = easeOut(prog(frame, at('s67-swell'), 10));
  let st = stateAt(TL67, frame);
  if (frame >= SONG) st = withCorks(st, 1 + tremble + 0.3 * swell, -0.008 * swell);
  const leak = prog(frame, at('s67-leak'), 20);
  const mouths = frame >= SONG ? SIDES.flatMap((side) => KEPT_PIPES.map((i) => project(pose, pipeMouthAt(st, PLACE67, side, i)))) : [];
  const theme = frame >= THEME && frame < SONG;
  return (
    <ShotFrame frame={frame} cues={G.s67}>
      <Stage camera={CAM67}>
        <Throne frame={frame} />
        <Vorathul st={st} place={PLACE67} />
      </Stage>
      {leak > 0 ? (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          {mouths.flatMap((m, j) => [0, 1, 2].map((n) => {
            const a = -Math.PI / 2 + (n - 1) * 0.9 + Math.sin(twos(frame) * 0.4 + j) * 0.2;
            const len = (30 + 50 * leak) * (1 + 0.3 * Math.sin(frame + n));
            return <path key={`${j}-${n}`} d={`M${m.x} ${m.y} L${m.x + Math.cos(a - 0.15) * len} ${m.y + Math.sin(a - 0.15) * len} L${m.x + Math.cos(a + 0.15) * len} ${m.y + Math.sin(a + 0.15) * len} Z`} fill={n === 1 ? VIOLET_LIGHT : VIOLET} />;
          }))}
        </svg>
      ) : null}
      {theme ? (
        <AbsoluteFill style={{ background: C.bg }}>
          <VolumeSlider frame={frame} x={60} y={420} width={1800} from={20} to={20} startFrame={THEME} durationFrames={1} />
          <Cursor frame={frame} size={3} variant="grab" path={[{ f: THEME, x: 60 + (130 + 100) * (1800 / 760), y: 640 }, { f: SONG, x: 60 + (130 + 100) * (1800 / 760) + 6, y: 646 }]} />
        </AbsoluteFill>
      ) : null}
    </ShotFrame>
  );
};
