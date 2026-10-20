import { useVideoConfig } from 'remotion';
import { seeded } from './seeded.ts';
import { easeOutCubic, INK, InkFilter, inkFilterId, Overlay, polar, polyPath, type Pt } from './style.tsx';

interface Common {
  /** Frame relative to the effect start. */
  frame: number;
  duration: number;
  seed: number;
  color?: string;
  /** Number of lines. */
  count?: number;
  /** Max line width in px. */
  thickness?: number;
  /** Lines re-roll every `hold` frames, the comic "flicker" (2 = on twos). */
  hold?: number;
}

export interface RadialSpeedLinesProps extends Common {
  mode: 'radial';
  /** Point the lines converge to. */
  focus: Pt;
  /** Radius of the clear zone around the focus, px. */
  inner?: number;
}

export interface ParallelSpeedLinesProps extends Common {
  mode: 'parallel';
  /** Direction of motion, radians (0 = moving right). Lines trail behind the motion. */
  angle: number;
  /** Line travel per frame, px. */
  speed?: number;
}

export type SpeedLinesProps = RadialSpeedLinesProps | ParallelSpeedLinesProps;

const radialPath = (p: RadialSpeedLinesProps, w: number, h: number): string => {
  const { frame, seed, count = 70, thickness = 90, inner = 260, hold = 2 } = p;
  const base = seeded(`speed-r:${seed}`);
  const flick = seeded(`speed-r:${seed}:${Math.floor(frame / hold)}`);
  const outer = Math.hypot(w, h);
  // Lines shoot in from the frame edge over the first frames, then hold and flicker.
  const reach = easeOutCubic((frame + 1) / 4);
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = ((i + base.range(-0.4, 0.4)) / count) * Math.PI * 2;
    const visible = flick() < 0.78;
    const tipR = inner * flick.range(1, 1.9);
    const width = thickness * base.range(0.25, 1) * flick.range(0.7, 1.2);
    if (!visible) continue;
    const r = outer - (outer - tipR) * reach;
    const half = width / 2 / outer;
    const pts: Pt[] = [polar(outer, a - half), polar(outer, a + half), polar(r, a + flick.range(-0.004, 0.004))];
    d += polyPath(pts.map(([x, y]) => [x + p.focus[0], y + p.focus[1]] as Pt));
  }
  return d;
};

const parallelPath = (p: ParallelSpeedLinesProps, w: number, h: number): string => {
  const { frame, seed, count = 46, thickness = 26, speed = 120, angle, hold = 2 } = p;
  const base = seeded(`speed-p:${seed}`);
  const flick = seeded(`speed-p:${seed}:${Math.floor(frame / hold)}`);
  const span = Math.hypot(w, h);
  const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
  const [nx, ny] = [-dy, dx];
  const [cx, cy] = [w / 2, h / 2];
  let d = '';
  for (let i = 0; i < count; i++) {
    const off = base.range(-span / 2, span / 2);
    const len = base.range(0.25, 0.7) * span;
    const width = thickness * base.range(0.3, 1) * flick.range(0.75, 1.15);
    const phase = base() * span * 2;
    if (flick() > 0.85) continue;
    // Head position along the motion axis, wrapping so lines stream continuously.
    const along = ((phase + frame * speed) % (span * 2)) - span;
    const head: Pt = [cx + nx * off + dx * along, cy + ny * off + dy * along];
    const tail: Pt = [head[0] - dx * len, head[1] - dy * len];
    const neck: Pt = [head[0] - dx * len * 0.12, head[1] - dy * len * 0.12];
    // Thick just behind the head, tapering to a needle at the tail.
    d += polyPath([tail, [neck[0] + (nx * width) / 2, neck[1] + (ny * width) / 2], head, [neck[0] - (nx * width) / 2, neck[1] - (ny * width) / 2]]);
  }
  return d;
};

/** Comic speed lines, either converging on a focus point or streaming in one direction. Tapered, ink-roughened. */
export const SpeedLines = (props: SpeedLinesProps) => {
  const { width, height } = useVideoConfig();
  if (props.frame < 0 || props.frame >= props.duration) return null;
  const d = props.mode === 'radial' ? radialPath(props, width, height) : parallelPath(props, width, height);
  return (
    <Overlay>
      <defs>
        <InkFilter seed={props.seed} rough={3} />
      </defs>
      <path d={d} fill={props.color ?? INK} filter={`url(#${inkFilterId(props.seed, 3)})`} />
    </Overlay>
  );
};
