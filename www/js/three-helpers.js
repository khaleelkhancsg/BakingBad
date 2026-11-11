// Shared helpers for building low-poly scenery from simple shapes, with cached geometry and materials.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const PI = Math.PI;

// ---------- Small helpers with shared geometry and materials ----------

const geoCache = new Map();
export const geo = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, smat({ color, roughness: 0.8, ...o }));
  return matCache.get(key);
}
// Cheap materials for a low-poly look: Lambert for almost everything, Phong (a little shine) for glass,
// metal, water and car paint. Accepts the same roughness/metalness hints as a standard material.
export function smat(p = {}) {
  const { roughness = 0.8, metalness = 0, ...rest } = p;
  if (metalness >= 0.3 || roughness <= 0.3) {
    return new THREE.MeshPhongMaterial({ shininess: Math.round((1 - roughness) * 70) + 15, specular: new THREE.Color(metalness >= 0.3 ? 0x555555 : 0x333333), ...rest });
  }
  return new THREE.MeshLambertMaterial(rest);
}
export function mesh(g, m, x = 0, y = 0, z = 0, cast = true) {
  const me = new THREE.Mesh(g, m);
  me.position.set(x, y, z);
  me.castShadow = cast;
  me.receiveShadow = true;
  return me;
}
// Box positioned by its bottom centre. Anything chunkier than a wall gets softly rounded edges.
export function box(w, h, d, m, x = 0, y = 0, z = 0, cast = true) {
  const mn = Math.min(w, h, d);
  const g = mn >= 0.22
    ? geo(`rb${w}|${h}|${d}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(0.07, mn * 0.18)))
    : geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
  return mesh(g, typeof m === 'string' ? mat(m) : m, x, y + h / 2, z, cast);
}
// A rounded box with a chosen radius (for small things that should still look soft).
export function rbox(w, h, d, m, x = 0, y = 0, z = 0, r = 0.03) {
  return mesh(geo(`rr${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2))), typeof m === 'string' ? mat(m) : m, x, y + h / 2, z);
}
export function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 16, cast = true) {
  return mesh(geo(`c${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), typeof m === 'string' ? mat(m) : m, x, y + h / 2, z, cast);
}
export function sphere(r, m, x = 0, y = 0, z = 0, cast = true) {
  return mesh(geo(`s${r}`, () => new THREE.SphereGeometry(r, 16, 12)), typeof m === 'string' ? mat(m) : m, x, y, z, cast);
}
export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}


// ---------- Prototype surface textures ----------
// Light, tileable detail drawn on a canvas once (wood grain, brushed metal, cardboard, fabric, stone, leaves, ...).
// They're near white, so a material keeps its own colour and just gains a surface. tmat() makes a material with one on
// purpose; texturize() puts them on whatever in a model looks like wood, metal, card, stone or leaves (by its colour),
// leaving glass, lights, people, food and anything already textured alone.
const surfCache = new Map();
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const SURFACES = {
  wood(c, w, h, r) {
    c.fillStyle = '#efe3d1'; c.fillRect(0, 0, w, h);
    // planks, and the grain running along them
    for (let y = 0; y < h; y += 64) { c.fillStyle = 'rgba(80,50,25,0.28)'; c.fillRect(0, y, w, 3); }
    for (let k = 0; k < 70; k++) {
      const y0 = r() * h, amp = 1 + r() * 4, f = 0.01 + r() * 0.03, ph = r() * 6;
      c.strokeStyle = `rgba(100,62,30,${0.12 + r() * 0.22})`; c.lineWidth = 0.8 + r() * 2;
      c.beginPath(); for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + ph) * amp; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    }
    for (let k = 0; k < 3; k++) { const x = r() * w, y = r() * h; c.strokeStyle = 'rgba(90,55,25,0.25)'; c.lineWidth = 1.2; for (let q = 1; q < 4; q++) { c.beginPath(); c.ellipse(x, y, 4 * q, 2 * q, 0, 0, 7); c.stroke(); } }
  },
  boards(c, w, h, r) { // floorboards: wood, with the joints between boards
    SURFACES.wood(c, w, h, r);
    for (let y = 0; y < h; y += 32) { c.fillStyle = 'rgba(50,30,15,0.45)'; c.fillRect(0, y, w, 2); c.fillRect(r() * w, y, 2, 32); }
  },
  bark(c, w, h, r) {
    c.fillStyle = '#e6dccd'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 120; k++) { c.fillStyle = `rgba(70,45,25,${0.12 + r() * 0.3})`; c.fillRect(r() * w, 0, 1 + r() * 3, h); }
    for (let k = 0; k < 40; k++) { c.fillStyle = 'rgba(60,40,20,0.25)'; c.fillRect(r() * w, r() * h, 6 + r() * 14, 2); }
  },
  metal(c, w, h, r) {
    c.fillStyle = '#f2f3f5'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 420; k++) { const y = r() * h, len = 30 + r() * 160, x = r() * w; c.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.3 + r() * 0.5})` : `rgba(70,75,90,${0.08 + r() * 0.16})`; c.fillRect(x, y, len, 1); }
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.06)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  },
  card(c, w, h, r) {
    c.fillStyle = '#f1eadc'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(${r() < 0.5 ? '110,80,45' : '255,255,255'},${r() * 0.25})`; c.fillRect(r() * w, r() * h, 2, 2); }
    c.fillStyle = 'rgba(150,115,60,0.3)'; c.fillRect(0, h / 2 - 12, w, 24); // packing tape
  },
  fabric(c, w, h, r) { // a woven cloth: fine warp and weft
    c.fillStyle = '#f4f1ee'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 3) { c.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.08})`; c.fillRect(x, 0, 1, h); }
    for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.2})`; c.fillRect(0, y, w, 1); }
    for (let k = 0; k < 300; k++) { c.fillStyle = `rgba(0,0,0,${r() * 0.08})`; c.fillRect(r() * w, r() * h, 2, 2); }
  },
  fur(c, w, h, r) {
    c.fillStyle = '#efe6dc'; c.fillRect(0, 0, w, h);
    c.lineWidth = 1;
    for (let k = 0; k < 2200; k++) { const x = r() * w, y = r() * h; c.strokeStyle = r() < 0.5 ? `rgba(90,60,30,${0.12 + r() * 0.2})` : `rgba(255,255,255,${0.2 + r() * 0.3})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 4, y + 3 + r() * 5); c.stroke(); }
  },
  stone(c, w, h, r) { // speckled stone, a few faint veins
    c.fillStyle = '#efede8'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 2600; k++) { c.fillStyle = r() < 0.6 ? `rgba(60,55,50,${r() * 0.16})` : `rgba(255,255,255,${r() * 0.4})`; const z = 1 + r() * 2.5; c.fillRect(r() * w, r() * h, z, z); }
    c.strokeStyle = 'rgba(80,75,70,0.12)'; c.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) { c.beginPath(); let x = r() * w, y = 0; c.moveTo(x, y); while (y < h) { x += (r() - 0.5) * 22; y += 12; c.lineTo(x, y); } c.stroke(); }
  },
  concrete(c, w, h, r) {
    c.fillStyle = '#eeeeee'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 1800; k++) { c.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.12})`; c.fillRect(r() * w, r() * h, 3, 3); }
    for (let k = 0; k < 5; k++) { c.fillStyle = 'rgba(0,0,0,0.05)'; c.beginPath(); c.ellipse(r() * w, r() * h, 20 + r() * 40, 10 + r() * 25, r() * 3, 0, 7); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, 0, w, 2); c.fillRect(0, 0, 2, h); // joints between slabs
  },
  plaster(c, w, h, r) {
    c.fillStyle = '#f6f4f1'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + r() * 0.04})`; c.beginPath(); c.ellipse(r() * w, r() * h, 10 + r() * 30, 8 + r() * 20, r() * 3, 0, 7); c.fill(); }
    for (let k = 0; k < 600; k++) { c.fillStyle = `rgba(0,0,0,${r() * 0.06})`; c.fillRect(r() * w, r() * h, 2, 2); }
  },
  leaf(c, w, h, r) { // a mass of little leaves
    c.fillStyle = '#e2ecd8'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 500; k++) { c.fillStyle = r() < 0.55 ? `rgba(20,60,20,${0.12 + r() * 0.2})` : `rgba(255,255,220,${0.2 + r() * 0.35})`; c.beginPath(); c.ellipse(r() * w, r() * h, 3 + r() * 5, 1.5 + r() * 2.5, r() * 3, 0, 7); c.fill(); }
  },
  tiles(c, w, h, r) { // square tiles, four to a metre
    c.fillStyle = '#d0d0d0'; c.fillRect(0, 0, w, h);
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { const v = 238 + Math.floor(r() * 17); c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(a * 64 + 2, b * 64 + 2, 60, 60); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(a * 64 + 5, b * 64 + 5, 22, 3); }
  },
  rubber(c, w, h, r) { // ribbed matting
    c.fillStyle = '#e8e8e8'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(0, y, w, 5); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, y + 6, w, 3); }
    for (let k = 0; k < 600; k++) { c.fillStyle = `rgba(0,0,0,${r() * 0.08})`; c.fillRect(r() * w, r() * h, 2, 2); }
  },
  plate(c, w, h, r) { // chequer plate: raised bars, alternating direction
    SURFACES.metal(c, w, h, r);
    for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) {
      c.save(); c.translate(a * 32 + 16, b * 32 + 16); c.rotate((a + b) % 2 ? 0.8 : -0.8);
      c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(-11, -1, 24, 5); c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(-12, -3, 24, 4);
      c.restore();
    }
  },
  epoxy(c, w, h, r) {
    c.fillStyle = '#f4f6f8'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 900; k++) { c.fillStyle = ['rgba(90,110,140,0.25)', 'rgba(255,255,255,0.7)', 'rgba(40,40,50,0.18)'][Math.floor(r() * 3)]; c.fillRect(r() * w, r() * h, 2, 2); }
  },
  glowgrid(c, w, h) {
    c.fillStyle = '#8a8a8a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) { c.fillRect(k * 64, 0, 3, h); c.fillRect(0, k * 64, w, 3); }
  },
  block(c, w, h, r) { // breeze blocks
    c.fillStyle = '#a8a8a8'; c.fillRect(0, 0, w, h);
    for (let row = 0; row < 5; row++) for (let k = -1; k < 3; k++) {
      const v = 225 + Math.floor(r() * 25), x = k * 128 + (row % 2) * 64 + 3, y = row * 51.2 + 3;
      c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(x, y, 122, 45);
      for (let q = 0; q < 40; q++) { c.fillStyle = `rgba(0,0,0,${r() * 0.12})`; c.fillRect(x + r() * 122, y + r() * 45, 2, 2); }
    }
  },
  brick(c, w, h, r) {
    c.fillStyle = '#d9d2c8'; c.fillRect(0, 0, w, h);
    for (let row = 0; row < 12; row++) for (let k = -1; k < 5; k++) {
      const v = 190 + Math.floor(r() * 65); c.fillStyle = `rgb(${v},${v - 8},${v - 12})`;
      c.fillRect(k * 64 + (row % 2) * 32 + 2, row * 21.33 + 2, 60, 18);
    }
  },
  foam(c) { // egg-crate acoustic foam
    for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) {
      const x = a * 32, y = b * 32, g = c.createRadialGradient(x + 12, y + 12, 2, x + 16, y + 16, 20);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#a0a0a0'); c.fillStyle = g; c.fillRect(x, y, 32, 32);
    }
  },
  leafgold(c, w, h, r) { // gold leaf squares, each catching the light a little differently
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { const v = 205 + Math.floor(r() * 50); c.fillStyle = `rgb(${v},${v},${v - 10})`; c.fillRect(a * 64, b * 64, 64, 64); c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(a * 64, b * 64, 64, 1); c.fillRect(a * 64, b * 64, 1, 64); }
    for (let k = 0; k < 60; k++) { c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(r() * w, r() * h, 1 + r() * 6, 1); }
  },
  velvet(c, w, h, r) {
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#d4d4d4'); g.addColorStop(1, '#f4f4f4'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 1500; k++) { c.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.1})`; c.fillRect(r() * w, r() * h, 2, 2); }
  },
};
export function surface(kind) {
  if (surfCache.has(kind)) return surfCache.get(kind);
  const r = rng(kind.length * 977 + kind.charCodeAt(0));
  const t = canvasTex(256, 256, (c, w, h) => (SURFACES[kind] || SURFACES.plaster)(c, w, h, r));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  surfCache.set(kind, t);
  return t;
}
// The same surface repeated `per` times a metre, for things whose UVs are in metres (see worldUV)
export function surfaceTiled(kind, per = 1) {
  const key = kind + '@' + per;
  if (surfCache.has(key)) return surfCache.get(key);
  const t = surface(kind).clone(); t.repeat.set(per, per); t.needsUpdate = true;
  surfCache.set(key, t);
  return t;
}
// A material with a chosen surface, shared like mat()
export function tmat(color, kind, o = {}) {
  const key = 't|' + kind + color + JSON.stringify(o);
  if (!matCache.has(key)) { const m = smat({ color, roughness: 0.8, ...o }); m.map = surface(kind); m.userData.surface = kind; matCache.set(key, m); }
  return matCache.get(key);
}
// Give boxes and planes UVs in metres, projected from whichever way each face points, so a texture keeps its scale
// however long a wall or floor is, instead of stretching along it
export function worldUV(root, test) {
  root.updateMatrixWorld(true);
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || (test && !test(o))) return;
    const g = o.geometry.clone(), pos = g.attributes.position, nor = g.attributes.normal;
    if (!nor) return;
    nm.getNormalMatrix(o.matrixWorld);
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); n.fromBufferAttribute(nor, i).applyMatrix3(nm);
      const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      if (ay >= ax && ay >= az) { uv[i * 2] = v.x; uv[i * 2 + 1] = -v.z; }
      else if (ax >= az) { uv[i * 2] = v.z; uv[i * 2 + 1] = v.y; }
      else { uv[i * 2] = v.x; uv[i * 2 + 1] = v.y; }
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    o.geometry = g;
  });
  return root;
}
const texMatCache = new Map(), _hsl = {};
function surfaceFor(m) {
  if (!m || m.map || m.transparent || !m.color || !(m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return null;
  if (m.userData.surface) return m.userData.surface === 'none' ? null : m.userData.surface;
  if (m.emissive && m.emissive.r + m.emissive.g + m.emissive.b > 0.05) return null; // lights, screens and signs
  m.color.getHSL(_hsl);
  const { h, s, l } = _hsl;
  if (m.isMeshPhongMaterial) return s < 0.18 && l > 0.25 ? 'metal' : null;
  if (h >= 0.03 && h <= 0.13 && s >= 0.25 && l >= 0.18 && l <= 0.55) return 'wood';
  if (h >= 0.07 && h <= 0.15 && s >= 0.2 && s <= 0.6 && l > 0.55 && l <= 0.8) return 'card';
  if (h >= 0.2 && h <= 0.45 && s >= 0.25 && l >= 0.2 && l <= 0.6) return 'leaf';
  if (s < 0.22 && l >= 0.55 && l <= 0.86) return 'stone';
  if (s < 0.15 && l >= 0.1 && l < 0.3) return 'metal'; // dark painted frames, legs and poles
  return null;
}
export function texturize(root) {
  const walk = o => {
    if (o.userData.noTex) return; // food, and anything else that looks better plain
    if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material)) {
      const kind = surfaceFor(o.material);
      if (kind) {
        const key = o.material.uuid + kind;
        if (!texMatCache.has(key)) { const m = o.material.clone(); m.map = surface(kind); m.needsUpdate = true; texMatCache.set(key, m); }
        o.material = texMatCache.get(key);
      }
    }
    for (const ch of o.children) walk(ch);
  };
  walk(root);
  return root;
}

// Merge every static single-material mesh under `root` into one mesh per material, to save draw calls.
// Meshes with several materials, instanced meshes and anything marked userData.keep are left alone.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert(), rel = new THREE.Matrix4();
  const buckets = new Map();
  const merged = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.userData.keep) return;
    const key = o.material.uuid + (o.castShadow ? '|s' : '|n');
    if (!buckets.has(key)) buckets.set(key, { material: o.material, cast: o.castShadow, geos: [] });
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(rel.multiplyMatrices(toRoot, o.matrixWorld));
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.morphAttributes = {};
    buckets.get(key).geos.push(g);
    merged.push(o);
  });
  for (const o of merged) o.parent.remove(o);
  for (const b of buckets.values()) {
    const m = new THREE.Mesh(mergeGeometries(b.geos, false), b.material);
    m.castShadow = b.cast; m.receiveShadow = true;
    root.add(m);
  }
  return root;
}
