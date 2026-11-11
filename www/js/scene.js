// The 3D bakery (day) and back room (night). Everything is built from simple shapes in code.
// The scene only reads game state; taps on stations and people are reported back through onPick.
import * as THREE from 'three';
import { CFG, ITEMS, MACHINES, LAB_MACHINES, SPOTS, LAB_SPOTS, PRODUCTS, BASEMENT_X } from './data.js';
import * as G from './game.js';
import { V3, PI, geo, mat, smat, mesh, box, rbox, cyl, sphere, canvasTex, mergeStatic, texturize, tmat, worldUV, surfaceTiled } from './three-helpers.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { buildWorld } from './world.js';
import { foodModel } from './food.js';
import * as D from './design.js';

const PAL = {
  skin: ['#f5d0b0', '#e0ac85', '#c68a5e', '#9a6440', '#6b4428'],
  shirt: ['#e85d75', '#4f9de8', '#5fcf8a', '#f0b44c', '#9b6bff', '#ff8a5c', '#3cc6c6', '#f2f2f2', '#454b63', '#d4508f'],
  hair: ['#2b1d14', '#5a3a22', '#a8743a', '#e3c27a', '#8a8a8a', '#c0462f'],
  pants: ['#2f3b5c', '#3d3d3d', '#6b5a45', '#24344a', '#5c2f3b'],
  hoodie: ['#2a2a33', '#1f2b2a', '#3a2433', '#33302a', '#22263a'],
};
const DOUGH = { sourdough: '#e8d3a9', croissant: '#f1d49a', cookies: '#c98a4b', donuts: '#efd2a0', tart: '#e6c08a', bun: '#d9b07a', velvet: '#b58cff', baguette: '#ead7a8', muffin: '#e8c48e', caramel: '#f2d27a', cheesecake: '#f6e7c4', honeyroll: '#e3b77a', layercake: '#f6e7c4', gold: '#ffd447' };

// ---------- Baked goods for the display case ----------

function itemModel(id) { const g = itemModel0(id); g.userData.noTex = true; return g; }
function itemModel0(id) {
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
  } else if (id === 'baguette') {
    const b = mesh(geo('bag', () => new THREE.CapsuleGeometry(0.045, 0.2, 4, 8)), mat('#c98a4b'), 0, 0.05, 0);
    b.rotation.z = PI / 2; b.rotation.y = 0.4; g.add(b);
  } else if (id === 'muffin') {
    g.add(cyl(0.06, 0.05, 0.07, '#e85d75', 0, 0, 0, 12));
    const top = sphere(0.075, '#c98a4b', 0, 0.08, 0); top.scale.y = 0.7; g.add(top);
    g.add(sphere(0.018, '#7a2a4a', 0.02, 0.125, 0.01));
  } else if (id === 'caramel') {
    g.add(cyl(0.08, 0.09, 0.07, '#f2d27a', 0, 0, 0, 14));
    g.add(cyl(0.075, 0.08, 0.015, '#8a4a1a', 0, 0.07, 0, 14));
  } else if (id === 'cheesecake') {
    const sl = mesh(geo('slice', () => new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10, 1, false, 0, PI / 3)), mat('#f6e7c4'), 0, 0.04, 0); g.add(sl);
    const top = mesh(geo('slicetop', () => new THREE.CylinderGeometry(0.12, 0.12, 0.018, 10, 1, false, 0, PI / 3)), mat('#c8323c'), 0, 0.088, 0); g.add(top);
  } else if (id === 'honeyroll') {
    const b = mesh(geo('roll', () => new THREE.TorusGeometry(0.065, 0.045, 8, 16)), mat('#d99a4a'));
    b.rotation.x = -PI / 2; b.position.y = 0.045; g.add(b);
    g.add(sphere(0.05, '#f0b44c', 0, 0.06, 0));
    for (const [x, z] of [[0.04, 0.02], [-0.03, 0.04], [0.0, -0.05]]) g.add(sphere(0.015, '#7a5534', x, 0.1, z));
  } else if (id === 'pancakes') {
    for (let k = 0; k < 3; k++) g.add(cyl(0.1, 0.1, 0.025, '#e0a44a', 0, k * 0.026, 0, 14));
    g.add(cyl(0.05, 0.05, 0.012, '#fff3c4', 0, 0.078, 0, 10));
  } else if (id === 'waffles') {
    const w = box(0.18, 0.03, 0.18, '#e0a44a', 0, 0, 0); g.add(w);
    for (const o of [-0.045, 0.045]) { g.add(box(0.17, 0.01, 0.015, '#b8803a', 0, 0.03, o)); g.add(box(0.015, 0.01, 0.17, '#b8803a', o, 0.03, 0)); }
  } else if (id === 'mousse') {
    g.add(cyl(0.07, 0.06, 0.1, smat({ color: '#e8f4ff', transparent: true, opacity: 0.6, roughness: 0.2 }), 0, 0, 0, 12, false));
    g.add(cyl(0.062, 0.055, 0.08, '#5a3320', 0, 0.005, 0, 12));
    g.add(sphere(0.03, '#fff4e0', 0, 0.1, 0));
  } else if (id === 'dumplings') {
    for (const [x, z] of [[-0.05, 0], [0.05, 0.02]]) { const d = sphere(0.06, '#f4e6c8', x, 0.04, z); d.scale.set(1.2, 0.7, 0.9); g.add(d); }
  } else if (id === 'tempura') {
    for (const [x, r] of [[-0.04, 0.3], [0.05, -0.2]]) { const t = mesh(geo('tem', () => new THREE.CapsuleGeometry(0.03, 0.12, 4, 8)), mat('#f0c060'), x, 0.04, 0); t.rotation.z = PI / 2; t.rotation.y = r; g.add(t); }
  } else if (['coffee', 'tea', 'juice', 'bubbletea'].includes(id)) {
    const top = { coffee: '#c9a27a', tea: '#c98a2a', juice: '#ff9a3c', bubbletea: '#d9b38c' }[id];
    const clear = id === 'juice' || id === 'bubbletea';
    g.add(cyl(0.055, 0.045, 0.13, clear ? smat({ color: '#e8f4ff', transparent: true, opacity: 0.5, roughness: 0.2 }) : mat('#ffffff'), 0, 0, 0, 12, false));
    g.add(cyl(0.05, 0.05, 0.01, top, 0, 0.12, 0, 12, false));
    if (clear) g.add(cyl(0.045, 0.04, 0.1, top, 0, 0.01, 0, 12));
    if (id === 'bubbletea') { for (let k = 0; k < 4; k++) g.add(sphere(0.012, '#2b1d14', -0.02 + (k % 2) * 0.03, 0.02, -0.02 + Math.floor(k / 2) * 0.03, false)); g.add(cyl(0.008, 0.008, 0.2, '#ff7eb6', 0.02, 0.05, 0, 6, false)); }
    if (id === 'coffee') g.add(cyl(0.058, 0.058, 0.035, '#a8703f', 0, 0.05, 0, 12, false));
  } else if (['softserve', 'sundae', 'shavedice'].includes(id)) {
    if (id === 'softserve') {
      const c = mesh(geo('cone2', () => new THREE.ConeGeometry(0.045, 0.12, 10)), mat('#d9a066'), 0, 0.06, 0); c.rotation.x = PI; g.add(c);
      g.add(sphere(0.05, '#fff4e0', 0, 0.14, 0)); g.add(sphere(0.035, '#fff4e0', 0, 0.19, 0));
    } else {
      g.add(cyl(0.07, 0.04, 0.07, smat({ color: '#e8f4ff', transparent: true, opacity: 0.6, roughness: 0.2 }), 0, 0, 0, 12, false));
      const col = id === 'sundae' ? '#ff9fb2' : '#9fe1ff';
      g.add(sphere(0.06, col, 0, 0.1, 0)); g.add(sphere(0.022, '#e2394b', 0, 0.16, 0));
    }
  } else if (id === 'toastie') {
    for (const [y, c] of [[0, '#e0a44a'], [0.035, '#ffd447'], [0.045, '#e0a44a']]) g.add(box(0.16, y === 0.035 ? 0.012 : 0.03, 0.14, c, 0, y, 0));
  } else if (id === 'hotdog') {
    const bun = mesh(geo('hdbun', () => new THREE.CapsuleGeometry(0.04, 0.14, 4, 8)), mat('#e0a44a'), 0, 0.04, 0); bun.rotation.z = PI / 2; g.add(bun);
    const sausage = mesh(geo('saus', () => new THREE.CapsuleGeometry(0.022, 0.17, 4, 8)), mat('#a8423a'), 0, 0.07, 0); sausage.rotation.z = PI / 2; g.add(sausage);
  } else if (id === 'bagel') {
    const b = mesh(geo('bagel', () => new THREE.TorusGeometry(0.06, 0.035, 8, 16)), mat('#c98a4b'));
    b.rotation.x = -PI / 2; b.position.y = 0.035; g.add(b);
  } else if (id === 'layercake' || id === 'weddingcake') {
    g.add(cyl(0.11, 0.11, 0.06, '#f6e7c4', 0, 0, 0, 16)); g.add(cyl(0.112, 0.112, 0.015, '#ff9fb2', 0, 0.06, 0, 16));
    g.add(cyl(0.11, 0.11, 0.05, '#f6e7c4', 0, 0.075, 0, 16)); g.add(cyl(0.115, 0.115, 0.02, '#ffffff', 0, 0.125, 0, 16));
    g.add(sphere(0.025, '#e2394b', 0, 0.16, 0));
  }
  if (!g.children.length) { const f = foodModel(id); if (f) return f; }
  if (!g.children.length) {
    // Anything else: a simple shape for its kind of food, in a colour of its own
    let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const c = new THREE.Color().setHSL((h % 360) / 360, 0.55, 0.6).getStyle();
    const grp = ITEMS[id]?.group;
    if (grp === 'drink') { g.add(cyl(0.05, 0.042, 0.13, mat('#ffffff'), 0, 0, 0, 12, false)); g.add(cyl(0.046, 0.046, 0.012, c, 0, 0.12, 0, 12, false)); }
    else if (grp === 'cold') { g.add(cyl(0.065, 0.04, 0.07, mat('#f4f0e8'), 0, 0, 0, 12, false)); g.add(sphere(0.06, c, 0, 0.1, 0)); }
    else if (grp === 'savory') { g.add(cyl(0.12, 0.12, 0.015, '#f4f0e8', 0, 0, 0, 16, false)); const b = sphere(0.07, c, 0, 0.05, 0); b.scale.set(1.4, 0.6, 1); g.add(b); }
    else if (grp === 'bread') { const b = sphere(0.1, c, 0, 0.06, 0); b.scale.set(1.4, 0.65, 0.9); g.add(b); }
    else { g.add(cyl(0.09, 0.1, 0.07, c, 0, 0, 0, 16)); g.add(sphere(0.03, '#ffffff', 0, 0.09, 0)); }
  }
  return g;
}

// ---------- Stations ----------
// Each builder returns { group, anchor (local), update(slot, dt, now) }. Front of every model faces +z.

function emissiveMat(color, emissive) {
  return smat({ color, emissive, emissiveIntensity: 0, roughness: 0.35 });
}

function buildOven(tint) {
  const g = new THREE.Group();
  const steel = mat(tint || '#c7cad1', { metalness: 0.45, roughness: 0.4 });
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
        const burning = slot.spoilIn <= 120;
        col = burning ? '#ff2a2a' : '#ffa040';
        i = burning ? 1.2 + Math.sin(now * 14) * 0.8 : 1.3 + Math.sin(now * 5) * 0.3;
        l = 1;
      }
      doorMat.emissive.set(col); doorMat.emissiveIntensity = Math.max(0, i);
      lamp.emissiveIntensity = l * 2;
      return slot.item && slot.done ? (slot.spoilIn <= 120 ? 'smoke' : 'steam') : null;
    },
  };
}

