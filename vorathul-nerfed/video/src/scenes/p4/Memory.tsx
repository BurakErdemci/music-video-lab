// S76: the memory of his glory fills the frame, then the camera pulls back and it is a monitor in the office.
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { UiFonts, C } from '../../ui/kit.ts';
import { DuotoneFlash, GOLD, IVORY, ImpactBurst, StickerCutout, gradeCues } from '../../vfx/effects.ts';
import { CUE } from './cues.ts';
import { H, W, easeInOut, easeOut, mix, prog, twos } from './lib.ts';

const MEMORY_PLATE = 'plates/06-dovus-faz3.jpg';
const OFFICE_PLATE = 'assets/office-plate.png';
const WORKER = 'assets/G38-2.png';

/**
 * The cheering worker (G38-2, 454 x 576 px) at layout scale 1.75, centred. His monitor's screen is where the memory plays:
 * panel box (image px) x 240-392, y 155-240, a 16:9 window inside the drawn screen, right of the raised arm.
 */
const IMG_S = 1.75;
const IMG = { w: 454, h: 576, x: (W - 454 * IMG_S) / 2, y: (H - 576 * IMG_S) / 2 };
const PANEL_IMG = { x: 240, y: 155, w: 152, h: (152 * 9) / 16 };
const PANEL = { x: IMG.x + PANEL_IMG.x * IMG_S, y: IMG.y + PANEL_IMG.y * IMG_S, w: PANEL_IMG.w * IMG_S, h: PANEL_IMG.h * IMG_S };
const PANEL_C: [number, number] = [PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h / 2];
const Z0 = W / PANEL.w;

const OUTLINE = 'drop-shadow(2px 0 0 #495057) drop-shadow(-2px 0 0 #495057) drop-shadow(0 2px 0 #495057) drop-shadow(0 -2px 0 #495057)';

/** Camera: the panel exactly fills the frame, then the zoom pulls out to the whole desk between the second "finally" and the arms. */
const camTransform = (frame: number): string => {
  const u = easeInOut(prog(frame, CUE.s76pull.frame, CUE.s76arms.frame - CUE.s76pull.frame));
  const z = mix(Z0, 1, u);
  return `translate(${(1 - u) * (W / 2 - Z0 * PANEL_C[0])}px, ${(1 - u) * (H / 2 - Z0 * PANEL_C[1])}px) scale(${z})`;
};

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

/** S76 03:02.13: memory panel full frame, push in; on the second "finally" the camera pulls back: it is a monitor, and the worker at it cheers. */
export const S76 = ({ frame }: { frame: number }) => {
  const world = camTransform(frame);
  const f = twos(frame);
  const cheer = f > CUE.s76arms.frame ? Math.sin((f - CUE.s76arms.frame) * 0.7) * 9 * Math.max(0, 1 - (f - CUE.s76arms.frame) / 24) : 0;
  return (
    <AbsoluteFill style={{ background: IVORY }}>
      <UiFonts />
      {/* the office behind: the empty office plate, blurred, in the office grade */}
      <DuotoneFlash frame={frame} cues={O_GRADE} id="s76-office">
        <AbsoluteFill style={{ background: C.bg }}>
          <div style={{ position: 'absolute', inset: 0, transform: world, transformOrigin: '0 0' }}>
            <Img src={staticFile(OFFICE_PLATE)} style={{ position: 'absolute', left: -160, top: -230, width: 2240, height: 1493, filter: 'blur(20px)' }} />
          </div>
        </AbsoluteFill>
      </DuotoneFlash>
      <div style={{ position: 'absolute', inset: 0, transform: world, transformOrigin: '0 0' }}>
        <div style={{ position: 'absolute', left: IMG.x, top: IMG.y + cheer, width: IMG.w * IMG_S, height: IMG.h * IMG_S }}>
          <Img src={staticFile(WORKER)} style={{ width: '100%', height: '100%', filter: OUTLINE }} />
          {/* the memory on his screen */}
          <div style={{ position: 'absolute', left: PANEL_IMG.x * IMG_S, top: PANEL_IMG.y * IMG_S, width: PANEL.w, height: PANEL.h, overflow: 'hidden' }}>
            <div style={{ width: W, height: H, transform: `scale(${PANEL.w / W})`, transformOrigin: '0 0' }}>
              <MemoryPanel frame={frame} />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
