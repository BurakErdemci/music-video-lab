#!/usr/bin/env node
// The docs/rig.md section 6 measurements, printed as a PASS/FAIL table.
//
//   node tools/rigcheck.mjs [--no-render] [--quick] [--only numeric,sweep,pieces,pipes,helm,hands,determinism]
//
// Numeric checks (limits, transition rules, jumps, cadence, popping) run the pure rig functions straight from video/src/rig.
// Pixel checks render the ID pass of the test compositions (video/src/rig/RigTests.tsx; every card a flat unique colour,
// alpha = silhouette) and measure the PNGs with tools/rigcheck/analyze.py (uv run --with pillow --with numpy).
// --no-render reuses frames already in video/out/rig-check. Exit code 1 when any row is a FAIL.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { listFrames, makeRenderer, ROOT, withRenderLock } from './rigcheck/lib.mjs';
import { drive, forward, toPx } from '../video/src/rig/fk.ts';
import { apply } from '../video/src/rig/math.ts';
import { RIG, RIG_JSON } from '../video/src/rig/model.ts';
import { pipeGeom } from '../video/src/rig/pipes.ts';
import { declaredChangeFrames, isBigChange, LIMITS, prepare, rawChannelsAt, rigAt, STANDING_TY_MIN, swordInHand } from '../video/src/rig/timeline.ts';
import { jointPointH, RIG_TESTS, sweepList, sweepState, TEST_BY_ID } from '../video/src/rig/tests.ts';
import { FIGURE_PX, FLOOR_PX_Y, MISSING_FRAMES, RIG_STEP_FRAMES, ROOT_PX_X, WORLD_UNIT } from '../video/src/rig/constants.ts';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const only = new Set((args[args.indexOf('--only') + 1] ?? '').split(',').filter(Boolean));
const want = (g) => only.size === 0 || only.has(g);
const quick = flag('quick');
const noRender = flag('no-render');
const OUT = path.join(ROOT, 'video/out/rig-check');
const PUBLIC = path.join(ROOT, 'video/public');
const rows = [];
const timings = [];
const row = (id, measure, value, accept, pass, note = '') => rows.push({ id, measure, value, accept, pass, note });
const f2 = (x, d = 2) => (typeof x === 'number' ? x.toFixed(d) : String(x));

// ---------- helpers ----------
const noLife = new WeakMap();
const lifeOff = (tl) => { if (!noLife.has(tl)) noLife.set(tl, { ...tl, life: { scale: 0 } }); return noLife.get(tl); };
// A rig step = the pose changed: joints, hand variants, sword attachment, seating (cape, glow and pipe states have their own tracks).
const sigOf = (st) => JSON.stringify([st.ch, st.handR, st.handL, st.sword, st.seated]);
const px = (st, p) => toPx(st, p[0], p[1], FIGURE_PX, [ROOT_PX_X, FLOOR_PX_Y]);
const tlFrame = (T, n) => T.offset + n;
const stateOf = (T, n, life = true) => rigAt(RIG, life ? T.tl : lifeOff(T.tl), tlFrame(T, n));

/** Frames (composition n) on which the rig pose changes, from the life-off state. */
const stepFrames = (T, sig = sigOf) => {
  const out = [];
  let prev = null;
  for (let n = 0; n < T.frames; n++) {
    const s = sig(stateOf(T, n, false));
    if (prev !== null && s !== prev) out.push(n);
    prev = s;
  }
  return out;
};
/** Declared impact windows [start, arrival] (composition frames) of impact and cut keys. */
const impactWindows = (T) => {
  const pr = prepare(RIG, T.tl);
  const w = [];
  pr.keys.forEach((k, j) => { if (j > 0 && (k.impact || k.cut)) w.push([pr.starts[j] - T.offset - 1, k.at - T.offset + 1]); });
  return w;
};
const inWindow = (ws, n) => ws.some(([a, b]) => n >= a && n <= b);

