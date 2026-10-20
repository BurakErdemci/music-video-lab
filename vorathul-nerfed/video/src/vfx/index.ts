// Separate Remotion entry for the VFX gallery:
//   npx remotion render src/vfx/index.ts VfxGallery out/vfx-gallery.mp4 --gl=angle --concurrency=4
import { createElement } from 'react';
import { Composition, registerRoot } from 'remotion';
import { GALLERY_FRAMES, VfxGallery } from './Gallery.tsx';

const GalleryRoot = () =>
  createElement(Composition, { id: 'VfxGallery', component: VfxGallery, durationInFrames: GALLERY_FRAMES, fps: 30, width: 1920, height: 1080 });

registerRoot(GalleryRoot);
