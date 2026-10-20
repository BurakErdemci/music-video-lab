import { useCurrentFrame } from 'remotion';
import { f, section, TIMING } from './timing.ts';

/** Master switch for the sync HUD; turn it off before the final render. */
export const HUD_ENABLED = true;

const BEAT_FRAMES = new Set(TIMING.beats.map(f));
const HIT_FRAMES = new Set(TIMING.hits.map((h) => f(h.t)));
const LIT_FRAMES = 2;
const litWithin = (set: Set<number>, frame: number): boolean => Array.from({ length: LIT_FRAMES }, (_, k) => frame - k).some((x) => set.has(x));

const pad = (n: number): string => String(n).padStart(2, '0');
const clock = (frame: number): string => {
  const s = Math.floor(frame / 30);
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}.${pad(frame % 30)}`;
};

/** DOM overlay outside the canvas: time, section and beat / hit flashes. */
export const Hud = () => {
  const frame = useCurrentFrame();
  if (!HUD_ENABLED) return null;
  const beat = litWithin(BEAT_FRAMES, frame);
  const hit = litWithin(HIT_FRAMES, frame);
  return (
    <div style={{ position: 'absolute', left: 24, top: 24, display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', background: 'rgba(0,0,0,0.7)', color: '#fff', font: '28px Consolas, monospace' }}>
      <div style={{ width: 40, height: 40, background: beat ? '#ffd23c' : '#333' }} />
      <div style={{ width: 80, height: 80, background: hit ? '#ff3c3c' : '#333' }} />
      <div>
        <div>{clock(frame)} f{frame}</div>
        <div>{section(frame)}</div>
      </div>
    </div>
  );
};