function buildMixer(tint) {
  const g = new THREE.Group();
  g.add(box(1.0, 0.9, 0.8, tint || '#a8714a', 0, 0, 0));
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
  const cover = smat({ color: '#fff6e8', transparent: true, opacity: 0.25, roughness: 0.9 });
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
  const liquid = smat({ color: '#5a3a8a', emissive: '#b58cff', emissiveIntensity: 0, roughness: 0.2 });
  g.add(cyl(0.2, 0.2, 0.02, liquid, 0, 1.27, 0.02, 18, false));
  return {
    group: g, anchor: V3(0, 1.85, 0), smoke: V3(0, 1.4, 0.02),
    update(slot, dt, now) {
      flame.visible = !!slot.item;
      flame.scale.y = 1 + Math.sin(now * 20) * 0.15;
      let i = 0;
      if (slot.item && !slot.done) i = 0.3 + 1.2 * slot.t / slot.dur;
      if (slot.item && slot.done) {
        const burning = slot.spoilIn <= 120;
        liquid.emissive.set(burning ? '#ff3a3a' : '#c79bff');
        i = 1.6 + Math.sin(now * (burning ? 14 : 5)) * 0.5;
      } else liquid.emissive.set('#b58cff');
      liquid.emissiveIntensity = i;
      return slot.item && slot.done ? (slot.spoilIn <= 120 ? 'smoke' : 'vapour') : null;
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

// ---- New machines: fryer, drinks machine, ice cream machine, sandwich grill ----
const steelM = () => mat('#c7cad1', { metalness: 0.45, roughness: 0.4 });
function counterBase(g, top = '#efe6d8', body = '#a8714a') {
  g.add(box(1.0, 0.9, 0.8, body, 0, 0, 0));
  g.add(box(1.04, 0.06, 0.84, top, 0, 0.9, 0));
}
function buildFryer() {
  const g = new THREE.Group();
  g.add(box(1.0, 0.95, 0.8, steelM(), 0, 0, 0));
  g.add(box(1.02, 0.05, 0.82, '#3b3e45', 0, 0.95, 0));
  g.add(box(0.74, 0.03, 0.54, '#1d1e22', 0, 0.97, 0.02, false));
  const oil = smat({ color: '#a8781e', emissive: '#ffb347', emissiveIntensity: 0, roughness: 0.2 });
  g.add(box(0.66, 0.02, 0.46, oil, 0, 0.99, 0.02, false));
  const basket = new THREE.Group();
  basket.add(box(0.5, 0.12, 0.34, mat('#d9dce2', { metalness: 0.6, roughness: 0.3 }), 0, 0, 0));
  basket.add(box(0.04, 0.04, 0.4, '#2b2d36', 0, 0.1, 0.32));
  basket.position.set(0, 1.08, 0.02); g.add(basket);
  for (const x of [-0.3, 0, 0.3]) { const k = cyl(0.035, 0.035, 0.04, '#e8e8e8', x, 0.75, 0.41, 10); k.rotation.x = PI / 2; g.add(k); }
  return {
    group: g, anchor: V3(0, 1.8, 0.1), smoke: V3(0, 1.15, 0),
    update(slot, dt, now) {
      const cooking = slot.item && !slot.done;
      basket.position.y += ((cooking ? 0.93 : 1.08) - basket.position.y) * Math.min(1, dt * 6);
      oil.emissiveIntensity = slot.item ? (slot.done ? 0.9 + Math.sin(now * 8) * 0.3 : 0.4 + Math.sin(now * 20) * 0.15) : 0.05;
      return slot.item && slot.done ? (slot.spoilIn <= 120 ? 'smoke' : 'steam') : null;
    },
  };
}
function buildDrinks(tint) {
  const g = new THREE.Group();
  counterBase(g, '#efe6d8', tint || '#5a6475');
  g.add(box(0.72, 0.62, 0.42, '#2f3a4a', 0, 0.96, -0.12));
  g.add(box(0.74, 0.08, 0.44, '#c7cad1', 0, 1.58, -0.12));
  const screen = smat({ color: '#0a1a2a', emissive: '#7fd3ff', emissiveIntensity: 0.4 });
  g.add(box(0.26, 0.14, 0.02, screen, 0.15, 1.36, 0.1, false));
  for (const x of [-0.16, 0.0]) g.add(cyl(0.03, 0.03, 0.12, '#c7cad1', x, 1.12, 0.12, 8));
  g.add(box(0.5, 0.02, 0.22, '#3b3e45', -0.08, 0.96, 0.18, false));
  const cupM = smat({ color: '#ffffff' });
  const cup = cyl(0.06, 0.05, 0.12, cupM, -0.08, 0.97, 0.18, 12);
  const drinkM = smat({ color: '#6b3a1a' });
  const drink = cyl(0.055, 0.055, 0.01, drinkM, -0.08, 1.08, 0.18, 12, false);
  g.add(cup, drink);
  const COL = { coffee: '#6b3a1a', tea: '#c98a2a', juice: '#ff9a3c', bubbletea: '#d9b38c' };
  return {
    group: g, anchor: V3(0, 2.0, 0), smoke: V3(-0.08, 1.15, 0.18),
    update(slot, dt, now) {
      cup.visible = drink.visible = !!slot.item;
      if (slot.item) {
        drinkM.color.set(COL[slot.item] || '#6b3a1a');
        const f = slot.done ? 1 : slot.t / slot.dur;
        drink.position.y = 0.98 + 0.1 * f;
      }
      screen.emissiveIntensity = slot.item ? 1.2 + Math.sin(now * 6) * 0.3 : 0.4;
      return slot.item && slot.done ? 'steam' : null;
    },
  };
}
function buildIcecream(tint) {
  const g = new THREE.Group();
  counterBase(g, '#ffffff', tint || '#ffd6de');
  g.add(box(0.7, 0.55, 0.45, '#fff4f6', 0, 0.96, -0.12));
  g.add(box(0.72, 0.08, 0.47, '#ff9fb2', 0, 1.51, -0.12));
  const panel = smat({ color: '#d9f3ff', emissive: '#9fe1ff', emissiveIntensity: 0.2 });
  g.add(box(0.5, 0.3, 0.02, panel, 0, 1.08, 0.11, false));
  const nozzle = mesh(geo('nozzle', () => new THREE.ConeGeometry(0.06, 0.12, 10)), mat('#c7cad1', { metalness: 0.5, roughness: 0.3 }), 0, 1.16, 0.2);
  nozzle.rotation.x = PI; g.add(nozzle);
  const cone = mesh(geo('cone', () => new THREE.ConeGeometry(0.06, 0.16, 10)), mat('#d9a066'), 0, 1.0, 0.2); cone.rotation.x = PI;
  const scoopM = smat({ color: '#fff4e0' });
  const scoop = sphere(0.07, scoopM, 0, 1.1, 0.2);
  g.add(cone, scoop);
  const COL = { softserve: '#fff4e0', sundae: '#ff9fb2', shavedice: '#9fe1ff' };
  return {
    group: g, anchor: V3(0, 1.95, 0), smoke: V3(0, 1.2, 0.2),
    update(slot, dt, now) {
      cone.visible = scoop.visible = !!slot.item;
      if (slot.item) {
        scoopM.color.set(COL[slot.item] || '#fff4e0');
        const f = slot.done ? 1 : slot.t / slot.dur;
        scoop.scale.setScalar(0.4 + 0.6 * f);
      }
      panel.emissiveIntensity = slot.item && !slot.done ? 0.9 + Math.sin(now * 4) * 0.3 : 0.2;
      return slot.item && slot.done ? 'vapour' : null;
    },
  };
}
function buildGrill(tint) {
  const g = new THREE.Group();
  counterBase(g, '#efe6d8', tint || '#6a5a48');
  g.add(box(0.7, 0.08, 0.5, '#2b2d36', 0, 0.96, 0));
  const plateM = smat({ color: '#3b3e45', emissive: '#ff5a1a', emissiveIntensity: 0, roughness: 0.4 });
  g.add(box(0.62, 0.02, 0.42, plateM, 0, 1.04, 0, false));
  const lid = new THREE.Group(); lid.position.set(0, 1.06, -0.22);
  lid.add(box(0.66, 0.07, 0.46, '#2b2d36', 0, 0, 0.23));
  lid.add(box(0.5, 0.04, 0.04, '#c7cad1', 0, 0.08, 0.46));
  g.add(lid);
  const food = box(0.4, 0.04, 0.24, '#d9a066', 0, 1.05, 0, false); g.add(food);
  return {
    group: g, anchor: V3(0, 1.85, 0), smoke: V3(0, 1.2, 0),
    update(slot, dt, now) {
      const cooking = slot.item && !slot.done;
      lid.rotation.x += ((cooking ? 0 : -1.0) - lid.rotation.x) * Math.min(1, dt * 6);
      food.visible = !!slot.item;
      plateM.emissiveIntensity = slot.item ? (slot.done ? 0.6 + Math.sin(now * 8) * 0.3 : 0.5) : 0;
      return slot.item && slot.done ? (slot.spoilIn <= 120 ? 'smoke' : 'steam') : null;
    },
  };
}

// A dome oven on a stand: pizza oven, smoker, rotisserie
function buildPizza(tint) {
  const g = new THREE.Group();
  g.add(box(1.05, 0.7, 0.85, '#8a5235', 0, 0, 0));
  g.add(box(1.08, 0.05, 0.88, '#5c3520', 0, 0.7, 0));
  const dome = mesh(geo('dome', () => new THREE.SphereGeometry(0.5, 18, 10, 0, PI * 2, 0, PI / 2)), mat(tint || '#b0604c'), 0, 0.75, 0);
  dome.scale.set(1, 0.85, 0.82); g.add(dome);
  const mouthM = emissiveMat('#1a0d08', '#ff7a1a');
  const mouth = mesh(geo('mouth', () => new THREE.CircleGeometry(0.2, 16, 0, PI)), mouthM, 0, 0.76, 0.42, false); g.add(mouth);
  g.add(cyl(0.06, 0.07, 0.5, '#4a4d54', 0.22, 1.05, -0.12, 8));
  return {
    group: g, anchor: V3(0, 1.85, 0.1), smoke: V3(0.22, 1.6, -0.12),
    update(slot, dt, now) {
      let i = 0.15;
      if (slot.item && !slot.done) i = 0.8 + Math.sin(now * 7) * 0.2;
      else if (slot.item && slot.done) i = slot.spoilIn <= 120 ? 1.4 + Math.sin(now * 14) * 0.8 : 1.2;
      mouthM.emissive.set(slot.item && slot.done && slot.spoilIn <= 120 ? '#ff2a2a' : '#ff7a1a'); mouthM.emissiveIntensity = i;
      return slot.item ? (slot.done && slot.spoilIn <= 120 ? 'smoke' : 'steam') : null;
    },
  };
}
// Stacked baskets on a counter: dim sum steamer, noodle bar, sushi counter
function buildSteamer(tint) {
  const g = new THREE.Group();
  counterBase(g, '#efe6d8', tint || '#a8714a');
  const baskets = [];
  for (let k = 0; k < 3; k++) { const b = cyl(0.27, 0.27, 0.12, '#d9b07a', -0.15, 0.96 + k * 0.13, 0.02, 16); g.add(b); baskets.push(b); }
  const lid = mesh(geo('blid', () => new THREE.ConeGeometry(0.29, 0.12, 16)), mat('#c49a62'), -0.15, 1.42, 0.02); g.add(lid);
  g.add(cyl(0.13, 0.13, 0.18, mat('#9aa0aa', { metalness: 0.5, roughness: 0.35 }), 0.3, 0.96, 0.05, 14));
  return {
    group: g, anchor: V3(0, 1.85, 0), smoke: V3(-0.15, 1.5, 0.02),
    update(slot, dt, now) {
      lid.position.y = 1.42 + (slot.item && !slot.done ? Math.abs(Math.sin(now * 6)) * 0.02 : 0);
      return slot.item ? (slot.done && slot.spoilIn <= 120 ? 'smoke' : 'steam') : null;
    },
  };
}
// Back room: a press, a kiln and a chamber (all made up)
function buildPress(tint) {
  const g = new THREE.Group();
  g.add(box(1.0, 0.85, 0.8, tint || '#4a4d54', 0, 0, 0));
  for (const x of [-0.38, 0.38]) g.add(box(0.08, 0.9, 0.08, '#2b2d36', x, 0.85, 0));
  g.add(box(0.9, 0.1, 0.4, '#2b2d36', 0, 1.72, 0));
  const plateM = emissiveMat('#3a2a55', '#b58cff');
  const plate = box(0.6, 0.08, 0.36, plateM, 0, 1.2, 0); g.add(plate);
  g.add(box(0.6, 0.04, 0.36, '#8d939c', 0, 0.86, 0));
  return {
    group: g, anchor: V3(0, 2.1, 0), smoke: V3(0, 1.0, 0.2),
    update(slot, dt, now) {
      const y = slot.item && !slot.done ? 0.92 + Math.abs(Math.sin(now * 2)) * 0.25 : 1.2;
      plate.position.y += (y - plate.position.y) * Math.min(1, dt * 6);
      plateM.emissiveIntensity = slot.item ? (slot.done ? 1.4 + Math.sin(now * 5) * 0.4 : 0.6) : 0;
      return slot.item && slot.done ? 'vapour' : null;
    },
  };
}
function buildKiln() {
  const g = new THREE.Group();
  g.add(box(1.05, 0.5, 0.85, '#3d424a', 0, 0, 0));
  const dome = mesh(geo('kdome', () => new THREE.SphereGeometry(0.52, 16, 10, 0, PI * 2, 0, PI / 2)), mat('#5b4a6a'), 0, 0.5, 0);
  dome.scale.set(1, 1.1, 0.85); g.add(dome);
  const mouthM = emissiveMat('#1a0d20', '#c07bff');
  g.add(mesh(geo('kmouth', () => new THREE.CircleGeometry(0.2, 16, 0, PI)), mouthM, 0, 0.52, 0.44, false));
  return {
    group: g, anchor: V3(0, 1.8, 0.1), smoke: V3(0, 1.2, 0),
    update(slot, dt, now) {
      mouthM.emissiveIntensity = slot.item ? (slot.done ? 1.6 + Math.sin(now * 5) * 0.4 : 0.8 + Math.sin(now * 3) * 0.3) : 0.1;
      return slot.item && slot.done ? 'vapour' : null;
    },
  };
}
function buildChamber() {
  const g = new THREE.Group();
  g.add(cyl(0.42, 0.46, 0.25, '#2b2d36', 0, 0, 0, 20));
  const glassM = smat({ color: '#cfa8ff', transparent: true, opacity: 0.35, roughness: 0.1 });
  g.add(cyl(0.36, 0.36, 1.1, glassM, 0, 0.25, 0, 20, false));
  const coreM = emissiveMat('#2a1840', '#b58cff');
  const core = sphere(0.18, coreM, 0, 0.8, 0, false); g.add(core);
  g.add(cyl(0.4, 0.4, 0.12, '#2b2d36', 0, 1.35, 0, 20));
  return {
    group: g, anchor: V3(0, 1.95, 0), smoke: V3(0, 1.5, 0),
    update(slot, dt, now) {
      const on = !!slot.item;
      coreM.emissiveIntensity = on ? 1 + Math.sin(now * (slot.done ? 6 : 2)) * 0.6 : 0.05;
      core.scale.setScalar(on ? 0.6 + 0.4 * (slot.done ? 1 : slot.t / slot.dur) : 0.4);
      core.rotation.y += dt * 2;
      return slot.item && slot.done ? 'vapour' : null;
    },
  };
}
// A grow tent: a frame, reflective walls, plants that grow as the timer runs, and a grow light
function buildTent() {
  const g = new THREE.Group();
  const frameM = mat('#2b2d36');
  for (const [x, z] of [[-0.45, -0.38], [0.45, -0.38], [-0.45, 0.38], [0.45, 0.38]]) g.add(box(0.04, 1.6, 0.04, frameM, x, 0, z));
  g.add(box(0.94, 0.04, 0.8, frameM, 0, 1.6, 0));
  const wallM = smat({ color: '#d9dde3', metalness: 0.5, roughness: 0.35, transparent: true, opacity: 0.55 });
  g.add(box(0.9, 1.55, 0.02, wallM, 0, 0.02, -0.38, false));
  g.add(box(0.02, 1.55, 0.76, wallM, -0.45, 0.02, 0, false)); g.add(box(0.02, 1.55, 0.76, wallM, 0.45, 0.02, 0, false));
  const lightM = emissiveMat('#f5e9ff', '#ff9cf2');
  g.add(box(0.6, 0.05, 0.3, lightM, 0, 1.5, 0));
  const plants = [];
  for (const [x, z] of [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.18], [0.2, 0.18]]) {
    g.add(cyl(0.11, 0.09, 0.16, '#3a2a1a', x, 0, z, 10));
    const leaf = mesh(geo('leafcone', () => new THREE.ConeGeometry(0.16, 0.5, 7)), mat('#3f8a3a'), x, 0.42, z);
    g.add(leaf); plants.push(leaf);
  }
  return {
    group: g, anchor: V3(0, 2.05, 0), smoke: V3(0, 1.3, 0),
    update(slot, dt, now) {
      const f = slot.item ? (slot.done ? 1 : 0.2 + 0.8 * slot.t / slot.dur) : 0.15;
      for (const l of plants) { l.scale.set(f, f, f); l.position.y = 0.16 + 0.25 * f; }
      lightM.emissiveIntensity = slot.item ? 1.4 : 0.1;
      return slot.item && slot.done ? 'vapour' : null;
    },
  };
}
// A drying rack: shelves of trays that fill up as the batch dries
function buildDryRack() {
  const g = new THREE.Group();
  const woodM = mat('#7d6448');
  for (const [x, z] of [[-0.45, -0.3], [0.45, -0.3], [-0.45, 0.3], [0.45, 0.3]]) g.add(box(0.05, 1.5, 0.05, woodM, x, 0, z));
  const trays = [];
  for (let k = 0; k < 4; k++) {
    g.add(box(0.92, 0.03, 0.62, '#c9b38a', 0, 0.25 + k * 0.35, 0));
    const t = box(0.8, 0.05, 0.5, '#b89a72', 0, 0.28 + k * 0.35, 0); g.add(t); trays.push(t);
  }
  return {
    group: g, anchor: V3(0, 1.95, 0), smoke: V3(0, 1.2, 0),
    update(slot) {
      const n = slot.item ? (slot.done ? 4 : Math.ceil(4 * slot.t / slot.dur)) : 0;
      trays.forEach((t, k) => { t.visible = k < n; });
      return slot.item && slot.done ? 'vapour' : null;
    },
  };
}
// A still: a copper pot, a column and a coil
function buildStill(tint) {
  const g = new THREE.Group();
  g.add(box(1.0, 0.45, 0.8, '#3d424a', 0, 0, 0));
  const copper = mat(tint || '#c87a4a', { metalness: 0.6, roughness: 0.35 });
  const pot = sphere(0.32, copper, -0.15, 0.75, 0); pot.scale.set(1, 0.9, 1); g.add(pot);
  g.add(cyl(0.06, 0.06, 0.6, copper, -0.15, 1.0, 0, 10));
  g.add(cyl(0.035, 0.035, 0.5, copper, 0.1, 1.55, 0, 8)).rotation.z = PI / 2;
  const coil = cyl(0.14, 0.14, 0.45, mat('#9aa0aa', { metalness: 0.5, roughness: 0.3 }), 0.32, 0.45, 0, 12); g.add(coil);
  const dripM = emissiveMat('#3a1850', '#c07bff');
  const drip = sphere(0.05, dripM, 0.32, 0.5, 0.18, false); g.add(drip);
  return {
    group: g, anchor: V3(0, 2.0, 0), smoke: V3(-0.15, 1.3, 0),
    update(slot, dt, now) {
      drip.visible = !!slot.item;
      drip.position.y = 0.5 - ((now * 0.8) % 1) * 0.3;
      dripM.emissiveIntensity = slot.item && slot.done ? 1.6 : 0.8;
      return slot.item ? (slot.done ? 'vapour' : 'steam') : null;
    },
  };
}
const BUILDERS = { tent: buildTent, rack: buildDryRack, still: buildStill, oven: buildOven, mixer: buildMixer, fryer: buildFryer, drinks: buildDrinks, icecream: buildIcecream, grill: buildGrill,
  pizza: buildPizza, steamer: buildSteamer, burner: buildBurner, press: buildPress, kiln: buildKiln, chamber: buildChamber };

// ---------- People ----------
// Chunky, friendly figures. kind: 'customer', 'hood' (night buyers) or 'baker' (you).

// People are built from many little shapes; each moving part (a leg, an arm, the body, the head) is baked into one
// mesh with its colours stored per vertex, so a person is about 8 draws instead of 20. Eyes (they blink) and the
// bag (it comes and goes) stay apart.
const personMat = smat({ color: '#ffffff', vertexColors: true, roughness: 0.8 });
function bakePart(part, skip = []) {
  part.updateMatrixWorld(true);
  const inv = part.matrixWorld.clone().invert(), m4 = new THREE.Matrix4(), geos = [], gone = [];
  part.traverse(o => {
    if (!o.isMesh || skip.includes(o) || Array.isArray(o.material)) return;
    // only things that move with this part: stop at child pivots that animate on their own
    for (let p = o.parent; p && p !== part; p = p.parent) if (p.userData.pivot) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    const c = o.material.color || new THREE.Color('#ffffff'), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geos.push(g); gone.push(o);
  });
  if (geos.length < 2) return;
  for (const o of gone) o.parent.remove(o);
  const merged = new THREE.Mesh(mergeGeometries(geos, false), personMat);
  merged.castShadow = true; merged.receiveShadow = true;
  part.add(merged);
}
function buildPerson(look, kind) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  // Everything about how someone dresses follows from their look, so the same customer always looks the same
  let seed = ((look.skin * 73 + look.shirt * 151 + look.hair * 37 + look.pants * 211 + Math.round((look.h || 1) * 1000)) >>> 0) || 1;
  const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const pick = a => a[Math.floor(r() * a.length)];
  const plain = kind === 'customer';
  const outfit = kind === 'customer' ? pick(['tee', 'tee', 'jacket', 'dress', 'stripes', 'jumper']) : kind;
  const skinC = PAL.skin[look.skin % 5], skin = mat(skinC);
  const topC = kind === 'hood' ? PAL.hoodie[look.shirt % 5] : kind === 'baker' ? '#fbf7f2' : PAL.shirt[look.shirt % 10];
  const top = mat(topC);
  const jacketC = pick(['#3a3f55', '#6b4a2e', '#2f4a3a', '#7a2f3a', '#c9b48a', '#24344a']);
  const sleeve = outfit === 'jacket' ? mat(jacketC) : top;
  const pantsC = kind === 'baker' ? '#3a3550' : PAL.pants[look.pants % 5];
  const pants = mat(pantsC);
  const legM = outfit === 'dress' ? mat(pick(['#2b2d36', skinC, skinC])) : pants;
  const shoe = mat(kind === 'hood' ? '#1b1b1f' : plain ? pick(['#2a2230', '#f2f2f2', '#7a4a2a', '#c8323c', '#2a2230', '#4f6f9a']) : '#2a2230');
  const sole = mat('#e9e4da');
  const legGeo = geo('leg', () => new THREE.CapsuleGeometry(0.068, 0.26, 3, 8));
  const armGeo = geo('arm', () => new THREE.CapsuleGeometry(0.056, 0.22, 3, 8));
  const pivot = (parent, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); p.userData.pivot = true; parent.add(p); return p; };
  const legL = pivot(body, -0.09, 0.42), legR = pivot(body, 0.09, 0.42);
  for (const leg of [legL, legR]) {
    leg.add(mesh(legGeo, legM, 0, -0.19, 0));
    leg.add(rbox(0.13, 0.08, 0.22, shoe, 0, -0.43, 0.035, 0.035));
    leg.add(rbox(0.135, 0.025, 0.225, sole, 0, -0.455, 0.035, 0.01));
  }
  // The body: a top, maybe a jacket over it, stripes, a skirt, a belt
  const torsoGeo = geo('torso2', () => new THREE.CapsuleGeometry(0.2, 0.2, 4, 14));
  const torso = mesh(torsoGeo, outfit === 'jacket' ? mat(jacketC) : top, 0, 0.71, 0);
  torso.scale.set(1, 1, 0.85); body.add(torso);
  if (outfit === 'jacket') {
    body.add(rbox(0.13, 0.36, 0.03, top, 0, 0.66, 0.165, 0.015)); // the shirt showing down the front
    for (const x of [-0.075, 0.075]) { const lap = rbox(0.06, 0.16, 0.025, mat(jacketC), x, 0.78, 0.17, 0.01); lap.rotation.z = x < 0 ? 0.35 : -0.35; body.add(lap); }
  }
  if (outfit === 'stripes') {
    const stripeM = mat(pick(['#ffffff', '#2b2d36', '#ffd447']));
    for (const y of [0.6, 0.7, 0.8]) { const ring = mesh(geo('stripe', () => new THREE.CylinderGeometry(0.205, 0.205, 0.035, 14, 1, true)), stripeM, 0, y, 0); ring.scale.set(1, 1, 0.86); body.add(ring); }
  }
  if (outfit === 'jumper') { const col = mesh(geo('rollneck', () => new THREE.CylinderGeometry(0.1, 0.11, 0.07, 12)), top, 0, 0.98, 0); body.add(col); }
  if (outfit === 'dress') {
    const skirt = mesh(geo('skirt', () => new THREE.CylinderGeometry(0.18, 0.27, 0.32, 14)), top, 0, 0.42, 0); skirt.scale.z = 0.85; body.add(skirt);
  } else if (kind !== 'hood') {
    const belt = mesh(geo('belt', () => new THREE.CylinderGeometry(0.2, 0.2, 0.04, 14)), mat(kind === 'baker' ? '#3a3550' : '#2b2220'), 0, 0.5, 0); belt.scale.z = 0.86; body.add(belt);
  }
  if (kind === 'baker') {
    body.add(rbox(0.3, 0.42, 0.04, '#ff9fb2', 0, 0.44, 0.165, 0.02)); // apron
    body.add(rbox(0.14, 0.08, 0.02, '#ffffff', 0, 0.62, 0.188, 0.01)); // its pocket
    for (const x of [-0.12, 0.12]) { const tie = box(0.025, 0.3, 0.02, mat('#ff9fb2'), x, 0.78, 0.15); tie.rotation.z = x < 0 ? -0.25 : 0.25; body.add(tie); }
    for (const y of [0.78, 0.66]) body.add(sphere(0.016, '#d9cfc2', 0.06, y, 0.17, false)); // chef's buttons
  }
  if (kind === 'hood') body.add(rbox(0.22, 0.1, 0.05, top, 0, 0.6, 0.165, 0.02)); // the front pocket
  // Neck
  body.add(cyl(0.065, 0.075, 0.1, skin, 0, 0.93, 0, 10));
  const armL = pivot(body, -0.255, 0.88), armR = pivot(body, 0.255, 0.88);
  const shortSleeves = outfit === 'tee' || outfit === 'dress';
  for (const arm of [armL, armR]) {
    if (shortSleeves) { arm.add(mesh(geo('upperArm', () => new THREE.CapsuleGeometry(0.06, 0.06, 3, 8)), sleeve, 0, -0.07, 0)); arm.add(mesh(geo('foreArm', () => new THREE.CapsuleGeometry(0.048, 0.14, 3, 8)), skin, 0, -0.2, 0)); }
    else arm.add(mesh(armGeo, sleeve, 0, -0.15, 0));
    arm.add(sphere(0.062, skin, 0, -0.32, 0));
  }
  const head = new THREE.Group(); head.position.set(0, 1.17, 0); head.userData.pivot = true; body.add(head);
  const skull = sphere(0.24, skin); skull.scale.set(1, 0.95, 0.95); head.add(skull);
  for (const x of [-0.235, 0.235]) { const ear = sphere(0.05, skin, x, 0.0, 0.0); ear.scale.set(0.5, 1, 0.8); head.add(ear); }
  // A face: eyes with a glint (they blink), eyebrows, a nose, a smile, rosy cheeks
  const eyeM = mat('#1a1420'), glintM = mat('#ffffff');
  const eyes = [-0.085, 0.085].map(x => { const e = sphere(0.034, eyeM, x, 0.03, 0.212, false); e.scale.z = 0.6; e.userData.pivot = true; e.add(sphere(0.011, glintM, 0.012, 0.014, 0.03, false)); head.add(e); return e; });
  const hairC = PAL.hair[look.hair % 6], hairM = mat(hairC);
  for (const x of [-0.085, 0.085]) { const b = rbox(0.07, 0.018, 0.02, hairM, x, 0.085, 0.215, 0.008); b.rotation.z = x < 0 ? 0.12 : -0.12; head.add(b); }
  const nose = sphere(0.03, mat(skinC), 0, -0.02, 0.235, false); nose.scale.set(1, 0.85, 0.8); head.add(nose);
  const mouth = mesh(geo('smile', () => new THREE.TorusGeometry(0.04, 0.011, 4, 10, PI)), mat('#7a2f3a'), 0, -0.07, 0.218, false); mouth.rotation.z = PI; head.add(mouth);
  const blush = mat('#ff9a9a');
  for (const x of [-0.145, 0.145]) { const b = sphere(0.036, blush, x, -0.06, 0.18, false); b.scale.z = 0.4; head.add(b); }
  const cap = geo('hcap', () => new THREE.SphereGeometry(0.25, 16, 10, 0, PI * 2, 0, PI * 0.5));
  if (kind === 'hood') {
    const hood = mesh(geo('hood2', () => new THREE.SphereGeometry(0.3, 16, 12, 0, PI * 2, 0, PI * 0.66)), top, 0, 0.02, -0.04);
    hood.rotation.x = -0.45; head.add(hood);
  } else if (kind === 'baker') {
    const h = mesh(cap, hairM, 0, 0.03, -0.01); h.rotation.x = -0.2; head.add(h);
    head.add(cyl(0.17, 0.17, 0.16, '#ffffff', 0, 0.16, 0, 16));
    const puff = sphere(0.21, '#ffffff', 0, 0.38, 0); puff.scale.y = 0.7; head.add(puff);
    for (const x of [-0.1, 0, 0.1]) head.add(sphere(0.09, '#ffffff', x, 0.33, x ? 0.05 : -0.06)); // the pleats of the toque
  } else {
    const style = Math.floor(r() * 7);
    const h = mesh(cap, hairM, 0, 0.03, -0.015); h.rotation.x = -0.22; head.add(h);
    if (style === 1) head.add(sphere(0.11, hairM, 0, 0.27, -0.1)); // a bun
    if (style === 2) { const back = sphere(0.22, hairM, 0, -0.08, -0.1); back.scale.set(1.05, 1.2, 0.7); head.add(back); } // long
    if (style === 3) for (const [x, z] of [[-0.12, 0.05], [0.12, 0.05], [0, -0.12]]) head.add(sphere(0.09, hairM, x, 0.2, z)); // curls
    if (style === 4) { const tail = mesh(geo('ptail', () => new THREE.CapsuleGeometry(0.055, 0.18, 3, 8)), hairM, 0, -0.02, -0.26); tail.rotation.x = 0.5; head.add(tail); } // ponytail
    if (style === 5) { const fr = rbox(0.34, 0.07, 0.1, hairM, 0, 0.14, 0.16, 0.03); fr.rotation.x = -0.3; head.add(fr); } // a fringe
    if (style === 6) { const quiff = sphere(0.12, hairM, 0, 0.24, 0.1); quiff.scale.set(1.2, 0.8, 1.1); head.add(quiff); }
    if (look.hair === 4 || (outfit === 'jacket' && r() < 0.35)) { const beard = sphere(0.17, hairM, 0, -0.1, 0.06); beard.scale.set(1.15, 0.8, 0.95); head.add(beard); }
    if (look.hat) {
      if (r() < 0.5) { head.add(cyl(0.27, 0.27, 0.025, '#2d2f3a', 0, 0.12, 0, 18)); head.add(cyl(0.18, 0.2, 0.16, '#2d2f3a', 0, 0.13, 0, 18)); }
      else { const beanie = mesh(cap, mat(pick(['#e85d75', '#4f9de8', '#f0b44c', '#5fcf8a'])), 0, 0.06, -0.01); beanie.scale.set(1.04, 1.1, 1.04); head.add(beanie); head.add(sphere(0.06, '#ffffff', 0, 0.33, -0.01)); }
    }
  }
  const bagM = smat({ color: '#c8a36a', roughness: 0.85 });
  const bag = rbox(0.17, 0.2, 0.11, bagM, 0, -0.5, 0.03, 0.02);
  bag.visible = false; armR.add(bag);
  for (const part of [legL, legR, armL, armR]) bakePart(part, [bag]);
  bakePart(head, eyes); bakePart(body);
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
    let d = this.target.clone().sub(pos); d.y = 0;
    let dist = d.length();
    // Following a path: move on to the next waypoint once this one is reached
    while (dist <= 0.03 && this.path?.length) { this.target.copy(this.path.shift()); d = this.target.clone().sub(pos); d.y = 0; dist = d.length(); }
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
    return dist <= 0.03 && !this.path?.length;
  }
  turnTo(a, dt) {
    const r = this.group.rotation.y;
    const diff = ((a - r + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
    this.group.rotation.y = r + diff * Math.min(1, dt * 10);
  }
}

// ---------- The scene ----------

export function createScene(canvas, overlayEl, { onPick, onOutside }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 600;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // redrawn every other frame in frame()
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the pastel colours, softens hot spots
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#4a3e64');

  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 300);
  const DIR = V3(1, 1.15, 1).normalize();
  const RIGHT = V3(1, 0, -1).normalize();
  const UPS = V3(0, 1, 0).addScaledVector(DIR, -DIR.y).normalize();
  // The basement: right under the shop (BY below the street). Everything in it hangs off one group at that depth.
  const BX = BASEMENT_X, BY = -3.45;
  const cellar = new THREE.Group(); cellar.position.y = BY; scene.add(cellar);
  const ZONES = {
    shop: { center: V3(0.45, 0.5, 0.75), needW: 11.6, needH: 9.8 },
    back: { center: V3(BX, BY + 0.5, 0.5), needW: 11.8, needH: 10.2 },
  };
  const view = { zone: 'shop', light: 'day', top: 70, bottom: 90 };
  const cam = { target: ZONES.shop.center.clone(), zoom: 1, panR: 0, panU: 0, vR: 0, vU: 0 };
  let baseUnit = 0.02, camYC = 0; // world units per pixel at zoom 1, and the middle of the play area on screen
  let W = 1, H = 1, unit = 0.03;

  // Lights
  const hemi = new THREE.HemisphereLight('#fff1dc', '#4a3a5a', 1.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe2b8', 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(smallScreen ? 1024 : 2048, smallScreen ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 24, bottom: -24, near: 1, far: 110 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.target.position.set(-3.5, 0, 0);
  sun.position.set(4, 16, 9);
  scene.add(sun, sun.target);
  const shopLamp = new THREE.PointLight('#ffd59a', 0, 10, 2); shopLamp.position.set(0, 2.7, 1.2); scene.add(shopLamp);
  const bulb = new THREE.PointLight('#ffcc88', 0, 12, 2); bulb.position.set(BX - 1.2, BY + 2.6, 0.2); scene.add(bulb);
  const neon = new THREE.PointLight('#9b5cff', 0, 11, 2); neon.position.set(BX + 1.0, BY + 2.3, -3.4); scene.add(neon);
  // The street and alley lamps only glow (emissive); real point lights are kept to three for speed.
  const street = { intensity: 0 }, alley = { intensity: 0 };
  const LIGHTS = {
    day:     { nightK: 0, hemi: 1.7, hemiC: '#fff1dc', sun: 2.4, sunC: '#ffe2b8', bg: '#4a3e64', lamp: 0, bulb: 3, neon: 4, street: 0, alley: 0, lampI: 0.3, win: '#bfe6ff', winI: 0.9, glow: 0.6 },
    evening: { nightK: 0.55, hemi: 1.0, hemiC: '#ffd2b0', sun: 1.5, sunC: '#ff9a5a', bg: '#43304f', lamp: 10, bulb: 5, neon: 6, street: 10, alley: 4, lampI: 1.6, win: '#ff9e6b', winI: 0.9, glow: 1 },
    night:   { nightK: 1, hemi: 0.75, hemiC: '#9aa4ff', sun: 0.6, sunC: '#8c9aff', bg: '#191428', lamp: 3, bulb: 26, neon: 34, street: 14, alley: 14, lampI: 2.4, win: '#1a2240', winI: 0.6, glow: 1.8 },
  };
  const cur = { ...LIGHTS.day, bgC: new THREE.Color(LIGHTS.day.bg), winC: new THREE.Color(LIGHTS.day.win), hemiCC: new THREE.Color(LIGHTS.day.hemiC), sunCC: new THREE.Color(LIGHTS.day.sunC) };

  const pickables = [];
  const glowMats = [];
  const lampGlows = [];
  const windows = [];

  const statics = new THREE.Group(); // fixed fittings, merged into a few meshes once built
  // ---------- Static room ----------
  const concreteTex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#595b62'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.06})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(80, 60, 26, 14, 0.4, 0, PI * 2); c.fill();
  }, [3, 4]);

  // Stone foundations, like the buildings along the street (the floor itself is painted by the design layer)
  statics.add(box(9.25, 0.45, 9.25, '#c7bfb2', 0, -0.45, 0, false));
  // The small back room upstairs: a floor around the stairwell, on its own foundation
  { const f = mesh(new THREE.PlaneGeometry(3.0, 2.9), smat({ map: concreteTex, roughness: 0.95 }), -6.2, 0.001, 3.15, false); f.rotation.x = -PI / 2; f.receiveShadow = true; statics.add(f); }
  statics.add(box(3.15, 0.45, 2.85, '#a79f95', -6.2, -0.45, 3.175, false));
  // The basement's floor, the same size as the shop; digging out adds more (basementShell)
  const backFloor = mesh(new THREE.PlaneGeometry(9.2, 9.2), smat({ color: '#595b62', map: surfaceTiled('concrete', 0.5), roughness: 0.95 }), BX, 0.001, 0, false);
  backFloor.rotation.x = -PI / 2; backFloor.receiveShadow = true; backFloor.userData.keep = true; cellar.add(backFloor); // its own mesh so its style can change
  const backFloorOrig = backFloor.material, basementFloors = [backFloor];
  // The earth it's dug into: under the floor, and behind the back and left walls (in front, it's cut away so you can see in)
  const soilM = mat('#2d241e');
  cellar.add(box(44, 0.6, 44, soilM, BX + 4, -0.62, 6, false), box(16, 3.45, 8, soilM, BX + 1, -0.5, -8.75, false),
    box(8, 3.45, 5.3, soilM, BX - 8.75, -0.5, -2.1, false), box(8, 3.45, 3.0, soilM, BX - 8.75, -0.5, 3.2, false));

  // Walls
  const shopWall = mat('#f6d2b0'), shopWain = mat('#c98f6b'), trim = mat('#fff0dc');
  // The basement's walls (and the little back room's) change with its design, so they have materials of their own
  const backWall = smat({ color: '#41464f', map: surfaceTiled('block', 1) }), backWain = smat({ color: '#30343b', map: surfaceTiled('block', 1) });
  const isBackWall = o => o.material === backWall || o.material === backWain;
  function wallX(x0, x1, z, upper, lower, tiles, group) { // runs along x
    const w = x1 - x0, cx = (x0 + x1) / 2, to = group || statics;
    to.add(box(w, 1.0, 0.2, lower, cx, 0, z));
    to.add(box(w, 2.0, 0.2, upper, cx, 1.0, z));
    to.add(box(w, 0.06, 0.24, trim, cx, 1.0, z));
    if (tiles) { const t = mesh(new THREE.PlaneGeometry(w, 1.0), smat({ map: tiles, roughness: 0.4 }), cx, 1.55, z + 0.105, false); statics.add(t); }
  }
  function wallZ(z0, z1, x, upper, lower, group) { // runs along z
    const d = z1 - z0, cz = (z0 + z1) / 2;
    const parts = [box(0.2, 1.0, d, lower, x, 0, cz), box(0.2, 2.0, d, upper, x, 1.0, cz), box(0.24, 0.06, d, trim, x, 1.0, cz)];
    for (const p of parts) (group || statics).add(p);
  }
  wallX(-4.5, 4.6, -4.6, shopWall, shopWain, null);
  // The partition between shop and back room (hidden at night so you can see in)
  const partition = new THREE.Group();
  wallZ(-4.7, 2.55, -4.6, shopWall, shopWain, partition);
  wallZ(3.65, 4.6, -4.6, shopWall, shopWain, partition);
  partition.add(box(0.2, 0.9, 1.1, shopWall, -4.6, 2.1, 3.1));
  const innerDoor = box(0.06, 2.05, 1.05, '#7a4a2e', -4.6, 0, 3.1); partition.add(innerDoor);
  innerDoor.userData = { act: 'room' };
  partition.add(box(0.1, 0.12, 0.1, '#e0c070', -4.53, 1.0, 2.75));
  const capM = mat('#d9d3c8');
  partition.add(box(0.34, 0.12, 9.3, capM, -4.6, 3.0, -0.05));
  scene.add(partition);
  statics.add(box(9.4, 0.12, 0.34, capM, 0.05, 3.0, -4.6));
  // ---- The small back room: the back door, and stairs down to the basement ----
  wallX(-7.6, -4.7, 0.4, backWall, backWain);
  wallZ(0.4, 1.4, -7.7, backWall, backWain); wallZ(2.6, 4.6, -7.7, backWall, backWain);
  statics.add(box(0.2, 0.95, 1.2, backWall, -7.7, 2.05, 2.0));
  statics.add(box(3.0, 0.5, 0.2, backWain, -6.2, 0, 4.6), box(3.04, 0.06, 0.26, trim, -6.2, 0.5, 4.6));
  statics.add(box(3.3, 0.12, 0.34, capM, -6.15, 3.0, 0.4), box(0.34, 0.12, 4.3, capM, -7.7, 3.0, 2.5));
  const backDoorPivot = new THREE.Group(); backDoorPivot.position.set(-7.68, 0, 1.42);
  const backDoor = box(0.08, 2.0, 1.15, '#55606b', 0, 0, 0.58); backDoorPivot.add(backDoor);
  backDoorPivot.add(box(0.1, 0.1, 0.1, '#c9ccd3', 0.05, 1.0, 1.02));
  scene.add(backDoorPivot);
  // ---- The stairs: one flight from the small back room down to the basement under the shop ----
  // The top step is at the far end of the stairwell (by the back door); it runs down towards the shop, under the
  // shop's side wall, and its last steps come into the basement through an opening in the basement's left wall.
  const stepM = mat('#5a5048'), railM2 = mat('#2b2d36', { metalness: 0.4, roughness: 0.4 }), noseM = mat('#8d939c', { metalness: 0.5, roughness: 0.4 });
  const BY0 = -3.45, STEP_N = 12, STEP_RUN = 0.29, STEP_TOP_X = -7.1, STEP_RISE = 3.45 / STEP_N;
  for (let k = 0; k < STEP_N - 1; k++) {
    const top = -(k + 1) * STEP_RISE, x = STEP_TOP_X + (k + 0.5) * STEP_RUN;
    statics.add(box(STEP_RUN, top - BY0, 1.0, stepM, x, BY0, 1.1));
    statics.add(box(0.04, 0.03, 1.0, noseM, x + STEP_RUN / 2 - 0.02, top - 0.03, 1.1, false)); // a steel nosing on each step
  }
  // The stairwell's walls, down to the basement, and its end wall under the back door
  const wellM = mat('#3a3d44');
  statics.add(box(3.0, 3.45, 0.1, wellM, -6.1, BY0, 0.5), box(3.0, 3.45, 0.1, wellM, -6.1, BY0, 1.7), box(0.1, 3.45, 1.3, wellM, -7.65, BY0, 1.1));
  // The landing at the top, by the back door
  { const f = mesh(new THREE.PlaneGeometry(0.5, 1.1), smat({ map: concreteTex, roughness: 0.95 }), -7.35, 0.001, 1.1, false); f.rotation.x = -PI / 2; statics.add(f); }
  statics.add(box(0.5, 0.45, 1.1, '#a79f95', -7.35, -0.45, 1.1, false), box(0.04, 0.03, 1.0, noseM, -7.12, -0.03, 1.1, false));
  // A rail along the open side upstairs
  for (const x of [-7.3, -6.2, -5.1]) statics.add(box(0.05, 0.95, 0.05, railM2, x, 0, 1.62, false));
  statics.add(box(2.3, 0.05, 0.06, railM2, -6.2, 0.95, 1.62, false));
  const stairwellHit = mesh(new THREE.BoxGeometry(2.4, 1.2, 1.2), new THREE.MeshBasicMaterial({ visible: false }), -6.2, 0.4, 1.1, false);
  stairwellHit.userData = { act: 'room' }; scene.add(stairwellHit);
  statics.add(box(0.6, 0.45, 0.45, '#6b5540', -5.2, 0, 4.15)); // a crate by the door

  // The yard beside and behind the small back room, with bins and pallets
  { for (const [w, d, x, z] of [[4.1, 9.3, -9.75, 0], [3.0, 5.0, -6.2, -2.1]]) { const y = mesh(new THREE.PlaneGeometry(w, d), mat('#8f8a82'), x, 0.006, z, false); y.rotation.x = -PI / 2; y.receiveShadow = true; statics.add(y); }
    for (const [x, z, c] of [[-11.2, -3.6, '#3f6b4a'], [-10.4, -3.6, '#2b2d36']]) { statics.add(box(0.6, 1.0, 0.6, c, x, 0, z)); statics.add(box(0.64, 0.06, 0.64, '#22252c', x, 1.0, z)); }
    statics.add(box(1.1, 0.14, 0.9, '#a8703f', -6.3, 0, -3.2), box(1.1, 0.14, 0.9, '#a8703f', -6.3, 0.14, -3.2)); }

  // ---- The basement: under the shop, down the stairs ----
  wallX(BX - 4.5, BX + 4.6, -4.6, backWall, backWain, null, cellar);
  wallZ(-4.7, 0.5, BX - 4.6, backWall, backWain, cellar); wallZ(1.7, 4.6, BX - 4.6, backWall, backWain, cellar);
  cellar.add(box(0.2, 0.4, 1.2, backWall, BX - 4.6, 2.6, 1.1), box(0.26, 0.08, 1.24, trim, BX - 4.6, 2.55, 1.1)); // over the opening
  cellar.add(box(9.3, 0.12, 0.34, capM, BX + 0.05, 3.0, -4.6), box(0.34, 0.12, 9.3, capM, BX - 4.6, 3.0, -0.05));
  // A rail beside the last steps, and a light over the opening
  cellar.add(box(0.05, 0.9, 0.05, railM2, BX - 3.85, 0, 1.68, false), box(0.75, 0.05, 0.05, railM2, BX - 4.2, 0.9, 1.68, false));
  const stairsHit = mesh(new THREE.BoxGeometry(1.0, 2.6, 1.2), new THREE.MeshBasicMaterial({ visible: false }), BX - 4.2, 1.3, 1.1, false);
  stairsHit.userData = { act: 'room', keep: true }; cellar.add(stairsHit);
  // Ceiling pipes along the back wall
  for (const [y, z, c] of [[2.7, -4.35, '#8d939c'], [2.5, -4.35, '#b8723a']]) { const pipe = cyl(0.05, 0.05, 9.0, mat(c, { metalness: 0.5, roughness: 0.4 }), BX, y, z, 8); pipe.rotation.z = PI / 2; pipe.position.set(BX, y, z); cellar.add(pipe); }
  // What digging out adds: more floor, the knee walls move out, the back and left walls run on (rebuilt with the expansions)
  const basementShell = new THREE.Group(); cellar.add(basementShell);
  let basementSig = '';
  function rebuildBasement(ex) {
    const sig = `${!!ex.digfront}${!!ex.digside}`;
    if (sig === basementSig) return;
    basementSig = sig;
    basementShell.clear(); basementFloors.length = 1;
    const F = ex.digfront ? 6.8 : 4.6, S = ex.digside ? 6.8 : 4.6;
    const floor = (w, d, x, z) => { const f = mesh(new THREE.PlaneGeometry(w, d), backFloor.material, BX + x, 0.001, z, false); f.rotation.x = -PI / 2; f.receiveShadow = true; basementShell.add(f); basementFloors.push(f); };
    if (ex.digfront) floor(9.2, 2.2, 0, 5.7);
    if (ex.digside) floor(2.2, 9.2, 5.7, 0);
    if (ex.digfront && ex.digside) floor(2.2, 2.2, 5.7, 5.7);
    // knee walls on the two sides you look in from
    const knee = (w, d, x, z) => basementShell.add(box(w, 0.5, d, backWain, BX + x, 0, z), box(w + 0.04, 0.06, d + 0.04, trim, BX + x, 0.5, z));
    knee(S + 4.6, 0.2, (S - 4.6) / 2, F); knee(0.2, F + 4.6, S, (F - 4.6) / 2);
    if (ex.digfront && !ex.digside) knee(0.2, 2.2, 4.6, 5.7);
    if (ex.digside && !ex.digfront) knee(2.2, 0.2, 5.7, 4.6);
    // the back and left walls run on along a dug-out part
    if (ex.digside) { const g = new THREE.Group(); wallX(BX + 4.6, BX + 6.8, -4.6, backWall, backWain, null, g); g.add(box(2.3, 0.12, 0.34, capM, BX + 5.7, 3.0, -4.6)); basementShell.add(g); }
    if (ex.digfront) { const g = new THREE.Group(); wallZ(4.6, 6.8, BX - 4.6, backWall, backWain, g); g.add(box(0.34, 0.12, 2.3, capM, BX - 4.6, 3.0, 5.7)); basementShell.add(g); }
    // props: shoring posts where the old walls were
    const postM = mat('#6b7079', { metalness: 0.4, roughness: 0.5 });
    if (ex.digfront) for (const x of [-2.0, 2.0]) basementShell.add(box(0.16, 2.9, 0.16, postM, BX + x, 0, 4.6));
    if (ex.digside) for (const z of [-2.0, 2.0]) basementShell.add(box(0.16, 2.9, 0.16, postM, BX + 4.6, 0, z));
    basementShell.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    worldUV(basementShell, o => isBackWall(o) || basementFloors.includes(o)); texturize(basementShell);
    ZONES.back.center.set(BX + (ex.digside ? 1.1 : 0), BY + 0.5, ex.digfront ? 1.6 : 0.5);
    ZONES.back.needW = ex.digside ? 13.6 : 11.8; ZONES.back.needH = ex.digfront ? 12.2 : 10.2;
  }

  // Shop windows, sign and menu board
  function windowOn(x, z, w, h, y) {
    const frame = box(w + 0.16, h + 0.16, 0.08, '#fff0dc', x, y - 0.08, z + 0.1);
    const m = smat({ color: '#1c2233', emissive: '#bfe6ff', emissiveIntensity: 0.9, roughness: 0.2 });
    const pane = box(w, h, 0.04, m, x, y, z + 0.15, false);
    statics.add(frame, pane);
    statics.add(box(0.04, h, 0.05, '#fff0dc', x, y, z + 0.18, false));
    windows.push(m);
  }
  windowOn(3.0, -4.6, 1.7, 1.2, 1.2);
  const menuTex = canvasTex(256, 192, (c, w, h) => {
    c.fillStyle = '#2b3a34'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#a07a52'; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = '#f4efe2'; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center'; c.fillText('MENU', w / 2, 46);
    c.font = '20px Georgia, serif'; c.textAlign = 'left';
    ['Sourdough', 'Croissants', 'Cookies', 'Donuts', 'Tarts'].forEach((t, i) => c.fillText('~ ' + t, 30, 78 + i * 22));
  });
  const menu = mesh(new THREE.PlaneGeometry(1.2, 0.9), smat({ map: menuTex, roughness: 0.9 }), 2.3, 2.45, -4.475, false);
  menu.position.x = 1.85; menu.position.y = 2.35; statics.add(menu);
  const drawSign = (c, w, h, text) => {
    c.fillStyle = '#8a5a36'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffe7c2'; c.font = `bold ${text.length > 13 ? 28 : 34}px Georgia, serif`; c.textAlign = 'center'; c.fillText(text, w / 2, 44);
  };
  const woodSignTex = canvasTex(256, 64, (c, w, h) => drawSign(c, w, h, "Rosa's Bakery"));
  let signText = "Rosa's Bakery";
  const setSign = text => {
    if (text === signText) return;
    signText = text;
    const cv = woodSignTex.image; drawSign(cv.getContext('2d'), cv.width, cv.height, text); woodSignTex.needsUpdate = true;
  };
  const woodSign = mesh(new THREE.PlaneGeometry(1.9, 0.48), smat({ map: woodSignTex, roughness: 0.8 }), 3.3, 2.65, -4.475, false);
  scene.add(woodSign);
  const neonTex = canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = 'rgba(0,0,0,0)'; c.fillRect(0, 0, w, h);
    c.shadowColor = '#ff4fa8'; c.shadowBlur = 24; c.fillStyle = '#ffd1ec';
    c.font = 'italic bold 78px "Brush Script MT", cursive, Georgia'; c.textAlign = 'center'; c.fillText("Rosa's", w / 2, 92);
  });
  const neonSign = mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: neonTex, transparent: true }), 3.3, 2.65, -4.465, false);
  neonSign.visible = false; scene.add(neonSign);

  // Display counters: each a glass cabinet standing on its own square, facing its customers (built in syncCounters).
  // Tap one to see how much is left.
  const glass = smat({ color: '#cfefff', transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false });
  let trays = [];
  const counterGroup = new THREE.Group(); scene.add(counterGroup);
  const hitM = new THREE.MeshBasicMaterial({ visible: false });
  const counterHits = [];
  const seasonGroup = new THREE.Group(); scene.add(seasonGroup);
  let seasonSig = null;
  function syncSeason(s) {
    const z = G.currentSeason();
    if (z === seasonSig) return;
    seasonSig = z;
    seasonGroup.clear();
    if (!z) return;
    const add = m => { seasonGroup.add(m); return m; };
    const cols = { christmas: ['#c8323c', '#2f7a4a', '#d4af37'], halloween: ['#ff9a3d', '#6b3a8a', '#2b2d36'], valentine: ['#ff6f9a', '#e8323c', '#ffffff'],
      easter: ['#ffd1e8', '#bfe6ff', '#fff3a8', '#c8f0c0'], summer: ['#e85d75', '#ffd447', '#4f9de8', '#5fcf8a'], bonfire: ['#ff9a3d', '#ffd447', '#e85d75'] }[z];
    const glowM = c => smat({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.5 });
    // Garland along the top of the back wall
    for (let k = 0; k < 17; k++) {
      const x = -4.1 + k * 0.5, y = 2.62 - Math.sin((k % 4) / 4 * PI) * 0.12, c = cols[k % cols.length];
      if (z === 'summer') { const f = mesh(geo('flag', () => new THREE.ConeGeometry(0.11, 0.22, 3)), mat(c), x, y, -4.38, false); f.rotation.x = PI; add(f); }
      else if (z === 'easter') { const e = sphere(0.07, c, x, y, -4.38, false); e.scale.set(0.8, 1.1, 0.8); add(e); }
      else add(sphere(z === 'valentine' ? 0.07 : 0.06, glowM(c), x, y, -4.38, false));
    }
    // Something by the door outside (and a small one on the counter by the till)
    const g = new THREE.Group(); g.position.set(6.25, 0, 4.45); add(g);
    if (z === 'christmas') {
      g.add(cyl(0.08, 0.1, 0.3, '#7a4a2e', 0, 0, 0, 8));
      for (let k = 0; k < 3; k++) g.add(mesh(geo(`xt${k}`, () => new THREE.ConeGeometry(0.5 - k * 0.12, 0.55, 10)), mat('#2f7a4a'), 0, 0.55 + k * 0.38, 0));
      g.add(mesh(geo('star', () => new THREE.OctahedronGeometry(0.07, 0)), starM, 0, 1.6, 0, false));
      for (let k = 0; k < 9; k++) { const a = k * 1.9, r = 0.36 - (k % 3) * 0.08; g.add(sphere(0.045, glowM(cols[k % 3]), Math.cos(a) * r, 0.5 + (k % 3) * 0.38, Math.sin(a) * r, false)); }
    } else if (z === 'halloween') {
      for (const [x, r] of [[-0.2, 0.22], [0.22, 0.16]]) { const pk = sphere(r, '#ff9a3d', x, r * 0.85, 0); pk.scale.set(1.15, 0.85, 1.15); g.add(pk); g.add(cyl(0.025, 0.03, 0.08, '#3f7a3a', x, r * 1.6, 0, 6)); g.add(box(0.08, 0.05, 0.02, glowM('#ffd447'), x, r * 0.85, r * 1.05, false)); }
    } else if (z === 'valentine') {
      g.add(cyl(0.004, 0.004, 1.3, '#ffffff', 0, 0, 0, 4, false));
      for (const dx of [-0.07, 0.07]) g.add(sphere(0.11, glowM('#e8323c'), dx, 1.42, 0, false));
      const tip = mesh(geo('hearttip', () => new THREE.ConeGeometry(0.15, 0.2, 10)), glowM('#e8323c'), 0, 1.25, 0, false); tip.rotation.x = PI; g.add(tip);
    } else if (z === 'easter') {
      g.add(cyl(0.22, 0.17, 0.18, '#c9a46a', 0, 0, 0, 12)); g.add(mesh(geo('handle', () => new THREE.TorusGeometry(0.2, 0.015, 6, 14, PI)), mat('#a8703f'), 0, 0.18, 0));
      for (let k = 0; k < 5; k++) { const e = sphere(0.06, cols[k % 4], Math.cos(k * 1.3) * 0.1, 0.2, Math.sin(k * 1.3) * 0.1); e.scale.set(0.8, 1.1, 0.8); g.add(e); }
    } else if (z === 'summer') {
      g.add(cyl(0.02, 0.02, 1.6, '#e9e4da', 0, 0, 0, 6)); g.add(mesh(geo('psol', () => new THREE.ConeGeometry(0.7, 0.3, 8)), mat('#ffd447'), 0, 1.6, 0));
      g.add(cyl(0.18, 0.18, 0.02, '#4f9de8', 0.3, 0.001, 0.2, 14));
    } else if (z === 'bonfire') {
      for (let k = 0; k < 3; k++) { const l = box(0.14, 0.2, 0.14, glowM(cols[k]), -0.25 + k * 0.25, 0.9 + (k % 2) * 0.1, 0, false); g.add(l); g.add(cyl(0.004, 0.004, 0.9, '#2b2d36', -0.25 + k * 0.25, 0, 0, 4, false)); }
    }
    seasonGroup.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  let counterSig = '', traySig = '';
  const starM = smat({ color: '#ffd447', emissive: '#ffb400', emissiveIntensity: 0.6, roughness: 0.4 });
  function syncCounters(s) {
    const cells = D.counterCells(s).slice(0, G.countersOf(s.design)), menu = G.counterList(s), spk = menu.indexOf(s.design.special);
    const sig = JSON.stringify([cells, spk, (s.design.cabinets || []).map(Boolean)]);
    if (sig === counterSig) return;
    counterSig = sig;
    for (const o of counterGroup.children) o.traverse(m => { if (m.isMesh && !m.userData.keep) m.geometry.dispose(); });
    counterGroup.clear();
    for (const t of trays) { scene.remove(t.group); }
    for (const h of counterHits) { scene.remove(h); const i = pickables.indexOf(h); if (i >= 0) pickables.splice(i, 1); }
    counterHits.length = 0;
    trays = [];
    traySig = '';
    const woodM = mat('#9c5f3b'), darkM = mat('#5c3520'), panelM = mat('#b67a52'), trayM = mat('#f6f1e6'), capM = mat('#efe6d8'), postM = mat('#5c3520');
    cells.forEach((c, k) => {
      const { x, z } = D.cellCenter(c.cx, c.cz), rot = c.rot || 0, ry = D.rotY(rot), [dx, dz] = D.DIRS[rot];
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
      // the wooden base, a panel on the customers' side, and the glass case on top (local +z faces the customers)
      g.add(box(0.9, 0.95, 0.84, woodM, 0, 0, 0), box(0.94, 0.08, 0.88, darkM, 0, 0, 0), box(0.86, 0.6, 0.02, panelM, 0, 0.2, 0.43), box(0.94, 0.04, 0.88, capM, 0, 0.95, 0));
      g.add(box(0.82, 0.03, 0.76, trayM, 0, 0.99, 0, false), box(0.84, 0.55, 0.84, glass, 0, 0.99, 0, false));
      for (const ez of [-0.42, 0.42]) g.add(box(0.86, 0.04, 0.04, capM, 0, 1.54, ez));
      for (const ex of [-0.42, 0.42]) g.add(box(0.03, 0.55, 0.84, postM, ex, 0.99, 0, false));
      if (G.cabinetOn(s, k)) { const ch = mat('#d9dde3', { metalness: 0.7, roughness: 0.25 }); g.add(box(0.86, 0.05, 0.05, ch, 0, 0.96, 0.44, false), box(0.86, 0.05, 0.05, ch, 0, 1.5, 0.44, false)); }
      if (k === spk) { const st = mesh(geo('star', () => new THREE.OctahedronGeometry(0.07, 0)), starM, 0, 1.72, 0, false); st.userData.spin = true; st.userData.keep = true; g.add(st); }
      counterGroup.add(g);
      // the food sits in its own group on the tray
      const tg = new THREE.Group(); tg.position.set(x, 1.02, z); tg.rotation.y = ry; scene.add(tg);
      const hit = mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), hitM, x, 1.2, z, false); hit.userData = { act: 'counter', id: String(k) };
      scene.add(hit); pickables.push(hit); counterHits.push(hit);
      trays.push({ x, z, ry, dx, dz, group: tg, sig: '' });
    });
    mergeStatic(texturize(counterGroup));
    invalidateNav(); // counters stand in the way
  }
  // The till: a cabinet with the register on top, its screen facing the staff side (customers stand at local +z).
  // It stands wherever it's been put; tap it in Design to move it.
  const screenM = smat({ color: '#0a2a1a', emissive: '#5fd38d', emissiveIntensity: 0.8 });
  const tillGroup = new THREE.Group();
  tillGroup.add(box(0.9, 0.95, 0.84, '#8a5235', 0, 0, 0), box(0.94, 0.05, 0.88, '#efe6d8', 0, 0.95, 0), box(0.5, 0.22, 0.4, '#2e2f36', 0, 1.0, -0.05));
  { const scr = box(0.36, 0.22, 0.03, screenM, 0, 1.22, -0.17); scr.rotation.x = -0.4; tillGroup.add(scr); }
  mergeStatic(texturize(tillGroup));
  const tillHit = mesh(new THREE.BoxGeometry(0.9, 1.3, 0.9), hitM, 0, 0.65, 0, false); tillHit.userData = { act: 'till' };
  tillGroup.add(tillHit);
  scene.add(tillGroup);
  let tillSig = '';
  const TILL = V3(3.1, 1.3, 0.85); // where coins pop out (follows the till)
  function syncTill(s) {
    const t = D.tillCell(s), sig = `${t.cx},${t.cz},${t.rot}`;
    if (sig === tillSig) return;
    tillSig = sig;
    const { x, z } = D.cellCenter(t.cx, t.cz);
    tillGroup.position.set(x, 0, z); tillGroup.rotation.y = D.rotY(t.rot || 0);
    TILL.set(x, 1.3, z);
    invalidateNav();
  }
  // Decor: plants, rug, flour sacks, crates
  function plant(x, z, s = 1) {
    statics.add(cyl(0.2 * s, 0.15 * s, 0.35 * s, '#c96f4a', x, 0, z, 12));
    for (const [dx, dy, dz, r] of [[0, 0.55, 0, 0.26], [0.12, 0.72, 0.05, 0.18], [-0.12, 0.68, -0.06, 0.2]]) statics.add(sphere(r * s, '#4f9a5a', x + dx * s, dy * s, z + dz * s));
  }
  { const rug = mesh(new THREE.PlaneGeometry(1.6, 1.1), mat('#b8485e'), 3.8, 0.004, 3.6, false); rug.rotation.x = -PI / 2; statics.add(rug); }
  // The basement's fittings: an LED strip and bulbs, the bag table, the cash table, the kit boxes (filled from state)
  const ledM = smat({ color: '#2a1840', emissive: '#a46bff', emissiveIntensity: 1.2 });
  glowMats.push(ledM);
  cellar.add(box(8.6, 0.05, 0.05, ledM, BX, 2.85, -4.48, false));
  const bulbM = smat({ color: '#fff3d6', emissive: '#ffcc88', emissiveIntensity: 1 }); glowMats.push(bulbM);
  for (const [x, z] of [[-1.2, 0.2], [2.0, 2.4], [-1.0, -2.8]]) { cellar.add(cyl(0.01, 0.01, 0.5, '#222', BX + x, 2.5, z, 6, false)); cellar.add(sphere(0.09, bulbM, BX + x, 2.45, z, false)); }
  const [bagX, bagZ] = D.BACK_PROPS.bagTable, [cashX, cashZ] = D.BACK_PROPS.cashTable, [kitX, kitZ] = D.BACK_PROPS.kits;
  cellar.add(box(1.2, 0.75, 0.75, '#5a4632', BX + cashX, 0, cashZ));
  const cash = [];
  for (let k = 0; k < 12; k++) {
    const c = box(0.22, 0.05, 0.12, mat('#6fbf73', { roughness: 0.9 }), BX + cashX - 0.4 + (k % 4) * 0.26, 0.75 + Math.floor(k / 4) * 0.06, cashZ - 0.05 + (k % 2) * 0.05);
    c.visible = false; c.userData.keep = true; cellar.add(c); cash.push(c);
  }
  const kitsBoxes = [];
  for (let k = 0; k < 8; k++) {
    const b = box(0.32, 0.22, 0.28, '#c9b38a', BX + kitX - 0.17 + (k % 2) * 0.34, Math.floor(k / 2) * 0.23, kitZ + (k % 2) * 0.02);
    b.visible = false; b.userData.keep = true; cellar.add(b); kitsBoxes.push(b);
  }
  cellar.add(box(0.9, 0.8, 0.6, '#4f4639', BX + bagX, 0, bagZ));
  const bagPile = [];
  for (let k = 0; k < 24; k++) {
    const b = box(0.11, 0.14, 0.04, mat('#c79bff', { roughness: 0.3, transparent: true, opacity: 0.88 }), BX + bagX - 0.3 + (k % 6) * 0.12, 0.8 + Math.floor(k / 12) * 0.15, bagZ - 0.15 + Math.floor((k % 12) / 6) * 0.2);
    b.visible = false; b.userData.keep = true; cellar.add(b); bagPile.push(b);
  }
  worldUV(cellar, o => isBackWall(o) || o === backFloor); // walls and floor textured by the metre, not stretched
  mergeStatic(texturize(cellar)); // the basement's still parts, merged (floors, the stairs' tap area and the props that come and go stay apart)
  // Security camera upgrade
  const camGroup = new THREE.Group();
  camGroup.add(box(0.28, 0.14, 0.14, '#e6e6e6', 0, 0, 0)); camGroup.add(sphere(0.04, mat('#222'), 0.15, 0.07, 0, false));
  const camLed = new THREE.MeshBasicMaterial({ color: '#ff3a3a' }); camGroup.add(mesh(geo('led', () => new THREE.SphereGeometry(0.02, 6, 6)), camLed, 0.1, 0.12, 0.06, false));
  camGroup.position.set(-7.5, 2.55, 3.4); camGroup.rotation.y = 0.5; camGroup.visible = false; scene.add(camGroup);
  // Catering boxes upgrade
  const catering = new THREE.Group();
  for (let k = 0; k < 3; k++) catering.add(box(0.5, 0.18, 0.4, '#f4f0e8', 0, k * 0.19, 0));
  catering.position.set(3.95, 0, -2.6); catering.visible = false; scene.add(catering);

  // ---------- Outside: shopfront walls, planters, A-board, street lamp ----------
  // Knee-high front walls (they open up when a terrace is bought), with planters and a doorway on the street side
  const frontWall = new THREE.Group(), sideWall = new THREE.Group();
  const extWain = mat('#c98f6b'), extTrim = mat('#fff0dc');
  frontWall.add(box(9.4, 0.5, 0.2, extWain, 0, 0, 4.6), box(9.44, 0.06, 0.26, extTrim, 0, 0.5, 4.6));
  sideWall.add(box(0.2, 0.5, 7.5, extWain, 4.6, 0, -0.95), box(0.26, 0.06, 7.54, extTrim, 4.6, 0.5, -0.95));
  const petalCols = ['#ff7eb6', '#ffd447', '#ffffff', '#ff5d6c', '#b58cff'];
  function planter(group, x, z, alongX) {
    group.add(box(alongX ? 1.1 : 0.3, 0.2, alongX ? 0.3 : 1.1, '#6b4a2e', x, 0.56, z));
    for (let k = 0; k < 5; k++) {
      const t = -0.4 + k * 0.2;
      group.add(sphere(0.09, '#4f9a5a', x + (alongX ? t : 0), 0.8, z + (alongX ? 0 : t)));
      group.add(sphere(0.05, petalCols[k], x + (alongX ? t : 0.03), 0.9, z + (alongX ? 0.03 : t)));
    }
  }
  planter(frontWall, -3.2, 4.6, true); planter(frontWall, -0.2, 4.6, true); planter(frontWall, 2.8, 4.6, true);
  planter(sideWall, 4.6, -3.2, false); planter(sideWall, 4.6, 0.3, false);
  scene.add(frontWall, sideWall);
  for (const z of [2.85, 4.55]) { statics.add(box(0.24, 1.05, 0.24, '#7a4a2e', 4.62, 0, z)); statics.add(sphere(0.13, '#7a4a2e', 4.62, 1.12, z)); }
  // The shop door: two café-style leaves hung on the posts (low, so you can still see in), swinging in as people pass
  const doorLeaves = [];
  { const woodM = tmat('#8a5534', 'wood'), paneM = smat({ color: '#d8f0ff', transparent: true, opacity: 0.45, roughness: 0.1 }), brass = tmat('#d4af37', 'metal', { metalness: 0.6, roughness: 0.3 });
    for (const [hz, dir] of [[2.97, 1], [4.43, -1]]) {
      const leaf = new THREE.Group(); leaf.position.set(4.62, 0, hz);
      const w = 0.72, mid = dir * w / 2;
      leaf.add(box(0.05, 0.12, w, woodM, 0, 0.12, mid), box(0.05, 0.1, w, woodM, 0, 0.9, mid), box(0.05, 0.1, w, woodM, 0, 0.52, mid));
      leaf.add(box(0.05, 0.88, 0.06, woodM, 0, 0.12, dir * 0.03), box(0.05, 0.88, 0.06, woodM, 0, 0.12, dir * (w - 0.03)));
      leaf.add(box(0.02, 0.28, w - 0.12, paneM, 0, 0.62, mid, false), box(0.03, 0.27, w - 0.12, tmat('#a8703f', 'wood'), 0, 0.24, mid));
      leaf.add(box(0.07, 0.04, 0.1, brass, 0, 0.7, dir * (w - 0.1)));
      leaf.userData.dir = dir;
      leaf.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(leaf); doorLeaves.push(leaf);
    }
  }
  let doorT = 0; // 0 shut, 1 open
  const openTex = canvasTex(128, 64, (c, w, h) => {
    c.fillStyle = '#fff4e0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#b8485e'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
    c.fillStyle = '#b8485e'; c.font = 'bold 34px Georgia, serif'; c.textAlign = 'center'; c.fillText('OPEN', w / 2, 44);
  });
  const closedTex = canvasTex(128, 64, (c, w, h) => {
    c.fillStyle = '#2b2d36'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8d939c'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
    c.fillStyle = '#e9d8b4'; c.font = 'bold 26px Georgia, serif'; c.textAlign = 'center'; c.fillText('CLOSED', w / 2, 34); c.font = '13px Georgia, serif'; c.fillText('back at 6am', w / 2, 52);
  });
  const openSignM = smat({ map: openTex, side: THREE.DoubleSide });
  { const sign = mesh(new THREE.PlaneGeometry(0.62, 0.31), openSignM, 4.76, 0.78, 2.85, false); sign.rotation.y = PI / 2; scene.add(sign); }
  let signOpen = true;
  function syncOpenSign(s) {
    const open = G.customersPerHour(s, s.clock) >= 3;
    if (open === signOpen) return;
    signOpen = open; openSignM.map = open ? openTex : closedTex; openSignM.needsUpdate = true;
  }
  // A chalkboard A-board on the pavement by the door
  const boardTex = canvasTex(96, 128, (c, w, h) => {
    c.fillStyle = '#2b3a34'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a07a52'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
    c.fillStyle = '#f4efe2'; c.textAlign = 'center'; c.font = 'bold 20px Georgia, serif'; c.fillText('Fresh', w / 2, 40); c.fillText('bread', w / 2, 62);
    c.font = '14px Georgia, serif'; c.fillText('baked today', w / 2, 88); c.fillStyle = '#ffd447'; c.fillText('★ ★ ★', w / 2, 110);
  });
  {
    const ab = new THREE.Group();
    for (const sgn of [1, -1]) {
      const leaf = new THREE.Group(); leaf.rotation.x = sgn * 0.22;
      leaf.add(box(0.5, 0.75, 0.03, '#7a4a2e', 0, 0, 0));
      const face = mesh(new THREE.PlaneGeometry(0.42, 0.62), smat({ map: boardTex }), 0, 0.38, sgn * 0.02, false);
      if (sgn < 0) face.rotation.y = PI;
      leaf.add(face); leaf.position.z = sgn * 0.09; ab.add(leaf);
    }
    ab.position.set(5.5, -0.09, 4.95); ab.rotation.y = PI / 4; statics.add(ab);
  }
  // The shop's street lamp, by the kerb next to the doorway
  statics.add(cyl(0.05, 0.08, 2.9, '#2b2d36', 9.15, -0.09, 2.95, 10));
  statics.add(box(0.5, 0.06, 0.06, '#2b2d36', 8.93, 2.76, 2.95));
  const lampM = smat({ color: '#fff1cc', emissive: '#ffd27a', emissiveIntensity: 0.4 });
  lampGlows.push(lampM);
  statics.add(sphere(0.13, lampM, 8.7, 2.65, 2.95, false));
  // String lights along the top of the shop's back wall
  for (let k = 0; k < 13; k++) {
    const x = -4.2 + k * 0.7;
    const y = 2.82 - Math.sin((k % 4) / 4 * PI) * 0.12;
    const bm = smat({ color: '#fff3d6', emissive: ['#ffcf7a', '#ff9fb2', '#9fe1ff'][k % 3], emissiveIntensity: 0.6 });
    glowMats.push(bm); statics.add(sphere(0.045, bm, x, y, -4.43, false));
  }
  // Back alley behind the back door (the street paints the paving)
  statics.add(box(1.0, 0.85, 1.45, '#3f6b4f', -13.2, 0, -2.5));
  statics.add(box(1.06, 0.08, 1.5, '#2f5240', -13.2, 0.85, -2.5));
  for (const [x, z, r] of [[-12.5, -1.4, 0.24], [-12.75, -1.15, 0.2], [-13.3, 0.4, 0.22]]) { const b = sphere(r, '#1c1c22', x, r * 0.8, z); b.scale.y = 0.85; statics.add(b); }
  statics.add(box(0.12, 0.24, 0.2, '#2b2d36', -7.9, 2.45, 2.95));
  const alleyM = smat({ color: '#ffe2b0', emissive: '#ffb05a', emissiveIntensity: 0.4 });
  lampGlows.push(alleyM);
  statics.add(sphere(0.08, alleyM, -8.03, 2.45, 2.95, false));

  worldUV(statics, isBackWall);
  scene.add(mergeStatic(texturize(statics)));
  const hood = buildWorld(scene);

  // ---------- Design: floor tiles, wallpaper, decorations, wall art, terraces ----------
  const seeded = seed => { let t = seed >>> 0; return () => { t = (t * 1664525 + 1013904223) >>> 0; return t / 4294967296; }; };
  const TS = 64; // pixels per floor square / wall panel width

  function drawTile(c, x, y, S, style, cx, cz) {
    const [a, b] = (D.FLOORS[style] || D.FLOORS.checker).colors;
    const r = seeded((cx + 3) * 7919 + (cz + 5) * 104729);
    c.save(); c.beginPath(); c.rect(x, y, S, S); c.clip();
    c.fillStyle = a; c.fillRect(x, y, S, S);
    if (style === 'checker') { c.fillStyle = (cx + cz) % 2 ? b : a; c.fillRect(x, y, S, S); }
    else if (style === 'cracked') {
      c.fillStyle = (cx + cz) % 2 ? '#cbbda6' : a; c.fillRect(x, y, S, S);
      c.strokeStyle = b; c.lineWidth = 1.6;
      for (let k = 0; k < 2; k++) { let px = x + r() * S, py = y; c.beginPath(); c.moveTo(px, py); for (let j = 0; j < 5; j++) { px += (r() - 0.5) * S * 0.5; py += S / 5; c.lineTo(px, py); } c.stroke(); }
      c.fillStyle = 'rgba(60,50,40,0.25)'; c.beginPath(); c.arc(x + r() * S, y + r() * S, 4 + r() * 5, 0, PI * 2); c.fill();
    }
    else if (style === 'lemon') { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? b : a; c.fillRect(x + i * S / 4, y + j * S / 4, S / 4, S / 4); } }
    else if (style === 'navy') { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 3 === 0 || (i * j) % 7 === 3) { c.fillStyle = b; c.fillRect(x + i * S / 8 + 1, y + j * S / 8 + 1, S / 8 - 2, S / 8 - 2); } }
    else if (style === 'wood') {
      for (let k = 0; k < 4; k++) {
        c.fillStyle = k % 2 ? a : b; c.globalAlpha = 0.55 + r() * 0.3; c.fillRect(x, y + k * S / 4, S, S / 4); c.globalAlpha = 1;
        c.fillStyle = 'rgba(60,30,10,0.35)'; c.fillRect(x, y + k * S / 4, S, 1); c.fillRect(x + r() * S, y + k * S / 4, 1, S / 4);
      }
    } else if (style === 'herring') {
      c.strokeStyle = b; c.lineWidth = 2;
      for (let k = -S; k < S * 2; k += S / 4) { c.beginPath(); for (let i = 0; i <= 8; i++) c.lineTo(x + k + (i % 2 ? S / 8 : 0), y + i * S / 8); c.stroke(); }
      c.strokeStyle = 'rgba(60,30,10,0.25)'; c.lineWidth = 1;
      for (let j = 0; j < 8; j++) { c.beginPath(); c.moveTo(x, y + j * S / 8); c.lineTo(x + S, y + j * S / 8); c.stroke(); }
    } else if (style === 'marble') {
      c.strokeStyle = b; c.lineWidth = 1.4; c.globalAlpha = 0.7;
      for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x + r() * S, y); c.bezierCurveTo(x + r() * S, y + S * 0.3, x + r() * S, y + S * 0.6, x + r() * S, y + S); c.stroke(); }
      c.globalAlpha = 1;
    } else { // plain tiles with grout: mint, rose, terracotta, stone
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { c.fillStyle = r() < 0.5 ? a : b; c.globalAlpha = 0.35; c.fillRect(x + i * S / 2, y + j * S / 2, S / 2, S / 2); c.globalAlpha = 1; }
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x + S / 2 - 1, y, 2, S); c.fillRect(x, y + S / 2 - 1, S, 2);
    }
    c.strokeStyle = 'rgba(0,0,0,0.14)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);
    c.restore();
  }
  function drawPanel(c, x, y, W, H, style, idx) {
    const [a, b] = (D.WALLS[style] || D.WALLS.plaster).colors;
    const r = seeded(idx * 31337 + 7);
    c.save(); c.beginPath(); c.rect(x, y, W, H); c.clip();
    c.fillStyle = a; c.fillRect(x, y, W, H);
    if (style === 'torn') {
      c.fillStyle = b; c.fillRect(x, y, W, H);
      c.fillStyle = a;
      for (let k = 0; k < 4; k++) { const sx = x + r() * W * 0.6, sy = y + r() * H * 0.6; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 14 + r() * 20, sy + r() * 8); c.lineTo(sx + 10 + r() * 16, sy + 20 + r() * 30); c.lineTo(sx - 4, sy + 16 + r() * 20); c.closePath(); c.fill(); }
      c.strokeStyle = 'rgba(40,30,20,0.4)'; c.lineWidth = 1; c.strokeRect(x + 2, y + H * 0.7, W - 4, 2);
    }
    else if (style === 'plaster') { for (let i = 0; i < 60; i++) { c.fillStyle = 'rgba(160,100,60,0.06)'; c.fillRect(x + r() * W, y + r() * H, 2, 2); } }
    else if (style === 'tiles') { c.strokeStyle = b; c.lineWidth = 1.5; for (let j = 0; j < 8; j++) { c.beginPath(); c.moveTo(x, y + j * H / 8); c.lineTo(x + W, y + j * H / 8); c.stroke(); for (let i = 0; i < 3; i++) { const xx = x + i * W / 2 + (j % 2 ? W / 4 : 0); c.beginPath(); c.moveTo(xx, y + j * H / 8); c.lineTo(xx, y + (j + 1) * H / 8); c.stroke(); } } }
    else if (style === 'stripes' || style === 'lemon') { c.fillStyle = b; for (let i = 0; i < 8; i += 2) c.fillRect(x + i * W / 8, y, W / 8, H); }
    else if (style === 'mintdot') { c.fillStyle = b; for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + i * 16 + (j % 2 ? 16 : 8), y + j * 16 + 8, 3.5, 0, PI * 2); c.fill(); } }
    else if (style === 'wood') { c.fillStyle = b; for (let i = 1; i < 4; i++) c.fillRect(x + i * W / 4 - 1, y, 2, H); c.fillRect(x, y + H * 0.45, W, 3); }
    else if (style === 'brick') { c.fillStyle = b; for (let j = 0; j <= 12; j++) { c.fillRect(x, y + j * H / 12, W, 2); for (let i = 0; i < 3; i++) c.fillRect(x + i * W / 2.5 + (j % 2 ? W / 5 : 0), y + j * H / 12, 2, H / 12); } }
    else if (style === 'sky') { c.fillStyle = b; for (let k = 0; k < 3; k++) { const cx = x + r() * W, cy = y + 15 + r() * (H - 30); for (const [dx, dy, rr] of [[0, 0, 8], [8, 2, 6], [-8, 3, 6], [3, -5, 6]]) { c.beginPath(); c.arc(cx + dx, cy + dy, rr, 0, PI * 2); c.fill(); } } }
    else if (style === 'damask') { c.fillStyle = b; for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) { const cx = x + i * 32 + (j % 2 ? 32 : 16), cy = y + j * 32 + 16; c.beginPath(); c.ellipse(cx, cy, 7, 12, 0, 0, PI * 2); c.fill(); c.beginPath(); c.ellipse(cx, cy, 12, 4, 0, 0, PI * 2); c.fill(); } }
    c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(x + W - 1, y, 1, H);
    c.restore();
  }
  function canvasOf(w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { cv, ctx: cv.getContext('2d'), tex };
  }
  function flatPlane(w, d, material, x, y, z) {
    const m = mesh(new THREE.PlaneGeometry(w, d), material, x, y, z, false);
    m.rotation.x = -PI / 2; return m;
  }

  // Floors you can tile: inside (9x9), front terrace (9x2), side terrace (2x7)
  const floorIn = canvasOf(9 * TS, 9 * TS), floorFront = canvasOf(9 * TS, 2 * TS), floorSide = canvasOf(2 * TS, 7 * TS);
  const shopFloor = flatPlane(9, 9, smat({ map: floorIn.tex }), 0, 0.001, 0); scene.add(shopFloor);
  const frontTerrace = new THREE.Group(), sideTerrace = new THREE.Group();
  const deckM = mat('#bdb5a8'), railM = mat('#2b2d36', { roughness: 0.3, metalness: 0.4 });
  frontTerrace.add(box(9.0, 0.09, 2.0, deckM, 0, -0.09, 5.75, false));
  frontTerrace.add(flatPlane(9, 2, smat({ map: floorFront.tex }), 0, 0.002, 5.75));
  sideTerrace.add(box(2.0, 0.09, 7.0, deckM, 5.75, -0.09, -1.0, false));
  sideTerrace.add(flatPlane(2, 7, smat({ map: floorSide.tex }), 5.75, 0.002, -1.0));
  function railing(group, x0, z0, x1, z1) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 0.9));
    for (let i = 0; i <= n; i++) group.add(box(0.06, 0.75, 0.06, railM, x0 + (x1 - x0) * i / n, 0, z0 + (z1 - z0) * i / n));
    const rail = box(len, 0.05, 0.07, railM, (x0 + x1) / 2, 0.72, (z0 + z1) / 2);
    rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0); group.add(rail);
  }
  railing(frontTerrace, -4.5, 6.78, 4.5, 6.78); railing(frontTerrace, -4.5, 4.75, -4.5, 6.78); railing(frontTerrace, 4.5, 4.75, 4.5, 6.78);
  railing(sideTerrace, 6.78, -4.5, 6.78, 2.55); railing(sideTerrace, 4.75, 2.55, 6.78, 2.55); railing(sideTerrace, 4.75, -4.5, 6.78, -4.5);
  frontTerrace.visible = sideTerrace.visible = false;
  scene.add(frontTerrace, sideTerrace);

  // Wallpaper on the shop's back wall and on the partition (left wall)
  const wallBack = canvasOf(9 * TS, 2 * TS), wallLeft = canvasOf(9 * TS, 2 * TS);
  const backPaper = mesh(new THREE.PlaneGeometry(9, 2), smat({ map: wallBack.tex }), 0, 2.0, -4.495, false);
  scene.add(backPaper);
  const leftPaper = mesh(new THREE.PlaneGeometry(9, 2), smat({ map: wallLeft.tex, transparent: true, alphaTest: 0.5 }), -4.495, 2.0, 0, false);
  leftPaper.rotation.y = PI / 2; partition.add(leftPaper);

  function paintDesign(s) {
    for (let cx = 0; cx < 9; cx++) for (let cz = 0; cz < 9; cz++) drawTile(floorIn.ctx, cx * TS, cz * TS, TS, D.floorAt(s, cx, cz), cx, cz);
    for (let cx = 0; cx < 9; cx++) for (let cz = 9; cz <= 10; cz++) drawTile(floorFront.ctx, cx * TS, (cz - 9) * TS, TS, D.floorAt(s, cx, cz), cx, cz);
    for (let cx = 9; cx <= 10; cx++) for (let cz = 0; cz <= 6; cz++) drawTile(floorSide.ctx, (cx - 9) * TS, cz * TS, TS, D.floorAt(s, cx, cz), cx, cz);
    for (let i = 0; i < 9; i++) drawPanel(wallBack.ctx, i * TS, 0, TS, 2 * TS, D.wallAt(s, 'b' + i), i);
    // The left wall's canvas runs from z = +4.5 (left edge) to z = -4.5, so panel l_j sits at column 8 - j
    wallLeft.ctx.clearRect(0, 0, 9 * TS, 2 * TS);
    for (let j = 0; j < 9; j++) drawPanel(wallLeft.ctx, (8 - j) * TS, 0, TS, 2 * TS, D.wallAt(s, 'l' + j), 20 + j);
    wallLeft.ctx.clearRect((4.5 - 3.65) * TS, (3 - 2.1) * TS, 1.1 * TS, 1.1 * TS); // the doorway
    for (const t of [floorIn, floorFront, floorSide, wallBack, wallLeft]) t.tex.needsUpdate = true;
  }

  // Decorations and wall art
  const lampShadeM = smat({ color: '#fff3d6', emissive: '#ffd59a', emissiveIntensity: 0.6 }); glowMats.push(lampShadeM);
  const fountainWater = smat({ color: '#6fb8e0', roughness: 0.1, transparent: true, opacity: 0.85 });
  function chair(g, x, z, ry) {
    const c = new THREE.Group();
    c.add(box(0.32, 0.05, 0.32, '#a8703f', 0, 0.42, 0)); c.add(box(0.32, 0.36, 0.05, '#a8703f', 0, 0.47, -0.15));
    for (const [dx, dz] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) c.add(box(0.04, 0.42, 0.04, '#2b2d36', dx, 0, dz));
    c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
  }
  function decorModel(type) {
    const g = new THREE.Group();
    if (type === 'plant') {
      g.add(cyl(0.2, 0.15, 0.35, tmat('#c96f4a', 'stone'), 0, 0, 0, 12));
      for (const [dx, dy, dz, r] of [[0, 0.55, 0, 0.26], [0.12, 0.72, 0.05, 0.18], [-0.12, 0.68, -0.06, 0.2]]) g.add(sphere(r, tmat('#4f9a5a', 'leaf'), dx, dy, dz));
    } else if (type === 'ficus') {
      g.add(cyl(0.22, 0.17, 0.4, '#e8e2d6', 0, 0, 0, 12)); g.add(cyl(0.04, 0.05, 0.85, tmat('#7a5534', 'bark'), 0, 0.4, 0, 6));
      const c1 = mesh(geo('ico45', () => new THREE.IcosahedronGeometry(0.45, 0)), tmat('#4f8f48', 'leaf', { flatShading: true }), 0, 1.4, 0); g.add(c1);
      g.add(mesh(geo('ico3', () => new THREE.IcosahedronGeometry(0.3, 0)), tmat('#6aab57', 'leaf', { flatShading: true }), 0.18, 1.05, 0.1));
    } else if (type === 'flowers') {
      g.add(cyl(0.12, 0.16, 0.6, '#f4f0e8', 0, 0, 0, 10)); g.add(cyl(0.12, 0.09, 0.25, '#4f9de8', 0, 0.6, 0, 10));
      for (const [dx, dz, c] of [[0, 0, '#ff7eb6'], [0.1, 0.06, '#ffd447'], [-0.09, 0.05, '#ffffff'], [0.03, -0.1, '#ff5d6c'], [-0.06, -0.06, '#b58cff']]) g.add(sphere(0.07, c, dx, 0.95 + Math.abs(dx) * 0.5, dz));
    } else if (type === 'rug') {
      g.add(cyl(0.46, 0.46, 0.02, tmat('#9b6bff', 'fabric'), 0, 0, 0, 24, false)); g.add(cyl(0.32, 0.32, 0.025, tmat('#ffd6de', 'fabric'), 0, 0, 0, 24, false));
    } else if (type === 'lamp') {
      g.add(cyl(0.16, 0.18, 0.05, '#2b2d36', 0, 0, 0, 12)); g.add(cyl(0.025, 0.025, 1.4, '#2b2d36', 0, 0.05, 0, 6));
      g.add(mesh(geo('lshade', () => new THREE.CylinderGeometry(0.16, 0.26, 0.3, 14, 1, true)), lampShadeM, 0, 1.55, 0));
    } else if (type === 'bench') {
      g.add(box(1.0, 0.07, 0.4, '#a8703f', 0, 0.4, 0)); g.add(box(1.0, 0.34, 0.06, '#a8703f', 0, 0.5, -0.2));
      for (const dx of [-0.42, 0.42]) g.add(box(0.07, 0.4, 0.36, '#2b2d36', dx, 0, 0));
    } else if (type === 'table' || type === 'parasol') {
      g.add(cyl(0.36, 0.36, 0.04, '#f4f0e8', 0, 0.7, 0, 18)); g.add(cyl(0.04, 0.06, 0.7, '#3a3d44', 0, 0, 0, 8)); g.add(cyl(0.2, 0.2, 0.03, '#3a3d44', 0, 0, 0, 12));
      g.add(cyl(0.05, 0.04, 0.08, '#ffffff', 0.1, 0.74, 0.05, 10));
      chair(g, -0.55, 0, PI / 2); chair(g, 0.55, 0, -PI / 2);
      if (type === 'parasol') {
        g.add(cyl(0.025, 0.025, 1.9, '#dddddd', 0, 0.74, 0, 6));
        g.add(mesh(geo('para', () => new THREE.ConeGeometry(0.95, 0.35, 8)), tmat('#e85d75', 'fabric'), 0, 2.6, 0));
      }
    } else if (type === 'breadrack') {
      for (const dx of [-0.38, 0.38]) g.add(box(0.05, 1.4, 0.35, '#8a5a32', dx, 0, 0));
      for (const y of [0.3, 0.75, 1.2]) g.add(box(0.8, 0.04, 0.35, '#a8703f', 0, y, 0));
      const order = ['sourdough', 'croissant', 'bun'];
      [0.3, 0.75, 1.2].forEach((y, row) => { for (let k = 0; k < 3; k++) { const it = itemModel(order[row]); it.position.set(-0.24 + k * 0.24, y + 0.04, 0); it.scale.setScalar(1.3); g.add(it); } });
    } else if (type === 'clock') {
      g.add(box(0.42, 1.75, 0.3, '#7a4a2e', 0, 0, 0)); g.add(box(0.48, 0.1, 0.34, '#5c3520', 0, 1.75, 0));
      const face = cyl(0.15, 0.15, 0.03, '#fff8e8', 0, 1.42, 0.16, 18); face.rotation.x = PI / 2; face.position.y = 1.42; g.add(face);
      g.add(box(0.015, 0.11, 0.01, '#222', 0, 1.42, 0.18)); g.add(box(0.08, 0.015, 0.01, '#222', 0.03, 1.42, 0.18));
      g.add(box(0.26, 0.7, 0.02, '#3a2416', 0, 0.35, 0.16)); g.add(sphere(0.07, mat('#d4af37', { roughness: 0.3, metalness: 0.5 }), 0, 0.55, 0.18, false));
    } else if (type === 'cake') {
      g.add(cyl(0.3, 0.3, 0.72, '#f4f0e8', 0, 0, 0, 16)); g.add(cyl(0.05, 0.08, 0.12, '#dfe3ea', 0, 0.72, 0, 10));
      g.add(cyl(0.24, 0.24, 0.16, '#ffd6de', 0, 0.84, 0, 18)); g.add(cyl(0.18, 0.18, 0.14, '#ffffff', 0, 1.0, 0, 18)); g.add(cyl(0.12, 0.12, 0.12, '#ff9fb2', 0, 1.14, 0, 18));
      g.add(sphere(0.04, '#e2394b', 0, 1.3, 0));
    } else if (type === 'cat') {
      g.add(cyl(0.32, 0.32, 0.08, tmat('#b8485e', 'fabric'), 0, 0, 0, 18));
      const furM = tmat('#f0a050', 'fur');
      const body = sphere(0.2, furM, 0, 0.22, 0); body.scale.set(1.35, 0.7, 0.95); g.add(body);
      g.add(sphere(0.13, furM, 0.25, 0.33, 0));
      for (const dz of [-0.06, 0.06]) { const ear = mesh(geo('ear', () => new THREE.ConeGeometry(0.045, 0.09, 4)), furM, 0.27, 0.46, dz); g.add(ear); }
      const tail = mesh(geo('tail', () => new THREE.TorusGeometry(0.16, 0.04, 6, 10, PI)), furM, -0.2, 0.15, 0); tail.rotation.x = PI / 2; g.add(tail);
    } else if (type === 'fountain') {
      g.add(cyl(0.48, 0.52, 0.32, '#d9d3c8', 0, 0, 0, 18)); g.add(cyl(0.42, 0.42, 0.02, fountainWater, 0, 0.29, 0, 18, false));
      g.add(cyl(0.08, 0.1, 0.55, '#d9d3c8', 0, 0.3, 0, 10)); g.add(cyl(0.22, 0.12, 0.1, '#d9d3c8', 0, 0.85, 0, 14));
      g.add(sphere(0.07, fountainWater, 0, 1.0, 0, false));
    } else if (type === 'sacks') {
      for (const [x, z] of [[-0.15, 0.05], [0.2, -0.05]]) { const sk = sphere(0.28, tmat('#e9dcc1', 'fabric'), x, 0.27, z); sk.scale.set(1, 1.1, 0.8); g.add(sk); }
    } else if (type === 'crates') {
      for (const [x, y, z] of [[-0.2, 0, 0], [0.2, 0, 0.05], [0, 0.32, 0]]) g.add(box(0.38, 0.3, 0.34, '#c9a46a', x, y, z));
    } else if (type === 'sofa' || type === 'goldsofa') {
      const c = tmat(type === 'goldsofa' ? '#8a1f4a' : '#5a4a6a', type === 'goldsofa' ? 'velvet' : 'fabric');
      g.add(box(1.1, 0.4, 0.55, c, 0, 0, 0)); g.add(box(1.1, 0.45, 0.15, c, 0, 0.4, -0.22));
      for (const dx of [-0.5, 0.5]) g.add(box(0.12, 0.25, 0.55, c, dx, 0.4, 0));
      if (type === 'goldsofa') g.add(box(1.14, 0.04, 0.6, mat('#d4af37', { metalness: 0.6, roughness: 0.3 }), 0, 0.4, 0));
    } else if (type === 'tv' || type === 'cctv') {
      g.add(box(0.7, 0.5, 0.4, '#2b2d36', 0, 0, 0));
      const screenM = emissiveMat('#0d1420', type === 'cctv' ? '#5fd38d' : '#6fb8e0');
      if (type === 'cctv') for (let k = 0; k < 4; k++) g.add(box(0.3, 0.22, 0.03, screenM, -0.16 + (k % 2) * 0.32, 0.6 + Math.floor(k / 2) * 0.26, 0.05));
      else g.add(box(1.0, 0.6, 0.05, screenM, 0, 0.55, 0.05));
    } else if (type === 'shelving') {
      const shelfM = tmat('#8d939c', 'metal');
      for (const dx of [-0.45, 0.45]) g.add(box(0.05, 1.6, 0.4, shelfM, dx, 0, 0));
      for (const y of [0.25, 0.75, 1.25]) { g.add(box(0.9, 0.04, 0.4, shelfM, 0, y, 0)); for (let k = 0; k < 3; k++) { const sk = sphere(0.14, tmat('#e9dcc1', 'fabric'), -0.28 + k * 0.28, y + 0.16, 0); sk.scale.set(1, 0.9, 0.8); g.add(sk); } }
    } else if (type === 'pooltable') {
      g.add(box(1.4, 0.7, 0.8, tmat('#5a3520', 'wood'), 0, 0, 0)); g.add(box(1.3, 0.04, 0.7, tmat('#2f7a4a', 'fabric'), 0, 0.71, 0));
      for (const [x, z, c] of [[0.2, 0.1, '#ffffff'], [-0.3, -0.1, '#e8c02b'], [-0.35, 0.1, '#c8323c']]) g.add(sphere(0.04, c, x, 0.77, z));
    } else if (type === 'fishtank') {
      g.add(box(1.0, 0.6, 0.4, tmat('#2b2d36', 'wood'), 0, 0, 0));
      g.add(box(0.95, 0.55, 0.38, smat({ color: '#6fb8e0', transparent: true, opacity: 0.45, roughness: 0.1 }), 0, 0.6, 0, false));
      for (const [x, y, c] of [[-0.2, 0.85, '#ff9a3d'], [0.15, 0.75, '#ffd447']]) { const f = sphere(0.05, c, x, y, 0); f.scale.set(1.6, 1, 0.6); g.add(f); }
    } else if (type === 'fakewall' || type === 'steeldoor' || type === 'panicroom') {
      const c = type === 'fakewall' ? tmat('#41464f', 'block') : tmat('#6b7079', 'metal', { metalness: 0.4, roughness: 0.4 });
      g.add(box(0.95, 2.0, 0.25, c, 0, 0, 0));
      if (type !== 'fakewall') { g.add(box(0.06, 0.06, 0.06, '#d4af37', 0.3, 1.0, 0.14)); for (const y of [0.4, 1.6]) g.add(box(0.9, 0.05, 0.27, '#4a4d54', 0, y, 0)); }
    } else if (type === 'piano') {
      // An upright piano, its lid open on the keys, and a stool
      const woodM = tmat('#3a2416', 'wood', { roughness: 0.4 });
      g.add(box(1.0, 1.15, 0.42, woodM, 0, 0, -0.12)); g.add(box(1.04, 0.05, 0.46, woodM, 0, 1.15, -0.12));
      g.add(box(1.0, 0.07, 0.26, woodM, 0, 0.7, 0.2)); g.add(box(0.94, 0.03, 0.17, tmat('#f8f4ea', 'none'), 0, 0.77, 0.23));
      for (let k = 0; k < 9; k++) if (k % 3 !== 2) g.add(box(0.04, 0.025, 0.09, '#1b1b1f', -0.4 + k * 0.1, 0.8, 0.2));
      for (const dx of [-0.46, 0.46]) g.add(box(0.06, 0.7, 0.3, woodM, dx, 0, 0.18));
      g.add(box(0.5, 0.12, 0.08, tmat('#f4ead2', 'card'), 0, 0.92, 0.1)); // music on the stand
      g.add(box(0.5, 0.06, 0.3, tmat('#5a1f2a', 'velvet'), 0, 0.45, 0.48));
      for (const dx of [-0.2, 0.2]) g.add(box(0.05, 0.45, 0.05, woodM, dx, 0, 0.48));
    } else if (type === 'jukebox' || type === 'jukeboxb') {
      const bodyM = tmat('#7a2f2a', 'wood', { roughness: 0.4 }), chrome = tmat('#d8dde4', 'metal', { metalness: 0.6, roughness: 0.25 });
      const glowA = smat({ color: '#ffb347', emissive: '#ff8a2a', emissiveIntensity: 0.9 }), glowB = smat({ color: '#9fe1ff', emissive: '#4fb8ff', emissiveIntensity: 0.9 });
      g.add(box(0.72, 1.15, 0.5, bodyM, 0, 0, 0));
      const top = cyl(0.36, 0.36, 0.5, bodyM, 0, 0, 0, 20); top.rotation.x = PI / 2; top.position.set(0, 1.15, 0); g.add(top);
      const arch = mesh(geo('jbArch', () => new THREE.TorusGeometry(0.3, 0.035, 8, 20, PI)), glowA, 0, 1.15, 0.26); g.add(arch);
      g.add(box(0.5, 0.36, 0.02, smat({ color: '#2b1d14', emissive: '#ffcf7a', emissiveIntensity: 0.5 }), 0, 0.72, 0.25));
      for (const dx of [-0.3, 0.3]) g.add(box(0.05, 1.05, 0.03, glowB, dx, 0.05, 0.25));
      g.add(box(0.6, 0.08, 0.04, chrome, 0, 0.6, 0.26)); g.add(box(0.4, 0.22, 0.03, '#2b2d36', 0, 0.2, 0.25));
      for (let k = 0; k < 5; k++) g.add(box(0.03, 0.18, 0.02, chrome, -0.12 + k * 0.06, 0.22, 0.27));
    } else if (type === 'aquarium') {
      g.add(box(1.0, 0.7, 0.42, tmat('#5a3a24', 'wood'), 0, 0, 0)); g.add(box(0.9, 0.02, 0.02, '#2b2d36', 0, 0.35, 0.21));
      g.add(box(0.98, 0.06, 0.42, '#2b2d36', 0, 0.7, 0));
      g.add(box(0.94, 0.55, 0.38, smat({ color: '#6fb8e0', transparent: true, opacity: 0.4, roughness: 0.1 }), 0, 0.76, 0, false));
      g.add(box(0.92, 0.06, 0.36, tmat('#e9d9b0', 'stone'), 0, 0.76, 0)); // sand
      for (const [x, h] of [[-0.32, 0.36], [-0.24, 0.26], [0.34, 0.3]]) g.add(box(0.03, h, 0.03, '#3f9a4a', x, 0.82, -0.05));
      g.add(box(0.98, 0.06, 0.42, '#2b2d36', 0, 1.31, 0));
      for (const [x, y, c] of [[-0.2, 1.05, '#ff9a3d'], [0.15, 0.95, '#ffd447'], [0.05, 1.15, '#4f9de8']]) { const f = sphere(0.045, c, x, y, 0); f.scale.set(1.6, 1, 0.6); g.add(f); }
    } else if (type === 'bookcase') {
      const woodM = tmat('#6b4226', 'wood');
      for (const dx of [-0.44, 0.44]) g.add(box(0.05, 1.9, 0.36, woodM, dx, 0, 0));
      g.add(box(0.93, 1.9, 0.03, woodM, 0, 0, -0.17));
      const r = seeded(4242), cols = ['#8a1f2a', '#1f4a8a', '#2f6f4f', '#c9a24a', '#5a3a6a', '#e8dcc0', '#3a3d44'];
      for (const y of [0, 0.47, 0.94, 1.41, 1.86]) g.add(box(0.88, 0.04, 0.34, woodM, 0, y, 0));
      for (const y of [0.04, 0.51, 0.98, 1.45]) { let x = -0.4; while (x < 0.38) { const w = 0.04 + r() * 0.04, h = 0.26 + r() * 0.14; g.add(box(w, h, 0.24, tmat(cols[Math.floor(r() * cols.length)], 'card'), x + w / 2, y, 0.02)); x += w + 0.008; } }
    } else if (type === 'arcade' || type === 'arcadeb') {
      const bodyM = tmat(type === 'arcade' ? '#2b3a8a' : '#3a2b5a', 'none', { roughness: 0.5 });
      const scr = smat({ color: '#0d1420', emissive: '#5fd3ff', emissiveIntensity: 0.8 }), marq = smat({ color: '#ffd447', emissive: '#ff8a2a', emissiveIntensity: 1 });
      g.add(box(0.62, 0.9, 0.62, bodyM, 0, 0, 0));
      const panel = box(0.62, 0.06, 0.3, '#2b2d36', 0, 0, 0); panel.position.set(0, 0.92, 0.22); panel.rotation.x = 0.25; g.add(panel);
      for (const [x, c] of [[-0.15, '#e85d75'], [0.08, '#5fcf8a'], [0.17, '#ffd447']]) g.add(sphere(0.03, c, x, 0.97, 0.24));
      g.add(box(0.62, 0.75, 0.42, bodyM, 0, 0.9, -0.1));
      const s = box(0.5, 0.4, 0.02, scr, 0, 0, 0); s.position.set(0, 1.08, 0.12); s.rotation.x = -0.2; g.add(s);
      g.add(box(0.62, 0.2, 0.46, marq, 0, 1.65, -0.08));
      const trimGlow = smat({ color: '#ff4fa3', emissive: '#ff4fa3', emissiveIntensity: 0.6 });
      for (const dx of [-0.315, 0.315]) { g.add(box(0.02, 0.9, 0.03, trimGlow, dx, 0, 0.31)); g.add(box(0.02, 0.85, 0.03, trimGlow, dx, 0.9, 0.11)); }
    } else if (type === 'palm') {
      g.add(cyl(0.26, 0.2, 0.42, tmat('#c96f4a', 'stone'), 0, 0, 0, 12));
      const barkM = tmat('#8a6a46', 'bark');
      for (let k = 0; k < 6; k++) { const seg = cyl(0.07 - k * 0.006, 0.085 - k * 0.006, 0.3, barkM, Math.sin(k * 0.5) * 0.04, 0.4 + k * 0.28, 0, 8); seg.rotation.z = 0.04 * k; g.add(seg); }
      const leafM = tmat('#3f8f3a', 'leaf', { side: THREE.DoubleSide });
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * PI * 2, fr = mesh(geo('frond', () => { const gg = new THREE.PlaneGeometry(0.22, 0.95, 1, 4); const p = gg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.475; p.setZ(i, -y * y * 0.35); p.setX(i, p.getX(i) * (1 - y * 0.8)); } gg.computeVertexNormals(); gg.translate(0, 0.475, 0); return gg; }), leafM, 0.2, 2.1, 0);
        fr.position.set(0.12, 2.12, 0); fr.rotation.set(-1.0, a, 0, 'YXZ'); g.add(fr);
      }
      for (const [dx, dz] of [[0.18, 0.05], [0.08, -0.08]]) g.add(sphere(0.06, '#6b4a2a', dx, 2.02, dz));
    } else if (type === 'statue' || type === 'rosastatue') {
      const rosa = type === 'rosastatue', stoneM = tmat(rosa ? '#d8d0c2' : '#b9b3a8', 'stone'), plinthM = tmat('#9d968a', 'stone');
      g.add(box(0.7, 0.5, 0.7, plinthM, 0, 0, 0)); g.add(box(0.76, 0.08, 0.76, plinthM, 0, 0.5, 0));
      if (rosa) {
        g.add(box(0.36, 0.12, 0.02, tmat('#d4af37', 'metal', { metalness: 0.6, roughness: 0.3 }), 0, 0.2, 0.36)); // her plaque
        g.add(cyl(0.16, 0.28, 0.75, stoneM, 0, 0.58, 0, 14)); // skirt and apron
        g.add(box(0.26, 0.5, 0.04, stoneM, 0, 0.66, 0.2));
        g.add(cyl(0.12, 0.16, 0.38, stoneM, 0, 1.33, 0, 12));
        g.add(sphere(0.12, stoneM, 0, 1.83, 0)); g.add(sphere(0.07, stoneM, 0, 1.94, -0.08)); // head and her bun
        for (const dx of [-0.17, 0.17]) { const arm = cyl(0.04, 0.045, 0.42, stoneM, dx, 1.3, 0.05, 8); arm.rotation.x = -0.6; g.add(arm); }
        g.add(cyl(0.11, 0.09, 0.08, stoneM, 0, 1.38, 0.3, 12)); // holding a loaf up
      } else {
        g.add(cyl(0.13, 0.17, 0.7, stoneM, 0, 0.58, 0, 12));
        g.add(sphere(0.13, stoneM, 0, 1.42, 0));
        const arm = cyl(0.04, 0.045, 0.45, stoneM, 0.17, 1.0, 0, 8); arm.rotation.z = -0.9; g.add(arm);
        g.add(cyl(0.04, 0.045, 0.4, stoneM, -0.16, 0.9, 0, 8));
        const cloak = box(0.36, 0.6, 0.06, stoneM, 0, 0.62, -0.13); cloak.rotation.x = 0.1; g.add(cloak);
      }
    } else if (type === 'teddy') {
      const furM = tmat('#b07a48', 'fur'), padM = tmat('#e8c9a0', 'fabric');
      const body = sphere(0.32, furM, 0, 0.42, 0); body.scale.set(1, 1.1, 0.9); g.add(body);
      g.add(sphere(0.17, padM, 0, 0.4, 0.2));
      g.add(sphere(0.25, furM, 0, 0.95, 0.02));
      for (const dx of [-0.19, 0.19]) { g.add(sphere(0.09, furM, dx, 1.16, 0)); g.add(sphere(0.12, furM, dx * 1.6, 0.55, 0.06)); const leg = sphere(0.14, furM, dx * 1.1, 0.12, 0.22); leg.scale.set(1, 0.8, 1.3); g.add(leg); g.add(sphere(0.07, padM, dx * 1.1, 0.12, 0.38)); }
      g.add(sphere(0.09, padM, 0, 0.9, 0.22));
      for (const dx of [-0.08, 0.08]) g.add(sphere(0.03, '#1b1b1f', dx, 1.0, 0.22));
      g.add(sphere(0.03, '#1b1b1f', 0, 0.93, 0.31));
      g.add(box(0.3, 0.06, 0.06, tmat('#e85d75', 'fabric'), 0, 0.72, 0.18)); // a bow
    } else if (type === 'neonheart') {
      g.add(box(0.06, 1.0, 0.06, '#2b2d36', -0.3, 0, 0)); g.add(box(0.06, 1.0, 0.06, '#2b2d36', 0.3, 0, 0));
      g.add(box(0.7, 0.06, 0.3, '#2b2d36', 0, 0, 0));
      g.add(box(0.9, 0.85, 0.04, tmat('#1c1f2b', 'none'), 0, 0.9, -0.02));
      const shape = new THREE.Shape(); shape.moveTo(0, -0.3); shape.bezierCurveTo(-0.45, 0.0, -0.3, 0.35, 0, 0.15); shape.bezierCurveTo(0.3, 0.35, 0.45, 0.0, 0, -0.3);
      const heart = mesh(geo('heart', () => new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false })), smat({ color: '#ff7eb6', emissive: '#ff4fa3', emissiveIntensity: 1.4 }), 0, 1.33, 0.01, false);
      g.add(heart);
    } else if (type === 'koi') {
      const stoneM = tmat('#a8a091', 'stone');
      for (let k = 0; k < 10; k++) { const a = k / 10 * PI * 2, st = sphere(0.1, stoneM, Math.cos(a) * 0.4, 0.06, Math.sin(a) * 0.4); st.scale.set(1.3, 0.7, 1); g.add(st); }
      g.add(cyl(0.38, 0.38, 0.02, '#2a4f6a', 0, 0, 0, 20, false));
      g.add(cyl(0.37, 0.37, 0.02, fountainWater, 0, 0.06, 0, 20, false));
      for (const [x, z, c, ry] of [[-0.12, 0.05, '#ff7a2a', 0.4], [0.12, -0.1, '#ffffff', 2.2], [0.05, 0.18, '#ffb347', -1.0]]) { const f = sphere(0.05, c, x, 0.05, z); f.scale.set(1.8, 0.5, 0.7); f.rotation.y = ry; g.add(f); }
      for (const [x, z] of [[0.2, 0.12], [-0.18, -0.16]]) g.add(cyl(0.07, 0.07, 0.01, tmat('#4f9a5a', 'leaf'), x, 0.075, z, 10, false));
    } else if (type === 'carousel') {
      const stripes = canvasTex(128, 32, (c, w, h) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#ffffff' : '#e85d75'; c.fillRect(k * 16, 0, 16, h); } });
      g.add(cyl(0.46, 0.48, 0.12, tmat('#c9a24a', 'wood'), 0, 0, 0, 20));
      g.add(cyl(0.035, 0.035, 1.5, tmat('#d4af37', 'metal', { metalness: 0.6, roughness: 0.3 }), 0, 0.12, 0, 8));
      g.add(mesh(geo('carRoof', () => new THREE.ConeGeometry(0.52, 0.35, 16)), smat({ map: stripes }), 0, 1.78, 0));
      g.add(cyl(0.52, 0.52, 0.1, smat({ map: stripes }), 0, 1.5, 0, 16));
      const horseCols = ['#ffffff', '#ffd6de', '#bfe6ff', '#fff1a8'];
      for (let k = 0; k < 4; k++) {
        const a = k / 4 * PI * 2 + 0.4, x = Math.cos(a) * 0.32, z = Math.sin(a) * 0.32;
        g.add(cyl(0.012, 0.012, 1.38, tmat('#d4af37', 'metal', { metalness: 0.6, roughness: 0.3 }), x, 0.12, z, 6));
        const h = new THREE.Group(); h.position.set(x, 0.55 + (k % 2) * 0.12, z); h.rotation.y = -a;
        const m = mat(horseCols[k]);
        h.add(box(0.08, 0.1, 0.24, m, 0, 0, 0)); h.add(box(0.06, 0.13, 0.06, m, 0, 0.08, 0.11)); h.add(box(0.05, 0.05, 0.1, m, 0, 0.18, 0.14));
        for (const [lx, lz] of [[-0.03, -0.08], [0.03, -0.08], [-0.03, 0.08], [0.03, 0.08]]) h.add(box(0.02, 0.12, 0.02, m, lx, -0.12, lz));
        g.add(h);
      }
    } else if (type === 'trophy') {
      const gold = tmat('#d4af37', 'metal', { metalness: 0.75, roughness: 0.25 }), woodM = tmat('#3a2416', 'wood');
      g.add(box(0.5, 0.75, 0.5, woodM, 0, 0, 0)); g.add(box(0.56, 0.05, 0.56, woodM, 0, 0.75, 0));
      g.add(box(0.3, 0.1, 0.3, tmat('#1c1f2b', 'none'), 0, 0.8, 0)); g.add(box(0.2, 0.05, 0.01, gold, 0, 0.83, 0.155));
      g.add(cyl(0.05, 0.1, 0.06, gold, 0, 0.9, 0, 14)); g.add(cyl(0.025, 0.025, 0.2, gold, 0, 0.96, 0, 8));
      g.add(mesh(geo('cup', () => new THREE.CylinderGeometry(0.17, 0.08, 0.3, 18, 1, true)), gold, 0, 1.31, 0));
      for (const dx of [-0.18, 0.18]) { const hd = mesh(geo('cupH', () => new THREE.TorusGeometry(0.07, 0.015, 6, 12, PI)), gold, dx, 1.3, 0); hd.rotation.z = dx < 0 ? PI / 2 : -PI / 2; g.add(hd); }
    } else if (type === 'photobooth') {
      const bodyM = tmat('#c8323c', 'none', { roughness: 0.5 }), sign = canvasTex(128, 32, c => { c.fillStyle = '#1c1f2b'; c.fillRect(0, 0, 128, 32); c.fillStyle = '#ffd447'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText('PHOTOS', 64, 24); });
      g.add(box(0.06, 1.9, 0.86, bodyM, -0.4, 0, 0)); g.add(box(0.06, 1.9, 0.86, bodyM, 0.4, 0, 0)); g.add(box(0.86, 1.9, 0.06, bodyM, 0, 0, -0.4));
      g.add(box(0.86, 0.3, 0.86, bodyM, 0, 1.9, 0));
      const sg = mesh(new THREE.PlaneGeometry(0.7, 0.18), smat({ map: sign, emissive: '#ffffff', emissiveMap: sign, emissiveIntensity: 0.6 }), 0, 2.05, 0.435, false); g.add(sg);
      const curtain = mesh(geo('curtain', () => { const gg = new THREE.PlaneGeometry(0.5, 1.6, 10, 1); const p = gg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 40) * 0.025); gg.computeVertexNormals(); return gg; }), tmat('#3a1f4a', 'velvet', { side: THREE.DoubleSide }), 0.13, 1.1, 0.42, false);
      g.add(curtain);
      g.add(box(0.3, 0.45, 0.3, '#2b2d36', -0.15, 0, -0.1)); // the seat inside
      g.add(box(0.2, 0.5, 0.04, tmat('#f4f0e8', 'card'), -0.25, 0.9, 0.44)); // a strip of photos
    } else if (type === 'gazebo') {
      const woodM = tmat('#f4f0e8', 'wood'), roofM = tmat('#4f6f8a', 'stone');
      g.add(cyl(0.5, 0.52, 0.1, tmat('#a8703f', 'boards'), 0, 0, 0, 8));
      for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2 + PI / 8, x = Math.cos(a) * 0.44, z = Math.sin(a) * 0.44; g.add(cyl(0.03, 0.03, 1.8, woodM, x, 0.1, z, 8)); if (k !== 2) { const rail = box(0.34, 0.04, 0.03, woodM, 0, 0, 0); const b = (k + 0.5) / 8 * PI * 2 + PI / 8; rail.position.set(Math.cos(b) * 0.41, 0.55, Math.sin(b) * 0.41); rail.rotation.y = -b + PI / 2; g.add(rail); } }
      g.add(mesh(geo('gazRoof', () => new THREE.ConeGeometry(0.66, 0.55, 8)), roofM, 0, 2.17, 0));
      g.add(sphere(0.05, tmat('#d4af37', 'metal', { metalness: 0.6, roughness: 0.3 }), 0, 2.5, 0));
    } else if (type === 'poster') {
      const r = seeded(777), art = canvasTex(128, 192, c => {
        c.fillStyle = '#1c1f2b'; c.fillRect(0, 0, 128, 192);
        for (let k = 0; k < 2; k++) { const y = k * 96; c.fillStyle = ['#e85d75', '#ffd447', '#5fcf8a', '#4f9de8'][Math.floor(r() * 4)]; c.fillRect(6, y + 6, 116, 84); c.fillStyle = '#1c1f2b'; c.font = 'bold 20px sans-serif'; c.textAlign = 'center'; c.fillText(['THE YEAST', 'LOAFERS'][k], 64, y + 50); c.font = '11px sans-serif'; c.fillText('LIVE TONIGHT', 64, y + 70); }
      });
      g.add(box(0.05, 1.7, 0.05, '#2b2d36', -0.42, 0, -0.05)); g.add(box(0.05, 1.7, 0.05, '#2b2d36', 0.42, 0, -0.05));
      g.add(box(0.9, 1.3, 0.04, tmat('#8a8f9a', 'card'), 0, 0.35, -0.05));
      g.add(mesh(new THREE.PlaneGeometry(0.8, 1.2), smat({ map: art }), 0, 1.0, -0.025, false));
    } else if (type === 'minifridge') {
      const bodyM = tmat('#e8ecef', 'metal', { metalness: 0.3, roughness: 0.35 });
      g.add(box(0.55, 0.85, 0.55, bodyM, 0, 0, 0)); g.add(box(0.52, 0.01, 0.01, '#8d939c', 0, 0.62, 0.28));
      g.add(box(0.03, 0.3, 0.03, '#8d939c', 0.22, 0.25, 0.29)); g.add(box(0.03, 0.12, 0.03, '#8d939c', 0.22, 0.68, 0.29));
      for (const [x, c] of [[-0.12, '#e8262f'], [0.0, '#4f9de8'], [0.12, '#5fcf8a']]) g.add(cyl(0.035, 0.035, 0.12, tmat(c, 'metal', { metalness: 0.4, roughness: 0.35 }), x, 0.85, 0, 10));
    } else if (type === 'dartboard') {
      const board = canvasTex(128, 128, c => {
        for (let k = 0; k < 20; k++) { c.fillStyle = k % 2 ? '#1b1b1f' : '#f2e6c8'; c.beginPath(); c.moveTo(64, 64); c.arc(64, 64, 60, k * PI / 10, (k + 1) * PI / 10); c.fill(); }
        for (const [rr, a, b] of [[60, '#c8323c', '#2f7a4a'], [38, '#c8323c', '#2f7a4a']]) for (let k = 0; k < 20; k++) { c.strokeStyle = k % 2 ? a : b; c.lineWidth = 6; c.beginPath(); c.arc(64, 64, rr - 3, k * PI / 10, (k + 1) * PI / 10); c.stroke(); }
        c.fillStyle = '#2f7a4a'; c.beginPath(); c.arc(64, 64, 7, 0, 7); c.fill(); c.fillStyle = '#c8323c'; c.beginPath(); c.arc(64, 64, 3.5, 0, 7); c.fill();
      });
      g.add(box(0.08, 1.75, 0.08, tmat('#5a3a24', 'wood'), 0, 0, -0.15)); g.add(box(0.5, 0.05, 0.3, '#2b2d36', 0, 0, -0.05));
      g.add(box(0.6, 0.6, 0.04, tmat('#3a2416', 'wood'), 0, 1.12, -0.1));
      const d = cyl(0.23, 0.23, 0.04, smat({ map: board }), 0, 0, 0, 24, false); d.rotation.x = PI / 2; d.position.set(0, 1.42, -0.06); g.add(d);
      for (const [x, y] of [[0.05, 1.47], [-0.07, 1.38]]) { const dart = cyl(0.008, 0.004, 0.12, '#d4af37', x, y, 0.0, 6, false); dart.rotation.x = PI / 2; dart.position.set(x, y, 0.0); g.add(dart); }
    } else if (type === 'plantb') {
      g.add(cyl(0.2, 0.16, 0.35, tmat('#2b2d36', 'none'), 0, 0, 0, 12));
      for (const [dx, dy, dz, r] of [[0, 0.55, 0, 0.24], [0.12, 0.72, 0.05, 0.17], [-0.12, 0.66, -0.06, 0.19]]) g.add(sphere(r, tmat('#3f9a4a', 'leaf'), dx, dy, dz));
      g.add(box(0.04, 1.5, 0.04, '#2b2d36', -0.32, 0, -0.2)); g.add(box(0.4, 0.04, 0.04, '#2b2d36', -0.14, 1.46, -0.2));
      const gl = smat({ color: '#e0b8ff', emissive: '#c060ff', emissiveIntensity: 1.3 }); g.add(box(0.3, 0.05, 0.16, gl, 0, 1.38, -0.12));
    } else if (type === 'safe2') {
      const steel = tmat('#4a4f58', 'metal', { metalness: 0.5, roughness: 0.35 });
      g.add(box(0.7, 0.9, 0.6, steel, 0, 0, 0)); g.add(box(0.6, 0.78, 0.03, tmat('#5a6069', 'metal', { metalness: 0.5, roughness: 0.3 }), 0, 0.06, 0.3));
      const dial = cyl(0.08, 0.08, 0.04, tmat('#c9ccd3', 'metal', { metalness: 0.6, roughness: 0.25 }), 0, 0, 0, 16); dial.rotation.x = PI / 2; dial.position.set(-0.1, 0.5, 0.33); g.add(dial);
      g.add(box(0.04, 0.22, 0.04, '#c9ccd3', 0.18, 0.36, 0.33));
      for (const dx of [-0.27, 0.27]) g.add(box(0.08, 0.04, 0.5, '#2b2d36', dx, 0, 0));
    } else {
      // Anything without a model of its own: a small plinth with its picture on a stand
      g.add(cyl(0.3, 0.34, 0.12, '#3a3046', 0, 0, 0, 16));
      g.add(cyl(0.02, 0.02, 0.6, '#2b2d36', 0, 0.12, 0, 6, false));
      const sp = new THREE.Sprite(emojiSprite(type)); sp.scale.set(0.7, 0.7, 0.7); sp.position.y = 1.05; g.add(sp);
    }
    g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
    return g;
  }
  const spriteMats = new Map();
  function emojiSprite(type) {
    if (spriteMats.has(type)) return spriteMats.get(type);
    const emoji = (D.DECOR[type] || D.BACK_DECOR[type] || {}).emoji || '✨';
    const tex = canvasTex(128, 128, c => { c.font = '96px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(emoji, 64, 70); });
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true });
    spriteMats.set(type, m);
    return m;
  }
  function artModel(type, key) {
    const g = new THREE.Group();
    if (type === 'painting') {
      g.add(box(0.64, 0.52, 0.04, mat('#c9a24a', { roughness: 0.3, metalness: 0.5 }), 0, -0.26, 0, false));
      const r = seeded(key.charCodeAt(1) * 97 + 3);
      const art = canvasTex(64, 48, c => {
        c.fillStyle = ['#bfe6ff', '#ffd6de', '#fff1a8'][Math.floor(r() * 3)]; c.fillRect(0, 0, 64, 48);
        c.fillStyle = '#86b86a'; c.beginPath(); c.moveTo(0, 48); c.lineTo(0, 30); c.quadraticCurveTo(32, 10 + r() * 14, 64, 28); c.lineTo(64, 48); c.fill();
        c.fillStyle = '#ffcf3f'; c.beginPath(); c.arc(12 + r() * 40, 12, 6, 0, PI * 2); c.fill();
      });
      g.add(mesh(new THREE.PlaneGeometry(0.54, 0.42), smat({ map: art }), 0, 0, 0.025, false));
    } else if (type === 'clock') {
      const back = cyl(0.23, 0.23, 0.04, '#2b2d36', 0, 0, 0, 20, false); back.rotation.x = PI / 2; back.position.set(0, 0, 0); g.add(back);
      const face = cyl(0.2, 0.2, 0.02, '#fff8e8', 0, 0, 0, 20, false); face.rotation.x = PI / 2; face.position.set(0, 0, 0.025); g.add(face);
      g.add(box(0.02, 0.15, 0.01, '#222', 0, -0.02, 0.04, false)); g.add(box(0.11, 0.02, 0.01, '#222', 0.04, -0.01, 0.04, false));
    } else if (type === 'shelf') {
      g.add(box(0.72, 0.04, 0.18, '#a8703f', 0, -0.2, 0.09, false));
      [['#ffd447', -0.24], ['#ff7eb6', 0], ['#9fe1ff', 0.24]].forEach(([c, x]) => { g.add(cyl(0.065, 0.065, 0.17, smat({ color: c, roughness: 0.25, transparent: true, opacity: 0.85 }), x, -0.16, 0.09, 12, false)); g.add(cyl(0.07, 0.07, 0.03, '#a8703f', x, 0.01, 0.09, 12, false)); });
    } else if (type === 'plates') {
      g.add(box(0.72, 0.04, 0.12, '#8a5a32', 0, -0.24, 0.06, false));
      [['#ffffff', -0.22], ['#4f9de8', 0], ['#ffffff', 0.22]].forEach(([c, x]) => { const p = cyl(0.13, 0.13, 0.02, c, x, 0, 0.05, 18, false); p.rotation.x = PI / 2 - 0.15; p.position.set(x, -0.08, 0.05); g.add(p); });
    } else if (type === 'neon') {
      const word = ['BAKE', 'FRESH', 'YUM', 'OPEN'][key.charCodeAt(1) % 4];
      const t = canvasTex(256, 96, c => { c.font = 'bold 64px "Brush Script MT", cursive, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#ff4fa3'; c.shadowBlur = 14; c.fillStyle = '#ffe1f0'; c.fillText(word, 128, 52); c.fillText(word, 128, 52); });
      g.add(box(0.8, 0.34, 0.03, tmat('#1c1f2b', 'none'), 0, -0.17, 0, false));
      g.add(mesh(new THREE.PlaneGeometry(0.78, 0.3), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false }), 0, 0, 0.035, false));
    } else if (type === 'mirror') {
      const gold = tmat('#c9a24a', 'metal', { metalness: 0.6, roughness: 0.3 });
      g.add(box(0.56, 0.74, 0.05, gold, 0, -0.37, 0, false));
      for (const [x, y] of [[0, 0.4], [0, -0.4]]) g.add(sphere(0.05, gold, x, y, 0.03, false));
      const sheen = canvasTex(64, 96, c => {
        const bg = c.createLinearGradient(0, 0, 64, 96); bg.addColorStop(0, '#d9e6ef'); bg.addColorStop(0.5, '#8fa6b8'); bg.addColorStop(1, '#5f7487'); c.fillStyle = bg; c.fillRect(0, 0, 64, 96);
        c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(8, 96); c.lineTo(22, 96); c.lineTo(58, 0); c.lineTo(44, 0); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.moveTo(28, 96); c.lineTo(33, 96); c.lineTo(64, 14); c.lineTo(64, 0); c.fill();
      });
      g.add(mesh(new THREE.PlaneGeometry(0.46, 0.64), smat({ map: sheen, roughness: 0.1, metalness: 0.5 }), 0, 0.0, 0.03, false));
    } else if (type === 'records') {
      g.add(box(0.74, 0.44, 0.04, tmat('#1c1f2b', 'velvet'), 0, -0.22, 0, false));
      const gold = tmat('#d4af37', 'metal', { metalness: 0.75, roughness: 0.2 });
      for (const x of [-0.18, 0.18]) { const d = cyl(0.14, 0.14, 0.01, gold, 0, 0, 0, 24, false); d.rotation.x = PI / 2; d.position.set(x, 0.02, 0.03); g.add(d); const l = cyl(0.04, 0.04, 0.012, '#e85d75', 0, 0, 0, 12, false); l.rotation.x = PI / 2; l.position.set(x, 0.02, 0.035); g.add(l); }
      g.add(box(0.3, 0.05, 0.01, gold, 0, -0.17, 0.025, false));
    } else if (type === 'tapestry') {
      const r = seeded(key.charCodeAt(1) * 13 + 5), weave = canvasTex(96, 128, c => {
        c.fillStyle = '#7a2a3a'; c.fillRect(0, 0, 96, 128); c.fillStyle = '#d4a24a'; c.fillRect(6, 6, 84, 116); c.fillStyle = '#2f4a6a'; c.fillRect(10, 10, 76, 108);
        for (let k = 0; k < 5; k++) { c.fillStyle = ['#d4a24a', '#e8dcc0', '#7a2a3a'][k % 3]; c.beginPath(); c.moveTo(48, 18 + k * 20); c.lineTo(66, 28 + k * 20); c.lineTo(48, 38 + k * 20); c.lineTo(30, 28 + k * 20); c.fill(); }
        for (let y = 0; y < 128; y += 2) { c.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.05})`; c.fillRect(0, y, 96, 1); }
      });
      const rod = cyl(0.015, 0.015, 0.68, tmat('#5a3a24', 'wood'), 0, 0, 0, 6, false); rod.rotation.z = PI / 2; rod.position.set(0, 0.25, 0.04); g.add(rod);
      const cl = mesh(geo('tapes', () => { const gg = new THREE.PlaneGeometry(0.56, 0.72, 8, 1); const p = gg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.008); gg.computeVertexNormals(); return gg; }), smat({ map: weave, side: THREE.DoubleSide }), 0, -0.12, 0.03, false);
      g.add(cl);
    } else if (type === 'portrait' || type === 'goldframe') {
      const big = type === 'goldframe', gold = tmat('#d4af37', 'metal', { metalness: 0.7, roughness: 0.25 });
      const w = big ? 0.82 : 0.58, h = big ? 0.66 : 0.7;
      g.add(box(w, h, 0.05, gold, 0, -h / 2, 0, false));
      if (big) for (const [x, y] of [[-w / 2, h / 2], [w / 2, h / 2], [-w / 2, -h / 2], [w / 2, -h / 2]]) g.add(sphere(0.045, gold, x, y, 0.03, false));
      const art = canvasTex(96, 112, c => {
        if (big) { // a still life: bread and fruit on a table
          const bg = c.createLinearGradient(0, 0, 0, 112); bg.addColorStop(0, '#3a2a1c'); bg.addColorStop(1, '#1c140c'); c.fillStyle = bg; c.fillRect(0, 0, 96, 112);
          c.fillStyle = '#6b4a2e'; c.fillRect(0, 76, 96, 36);
          c.fillStyle = '#c98a4b'; c.beginPath(); c.ellipse(36, 70, 22, 11, 0, 0, 7); c.fill();
          for (const [x, y, col] of [[66, 68, '#c8323c'], [76, 72, '#e8c02b'], [58, 74, '#5f8f3a']]) { c.fillStyle = col; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); }
        } else { // Aunt Rosa, in her apron
          c.fillStyle = '#5a6a4a'; c.fillRect(0, 0, 96, 112);
          c.fillStyle = '#e8dcc0'; c.beginPath(); c.ellipse(48, 104, 34, 30, 0, 0, 7); c.fill();
          c.fillStyle = '#ffffff'; c.fillRect(34, 84, 28, 28);
          c.fillStyle = '#f0c8a0'; c.beginPath(); c.ellipse(48, 52, 17, 21, 0, 0, 7); c.fill();
          c.fillStyle = '#c9c4bc'; c.beginPath(); c.arc(48, 32, 15, PI, 0); c.fill(); c.beginPath(); c.arc(48, 22, 8, 0, 7); c.fill();
          c.fillStyle = '#2b2d36'; c.fillRect(40, 50, 4, 3); c.fillRect(52, 50, 4, 3);
          c.strokeStyle = '#a8423a'; c.lineWidth = 2; c.beginPath(); c.arc(48, 60, 6, 0.3, PI - 0.3); c.stroke();
        }
      });
      g.add(mesh(new THREE.PlaneGeometry(w - 0.1, h - 0.1), smat({ map: art }), 0, 0, 0.03, false));
    }
    return g;
  }
  const decorGroup = new THREE.Group(); scene.add(decorGroup);
  const artBack = new THREE.Group(); scene.add(artBack);
  const artLeft = new THREE.Group(); partition.add(artLeft);
  const backDecorGroup = new THREE.Group(); backDecorGroup.position.y = BY; scene.add(backDecorGroup);
  const backFloorMats = {};
  // What each basement floor and wall design is made of: a surface, and how many times it repeats a metre
  const BACK_FLOOR_SURF = { concrete: ['concrete', 0.5], rubber: ['rubber', 1], plate: ['plate', 1], tiles: ['tiles', 1], epoxy: ['epoxy', 0.5], wood: ['boards', 1], neon: ['glowgrid', 1] };
  const BACK_WALL_SURF = { block: ['block', 1], brick: ['brick', 1], white: ['plaster', 0.5], black: ['plaster', 0.5], graffiti: ['plaster', 0.5], padded: ['foam', 2], gold: ['leafgold', 1] };
  let graffiti = null;
  function graffitiTex(base) { // tags and throw-ups on the wall's colour, two metres a tile
    if (graffiti) return graffiti;
    const r = seeded(1312);
    graffiti = canvasTex(512, 512, c => {
      c.fillStyle = base; c.fillRect(0, 0, 512, 512);
      const cols = ['#ff4fa3', '#ffd447', '#5fd3ff', '#7cff6b', '#ff7a2a', '#ffffff', '#b58cff'];
      for (let k = 0; k < 26; k++) { c.strokeStyle = cols[Math.floor(r() * cols.length)]; c.globalAlpha = 0.6 + r() * 0.4; c.lineWidth = 3 + r() * 9; c.lineCap = 'round'; c.beginPath(); let x = r() * 512, y = 40 + r() * 440; c.moveTo(x, y); for (let q = 0; q < 4; q++) { const nx = x + (r() - 0.3) * 120, ny = y + (r() - 0.5) * 80; c.quadraticCurveTo(x + (r() - 0.5) * 90, y + (r() - 0.5) * 90, nx, ny); x = nx; y = ny; } c.stroke(); }
      c.globalAlpha = 1;
      for (const [t, x, y, rot, col] of [['ROSA', 120, 170, -0.15, '#ffd447'], ['BB', 380, 330, 0.1, '#ff4fa3'], ['YEAST', 250, 450, -0.05, '#5fd3ff']]) {
        c.save(); c.translate(x, y); c.rotate(rot); c.font = 'italic 900 78px Impact, "Arial Black", sans-serif'; c.textAlign = 'center';
        c.lineWidth = 10; c.strokeStyle = '#1b1b1f'; c.strokeText(t, 0, 0); c.fillStyle = col; c.fillText(t, 0, 0); c.restore();
        c.fillStyle = col; for (let d = 0; d < 4; d++) c.fillRect(x - 70 + r() * 140, y + 8, 4, 14 + r() * 30); // drips
      }
    });
    graffiti.wrapS = graffiti.wrapT = THREE.RepeatWrapping; graffiti.repeat.set(0.5, 0.5);
    return graffiti;
  }
  let backSig = '';
  function syncBack(s) {
    const b = s.design.back || { floor: 'concrete', wall: 'block', decor: [] };
    const sig = JSON.stringify(b);
    if (sig === backSig) return;
    backSig = sig;
    const f = D.BACK_FLOORS[b.floor] || D.BACK_FLOORS.concrete;
    backFloorMats.concrete ||= backFloorOrig;
    backFloor.material = backFloorMats[b.floor] ||= (() => {
      const [kind, per] = BACK_FLOOR_SURF[b.floor] || BACK_FLOOR_SURF.concrete, t = surfaceTiled(kind, per);
      return b.floor === 'neon' ? smat({ color: f.color, map: t, emissive: '#7b3fd6', emissiveMap: t, emissiveIntensity: 0.6, roughness: 0.4 })
        : smat({ color: f.color, map: t, roughness: b.floor === 'epoxy' || b.floor === 'tiles' ? 0.35 : 0.85 });
    })();
    for (const f of basementFloors) f.material = backFloor.material;
    const w = D.BACK_WALLS[b.wall] || D.BACK_WALLS.block;
    const [wk, wp] = BACK_WALL_SURF[b.wall] || BACK_WALL_SURF.block;
    if (b.wall === 'graffiti') { backWall.map = graffitiTex(w.color); backWall.color.set('#ffffff'); } else { backWall.map = surfaceTiled(wk, wp); backWall.color.set(w.color); }
    backWain.map = surfaceTiled(wk, wp); backWain.color.set(w.lower);
    backWall.needsUpdate = backWain.needsUpdate = true;
    invalidateNav(); // decor is in the way of walking
    backDecorGroup.clear();
    b.decor.forEach((it, idx) => {
      const m = texturize(decorModel(it.type)), { x, z } = D.backCellCenter(it.bx, it.bz);
      m.position.set(BX + x, 0, z); m.rotation.y = (it.rot || 0) * PI / 2;
      m.userData = { act: 'design', kind: 'bdecor', idx };
      m.traverse(o => { if (o.isMesh) o.castShadow = true; });
      backDecorGroup.add(m);
    });
  }
  // ---------- The outside of the shop: paint, canopy, sign and extras ----------
  const outsideGroup = new THREE.Group(); scene.add(outsideGroup);
  const shopSideLights = new THREE.Group(); // on the wall shared with the back room: hidden when you're in there
  const insideOnly = new THREE.Group(); scene.add(insideOnly); // the door canopy and post sign: the zoomed-out building has its own
  let outSig = '';
  const stripeTex = (a, b) => canvasTex(64, 16, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? b : a; c.fillRect(i * 8, 0, 8, h); } }, [4, 1]);
  // Free the canvas textures (and their one-off materials) of a group about to be rebuilt; cached materials have no canvas map
  function disposeMaps(root) {
    root.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) if (m?.map?.isCanvasTexture) { m.map.dispose(); m.dispose(); } });
  }
  const dropFrom = (list, items) => { for (const m of items) { const i = list.indexOf(m); if (i >= 0) list.splice(i, 1); } items.length = 0; };
  const outGlows = [];
  function syncOutside(s) {
    const o = s.design.outside || { paint: 'cream', canopy: 'none', sign: 'none', extras: {} };
    const ex = s.design.expansions || {};
    const sig = JSON.stringify([o, ex.front, ex.side, G.shopDef(s).sign]);
    if (sig === outSig) return;
    outSig = sig;
    const P = D.OUT_PAINT[o.paint] || D.OUT_PAINT.cream;
    extWain.color.set(P.color); extTrim.color.set(P.trim);
    disposeMaps(outsideGroup); disposeMaps(insideOnly); dropFrom(lampGlows, outGlows); dropFrom(glowMats, outGlows);
    outsideGroup.clear(); shopSideLights.clear(); insideOnly.clear();
    const addIn = m => { m.traverse?.(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } }); insideOnly.add(m); return m; };
    const add = m => { m.traverse?.(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } }); outsideGroup.add(m); return m; };
    // A canopy over the side doorway
    const C = D.OUT_CANOPY[o.canopy];
    if (C && C.a) {
      const cm = mesh(new THREE.BoxGeometry(0.85, 0.05, 2.1), smat({ map: stripeTex(C.a, C.b), roughness: 0.8 }), 5.0, 2.2, 3.7);
      cm.rotation.z = -0.32; addIn(cm);
      for (const z of [2.75, 4.65]) addIn(box(0.04, 0.5, 0.04, '#2b2d36', 4.65, 1.75, z));
      if (o.canopy === 'gold') for (let k = 0; k < 7; k++) addIn(sphere(0.07, C.b, 5.38, 2.03, 2.75 + k * 0.32));
    }
    // The shop sign, on two posts at the front corner
    const S = D.OUT_SIGN[o.sign];
    if (S && S.bg) {
      const text = G.shopDef(s).sign;
      const tex = canvasTex(256, 64, (c, w, h) => { c.fillStyle = S.bg; c.fillRect(0, 0, w, h); if (S.glow) { c.shadowColor = S.fg; c.shadowBlur = 16; }
        c.fillStyle = S.fg; c.font = `bold ${text.length > 13 ? 26 : 32}px Georgia, serif`; c.textAlign = 'center'; c.fillText(text, w / 2, 42); });
      const board = mesh(new THREE.BoxGeometry(1.7, 0.42, 0.06), [mat(S.bg), mat(S.bg), mat(S.bg), mat(S.bg), S.glow ? new THREE.MeshBasicMaterial({ map: tex }) : smat({ map: tex, roughness: 0.7 }), mat(S.bg)], 5.85, 1.5, 4.95);
      board.rotation.y = PI / 4; addIn(board);
      for (const dx of [-0.6, 0.6]) addIn(box(0.05, 1.3, 0.05, '#2b2d36', 5.85 + dx * Math.cos(PI / 4), 0, 4.95 - dx * Math.sin(PI / 4)));
    }
    const E = o.extras || {};
    if (E.boxes && !ex.front) for (const x of [-1.7, 1.3]) { add(box(1.0, 0.18, 0.26, '#7a4a2e', x, 0.56, 4.78)); for (let k = 0; k < 4; k++) add(sphere(0.07, ['#ff7eb6', '#ffd447', '#ffffff', '#b58cff'][k], x - 0.36 + k * 0.24, 0.8, 4.78)); }
    if (E.bay) for (const x of [5.05, 6.65]) { add(cyl(0.2, 0.16, 0.4, '#3a3d44', x, 0, 5.45, 12)); add(cyl(0.03, 0.03, 0.5, '#7a5534', x, 0.4, 5.45, 6)); add(sphere(0.3, '#3f7a3a', x, 1.1, 5.45)); }
    if (E.benchout) { const g = new THREE.Group(); g.add(box(1.2, 0.06, 0.38, '#a8703f', 0, 0.42, 0)); g.add(box(1.2, 0.32, 0.05, '#a8703f', 0, 0.5, -0.18)); for (const dx of [-0.5, 0.5]) g.add(box(0.06, 0.42, 0.34, '#2b2d36', dx, 0, 0)); g.position.set(5.85, 0, 6.45); g.rotation.y = PI; add(g); }
    if (E.bikes) { for (let k = 0; k < 3; k++) { const r = mesh(geo('bikeloop', () => new THREE.TorusGeometry(0.3, 0.025, 6, 14, PI)), mat('#8d939c', { metalness: 0.6 }), -6.6 + k * 0.45, 0, 5.6); r.rotation.y = PI / 2; add(r); } }
    if (E.bunting) { const cols = ['#e85d75', '#ffd447', '#4f9de8', '#5fcf8a', '#ffffff']; for (let k = 0; k < 18; k++) { const f = mesh(geo('flag', () => new THREE.ConeGeometry(0.11, 0.22, 3)), mat(cols[k % 5]), -4.3 + k * 0.5, 2.78, -4.35); f.rotation.x = PI; add(f); } }
    if (E.lanterns) for (const z of [2.85, 4.55]) { const lm = emissiveMat('#fff1cc', '#ffb347'); lampGlows.push(lm); outGlows.push(lm); add(box(0.16, 0.22, 0.16, lm, 4.62, 1.3, z)); }
    if (E.lights) { const lm = emissiveMat('#fff6d0', '#ffe08a'); glowMats.push(lm); outGlows.push(lm); for (let k = 0; k < 18; k++) { add(sphere(0.045, lm, -4.4 + k * 0.52, 2.92 - (k % 2) * 0.06, -4.42, false)); shopSideLights.add(sphere(0.045, lm, -4.42, 2.92 - (k % 2) * 0.06, -4.4 + k * 0.52, false)); } outsideGroup.add(shopSideLights); }
  }
  // ---------- Zoomed out: the whole building from outside ----------
  // Rebuilt from the shop's outside design (paint, wall finish, windows, door, roof, awning, sign) and grows with
  // its expansions: terraces get railings and parasols, the stalls a lean-to roof, the island a roof lantern,
  // back-room benches extractor fans, the annex a raised roof, and the flat upstairs a whole second storey.
  const shellGroup = new THREE.Group(); shellGroup.visible = false; scene.add(shellGroup);
  let shellMats = [], shellGlassMats = [], shellGeos = [];
  let smCache = new Map();
  const sm = (color, extra = {}) => {
    const key = extra.map || extra.emissiveMap ? null : color + JSON.stringify(extra);
    if (key && smCache.has(key)) return smCache.get(key);
    const m = smat({ color, roughness: 0.85, transparent: true, opacity: 0, ...extra }); shellMats.push(m);
    if (key) smCache.set(key, m);
    return m;
  };
  const sg = g => { shellGeos.push(g); return g; };
  const shade = (hex, k) => { const c = new THREE.Color(hex); c.r = Math.min(1, c.r * k); c.g = Math.min(1, c.g * k); c.b = Math.min(1, c.b * k); return '#' + c.getHexString(); };
  // Wall finishes, drawn as a 1 m tile so each wall can repeat it by its own size
  const FINISH_COLOR = { brick: '#a5523d', stone: '#b8ad9a', marble: '#ece8e2' };
  function finishCanvas(finish, base) {
    return (c, w, h) => {
      const col = FINISH_COLOR[finish] || base;
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      if (finish === 'render') {
        for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      } else if (finish === 'brick') {
        c.fillStyle = '#e6d8c4'; c.fillRect(0, 0, w, h);
        for (let row = 0; row < 8; row++) for (let k = -1; k < 4; k++) {
          c.fillStyle = shade(col, 0.85 + Math.random() * 0.3);
          c.fillRect(k * 32 + (row % 2) * 16 + 1, row * 16 + 1, 30, 14);
        }
      } else if (finish === 'cladding') {
        for (let row = 0; row < 8; row++) { c.fillStyle = shade(col, 0.92 + (row % 2) * 0.08); c.fillRect(0, row * 16, w, 14); c.fillStyle = shade(col, 0.6); c.fillRect(0, row * 16 + 14, w, 2); }
      } else if (finish === 'stone') {
        c.fillStyle = '#8c8475'; c.fillRect(0, 0, w, h);
        let y = 0;
        while (y < h) { const rh = 20 + Math.floor(Math.random() * 14); let x = -Math.random() * 20; while (x < w) { const rw = 28 + Math.random() * 30; c.fillStyle = shade(col, 0.85 + Math.random() * 0.25); c.fillRect(x + 2, y + 2, rw - 3, rh - 3); x += rw; } y += rh; }
      } else if (finish === 'tiles') {
        c.fillStyle = '#f4f0e8'; c.fillRect(0, 0, w, h);
        for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { c.fillStyle = shade(col, (a + b) % 2 ? 1.0 : 1.12); c.fillRect(a * 32 + 1, b * 32 + 1, 30, 30); }
      } else if (finish === 'marble') {
        c.strokeStyle = 'rgba(120,120,130,.35)'; c.lineWidth = 1.2;
        for (let i = 0; i < 6; i++) { c.beginPath(); let x = Math.random() * w, y = 0; c.moveTo(x, y); while (y < h) { x += (Math.random() - 0.5) * 18; y += 10; c.lineTo(x, y); } c.stroke(); }
        c.fillStyle = 'rgba(0,0,0,.08)'; for (let k = 0; k <= 2; k++) c.fillRect(0, k * 64, w, 1);
      }
    };
  }
  const roofCanvas = (roof, col) => (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    if (roof === 'tiles' || roof === 'slate') {
      const rh = roof === 'tiles' ? 16 : 12;
      for (let row = 0; row * rh < h; row++) for (let k = -1; k < 6; k++) {
        c.fillStyle = shade(col, 0.82 + Math.random() * 0.3);
        const tw = roof === 'tiles' ? 24 : 30;
        c.fillRect(k * tw + (row % 2) * tw / 2 + 1, row * rh + 1, tw - 2, rh - 2);
        if (roof === 'tiles') { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(k * tw + (row % 2) * tw / 2 + 1, row * rh + rh - 4, tw - 2, 3); }
      }
    } else if (roof === 'gravel' || roof === 'felt') {
      for (let i = 0; i < (roof === 'gravel' ? 900 : 200); i++) { c.fillStyle = shade(col, 0.7 + Math.random() * 0.6); c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    } else if (roof === 'green') {
      for (let i = 0; i < 500; i++) { c.fillStyle = ['#4f7f3c', '#6f9f4f', '#8fbf5a', '#c8d870', '#e28fb5'][Math.floor(Math.random() * (i % 17 ? 4 : 5))]; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 0, 7); c.fill(); }
    } else if (roof === 'terrace') {
      for (let k = 0; k < 8; k++) { c.fillStyle = shade(col, 0.9 + (k % 2) * 0.12); c.fillRect(k * 16, 0, 14, h); }
    }
  };
  const stainedCanvas = (c, w, h) => {
    const cols = ['#e85d75', '#ffd447', '#4f9de8', '#5fcf8a', '#b58cff', '#ff9a3d'];
    for (let a = 0; a < 6; a++) for (let b = 0; b < 4; b++) { c.fillStyle = cols[(a * 3 + b * 5) % 6]; c.fillRect(a * w / 6, b * h / 4, w / 6, h / 4); }
    c.strokeStyle = '#2b2d36'; c.lineWidth = 3;
    for (let a = 0; a <= 6; a++) { c.beginPath(); c.moveTo(a * w / 6, 0); c.lineTo(a * w / 6, h); c.stroke(); }
    for (let b = 0; b <= 4; b++) { c.beginPath(); c.moveTo(0, b * h / 4); c.lineTo(w, b * h / 4); c.stroke(); }
    c.beginPath(); c.arc(w / 2, h / 2, h / 3, 0, 7); c.stroke();
  };

  let shellK = 0, shellSig = '', zoomedOut = false, revolver = null, flatGlass = null, shellDoor = null;
  function buildShell(s) {
    const o = { ...D.outOf(s) }, ex = s.design.expansions || {}, text = G.shopDef(s).sign;
    const flat = s.cur === 0 && !!s.property?.flat;
    const sig = JSON.stringify([o, ex, text, flat]);
    if (sig === shellSig) return;
    shellSig = sig;
    // Throw away the last build
    shellGroup.clear();
    for (const m of shellMats) { m.map?.dispose(); m.dispose(); }
    for (const g of shellGeos) g.dispose();
    for (const m of shellGlassMats) { const i = windows.indexOf(m); if (i >= 0) windows.splice(i, 1); }
    shellMats = []; shellGlassMats = []; shellGeos = []; smCache = new Map(); revolver = null; shellDoor = null;
    const wallCache = new Map();

    const P = D.OUT_PAINT[o.paint] || D.OUT_PAINT.cream, C = D.OUT_CANOPY[o.canopy], S = D.OUT_SIGN[o.sign];
    const R = D.OUT_ROOF[o.roof] || D.OUT_ROOF.felt, DR = D.OUT_DOOR[o.door] || D.OUT_DOOR.wood, WS = o.window || 'plain';
    const paint = shade(P.color, 1.12);
    const finishDraw = finishCanvas(o.finish || 'render', paint);
    const wallImg = canvasTex(128, 128, finishDraw);
    const glossy = o.finish === 'tiles' || o.finish === 'marble';
    const wallMat = (w, h) => { const key = `${Math.max(1, Math.round(w))}x${Math.max(1, Math.round(h))}`; if (wallCache.has(key)) return wallCache.get(key); const m = wallMat0(w, h); wallCache.set(key, m); return m; };
    const wallMat0 = (w, h) => { const t = wallImg.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); return sm('#ffffff', { map: t, roughness: glossy ? 0.35 : 0.9 }); };
    const trimM = sm(P.trim), darkM = sm('#2b2d36'), steelM = sm('#8d939c', { metalness: 0.4, roughness: 0.4 });
    const goldM = sm('#d4af37', { metalness: 0.7, roughness: 0.3 });
    const glass = (extra = {}) => { const m = sm('#bfe6ff', { emissive: '#bfe6ff', emissiveIntensity: 0.6, roughness: 0.2, ...extra }); if (!shellGlassMats.includes(m)) { shellGlassMats.push(m); windows.push(m); } return m; };
    const glassM = glass();
    flatGlass = sm('#bfe6ff', { emissive: '#ffd59a', emissiveIntensity: 0, roughness: 0.2 });
    const stainedM = WS === 'stained' ? (() => { const t = canvasTex(96, 64, stainedCanvas); return glass({ color: '#ffffff', map: t, emissiveMap: t }); })() : null;
    const frameM = WS === 'neon' ? sm('#ff4fa3', { emissive: '#ff4fa3', emissiveIntensity: 1.4 }) : WS === 'gold' ? goldM : trimM;
    const add = m => { m.castShadow = true; shellGroup.add(m); return m; };
    const sb = (w, h, d, m, x, y, z) => add(box(w, h, d, m, x, y, z));
    const wall = (w, h, d, x, y, z) => sb(w, h, d, wallMat(Math.max(w, d), h), x, y, z);
    const awnTex = C && C.a ? stripeTex(C.a, C.b) : null;
    const awnM = awnTex ? sm('#ffffff', { map: awnTex }) : null;

    // A window facing +z (rot 0) or +x (rot PI/2); (x, z) is the wall's outer face, y its sill
    function win(x, y, z, w, h, rot, glassOver = null) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
      const arch = WS === 'arched' || (WS === 'stained' && w < 2);
      const ah = arch ? Math.min(0.35, w / 2) : 0, hh = h - ah;
      const gm = glassOver || stainedM || glassM;
      g.add(box(w, hh, 0.05, gm, 0, 0, 0));
      if (arch) { const a = mesh(sg(new THREE.CircleGeometry(w / 2, 20, 0, PI)), gm, 0, hh, 0.03, false); a.scale.y = ah / (w / 2); g.add(a);
        const t = mesh(sg(new THREE.TorusGeometry(w / 2, 0.045, 6, 20, PI)), frameM, 0, hh, 0.05, false); t.scale.y = ah / (w / 2); g.add(t); }
      const f = 0.08;
      g.add(box(w + 0.24, 0.09, 0.2, frameM, 0, -0.09, 0.05)); // sill
      if (!arch) g.add(box(w + 0.12, f, 0.1, frameM, 0, hh - f / 2, 0.03));
      for (const dx of [-w / 2, w / 2]) g.add(box(f, hh, 0.1, frameM, dx, 0, 0.03));
      if (WS === 'georgian' || WS === 'gold') {
        const n = Math.max(2, Math.round(w / 0.55));
        for (let k = 1; k < n; k++) g.add(box(0.035, hh, 0.07, frameM, -w / 2 + (k * w) / n, 0, 0.04));
        for (const yy of WS === 'georgian' ? [hh / 3, (2 * hh) / 3] : [hh / 2]) g.add(box(w, 0.035, 0.07, frameM, 0, yy, 0.04));
      }
      if (WS === 'neon') g.add(box(w, 0.04, 0.06, frameM, 0, hh / 2, 0.05));
      g.traverse(m => { if (m.isMesh) m.castShadow = false; });
      shellGroup.add(g);
      return g;
    }

    const ROOF = flat ? 5.6 : 3.05;
    // ---- The shop: ground floor ----
    wall(9.5, 3.05, 0.22, 0, 0, 4.66);
    wall(0.22, 3.05, 7.6, 4.66, 0, -0.9); wall(0.22, 0.8, 1.9, 4.66, 2.25, 3.7);
    sb(9.56, 0.12, 0.28, trimM, 0, 2.98, 4.66); sb(0.28, 0.12, 9.56, trimM, 4.66, 2.98, 0);
    sb(9.56, 0.45, 0.26, sm(shade(P.color, 0.8)), 0, 0, 4.66); sb(0.26, 0.45, 7.64, sm(shade(P.color, 0.8)), 4.66, 0, -0.9); // plinth
    const wh = 1.45;
    for (const x of [-2.15, 2.15]) win(x, 0.85, 4.79, 3.1, wh, 0);
    win(4.79, 0.85, -2.0, 2.8, wh, PI / 2);
    // Pilasters between and either side of the shop windows
    for (const x of [-4.6, 0, 4.6]) sb(0.3, 2.3, 0.12, trimM, x, 0, 4.8);
    // The fascia with the shop's name (a plain painted board when there's no sign)
    const bg = S?.bg || shade(P.color, 0.7), fg = S?.fg || P.trim;
    const ftex = canvasTex(512, 40, (c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); if (S?.glow) { c.shadowColor = fg; c.shadowBlur = 12; } c.fillStyle = fg; c.font = `bold 28px ${o.sign === 'gold' ? 'Georgia, serif' : o.sign === 'neon' ? '"Trebuchet MS", sans-serif' : 'Georgia, serif'}`; c.textAlign = 'center'; c.fillText(text, w / 2, 30); });
    const fasciaM = sm('#ffffff', S?.glow ? { map: ftex, emissive: '#ffffff', emissiveMap: ftex, emissiveIntensity: 0.9 } : { map: ftex });
    shellGroup.add(mesh(sg(new THREE.PlaneGeometry(6.6, 0.5)), fasciaM, 0, 2.62, 4.84, false));
    sb(6.8, 0.07, 0.12, frameM, 0, 2.33, 4.82); sb(6.8, 0.07, 0.12, frameM, 0, 2.86, 4.82);
    // A hanging blade sign on the corner, once there's a sign
    if (S?.bg) {
      sb(0.05, 0.05, 0.7, darkM, 4.9, 2.45, 5.1);
      const bt = canvasTex(128, 128, (c, w, h) => { c.fillStyle = S.bg; c.fillRect(0, 0, w, h); c.fillStyle = S.fg; c.font = '72px "Segoe UI Emoji", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🥐', w / 2, h / 2 + 4); });
      const blade = mesh(sg(new THREE.BoxGeometry(0.04, 0.55, 0.55)), sm('#ffffff', S.glow ? { map: bt, emissive: '#ffffff', emissiveMap: bt, emissiveIntensity: 0.8 } : { map: bt }), 4.9, 2.12, 5.25, false);
      shellGroup.add(blade);
    }
    // The front awning (deeper once the front terrace is yours), with a valance; a matching one over the side window
    if (awnM) {
      const depth = ex.front ? 1.6 : 1.0;
      const aw = mesh(sg(new THREE.BoxGeometry(8.6, 0.05, depth)), awnM, 0, 2.28 - Math.sin(0.3) * depth / 2 + 0.05, 4.8 + depth / 2 * Math.cos(0.3)); aw.rotation.x = 0.3; add(aw);
      const vz = 4.8 + depth * Math.cos(0.3), vy = 2.28 - Math.sin(0.3) * depth;
      add(mesh(sg(new THREE.BoxGeometry(8.6, 0.2, 0.03)), awnM, 0, vy - 0.08, vz));
      if (o.canopy === 'gold') for (let k = 0; k < 22; k++) add(sphere(0.06, goldM, -4.2 + k * 0.4, vy - 0.2, vz));
      for (const x of [-4.25, 4.25]) sb(0.04, 0.04, depth, darkM, x, 2.3 - Math.sin(0.3) * depth / 2, 4.8 + depth / 2);
      const sw = mesh(sg(new THREE.BoxGeometry(0.9, 0.05, 3.3)), awnM, 5.15, 2.25, -2.0); sw.rotation.z = -0.3; add(sw);
    }
    // ---- The door (on the side), with its frame and a hood ----
    const dc = DR.color;
    sb(0.12, 2.3, 0.12, frameM, 4.8, 0, 2.88); sb(0.12, 2.3, 0.12, frameM, 4.8, 0, 4.52); sb(0.14, 0.12, 1.76, frameM, 4.8, 2.22, 3.7);
    if (o.door === 'revolving') {
      const R = 0.68, X = 4.9, Z = 3.7, H = 2.1;
      const clear = sm('#d8f0ff', { roughness: 0.1, metalness: 0.2, side: THREE.DoubleSide, emissive: '#9fd4ff', emissiveIntensity: 0.08 });
      clear.userData.glass = 0.28; // how see-through it stays
      const frame = sm('#2b2d36', { metalness: 0.5, roughness: 0.35 });
      // The two curved glass walls, open front and back
      for (const t0 of [PI * 0.12, PI * 1.12]) shellGroup.add(mesh(sg(new THREE.CylinderGeometry(R, R, H, 24, 1, true, t0, PI * 0.76)), clear, X, H / 2, Z, false));
      // Posts where the glass walls end, a canopy and a floor ring
      for (const t of [PI * 0.12, PI * 0.88, PI * 1.12, PI * 1.88]) sb(0.06, H, 0.06, frame, X + Math.sin(t) * R, 0, Z + Math.cos(t) * R);
      add(cyl(R + 0.08, R + 0.08, 0.22, goldM, X, H, Z, 28)); add(cyl(R + 0.04, R + 0.04, 0.025, steelM, X, 0.005, Z, 28));
      // The wings, kept apart so they can turn
      revolver = new THREE.Group(); revolver.position.set(X, 0, Z);
      const wingGlass = sm('#d8f0ff', { roughness: 0.1, metalness: 0.2, side: THREE.DoubleSide }); wingGlass.userData.glass = 0.35;
      for (let k = 0; k < 4; k++) {
        const a = k * PI / 2, w = new THREE.Group(); w.rotation.y = a;
        w.add(box(R - 0.06, H - 0.1, 0.02, wingGlass, (R - 0.06) / 2, 0.05, 0, false));
        w.add(box(0.04, H - 0.1, 0.05, frame, R - 0.06, 0.05, 0, false));
        w.add(box(R - 0.06, 0.05, 0.05, frame, (R - 0.06) / 2, 0.05, 0, false));
        revolver.add(w);
      }
      revolver.add(cyl(0.05, 0.05, H, frame, 0, 0, 0, 10, false));
      revolver.traverse(m => { if (m.isMesh) m.userData.keep = true; });
      shellGroup.add(revolver);
    } else {
      const leafM = o.door === 'gold' ? goldM : sm(dc, o.door === 'glass' ? { metalness: 0.3 } : {});
      // The leaf hangs on its own hinge (by the far post) so it can swing out when someone comes or goes
      shellDoor = new THREE.Group(); shellDoor.position.set(4.8, 0, 4.45); shellGroup.add(shellDoor);
      const db = (w, h, d, m, x, y, z) => { const b = box(w, h, d, m, x - 4.8, y, z - 4.45); b.castShadow = true; b.userData.keep = true; shellDoor.add(b); return b; };
      if (o.door === 'glass') { db(0.06, 2.12, 1.5, glassM, 4.79, 0, 3.7); for (const z of [2.96, 4.44]) db(0.08, 2.12, 0.06, leafM, 4.8, 0, z); db(0.08, 0.08, 1.5, leafM, 4.8, 2.06, 3.7); db(0.06, 0.9, 0.04, steelM, 4.86, 0.6, 3.5); }
      else {
        db(0.06, 2.12, 1.5, leafM, 4.79, 0, 3.7);
        db(0.07, 0.75, 0.9, glassM, 4.8, 1.15, 3.7);
        for (const z of [3.35, 4.05]) db(0.08, 0.6, 0.5, sm(shade(dc, 1.15)), 4.8, 0.25, z);
        { const k = sphere(0.05, goldM, 4.88 - 4.8, 1.05, 3.12 - 4.45); k.userData.keep = true; shellDoor.add(k); }
        if (o.door === 'victorian') { const fl = mesh(sg(new THREE.CircleGeometry(0.62, 18, 0, PI)), glassM, 4.85, 2.28, 3.7, false); fl.rotation.y = PI / 2; fl.scale.y = 0.6; shellGroup.add(fl); sb(0.1, 0.06, 1.76, goldM, 4.86, 2.1, 3.7); }
      }
      if (o.door === 'gold' || o.door === 'victorian') add(box(0.3, 0.04, 0.6, sm('#7a1f2e'), 5.0, 0, 3.7)); // a mat
    }
    { const sg2 = mesh(new THREE.PlaneGeometry(0.5, 0.25), openSignM, 4.86, 1.25, o.door === 'revolving' ? 4.75 : 3.3, false); sg2.rotation.y = PI / 2; sg2.userData.keep = true; shellGroup.add(sg2); }
    // Door hood: striped to match the awning, or a little painted canopy on brackets
    if (o.door !== 'revolving') {
      const hood = mesh(sg(new THREE.BoxGeometry(0.75, 0.06, 2.0)), awnM || trimM, 5.12, 2.5, 3.7); hood.rotation.z = -0.25; add(hood);
      for (const z of [2.85, 4.55]) { const br = box(0.45, 0.04, 0.04, darkM, 4.98, 2.25, z); br.rotation.z = 0.7; shellGroup.add(br); }
    }

    // ---- The flat upstairs: a whole second storey ----
    if (flat) {
      wall(9.5, 2.55, 0.22, 0, 3.05, 4.66); wall(9.5, 2.55, 0.22, 0, 3.05, -4.66);
      wall(0.22, 2.55, 9.5, 4.66, 3.05, 0); wall(0.22, 2.55, 9.5, -4.66, 3.05, 0);
      for (const x of [-3.0, 0, 3.0]) win(x, 3.6, 4.79, 1.2, 1.4, 0, flatGlass);
      for (const z of [-2.6, 0.2, 3.0]) win(4.79, 3.6, z, 1.2, 1.4, PI / 2, flatGlass);
      if (o.extras?.boxes) for (const x of [-3.0, 0, 3.0]) { sb(1.1, 0.18, 0.26, sm('#7a4a2e'), x, 3.42, 4.92); for (let k = 0; k < 4; k++) add(sphere(0.07, sm(['#ff7eb6', '#ffd447', '#ffffff', '#b58cff'][k]), x - 0.36 + k * 0.24, 3.66, 4.92)); }
      sb(9.7, 0.14, 0.3, trimM, 0, 5.5, 4.68); sb(0.3, 0.14, 9.7, trimM, 4.68, 5.5, 0);
    }

    // ---- The shop's roof ----
    const roofCol = R.color || '#5e5864';
    const roofImg = canvasTex(128, 128, roofCanvas(o.roof || 'felt', roofCol), R.pitched ? [6, 4] : [5, 5]);
    const roofM = sm('#ffffff', { map: roofImg, roughness: o.roof === 'slate' ? 0.55 : 0.9 });
    const edgeM = sm(shade(P.color, 0.65));
    if (R.pitched) {
      const rise = 2.0, half = 5.0, L = Math.hypot(half, rise), a = Math.atan2(rise, half);
      for (const sgn of [1, -1]) { const sl = mesh(sg(new THREE.BoxGeometry(10.0, 0.14, L)), roofM, 0, ROOF + rise / 2, sgn * half / 2); sl.rotation.x = sgn * a; add(sl); }
      add(mesh(sg(new THREE.CylinderGeometry(0.1, 0.1, 10.1, 8)), sm(shade(roofCol, 0.7)), 0, ROOF + rise + 0.04, 0)).rotation.z = PI / 2;
      const tri = new THREE.Shape(); tri.moveTo(-4.75, 0); tri.lineTo(4.75, 0); tri.lineTo(0, rise * 0.95); tri.closePath();
      const gableM = wallMat0(5, 2); gableM.side = THREE.DoubleSide;
      for (const x of [4.77, -4.77]) { const gm = mesh(sg(new THREE.ShapeGeometry(tri)), gableM, x, ROOF, 0, false); gm.rotation.y = PI / 2; shellGroup.add(gm); }
      // A round window in the gable, and a chimney
      const ow = mesh(sg(new THREE.CircleGeometry(0.35, 18)), stainedM || glassM, 4.8, ROOF + 0.8, 0, false); ow.rotation.y = PI / 2; shellGroup.add(ow);
      const ot = mesh(sg(new THREE.TorusGeometry(0.35, 0.05, 6, 18)), frameM, 4.82, ROOF + 0.8, 0, false); ot.rotation.y = PI / 2; shellGroup.add(ot);
      const chim = wallMat(1, 3); sb(0.7, 2.6, 0.7, chim, 2.8, ROOF, -2.2); sb(0.8, 0.12, 0.8, trimM, 2.8, ROOF + 2.6, -2.2);
      for (const dx of [-0.15, 0.15]) add(cyl(0.09, 0.11, 0.35, sm('#b5654a'), 2.8 + dx, ROOF + 2.72, -2.2, 10));
      // Roof windows on the front slope for the kitchen island
      if (ex.island) for (const x of ex.island2 ? [-3.0, -0.8] : [-1.9]) { const y = ROOF + rise * 0.55 + 0.1, rf = mesh(sg(new THREE.BoxGeometry(1.3, 0.1, 1.4)), trimM, x, y - 0.02, half * 0.45); rf.rotation.x = a; add(rf);
          const rw = mesh(sg(new THREE.BoxGeometry(1.1, 0.1, 1.2)), glassM, x, y, half * 0.45); rw.rotation.x = a; add(rw); }
    } else {
      sb(9.6, 0.22, 9.6, roofM, 0, ROOF, 0);
      if (o.roof === 'terrace') {
        // Posts and a glass rail instead of a parapet, with parasols and tables
        for (const [w, d, x, z] of [[9.6, 0.05, 0, 4.75], [0.05, 9.6, 4.75, 0]]) { sb(w, 0.06, d || 0.06, steelM, x, ROOF + 1.1, z); sb(w, 0.9, d, glass({ opacity: 0 }), x, ROOF + 0.22, z); }
        for (const [w, d, x, z] of [[9.7, 0.15, 0, -4.78], [0.15, 9.7, -4.78, 0]]) sb(w, 0.3, d, edgeM, x, ROOF + 0.22, z);
        for (const [x, z, c] of [[-2.2, 1.8, '#e85d75'], [1.8, 2.2, '#4f9de8'], [-0.5, -1.6, '#ffd447']]) {
          add(cyl(0.03, 0.03, 2.0, steelM, x, ROOF + 0.22, z, 6)); add(mesh(sg(new THREE.ConeGeometry(0.9, 0.35, 10)), sm(c), x, ROOF + 2.25, z));
          add(cyl(0.45, 0.45, 0.05, sm('#f4f0e8'), x, ROOF + 0.92, z, 14)); add(cyl(0.05, 0.08, 0.7, darkM, x, ROOF + 0.22, z, 6));
          for (const a of [0, PI]) add(box(0.35, 0.45, 0.35, sm('#a8703f'), x + Math.cos(a) * 0.7, ROOF + 0.22, z + Math.sin(a) * 0.7));
        }
        for (const [x, z] of [[3.9, -3.9], [-3.9, 3.9], [3.9, 3.9]]) { add(cyl(0.3, 0.25, 0.5, sm('#3a3d44'), x, ROOF + 0.22, z, 12)); add(sphere(0.38, sm('#3f7a3a'), x, ROOF + 0.95, z)); }
        sb(1.2, 2.3, 1.2, wallMat(1.2, 2.3), -3.6, ROOF + 0.22, -3.6); // stair hut
      } else {
        for (const [w, d, x, z] of [[9.7, 0.15, 0, 4.78], [9.7, 0.15, 0, -4.78], [0.15, 9.7, 4.78, 0], [0.15, 9.7, -4.78, 0]]) sb(w, 0.32, d, edgeM, x, ROOF + 0.22, z);
        sb(9.8, 0.06, 0.24, trimM, 0, ROOF + 0.54, 4.78); sb(0.24, 0.06, 9.8, trimM, 4.78, ROOF + 0.54, 0);
        if (o.roof === 'solar') for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
          const pt = canvasTex(64, 40, (c, w, h) => { c.fillStyle = '#1d2a4a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8aa6d6'; c.lineWidth = 1; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(i * w / 6, 0); c.lineTo(i * w / 6, h); c.stroke(); } for (let j = 1; j < 3; j++) { c.beginPath(); c.moveTo(0, j * h / 3); c.lineTo(w, j * h / 3); c.stroke(); } });
          const pm = mesh(sg(new THREE.BoxGeometry(1.8, 0.05, 1.1)), sm('#ffffff', { map: pt, roughness: 0.3 }), -3.0 + k * 2.0, ROOF + 0.6, -2.6 + r * 2.4); pm.rotation.x = 0.4; add(pm);
          sb(0.05, 0.4, 0.05, steelM, -3.0 + k * 2.0, ROOF + 0.22, -2.3 + r * 2.4);
        }
        if (o.roof === 'green') for (const [x, z] of [[-3.2, -3], [2.6, -2.8], [-2.8, 2.6], [3.2, 2.4], [0.4, 0.2]]) { add(sphere(0.32, sm('#4f7f3c'), x, ROOF + 0.4, z)); add(sphere(0.22, sm('#6f9f4f'), x + 0.3, ROOF + 0.32, z + 0.2)); }
        if (o.roof === 'felt' || o.roof === 'gravel') {
          sb(1.1, 0.6, 0.8, steelM, 2.6, ROOF + 0.22, -2.6);
          for (const x of [-3.2, 0.6]) sb(0.25, 0.5, 0.25, darkM, x, ROOF + 0.22, -3.6);
        }
        // Roof lanterns over the kitchen island
        if (ex.island) for (const z of ex.island2 ? [-2.4, -0.6] : [-1.6]) {
          sb(1.5, 0.3, 1.2, trimM, -1.5, ROOF + 0.22, z);
          const ln = mesh(sg(new THREE.ConeGeometry(0.95, 0.55, 4)), glassM, -1.5, ROOF + 0.8, z); ln.rotation.y = PI / 4; ln.scale.z = 0.8; add(ln);
        }
      }
    }

    // ---- The small back room: a plain block with a door and a camera, its own flat roof (the basement is below) ----
    const backM = sm('#55606b'), backTex = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#5b6570'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,.18)'; for (let r = 0; r < 4; r++) c.fillRect(0, r * 16 + 15, w, 1); for (let r = 0; r < 4; r++) c.fillRect((r % 2) * 16 + 31, r * 16, 1, 16); });
    backTex.wrapS = backTex.wrapT = THREE.RepeatWrapping; backTex.repeat.set(3, 3);
    sb(3.1, 3.05, 0.22, sm('#ffffff', { map: backTex }), -6.15, 0, 4.66);
    sb(0.9, 2.0, 0.06, darkM, -6.6, 0, 4.8); sb(0.5, 0.18, 0.02, sm('#e8c02b'), -6.6, 1.6, 4.84); // STAFF ONLY
    sb(0.3, 0.2, 0.25, darkM, -7.3, 2.5, 4.85); // a camera
    sb(0.22, 3.05, 4.3, sm('#ffffff', { map: backTex }), -7.72, 0, 2.5);
    sb(0.06, 2.0, 1.15, darkM, -7.85, 0, 2.0); // the back door
    sb(3.3, 0.22, 4.5, backM, -6.15, 3.05, 2.5);
    for (const [w, d, x, z] of [[3.4, 0.15, -6.15, 4.78], [3.4, 0.15, -6.15, 0.3], [0.15, 4.6, -7.78, 2.5]]) sb(w, 0.3, d, sm('#4a4550'), x, 3.27, z);
    sb(0.35, 0.45, 0.35, darkM, -6.6, 3.27, 1.5); sb(0.5, 0.06, 0.5, darkM, -6.6, 3.72, 1.5);
    // a grate in the yard over the basement's air vent, once there are benches down there
    if (ex.bench) { sb(1.0, 0.03, 0.7, steelM, -9.2, 0, -1.0); for (let k = 0; k < 5; k++) sb(0.9, 0.02, 0.04, darkM, -9.2, 0.03, -1.25 + k * 0.12); }

    // ---- Out front and down the side: what the terraces and expansions add ----
    const planter = (x, z) => { sb(0.7, 0.45, 0.7, sm(shade(P.color, 0.75)), x, 0, z); add(sphere(0.34, sm('#3f7a3a'), x, 0.75, z)); add(sphere(0.06, sm('#ff7eb6'), x + 0.15, 0.95, z + 0.2)); };
    // (no parasols over the food carts: the shop's awning already hangs over them)
    // A glazed lean-to down the side for the stalls, on slim posts with a gutter
    if (ex.stalls) {
      const lt = mesh(sg(new THREE.BoxGeometry(2.45, 0.05, 7.4)), awnM || glass({ emissiveIntensity: 0.2 }), 5.95, 2.5, -1.05); lt.rotation.z = -0.22; add(lt);
      sb(0.1, 0.1, 7.4, darkM, 7.12, 2.18, -1.05);
      for (const z of [-4.7, -3.25, -1.75, -0.25, 1.25, 2.6]) sb(0.07, 2.2, 0.07, darkM, 7.12, 0, z);
      sb(0.12, 0.08, 7.5, trimM, 4.86, 2.72, -1.05);
    }
    // One mesh per material: a couple of dozen draw calls instead of a few hundred
    mergeStatic(shellGroup);
    for (const g of shellGeos) g.dispose();
    shellGeos = [];
    shellGroup.traverse(o => { if (o.isMesh && !o.userData.keep) shellGeos.push(o.geometry); }); // kept parts use shared shapes
  }
  const FOOTPRINT = new THREE.Box3(new THREE.Vector3(-4.85, -0.5, -4.85), new THREE.Vector3(4.85, 3.2, 4.85)), cullBox = new THREE.Box3();
  // The small back room is culled on its own (the yard behind it isn't covered by the building)
  const FOOT_BACK = new THREE.Box3(new THREE.Vector3(-7.85, -2.0, 0.25), new THREE.Vector3(-4.6, 3.2, 4.85));
  let culled = [], cullT = 0;
  function cullInside(on, dt) {
    if (!on) { if (culled.length) { for (const o of culled) o.layers.set(0); culled = []; } cullT = 0; return; }
    if ((cullT -= dt) > 0) return;
    cullT = 0.5; // people walk in and out, so look again twice a second
    for (const o of culled) o.layers.set(0);
    culled = [];
    scene.updateMatrixWorld();
    const walk = o => {
      if (o === shellGroup || o.isLight || o.isCamera) return;
      if ((o.isMesh || o.isSprite) && !o.isInstancedMesh && o.geometry) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        cullBox.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
        if (FOOTPRINT.containsBox(cullBox) || FOOT_BACK.containsBox(cullBox)) { o.layers.set(1); culled.push(o); }
      }
      for (const c of o.children) walk(c);
    };
    walk(scene);
  }
  const clipCut = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 50), new THREE.Plane(new THREE.Vector3(-1, 0, 0), -4.8), new THREE.Plane(new THREE.Vector3(0, 0, -1), -4.8)];
  // The cut is set on every material (only materials can combine planes so that a point is cut only where all three
  // agree); a sweep gives it to anything new. At rest upstairs it sits far above everything.
  renderer.localClippingEnabled = true;
  let clipSweep = 0;
  function sweepClip() {
    scene.traverse(o => {
      if (!o.material) return;
      for (const m of [].concat(o.material)) if (m && m.clippingPlanes !== clipCut && !m.isShaderMaterial) { m.clippingPlanes = clipCut; m.clipIntersection = true; m.clipShadows = true; m.needsUpdate = true; } // the cut-away shop casts no shadows into the basement either
    });
  }
  const fadeEl = document.createElement('div');
  fadeEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0;background:radial-gradient(ellipse at 50% 55%, rgba(14,10,20,.82) 0%, rgba(6,4,10,.98) 65%)';
  document.body.appendChild(fadeEl);
  let shownBack = false, transT = 1;
  const TRANS = 0.75; // seconds, dark in the middle
  function updateUnder(dt) {
    if ((clipSweep -= dt) <= 0) { clipSweep = 1; sweepClip(); }
    const wantBack = view.zone === 'back';
    if (transT >= 1 && wantBack !== shownBack) transT = 0; // set off
    if (transT < 1) {
      transT = Math.min(1, transT + dt / TRANS);
      if (transT >= 0.5 && shownBack !== wantBack) { shownBack = wantBack; cam.target.copy(ZONES[view.zone].center); } // in the dark: swap, and be there
      const e = Math.sin(PI * transT);
      fadeEl.style.opacity = String(e * e * (3 - 2 * e));
    } else fadeEl.style.opacity = '0';
    // At rest upstairs the cut sits far above everything (the planes stay set, so no material is ever rebuilt)
    clipCut[0].constant = shownBack ? -0.3 : 1e4;
    cellar.visible = backDecorGroup.visible = shownBack;
  }
  // Zooming out past the normal view fades the building in; zooming back in shows the inside again
  function updateShell(s, dt) {
    // Designing the outside shows the building whatever the zoom; any other design tab shows the inside
    const want = view.zone !== 'shop' ? 0 : view.design ? (view.design.cat === 'outside' && !view.design.back ? 1 : 0) : Math.max(0, Math.min(1, (0.85 - cam.zoom) / 0.2));
    shellK += (want - shellK) * Math.min(1, dt * 6);
    // Tell the UI when the view has gone outside (by zoom alone; a little either way so it doesn't flicker)
    const out = view.zone === 'shop' && (zoomedOut ? cam.zoom < 0.8 : cam.zoom < 0.72);
    if (out !== zoomedOut) { zoomedOut = out; onOutside?.(out); }
    if (shellK > 0.01) buildShell(s);
    shellGroup.visible = shellK > 0.01;
    insideOnly.visible = shellK < 0.5;
    cullInside(shellK > 0.98, dt);
    const solid = shellK > 0.98;
    for (const m of shellMats) {
      if (m.userData.glass) { m.opacity = shellK * m.userData.glass; m.depthWrite = false; continue; } // glass stays see-through
      m.opacity = shellK;
      if (m.transparent === solid) { m.transparent = !solid; m.depthWrite = solid; m.needsUpdate = true; }
    }
    if (flatGlass) { const h = G.localHour(s.clock), lit = (h >= 17.5 && h < 23.5) || (h >= 6 && h < 8); flatGlass.emissiveIntensity += ((lit ? 0.9 : 0.05) - flatGlass.emissiveIntensity) * Math.min(1, dt * 2); }
    if (revolver && shellK > 0.01) revolver.rotation.y += dt * (drumBusy ? 2.2 : 0.4);
    overlayEl.style.opacity = String(1 - shellK);
    overlayEl.style.pointerEvents = shellK > 0.5 ? 'none' : '';
  }

  // ---------- What the expansions add: an island, carts, stalls, benches, a cellar hatch, the annex ----------
  const expGroup = new THREE.Group(); scene.add(expGroup);
  let expSig = '';
  function syncExpansions(s) {
    const ex = s.design.expansions || {}, o = s.design.outside || {};
    const sig = JSON.stringify([ex, o.paint, o.canopy]);
    if (sig === expSig) return;
    expSig = sig;
    disposeMaps(expGroup); expGroup.clear();
    const add = m => { m.traverse?.(x => { if (x.isMesh) x.receiveShadow = true; }); expGroup.add(m); return m; };
    const plank = mat('#b88452'), steel = mat('#8d939c', { metalness: 0.5, roughness: 0.4 });
    // Carts and stalls: low and neat (no tall frames to hide the machines), skirted in the shop's canopy stripes
    // or its paint; their parasols and the stalls' lean-to roof are part of the zoomed-out building
    const P = D.OUT_PAINT[o.paint] || D.OUT_PAINT.cream, C = D.OUT_CANOPY[o.canopy];
    const skirt = C && C.a ? smat({ map: stripeTex(C.a, C.b), roughness: 0.8 }) : mat(P.color), topM = mat(P.trim), darkW = mat('#2b2d36');
    // The machine stands on each one, so they stay low: a wheeled deck for a cart, a boarded platform for a stall
    const cart = (x, z) => {
      const g = new THREE.Group();
      g.add(mesh(geo('cartskirt', () => new THREE.BoxGeometry(1.2, 0.16, 1.0)), skirt, 0, 0.12, 0));
      g.add(box(1.26, 0.04, 1.06, topM, 0, 0.2, 0));
      for (const dx of [-0.45, 0.45]) for (const dz of [-0.52, 0.52]) { const w = cyl(0.13, 0.13, 0.05, darkW, dx, 0, dz, 14); w.rotation.x = PI / 2; w.position.y = 0.13; g.add(w); }
      g.add(box(0.04, 0.6, 0.04, '#3a3d44', -0.62, 0.2, 0.4)); g.add(box(0.04, 0.6, 0.04, '#3a3d44', -0.62, 0.2, -0.4)); g.add(box(0.04, 0.04, 0.84, '#3a3d44', -0.62, 0.8, 0));
      g.position.set(x, 0, z); add(g);
    };
    const stall = (x, z) => {
      const g = new THREE.Group();
      g.add(box(1.3, 0.08, 1.1, '#a8703f', 0, 0, 0));
      g.add(mesh(geo('stallskirt', () => new THREE.BoxGeometry(1.34, 0.12, 0.02)), skirt, 0, 0.06, 0.56));
      g.add(box(1.34, 0.03, 1.14, topM, 0, 0.08, 0));
      g.position.set(x, 0, z); g.rotation.y = PI / 2; add(g);
    };
    rebuildBasement(ex);
    invalidateNav();
  }

  // Design overlay for the back room: green where decor can go
  const BCOLS = D.BACK_GRID.cols + D.BACK_GRID.dig, BROWS = D.BACK_GRID.rows + D.BACK_GRID.dig;
  const ovBack = canvasOf(BCOLS * TS, BROWS * TS);
  const ovBackMesh = mesh(new THREE.PlaneGeometry(BCOLS, BROWS), ovMatB(ovBack), BX + D.BACK_GRID.x0 - 0.5 + BCOLS / 2, BY + 0.02, D.BACK_GRID.z0 - 0.5 + BROWS / 2, false);
  ovBackMesh.rotation.x = -PI / 2; ovBackMesh.visible = false; scene.add(ovBackMesh);
  function ovMatB(t) { return new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false }); }
  let ovBackSig = '';
  function paintBackOverlay(s, dv) {
    const c = ovBack.ctx, b = s.design.back || { decor: [] };
    if (dv?.cat === 'bmachines') {
      c.clearRect(0, 0, BCOLS * TS, BROWS * TS);
      const bb = D.backBounds(D.backExt(s)), mv = dv.moving, name = mv ? LAB_MACHINES[s.lab[mv.idx]?.type]?.name : LAB_MACHINES[dv.item]?.name;
      for (let bz = 0; bz < bb.rows; bz++) for (let bx = 0; bx < bb.cols; bx++) {
        const want = mv || dv.item;
        const ok = want && D.backBestRot(s, bx, bz, mv ? { kind: 'machine', idx: mv.idx } : null, name) >= 0;
        c.fillStyle = !want ? 'rgba(255,255,255,0.08)' : ok ? 'rgba(121,201,154,.28)' : 'rgba(229,122,131,.15)';
        c.fillRect(bx * TS + 2, bz * TS + 2, TS - 4, TS - 4);
      }
      ovBack.tex.needsUpdate = true;
      return;
    }
    c.clearRect(0, 0, BCOLS * TS, BROWS * TS);
    const ext = D.backExt(s), off = 0, bb = D.backBounds(ext);
    for (let bz = 0; bz < bb.rows; bz++) for (let bx = 0; bx < bb.cols; bx++) {
      const blocked = D.backCellBlocked(bx, bz, ext), used = b.decor.some(d => d.bx === bx && d.bz === bz);
      // Free squares where decor would cut someone off show amber too
      const walls = !blocked && !used && !D.backPathsOk(s, [...b.decor, { bx, bz }]);
      c.fillStyle = blocked ? 'rgba(229,122,131,.18)' : used ? 'rgba(233,178,119,.25)' : walls ? 'rgba(229,122,131,.12)' : 'rgba(121,201,154,.28)';
      c.fillRect(bx * TS + 2, (bz + off) * TS + 2, TS - 4, TS - 4);
    }
    ovBack.tex.needsUpdate = true;
  }
  function rebuildDecor(s) {
    decorGroup.clear(); artBack.clear(); artLeft.clear();
    s.design.decor.forEach((it, idx) => {
      const m = texturize(decorModel(it.type));
      const { x, z } = D.cellCenter(it.cx, it.cz);
      m.position.set(x, 0, z); m.rotation.y = (it.rot || 0) * PI / 2;
      m.userData = { act: 'design', kind: 'decor', idx, cx: it.cx, cz: it.cz };
      m.traverse(o => { if (o.isMesh) o.castShadow = true; });
      decorGroup.add(m);
    });
    for (const [key, type] of Object.entries(s.design.art)) {
      const m = artModel(type, key);
      const i = Number(key.slice(1));
      if (key[0] === 'b') { m.position.set(-4.5 + i + 0.5, 2.3, -4.47); artBack.add(m); }
      else { m.position.set(-4.47, 2.3, -4.5 + i + 0.5); m.rotation.y = PI / 2; artLeft.add(m); }
    }
  }

  // Design-mode overlays: a grid over the floor (green where you can place, red where it must stay clear)
  // and panel outlines on the walls. Only shown while designing.
  const ovIn = canvasOf(9 * TS, 9 * TS), ovFront = canvasOf(9 * TS, 2 * TS), ovSide = canvasOf(2 * TS, 7 * TS);
  const ovWallB = canvasOf(9 * TS, 2 * TS), ovWallL = canvasOf(9 * TS, 2 * TS);
  const ovMat = t => new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false });
  const overlay = new THREE.Group();
  overlay.add(flatPlane(9, 9, ovMat(ovIn), 0, 0.03, 0), flatPlane(9, 2, ovMat(ovFront), 0, 0.03, 5.75), flatPlane(2, 7, ovMat(ovSide), 5.75, 0.03, -1.0));
  const ovB = mesh(new THREE.PlaneGeometry(9, 2), ovMat(ovWallB), 0, 2.0, -4.485, false);
  const ovL = mesh(new THREE.PlaneGeometry(9, 2), ovMat(ovWallL), -4.485, 2.0, 0, false); ovL.rotation.y = PI / 2;
  overlay.add(ovB, ovL); overlay.visible = false; scene.add(overlay);
  const selRing = mesh(new THREE.TorusGeometry(0.46, 0.04, 6, 28), new THREE.MeshBasicMaterial({ color: '#ffd447' }), 0, 0.06, 0, false);
  selRing.rotation.x = PI / 2; selRing.visible = false; scene.add(selRing);
  // Invisible planes to tap terraces you don't own yet
  const pickMat = new THREE.MeshBasicMaterial({ visible: false });
  const pickFront = flatPlane(9, 2, pickMat, 0, 0.004, 5.75), pickSide = flatPlane(2, 7, pickMat, 5.75, 0.004, -1.0);
  scene.add(pickFront, pickSide);

  function paintOverlay(s, dv) {
    const floorMode = dv.cat === 'floor' || dv.cat === 'decor' || dv.cat === 'kitchen';
    const wallMode = dv.cat === 'wall' || dv.cat === 'art';
    const tint = (ctx, x, y, cx, cz) => {
      const owned = D.cellOwned(s, cx, cz);
      if (!owned) { ctx.fillStyle = 'rgba(40,30,60,0.35)'; ctx.fillRect(x, y, TS, TS); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([4, 4]); ctx.strokeRect(x + 2, y + 2, TS - 4, TS - 4); ctx.setLineDash([]); return; }
      if (dv.cat === 'kitchen') {
        const mv = dv.moving, kind = mv ? mv.kind : dv.item === 'counter' ? 'counter' : dv.item ? 'machine' : null;
        if (kind) {
          const name = mv?.kind === 'machine' ? MACHINES[s.machines[mv.idx]?.type]?.name : mv?.kind === 'till' ? 'till' : dv.item?.startsWith('m:') ? MACHINES[dv.item.slice(2)]?.name : 'counter';
          const ok = D.bestRot(s, kind, cx, cz, mv ? { kind: mv.kind, idx: mv.idx } : null, { name }) >= 0;
          ctx.fillStyle = ok ? 'rgba(95,211,141,0.28)' : 'rgba(255,93,108,0.18)'; ctx.fillRect(x + 1, y + 1, TS - 2, TS - 2);
        }
      }
      if (dv.cat === 'decor') {
        const type = dv.moving != null ? s.design.decor[dv.moving]?.type : dv.item;
        const ok = type ? !D.canPlace(s, type, cx, cz, dv.moving ?? -1) : !D.shopItems(s).some(it => it.cx === cx && it.cz === cz);
        ctx.fillStyle = ok ? 'rgba(95,211,141,0.28)' : 'rgba(255,93,108,0.18)'; ctx.fillRect(x + 1, y + 1, TS - 2, TS - 2);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, TS - 1.5, TS - 1.5);
    };
    for (const o of [ovIn, ovFront, ovSide, ovWallB, ovWallL]) o.ctx.clearRect(0, 0, o.cv.width, o.cv.height);
    if (floorMode) {
      for (let cx = 0; cx < 9; cx++) for (let cz = 0; cz < 9; cz++) tint(ovIn.ctx, cx * TS, cz * TS, cx, cz);
      for (let cx = 0; cx < 9; cx++) for (let cz = 9; cz <= 10; cz++) tint(ovFront.ctx, cx * TS, (cz - 9) * TS, cx, cz);
      for (let cx = 9; cx <= 10; cx++) for (let cz = 0; cz <= 6; cz++) tint(ovSide.ctx, (cx - 9) * TS, cz * TS, cx, cz);
    }
    if (wallMode) {
      const draw = (ctx, col, key) => {
        if (dv.cat === 'art') { ctx.fillStyle = D.artAllowed(key) ? 'rgba(95,211,141,0.22)' : 'rgba(255,93,108,0.18)'; ctx.fillRect(col * TS + 2, 2, TS - 4, 2 * TS - 4); }
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.strokeRect(col * TS + 1, 1, TS - 2, 2 * TS - 2);
      };
      for (let i = 0; i < 9; i++) draw(ovWallB.ctx, i, 'b' + i);
      for (let j = 0; j < 9; j++) draw(ovWallL.ctx, 8 - j, 'l' + j);
    }
    for (const o of [ovIn, ovFront, ovSide, ovWallB, ovWallL]) o.tex.needsUpdate = true;
  }

  let designSig = '', decorSig = '', overlaySig = '';
  function syncDesign(s, now) {
    const d = s.design;
    if (!d) return;
    syncBack(s); syncOutside(s); syncExpansions(s);
    const bdv = view.design?.back ? view.design : null;
    ovBackMesh.visible = !!bdv && (bdv.cat === 'bdecor' || bdv.cat === 'bmachines');
    if (bdv) {
      const sig = JSON.stringify([d.back?.decor, bdv.cat, bdv.item, bdv.moving, d.expansions, s.lab.map(m => [m.bx, m.bz, m.rot])]);
      if (sig !== ovBackSig) { ovBackSig = sig; paintBackOverlay(s, bdv); }
      const sel = bdv.cat === 'bmachines' ? (bdv.pick ? s.lab[bdv.pick.idx] : null) : bdv.sel != null ? d.back?.decor?.[bdv.sel] : null;
      selRing.visible = !!sel;
      if (sel) { const { x, z } = D.backCellCenter(sel.bx, sel.bz); selRing.position.set(BX + x, BY + 0.06 + Math.abs(Math.sin(now * 4)) * 0.05, z); }
      overlay.visible = false;
      return;
    }
    const ds = JSON.stringify([d.floor, d.wall, d.expansions]);
    if (ds !== designSig) { designSig = ds; paintDesign(s); }
    const dcs = JSON.stringify([d.decor, d.art]);
    if (dcs !== decorSig) { decorSig = dcs; rebuildDecor(s); }
    frontTerrace.visible = !!d.expansions.front;
    sideTerrace.visible = !!d.expansions.side;
    frontWall.visible = !d.expansions.front;
    sideWall.visible = !d.expansions.side;
    const dv = view.design;
    overlay.visible = !!dv;
    if (dv) {
      const os = JSON.stringify([dv.cat, dv.item, dv.moving, d.decor, d.expansions, !!s.upgrades.catering, d.counterAt, d.tillAt, s.machines.map(m => [m.cx, m.cz, m.rot])]);
      if (os !== overlaySig) { overlaySig = os; paintOverlay(s, dv); }
      const pk = dv.cat === 'kitchen' ? dv.pick : null;
      const sel = pk ? (pk.kind === 'machine' ? s.machines[pk.idx] : pk.kind === 'till' ? D.tillCell(s) : D.counterCells(s)[pk.idx]) : dv.sel != null ? d.decor[dv.sel] : null;
      selRing.visible = !!sel;
      if (sel) { const { x, z } = D.cellCenter(sel.cx, sel.cz); selRing.position.set(x, 0.06 + Math.abs(Math.sin(now * 4)) * 0.05, z); }
    } else { selRing.visible = false; overlaySig = ''; }
  }

  // Taps while designing: find the square, panel or decoration under the finger.
  const dRay = new THREE.Raycaster();
  function designPick(x, y) {
    dRay.setFromCamera(new THREE.Vector2(x / W * 2 - 1, -(y / H) * 2 + 1), camera);
    if (view.design.back) {
      const labSt = stations.filter(st => st.kind === 'night').map(st => st.group);
      const hits = dRay.intersectObjects([backDecorGroup, ...labSt, ...basementFloors], true);
      for (const h of hits) {
        let o = h.object;
        { let q = o; while (q && q.userData?.act !== 'machine' && q.parent) q = q.parent; if (q?.userData?.act === 'machine') { onPick({ act: 'design', kind: 'labmachine', idx: q.userData.idx }); return; } }
        while (o && o.userData?.kind !== 'bdecor' && o.parent) o = o.parent;
        if (o?.userData?.kind === 'bdecor') { onPick({ ...o.userData }); return; }
        if (basementFloors.includes(h.object)) {
          const bx = Math.round((h.point.x - BX - D.BACK_GRID.x0) / D.BACK_GRID.size), bz = Math.round((h.point.z - D.BACK_GRID.z0) / D.BACK_GRID.size);
          const bb = D.backBounds(navState?.design?.expansions);
          if (bx >= 0 && bx < bb.cols && bz >= 0 && bz < bb.rows) onPick({ act: 'design', kind: 'bcell', bx, bz });
          return;
        }
      }
      return;
    }
    const wallMode = view.design.cat === 'wall' || view.design.cat === 'art';
    if (wallMode) {
      const hits = dRay.intersectObjects([backPaper, leftPaper], false);
      if (hits.length) {
        const p = hits[0].point;
        if (hits[0].object === backPaper) onPick({ act: 'design', kind: 'panel', key: 'b' + Math.min(8, Math.max(0, Math.floor(p.x + 4.5))) });
        else onPick({ act: 'design', kind: 'panel', key: 'l' + Math.min(8, Math.max(0, Math.floor(p.z + 4.5))) });
      }
      return;
    }
    const daySt = stations.filter(st => st.kind === 'day').map(st => st.group);
    const hits = dRay.intersectObjects([decorGroup, ...daySt, ...counterHits, tillHit, shopFloor, pickFront, pickSide], true);
    for (const h of hits) {
      let o = h.object;
      if (o === tillHit) { onPick({ act: 'design', kind: 'till', idx: 0 }); return; }
      if (o.userData?.act === 'counter') { onPick({ act: 'design', kind: 'counter', idx: Number(o.userData.id) }); return; }
      { let q = o; while (q && q.userData?.act !== 'machine' && q.parent) q = q.parent; if (q?.userData?.act === 'machine') { onPick({ act: 'design', kind: 'machine', idx: q.userData.idx }); return; } }
      while (o && o.userData?.kind !== 'decor' && o.parent) o = o.parent;
      if (o?.userData?.kind === 'decor') { onPick({ ...o.userData }); return; }
      const p = h.point;
      if (h.object === shopFloor) { onPick({ act: 'design', kind: 'cell', cx: Math.min(8, Math.max(0, Math.floor(p.x + 4.5))), cz: Math.min(8, Math.max(0, Math.floor(p.z + 4.5))) }); return; }
      if (h.object === pickFront) { onPick({ act: 'design', kind: 'cell', cx: Math.min(8, Math.max(0, Math.floor(p.x + 4.5))), cz: 9 + Math.min(1, Math.max(0, Math.floor(p.z - 4.75))) }); return; }
      if (h.object === pickSide) { onPick({ act: 'design', kind: 'cell', cx: 9 + Math.min(1, Math.max(0, Math.floor(p.x - 4.75))), cz: Math.min(6, Math.max(0, Math.floor(p.z + 4.5))) }); return; }
    }
  }

  // ---------- Stations from state ----------
  let stationSig = '';
  let stations = [];
  const stationAt = (kind, idx) => stations.find(st => st.kind === kind && st.idx === idx);
  const stationGlows = [];
  // ---- 4: merge each machine's still parts into one mesh per material. Which parts move is found by running its
  // animation through idle, cooking, done and spoiling and seeing what changed; those (and everything under them) stay apart.
  function mergeStation(st, kind, type) {
    const g = st.group;
    const snap = o => `${o.position.x}|${o.position.y}|${o.position.z}|${o.rotation.x}|${o.rotation.y}|${o.rotation.z}|${o.scale.x}|${o.scale.y}|${o.scale.z}|${o.visible}|${o.material?.uuid}`;
    const before = new Map(); g.traverse(o => before.set(o, snap(o)));
    const pool = kind === 'day' ? Object.keys(ITEMS).filter(id => ITEMS[id].machine === type) : Object.keys(PRODUCTS).filter(id => PRODUCTS[id].machine === type);
    const items = pool.length ? pool.filter((_, k) => k % Math.max(1, Math.floor(pool.length / 4)) === 0).slice(0, 4) : [null];
    const moved = new Set();
    try {
      for (const item of items) for (const sl of [{ item: null }, { item, t: 1, dur: 10, done: false, left: 9, over: 0, spoilIn: 999 },
        { item, t: 10, dur: 10, done: true, left: 0, over: 5, spoilIn: 300 }, { item, t: 10, dur: 10, done: true, left: 0, over: 60, spoilIn: 20 }]) {
        for (const now of [1.3, 2.9]) { st.update(sl, 0.05, now); for (const [o, v] of before) if (v !== snap(o)) moved.add(o); }
      }
      st.update({ item: null }, 0, 0);
    } catch { return; } // anything odd: leave this machine as it was
    g.traverse(o => { if (o.parent && o.parent !== g && (moved.has(o.parent) || o.parent.userData.keep)) o.userData.keep = true; if (moved.has(o)) o.userData.keep = true; });
    for (const o of before.keys()) if (!o.isMesh && !o.isGroup && o !== g) o.userData.keep = true;
    mergeStatic(g);
  }
  function rebuildStations(s) {
    for (const st of stations) { scene.remove(st.group); const i = pickables.indexOf(st.group); if (i >= 0) pickables.splice(i, 1); }
    dropFrom(glowMats, stationGlows);
    stations = [];
    const add = (m, idx, kind) => {
      const M = kind === 'day' ? MACHINES[m.type] : LAB_MACHINES[m.type];
      // its square and which way it faces
      let pl = null;
      if (kind === 'day' && m.cx >= 0) pl = { ...D.cellCenter(m.cx, m.cz), ry: D.rotY(m.rot || 0) };
      if (kind === 'night' && m.bx >= 0) { const c = D.backCellCenter(m.bx, m.bz); pl = { x: BX + c.x, z: c.z, ry: D.rotY(m.rot || 0) }; }
      if (!M || !pl) return;
      const st = (BUILDERS[M.model] || buildOven)(M.tint);
      const tier = m.tier || 0;
      if (tier) {
        const bb = new THREE.Box3().setFromObject(st.group), w = bb.max.x - bb.min.x, d = bb.max.z - bb.min.z, top = Math.min(bb.max.y, 1.0);
        const chrome = mat('#d9dde3', { metalness: 0.7, roughness: 0.25 }), gold = mat('#d4af37', { metalness: 0.7, roughness: 0.3 });
        st.group.add(box(w + 0.04, 0.05, d + 0.04, tier >= 4 ? gold : chrome, (bb.max.x + bb.min.x) / 2, 0.06, (bb.max.z + bb.min.z) / 2));
        if (tier >= 2) st.group.add(box(w + 0.04, 0.04, d + 0.04, tier >= 4 ? gold : chrome, (bb.max.x + bb.min.x) / 2, 0.2, (bb.max.z + bb.min.z) / 2));
        if (tier >= 3) { const gm = emissiveMat('#1d1528', kind === 'day' ? '#ffb454' : '#b58cff'); glowMats.push(gm); stationGlows.push(gm); st.group.add(box(w * 0.8, 0.035, 0.02, gm, (bb.max.x + bb.min.x) / 2, top - 0.08, bb.max.z + 0.012, false)); }
        if (tier >= 5) st.group.add(mesh(geo('tierstar', () => new THREE.OctahedronGeometry(0.09, 0)), gold, (bb.max.x + bb.min.x) / 2, bb.max.y + 0.12, (bb.max.z + bb.min.z) / 2));
        const plate = box(0.34, 0.1, 0.02, '#2b2d36', (bb.max.x + bb.min.x) / 2, 0.3, bb.max.z + 0.012, false); st.group.add(plate);
        for (let k = 0; k < tier; k++) st.group.add(sphere(0.022, tier >= 4 ? gold : chrome, (bb.max.x + bb.min.x) / 2 - 0.12 + k * 0.06, 0.35, bb.max.z + 0.03, false));
      }
      st.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      texturize(st.group);
      mergeStation(st, kind, m.type);
      st.group.scale.setScalar(kind === 'night' ? 0.85 : 0.9); // a little smaller than a square, so neighbours don't touch
      if (kind === 'day' && m.cz >= 9 || kind === 'day' && m.cx >= 9) { // out on a terrace: a low wooden deck under it, like a market stall
        const deck = new THREE.Group(); deck.add(box(1.05, 0.06, 1.05, '#a8703f', 0, 0, 0), box(1.09, 0.03, 1.09, '#efe6d8', 0, 0.06, 0));
        deck.scale.setScalar(1 / 0.9); st.group.add(deck);
      }
      st.group.position.set(pl.x, kind === 'night' ? BY : 0, pl.z);
      st.group.rotation.y = pl.ry;
      st.group.userData = { act: 'machine', kind, idx };
      scene.add(st.group);
      st.group.updateMatrixWorld(true);
      st.anchorW = st.group.localToWorld(st.anchor.clone());
      if (st.smoke) st.smokeW = st.group.localToWorld(st.smoke.clone());
      Object.assign(st, { kind, idx, type: m.type });
      pickables.push(st.group);
      stations.push(st);
    };
    s.machines.forEach((m, i) => add(m, i, 'day'));
    s.lab.forEach((m, i) => add(m, i, 'night'));
    invalidateNav(); sweepClip();
    if (s.labUnlocked && !pickables.includes(innerDoor)) pickables.push(innerDoor, stairsHit, stairwellHit);
  }

  // Anything small (cups, fruit, knobs, pips, bulbs) gets no shadow: it barely shows and each one is another draw in the
  // shadow pass. Checked once a second for new things; each object is only looked at once.
  let shadowT = 0, frameNo = 0;
  const _sph = new THREE.Sphere();
  function trimShadows(root) {
    root.traverse(o => {
      if (!o.isMesh || !o.castShadow || o.userData.shadowChecked) return;
      o.userData.shadowChecked = true;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      if (o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() < 0.15) o.castShadow = false;
    });
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
  const OUT_IN = V3(6.4, 0, 3.97), GAP_IN = V3(4.2, 0, 3.97), OUT_OUT = V3(6.4, 0, 3.43), GAP_OUT = V3(4.2, 0, 3.43);
  let revolving = false, drumBusy = false;
  const doorIn = () => (revolving ? GAP_IN : GAP), doorOut = () => (revolving ? GAP_OUT : GAP);
  const streetIn = () => (revolving ? OUT_IN : OUTSIDE), streetOut = () => (revolving ? OUT_OUT : OUTSIDE);
  // The top of the stairs (from the back door), their foot, a step clear of them, and where buyers wait
  const DOOR_OUT = V3(BX - 7.35, 0, 1.1), DOOR_IN = V3(BX - 3.3, 0, 1.1), LANDING = V3(BX - 2.6, 0, 1.3);
  const BUYER_SPOTS = D.BUYER_SPOTS_LOCAL.map(([x, z]) => V3(BX + x, 0, z));
  // On the stairs people climb: height from where they are along them
  // How high up the flight someone is (0 on the basement floor, 3.45 at the top): half a step under the nosing line, so feet sit on the treads
  const stairY = p => { if (Math.abs(p.z - 1.1) > 0.7 || p.x > BX - 3.6) return 0; const u = (p.x - (BX + STEP_TOP_X)) / STEP_RUN; return u <= 0 ? 3.45 : Math.max(0, 3.45 - (u + 0.5) * STEP_RISE); };
  const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const customers = new Map(); // id -> { agent, shown, inside, leaving }
  // Is anyone walking over the zebra crossing (the road between the kerbs, x 2.1 to 4.9)? Cars wait for them.
  function onZebra() {
    const on = a => { const p = a.group.position; return p.x > 2.1 && p.x < 4.9 && p.z > 8.95 && p.z < 13.05; };
    for (const e of customers.values()) if (on(e.agent)) return true;
    for (const w of walkers) if (on(w.agent)) return true;
    return false;
  }
  const buyers = new Map();
  const reactions = []; // { agent, text, kind, until, id }
  const browsers = []; let browserId = 1;
  // ---- People on the street: they come and go from the faded edges of town along the pavements ----
  const seenCust = new Set(), walkers = [];
  const EDGE_W = -39, EDGE_E = 33, EDGE_N = -34; // where the faded edge of town is, along each pavement
  const SIDE_X = 8.3, FRONT_Z = 8.2, FAR_Z = 13.3, FAR_SIDE_X = 12.95, CROSS_X = 3.5, CORNER = V3(7.4, 0, 3.7); // walking lines, clear of lamps, trees and café tables
  // Ways in from the edge of town to the corner by the shop door (walked backwards to leave)
  const ROUTES_IN = [
    [V3(EDGE_W, 0, FRONT_Z), V3(7.4, 0, FRONT_Z), CORNER],                                                       // along the front pavement
    [V3(SIDE_X, 0, EDGE_N), V3(SIDE_X, 0, 3.7), CORNER],                                                         // down the side street
    [V3(EDGE_W, 0, FAR_Z), V3(CROSS_X, 0, FAR_Z), V3(CROSS_X, 0, FRONT_Z), V3(7.4, 0, FRONT_Z), CORNER],         // over the zebra crossing
    [V3(EDGE_E, 0, FAR_Z), V3(CROSS_X, 0, FAR_Z), V3(CROSS_X, 0, FRONT_Z), V3(7.4, 0, FRONT_Z), CORNER],
  ];
  // Passers-by: edge to edge, never stopping
  const WALKS = [
    [V3(EDGE_W, 0, FAR_Z), V3(EDGE_E, 0, FAR_Z)],
    [V3(EDGE_W, 0, FRONT_Z), V3(SIDE_X, 0, FRONT_Z), V3(SIDE_X, 0, EDGE_N)],
    [V3(FAR_SIDE_X, 0, EDGE_N), V3(FAR_SIDE_X, 0, FAR_Z), V3(EDGE_E, 0, FAR_Z)],
  ];
  const randomLook = () => ({ skin: Math.floor(Math.random() * 5), shirt: Math.floor(Math.random() * 10), hair: Math.floor(Math.random() * 6), pants: Math.floor(Math.random() * 5), h: 0.9 + Math.random() * 0.2, hat: Math.random() < 0.2 });
  const shifted = (pts, off) => pts.map(p => p.clone().add(off));
  const laneOff = () => V3((Math.random() - 0.5) * 0.7, 0, (Math.random() - 0.5) * 0.7); // not everyone walks the same line
  function walkRoute(agent, pts) { agent.goal = null; agent.target.copy(pts[0]); agent.path = pts.slice(1); }
  function spawnShopper(c) {
    const off = laneOff(), pts = shifted(ROUTES_IN[Math.floor(Math.random() * ROUTES_IN.length)], off);
    const a = new Agent(scene, c ? c.look : randomLook(), 'customer', pts[0]);
    a.speed = 1.7;
    walkRoute(a, [...pts.slice(1), streetIn().clone()]);
    const id = c ? c.id : 'w' + (browserId++);
    customers.set(id, { agent: a, c, stage: 'arrive', shown: false, inside: false, wait: 0, off, tray: c ? null : trays[Math.floor(Math.random() * trays.length)] });
  }
  function spawnWalker() {
    const r = WALKS[Math.floor(Math.random() * WALKS.length)], off = laneOff(), pts = shifted(Math.random() < 0.5 ? r : [...r].reverse(), off);
    const a = new Agent(scene, randomLook(), 'customer', pts[0]);
    a.speed = 1.2 + Math.random() * 0.4;
    walkRoute(a, pts.slice(1));
    walkers.push({ agent: a });
  }
  // One shopper's day out: walk in, through the door, queue, get served, out, and away into the distance
  function stepShopper(id, e, dt, now, menu, lines) {
    const a = e.agent, at = (p, r = 0.15) => flat(a.group.position, p) < r;
    if (e.stage === 'arrive') { if (!a.path?.length && at(streetIn())) { e.stage = 'door'; a.target.copy(doorIn()); a.face = null; } }
    else if (e.stage === 'door') { if (at(doorIn())) { e.stage = 'queue'; e.inside = true; a.goal = null; a.speed = 2.2; } }
    else if (e.stage === 'queue') {
      const t = e.c ? trays[Math.min(trays.length - 1, Math.max(0, menu.indexOf(e.c.want)))] : (trays.includes(e.tray) ? e.tray : trays[0]);
      if (!t) e.stage = 'leave';
      else {
        const ti = trays.indexOf(t), k = e.c ? Math.max(0, lines.get(ti)?.indexOf(id) ?? 0) : 3;
        const side = e.c ? (k % 2 ? 0.16 : -0.16) * (k > 0 ? 1 : 0) : (e.off.x > 0 ? 0.3 : -0.3), out = e.c ? 0.95 + k * 0.6 : 1.7;
        go(a, V3(t.x + t.dx * out - t.dz * side, 0, t.z + t.dz * out + t.dx * side));
        if (atGoal(a)) { a.face = t.ry + PI; e.wait += dt; } else a.face = null;
        if (e.wait > (e.c ? 1.0 : 3.5)) {
          e.shown = true; e.stage = 'served'; e.wait = 0;
          if (e.c) {
            a.p.bag.visible = e.c.res.kind === 'good';
            if (e.c.res.kind === 'good') coin(TILL);
            const face = e.c.res.kind === 'good' ? '😊' : e.c.res.kind === 'bad' ? '😞' : '😒';
            reactions.push({ agent: a, text: `${face} ${e.c.res.text}`, kind: e.c.res.kind, until: now + 2.2, id: 'r' + e.c.id });
          } else if (Math.random() < 0.5) reactions.push({ agent: a, text: Math.random() < 0.5 ? '👀' : '🤔', kind: 'meh', until: now + 1.6, id: 'r' + id });
        }
      }
    } else if (e.stage === 'served') { e.wait += dt; if (e.wait > 0.9) e.stage = 'leave'; }
    else if (e.stage === 'leave') { a.face = null; go(a, doorOut()); if (at(doorOut())) { e.stage = 'out'; e.inside = false; a.path = null; a.goal = null; a.target.copy(streetOut()); } }
    else if (e.stage === 'out') {
      if (at(streetOut())) { e.stage = 'away'; a.speed = 1.7; walkRoute(a, shifted([...ROUTES_IN[Math.floor(Math.random() * ROUTES_IN.length)]].reverse(), e.off)); }
    }
    const arrived = a.update(dt);
    if (e.stage === 'away' && arrived) { scene.remove(a.group); customers.delete(id); }
  }

  // You: the baker. Walks to whatever you tap.
  const BAKER_HOME = { shop: V3(0.7, 0, -1.4), back: V3(BX - 2.6, BY, 1.6) };
  const baker = new Agent(scene, { skin: 1, shirt: 0, hair: 1, pants: 0, h: 1.02 }, 'baker', BAKER_HOME.shop.clone());
  baker.face = PI / 4;
  let bakerZone = 'shop', bakerJob = null, bakerIdle = 0;
  // ---------- Walking around things: a grid over the floor, A* and a smoothed path ----------
  const SNAV = { x0: -7.6, x1: 6.9, z0: -4.45, z1: 6.9, c: 0.2, grid: null };
  const BNAV = { x0: BX - 4.5, x1: BX + 6.8, z0: -4.5, z1: 6.8, c: 0.2, grid: null };
  for (const n of [SNAV, BNAV]) { n.w = Math.ceil((n.x1 - n.x0) / n.c); n.h = Math.ceil((n.z1 - n.z0) / n.c); }
  let NAV = SNAV, NW = SNAV.w, NH = SNAV.h, navGrid = null;
  const useNav = n => { NAV = n; NW = n.w; NH = n.h; navGrid = n.grid; };
  function invalidateNav() { SNAV.grid = null; BNAV.grid = null; navGrid = null; navGen++; }
  // Floor you can stand on: the shop, the back room, the door between them, the shop door and the terraces
  const AREAS = [[-4.35, 4.35, -4.4, 4.4], [-7.45, -4.85, 1.75, 4.4], [-5.0, -4.2, 2.65, 3.55], [4.2, 5.0, 3.25, 4.15],
    [4.85, 6.9, -4.4, 6.9], [-4.4, 6.9, 4.85, 6.9]];
  const FIXED = [[-5.5, -4.9, 3.9, 4.4]]; // the crate by the back door (the till goes in with the counters)
  // The basement: its stairs, the tables and the kit boxes
  const bp = D.BACK_PROPS;
  const BFIXED = [[BX + D.STAIRS.x0, BX + D.STAIRS.x1, D.STAIRS.z0, D.STAIRS.z1 + 0.2], [BX + bp.bagTable[0] - 0.45, BX + bp.bagTable[0] + 0.45, bp.bagTable[1] - 0.3, bp.bagTable[1] + 0.3],
    [BX + bp.cashTable[0] - 0.6, BX + bp.cashTable[0] + 0.6, bp.cashTable[1] - 0.38, bp.cashTable[1] + 0.38], [BX + bp.kits[0] - 0.35, BX + bp.kits[0] + 0.35, bp.kits[1] - 0.2, bp.kits[1] + 0.2]];
  let navState = null;
  const cellOf = (x, z) => [Math.floor((x - NAV.x0) / NAV.c), Math.floor((z - NAV.z0) / NAV.c)];
  const centre = (i, j) => V3(NAV.x0 + (i + 0.5) * NAV.c, 0, NAV.z0 + (j + 0.5) * NAV.c);
  function buildNav() {
    const st0 = navState, under = NAV === BNAV, ex = st0?.design?.expansions || {};
    const pad = 0.16, rects = (under ? BFIXED : FIXED).map(r => [r[0] - pad, r[1] + pad, r[2] - pad, r[3] + pad]);
    const F = ex.digfront ? 6.6 : 4.35, S = ex.digside ? 6.6 : 4.35;
    const areas = under ? [[BX - 4.35, BX + 4.35, -4.35, 4.35], ...(ex.digfront ? [[BX - 4.35, BX + 4.35, 4.35, F]] : []), ...(ex.digside ? [[BX + 4.35, BX + S, -4.35, 4.35]] : []),
      ...(ex.digfront && ex.digside ? [[BX + 4.35, BX + S, 4.35, F]] : [])] : AREAS;
    // Decor (not rugs) stands in the way, in the shop and the basement
    if (st0?.design) {
      if (!under) for (const it of st0.design.decor || []) { if (/rug|mat/.test(it.type)) continue; const { x, z } = D.cellCenter(it.cx, it.cz); rects.push([x - 0.32, x + 0.32, z - 0.32, z + 0.32]); }
      if (!under) for (const c of [...D.counterCells(st0).slice(0, G.countersOf(st0.design)), D.tillCell(st0)]) { const { x, z } = D.cellCenter(c.cx, c.cz); rects.push([x - 0.45 - pad, x + 0.45 + pad, z - 0.45 - pad, z + 0.45 + pad]); }
      if (under) for (const it of st0.design.back?.decor || []) { const { x, z } = D.backCellCenter(it.bx, it.bz); rects.push([BX + x - 0.36, BX + x + 0.36, z - 0.36, z + 0.36]); }
    }
    for (const st of stations) {
      if ((st.kind === 'night') !== under) continue; // each floor's own machines
      const p = st.group.position, side = Math.abs(Math.sin(st.group.rotation.y)) > 0.5;
      const hx = (side ? 0.4 : 0.48) + pad, hz = (side ? 0.48 : 0.4) + pad;
      rects.push([p.x - hx, p.x + hx, p.z - hz, p.z + hz]);
    }
    navGrid = NAV.grid = new Uint8Array(NW * NH);
    for (let j = 0; j < NH; j++) for (let i = 0; i < NW; i++) {
      const c = centre(i, j);
      const ok = areas.some(a => c.x >= a[0] && c.x <= a[1] && c.z >= a[2] && c.z <= a[3]) && !rects.some(r => c.x > r[0] && c.x < r[1] && c.z > r[2] && c.z < r[3]);
      navGrid[j * NW + i] = ok ? 1 : 0;
    }
  }
  const walkable = (i, j) => i >= 0 && j >= 0 && i < NW && j < NH && navGrid[j * NW + i] === 1;
  function nearestFree(i, j) {
    if (walkable(i, j)) return [i, j];
    for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (walkable(i + di, j + dj)) return [i + di, j + dj];
    return null;
  }
  function clearLine(a, b) {
    const n = Math.ceil(a.distanceTo(b) / (NAV.c * 0.5));
    for (let k = 1; k < n; k++) { const p = a.clone().lerp(b, k / n); const [i, j] = cellOf(p.x, p.z); if (!walkable(i, j)) return false; }
    return true;
  }
  function findPath(from, to) {
    useNav(from.y < -1 ? BNAV : SNAV);
    if (!navGrid) buildNav();
    const a = nearestFree(...cellOf(from.x, from.z)), b = nearestFree(...cellOf(to.x, to.z));
    if (!a || !b) return null;
    const start = a[1] * NW + a[0], goal = b[1] * NW + b[0];
    const g = new Float32Array(NW * NH).fill(Infinity), came = new Int32Array(NW * NH).fill(-1), done = new Uint8Array(NW * NH);
    const h = k => Math.hypot(k % NW - b[0], Math.floor(k / NW) - b[1]);
    g[start] = 0;
    const open = [[h(start), start]];
    while (open.length) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
      const [, cur] = open.splice(bi, 1)[0];
      if (cur === goal) break;
      if (done[cur]) continue; done[cur] = 1;
      const ci = cur % NW, cj = Math.floor(cur / NW);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (!walkable(ni, nj) || (di && dj && (!walkable(ci + di, cj) || !walkable(ci, cj + dj)))) continue;
        const nk = nj * NW + ni, ng = g[cur] + (di && dj ? 1.414 : 1);
        if (ng < g[nk]) { g[nk] = ng; came[nk] = cur; open.push([ng + h(nk), nk]); }
      }
    }
    // No way through: head for the closest square we could reach, never straight through things
    let end = goal;
    if (start !== goal && came[goal] < 0) {
      let best = -1, bh = Infinity;
      for (let k = 0; k < NW * NH; k++) if (done[k] && h(k) < bh) { bh = h(k); best = k; }
      if (best < 0 || best === start) return [];
      end = best;
    }
    const cells = [];
    for (let k = end; k !== -1 && k !== start; k = came[k]) cells.push(centre(k % NW, Math.floor(k / NW)));
    cells.reverse();
    // Smooth it: skip waypoints you can see past
    const pts = [], at = from.clone().setY(0);
    let i = 0;
    while (i < cells.length) {
      let j = cells.length - 1;
      while (j > i && !clearLine(pts.length ? pts.at(-1) : at, cells[j])) j--;
      pts.push(cells[j]); i = j + 1;
    }
    if (end === goal) pts.push(to.clone().setY(0)); // the exact spot only when we really got there
    return pts;
  }
  // Head somewhere, working out a route only when the destination changes (or the room changed)
  let navGen = 0;
  function go(agent, dest) {
    if (agent.goal && agent.goalGen === navGen && Math.hypot(agent.goal.x - dest.x, agent.goal.z - dest.z) < 0.05) return;
    agent.goal = dest.clone(); agent.goalGen = navGen; walkTo(agent, dest);
  }
  const atGoal = (agent, r = 0.15) => !agent.path?.length && agent.goal && Math.hypot(agent.group.position.x - agent.goal.x, agent.group.position.z - agent.goal.z) < r;
  // Walk somewhere, around machines and through doorways
  function walkTo(agent, dest) {
    const path = findPath(agent.group.position, dest);
    if (!path) { agent.path = null; agent.target.copy(dest); return; }
    if (!path.length) { agent.path = null; agent.target.copy(agent.group.position); return; } // boxed in: stay put
    agent.target.copy(path.shift()); agent.path = path;
  }

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

  function poke(s, kind, idx, collected) {
    const st = stationAt(kind, idx);
    if (!st) return;
    st.bounce = 1;
    const ry = st.group.rotation.y;
    const front = st.group.position.clone().add(V3(Math.sin(ry), 0, Math.cos(ry)).multiplyScalar(0.8));
    walkTo(baker, front); baker.face = ry + PI;
    bakerJob = true; bakerIdle = 0;
    if (!collected) return;
    const from = st.anchorW.clone().add(V3(0, -0.5, 0));
    if (PRODUCTS[collected]) {
      for (let k = 0; k < 3; k++) launch(rbox(0.1, 0.13, 0.04, mat('#c79bff', { roughness: 0.3 }), 0, 0, 0, 0.02), from, V3(-6.0, 0.95, -1.2), { delay: k * 0.09 });
    } else {
      const ti = Math.min(trays.length - 1, Math.max(0, G.counterList(s).indexOf(collected)));
      if (trays[ti]) for (let k = 0; k < 3; k++) launch(itemModel(collected), from, V3(trays[ti].x, 1.08, trays[ti].z), { delay: k * 0.09 });
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
    // The baker follows the camera between rooms, works at each tapped station, then wanders home.
    // The baker walks through the doorway when you switch rooms (or appears there if they were far off)
    if (view.zone !== bakerZone) {
      bakerZone = view.zone;
      bakerJob = null;
      // between floors the baker takes the stairs off camera
      baker.group.position.copy(BAKER_HOME[bakerZone]); baker.target.copy(BAKER_HOME[bakerZone]); baker.path = null;
    }
    const bakerThere = baker.update(dt);
    if (bakerJob && bakerThere) { baker.work = 0.6; bakerJob = null; bakerIdle = 0; }
    else if (!bakerJob && bakerThere) {
      bakerIdle += dt;
      if (bakerIdle > 6 && baker.group.position.distanceTo(BAKER_HOME[bakerZone]) > 0.1 && !baker.path?.length) { walkTo(baker, BAKER_HOME[bakerZone]); baker.face = PI / 4; }
    }

    revolving = s.design.outside?.door === 'revolving';
    if (revolving) { drumBusy = false; for (const [, e] of customers) if (Math.hypot(e.agent.group.position.x - 4.9, e.agent.group.position.z - 3.7) < 0.8) drumBusy = true; for (const w of browsers) if (Math.hypot(w.agent.group.position.x - 4.9, w.agent.group.position.z - 3.7) < 0.8) drumBusy = true; }
    // Shoppers: everyone the engine served gets someone walking in from the edge of town for it (only so many at once),
    // and now and then a window-shopper; a few passers-by walk straight through town
    const nowMs = Date.now();
    G.live.customers = G.live.customers.filter(c => nowMs - c.at < 12000);
    for (const c of G.live.customers) {
      if (seenCust.has(c.id)) continue;
      seenCust.add(c.id);
      if (customers.size < 9 && view.zone === 'shop' && !view.design) spawnShopper(c);
    }
    if (seenCust.size > 500) { seenCust.clear(); for (const c of G.live.customers) seenCust.add(c.id); }
    if (view.zone === 'shop' && !view.design && trays.length && customers.size < 7 && Math.random() < dt * Math.min(0.06, G.customersPerHour(s, s.clock) / 3600 * 2)) spawnShopper(null);
    const menu = G.counterList(s), lines = new Map();
    for (const [id, e] of customers) if (e.stage === 'queue' && e.c) { const ti = Math.min(trays.length - 1, Math.max(0, menu.indexOf(e.c.want))); if (!lines.has(ti)) lines.set(ti, []); lines.get(ti).push(id); }
    for (const [id, e] of customers) stepShopper(id, e, dt, now, menu, lines);
    if (walkers.length < 3 && Math.random() < dt * 0.04) spawnWalker();
    for (let i = walkers.length - 1; i >= 0; i--) if (walkers[i].agent.update(dt)) { scene.remove(walkers[i].agent.group); walkers.splice(i, 1); }

    // Night buyers: in through the back door, wait, leave the same way.
    const liveB = new Set();
    s.door.forEach((b, k) => {
      liveB.add(b.id);
      let e = buyers.get(b.id);
      if (!e) {
        e = { agent: new Agent(scene, b.look || { skin: b.id % 5, shirt: b.id % 5, hair: 0, pants: b.id % 5, h: 1 }, 'hood', DOOR_OUT.clone()), via: true };
        e.agent.group.userData = { act: 'buyer', id: b.id };
        pickables.push(e.agent.group);
        buyers.set(b.id, e);
      }
      const spot = BUYER_SPOTS[k % BUYER_SPOTS.length];
      // down the stairs, a step clear of them, then to a spot by the tables
      if (e.via === true) { e.agent.target.copy(DOOR_IN); if (flat(e.agent.group.position, DOOR_IN) < 0.1) e.via = 'landing'; }
      else if (e.via === 'landing') { e.agent.target.copy(LANDING); if (flat(e.agent.group.position, LANDING) < 0.1) e.via = false; }
      else e.agent.target.copy(spot);
      e.agent.face = e.via ? null : PI * 0.15;
    });
    for (const [id, e] of buyers) {
      if (!liveB.has(id) && !e.agent.leaving) {
        e.agent.leaving = true; e.agent.face = null; e.stage = 0;
        const i = pickables.indexOf(e.agent.group); if (i >= 0) pickables.splice(i, 1);
      }
      if (e.agent.leaving) {
        e.agent.target.copy(e.stage === 0 ? LANDING : e.stage === 1 ? DOOR_IN : DOOR_OUT);
        if (e.stage === 0 && flat(e.agent.group.position, LANDING) < 0.1) e.stage = 1;
        else if (e.stage === 1 && flat(e.agent.group.position, DOOR_IN) < 0.1) e.stage = 2;
      }
      const arrived = e.agent.update(dt);
      e.agent.group.position.y = BY + stairY(e.agent.group.position);
      if (e.agent.leaving && e.stage === 2 && arrived) { scene.remove(e.agent.group); buyers.delete(id); }
    }
    // The back door upstairs opens while someone is on the stairs
    let near = false;
    for (const e of buyers.values()) if (e.agent.group.position.y > BY + 1.5) near = true;
    const want = near ? -1.5 : 0;
    backDoorPivot.rotation.y += (want - backDoorPivot.rotation.y) * Math.min(1, dt * 6);
    // The shop door opens for anyone coming or going, and shuts behind them
    let atDoor = false;
    for (const e of customers.values()) { const p = e.agent.group.position; if (Math.abs(p.x - 4.65) < 1.25 && Math.abs(p.z - 3.7) < 0.9) { atDoor = true; break; } }
    doorT += ((atDoor ? 1 : 0) - doorT) * Math.min(1, dt * (atDoor ? 9 : 4));
    for (const l of doorLeaves) { l.rotation.y = -l.userData.dir * 1.35 * doorT; l.visible = !revolving; }
    if (shellDoor) shellDoor.rotation.y = -1.25 * doorT;
    updateFlyers(dt);
  }

  // ---------- Overlay bubbles (HTML positioned over the 3D scene) ----------
  const bubbleEls = new Map();
  let bubbleScale = 1;
  const DOOR_BUB = V3(-4.6, 1.6, 3.1), STAIRS_BUB = V3(BX - 4.3, BY + 2.4, 1.1);
  const tmp = new THREE.Vector3();
  function toScreen(v) {
    tmp.copy(v).project(camera);
    return [(tmp.x + 1) / 2 * W, (1 - tmp.y) / 2 * H];
  }
  const fmtLeft = sec => sec < 60 ? `${Math.ceil(sec)}s` : sec < 3600 ? `${Math.ceil(sec / 60)}m` : `${Math.floor(sec / 3600)}h${String(Math.floor(sec % 3600 / 60)).padStart(2, '0')}`;
  function slotBubble(st, slot, s, m, crowded) {
    const at = `data-act="machine" data-kind="${st.kind}" data-idx="${st.idx}"`;
    if (!slot.item && !m.broken && crowded) return { html: '<b>＋</b>', cls: 'bub add mini', at };
    if (m.broken) return { html: '<span>🔧</span>', cls: 'bub burn', at };
    if (st.kind === 'night' && G.sealed(s, s.clock)) return { html: '<span>🚧</span>', cls: 'bub burn', at };
    if (!slot.item) return { html: `<b>＋</b>`, cls: 'bub add', at };
    const r = G.recipeOf(slot.item);
    if (!slot.done) return { html: `<span>${r.emoji}</span><small>${fmtLeft(slot.left)}</small>`, cls: 'bub run', at, p: slot.t / slot.dur };
    if (slot.spoilIn <= 600) return { html: `<span>${r.emoji}</span><small>${fmtLeft(slot.spoilIn)}</small>`, cls: 'bub burn', at };
    return { html: `<span>${r.emoji}</span><b>✓</b>`, cls: 'bub done', at };
  }
  function updateOverlay(s, now) {
    const want = new Map();
    if (!view.design) {
      const here = stations.filter(st => (st.kind === 'day') === (view.zone === 'shop'));
      const crowded = here.length > 7;
      bubbleScale = Math.max(0.6, Math.min(1, (crowded ? 0.8 : 1) * (0.75 + 0.25 * cam.zoom)));
      for (const st of here) {
        const m = (st.kind === 'day' ? s.machines : s.lab)[st.idx];
        if (!m) continue;
        const b = slotBubble(st, G.jobView(s, m, s.clock, st.kind === 'night'), s, m, crowded);
        if (b) want.set(`s-${st.kind}-${st.idx}`, { ...b, pos: st.anchorW });
      }
      const nowMs = Date.now();
      if (view.zone === 'shop') for (const [, e] of customers) {
        const c = e.c;
        if (!c || e.shown || !e.inside || !ITEMS[c.want]) continue;
        want.set(`t-${c.id}`, { html: `${ITEMS[c.want].emoji}`, cls: 'bub think', at: '', pos: e.agent.group.position.clone().setY(e.agent.height + 0.25) });
      }
      // Counters running low (amber) or empty (red): tap one to see it and restock
      if (view.zone === 'shop') G.counterList(s).forEach((id, k) => {
        const { have, cap } = G.counterStock(s, k);
        if (have >= cap * 0.25) return;
        want.set(`low-${k}`, { html: have > 0 ? '<span>⚠️</span><small>low</small>' : '<span>🚫</span><small>empty</small>', cls: `bub low ${have > 0 ? '' : 'out'}`, at: `data-act="counter" data-id="${k}"`, pos: V3(trays[k]?.x ?? 0, 1.85, trays[k]?.z ?? 0) });
      });
      // In the basement: kits running low, nothing bagged to sell
      if (view.zone === 'back' && s.labUnlocked) {
        const kitsN = Object.values(s.kits).reduce((a, b) => a + b, 0), bagsN = Object.values(s.bags).reduce((a, b) => a + b, 0);
        const [kx, kz] = D.BACK_PROPS.kits, [bx2, bz2] = D.BACK_PROPS.bagTable;
        if (kitsN < 2) want.set('lowkits', { html: `<span>📦</span><small>${kitsN ? 'kits low' : 'no kits'}</small>`, cls: `bub low ${kitsN ? '' : 'out'}`, at: 'data-act="tab" data-id="stash"', pos: V3(BX + kx, BY + 1.3, kz) });
        if (!bagsN) want.set('nobags', { html: '<span>🛍️</span><small>no bags</small>', cls: 'bub low out', at: 'data-act="tab" data-id="back"', pos: V3(BX + bx2, BY + 1.4, bz2) });
      }
      // The door between the shop and the back room
      if (s.labUnlocked) want.set('door', { pos: view.zone === 'shop' ? DOOR_BUB : STAIRS_BUB, html: view.zone === 'shop' ? '<span>🪜</span><small>Basement</small>' : '<span>☀️</span><small>Upstairs</small>', cls: 'bub door', at: 'data-act="room"' });
      if (view.zone === 'back') {
        for (const b of s.door) {
          const e = buyers.get(b.id);
          if (!e || e.via) continue;
          const pct = Math.max(0, 100 - (s.clock - b.arrive) / b.patience * 100);
          want.set(`b-${b.id}`, {
            html: `<span>${b.courier ? '📦' : PRODUCTS[b.product].emoji} ${b.name} ×${b.want}${b.hint ? ' 📷' : ''}</span><i style="width:${pct.toFixed(0)}%"></i>`,
            cls: `bub buyer ${b.hint ? 'flag' : ''}`, at: `data-act="buyer" data-id="${b.id}"`,
            pos: e.agent.group.position.clone().setY(e.agent.height + 0.35),
          });
        }
      }
    }
    for (let k = reactions.length - 1; k >= 0; k--) {
      const r = reactions[k];
      if (now > r.until || !r.agent.group.parent) { reactions.splice(k, 1); continue; }
      if ((r.agent.group.position.y < -1) !== (view.zone === 'back')) continue; // only bubbles on the floor you're looking at
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
      const sc = b.cls.includes('react') || b.cls.includes('buyer') ? 1 : bubbleScale;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${sc.toFixed(2)})`;
    }
  }

  // ---------- Per-frame state sync ----------
  let bagTint = null;
  function syncState(s, dt, now) {
    navState = s;
    syncDesign(s, now);
    const sig = JSON.stringify([s.machines.map(m => [m.type, m.cx, m.cz, m.rot, m.tier || 0]), s.lab.map(m => [m.type, m.bx, m.bz, m.rot, m.tier || 0]), !!s.design.expansions?.storeroom]);
    if (sig !== stationSig) { stationSig = sig; rebuildStations(s); }
    for (const st of stations) {
      const m = (st.kind === 'day' ? s.machines : s.lab)[st.idx];
      if (!m) continue;
      const slot = G.jobView(s, m, s.clock, st.kind === 'night');
      let fx = st.update(slot, dt, now);
      const broken = !!m.broken;
      if (broken) fx = 'smoke';
      st.group.rotation.z = broken ? 0.06 : 0;
      if (st.bounce > 0) {
        st.bounce = Math.max(0, st.bounce - dt * 3.5);
        const b = Math.sin(st.bounce * PI * 2) * st.bounce;
        st.group.scale.set(1 - b * 0.05, 1 + b * 0.09, 1 - b * 0.05);
      }
      if (fx && !st.smokeW) st.smokeW = st.anchorW.clone().add(V3(0, -0.4, 0));
      if (fx && st.smokeW) {
        const key = st.kind + st.idx;
        const acc = (emitAcc.get(key) || 0) + dt;
        const every = broken ? 0.5 : fx === 'smoke' ? 0.08 : 0.25;
        if (acc > every) { emit(st.smokeW, fx); emitAcc.set(key, 0); } else emitAcc.set(key, acc);
      }
    }
    // Display case
    syncCounters(s); syncTill(s); syncOpenSign(s);
    for (const o of counterGroup.children) if (o.userData.spin) o.rotation.y += dt * 1.5;
    for (const t of trays) for (const o of t.group.children) if (o.userData.spin) o.rotation.y += dt * 2;
    syncSeason(s);
    const menu = G.counterList(s);
    const fill = k => (menu[k] ? Math.min(6, Math.ceil(G.counterStock(s, k).have / ITEMS[menu[k]].servings * 3)) : 0); // what's on that counter
    const sig5 = id => (G.starsOf(s, id) >= 5 ? '*' : '');
    const tsig = menu.map((id, k) => id + fill(k) + sig5(id)).join(',');
    if (tsig !== traySig) {
      traySig = tsig;
      trays.forEach((t, k) => {
        const id = menu[k];
        const n = id ? fill(k) : 0;
        const tsg = id + n + (id ? sig5(id) : '');
        if (t.sig === tsg) return;
        t.sig = tsg;
        for (const o of t.group.children) if (o.isMesh) o.geometry.dispose();
        t.group.clear();
        for (let j = 0; j < n; j++) {
          const m = itemModel(id);
          m.position.set(((j % 3) - 1) * 0.21, 0, (Math.floor(j / 3) - 0.5) * 0.32);
          m.scale.setScalar(1.25);
          m.rotation.y = (j * 1.7) % PI;
          t.group.add(m);
        }
        if (n) mergeStatic(t.group); // a counter's food: one mesh per material
        if (n && sig5(id)) { const sp = mesh(geo('sparkle', () => new THREE.OctahedronGeometry(0.05, 0)), starM, 0, 0.45, 0, false); sp.userData.spin = true; t.group.add(sp); }
      });
    }
    // Back room props
    cash.forEach((c, k) => { c.visible = k < Math.min(12, Math.ceil(s.dirty / 150)); });
    const bagsN = Object.values(s.bags).reduce((a, b) => a + b, 0), kitsN = Object.values(s.kits).reduce((a, b) => a + b, 0);
    bagPile.forEach((b, k) => { b.visible = k < Math.min(24, bagsN); });
    const top = Object.entries(s.bags).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (top !== bagTint) { bagTint = top; const c = new THREE.Color().setHSL(((top || 'x').split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 360) / 360, 0.6, 0.7); for (const b of bagPile) b.material.color.copy(c); }
    kitsBoxes.forEach((b, k) => { b.visible = k < Math.min(8, kitsN); });
    camGroup.visible = G.has(s, 'camera');
    setSign(G.shopDef(s).sign);
    camLed.color.set(Math.sin(now * 4) > 0 ? '#ff3a3a' : '#551111');
    catering.visible = G.has(s, 'catering');
    neonSign.visible = G.has(s, 'sign');
    woodSign.visible = !neonSign.visible;
    partition.visible = view.zone === 'shop';
    shopSideLights.visible = view.zone === 'shop';
  }

  // ---------- Camera, lighting, render ----------
  const SUN_MORNING = new THREE.Color('#ffd9a8'), SUN_NOON = new THREE.Color('#fff4e4'), SUN_LATE = new THREE.Color('#ffb46b');
  function applyLights(dt, now, frac) {
    const L = LIGHTS[view.light] || LIGHTS.day;
    const k = 1 - Math.exp(-dt * 3);
    for (const key of ['nightK', 'hemi', 'sun', 'lamp', 'bulb', 'neon', 'street', 'alley', 'lampI', 'winI', 'glow']) cur[key] += (L[key] - cur[key]) * k;
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
    // until the screen is dark, stay framed on the floor that's still showing
    const z = ZONES[(view.zone === 'back') !== shownBack ? (shownBack ? 'back' : 'shop') : view.zone];
    cam.target.lerp(z.center, 1 - Math.exp(-dt * 3.5));
    const bh = Math.max(140, H - view.top - view.bottom);
    const yc = view.top + bh / 2;
    baseUnit = Math.max(z.needW / W, z.needH / bh); camYC = yc;
    unit = baseUnit / cam.zoom;
    // the glide after a quick swipe
    if (cam.vR || cam.vU) {
      cam.panR += cam.vR * dt; cam.panU += cam.vU * dt;
      const k = Math.exp(-dt * 6); cam.vR *= k; cam.vU *= k;
      if (Math.hypot(cam.vR, cam.vU) < 0.05) { cam.vR = 0; cam.vU = 0; }
    }
    if (camHome) { // easing back to the starting view after a double tap
      const k = 1 - Math.exp(-dt * 7);
      cam.panR += (0 - cam.panR) * k; cam.panU += (0 - cam.panU) * k; cam.zoom += (1 - cam.zoom) * k;
      if (Math.abs(cam.panR) + Math.abs(cam.panU) + Math.abs(cam.zoom - 1) < 0.01) { cam.panR = 0; cam.panU = 0; cam.zoom = 1; camHome = false; }
    }
    const lim = 4 + 7 / cam.zoom;
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

  // ---------- Input: tap to pick, drag to pan (with a little glide), pinch to zoom round your fingers, wheel to zoom ----------
  // A gesture can start on the canvas or on a bubble over a machine (the UI passes those in with what a tap would do):
  // it's only a tap if the finger barely moved; otherwise it pans like any other drag.
  const ptrs = new Map();
  let lastGround = null, camHome = false;
  let drag = null, pinch = null;
  const ray = new THREE.Raycaster();
  const TAP_SLOP = 10; // pixels a finger can wander and still be a tap
  const zoomTo = z => Math.max(0.3, Math.min(2.6, z));
  function pointerDown(e, onTap = null) {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cam.vR = 0; cam.vU = 0; camHome = false; // a touch stops a glide (and easing home)
    if (ptrs.size === 1) {
      const now = performance.now();
      drag = { x: e.clientX, y: e.clientY, r: cam.panR, u: cam.panU, moved: false, onTap, vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, lt: now };
      const d0 = drag;
      d0.hold = setTimeout(() => { if (drag === d0 && !d0.moved && ptrs.size === 1 && !view.design) { d0.long = true; pick(d0.x, d0.y, true); } }, 550);
    }
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), z: cam.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, r: cam.panR, u: cam.panU };
      if (drag) { drag.moved = true; clearTimeout(drag.hold); }
    }
  }
  function pointerMove(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size >= 2) {
      // Zoom about the point between your fingers, and pan as they move together
      const [a, b] = [...ptrs.values()];
      const z = zoomTo(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d);
      const u0 = baseUnit / pinch.z, u1 = baseUnit / z, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      cam.zoom = z;
      cam.panR = pinch.r + (pinch.mx - W / 2) * u0 - (mx - W / 2) * u1;
      cam.panU = pinch.u - (pinch.my - camYC) * u0 + (my - camYC) * u1;
    } else if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > TAP_SLOP) { drag.moved = true; clearTimeout(drag.hold); drag.x = e.clientX; drag.y = e.clientY; drag.r = cam.panR; drag.u = cam.panU; }
      if (drag.moved) {
        cam.panR = drag.r - (e.clientX - drag.x) * unit; cam.panU = drag.u + (e.clientY - drag.y) * unit;
        // how fast the finger is going, for the glide after it lets go (pixels per ms, smoothed)
        const now = performance.now(), dt = Math.max(1, now - drag.lt);
        drag.vx = drag.vx * 0.6 + ((e.clientX - drag.lx) / dt) * 0.4; drag.vy = drag.vy * 0.6 + ((e.clientY - drag.ly) / dt) * 0.4;
        drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
      }
    }
  }
  function pointerEnd(e) {
    if (!ptrs.has(e.pointerId)) return;
    if (drag) clearTimeout(drag.hold);
    const wasTap = drag && !drag.moved && !drag.long && ptrs.size === 1;
    ptrs.delete(e.pointerId);
    if (pinch && ptrs.size < 2) {
      pinch = null;
      // one finger left: carry on panning from where it is, without a jump
      if (ptrs.size === 1) { const [p] = [...ptrs.values()]; drag = { x: p.x, y: p.y, r: cam.panR, u: cam.panU, moved: true, vx: 0, vy: 0, lx: p.x, ly: p.y, lt: performance.now() }; }
    }
    if (wasTap && e.type === 'pointerup') { if (drag.onTap) drag.onTap(); else pick(e.clientX, e.clientY); }
    else if (drag?.moved && ptrs.size === 0 && e.type === 'pointerup' && performance.now() - drag.lt < 90 && Math.hypot(drag.vx, drag.vy) > 0.25) {
      // world units a second: a gentle glide, never more than a couple of metres
      const k = Math.min(1, 10 / (Math.hypot(drag.vx, drag.vy) * unit * 600 || 1));
      cam.vR = -drag.vx * unit * 600 * k; cam.vU = drag.vy * unit * 600 * k;
    }
    if (ptrs.size === 0) drag = null;
  }
  canvas.addEventListener('pointerdown', e => pointerDown(e));
  window.addEventListener('pointermove', pointerMove);
  window.addEventListener('pointerup', pointerEnd);
  window.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    // zoom about the mouse pointer
    const z0 = cam.zoom, z = zoomTo(z0 * Math.exp(-e.deltaY * 0.0015)), u0 = baseUnit / z0, u1 = baseUnit / z;
    cam.zoom = z; cam.panR += (e.clientX - W / 2) * (u0 - u1); cam.panU -= (e.clientY - camYC) * (u0 - u1);
  }, { passive: false });

  function pick(x, y, long = false) {
    if (view.design) { if (!long) designPick(x, y); return; }
    ray.setFromCamera(new THREE.Vector2(x / W * 2 - 1, -(y / H) * 2 + 1), camera);
    const hits = ray.intersectObjects(pickables, true);
    for (const h of hits) {
      // Only things on the floor you're looking at: in the basement, the shop above is cut away but still there
      if (view.zone === 'back' ? h.point.y > BY + 3.1 : h.point.y < -0.5) continue;
      let o = h.object;
      while (o && !o.userData?.act) o = o.parent;
      if (o && long) { if (o.userData.act === 'machine') onPick({ ...o.userData, long: '1' }); return; } // held: only machines care
      if (o) { onPick({ ...o.userData }); return; }
    }
    if (long) return;
    // Two quick taps on nothing glide the view back to where it started
    const t = performance.now();
    if (lastGround && t - lastGround.t < 350 && Math.hypot(x - lastGround.x, y - lastGround.y) < 40) { camHome = true; cam.vR = 0; cam.vU = 0; lastGround = null; }
    else lastGround = { t, x, y };
    onPick({ act: 'ground' }); // a tap on nothing in particular (the UI uses it to close menus)
  }

  let last = performance.now() / 1000, simClock = 0;
  return {
    // a finger or mouse went down on a bubble: it pans like the canvas, and onTap runs only if it was a tap
    pointerDown(e, onTap) { pointerDown(e, onTap); },
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
      const hr = G.localHour(s.clock);
      view.light = hr >= 7 && hr < 17 ? 'day' : hr >= 17 && hr < 20.5 ? 'evening' : 'night';
      const frac = Math.max(0, Math.min(1, (hr - 7) / 10));
      applyLights(dt, now, frac);
      hood.update(dt, now, cur.nightK, onZebra());
      updateCamera(dt);
      updateShell(s, dt);
      if ((shadowT -= dt) <= 0) { shadowT = 1; trimShadows(scene); }
      if ((frameNo++ & 1) === 0) renderer.shadowMap.needsUpdate = true;
      updateUnder(dt);
      renderer.render(scene, camera);
      updateOverlay(s, now);
    },
    poke, sold,
    debug: { scene, camera, cam, view, renderer },
  };
}
