// Every image Part4 draws, preloaded before any renderer sees it (each scene module lists its own).
import { RUN_IMAGES } from './run.ts';
import { FLOOD_IMAGES } from './flood.ts';
import { GLASS_A_IMAGES } from './glassA.ts';
import { GLASS_B_IMAGES } from './glassB.ts';
import { CODA_IMAGES } from './coda.ts';
import { RESET_IMAGES } from './reset.ts';
import { P1_IMAGE_URLS } from './splitSet.ts';

export const IMAGE_URLS: readonly string[] = [...new Set([...P1_IMAGE_URLS, ...RUN_IMAGES, ...FLOOD_IMAGES, ...GLASS_A_IMAGES, ...GLASS_B_IMAGES, ...CODA_IMAGES, ...RESET_IMAGES])];
