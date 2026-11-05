// The 3D bakery (day) and back room (night). Everything is built from simple shapes in code.
// The scene only reads game state; taps on stations and people are reported back through onPick.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { CFG, ITEMS, STAGES } from './data.js';
import * as G from './game.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const PI = Math.PI;

const PAL = {
  skin: ['#f5d0b0', '#e0ac85', '#c68a5e', '#9a6440', '#6b4428'],
  shirt: ['#e85d75', '#4f9de8', '#5fcf8a', '#f0b44c', '#9b6bff', '#ff8a5c', '#3cc6c6', '#f2f2f2', '#454b63', '#d4508f'],
  hair: ['#2b1d14', '#5a3a22', '#a8743a', '#e3c27a', '#8a8a8a', '#c0462f'],
  pants: ['#2f3b5c', '#3d3d3d', '#6b5a45', '#24344a', '#5c2f3b'],
  hoodie: ['#2a2a33', '#1f2b2a', '#3a2433', '#33302a', '#22263a'],
};
const DOUGH = { sourdough: '#e8d3a9', croissant: '#f1d49a', cookies: '#c98a4b', donuts: '#efd2a0', tart: '#e6c08a', bun: '#d9b07a', velvet: '#b58cff' };

// ---------- Small helpers with shared geometry and materials ----------

