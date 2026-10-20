// Asset ids whose final cut-out image is in public/assets/<id>.png (alpha PNG), with its pixel size.
// Derived from src/cast/assets-manifest.json, a copy of public/assets/manifest.json that
// tools/imagegen/cutout.py writes (copy it again after every cut-out run). Pose sheets are split into
// <id>-<n> (n from 1, left to right, row by row). The main loop decides which ids go live in LIVE.
import manifest from './assets-manifest.json';

type Entry = { files: string[]; sizes: number[][] };

const SIZES = new Map<string, [number, number]>();
for (const e of Object.values(manifest as Record<string, Entry>)) {
  e.files.forEach((file, i) => SIZES.set(file.replace(/^assets\//, '').replace(/\.png$/, ''), e.sizes[i] as [number, number]));
}

/** Ids switched from stand-in to final image. Empty until the main loop has reviewed the shots that use them. */
const LIVE: readonly string[] = [];

export const AVAILABLE: ReadonlySet<string> = new Set(LIVE.filter((id) => SIZES.has(id)));

/** Pixel size of a cut-out (final image), or undefined when it does not exist yet. */
export const assetSize = (id: string): [number, number] | undefined => SIZES.get(id);
