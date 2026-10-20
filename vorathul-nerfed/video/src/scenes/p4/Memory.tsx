// S76: the memory of his glory fills the frame, then the camera pulls back and it is a monitor in the office.
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { UiFonts, C, Monitor } from '../../ui/kit.ts';
import { DuotoneFlash, GOLD, IVORY, ImpactBurst, StickerCutout, gradeCues } from '../../vfx/effects.ts';
import { CUE } from './cues.ts';
import { Playtester } from './People.tsx';
import { H, W, easeInOut, easeOut, mix, prog, twos } from './lib.ts';

const MEMORY_PLATE = 'plates/06-dovus-faz3.jpg';
const OFFICE_PLATE = 'plates/07-ofis-tablo.jpg';

/** Final layout (zoom 1): the monitor screen is 994 x 559 centred on x 960, its centre on y 442.5. */
const SCREEN = { x: 463, y: 163, w: 993.75, h: 559 };
const SCREEN_C: [number, number] = [SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h / 2];
const Z0 = W / SCREEN.w;

/** Camera zoom: starts with the screen exactly filling the frame; pulls back to 1 between the second "finally" and the arms. */
const zoomAt = (frame: number): number => {
  const t = easeInOut(prog(frame, CUE.s76pull.frame, CUE.s76arms.frame - CUE.s76pull.frame));
  return mix(Z0, 1, t);
};
const camTransform = (z: number): string => `translate(${W / 2}px, ${H / 2}px) scale(${z}) translate(${-SCREEN_C[0]}px, ${-SCREEN_C[1]}px)`;

const O_GRADE = gradeCues([{ at: { frame: CUE.s76cut.frame }, grade: 'O' }], 'S76 office grade');
const MEMORY_GRADE = gradeCues([{ at: { frame: CUE.s76cut.frame }, grade: 'MEMORY' }], 'S76 memory grade');

/** The memory still in 1920 x 1080 panel coordinates: ivory ground, torn sticker panel, soft ivory/sky duotone, slow push. */
const MemoryPanel = ({ frame }: { frame: number }) => {
  const f = twos(frame);
  const push =
    1 + 0.03 * prog(f, CUE.s76cut.frame, 100) + 0.04 * easeOut(prog(f, CUE.s76push.frame, 24)) + 0.05 * easeOut(prog(f, CUE.s76push2.frame, 24));
  const sword = f - CUE.s76sword.frame;
  const shout = f - CUE.s76shout.frame;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, background: IVORY, overflow: 'hidden' }}>
      <StickerCutout frame={f} seed={5} border={20} shadow={10} id="s76-sticker">
        <DuotoneFlash frame={frame} cues={MEMORY_GRADE} id="s76-memory">
          <div style={{ position: 'absolute', left: 96, top: 60, width: W - 192, height: H - 120, overflow: 'hidden' }}>
            <Img src={staticFile(MEMORY_PLATE)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${push})`, transformOrigin: '62% 22%' }} />
          </div>
        </DuotoneFlash>
      </StickerCutout>
      {/* the hero raises the sword on the first "finally", shouts on "beat" */}
      {sword >= 0 && sword < 16 ? (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <g transform="translate(1160 160)" opacity={1 - sword / 16}>
            <path d={`M0 ${-70 - sword * 2} L12 -12 L${70 + sword * 3} 0 L12 12 L0 ${70 + sword * 2} L-12 12 L${-70 - sword * 3} 0 L-12 -12 Z`} fill="#fff" stroke={GOLD} strokeWidth={5} />
          </g>
        </svg>
      ) : null}
      {shout >= 0 ? <ImpactBurst frame={shout} duration={12} seed={76} x={1440} y={240} size={220} flash={0} /> : null}
    </div>
  );
};

/** S76 03:02.13: memory panel full frame, push in; on the second "finally" the camera pulls back: it is a monitor, a playtester cheers. */
export const S76 = ({ frame }: { frame: number }) => {
  const z = zoomAt(frame);
  const world = camTransform(z);
  const panelPx = SCREEN.w / W;
  return (
    <AbsoluteFill style={{ background: IVORY }}>
      <UiFonts />
      {/* office: blurred plate, desk and the monitor body, in the office grade */}
      <DuotoneFlash frame={frame} cues={O_GRADE} id="s76-office">
        <AbsoluteFill style={{ background: C.bg }}>
          <div style={{ position: 'absolute', inset: 0, transform: world, transformOrigin: '0 0' }}>
            <Img src={staticFile(OFFICE_PLATE)} style={{ position: 'absolute', left: -160, top: -230, width: 2240, height: 1493, filter: 'blur(20px)' }} />
            <div style={{ position: 'absolute', left: -200, top: 770, width: 2320, height: 700, background: C.white, borderTop: `5px solid ${C.dark}` }} />
            <Monitor x={430} y={130} width={1060} screen={C.black} />
          </div>
        </AbsoluteFill>
      </DuotoneFlash>
      {/* the memory on the screen */}
      <div style={{ position: 'absolute', inset: 0, transform: world, transformOrigin: '0 0' }}>
        <div style={{ position: 'absolute', left: SCREEN.x, top: SCREEN.y, width: SCREEN.w, height: SCREEN.h, overflow: 'hidden', borderRadius: 6 }}>
          <div style={{ width: W, height: H, transform: `scale(${panelPx})`, transformOrigin: '0 0' }}>
            <MemoryPanel frame={frame} />
          </div>
        </div>
      </div>
      {/* G38 stand-in, in front of everything */}
      <DuotoneFlash frame={frame} cues={O_GRADE} id="s76-person">
        <div style={{ position: 'absolute', inset: 0, transform: world, transformOrigin: '0 0' }}>
          <Playtester frame={frame} armsUpAt={CUE.s76arms.frame} x={640} y={330} width={760} />
        </div>
      </DuotoneFlash>
    </AbsoluteFill>
  );
};
