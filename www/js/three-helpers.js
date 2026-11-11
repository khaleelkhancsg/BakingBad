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
// Light, tileable detail drawn on a canvas once: wood grain, brushed metal, cardboard. They're near white, so a
// material keeps its own colour and just gains a surface. texturize() puts them on whatever in a model looks like
// wood, metal or card (by its colour), leaving glass, paint, plants, people and anything already textured alone.
const surfCache = new Map();
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
export function surface(kind) {
  if (surfCache.has(kind)) return surfCache.get(kind);
  const r = rng(kind.length * 977 + kind.charCodeAt(0));
  const t = canvasTex(256, 256, (c, w, h) => {
    if (kind === 'wood') {
      c.fillStyle = '#efe3d1'; c.fillRect(0, 0, w, h);
      // planks, and the grain running along them
      for (let y = 0; y < h; y += 64) { c.fillStyle = 'rgba(80,50,25,0.28)'; c.fillRect(0, y, w, 3); }
      for (let k = 0; k < 70; k++) {
        const y0 = r() * h, amp = 1 + r() * 4, f = 0.01 + r() * 0.03, ph = r() * 6;
        c.strokeStyle = `rgba(100,62,30,${0.12 + r() * 0.22})`; c.lineWidth = 0.8 + r() * 2;
        c.beginPath(); for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + ph) * amp; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      }
      for (let k = 0; k < 3; k++) { const x = r() * w, y = r() * h; c.strokeStyle = 'rgba(90,55,25,0.25)'; c.lineWidth = 1.2; for (let q = 1; q < 4; q++) { c.beginPath(); c.ellipse(x, y, 4 * q, 2 * q, 0, 0, 7); c.stroke(); } }
    } else if (kind === 'metal') {
      c.fillStyle = '#f2f3f5'; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 420; k++) { const y = r() * h, len = 30 + r() * 160, x = r() * w; c.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.3 + r() * 0.5})` : `rgba(70,75,90,${0.08 + r() * 0.16})`; c.fillRect(x, y, len, 1); }
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.06)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    } else if (kind === 'card') {
      c.fillStyle = '#f1eadc'; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(${r() < 0.5 ? '110,80,45' : '255,255,255'},${r() * 0.25})`; c.fillRect(r() * w, r() * h, 2, 2); }
      c.fillStyle = 'rgba(150,115,60,0.3)'; c.fillRect(0, h / 2 - 12, w, 24); // packing tape
    }
  });
  surfCache.set(kind, t);
  return t;
}
const texMatCache = new Map(), _hsl = {};
function surfaceFor(m) {
  if (!m || m.map || m.transparent || !m.color || !(m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return null;
  m.color.getHSL(_hsl);
  const { h, s, l } = _hsl;
  if (m.isMeshPhongMaterial) return s < 0.18 && l > 0.25 ? 'metal' : null;
  if (h >= 0.03 && h <= 0.13 && s >= 0.25 && l >= 0.18 && l <= 0.55) return 'wood';
  if (h >= 0.07 && h <= 0.15 && s >= 0.2 && s <= 0.6 && l > 0.55 && l <= 0.8) return 'card';
  return null;
}
export function texturize(root) {
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    const kind = surfaceFor(o.material);
    if (!kind) return;
    const key = o.material.uuid + kind;
    if (!texMatCache.has(key)) { const m = o.material.clone(); m.map = surface(kind); m.needsUpdate = true; texMatCache.set(key, m); }
    o.material = texMatCache.get(key);
  });
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
