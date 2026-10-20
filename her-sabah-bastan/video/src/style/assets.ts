import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import { ALL_POSES, POSES, type PoseId } from '../characters/poses.ts';
import { STRIP_TABLE } from '../characters/actor.ts';
import type { StripFrame, StripMeta } from '../characters/stripData.ts';

export const poseUrl = (id: PoseId, ters: boolean): string => staticFile(`poses/${POSES[id].file}${ters ? '-ters' : ''}.png`);
/** One key pose image of a strip (or of an old pose used as a one-frame strip). */
export const stripUrl = (meta: StripMeta, f: StripFrame): string => staticFile(`${meta.dir}/${f.file}`);
/** The zoom intro: the frontal AI and the monitor plate with the transparent screen hole. */
export const INTRO_ART = {
  ai: staticFile('poses/a10-onden.png'),
  monitor: staticFile('plates/monitor-levha.png'),
};
/** Props for the AI's side (navy notebook with cream edges reads on the cream room). */
export const PROPS = {
  notebookClosed: staticFile('props/p01-defter-kapali.png'),
  notebookOpen: staticFile('props/p02-defter-acik.png'),
};
export const PLATE = {
  key: staticFile('plates/room-key.png'),
  moon: staticFile('plates/room-moon.png'),
  notes: staticFile('plates/room-notes.png'),
};

// SVG <image> does not make Remotion wait: decode everything before the first frame (same as fonts.ts).
const urls = [...ALL_POSES.flatMap((id) => [poseUrl(id, false), poseUrl(id, true)]), ...Object.values(STRIP_TABLE).flatMap((m) => m.frames.map((f) => stripUrl(m, f))), ...Object.values(PLATE), ...Object.values(INTRO_ART), ...Object.values(PROPS)];
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
