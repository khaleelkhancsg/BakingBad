// Low-poly food for the display counters: every recipe has a look of its own, built from a shape template (loaf,
// pizza, cup, bowl, cone, skewer...) and its own colours and toppings. Each model sits on y = 0 inside a circle of
// about 0.11 and is merged into a mesh or two, so a full counter stays cheap to draw.
import * as THREE from 'three';
import { PI, geo, mat, mesh, box, cyl, sphere, mergeStatic } from './three-helpers.js';

const C = {
  crust: '#c98a4b', dark: '#8a5a2e', golden: '#e0a44a', pale: '#f2d9a6', cream: '#fff3dc', white: '#fafafa',
  choc: '#5a3320', milkchoc: '#7a4a2e', berry: '#c8323c', straw: '#ff6f7d', lemon: '#f6d65a', lime: '#9ed36a',
  green: '#5fa04f', leaf: '#3f7a3a', tomato: '#d8452e', cheese: '#f3c94b', meat: '#8a3b2a', ham: '#e89a8a',
  fried: '#d89a3a', rice: '#f4f1ea', nori: '#1f2a22', salmon: '#f08a5d', tuna: '#d0454c', plate: '#f4f0e8',
  bowl: '#e9e4da', redbowl: '#b8323c', paper: '#e9dcc1', cup: '#ffffff', coffee: '#6b4226', latte: '#c69c6d',
  tea: '#b5651d', matcha: '#8fbf5a', pink: '#ff9fb2', gold: '#d4af37', purple: '#9b6bff', blue: '#6fb8e0',
  caramel: '#c8802e', pistachio: '#a8c97a', mint: '#8fe0b5', orange: '#ff9a3d', saffron: '#f2a93b', glass: '#d8f0ff',
};
const M = c => (c.isMaterial ? c : mat(c, { roughness: 0.6 }));
const shiny = c => mat(c, { roughness: 0.25, metalness: 0.6 });
// Small shape helpers: all positions are the bottom of the shape
const B = (g, w, h, d, c, x = 0, y = 0, z = 0) => { const m = box(w, h, d, M(c), x, y, z, false); g.add(m); return m; };
const Cy = (g, rt, rb, h, c, x = 0, y = 0, z = 0, seg = 14) => { const m = cyl(rt, rb, h, M(c), x, y, z, seg, false); g.add(m); return m; };
const S = (g, r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const m = sphere(r, M(c), x, y, z, false); m.scale.set(sx, sy, sz); g.add(m); return m; };
const T = (g, r, t, c, x = 0, y = 0, z = 0, arc = PI * 2) => { const m = mesh(geo(`ft${r}|${t}|${arc}`, () => new THREE.TorusGeometry(r, t, 6, 14, arc)), M(c), x, y, z, false); m.rotation.x = -PI / 2; g.add(m); return m; };
const Cone = (g, r, h, c, x = 0, y = 0, z = 0, seg = 10, flip = false) => { const m = mesh(geo(`fc${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg)), M(c), x, y + h / 2, z, false); if (flip) m.rotation.x = PI; g.add(m); return m; };
const dots = (g, n, r, c, rad, y, seed = 1) => { for (let k = 0; k < n; k++) { const a = k * 2.4 + seed, d = rad * (0.35 + ((k * 37 + seed * 11) % 10) / 15); S(g, r, c, Math.cos(a) * d, y, Math.sin(a) * d); } };
const plate = (g, c = C.plate, r = 0.11) => Cy(g, r, r * 0.9, 0.012, c, 0, 0, 0, 18);

// ---- Templates ----
const loaf = (g, c, { len = 1.3, score = C.pale, seeds = null, dust = null } = {}) => {
  S(g, 0.085, c, 0, 0.05, 0, len, 0.7, 0.85);
  for (let k = -1; k <= 1; k++) B(g, 0.025, 0.008, 0.11, score, k * 0.045, 0.105, 0).rotation.y = 0.5;
  if (seeds) dots(g, 8, 0.008, seeds, 0.07, 0.1);
  if (dust) S(g, 0.06, dust, 0, 0.09, 0, len * 0.9, 0.25, 0.7);
};
const roll = (g, c, { n = 1, glaze = null, top = null, swirl = null } = {}) => {
  const pos = n === 1 ? [[0, 0]] : n === 2 ? [[-0.05, 0], [0.05, 0]] : [[-0.05, -0.03], [0.05, -0.03], [0, 0.05]];
  for (const [x, z] of pos) {
    S(g, 0.055, c, x, 0.035, z, 1, 0.75, 1);
    if (glaze) S(g, 0.045, glaze, x, 0.06, z, 1, 0.3, 1);
    if (top) S(g, 0.014, top, x, 0.085, z);
    if (swirl) T(g, 0.028, 0.008, swirl, x, 0.075, z);
  }
};
const flatTop = (g, base, { r = 0.1, rim = null, sauce = null, cheese = null, tops = [], seed = 1, fold = false } = {}) => {
  Cy(g, r, r, 0.022, base, 0, 0, 0, 18);
  if (rim) T(g, r - 0.008, 0.012, rim, 0, 0.022, 0);
  if (sauce) Cy(g, r - 0.018, r - 0.018, 0.006, sauce, 0, 0.022, 0, 18);
  if (cheese) Cy(g, r - 0.03, r - 0.03, 0.006, cheese, 0, 0.026, 0, 16);
  tops.forEach((t, i) => dots(g, t[1] || 6, t[2] || 0.014, t[0], r - 0.03, 0.034, seed + i * 3));
  if (fold) g.scale.set(1, 1, 0.55);
};
const roundCake = (g, layers, { top = null, r = 0.09, deco = null, n = 6 } = {}) => {
  let y = 0;
  for (const [c, h] of layers) { Cy(g, r, r, h, c, 0, y, 0, 18); y += h; }
  if (top) Cy(g, r + 0.004, r + 0.004, 0.012, top, 0, y, 0, 18);
  if (deco) for (let k = 0; k < n; k++) { const a = (k / n) * PI * 2; S(g, 0.014, deco, Math.cos(a) * r * 0.7, y + 0.016, Math.sin(a) * r * 0.7); }
  return y;
};
const slice = (g, layers, { top = null, deco = null } = {}) => {
  // a wedge of cake: a cylinder sector
  let y = 0;
  for (const [c, h] of layers) { const m = mesh(geo(`fw${h}`, () => new THREE.CylinderGeometry(0.11, 0.11, h, 8, 1, false, 0, PI / 3)), M(c), -0.04, y + h / 2, -0.02, false); g.add(m); y += h; }
  if (top) { const m = mesh(geo('fwt', () => new THREE.CylinderGeometry(0.112, 0.112, 0.012, 8, 1, false, 0, PI / 3)), M(top), -0.04, y + 0.006, -0.02, false); g.add(m); y += 0.012; }
  if (deco) S(g, 0.018, deco, 0.02, y + 0.015, 0.04);
};
const tart = (g, shell, fill, { r = 0.085, tops = [], lattice = null, seed = 2 } = {}) => {
  Cy(g, r, r * 0.85, 0.035, shell, 0, 0, 0, 16);
  Cy(g, r - 0.012, r - 0.012, 0.006, fill, 0, 0.035, 0, 16);
  if (lattice) for (let k = -1; k <= 1; k++) { B(g, 0.012, 0.008, r * 1.8, lattice, k * 0.04, 0.04, 0); B(g, r * 1.8, 0.008, 0.012, lattice, 0, 0.044, k * 0.04); }
  tops.forEach((t, i) => dots(g, t[1] || 6, t[2] || 0.014, t[0], r - 0.02, 0.048, seed + i));
};
const pie = (g, crust, { r = 0.09, vent = C.dark, glaze = null } = {}) => {
  Cy(g, r, r * 0.85, 0.04, crust, 0, 0, 0, 16); S(g, r * 0.95, glaze || crust, 0, 0.04, 0, 1, 0.3, 1);
  B(g, 0.03, 0.006, 0.006, vent, 0, 0.068, 0); B(g, 0.006, 0.006, 0.03, vent, 0, 0.068, 0);
};
const stackDiscs = (g, c, { n = 3, r = 0.045, h = 0.012, chips = null, between = null, spread = 0.0 } = {}) => {
  for (let k = 0; k < n; k++) { Cy(g, r, r, h, c, (k % 2) * spread, k * (h + (between ? 0.006 : 0)), 0, 14); if (between && k < n - 1) Cy(g, r * 0.92, r * 0.92, 0.006, between, (k % 2) * spread, k * (h + 0.006) + h, 0, 14); if (chips) dots(g, 4, 0.006, chips, r * 0.8, k * (h + (between ? 0.006 : 0)) + h + 0.002, k + 1); }
};
const pieces = (g, c, { n = 6, r = 0.028, sx = 1, sy = 0.8, sz = 1, on = null, dip = null, cups = null, stick = null } = {}) => {
  if (on) plate(g, on);
  const y0 = on ? 0.012 : 0;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * PI * 2 + 0.3, d = n === 1 ? 0 : 0.055;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (cups) Cy(g, r * 1.2, r, r * 0.9, cups, x, y0, z, 10);
    S(g, r, c, x, y0 + r * sy, z, sx, sy, sz);
    if (dip) S(g, r * 0.95, dip, x, y0 + r * sy * 1.5, z, sx, sy * 0.45, sz);
    if (stick) Cy(g, 0.004, 0.004, 0.08, stick, x, y0 + r * sy * 1.6, z, 5);
  }
};
const sticks = (g, c, { n = 5, len = 0.16, r = 0.014, on = C.paper, dust = null, dip = null } = {}) => {
  if (on) B(g, 0.17, 0.008, 0.13, on, 0, 0, 0);
  for (let k = 0; k < n; k++) {
    const m = mesh(geo(`fs${r}|${len}`, () => new THREE.CylinderGeometry(r, r, len, 6)), M(c), 0, 0.02 + (k % 2) * 0.018, -0.05 + k * (0.1 / Math.max(1, n - 1)), false);
    m.rotation.z = PI / 2; m.rotation.y = (k - n / 2) * 0.12; g.add(m);
    if (dust) S(g, r * 1.1, dust, 0, 0.034 + (k % 2) * 0.018, -0.05 + k * (0.1 / Math.max(1, n - 1)), len * 3, 0.4, 1);
  }
  if (dip) Cy(g, 0.028, 0.022, 0.03, dip, 0.07, 0.008, 0.045, 10);
};
const cup = (g, liquid, { cupC = C.cup, foam = null, lid = false, handle = true, sleeve = null, straw = null, art = null, dust = null, h = 0.1, r = 0.045, tall = false } = {}) => {
  const hh = tall ? h * 1.35 : h;
  Cy(g, r, r * 0.82, hh, cupC, 0, 0, 0, 14);
  if (sleeve) Cy(g, r * 0.96, r * 0.9, hh * 0.35, sleeve, 0, hh * 0.3, 0, 14);
  Cy(g, r * 0.92, r * 0.92, 0.006, foam || liquid, 0, hh - 0.008, 0, 14);
  if (art) S(g, r * 0.35, art, 0, hh - 0.002, 0, 1, 0.15, 1.3);
  if (dust) dots(g, 5, 0.005, dust, r * 0.6, hh, 3);
  if (lid) { Cy(g, r * 1.04, r * 1.02, 0.014, cupC, 0, hh, 0, 14); Cy(g, r * 0.5, r * 0.7, 0.012, cupC, 0, hh + 0.014, 0, 12); }
  if (handle && !lid && !tall) { const t = T(g, 0.022, 0.006, cupC, r + 0.012, hh * 0.55, 0, PI); t.rotation.set(0, 0, -PI / 2); }
  if (straw) { const st = Cy(g, 0.005, 0.005, hh + 0.05, straw, r * 0.3, 0.02, 0, 6); st.rotation.z = -0.2; }
};
const glassDrink = (g, liquid, { garnish = null, ice = true, straw = null, foam = null, h = 0.13, r = 0.04, layers = null, top = null } = {}) => {
  const gl = mat(C.glass, { roughness: 0.1, transparent: true, opacity: 0.45 });
  if (layers) { let y = 0.006; for (const [c, f] of layers) { Cy(g, r * 0.88, r * 0.88, h * f, c, 0, y, 0, 12); y += h * f; } }
  else Cy(g, r * 0.88, r * 0.8, h * 0.85, liquid, 0, 0.006, 0, 12);
  Cy(g, r, r * 0.85, h, gl, 0, 0, 0, 12);
  if (ice) for (let k = 0; k < 3; k++) B(g, 0.018, 0.018, 0.018, mat('#eaf8ff', { transparent: true, opacity: 0.7 }), -0.012 + k * 0.012, h * 0.7 - k * 0.01, (k % 2) * 0.01);
  if (foam) S(g, r * 0.9, foam, 0, h * 0.92, 0, 1, 0.35, 1);
  if (top) S(g, r * 0.7, top, 0, h + 0.015, 0);
  if (garnish) { const gm = Cy(g, 0.022, 0.022, 0.006, garnish, r * 0.9, h - 0.01, 0, 10); gm.rotation.x = PI / 2; }
  if (straw) { const st = Cy(g, 0.005, 0.005, h + 0.05, straw, r * 0.3, 0.02, 0, 6); st.rotation.z = -0.25; }
};
const bowl = (g, contents, { bowlC = C.bowl, tops = [], noodles = null, egg = false, greens = null, chop = false, broth = null, r = 0.075, seed = 4 } = {}) => {
  Cy(g, r, r * 0.6, 0.055, bowlC, 0, 0, 0, 16);
  Cy(g, r * 0.92, r * 0.92, 0.006, broth || contents, 0, 0.05, 0, 16);
  if (noodles) for (let k = 0; k < 4; k++) T(g, 0.02 + k * 0.012, 0.005, noodles, 0, 0.056, 0, PI * 1.4);
  if (!noodles && !broth) S(g, r * 0.85, contents, 0, 0.05, 0, 1, 0.35, 1);
  if (egg) { S(g, 0.02, C.white, 0.03, 0.062, 0.01, 1, 0.6, 1.3); S(g, 0.01, C.orange, 0.03, 0.07, 0.01); }
  if (greens) dots(g, 4, 0.01, greens, r * 0.6, 0.06, seed);
  tops.forEach((t, i) => dots(g, t[1] || 5, t[2] || 0.012, t[0], r * 0.65, 0.062, seed + i * 2));
  if (chop) for (const dz of [-0.008, 0.008]) { const c = B(g, 0.16, 0.006, 0.006, C.dark, 0, 0.065, dz); c.rotation.y = 0.5; }
};
const dessertCup = (g, layers, { top = null, deco = null, r = 0.04, glassy = true, n = 3 } = {}) => {
  let y = 0.004;
  for (const [c, h] of layers) { Cy(g, r * 0.88, r * 0.82, h, c, 0, y, 0, 12); y += h; }
  if (glassy) Cy(g, r, r * 0.86, y + 0.01, mat(C.glass, { roughness: 0.1, transparent: true, opacity: 0.4 }), 0, 0, 0, 12);
  if (top) S(g, r * 0.8, top, 0, y, 0, 1, 0.45, 1);
  if (deco) for (let k = 0; k < n; k++) S(g, 0.01, deco, Math.cos(k * 2.1) * 0.015, y + 0.014, Math.sin(k * 2.1) * 0.015);
};
const iceCone = (g, scoops, { cone = C.golden, dip = null, sprinkle = null, flake = false } = {}) => {
  Cone(g, 0.035, 0.09, cone, 0, 0, 0, 10, true);
  scoops.forEach((c, k) => S(g, 0.036 - k * 0.004, c, 0, 0.1 + k * 0.045, 0));
  if (dip) S(g, 0.034, dip, 0, 0.11, 0, 1, 0.4, 1);
  if (sprinkle) dots(g, 6, 0.004, sprinkle, 0.025, 0.12 + (scoops.length - 1) * 0.045);
  if (flake) B(g, 0.01, 0.06, 0.01, C.milkchoc, 0.01, 0.12, 0).rotation.z = 0.3;
};
const sandwich = (g, bread, fills, { cut = true, toasted = null, w = 0.15, d = 0.1, stick = false } = {}) => {
  let y = 0;
  B(g, w, 0.022, d, toasted || bread, 0, y, 0); y += 0.022;
  for (const c of fills) { B(g, w * 1.04, 0.012, d * 1.04, c, 0, y, 0); y += 0.012; }
  B(g, w, 0.022, d, toasted || bread, 0, y, 0); y += 0.022;
  if (cut) B(g, 0.004, y + 0.002, d * 1.06, C.plate, 0, 0, 0);
  if (stick) Cy(g, 0.003, 0.003, y + 0.04, C.paper, 0.04, 0, 0, 5);
};
const roll2 = (g, wrap, fills, { len = 0.16, r = 0.035, open = true, cut = false } = {}) => {
  const m = mesh(geo(`fr${r}|${len}`, () => new THREE.CylinderGeometry(r, r, len, 10)), M(wrap), 0, r, 0, false); m.rotation.z = PI / 2; g.add(m);
  if (open) fills.forEach((c, k) => { const f = mesh(geo(`fr${r * 0.8}|0.01`, () => new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.01, 10)), M(c), len / 2 + 0.002 + k * 0.001, r, 0, false); f.rotation.z = PI / 2; f.scale.setScalar(1 - k * 0.25); g.add(f); });
  if (cut) B(g, 0.004, r * 2.1, r * 2.1, C.plate, 0, 0, 0);
};
const burger = (g, { bun = C.golden, patty = C.meat, cheese = C.cheese, salad = C.green, seeds = true, extra = null } = {}) => {
  S(g, 0.06, bun, 0, 0.02, 0, 1, 0.35, 1); Cy(g, 0.058, 0.058, 0.018, patty, 0, 0.022, 0, 14);
  if (cheese) B(g, 0.1, 0.006, 0.1, cheese, 0, 0.04, 0).rotation.y = 0.6;
  if (extra) Cy(g, 0.055, 0.055, 0.01, extra, 0, 0.046, 0, 12);
  if (salad) Cy(g, 0.062, 0.062, 0.006, salad, 0, extra ? 0.056 : 0.046, 0, 12);
  S(g, 0.06, bun, 0, extra ? 0.064 : 0.054, 0, 1, 0.6, 1);
  if (seeds) dots(g, 6, 0.004, C.cream, 0.04, extra ? 0.1 : 0.09);
};
const skewer = (g, chunks, { n = 2, stick = C.paper, wrap = null } = {}) => {
  for (let k = 0; k < n; k++) {
    const z = (k - (n - 1) / 2) * 0.06;
    Cy(g, 0.003, 0.003, 0.2, stick, 0, 0.03, z, 5).rotation.z = PI / 2;
    chunks.forEach((c, i) => B(g, 0.028, 0.028, 0.028, c, -0.06 + i * 0.034, 0.016, z));
  }
  if (wrap) B(g, 0.16, 0.01, 0.13, wrap, 0, 0, 0);
};
const dumplings = (g, skin, { n = 4, basket = null, pleat = null, r = 0.028, tall = false } = {}) => {
  if (basket) { Cy(g, 0.1, 0.1, 0.04, basket, 0, 0, 0, 16); Cy(g, 0.092, 0.092, 0.004, C.paper, 0, 0.036, 0, 16); }
  const y0 = basket ? 0.04 : 0;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * PI * 2, d = n === 1 ? 0 : 0.045;
    S(g, r, skin, Math.cos(a) * d, y0 + r * (tall ? 0.9 : 0.6), Math.sin(a) * d, 1, tall ? 1.1 : 0.75, 1);
    if (pleat) S(g, r * 0.35, pleat, Math.cos(a) * d, y0 + r * (tall ? 1.9 : 1.3), Math.sin(a) * d);
  }
};
const sushiRolls = (g, outside, inside, { n = 4, r = 0.026, rim = C.nori, board = '#c9a46a', top = null } = {}) => {
  B(g, 0.2, 0.012, 0.09, board, 0, 0, 0);
  for (let k = 0; k < n; k++) {
    const x = -0.075 + k * 0.05;
    Cy(g, r, r, 0.03, rim, x, 0.012, 0, 12); Cy(g, r * 0.82, r * 0.82, 0.031, outside, x, 0.012, 0, 12); Cy(g, r * 0.35, r * 0.35, 0.032, inside, x, 0.012, 0, 8);
    if (top) S(g, r * 0.6, top, x, 0.045, 0, 1, 0.4, 1);
  }
};
const nigiri = (g, fish, { n = 3, band = null, board = '#c9a46a' } = {}) => {
  B(g, 0.2, 0.012, 0.09, board, 0, 0, 0);
  for (let k = 0; k < n; k++) {
    const x = -0.06 + k * 0.06;
    S(g, 0.024, C.rice, x, 0.026, 0, 1.4, 0.6, 0.8); B(g, 0.06, 0.012, 0.036, fish, x, 0.036, 0);
    if (band) B(g, 0.012, 0.03, 0.04, band, x, 0.02, 0);
  }
};
const boxMeal = (g, cells, { boxC = '#2b2d36', lid = null } = {}) => {
  B(g, 0.19, 0.035, 0.13, boxC, 0, 0, 0);
  cells.forEach((c, k) => B(g, 0.08, 0.008, 0.05, c, -0.045 + (k % 2) * 0.09, 0.035, -0.03 + Math.floor(k / 2) * 0.06));
  if (lid) B(g, 0.19, 0.006, 0.13, lid, 0, 0.06, 0.08).rotation.x = -0.6;
};
const meatSlab = (g, c, { bark = null, bones = 0, sauce = null, on = '#a8703f', w = 0.15, d = 0.08, slices = 0, h = 0.04 } = {}) => {
  if (on) B(g, 0.2, 0.012, 0.13, on, 0, 0, 0);
  B(g, w, h, d, c, 0, 0.012, 0);
  if (bark) B(g, w * 1.02, 0.008, d * 1.02, bark, 0, 0.012 + h, 0);
  for (let k = 0; k < bones; k++) Cy(g, 0.006, 0.006, d + 0.04, C.cream, -w / 2 + 0.02 + k * (w - 0.04) / Math.max(1, bones - 1), 0.03, 0, 6).rotation.x = PI / 2;
  for (let k = 1; k <= slices; k++) B(g, 0.004, h + 0.002, d * 1.02, C.pale, -w / 2 + k * w / (slices + 1), 0.012, 0);
  if (sauce) S(g, w * 0.4, sauce, 0, 0.012 + h + 0.004, 0, 1, 0.12, 0.5);
};
const roast = (g, skin, { on = C.plate, legs = true, herbs = C.leaf, lemon = null } = {}) => {
  plate(g, on, 0.11);
  S(g, 0.06, skin, 0, 0.05, 0, 1.25, 0.8, 1);
  if (legs) for (const dz of [-0.04, 0.04]) { S(g, 0.025, skin, 0.06, 0.03, dz, 1.4, 0.8, 0.9); Cy(g, 0.005, 0.005, 0.03, C.cream, 0.09, 0.025, dz, 5).rotation.z = PI / 2; }
  if (herbs) dots(g, 4, 0.01, herbs, 0.09, 0.02, 5);
  if (lemon) S(g, 0.02, lemon, -0.08, 0.02, 0.05);
};
const spit = (g, c, { stack = 5, top = null } = {}) => {
  Cy(g, 0.06, 0.06, 0.012, '#8d939c', 0, 0, 0, 14); Cy(g, 0.004, 0.004, 0.2, '#8d939c', 0, 0.01, 0, 6);
  for (let k = 0; k < stack; k++) Cy(g, 0.045 - k * 0.003, 0.048 - k * 0.003, 0.03, k % 2 ? c : top || c, 0, 0.015 + k * 0.03, 0, 10);
};
const choc = (g, c, { n = 4, shape = 'ball', cups = '#3a2214', drizzle = null, gold = false, dust = null } = {}) => {
  B(g, 0.17, 0.014, 0.12, '#2b2d36', 0, 0, 0);
  for (let k = 0; k < n; k++) {
    const x = -0.045 + (k % 2) * 0.09, z = -0.03 + Math.floor(k / 2) * 0.06;
    if (cups) Cy(g, 0.026, 0.02, 0.016, cups, x, 0.014, z, 10);
    if (shape === 'ball') S(g, 0.022, c, x, 0.038, z);
    else if (shape === 'square') B(g, 0.04, 0.025, 0.04, c, x, 0.018, z);
    else if (shape === 'dome') S(g, 0.024, c, x, 0.024, z, 1, 0.8, 1);
    if (drizzle) B(g, 0.04, 0.004, 0.006, drizzle, x, shape === 'square' ? 0.044 : 0.058, z).rotation.y = 0.6;
    if (gold) S(g, 0.008, shiny(C.gold), x, shape === 'square' ? 0.046 : 0.06, z);
    if (dust) S(g, 0.016, dust, x, 0.05, z, 1, 0.3, 1);
  }
};
const onStick = (g, head, { stickC = C.paper, h = 0.09, kind = 'ball', ring = null } = {}) => {
  Cy(g, 0.03, 0.03, 0.012, '#5a3520', 0, 0, 0, 10); Cy(g, 0.004, 0.004, h, stickC, 0, 0.01, 0, 5);
  if (kind === 'ball') S(g, 0.04, head, 0, h + 0.03, 0);
  if (kind === 'disc') { const d = Cy(g, 0.045, 0.045, 0.012, head, 0, h + 0.035, 0, 16); d.rotation.x = PI / 2; if (ring) { const r2 = T(g, 0.03, 0.004, ring, 0, h + 0.035, 0.008); r2.rotation.x = 0; } }
  if (kind === 'cloud') { for (const [x, y, z] of [[0, 0, 0], [0.025, 0.02, 0], [-0.02, 0.025, 0.01], [0, 0.045, -0.01]]) S(g, 0.035, head, x, h + 0.02 + y, z); }
  if (kind === 'crystal') for (let k = 0; k < 5; k++) B(g, 0.022, 0.022, 0.022, head, Math.sin(k) * 0.01, h - 0.02 + k * 0.022, Math.cos(k * 2) * 0.01).rotation.set(k, k * 0.7, 0);
};
const tower = (g, c, { rows = 5, r = 0.016, accent = null, base = C.gold } = {}) => {
  Cy(g, 0.09, 0.09, 0.01, shiny(base), 0, 0, 0, 16);
  for (let row = 0; row < rows; row++) {
    const rad = 0.07 * (1 - row / rows), n = Math.max(1, Math.round(rad * 90));
    for (let k = 0; k < n; k++) { const a = (k / n) * PI * 2 + row; S(g, r, (accent && (k + row) % 3 === 0) ? accent : c, Math.cos(a) * rad, 0.02 + row * r * 1.7, Math.sin(a) * rad); }
  }
  S(g, r, accent || c, 0, 0.02 + rows * r * 1.7, 0);
};
const eclair = (g, c, glaze, { n = 2, line = null, round = false } = {}) => {
  for (let k = 0; k < n; k++) {
    const z = (k - (n - 1) / 2) * 0.05;
    if (round) { S(g, 0.035, c, 0, 0.03, z, 1, 0.8, 1); S(g, 0.03, glaze, 0, 0.05, z, 1, 0.35, 1); }
    else { S(g, 0.02, c, 0, 0.022, z, 3.6, 0.9, 1); S(g, 0.017, glaze, 0, 0.034, z, 3.6, 0.4, 0.9); }
    if (line) B(g, 0.1, 0.004, 0.004, line, 0, 0.042, z);
  }
};
const fishChips = (g) => {
  const cone = Cone(g, 0.06, 0.11, C.paper, 0, 0, 0, 10, true); cone.rotation.z = 0.7; cone.position.set(0.02, 0.04, 0);
  for (let k = 0; k < 5; k++) B(g, 0.012, 0.012, 0.07, C.golden, 0.03 + k * 0.006, 0.06 + k * 0.008, 0).rotation.set(0.3 * k, 0.6, 0.8);
  S(g, 0.03, C.fried, -0.05, 0.02, 0.02, 2.2, 0.5, 1);
  S(g, 0.012, C.lemon, -0.07, 0.03, -0.04);
};
const bucket = (g, c) => {
  Cy(g, 0.07, 0.05, 0.09, '#e8323c', 0, 0, 0, 14); Cy(g, 0.072, 0.072, 0.012, C.white, 0, 0.04, 0, 14);
  for (let k = 0; k < 5; k++) S(g, 0.03, c, Math.cos(k * 1.3) * 0.03, 0.1 + (k % 2) * 0.015, Math.sin(k * 1.3) * 0.03, 1.2, 0.8, 1);
};
const crepe = (g, c, { fill = null, dust = null, top = null } = {}) => {
  plate(g);
  const m = mesh(geo('fcrepe', () => new THREE.CylinderGeometry(0.09, 0.09, 0.012, 3)), M(c), 0, 0.02, 0, false); m.rotation.y = 0.4; g.add(m);
  const m2 = mesh(geo('fcrepe', () => new THREE.CylinderGeometry(0.09, 0.09, 0.012, 3)), M(c), 0.01, 0.032, 0.01, false); m2.rotation.y = 0.4; m2.scale.setScalar(0.85); g.add(m2);
  if (fill) S(g, 0.03, fill, -0.02, 0.04, 0, 1.4, 0.4, 0.8);
  if (dust) S(g, 0.05, dust, 0, 0.042, 0, 1, 0.1, 1);
  if (top) dots(g, 3, 0.014, top, 0.04, 0.05);
};
const candyCubes = (g, c, { n = 6, size = 0.032, on = C.paper, top = null, round = false, holes = null } = {}) => {
  if (on) B(g, 0.17, 0.008, 0.12, on, 0, 0, 0);
  for (let k = 0; k < n; k++) {
    const x = -0.05 + (k % 3) * 0.05, z = -0.025 + Math.floor(k / 3) * 0.05;
    if (round) Cy(g, size * 0.55, size * 0.55, size, c, x, 0.008, z, 10); else B(g, size, size * 0.8, size, c, x, 0.008, z).rotation.y = k * 0.3;
    if (top) S(g, size * 0.3, top, x, 0.008 + size * 0.85, z);
    if (holes) dots(g, 2, 0.005, holes, size * 0.3, 0.008 + size * 0.8, k);
  }
};
const bigCake = (g, tiers, { top = null, deco = null, gold = false } = {}) => {
  let y = 0;
  tiers.forEach(([c, r, h], k) => { Cy(g, r, r, h, c, 0, y, 0, 18); if (deco) for (let j = 0; j < 8; j++) { const a = j / 8 * PI * 2; S(g, 0.008, deco, Math.cos(a) * r, y + h * 0.5, Math.sin(a) * r); } y += h; });
  if (top) S(g, 0.02, top, 0, y + 0.015, 0);
  if (gold) Cy(g, tiers[0][1] + 0.004, tiers[0][1] + 0.004, 0.008, shiny(C.gold), 0, 0, 0, 18);
};
const crumpet = (g, c, { n = 2, holes = C.dark, butter = null } = {}) => {
  for (let k = 0; k < n; k++) { const x = (k - (n - 1) / 2) * 0.06; Cy(g, 0.045, 0.045, 0.025, c, x, k * 0.01, 0, 14); dots(g, 5, 0.005, holes, 0.03, 0.026 + k * 0.01, k); if (butter && k === n - 1) B(g, 0.02, 0.008, 0.02, butter, x, 0.03 + k * 0.01, 0); }
};
const fruitOnPlate = (g, c, { n = 5, dip = null, on = C.plate } = {}) => pieces(g, c, { n, r: 0.022, sy: 1.1, on, dip });

// ---- Every recipe that doesn't already have a hand-made model in scene.js ----
const F = {
  // Oven
  flatbread: g => { flatTop(g, C.pale, { r: 0.1, tops: [[C.green, 5, 0.01], [C.dark, 8, 0.005]] }); },
  meatpie: g => pie(g, C.crust, { glaze: C.golden }),
  macarons: g => { for (let k = 0; k < 4; k++) { const cs = [C.pink, C.pistachio, C.lemon, C.purple][k], x = -0.045 + (k % 2) * 0.09, z = -0.03 + Math.floor(k / 2) * 0.06; Cy(g, 0.026, 0.026, 0.014, cs, x, 0, z); Cy(g, 0.022, 0.022, 0.008, C.cream, x, 0.014, z); Cy(g, 0.026, 0.026, 0.014, cs, x, 0.022, z); } },
  stollen: g => { loaf(g, C.pale, { len: 1.6, score: C.pale, dust: C.white }); dots(g, 6, 0.008, C.berry, 0.06, 0.07, 2); },
  truffleloaf: g => loaf(g, C.dark, { seeds: '#2b2d36' }),
  scones: g => { roll(g, C.pale, { n: 2, top: C.berry }); S(g, 0.015, C.cream, 0.05, 0.08, 0); },
  focaccia: g => { B(g, 0.17, 0.03, 0.12, C.golden, 0, 0, 0); dots(g, 6, 0.01, C.green, 0.06, 0.032, 3); dots(g, 5, 0.012, C.tomato, 0.06, 0.034, 7); },
  brioche: g => { S(g, 0.06, '#d98a3a', 0, 0.045, 0, 1, 0.8, 1); S(g, 0.03, '#d98a3a', 0, 0.1, 0); },
  sausageroll: g => { roll2(g, C.golden, [C.meat], { len: 0.15, r: 0.03 }); for (let k = -1; k <= 1; k++) B(g, 0.01, 0.006, 0.04, C.dark, k * 0.04, 0.058, 0); },
  quiche: g => tart(g, C.crust, C.cheese, { r: 0.095, tops: [[C.green, 5], [C.ham, 4]] }),
  baklava: g => { for (let k = 0; k < 4; k++) { const d = B(g, 0.05, 0.035, 0.05, C.golden, -0.03 + (k % 2) * 0.06, 0, -0.03 + Math.floor(k / 2) * 0.06); d.rotation.y = PI / 4; S(g, 0.01, C.pistachio, d.position.x, 0.04, d.position.z); } },
  pretzel: g => { T(g, 0.035, 0.014, C.dark, -0.02, 0.014, 0); T(g, 0.035, 0.014, C.dark, 0.02, 0.014, 0); dots(g, 6, 0.004, C.white, 0.04, 0.03); },
  panettone: g => { Cy(g, 0.06, 0.06, 0.06, C.paper, 0, 0, 0); S(g, 0.064, C.golden, 0, 0.06, 0, 1, 0.75, 1); dots(g, 5, 0.008, C.berry, 0.04, 0.1); },
  wellington: g => { plate(g); S(g, 0.04, C.golden, 0, 0.04, 0, 2.2, 0.9, 1.1); for (let k = -2; k <= 2; k++) B(g, 0.004, 0.004, 0.07, C.dark, k * 0.025, 0.074, 0); },
  custardtart: g => { for (const [x, z] of [[-0.04, -0.02], [0.04, 0.02]]) { Cy(g, 0.035, 0.03, 0.025, C.golden, x, 0, z); Cy(g, 0.028, 0.028, 0.004, C.lemon, x, 0.025, z); S(g, 0.01, C.dark, x + 0.008, 0.03, z); } },
  ryeloaf: g => loaf(g, '#6b4226', { len: 1.2, seeds: C.dark }),
  bananabread: g => { B(g, 0.16, 0.06, 0.08, '#a8703f', 0, 0, 0); S(g, 0.045, '#8a5a2e', 0, 0.06, 0, 1.8, 0.4, 0.9); S(g, 0.02, C.lemon, 0.02, 0.08, 0, 2, 0.5, 0.6); },
  // Mixer
  smoothie: g => bowl(g, C.purple, { bowlC: C.white, tops: [[C.straw, 4], [C.lemon, 3], [C.white, 4, 0.006]] }),
  tiramisu: g => { B(g, 0.12, 0.02, 0.12, '#c69c6d', 0, 0, 0); B(g, 0.12, 0.02, 0.12, C.cream, 0, 0.02, 0); B(g, 0.12, 0.02, 0.12, '#c69c6d', 0, 0.04, 0); B(g, 0.12, 0.006, 0.12, C.milkchoc, 0, 0.06, 0); },
  pavlova: g => { plate(g); Cy(g, 0.07, 0.08, 0.04, C.white, 0, 0.012, 0); S(g, 0.06, C.cream, 0, 0.055, 0, 1, 0.35, 1); dots(g, 6, 0.012, C.berry, 0.04, 0.07); dots(g, 3, 0.01, C.lime, 0.04, 0.072, 4); },
  souffle: g => { Cy(g, 0.05, 0.045, 0.05, C.white, 0, 0, 0); S(g, 0.05, C.golden, 0, 0.05, 0, 1, 0.8, 1); S(g, 0.03, C.white, 0, 0.09, 0, 1, 0.2, 1); },
  meringue: g => { for (let k = 0; k < 4; k++) Cone(g, 0.025, 0.05, k % 2 ? C.pink : C.white, -0.045 + (k % 2) * 0.09, 0, -0.03 + Math.floor(k / 2) * 0.06, 8); },
  trifle: g => dessertCup(g, [[C.berry, 0.03], [C.lemon, 0.03], [C.cream, 0.03]], { top: C.white, deco: C.berry }),
  cookiedough: g => { Cy(g, 0.05, 0.04, 0.04, C.white, 0, 0, 0); S(g, 0.05, '#d8b07a', 0, 0.04, 0, 1, 0.5, 1); dots(g, 6, 0.007, C.choc, 0.03, 0.06); },
  hummus: g => { Cy(g, 0.075, 0.06, 0.03, '#d8b07a', 0, 0, 0); S(g, 0.06, '#e6cfa0', 0, 0.03, 0, 1, 0.25, 1); dots(g, 5, 0.008, '#a86a2a', 0.03, 0.04); for (let k = 0; k < 3; k++) B(g, 0.05, 0.006, 0.03, C.pale, 0.07, 0.01 + k * 0.006, -0.03 + k * 0.03).rotation.y = k; },
  keylime: g => slice(g, [[C.crust, 0.02], [C.lime, 0.035]], { top: C.white, deco: C.lime }),
  pannacotta: g => { plate(g); Cy(g, 0.04, 0.05, 0.05, C.cream, 0, 0.012, 0); Cy(g, 0.04, 0.04, 0.006, C.berry, 0, 0.062, 0); S(g, 0.02, C.berry, 0.06, 0.02, 0, 1.5, 0.3, 1); },
  fondue: g => { Cy(g, 0.05, 0.04, 0.05, '#2b2d36', 0, 0, 0); Cy(g, 0.044, 0.044, 0.006, C.choc, 0, 0.048, 0); for (let k = 0; k < 4; k++) { const a = k * 1.6; S(g, 0.016, [C.straw, C.lemon, C.white, C.lime][k], Math.cos(a) * 0.08, 0.016, Math.sin(a) * 0.08); } },
  etonmess: g => dessertCup(g, [[C.straw, 0.025], [C.white, 0.03], [C.berry, 0.02]], { top: C.cream, deco: C.straw }),
  // Fryer
  churros: g => sticks(g, C.golden, { n: 5, dust: C.pale, dip: C.choc }),
  chicken: g => pieces(g, C.fried, { n: 4, r: 0.032, sx: 1.3, on: C.paper }),
  springroll: g => { B(g, 0.17, 0.008, 0.12, C.paper, 0, 0, 0); for (let k = 0; k < 3; k++) { const z = -0.04 + k * 0.04; const m = mesh(geo('fsr', () => new THREE.CylinderGeometry(0.016, 0.016, 0.12, 8)), M(C.golden), 0, 0.024, z, false); m.rotation.z = PI / 2; m.rotation.y = 0.2; g.add(m); } Cy(g, 0.02, 0.016, 0.015, '#e8323c', 0.07, 0.008, 0.05, 8); },
  calamari: g => { plate(g); for (let k = 0; k < 6; k++) T(g, 0.018, 0.007, C.golden, Math.cos(k) * 0.05, 0.02 + (k % 2) * 0.01, Math.sin(k) * 0.05); S(g, 0.014, C.lemon, 0, 0.02, 0); },
  hashbrowns: g => { for (let k = 0; k < 3; k++) { const m = B(g, 0.07, 0.02, 0.045, C.fried, 0, k * 0.012, -0.03 + k * 0.03); m.rotation.y = k * 0.4; } },
  onionrings: g => { for (let k = 0; k < 4; k++) T(g, 0.03, 0.012, C.golden, (k % 2) * 0.03 - 0.015, 0.012 + k * 0.018, Math.floor(k / 2) * 0.02 - 0.01); },
  donutholes: g => pieces(g, C.golden, { n: 7, r: 0.02, sy: 1, dip: null, on: C.paper }),
  falafel: g => { pieces(g, '#8a6a2e', { n: 5, r: 0.022, sy: 1, on: C.plate }); S(g, 0.02, C.white, 0, 0.02, 0, 1.4, 0.4, 1); },
  samosa: g => { for (let k = 0; k < 3; k++) { const m = Cone(g, 0.04, 0.035, C.golden, -0.05 + k * 0.05, 0, (k % 2) * 0.03, 3); m.rotation.y = k; } },
  fishchips: g => fishChips(g),
  chickenbucket: g => bucket(g, C.fried),
  beignets: g => { for (let k = 0; k < 3; k++) { B(g, 0.045, 0.03, 0.045, C.golden, -0.05 + k * 0.05, 0, (k % 2) * 0.03).rotation.y = k; S(g, 0.03, C.white, -0.05 + k * 0.05, 0.03, (k % 2) * 0.03, 1, 0.25, 1); } },
  // Drinks
  tea: g => cup(g, C.tea, { cupC: '#bfe6ff' }),
  chai: g => cup(g, '#c69c6d', { foam: C.cream, dust: '#8a5a2e', cupC: '#e8b9d6' }),
  milkshake: g => glassDrink(g, C.pink, { ice: false, foam: C.white, top: C.berry, straw: C.berry }),
  icedcoffee: g => glassDrink(g, C.latte, { straw: C.white }),
  matcha: g => cup(g, C.matcha, { foam: '#c8e6a8', cupC: '#f4f0e8', art: C.white }),
  hotchoc: g => cup(g, C.choc, { foam: C.white, dust: C.milkchoc, cupC: '#e85d75' }),
  latte: g => cup(g, C.latte, { foam: '#e8d4b4', art: C.white, tall: true, handle: false, cupC: '#ffffff' }),
  cappuccino: g => cup(g, C.coffee, { foam: C.cream, dust: C.milkchoc, h: 0.075, r: 0.05 }),
  flatwhite: g => cup(g, C.latte, { foam: '#e8d4b4', art: C.white, h: 0.065, r: 0.045, cupC: '#3a3d44' }),
  mocha: g => cup(g, C.milkchoc, { foam: C.white, dust: C.choc, lid: true, sleeve: '#8a5a2e' }),
  icedtea: g => glassDrink(g, C.tea, { garnish: C.lemon }),
  pumpkinlatte: g => cup(g, C.orange, { lid: true, sleeve: C.orange, cupC: C.white }),
  goldenlatte: g => cup(g, C.saffron, { foam: '#ffe9a8', dust: '#a86a2a', cupC: '#2b2d36' }),
  frappe: g => glassDrink(g, C.cream, { ice: false, foam: C.white, top: C.caramel, straw: C.cream, h: 0.15 }),
  // Ice cream
  shavedice: g => { Cy(g, 0.05, 0.035, 0.035, C.white, 0, 0, 0); Cone(g, 0.05, 0.07, C.straw, 0, 0.03, 0, 10); S(g, 0.03, C.blue, 0.015, 0.06, 0.01, 1, 0.6, 1); },
  mochi: g => { for (let k = 0; k < 3; k++) S(g, 0.03, [C.pink, C.matcha, C.white][k], -0.05 + k * 0.05, 0.022, (k % 2) * 0.03, 1, 0.75, 1); },
  affogato: g => { Cy(g, 0.045, 0.035, 0.05, C.glass, 0, 0, 0); Cy(g, 0.04, 0.04, 0.02, C.coffee, 0, 0.012, 0); S(g, 0.03, C.cream, 0, 0.05, 0); },
  gelato: g => iceCone(g, [C.straw, C.cream], { cone: '#d8b07a' }),
  froyo: g => { Cy(g, 0.045, 0.035, 0.04, C.pink, 0, 0, 0); for (let k = 0; k < 3; k++) Cone(g, 0.04 - k * 0.01, 0.025, C.white, 0, 0.035 + k * 0.02, 0, 12); dots(g, 4, 0.01, C.berry, 0.025, 0.06); },
  bananasplit: g => { S(g, 0.05, C.white, 0, 0.01, 0, 2.2, 0.3, 1); S(g, 0.02, C.lemon, 0, 0.03, -0.035, 4, 0.6, 0.8); S(g, 0.02, C.lemon, 0, 0.03, 0.035, 4, 0.6, 0.8); for (let k = 0; k < 3; k++) S(g, 0.028, [C.choc, C.cream, C.straw][k], -0.05 + k * 0.05, 0.045, 0); S(g, 0.01, C.berry, 0, 0.078, 0); },
  chocice: g => { for (let k = 0; k < 2; k++) { B(g, 0.05, 0.08, 0.025, C.choc, -0.03 + k * 0.06, 0.04, 0); Cy(g, 0.004, 0.004, 0.05, C.pale, -0.03 + k * 0.06, 0, 0, 5); } },
  sorbet: g => { Cy(g, 0.05, 0.035, 0.035, C.glass, 0, 0, 0); S(g, 0.035, C.lemon, -0.015, 0.05, 0); S(g, 0.032, C.straw, 0.02, 0.055, 0.01); S(g, 0.006, C.green, 0, 0.09, 0, 2, 0.4, 1); },
  pistachio: g => iceCone(g, [C.pistachio, C.pistachio], { sprinkle: C.green }),
  bakedalaska: g => { plate(g); Cy(g, 0.07, 0.07, 0.02, C.golden, 0, 0.012, 0); S(g, 0.065, '#f2d9a6', 0, 0.075, 0, 1, 0.9, 1); dots(g, 6, 0.008, '#c8802e', 0.05, 0.13); },
  // Grill
  burger: g => burger(g, {}),
  quesadilla: g => { for (let k = 0; k < 3; k++) { const m = Cone(g, 0.06, 0.02, C.pale, (k - 1) * 0.04, 0, 0, 3); m.rotation.y = k * 2.1; } dots(g, 5, 0.008, C.cheese, 0.05, 0.02); },
  kebab: g => skewer(g, [C.meat, C.green, C.tomato, C.meat, '#f2e8c8'], { n: 2 }),
  panini: g => sandwich(g, C.pale, [C.cheese, C.ham, C.green], { toasted: C.golden }),
  grilledcheese: g => sandwich(g, C.pale, [C.cheese, C.cheese], { toasted: C.fried }),
  clubsandwich: g => sandwich(g, C.pale, [C.green, C.tomato, C.ham, C.cheese], { stick: true }),
  steaksandwich: g => sandwich(g, '#d8b07a', [C.meat, C.green, '#e8c58f'], { cut: false }),
  halloumi: g => roll2(g, C.pale, [C.green, '#f2e8c8'], { len: 0.16, r: 0.032 }),
  cheesesteak: g => roll2(g, C.golden, [C.meat, C.cheese], { len: 0.17, r: 0.03 }),
  lobsterroll: g => { roll2(g, C.golden, [], { open: false, r: 0.03 }); S(g, 0.03, '#ff8a6a', 0, 0.055, 0, 2.4, 0.5, 0.8); dots(g, 4, 0.006, C.green, 0.05, 0.07); },
  // Pizza
  margherita: g => flatTop(g, C.pale, { rim: C.golden, sauce: C.tomato, cheese: C.cream, tops: [[C.leaf, 4, 0.012]] }),
  garlicbread: g => { for (let k = 0; k < 4; k++) { const m = B(g, 0.04, 0.025, 0.08, C.golden, -0.06 + k * 0.04, 0, 0); m.rotation.y = 0.2; S(g, 0.012, C.green, -0.06 + k * 0.04, 0.028, 0, 1, 0.4, 2); } },
  pepperoni: g => flatTop(g, C.pale, { rim: C.golden, sauce: C.tomato, cheese: C.cheese, tops: [[C.berry, 7, 0.016]], seed: 3 }),
  trufflepizza: g => flatTop(g, C.pale, { rim: C.golden, cheese: C.cream, tops: [[C.choc, 8, 0.01], [C.leaf, 3, 0.01]] }),
  calzone: g => { S(g, 0.07, C.golden, 0, 0.02, 0, 1.4, 0.5, 0.9); T(g, 0.07, 0.01, C.fried, 0, 0.02, 0, PI); },
  hawaiian: g => flatTop(g, C.pale, { rim: C.golden, sauce: C.tomato, cheese: C.cheese, tops: [[C.lemon, 6, 0.014], [C.ham, 5, 0.014]] }),
  fourcheese: g => flatTop(g, C.pale, { rim: C.golden, cheese: C.cheese, tops: [[C.cream, 5, 0.016], [C.white, 4, 0.014], ['#d8b07a', 4, 0.012]] }),
  pizzafritta: g => { S(g, 0.07, C.fried, 0, 0.02, 0, 1, 0.45, 1); S(g, 0.04, C.tomato, 0, 0.04, 0, 1, 0.2, 1); },
  deepdish: g => { Cy(g, 0.09, 0.09, 0.05, C.golden, 0, 0, 0, 18); Cy(g, 0.08, 0.08, 0.006, C.tomato, 0, 0.05, 0, 18); dots(g, 6, 0.012, C.cheese, 0.06, 0.056); },
  pizzabianca: g => flatTop(g, C.pale, { rim: C.golden, cheese: C.white, tops: [[C.green, 6, 0.008]] }),
  // Griddle
  crepes: g => crepe(g, C.pale, { fill: C.choc, dust: C.white }),
  galette: g => crepe(g, '#a86a2a', { fill: C.ham, top: C.lemon }),
  okonomiyaki: g => { plate(g); Cy(g, 0.075, 0.075, 0.03, C.golden, 0, 0.012, 0); for (let k = -2; k <= 2; k++) B(g, 0.14, 0.004, 0.006, C.dark, 0, 0.044, k * 0.025).rotation.y = 0.4; dots(g, 6, 0.006, C.green, 0.05, 0.048); },
  dorayaki: g => stackDiscs(g, C.fried, { n: 2, r: 0.05, h: 0.016, between: C.choc }),
  crumpets: g => crumpet(g, C.pale, { butter: C.cheese }),
  blinis: g => { for (let k = 0; k < 4; k++) { const x = -0.045 + (k % 2) * 0.09, z = -0.03 + Math.floor(k / 2) * 0.06; Cy(g, 0.026, 0.026, 0.012, C.pale, x, 0, z); S(g, 0.014, C.white, x, 0.016, z, 1, 0.5, 1); S(g, 0.008, k % 2 ? C.salmon : '#2b2d36', x, 0.024, z); } },
  arepas: g => { for (let k = 0; k < 2; k++) { const x = (k - 0.5) * 0.08; Cy(g, 0.04, 0.04, 0.035, C.pale, x, 0, 0); B(g, 0.07, 0.012, 0.03, k ? C.meat : C.cheese, x, 0.012, 0.012); } },
  dutchbaby: g => { Cy(g, 0.085, 0.07, 0.03, '#2b2d36', 0, 0, 0); T(g, 0.06, 0.018, C.golden, 0, 0.035, 0); S(g, 0.05, C.pale, 0, 0.03, 0, 1, 0.2, 1); dots(g, 5, 0.01, C.berry, 0.03, 0.04); },
  teppanyaki: g => { B(g, 0.19, 0.01, 0.12, '#3a3d44', 0, 0, 0); for (let k = 0; k < 4; k++) B(g, 0.03, 0.02, 0.03, k % 2 ? C.meat : C.green, -0.06 + k * 0.04, 0.01, (k % 2) * 0.03); dots(g, 5, 0.01, C.orange, 0.05, 0.02, 3); },
  // Steamer
  bao: g => { for (let k = 0; k < 2; k++) { const z = (k - 0.5) * 0.06; S(g, 0.04, C.white, 0, 0.025, z, 1, 0.5, 0.8); B(g, 0.06, 0.016, 0.02, C.meat, 0.01, 0.02, z); S(g, 0.008, C.green, 0.03, 0.035, z); } },
  siumai: g => dumplings(g, C.saffron, { n: 4, basket: '#c9a46a', pleat: C.orange, tall: true }),
  lotusbun: g => dumplings(g, C.white, { n: 3, basket: '#c9a46a', pleat: C.pink, r: 0.032 }),
  hargow: g => dumplings(g, '#f4ecdc', { n: 4, basket: '#c9a46a', pleat: C.salmon }),
  xiaolongbao: g => dumplings(g, '#fff6e6', { n: 5, basket: '#b88452', pleat: '#fff6e6', tall: true }),
  charsiu: g => dumplings(g, C.white, { n: 3, basket: '#c9a46a', pleat: C.berry, r: 0.032 }),
  ricewrap: g => { for (let k = 0; k < 2; k++) { B(g, 0.07, 0.04, 0.06, '#5f8f4a', (k - 0.5) * 0.08, 0, 0).rotation.y = k * 0.4; B(g, 0.004, 0.042, 0.062, C.paper, (k - 0.5) * 0.08, 0, 0).rotation.y = k * 0.4; } },
  custardbun: g => dumplings(g, '#fff6e6', { n: 3, basket: '#c9a46a', pleat: C.lemon, r: 0.032 }),
  // Noodles
  ramen: g => bowl(g, '#e8c58f', { noodles: C.pale, broth: '#d8a86a', egg: true, greens: C.green, chop: true }),
  udon: g => bowl(g, '#d8b07a', { noodles: C.white, broth: '#c8a07a', greens: C.green, bowlC: '#2b2d36' }),
  padthai: g => { plate(g); for (let k = 0; k < 4; k++) T(g, 0.025 + k * 0.012, 0.006, C.orange, 0, 0.02, 0, PI * 1.5); dots(g, 4, 0.01, C.salmon, 0.05, 0.03); S(g, 0.014, C.lime, 0.07, 0.02, 0); },
  laksa: g => bowl(g, C.orange, { noodles: C.pale, broth: '#e89a3a', tops: [[C.salmon, 3], [C.green, 3]], bowlC: C.white }),
  pho: g => bowl(g, '#d8a86a', { noodles: C.white, broth: '#d8a86a', tops: [[C.meat, 4, 0.016], [C.green, 5, 0.008]], bowlC: C.white }),
  chowmein: g => { Cy(g, 0.06, 0.05, 0.05, C.white, 0, 0, 0); for (let k = 0; k < 4; k++) T(g, 0.02 + k * 0.01, 0.006, '#c8802e', 0, 0.05, 0, PI * 1.6); dots(g, 4, 0.01, C.green, 0.04, 0.058); },
  dandan: g => bowl(g, C.tomato, { noodles: C.pale, broth: '#c8323c', tops: [[C.meat, 4], [C.green, 3, 0.008]], bowlC: C.white }),
  tonkotsu: g => bowl(g, C.cream, { noodles: C.pale, broth: '#f2e8c8', egg: true, tops: [[C.ham, 2, 0.02]], greens: C.green, bowlC: C.redbowl }),
  seafoodudon: g => bowl(g, '#c8a07a', { noodles: C.white, broth: '#c8a07a', tops: [[C.salmon, 4, 0.016]], bowlC: C.blue }),
  // Chocolate
  truffles: g => choc(g, C.choc, { dust: C.milkchoc }),
  brownies: g => choc(g, C.choc, { shape: 'square', cups: null, drizzle: C.cream }),
  bonbons: g => choc(g, C.milkchoc, { shape: 'dome', drizzle: C.pink }),
  dipped: g => { plate(g); for (let k = 0; k < 4; k++) { const a = k * 1.6; S(g, 0.022, C.berry, Math.cos(a) * 0.05, 0.03, Math.sin(a) * 0.05, 1, 1.2, 1); S(g, 0.023, C.choc, Math.cos(a) * 0.05, 0.022, Math.sin(a) * 0.05, 1, 0.6, 1); } },
  goldtruffles: g => choc(g, C.choc, { gold: true }),
  chocbomb: g => { for (let k = 0; k < 2; k++) { S(g, 0.04, C.milkchoc, (k - 0.5) * 0.09, 0.04, 0); B(g, 0.06, 0.004, 0.006, C.pink, (k - 0.5) * 0.09, 0.075, 0).rotation.y = 0.5; } },
  rockyroad: g => { for (let k = 0; k < 3; k++) { B(g, 0.045, 0.035, 0.045, C.choc, -0.05 + k * 0.05, 0, (k % 2) * 0.03).rotation.y = k; S(g, 0.012, C.white, -0.05 + k * 0.05, 0.04, (k % 2) * 0.03); S(g, 0.01, C.pink, -0.04 + k * 0.05, 0.038, (k % 2) * 0.03 + 0.012); } },
  pralines: g => choc(g, C.caramel, { shape: 'dome', cups: '#2b2d36', dust: C.pale }),
  fountain: g => { Cy(g, 0.07, 0.07, 0.015, shiny('#c9ccd3'), 0, 0, 0); for (let k = 0; k < 3; k++) Cy(g, 0.05 - k * 0.012, 0.055 - k * 0.012, 0.03, C.choc, 0, 0.015 + k * 0.04, 0); Cy(g, 0.008, 0.008, 0.12, shiny('#c9ccd3'), 0, 0.015, 0); },
  goldbars: g => { for (let k = 0; k < 3; k++) B(g, 0.07, 0.025, 0.035, shiny(C.gold), (k % 2) * 0.02 - 0.01, k * 0.025, -0.02 + (k % 2) * 0.04).rotation.y = k * 0.3; },
  // BBQ
  ribs: g => meatSlab(g, '#8a3b2a', { bark: '#5a2016', bones: 4, sauce: '#a8322a' }),
  brisket: g => meatSlab(g, '#a8584a', { bark: '#2b1a14', slices: 3 }),
  wings: g => pieces(g, '#a8322a', { n: 5, r: 0.026, sx: 1.4, on: C.plate }),
  smokedfish: g => { B(g, 0.2, 0.012, 0.12, '#a8703f', 0, 0, 0); S(g, 0.04, '#c8802e', 0, 0.03, 0, 2.2, 0.5, 0.9); Cone(g, 0.03, 0.04, '#a86a2a', 0.1, 0.01, 0, 3).rotation.z = PI / 2; },
  pulledpork: g => { burger(g, { patty: '#a8584a', cheese: null, salad: '#f2e8c8', seeds: false }); },
  burntends: g => { B(g, 0.2, 0.012, 0.13, '#a8703f', 0, 0, 0); for (let k = 0; k < 6; k++) B(g, 0.032, 0.03, 0.032, k % 2 ? '#2b1a14' : '#5a2016', -0.05 + (k % 3) * 0.05, 0.012, -0.025 + Math.floor(k / 3) * 0.05).rotation.y = k; },
  sausages: g => { B(g, 0.2, 0.012, 0.12, '#a8703f', 0, 0, 0); for (let k = 0; k < 3; k++) { const m = mesh(geo('fsg', () => new THREE.CylinderGeometry(0.016, 0.016, 0.14, 8)), M('#8a3b2a'), 0, 0.03, -0.04 + k * 0.04, false); m.rotation.z = PI / 2; g.add(m); } },
  beefribs: g => meatSlab(g, '#6b2a1a', { bark: '#2b1a14', bones: 3, w: 0.17, d: 0.09, h: 0.05 }),
  // Patisserie
  eclairs: g => eclair(g, C.golden, C.choc, { line: C.white }),
  millefeuille: g => { for (let k = 0; k < 3; k++) { B(g, 0.12, 0.012, 0.06, C.golden, 0, k * 0.022, 0); if (k < 2) B(g, 0.115, 0.01, 0.058, C.cream, 0, k * 0.022 + 0.012, 0); } B(g, 0.12, 0.006, 0.06, C.white, 0, 0.066, 0); for (let k = -1; k <= 1; k++) B(g, 0.004, 0.002, 0.06, C.choc, k * 0.03, 0.072, 0); },
  opera: g => { for (let k = 0; k < 5; k++) B(g, 0.12, 0.012, 0.07, k % 2 ? C.coffee : '#c69c6d', 0, k * 0.012, 0); B(g, 0.12, 0.008, 0.07, shiny(C.choc), 0, 0.06, 0); S(g, 0.008, shiny(C.gold), 0.03, 0.07, 0); },
  croquembouche: g => tower(g, C.golden, { rows: 6, accent: C.caramel }),
  parisbrest: g => { T(g, 0.055, 0.022, C.golden, 0, 0.022, 0); T(g, 0.055, 0.014, C.cream, 0, 0.036, 0); dots(g, 6, 0.006, '#c8a07a', 0.06, 0.05); },
  tatin: g => { Cy(g, 0.085, 0.085, 0.02, C.golden, 0, 0, 0); for (let k = 0; k < 7; k++) { const a = k / 7 * PI * 2; S(g, 0.024, C.caramel, Math.cos(a) * 0.055, 0.025, Math.sin(a) * 0.055, 1, 0.5, 1.3); } S(g, 0.024, C.caramel, 0, 0.025, 0, 1, 0.5, 1); },
  macarontower: g => { for (let k = 0; k < 6; k++) { const r = 0.07 - k * 0.01; Cy(g, r, r, 0.02, [C.pink, C.pistachio, C.lemon, C.purple, C.straw, C.cream][k], 0, k * 0.022, 0, 12); } },
  blackforest: g => slice(g, [[C.choc, 0.025], [C.cream, 0.012], [C.choc, 0.025], [C.cream, 0.012]], { top: C.white, deco: C.berry }),
  religieuse: g => { S(g, 0.045, C.golden, 0, 0.035, 0, 1, 0.8, 1); S(g, 0.04, C.choc, 0, 0.05, 0, 1, 0.3, 1); S(g, 0.025, C.golden, 0, 0.085, 0); S(g, 0.022, C.choc, 0, 0.095, 0, 1, 0.4, 1); },
  // Bar
  lemonade: g => glassDrink(g, C.lemon, { garnish: C.lemon, straw: C.straw }),
  mocktail: g => glassDrink(g, null, { layers: [[C.orange, 0.4], [C.straw, 0.4]], garnish: C.orange, straw: C.lime }),
  cocoshake: g => { Cy(g, 0.05, 0.045, 0.05, '#6b4226', 0, 0, 0); S(g, 0.05, '#6b4226', 0, 0.05, 0, 1, 0.9, 1); Cy(g, 0.035, 0.035, 0.006, C.white, 0, 0.09, 0); Cy(g, 0.004, 0.004, 0.07, C.straw, 0.01, 0.07, 0, 5).rotation.z = -0.2; },
  spritz: g => glassDrink(g, '#e8f4c8', { garnish: C.lime, ice: true, h: 0.14 }),
  mojito: g => { glassDrink(g, '#e8f8e0', { garnish: C.lime, straw: C.green }); dots(g, 4, 0.008, C.leaf, 0.02, 0.1); },
  icedmatcha: g => glassDrink(g, null, { layers: [[C.white, 0.45], [C.matcha, 0.4]], straw: C.green }),
  float: g => glassDrink(g, '#8a3b2a', { ice: false, top: C.white, straw: C.berry }),
  frozenlemonade: g => glassDrink(g, '#fff3a8', { ice: false, foam: '#fff8cc', garnish: C.lemon, straw: C.lemon }),
  espressotonic: g => glassDrink(g, null, { layers: [[C.glass, 0.5], [C.coffee, 0.35]], garnish: C.orange }),
  goldcocktail: g => { glassDrink(g, C.saffron, { ice: false, garnish: null }); S(g, 0.012, shiny(C.gold), 0.02, 0.14, 0); },
  // Sushi
  maki: g => sushiRolls(g, C.rice, C.salmon),
  bento: g => boxMeal(g, [C.rice, C.salmon, C.green, C.orange], { lid: '#c8323c' }),
  sashimi: g => { B(g, 0.2, 0.012, 0.09, '#c9a46a', 0, 0, 0); for (let k = 0; k < 5; k++) B(g, 0.03, 0.014, 0.05, k % 2 ? C.tuna : C.salmon, -0.07 + k * 0.035, 0.012, 0).rotation.y = 0.3; S(g, 0.01, C.lime, 0.08, 0.02, 0.03); },
  omakase: g => { boxMeal(g, [C.salmon, C.tuna, C.rice, C.orange], { boxC: '#5a3520' }); S(g, 0.008, shiny(C.gold), 0.07, 0.05, 0.04); },
  nigiri: g => nigiri(g, C.salmon),
  california: g => sushiRolls(g, '#f2a8a0', C.lime, { rim: C.rice, top: C.orange }),
  poke: g => bowl(g, C.rice, { tops: [[C.tuna, 4, 0.016], [C.lime, 3], [C.orange, 3, 0.01]], bowlC: '#2b2d36' }),
  temaki: g => { for (let k = 0; k < 2; k++) { const c = Cone(g, 0.03, 0.1, C.nori, (k - 0.5) * 0.07, 0.01, 0, 8, true); c.rotation.z = 0.5; S(g, 0.022, C.rice, (k - 0.5) * 0.07 + 0.02, 0.09, 0); S(g, 0.012, C.salmon, (k - 0.5) * 0.07 + 0.025, 0.1, 0); } },
  chirashi: g => bowl(g, C.rice, { tops: [[C.salmon, 4, 0.016], [C.tuna, 3, 0.016], [C.orange, 3, 0.008]], bowlC: C.redbowl }),
  // Rotisserie
  roastchicken: g => roast(g, C.fried, { lemon: C.lemon }),
  porchetta: g => { B(g, 0.2, 0.012, 0.13, '#a8703f', 0, 0, 0); const m = mesh(geo('fporch', () => new THREE.CylinderGeometry(0.04, 0.04, 0.15, 12)), M('#c8802e'), 0, 0.052, 0, false); m.rotation.z = PI / 2; g.add(m); for (let k = -2; k <= 2; k++) { const t = T(g, 0.041, 0.003, C.paper, k * 0.028, 0.052, 0); t.rotation.set(0, PI / 2, 0); } },
  shawarma: g => spit(g, '#a8584a', { top: '#c8802e' }),
  gyros: g => roll2(g, C.pale, [C.meat, C.white, C.tomato], { len: 0.14, r: 0.035 }),
  periperi: g => roast(g, '#c8402e', { herbs: C.green }),
  lamb: g => spit(g, '#8a3b2a', { stack: 4, top: '#a8584a' }),
  trufflechicken: g => { roast(g, C.golden, { herbs: C.choc }); S(g, 0.01, shiny(C.gold), 0, 0.1, 0); },
  // Candy
  candyfloss: g => onStick(g, C.pink, { kind: 'cloud' }),
  toffeeapple: g => onStick(g, shiny(C.berry), { kind: 'ball', h: 0.06 }),
  rockcandy: g => onStick(g, mat(C.blue, { transparent: true, opacity: 0.85, roughness: 0.1 }), { kind: 'crystal', h: 0.06 }),
  fudge: g => candyCubes(g, C.caramel, { n: 6 }),
  lollipops: g => { onStick(g, C.straw, { kind: 'disc', ring: C.white, h: 0.08 }); },
  honeycomb: g => candyCubes(g, C.saffron, { n: 5, size: 0.04, holes: C.caramel }),
  marshmallow: g => candyCubes(g, C.white, { n: 6, round: true, top: null, on: C.pink }),
  goldlolly: g => onStick(g, shiny(C.gold), { kind: 'disc', ring: C.white, h: 0.08 }),
  // Grand
  saffronbun: g => roll(g, C.saffron, { n: 2, swirl: '#c8802e', top: C.berry }),
  goldcroissant: g => { const c = T(g, 0.05, 0.028, shiny(C.gold), 0, 0.028, 0, PI * 1.25); c.rotation.z = 0.3; },
  banquet: g => { Cy(g, 0.11, 0.1, 0.012, shiny('#c9ccd3'), 0, 0, 0, 18); S(g, 0.05, C.fried, 0, 0.04, 0, 1.3, 0.8, 1); dots(g, 6, 0.014, C.tomato, 0.08, 0.02, 2); dots(g, 4, 0.012, C.green, 0.08, 0.02, 6); },
  fruitcake: g => { B(g, 0.12, 0.07, 0.1, '#6b3a20', 0, 0, 0); B(g, 0.122, 0.012, 0.102, C.white, 0, 0.07, 0); dots(g, 4, 0.01, C.berry, 0.04, 0.09); for (let k = 0; k < 3; k++) S(g, 0.01, '#d8452e', -0.04 + k * 0.04, 0.035, 0.051); },
  saffroncake: g => roundCake(g, [[C.saffron, 0.04], [C.cream, 0.01], [C.saffron, 0.04]], { top: C.lemon, deco: C.white }),
  truffletart: g => tart(g, C.crust, '#4a3a2a', { tops: [[C.choc, 6, 0.012], [C.gold, 2, 0.008]] }),
  goldcroq: g => tower(g, shiny(C.gold), { rows: 6, accent: C.white, base: C.gold }),
};

const cache = new Map();
// A food model for the counter, or null when there isn't one here (scene.js has the older hand-made ones)
export function foodModel(id) {
  const fn = F[id];
  if (!fn) return null;
  if (!cache.has(id)) {
    const g = new THREE.Group();
    fn(g);
    // Fit it on a tray spot: no wider than about 0.22 across, no taller than 0.2
    const bb = new THREE.Box3().setFromObject(g), sz = new THREE.Vector3(); bb.getSize(sz);
    const k = Math.min(1, 0.22 / Math.max(sz.x, sz.z), 0.2 / Math.max(0.01, sz.y));
    g.scale.multiplyScalar(k);
    const holder = new THREE.Group(); holder.add(g);
    mergeStatic(holder);
    cache.set(id, holder);
  }
  const m = cache.get(id).clone();
  m.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  return m;
}
export const hasFoodModel = id => id in F;
