// Location title, always bottom right. Painting: a comic narration box (ivory, ink border, Anton, offset ink
// shadow) that slams in small and crumbles out, or fades (soft). Office: a white UI card in the headline grammar.
import { FPS } from '../../timing.ts';
import { C, MONO_FONT, UI_FONT } from '../../ui/theme.tsx';
import { INK, IVORY } from '../../vfx/style.tsx';
import { popEnvelope } from './Headline.tsx';
import { clamp01, easeIn, easeOut, lerp, MOTION } from './motion.ts';
import { CARD, cardSize, type CardSpec } from './schedule.ts';
import { ANTON_CAP } from './metrics.ts';

const ANTON = "'UiAnton', 'Anton', Impact, sans-serif";

const Office = ({ spec, frame, fps }: { spec: CardSpec; frame: number; fps: number }) => {
  const e = popEnvelope(frame, spec.at, spec.out, fps);
  if (!e.visible) return null;
  const s = cardSize(spec);
  return (
    <div
      style={{
        position: 'absolute', left: s.x, top: s.y, width: s.w, height: s.h, boxSizing: 'border-box', padding: `0 ${CARD.pad}px 0 ${CARD.pad + 10}px`,
        background: C.white, border: `2px solid ${C.mid}`, borderRadius: 14, boxShadow: '0 10px 0 rgba(52,58,64,0.10)', overflow: 'hidden',
        transform: `translateY(${e.lift}px) scale(${e.scale})`, transformOrigin: '50% 100%', clipPath: `inset(-20px -20px -20px ${e.wipe}%)`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: CARD.gap,
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, background: C.blue, transform: `scaleY(${e.bar})`, transformOrigin: 'top' }} />
      <div style={{ fontFamily: MONO_FONT, fontWeight: 500, fontSize: CARD.kickerSize * 0.8, lineHeight: 1, letterSpacing: 3, color: C.slate, whiteSpace: 'nowrap' }}>{spec.kicker}</div>
      <div style={{ fontFamily: UI_FONT, fontWeight: 800, fontSize: CARD.titleSize * 0.82, lineHeight: 0.9, color: C.ink, whiteSpace: 'nowrap' }}>{spec.title}</div>
    </div>
  );
};

const Comic = ({ spec, frame, fps }: { spec: CardSpec; frame: number; fps: number }) => {
  const t = (frame - spec.at) / fps;
  const tOut = (frame - spec.out) / fps;
  const outDur = spec.soft ? MOTION.softOut : MOTION.crumble;
  if (t < 0 || tOut >= outDur) return null;
  const s = cardSize(spec);
  let opacity = 1;
  let transform: string;
  if (spec.soft) {
    const p = easeOut(t / MOTION.softIn);
    opacity = p * (1 - clamp01(tOut / outDur));
    transform = `translateY(${16 * (1 - p)}px) rotate(-1deg)`;
  } else {
    const p = clamp01(t / MOTION.slamIn);
    const scale = p < 1 ? lerp(1.5, 0.96, easeOut(p)) : lerp(0.96, 1, easeOut((t - MOTION.slamIn) / MOTION.slamSettle));
    const fall = easeIn(clamp01(tOut / outDur));
    opacity = 1 - fall;
    transform = `translate(${-30 * fall}px, ${160 * fall}px) rotate(${-1.5 - 14 * fall}deg) scale(${scale})`;
  }
  return (
    <div
      style={{
        position: 'absolute', left: s.x, top: s.y, width: s.w, height: s.h, boxSizing: 'border-box', padding: `0 ${CARD.pad}px`,
        background: IVORY, border: `5px solid ${INK}`, boxShadow: `9px 9px 0 ${INK}`, opacity, transform, transformOrigin: '100% 100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: CARD.gap,
      }}
    >
      <div style={{ fontFamily: ANTON, fontSize: CARD.kickerSize, height: ANTON_CAP * CARD.kickerSize, lineHeight: `${ANTON_CAP * CARD.kickerSize}px`, letterSpacing: '0.08em', color: INK, whiteSpace: 'nowrap', overflow: 'visible' }}>{spec.kicker}</div>
      <div style={{ fontFamily: ANTON, fontSize: CARD.titleSize, height: ANTON_CAP * CARD.titleSize, lineHeight: `${ANTON_CAP * CARD.titleSize}px`, letterSpacing: '0.03em', color: INK, whiteSpace: 'nowrap', overflow: 'visible' }}>{spec.title}</div>
    </div>
  );
};

export const ChapterCard = ({ spec, frame }: { spec: CardSpec; frame: number }) => {
  const fps = FPS;
  return spec.world === 'office' ? <Office spec={spec} frame={frame} fps={fps} /> : <Comic spec={spec} frame={frame} fps={fps} />;
};
