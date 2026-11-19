// Voxels: every model in the scene is turned into little cubes as it appears, so the whole game looks built from blocks.
// Nothing is remodelled by hand: each mesh's surface is sampled on a grid and every cell it passes through becomes a
// cube coloured like the model there (its material colour, vertex colours and texture).
//
// - Meshes that never move (the merged shop fittings, the town, rows of trees) are voxelised on a grid lined up with
//   the world, so neighbouring things share one blocky grid.
// - Everything else (people, machines, doors, cars and their wheels) is voxelised in its own frame, so it still moves,
//   turns and animates as before.
// - The cubes are one instanced mesh per model, a child of the model (whose own material stops drawing), so the game
//   can still move it, hide it and tap it.
// - Parts that glow (lit windows, lamps, screens, brake lights) become a second set of cubes whose glow follows the
//   model's own material every frame, so night still looks like night.
// - If the game repaints a model or swaps its material, its cubes are rebuilt.
// - Left as they are: see-through things (glass, water), unlit things (light beams, neon), and anything marked
//   userData.voxKeep (lettering on signs and boards, the ground, which is drawn as pixel art instead).
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

export const VOX = { size: 0.125, town: 0.35 }; // voxel sizes in metres: in and around the shop, and out in the town
// A cell's key: its three grid coordinates packed into one number (much faster than text keys)
const OFF = 2048, K2 = 4096, K1 = 4096 * 4096;
const keyOf = (x, y, z) => (x + OFF) * K1 + (y + OFF) * K2 + (z + OFF);
const unkey = k => { const z = k % K2, y = Math.floor(k / K2) % K2, x = Math.floor(k / K1); return [x - OFF, y - OFF, z - OFF]; };
const cube = new THREE.BoxGeometry(1, 1, 1);
const voxMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0, vertexColors: true });

// ---------- Reading textures ----------
const pixelCache = new WeakMap();
function pixels(tex) {
  if (!tex?.image) return null;
  const known = pixelCache.get(tex.image);
  if (known !== undefined && (!known || known.version === tex.version)) return known; // (a redrawn canvas, a new floor design, is read again)
  let data = null;
  try {
    const img = tex.image, w = img.width || img.videoWidth, h = img.height || img.videoHeight;
    if (w && h) {
      const W = Math.min(w, 256), H = Math.max(1, Math.round(h * W / w));
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
      data = { w: W, h: H, d: g.getImageData(0, 0, W, H).data, flipY: tex.flipY !== false, version: tex.version };
    }
  } catch { data = null; }
  pixelCache.set(tex.image, data);
  return data;
}
const wrap = v => v - Math.floor(v);
function texel(tex, px, u, v) {
  u = wrap(u * tex.repeat.x + tex.offset.x); v = wrap(v * tex.repeat.y + tex.offset.y);
  const x = Math.min(px.w - 1, Math.floor(u * px.w)), y = Math.min(px.h - 1, Math.floor((px.flipY ? 1 - v : v) * px.h));
  return (y * px.w + x) * 4;
}
const lin = b => (b / 255) ** 2.2; // sRGB byte to linear

// ---------- Which meshes ----------
const glows = m => !!(m && m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.02);
function plain(o) {
  if (!o.isMesh || o.userData.isVoxels) return false;
  for (let p = o; p; p = p.parent) if (p.userData.voxKeep || p.userData.isVoxels) return false;
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  if (!m || m.transparent || m.isMeshBasicMaterial || m.isShaderMaterial || m.isPointsMaterial || m.isLineBasicMaterial) return false;
  return !!o.geometry?.attributes?.position;
}
// The block size for a mesh: set on it or a parent, or else half-size blocks when it is part of a model under about two
// metres across (a person, a machine, a wheel), so faces, hands and knobs still read
const modelBox = new THREE.Box3(), modelDims = new THREE.Vector3();
const across = o => { if (o.userData.voxAcross === undefined) o.userData.voxAcross = modelBox.setFromObject(o).getSize(modelDims).length(); return o.userData.voxAcross; };
function sizeFor(o) {
  for (let p = o; p; p = p.parent) if (p.userData.voxSize) return p.userData.voxSize;
  for (let p = o; p && !p.isScene; p = p.parent) { const a = across(p); if (a > 0 && a < VOX.size * 16) return VOX.size / 2; }
  return VOX.size;
}

