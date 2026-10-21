// Scene 15, Patch 2.5 (S105-S107): the office in ruins, his eye fills the last working monitor, a trembling hand
// clicks Revert, and the revert plays part 1's edits backward over the room (TimeRemap, no grade tracks inside).
import { AbsoluteFill } from 'remotion';
import { handheld, hold, OFF_WIDE, SHAKE_PCT, tween, withShake, type CameraPath } from '../../../camera/api.ts';
import type { Vec3 } from '../../../stage/Card.tsx';
import { Stage } from '../../../stage/Stage.tsx';
import { HealthBar, Monitor, PatchNotesCard, RevertDialog, StickyNote } from '../../../ui/kit.ts';
import { InkSplash, Meteor, playBetween, ScribbleBoil, TimeRemap } from '../../../vfx/effects.ts';
import { DomPlate } from '../lib/DomPlate.tsx';
import { E, lerp, outCubic, prog, project, pxPerUnit } from '../lib/geom.ts';
import { Chair, Dev, Monitor3D, O, PaintDecal, Rect } from '../lib/Office.tsx';
import { AfterRoom } from '../lib/Room.tsx';
import { rigPoints } from '../lib/rigPoints.ts';
import { Shot } from '../lib/Shell.tsx';
import { Vorathul } from '../lib/Vorathul.tsx';
import { Paint } from '../lib/Conversion.tsx';
import { cut, INK, MAGENTA, move, OFFICE_FLOOR, pose, timeline, VIOLET } from '../lib/vorathul.ts';

const F = OFFICE_FLOOR;

/** The patch card's title types on the announcer's words: "Patch" on f7321, "2." on f7343, "5" on f7381. */
const patchTitle = (frame: number): string => {
  const steps: [number, number][] = [[E('s105-patch'), 5], [E('s105-two'), 8], [E('s106-five'), 9]];
  let n = 0;
  for (const [f, k] of steps) if (frame >= f) n = k;
  return 'Patch 2.5'.slice(0, n);
};

// The ruined room (G40 stand-in: the office set wrecked in code): desks tipped, monitors on the floor, chairs on their sides.
const RUIN = (i: number) => [
  { rot: [0, 0, 0.32] as Vec3, off: [0.6, 0.5, 0] as Vec3 },
  { rot: [0, 0, -1.45] as Vec3, off: [0, 0.4, 0.4] as Vec3 },
  { rot: [0, 0, -0.22] as Vec3, off: [0, 0.3, 0] as Vec3 },
  { hidden: true },
][i] ?? {};
const Wreck = () => (
  <>
    <Monitor3D at={[-6.2, F + 0.15, -11]} rot={[0, 0, 1.45]} w={2.2} screen={INK} />
    <Monitor3D at={[5.4, F + 0.1, -9.5]} rot={[0, 0, -1.6]} w={2.4} screen={O.dark} />
    <Chair at={[-3.4, F + 0.9, -9]} rot={[0, 0, 1.5]} size={2.3} />
    <Chair at={[7.6, F, -8]} rot={[0, 0, -0.5]} size={2.4} />
    <Chair at={[2.6, F + 1.0, -12.5]} rot={[0, 0, 3.0]} size={2.2} />
    {[0, 1, 2, 3, 4, 5].map((i) => <Rect key={i} w={0.9} h={0.6} at={[-8 + i * 3.1, F + 0.02, -7 - (i % 3) * 2.2]} rot={[-Math.PI / 2, 0, i * 0.7]} color={O.white} />)}
    <PaintDecal at={[3.5, F + 0.04, -8.5]} rot={[-Math.PI / 2, 0, 0.4]} w={7} h={4} seed={31} order={46} />
    <PaintDecal at={[-12, 1, -20.1]} w={6} h={7} seed={32} drips order={47} />
    <PaintDecal at={[11, 2, -20.1]} w={5} h={6} seed={33} drips order={48} />
  </>
);

