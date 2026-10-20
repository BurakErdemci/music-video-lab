import { useLayoutEffect, type ReactNode } from 'react';
import { PerspectiveCamera } from 'three';
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { Vec3 } from './Card.tsx';

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  fov?: number;
}
/** Camera position and target as a pure function of the frame. */
export type CameraPath = (frame: number) => CameraPose;

export const DEFAULT_FOV = 40;
/** Distance at which a card of `worldHeight` exactly fills the frame height. */
export const fitDistance = (worldHeight: number, fov = DEFAULT_FOV): number => worldHeight / 2 / Math.tan((fov * Math.PI) / 360);

/** Applies the pose to the canvas camera before every paint; the pose is a pure function of the frame. */
const CameraRig = ({ pose }: { pose: CameraPose }) => {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    camera.fov = pose.fov ?? DEFAULT_FOV;
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

/** The only WebGL canvas of a composition. Children are Cards and Parts. */
export const Stage = ({ camera, children }: { camera: CameraPath; children: ReactNode }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const pose = camera(frame);
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: DEFAULT_FOV, near: 0.1, far: 200, position: pose.position }} gl={{ antialias: true }}>
      <CameraRig pose={pose} />
      {children}
    </ThreeCanvas>
  );
};
