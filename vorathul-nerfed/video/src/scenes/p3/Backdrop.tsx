// Shared plate paths and the flat sky card behind the part-3 painting stage (the throne room is Throne.tsx).
import { AssetCard } from '../../cast/AssetCard.tsx';

export const PLATE = {
  style: 'plates/01-tarz-cizgi-roman.jpg',
  fan: 'plates/03-kanat-yelpaze.jpg',
  second: 'plates/04-ikinci-form.jpg',
  nerf: 'plates/05-nerf-hali.jpg',
  fight: 'plates/06-dovus-faz3.jpg',
  office: 'plates/07-ofis-tablo.jpg',
} as const;

/** P0 sky as one flat card; `rect` = [x0, y0, x1, y1] so a shot can place its corner (S71). */
// Default z -68: a tilted-up view of a farther sky reached past the stage camera's far plane (200) and showed black.
export const Sky = ({ rect = [-220, -40, 220, 240], z = -68, color = '#8EC5E8' }: { rect?: [number, number, number, number]; z?: number; color?: string }) => (
  <AssetCard
    id="G01" standIn={{ color }} width={rect[2] - rect[0]} height={rect[3] - rect[1]}
    position={[(rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2, z]} renderOrder={-100}
  />
);
