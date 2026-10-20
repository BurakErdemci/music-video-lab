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
import { dryBrushOutline } from '../vfx/effects.ts';
import { BossNameplate } from './BossNameplate.tsx';
import { ForumCard, Poster } from './Cards.tsx';
import { Marquee, Padlock, Toggle } from './Controls.tsx';
import { Desktop, Monitor, WindowStack } from './Desktop.tsx';
import { DamageNumber, Nameplate, TicketPill } from './Labels.tsx';
import { RubberStamp } from './RubberStamp.tsx';
import { C, UI_FONT, UiFonts } from './theme.tsx';
import { VideoTimeline } from './VideoTimeline.tsx';
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
        x={60}
        y={230}
        width={960}
        title="Patch 2.3"
        enterAt={0}
        lines={[
          { text: 'Boss health reduced by 40%', appearAt: 14, strikeAt: 82 },
          { text: 'Meteor Rain: removed', appearAt: 28 },
          { text: 'Phase 3: removed', appearAt: 42 },
          { text: 'Minor quality-of-life fixes', appearAt: 56 },
        ]}
      />
      <HealthBar frame={frame} x={1080} y={250} width={780} label="VORATHUL" from={100} to={60} startFrame={20} durationFrames={50} drag />
      <StickyNote frame={frame} x={1330} y={520} width={420} text="Phase 3: cut it" slapAt={64} rotate={-4} />
    </AbsoluteFill>
  );
};

const PageTwo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption>Cursor (arrow, clicks, grab) / SkipButton / VolumeSlider</Caption>
      <div style={{ position: 'absolute', left: 60, top: 150, width: 860, height: 420, borderRadius: 18, background: C.white, border: `2px solid ${C.dark}` }}>
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
      <div style={{ position: 'absolute', left: 960, top: 150, width: 900, height: 506, borderRadius: 18, background: C.mid, border: `2px solid ${C.dark}`, overflow: 'hidden' }}>
        <SkipButton frame={frame} appearAt={10} hoverAt={46} pressAt={74} width={250} margin={36} />
        <Cursor frame={frame} size={1.6} path={[{ f: 30, x: 300, y: 120 }, { f: 52, x: 660, y: 410 }, { f: 74, x: 700, y: 420 }]} clicks={[74]} />
      </div>
      <VolumeSlider frame={frame} x={60} y={620} width={860} from={80} to={0} startFrame={14} durationFrames={46} mutedAt={64} />
      <VolumeSlider frame={frame} x={60} y={790} width={860} from={90} to={20} startFrame={14} durationFrames={60} />
    </AbsoluteFill>
  );
};

const PageThree: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption>RevertDialog (trembling hand) / ProgressSun office / MissingTexture</Caption>
      <RevertDialog frame={frame} x={50} y={300} width={960} enterAt={4} approachAt={10} pressAt={88} tremble seed={9} closeAfter={14} />
      <ProgressSun frame={frame} variant="office" x={1060} y={120} width={820} from={5} to={100} startFrame={6} durationFrames={100} />
      <MissingTexture x={1100} y={600} width={560} height={410} viewBox="0 0 520 380" d={WING} cell={18} />
    </AbsoluteFill>
  );
};

const PageFour: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption>TypingText (cut off) / ProgressSun comic variant over the approved style frame</Caption>
      <TypingText frame={frame} x={40} y={330} width={840} text="Patch 2.6 notes:" startFrame={6} framesPerChar={3} cutAtFrame={82} />
      <div style={{ position: 'absolute', left: 900, top: 200, width: 960, height: 640, overflow: 'hidden', border: `2px solid ${C.dark}`, borderRadius: 6 }}>
        <Img src={staticFile('01-tarz-cizgi-roman.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <ProgressSun frame={frame} variant="comic" renderOutline={dryBrushOutline({ taper: 0.3 })} x={50} y={0} width={860} from={4} to={100} startFrame={6} durationFrames={70} />
      </div>
    </AbsoluteFill>
  );
};

