// The neighbourhood around the bakery: painted ground (grass, roads, pavements, park), buildings behind,
// parked and passing cars, trees, hedges, flowers, lamps. Built to be cheap: one ground texture, and
// repeated things (trees, flowers, grass, bushes, pickets) drawn as instanced batches.
// Tall things stay behind the bakery (screen top) so they never hide the shop; only low things sit in front.
import * as THREE from 'three';
import { V3, PI, geo, mat, smat, mesh, box, rbox, cyl, sphere, canvasTex, mergeStatic, texturize } from './three-helpers.js';

// The ground square, in world units. Its centre is (-3, 2) and everything fades out towards its edge.
const GX = -45, GZ = -40, GSIZE = 84, GPX = 2560 / GSIZE;
export const CENTER = { x: -3, z: 2 }, FADE_IN = 28, FADE_OUT = 41;

// The roads sit far enough out that a shop with both terraces still has a wide pavement in front and down the side.
// Everything beyond a road was laid out for roads 2.2 m closer in; shifted() moves a point out past them.
export const ROAD_SHIFT = 2.2;
const FRONT_EDGE = 7.0 + ROAD_SHIFT, SIDE_EDGE = 7.2 + ROAD_SHIFT; // the kerbs on the bakery's side of each road
const shiftX = x => (x >= 7.15 ? x + ROAD_SHIFT : x), shiftZ = z => (z >= 6.95 ? z + ROAD_SHIFT : z);
// Areas used both for painting and for keeping grass and flowers off the roads.
const ROADS = [
  { x0: GX, x1: GX + GSIZE, z0: FRONT_EDGE, z1: FRONT_EDGE + 3.8 },   // main road in front of the bakery
  { x0: SIDE_EDGE, x1: SIDE_EDGE + 3.4, z0: GZ, z1: FRONT_EDGE },     // side road
];
const PAVEMENTS = [
  { x0: GX, x1: SIDE_EDGE, z0: 4.8, z1: FRONT_EDGE },                 // in front of the bakery, round the corner
  { x0: GX, x1: GX + GSIZE, z0: FRONT_EDGE + 3.8, z1: FRONT_EDGE + 5.4 },
  { x0: 4.75, x1: SIDE_EDGE, z0: GZ, z1: FRONT_EDGE },                // down the side of the bakery
  { x0: SIDE_EDGE + 3.4, x1: SIDE_EDGE + 5.0, z0: GZ, z1: FRONT_EDGE + 3.8 },
  { x0: -14.2, x1: -11.8, z0: -4.75, z1: 4.8 },  // the back alley
];
const BUILT = [ // footprints of the bakery, back room, alley and buildings: no grass here
  { x0: -14.2, x1: 6.8, z0: -12, z1: 4.8 },
  { x0: shiftX(12.2), x1: shiftX(18), z0: -12, z1: 6.4 },
  { x0: -26.5, x1: -20.5, z0: -12, z1: -5.6 },
];
const POND = { x: -20.5, z: 1.2, rx: 2.8, rz: 1.9 };
const inside = (r, x, z, pad = 0) => x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad;
const inPond = (x, z, pad = 0) => ((x - POND.x) / (POND.rx + pad)) ** 2 + ((z - POND.z) / (POND.rz + pad)) ** 2 < 1;
const isGrass = (x, z) => ![...ROADS, ...PAVEMENTS, ...BUILT].some(r => inside(r, x, z, 0.3)) && !inPond(x, z, 0.5)
  && Math.hypot(x - CENTER.x, z - CENTER.z) < FADE_OUT - 2;

// A repeatable random sequence so the town looks the same every time.
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