// ---------- numeric checks ----------
const numeric = () => {
  // I: limits
  const pairs = [['uaR', LIMITS.ua], ['uaL', LIMITS.ua], ['fR', LIMITS.f], ['fL', LIMITS.f], ['hR', LIMITS.h], ['hL', LIMITS.h], ['legR', LIMITS.leg], ['legL', LIMITS.leg],
    ['torso', LIMITS.torso], ['pelvisRot', LIMITS.pelvisRot], ['pelvisTy', LIMITS.pelvisTy], ['headRot', LIMITS.headRot], ['headSink', LIMITS.headSink],
    ['wingRot', LIMITS.wingRot], ['rootRot', LIMITS.rootRot], ['crownRot', [-8, 8]]];
  let checked = 0;
  let anticClamped = 0;
  const viol = [];
  const check = (label, ch, seated) => {
    for (const [k, [lo, hi]] of pairs) if (ch[k] < lo - 1e-9 || ch[k] > hi + 1e-9) viol.push(`${label}:${k}=${f2(ch[k], 3)}`);
    if (!seated && ch.pelvisTy < STANDING_TY_MIN - 1e-9) viol.push(`${label}:standing pelvisTy ${f2(ch.pelvisTy, 3)}`);
    checked++;
  };
  for (const [name, def] of Object.entries(RIG_JSON.poses)) {
    const tl = { keys: [{ at: 0, pose: name, dur: 0 }] };
    check(`pose ${name}`, rawChannelsAt(RIG, tl, 0), !!def.seated);
  }
  for (const T of RIG_TESTS) {
    for (let n = 0; n < T.frames; n++) {
      const st = stateOf(T, n);
      check(`${T.id}@${n}`, st.ch, st.seated);
      const raw = rawChannelsAt(RIG, T.tl, tlFrame(T, n));
      if (pairs.some(([k, [lo, hi]]) => raw[k] < lo - 1e-9 || raw[k] > hi + 1e-9)) anticClamped++;
    }
  }
  row('I', 'limits: every joint, every frame of every timeline (as rendered, life layer included) + every pose', `${viol.length} violations in ${checked} evaluations`, '0', viol.length === 0, `${anticClamped} frames where the strike anticipation overshoot was clamped to the limit (section 5.2)${viol.length ? '; ' + viol.slice(0, 3).join('; ') : ''}`);
  const bad = [];
  for (const [name, def] of Object.entries(RIG_JSON.poses)) {
    if (def.sword !== 'hand_R' || def.swordDir === undefined) continue;
    const phi = swordInHand(RIG, def).phi + def.torso + def.pelvis[0]; // the table is relative to the torso and pelvis lean
    const d = ((phi - def.swordDir + 540) % 360) - 180;
    if (Math.abs(d) > 0.5) bad.push(`${name}: table ${def.swordDir} vs a-f+h+95 = ${f2(phi, 1)}`);
  }
  row('5.1', 'sword dir column == a - f + h + 95 for every hand-held pose', `${bad.length} mismatches`, '0', bad.length === 0, bad.join('; '));

  // transition rules
  const rule = [];
  let edges = 0;
  for (const T of RIG_TESTS) {
    const pr = prepare(RIG, T.tl);
    pr.keys.forEach((k, j) => {
      if (j === 0) return;
      edges++;
      const a = pr.defs[j - 1], b = pr.defs[j];
      const dur = k.at - pr.starts[j];
      const lab = `${T.id} key ${j} (${typeof k.pose === 'string' ? k.pose : 'partial'}@${k.at})`;
      if (!k.cut && dur < 12) rule.push(`${lab}: dur ${dur} < 12`);
      if (!k.cut && isBigChange(a, b) && (dur < 18 || dur > 30)) rule.push(`${lab}: big change needs 18-30, has ${dur}`);
      if (pr.starts[j] - pr.keys[j - 1].at < 30) rule.push(`${lab}: hold ${pr.starts[j] - pr.keys[j - 1].at} < 30`);
      if (!!a.seated !== !!b.seated && !k.cut) rule.push(`${lab}: sit_alone edge must be a cut`);
      if (a.sword === 'ground' && b.sword === 'hand_R' && !k.cut) {
        const g = pr.ground[j - 1], h = swordInHand(RIG, b);
        const d = Math.hypot(g.x - h.x, g.y - h.y) * FIGURE_PX;
        if (d > 4) rule.push(`${lab}: sword re-attach grip ${f2(d, 1)} px apart (> 4)`);
      }
    });
  }
  row('5.2', 'transition rules: min 12, big 18-30, hold >= 30, cut-only edges, sword re-attach <= 4 px', `${rule.length} violations over ${edges} edges`, '0', rule.length === 0, rule.slice(0, 3).join('; '));

  // G jumps + H cadence + F popping, per test
  const THR = 0.06 * FIGURE_PX;
  let worst = { d: 0, what: '' };
  let spikes = 0;
  let over = 0;
  let stepsTotal = 0;
  const overBy = { hand: 0, head: 0, sword: 0 };
  const intervals = new Map();
  let undeclared = 0;
  const undeclaredList = [];
  for (const T of RIG_TESTS) {
    const steps = stepFrames(T);
    const jointSteps = stepFrames(T, (st) => JSON.stringify([st.ch, st.sword.ground, st.sword.attach, st.seated])); // hand crossfades run on ones by design
    const ws = impactWindows(T);
    // G
    const tip = (st) => {
      const fk = forward(RIG, st);
      const t = (id, x, y) => px(st, apply(fk.get(id), x, y));
      return { handR: t('hand_R', 0, -0.1), handL: t('hand_L', 0, -0.1), head: t('crown', 0, 0.065), sword: t('sword', 0, -RIG_JSON.bladeBelow) };
    };
    const seq = [0, ...steps].map((n) => ({ n, t: tip(stateOf(T, n)) }));
    for (let i = 1; i < seq.length; i++) {
      if (inWindow(ws, seq[i].n)) continue;
      for (const k of Object.keys(seq[i].t)) {
        const d = Math.hypot(seq[i].t[k][0] - seq[i - 1].t[k][0], seq[i].t[k][1] - seq[i - 1].t[k][1]);
        if (d > worst.d) worst = { d, what: `${T.id} ${k} step to frame ${seq[i].n}` };
        stepsTotal++;
        if (d > THR) { over++; overBy[k.startsWith('hand') ? 'hand' : k]++; }
        if (i + 1 < seq.length && !inWindow(ws, seq[i + 1].n)) {
          const d1 = [seq[i].t[k][0] - seq[i - 1].t[k][0], seq[i].t[k][1] - seq[i - 1].t[k][1]];
          const d2 = [seq[i + 1].t[k][0] - seq[i].t[k][0], seq[i + 1].t[k][1] - seq[i].t[k][1]];
          if (Math.hypot(...d1) > THR / 2 && Math.hypot(...d2) > THR / 2 && d1[0] * d2[0] + d1[1] * d2[1] < 0 && Math.hypot(d1[0] + d2[0], d1[1] + d2[1]) < 0.3 * Math.hypot(...d1)) spikes++;
        }
      }
    }
    // H: intervals between rig steps inside transitions
    const pr = prepare(RIG, T.tl);
    pr.keys.forEach((k, j) => {
      if (j === 0 || k.cut) return;
      const a = pr.starts[j] - T.offset, b = k.at - T.offset;
      const inside = jointSteps.filter((n) => n >= a && n <= b);
      for (let i = 1; i < inside.length; i++) intervals.set(inside[i] - inside[i - 1], (intervals.get(inside[i] - inside[i - 1]) ?? 0) + 1);
    });
    // F: popping (state level): any change of visibility, texture or z outside the declared frames
    const declared = declaredChangeFrames(RIG, T.tl);
    let prev = null;
    for (let n = 0; n < T.frames; n++) {
      const st = stateOf(T, n);
      const vis = new Map();
      for (const node of RIG.nodes) {
        const dr = drive(node, st);
        for (const c of dr.cards) vis.set(`${node.id}/${c.slot}`, !dr.hidden && c.opacity >= 0.5 ? 1 : 0);
        vis.set(`${node.id}/z`, node.def.driver === 'sword' ? `${st.sword.z}${st.sword.attach}` : node.z);
      }
      for (const side of ['R', 'L']) {
        const w = st.wings[side];
        vis.set(`wm_${side}`, w.deleted >= 0.5 ? 1 : 0);
        w.pipes.forEach((p, i) => vis.set(`pipe_${side}${i}`, `${p.body}${p.mouth}${p.checker}${p.cork.show}${p.glow >= 0.5}`));
      }
      if (prev) for (const [k, v] of vis) if (prev.get(k) !== v && !declared.has(tlFrame(T, n)) && !declared.has(tlFrame(T, n) - 1)) { undeclared++; if (undeclaredList.length < 3) undeclaredList.push(`${T.id}@${n} ${k}`); }
      prev = vis;
    }
  }
  row('G', `largest one-step move of hand/head/sword tips outside impact steps (${THR.toFixed(0)} px = 0.06 H)`, `${f2(worst.d, 1)} px; steps over: ${over}/${stepsTotal} (hand ${overBy.hand}, head ${overBy.head}, sword ${overBy.sword})`, `<= ${THR.toFixed(0)} px`, worst.d <= THR, worst.what + '; a 24-30 frame swing of a 0.7 H sword or a 180 deg arm cannot stay under it');
  row('G2', 'single-frame spikes (a move followed by its reverse)', `${spikes}`, '0', spikes === 0);
  const iv = [...intervals.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}f x${v}`).join(', ');
  const total = [...intervals.entries()].reduce((s, [k, v]) => s + k * v, 0);
  const cnt = [...intervals.values()].reduce((s, v) => s + v, 0);
  const fps = cnt ? (30 * cnt) / total : 0;
  row('H', 'cadence: distinct rig poses per second during transitions', `${f2(fps, 1)} fps (intervals: ${iv})`, `${30 / RIG_STEP_FRAMES} (true twos, section 9; the 12 of table 6.2 is superseded)`, Math.abs(fps - 30 / RIG_STEP_FRAMES) < 0.5);
  row('F-state', 'popping (state level): texture/visibility/z changes outside the declared event frames', `${undeclared} undeclared`, '0', undeclared === 0, undeclaredList.join('; '));

  // K (state level, life on): one deletion at a time
  const T = TEST_BY_ID.get('RigPipes');
  let kBad = 0;
  for (const e of T.tl.pipes.filter((x) => x.op === 'delete')) {
    const v = e.at + MISSING_FRAMES;
    const a = rigAt(RIG, T.tl, v - 1), b = rigAt(RIG, T.tl, v);
    for (const side of ['R', 'L']) a.wings[side].pipes.forEach((p, i) => {
      const q = b.wings[side].pipes[i];
      const changed = p.body !== q.body || p.mouth !== q.mouth;
      const mine = side === e.wing && i === e.pipe;
      if (changed !== mine) kBad++;
    });
  }
  row('K-state', 'one deletion at a time: at each vanish frame only that pipe changes visibility', `${kBad} other pipes changed`, '0', kBad === 0);

  // N
  for (const [label, n, tName] of [['base', 100, 'RigTurntable'], ['slump', 336, 'RigTurntable']]) {
    const Tt = TEST_BY_ID.get(tName);
    const st = stateOf(Tt, n, false);
    const fk = forward(RIG, st);
    const tip = px(st, apply(fk.get('sword'), 0, -RIG_JSON.bladeBelow));
    const d = tip[1] - FLOOR_PX_Y;
    row('N', `sword tip vs floor in ${label} (positive = below the floor)`, `${f2(d, 1)} px`, '|d| <= 3 px', Math.abs(d) <= 3,
      label === 'slump' ? 'pose table geometry: pelvis -0.03 H and a 55 deg elbow put the grip 0.09 H lower than in base, so the sword tip ends below the floor' : '');
  }
};

// ---------- pixel checks ----------
const python = (ops) => {
  const spec = { palette: RIG_JSON.idColors, ops };
  const r = spawnSync('uv', ['run', '--with', 'pillow', '--with', 'numpy', 'python', '-I', path.join(ROOT, 'tools/rigcheck/analyze.py')], { input: JSON.stringify(spec), encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`analyze.py failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
};

