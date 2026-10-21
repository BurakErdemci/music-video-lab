// Type interactions: the girls play with the type (scene-map.md "The girls are never wallpaper", 1).
// Every interaction is a plan built from measured word times (tokens from the timing API) and placed words,
// plus two pure parts: what the stage draws (card placements, pose swaps, offsets) and what the type layer
// draws (SVG). Depth splits use the girl's rig-deformed silhouette as an SVG mask, so a letter can pass in
// front of or behind her although the canvas sits under the type.
//  KICK:   on a word the pose swaps to a kick and the word flies off screen with spin and a smear.
//  PERCH:  a girl drops onto a big letter and sits on its top edge (from the metrics); the letter dips.
//  HOOP:   RING text orbits her waist, in front of her on the near half and behind her on the far half.
//  REVEAL: a FLAP board folds away cell by cell (or a STAMP plate slides off) to reveal the girl behind.
//  THROW:  in call and response a word leaves one girl and lands on the other, who is knocked back.
import type { ReactNode } from 'react';
import type { CameraPose } from '../camera/camera.ts';
import type { Placement } from '../cards/Card.tsx';
import { type CardDraw, poseTrack, smearPlan } from '../cards/smear.tsx';
import { type Hex, clamp01, inQuad, lerp, mixHex, outQuad } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import type { Token } from '../lyrics/LyricLayer.tsx';
import { capOf, familyOf, layout } from '../type/fonts.tsx';
import { clean, INK } from '../type/forms/common.tsx';
import type { WordAt } from '../type/transitions/transitions.tsx';
import { keypoint, placeAt, screenOf, silhouetteD, unproject } from './silhouette.ts';

const wordText = (w: WordAt, opacity = 1, extra: Record<string, unknown> = {}) => (
  <text x={w.x} y={w.y} fontFamily={familyOf(w.face)} fontSize={w.size} fill={w.fill} stroke={INK} strokeWidth={w.size * 0.04} strokeLinejoin="round" paintOrder="stroke" opacity={opacity} {...extra}>
    {w.text}
  </text>
);
/** A mask that hides whatever it wraps where the girl is (she stands in front of it). */
const GirlMask = ({ id, d, children }: { id: string; d: string; children: ReactNode }) => (
  <g>
    <defs>
      <mask id={id} maskUnits="userSpaceOnUse" x={-500} y={-500} width={2920} height={2080}>
        <rect x={-500} y={-500} width={2920} height={2080} fill="#fff" />
        <path d={d} fill="#000" />
      </mask>
    </defs>
    <g mask={`url(#${id})`}>{children}</g>
  </g>
);

// ---- KICK ---------------------------------------------------------------------------------------------
export interface KickPlan { id: string; word: WordAt; tok: Token; kick: number; idle: string; kickCard: string; at: Placement; dir: 1 | -1 }
const KICK_FLIGHT = 22 / 60;
export const kickPlan = (p: KickPlan): KickPlan => {
  if (p.kick < p.tok.start) throw new Error(`kick ${p.id}: the kick lands before its word appears`);
  return p;
};
/** The girl's cards: idle until the kick, an 8-frame smear swap into the kick pose on the kick time. */
export const kickCards = (p: KickPlan, t: number): CardDraw[] => poseTrack(p.idle, [smearPlan({ id: `${p.id}-swap`, t: p.kick, from: p.idle, to: p.kickCard, dir: p.dir, frames: 8 })], t, p.at.height);

