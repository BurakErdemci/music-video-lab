import React from 'react';
import { type BoxProps, C, easeOut, LINE, lerp, prog, Scaled } from './theme.tsx';

/** Pop-in with a small overshoot, shared by the cards: returns [scale, opacity]. */
const pop = (frame: number, at: number): [number, number] => {
  const t = frame - at;
  if (t < 0) return [1, 0];
  const k = easeOut(prog(frame, at, 6));
  const over = t < 6 ? 0 : 0.04 * Math.exp(-(t - 6) / 3) * Math.cos((t - 6) * 0.9);
  return [lerp(0.8, 1, k) + over, k];
};

export interface ForumCardProps extends BoxProps {
  frame: number;
  popAt: number;
  title: string;
  author?: string;
  votes?: number;
  replies?: number;
  rotate?: number;
}

export const ForumCard: React.FC<ForumCardProps> = ({ frame, popAt, title, author = 'player_4821', votes = 214, replies = 38, rotate = 0, ...box }) => {
  const [s, a] = pop(frame, popAt);
  if (a <= 0) return null;
  return (
    <Scaled {...box} designW={640} designH={240} opacity={(box.opacity ?? 1) * a} transform={`rotate(${rotate}deg) scale(${s})`}>
      <div style={{ width: 640, height: 240, boxSizing: 'border-box', borderRadius: 22, background: C.white, border: `${LINE}px solid ${C.dark}`, padding: '24px 30px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: C.mid, border: `${LINE}px solid ${C.dark}`, boxSizing: 'border-box' }} />
          <div style={{ fontSize: 26, fontWeight: 600, color: C.slate }}>{author}</div>
          <div style={{ marginLeft: 'auto', padding: '4px 16px', borderRadius: 16, background: C.blue, color: C.white, fontSize: 22, fontWeight: 700 }}>Feedback</div>
        </div>
        <div style={{ marginTop: 22, fontSize: 46, fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>{title}</div>
        <div style={{ position: 'absolute', left: 30, bottom: 20, display: 'flex', alignItems: 'center', gap: 34, fontSize: 26, fontWeight: 600, color: C.slate }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width={22} height={20} viewBox="0 0 22 20"><path d="M11 2 L21 18 H1 Z" fill={C.blue} /></svg>
            {votes}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width={26} height={22} viewBox="0 0 26 22"><rect x="1" y="1" width="24" height="15" rx="5" fill="none" stroke={C.slate} strokeWidth={2.5} /></svg>
            {replies}
          </span>
        </div>
      </div>
    </Scaled>
  );
};

export interface PosterProps extends BoxProps {
  frame: number;
  popAt: number;
  /** Big lines, one per array entry. */
  lines: string[];
  rotate?: number;
}

export const Poster: React.FC<PosterProps> = ({ frame, popAt, lines, rotate = 0, ...box }) => {
  const [s, a] = pop(frame, popAt);
  if (a <= 0) return null;
  return (
    <Scaled {...box} designW={440} designH={600} opacity={(box.opacity ?? 1) * a} transform={`rotate(${rotate}deg) scale(${s})`}>
      <div style={{ position: 'relative', width: 440, height: 600, boxSizing: 'border-box', background: C.white, border: `${LINE}px solid ${C.dark}`, borderRadius: 8 }}>
        <div style={{ height: 120, background: C.blue, borderRadius: '6px 6px 0 0' }} />
        {[26, 354].map((x) => (
          <div key={x} style={{ position: 'absolute', left: x, top: -14, width: 60, height: 30, background: C.mid, opacity: 0.9, transform: `rotate(${x < 100 ? -12 : 12}deg)` }} />
        ))}
        <div style={{ position: 'absolute', left: 36, right: 36, top: 190, textAlign: 'center', fontSize: 62, fontWeight: 900, lineHeight: 1.1, color: C.ink }}>
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 36, right: 36, bottom: 40, height: 22, borderRadius: 11, background: C.mid }} />
      </div>
    </Scaled>
  );
};