/** Same as python() for one op whose frame list is split over several processes. */
const pythonSplit = async (op, key, parts = 3) => {
  const list = op[key];
  const size = Math.ceil(list.length / parts);
  const chunks = [];
  for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size));
  const runs = chunks.map((c) => new Promise((resolve, reject) => {
    const child = spawn('uv', ['run', '--with', 'pillow', '--with', 'numpy', 'python', '-I', path.join(ROOT, 'tools/rigcheck/analyze.py')]);
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => (code === 0 ? resolve(JSON.parse(out)[0]) : reject(new Error(err))));
    child.stdin.end(JSON.stringify({ palette: RIG_JSON.idColors, ops: [{ ...op, [key]: c }] }));
  }));
  return (await Promise.all(runs)).flat();
};

const ensure = async (id, from, to) => {
  const dir = path.join(OUT, id);
  const have = new Set(listFrames(dir));
  let missing = false;
  for (let f = from; f <= to; f++) if (!have.has(`frame-${String(f).padStart(5, '0')}.png`)) { missing = true; break; }
  if (missing && !noRender) {
    // one Chrome at a time repo-wide: hold the lock only while rendering, close the browser before measuring
    const ms = await withRenderLock(async () => {
      const rr = await makeRenderer();
      try { return await rr.frames(id, 'id', dir, from, to); } finally { await rr.close(); }
    });
    timings.push([id, to - from + 1, ms]);
    console.log(`rendered ${id} ${from}-${to}: ${ms} ms`);
  } else if (missing) throw new Error(`--no-render but frames missing for ${id}`);
  return dir;
};

