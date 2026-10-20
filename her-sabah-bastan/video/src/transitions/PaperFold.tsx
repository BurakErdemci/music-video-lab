import { useLayoutEffect, useRef } from 'react';
import { palette } from '../style/palette.ts';
import type { Painter } from './layers.ts';
import { W, H } from '../layout.ts';

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const eio = (x: number): number => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const ss = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export interface FoldLanding {
  /** Size of the folded strip against the frame (x and y; depth is not scaled, as with a CSS scale()). */
  scale: number;
  /** Where the strip's bottom centre comes to rest, px. */
  x: number;
  y: number;
  /** Fold angle of each panel, degrees. */
  fold: number;
  /** Camera looking down on the strip, degrees (the strip's top tips away). */
  tilt: number;
}

export interface PaperFoldProps {
  /** 0 = `from` fills the frame flat, 1 = folded and standing on `to`. */
  progress: number;
  /** The full-frame layer that folds. */
  from: Painter;
  /** What the strip lands on (revealed as the strip shrinks). */
  to: Painter;
  landing: FoldLanding;
  panels?: number;
  /** The paper cut-out (e.g. the skyline) as a polygon in the layer's px: outside it, the paper breaks up into
   * halftone dots and falls away early (no grey alpha fade). */
  cutout?: readonly (readonly [number, number])[];
  /** Perspective distance, px (CSS `perspective`). */
  distance?: number;
  /** Slow camera on top of everything: zoom about (x, y) px. */
  zoom?: { s: number; x: number; y: number };
}