// ------------------------------------------------------------------ S105 the ruins, Patch 2.5 types
const S105_AT: Vec3 = [3.4, F, -17.2];
const S105_TL = timeline([cut(E('s105-cut'), pose('base', { head: [-14, 0.02], torso: -6, armR: [-15, 60, -20, 'grip'], armL: [30, 80, 0, 'spread'], lean: -3 })), move(E('s105-two'), pose('base', { head: [-18, 0.025], torso: -10, armR: [-15, 60, -20, 'grip'], armL: [60, 70, 0, 'spread'], lean: -5 }), 20)]);
const S105_CAM: CameraPath = handheld(tween({ position: [-2.2, -2.4, 0.5], target: [0, -2.2, -20] }, { position: [-2.6, -2.6, -1.4], target: [-0.4, -2.6, -20] }, { start: E('s105-cut'), frames: 61 }), { amp: 0.05, seed: 's105' });
const LAST_MON: Vec3 = [-3.6, F + 1.1, -9.8];

export const S105 = ({ frame }: { frame: number }) => {
  const shiver = Math.sin(frame * 2.1) * 0.06;
  return (
    <Shot>
      <Stage camera={S105_CAM}>
        <Paint frame={frame}>
        <AfterRoom frame={frame} desks={RUIN} />
        <Wreck />
        <Vorathul tl={S105_TL} frame={frame} at={S105_AT} />
        <Rect w={3.4} h={1.1} at={[LAST_MON[0], F + 0.55, LAST_MON[2] + 0.4]} color={O.white} />
        <Monitor3D at={LAST_MON} w={2.0} screen={O.blue} />
        <Dev who="hoodie" act="cower" at={[-1.6 + shiver, F, -8.4]} height={2.7} order={3000} />
      </Paint>
      </Stage>
      <PatchNotesCard frame={frame} x={1180} y={90} width={640} title={patchTitle(frame)} enterAt={E('s105-cut') + 4} lines={[{ text: 'Boss behaviour: under review', appearAt: E('s105-two') + 4 }]} footer="Balance team (hiding)" />
      <InkSplash frame={22} duration={1000} seed={105} x={1800} y={96} size={60} />
      <InkSplash frame={22} duration={1000} seed={106} x={1196} y={330} size={44} variant="violet" />
    </Shot>
  );
};

// ------------------------------------------------------------------ S106 his eye fills the monitor; Revert, trembling
const MON_X = 210;
const MON_Y = 40;
const MON_W = 1500;
const MON_S = MON_W / 1280;
const DLG_W = 820;
const dialogBox = { x: MON_X + 40 * MON_S + (1200 * MON_S - DLG_W) / 2, y: MON_Y + 40 * MON_S + 200 };
// G14 stand-in: the helm of frame 01, the violet slit across the screen.
const EYE_CROP: [number, number, number, number] = [690, 118, 160, 84];

const EyeMonitor = ({ frame, push }: { frame: number; push: number }) => (
  <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: '50% 45%' }}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 880, bottom: 0, background: O.white, borderTop: `3px solid ${O.dark}` }} />
    <Monitor x={MON_X} y={MON_Y} width={MON_W} screen={O.white}>
      <DomPlate id="G14" plate="01-tarz-cizgi-roman.jpg" crop={EYE_CROP} x={-40} y={-40} width={1280} />
      <ScribbleBoil frame={frame - E('s106-cut')} duration={200} seed={106} x={600} y={330} rx={420} ry={90} color={VIOLET} width={10} loops={2} ticks={0} />
    </Monitor>
  </AbsoluteFill>
);

export const S106 = ({ frame }: { frame: number }) => {
  const push = lerp(1.0, 1.06, outCubic(prog(frame, E('s106-cut'), 56)));
  return (
    <Shot bg={O.bg}>
      <EyeMonitor frame={frame} push={push} />
      <RevertDialog frame={frame} x={dialogBox.x} y={dialogBox.y} width={DLG_W} enterAt={E('s106-dialog')} approachAt={E('s106-approach')} pressAt={E('s107-cut')} tremble seed={7} title="Revert patch 2.5?" body="All changes from this patch will be undone." />
    </Shot>
  );
};

// ------------------------------------------------------------------ S107 click: the revert rewinds part 1 over the room
// Part 1's edits (storyboard 1 S37-S41) as a pure function of their own frame: the bar dragged to 60 % with the
// magenta ghost, the meteors erased into the checker, the "Phase 3" note slapped on his helm. TimeRemap plays
// f2726 -> f2532 backward over 28 frames from beat 758, ease-in. No DuotoneFlash or ImpactBurst lives in here.
const EDIT_BAR = 2574;
const EDIT_METEORS = 2657;
const EDIT_NOTE = 2640;
const REWIND = E('s107-rewind');
const REMAP = playBetween(REWIND, 28, 2726, 2532);