// Project a root-space point of the rig to pixels for a camera yaw (the preview framing: 6 world units tall, fov 40).
const D = 3 / Math.tan((20 * Math.PI) / 180);
const project = (st, p, dz, yawDeg) => {
  const r = (st.ch.rootRot * Math.PI) / 180;
  const x = st.ch.rootScale * (p[0] * Math.cos(r) - p[1] * Math.sin(r)) + st.ch.rootX;
  const y = st.ch.rootScale * (p[0] * Math.sin(r) + p[1] * Math.cos(r)) + st.ch.rootY;
  const X = x * WORLD_UNIT, Y = -WORLD_UNIT / 2 + y * WORLD_UNIT, Z = (st.ch.rootZ + dz) * WORLD_UNIT;
  const yw = (yawDeg * Math.PI) / 180;
  const depth = D - (X * Math.sin(yw) + Z * Math.cos(yw));
  const xr = X * Math.cos(yw) - Z * Math.sin(yw);
  const t = depth * Math.tan((20 * Math.PI) / 180);
  return [960 + (xr / t) * 540, 540 - (Y / t) * 540];
};

const sweepChecks = async () => {
  const all = sweepList(RIG, false);
  const dir = await ensure('RigSweep', 0, all.length - 1);
  const items = [];
  const entries = [];
  all.forEach((e, i) => {
    if (!e.parent || (quick && e.kind === 'pipe' && e.index % 2)) return;
    const st = sweepState(RIG, e);
    const [x, y] = px(st, jointPointH(RIG, e, st));
    entries.push({ frame: i, cx: x, cy: y, r: e.radiusPx });
    items.push(e);
  });
  const [res] = python([{ op: 'joints', dir, entries }]);
  const byJoint = new Map();
  res.forEach((r, i) => {
    const e = items[i];
    const k = e.joint;
    const o = byJoint.get(k) ?? { holes: 0, notch: 0, nonbridge: 0, n: 0, worstNotch: null, bridgeAt: null };
    o.n++;
    o.holes = Math.max(o.holes, r.holes);
    if (r.notch > o.notch) { o.notch = r.notch; o.worstNotch = e.value; }
    if (r.pieces !== 1) { o.nonbridge++; o.bridgeAt ??= e.value; }
    byJoint.set(k, o);
  });
  const joints = [...byJoint.entries()];
  const maxHoles = Math.max(...joints.map(([, o]) => o.holes));
  const maxNotch = joints.reduce((a, [k, o]) => (o.notch > a.v ? { v: o.notch, k, at: o.worstNotch } : a), { v: 0, k: '', at: 0 });
  const nbJoints = joints.filter(([, o]) => o.nonbridge > 0);
  const notchFail = joints.filter(([, o]) => o.notch > 30);
  row('A', `joint gap: holes in parent+child union within 1.5 r (${all.filter((e) => e.parent).length} sweep frames, ${joints.length} joints)`, `max ${maxHoles} px`, '0', maxHoles === 0,
    joints.filter(([, o]) => o.holes > 0).map(([k, o]) => `${k}:${o.holes}`).slice(0, 4).join(' '));
  row('B', 'joint notch: closing(6 px) minus union inside 1.5 r', `max ${maxNotch.v} px (${maxNotch.k} at ${maxNotch.at})`, '<= 30 px', notchFail.length === 0,
    notchFail.slice(0, 5).map(([k, o]) => `${k}:${o.notch}@${o.worstNotch}`).join(' '));
  row('C', 'joint bridge: union eroded 3 px stays one piece at every angle', `${nbJoints.length} joints broken`, '0', nbJoints.length === 0,
    nbJoints.slice(0, 5).map(([k, o]) => `${k}: ${o.nonbridge} angles from ${o.bridgeAt}`).join(' '));
  row('sweep', `joints swept (spec text says 39; its own list adds up to 41 with the cardless root)`, `${new Set(all.map((e) => e.joint)).size} joints with a card (root has none), ${all.length} frames`, 'info', true);
};

