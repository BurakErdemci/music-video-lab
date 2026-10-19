import { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { getImage } from '../transitions/layers.ts';
import { D0 } from './types.ts';
import type { Cam, CanvasSource, Layer } from './types.ts';
import { pivotOf } from './compose2d.ts';
import { paintSource } from './sources.ts';

const W = 1920;
const H = 1080;
const FOV = (2 * Math.atan(H / 2 / D0) * 180) / Math.PI;

interface Entry {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  tex: THREE.Texture;
  /** Image url or canvas key the texture was made from. */
  srcId: string;
}

// Plain bilinear, no mipmaps: measured closer to the 2D canvas 'high' resampling when a texture is minified
// (desk crop mean abs diff 3.2 vs 4.9 with trilinear mipmaps).
const setFilter = (t: THREE.Texture): void => {
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
};

const imageTextures = new Map<string, THREE.Texture>();
const imageTexture = (url: string): THREE.Texture => {
  let t = imageTextures.get(url);
  if (!t) {
    t = new THREE.Texture(getImage(url));
    t.colorSpace = THREE.SRGBColorSpace;
    setFilter(t);
    t.needsUpdate = true;
    imageTextures.set(url, t);
  }
  return t;
};

const canvasTexture = (src: CanvasSource, frame: number): THREE.CanvasTexture => {
  const t = new THREE.CanvasTexture(paintSource(src, frame).canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  setFilter(t);
  return t;
};

const Sync = ({ layers, cam, frame }: { layers: readonly Layer[]; cam: Cam; frame: number }) => {
  const { camera, scene } = useThree();
  const entries = useMemo(() => new Map<string, Entry>(), []);

  // Runs on every render, in the same commit as (and before) ManualFrameRenderer's advance() effect.
  useLayoutEffect(() => {
    const cm = camera as THREE.PerspectiveCamera;
    cm.fov = FOV;
    cm.aspect = W / H;
    cm.near = 1;
    cm.far = 20000;
    cm.position.set(cam.x, -cam.y, cam.z);
    cm.rotation.set(0, 0, 0);
    cm.updateProjectionMatrix();

    const seen = new Set<string>();
    layers.forEach((l, i) => {
      seen.add(l.id);
      let e = entries.get(l.id);
      const srcId = l.src.kind === 'image' ? l.src.url : l.src.key;
      if (e && e.srcId !== srcId) {
        // A new image or canvas under the same id (a pose change): rebuild, or the old texture stays on screen.
        scene.remove(e.mesh);
        e.mesh.geometry.dispose();
        e.mesh.material.dispose();
        if (e.tex instanceof THREE.CanvasTexture) e.tex.dispose();
        entries.delete(l.id);
        e = undefined;
      }
      if (!e) {
        const tex = l.src.kind === 'image' ? imageTexture(l.src.url) : canvasTexture(l.src, frame);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        mesh.frustumCulled = false;
        scene.add(mesh);
        e = { mesh, tex, srcId };
        entries.set(l.id, e);
      }
      if (l.src.kind === 'canvas') {
        const painted = paintSource(l.src, frame);
        if (painted.painted) e.tex.needsUpdate = true;
      }
      const m = e.mesh;
      m.visible = true;
      m.renderOrder = i;
      m.scale.set(l.w, l.h, 1);
      m.material.opacity = l.opacity ?? 1;
      const cx = l.x + l.w / 2;
      const cy = l.y + l.h / 2;
      const rad = ((l.rot ?? 0) * Math.PI) / 180;
      let px = cx;
      let py = cy;
      if (rad !== 0) {
        const [ax, ay] = pivotOf(l);
        const ox = cx - ax;
        const oy = cy - ay;
        px = ax + ox * Math.cos(rad) - oy * Math.sin(rad);
        py = ay + ox * Math.sin(rad) + oy * Math.cos(rad);
      }
      m.position.set(px, -py, -l.d);
      m.rotation.set(0, 0, -rad);
    });
    for (const [id, e] of entries) if (!seen.has(id)) e.mesh.visible = false;
  });

  return null;
};

export const ThreeStage = ({ layers, cam, frame }: { layers: readonly Layer[]; cam: Cam; frame: number }) => (
  <ThreeCanvas
    width={W}
    height={H}
    flat
    dpr={1}
    gl={{ preserveDrawingBuffer: true, antialias: false }}
    camera={{ fov: FOV, near: 1, far: 20000, position: [cam.x, -cam.y, cam.z] }}
  >
    <Sync layers={layers} cam={cam} frame={frame} />
  </ThreeCanvas>
);