// ---------- Sampling a surface into cells ----------
// toGrid takes a point from the mesh's geometry space into grid space (in voxels). Fills cells: Map key ->
// [r, g, b, distance of that sample from the cell's middle, lowest and highest point in the cell (0-1), seen from above,
// glows, plain colour]. Each block takes the colour of the bit of surface nearest its middle, so a window painted on a
// wall comes out as crisp blocks of glass and wall rather than a muddy blend. Returns the first glowing material met.
function sampleSurface(geom, material, toGrid, cells, tint) {
  const pos = geom.attributes.position, uv = geom.attributes.uv, col = geom.attributes.color, idx = geom.index;
  const mats = Array.isArray(material) ? material : [material];
  const groups = geom.groups.length ? geom.groups : [{ start: 0, count: idx ? idx.count : pos.count, materialIndex: 0 }];
  const ga = new THREE.Vector3(), gb = new THREE.Vector3(), gc = new THREE.Vector3(), p = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  let glowMat = null;
  for (const gr of groups) {
    const m = mats[gr.materialIndex] || mats[0];
    if (!m || m.transparent) continue;
    const base = m.color ? m.color.clone() : new THREE.Color(1, 1, 1);
    if (tint) base.multiply(tint);
    const tex = m.map, px = tex && uv ? pixels(tex) : null;
    const eTex = m.emissiveMap, epx = eTex && uv ? pixels(eTex) : null, isGlow = glows(m);
    if (isGlow && !glowMat) glowMat = m;
    const end = Math.min(gr.start + gr.count, idx ? idx.count : pos.count);
    for (let t = gr.start; t + 2 < end; t += 3) {
      const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2;
      toGrid(ga.fromBufferAttribute(pos, i0)); toGrid(gb.fromBufferAttribute(pos, i1)); toGrid(gc.fromBufferAttribute(pos, i2));
      const n = Math.min(400, Math.max(1, Math.ceil(Math.max(ga.distanceTo(gb), gb.distanceTo(gc), gc.distanceTo(ga)) * 2)));
      // does this triangle face up or sideways (or show both sides)? Only those can be seen from the game's camera above
      e1.subVectors(gb, ga); e2.subVectors(gc, ga); e1.cross(e2);
      const seen = m.side === THREE.DoubleSide || e1.y > -0.3 * e1.length() ? 1 : 0;
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
        const u = i / n, v = j / n, w = 1 - u - v;
        p.set(ga.x * w + gb.x * u + gc.x * v, ga.y * w + gb.y * u + gc.y * v, ga.z * w + gb.z * u + gc.z * v);
        const fx = Math.floor(p.x), fyc = Math.floor(p.y), fz = Math.floor(p.z), key = keyOf(fx, fyc, fz);
        const fy = p.y - fyc; // how high up its cell this bit of surface is (0 bottom, 1 top)
        const dx = p.x - fx - 0.5, dy = fy - 0.5, dz = p.z - fz - 0.5, dist = dx * dx + dy * dy + dz * dz;
        let cell = cells.get(key);
        if (!cell) { cell = [0, 0, 0, Infinity, fy, fy, seen, 0, 1]; cells.set(key, cell); }
        else { if (fy < cell[4]) cell[4] = fy; if (fy > cell[5]) cell[5] = fy; cell[6] |= seen; }
        if (dist >= cell[3]) continue; // a sample nearer the middle already gave this block its colour
        let tu = 0, tv = 0;
        if (uv) { tu = uv.getX(i0) * w + uv.getX(i1) * u + uv.getX(i2) * v; tv = uv.getY(i0) * w + uv.getY(i1) * u + uv.getY(i2) * v; }
        // glowing here? (all of a glowing material, or the bright parts of its glow map: lit windows)
        let glow = isGlow;
        if (glow && epx) { const k = texel(eTex, epx, tu, tv); glow = (epx.d[k] + epx.d[k + 1] + epx.d[k + 2]) > 180; }
        let r = base.r, g = base.g, b = base.b;
        if (col) { r *= col.getX(i0) * w + col.getX(i1) * u + col.getX(i2) * v; g *= col.getY(i0) * w + col.getY(i1) * u + col.getY(i2) * v; b *= col.getZ(i0) * w + col.getZ(i1) * u + col.getZ(i2) * v; }
        if (px) { const k = texel(tex, px, tu, tv); r *= lin(px.d[k]); g *= lin(px.d[k + 1]); b *= lin(px.d[k + 2]); }
        cell[0] = r; cell[1] = g; cell[2] = b; cell[3] = dist; cell[7] = glow ? 1 : 0; cell[8] = px ? 0 : 1;
      }
    }
  }
  return glowMat;
}
// A cell's colour, with a little block-to-block variation on plain-coloured things, the way voxel art has (textured
// ones vary already)
function cellColor(cell, key, out, vary = true) {
  let j = 1;
  if (vary && cell[8]) {
    let h = Math.imul((key % 2147483647) | 0, 2654435761) ^ Math.imul(Math.floor(key / 2147483647) | 0, 40503); h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13;
    j = 0.92 + ((h >>> 0) % 1000) / 1000 * 0.16;
  }
  return out.setRGB(Math.min(1, cell[0] * j), Math.min(1, cell[1] * j), Math.min(1, cell[2] * j), THREE.LinearSRGBColorSpace);
}
const FACES = [ // [neighbour offset, the face's four corners (as offsets from the cell's low corner), its normal]
  [[1, 0, 0], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], [1, 0, 0]], [[-1, 0, 0], [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], [-1, 0, 0]],
  [[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], [0, 1, 0]], [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], [0, -1, 0]],
  [[0, 0, 1], [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], [0, 0, 1]], [[0, 0, -1], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], [0, 0, -1]],
];
// How much of its cell each block fills from bottom to top, in quarters. A block with nothing above it stops where the
// surface stops, and one with nothing below starts where it starts, so a kerb, a floor, a shelf or a tabletop is a slab
// of its real thickness rather than a whole cube taller (blocks stacked on blocks stay whole). Blocks made only from
// undersides (the bottom of a floor slab, a ceiling) are left out: the camera never sees them, and as solid blocks
// they'd show their tops, putting a lid over the basement when the shop is cut away.
function spans(cells) {
  const span = new Map();
  for (const [key, cell] of cells) {
    if (!cell[6]) continue;
    const [x, y, z] = unkey(key);
    const above = cells.get(keyOf(x, y + 1, z)), below = cells.get(keyOf(x, y - 1, z));
    const up = !!(above && above[6]), down = !!(below && below[6]);
    let hi = up ? 1 : Math.min(1, Math.ceil(cell[5] * 4 - 1e-6) / 4), lo = down ? 0 : Math.max(0, Math.floor(cell[4] * 4 + 1e-6) / 4);
    if (hi - lo < 0.25) { if (!down) lo = hi - 0.25; else hi = lo + 0.25; }
    span.set(key, [lo, hi]);
  }
  return span;
}
// The blocks for a set of cells, as one mesh with only the faces you can see (a face against another block is left
// out). `all` is every block of the model (lit or not, for hiding faces between them); `draw` the ones this mesh draws.
// fromGrid takes a point in grid space (in voxels) to the space the mesh lives in. Side by side faces of the same colour
// are joined into one long face, so a plain wall costs a few triangles a row rather than two a block.
// vary: a little shade variation block to block (left off for the town's bigger blocks, so long walls join up).
function cubes(all, draw, vary, fromGrid, castShadow, material) {
  const pos = [], nor = [], col = [], idx = [];
  const c = new THREE.Color(), p = new THREE.Vector3(), o = new THREE.Vector3(), n = new THREE.Vector3();
  const g0 = fromGrid(new THREE.Vector3(0, 0, 0)).clone(), gx = fromGrid(new THREE.Vector3(1, 0, 0)).clone().sub(g0), gy = fromGrid(new THREE.Vector3(0, 1, 0)).clone().sub(g0), gz = fromGrid(new THREE.Vector3(0, 0, 1)).clone().sub(g0);
  const span = spans(all);
  // every visible face: [direction, x, y, z, lo, hi, colour (packed)]
  const faces = [[], [], [], [], [], []], cols = new Map();
  for (const [key, cell] of draw) {
    if (!span.has(key)) continue;
    const [x, y, z] = unkey(key);
    const [lo, hi] = span.get(key);
    cellColor(cell, key, c, vary);
    const packed = (Math.round(c.r * 1023) * 1024 + Math.round(c.g * 1023)) * 1024 + Math.round(c.b * 1023);
    cols.set(packed, [c.r, c.g, c.b]);
    for (let f = 0; f < 6; f++) {
      const [dx, dy, dz] = FACES[f][0];
      const nb = span.get(keyOf(x + dx, y + dy, z + dz));
      if (nb && (dy !== 0 || (nb[0] <= lo && nb[1] >= hi))) continue; // hidden behind a neighbour that covers it
      faces[f].push([x, y, z, lo, hi, packed]);
    }
  }
  // Join runs: faces on x sides run along z, the rest along x
  for (let f = 0; f < 6; f++) {
    const [, corners, [nx, ny, nz]] = FACES[f], along = f < 2 ? 2 : 0, other = f < 2 ? 0 : 2; // grid axis index (0 x, 1 y, 2 z)
    const list = faces[f];
    list.sort((a, b) => a[other] - b[other] || a[1] - b[1] || a[along] - b[along]);
    n.copy(gx).multiplyScalar(nx).addScaledVector(gy, ny).addScaledVector(gz, nz).normalize();
    for (let i = 0; i < list.length;) {
      const a = list[i];
      let j = i + 1;
      while (j < list.length) {
        const b = list[j], prev = list[j - 1];
        if (b[other] !== a[other] || b[1] !== a[1] || b[along] !== prev[along] + 1 || b[3] !== a[3] || b[4] !== a[4] || b[5] !== a[5]) break;
        j++;
      }
      const first = a[along], last = list[j - 1][along], [r, g, bl] = cols.get(a[5]), base = pos.length / 3;
      for (const cr of corners) {
        const v = [a[0] + cr[0], 0, a[2] + cr[2]];
        v[along] = cr[along] ? last + 1 : first;
        p.copy(g0).addScaledVector(gx, v[0]).addScaledVector(gy, a[1] + (cr[1] ? a[4] : a[3])).addScaledVector(gz, v[2]);
        pos.push(p.x, p.y, p.z); col.push(r, g, bl);
      }
      for (let k = 0; k < 4; k++) nor.push(n.x, n.y, n.z);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      i = j;
    }
  }
  void o;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geom.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  geom.computeBoundingSphere();
  const vm = new THREE.Mesh(geom, material);
  vm.castShadow = castShadow; vm.receiveShadow = true;
  vm.userData.isVoxels = true; vm.userData.cells = draw.size;
  vm.raycast = () => {}; // taps go to the model underneath, as before
  return vm;
}