const testChecks = async (ids) => {
  for (const id of ids) {
    const T = TEST_BY_ID.get(id);
    const dir = await ensure(id, 0, T.frames - 1);
    const ws = impactWindows(T);
    // D: pieces
    const frames = [];
    for (let n = 0; n < T.frames; n++) {
      const st = stateOf(T, n);
      const extra = [];
      for (const s of ['R', 'L']) for (let i = 0; i < 8; i++) extra.push(`wm_${s}${i}_body`, `wm_${s}${i}_mouth`, `pipe_${s}${i}_cork`);
      if (st.helm.split && st.helm.t > 0.001) extra.push('helm_half_R', 'helm_half_L', 'crown_half_R', 'crown_half_L');
      if (st.sword.attach === 'ground') extra.push('sword', 'sword_runes');
      frames.push({ frame: n, extra });
    }
    const steps = [0, ...stepFrames(T)].filter((n) => n < T.frames);
    const pieces = await pythonSplit({ op: 'pieces', dir, frames }, 'frames');
    const [iou] = python([{ op: 'iou', dir, frames: steps }]);
    const badP = pieces.filter((p) => p.pieces !== 1);
    row('D', `${id}: silhouette pieces (declared extras removed) = 1 on all ${T.frames} frames`, badP.length ? `${badP.length} frames differ` : 'all 1', '= declared', badP.length === 0,
      badP.slice(0, 4).map((p) => `f${p.frame}:${p.pieces}`).join(' '));
    const meas = iou.filter((r) => !inWindow(ws, r.frame));
    const worst = meas.reduce((a, r) => (r.iou < a.iou ? r : a), { iou: 2, frame: -1 });
    row('E', `${id}: silhouette IoU of consecutive rig steps (${meas.length} steps, ${iou.length - meas.length} declared impact steps skipped)`, `min ${f2(worst.iou, 3)} at f${worst.frame}`, '>= 0.85', worst.iou >= 0.85);
    // F render: hidden parts leave no pixels (sampled)
    const hid = [];
    for (let n = 0; n < T.frames; n += 4) {
      const st = stateOf(T, n);
      const ids2 = [];
      for (const node of RIG.nodes) {
        const dr = drive(node, st);
        if (dr.hidden || dr.cards.every((c) => c.opacity < 0.5)) ids2.push(node.id);
      }
      for (const s of ['R', 'L']) st.wings[s].pipes.forEach((p, i) => {
        if (!p.body) ids2.push(`pipe_${s}${i}_body`);
        if (!p.mouth || p.glow < 0.5) ids2.push(`pipe_${s}${i}_glow`);
        if (!p.cork.show) ids2.push(`pipe_${s}${i}_cork`);
      });
      hid.push({ frame: n, ids: ids2 });
    }
    const hidden = await pythonSplit({ op: 'hidden', dir, frames: hid }, 'frames');
    const leaks = hidden.filter((h) => Object.keys(h.leaked).length);
    row('F', `${id}: parts the state hides leave 0 ID pixels (${hid.length} sampled frames)`, `${leaks.length} frames with leaks`, '0', leaks.length === 0, leaks.slice(0, 2).map((h) => `f${h.frame} ${JSON.stringify(h.leaked)}`).join(' '));
  }
};