const VERT = `#version 300 es
in vec4 aPos;
in vec3 aUv;
out vec3 vUv;
void main() { vUv = aUv; gl_Position = aPos; }
`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform float uShade;
uniform float uCrease;
uniform float uPw;
uniform float uDots;
in vec3 vUv;
out vec4 outColor;
const vec3 NAVY = vec3(${[0x18, 0x20, 0x3a].map((v) => (v / 255).toFixed(4)).join(', ')});
void main() {
  vec4 c = texture(uTex, vUv.xy);
  float a = c.a;
  if (uDots > 0.5) {
    // Paper outside the cut-out (alpha < 1) breaks into a 45-degree halftone screen: dot area = remaining coverage.
    vec2 p = vUv.xy * vec2(${W}.0, ${H}.0);
    vec2 r = mat2(0.7071, -0.7071, 0.7071, 0.7071) * p / 11.0;
    vec2 f = fract(r) - 0.5;
    float d = length(f) * 11.0;
    float rad = sqrt(clamp(a, 0.0, 1.0) / 3.14159) * 11.0 * 1.13;
    float dots = clamp(rad - d + 0.5, 0.0, 1.0);
    a = a > 0.995 ? a : dots * step(0.002, a);
  }
  if (a < 0.003) discard;
  vec3 rgb = c.a > 0.0 ? c.rgb / c.a : c.rgb;
  rgb = mix(rgb, NAVY, uShade);
  // Crease at the panel's left edge (u in px from the hinge).
  rgb = mix(rgb, NAVY, uCrease * (1.0 - smoothstep(1.5, 3.0, vUv.z * uPw)));
  outColor = vec4(rgb * a, a);
}
`;

interface FoldGL {
  gl: WebGL2RenderingContext;
  prog: WebGLProgram;
  buf: WebGLBuffer;
  texDesk: WebGLTexture;
  texLayer: WebGLTexture;
  aniso: number;
  loc: Record<string, WebGLUniformLocation | null>;
}

const compile = (gl: WebGL2RenderingContext, type: number, src: string): WebGLShader => {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('createShader failed');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`fold shader: ${gl.getShaderInfoLog(sh) ?? '?'}`);
  return sh;
};

const setup = (canvas: HTMLCanvasElement): FoldGL => {
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: true, premultipliedAlpha: true, alpha: false });
  if (!gl) throw new Error('WebGL2 is not available');
  const prog = gl.createProgram();
  if (!prog) throw new Error('createProgram failed');
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`fold link: ${gl.getProgramInfoLog(prog) ?? '?'}`);
  const buf = gl.createBuffer();
  if (!buf) throw new Error('createBuffer failed');
  const ext = gl.getExtension('EXT_texture_filter_anisotropic');
  const aniso = ext ? Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number) : 0;
  const tex = (): WebGLTexture => {
    const t = gl.createTexture();
    if (!t) throw new Error('createTexture failed');
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Trilinear + anisotropic: the strip shrinks to ~0.46x and leans away; plain bilinear would shimmer on line art.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (ext && aniso > 0) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, aniso);
    return t;
  };
  const loc: Record<string, WebGLUniformLocation | null> = {};
  for (const n of ['uTex', 'uShade', 'uCrease', 'uPw', 'uDots']) loc[n] = gl.getUniformLocation(prog, n);
  return { gl, prog, buf, texDesk: tex(), texLayer: tex(), aniso, loc };
};

const offscreen = (): CanvasRenderingContext2D => {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return ctx;
};

type V3 = [number, number, number];

/**
 * G5 "the street folds into the paper city", and any fold of one full-frame layer onto another. The layer is cut into
 * vertical panels hinged on each other (alternating mountain/valley creases), so it folds like an accordion as one sheet
 * while the camera pulls back and it settles, standing, on the `to` layer.
 *
 * Geometry is v1's CSS chain, computed here (translate · rotateX(tilt) · scale(s) · translateX, nested rotateY hinges,
 * `perspective` with origin 50% 35%): note a CSS scale() leaves depth unscaled, which is what gave v1 its strong 3D read
 * (v2 scaled depth too and read as flat stretching). Drawn as WebGL quads in true perspective (perspective-correct
 * texturing, mipmaps), not with CSS 3D: at render concurrency 4 Chrome dropped the CSS 3D group on single frames.
 */
export const PaperFold = ({ progress, from, to, landing, panels = 6, cutout, distance = 2600, zoom = { s: 1, x: W / 2, y: H / 2 } }: PaperFoldProps) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<{ f: FoldGL; desk: CanvasRenderingContext2D; layer: CanvasRenderingContext2D; mask: CanvasRenderingContext2D } | null>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    state.current ??= { f: setup(canvas), desk: offscreen(), layer: offscreen(), mask: offscreen() };
    const { f, desk, layer, mask } = state.current;
    const { gl } = f;

    const e = clamp01(progress);
    // Fold and camera end together on the beat (a fold finishing before the move read as a pop in v1).
    const theta = (landing.fold * eio(e) * Math.PI) / 180;
    const move = eio((e - 0.1) / 0.9);
    const scale = 1 + (landing.scale - 1) * move;
    const tilt = (landing.tilt * move * Math.PI) / 180;
    const cut = ss(0.04, 0.32, e);
    const pw = W / panels;
    const bx = W / 2 + (landing.x - W / 2) * move;
    const by = H + (landing.y - H) * move;

    // Hinge chain (CSS rotateY: local (x,0,0) -> (x cos a, 0, -x sin a)); absolute panel angles alternate +/- theta.
    const xs: number[] = [0];
    const zs: number[] = [0];
    for (let i = 0; i < panels; i++) {
      const a = i % 2 ? -theta : theta;
      xs.push((xs[i] as number) + pw * Math.cos(a));
      zs.push((zs[i] as number) - pw * Math.sin(a));
    }
    const shiftX = (W - W * Math.cos(theta)) / 2;
    const world = (gx: number, gy: number, gz: number): V3 => {
      // Relative to the transform origin (W/2, H): translateX, scale (x, y only), rotateX, then translate to landing.
      const x = (gx + shiftX - W / 2) * scale;
      const y = (gy - H) * scale;
      const z = gz;
      const yr = y * Math.cos(tilt) - z * Math.sin(tilt);
      const zr = y * Math.sin(tilt) + z * Math.cos(tilt);
      return [bx + x, by + yr, zr];
    };
    const ox = W / 2;
    const oy = H * 0.35;
    const clip = ([x, y, z]: V3): [number, number, number, number] => {
      const k = distance / (distance - z);
      const sx = zoom.x + (ox + (x - ox) * k - zoom.x) * zoom.s;
      const sy = zoom.y + (oy + (y - oy) * k - zoom.y) * zoom.s;
      const w = 1 / k;
      return [(sx / W * 2 - 1) * w, (1 - sy / H * 2) * w, 0, w];
    };

    // Desk layer with the contact shadow printed into it.
    desk.setTransform(1, 0, 0, 1, 0, 0);
    desk.clearRect(0, 0, W, H);
    to(desk, W, H);
    const shadowW = W * Math.cos(theta) * scale;
    desk.save();
    desk.globalAlpha = 0.35 * ss(0.4, 1, e);
    desk.translate(bx, by);
    desk.scale(1, 0.12);
    const g = desk.createRadialGradient(0, 0, 0, 0, 0, shadowW / 2 + 40);
    g.addColorStop(0, palette.navy);
    g.addColorStop(1, 'rgba(24,32,58,0)');
    desk.fillStyle = g;
    desk.beginPath();
    desk.arc(0, 0, shadowW / 2 + 40, 0, Math.PI * 2);
    desk.fill();
    desk.restore();

    // Strip layer: alpha 1 inside the cut-out, 1 - cut outside (the shader turns that into halftone dots).
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.clearRect(0, 0, W, H);
    from(layer, W, H);
    if (cutout && cut > 0) {
      mask.setTransform(1, 0, 0, 1, 0, 0);
      mask.clearRect(0, 0, W, H);
      mask.globalAlpha = 1 - cut;
      mask.fillStyle = '#000';
      mask.fillRect(0, 0, W, H);
      mask.globalAlpha = 1;
      mask.beginPath();
      cutout.forEach(([x, y], i) => (i ? mask.lineTo(x, y) : mask.moveTo(x, y)));
      mask.lineTo(W + 40, -40);
      mask.lineTo(W + 40, H + 40);
      mask.lineTo(-40, H + 40);
      mask.lineTo(-40, -40);
      mask.closePath();
      mask.fill();
      layer.globalCompositeOperation = 'destination-in';
      layer.drawImage(mask.canvas, 0, 0);
      layer.globalCompositeOperation = 'source-over';
    }

    const upload = (t: WebGLTexture, src: HTMLCanvasElement): void => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.generateMipmap(gl.TEXTURE_2D);
    };
    upload(f.texDesk, desk.canvas);
    upload(f.texLayer, layer.canvas);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(f.prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, f.buf);
    const aPos = gl.getAttribLocation(f.prog, 'aPos');
    const aUv = gl.getAttribLocation(f.prog, 'aUv');
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aPos, 4, gl.FLOAT, false, 28, 0);
    gl.vertexAttribPointer(aUv, 3, gl.FLOAT, false, 28, 16);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(f.loc.uTex as WebGLUniformLocation, 0);
    gl.uniform1f(f.loc.uPw as WebGLUniformLocation, pw);

    // Quad from four clip-space corners (tl, tr, bl, br) with uv and the panel-local u (0..1).
    const quad = (c: [number, number, number, number][], uv: [number, number][], u: number[]): void => {
      const idx = [0, 1, 2, 2, 1, 3];
      const data = new Float32Array(idx.flatMap((k) => [...(c[k] as number[]), ...(uv[k] as number[]), u[k] as number]));
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    // Desk: the full frame under the same slow camera.
    gl.bindTexture(gl.TEXTURE_2D, f.texDesk);
    gl.uniform1f(f.loc.uShade as WebGLUniformLocation, 0);
    gl.uniform1f(f.loc.uCrease as WebGLUniformLocation, 0);
    gl.uniform1f(f.loc.uDots as WebGLUniformLocation, 0);
    const flat = (x: number, y: number): [number, number, number, number] => clip([x, y, 0]);
    quad([flat(0, 0), flat(W, 0), flat(0, H), flat(W, H)], [[0, 0], [1, 0], [0, 1], [1, 1]], [1, 1, 1, 1]);

    // Panels, far first (they never intersect; painter's order is exact).
    gl.bindTexture(gl.TEXTURE_2D, f.texLayer);
    gl.uniform1f(f.loc.uDots as WebGLUniformLocation, cutout ? 1 : 0);
    const order = Array.from({ length: panels }, (_, i) => i).sort((a, b) => ((zs[a] as number) + (zs[a + 1] as number)) - ((zs[b] as number) + (zs[b + 1] as number)));
    for (const i of order) {
      // Panels facing away from the light print darker; the shade exists only while folded.
      gl.uniform1f(f.loc.uShade as WebGLUniformLocation, (i % 2 ? 0.5 : 0.04) * Math.sin(theta));
      gl.uniform1f(f.loc.uCrease as WebGLUniformLocation, i > 0 ? 0.85 * Math.sin(theta) : 0);
      const x0 = xs[i] as number;
      const x1 = xs[i + 1] as number;
      const z0 = zs[i] as number;
      const z1 = zs[i + 1] as number;
      const u0 = (i * pw) / W;
      const u1 = ((i + 1) * pw) / W;
      quad(
        [clip(world(x0, 0, z0)), clip(world(x1, 0, z1)), clip(world(x0, H, z0)), clip(world(x1, H, z1))],
        [[u0, 0], [u1, 0], [u0, 1], [u1, 1]],
        [0, 1, 0, 1],
      );
    }
  });

  return <canvas ref={ref} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} />;
};
