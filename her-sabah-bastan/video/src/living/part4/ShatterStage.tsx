// The coda's one Three canvas: the new world as textured planes (the engine's Sync logic, copied: ThreeStage.tsx is not
// editable) plus the glass shards as real geometry. Draw order is what makes depth right: the shards are OPAQUE, so
// three draws them first and writes their depth; the planes are transparent with depthTest on (depthWrite off), so a
// plane only paints where nothing nearer was drawn, and planes keep their layer-list order among themselves.
import { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { getImage } from '../../transitions/layers.ts';
import { D0 } from '../types.ts';
import type { Cam, CanvasSource, Layer } from '../types.ts';
import { pivotOf } from '../compose2d.ts';
import { paintSource } from '../sources.ts';
import { shatterSource, type CodaData } from './coda.ts';
import { shardPose, type Shard } from './shards.ts';

const W = 1920;
const H = 1080;
const FOV = (2 * Math.atan(H / 2 / D0) * 180) / Math.PI;

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

interface Entry {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  tex: THREE.Texture;
  srcId: string;
}

// ---- shards

const LIGHT = new THREE.Vector3(-0.5, 0.6, 0.62).normalize();
const SIDE = new THREE.MeshStandardMaterial({ color: 0xf3efe4, roughness: 0.42, metalness: 0.1, emissive: 0xc9a53c, emissiveIntensity: 0.7 });

const shardGeometry = (s: Shard): THREE.BufferGeometry => {
  const pos: number[] = [];
  const uv: number[] = [];
  const h = s.th / 2;
  const n = s.poly.length;
  const push = (x: number, y: number, z: number, u: number, v: number): void => {
    pos.push(x, y, z);
    uv.push(u, v);
  };
  // centre of the fan
  const cu = s.uv.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n], [0, 0]);
  const cx = s.poly.reduce((a, p) => a + p[0] / n, 0);
  const cy = s.poly.reduce((a, p) => a + p[1] / n, 0);
  // front face (+z), counter-clockwise
  for (let i = 0; i < n; i++) {
    const a = s.poly[i] as [number, number];
    const b = s.poly[(i + 1) % n] as [number, number];
    const ua = s.uv[i] as [number, number];
    const ub = s.uv[(i + 1) % n] as [number, number];
    push(cx, cy, h, cu[0] as number, cu[1] as number);
    push(a[0], a[1], h, ua[0], ua[1]);
    push(b[0], b[1], h, ub[0], ub[1]);
  }
  const frontCount = pos.length / 3;
  // back face (-z), reversed winding, same uv (it shows the print mirrored, like a sheet of glass seen from behind)
  for (let i = 0; i < n; i++) {
    const a = s.poly[i] as [number, number];
    const b = s.poly[(i + 1) % n] as [number, number];
    const ua = s.uv[i] as [number, number];
    const ub = s.uv[(i + 1) % n] as [number, number];
    push(cx, cy, -h, cu[0] as number, cu[1] as number);
    push(b[0], b[1], -h, ub[0], ub[1]);
    push(a[0], a[1], -h, ua[0], ua[1]);
  }
  const backCount = pos.length / 3 - frontCount;
  // sides
  for (let i = 0; i < n; i++) {
    const a = s.poly[i] as [number, number];
    const b = s.poly[(i + 1) % n] as [number, number];
    push(a[0], a[1], h, 0, 0);
    push(a[0], a[1], -h, 0, 0);
    push(b[0], b[1], -h, 0, 0);
    push(a[0], a[1], h, 0, 0);
    push(b[0], b[1], -h, 0, 0);
    push(b[0], b[1], h, 0, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  g.addGroup(0, frontCount, 0);
  g.addGroup(frontCount, backCount, 1);
  g.addGroup(frontCount + backCount, pos.length / 3 - frontCount - backCount, 2);
  return g;
};

interface ShardMesh {
  mesh: THREE.Mesh;
  front: THREE.MeshPhysicalMaterial;
}
const buildShardMeshes = (shards: readonly Shard[], tex: THREE.Texture): { root: THREE.Group; meshes: ShardMesh[] } => {
  const root = new THREE.Group();
  const back = new THREE.MeshStandardMaterial({ color: 0x000000, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.7 });
  const meshes = shards.map((s) => {
    // the print is emissive (shows exactly as drawn); the light only adds a specular glint and darkens tilted-away faces
    const front = new THREE.MeshPhysicalMaterial({ color: 0x000000, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.55, metalness: 0, specularIntensity: 0.3 });
    const mesh = new THREE.Mesh(shardGeometry(s), [front, back, SIDE]);
    mesh.frustumCulled = false;
    root.add(mesh);
    return { mesh, front };
  });
  return { root, meshes };
};

const nrm = new THREE.Vector3();
const eul = new THREE.Euler();

const Scene = ({ data, frame }: { data: CodaData; frame: number }) => {
  const { camera, scene } = useThree();
  const entries = useMemo(() => new Map<string, Entry>(), []);
  const srcTex = useMemo(() => {
    const t = new THREE.CanvasTexture(shatterSource());
    t.colorSpace = THREE.SRGBColorSpace;
    setFilter(t);
    t.needsUpdate = true;
    return t;
  }, []);
  const shardSet = useMemo(() => buildShardMeshes(data.set.shards, srcTex), [data.set, srcTex]);
  useLayoutEffect(() => {
    scene.add(shardSet.root);
    return () => {
      scene.remove(shardSet.root);
    };
  }, [scene, shardSet]);

  useLayoutEffect(() => {
    const cam: Cam = data.cam;
    const cm = camera as THREE.PerspectiveCamera;
    cm.fov = FOV;
    cm.aspect = W / H;
    cm.near = 1;
    cm.far = 20000;
    cm.position.set(cam.x, -cam.y, cam.z);
    cm.rotation.set(0, 0, 0);
    cm.updateProjectionMatrix();

    const seen = new Set<string>();
    data.layers.forEach((l: Layer, i: number) => {
      seen.add(l.id);
      let e = entries.get(l.id);
      const srcId = l.src.kind === 'image' ? l.src.url : l.src.key;
      if (e && e.srcId !== srcId) {
        scene.remove(e.mesh);
        e.mesh.geometry.dispose();
        e.mesh.material.dispose();
        if (e.tex instanceof THREE.CanvasTexture) e.tex.dispose();
        entries.delete(l.id);
        e = undefined;
      }
      if (!e) {
        const tex = l.src.kind === 'image' ? imageTexture(l.src.url) : canvasTexture(l.src, frame);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false });
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

    // the shards
    data.set.shards.forEach((s, i) => {
      const sm = shardSet.meshes[i] as ShardMesh;
      const p = shardPose(s, frame, cam, data.zone);
      const gone = p.z >= cam.z - 4;
      sm.mesh.visible = !gone;
      if (gone) return;
      sm.mesh.position.set(p.x, p.y, p.z);
      eul.set(p.rx, p.ry, p.rz);
      sm.mesh.rotation.copy(eul);
      nrm.set(0, 0, 1).applyEuler(eul);
      const lit = (nrm.dot(LIGHT) / LIGHT.z) * 0.22 + 0.78;
      sm.front.emissiveIntensity = Math.max(0.74, Math.min(1, lit));
    });
  });
  return null;
};

export const ShatterStage = ({ data, frame }: { data: unknown; frame: number }) => {
  const d = data as CodaData;
  return (
    <ThreeCanvas width={W} height={H} flat dpr={1} gl={{ preserveDrawingBuffer: true, antialias: true }} camera={{ fov: FOV, near: 1, far: 20000, position: [d.cam.x, -d.cam.y, d.cam.z] }}>
      <ambientLight color={0x9aa3c8} intensity={0.7} />
      <directionalLight color={0xffe9a8} intensity={3.2} position={[-500, 600, 620]} />
      <Scene data={d} frame={frame} />
    </ThreeCanvas>
  );
};
