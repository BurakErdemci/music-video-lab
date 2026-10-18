import type { ReactNode } from 'react';
import type { Dims, P, Skeleton } from './geometry.ts';

export interface BodyStyle {
  fill: string;
  outline: string;
  outlineW: number;
  torsoW: number;
  armW: number;
  legW: number;
}

export interface Seg {
  pts: P[];
  w: number;
}

export const pathOf = (pts: P[]): string => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

export const segments = (s: Skeleton, st: BodyStyle) => {
  const far: Seg[] = [
    { pts: [s.shoulder, s.elbowF, s.handF], w: st.armW },
    { pts: [s.pelvis, s.kneeF, s.ankleF, s.toeF], w: st.legW },
    { pts: [s.pelvis, s.kneeN, s.ankleN, s.toeN], w: st.legW },
    { pts: [s.pelvis, s.shoulder], w: st.torsoW },
    { pts: [s.shoulder, s.head], w: st.armW + 4 },
  ];
  const near: Seg = { pts: [s.shoulder, s.elbowN, s.handN], w: st.armW };
  return { far, near };
};

const Strokes = ({ segs, color, extra }: { segs: Seg[]; color: string; extra: number }) => (
  <>
    {segs.map((g, i) => (
      <path key={i} d={pathOf(g.pts)} stroke={color} strokeWidth={g.w + extra} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ))}
  </>
);

/**
 * Silhouette with one outer outline: all outlines first, then all fills, so the body reads as one
 * shape; the near arm is printed last with its own outline so it separates from the torso.
 * Children are drawn between the body and the near arm (notes, shading).
 */
export const Body = ({ s, d, st, children }: { s: Skeleton; d: Dims; st: BodyStyle; children?: ReactNode }) => {
  const { far, near } = segments(s, st);
  const o = st.outlineW * 2;
  return (
    <g>
      <Strokes segs={far} color={st.outline} extra={o} />
      <circle cx={s.head.x} cy={s.head.y} r={d.headR + st.outlineW} fill={st.outline} />
      <Strokes segs={far} color={st.fill} extra={0} />
      <circle cx={s.head.x} cy={s.head.y} r={d.headR} fill={st.fill} />
      {children}
      <Strokes segs={[near]} color={st.outline} extra={o} />
      <Strokes segs={[near]} color={st.fill} extra={0} />
    </g>
  );
};