export const KickWord = ({ plan, t }: { plan: KickPlan; t: number }) => {
  if (t < plan.tok.start) return null;
  const w = plan.word;
  const { width } = layout(w.text, w.size, w.face);
  const cx = w.x + width / 2;
  const cy = w.y - (w.size * capOf(w.face)) / 2;
  if (t < plan.kick) {
    const s = lerp(1.5, 1, outQuad((t - plan.tok.start) / (8 / 60)));
    return <g transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`}>{wordText(w)}</g>;
  }
  const u = (t - plan.kick) / KICK_FLIGHT;
  if (u >= 1) return null;
  const dx = plan.dir * 2600 * u ** 1.6;
  const dy = -420 * Math.sin(Math.PI * 0.6 * u);
  const spin = plan.dir * 900 * u;
  const smear = 1 + 1.4 * Math.sin(Math.PI * Math.min(1, u * 1.4));
  const r = seeded(`kick:${plan.id}`);
  return (
    <g>
      {Array.from({ length: 10 }, (_, i) => {
        const y = cy + r.range(-w.size * 0.4, w.size * 0.4) + dy;
        const len = r.range(200, 700) * (1 - u);
        return <line key={i} x1={cx + dx - plan.dir * len} y1={y} x2={cx + dx} y2={y} stroke={i % 2 ? w.fill : '#ffffff'} strokeWidth={r.range(3, 10)} strokeLinecap="round" opacity={1 - u} />;
      })}
      <g transform={`translate(${cx + dx} ${cy + dy}) rotate(${spin}) scale(${smear} ${1 / Math.sqrt(smear)}) translate(${-cx} ${-cy})`}>{wordText(w)}</g>
    </g>
  );
};

// ---- PERCH --------------------------------------------------------------------------------------------
export interface PerchPlan { id: string; word: WordAt; letter: number; tok: Token; land: number; card: string; height: number; pose: CameraPose }
const PERCH_DROP = 0.3;
/** The top-centre of letter i of a placed word (from the advances and the cap height), in px. */
export const letterTop = (w: WordAt, i: number): [number, number] => {
  const l = layout(w.text, w.size, w.face);
  return [w.x + (l.xs[i] as number) + (l.ws[i] as number) / 2, w.y - w.size * capOf(w.face)];
};
/** Where the girl sits: her hips on the letter's top edge. */
export const perchPlacement = (p: PerchPlan): Placement => placeAt(p.card, p.height, keypoint(p.card, 'hips'), unproject(p.pose, ...letterTop(p.word, p.letter)));
/** World y offset of the card: she drops in (accelerating) and lands on the land time; 0 after. */
export const perchDy = (p: PerchPlan, t: number): number => (t >= p.land ? 0 : 7 * (1 - inQuad((t - (p.land - PERCH_DROP)) / PERCH_DROP)));
export const perchVisible = (p: PerchPlan, t: number): boolean => t >= p.land - PERCH_DROP;
/** The letter's dip in px: pushed down over 4 frames on the landing, then an exponential recovery. */
export const perchDip = (p: PerchPlan, t: number): number => (t < p.land ? 0 : 0.12 * p.word.size * outQuad((t - p.land) / (4 / 60)) * Math.exp(-6 * Math.max(0, t - p.land - 4 / 60)));

export const PerchWord = ({ plan, t }: { plan: PerchPlan; t: number }) => {
  if (t < plan.tok.start) return null;
  const w = plan.word;
  const l = layout(w.text, w.size, w.face);
  const dip = perchDip(plan, t);
  const squash = 1 - dip / (w.size * 0.9);
  const letters = [...w.text].map((ch, i) => {
    const x = w.x + (l.xs[i] as number);
    const isSeat = i === plan.letter;
    const tr = isSeat ? `translate(0 ${w.y}) scale(1 ${squash}) translate(0 ${-w.y})` : undefined;
    return (
      <text key={i} x={x} y={w.y} fontFamily={familyOf(w.face)} fontSize={w.size} fill={w.fill} stroke={INK} strokeWidth={w.size * 0.04} paintOrder="stroke" transform={tr}>
        {ch}
      </text>
    );
  });
  const d = perchVisible(plan, t) ? silhouetteD(plan.card, perchPlacement(plan), plan.pose, t, 1, 0, perchDy(plan, t)) : '';
  return d ? <GirlMask id={`perch-${plan.id}`} d={d}>{letters}</GirlMask> : <g>{letters}</g>;
};

// ---- HOOP ---------------------------------------------------------------------------------------------
export interface HoopPlan { id: string; tokens: readonly Token[]; key: number; card: string; at: Placement; pose: CameraPose; rx: number; ry: number; size: number; speed: number; fill: (i: number) => string; keyFill: string }

/** HOOP is for short lines only: every letter must stay readable on the near half. */
export const HOOP_MAX_LETTERS = 24;
export const HOOP_MIN_SIZE = 96;
export const hoopPlan = (p: HoopPlan): HoopPlan => {
  const letters = p.tokens.reduce((n, tk) => n + clean(tk.text).length + 1, 0);
  if (letters > HOOP_MAX_LETTERS) throw new Error(`hoop ${p.id}: ${letters} letters, a HOOP takes short lines only (max ${HOOP_MAX_LETTERS})`);
  if (p.size < HOOP_MIN_SIZE) throw new Error(`hoop ${p.id}: size ${p.size} px is below the readable ${HOOP_MIN_SIZE} px`);
  return p;
};

export const HoopType = ({ plan, t }: { plan: HoopPlan; t: number }) => {
  const [hx, hy] = screenOf(plan.card, plan.at, plan.pose, t, keypoint(plan.card, 'hips'));
  const cy = hy - plan.ry * 0.6;
  const letters: { ch: string; tok: number; adv: number }[] = [];
  plan.tokens.forEach((tk, i) => {
    const w = `${clean(tk.text).toUpperCase()} `;
    const size = i === plan.key ? plan.size * 1.4 : plan.size;
    const l = layout(w, size, 'bungee');
    [...w].forEach((c, n) => letters.push({ ch: c, tok: i, adv: (l.ws[n] as number) + size * 0.04 }));
  });
  const circ = Math.PI * (plan.rx + plan.ry);
  let a = -plan.speed * t;
  const front: ReactNode[] = [];
  const back: ReactNode[] = [];
  letters.forEach((l, i) => {
    const span = (l.adv / circ) * 2 * Math.PI;
    const ang = a + span / 2;
    a -= span;
    const tk = plan.tokens[l.tok];
    if (!tk || t < tk.start || l.ch === ' ') return;
    const near = Math.sin(ang); // +1 nearest the camera (bottom of the ellipse), -1 behind her
    const x = hx + Math.cos(ang) * plan.rx;
    const y = cy + near * plan.ry;
    const size = (l.tok === plan.key ? plan.size * 1.4 : plan.size) * (0.85 + 0.15 * near);
    const el = (
      <text key={i} x={0} y={0} textAnchor="middle" fontFamily={familyOf('bungee')} fontSize={size} fill={l.tok === plan.key ? plan.keyFill : plan.fill(l.tok)} stroke={INK} strokeWidth={size * 0.05} paintOrder="stroke" opacity={0.65 + 0.35 * (near + 1) / 2} transform={`translate(${x} ${y}) scale(${0.7 + 0.3 * Math.abs(Math.cos(ang))} 1)`}>
        {l.ch}
      </text>
    );
    (near >= 0 ? front : back).push(el);
  });
  return (
    <g>
      <GirlMask id={`hoop-${plan.id}`} d={silhouetteD(plan.card, plan.at, plan.pose, t)}>{back}</GirlMask>
      {front}
    </g>
  );
};

// ---- REVEAL -------------------------------------------------------------------------------------------
export interface RevealPlan { id: string; text: string; box: { x: number; y: number; w: number; h: number }; reveal: number; kind: 'flap' | 'slide'; color: Hex }
const REVEAL_DUR = 26 / 60;
export const revealDone = (p: RevealPlan, t: number) => t >= p.reveal + REVEAL_DUR;

export const RevealBoard = ({ plan, t }: { plan: RevealPlan; t: number }) => {
  if (revealDone(plan, t)) return null;
  const cols = Math.max(plan.text.length, 6);
  const cw = plan.box.w / cols;
  const ch = Math.min(plan.box.h, cw * 1.5);
  const y = plan.box.y + (plan.box.h - ch) / 2;
  const size = ch * 0.7;
  const u = clamp01((t - plan.reveal) / REVEAL_DUR);
  if (plan.kind === 'slide') {
    const dx = 2200 * inQuad(u);
    return (
      <g transform={`translate(${dx} 0) rotate(${8 * u} ${plan.box.x} ${plan.box.y})`}>
        <rect x={plan.box.x} y={y - ch * 0.2} width={plan.box.w} height={ch * 1.4} rx={ch * 0.15} fill="#08040f" stroke={plan.color} strokeWidth={ch * 0.06} />
        <text x={plan.box.x + plan.box.w / 2} y={y + ch * 0.78} textAnchor="middle" fontFamily={familyOf('bungee')} fontSize={size} fill={mixHex(plan.color, '#ffffff', 0.4)}>{plan.text}</text>
      </g>
    );
  }
  return (
    <g fontFamily={familyOf('jetbrains')} fontWeight={800}>
      {Array.from({ length: cols }, (_, i) => {
        // cells fold away left to right, each over 8 frames
        const k = clamp01((u * REVEAL_DUR - (i / cols) * (REVEAL_DUR - 8 / 60)) / (8 / 60));
        if (k >= 1) return null;
        const x = plan.box.x + i * cw;
        const cyc = y + ch / 2;
        const c = plan.text[i - Math.floor((cols - plan.text.length) / 2)] ?? '';
        return (
          <g key={i} transform={`translate(0 ${cyc}) scale(1 ${1 - k}) translate(0 ${-cyc})`}>
            <rect x={x + 3} y={y} width={cw - 6} height={ch} rx={6} fill="#14101c" stroke="#2c2438" strokeWidth={2} />
            <text x={x + cw / 2} y={y + ch / 2 + size * 0.36} textAnchor="middle" fontSize={size} fill={plan.color}>{c}</text>
            <line x1={x + 3} y1={cyc} x2={x + cw - 3} y2={cyc} stroke="#000" strokeWidth={3} />
          </g>
        );
      })}
    </g>
  );
};

// ---- THROW --------------------------------------------------------------------------------------------
export interface Throw { tok: Token; from: 'A' | 'B'; land: number }
export interface ThrowPlan { id: string; throws: readonly Throw[]; A: { card: string; at: Placement; color: Hex }; B: { card: string; at: Placement; color: Hex }; pose: CameraPose; size: number }
export const throwPlan = (p: ThrowPlan): ThrowPlan => {
  for (const th of p.throws) if (th.land <= th.tok.start) throw new Error(`throw ${p.id}: "${th.tok.text}" lands before it is sung`);
  return p;
};
/** Recoil of a girl (world units, away from the thrower) when a word lands on her. */
export const throwRecoil = (p: ThrowPlan, who: 'A' | 'B', t: number): number =>
  p.throws.filter((th) => th.from !== who && t >= th.land).reduce((s, th) => s + (who === 'A' ? -1 : 1) * 0.35 * Math.exp(-7 * (t - th.land)) * outQuad((t - th.land) / (3 / 60)), 0);

export const ThrowWords = ({ plan, t }: { plan: ThrowPlan; t: number }) => {
  const head = (who: 'A' | 'B') => {
    const g = plan[who];
    return screenOf(g.card, g.at, plan.pose, t, keypoint(g.card, 'chest'));
  };
  return (
    <g>
      {plan.throws.map((th, i) => {
        if (t < th.tok.start) return null;
        const src = head(th.from);
        const dst = head(th.from === 'A' ? 'B' : 'A');
        const color = plan[th.from].color;
        const text = clean(th.tok.text).toUpperCase();
        const { width } = layout(text, plan.size, 'bungee');
        const fl = clamp01((t - th.tok.start) / (th.land - th.tok.start));
        const after = t - th.land;
        // a parabolic arc across, then a knock back: the word bounces off and falls away
        let x = lerp(src[0], dst[0], outQuad(fl));
        let y = lerp(src[1], dst[1], fl) - Math.sin(Math.PI * fl) * 240;
        let rot = (th.from === 'A' ? 1 : -1) * 360 * outQuad(fl);
        let op = 1;
        if (after > 0) {
          const back = th.from === 'A' ? -1 : 1;
          x = dst[0] + back * 180 * outQuad(after / 0.3);
          y = dst[1] + 600 * after * after;
          rot += back * 200 * after;
          op = 1 - clamp01((after - 0.2) / 0.25);
        }
        if (op <= 0) return null;
        const trail = after > 0 ? 0 : Math.min(1, fl * 4) * (1 - fl);
        return (
          <g key={i} opacity={op}>
            {[3, 2, 1].map((g) => {
              const f2 = clamp01(fl - g * 0.06);
              const gx = lerp(src[0], dst[0], outQuad(f2));
              const gy = lerp(src[1], dst[1], f2) - Math.sin(Math.PI * f2) * 240;
              return trail > 0 ? <text key={g} x={gx - width / 2} y={gy} fontFamily={familyOf('bungee')} fontSize={plan.size} fill={color} opacity={0.25 * trail} transform={`rotate(${rot} ${gx} ${gy})`}>{text}</text> : null;
            })}
            <text x={x - width / 2} y={y} fontFamily={familyOf('bungee')} fontSize={plan.size} fill={mixHex(color, '#ffffff', 0.15)} stroke={INK} strokeWidth={plan.size * 0.05} paintOrder="stroke" transform={`rotate(${rot} ${x} ${y})`}>
              {text}
            </text>
            {after > 0 && after < 0.15 && <circle cx={dst[0]} cy={dst[1]} r={120 * outQuad(after / 0.15)} fill="none" stroke="#ffffff" strokeWidth={8 * (1 - after / 0.15)} />}
          </g>
        );
      })}
    </g>
  );
};

