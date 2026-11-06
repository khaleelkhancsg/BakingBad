// The 3D bakery (day) and back room (night). Everything is built from simple shapes in code.
// The scene only reads game state; taps on stations and people are reported back through onPick.
import * as THREE from 'three';
import { CFG, ITEMS, MACHINES, LAB_MACHINES, SPOTS, LAB_SPOTS, PRODUCTS } from './data.js';
import * as G from './game.js';
import { V3, PI, geo, mat, smat, mesh, box, rbox, cyl, sphere, canvasTex, mergeStatic } from './three-helpers.js';
import { buildWorld } from './world.js';
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
  const bagM = smat({ color: '#c8a36a', roughness: 0.85 });
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

export function createScene(canvas, overlayEl, { onPick }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 600;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the pastel colours, softens hot spots
  renderer.toneMappingExposure = 1.05;
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
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 19, bottom: -19, near: 1, far: 90 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.target.position.set(-3.5, 0, 0);
  sun.position.set(4, 16, 9);
  scene.add(sun, sun.target);
  const shopLamp = new THREE.PointLight('#ffd59a', 0, 10, 2); shopLamp.position.set(0, 2.7, 1.2); scene.add(shopLamp);
  const bulb = new THREE.PointLight('#ffcc88', 0, 9, 2); bulb.position.set(-9.4, 2.6, -1.6); scene.add(bulb);
  const neon = new THREE.PointLight('#9b5cff', 0, 11, 2); neon.position.set(-7.0, 2.3, -3.6); scene.add(neon);
  // The street and alley lamps only glow (emissive); real point lights are kept to three for speed.
  const street = { intensity: 0 }, alley = { intensity: 0 };
  const LIGHTS = {
    day:     { nightK: 0, hemi: 1.7, hemiC: '#fff1dc', sun: 2.4, sunC: '#ffe2b8', bg: '#2b2140', lamp: 0, bulb: 3, neon: 4, street: 0, alley: 0, lampI: 0.3, win: '#bfe6ff', winI: 0.9, glow: 0.6 },
    evening: { nightK: 0.55, hemi: 1.0, hemiC: '#ffd2b0', sun: 1.5, sunC: '#ff9a5a', bg: '#2a1830', lamp: 10, bulb: 5, neon: 6, street: 10, alley: 4, lampI: 1.6, win: '#ff9e6b', winI: 0.9, glow: 1 },
    night:   { nightK: 1, hemi: 0.75, hemiC: '#9aa4ff', sun: 0.6, sunC: '#8c9aff', bg: '#0b0912', lamp: 3, bulb: 26, neon: 34, street: 14, alley: 14, lampI: 2.4, win: '#1a2240', winI: 0.6, glow: 1.8 },
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
  const backFloor = mesh(new THREE.PlaneGeometry(6.9, 9), smat({ map: concreteTex, roughness: 0.95 }), -8.15, 0.001, 0, false);
  backFloor.rotation.x = -PI / 2; statics.add(backFloor);
  statics.add(box(7.15, 0.45, 9.25, '#a79f95', -8.15, -0.45, 0, false));

  // Walls
  const shopWall = mat('#f6d2b0'), shopWain = mat('#c98f6b'), trim = mat('#fff0dc');
  const backWall = mat('#41464f'), backWain = mat('#30343b');
  function wallX(x0, x1, z, upper, lower, tiles) { // runs along x
    const w = x1 - x0, cx = (x0 + x1) / 2;
    statics.add(box(w, 1.0, 0.2, lower, cx, 0, z));
    statics.add(box(w, 2.0, 0.2, upper, cx, 1.0, z));
    statics.add(box(w, 0.06, 0.24, trim, cx, 1.0, z));
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
  statics.add(box(7.2, 0.12, 0.34, capM, -8.15, 3.0, -4.6));
  statics.add(box(0.34, 0.12, 9.3, capM, -11.7, 3.0, -0.05));
  // Back room walls
  wallX(-11.6, -4.7, -4.6, backWall, backWain, null);
  wallZ(-4.7, 1.6, -11.7, backWall, backWain);
  wallZ(2.8, 4.6, -11.7, backWall, backWain);
  statics.add(box(0.2, 0.95, 1.2, backWall, -11.7, 2.05, 2.2));
  const backDoorPivot = new THREE.Group(); backDoorPivot.position.set(-11.68, 0, 1.62);
  const backDoor = box(0.08, 2.0, 1.15, '#55606b', 0, 0, 0.58); backDoorPivot.add(backDoor);
  backDoorPivot.add(box(0.1, 0.1, 0.1, '#c9ccd3', 0.05, 1.0, 1.02));
  scene.add(backDoorPivot);

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
  windowOn(-9.5, -4.6, 1.0, 0.5, 2.1);
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

  // Display case and till
  statics.add(box(5.1, 0.95, 0.9, '#9c5f3b', 0, 0, 0.95));
  statics.add(box(5.14, 0.08, 0.94, '#5c3520', 0, 0, 0.95));
  statics.add(box(5.0, 0.6, 0.02, '#b67a52', 0, 0.2, 1.41));
  statics.add(box(5.14, 0.04, 0.94, '#efe6d8', 0, 0.95, 0.95));
  const glass = smat({ color: '#cfefff', transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false });
  statics.add(box(5.1, 0.55, 0.9, glass, 0, 0.99, 0.95, false));
  statics.add(box(5.14, 0.04, 0.94, '#efe6d8', 0, 1.54, 0.95));
  const trays = [];
  for (let k = 0; k < 14; k++) {
    const x = -2.22 + (k % 7) * 0.74, z = k < 7 ? 1.16 : 0.74;
    statics.add(box(0.66, 0.03, 0.34, '#f6f1e6', x, 0.99, z));
    const tg = new THREE.Group(); tg.position.set(x, 1.02, z); scene.add(tg);
    trays.push({ x, group: tg, sig: '' });
  }
  statics.add(box(1.0, 0.95, 0.9, '#8a5235', 3.1, 0, 0.95));
  statics.add(box(1.04, 0.05, 0.94, '#efe6d8', 3.1, 0.95, 0.95));
  statics.add(box(0.5, 0.22, 0.4, '#2e2f36', 3.1, 1.0, 0.9));
  const screenM = smat({ color: '#0a2a1a', emissive: '#5fd38d', emissiveIntensity: 0.8 });
  { const scr = box(0.36, 0.22, 0.03, screenM, 3.1, 1.22, 0.78); scr.rotation.x = -0.4; statics.add(scr); }
  for (const x of [-1.6, 0, 1.6]) {
    statics.add(cyl(0.01, 0.01, 0.6, '#222', x, 2.4, 1.0, 6, false));
    const shade = mesh(geo('shade', () => new THREE.ConeGeometry(0.22, 0.2, 14, 1, true)), mat('#2f2a3a', { side: THREE.DoubleSide }), x, 2.35, 1.0);
    statics.add(shade);
    const bm = smat({ color: '#fff3d6', emissive: '#ffd59a', emissiveIntensity: 0.6 });
    glowMats.push(bm); statics.add(sphere(0.07, bm, x, 2.27, 1.0, false));
  }
  // Decor: plants, rug, flour sacks, crates
  function plant(x, z, s = 1) {
    statics.add(cyl(0.2 * s, 0.15 * s, 0.35 * s, '#c96f4a', x, 0, z, 12));
    for (const [dx, dy, dz, r] of [[0, 0.55, 0, 0.26], [0.12, 0.72, 0.05, 0.18], [-0.12, 0.68, -0.06, 0.2]]) statics.add(sphere(r * s, '#4f9a5a', x + dx * s, dy * s, z + dz * s));
  }
  { const rug = mesh(new THREE.PlaneGeometry(1.6, 1.1), mat('#b8485e'), 3.8, 0.004, 3.6, false); rug.rotation.x = -PI / 2; statics.add(rug); }
  // Back room clutter
  statics.add(box(0.9, 0.6, 0.7, '#7d6448', -11.0, 0, -1.6)); statics.add(box(0.7, 0.5, 0.6, '#8d7354', -10.95, 0.6, -1.55));
  statics.add(box(0.8, 0.5, 0.8, '#6b5540', -10.9, 0, 3.9));
  const ledM = smat({ color: '#2a1840', emissive: '#a46bff', emissiveIntensity: 1.2 });
  glowMats.push(ledM);
  statics.add(box(6.6, 0.05, 0.05, ledM, -8.15, 2.85, -4.48, false));
  statics.add(cyl(0.01, 0.01, 0.5, '#222', -9.4, 2.5, -1.6, 6, false));
  const bulbM = smat({ color: '#fff3d6', emissive: '#ffcc88', emissiveIntensity: 1 }); glowMats.push(bulbM);
  statics.add(sphere(0.09, bulbM, -9.4, 2.45, -1.6, false));
  // Cash table, kit boxes, bag pile (filled from state)
  statics.add(box(1.2, 0.75, 0.75, '#5a4632', -6.9, 0, 1.0));
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
  statics.add(box(0.9, 0.8, 0.6, '#4f4639', -6.0, 0, -1.2));
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

  // ---------- Outside: shopfront walls, planters, A-board, street lamp ----------
  // Knee-high front walls (they open up when a terrace is bought), with planters and a doorway on the street side
  const frontWall = new THREE.Group(), sideWall = new THREE.Group();
  frontWall.add(box(9.4, 0.5, 0.2, shopWain, 0, 0, 4.6), box(9.44, 0.06, 0.26, trim, 0, 0.5, 4.6));
  sideWall.add(box(0.2, 0.5, 7.5, shopWain, 4.6, 0, -0.95), box(0.26, 0.06, 7.54, trim, 4.6, 0.5, -0.95));
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
  const openTex = canvasTex(128, 64, (c, w, h) => {
    c.fillStyle = '#fff4e0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#b8485e'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
    c.fillStyle = '#b8485e'; c.font = 'bold 34px Georgia, serif'; c.textAlign = 'center'; c.fillText('OPEN', w / 2, 44);
  });
  { const sign = mesh(new THREE.PlaneGeometry(0.62, 0.31), smat({ map: openTex, side: THREE.DoubleSide }), 4.76, 0.78, 2.85, false); sign.rotation.y = PI / 2; statics.add(sign); }
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
  statics.add(cyl(0.05, 0.08, 2.9, '#2b2d36', 6.95, -0.09, 2.95, 10));
  statics.add(box(0.5, 0.06, 0.06, '#2b2d36', 6.73, 2.76, 2.95));
  const lampM = smat({ color: '#fff1cc', emissive: '#ffd27a', emissiveIntensity: 0.4 });
  lampGlows.push(lampM);
  statics.add(sphere(0.13, lampM, 6.5, 2.65, 2.95, false));
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
  statics.add(box(0.12, 0.24, 0.2, '#2b2d36', -11.85, 2.45, 3.5));
  const alleyM = smat({ color: '#ffe2b0', emissive: '#ffb05a', emissiveIntensity: 0.4 });
  lampGlows.push(alleyM);
  statics.add(sphere(0.08, alleyM, -11.98, 2.45, 3.5, false));

  scene.add(mergeStatic(statics));
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
      g.add(cyl(0.2, 0.15, 0.35, '#c96f4a', 0, 0, 0, 12));
      for (const [dx, dy, dz, r] of [[0, 0.55, 0, 0.26], [0.12, 0.72, 0.05, 0.18], [-0.12, 0.68, -0.06, 0.2]]) g.add(sphere(r, '#4f9a5a', dx, dy, dz));
    } else if (type === 'ficus') {
      g.add(cyl(0.22, 0.17, 0.4, '#e8e2d6', 0, 0, 0, 12)); g.add(cyl(0.04, 0.05, 0.85, '#7a5534', 0, 0.4, 0, 6));
      const c1 = mesh(geo('ico45', () => new THREE.IcosahedronGeometry(0.45, 0)), mat('#4f8f48', { flatShading: true }), 0, 1.4, 0); g.add(c1);
      g.add(mesh(geo('ico3', () => new THREE.IcosahedronGeometry(0.3, 0)), mat('#6aab57', { flatShading: true }), 0.18, 1.05, 0.1));
    } else if (type === 'flowers') {
      g.add(cyl(0.12, 0.16, 0.6, '#f4f0e8', 0, 0, 0, 10)); g.add(cyl(0.12, 0.09, 0.25, '#4f9de8', 0, 0.6, 0, 10));
      for (const [dx, dz, c] of [[0, 0, '#ff7eb6'], [0.1, 0.06, '#ffd447'], [-0.09, 0.05, '#ffffff'], [0.03, -0.1, '#ff5d6c'], [-0.06, -0.06, '#b58cff']]) g.add(sphere(0.07, c, dx, 0.95 + Math.abs(dx) * 0.5, dz));
    } else if (type === 'rug') {
      g.add(cyl(0.46, 0.46, 0.02, '#9b6bff', 0, 0, 0, 24, false)); g.add(cyl(0.32, 0.32, 0.025, '#ffd6de', 0, 0, 0, 24, false));
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
        g.add(mesh(geo('para', () => new THREE.ConeGeometry(0.95, 0.35, 8)), mat('#e85d75'), 0, 2.6, 0));
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
      g.add(cyl(0.32, 0.32, 0.08, '#b8485e', 0, 0, 0, 18));
      const body = sphere(0.2, '#f0a050', 0, 0.22, 0); body.scale.set(1.35, 0.7, 0.95); g.add(body);
      g.add(sphere(0.13, '#f0a050', 0.25, 0.33, 0));
      for (const dz of [-0.06, 0.06]) { const ear = mesh(geo('ear', () => new THREE.ConeGeometry(0.045, 0.09, 4)), mat('#f0a050'), 0.27, 0.46, dz); g.add(ear); }
      const tail = mesh(geo('tail', () => new THREE.TorusGeometry(0.16, 0.04, 6, 10, PI)), mat('#f0a050'), -0.2, 0.15, 0); tail.rotation.x = PI / 2; g.add(tail);
    } else if (type === 'fountain') {
      g.add(cyl(0.48, 0.52, 0.32, '#d9d3c8', 0, 0, 0, 18)); g.add(cyl(0.42, 0.42, 0.02, fountainWater, 0, 0.29, 0, 18, false));
      g.add(cyl(0.08, 0.1, 0.55, '#d9d3c8', 0, 0.3, 0, 10)); g.add(cyl(0.22, 0.12, 0.1, '#d9d3c8', 0, 0.85, 0, 14));
      g.add(sphere(0.07, fountainWater, 0, 1.0, 0, false));
    } else if (type === 'sacks') {
      for (const [x, z] of [[-0.15, 0.05], [0.2, -0.05]]) { const sk = sphere(0.28, '#e9dcc1', x, 0.27, z); sk.scale.set(1, 1.1, 0.8); g.add(sk); }
    }
    g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
    return g;
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
    }
    return g;
  }
  const decorGroup = new THREE.Group(); scene.add(decorGroup);
  const artBack = new THREE.Group(); scene.add(artBack);
  const artLeft = new THREE.Group(); partition.add(artLeft);
  function rebuildDecor(s) {
    decorGroup.clear(); artBack.clear(); artLeft.clear();
    s.design.decor.forEach((it, idx) => {
      const m = decorModel(it.type);
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
    const floorMode = dv.cat === 'floor' || dv.cat === 'decor';
    const wallMode = dv.cat === 'wall' || dv.cat === 'art';
    const tint = (ctx, x, y, cx, cz) => {
      const owned = D.cellOwned(s, cx, cz);
      if (!owned) { ctx.fillStyle = 'rgba(40,30,60,0.35)'; ctx.fillRect(x, y, TS, TS); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([4, 4]); ctx.strokeRect(x + 2, y + 2, TS - 4, TS - 4); ctx.setLineDash([]); return; }
      if (dv.cat === 'decor') {
        const type = dv.moving != null ? s.design.decor[dv.moving]?.type : dv.item;
        const ok = type ? !D.canPlace(s, type, cx, cz, dv.moving ?? -1) : !D.keptClear(cx, cz) || D.cellZone(cx, cz) !== 'inside';
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
      const os = JSON.stringify([dv.cat, dv.item, dv.moving, d.decor, d.expansions, !!s.upgrades.catering]);
      if (os !== overlaySig) { overlaySig = os; paintOverlay(s, dv); }
      const sel = dv.sel != null ? d.decor[dv.sel] : null;
      selRing.visible = !!sel;
      if (sel) { const { x, z } = D.cellCenter(sel.cx, sel.cz); selRing.position.set(x, 0.06 + Math.abs(Math.sin(now * 4)) * 0.05, z); }
    } else { selRing.visible = false; overlaySig = ''; }
  }

  // Taps while designing: find the square, panel or decoration under the finger.
  const dRay = new THREE.Raycaster();
  function designPick(x, y) {
    dRay.setFromCamera(new THREE.Vector2(x / W * 2 - 1, -(y / H) * 2 + 1), camera);
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
    const hits = dRay.intersectObjects([decorGroup, shopFloor, pickFront, pickSide], true);
    for (const h of hits) {
      let o = h.object;
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
  function rebuildStations(s) {
    for (const st of stations) { scene.remove(st.group); const i = pickables.indexOf(st.group); if (i >= 0) pickables.splice(i, 1); }
    stations = [];
    const add = (m, idx, kind) => {
      const M = kind === 'day' ? MACHINES[m.type] : LAB_MACHINES[m.type];
      const pl = (kind === 'day' ? SPOTS : LAB_SPOTS)[m.spot];
      if (!M || !pl) return;
      const st = (BUILDERS[M.model] || buildOven)(M.tint);
      st.group.position.set(pl.x, 0, pl.z);
      st.group.rotation.y = pl.ry;
      st.group.userData = { act: 'machine', kind, idx };
      st.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
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
    navGrid = null;
    if (s.labUnlocked && !pickables.includes(innerDoor)) pickables.push(innerDoor);
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
  const browsers = []; let browserId = 1;

  // You: the baker. Walks to whatever you tap.
  const BAKER_HOME = { shop: V3(0.7, 0, -1.4), back: V3(-7.7, 0, -2.6) };
  const baker = new Agent(scene, { skin: 1, shirt: 0, hair: 1, pants: 0, h: 1.02 }, 'baker', BAKER_HOME.shop.clone());
  baker.face = PI / 4;
  let bakerZone = 'shop', bakerJob = null, bakerIdle = 0;
  // ---------- Walking around things: a grid over the floor, A* and a smoothed path ----------
  const NAV = { x0: -11.6, x1: 6.9, z0: -4.45, z1: 6.9, c: 0.2 };
  const NW = Math.ceil((NAV.x1 - NAV.x0) / NAV.c), NH = Math.ceil((NAV.z1 - NAV.z0) / NAV.c);
  // Floor you can stand on: the shop, the back room, the door between them, the shop door and the terraces
  const AREAS = [[-4.35, 4.35, -4.4, 4.4], [-11.45, -4.85, -4.4, 4.4], [-5.0, -4.2, 2.65, 3.55], [4.2, 5.0, 3.25, 4.15],
    [4.85, 6.9, -4.4, 6.9], [-4.4, 6.9, 4.85, 6.9]];
  const FIXED = [[-2.6, 3.5, 0.45, 1.45], [-11.45, -10.55, -1.95, -1.25], [-11.3, -10.5, 3.5, 4.3], [-7.5, -6.3, 0.62, 1.38], [-6.45, -5.55, -1.5, -0.9], [-11.4, -10.5, -3.2, -2.8]];
  let navGrid = null;
  const cellOf = (x, z) => [Math.floor((x - NAV.x0) / NAV.c), Math.floor((z - NAV.z0) / NAV.c)];
  const centre = (i, j) => V3(NAV.x0 + (i + 0.5) * NAV.c, 0, NAV.z0 + (j + 0.5) * NAV.c);
  function buildNav() {
    const pad = 0.16, rects = FIXED.map(r => [r[0] - pad, r[1] + pad, r[2] - pad, r[3] + pad]);
    for (const st of stations) {
      const p = st.group.position, side = Math.abs(Math.sin(st.group.rotation.y)) > 0.5;
      const hx = (side ? 0.42 : 0.55) + pad, hz = (side ? 0.55 : 0.42) + pad;
      rects.push([p.x - hx, p.x + hx, p.z - hz, p.z + hz]);
    }
    navGrid = new Uint8Array(NW * NH);
    for (let j = 0; j < NH; j++) for (let i = 0; i < NW; i++) {
      const c = centre(i, j);
      const ok = AREAS.some(a => c.x >= a[0] && c.x <= a[1] && c.z >= a[2] && c.z <= a[3]) && !rects.some(r => c.x > r[0] && c.x < r[1] && c.z > r[2] && c.z < r[3]);
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
    if (start !== goal && came[goal] < 0) return null;
    const cells = [];
    for (let k = goal; k !== -1 && k !== start; k = came[k]) cells.push(centre(k % NW, Math.floor(k / NW)));
    cells.reverse();
    // Smooth it: skip waypoints you can see past
    const pts = [], at = from.clone().setY(0);
    let i = 0;
    while (i < cells.length) {
      let j = cells.length - 1;
      while (j > i && !clearLine(pts.length ? pts.at(-1) : at, cells[j])) j--;
      pts.push(cells[j]); i = j + 1;
    }
    pts.push(to.clone().setY(0));
    return pts;
  }
  // Walk somewhere, around machines and through doorways
  function walkTo(agent, dest) {
    const path = findPath(agent.group.position, dest);
    if (!path) { agent.path = null; agent.target.copy(dest); return; }
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
      const ti = Math.min(13, Math.max(0, G.menuOf(s).indexOf(collected)));
      for (let k = 0; k < 3; k++) launch(itemModel(collected), from, V3(trays[ti].x, 1.08, 0.95), { delay: k * 0.09 });
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
      if (baker.group.position.distanceTo(BAKER_HOME[bakerZone]) > 12) { baker.group.position.copy(BAKER_HOME[bakerZone]); baker.target.copy(BAKER_HOME[bakerZone]); baker.path = null; }
      else walkTo(baker, BAKER_HOME[bakerZone]);
    }
    const bakerThere = baker.update(dt);
    if (bakerJob && bakerThere) { baker.work = 0.6; bakerJob = null; bakerIdle = 0; }
    else if (!bakerJob && bakerThere) {
      bakerIdle += dt;
      if (bakerIdle > 6 && baker.group.position.distanceTo(BAKER_HOME[bakerZone]) > 0.1 && !baker.path?.length) { walkTo(baker, BAKER_HOME[bakerZone]); baker.face = PI / 4; }
    }

    // Customers: in through the doorway, queue at the tray they want, out again (all from the live engine)
    const WALK = 3.2, BROWSE = 1.4;
    const nowMs = Date.now();
    G.live.customers = G.live.customers.filter(c => nowMs - c.at < 12000);
    const menu = G.menuOf(s), live = new Set(), lines = new Map();
    const crowd = G.live.customers.slice(-14);
    for (const c of crowd) {
      if ((nowMs - c.at) / 1000 > WALK + BROWSE) continue;
      const ti = Math.min(13, Math.max(0, menu.indexOf(c.want)));
      if (!lines.has(ti)) lines.set(ti, []);
      lines.get(ti).push(c.id);
    }
    for (const c of crowd) {
      const age = (nowMs - c.at) / 1000;
      live.add(c.id);
      let e = customers.get(c.id);
      if (!e) { e = { agent: new Agent(scene, c.look, 'customer', OUTSIDE.clone()), shown: false, inside: false, leaving: false, c }; customers.set(c.id, e); }
      if (age > WALK + BROWSE) e.leaving = true;
      if (!e.leaving) {
        if (!e.inside) { e.agent.target.copy(GAP); e.agent.face = null; if (e.agent.group.position.distanceTo(GAP) < 0.15) e.inside = true; }
        else {
          const ti = Math.min(13, Math.max(0, menu.indexOf(c.want)));
          const k = lines.get(ti)?.indexOf(c.id) ?? 0;
          e.agent.target.set(trays[ti].x + (k % 2 ? 0.16 : -0.16) * (k > 0 ? 1 : 0), 0, 1.95 + k * 0.6);
          e.agent.face = PI;
        }
      }
      if (age >= WALK && !e.shown) {
        e.shown = true;
        e.agent.p.bag.visible = c.res.kind === 'good';
        if (c.res.kind === 'good') coin(TILL);
        const face = c.res.kind === 'good' ? '😊' : c.res.kind === 'bad' ? '😞' : '😒';
        reactions.push({ agent: e.agent, text: `${face} ${c.res.text}`, kind: c.res.kind, until: now + 2.2, id: 'r' + c.id });
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

    // Browsers: visual only. More of them when the shop is busier.
    if (view.zone === 'shop' && !view.design && browsers.length < 4 && Math.random() < dt * Math.min(0.25, G.customersPerHour(s, s.clock) / 3600 * 6)) {
      const look = { skin: Math.floor(Math.random() * 5), shirt: Math.floor(Math.random() * 10), hair: Math.floor(Math.random() * 6), pants: Math.floor(Math.random() * 5), h: 0.9 + Math.random() * 0.2, hat: Math.random() < 0.2 };
      const tray = trays[Math.floor(Math.random() * trays.length)];
      browsers.push({ agent: new Agent(scene, look, 'customer', OUTSIDE.clone()), stage: 0, tray, until: 0, id: 'w' + (browserId++) });
    }
    for (let i = browsers.length - 1; i >= 0; i--) {
      const w = browsers[i], a = w.agent;
      if (w.stage === 0) { a.target.copy(GAP); a.face = null; if (a.group.position.distanceTo(GAP) < 0.15) w.stage = 1; }
      else if (w.stage === 1) { a.target.set(w.tray.x + (Math.random() - 0.5) * 0.2, 0, 2.6 + Math.random() * 0.5); a.face = PI; w.stage = 2; }
      else if (w.stage === 2 && a.group.position.distanceTo(a.target) < 0.1) { w.stage = 3; w.until = now + 3 + Math.random() * 4; if (Math.random() < 0.5) reactions.push({ agent: a, text: Math.random() < 0.5 ? '👀' : '🤔', kind: 'meh', until: now + 2, id: 'r' + w.id }); }
      else if (w.stage === 3 && now > w.until) { w.stage = 4; a.face = null; }
      else if (w.stage === 4) { a.target.copy(GAP); if (a.group.position.distanceTo(GAP) < 0.15) w.stage = 5; }
      else if (w.stage === 5) a.target.copy(OUTSIDE);
      const arrived = a.update(dt);
      if ((w.stage === 5 && arrived) || (view.zone !== 'shop' && w.stage < 2)) { scene.remove(a.group); browsers.splice(i, 1); }
    }

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
      if (e.via) { e.agent.target.copy(DOOR_IN); if (e.agent.group.position.distanceTo(DOOR_IN) < 0.1) e.via = false; }
      else e.agent.target.copy(spot);
      e.agent.face = PI / 2 + 0.3;
    });
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
  let bubbleScale = 1;
  const DOOR_BUB = V3(-4.6, 2.35, 3.1);
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
      for (const [, e] of customers) {
        const c = e.c;
        if (!c || e.shown || !e.inside || !ITEMS[c.want]) continue;
        want.set(`t-${c.id}`, { html: `${ITEMS[c.want].emoji}`, cls: 'bub think', at: '', pos: e.agent.group.position.clone().setY(e.agent.height + 0.25) });
      }
      // The door between the shop and the back room
      if (s.labUnlocked) want.set('door', { html: view.zone === 'shop' ? '<span>🚪</span><small>Back</small>' : '<span>☀️</span><small>Shop</small>', cls: 'bub door', at: 'data-act="room"', pos: DOOR_BUB });
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
  let traySig = '', bagTint = null;
  function syncState(s, dt, now) {
    syncDesign(s, now);
    const sig = JSON.stringify([s.machines.map(m => [m.type, m.spot]), s.lab.map(m => [m.type, m.spot])]);
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
    const menu = G.menuOf(s);
    const fill = id => Math.min(6, Math.ceil((s.display[id] || 0) / ITEMS[id].servings * 3));
    const tsig = menu.map(id => id + fill(id)).join(',');
    if (tsig !== traySig) {
      traySig = tsig;
      trays.forEach((t, k) => {
        const id = menu[k];
        const n = id ? fill(id) : 0;
        const tsg = id + n;
        if (t.sig === tsg) return;
        t.sig = tsg;
        t.group.clear();
        for (let j = 0; j < n; j++) {
          const m = itemModel(id);
          m.position.set(((j % 3) - 1) * 0.19, 0, (Math.floor(j / 3) - 0.5) * 0.15);
          m.scale.setScalar(0.72);
          m.rotation.y = (j * 1.7) % PI;
          t.group.add(m);
        }
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
    const z = ZONES[view.zone];
    cam.target.lerp(z.center, 1 - Math.exp(-dt * 3.5));
    const bh = Math.max(140, H - view.top - view.bottom);
    const yc = view.top + bh / 2;
    unit = Math.max(z.needW / W, z.needH / bh) / cam.zoom;
    const lim = 4 + 5 / cam.zoom;
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
      cam.zoom = Math.max(0.5, Math.min(2.6, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
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
  canvas.addEventListener('wheel', e => { e.preventDefault(); cam.zoom = Math.max(0.5, Math.min(2.6, cam.zoom * Math.exp(-e.deltaY * 0.0015))); }, { passive: false });

  function pick(x, y) {
    if (view.design) { designPick(x, y); return; }
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
      const hr = G.localHour(s.clock);
      view.light = hr >= 7 && hr < 17 ? 'day' : hr >= 17 && hr < 20.5 ? 'evening' : 'night';
      const frac = Math.max(0, Math.min(1, (hr - 7) / 10));
      applyLights(dt, now, frac);
      hood.update(dt, now, cur.nightK);
      updateCamera(dt);
      renderer.render(scene, camera);
      updateOverlay(s, now);
    },
    poke, sold,
    debug: { scene, camera, cam, view },
  };
}
