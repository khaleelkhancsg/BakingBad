// Ready-made car models (glTF, from Poly Pizza; authors and licences in README "Credits"). They're loaded once,
// turned to face +x, scaled to the town's half-scale cars, sat on the ground, and rebuilt as plain meshes in the car's
// own frame: the body, plus a pivot for each wheel (so it can spin about the axle) and the materials a car needs to
// change (paint for a new colour, tail lamps for braking, headlamps for night).
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { smat } from './three-helpers.js';

// file, length in town units, which material is the paint, and a turn (in quarter turns) if the model faces the
// wrong way once its long side is along x
export const CAR_FILES = {
  rolls:     { file: 'rolls.glb',     L: 2.6,  paint: /^car$/i,          turn: 2 },
  charger:   { file: 'charger.glb',   L: 2.45, paint: /chasis/i,         turn: 2 },
  gtr:       { file: 'gtr.glb',       L: 2.3,  paint: /^chasis/i,        turn: 2 },
  camaro:    { file: 'camaro.glb',    L: 2.25, paint: /^mat8$/i,         turn: 0 },
  hatchback: { file: 'hatchback.glb', L: 1.95, paint: null,              turn: 2 },
  suv:       { file: 'suv.glb',       L: 2.3,  paint: /^white$/i,        turn: 2 },
  sports:    { file: 'sports.glb',    L: 2.25, paint: /^white$/i,        turn: 2 },
};
const WHEEL = /wheel|circle|cylinder/i, TAIL = /red_?light|rearlight|tail/i, HEAD = /^light$|headlight/i, GLASS = /glass|window/i;

// The town's lighting is simple, so the models' materials become the same cheap kinds the rest of the town uses
function convert(m, name) {
  const base = { color: m.color, map: m.map || null, side: THREE.FrontSide };
  if (GLASS.test(name)) return new THREE.MeshPhongMaterial({ color: '#151d2a', specular: '#5f7590', shininess: 70 });
  if (m.metalness > 0.3 || m.roughness < 0.45) return smat({ ...base, roughness: Math.max(0.2, m.roughness), metalness: 0.35 });
  return smat({ ...base, roughness: 0.8 });
}

let lib = null;
export function loadCarModels(base = 'models/cars/') {
  if (lib) return lib;
  const loader = new GLTFLoader();
  lib = Promise.all(Object.entries(CAR_FILES).map(([key, cfg]) => new Promise(ok => loader.load(base + cfg.file, g => ok([key, prepare(g.scene, cfg)]), undefined, e => { console.warn('car model failed', cfg.file, e); ok([key, null]); }))))
    .then(list => Object.fromEntries(list.filter(([, v]) => v)));
  return lib;
}

