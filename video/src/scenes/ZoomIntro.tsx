// Intro, bars 1-8: one continuous zoom-out that closes a loop (W room > sticky note > monitor > screen hole > W).
// Every number comes from the frame; the camera is world/droste.ts.
import { ev, evFrames } from '../events.ts';
import { H, W } from '../layout.ts';
import { lerp } from '../math.ts';
import { blinkAlpha, fadeOut, glide, progress, wipeP, ENTER_FRAMES } from '../motion/entrances.ts';
import { STAMP_FONT } from '../style/fonts.ts';
import { palette } from '../style/palette.ts';
import { plateOffset } from '../style/screenprint.tsx';
import { range, seeded } from '../style/seeded.ts';
import { barFrame } from '../timing.ts';
import { upperTr } from '../type/StampWord.tsx';
import { Level, type WorldState } from '../world/DrosteWorld.tsx';
import { depthFor, levelMatrix, makeCamera, makeZoomCurve, rootLevel, type Knot } from '../world/droste.ts';

/**
 * L = ln(zoom) at each downbeat. Frame 0: the cursor fills 70% of the frame height. Bar 2: the head. Bar 3: the whole
 * AI in its room. Bar 4: the room inside the monitor. Bar 5: that monitor is the note of another room. Then the
 * speed keeps growing (about 1.1, 1.3, 1.6, 1.7 loops per bar) until the cream takes the frame on the bar 9 downbeat.
 */
const KNOT_L = [3.17, 3.15, 2.1, 0.35, -1.35, -3.1, -5.45, -8.25, -11.45, -14.9] as const;
const KNOT_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const knots: Knot[] = KNOT_L.map((L, i) => ({ f: i === 0 ? 0 : barFrame(KNOT_FRAMES[i] as number), L }));
const curve = makeZoomCurve(knots);
const camera = makeCamera(curve, { leave: barFrame(2), mid: barFrame(3), fixed: barFrame(4) });
export const zoomL = curve;
export const zoomCamera = camera;

const TITLE = 'Her Sabah Baştan';
const TITLE_H = 200;
const STAMP_SQUASH = [1.15, 1.1, 1.05];

const bump = (frame: number, start: number, frames: number): number => {
  if (frame < start || frame >= start + frames) return 0;
  return Math.sin(Math.PI * progress(frame, start, frames));
};

export const ZoomIntro = ({ frame, lOverride }: { frame: number; lOverride?: number }) => {
  const cam = camera(frame, lOverride);
  const root = rootLevel(cam);
  const depth = depthFor(cam, root);
  const m = levelMatrix(cam, root);

  const rings = ['intro.oh1', 'intro.oh2'].flatMap((id) => {
    const f = ev(id).frame;
    const t = progress(frame, f, ENTER_FRAMES.ring);
    if (frame < f || t >= 1) return [];
    return [{ t, grow: 1 - Math.pow(1 - t, 3), alpha: Math.min(1, (frame - f + 1) / 4) * (1 - t) * 0.9 }];
  });
  const pulseFrames = evFrames('intro.pin.');
  const pulse = Math.max(0, ...pulseFrames.map((f) => bump(frame, f, ev('intro.pin.1').enter.frames)));
  const fHalo = ev('intro.halo').frame;

  const st: WorldState = {
    frame,
    cursorOp: lerp(0.45, 1, glide(frame, ev('intro.cursor.ink').frame, ev('intro.cursor.ink').enter.frames)) * blinkAlpha(frame, evFrames('intro.blink.')),
    echoP: glide(frame, ev('intro.cursor.echo').frame, ev('intro.cursor.echo').enter.frames),
    aiOp: lerp(0.25, 1, glide(frame, ev('intro.face').frame, ev('intro.face').enter.frames)),
    floorP: glide(frame, ev('intro.floor').frame, ev('intro.floor').enter.frames),
    moonP: wipeP(frame, ev('intro.moon').frame, ev('intro.moon').enter.frames),
    paperOp: lerp(0.5, 1, glide(frame, ev('intro.paper').frame, ev('intro.paper').enter.frames)),
    pinPulse: pulse,
    haloPulse: bump(frame, fHalo, ev('intro.halo').enter.frames),
    rings,
    bubble: { startFrame: ev('intro.bubble').frame, frames: ev('intro.bubble').enter.frames },
  };

  // the zoom rushes into the cream wall: a cream disc grows from the vanishing point, exponentially, and is flat by the downbeat
  const cream = ev('intro.cream');
  const rush = progress(frame, cream.frame, cream.enter.frames);
  const rushR = frame >= cream.frame ? 6 * Math.exp(Math.log(1500 / 6) * rush) : 0;

  const fTitle = ev('intro.title').frame;
  const fTitleFade = ev('intro.title.fade').frame;
  const titleOp = frame < fTitleFade ? 1 : fadeOut(frame, fTitleFade, ev('intro.title.fade').enter.frames);
  const sinceStamp = frame - fTitle;
  const titleScale = sinceStamp < 3 ? (STAMP_SQUASH[sinceStamp] as number) : 1;
  const titleRot = range(seeded('stamp:title-intro'), -2, 2);
  const plate = plateOffset('stamp:title-intro');

  const layer = { position: 'absolute', left: 0, top: 0, width: W, whiteSpace: 'nowrap', textAlign: 'center', fontFamily: STAMP_FONT, fontSize: 176, letterSpacing: '0.03em', lineHeight: 1.1 } as const;

  return (
    <>
      <svg key={frame} data-frame={frame} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect width={W} height={H} fill={palette.cream} />
        <g transform={`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`}>
          <Level d={0} n={root} depth={depth} st={st} />
        </g>
        {rushR > 0 && (
          <>
            <defs>
              <radialGradient id="cream-rush" gradientUnits="userSpaceOnUse" cx={W / 2} cy={H / 2} r={rushR * 1.25}>
                <stop offset="0" stopColor={palette.cream} stopOpacity={1} />
                <stop offset={0.8} stopColor={palette.cream} stopOpacity={1} />
                <stop offset={1} stopColor={palette.cream} stopOpacity={0} />
              </radialGradient>
            </defs>
            <circle cx={W / 2} cy={H / 2} r={rushR * 1.25} fill="url(#cream-rush)" />
          </>
        )}
      </svg>
      {frame >= fTitle && titleOp > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 700, width: W, height: TITLE_H, opacity: titleOp, transform: `rotate(${titleRot}deg) scale(${titleScale})` }}>
          <div style={{ ...layer, color: palette.moonYellow, transform: `translate(${plate.dx * 3}px, ${plate.dy * 3}px)` }}>{upperTr(TITLE)}</div>
          <div style={{ ...layer, color: palette.navy }}>{upperTr(TITLE)}</div>
        </div>
      )}
    </>
  );
};
