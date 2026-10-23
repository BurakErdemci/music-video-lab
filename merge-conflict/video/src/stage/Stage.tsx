// The ONE ThreeCanvas of a frame (architecture.md: a second canvas renders black in parallel renders).
// Every 3D element (set plate, spotlight, cards, particles) is a child of this. `flat` and `linear`: no
// tone mapping and no output colour conversion, so every shader writes raw values to the framebuffer.
import { useThree } from '@react-three/fiber';
import { isKeyed, SET_KEY, useLayer } from '../layer.ts';
import { ThreeCanvas } from '@remotion/three';
import { createContext, type ReactNode, useContext, useLayoutEffect, useMemo } from 'react';
import type { IUniform, PerspectiveCamera, ShaderMaterial } from 'three';
import { type CameraPose, H, W } from '../camera/camera.ts';

const CameraRig = ({ pose }: { pose: CameraPose }) => {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    camera.fov = pose.fov;
    camera.near = 0.1;
    camera.far = 200;
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.rotateZ(pose.roll ?? 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

export const Stage = ({ pose, children }: { pose: CameraPose; children: ReactNode }) => {
  const layer = useLayer();
  return layer === 'type' ? null : <StageCanvas pose={pose} keyed={isKeyed(layer)}>{children}</StageCanvas>;
};

/** The frame's camera pose for elements that stand relative to it (the plates, worlds/plate.tsx). The provider sits
 *  inside the canvas: React contexts do not cross into the three.js reconciler from outside. */
const PoseContext = createContext<CameraPose | null>(null);
export const useStagePose = (): CameraPose => {
  const p = useContext(PoseContext);
  if (!p) throw new Error('useStagePose outside a <Stage>');
  return p;
};

/** The pose, or null outside a <Stage> (a card in a lab board). */
export const useStagePoseMaybe = (): CameraPose | null => useContext(PoseContext);

/** `keyed`: the set layer (framecheck --set) clears to the key magenta, so every pixel no set mesh covers shows it. */
const StageCanvas = ({ pose, children, keyed }: { pose: CameraPose; children: ReactNode; keyed: boolean }) => (
  <ThreeCanvas width={W} height={H} flat linear camera={{ fov: pose.fov, near: 0.1, far: 200, position: pose.position }} gl={{ antialias: true }}>
    {keyed && <color attach="background" args={[SET_KEY]} />}
    <CameraRig pose={pose} />
    <PoseContext.Provider value={pose}>{children}</PoseContext.Provider>
  </ThreeCanvas>
);

/**
 * Material props for a shader whose uniform values change per frame: spread them on <shaderMaterial>.
 * R3F keeps its OWN copy of the `uniforms` object it is given at creation (measured 21 Oct 2026: the
 * material's uniforms !== the object passed in, so values written to that object after mount never reached
 * the GPU; single-frame stills looked right, sequential renders froze every uniform at its mount value).
 * So the values are written into the material's own uniforms at commit, through a ref callback that is new
 * on every render (React calls it on every commit), the sibling clip's pattern.
 */
export const useUniforms = <T extends Record<string, unknown>>(values: T) => {
  const initial = useMemo(() => {
    const o: Record<string, IUniform> = {};
    for (const k of Object.keys(values)) o[k] = { value: values[k] };
    return o;
    // Only the mount values: every later value goes through the ref below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ref = (m: ShaderMaterial | null) => {
    if (!m) return;
    for (const k of Object.keys(values)) {
      const u = m.uniforms[k];
      if (!u) throw new Error(`useUniforms: material has no uniform ${k}`);
      u.value = values[k];
    }
    m.uniformsNeedUpdate = true;
  };
  return { uniforms: initial, ref };
};

/** Render order of the stage, back to front (depth testing is off: layers are ordered explicitly). */
export const ORDER = { plate: 0, floor: 1, ball: 2, fieldBack: 3, cone: 4, pool: 5, card: 10, dissolve: 11, fieldFront: 12 } as const;