// Bigger blocks for something with a lot of surface (the soil round the basement, a long wall), so no one model
// needs more than about CAP of them; small things keep the full detail
const CAP = 12000;
function surfaceArea(o) {
  const g = o.geometry, pos = g.attributes.position, idx = g.index, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const m = o.isInstancedMesh ? o.matrixWorld : o.matrixWorld, cnt = idx ? idx.count : pos.count;
  let area = 0;
  for (let t = 0; t + 2 < cnt; t += 3) {
    a.fromBufferAttribute(pos, idx ? idx.getX(t) : t).applyMatrix4(m); b.fromBufferAttribute(pos, idx ? idx.getX(t + 1) : t + 1).applyMatrix4(m); c.fromBufferAttribute(pos, idx ? idx.getX(t + 2) : t + 2).applyMatrix4(m);
    area += b.sub(a).cross(c.sub(a)).length() / 2;
  }
  return area * (o.isInstancedMesh ? o.count : 1);
}
function capped(o, S) {
  const est = surfaceArea(o) / (S * S);
  return est > CAP ? S * Math.sqrt(est / CAP) : S;
}

// ---------- Keeping up with the game ----------
const tracked = new Set(); // voxelised meshes, watched for repaints and material swaps
const glowPairs = new Set(); // [the model's glowing material, the glow cubes' material]: kept in step every frame
const offMats = new Map(); // a model's material with drawing switched off (its children, the cubes, still draw)
const off = m => { if (!offMats.has(m)) { const h = m.clone(); h.visible = false; h.userData.voxOff = true; offMats.set(m, h); } return offMats.get(m); };
const sig = m => (Array.isArray(m) ? m : [m]).map(x => (x.color ? x.color.getHexString() : '') + (x.map ? x.map.uuid + '@' + x.map.version : '')).join('|'); // a repaint, or a redrawn texture (a redesigned floor)

