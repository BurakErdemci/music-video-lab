// Asset ids whose final cut-out image is in public/assets/<id>.png (alpha PNG). The main loop adds an id here
// when an approved image lands; until then AssetCard draws the shot's stand-in.
export const AVAILABLE: ReadonlySet<string> = new Set<string>([]);
