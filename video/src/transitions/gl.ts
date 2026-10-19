// Minimal WebGL1 plumbing for the shader transitions: one full-screen triangle, two layer textures, numeric uniforms.
// No dependency: the project has no three.js and adding one needs Burak's approval.

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** GLSL shared by the fragment shaders: 2D simplex noise (Ashima Arts / Stefan Gustavson, MIT) and fbm. Deterministic. */
export const GLSL_NOISE = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * snoise(p); p = p * 2.03 + vec2(17.1, 9.7); a *= 0.5; }
  return s;
}
`;

/** Common fragment prelude: uniforms every transition gets, and uv with a top-left origin (matches the 2D canvases). */
export const FRAG_HEAD = `
precision highp float;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform sampler2D uAux;
uniform vec2 uRes;
uniform float uP;
uniform float uT;
vec2 topUv() { return vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y); }
vec4 tex(sampler2D s, vec2 uv) { return texture2D(s, clamp(uv, vec2(0.0005), vec2(0.9995))); }
${GLSL_NOISE}
`;

export interface GLRig {
  gl: WebGLRenderingContext;
  prog: WebGLProgram;
  tex: [WebGLTexture, WebGLTexture, WebGLTexture];
  loc: Map<string, WebGLUniformLocation | null>;
}

const compile = (gl: WebGLRenderingContext, type: number, src: string): WebGLShader => {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('createShader failed');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`shader compile: ${gl.getShaderInfoLog(sh) ?? '?'}`);
  return sh;
};

const makeTexture = (gl: WebGLRenderingContext): WebGLTexture => {
  const t = gl.createTexture();
  if (!t) throw new Error('createTexture failed');
  gl.bindTexture(gl.TEXTURE_2D, t);
  // Non-power-of-two layers (1920x1080): WebGL1 needs clamp and no mipmaps.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
};

export const createRig = (canvas: HTMLCanvasElement, frag: string): GLRig => {
  // preserveDrawingBuffer: Remotion screenshots the page after React commits; the buffer must still hold the frame.
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false, alpha: false });
  if (!gl) throw new Error('WebGL is not available in this browser');
  const prog = gl.createProgram();
  if (!prog) throw new Error('createProgram failed');
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`shader link: ${gl.getProgramInfoLog(prog) ?? '?'}`);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const tex: [WebGLTexture, WebGLTexture, WebGLTexture] = [makeTexture(gl), makeTexture(gl), makeTexture(gl)];
  return { gl, prog, tex, loc: new Map() };
};

const uniformLoc = (rig: GLRig, name: string): WebGLUniformLocation | null => {
  if (!rig.loc.has(name)) rig.loc.set(name, rig.gl.getUniformLocation(rig.prog, name));
  return rig.loc.get(name) ?? null;
};

export type UniformValue = number | readonly number[];

/** Uploads the layers (from, to, and an optional aux layer), sets the uniforms and draws one frame. */
export const drawRig = (rig: GLRig, sources: readonly TexImageSource[], uniforms: Record<string, UniformValue>): void => {
  const { gl } = rig;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  const units = [gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2];
  sources.forEach((src, i) => {
    gl.activeTexture(units[i] as number);
    gl.bindTexture(gl.TEXTURE_2D, rig.tex[i as 0 | 1 | 2]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  });
  gl.uniform1i(uniformLoc(rig, 'uFrom'), 0);
  gl.uniform1i(uniformLoc(rig, 'uTo'), 1);
  gl.uniform1i(uniformLoc(rig, 'uAux'), 2);
  gl.uniform2f(uniformLoc(rig, 'uRes'), gl.drawingBufferWidth, gl.drawingBufferHeight);
  for (const [name, v] of Object.entries(uniforms)) {
    const l = uniformLoc(rig, name);
    if (typeof v === 'number') gl.uniform1f(l, v);
    else if (v.length === 2) gl.uniform2f(l, v[0] as number, v[1] as number);
    else if (v.length === 3) gl.uniform3f(l, v[0] as number, v[1] as number, v[2] as number);
    else if (v.length === 4) gl.uniform4f(l, v[0] as number, v[1] as number, v[2] as number, v[3] as number);
    else throw new Error(`uniform ${name}: unsupported length ${v.length}`);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};