const free = g => { if (!g.userData.voxShared) g.dispose(); }; // shared blocks (see blockCache) stay
function clear(o) {
  for (const ch of [...o.children]) if (ch.userData.isVoxels) { o.remove(ch); free(ch.geometry); }
  if (o.userData.voxBeside) { o.userData.voxBeside.parent?.remove(o.userData.voxBeside); free(o.userData.voxBeside.geometry); o.userData.voxBeside = null; }
  if (o.userData.voxGlow) { glowPairs.delete(o.userData.voxGlow); o.userData.voxGlow = null; }
}
// Blocks already worked out for a part, reused for every copy of it: customers, crew and cars are built from the same
// shapes in the same colours, so after the first few most of them cost nothing to turn into blocks
const blockCache = new Map(), CACHE_MAX = 600;
// A ready-made set of blocks as a mesh
function voxMesh(geom, castShadow, material, cells) {
  const vm = new THREE.Mesh(geom, material);
  vm.castShadow = castShadow; vm.receiveShadow = true;
  vm.userData.isVoxels = true; vm.userData.cells = cells;
  vm.raycast = () => {};
  return vm;
}
// Voxelise one mesh
export function voxelize(o) {
  if (!plain(o)) { o.userData.voxDone = true; return 0; }
  clear(o);
  o.updateWorldMatrix(true, false);
  const source = o.userData.voxSource || o.material;
  const S = capped(o, sizeFor(o));
  o.userData.voxSource = source;
  const cells = new Map(), glowCells = new Map();
  let made = 0, glowMat = null;
  const vary = S < 0.17;
  const glowCubes = fromGrid => {
    if (!glowCells.size || !glowMat) return null;
    const gm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, vertexColors: true, emissive: glowMat.emissive.clone(), emissiveIntensity: glowMat.emissiveIntensity,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }); // a window's glass lands in the same blocks as its wall: the glass wins
    o.userData.voxGlow = [glowMat, gm]; glowPairs.add(o.userData.voxGlow);
    return cubes(cells, glowCells, vary, fromGrid, false, gm);
  };
  if (o.isInstancedMesh) {
    // every copy, on the world grid, into one set of cubes beside it
    const m = new THREE.Matrix4(), inv = 1 / S, parentInv = new THREE.Matrix4().copy(o.parent.matrixWorld).invert(), world = new THREE.Matrix4(), tint = new THREE.Color();
    for (let k = 0; k < o.count; k++) {
      o.getMatrixAt(k, m); world.multiplyMatrices(o.matrixWorld, m);
      if (o.instanceColor) o.getColorAt(k, tint); else tint.set(1, 1, 1);
      glowMat = sampleSurface(o.geometry, source, v => v.applyMatrix4(world).multiplyScalar(inv), cells, tint) || glowMat;
    }
    const back = v => v.multiplyScalar(S).applyMatrix4(parentInv);
    const vm = cubes(cells, cells, vary, back, o.castShadow, voxMat);
    vm.userData.fixed = !!o.userData.voxMerge;
    o.parent.add(vm); o.userData.voxBeside = vm; o.visible = false;
    made = cells.size;
  } else {
    let back, toGrid;
    const sc = new THREE.Vector3(); o.getWorldScale(sc);
    if (o.userData.voxStatic) {
      // the world's grid: sample in world space, place the cubes back in the mesh's own space
      const inv = 1 / S, toLocal = new THREE.Matrix4().copy(o.matrixWorld).invert();
      toGrid = v => v.applyMatrix4(o.matrixWorld).multiplyScalar(inv);
      back = v => v.multiplyScalar(S).applyMatrix4(toLocal);
    } else {
      // its own frame, the same size in the world whatever its scale
      const sx = S / Math.abs(sc.x || 1), sy = S / Math.abs(sc.y || 1), sz = S / Math.abs(sc.z || 1);
      toGrid = v => v.set(v.x / sx, v.y / sy, v.z / sz);
      back = v => v.set(v.x * sx, v.y * sy, v.z * sz);
      // the same part in the same colours at the same size has been done before: reuse its blocks
      const key = o.geometry.uuid + '|' + sig(source) + '|' + [sx, sy, sz].map(v => v.toFixed(4)).join(',');
      const hit = blockCache.get(key);
      if (hit) {
        if (hit.unlit) o.add(voxMesh(hit.unlit, o.castShadow, voxMat, hit.cells));
        if (hit.glow && hit.glowMat) {
          const gm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, vertexColors: true, emissive: hit.glowMat.emissive.clone(), emissiveIntensity: hit.glowMat.emissiveIntensity,
            polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
          o.userData.voxGlow = [hit.glowMat, gm]; glowPairs.add(o.userData.voxGlow);
          o.add(voxMesh(hit.glow, false, gm, hit.cells));
        }
        o.material = Array.isArray(source) ? source.map(off) : off(source);
        o.userData.voxDone = true; o.userData.voxSig = sig(source); o.userData.voxS = S;
        tracked.add(o);
        return 0;
      }
      glowMat = sampleSurface(o.geometry, source, toGrid, cells);
      const unlit = new Map();
      for (const [k, c] of cells) (c[7] && glowMat ? glowCells : unlit).set(k, c); // lit blocks follow the model's glow
      const um = unlit.size ? cubes(cells, unlit, vary, back, o.castShadow, voxMat) : null;
      if (um) o.add(um);
      const g = glowCubes(back); if (g) o.add(g);
      if (blockCache.size < CACHE_MAX) {
        if (um) um.geometry.userData.voxShared = true;
        if (g) g.geometry.userData.voxShared = true;
        blockCache.set(key, { unlit: um?.geometry, glow: g?.geometry, glowMat, cells: cells.size });
      }
      o.material = Array.isArray(source) ? source.map(off) : off(source);
      made = cells.size;
    }
    if (o.userData.voxStatic) {
      glowMat = sampleSurface(o.geometry, source, toGrid, cells);
      const unlit = new Map();
      for (const [k, c] of cells) (c[7] && glowMat ? glowCells : unlit).set(k, c);
      if (unlit.size) o.add(cubes(cells, unlit, vary, back, o.castShadow, voxMat));
      const g = glowCubes(back); if (g) o.add(g);
      o.material = Array.isArray(source) ? source.map(off) : off(source);
      made = cells.size;
    }
  }
  o.userData.voxDone = true; o.userData.voxSig = sig(source); o.userData.voxS = S;
  tracked.add(o);
  return made;
}
// Voxelise everything new under root, and keep up with what the game changed: a repainted model, a swapped material
// (rebuilt), the glow of lit windows and lamps (copied every frame). Cheap to call often.
let townMerged = false;
export function voxelTick(root, budgetMs = 12) {
  const todo = [], t0 = performance.now();
  root.traverse(o => { if (o.isMesh && !o.userData.voxDone && plain(o)) todo.push(o); });
  let done = 0;
  for (const o of todo) { voxelize(o); done++; if (performance.now() - t0 > budgetMs) break; }
  if (!todo.length && !townMerged) { townMerged = true; mergeFixed(root); }
  for (const o of tracked) {
    if (!inScene(o)) { tracked.delete(o); clear(o); o.material = o.userData.voxSource || o.material; o.userData.voxSource = null; o.userData.voxDone = false; continue; } // gone: free its blocks (rebuilt if it comes back)
    const cur = o.material, shown = Array.isArray(cur) ? cur[0] : cur;
    if (!o.isInstancedMesh && shown && !shown.userData.voxOff) { o.userData.voxSource = cur; voxelize(o); continue; } // the game gave it a new material
    if (sig(o.userData.voxSource) !== o.userData.voxSig) voxelize(o); // repainted
  }
  return todo.length - done; // still to do
}
const inScene = o => { for (let p = o; p; p = p.parent) if (p.isScene) return true; return false; };
// The town never moves: once it's all blocks, its blocks are merged into a few big chunks (about 16 m square), so the
// phone draws a handful of meshes instead of a couple of hundred. Only blocks of things marked voxMerge (the town and its
// trees) that are fixed in place; lit windows, people and cars stay as they are.
function mergeFixed(scene) {
  scene.updateMatrixWorld(true);
  const chunks = new Map(), gone = [];
  scene.traverse(v => {
    if (!v.userData.isVoxels || v.material !== voxMat) return;
    let fixed = v.userData.fixed;
    if (!fixed && v.parent?.userData.voxStatic) for (let p = v.parent; p; p = p.parent) if (p.userData.voxMerge) { fixed = true; break; }
    if (!fixed) return;
    for (let p = v; p; p = p.parent) if (!p.visible && !p.userData.voxDone) return; // (instanced sources are hidden on purpose)
    const g = v.geometry.clone().applyMatrix4(v.matrixWorld);
    g.computeBoundingBox();
    const c = g.boundingBox.getCenter(new THREE.Vector3());
    const key = Math.floor(c.x / 16) + ',' + Math.floor(c.z / 16) + (v.castShadow ? 's' : '');
    if (!chunks.has(key)) chunks.set(key, { geos: [], cast: v.castShadow, cells: 0 });
    const ch = chunks.get(key); ch.geos.push(g); ch.cells += v.userData.cells || 0;
    gone.push(v);
  });
  for (const v of gone) { v.parent.remove(v); free(v.geometry); }
  for (const ch of chunks.values()) {
    const m = voxMesh(mergeGeometries(ch.geos, false), ch.cast, voxMat, ch.cells);
    m.userData.merged = true; m.matrixAutoUpdate = false;
    scene.add(m);
    for (const g of ch.geos) g.dispose();
  }
}
export function voxelGlow() {
  for (const [src, gm] of glowPairs) { gm.emissive.copy(src.emissive); gm.emissiveIntensity = src.emissiveIntensity; }
}
