// Separate Remotion entry for the camera gallery:
//   npx remotion render src/camera/index.ts CameraGallery out/camera-gallery.mp4 --gl=angle --concurrency=4
import { createElement } from 'react';
import { Composition, registerRoot } from 'remotion';
import { CameraGallery, GALLERY_FRAMES } from './Gallery.tsx';

const GalleryRoot = () =>
  createElement(Composition, { id: 'CameraGallery', component: CameraGallery, durationInFrames: GALLERY_FRAMES, fps: 30, width: 1920, height: 1080 });

registerRoot(GalleryRoot);
