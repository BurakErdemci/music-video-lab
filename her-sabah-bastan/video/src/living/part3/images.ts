// Every image Part3 draws (preloaded before any renderer sees it).
import { url } from './common.ts';

const AI = ['ai-stand', 'a-raise', 'a-lookdown', 'a-palm', 'a-tower', 'a-walk', 'a-read', 'a-finger', 'a-reach', 'a-lookup'];
const PLAIN = [
  'st-shops-a', 'st-shops-b', 'st-tv', 'st-cafe', 'st-table', 'st-tree', 'st-lamp',
  'h-walk', 'h-palm', 'h-lean', 'h-freeze', 'h-head', 'h-kneel', 'h-slide',
  'bus-int', 'hb-lean', 'hb-read', 'hb-lookup', 'hb-refl', 'room-morning',
];
export const IMAGE_URLS: readonly string[] = [...PLAIN.map(url), ...AI.flatMap((n) => [url(n), url(`${n}-eye`), url(`${n}-noeye`)])];
