import React from 'react';
import { AbsoluteFill, Composition, Img, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Cursor } from './Cursor.tsx';
import { HealthBar } from './HealthBar.tsx';
import { MissingTexture } from './MissingTexture.tsx';
import { PatchNotesCard } from './PatchNotesCard.tsx';
import { ProgressSun } from './ProgressSun.tsx';
import { RevertDialog } from './RevertDialog.tsx';
import { SkipButton } from './SkipButton.tsx';
import { StickyNote } from './StickyNote.tsx';
import { C, UI_FONT, UiFonts } from './theme.tsx';
import { TypingText } from './TypingText.tsx';
import { VolumeSlider } from './VolumeSlider.tsx';

const Caption: React.FC<{ children: string }> = ({ children }) => (
  <div style={{ position: 'absolute', left: 60, top: 36, fontFamily: UI_FONT, fontSize: 26, fontWeight: 600, color: C.slate, letterSpacing: 1 }}>
    {children}
  </div>
);

const WING =
  'M20 200 L60 150 L40 120 L110 120 L90 80 L170 90 L170 30 L250 70 L280 10 L330 60 L400 40 L410 110 L470 120 L440 170 L500 200 L450 230 L470 290 L390 270 L370 340 L300 300 L260 370 L200 310 L130 330 L120 260 L50 260 Z';

const PageOne: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption>PatchNotesCard / HealthBar (drag + ghost) / StickyNote</Caption>
      <PatchNotesCard
        frame={frame}
        x={100}
        y={150}
        width={780}
        title="Patch 2.3"
        enterAt={0}
        lines={[
          { text: 'Boss health reduced by 40%', appearAt: 14, strikeAt: 82 },
          { text: 'Meteor Rain: removed', appearAt: 28 },
          { text: 'Phase 3: removed', appearAt: 42 },
          { text: 'Minor quality-of-life fixes', appearAt: 56 },
        ]}
      />
      <HealthBar frame={frame} x={1000} y={170} width={800} label="VORATHUL" from={100} to={60} startFrame={20} durationFrames={50} drag />
      <StickyNote frame={frame} x={1280} y={470} width={340} text="Phase 3: cut it" slapAt={64} rotate={-4} />
    </AbsoluteFill>
  );
};

const PageTwo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption>Cursor (arrow, clicks, grab) / SkipButton / VolumeSlider</Caption>
      <div style={{ position: 'absolute', left: 100, top: 150, width: 760, height: 330, borderRadius: 18, background: C.white, border: `2px solid ${C.dark}` }}>
        <Cursor
          frame={frame}
          size={2.2}
          path={[
            { f: 4, x: 90, y: 250 },
            { f: 34, x: 330, y: 90 },
            { f: 70, x: 540, y: 190 },
            { f: 100, x: 380, y: 240 },
          ]}
          clicks={[34, 70]}
          grabRange={[76, 100]}
        />
      </div>
      <div style={{ position: 'absolute', left: 960, top: 150, width: 860, height: 484, borderRadius: 18, background: C.mid, border: `2px solid ${C.dark}`, overflow: 'hidden' }}>
        <SkipButton frame={frame} appearAt={10} hoverAt={46} pressAt={74} width={250} margin={36} />
        <Cursor frame={frame} size={1.6} path={[{ f: 30, x: 300, y: 120 }, { f: 52, x: 660, y: 410 }, { f: 74, x: 700, y: 420 }]} clicks={[74]} />
      </div>
      <VolumeSlider frame={frame} x={100} y={600} width={760} from={80} to={0} startFrame={14} durationFrames={46} mutedAt={64} />
      <VolumeSlider frame={frame} x={100} y={750} width={760} from={90} to={20} startFrame={14} durationFrames={60} />
    </AbsoluteFill>
  );
};

const PageThree: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption>RevertDialog (trembling hand) / ProgressSun office / MissingTexture</Caption>
      <RevertDialog frame={frame} x={80} y={200} width={900} enterAt={4} approachAt={10} pressAt={88} tremble seed={9} closeAfter={14} />
      <ProgressSun frame={frame} variant="office" x={1060} y={130} width={760} from={5} to={100} startFrame={6} durationFrames={100} />
      <MissingTexture x={1080} y={640} width={520} height={380} viewBox="0 0 520 380" d={WING} cell={18} />
    </AbsoluteFill>
  );
};

const PageFour: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption>TypingText (cut off) / ProgressSun comic variant over the approved style frame</Caption>
      <TypingText frame={frame} x={60} y={260} width={840} text="Patch 2.6 notes:" startFrame={6} framesPerChar={3} cutAtFrame={82} />
      <div style={{ position: 'absolute', left: 940, top: 140, width: 900, height: 600, overflow: 'hidden', border: `2px solid ${C.dark}`, borderRadius: 6 }}>
        <Img src={staticFile('01-tarz-cizgi-roman.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <ProgressSun frame={frame} variant="comic" x={60} y={150} width={780} from={4} to={100} startFrame={6} durationFrames={70} />
      </div>
    </AbsoluteFill>
  );
};

export const UiKitGallery: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <UiFonts />
    <Sequence from={0} durationInFrames={120}><PageOne /></Sequence>
    <Sequence from={120} durationInFrames={120}><PageTwo /></Sequence>
    <Sequence from={240} durationInFrames={120}><PageThree /></Sequence>
    <Sequence from={360} durationInFrames={90}><PageFour /></Sequence>
  </AbsoluteFill>
);

export const UiRoot: React.FC = () => (
  <Composition id="UiKitGallery" component={UiKitGallery} durationInFrames={450} fps={30} width={1920} height={1080} />
);