const PageFive: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption>RubberStamp (tear) / Nameplate / DamageNumber / TicketPill / Toggle / Padlock / Marquee</Caption>
      <RubberStamp frame={frame} x={70} y={170} width={640} at={8} tearAt={92} rotate={-8} />
      <Nameplate frame={frame} x={80} y={470} width={340} text="LV 12" appearAt={10} />
      <DamageNumber frame={frame} x={560} y={540} text="-1" at={30} color={C.ink} />
      <DamageNumber frame={frame} x={680} y={540} text="-1" at={42} color={C.ink} />
      <DamageNumber frame={frame} x={840} y={540} text="MISS" at={56} size={84} />
      <TicketPill frame={frame} x={80} y={640} width={230} text="#47" appearAt={24} />
      <TicketPill frame={frame} x={340} y={640} width={230} text="#48" appearAt={32} />
      <TicketPill frame={frame} x={600} y={640} width={230} text="#49" appearAt={40} />
      <Toggle frame={frame} x={900} y={170} width={640} flipAt={64} />
      <Padlock frame={frame} x={1640} y={150} width={150} appearAt={14} clampAt={46} />
      <div style={{ position: 'absolute', left: 900, top: 340, width: 940, height: 640, borderRadius: 18, background: C.white, border: `2px solid ${C.dark}` }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ position: 'absolute', left: 60 + (i % 3) * 280, top: 70 + Math.floor(i / 3) * 280, width: 200, height: 200, borderRadius: 16, background: C.bg, border: `2px solid ${C.mid}` }} />
        ))}
        <Marquee frame={frame} from={{ x: 30, y: 30, w: 10, h: 10 }} to={{ x: 30, y: 30, w: 600, h: 520 }} startFrame={20} durationFrames={40} stroke={5} />
      </div>
    </AbsoluteFill>
  );
};

const PageSix: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption>ForumCard / Poster</Caption>
      <ForumCard frame={frame} x={60} y={160} width={760} popAt={6} title="bring back phase 3" votes={214} replies={38} rotate={-1} />
      <ForumCard frame={frame} x={60} y={450} width={760} popAt={18} title="boss is a tutorial now 2/10" votes={873} replies={120} rotate={1} author="gamer_77" />
      <ForumCard frame={frame} x={60} y={740} width={760} popAt={30} title="#UnnerfVorathul" votes={1500} replies={402} rotate={-1} author="mod_team" />
      <Poster frame={frame} x={940} y={190} width={400} popAt={14} lines={['WE WANT', 'VORATHUL']} rotate={-3} />
      <Poster frame={frame} x={1400} y={260} width={400} popAt={26} lines={['UNNERF', 'PHASE 3']} rotate={3} />
    </AbsoluteFill>
  );
};

const PageSeven: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption>VideoTimeline (x16, hold to skip) / Desktop + RecycleBin / WindowStack</Caption>
      <VideoTimeline frame={frame} x={60} y={130} width={1800} progressTo={1} startFrame={6} durationFrames={90} ffAt={30} holdAt={60} holdFrames={30} />
      <Desktop frame={frame} x={60} y={330} width={880} burstAt={86} />
      <WindowStack frame={frame} x={1000} y={340} width={860} popAt={8} />
    </AbsoluteFill>
  );
};

const PageEight: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption>Monitor (his eye fills it) + RevertDialog / system dialog / BossNameplate</Caption>
      <Monitor x={60} y={100} width={1000} screen={C.black}>
        <div style={{ position: 'absolute', left: -40, top: 250, width: 1280, height: 170, borderRadius: '50%', background: '#9B5CE0' }} />
        <RevertDialog frame={frame} x={300} y={200} width={600} enterAt={4} approachAt={10} pressAt={70} tremble seed={4} />
      </Monitor>
      <RevertDialog
        frame={frame}
        x={1100}
        y={260}
        width={720}
        enterAt={10}
        approachAt={20}
        pressAt={74}
        title="Unsaved changes"
        body="Are you sure?"
        confirmLabel="Discard"
        cancelLabel="Stay"
      />
      <BossNameplate frame={frame} x={0} y={830} slamAt={30} outAt={80} />
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
    <Sequence from={450} durationInFrames={120}><PageFive /></Sequence>
    <Sequence from={570} durationInFrames={120}><PageSix /></Sequence>
    <Sequence from={690} durationInFrames={120}><PageSeven /></Sequence>
    <Sequence from={810} durationInFrames={90}><PageEight /></Sequence>
  </AbsoluteFill>
);

export const UiRoot: React.FC = () => (
  <Composition id="UiKitGallery" component={UiKitGallery} durationInFrames={900} fps={30} width={1920} height={1080} />
);