export function buildWorld(scene) {
  const root = new THREE.Group();
  const rand = rng(1234);
  const nightMats = []; // { m, k } emissiveIntensity = night * k
  const night = (m, k = 1) => { nightMats.push({ m, k }); return m; };

  // ---------- Ground ----------
  const groundTex = canvasTex(2560, 2560, (c, w, h) => {
    const X = x => (x - GX) * GPX, Z = z => (z - GZ) * GPX;
    const rect = (x0, z0, x1, z1, col) => { c.fillStyle = col; c.fillRect(X(x0), Z(z0), (x1 - x0) * GPX, (z1 - z0) * GPX); };
    c.fillStyle = '#86b86a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      c.fillStyle = rand() < 0.5 ? 'rgba(55,105,45,0.07)' : 'rgba(200,225,120,0.08)';
      c.beginPath(); c.arc(rand() * w, rand() * h, 6 + rand() * 30, 0, 2 * PI); c.fill();
    }
    // Mown stripes
    for (let x = GX; x < GX + GSIZE; x += 3) { c.fillStyle = 'rgba(255,255,230,0.05)'; c.fillRect(X(x), 0, 1.5 * GPX, h); }
    // Pavements, with a tile grid and the odd slab a shade off
    for (const p of PAVEMENTS) {
      rect(p.x0, p.z0, p.x1, p.z1, '#aaa6b2');
      for (let x = Math.ceil(p.x0); x < p.x1; x += 1.1) for (let z = Math.ceil(p.z0); z < p.z1; z += 1.1) if (rand() < 0.18) { c.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'; c.fillRect(X(x), Z(z), 1.1 * GPX, 1.1 * GPX); }
      c.strokeStyle = 'rgba(80,76,90,0.35)'; c.lineWidth = 2;
      for (let x = Math.ceil(p.x0); x < p.x1; x += 1.1) { c.beginPath(); c.moveTo(X(x), Z(p.z0)); c.lineTo(X(x), Z(p.z1)); c.stroke(); }
      for (let z = Math.ceil(p.z0); z < p.z1; z += 1.1) { c.beginPath(); c.moveTo(X(p.x0), Z(z)); c.lineTo(X(p.x1), Z(z)); c.stroke(); }
    }
    // Roads
    for (const r of ROADS) {
      rect(r.x0, r.z0, r.x1, r.z1, '#4b4a55');
      for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(255,255,255,${rand() * 0.04})`; c.fillRect(X(r.x0 + rand() * (r.x1 - r.x0)), Z(r.z0 + rand() * (r.z1 - r.z0)), 3, 3); }
    }
    const paint = '#efece2';
    const R = ROAD_SHIFT;
    for (let x = GX; x < GX + GSIZE; x += 2.4) if (x + 1.3 < 6.9 + R || x > 10.9 + R) rect(x, 8.85 + R, x + 1.3, 9.0 + R, paint);
    for (let z = GZ; z < 6.2 + R; z += 2.4) rect(8.83 + R, z, 8.98 + R, z + 1.3, paint);
    for (let x = GX + 1; x < 7 + R; x += 2.6) rect(x, 7.0 + R, x + 0.08, 7.75 + R, 'rgba(239,236,226,0.7)'); // parking bays
    for (let z = 7.2 + R; z < 10.7 + R; z += 0.7) rect(2.3, z, 4.7, z + 0.38, paint);                    // zebra crossing
    rect(7.25 + R, 6.55 + R, 10.55 + R, 6.72 + R, paint);                                                 // stop line
    // Zig-zags either side of the crossing, along both kerbs
    c.strokeStyle = paint; c.lineWidth = 0.09 * GPX;
    for (const [z0, z1] of [[FRONT_EDGE + 0.18, FRONT_EDGE + 0.42], [FRONT_EDGE + 3.38, FRONT_EDGE + 3.62]]) for (const [xa, xb] of [[-0.7, 2.0], [5.0, 7.7]]) {
      c.beginPath(); let k = 0; for (let x = xa; x <= xb + 1e-6; x += 0.45, k++) { const zz = k % 2 ? z1 : z0; k ? c.lineTo(X(x), Z(zz)) : c.moveTo(X(x), Z(zz)); } c.stroke();
    }
    // Manholes and drains
    for (const [x, z] of [[-9, FRONT_EDGE + 1.4], [13.5, FRONT_EDGE + 2.6], [SIDE_EDGE + 1.7, -6], [-20, FRONT_EDGE + 2.4]]) {
      c.fillStyle = '#3c3b44'; c.beginPath(); c.arc(X(x), Z(z), 0.34 * GPX, 0, 2 * PI); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2; for (let q = -2; q <= 2; q++) { c.beginPath(); c.moveTo(X(x - 0.25), Z(z + q * 0.1)); c.lineTo(X(x + 0.25), Z(z + q * 0.1)); c.stroke(); }
    }
    for (let x = -24; x < 20; x += 6) { c.fillStyle = '#2f2e36'; c.fillRect(X(x), Z(FRONT_EDGE + 0.04), 0.5 * GPX, 0.22 * GPX); }
    // Park: path, pond, flower beds
    c.strokeStyle = '#d9c69c'; c.lineWidth = 1.3 * GPX; c.lineCap = 'round';
    c.beginPath(); c.moveTo(X(-14.4), Z(4.4)); c.bezierCurveTo(X(-17), Z(4.4), X(-17.2), Z(-1.5), X(-20.5), Z(-2.4)); c.bezierCurveTo(X(-23.5), Z(-3.2), X(-25), Z(-1), X(-27), Z(0.5)); c.stroke();
    c.beginPath(); c.moveTo(X(-17.1), Z(3.0)); c.bezierCurveTo(X(-19), Z(5.6), X(-23), Z(5.6), X(-26), Z(4.2)); c.stroke();
    c.fillStyle = '#d9c69c'; c.beginPath(); c.ellipse(X(POND.x), Z(POND.z), (POND.rx + 0.45) * GPX, (POND.rz + 0.45) * GPX, 0, 0, 2 * PI); c.fill();
    c.fillStyle = '#3d7fa8'; c.beginPath(); c.ellipse(X(POND.x), Z(POND.z), POND.rx * GPX, POND.rz * GPX, 0, 0, 2 * PI); c.fill();
    for (const b of FLOWER_BEDS) { c.fillStyle = '#7a5a40'; c.beginPath(); c.ellipse(X(shiftX(b.x)), Z(shiftZ(b.z)), b.rx * GPX, b.rz * GPX, 0, 0, 2 * PI); c.fill(); }
    // Fade the whole ground out towards the edge
    c.globalCompositeOperation = 'destination-in';
    const g = c.createRadialGradient(X(CENTER.x), Z(CENTER.z), FADE_IN * GPX, X(CENTER.x), Z(CENTER.z), FADE_OUT * GPX);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GSIZE, GSIZE),
    smat({ map: groundTex, transparent: true, roughness: 1, depthWrite: false }));
  ground.rotation.x = -PI / 2;
  ground.position.set(GX + GSIZE / 2, -0.09, GZ + GSIZE / 2);
  ground.receiveShadow = true;
  ground.renderOrder = -1;
  scene.add(ground);
  // Kerbs along the roads near the bakery, so the road edge has a little height
  const kerb = mat('#8f8b98');
  const kerbs = [box(21.5 + ROAD_SHIFT, 0.09, 0.12, kerb, -3.6 + ROAD_SHIFT / 2, -0.09, FRONT_EDGE, false), box(30, 0.09, 0.12, kerb, -3, -0.09, FRONT_EDGE + 3.8, false),
    box(0.12, 0.09, 19 + ROAD_SHIFT, kerb, SIDE_EDGE, -0.09, -2.5 + ROAD_SHIFT / 2, false), box(0.12, 0.09, 22 + ROAD_SHIFT, kerb, SIDE_EDGE + 3.4, -0.09, -0.2 + ROAD_SHIFT / 2, false)];
  for (const k of kerbs) { k.userData.fixed = true; root.add(k); }
  // Pond water and lily pads
  const water = smat({ color: '#4f9fd0', roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.9 });
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 28), water);
  pond.scale.set(POND.rx - 0.1, POND.rz - 0.1, 1); pond.rotation.x = -PI / 2; pond.position.set(POND.x, -0.06, POND.z);
  root.add(pond);
  for (const [dx, dz] of [[-1, 0.4], [0.8, -0.6], [1.4, 0.7], [-0.3, -0.9]]) {
    const pad = new THREE.Mesh(geo('lily', () => new THREE.CircleGeometry(0.22, 10, 0.3, PI * 1.8)), mat('#5fae5a'));
    pad.rotation.x = -PI / 2; pad.position.set(POND.x + dx, -0.05, POND.z + dz); root.add(pad);
  }

  // ---------- Buildings (behind the bakery and off to the right) ----------
  function facade(w, h, base, seed, shopfront) {
    const r = rng(seed);
    const PU = 32, cw = Math.max(32, Math.round(w * PU)), ch = Math.max(32, Math.round(h * PU));
    const floors = Math.max(1, Math.round(h / 1.6));
    const cols = Math.max(1, Math.round(w / 1.25));
    const lit = [];
    const map = canvasTex(cw, ch, (c) => {
      c.fillStyle = base; c.fillRect(0, 0, cw, ch);
      c.fillStyle = 'rgba(0,0,0,0.08)'; for (let y = 0; y < ch; y += 6) c.fillRect(0, y, cw, 1);
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, 0, cw, 5);
      const fh = ch / floors, colw = cw / cols;
      for (let f = 0; f < floors; f++) {
        for (let k = 0; k < cols; k++) {
          const ground = f === floors - 1;
          const x = k * colw + colw * 0.22, ww = colw * 0.56;
          const y = f * fh + fh * (ground && shopfront ? 0.18 : 0.25), hh = fh * (ground && shopfront ? 0.62 : 0.5);
          if (ground && k === Math.floor(cols / 2)) { c.fillStyle = '#5a3a28'; c.fillRect(x + ww * 0.15, f * fh + fh * 0.3, ww * 0.7, fh * 0.7); lit.push(null); continue; }
          c.fillStyle = '#f1ece3'; c.fillRect(x - 2, y + hh, ww + 4, 3);
          c.fillStyle = '#3c5a7e'; c.fillRect(x, y, ww, hh);
          c.fillStyle = 'rgba(160,200,235,0.55)'; c.beginPath(); c.moveTo(x, y + hh * 0.6); c.lineTo(x + ww * 0.45, y); c.lineTo(x + ww * 0.65, y); c.lineTo(x, y + hh); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(x + ww / 2 - 1, y, 2, hh);
          lit.push({ x, y, ww, hh, on: r() < 0.55 });
        }
      }
    });
    const emissiveMap = canvasTex(cw, ch, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, cw, ch);
      for (const l of lit) if (l && l.on) { c.fillStyle = r() < 0.7 ? '#ffcf86' : '#bfe0ff'; c.fillRect(l.x, l.y, l.ww, l.hh); }
    });
    return night(smat({ map, emissiveMap, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.85 }), 1.1);
  }
  function building(x0, x1, z0, z1, h, color, seed, { shopfront = false, roof = '#6f6b78', props = true } = {}) {
    const w = x1 - x0, d = z1 - z0;
    BUILT.push({ x0: shiftX(x0), x1: shiftX(x1), z0: shiftZ(z0), z1: shiftZ(z1) });
    const side = smat({ color, roughness: 0.9 });
    const mats = [facade(d, h, color, seed + 1, shopfront), side, mat(roof), side, facade(w, h, color, seed, shopfront), side];
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    b.position.set((x0 + x1) / 2, h / 2 - 0.09, (z0 + z1) / 2); b.castShadow = true; b.receiveShadow = true;
    root.add(b);
    // Parapet and roof clutter
    const top = h - 0.09, cap = mat('#d9d3c8');
    root.add(box(w + 0.1, 0.22, 0.12, cap, (x0 + x1) / 2, top, z1 - 0.06));
    root.add(box(0.12, 0.22, d + 0.1, cap, x1 - 0.06, top, (z0 + z1) / 2));
    root.add(box(w + 0.1, 0.22, 0.12, cap, (x0 + x1) / 2, top, z0 + 0.06));
    root.add(box(0.12, 0.22, d + 0.1, cap, x0 + 0.06, top, (z0 + z1) / 2));
    { // window boxes on the upper floors, on the side that faces the street
      const r = rng(seed * 13), floors = Math.max(1, Math.round(h / 1.6)), cols = Math.max(1, Math.round(w / 1.25)), boxM = mat(['#7a4a2e', '#f4f0e8', '#2f5240'][seed % 3]);
      for (let f = 0; f < floors - 1; f++) for (let k = 0; k < cols; k++) {
        if (r() > 0.4) continue;
        const x = x0 + (k + 0.5) * w / cols, y = h - 0.09 - (f + 0.75) * h / floors - 0.12;
        root.add(box(w / cols * 0.6, 0.14, 0.2, boxM, x, y, z1 + 0.1, false));
        for (let q = 0; q < 4; q++) root.add(sphere(0.07, ['#ff7eb6', '#ffd447', '#ff5d6c', '#ffffff', '#4f9a5a'][Math.floor(r() * 5)], x - w / cols * 0.22 + q * w / cols * 0.15, y + 0.18, z1 + 0.12, false));
      }
    }
    if (props) {
      const r = rng(seed * 7);
      { const cx = x0 + w * (0.1 + r() * 0.15), cz = z0 + d * 0.3; root.add(box(0.5, 0.7, 0.4, color, cx, h - 0.09, cz)); for (const dx of [-0.12, 0.12]) root.add(cyl(0.06, 0.07, 0.22, '#b8653f', cx + dx, h + 0.61, cz, 8)); }
      root.add(box(0.7, 0.45, 0.55, '#c9ccd3', x0 + w * (0.25 + r() * 0.2), top, z0 + d * 0.6));
      if (r() < 0.6) {
        const tx = x0 + w * 0.72, tz = z0 + d * 0.35;
        for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) root.add(box(0.06, 0.5, 0.06, '#5b5f66', tx + dx, top, tz + dz));
        root.add(cyl(0.45, 0.45, 0.8, '#8b6f55', tx, top + 0.5, tz, 12));
        root.add(cyl(0.48, 0.1, 0.25, '#6b5440', tx, top + 1.3, tz, 12));
      } else root.add(cyl(0.02, 0.02, 1.4, '#3a3d44', x0 + w * 0.8, top, z0 + d * 0.5, 4, false));
    }
    return b;
  }
  // The two behind the back room stop short of a yard: room for the back room to knock through into the storeroom
  building(-14.6, -9.8, -11.5, -8.9, 6.6, '#b0604c', 11, { roof: '#5e5864' });
  building(-9.6, -5.0, -11.5, -8.9, 5.1, '#e9d8b4', 23);
  { const yard = mesh(new THREE.PlaneGeometry(9.8, 4.1), mat('#9a948a'), -9.7, 0.012, -6.85, false); yard.rotation.x = -PI / 2; root.add(yard);
    root.add(box(9.8, 0.9, 0.25, '#8a5a46', -9.7, 0, -8.75));
    for (const [x, c] of [[-13.6, '#3f6b4a'], [-12.9, '#2b2d36']]) { root.add(box(0.6, 1.0, 0.6, c, x, 0, -7.4)); root.add(box(0.64, 0.06, 0.64, '#22252c', x, 1.0, -7.4)); }
  }
  building(-4.2, 0.6, -11.5, -5.3, 3.6, '#7f9fc4', 37, { roof: '#62707e' });
  building(0.8, 6.6, -11.5, -5.3, 5.1, '#72b09a', 41);
  building(12.4, 17.6, -11.5, -3.2, 3.6, '#e08a72', 53, { roof: '#6d5d61' });
  building(-26.4, -20.6, -11.5, -5.8, 4.4, '#a9a1cc', 67);
  // The next street back: taller, all the way along
  for (const [x0, x1, z0, z1, h, c, sd, roof] of [
    [-31, -24, -22, -14, 7.5, '#c97b5d', 101, '#5e5864'], [-22.5, -16, -22, -13.5, 8.6, '#dcc9a3', 103, '#6f6b78'], [-15, -8.5, -21, -13, 6.8, '#8fa8b8', 107, '#5d6670'],
    [-7.5, -1, -22, -13, 9.4, '#b5654f', 109, '#5e5864'], [0, 6.4, -21, -13, 7.2, '#e6d6b8', 113, '#6f6b78'], [12.4, 18, -22, -14, 8.0, '#7f9a86', 127, '#55605a'],
    [19.2, 25, -20, -12, 6.4, '#d39a7a', 131, '#6d5d61'], [-42, -33, -24, -15, 6.6, '#a7a0c4', 137, '#5d5870'],
  ]) building(x0, x1, z0, z1, h, c, sd, { roof });
  // Further along to the left and right
  building(-41, -34, -12, -4, 6.2, '#e0b28a', 139, { roof: '#6d5d61' });
  building(-41, -35, -2, 4.4, 4.0, '#9bc2b0', 149, { roof: '#55605a' });
  building(18.6, 24.5, -10, -2, 4.6, '#c4b5e0', 151, { roof: '#5d5870' });
  building(18.6, 23.5, -0.5, 6.0, 3.2, '#f0d08a', 157, { shopfront: true, props: false, roof: '#8a6d4a' });
  // Across the main road, beyond the verge: a row of low shops (low, so they never hide the street)
  for (const [x0, x1, h, c, sd] of [[-36, -30, 2.8, '#d98b7a', 163], [-26, -20, 2.6, '#f2e2b8', 167], [-16, -10, 3.0, '#9fb8d0', 173], [-4, 2, 2.6, '#e8a4b8', 179], [8, 14, 2.8, '#b8d4a0', 181], [19, 25, 2.4, '#f2c46d', 191]])
    building(x0, x1, 16.8, 21, h, c, sd, { shopfront: true, props: false, roof: '#7a6a5a' });
  // A little corner café across the side road, with a striped awning
  building(12.4, 16.6, -1.6, 6.2, 2.3, '#f2c46d', 79, { shopfront: true, props: false, roof: '#8a6d4a' });
  const stripes = canvasTex(64, 16, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#e85d75'; c.fillRect(i * 8, 0, 8, h); } }, [6, 1]);
  { const aw = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 7.4), smat({ map: stripes, roughness: 0.8 }));
    aw.position.set(12.05, 1.75, 2.3); aw.rotation.z = -0.35; aw.castShadow = true; root.add(aw); }
  for (const z of [0.2, 2.3, 4.4]) { // café tables on the pavement
    root.add(cyl(0.32, 0.32, 0.04, '#f4f0e8', 11.85, 0.62, z, 14));
    root.add(cyl(0.03, 0.05, 0.62, '#3a3d44', 11.85, 0, z, 6));
    const umb = mesh(geo('umb', () => new THREE.ConeGeometry(0.65, 0.35, 8)), mat(z === 2.3 ? '#4f9de8' : '#e85d75'), 11.85, 2.0, z);
    root.add(umb); root.add(cyl(0.02, 0.02, 1.35, '#dddddd', 11.85, 0.66, z, 4, false));
  }

  // ---------- Instanced nature ----------
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  function instanced(geometry, material, list, { shadow = false, colors, raw = false } = {}) {
    const im = new THREE.InstancedMesh(geometry, material, list.length);
    list.forEach((t, i) => {
      dummy.position.set(raw ? t.x : shiftX(t.x), t.y || 0, raw ? t.z : shiftZ(t.z));
      dummy.rotation.set(0, t.ry || 0, 0);
      dummy.scale.set(t.sx || t.s || 1, t.sy || t.s || 1, t.sz || t.s || 1);
      dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      if (colors) im.setColorAt(i, col.set(t.c || colors[i % colors.length]));
    });
    im.castShadow = shadow; im.receiveShadow = true;
    scene.add(im);
    return im;
  }
  // Trees: a trunk plus one or two low-poly canopy blobs
  const TREES = [[-17, -3], [-24, -1.5], [-18.2, 6.2], [-25, 4.6], [-23, -4.6], [-15.8, 1.2],
    [-12, 12.25], [-20, 12.25], [14.5, 12.25], [19.5, 12.25], [-6.5, 12.25],
    // (street trees stand at the back of their pavements, clear of people walking along them)
    [12.0, -14], [12.0, -19], [-16, 14.6], [8, 14.6], [16, 15], [-27.5, 13.8], [21, 5],
    [-31, -1], [-29, 3.5], [-33, -13], [-12, -26], [3, -25.5], [-24, -26], [16, -26], [27, -6], [26.5, 4], [28, 0],
    [-38, 13.5], [-30.5, 14.2], [-21, 14.4], [-0.5, 14.6], [21, 14.4], [27.5, 14], [-40, -28], [30, -16], [-32, -8], [5, 23], [-12, 23.5], [-30, 23], [20, 23]]
    .map(([x, z]) => ({ x, z, s: 0.85 + rand() * 0.45, ry: rand() * PI }));
  const at = t => ({ x: shiftX(t.x), z: shiftZ(t.z) });
  const leafy = smat({ color: '#ffffff', roughness: 0.85, flatShading: true });
  // Street trees on the pavement get a tree pit and a grate
  for (const t of TREES) if (PAVEMENTS.some(p => inside(p, at(t).x, at(t).z))) { root.add(box(0.9, 0.02, 0.9, '#5a4632', t.x, -0.085, t.z, false)); root.add(box(0.95, 0.03, 0.08, '#3a3d44', t.x, -0.08, t.z + 0.45, false)); root.add(box(0.95, 0.03, 0.08, '#3a3d44', t.x, -0.08, t.z - 0.45, false)); }
  instanced(geo('trunk', () => new THREE.CylinderGeometry(0.1, 0.15, 1.3, 6).translate(0, 0.65, 0)), mat('#7a5534'), TREES.map(t => ({ ...t, y: -0.09 })), { shadow: true });
  const canopyGeo = geo('canopy', () => new THREE.IcosahedronGeometry(0.85, 0));
  const greens = ['#5f9e4f', '#4f8f48', '#6aab57', '#7bb661', '#4b8a52'];
  instanced(canopyGeo, leafy, TREES.map((t, i) => ({ x: t.x, z: t.z, y: 1.75 * t.s, s: t.s, sy: t.s * 1.05, ry: t.ry, c: greens[i % 5] })), { shadow: true, colors: greens });
  instanced(canopyGeo, leafy, TREES.map((t, i) => ({ x: t.x + 0.35 * t.s, z: t.z - 0.25 * t.s, y: 2.35 * t.s, s: t.s * 0.6, ry: t.ry + 1, c: greens[(i + 2) % 5] })), { shadow: true, colors: greens });
  // Hedges and bushes
  const BUSHES = [];
  for (let x = -13.5; x < 6.5; x += 0.62) if (x < -6.8 || x > -5.4) BUSHES.push({ x, z: 12.95, s: 0.42 + rand() * 0.1, ry: rand() * PI });
  for (let z = -4.2; z < 4.6; z += 0.62) BUSHES.push({ x: -14.7, z, s: 0.36 + rand() * 0.08, ry: rand() * PI });
  for (const [x, z] of [[-18.5, -0.8], [-22.5, 3.6], [-19, 3.4], [-24.5, 0.8], [12.4, 13.1], [-1, -4.95], [3.2, -4.95], [-7.4, -4.95]]) BUSHES.push({ x, z, s: 0.5 + rand() * 0.2, ry: rand() * PI });
  instanced(geo('bush', () => new THREE.IcosahedronGeometry(1, 0)), leafy, BUSHES.map((b, i) => ({ ...b, y: b.s * 0.55, sy: b.s * 0.8, c: ['#4f8f48', '#5a9a50', '#467f42'][i % 3] })), { shadow: true, colors: ['#4f8f48'] });
  // Flowers in the beds
  const FLOWERS = [];
  const petals = ['#ff7eb6', '#ffd447', '#ffffff', '#b58cff', '#ff5d6c', '#ff9a5c'];
  for (const b of FLOWER_BEDS) {
    const n = Math.round(b.rx * b.rz * 18);
    for (let i = 0; i < n; i++) {
      const a = rand() * 2 * PI, r = Math.sqrt(rand()) * 0.9;
      FLOWERS.push({ x: b.x + Math.cos(a) * r * b.rx, z: b.z + Math.sin(a) * r * b.rz, y: 0.12 + rand() * 0.1, s: 0.8 + rand() * 0.5, c: petals[Math.floor(rand() * petals.length)] });
    }
  }
  instanced(geo('petal', () => new THREE.IcosahedronGeometry(0.075, 0)), smat({ color: '#ffffff', roughness: 0.6, flatShading: true }), FLOWERS, { colors: petals });
  instanced(geo('leaf', () => new THREE.ConeGeometry(0.06, 0.2, 4).translate(0, 0.1, 0)), mat('#4f8f48', { flatShading: true }), FLOWERS.map(f => ({ x: f.x + 0.03, z: f.z, y: -0.09, s: 1 })));
  // Grass tufts scattered on the lawns
  const TUFTS = [];
  for (let i = 0; i < 2200 && TUFTS.length < 720; i++) {
    const x = GX + rand() * GSIZE, z = GZ + rand() * GSIZE;
    if (!isGrass(x, z)) continue;
    for (let k = 0; k < 3; k++) TUFTS.push({ x: x + (rand() - 0.5) * 0.14, z: z + (rand() - 0.5) * 0.14, y: -0.09, s: 0.7 + rand() * 0.7, ry: rand() * PI, c: rand() < 0.5 ? '#5f9e4f' : '#79b35f' });
  }
  instanced(geo('tuft', () => new THREE.ConeGeometry(0.045, 0.24, 3).translate(0, 0.12, 0)), smat({ color: '#ffffff', roughness: 0.9, flatShading: true }), TUFTS, { colors: ['#5f9e4f'], raw: true });
  // Picket fence between the alley and the park
  const PICKETS = [];
  for (let z = -4.4; z < 4.6; z += 0.26) PICKETS.push({ x: -14.25, z, y: -0.09 });
  instanced(geo('picket', () => new THREE.BoxGeometry(0.05, 0.62, 0.09).translate(0, 0.31, 0)), mat('#f4efe6'), PICKETS, { shadow: true });
  for (const y of [0.2, 0.46]) root.add(box(0.04, 0.05, 9, '#f4efe6', -14.22, y - 0.09, 0.1, false));

  // ---------- Street furniture ----------
  const lampM = night(smat({ color: '#fff1cc', emissive: '#ffd27a', emissiveIntensity: 0 }), 2.4);
  function streetLamp(x, z, ry = 0) {
    root.add(cyl(0.05, 0.08, 3.0, '#2b2d36', x, -0.09, z, 8));
    const arm = box(0.55, 0.06, 0.06, '#2b2d36', x + Math.cos(ry) * 0.25, 2.85, z - Math.sin(ry) * 0.25); arm.rotation.y = ry; root.add(arm);
    const m = lampM;
    root.add(sphere(0.13, m, x + Math.cos(ry) * 0.5, 2.75, z - Math.sin(ry) * 0.5, false));
  }
  streetLamp(-8, 11.5, PI / 2); streetLamp(6.5, 11.5, PI / 2); streetLamp(18, 11.5, PI / 2);
  streetLamp(11.5, -7, PI); streetLamp(-19.5, -3.8, 0); streetLamp(-22.6, 6, 0);
  streetLamp(-20, 11.5, PI / 2); streetLamp(-32, 11.5, PI / 2); streetLamp(29, 11.5, PI / 2); streetLamp(11.5, -18, PI); streetLamp(11.5, -29, PI);
  // Bus stop on the far pavement
  {
    const x = -2.5, z = 11.75;
    const glass = smat({ color: '#cfefff', transparent: true, opacity: 0.35, roughness: 0.1 });
    root.add(box(2.2, 1.7, 0.05, glass, x, 0.25, z + 0.45, false));
    for (const dx of [-1.08, 1.08]) root.add(box(0.07, 2.05, 0.07, '#3a3d44', x + dx, -0.09, z + 0.45));
    root.add(box(2.4, 0.08, 0.95, '#e85d75', x, 1.95, z + 0.1));
    root.add(box(1.6, 0.07, 0.35, '#a8703f', x, 0.42, z + 0.25));
    root.add(cyl(0.035, 0.035, 2.3, '#3a3d44', x + 1.6, -0.09, z - 0.3, 6));
    root.add(cyl(0.22, 0.22, 0.04, '#4f9de8', x + 1.6, 2.15, z - 0.3, 14).rotateX(PI / 2));
  }
  // Belisha beacons either end of the zebra crossing, a red phone box and a bike rack (placed where they stand now)
  const beaconM = night(smat({ color: '#ffb347', emissive: '#ff9a2a', emissiveIntensity: 0.3 }), 1.4);
  const fixed = o => { o.userData.fixed = true; root.add(o); return o; };
  for (const [x, z] of [[2.0, FRONT_EDGE - 0.25], [5.0, FRONT_EDGE - 0.25], [2.0, FRONT_EDGE + 5.0], [5.0, FRONT_EDGE + 5.0]]) {
    for (let k = 0; k < 6; k++) fixed(cyl(0.045, 0.045, 0.32, k % 2 ? '#f4f1e8' : '#1b1b1f', x, -0.09 + k * 0.32, z, 8));
    fixed(sphere(0.16, beaconM, x, 2.05, z, false));
  }
  { const x = -5.2, z = FRONT_EDGE + 5.0, red = mat('#c8323c'), pane = mat('#bfe6ff', { roughness: 0.15, metalness: 0.2 });
    fixed(box(0.8, 2.3, 0.8, red, x, -0.09, z)); fixed(box(0.86, 0.12, 0.86, red, x, 2.21, z));
    fixed(box(0.6, 1.4, 0.02, pane, x, 0.6, z - 0.41, false)); fixed(box(0.02, 1.4, 0.6, pane, x + 0.41, 0.6, z, false));
    fixed(box(0.6, 0.14, 0.02, mat('#f4f1e8'), x, 1.98, z - 0.42, false)); }
  { const x = 7.0, z = FRONT_EDGE + 5.05, steel = mat('#8d939c', { metalness: 0.5, roughness: 0.35 });
    for (let k = 0; k < 4; k++) { const hoop = mesh(geo('hoop', () => new THREE.TorusGeometry(0.3, 0.025, 6, 12, PI)), steel, x + k * 0.45, -0.09, z); fixed(hoop); }
    const bike = new THREE.Group(); const fr = mat('#4f9de8');
    for (const dx of [-0.3, 0.3]) { const wh = mesh(geo('bwheel', () => new THREE.TorusGeometry(0.22, 0.025, 6, 16)), mat('#1e1e24'), dx, 0.22, 0); bike.add(wh); }
    const bar = box(0.6, 0.04, 0.04, fr, 0, 0.42, 0); bar.rotation.z = 0.1; bike.add(bar); bike.add(box(0.04, 0.3, 0.04, fr, -0.1, 0.25, 0)); bike.add(box(0.18, 0.04, 0.08, '#2b2d36', -0.12, 0.56, 0));
    bike.position.set(x + 0.45, -0.09, z + 0.02); fixed(bike); }

  // Benches in the park
  for (const [x, z, ry] of [[-18.8, -2.2, 0.3], [-23.8, 5.3, -0.4], [-23.6, -0.9, PI / 2 + 0.6]]) {
    const g = new THREE.Group();
    g.add(box(1.4, 0.07, 0.4, '#a8703f', 0, 0.4, 0)); g.add(box(1.4, 0.34, 0.06, '#a8703f', 0, 0.5, -0.2));
    for (const dx of [-0.6, 0.6]) g.add(box(0.07, 0.4, 0.36, '#2b2d36', dx, 0, 0));
    g.position.set(x, -0.09, z); g.rotation.y = ry; root.add(g);
  }
  // Bins and a post box on the far pavement
  root.add(cyl(0.22, 0.2, 0.85, '#2f5240', 1.6, -0.09, 11.9, 12));
  root.add(cyl(0.2, 0.2, 1.05, '#c8323c', -9.5, -0.09, 11.9, 14)); root.add(sphere(0.2, '#c8323c', -9.5, 0.96, 11.9));

  // ---------- Cars ----------
  // Each body is a smooth side profile, extruded across the car's width with rounded edges, then given glass, arches,
  // alloy wheels and lights. The shapes borrow the proportions of European sports saloons, coupés, estates and SUVs;
  // there are no badges or makers' grilles, just plain generic details.
  const headM = night(smat({ color: '#fff6d0', emissive: '#fff2c0', emissiveIntensity: 0 }), 2.5);
  const tailM = night(smat({ color: '#8a1a1a', emissive: '#ff2a2a', emissiveIntensity: 0 }), 1.6);
  const glassM = smat({ color: '#1f2735', roughness: 0.1, metalness: 0.4, side: THREE.DoubleSide });
  const tyreM = mat('#1a1a1f'), rimM = mat('#d4d8de', { roughness: 0.25, metalness: 0.6 }), darkRimM = mat('#3a3d44', { roughness: 0.3, metalness: 0.5 });
  const trimCar = mat('#16161b'), plateM = mat('#f4f1e8'), plateBackM = mat('#f2c94c'), archM = mat('#0e0e12');
  const CAR_COLOURS = ['#b3122a', '#1f4f9a', '#e8e6e0', '#2b2d36', '#8a9aa6', '#2f5a45', '#d9822b', '#4a2b5a', '#c9b48a', '#14161c', '#6b7f8f', '#a8282a'];
  // x runs rear (-1) to front (+1), scaled to half the car's length; y is height in metres
  const CAR_TYPES = {
    // a sporty four-door saloon: short tail, steeply raked screen, a long bonnet
    saloon: { L: 2.1, W: 0.92, clr: 0.14, wheels: [-0.62, 0.64], r: 0.2,
      body: [[-0.98, 0.14], [-1.0, 0.3], [-0.97, 0.47], [-0.8, 0.53], [-0.62, 0.56], [-0.4, 0.76], [0.0, 0.83], [0.18, 0.8], [0.46, 0.58], [0.8, 0.5], [0.98, 0.42], [1.0, 0.28], [0.97, 0.14]],
      glass: [[-0.53, 0.59], [-0.37, 0.74], [0.0, 0.8], [0.17, 0.77], [0.41, 0.59]], screen: [[0.18, 0.8], [0.46, 0.58]], rear: [[-0.62, 0.56], [-0.4, 0.76]],
      head: [0.97, 0.43], tail: [-0.99, 0.45] },
    // a rear-engined sports coupé: round nose, a roof that falls in one curve to a rounded tail, a ducktail spoiler
    coupe: { L: 1.95, W: 0.94, clr: 0.13, wheels: [-0.62, 0.62], r: 0.2, ducktail: true,
      body: [[-0.97, 0.13], [-1.0, 0.3], [-0.97, 0.44], [-0.84, 0.54], [-0.56, 0.7], [-0.2, 0.8], [0.05, 0.8], [0.3, 0.62], [0.5, 0.5], [0.85, 0.44], [0.99, 0.34], [0.97, 0.13]],
      glass: [[-0.5, 0.6], [-0.2, 0.76], [0.03, 0.76], [0.27, 0.6]], screen: [[0.05, 0.8], [0.3, 0.62]], rear: [[-0.56, 0.7], [-0.2, 0.8]],
      head: [0.93, 0.42], tail: [-0.98, 0.43], tailBar: true },
    // a long, low estate: the roof runs straight back to an upright tailgate, with roof rails
    estate: { L: 2.15, W: 0.92, clr: 0.14, wheels: [-0.63, 0.64], r: 0.2, rails: true,
      body: [[-0.98, 0.14], [-1.0, 0.32], [-0.99, 0.55], [-0.94, 0.76], [-0.72, 0.81], [0.0, 0.82], [0.18, 0.79], [0.46, 0.58], [0.8, 0.5], [0.98, 0.42], [1.0, 0.28], [0.97, 0.14]],
      glass: [[-0.9, 0.6], [-0.87, 0.74], [0.0, 0.78], [0.16, 0.76], [0.41, 0.59]], screen: [[0.18, 0.79], [0.46, 0.58]], rear: [[-0.99, 0.55], [-0.94, 0.76]],
      head: [0.97, 0.43], tail: [-0.995, 0.52], tailBar: true },
    // a sporty SUV: high, short overhangs, dark cladding round the arches
    suv: { L: 2.1, W: 0.96, clr: 0.2, wheels: [-0.63, 0.64], r: 0.24, rails: true, cladding: true,
      body: [[-0.97, 0.2], [-1.0, 0.38], [-0.98, 0.66], [-0.9, 0.9], [-0.7, 0.95], [0.05, 0.96], [0.22, 0.92], [0.5, 0.7], [0.85, 0.64], [0.99, 0.56], [1.0, 0.36], [0.96, 0.2]],
      glass: [[-0.86, 0.72], [-0.82, 0.88], [0.05, 0.92], [0.2, 0.89], [0.45, 0.71]], screen: [[0.22, 0.92], [0.5, 0.7]], rear: [[-0.98, 0.66], [-0.9, 0.9]],
      head: [0.98, 0.58], tail: [-0.99, 0.62] },
    // a grand tourer: a very long bonnet, the cabin set well back, a short fastback
    gt: { L: 2.15, W: 0.93, clr: 0.13, wheels: [-0.64, 0.66], r: 0.2,
      body: [[-0.98, 0.13], [-1.0, 0.3], [-0.96, 0.46], [-0.76, 0.52], [-0.5, 0.6], [-0.26, 0.76], [0.0, 0.78], [0.12, 0.76], [0.4, 0.55], [0.85, 0.47], [0.99, 0.38], [0.98, 0.13]],
      glass: [[-0.46, 0.58], [-0.26, 0.73], [0.0, 0.75], [0.1, 0.73], [0.35, 0.56]], screen: [[0.12, 0.76], [0.4, 0.55]], rear: [[-0.5, 0.6], [-0.26, 0.76]],
      head: [0.97, 0.39], tail: [-0.98, 0.45], tailBar: true },
    // a compact sporty hatchback
    hatch: { L: 1.85, W: 0.9, clr: 0.14, wheels: [-0.64, 0.66], r: 0.19,
      body: [[-0.97, 0.14], [-1.0, 0.32], [-0.98, 0.56], [-0.88, 0.78], [-0.6, 0.83], [0.0, 0.83], [0.15, 0.8], [0.45, 0.6], [0.8, 0.53], [0.98, 0.44], [1.0, 0.3], [0.96, 0.14]],
      glass: [[-0.83, 0.62], [-0.8, 0.76], [0.0, 0.79], [0.13, 0.77], [0.4, 0.61]], screen: [[0.15, 0.8], [0.45, 0.6]], rear: [[-0.98, 0.56], [-0.88, 0.78]],
      head: [0.97, 0.45], tail: [-0.99, 0.52] },
  };
  CAR_TYPES.taxi = { ...CAR_TYPES.saloon, sign: true };
  const BEVEL = 0.045;
  const carGeo = (type, part) => geo(`car-${type}-${part}`, () => {
    const T = CAR_TYPES[type], sx = T.L / 2, pts = (part === 'body' ? T.body : T.glass).map(([x, y]) => new THREE.Vector2(x * sx, y));
    const sh = new THREE.Shape();
    if (part === 'body') { sh.moveTo(pts[0].x, pts[0].y); sh.splineThru(pts.slice(1)); sh.lineTo(pts[0].x, pts[0].y); }
    else { sh.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) sh.lineTo(p.x, p.y); sh.lineTo(pts[0].x, pts[0].y); }
    const depth = part === 'body' ? T.W - 2 * BEVEL : T.W + 0.012;
    const g = new THREE.ExtrudeGeometry(sh, part === 'body'
      ? { depth, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: 0.035, bevelSegments: 3, curveSegments: 10 }
      : { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    return g;
  });
  // A thin pane laid along one edge of the profile (the windscreen or the back window), standing just proud of the body
  function pane(T, [a, b], m, wid) {
    const sx = T.L / 2, ax = a[0] * sx, ay = a[1], bx = b[0] * sx, by = b[1];
    const len = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
    const p = new THREE.Mesh(geo(`pane${len.toFixed(3)}|${wid}`, () => new THREE.PlaneGeometry(len * 0.92, wid).rotateX(-PI / 2)), m);
    p.rotation.z = ang;
    p.position.set((ax + bx) / 2 - Math.sin(ang) * 0.042, (ay + by) / 2 + Math.cos(ang) * 0.042, 0);
    return p;
  }
  function car(color, parent = root, ownPaint = false, type = 'hatch') {
    const T = CAR_TYPES[type] || CAR_TYPES.hatch, sx = T.L / 2, hw = T.W / 2;
    const g = new THREE.Group(); g.userData.noTex = true; // paint stays paint
    const paint = ownPaint ? smat({ color, roughness: 0.22, metalness: 0.35 }) : mat(color, { roughness: 0.22, metalness: 0.35 });
    const tail = ownPaint ? smat({ color: '#8a1a1a', emissive: '#ff2a2a', emissiveIntensity: 0 }) : tailM;
    g.add(new THREE.Mesh(carGeo(type, 'body'), paint));
    g.add(new THREE.Mesh(carGeo(type, 'glass'), glassM));
    g.add(pane(T, T.screen, glassM, T.W - 0.1), pane(T, T.rear, glassM, T.W - 0.14));
    // the pillar between the doors, and a thin dark seam for the doors
    const gl = T.glass, bx = ((gl[1][0] + gl[gl.length - 2][0]) / 2) * sx, beltY = gl[0][1];
    for (const z of [-hw - 0.008, hw + 0.008]) {
      g.add(box(0.06, (gl[2][1] - beltY) * 0.95, 0.01, trimCar, bx, beltY, z, false));
      g.add(box(0.012, beltY - T.clr - 0.12, 0.01, trimCar, bx, T.clr + 0.08, z, false));
      g.add(box((gl[gl.length - 1][0] - gl[0][0]) * sx, 0.018, 0.012, mat('#c9ccd3', { metalness: 0.6, roughness: 0.3 }), (gl[0][0] + gl[gl.length - 1][0]) / 2 * sx, beltY - 0.03, z, false)); // a bright waistline trim
    }
    // mirrors at the foot of the windscreen
    for (const z of [-hw - 0.05, hw + 0.05]) g.add(rbox(0.09, 0.06, 0.08, paint, gl[gl.length - 1][0] * sx - 0.02, beltY + 0.01, z, 0.02));
    // lights: slim swept headlamps, tail lamps (or a full-width light bar), a plain grille and intake, number plates
    const hx = T.head[0] * sx + BEVEL, tx = T.tail[0] * sx - BEVEL;
    for (const s of [-1, 1]) { const h = box(0.05, 0.05, 0.22, headM, hx - 0.01, T.head[1] - 0.025, s * (hw - 0.17), false); h.rotation.y = s * 0.25; g.add(h); }
    if (T.tailBar) g.add(box(0.04, 0.045, T.W * 0.86, tail, tx + 0.005, T.tail[1] - 0.02, 0, false));
    else for (const s of [-1, 1]) g.add(box(0.04, 0.07, 0.2, tail, tx + 0.005, T.tail[1] - 0.035, s * (hw - 0.15), false));
    g.add(rbox(0.05, 0.07, T.W * 0.42, trimCar, hx - 0.03, T.head[1] - 0.15, 0, 0.02));
    g.add(rbox(0.05, 0.05, T.W * 0.7, trimCar, hx - 0.06, T.clr + 0.04, 0, 0.02));
    g.add(box(0.02, 0.07, 0.24, plateM, hx - 0.01, T.clr + 0.11, 0, false));
    g.add(box(0.02, 0.07, 0.24, plateBackM, tx + 0.01, T.tail[1] - 0.15, 0, false));
    g.add(rbox(0.06, 0.05, T.W * 0.8, trimCar, tx + 0.02, T.clr + 0.03, 0, 0.02)); // diffuser
    for (const s of [-1, 1]) { const ex = cyl(0.025, 0.025, 0.06, '#8d939c', 0, 0, 0, 8, false); ex.rotation.z = PI / 2; ex.position.set(tx, T.clr + 0.04, s * 0.25); g.add(ex); } // exhausts
    if (T.ducktail) g.add(rbox(0.22, 0.04, T.W - 0.1, paint, -0.84 * sx, 0.55, 0, 0.015));
    if (T.rails) for (const z of [-hw + 0.08, hw - 0.08]) g.add(rbox(T.L * 0.42, 0.035, 0.035, mat('#2b2d36'), (T.glass[2][0] - 0.25) * sx, T.body[5][1] + 0.03, z, 0.012));
    if (T.cladding) for (const z of [-hw - 0.004, hw + 0.004]) g.add(box(T.L * 0.98, 0.1, 0.01, trimCar, 0, T.clr + 0.02, z, false));
    if (T.sign) { g.add(rbox(0.3, 0.1, 0.17, mat('#2b2d36'), 0, T.body[6][1] + 0.03, 0, 0.02)); g.add(box(0.28, 0.07, 0.15, night(smat({ color: '#fff1a8', emissive: '#ffcf3f', emissiveIntensity: 0 }), 1.5), 0, T.body[6][1] + 0.05, 0, false)); }
    // wheels: dark arches, tyres, five-spoke alloys
    const wheels = [], tyreGeo = geo(`tyre${T.r}`, () => new THREE.CylinderGeometry(T.r, T.r, 0.2, 18).rotateX(PI / 2));
    const rimGeo = geo(`rim${T.r}`, () => new THREE.CylinderGeometry(T.r * 0.66, T.r * 0.66, 0.205, 16).rotateX(PI / 2));
    const archGeo = geo(`arch${T.r}`, () => new THREE.CircleGeometry(T.r + 0.05, 16, 0, PI));
    for (const wx of T.wheels) for (const s of [-1, 1]) {
      const arch = new THREE.Mesh(archGeo, archM); arch.position.set(wx * sx, T.r, s * (hw + 0.003)); if (s < 0) arch.rotation.y = PI; g.add(arch);
      const w = mesh(tyreGeo, tyreM, wx * sx, T.r, s * (hw - 0.08)); // stands a touch proud of the body
      w.add(new THREE.Mesh(rimGeo, rimM));
      for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(geo('spoke' + T.r, () => new THREE.BoxGeometry(T.r * 0.55, 0.035, 0.02).translate(T.r * 0.28, 0, 0)), darkRimM); sp.position.set(0, 0, s * 0.105); sp.rotation.z = k * PI * 2 / 5; w.add(sp); }
      w.add(mesh(geo('hubcap', () => new THREE.CylinderGeometry(0.035, 0.035, 0.215, 10).rotateX(PI / 2)), darkRimM, 0, 0, 0));
      g.add(w); wheels.push(w);
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    parent.add(g);
    return { group: g, wheels, paint, tail, len: T.L };
  }
  const PARKED_TYPES = ['hatch', 'saloon', 'estate', 'coupe', 'suv', 'gt'];
  for (const [x, z, ry, k] of [[-10.2, 7.5, 0, 0], [-5.6, 7.5, PI, 1], [-2.6, 7.5, 0, 2], [13.6, 7.5, PI, 3], [7.65, -2.4, PI / 2, 4], [7.65, 2.2, -PI / 2, 5]]) {
    const c = car(CAR_COLOURS[k], root, false, PARKED_TYPES[k]); c.group.position.set(x, -0.09, z); c.group.rotation.y = ry;
  }
  // Now and then a car drives past (never more than two at once), with a soft pool of headlight at night. They stop
  // for anyone on the zebra crossing.
  const beamTex = canvasTex(64, 64, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,240,190,0.9)'); g.addColorStop(1, 'rgba(255,240,190,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const LANES = [{ lane: 8.45 + ROAD_SHIFT, dir: 1 }, { lane: 9.85 + ROAD_SHIFT, dir: -1 }];
  const CROSS = { x0: 2.0, x1: 5.0 }; // the zebra (x 2.3 to 4.7) and a little room either side
  const movers = ['hatch', 'taxi', 'saloon', 'suv', 'coupe', 'estate', 'gt'].map((type, i) => {
    const m = { ...LANES[i % 2], x: 0, v: 0, speed: 3.2, active: false, wait: 6 + i * 9, type };
    const c = car(type === 'taxi' ? '#f2c94c' : CAR_COLOURS[(i * 3 + 1) % CAR_COLOURS.length], scene, true, type);
    c.group.visible = false;
    c.group.position.set(m.x, -0.09, m.lane); c.group.rotation.y = m.dir > 0 ? 0 : PI;
    const beamM = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), beamM);
    beam.rotation.x = -PI / 2; beam.position.set(c.len / 2 + 0.9, 0.1, 0); c.group.add(beam);
    return { ...m, ...c, beamM };
  });

  for (const o of root.children) if (!o.userData.fixed) { o.position.x = shiftX(o.position.x); o.position.z = shiftZ(o.position.z); }
  scene.add(mergeStatic(texturize(root)));

  let nightK = 0;
  return {
    update(dt, now, k, crossingBusy = false) {
      nightK = k;
      for (const { m, k: mult } of nightMats) m.emissiveIntensity = nightK * mult;
      water.color.setHSL(0.56, 0.5, 0.52 + Math.sin(now * 1.3) * 0.02 - nightK * 0.25);
      for (const m of movers) {
        if (!m.active) {
          m.wait -= dt;
          if (m.wait > 0) continue;
          // Pull in from the end of the road, on a random side; a taxi keeps its yellow, the rest come in any colour
          const lane = LANES[Math.random() < 0.5 ? 0 : 1];
          if (movers.filter(o => o.active).length >= 2 || movers.some(o => o !== m && o.active && o.lane === lane.lane)) { m.wait = 3; continue; }
          const speed = 2.8 + Math.random() * 1.2;
          Object.assign(m, lane, { active: true, x: lane.dir > 0 ? -46 : 40, speed, v: speed });
          m.group.position.z = m.lane; m.group.rotation.y = m.dir > 0 ? 0 : PI;
          if (m.type !== 'taxi') m.paint.color.set(CAR_COLOURS[Math.floor(Math.random() * CAR_COLOURS.length)]);
        }
        // Give way at the zebra: if someone's on it and the car hasn't reached it yet, ease to a stop short of it
        const front = m.x + m.dir * m.len / 2, line = m.dir > 0 ? CROSS.x0 - 0.3 : CROSS.x1 + 0.3;
        const toLine = (line - front) * m.dir; // metres left before the line (negative once past it)
        let want = m.speed;
        if (crossingBusy && toLine > -0.05) want = Math.max(0, Math.min(m.speed, toLine * 1.6));
        m.v += Math.max(-7 * dt, Math.min(2.5 * dt, want - m.v));
        if (crossingBusy && toLine > -0.05) m.v = Math.min(m.v, Math.max(0, toLine) / Math.max(dt, 1e-3));
        m.x += m.dir * m.v * dt;
        if ((m.dir > 0 && m.x > 40) || (m.dir < 0 && m.x < -46)) { m.active = false; m.group.visible = false; m.wait = 10 + Math.random() * 25; continue; }
        m.group.position.x = m.x;
        m.group.visible = Math.abs(m.x - CENTER.x) < FADE_OUT - 1;
        for (const w of m.wheels) w.rotation.z -= m.v * dt / 0.19;
        m.beamM.opacity = nightK * 0.55;
        m.tail.emissiveIntensity = Math.max(nightK * 1.6, m.v < m.speed - 0.2 ? 1.8 : 0); // brake lights
      }
    },
  };
}

// Flower beds: on the far verge, in the park and by the café.
const FLOWER_BEDS = [
  { x: -10.2, z: 13.7, rx: 1.6, rz: 0.45 }, { x: -3.5, z: 13.7, rx: 2.0, rz: 0.45 }, { x: 3.2, z: 13.7, rx: 1.6, rz: 0.45 },
  { x: -18.6, z: 4.6, rx: 0.9, rz: 0.5 }, { x: -24.2, z: 2.4, rx: 1.0, rz: 0.6 }, { x: -21.5, z: 4.4, rx: 0.8, rz: 0.5 },
  { x: -16.2, z: -4.2, rx: 0.8, rz: 0.5 }, { x: 13.6, z: 13.7, rx: 0.9, rz: 0.45 },
];
