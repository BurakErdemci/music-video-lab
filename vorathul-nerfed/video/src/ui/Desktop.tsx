import React from 'react';
import { type BoxProps, C, easeIn, easeOut, hashNoise, LINE, lerp, prog, Scaled } from './theme.tsx';

export interface RecycleBinProps extends BoxProps {
  frame: number;
  /** Frame at which the lid blows off. The bin swells for `bulgeFrames` before it. */
  burstAt?: number;
  bulgeFrames?: number;
  label?: string;
}

export const RecycleBin: React.FC<RecycleBinProps> = ({ frame, burstAt, bulgeFrames = 16, label = 'Recycle Bin', ...box }) => {
  const swell = burstAt === undefined ? 0 : easeIn(prog(frame, burstAt - bulgeFrames, bulgeFrames));
  const burst = burstAt !== undefined && frame >= burstAt;
  const bt = burst ? frame - (burstAt as number) : 0;
  const scale = burst ? lerp(1.28, 1, easeOut(prog(bt, 0, 4))) : 1 + 0.28 * swell;
  const shake = burst ? 0 : swell * 5 * hashNoise(frame, 17);
  const lidT = burst ? bt : 0;
  return (
    <Scaled {...box} designW={200} designH={270} transform={`translateX(${shake}px) scale(${scale})`} origin="50% 70%">
      <svg width={200} height={270} viewBox="0 0 200 270" style={{ overflow: 'visible' }}>
        <path d="M44 86 H156 L144 206 Q143 220 129 220 H71 Q57 220 56 206 Z" fill={C.white} stroke={C.dark} strokeWidth={LINE + 2} strokeLinejoin="round" />
        {[84, 100, 116].map((x) => (
          <line key={x} x1={x} y1={110} x2={x - 2 + (x - 100) * 0.1} y2={196} stroke={C.mid} strokeWidth={6} strokeLinecap="round" />
        ))}
        <g transform={`translate(0 ${-lidT * 22 + lidT * lidT * 0.5}) rotate(${lidT * 7} 100 76)`} opacity={burst ? Math.max(0, 1 - bt / 22) : 1}>
          <rect x={34} y={66} width={132} height={22} rx={10} fill={C.white} stroke={C.dark} strokeWidth={LINE + 2} />
          <rect x={80} y={52} width={40} height={16} rx={7} fill={C.white} stroke={C.dark} strokeWidth={LINE + 2} />
        </g>
        <text x={100} y={262} textAnchor="middle" fontFamily="'UiInter', sans-serif" fontSize={28} fontWeight={600} fill={C.ink}>
          {label}
        </text>
      </svg>
    </Scaled>
  );
};

export interface DesktopProps extends BoxProps {
  frame: number;
  burstAt?: number;
  children?: React.ReactNode;
}

const DW = 1600;
const DH = 900;
const ICONS = ['Docs', 'Art', 'Builds'];

/** Flat OS desktop (design 1600x900): icons, taskbar, Recycle Bin bottom right. Children draw above the wallpaper. */
export const Desktop: React.FC<DesktopProps> = ({ frame, burstAt, children, ...box }) => (
  <Scaled {...box} designW={DW} designH={DH}>
    <div style={{ position: 'relative', width: DW, height: DH, background: C.mid, overflow: 'hidden' }}>
      {ICONS.map((name, i) => (
        <div key={name} style={{ position: 'absolute', left: 70, top: 60 + i * 190, width: 130, textAlign: 'center', fontSize: 28, fontWeight: 600, color: C.ink }}>
          <div style={{ width: 110, height: 92, margin: '0 auto 12px', borderRadius: 14, background: C.white, border: `${LINE + 1}px solid ${C.dark}`, boxSizing: 'border-box' }}>
            <div style={{ width: 46, height: 14, marginTop: -14, borderRadius: '8px 8px 0 0', background: C.white, border: `${LINE + 1}px solid ${C.dark}`, borderBottom: 'none', boxSizing: 'border-box' }} />
          </div>
          {name}
        </div>
      ))}
      <RecycleBin frame={frame} burstAt={burstAt} width={200} x={1330} y={500} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 72, background: C.white, borderTop: `${LINE}px solid ${C.dark}`, display: 'flex', alignItems: 'center', padding: '0 28px', gap: 18 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.blue }} />
        <div style={{ width: 220, height: 40, borderRadius: 10, background: C.bg, border: `${LINE}px solid ${C.mid}`, boxSizing: 'border-box' }} />
      </div>
      {children}
    </div>
  </Scaled>
);