const Part1Edits = ({ g, helm }: { g: number; helm: { x: number; y: number; s: number } }) => {
  const erased = g >= EDIT_METEORS;
  return (
    <AbsoluteFill>
      <HealthBar frame={g} x={260} y={160} width={1400} label="VORATHUL" from={100} to={60} startFrame={EDIT_BAR} durationFrames={20} />
      {[0, 1, 2, 3, 4].map((i) => {
        // Below the bar: the label and the bar stay clear of the replayed meteors.
        const from: [number, number] = [300 + i * 330, 320];
        const to: [number, number] = [160 + i * 360, 860 + (i % 2) * 60];
        return erased ? (
          <div key={i} style={{ position: 'absolute', left: lerp(from[0], to[0], 0.55) - 50, top: lerp(from[1], to[1], 0.55) - 50, width: 100, height: 100, backgroundImage: `repeating-conic-gradient(${MAGENTA} 0% 25%, ${INK} 0% 50%)`, backgroundSize: '34px 34px', transform: `rotate(${i * 17}deg)` }} />
        ) : (
          <Meteor key={i} frame={16} duration={20} seed={1070 + i} from={from} to={to} size={46 + i * 6} trail={(46 + i * 6) * 4} />
        );
      })}
      <StickyNote frame={g} x={helm.x - 110 * helm.s} y={helm.y - 70 * helm.s} width={260 * helm.s} text="Phase 3: cut it" slapAt={EDIT_NOTE} rotate={-6} />
    </AbsoluteFill>
  );
};

const S107_AT: Vec3 = [0, F, -15];
const S107_TL = timeline([cut(E('s107-cut'), pose('base', { head: [10, -0.01], armR: [-10, 70, -10, 'grip'], armL: [10, 60, 0, 'fist'] })), move(E('s107-note') + 6, pose('raise_sword', { head: [14, -0.01] }), 18)]);
const S107_CAM: CameraPath = withShake(handheld(hold({ ...OFF_WIDE, position: [0, -1.4, -1.5], target: [0, -0.4, -20] }), { amp: 0.03, seed: 's107' }), {
  hits: [{ start: REWIND, seed: 1071, amp: { pct: SHAKE_PCT.small } }],
});

export const S107 = ({ frame }: { frame: number }) => {
  if (frame < REWIND) {
    // The click, still on the monitor.
    return (
      <Shot bg={O.bg}>
        <EyeMonitor frame={frame} push={1.06} />
        <RevertDialog frame={frame} x={dialogBox.x} y={dialogBox.y} width={DLG_W} enterAt={E('s106-dialog')} approachAt={E('s106-approach')} pressAt={E('s107-cut')} tremble seed={7} closeAfter={4} title="Revert patch 2.5?" body="All changes from this patch will be undone." />
      </Shot>
    );
  }
  const cam = S107_CAM(frame);
  const head = project(cam, rigPoints(S107_TL, frame, { at: S107_AT }).head);
  const s = pxPerUnit(cam, head.z) / 120;
  const lines = Math.floor(frame - REWIND) % 2 === 0;
  return (
    <Shot>
      <Stage camera={S107_CAM}>
        <Paint frame={frame}>
        <AfterRoom frame={frame} desks={RUIN} topPaint={false} />
        <Wreck />
        <Vorathul tl={S107_TL} frame={frame} at={S107_AT} />
      </Paint>
      </Stage>
      <TimeRemap map={REMAP}>{(gg) => <Part1Edits g={gg} helm={{ x: head.x, y: head.y, s }} />}</TimeRemap>
      {/* Rewind grammar in office colours: scan bands and the reverse badge. */}
      <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(0deg, rgba(59,130,246,0.10) 0 6px, transparent 6px ${lines ? 22 : 26}px)`, mixBlendMode: 'multiply' }} />
      <div style={{ position: 'absolute', left: 70, bottom: 70, padding: '10px 26px', background: O.blue, color: O.white, fontFamily: "'UiPlexMono', monospace", fontSize: 54, fontWeight: 500, borderRadius: 12 }}>◀◀ REVERTING · PATCH 2.5 → 2.2</div>
    </Shot>
  );
};

