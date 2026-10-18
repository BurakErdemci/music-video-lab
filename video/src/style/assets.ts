import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import { ALL_POSES, POSES, type PoseId } from '../characters/poses.ts';

export const poseUrl = (id: PoseId, ters: boolean): string => staticFile(`poses/${POSES[id].file}${ters ? '-ters' : ''}.png`);
export const PLATE = {
  key: staticFile('plates/room-key.png'),
  moon: staticFile('plates/room-moon.png'),
  notes: staticFile('plates/room-notes.png'),
};

// SVG <image> does not make Remotion wait: decode everything before the first frame (same as fonts.ts).
const urls = [...ALL_POSES.flatMap((id) => [poseUrl(id, false), poseUrl(id, true)]), ...Object.values(PLATE)];
const handle = delayRender('pose and plate images');
Promise.all(
  urls.map(async (u) => {
    const img = new Image();
    img.src = u;
    await img.decode();
  }),
)
  .then(() => continueRender(handle))
  .catch((e: unknown) => cancelRender(e));
