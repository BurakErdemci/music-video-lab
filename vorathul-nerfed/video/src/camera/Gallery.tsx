// Preview of every framing preset and camera move on placeholder cards. Not part of the film.
// Placeholder cards are unlit planes with canvas-drawn textures, so the gallery needs no image files.
import { useMemo } from 'react';
import { CanvasTexture, DoubleSide, LinearFilter, SRGBColorSpace } from 'three';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Stage, type CameraPath, type CameraPose } from '../stage/Stage.tsx';
import {
  CLOSE, ECU, FLOOR, HIGH, LENS, LOW, MED, OFF_CLOSE, OFF_HIGH, OFF_LOW, OFF_MED, OFF_WIDE, OTS_CURSOR, OTS_DEV, OTS_HERO, UNDER_DESK, WIDE,
} from './framing.ts';
import { crane, dolly, handheld, hold, onTwos, orbit, pan, pull, push, sequence, tilt, whip, whipBlur } from './moves.ts';
import { SHAKE_PCT, withShake, type ShakeHit } from './shake.ts';

type SetName = 'painting' | 'office' | 'probe';
interface Item {
  label: string;
  note?: string;
  set: SetName;
  frames: number;
  /** Builds the path for a segment that starts at `s`. */
  make: (s: number) => CameraPath;
}

const PRESET_FRAMES = 24;
const MOVE_FRAMES = 30;

const MED_LEVEL: CameraPose = { position: [0, 6, 14], target: [0, 6, -15], fov: 40 };
/** View-axis distance from MED_LEVEL to the probe card at z -15. */
const PROBE_DEPTH = 29;
const stressHits = (s: number): ShakeHit[] => [4, 12, 20, 28].map((d, i) => ({ start: s + d, seed: 31 + i, amp: { pct: 0.06 }, frames: 8 }));
const gradeHits = (s: number, pct: number): ShakeHit[] => [2, 12, 22].map((d, i) => ({ start: s + d, seed: 7 + i, amp: { pct }, frames: 10 }));

const preset = (label: string, set: SetName, pose: CameraPose): Item => ({ label, set, frames: PRESET_FRAMES, make: () => hold(pose) });