const geoCache = new Map();
const geo = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
const matCache = new Map();
function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o }));
  return matCache.get(key);
}
function mesh(g, m, x = 0, y = 0, z = 0, cast = true) {
  const me = new THREE.Mesh(g, m);
  me.position.set(x, y, z);
  me.castShadow = cast;
  me.receiveShadow = true;
  return me;
}
// Box positioned by its bottom centre. Anything chunkier than a wall gets softly rounded edges.
function box(w, h, d, m, x = 0, y = 0, z = 0, cast = true) {
  const mn = Math.min(w, h, d);
  const g = mn >= 0.22
    ? geo(`rb${w}|${h}|${d}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(0.07, mn * 0.18)))
    : geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
  return mesh(g, typeof m === 'string' ? mat(m) : m, x, y + h / 2, z, cast);
}
// A rounded box with a chosen radius (for small things that should still look soft).
function rbox(w, h, d, m, x = 0, y = 0, z = 0, r = 0.03) {
  return mesh(geo(`rr${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2))), typeof m === 'string' ? mat(m) : m, x, y + h / 2, z);
}
function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 16, cast = true) {
  return mesh(geo(`c${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), typeof m === 'string' ? mat(m) : m, x, y + h / 2, z, cast);
}
function sphere(r, m, x = 0, y = 0, z = 0, cast = true) {
  return mesh(geo(`s${r}`, () => new THREE.SphereGeometry(r, 16, 12)), typeof m === 'string' ? mat(m) : m, x, y, z, cast);
}
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// ---------- Baked goods for the display case ----------

function itemModel(id) {
  const g = new THREE.Group();
  if (id === 'sourdough') {
    const loaf = sphere(0.13, '#b9773e'); loaf.scale.set(1.3, 0.75, 1); loaf.position.y = 0.08; g.add(loaf);
    const score = box(0.2, 0.012, 0.03, '#e8c58f', 0, 0.165, 0); g.add(score);
  } else if (id === 'croissant') {
    const c = mesh(geo('crois', () => new THREE.TorusGeometry(0.1, 0.05, 8, 14, PI * 1.25)), mat('#e0a44a'));
    c.rotation.x = -PI / 2; c.position.y = 0.05; g.add(c);
  } else if (id === 'cookies') {
    g.add(cyl(0.1, 0.1, 0.035, '#c98a4b', 0, 0, 0));
    g.add(sphere(0.022, '#4a2a18', 0.03, 0.04, 0.02)); g.add(sphere(0.02, '#4a2a18', -0.04, 0.04, -0.03));
  } else if (id === 'donuts') {
    const d = mesh(geo('donut', () => new THREE.TorusGeometry(0.08, 0.042, 8, 16)), mat('#d9a066'));
    d.rotation.x = -PI / 2; d.position.y = 0.04; g.add(d);
    const ic = mesh(geo('icing', () => new THREE.TorusGeometry(0.08, 0.03, 6, 16)), mat('#ff7eb6'));
    ic.rotation.x = -PI / 2; ic.position.y = 0.065; g.add(ic);
  } else if (id === 'tart') {
    g.add(cyl(0.12, 0.1, 0.05, '#d8a35c', 0, 0, 0));
    g.add(cyl(0.095, 0.095, 0.02, '#e2394b', 0, 0.045, 0));
    g.add(sphere(0.025, '#ffffff', 0, 0.075, 0));
  } else if (id === 'bun') {
    const b = mesh(geo('bun', () => new THREE.TorusGeometry(0.07, 0.05, 8, 16)), mat('#c98448'));
    b.rotation.x = -PI / 2; b.position.y = 0.05; g.add(b);
    g.add(sphere(0.055, '#b87338', 0, 0.06, 0));
    const ic = box(0.12, 0.01, 0.02, '#fff3e0', 0, 0.105, 0); ic.rotation.y = 0.6; g.add(ic);
  }
  return g;
}

// ---------- Stations ----------
// Each builder returns { group, anchor (local), update(slot, dt, now) }. Front of every model faces +z.

function emissiveMat(color, emissive) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0, roughness: 0.35 });
}

function buildOven() {
  const g = new THREE.Group();
  const steel = mat('#c7cad1', { metalness: 0.45, roughness: 0.4 });
  g.add(box(1.05, 1.45, 0.85, steel, 0, 0.08, 0));
  for (const x of [-0.42, 0.42]) for (const z of [-0.32, 0.32]) g.add(box(0.08, 0.08, 0.08, '#3b3e45', x, 0, z));
  g.add(box(1.07, 0.06, 0.87, '#3b3e45', 0, 1.53, 0));
  const doorMat = emissiveMat('#2a1a10', '#ff7a1a');
  const door = box(0.82, 0.62, 0.04, doorMat, 0, 0.42, 0.44);
  g.add(door);
  g.add(box(0.7, 0.05, 0.05, mat('#e9ebef', { metalness: 0.7, roughness: 0.25 }), 0, 1.1, 0.46));
  g.add(box(0.9, 0.2, 0.03, '#2f3238', 0, 1.24, 0.43));
  for (const x of [-0.25, 0, 0.25]) { const k = cyl(0.04, 0.04, 0.04, '#e8e8e8', x, 1.28, 0.45, 10); k.rotation.x = PI / 2; g.add(k); }
  const lamp = emissiveMat('#333', '#5fd38d'); g.add(box(0.06, 0.06, 0.02, lamp, 0.38, 1.31, 0.45));
  return {
    group: g, anchor: V3(0, 1.85, 0.2), smoke: V3(0, 1.6, 0),
    update(slot, dt, now) {
      let i = 0, col = '#ff7a1a', l = 0;
      if (slot.item && !slot.done) { i = 0.5 + 0.9 * (slot.t / slot.dur) + Math.sin(now * 9) * 0.08; }
      else if (slot.item && slot.done) {
        const burning = CFG.burnAfter - slot.over <= 5;
        col = burning ? '#ff2a2a' : '#ffa040';
        i = burning ? 1.2 + Math.sin(now * 14) * 0.8 : 1.3 + Math.sin(now * 5) * 0.3;
        l = 1;
      }
      doorMat.emissive.set(col); doorMat.emissiveIntensity = Math.max(0, i);
      lamp.emissiveIntensity = l * 2;
      return slot.item && slot.done ? (CFG.burnAfter - slot.over <= 5 ? 'smoke' : 'steam') : null;
    },
  };
}

function buildMixer() {
  const g = new THREE.Group();
  g.add(box(1.0, 0.9, 0.8, '#a8714a', 0, 0, 0));
  g.add(box(1.04, 0.06, 0.84, '#efe6d8', 0, 0.9, 0));
  const body = mat('#ff9fb2', { roughness: 0.45 });
  g.add(box(0.36, 0.1, 0.42, body, 0, 0.96, -0.05));
  g.add(box(0.14, 0.55, 0.14, body, 0, 0.96, -0.2));
  g.add(box(0.3, 0.2, 0.5, body, 0, 1.45, -0.02));
  const bowl = cyl(0.19, 0.13, 0.24, mat('#dfe3ea', { metalness: 0.6, roughness: 0.3 }), 0, 1.06, 0.05, 18);
  g.add(bowl);
  const dough = sphere(0.14, mat('#efd9b0')); dough.scale.y = 0.6; dough.position.set(0, 1.27, 0.05); g.add(dough);
  const whisk = cyl(0.025, 0.06, 0.24, mat('#e9ebef', { metalness: 0.7 }), 0, 1.2, 0.05, 8); g.add(whisk);
  const doughMats = {};
  return {
    group: g, anchor: V3(0, 2.0, 0),
    update(slot, dt) {
      dough.visible = !!slot.item;
      if (slot.item) {
        dough.material = doughMats[slot.item] ||= mat(DOUGH[slot.item] || '#efd9b0');
        if (!slot.done) { whisk.rotation.y += dt * 14; dough.rotation.y -= dt * 4; }
      }
      return null;
    },
  };
}

function buildRack() {
  const g = new THREE.Group();
  const metal = mat('#b9bec7', { metalness: 0.5, roughness: 0.4 });
  for (const x of [-0.33, 0.33]) for (const z of [-0.3, 0.3]) g.add(box(0.05, 1.8, 0.05, metal, x, 0, z));
  for (const y of [0.25, 0.75, 1.25, 1.75]) g.add(box(0.72, 0.03, 0.66, metal, 0, y, 0));
  const cover = new THREE.MeshStandardMaterial({ color: '#fff6e8', transparent: true, opacity: 0.25, roughness: 0.9 });
  g.add(box(0.74, 1.6, 0.02, cover, 0, 0.2, 0.34, false));
  const doughs = [0.78, 1.28].map(y => {
    const d = sphere(0.13, mat('#efd9b0')); d.scale.set(1.2, 0.5, 1); d.position.set(0, y + 0.07, 0); g.add(d); return d;
  });
  const doughMats = {};
  return {
    group: g, anchor: V3(0, 2.15, 0),
    update(slot) {
      const p = slot.item ? (slot.done ? 1 : slot.t / slot.dur) : 0;
      for (const d of doughs) {
        d.visible = !!slot.item;
        if (slot.item) {
          d.material = doughMats[slot.item] ||= mat(DOUGH[slot.item] || '#efd9b0');
          const k = 0.6 + 0.6 * p;
          d.scale.set(1.2 * k, 0.55 * k, 1 * k);
        }
      }
      return null;
    },
  };
}

function buildPrep() {
  const g = new THREE.Group();
  g.add(box(1.15, 0.9, 0.8, '#5b5f66', 0, 0, 0));
  g.add(box(1.19, 0.05, 0.84, '#8d939c', 0, 0.9, 0));
  const glow = emissiveMat('#3a2a55', '#b58cff');
  const tray = box(0.6, 0.06, 0.4, glow, 0, 0.95, 0.05);
  g.add(tray);
  g.add(box(0.18, 0.2, 0.18, '#d9d0bf', -0.42, 0.95, -0.2));
  g.add(box(0.16, 0.14, 0.16, '#cfc3a8', 0.42, 0.95, -0.2));
  g.add(cyl(0.06, 0.06, 0.18, mat('#cfe8ff', { transparent: true, opacity: 0.6 }), 0.42, 0.95, 0.2, 10));
  return {
    group: g, anchor: V3(0, 1.75, 0),
    update(slot, dt, now) {
      glow.emissiveIntensity = slot.item ? (slot.done ? 1.4 + Math.sin(now * 5) * 0.4 : 0.4 + 0.8 * slot.t / slot.dur) : 0;
      return null;
    },
  };
}

function buildBurner() {
  const g = new THREE.Group();
  g.add(box(1.0, 0.9, 0.8, '#4a4d54', 0, 0, 0));
  g.add(box(1.02, 0.05, 0.82, '#2a2c31', 0, 0.9, 0));
  const flame = mesh(geo('flame', () => new THREE.ConeGeometry(0.16, 0.16, 12)), new THREE.MeshBasicMaterial({ color: '#4fa3ff' }));
  flame.position.set(0, 1.03, 0.02); g.add(flame);
  g.add(cyl(0.2, 0.2, 0.03, '#1d1e22', 0, 0.95, 0.02, 16));
  g.add(cyl(0.22, 0.2, 0.3, mat('#9aa0aa', { metalness: 0.6, roughness: 0.35 }), 0, 1.0, 0.02, 18));
  const liquid = new THREE.MeshStandardMaterial({ color: '#5a3a8a', emissive: '#b58cff', emissiveIntensity: 0, roughness: 0.2 });
  g.add(cyl(0.2, 0.2, 0.02, liquid, 0, 1.27, 0.02, 18, false));
  return {
    group: g, anchor: V3(0, 1.85, 0), smoke: V3(0, 1.4, 0.02),
    update(slot, dt, now) {
      flame.visible = !!slot.item;
      flame.scale.y = 1 + Math.sin(now * 20) * 0.15;
      let i = 0;
      if (slot.item && !slot.done) i = 0.3 + 1.2 * slot.t / slot.dur;
      if (slot.item && slot.done) {
        const burning = CFG.burnAfter - slot.over <= 5;
        liquid.emissive.set(burning ? '#ff3a3a' : '#c79bff');
        i = 1.6 + Math.sin(now * (burning ? 14 : 5)) * 0.5;
      } else liquid.emissive.set('#b58cff');
      liquid.emissiveIntensity = i;
      return slot.item && slot.done ? (CFG.burnAfter - slot.over <= 5 ? 'smoke' : 'vapour') : null;
    },
  };
}

function buildBagger() {
  const g = new THREE.Group();
  g.add(box(1.1, 0.9, 0.8, '#6a5a48', 0, 0, 0));
  g.add(box(1.14, 0.05, 0.84, '#8b7a64', 0, 0.9, 0));
  g.add(box(0.3, 0.06, 0.24, '#e6e6e6', -0.3, 0.95, 0));
  g.add(box(0.26, 0.04, 0.2, '#1d1e22', -0.3, 1.01, 0));
  const bags = [];
  for (let k = 0; k < 6; k++) {
    const b = box(0.09, 0.12, 0.03, mat('#c79bff', { roughness: 0.3, transparent: true, opacity: 0.85 }), 0.1 + (k % 3) * 0.14, 0.95, -0.1 + Math.floor(k / 3) * 0.18);
    b.visible = false; g.add(b); bags.push(b);
  }
  return {
    group: g, anchor: V3(0, 1.7, 0),
    update(slot) {
      const n = slot.item ? Math.ceil((slot.done ? 1 : slot.t / slot.dur) * 6) : 0;
      bags.forEach((b, k) => { b.visible = k < n; });
      return null;
    },
  };
}

const BUILDERS = { mix: buildMixer, proof: buildRack, bake: buildOven, prep: buildPrep, cook: buildBurner, bag: buildBagger };
const PLACES = {
  mix:   [{ x: -3.95, z: -3.3, ry: PI / 2 }, { x: -3.95, z: -2.2, ry: PI / 2 }],
  proof: [{ x: -4.05, z: -1.05, ry: PI / 2 }, { x: -4.05, z: -0.2, ry: PI / 2 }, { x: -4.05, z: 0.65, ry: PI / 2 }, { x: -4.05, z: 1.5, ry: PI / 2 }],
  bake:  [{ x: -2.55, z: -4.0, ry: 0 }, { x: -1.35, z: -4.0, ry: 0 }, { x: -0.15, z: -4.0, ry: 0 }, { x: 1.05, z: -4.0, ry: 0 }],
  prep:  [{ x: -10.25, z: -3.95, ry: 0 }],
  cook:  [{ x: -8.95, z: -3.95, ry: 0 }, { x: -7.8, z: -3.95, ry: 0 }],
  bag:   [{ x: -6.5, z: -3.95, ry: 0 }],
};

// ---------- People ----------
// Chunky, friendly figures. kind: 'customer', 'hood' (night buyers) or 'baker' (you).

function buildPerson(look, kind) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const skin = mat(PAL.skin[look.skin % 5]);
  const topC = kind === 'hood' ? PAL.hoodie[look.shirt % 5] : kind === 'baker' ? '#fbf7f2' : PAL.shirt[look.shirt % 10];
  const top = mat(topC);
  const pants = mat(kind === 'baker' ? '#3a3550' : PAL.pants[look.pants % 5]);
  const shoe = mat('#2a2230');
  const legGeo = geo('leg', () => new THREE.CapsuleGeometry(0.068, 0.26, 3, 8));
  const armGeo = geo('arm', () => new THREE.CapsuleGeometry(0.056, 0.22, 3, 8));
  const pivot = (parent, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); parent.add(p); return p; };
  const legL = pivot(body, -0.09, 0.42), legR = pivot(body, 0.09, 0.42);
  for (const leg of [legL, legR]) {
    leg.add(mesh(legGeo, pants, 0, -0.19, 0));
    leg.add(rbox(0.13, 0.08, 0.21, shoe, 0, -0.44, 0.03, 0.035));
  }
  const torso = mesh(geo('torso2', () => new THREE.CapsuleGeometry(0.2, 0.2, 4, 14)), top, 0, 0.71, 0);
  torso.scale.set(1, 1, 0.85); body.add(torso);
  if (kind === 'baker') body.add(rbox(0.3, 0.38, 0.04, '#ff9fb2', 0, 0.48, 0.165, 0.02));
  const armL = pivot(body, -0.255, 0.88), armR = pivot(body, 0.255, 0.88);
  for (const arm of [armL, armR]) {
    arm.add(mesh(armGeo, top, 0, -0.15, 0));
    arm.add(sphere(0.062, skin, 0, -0.32, 0));
  }
  const head = new THREE.Group(); head.position.set(0, 1.17, 0); body.add(head);
  const skull = sphere(0.24, skin); skull.scale.set(1, 0.95, 0.95); head.add(skull);
  const eyeM = mat('#1a1420');
  const eyes = [-0.085, 0.085].map(x => { const e = sphere(0.032, eyeM, x, 0.03, 0.212, false); head.add(e); return e; });
  const blush = mat('#ff9a9a');
  for (const x of [-0.145, 0.145]) head.add(sphere(0.038, blush, x, -0.06, 0.175, false));
  const hairM = mat(PAL.hair[look.hair % 6]);
  const cap = geo('hcap', () => new THREE.SphereGeometry(0.25, 16, 10, 0, PI * 2, 0, PI * 0.5));
  if (kind === 'hood') {
    const hood = mesh(geo('hood2', () => new THREE.SphereGeometry(0.3, 16, 12, 0, PI * 2, 0, PI * 0.66)), top, 0, 0.02, -0.04);
    hood.rotation.x = -0.45; head.add(hood);
  } else if (kind === 'baker') {
    const h = mesh(cap, hairM, 0, 0.03, -0.01); h.rotation.x = -0.2; head.add(h);
    head.add(cyl(0.17, 0.17, 0.16, '#ffffff', 0, 0.16, 0, 16));
    const puff = sphere(0.21, '#ffffff', 0, 0.38, 0); puff.scale.y = 0.7; head.add(puff);
  } else {
    const style = (look.shirt + look.pants) % 4;
    const h = mesh(cap, hairM, 0, 0.03, -0.015); h.rotation.x = -0.22; head.add(h);
    if (style === 1) head.add(sphere(0.11, hairM, 0, 0.27, -0.1));
    if (style === 2) { const back = sphere(0.22, hairM, 0, -0.08, -0.1); back.scale.set(1.05, 1.2, 0.7); head.add(back); }
    if (style === 3) for (const [x, z] of [[-0.12, 0.05], [0.12, 0.05], [0, -0.12]]) head.add(sphere(0.09, hairM, x, 0.2, z));
    if (look.hat) { head.add(cyl(0.27, 0.27, 0.025, '#2d2f3a', 0, 0.12, 0, 18)); head.add(cyl(0.18, 0.2, 0.16, '#2d2f3a', 0, 0.13, 0, 18)); }
  }
  const bagM = new THREE.MeshStandardMaterial({ color: '#c8a36a', roughness: 0.85 });
  const bag = rbox(0.17, 0.2, 0.11, bagM, 0, -0.5, 0.03, 0.02);
  bag.visible = false; armR.add(bag);
  g.scale.setScalar(look.h || 1);
  return { group: g, body, legL, legR, armL, armR, head, eyes, bag, bagM };
}

class Agent {
  constructor(scene, look, kind, pos) {
    this.p = buildPerson(look, kind);
    this.group = this.p.group;
    this.group.position.copy(pos);
    this.target = pos.clone();
    this.speed = kind === 'hood' ? 1.6 : kind === 'baker' ? 3.0 : 2.2;
    this.phase = Math.random() * 10;
    this.face = null;
    this.leaving = false;
    this.work = 0;
    this.blinkIn = 1 + Math.random() * 3;
    this.height = 1.75 * (look.h || 1);
    scene.add(this.group);
  }
  update(dt) {
    const pos = this.group.position;
    const d = this.target.clone().sub(pos); d.y = 0;
    const dist = d.length();
    let moving = false;
    if (dist > 0.03) {
      moving = true;
      pos.addScaledVector(d.normalize(), Math.min(dist, this.speed * dt));
      this.turnTo(Math.atan2(d.x, d.z), dt);
    } else if (this.face !== null) this.turnTo(this.face, dt);
    this.phase += dt * (moving ? 10 : 2);
    const p = this.p;
    const sw = moving ? Math.sin(this.phase) * 0.65 : 0;
    p.legL.rotation.x = sw; p.legR.rotation.x = -sw;
    if (this.work > 0) {
      this.work -= dt;
      const w = Math.sin(this.phase * 9);
      p.armL.rotation.x = -1.1 + w * 0.35; p.armR.rotation.x = -1.1 - w * 0.35;
    } else {
      p.armL.rotation.x = -sw * 0.8;
      p.armR.rotation.x = p.bag.visible ? 0.15 : sw * 0.8;
    }
    p.armL.rotation.z = 0.08; p.armR.rotation.z = -0.08;
    p.body.position.y = moving ? Math.abs(Math.sin(this.phase)) * 0.05 : Math.sin(this.phase) * 0.008;
    p.body.rotation.z = moving ? Math.sin(this.phase) * 0.04 : 0;
    p.head.rotation.y = moving ? 0 : Math.sin(this.phase * 0.35) * 0.35;
    // Blink now and then
    this.blinkIn -= dt;
    const closed = this.blinkIn < 0.12;
    for (const e of p.eyes) e.scale.y = closed ? 0.15 : 1;
    if (this.blinkIn < 0) this.blinkIn = 2 + Math.random() * 3.5;
    return dist <= 0.03;
  }
  turnTo(a, dt) {
    const r = this.group.rotation.y;
    const diff = ((a - r + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
    this.group.rotation.y = r + diff * Math.min(1, dt * 10);
  }
}

// ---------- The scene ----------

export function createScene(canvas, overlayEl, { onPick }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 600;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen ? 1.75 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2b2140');

  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 300);
  const DIR = V3(1, 1.15, 1).normalize();
  const RIGHT = V3(1, 0, -1).normalize();
  const UPS = V3(0, 1, 0).addScaledVector(DIR, -DIR.y).normalize();
  const ZONES = {
    shop: { center: V3(0.45, 0.5, 0.75), needW: 11.6, needH: 9.8 },
    back: { center: V3(-8.9, 0.5, 0.5), needW: 11.9, needH: 9.4 },
  };
  const view = { zone: 'shop', light: 'day', top: 70, bottom: 90 };
  const cam = { target: ZONES.shop.center.clone(), zoom: 1, panR: 0, panU: 0 };
  let W = 1, H = 1, unit = 0.03;

  // Lights
  const hemi = new THREE.HemisphereLight('#fff1dc', '#4a3a5a', 1.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe2b8', 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(smallScreen ? 1024 : 2048, smallScreen ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 13, bottom: -13, near: 1, far: 70 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.target.position.set(-3.5, 0, 0);
  sun.position.set(4, 16, 9);
  scene.add(sun, sun.target);
  const shopLamp = new THREE.PointLight('#ffd59a', 0, 10, 2); shopLamp.position.set(0, 2.7, 1.2); scene.add(shopLamp);
  const bulb = new THREE.PointLight('#ffcc88', 0, 9, 2); bulb.position.set(-9.4, 2.6, -1.6); scene.add(bulb);
  const neon = new THREE.PointLight('#9b5cff', 0, 11, 2); neon.position.set(-7.0, 2.3, -3.6); scene.add(neon);
  const street = new THREE.PointLight('#ffd27a', 0, 9, 2); street.position.set(5.5, 2.5, -3.4); scene.add(street);
  const alley = new THREE.PointLight('#ffb05a', 0, 8, 2); alley.position.set(-12.6, 2.3, 3.3); scene.add(alley);
  const LIGHTS = {
    day:     { hemi: 1.7, hemiC: '#fff1dc', sun: 2.4, sunC: '#ffe2b8', bg: '#2b2140', lamp: 0, bulb: 3, neon: 4, street: 0, alley: 0, lampI: 0.3, win: '#bfe6ff', winI: 0.9, glow: 0.6 },
    evening: { hemi: 1.0, hemiC: '#ffd2b0', sun: 1.5, sunC: '#ff9a5a', bg: '#2a1830', lamp: 10, bulb: 5, neon: 6, street: 10, alley: 4, lampI: 1.6, win: '#ff9e6b', winI: 0.9, glow: 1 },
    night:   { hemi: 0.75, hemiC: '#9aa4ff', sun: 0.6, sunC: '#8c9aff', bg: '#0b0912', lamp: 3, bulb: 26, neon: 34, street: 14, alley: 14, lampI: 2.4, win: '#1a2240', winI: 0.6, glow: 1.8 },
  };
  const cur = { ...LIGHTS.day, bgC: new THREE.Color(LIGHTS.day.bg), winC: new THREE.Color(LIGHTS.day.win), hemiCC: new THREE.Color(LIGHTS.day.hemiC), sunCC: new THREE.Color(LIGHTS.day.sunC) };

  const pickables = [];
  const glowMats = [];
  const lampGlows = [];
  const windows = [];

  // ---------- Static room ----------
  const floorTex = canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = '#f2e2c8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e2c9a6'; c.fillRect(0, 0, w / 2, h / 2); c.fillRect(w / 2, h / 2, w / 2, h / 2);
    c.strokeStyle = '#d6bb95'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, w - 1, h - 1);
  }, [4.5, 4.5]);
  const concreteTex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#595b62'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.06})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(80, 60, 26, 14, 0.4, 0, PI * 2); c.fill();
  }, [3, 4]);
  const tileTex = canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = '#fbf7f0'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d9d2c6'; c.lineWidth = 2;
    for (let i = 0; i <= 2; i++) { c.beginPath(); c.moveTo(0, i * h / 2); c.lineTo(w, i * h / 2); c.stroke(); c.beginPath(); c.moveTo(i * w / 2, 0); c.lineTo(i * w / 2, h); c.stroke(); }
  }, [6, 1]);

  // Floors (with a base slab so each room reads as a diorama)
  const shopFloor = mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 }), 0, 0.001, 0, false);
  shopFloor.rotation.x = -PI / 2; scene.add(shopFloor);
  scene.add(box(9.25, 0.45, 9.25, '#3a2b45', 0, -0.45, 0, false));
  const backFloor = mesh(new THREE.PlaneGeometry(6.9, 9), new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.95 }), -8.15, 0.001, 0, false);
  backFloor.rotation.x = -PI / 2; scene.add(backFloor);
  scene.add(box(7.15, 0.45, 9.25, '#24212b', -8.15, -0.45, 0, false));

  // Walls
  const shopWall = mat('#f6d2b0'), shopWain = mat('#c98f6b'), trim = mat('#fff0dc');
  const backWall = mat('#41464f'), backWain = mat('#30343b');
  function wallX(x0, x1, z, upper, lower, tiles) { // runs along x
    const w = x1 - x0, cx = (x0 + x1) / 2;
    scene.add(box(w, 1.0, 0.2, lower, cx, 0, z));
    scene.add(box(w, 2.0, 0.2, upper, cx, 1.0, z));
    scene.add(box(w, 0.06, 0.24, trim, cx, 1.0, z));
    if (tiles) { const t = mesh(new THREE.PlaneGeometry(w, 1.0), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.4 }), cx, 1.55, z + 0.105, false); scene.add(t); }
  }
  function wallZ(z0, z1, x, upper, lower, group) { // runs along z
    const d = z1 - z0, cz = (z0 + z1) / 2;
    const parts = [box(0.2, 1.0, d, lower, x, 0, cz), box(0.2, 2.0, d, upper, x, 1.0, cz), box(0.24, 0.06, d, trim, x, 1.0, cz)];
    for (const p of parts) (group || scene).add(p);
  }
  wallX(-4.5, 4.6, -4.6, shopWall, shopWain, null);
  // Tiled splashback behind the ovens
  { const t = mesh(new THREE.PlaneGeometry(5.0, 0.9), new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.4 }), -0.75, 1.95, -4.49, false); scene.add(t); }
  // The partition between shop and back room (hidden at night so you can see in)
  const partition = new THREE.Group();
  wallZ(-4.7, 2.55, -4.6, shopWall, shopWain, partition);
  wallZ(3.65, 4.6, -4.6, shopWall, shopWain, partition);
  partition.add(box(0.2, 0.9, 1.1, shopWall, -4.6, 2.1, 3.1));
  const innerDoor = box(0.06, 2.05, 1.05, '#7a4a2e', -4.6, 0, 3.1); partition.add(innerDoor);
  partition.add(box(0.1, 0.12, 0.1, '#e0c070', -4.53, 1.0, 2.75));
  scene.add(partition);
  // Back room walls
  wallX(-11.6, -4.7, -4.6, backWall, backWain, null);
  wallZ(-4.7, 1.6, -11.7, backWall, backWain);
  wallZ(2.8, 4.6, -11.7, backWall, backWain);
  scene.add(box(0.2, 0.95, 1.2, backWall, -11.7, 2.05, 2.2));
  const backDoorPivot = new THREE.Group(); backDoorPivot.position.set(-11.68, 0, 1.62);
  const backDoor = box(0.08, 2.0, 1.15, '#55606b', 0, 0, 0.58); backDoorPivot.add(backDoor);
  backDoorPivot.add(box(0.1, 0.1, 0.1, '#c9ccd3', 0.05, 1.0, 1.02));
  scene.add(backDoorPivot);

  // Shop windows, sign and menu board
  function windowOn(x, z, w, h, y) {
    const frame = box(w + 0.16, h + 0.16, 0.08, '#fff0dc', x, y - 0.08, z + 0.1);
    const m = new THREE.MeshStandardMaterial({ color: '#1c2233', emissive: '#bfe6ff', emissiveIntensity: 0.9, roughness: 0.2 });
    const pane = box(w, h, 0.04, m, x, y, z + 0.15, false);
    scene.add(frame, pane);
    scene.add(box(0.04, h, 0.05, '#fff0dc', x, y, z + 0.18, false));
    windows.push(m);
  }
  windowOn(3.0, -4.6, 1.7, 1.2, 1.2);
  windowOn(-9.5, -4.6, 1.0, 0.5, 2.1);
  const menuTex = canvasTex(256, 192, (c, w, h) => {
    c.fillStyle = '#2b3a34'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#a07a52'; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = '#f4efe2'; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center'; c.fillText('MENU', w / 2, 46);
    c.font = '20px Georgia, serif'; c.textAlign = 'left';
    ['Sourdough', 'Croissants', 'Cookies', 'Donuts', 'Tarts'].forEach((t, i) => c.fillText('~ ' + t, 30, 78 + i * 22));
  });
  const menu = mesh(new THREE.PlaneGeometry(1.2, 0.9), new THREE.MeshStandardMaterial({ map: menuTex, roughness: 0.9 }), 2.3, 2.45, -4.49, false);
  menu.position.x = 1.85; menu.position.y = 2.35; scene.add(menu);
  const woodSignTex = canvasTex(256, 64, (c, w, h) => {
    c.fillStyle = '#8a5a36'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffe7c2'; c.font = 'bold 34px Georgia, serif'; c.textAlign = 'center'; c.fillText("Rosa's Bakery", w / 2, 44);
  });
  const woodSign = mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshStandardMaterial({ map: woodSignTex, roughness: 0.8 }), 3.3, 2.65, -4.49, false);
  scene.add(woodSign);
  const neonTex = canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = 'rgba(0,0,0,0)'; c.fillRect(0, 0, w, h);
    c.shadowColor = '#ff4fa8'; c.shadowBlur = 24; c.fillStyle = '#ffd1ec';
    c.font = 'italic bold 78px "Brush Script MT", cursive, Georgia'; c.textAlign = 'center'; c.fillText("Rosa's", w / 2, 92);
  });
  const neonSign = mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: neonTex, transparent: true }), 3.3, 2.65, -4.47, false);
  neonSign.visible = false; scene.add(neonSign);

  // Display case and till
  scene.add(box(5.1, 0.95, 0.9, '#9c5f3b', 0, 0, 0.95));
  scene.add(box(5.14, 0.08, 0.94, '#5c3520', 0, 0, 0.95));
  scene.add(box(5.0, 0.6, 0.02, '#b67a52', 0, 0.2, 1.41));
  scene.add(box(5.14, 0.04, 0.94, '#efe6d8', 0, 0.95, 0.95));
  const glass = new THREE.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false });
  scene.add(box(5.1, 0.55, 0.9, glass, 0, 0.99, 0.95, false));
  scene.add(box(5.14, 0.04, 0.94, '#efe6d8', 0, 1.54, 0.95));
  const trays = [];
  for (let k = 0; k < 6; k++) {
    const x = -2.05 + k * 0.82;
    scene.add(box(0.72, 0.03, 0.62, '#f6f1e6', x, 0.99, 0.95));
    const tg = new THREE.Group(); tg.position.set(x, 1.02, 0.95); scene.add(tg);
    trays.push({ x, group: tg, sig: '' });
  }
  scene.add(box(1.0, 0.95, 0.9, '#8a5235', 3.1, 0, 0.95));
  scene.add(box(1.04, 0.05, 0.94, '#efe6d8', 3.1, 0.95, 0.95));
  scene.add(box(0.5, 0.22, 0.4, '#2e2f36', 3.1, 1.0, 0.9));
  const screenM = new THREE.MeshStandardMaterial({ color: '#0a2a1a', emissive: '#5fd38d', emissiveIntensity: 0.8 });
  { const scr = box(0.36, 0.22, 0.03, screenM, 3.1, 1.22, 0.78); scr.rotation.x = -0.4; scene.add(scr); }
  for (const x of [-1.6, 0, 1.6]) {
    scene.add(cyl(0.01, 0.01, 0.6, '#222', x, 2.4, 1.0, 6, false));
    const shade = mesh(geo('shade', () => new THREE.ConeGeometry(0.22, 0.2, 14, 1, true)), mat('#2f2a3a', { side: THREE.DoubleSide }), x, 2.35, 1.0);
    scene.add(shade);
    const bm = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd59a', emissiveIntensity: 0.6 });
    glowMats.push(bm); scene.add(sphere(0.07, bm, x, 2.27, 1.0, false));
  }
  // Decor: plants, rug, flour sacks, crates
  function plant(x, z, s = 1) {
    scene.add(cyl(0.2 * s, 0.15 * s, 0.35 * s, '#c96f4a', x, 0, z, 12));
    for (const [dx, dy, dz, r] of [[0, 0.55, 0, 0.26], [0.12, 0.72, 0.05, 0.18], [-0.12, 0.68, -0.06, 0.2]]) scene.add(sphere(r * s, '#4f9a5a', x + dx * s, dy * s, z + dz * s));
  }
  plant(4.0, -4.0, 1.1); plant(4.05, 1.0, 0.9);
  { const rug = mesh(new THREE.PlaneGeometry(1.6, 1.1), mat('#b8485e'), 3.8, 0.004, 3.6, false); rug.rotation.x = -PI / 2; scene.add(rug); }
  for (const [x, z] of [[2.4, -3.9], [2.85, -3.75]]) { const s = sphere(0.3, '#e9dcc1', x, 0.28, z); s.scale.set(1, 1.1, 0.8); scene.add(s); }
  // Back room clutter
  scene.add(box(0.9, 0.6, 0.7, '#7d6448', -11.0, 0, -1.6)); scene.add(box(0.7, 0.5, 0.6, '#8d7354', -10.95, 0.6, -1.55));
  scene.add(box(0.8, 0.5, 0.8, '#6b5540', -10.9, 0, 3.9));
  const ledM = new THREE.MeshStandardMaterial({ color: '#2a1840', emissive: '#a46bff', emissiveIntensity: 1.2 });
  glowMats.push(ledM);
  scene.add(box(6.6, 0.05, 0.05, ledM, -8.15, 2.85, -4.48, false));
  scene.add(cyl(0.01, 0.01, 0.5, '#222', -9.4, 2.5, -1.6, 6, false));
  const bulbM = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffcc88', emissiveIntensity: 1 }); glowMats.push(bulbM);
  scene.add(sphere(0.09, bulbM, -9.4, 2.45, -1.6, false));
  // Cash table, kit boxes, bag pile (filled from state)
  scene.add(box(1.2, 0.75, 0.75, '#5a4632', -6.9, 0, 1.0));
  const cash = [];
  for (let k = 0; k < 12; k++) {
    const c = box(0.22, 0.05, 0.12, mat('#6fbf73', { roughness: 0.9 }), -7.3 + (k % 4) * 0.26, 0.75 + Math.floor(k / 4) * 0.06, 0.95 + (k % 2) * 0.05);
    c.visible = false; scene.add(c); cash.push(c);
  }
  const kitsBoxes = [];
  for (let k = 0; k < 8; k++) {
    const b = box(0.32, 0.22, 0.28, '#c9b38a', -11.2 + (k % 2) * 0.34, Math.floor(k / 2) * 0.23, -3.0 + (k % 2) * 0.02);
    b.visible = false; scene.add(b); kitsBoxes.push(b);
  }
  scene.add(box(0.9, 0.8, 0.6, '#4f4639', -6.0, 0, -1.2));
  const bagPile = [];
  for (let k = 0; k < 24; k++) {
    const b = box(0.11, 0.14, 0.04, mat('#c79bff', { roughness: 0.3, transparent: true, opacity: 0.88 }), -6.3 + (k % 6) * 0.12, 0.8 + Math.floor(k / 12) * 0.15, -1.35 + Math.floor((k % 12) / 6) * 0.2);
    b.visible = false; scene.add(b); bagPile.push(b);
  }
  // Security camera upgrade
  const camGroup = new THREE.Group();
  camGroup.add(box(0.28, 0.14, 0.14, '#e6e6e6', 0, 0, 0)); camGroup.add(sphere(0.04, mat('#222'), 0.15, 0.07, 0, false));
  const camLed = new THREE.MeshBasicMaterial({ color: '#ff3a3a' }); camGroup.add(mesh(geo('led', () => new THREE.SphereGeometry(0.02, 6, 6)), camLed, 0.1, 0.12, 0.06, false));
  camGroup.position.set(-11.45, 2.55, 0.9); camGroup.rotation.y = 0.5; camGroup.visible = false; scene.add(camGroup);
  // Catering boxes upgrade
  const catering = new THREE.Group();
  for (let k = 0; k < 3; k++) catering.add(box(0.5, 0.18, 0.4, '#f4f0e8', 0, k * 0.19, 0));
  catering.position.set(3.95, 0, -2.6); catering.visible = false; scene.add(catering);

  // ---------- Outside: pavement, low front walls, street lamp, back alley ----------
  const paveImg = canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = '#a19eaa'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#85828f'; c.lineWidth = 3; c.strokeRect(1.5, 1.5, w - 3, h - 3);
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  function pave(x0, x1, z0, z1, tint) {
    const w = x1 - x0, d = z1 - z0;
    const t = paveImg.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 1.1, d / 1.1); t.needsUpdate = true;
    const top = mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, color: tint, roughness: 0.95 }), (x0 + x1) / 2, -0.04, (z0 + z1) / 2, false);
    top.rotation.x = -PI / 2; scene.add(top);
    scene.add(box(w, 0.4, d, '#2c2635', (x0 + x1) / 2, -0.44, (z0 + z1) / 2, false));
  }
  pave(-4.75, 6.7, 4.75, 6.5, '#ffffff');
  pave(4.75, 6.7, -4.75, 4.75, '#ffffff');
  scene.add(box(11.45, 0.12, 0.16, '#77737f', 0.97, -0.04, 6.45, false));
  scene.add(box(0.16, 0.12, 11.25, '#77737f', 6.65, -0.04, 0.88, false));
  // Knee-high front walls so the shop reads as a room, with a doorway on the street side
  scene.add(box(9.4, 0.5, 0.2, shopWain, 0, 0, 4.6)); scene.add(box(9.44, 0.06, 0.26, trim, 0, 0.5, 4.6));
  scene.add(box(0.2, 0.5, 7.5, shopWain, 4.6, 0, -0.95)); scene.add(box(0.26, 0.06, 7.54, trim, 4.6, 0.5, -0.95));
  for (const z of [2.85, 4.55]) { scene.add(box(0.24, 1.05, 0.24, '#7a4a2e', 4.62, 0, z)); scene.add(sphere(0.13, '#7a4a2e', 4.62, 1.12, z)); }
  const openTex = canvasTex(128, 64, (c, w, h) => {
    c.fillStyle = '#fff4e0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#b8485e'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
    c.fillStyle = '#b8485e'; c.font = 'bold 34px Georgia, serif'; c.textAlign = 'center'; c.fillText('OPEN', w / 2, 44);
  });
  { const sign = mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshStandardMaterial({ map: openTex, side: THREE.DoubleSide }), 4.76, 1.55, 2.85, false); sign.rotation.y = PI / 2; sign.position.y = 0.78; sign.position.z = 2.85; scene.add(sign); }
  // Street lamp, bench and a planter
  scene.add(cyl(0.05, 0.08, 2.9, '#2b2d36', 6.1, 0, -3.6, 10));
  scene.add(box(0.5, 0.06, 0.06, '#2b2d36', 5.88, 2.85, -3.6));
  const lampM = new THREE.MeshStandardMaterial({ color: '#fff1cc', emissive: '#ffd27a', emissiveIntensity: 0.4 });
  lampGlows.push(lampM);
  scene.add(sphere(0.13, lampM, 5.66, 2.74, -3.6, false));
  scene.add(box(1.5, 0.08, 0.42, '#a8703f', 1.5, 0.42, 5.75)); scene.add(box(1.5, 0.36, 0.06, '#a8703f', 1.5, 0.5, 5.95));
  for (const x of [0.88, 2.12]) scene.add(box(0.07, 0.42, 0.38, '#2b2d36', x, 0, 5.75));
  scene.add(box(0.7, 0.45, 0.7, '#8a8790', -2.8, 0, 5.6));
  scene.add(cyl(0.05, 0.07, 0.6, '#6b4a2e', -2.8, 0.45, 5.6, 8));
  for (const [dx, dy, dz, r] of [[0, 1.25, 0, 0.36], [0.2, 1.05, 0.12, 0.26], [-0.18, 1.1, -0.1, 0.27]]) scene.add(sphere(r, '#5aa36a', -2.8 + dx, dy, 5.6 + dz));
  // String lights along the top of the shop's back wall
  for (let k = 0; k < 13; k++) {
    const x = -4.2 + k * 0.7;
    const y = 2.82 - Math.sin((k % 4) / 4 * PI) * 0.12;
    const bm = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: ['#ffcf7a', '#ff9fb2', '#9fe1ff'][k % 3], emissiveIntensity: 0.6 });
    glowMats.push(bm); scene.add(sphere(0.045, bm, x, y, -4.43, false));
  }
  // Back alley behind the back door
  pave(-14.0, -11.85, -4.75, 4.75, '#8f8a9a');
  scene.add(box(1.0, 0.85, 1.45, '#3f6b4f', -13.2, 0, -2.5));
  scene.add(box(1.06, 0.08, 1.5, '#2f5240', -13.2, 0.85, -2.5));
  for (const [x, z, r] of [[-12.5, -1.4, 0.24], [-12.75, -1.15, 0.2], [-13.3, 0.4, 0.22]]) { const b = sphere(r, '#1c1c22', x, r * 0.8, z); b.scale.y = 0.85; scene.add(b); }
  scene.add(box(0.12, 0.24, 0.2, '#2b2d36', -11.85, 2.45, 3.5));
  const alleyM = new THREE.MeshStandardMaterial({ color: '#ffe2b0', emissive: '#ffb05a', emissiveIntensity: 0.4 });
  lampGlows.push(alleyM);
  scene.add(sphere(0.08, alleyM, -11.98, 2.45, 3.5, false));

  // ---------- Stations from state ----------
  let stationSig = '';
  let stations = { };
  function rebuildStations(s) {
    for (const st of Object.values(stations).flat()) { scene.remove(st.group); const i = pickables.indexOf(st.group); if (i >= 0) pickables.splice(i, 1); }
    stations = {};
    for (const kind of ['day', 'night']) {
      for (const { stage, n } of G.stationLayout(s, kind)) {
        stations[stage] = [];
        for (let i = 0; i < n; i++) {
          const pl = PLACES[stage][i];
          const st = BUILDERS[stage]();
          st.group.position.set(pl.x, 0, pl.z);
          st.group.rotation.y = pl.ry;
          st.group.userData = { act: 'slot', stage, i, kind };
          st.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
          scene.add(st.group);
          st.group.updateMatrixWorld(true);
          st.anchorW = st.group.localToWorld(st.anchor.clone());
          if (st.smoke) st.smokeW = st.group.localToWorld(st.smoke.clone());
          st.kind = kind; st.stage = stage; st.i = i;
          pickables.push(st.group);
          stations[stage].push(st);
        }
      }
    }
  }

  // ---------- Particles (steam, smoke, vapour) ----------
  const parts = [];
  const pgeo = new THREE.SphereGeometry(0.09, 8, 6);
  for (let k = 0; k < 40; k++) {
    const m = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
    const p = new THREE.Mesh(pgeo, m); p.visible = false; scene.add(p);
    parts.push({ mesh: p, life: 0, max: 1, vel: V3(0, 0, 0) });
  }
  let partIdx = 0;
  function emit(pos, kind) {
    const p = parts[partIdx++ % parts.length];
    p.mesh.visible = true;
    p.mesh.position.copy(pos).add(V3((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2));
    p.mesh.material.color.set(kind === 'smoke' ? '#3a3a3a' : kind === 'vapour' ? '#d9c2ff' : '#ffffff');
    p.life = 0; p.max = 1.2 + Math.random() * 0.6;
    p.vel.set((Math.random() - 0.5) * 0.15, 0.7 + Math.random() * 0.3, (Math.random() - 0.5) * 0.15);
  }
  const emitAcc = new Map();

  // ---------- People from state ----------
  const OUTSIDE = V3(6.4, 0, 3.7), GAP = V3(4.2, 0, 3.7);
  const DOOR_OUT = V3(-13.0, 0, 2.2), DOOR_IN = V3(-11.0, 0, 2.2);
  const BUYER_SPOTS = [V3(-10.1, 0, 2.9), V3(-10.1, 0, 1.5), V3(-9.0, 0, 3.4), V3(-9.0, 0, 2.1), V3(-7.9, 0, 3.0), V3(-7.9, 0, 1.7)];
  const TILL = V3(3.1, 1.3, 0.85);
  const customers = new Map(); // id -> { agent, shown, inside, leaving }
  const buyers = new Map();
  const reactions = []; // { agent, text, kind, until, id }

  // You: the baker. Walks to whatever you tap.
  const BAKER_HOME = { shop: V3(0.7, 0, -1.4), back: V3(-8.4, 0, -1.2) };
  const baker = new Agent(scene, { skin: 1, shirt: 0, hair: 1, pants: 0, h: 1.02 }, 'baker', BAKER_HOME.shop.clone());
  baker.face = PI / 4;
  let bakerZone = 'shop', bakerJob = null, bakerIdle = 0;

  // Things flying through the air: fresh goods to the case, bags to the pile, coins from the till.
  const flyers = [];
  function launch(obj, from, to, { delay = 0, dur = 0.65, arc = 1.1, pop = false } = {}) {
    obj.position.copy(from); obj.visible = false; scene.add(obj);
    flyers.push({ obj, from: from.clone(), to: to.clone(), t: -delay, dur, arc, pop });
  }
  function updateFlyers(dt) {
    for (let k = flyers.length - 1; k >= 0; k--) {
      const f = flyers[k];
      f.t += dt;
      if (f.t < 0) continue;
      f.obj.visible = true;
      const q = Math.min(1, f.t / f.dur);
      f.obj.position.lerpVectors(f.from, f.to, q);
      f.obj.position.y += Math.sin(PI * q) * f.arc;
      f.obj.rotation.y += dt * 8;
      if (f.pop) f.obj.scale.setScalar(q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3);
      if (q >= 1) { scene.remove(f.obj); flyers.splice(k, 1); }
    }
  }
  const coinGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.025, 18);
  const coinM = mat('#ffcf3f', { metalness: 0.7, roughness: 0.3 });
  const billM = mat('#6fbf73');
  function coin(at) {
    const c = new THREE.Mesh(coinGeo, coinM); c.rotation.x = PI / 2;
    const g = new THREE.Group(); g.add(c);
    launch(g, at, at.clone().add(V3(0, 0.9, 0)), { dur: 0.8, arc: 0, pop: true });
  }

  function poke(s, stage, i, before) {
    const st = stations[stage]?.[i];
    if (!st) return;
    st.bounce = 1;
    const ry = st.group.rotation.y;
    const front = st.group.position.clone().add(V3(Math.sin(ry), 0, Math.cos(ry)).multiplyScalar(0.8));
    baker.target.copy(front); baker.face = ry + PI;
    bakerJob = true; bakerIdle = 0;
    if (before?.item && before.done) {
      const r = G.recipeOf(before.item);
      if (r.stages.at(-1) !== stage) return;
      const from = st.anchorW.clone().add(V3(0, -0.5, 0));
      if (before.item === 'velvet') {
        for (let k = 0; k < 3; k++) launch(rbox(0.1, 0.13, 0.04, mat('#c79bff', { roughness: 0.3 }), 0, 0, 0, 0.02), from, V3(-6.0, 0.95, -1.2), { delay: k * 0.09 });
      } else {
        const idx = Math.min(5, Math.max(0, s.recipes.indexOf(before.item)));
        for (let k = 0; k < 3; k++) launch(itemModel(before.item), from, V3(trays[idx].x, 1.08, 0.95), { delay: k * 0.09 });
      }
    }
  }
  function sold(id) {
    const e = buyers.get(id);
    if (!e) return;
    e.agent.p.bag.visible = true;
    e.agent.p.bagM.color.set('#c79bff');
    const at = e.agent.group.position.clone().setY(1.2);
    for (let k = 0; k < 3; k++) launch(rbox(0.22, 0.02, 0.12, billM, 0, 0, 0, 0.005), at, at.clone().add(V3(0, 0.8, 0)), { delay: k * 0.1, dur: 0.7, arc: 0, pop: true });
  }

  function syncPeople(s, dt, now) {
    const sh = s.shift;
    // The baker follows the camera between rooms, works at each tapped station, then wanders home.
    if (view.zone !== bakerZone) {
      bakerZone = view.zone;
      baker.group.position.copy(BAKER_HOME[bakerZone]); baker.target.copy(BAKER_HOME[bakerZone]); bakerJob = null;
    }
    const bakerThere = baker.update(dt);
    if (bakerJob && bakerThere) { baker.work = 0.6; bakerJob = null; bakerIdle = 0; }
    else if (!bakerJob && bakerThere) {
      bakerIdle += dt;
      if (bakerIdle > 6 && baker.target.distanceTo(BAKER_HOME[bakerZone]) > 0.05) { baker.target.copy(BAKER_HOME[bakerZone]); baker.face = PI / 4; }
    }

    // Day customers: in through the doorway, queue at the tray they want, out again.
    const live = new Set();
    if (sh?.kind === 'day') {
      const lines = new Map();
      for (const c of [...sh.customers].sort((a, b) => a.t0 - b.t0)) {
        if (c.res && sh.t - c.t0 > CFG.walkIn + CFG.browse) continue;
        const idx = Math.min(5, Math.max(0, s.recipes.indexOf(c.want)));
        if (!lines.has(idx)) lines.set(idx, []);
        lines.get(idx).push(c.id);
      }
      for (const c of sh.customers) {
        live.add(c.id);
        let e = customers.get(c.id);
        if (!e) { e = { agent: new Agent(scene, c.look, 'customer', OUTSIDE.clone()), shown: false, inside: false, leaving: false }; customers.set(c.id, e); }
        if (c.res && sh.t - c.t0 > CFG.walkIn + CFG.browse) e.leaving = true;
        if (!e.leaving) {
          if (!e.inside) { e.agent.target.copy(GAP); e.agent.face = null; if (e.agent.group.position.distanceTo(GAP) < 0.15) e.inside = true; }
          else {
            const idx = Math.min(5, Math.max(0, s.recipes.indexOf(c.want)));
            const k = lines.get(idx)?.indexOf(c.id) ?? 0;
            e.agent.target.set(trays[idx].x + (k % 2 ? 0.16 : -0.16) * (k > 0 ? 1 : 0), 0, 1.95 + k * 0.6);
            e.agent.face = PI;
          }
        }
        if (c.res && !e.shown) {
          e.shown = true;
          e.agent.p.bag.visible = c.res.kind === 'good';
          if (c.res.kind === 'good') coin(TILL);
          const face = c.res.kind === 'good' ? '😊' : c.res.kind === 'bad' ? '😞' : '😒';
          reactions.push({ agent: e.agent, text: `${face} ${c.res.text}`, kind: c.res.kind, until: now + 2.2, id: 'r' + c.id });
        }
      }
    }
    for (const [id, e] of customers) {
      if (!live.has(id)) e.leaving = true;
      if (e.leaving) {
        e.agent.face = null;
        if (e.inside) { e.agent.target.copy(GAP); if (e.agent.group.position.distanceTo(GAP) < 0.15) e.inside = false; }
        else e.agent.target.copy(OUTSIDE);
      }
      const arrived = e.agent.update(dt);
      if (e.leaving && !e.inside && arrived) { scene.remove(e.agent.group); customers.delete(id); }
    }

    // Night buyers: in through the back door, wait, leave the same way.
    const liveB = new Set();
    if (sh?.kind === 'night') {
      sh.buyers.forEach((b, k) => {
        liveB.add(b.id);
        let e = buyers.get(b.id);
        if (!e) {
          e = { agent: new Agent(scene, b.look || { skin: b.id % 5, shirt: b.id % 5, hair: 0, pants: b.id % 5, h: 1 }, 'hood', DOOR_OUT.clone()), via: true };
          e.agent.group.userData = { act: 'buyer', id: b.id };
          pickables.push(e.agent.group);
          buyers.set(b.id, e);
        }
        const spot = BUYER_SPOTS[k % BUYER_SPOTS.length];
        if (e.via) { e.agent.target.copy(DOOR_IN); if (e.agent.group.position.distanceTo(DOOR_IN) < 0.1) e.via = false; }
        else e.agent.target.copy(spot);
        e.agent.face = PI / 2 + 0.3;
      });
    }
    for (const [id, e] of buyers) {
      if (!liveB.has(id) && !e.agent.leaving) {
        e.agent.leaving = true; e.agent.face = null; e.stage = 0;
        const i = pickables.indexOf(e.agent.group); if (i >= 0) pickables.splice(i, 1);
      }
      if (e.agent.leaving) {
        e.agent.target.copy(e.stage === 0 ? DOOR_IN : DOOR_OUT);
        if (e.agent.group.position.distanceTo(DOOR_IN) < 0.1) e.stage = 1;
      }
      const arrived = e.agent.update(dt);
      if (e.agent.leaving && e.stage === 1 && arrived) { scene.remove(e.agent.group); buyers.delete(id); }
    }
    let near = false;
    for (const e of buyers.values()) if (e.agent.group.position.distanceTo(DOOR_IN) < 1.6) near = true;
    const want = near ? -1.5 : 0;
    backDoorPivot.rotation.y += (want - backDoorPivot.rotation.y) * Math.min(1, dt * 6);
    updateFlyers(dt);
  }

  // ---------- Overlay bubbles (HTML positioned over the 3D scene) ----------
  const bubbleEls = new Map();
  const tmp = new THREE.Vector3();
  function toScreen(v) {
    tmp.copy(v).project(camera);
    return [(tmp.x + 1) / 2 * W, (1 - tmp.y) / 2 * H];
  }
  function slotBubble(st, slot) {
    const first = st.stage === 'mix' || st.stage === 'prep';
    const at = `data-act="slot" data-stage="${st.stage}" data-i="${st.i}"`;
    if (!slot.item) return first ? { html: `<b>＋</b>`, cls: 'bub add', at } : null;
    const r = G.recipeOf(slot.item);
    if (!slot.done) return { html: `<span>${r.emoji}</span><small>${Math.ceil(slot.dur - slot.t)}</small>`, cls: 'bub run', at, p: slot.t / slot.dur };
    const burnIn = Math.max(0, Math.ceil(CFG.burnAfter - slot.over));
    if (STAGES[st.stage].burns && burnIn <= 5) return { html: `<span>🔥</span><small>${burnIn}</small>`, cls: 'bub burn', at };
    return { html: `<span>${r.emoji}</span><b>✓</b>`, cls: 'bub done', at };
  }
  function updateOverlay(s, now) {
    const want = new Map();
    const sh = s.shift;
    if (sh) {
      for (const list of Object.values(stations)) for (const st of list) {
        if (st.kind !== sh.kind) continue;
        const slot = sh.slots[st.stage]?.[st.i];
        if (!slot) continue;
        const b = slotBubble(st, slot);
        if (b) want.set(`s-${st.stage}-${st.i}`, { ...b, pos: st.anchorW });
      }
      if (sh.kind === 'day') {
        for (const c of sh.customers) {
          const e = customers.get(c.id);
          if (!e || c.res || !e.inside) continue;
          want.set(`t-${c.id}`, { html: `${ITEMS[c.want].emoji}`, cls: 'bub think', at: '', pos: e.agent.group.position.clone().setY(e.agent.height + 0.25) });
        }
      }
      if (sh.kind === 'night') {
        for (const b of sh.buyers) {
          const e = buyers.get(b.id);
          if (!e || e.via) continue;
          const pct = Math.max(0, 100 - (sh.t - b.t0) / CFG.buyerPatience * 100);
          want.set(`b-${b.id}`, {
            html: `<span>${b.name} ×${b.want}${b.hint ? ' 📷' : ''}</span><i style="width:${pct.toFixed(0)}%"></i>`,
            cls: `bub buyer ${b.hint ? 'flag' : ''}`, at: `data-act="buyer" data-id="${b.id}"`,
            pos: e.agent.group.position.clone().setY(e.agent.height + 0.35),
          });
        }
      }
    }
    for (let k = reactions.length - 1; k >= 0; k--) {
      const r = reactions[k];
      if (now > r.until || !r.agent.group.parent) { reactions.splice(k, 1); continue; }
      want.set(r.id, { html: r.text, cls: `bub react ${r.kind}`, at: '', pos: r.agent.group.position.clone().setY(r.agent.height + 0.3) });
    }
    for (const [key, el] of bubbleEls) if (!want.has(key)) { el.remove(); bubbleEls.delete(key); }
    for (const [key, b] of want) {
      let el = bubbleEls.get(key);
      if (!el) { el = document.createElement('div'); overlayEl.appendChild(el); bubbleEls.set(key, el); el._sig = ''; }
      const sig = b.cls + '|' + b.at + '|' + b.html;
      if (el._sig !== sig) {
        el._sig = sig;
        el.className = b.cls;
        el.innerHTML = b.html;
        for (const a of [...el.attributes]) if (a.name.startsWith('data-')) el.removeAttribute(a.name);
        for (const m of b.at.matchAll(/(data-[\w-]+)="([^"]*)"/g)) el.setAttribute(m[1], m[2]);
      }
      if (b.p !== undefined) el.style.setProperty('--p', `${(b.p * 100).toFixed(1)}%`);
      const [x, y] = toScreen(b.pos);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  // ---------- Per-frame state sync ----------
  let traySig = '';
  function syncState(s, dt, now) {
    const sig = JSON.stringify([G.stationLayout(s, 'day'), G.stationLayout(s, 'night')]);
    if (sig !== stationSig) { stationSig = sig; rebuildStations(s); }
    const sh = s.shift;
    for (const list of Object.values(stations)) for (const st of list) {
      const slot = (sh && sh.kind === st.kind && sh.slots[st.stage]?.[st.i]) || { item: null };
      const fx = st.update(slot, dt, now);
      if (st.bounce > 0) {
        st.bounce = Math.max(0, st.bounce - dt * 3.5);
        const b = Math.sin(st.bounce * PI * 2) * st.bounce;
        st.group.scale.set(1 - b * 0.05, 1 + b * 0.09, 1 - b * 0.05);
      }
      if (fx && st.smokeW) {
        const key = st.stage + st.i;
        const acc = (emitAcc.get(key) || 0) + dt;
        const every = fx === 'smoke' ? 0.08 : 0.25;
        if (acc > every) { emit(st.smokeW, fx); emitAcc.set(key, 0); } else emitAcc.set(key, acc);
      }
    }
    // Display case
    const tsig = s.recipes.map(id => id + (s.display[id].fresh + s.display[id].stale)).join(',');
    if (tsig !== traySig) {
      traySig = tsig;
      trays.forEach((t, k) => {
        const id = s.recipes[k];
        const n = id ? Math.min(6, s.display[id].fresh + s.display[id].stale) : 0;
        const tsg = id + n;
        if (t.sig === tsg) return;
        t.sig = tsg;
        t.group.clear();
        for (let j = 0; j < n; j++) {
          const m = itemModel(id);
          m.position.set(((j % 3) - 1) * 0.21, 0, (Math.floor(j / 3) - 0.5) * 0.24);
          m.rotation.y = (j * 1.7) % PI;
          t.group.add(m);
        }
      });
    }
    // Back room props
    cash.forEach((c, k) => { c.visible = k < Math.min(12, Math.ceil(s.dirty / 150)); });
    kitsBoxes.forEach((b, k) => { b.visible = k < Math.min(8, s.kits); });
    bagPile.forEach((b, k) => { b.visible = k < Math.min(24, s.bags); });
    camGroup.visible = G.has(s, 'camera');
    camLed.color.set(Math.sin(now * 4) > 0 ? '#ff3a3a' : '#551111');
    catering.visible = G.has(s, 'catering');
    neonSign.visible = G.has(s, 'sign');
    woodSign.visible = !neonSign.visible;
    partition.visible = view.zone === 'shop';
  }

  // ---------- Camera, lighting, render ----------
  const SUN_MORNING = new THREE.Color('#ffd9a8'), SUN_NOON = new THREE.Color('#fff4e4'), SUN_LATE = new THREE.Color('#ffb46b');
  function applyLights(dt, now, frac) {
    const L = LIGHTS[view.light] || LIGHTS.day;
    const k = 1 - Math.exp(-dt * 3);
    for (const key of ['hemi', 'sun', 'lamp', 'bulb', 'neon', 'street', 'alley', 'lampI', 'winI', 'glow']) cur[key] += (L[key] - cur[key]) * k;
    cur.bgC.lerp(new THREE.Color(L.bg), k);
    cur.winC.lerp(new THREE.Color(L.win), k);
    cur.hemiCC.lerp(new THREE.Color(L.hemiC), k);
    cur.sunCC.lerp(new THREE.Color(L.sunC), k);
    hemi.intensity = cur.hemi; hemi.color.copy(cur.hemiCC);
    sun.intensity = cur.sun; sun.color.copy(cur.sunCC);
    if (view.light === 'day') {
      const c = frac < 0.5 ? SUN_MORNING.clone().lerp(SUN_NOON, frac * 2) : SUN_NOON.clone().lerp(SUN_LATE, (frac - 0.5) * 2);
      sun.color.lerp(c, 0.85);
    }
    const a = -0.9 + 1.8 * frac;
    const wantPos = V3(-3.5 + Math.sin(a) * 11, 16 - Math.abs(a) * 4, 9 - Math.abs(a) * 2);
    sun.position.lerp(wantPos, 1 - Math.exp(-dt * 2));
    shopLamp.intensity = cur.lamp; neon.intensity = cur.neon; street.intensity = cur.street; alley.intensity = cur.alley;
    bulb.intensity = cur.bulb * (view.light === 'night' && Math.sin(now * 23) > 0.97 ? 0.6 : 1); // the odd flicker
    for (const m of lampGlows) m.emissiveIntensity = cur.lampI;
    scene.background.copy(cur.bgC);
    for (const m of windows) { m.emissive.copy(cur.winC); m.emissiveIntensity = cur.winI; }
    for (const m of glowMats) m.emissiveIntensity = cur.glow;
  }

  function updateCamera(dt) {
    const z = ZONES[view.zone];
    cam.target.lerp(z.center, 1 - Math.exp(-dt * 3.5));
    const bh = Math.max(140, H - view.top - view.bottom);
    const yc = view.top + bh / 2;
    unit = Math.max(z.needW / W, z.needH / bh) / cam.zoom;
    const lim = 5 * (1 - 1 / cam.zoom) + 1;
    cam.panR = Math.max(-lim, Math.min(lim, cam.panR));
    cam.panU = Math.max(-lim * 0.7, Math.min(lim * 0.7, cam.panU));
    camera.left = -W * unit / 2; camera.right = W * unit / 2;
    camera.top = H * unit / 2; camera.bottom = -H * unit / 2;
    camera.updateProjectionMatrix();
    const look = cam.target.clone()
      .addScaledVector(RIGHT, cam.panR).addScaledVector(UPS, cam.panU)
      .addScaledVector(UPS, -(H / 2 - yc) * unit);
    camera.position.copy(look).addScaledVector(DIR, 60);
    camera.lookAt(look);
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- Input: tap to pick, drag to pan, pinch / wheel to zoom ----------
  const ptrs = new Map();
  let drag = null, pinch = null;
  const ray = new THREE.Raycaster();
  canvas.addEventListener('pointerdown', e => {
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not a live pointer (e.g. synthetic) */ }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, r: cam.panR, u: cam.panU, moved: false };
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.zoom };
      if (drag) drag.moved = true;
    }
  });
  canvas.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      cam.zoom = Math.max(1, Math.min(2.6, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
    } else if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 8) drag.moved = true;
      if (drag.moved) { cam.panR = drag.r - dx * unit; cam.panU = drag.u + dy * unit; }
    }
  });
  const end = e => {
    const wasTap = drag && !drag.moved && ptrs.size === 1;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (wasTap && e.type === 'pointerup') pick(e.clientX, e.clientY);
    if (ptrs.size === 0) drag = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', e => { e.preventDefault(); cam.zoom = Math.max(1, Math.min(2.6, cam.zoom * Math.exp(-e.deltaY * 0.0015))); }, { passive: false });

  function pick(x, y) {
    ray.setFromCamera(new THREE.Vector2(x / W * 2 - 1, -(y / H) * 2 + 1), camera);
    const hits = ray.intersectObjects(pickables, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData?.act) o = o.parent;
      if (o) { onPick({ ...o.userData }); return; }
    }
  }

  let last = performance.now() / 1000, simClock = 0;
  return {
    setView(v) {
      if (v.zone && v.zone !== view.zone) { cam.panR = 0; cam.panU = 0; cam.zoom = 1; }
      Object.assign(view, v);
    },
    frame(s, fixedDt) {
      // fixedDt lets tests advance the scene clock without waiting in real time
      if (fixedDt) simClock += fixedDt;
      const now = performance.now() / 1000 + simClock;
      const dt = fixedDt || Math.min(0.1, now - last);
      last = now;
      syncState(s, dt, now);
      syncPeople(s, dt, now);
      for (const p of parts) {
        if (!p.mesh.visible) continue;
        p.life += dt;
        if (p.life > p.max) { p.mesh.visible = false; continue; }
        p.mesh.position.addScaledVector(p.vel, dt);
        const f = p.life / p.max;
        p.mesh.scale.setScalar(0.6 + f * 1.6);
        p.mesh.material.opacity = 0.55 * (1 - f);
      }
      const frac = s.shift?.kind === 'day' ? s.shift.t / s.shift.len : s.phase === 'evening' ? 1 : s.phase === 'plan' || s.phase === 'report' ? 0.08 : 0.5;
      applyLights(dt, now, frac);
      updateCamera(dt);
      renderer.render(scene, camera);
      updateOverlay(s, now);
    },
    poke, sold,
    debug: { scene, camera, cam, view },
  };
}
