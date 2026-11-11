// Cars, built like real ones: a body lofted through cross-sections along its length (so it has shoulders, a cabin
// that narrows towards the roof, rounded ends and flared arches), with glass where the windows are, then wheels,
// lights and a grille. The shapes follow real saloons and sports cars closely; there are no badges.
import * as THREE from 'three';
import { geo, mat, smat, mesh, box, rbox, cyl, PI } from './three-helpers.js';

// A smooth curve through [u, value] keys (monotone cubic, so it never overshoots between keys)
function curve(keys) {
  const n = keys.length, xs = keys.map(k => k[0]), ys = keys.map(k => k[1]);
  const d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return u => {
    if (u <= xs[0]) return ys[0];
    if (u >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (u > xs[i + 1]) i++;
    const hh = xs[i + 1] - xs[i], t = (u - xs[i]) / hh, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * hh * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * hh * m[i + 1];
  };
}

// Each model: length L (rear at u = 0, nose at u = 1); half-width, the line of the bonnet / boot / waist (deck),
// the roof over the cabin, the underside, how far the wings rise above the bonnet (lift), the roof's half-width,
// where the axles are, which bits of the side glass are pillars, and its lights and grille.
// Sizes are a real car at half scale (the town's people are a little bigger than life next to them).
const MODELS = {
  // A compact executive saloon after the BMW 3 Series (G20): 4.71 m long, 1.44 m high, a long bonnet, the cabin set
  // back, a short high boot, twin kidney grille, L-shaped tail lamps
  three: {
    L: 2.355, cabW: 0.335, axles: [0.212, 0.824], r: 0.17, grille: 'kidney', head: 'slim', tail: 'l', rims: 'double',
    hw: [[0, 0.4], [0.03, 0.44], [0.08, 0.455], [0.21, 0.463], [0.4, 0.45], [0.6, 0.45], [0.82, 0.459], [0.93, 0.448], [0.975, 0.42], [1, 0.38]],
    deck: [[0, 0.4], [0.015, 0.47], [0.05, 0.5], [0.15, 0.51], [0.25, 0.512], [0.4, 0.5], [0.55, 0.493], [0.69, 0.497], [0.78, 0.47], [0.88, 0.43], [0.95, 0.405], [0.985, 0.385], [1, 0.35]],
    roof: [[0.235, 0.512], [0.27, 0.58], [0.32, 0.66], [0.37, 0.703], [0.45, 0.72], [0.53, 0.716], [0.57, 0.69], [0.62, 0.62], [0.67, 0.54], [0.7, 0.497]],
    bot: [[0, 0.12], [0.03, 0.085], [0.08, 0.075], [0.92, 0.075], [0.975, 0.085], [1, 0.11]],
    lift: [[0, 0], [0.75, 0], [0.9, 0.01], [1, 0]],
    screens: [[0.24, 0.355], [0.575, 0.7]], pillars: [[0.235, 0.31], [0.49, 0.515]],
  },
  // A mid-size saloon after the Audi A4 (B9): crisp, level shoulders, a long flat roof, a big single-frame grille
  four: {
    L: 2.38, cabW: 0.34, axles: [0.221, 0.813], r: 0.17, grille: 'frame', head: 'slim', tail: 'wide', rims: 'multi',
    hw: [[0, 0.41], [0.03, 0.445], [0.08, 0.456], [0.22, 0.46], [0.5, 0.455], [0.81, 0.46], [0.93, 0.45], [0.975, 0.425], [1, 0.385]],
    deck: [[0, 0.41], [0.015, 0.475], [0.05, 0.505], [0.15, 0.515], [0.25, 0.515], [0.4, 0.5], [0.55, 0.495], [0.7, 0.495], [0.79, 0.47], [0.88, 0.435], [0.95, 0.41], [0.985, 0.39], [1, 0.355]],
    roof: [[0.235, 0.515], [0.27, 0.585], [0.315, 0.665], [0.37, 0.705], [0.45, 0.715], [0.55, 0.712], [0.59, 0.69], [0.635, 0.62], [0.68, 0.545], [0.705, 0.495]],
    bot: [[0, 0.12], [0.03, 0.085], [0.08, 0.075], [0.92, 0.075], [0.975, 0.085], [1, 0.11]],
    lift: [[0, 0], [1, 0]],
    screens: [[0.24, 0.355], [0.585, 0.705]], pillars: [[0.235, 0.3], [0.495, 0.52]],
  },
  // The estate (A4 Avant): the roof runs on to a gently sloping tailgate, roof rails
  avant: {
    L: 2.39, cabW: 0.34, axles: [0.221, 0.813], r: 0.17, grille: 'frame', head: 'slim', tail: 'wide', rims: 'multi', rails: true,
    hw: [[0, 0.415], [0.03, 0.445], [0.08, 0.456], [0.22, 0.46], [0.5, 0.455], [0.81, 0.46], [0.93, 0.45], [0.975, 0.425], [1, 0.385]],
    deck: [[0, 0.41], [0.015, 0.475], [0.04, 0.5], [0.15, 0.51], [0.25, 0.51], [0.4, 0.5], [0.55, 0.495], [0.7, 0.495], [0.79, 0.47], [0.88, 0.435], [0.95, 0.41], [0.985, 0.39], [1, 0.355]],
    roof: [[0.025, 0.5], [0.045, 0.6], [0.075, 0.665], [0.12, 0.69], [0.3, 0.706], [0.45, 0.715], [0.55, 0.712], [0.59, 0.69], [0.635, 0.62], [0.68, 0.545], [0.705, 0.495]],
    bot: [[0, 0.12], [0.03, 0.085], [0.08, 0.075], [0.92, 0.075], [0.975, 0.085], [1, 0.11]],
    lift: [[0, 0], [1, 0]],
    screens: [[0.03, 0.085], [0.585, 0.705]], pillars: [[0.025, 0.105], [0.25, 0.275], [0.495, 0.52]],
  },
  // A sports saloon after the Alfa Romeo Giulia: low and taut, a long bonnet, a short high tail, a central shield
  // with wide intakes either side, swept-back lamps
  giulia: {
    L: 2.32, cabW: 0.325, axles: [0.232, 0.839], r: 0.175, grille: 'shield', head: 'swept', tail: 'round', rims: 'phone',
    hw: [[0, 0.39], [0.03, 0.44], [0.1, 0.458], [0.23, 0.466], [0.4, 0.45], [0.6, 0.448], [0.84, 0.459], [0.93, 0.445], [0.975, 0.41], [1, 0.37]],
    deck: [[0, 0.42], [0.015, 0.49], [0.05, 0.52], [0.15, 0.53], [0.25, 0.522], [0.4, 0.5], [0.55, 0.49], [0.69, 0.49], [0.78, 0.465], [0.88, 0.425], [0.95, 0.395], [0.985, 0.37], [1, 0.33]],
    roof: [[0.25, 0.522], [0.29, 0.6], [0.34, 0.67], [0.4, 0.705], [0.47, 0.715], [0.54, 0.71], [0.58, 0.685], [0.63, 0.61], [0.675, 0.53], [0.695, 0.49]],
    bot: [[0, 0.12], [0.03, 0.08], [0.08, 0.07], [0.92, 0.07], [0.975, 0.08], [1, 0.1]],
    lift: [[0, 0], [0.12, 0.008], [0.25, 0], [0.8, 0], [0.92, 0.014], [1, 0]],
    screens: [[0.255, 0.39], [0.58, 0.695]], pillars: [[0.25, 0.33], [0.5, 0.525]],
  },
  // A rear-engined sports car after the Porsche 911 (992): 4.52 m long and 1.30 m high, a low bonnet between raised
  // wings carrying round lamps, a roof that falls in one curve over the engine, wide rear hips, a light bar across
  // the tail, a little spoiler
  nine: {
    L: 2.26, cabW: 0.31, axles: [0.245, 0.79], r: 0.178, grille: 'intakes', head: 'round', tail: 'bar', rims: 'five', spoiler: true,
    hw: [[0, 0.41], [0.03, 0.45], [0.1, 0.472], [0.22, 0.477], [0.35, 0.455], [0.5, 0.43], [0.65, 0.432], [0.79, 0.446], [0.92, 0.436], [0.975, 0.4], [1, 0.36]],
    deck: [[0, 0.38], [0.03, 0.44], [0.08, 0.465], [0.15, 0.475], [0.25, 0.48], [0.4, 0.475], [0.55, 0.47], [0.68, 0.475], [0.75, 0.46], [0.85, 0.43], [0.95, 0.4], [0.985, 0.36], [1, 0.3]],
    roof: [[0.2, 0.48], [0.24, 0.53], [0.32, 0.585], [0.4, 0.625], [0.48, 0.65], [0.55, 0.645], [0.6, 0.615], [0.645, 0.55], [0.68, 0.475]],
    bot: [[0, 0.11], [0.03, 0.075], [0.08, 0.065], [0.92, 0.065], [0.975, 0.075], [1, 0.1]],
    lift: [[0, 0.005], [0.12, 0.025], [0.28, 0.0], [0.7, 0], [0.82, 0.035], [0.94, 0.04], [1, 0.0]],
    screens: [[0.24, 0.37], [0.565, 0.68]], pillars: [[0.2, 0.31], [0.415, 0.43]],
  },
};
MODELS.taxi = { ...MODELS.four, sign: true };
export const CAR_MODELS = Object.keys(MODELS);

function spec(type) {
  const M = MODELS[type];
  if (M._f) return M;
  const roofK = curve(M.roof), r0 = M.roof[0][0], r1 = M.roof[M.roof.length - 1][0];
  M._f = { hw: curve(M.hw), deck: curve(M.deck), bot: curve(M.bot), lift: curve(M.lift), roof: u => (u > r0 && u < r1 ? roofK(u) : -1) };
  M.cabStart = r1; M.cabEnd = r0; // front and back of the cabin (as u)
  return M;
}

// The half cross-section at u: ten points from the middle underneath, round the side, to the middle of the roof
function section(M, u) {
  const f = M._f, W = f.hw(u), dk = f.deck(u), bt = f.bot(u), fl = f.lift(u);
  const ch = Math.max(0, f.roof(u) - dk), s = Math.min(1, ch / 0.11), cw = Math.min(M.cabW, W * 0.8);
  const lerp = (a, b, t) => a + (b - a) * t;
  return [
    [0, bt], [W * 0.84, bt], [W * 0.955, bt + 0.045], [W, bt + (dk - bt) * 0.55], [W * 0.99, dk - 0.055 + fl], [W * 0.945, dk - 0.012 + fl],
    [W * 0.895, dk + 0.003 + fl * 0.4], [lerp(W * 0.64, cw, s), dk + Math.max(0.012, ch - 0.028)], [lerp(W * 0.44, cw * 0.88, s), dk + Math.max(0.018, ch - 0.003)], [0, dk + Math.max(0.022, ch)],
  ];
}

// The body as one mesh with three material groups: paint, glass, dark trim
function bodyGeo(type) {
  return geo('carbody-' + type, () => {
    const M = spec(type), f = M._f, N = 56, R = 18;
    const us = []; for (let i = 0; i <= N; i++) us.push(0.5 - 0.5 * Math.cos(i / N * PI)); // closer together at the ends
    const pos = [], idx = [[], [], []];
    for (const u of us) {
      const h = section(M, u), x = (u - 0.5) * M.L;
      const ring = [...h, ...h.slice(1, 9).reverse().map(([z, y]) => [-z, y])];
      for (const [z, y] of ring) pos.push(x, y, z);
    }
    const inPillar = u => M.pillars.some(([a, b]) => u >= a && u <= b);
    for (let i = 0; i < N; i++) {
      const ua = us[i], ub = us[i + 1], um = (ua + ub) / 2;
      const cha = f.roof(ua) - f.deck(ua), chb = f.roof(ub) - f.deck(ub), cab = Math.min(cha, chb) > 0.045;
      const screen = cab && M.screens.some(([a, b]) => um >= a && um <= b);
      for (let k = 0; k < R; k++) {
        const seg = k < 9 ? k : 17 - k;
        let g = 0;
        if (seg <= 1) g = 2;                                   // underneath and the sills
        else if (seg === 6) g = cab && !inPillar(um) ? 1 : 0;  // side windows
        else if (seg === 8) g = screen ? 1 : 0;                // windscreen and back window
        const a = i * R + k, b = i * R + (k + 1) % R, c = (i + 1) * R + (k + 1) % R, d = (i + 1) * R + k;
        idx[g].push(a, d, c, a, c, b);
      }
    }
    // close the nose and the tail
    for (const [i, front] of [[0, false], [N, true]]) {
      let cx = 0, cy = 0; for (let k = 0; k < R; k++) { cx += pos[(i * R + k) * 3]; cy += pos[(i * R + k) * 3 + 1]; }
      const ci = pos.length / 3; pos.push(cx / R + (front ? 0.012 : -0.012), cy / R, 0);
      for (let k = 0; k < R; k++) { const a = i * R + k, b = i * R + (k + 1) % R; front ? idx[0].push(b, a, ci) : idx[0].push(a, b, ci); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const all = [...idx[0], ...idx[1], ...idx[2]];
    g.setIndex(all);
    g.addGroup(0, idx[0].length, 0); g.addGroup(idx[0].length, idx[1].length, 1); g.addGroup(idx[0].length + idx[1].length, idx[2].length, 2);
    g.computeVertexNormals();
    return g;
  });
}

const glassM = new THREE.MeshPhongMaterial({ color: '#151d2a', specular: '#5f7590', shininess: 70, side: THREE.DoubleSide }); // tinted, with a cool sheen
const trimM = mat('#15151a'), chromeM = mat('#d8dce2', { roughness: 0.2, metalness: 0.7 }), tyreM = mat('#18181c');
const rimM = mat('#cfd3d9', { roughness: 0.22, metalness: 0.65 }), rimDarkM = mat('#3a3d44', { roughness: 0.3, metalness: 0.5 });
const archM = mat('#0c0c10'), plateM = mat('#f4f1e8'), plateRearM = mat('#f2c94c'), meshM = mat('#0f1014', { roughness: 0.5 });
const flat = (geom, m, x, y, z) => { const o = new THREE.Mesh(geom, m); o.position.set(x, y, z); return o; };

// makeCar(type, colour, { own, head, tail, signM }) -> { group, wheels, paint, tail, len }
// own: the car gets its own paint and tail-lamp materials (for cars that change colour or brake)
export function makeCar(type, color, { own = false, headM, tailM, signM } = {}) {
  const M = spec(MODELS[type] ? type : 'three'), f = M._f, L = M.L, X = u => (u - 0.5) * L;
  const g = new THREE.Group(); g.userData.noTex = true;
  const paint = own ? smat({ color, roughness: 0.18, metalness: 0.4, side: THREE.DoubleSide }) : mat(color, { roughness: 0.18, metalness: 0.4, side: THREE.DoubleSide });
  const tail = own ? smat({ color: '#7a0f14', emissive: '#ff2a2a', emissiveIntensity: 0, roughness: 0.2 }) : tailM;
  g.add(new THREE.Mesh(bodyGeo(type), [paint, glassM, trimM]));
  const nose = X(1), rear = X(0), W = u => f.hw(u);

  // Wheels: a dark arch behind each, a tyre standing just proud of the body, and an alloy
  const wheels = [];
  const tyreG = geo('tyre' + M.r, () => new THREE.CylinderGeometry(M.r, M.r, 0.12, 22).rotateX(PI / 2));
  const archG = geo('arch' + M.r, () => new THREE.CircleGeometry(M.r + 0.035, 20, 0, PI));
  const rimG = geo('rim' + M.r, () => new THREE.CylinderGeometry(M.r * 0.68, M.r * 0.68, 0.124, 20).rotateX(PI / 2));
  const lipG = geo('lip' + M.r, () => new THREE.TorusGeometry(M.r * 0.68, 0.008, 4, 22));
  for (const au of M.axles) for (const s of [-1, 1]) {
    const wz = W(au), x = X(au);
    const arch = flat(archG, archM, x, M.r, s * (wz + 0.004)); if (s < 0) arch.rotation.y = PI; g.add(arch);
    const w = mesh(tyreG, tyreM, x, M.r, s * (wz + 0.012 - 0.06));
    const face = s * 0.0625;
    w.add(flat(rimG, rimDarkM, 0, 0, 0));
    const lip = flat(lipG, rimM, 0, 0, face); w.add(lip);
    const n = M.rims === 'multi' ? 10 : M.rims === 'double' ? 10 : M.rims === 'phone' ? 5 : 5;
    for (let k = 0; k < n; k++) {
      const wide = M.rims === 'phone';
      const sp = new THREE.Mesh(geo(`spoke${M.r}${wide}`, () => new THREE.BoxGeometry(M.r * 0.6, wide ? 0.06 : 0.026, 0.012).translate(M.r * 0.31, 0, 0)), rimM);
      sp.position.z = face; sp.rotation.z = k * PI * 2 / n + (M.rims === 'double' && k % 2 ? -0.18 : 0); w.add(sp);
    }
    w.add(flat(geo('hub', () => new THREE.CylinderGeometry(0.028, 0.028, 0.13, 10).rotateX(PI / 2)), rimM, 0, 0, 0));
    g.add(w); wheels.push(w);
  }

  // Grille and intakes on the nose
  const dn = f.deck(1), bn = f.bot(1), fx = nose - 0.008, gy = (dn + bn) / 2 + 0.03;
  const front = (w, h, d, m, y, z = 0, r = 0.02) => { const o = rbox(d, h, w, m, fx, y - h / 2, z, r); g.add(o); return o; };
  if (M.grille === 'kidney') {
    for (const s of [-1, 1]) { front(0.13, 0.115, 0.03, chromeM, gy + 0.01, s * 0.078, 0.035); const k = front(0.11, 0.097, 0.032, meshM, gy + 0.01, s * 0.078, 0.03); k.position.x += 0.004; }
    front(0.62, 0.07, 0.03, meshM, bn + 0.085);
  } else if (M.grille === 'frame') {
    front(0.4, 0.17, 0.03, chromeM, gy, 0, 0.035);
    const inner = front(0.37, 0.15, 0.032, meshM, gy, 0, 0.03); inner.position.x += 0.003;
    for (let k = 0; k < 4; k++) { const sl = box(0.034, 0.008, 0.36, chromeM, fx + 0.006, gy - 0.06 + k * 0.035, 0, false); g.add(sl); }
    for (const s of [-1, 1]) front(0.12, 0.05, 0.03, meshM, bn + 0.1, s * 0.3);
  } else if (M.grille === 'shield') {
    const sh = new THREE.Shape(); sh.moveTo(-0.055, 0.06); sh.lineTo(0.055, 0.06); sh.quadraticCurveTo(0.06, -0.02, 0, -0.085); sh.quadraticCurveTo(-0.06, -0.02, -0.055, 0.06);
    const shG = geo('shield', () => new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 }).rotateY(PI / 2));
    g.add(flat(shG, chromeM, fx - 0.01, gy + 0.02, 0));
    const inner = flat(shG, meshM, fx - 0.004, gy + 0.02, 0); inner.scale.set(1, 0.82, 0.82); g.add(inner);
    for (const s of [-1, 1]) front(0.27, 0.055, 0.03, meshM, bn + 0.105, s * 0.2);
    front(0.12, 0.03, 0.03, meshM, bn + 0.05);
  } else { // a sports car's nose: three intakes low down, nothing else
    front(0.22, 0.05, 0.03, meshM, bn + 0.08);
    for (const s of [-1, 1]) front(0.13, 0.06, 0.03, meshM, bn + 0.085, s * 0.29);
  }
  g.add(box(0.012, 0.055, 0.2, plateM, fx + 0.02, bn + 0.02, 0, false));

  // Headlamps
  const hlu = 0.99, hy = f.deck(hlu) + f.lift(hlu) - 0.035, hxz = W(hlu) * 0.66, hx = X(hlu) + 0.012;
  for (const s of [-1, 1]) {
    if (M.head === 'round') {
      const lamp = cyl(0.058, 0.058, 0.03, headM, 0, 0, 0, 18, false); lamp.rotation.z = -PI / 2 + 0.35; lamp.position.set(X(0.96) + 0.012, f.deck(0.96) + f.lift(0.96) - 0.035, s * W(0.96) * 0.68); g.add(lamp);
      const ring = cyl(0.064, 0.064, 0.026, chromeM, 0, 0, 0, 18, false); ring.rotation.z = -PI / 2 + 0.35; ring.position.copy(lamp.position); ring.position.x -= 0.006; g.add(ring);
    } else {
      const w = M.head === 'swept' ? 0.22 : 0.2, h = M.head === 'swept' ? 0.042 : 0.055;
      const lamp = box(0.03, h, w, headM, hx, hy, s * hxz, false); lamp.rotation.y = s * 0.38; lamp.rotation.z = -0.35; g.add(lamp);
      const drl = box(0.032, 0.01, w * 0.95, chromeM, hx + 0.002, hy + h - 0.006, s * hxz, false); drl.rotation.y = s * 0.38; drl.rotation.z = -0.35; g.add(drl);
    }
  }
  // Tail lamps, rear plate, exhausts, diffuser
  const ty = f.deck(0) - 0.03, tx = rear - 0.022; // on the tail's face
  if (M.tail === 'bar') {
    g.add(box(0.03, 0.03, W(0.03) * 1.7, tail, X(0.03) - 0.012, f.deck(0.03) - 0.02, 0, false));
  } else for (const s of [-1, 1]) {
    if (M.tail === 'l') { g.add(box(0.03, 0.05, 0.13, tail, tx + 0.005, ty - 0.02, s * W(0.03) * 0.66, false)); g.add(box(0.03, 0.022, 0.07, tail, tx + 0.005, ty - 0.055, s * W(0.03) * 0.78, false)); }
    else if (M.tail === 'round') for (const dz of [0, 0.085]) { const c = cyl(0.026, 0.026, 0.03, tail, 0, 0, 0, 14, false); c.rotation.z = PI / 2; c.position.set(tx + 0.005, ty - 0.01, s * (W(0.03) * 0.72 - dz)); g.add(c); }
    else g.add(box(0.03, 0.04, 0.2, tail, tx + 0.005, ty - 0.01, s * W(0.03) * 0.62, false));
  }
  g.add(box(0.012, 0.055, 0.2, plateRearM, rear - 0.016, f.bot(0) + 0.1, 0, false));
  g.add(rbox(0.04, 0.045, W(0.02) * 1.3, trimM, rear + 0.005, f.bot(0) - 0.01, 0, 0.015));
  for (const s of [-1, 1]) { const ex = cyl(0.022, 0.022, 0.04, chromeM, 0, 0, 0, 12, false); ex.rotation.z = PI / 2; ex.position.set(rear - 0.005, f.bot(0) + 0.015, s * (M.grille === 'intakes' ? 0.05 : 0.27)); g.add(ex); }
  if (M.spoiler) g.add(rbox(0.16, 0.012, W(0.08) * 1.6, paint, X(0.08), f.deck(0.08) + 0.01, 0, 0.005));

  // Mirrors at the foot of the windscreen, door handles, roof rails, a taxi sign
  const mu = M.cabStart - 0.035, my = f.deck(mu) + 0.03;
  for (const s of [-1, 1]) {
    g.add(rbox(0.07, 0.045, 0.06, paint, X(mu), my, s * (W(mu) * 0.9 + 0.03), 0.015)); g.add(box(0.03, 0.02, 0.03, trimM, X(mu), my - 0.01, s * (W(mu) * 0.9), false));
    for (const hu of [0.42, 0.58]) g.add(box(0.05, 0.012, 0.01, chromeM, X(hu), f.deck(hu) - 0.06, s * (W(hu) + 0.003), false));
  }
  const c0 = M.pillars[0][1], c1 = M.cabStart - 0.02;
  const bp = M.pillars.reduce((b, p) => (Math.abs((p[0] + p[1]) / 2 - 0.5) < Math.abs((b[0] + b[1]) / 2 - 0.5) ? p : b))[0]; // the B-pillar
  for (const s of [-1, 1]) {
    if (M.grille !== 'intakes') g.add(box((c1 - c0) * L, 0.01, 0.008, chromeM, X((c0 + c1) / 2), f.deck((c0 + c1) / 2) - 0.002, s * W((c0 + c1) / 2) * 0.9, false));
    for (const du of M.grille === 'intakes' ? [M.cabStart - 0.04, 0.4] : [M.cabStart - 0.03, bp + 0.012, c0 + 0.02]) {
      const y0 = f.bot(du) + 0.05, y1 = f.deck(du) - 0.01;
      g.add(box(0.006, y1 - y0, 0.006, trimM, X(du), y0, s * (W(du) + 0.001), false));
    }
  }
  if (M.rails) for (const s of [-1, 1]) g.add(rbox(L * 0.42, 0.018, 0.022, chromeM, X(0.33), f.roof(0.33), s * M.cabW * 0.8, 0.008));
  if (M.sign && signM) { const ru = 0.47; g.add(rbox(0.26, 0.08, 0.15, mat('#2b2d36'), X(ru), f.roof(ru) - 0.005, 0, 0.02)); g.add(box(0.24, 0.055, 0.13, signM, X(ru), f.roof(ru) + 0.005, 0, false)); }

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g, wheels, paint, tail, len: L };
}