const fanJ = async () => {
  for (const id of ['RigFan', 'RigFanYaw']) {
    const T = TEST_BY_ID.get(id);
    const dir = await ensure(id, 0, T.frames - 1);
    const frames = [];
    for (let n = 0; n < T.frames; n += 3) {
      const st = stateOf(T, n);
      const fk = forward(RIG, st);
      const yaw = T.yaw ? T.yaw(n) : 0;
      const items = [];
      for (const side of ['R', 'L']) {
        const wing = fk.get(`wing_root_${side}`);
        RIG_JSON.pipes.items.forEach((it) => {
          const ps = st.wings[side].pipes[it.i];
          const g = pipeGeom(RIG_JSON.pipes, it, ps.theta, ps.lengthScale, 0);
          const [x, y] = project(st, apply(wing, g.root[0], g.root[1]), RIG_JSON.pipes.dz, yaw);
          items.push({ id: `pipe_${side}${it.i}_body`, x, y, r: 0.03 * FIGURE_PX });
        });
      }
      frames.push({ frame: n, items });
    }
    const [res] = python([{ op: 'near', dir, frames }]);
    const bad = res.filter((r) => Object.keys(r.visible_near_root).length);
    row('J', `${id}: pipe roots hidden (ID pixels of a pipe body within 0.03 H of its root), ${frames.length} frames`, `${bad.length} frames with visible roots`, '0 px', bad.length === 0,
      bad.slice(0, 2).map((r) => `f${r.frame} ${JSON.stringify(r.visible_near_root)}`).join(' '));
  }
};

