// The flight's ONE Three canvas: the world behind the glass as textured planes (the engine's Sync logic, copied from
// part4/ShatterStage.tsx) plus the shards as real geometry. Shards are opaque and drawn first (they write depth); the
// planes are transparent with depthTest on, so they only paint where no shard is nearer. A shard's face is a small
// shader: the glass picture, cross-faded into its recap still, lit by its tilt plus a glint when it turns into the light;
// its thin sides carry the warm edge light.
import { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { getImage } from '../../../transitions/layers.ts';
import { D0 } from '../../types.ts';
import type { CanvasSource, Layer } from '../../types.ts';
import { pivotOf } from '../../compose2d.ts';
import { paintSource } from '../../sources.ts';
import { shardPose, shatterSource, type FlightData, type FShard } from './flight.ts';
import { recapUrl } from './recap.ts';

const W = 1920;
const H = 1080;
const FOV = (2 * Math.atan(H / 2 / D0) * 180) / Math.PI;

const setFilter = (t: THREE.Texture): void => {
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
};
const imageTextures = new Map<string, THREE.Texture>();
const imageTexture = (url: string, srgb = true): THREE.Texture => {
  const key = `${url}|${srgb}`;
  let t = imageTextures.get(key);
  if (!t) {
    t = new THREE.Texture(getImage(url));
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    setFilter(t);
    t.needsUpdate = true;
    imageTextures.set(key, t);
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
const SIDE = new THREE.MeshBasicMaterial({ color: 0xf6e7b0 });

// Raw texel values in, raw out (no colour-space chunks): the glass picture shows exactly as Part4a's last frame.
const VERT = `
attribute vec2 uv2b;
varying vec2 vUv;
varying vec2 vUv2;
void main() {
  vUv = uv;
  vUv2 = uv2b;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = `
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uMix;
uniform float uLit;
uniform float uGlint;
varying vec2 vUv;
varying vec2 vUv2;
void main() {
  vec3 a = texture2D(uA, vUv).rgb;
  vec3 b = texture2D(uB, clamp(vUv2, 0.0, 1.0)).rgb;
  vec3 c = mix(a, b, uMix) * uLit;
  c = mix(c, vec3(1.0, 0.975, 0.9), uGlint);
  gl_FragColor = vec4(c, 1.0);
}`;

const shardGeometry = (s: FShard): THREE.BufferGeometry => {
  const pos: number[] = [];
  const uv: number[] = [];
  const uv2: number[] = [];
  const h = s.th / 2;
  const n = s.poly.length;
  const has2 = s.uv2.length === n;
  const push = (x: number, y: number, z: number, u: readonly number[], u2: readonly number[]): void => {
    pos.push(x, y, z);
    uv.push(u[0] as number, u[1] as number);
    uv2.push(u2[0] as number, u2[1] as number);
  };
  const avg = (a: readonly (readonly [number, number])[]): [number, number] => a.reduce<[number, number]>((m, p) => [m[0] + p[0] / a.length, m[1] + p[1] / a.length], [0, 0]);
  const cu = avg(s.uv);
  const cu2: readonly number[] = has2 ? avg(s.uv2) : [0, 0];
  const cx = s.poly.reduce((a, p) => a + p[0] / n, 0);
  const cy = s.poly.reduce((a, p) => a + p[1] / n, 0);
  const z0: [number, number] = [0, 0];
  for (const side of [1, -1]) {
    for (let i = 0; i < n; i++) {
      const ia = side > 0 ? i : (i + 1) % n;
      const ib = side > 0 ? (i + 1) % n : i;
      const a = s.poly[ia] as [number, number];
      const b = s.poly[ib] as [number, number];
      push(cx, cy, side * h, cu, cu2);
      push(a[0], a[1], side * h, s.uv[ia] as [number, number], has2 ? (s.uv2[ia] as [number, number]) : z0);
      push(b[0], b[1], side * h, s.uv[ib] as [number, number], has2 ? (s.uv2[ib] as [number, number]) : z0);
    }
  }
  const faceCount = pos.length / 3;
  for (let i = 0; i < n; i++) {
    const a = s.poly[i] as [number, number];
    const b = s.poly[(i + 1) % n] as [number, number];
    push(a[0], a[1], h, z0, z0);
    push(a[0], a[1], -h, z0, z0);
    push(b[0], b[1], -h, z0, z0);
    push(a[0], a[1], h, z0, z0);
    push(b[0], b[1], -h, z0, z0);
    push(b[0], b[1], h, z0, z0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('uv2b', new THREE.Float32BufferAttribute(uv2, 2));
  g.addGroup(0, faceCount, 0);
  g.addGroup(faceCount, pos.length / 3 - faceCount, 1);
  return g;
};

interface ShardMesh {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
}
const buildShardMeshes = (shards: readonly FShard[], src: THREE.Texture): { root: THREE.Group; meshes: ShardMesh[] } => {
  const root = new THREE.Group();
  const meshes = shards.map((s) => {
    const b = s.recap >= 0 ? imageTexture(recapUrl(s.recap), false) : src;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uA: { value: src }, uB: { value: b }, uMix: { value: 0 }, uLit: { value: 1 }, uGlint: { value: 0 } },
    });
    const mesh = new THREE.Mesh(shardGeometry(s), [mat, SIDE]);
    mesh.frustumCulled = false;
    root.add(mesh);
    return { mesh, mat };
  });
  return { root, meshes };
};

const nrm = new THREE.Vector3();
const eul = new THREE.Euler();
const toCam = new THREE.Vector3();
const refl = new THREE.Vector3();

const Scene = ({ data, frame }: { data: FlightData; frame: number }) => {
  const { camera, scene } = useThree();
  const entries = useMemo(() => new Map<string, Entry>(), []);
  const srcTex = useMemo(() => {
    const t = new THREE.CanvasTexture(shatterSource());
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
    const cam = data.cam;
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

    data.set.shards.forEach((s, i) => {
      const sm = shardSet.meshes[i] as ShardMesh;
      const p = shardPose(s, frame);
      const gone = p.z >= cam.z - 6;
      sm.mesh.visible = !gone;
      if (gone) return;
      sm.mesh.position.set(p.x, p.y, p.z);
      eul.set(p.rx, p.ry, p.rz);
      sm.mesh.rotation.copy(eul);
      nrm.set(0, 0, 1).applyEuler(eul);
      const lit = (nrm.dot(LIGHT) / LIGHT.z) * 0.22 + 0.78;
      sm.mat.uniforms.uLit!.value = Math.max(0.72, Math.min(1.06, lit));
      // glint: the light mirrored about the face normal, toward the camera
      toCam.set(cam.x - p.x, -cam.y - p.y, cam.z - p.z).normalize();
      refl.copy(LIGHT).reflect(nrm).negate();
      const g = Math.max(0, refl.dot(toCam));
      sm.mat.uniforms.uGlint!.value = 0.55 * Math.pow(g, 24);
      sm.mat.uniforms.uMix!.value = p.mix;
    });
  });
  return null;
};

export const FinaleStage = ({ data, frame }: { data: FlightData; frame: number }) => (
  <ThreeCanvas width={W} height={H} flat dpr={1} gl={{ preserveDrawingBuffer: true, antialias: true }} camera={{ fov: FOV, near: 1, far: 20000, position: [data.cam.x, -data.cam.y, data.cam.z] }}>
    <Scene data={data} frame={frame} />
  </ThreeCanvas>
);
