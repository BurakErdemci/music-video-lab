import { AbsoluteFill, Audio, Composition, staticFile } from 'remotion';
import { Film } from './Film.tsx';
import { Lab, LAB_FRAMES } from './lab/Lab.tsx';
import { LOGO_FRAMES, LogoBoard } from './lab/LogoBoard.tsx';
import { TRANS_LAB_FRAMES, TransLab } from './transitions/scene/TransLab.tsx';
import { KIT_LAB_FRAMES, KitLab } from './worlds/kit/KitLab.tsx';
import { V1_LAB_FRAMES, V1Lab } from './worlds/v1Lab.tsx';
import { V2_LAB_FRAMES, V2Lab } from './worlds/v2Lab.tsx';
import { GROOVE_LAB_FRAMES, GrooveLab } from './worlds/grooveLab.tsx';
import { V3_LAB_FRAMES, V3Lab } from './worlds/v3Lab.tsx';
import { V4_LAB_FRAMES, V4Lab } from './worlds/v4Lab.tsx';
import { DURATION_FRAMES, FPS } from './timing.ts';

const W = 1920;
const H = 1080;
const SMOKE_FRAMES = 240;

const Video = () => (
  <AbsoluteFill>
    <Film />
    <Audio src={staticFile('audio/merge-conflict-v4.wav')} />
  </AbsoluteFill>
);

export const Root = () => (
  <>
    <Composition id="MC60" component={Video} durationInFrames={DURATION_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Smoke" component={Video} durationInFrames={SMOKE_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Lab" component={Lab} durationInFrames={LAB_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="LogoBoard" component={LogoBoard} durationInFrames={LOGO_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="TransLab" component={TransLab} durationInFrames={TRANS_LAB_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="KitLab" component={KitLab} durationInFrames={KIT_LAB_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="V1Lab" component={V1Lab} durationInFrames={V1_LAB_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="V2Lab" component={V2Lab} durationInFrames={V2_LAB_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="GrooveLab" component={GrooveLab} durationInFrames={GROOVE_LAB_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="V3Lab" component={V3Lab} durationInFrames={V3_LAB_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="V4Lab" component={V4Lab} durationInFrames={V4_LAB_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