const pipeChecks = async () => {
  const T = TEST_BY_ID.get('RigPipes');
  const dir = await ensure('RigPipes', 0, T.frames - 1);
  // K render: at the vanish frame only that pipe's pixels change (life layer is off in this test)
  const dels = T.tl.pipes.filter((e) => e.op === 'delete');
  const pairs = dels.map((e) => ({ a: e.at + MISSING_FRAMES - 1 - T.offset, b: e.at + MISSING_FRAMES - T.offset }));
  const [diff] = python([{ op: 'diff', dir, pairs }]);
  let bad = 0;
  let mixed = 0;
  diff.forEach((d, i) => {
    const e = dels[i];
    const mine = new Set([`pipe_${e.wing}${e.pipe}_body`, `pipe_${e.wing}${e.pipe}_mouth`, `pipe_${e.wing}${e.pipe}_glow`, 'mixed/none']);
    if (d.changed === 0) bad++;
    for (const [k, v] of Object.entries(d.by_before)) { if (!mine.has(k)) bad += v; if (k === 'mixed/none') mixed += v; }
  });
  row('K', 'one deletion at a time (ID pass, 10 deletions): changed pixels all belong to the deleted pipe', `${bad} foreign pixels (${mixed} edge pixels)`, 'exact (0 foreign)', bad === 0);
  // L: cork seat
  const corks = T.tl.pipes.filter((e) => e.op === 'cork');
  const frames = corks.map((e) => ({ frame: e.at - T.offset, id: `pipe_${e.wing}${e.pipe}_cork` }));
  const [cent] = python([{ op: 'centroid', dir, frames }]);
  let worst = 0;
  let missing = 0;
  cent.forEach((c, i) => {
    const e = corks[i];
    const st = rigAt(RIG, lifeOff(T.tl), e.at);
    const fk = forward(RIG, st);
    const it = RIG_JSON.pipes.items[e.pipe];
    const ps = st.wings[e.wing].pipes[e.pipe];
    const g = pipeGeom(RIG_JSON.pipes, it, ps.theta, ps.lengthScale, ps.fly);
    const seat = apply(fk.get(`wing_root_${e.wing}`), g.root[0] + g.dir[0] * g.corkSeat, g.root[1] + g.dir[1] * g.corkSeat);
    const [sx, sy] = project(st, seat, RIG_JSON.pipes.dz, 0);
    if (c.cx === null) { missing++; return; }
    worst = Math.max(worst, Math.hypot(c.cx - sx, c.cy - sy));
  });
  row('L', `cork seat: cork centroid vs mouth seat target on the pop frame (${corks.length} corks)`, `max ${f2(worst, 2)} px${missing ? `, ${missing} corks not visible` : ''}`, '<= 2 px', worst <= 2 && missing === 0);
};

const helmChecks = async () => {
  const T = TEST_BY_ID.get('RigHelm');
  const dir = await ensure('RigHelm', 0, T.frames - 1);
  const [xor] = python([{ op: 'maskxor', dir, a: 59, b: 60, idsA: ['head', 'crown', 'eye_slit', 'crown_gems'], idsB: ['helm_half_R', 'helm_half_L', 'crown_half_R', 'crown_half_L'] }]);
  row('M', 'helm split: halves at t=0 vs the closed helm (silhouette of helm + crown, ID pass), xor pixels', `${xor.xor} px (of ${xor.areaA})`, 'identical', xor.xor === 0, 'no-hole check over t in [0,1] is row A (halves + void_head sweep)');
};

