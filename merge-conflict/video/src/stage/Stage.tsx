// The ONE ThreeCanvas of a frame (architecture.md: a second canvas renders black in parallel renders).
// Every 3D element (set plate, spotlight, cards, particles) is a child of this. `flat` and `linear`: no
// tone mapping and no output colour conversion, so every shader writes raw values to the framebuffer.
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { type ReactNode, useLayoutEffect, useMemo } from 'react';
import type { IUniform, PerspectiveCamera } from 'three';
import { type CameraPose, H, W } from '../camera/camera.ts';

const CameraRig = ({ pose }: { pose: CameraPose }) => {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    camera.fov = pose.fov;
    camera.near = 0.1;
    camera.far = 200;
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

export const Stage = ({ pose, children }: { pose: CameraPose; children: ReactNode }) => (
  <ThreeCanvas width={W} height={H} flat linear camera={{ fov: pose.fov, near: 0.1, far: 200, position: pose.position }} gl={{ antialias: true }}>
    <CameraRig pose={pose} />
    {children}
  </ThreeCanvas>
);

/**
 * Uniforms memoised once per mounted material, with their values written during render: the values then
 * always match the frame being rendered (the sibling's SvgCard pattern). Never hold a mode across frames.
 */
export const useUniforms = <T extends Record<string, unknown>>(values: T): { [K in keyof T]: IUniform<T[K]> } => {
  const u = useMemo(() => {
    const o: Record<string, IUniform> = {};
    for (const k of Object.keys(values)) o[k] = { value: values[k] };
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  for (const k of Object.keys(values)) (u[k] as IUniform).value = values[k];
  return u as { [K in keyof T]: IUniform<T[K]> };
};

/** Render order of the stage, back to front (depth testing is off: layers are ordered explicitly). */
export const ORDER = { plate: 0, floor: 1, ball: 2, fieldBack: 3, cone: 4, pool: 5, card: 10, dissolve: 11, fieldFront: 12 } as const;
