// The slot for a painted world plate (Codex plates arrive later): every world draws <PlateBackdrop plate={...} />
// at its back. With no plate it draws the code-built dark backdrop; with one, the image on a plane far behind the
// set, sized to cover the frame of any chorus or verse camera.
import { useLoader } from '@react-three/fiber';
import { staticFile } from 'remotion';
import { NoColorSpace, TextureLoader } from 'three';

const PlateImage = ({ src, z, size }: { src: string; z: number; size: [number, number] }) => {
  const tex = useLoader(TextureLoader, staticFile(src));
  tex.colorSpace = NoColorSpace;
  return (
    <mesh position={[0, 2, z]} renderOrder={0}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} depthTest={false} depthWrite={false} />
    </mesh>
  );
};

export const PlateBackdrop = ({ plate, color = '#04020a', z = -18, size = [140, 80] }: { plate?: string; color?: string; z?: number; size?: [number, number] }) =>
  plate ? (
    <PlateImage src={plate} z={z} size={size} />
  ) : (
    <mesh position={[0, 2, z]} renderOrder={0}>
      <planeGeometry args={size} />
      <meshBasicMaterial color={color} depthTest={false} depthWrite={false} />
    </mesh>
  );
