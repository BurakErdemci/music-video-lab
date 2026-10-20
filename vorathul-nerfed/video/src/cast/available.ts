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

/** Ids switched from stand-in to final image, each reviewed in the shots that use it (film contact sheets).
 * Left out on purpose: G27 (the empty office wall; p4 needs the painting that plate 07 carries), G41-6 and G39-5
 * (S104: the toppled chair covers his legs at the wrong size and hides the developer under the desk). */
const LIVE: readonly string[] = [
  // cathedral painting (p1, p2, p3, p5 sky)
  'G01', 'G02-1', 'G02-2', 'G02-3', 'G02-4', 'G02-5', 'G03', 'G04a', 'G04b', 'G05-1', 'G05-2', 'G05-3', 'G06', 'G07-1', 'G07-2', 'G08-1', 'G08-2', 'G08-3', 'G09-1', 'G09-2', 'G10',
  // heroes (p1 all-or-nothing per hero, p2)
  'G15-1', 'G15-2', 'G15-3', 'G15-4', 'G15-5', 'G15-6', 'G15-7', 'G16-1', 'G16-2', 'G16-3', 'G16-4', 'G16-5', 'G16-6', 'G16-7', 'G17-1', 'G17-2', 'G17-3', 'G17-4', 'G17-5', 'G17-6', 'G17-7', 'G18-1', 'G18-2', 'G18-3', 'G18-4', 'G18-5', 'G18-6', 'G18-7',
  // p2 painting fx, HUD, office and hands
  'G13', 'G21-1', 'G21-2', 'G21-3', 'G21-4', 'G23-1', 'G23-2', 'G23-3', 'G23-4', 'G23-5', 'G23-6', 'G23-7', 'G23-8', 'G23-9', 'G23-10', 'G24-1', 'G24-2', 'G24-3', 'G24-4', 'G24-5', 'G25-1', 'G25-2', 'G25-3', 'G28-1', 'G28-2', 'G29-1', 'G29-2', 'G31-1', 'G31-3', 'G31-4',
  // p3 kid, boot, knights
  'G32-1', 'G32-2', 'G32-3', 'G32-4', 'G32-5', 'G32-6', 'G33-2', 'G34-1', 'G34-2', 'G34-3', 'G34-4', 'G34-5', 'G34-6', 'G34-7', 'G34-8', 'G34-9', 'G34-10', 'G34-11', 'G34-12',
  // p4 inside arcades
  'G35a', 'G35b',
  // p5 office cast and key stills
  'G14', 'G39-1', 'G39-2', 'G39-3', 'G39-7', 'G39-8', 'G41-1', 'G41-2', 'G41-4', 'G42', 'G43', 'G44', 'G45',
  // organ loft (p1 S17-S24)
  'L1-bellows', 'L1-console', 'L1-floor', 'L1-pipes-near', 'L1-wall-a', 'L1-wall-b',
  // rooftop and open sky (p1 S25, p2)
  'L2-buttress', 'L2-gargoyle', 'L2-land', 'L2-roof', 'L2-sky-a', 'L2-sky-b', 'L2-spires',
  // throne room, crumbling (p3)
  'L3-column', 'L3-column-broken', 'L3-cracks', 'L3-floor', 'L3-rubble', 'L3-wall', 'L3-wall-ruin',
  // painted light layer
  'LX-rays',
  // hero comic panels (p1)
  'H-s06-archer', 'H-s06-knight', 'H-s06-mage', 'H-s06-rogue', 'H-s14-double', 'H-s17-archer', 'H-s17-knight', 'H-s17-mage', 'H-s17-rogue', 'H-s19-charge',
];

export const AVAILABLE: ReadonlySet<string> = new Set(LIVE.filter((id) => SIZES.has(id)));

/** Pixel size of a cut-out (final image), or undefined when it does not exist yet. */
export const assetSize = (id: string): [number, number] | undefined => SIZES.get(id);
