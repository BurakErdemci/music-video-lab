// Types of vorathul.rig.json and of the per-frame rig state.

export type Side = 'R' | 'L';
export type HandName = 'open' | 'grip' | 'fist' | 'palm' | 'spread' | 'clutch';
export type PoseName = string;

export interface TextureDef {
  src: string;
  w: number;
  h: number;
  pivot: [number, number];
  idColor: string;
  shape: { t?: string; [k: string]: unknown };
}

export interface PartDef {
  id: string;
  parent: string;
  driver: string;
  texture: string;
  variants?: string[];
  /** Child pivot position inside the parent's image, px. */
  socket: [number, number];
  /** Used instead of the socket when the parent is the (imageless) root, H. */
  offsetH?: [number, number];
  z: number;
  zBySide?: Record<Side, number>;
  dz?: number;
  limits?: Record<string, [number, number]>;
  sign?: number;
  sided?: boolean;
  mirror?: boolean;
  baseSide?: Side;
  side?: Side;
  flipX?: boolean;
  hemIndex?: number;
  eyeIndex?: number;
  follow?: { part: string; factor: number };
  jointRadius?: number;
  attachOffsetDeg?: number;
}

export interface PipeItem { i: number; open: number; fold: number; len: number; tex: 's' | 'm' | 'l'; lengthScale: number }
export interface PipesDef {
  r0: number; widthH: number; cascade: number; mouthLenW: number; mouthOverlapW: number; corkSeatW: number; corkStartH: number;
  z: { base: number; step: number; mouth: number; glow: number; cork: number };
  missingZ: number; dz: number; thetaLimits: [number, number]; scaleLimits: [number, number];
  baseSide: Side; checkerCellH: number; items: PipeItem[]; bodyLen: Record<string, number>;
}

export interface PoseDef {
  pelvis: [number, number];
  torso: number;
  head: [number, number];
  armR: [number, number, number, HandName];
  armL: [number, number, number, HandName];
  legs: [number, number];
  /** [spread or null (the wing track decides), wing root rotation] */
  wings: [number | null, number];
  sword: 'hand_R' | 'ground';
  swordDir?: number;
  swordZ?: number;
  /** Planted-sword tip x (H) and lean (deg), only where the pose itself places it. */
  plant?: [number, number];
  seated?: boolean;
  root?: [number, number, number];
  flare?: number;
  /** Whole-rig scale about the root (1 = as drawn). */
  rootScale?: number;
  /** Whole-body lean about the root, deg, positive = counter-clockwise on screen (limit +-10). */
  lean?: number;
}

export interface RigJson {
  unitPx: number;
  textures: Record<string, TextureDef>;
  parts: PartDef[];
  pipes: PipesDef;
  poses: Record<PoseName, PoseDef>;
  attacks: AttackDef[];
  helmCut: [number, number][];
  idColors: Record<string, string>;
  bladeBelow: number;
}

/** One rig card position in the tree (a part expanded for its side). */
export interface RigNode {
  id: string;
  def: PartDef;
  side: Side | null;
  parent: string | null;
  children: string[];
  /** Pivot offset from the parent's pivot, H, y up. Already mirrored for the non-base side of a mirrored family. */
  offset: [number, number];
  /** This node starts a mirrored subtree (scale.x = -1 around its socket). */
  flip: boolean;
  z: number;
  dz: number;
  sign: number;
  slots: string[];
}

export interface RigModel {
  json: RigJson;
  nodes: RigNode[];
  byId: Map<string, RigNode>;
  roots: string[];
  /** H per px. */
  hpx: number;
}

// ---- state ----
export interface Channels {
  rootX: number; rootY: number; rootZ: number; rootScale: number; rootRot: number; crownRot: number;
  pelvisRot: number; pelvisTy: number; torso: number; headRot: number; headSink: number;
  uaR: number; fR: number; hR: number; uaL: number; fL: number; hL: number;
  legR: number; legL: number; wingRot: number; wingS: number | null; flare: number;
}

export interface HandCard { variant: HandName; opacity: number; front: boolean }
export interface GroundSword { x: number; y: number; phi: number }

export interface PipeState {
  body: boolean; mouth: boolean; checker: boolean; glow: number; theta: number; lengthScale: number;
  /** Extra distance along the pipe axis, H (returning pipes). */
  fly: number;
  cork: { show: boolean; travel: number; scale: number };
}
export interface WingState { s: number; deleted: number; pipes: PipeState[] }

export interface RigState {
  frame: number;
  ch: Channels;
  handR: HandCard[];
  handL: HandCard[];
  sword: { attach: 'hand_R' | 'ground'; z: number; ground: GroundSword };
  seated: boolean;
  helm: { split: boolean; t: number };
  crown: 'full' | 'small';
  slit: { variant: 'lit' | 'sad'; opacity: number };
  studs: number; gems: number; runes: number;
  eyes: number[];
  capeLower: number;
  hems: number[];
  wings: Record<Side, WingState>;
}

export interface AttackDef {
  id: string;
  /** anticipation, strike, follow-through */
  poses: [PoseName, PoseName, PoseName];
  status: 'rig' | 'rig_partial' | 'needs_still';
  note: string;
}
