import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

export const STAMP_FONT = 'Anton Stamp';
export const TEXT_FONT = 'Plex Mono Quiet';

const faces = [
  new FontFace(STAMP_FONT, `url(${staticFile('fonts/Anton-Regular.ttf')})`, { weight: '400' }),
  new FontFace(TEXT_FONT, `url(${staticFile('fonts/IBMPlexMono-Regular.ttf')})`, { weight: '400' }),
  new FontFace(TEXT_FONT, `url(${staticFile('fonts/IBMPlexMono-Medium.ttf')})`, { weight: '500' }),
];

const handle = delayRender('fonts');
Promise.all(faces.map((f) => f.load()))
  .then((loaded) => {
    loaded.forEach((f) => document.fonts.add(f));
    continueRender(handle);
  })
  .catch((e: unknown) => cancelRender(e));