export interface WindowStackProps extends BoxProps {
  frame: number;
  count?: number;
  /** Frame at which the back window appears; each next one follows `stagger` frames later. */
  popAt: number;
  stagger?: number;
}

const WW = 1100;
const WH = 700;

/** Browser windows layered in depth; the front window is the most opaque and largest. */
export const WindowStack: React.FC<WindowStackProps> = ({ frame, count = 5, popAt, stagger = 3, ...box }) => (
  <Scaled {...box} designW={WW} designH={WH}>
    <div style={{ position: 'relative', width: WW, height: WH }}>
      {Array.from({ length: count }, (_, i) => {
        const a = easeOut(prog(frame, popAt + i * stagger, 5));
        if (a <= 0) return null;
        const depth = count - 1 - i;
        const sc = 1 - depth * 0.05;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: i * 58,
              top: i * 34,
              width: 700,
              height: 440,
              boxSizing: 'border-box',
              borderRadius: 16,
              background: C.white,
              border: `${LINE}px solid ${C.dark}`,
              overflow: 'hidden',
              opacity: a,
              transform: `scale(${lerp(0.9, 1, a) * sc})`,
              transformOrigin: 'top left',
            }}
          >
            <div style={{ height: 50, background: C.bg, borderBottom: `${LINE}px solid ${C.dark}`, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px' }}>
              {[0, 1, 2].map((d) => (
                <div key={d} style={{ width: 13, height: 13, borderRadius: 7, border: `${LINE}px solid ${C.dark}`, background: C.white, boxSizing: 'border-box' }} />
              ))}
              <div style={{ marginLeft: 14, flex: 1, height: 26, borderRadius: 13, background: C.white, border: `${LINE}px solid ${C.mid}`, boxSizing: 'border-box' }} />
            </div>
            <div style={{ margin: '28px 34px 0', height: 22, width: 360, borderRadius: 11, background: C.mid }} />
            <div style={{ margin: '20px 34px 0', height: 16, width: 520, borderRadius: 8, background: C.bg }} />
            <div style={{ margin: '14px 34px 0', height: 16, width: 440, borderRadius: 8, background: C.bg }} />
            <div style={{ margin: '30px 34px 0', height: 120, borderRadius: 12, background: i % 2 === 0 ? C.bg : C.mid }} />
          </div>
        );
      })}
    </div>
  </Scaled>
);

export interface MonitorProps extends BoxProps {
  /** Screen content, drawn in a 1200 x 675 design box. */
  children?: React.ReactNode;
  /** Screen colour when no children cover it. */
  screen?: string;
}

export const MONITOR_SCREEN = { w: 1200, h: 675 } as const;

/** Flat office monitor: bezel, 16:9 screen, neck and foot. */
export const Monitor: React.FC<MonitorProps> = ({ children, screen = C.white, ...box }) => (
  <Scaled {...box} designW={1280} designH={900}>
    <div style={{ position: 'relative', width: 1280, height: 900 }}>
      <div style={{ position: 'absolute', left: 570, top: 740, width: 140, height: 110, background: C.mid, border: `${LINE}px solid ${C.dark}`, boxSizing: 'border-box' }} />
      <div style={{ position: 'absolute', left: 440, top: 836, width: 400, height: 36, borderRadius: 18, background: C.mid, border: `${LINE}px solid ${C.dark}`, boxSizing: 'border-box' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1280, height: 755, borderRadius: 34, background: C.bg, border: `${LINE + 1}px solid ${C.dark}`, boxSizing: 'border-box' }} />
      <div style={{ position: 'absolute', left: 40, top: 40, width: 1200, height: 675, borderRadius: 8, background: screen, border: `${LINE}px solid ${C.dark}`, boxSizing: 'border-box', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  </Scaled>
);