const handsAndFloor = async () => {
  const T = TEST_BY_ID.get('RigTurntable');
  const st = stateOf(T, 100, false);
  const fk = forward(RIG, st);
  const cardM = (id, slot) => {
    const node = RIG.nodes.find((n) => n.id === id);
    const t = RIG_JSON.textures[slot];
    const M = fk.get(node.id);
    const h = RIG.hpx;
    const k = FIGURE_PX;
    const [ox, oy] = [ROOT_PX_X, FLOOR_PX_Y];
    return { src: t.src, m: [k * M[0] * h, -k * M[1] * h, -k * M[2] * h, k * M[3] * h, ox + k * (-M[0] * t.pivot[0] * h + M[2] * t.pivot[1] * h + M[4]), oy - k * (-M[1] * t.pivot[0] * h + M[3] * t.pivot[1] * h + M[5])] };
  };
  const [ov] = python([{ op: 'overlap', public: PUBLIC, items: [{ name: 'hands', cards: [cardM('hand_R', 'hand_grip'), cardM('hand_L', 'hand_fist')] }] }]);
  row('O', 'hands meet in base: hand_R and hand_L card alpha overlap', `${ov[0].overlap} px`, '> 0 px', ov[0].overlap > 0);
  const dir = await ensure('RigTurntable', 0, T.frames - 1);
  const [c] = python([{ op: 'centroid', dir, frames: [{ frame: 100, id: 'sword' }] }]);
  row('N-render', 'sword lowest ID pixel row in base (floor row ' + FLOOR_PX_Y + ')', `row ${c[0].ymax} (${c[0].ymax - FLOOR_PX_Y} px)`, '|d| <= 3 px', Math.abs(c[0].ymax - FLOOR_PX_Y) <= 3);
};

const determinism = async () => {
  const T = TEST_BY_ID.get('RigTurntable');
  const main = await ensure('RigTurntable', 0, T.frames - 1); // rendered with 4 parallel tabs
  const [f0, f1] = [200, 239];
  const same1 = path.join(OUT, 'det-one-a');
  const same2 = path.join(OUT, 'det-one-b');
  await withRenderLock(async () => {
    const rr = await makeRenderer({ concurrency: 1 });
    try {
      await rr.frames('RigTurntable', 'id', same1, f0, f1, 1);
      await rr.frames('RigTurntable', 'id', same2, f0, f1, 1);
    } finally { await rr.close(); }
  });
  const names = Array.from({ length: f1 - f0 + 1 }, (_, i) => `frame-${String(f0 + i).padStart(5, '0')}.png`);
  const [ha, hb, hc] = python([
    { op: 'md5', files: names.map((n) => path.join(same1, n)) },
    { op: 'md5', files: names.map((n) => path.join(same2, n)) },
    { op: 'md5', files: names.map((n) => path.join(main, n)) },
  ]);
  const diffAB = ha.filter((x, i) => x.pixels !== hb[i].pixels).length;
  row('P', `determinism: the same ${names.length} frames rendered twice with the same settings (1 tab, same order), md5 of decoded pixels`, `${diffAB} differ`, 'identical', diffAB === 0);
  const [pd] = python([{ op: 'pixdiff', pairs: names.map((n) => [path.join(same1, n), path.join(main, n)]) }]);
  const diffC = pd.filter((d) => d.px > 0);
  const worst = Math.max(0, ...pd.map((d) => d.px));
  row('P-tabs', `determinism across tab layouts: 1 tab vs 4 parallel tabs, same ${names.length} frames`, `${diffC.length} frames differ, at most ${worst} px (${((100 * worst) / 280000).toFixed(4)} % of the silhouette), max channel step ${Math.max(0, ...pd.map((d) => d.max))}`, 'identical', diffC.length === 0,
    'Chrome/ANGLE edge-pixel noise that depends on which tab rendered the previous frame; reproducible for a fixed render command');
};

const main = async () => {
  const t0 = Date.now();
  if (want('numeric')) numeric();
  if (want('sweep')) await sweepChecks();
  if (want('pieces')) await testChecks(['RigTurntable', 'RigTurntableYaw', 'RigFan', 'RigFanYaw', 'RigGlow', 'RigHelm', 'RigPipes', 'AttackGallery']);
  if (want('pipes')) { await fanJ(); await pipeChecks(); }
  if (want('helm')) await helmChecks();
  if (want('hands')) await handsAndFloor();
  if (want('determinism')) await determinism();
  const w = [Math.max(...rows.map((r) => r.id.length)), 0];
  console.log('\nrigcheck (life layer ON in turntable, fan and attack tests)');
  for (const r of rows) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(w[0])}  ${r.measure}  ->  ${r.value}   [accept ${r.accept}]${r.note ? `   (${r.note})` : ''}`);
  const fails = rows.filter((r) => !r.pass).length;
  console.log(`\n${rows.length - fails} PASS, ${fails} FAIL`);
  if (timings.length) console.log('render times: ' + timings.map(([id, n, ms]) => `${id} ${n} frames ${(ms / 1000).toFixed(0)} s (${(ms / n).toFixed(0)} ms/frame)`).join('; '));
  console.log(`total ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  process.exit(fails ? 1 : 0);
};
main().catch((e) => { console.error(e); process.exit(2); });