// Turn, scale and flatten one model into { parts: [{ geometry, material, wheel }], len }
function prepare(root, cfg) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
  const turn = (size.z > size.x ? 1 : 0) + (cfg.turn || 0); // long side along x
  const fix = new THREE.Matrix4().makeRotationY(-turn * Math.PI / 2);
  // Some models sit at a slant (the Camaro is about 25 degrees off): find the body's long axis from its points and
  // turn it square to x. Small angles are left alone (a lopsided body can read a degree or two off when it isn't).
  {
    const v = new THREE.Vector3(), m = new THREE.Matrix4(), pts = [];
    root.traverse(o => {
      if (!o.isMesh || WHEEL.test(o.name)) return;
      m.multiplyMatrices(fix, o.matrixWorld); const a = o.geometry.attributes.position;
      for (let i = 0; i < a.count; i += 2) { v.fromBufferAttribute(a, i).applyMatrix4(m); pts.push(v.x, v.z); }
    });
    let mx = 0, mz = 0; const n = pts.length / 2;
    for (let i = 0; i < pts.length; i += 2) { mx += pts[i]; mz += pts[i + 1]; }
    mx /= n; mz /= n;
    let cxx = 0, czz = 0, cxz = 0;
    for (let i = 0; i < pts.length; i += 2) { const dx = pts[i] - mx, dz = pts[i + 1] - mz; cxx += dx * dx; czz += dz * dz; cxz += dx * dz; }
    const ang = 0.5 * Math.atan2(2 * cxz, cxx - czz);
    if (Math.abs(ang) > 5 * Math.PI / 180) fix.premultiply(new THREE.Matrix4().makeRotationY(ang));
  }
  const tmp = new THREE.Box3();
  root.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); } });
  // the turned bounds, then a scale to the wanted length, centred, on the ground
  // measured from the model's own points: a turned model's bounding box overstates its size (the Camaro came out 19% small)
  const b2 = new THREE.Box3(), pt = new THREE.Vector3();
  root.traverse(o => { if (!o.isMesh) return; const m = new THREE.Matrix4().multiplyMatrices(fix, o.matrixWorld), a = o.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) b2.expandByPoint(pt.fromBufferAttribute(a, i).applyMatrix4(m)); });
  const s2 = b2.getSize(new THREE.Vector3()), c2 = b2.getCenter(new THREE.Vector3()), k = cfg.L / s2.x;
  const place = new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-c2.x, -b2.min.y, -c2.z)).multiply(fix);
  const mats = new Map(), parts = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    const wheel = WHEEL.test(o.name) || WHEEL.test(o.parent?.name || '');
    const geom = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(place, o.matrixWorld));
    const groups = geom.groups.length ? geom.groups : [{ start: 0, count: geom.index ? geom.index.count : geom.attributes.position.count, materialIndex: 0 }];
    for (const gr of groups) {
      const src = list[gr.materialIndex] || list[0], name = src.name || '';
      if (!mats.has(src)) mats.set(src, convert(src, name));
      parts.push({ geometry: geom, range: groups.length > 1 || geom.groups.length ? [gr.start, gr.count] : null, material: mats.get(src), name, wheel });
    }
  });
  // a wheel's pivot: the middle of its geometry (the axle)
  const pivots = new Map();
  for (const p of parts) if (p.wheel && !pivots.has(p.geometry)) { p.geometry.computeBoundingBox(); const c = p.geometry.boundingBox.getCenter(new THREE.Vector3()); p.geometry.translate(-c.x, -c.y, -c.z); pivots.set(p.geometry, c); }
  for (const p of parts) if (p.wheel) p.pivot = pivots.get(p.geometry);
  return { parts, len: cfg.L, cfg };
}

// A car from a prepared model: { group, wheels, paint, tail, head, len }. own: its own paint and tail lamps
export function buildCar(model, { color, own = false } = {}) {
  const g = new THREE.Group(); g.userData.noTex = true;
  const wheels = [], pivotFor = new Map();
  let paint = null, tail = null, head = null;
  const ownMats = new Map();
  for (const p of model.parts) {
    let m = p.material;
    if (model.cfg.paint && model.cfg.paint.test(p.name)) { if (color) { m = ownMats.get(m) || m.clone(); m.color.set(color); ownMats.set(p.material, m); } paint = m; }
    else if (TAIL.test(p.name)) { if (own) { m = ownMats.get(p.material) || Object.assign(p.material.clone(), {}); m.emissive = new THREE.Color('#ff2a2a'); m.emissiveIntensity = 0; ownMats.set(p.material, m); } tail = m; }
    else if (HEAD.test(p.name)) head = m;
    let geom = p.geometry;
    if (p.range) { geom = p.geometry.clone(); geom.clearGroups(); geom.addGroup(p.range[0], p.range[1], 0); }
    const mesh = new THREE.Mesh(geom, p.range ? [m] : m);
    mesh.castShadow = true; mesh.receiveShadow = true;
    if (p.wheel) {
      let piv = pivotFor.get(p.geometry);
      if (!piv) { piv = new THREE.Group(); piv.position.copy(p.pivot); g.add(piv); pivotFor.set(p.geometry, piv); wheels.push(piv); }
      piv.add(mesh);
    } else g.add(mesh);
  }
  return { group: g, wheels, paint, tail, head, len: model.len };
}
