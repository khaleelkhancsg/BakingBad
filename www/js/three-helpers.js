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