const ITEMS: Item[] = [
  preset('WIDE', 'painting', WIDE),
  preset('MED', 'painting', MED),
  preset('CLOSE', 'painting', CLOSE),
  preset('ECU', 'painting', ECU),
  preset('LOW (fov 50)', 'painting', LOW),
  preset('FLOOR', 'painting', FLOOR()),
  preset('HIGH', 'painting', HIGH),
  preset('OTS-HERO', 'painting', OTS_HERO()),
  preset('OFF-WIDE', 'office', OFF_WIDE),
  preset('OFF-MED', 'office', OFF_MED()),
  preset('OFF-CLOSE', 'office', OFF_CLOSE()),
  preset('OFF-LOW (fov 60)', 'office', OFF_LOW),
  preset('OFF-HIGH (fov 50)', 'office', OFF_HIGH),
  preset('UNDER-DESK', 'office', UNDER_DESK),
  preset('OTS-DEV', 'office', OTS_DEV()),
  preset('OTS-CURSOR', 'office', OTS_CURSOR([0, -4, -10])),
  preset('LENS', 'office', LENS(9)),
  { label: 'hold', note: 'locked off', set: 'painting', frames: MOVE_FRAMES, make: () => hold(MED) },
  { label: 'push', note: 'MED, 8 units in', set: 'painting', frames: MOVE_FRAMES, make: (s) => push(MED, { start: s, frames: MOVE_FRAMES, distance: 8 }) },
  { label: 'pull', note: 'CLOSE, 8 units back', set: 'painting', frames: MOVE_FRAMES, make: (s) => pull(CLOSE, { start: s, frames: MOVE_FRAMES, distance: 8 }) },
  { label: 'dolly + onTwos', note: 'poses on twos', set: 'painting', frames: MOVE_FRAMES, make: (s) => onTwos(dolly(MED, { start: s, frames: MOVE_FRAMES, distance: 10 })) },
  { label: 'crane', note: 'MED rises 6, target fixed', set: 'painting', frames: MOVE_FRAMES, make: (s) => crane(MED, { start: s, frames: MOVE_FRAMES, lift: 6 }) },
  { label: 'tilt up', note: 'MED, +22 deg', set: 'painting', frames: MOVE_FRAMES, make: (s) => tilt(MED, { start: s, frames: MOVE_FRAMES, pitch: 22 }) },
  { label: 'pan', note: 'WIDE, +18 deg yaw', set: 'painting', frames: MOVE_FRAMES, make: (s) => pan(WIDE, { start: s, frames: MOVE_FRAMES, yaw: 18 }) },
  {
    label: 'whip',
    note: 'CLOSE, 6 frames, +40 deg',
    set: 'painting',
    frames: MOVE_FRAMES,
    make: (s) => sequence([{ from: s, path: hold(CLOSE) }, { from: s + 12, path: whip(CLOSE, { start: s + 12, yaw: 40 }) }]),
  },
  { label: 'orbit', note: 'MED, 28 deg arc', set: 'painting', frames: MOVE_FRAMES, make: (s) => orbit(MED, { start: s, frames: MOVE_FRAMES, arc: 28 }) },
  { label: 'handheld', note: 'amp 0.2 on CLOSE', set: 'painting', frames: MOVE_FRAMES, make: () => handheld(hold(CLOSE), { amp: 0.2, seed: 'gallery' }) },
  {
    label: 'sequence cut',
    note: 'WIDE / MED / CLOSE',
    set: 'painting',
    frames: MOVE_FRAMES,
    make: (s) => sequence([{ from: s, path: hold(WIDE) }, { from: s + 10, path: hold(MED) }, { from: s + 20, path: hold(CLOSE) }]),
  },
  {
    label: 'sequence blend',
    note: 'WIDE to ECU over 20 frames',
    set: 'painting',
    frames: MOVE_FRAMES,
    make: (s) => sequence([{ from: s, path: hold(WIDE) }, { from: s + 8, path: hold(ECU), blend: 20 }]),
  },
  { label: 'shake small', note: '0.5 % of frame height', set: 'painting', frames: MOVE_FRAMES, make: (s) => withShake(hold(MED), { hits: gradeHits(s, SHAKE_PCT.small) }) },
  { label: 'shake medium', note: '1.2 %', set: 'painting', frames: MOVE_FRAMES, make: (s) => withShake(hold(MED), { hits: gradeHits(s, SHAKE_PCT.medium) }) },
  { label: 'shake big', note: '2.5 %', set: 'painting', frames: MOVE_FRAMES, make: (s) => withShake(hold(MED), { hits: gradeHits(s, SHAKE_PCT.big) }) },
  {
    label: 'overscan OFF',
    note: 'stress 6 %, card = frame: edge shows (magenta)',
    set: 'probe',
    frames: MOVE_FRAMES,
    make: (s) => withShake(hold(MED_LEVEL), { hits: stressHits(s) }),
  },
  {
    label: 'overscan ON',
    note: 'same shake, fov narrowed: no edge',
    set: 'probe',
    frames: MOVE_FRAMES,
    make: (s) => withShake(hold(MED_LEVEL), { hits: stressHits(s), safeDepth: PROBE_DEPTH }),
  },
];

const STARTS: number[] = [];
let total = 0;
for (const it of ITEMS) {
  STARTS.push(total);
  total += it.frames;
}
export const GALLERY_FRAMES = total;
export const GALLERY_ITEMS = ITEMS.map((it, i) => ({ label: it.label, set: it.set, from: STARTS[i] as number, frames: it.frames }));

const CAMERA: CameraPath = sequence(ITEMS.map((it, i) => ({ from: STARTS[i] as number, path: it.make(STARTS[i] as number) })));
const itemAt = (frame: number): number => {
  let i = 0;
  while (i + 1 < ITEMS.length && frame >= (STARTS[i + 1] as number)) i++;
  return i;
};

/** Grid texture with 2-unit cells and a frame of tick numbers; drawn once per mount. */
const useGrid = (cells: number, base: string, line: string): CanvasTexture =>
  useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.fillStyle = base;
    g.fillRect(0, 0, 1024, 1024);
    g.strokeStyle = line;
    g.lineWidth = 3;
    for (let i = 0; i <= cells; i++) {
      const p = (i / cells) * 1024;
      g.beginPath();
      g.moveTo(p, 0);
      g.lineTo(p, 1024);
      g.moveTo(0, p);
      g.lineTo(1024, p);
      g.stroke();
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearFilter;
    return t;
  }, [cells, base, line]);

const Plane = ({ w, h, pos, rot, color, map }: { w: number; h: number; pos: [number, number, number]; rot?: [number, number, number]; color?: string; map?: CanvasTexture }) => (
  <mesh position={pos} rotation={rot ?? [0, 0, 0]}>
    <planeGeometry args={[w, h]} />
    <meshBasicMaterial color={color ?? '#ffffff'} map={map} toneMapped={false} side={DoubleSide} />
  </mesh>
);

const PaintingSet = () => {
  const wall = useGrid(80, '#e8dcc0', '#b89a52');
  const floor = useGrid(80, '#cfc3a4', '#8a7a4a');
  return (
    <>
      <Plane w={160} h={100} pos={[0, 20, -15.5]} map={wall} />
      <Plane w={160} h={160} pos={[0, 0, -15]} rot={[-Math.PI / 2, 0, 0]} map={floor} />
      <Plane w={3.5} h={12} pos={[0, 6, -15]} color="#050505" />
      <Plane w={1.4} h={1.4} pos={[-2.5, 0.7, -8]} color="#2d4f8a" />
      <Plane w={1.4} h={1.4} pos={[2.5, 0.7, -5]} color="#7a2d2d" />
    </>
  );
};

const OfficeSet = () => {
  const wall = useGrid(80, '#d9dde2', '#9aa3ad');
  const painting = useGrid(16, '#e8dcc0', '#b89a52');
  const floor = useGrid(80, '#c4c9cf', '#8c949d');
  return (
    <>
      <Plane w={160} h={100} pos={[0, 0, -24]} map={wall} />
      <Plane w={160} h={160} pos={[0, -6.2, -20]} rot={[-Math.PI / 2, 0, 0]} map={floor} />
      <Plane w={16} h={9} pos={[0, 0, -20]} map={painting} />
      <Plane w={3.5} h={12} pos={[0, 6, -19.9]} color="#050505" />
      <Plane w={1.6} h={3.4} pos={[-0.5, -4.5, -8]} color="#1c1c22" />
      <Plane w={1.5} h={1.5} pos={[0, -4, -10]} color="#2060e0" />
      <Plane w={6} h={0.4} pos={[2, -3.6, -6]} color="#5a4636" />
    </>
  );
};

/** Card exactly the size of MED_LEVEL's window at z -15: any shake not covered by overscan shows the magenta canvas. */
const ProbeSet = () => {
  const tex = useGrid(20, '#e8dcc0', '#b89a52');
  const h = 2 * PROBE_DEPTH * Math.tan((20 * Math.PI) / 180);
  return <Plane w={h * (16 / 9)} h={h} pos={[0, 6, -15]} map={tex} />;
};

const Scene = ({ set }: { set: SetName }) => (
  <>
    <color attach="background" args={[set === 'probe' ? '#ff00ff' : '#101018']} />
    {set === 'painting' ? <PaintingSet /> : set === 'office' ? <OfficeSet /> : <ProbeSet />}
  </>
);

export const CameraGallery = () => {
  const frame = useCurrentFrame();
  const i = itemAt(frame);
  const item = ITEMS[i] as Item;
  const local = frame - (STARTS[i] as number);
  const blur = item.label === 'whip' ? whipBlur(frame, (STARTS[i] as number) + 12) : 0;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage camera={CAMERA}>
        <Scene set={item.set} />
      </Stage>
      <div
        style={{
          position: 'absolute', left: 48, top: 40, padding: '10px 16px', background: 'rgba(0,0,0,0.72)', color: '#fff',
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 30, lineHeight: 1.3,
        }}
      >
        <div style={{ fontWeight: 700 }}>{item.label}</div>
        <div style={{ fontSize: 20, opacity: 0.8 }}>
          {item.note ? `${item.note} | ` : ''}f{local}/{item.frames}
          {blur > 0 ? ` | blur hint ${blur.toFixed(2)}` : ''}
        </div>
      </div>
    </AbsoluteFill>
  );
};
