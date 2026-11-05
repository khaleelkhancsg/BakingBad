// Designing the bakery: floor tiles per square, wallpaper per wall panel, decorations on free squares,
// wall art on panels, and terrace expansions. No DOM here; actions return { ok, msg }.

export const FLOORS = {
  checker:    { name: "Rosa's checker", price: 0,  colors: ['#f2e2c8', '#e2c9a6'] },
  mint:       { name: 'Mint tile',      price: 12, colors: ['#bfe8d6', '#9fd4bd'] },
  rose:       { name: 'Rose tile',      price: 12, colors: ['#f6c6cf', '#e9a9b6'] },
  lemon:      { name: 'Lemon check',    price: 14, colors: ['#fff1a8', '#ffffff'] },
  terracotta: { name: 'Terracotta',     price: 16, colors: ['#d9825b', '#bf6a45'] },
  wood:       { name: 'Oak planks',     price: 18, colors: ['#c28a55', '#a8723f'] },
  navy:       { name: 'Navy mosaic',    price: 22, colors: ['#2f3e66', '#e9e4d8'] },
  herring:    { name: 'Herringbone',    price: 25, colors: ['#b98255', '#93603a'] },
  marble:     { name: 'Marble',         price: 30, colors: ['#f4f1ec', '#c9c1b8'] },
  stone:      { name: 'Patio stone',    price: 10, colors: ['#c9c2b6', '#ada595'] },
};
export const WALLS = {
  plaster: { name: 'Peach plaster', price: 0,  colors: ['#f6d2b0', '#f0c49d'] },
  tiles:   { name: 'White tiles',   price: 20, colors: ['#fbf7f0', '#d9d2c6'] },
  stripes: { name: 'Candy stripes', price: 25, colors: ['#ffd6de', '#ffffff'] },
  mintdot: { name: 'Mint polka',    price: 25, colors: ['#cdeee0', '#ffffff'] },
  lemon:   { name: 'Lemon stripes', price: 25, colors: ['#fff1a8', '#ffe066'] },
  wood:    { name: 'Wood panels',   price: 30, colors: ['#a8703f', '#8a5a32'] },
  brick:   { name: 'Exposed brick', price: 35, colors: ['#b0604c', '#e8d8c8'] },
  sky:     { name: 'Sky & clouds',  price: 35, colors: ['#bfe6ff', '#ffffff'] },
  damask:  { name: 'Plum damask',   price: 40, colors: ['#6b3a5a', '#8e5479'] },
};
// outdoor: terrace only. indoor: inside only. Otherwise either.
export const DECOR = {
  plant:     { name: 'Potted plant',      emoji: '🪴', price: 40,  charm: 1 },
  flowers:   { name: 'Flower stand',      emoji: '💐', price: 60,  charm: 1 },
  rug:       { name: 'Round rug',         emoji: '🟣', price: 70,  charm: 1, indoor: true },
  lamp:      { name: 'Floor lamp',        emoji: '💡', price: 80,  charm: 1 },
  ficus:     { name: 'Tall ficus',        emoji: '🌳', price: 90,  charm: 2 },
  bench:     { name: 'Bench',             emoji: '🪑', price: 120, charm: 2 },
  table:     { name: 'Café table',        emoji: '☕', price: 150, charm: 3 },
  breadrack: { name: 'Bread rack',        emoji: '🥖', price: 160, charm: 2, indoor: true },
  clock:     { name: 'Grandfather clock', emoji: '🕰️', price: 180, charm: 2, indoor: true },
  cake:      { name: 'Cake stand',        emoji: '🎂', price: 200, charm: 3, indoor: true },
  parasol:   { name: 'Parasol table',     emoji: '⛱️', price: 220, charm: 4, outdoor: true },
  cat:       { name: 'Shop cat',          emoji: '🐈', price: 300, charm: 4 },
  fountain:  { name: 'Fountain',          emoji: '⛲', price: 400, charm: 5, outdoor: true },
  sacks:     { name: 'Flour sacks',       emoji: '🌾', price: 20,  charm: 0, indoor: true },
};
export const ART = {
  painting: { name: 'Painting',   emoji: '🖼️', price: 60, charm: 1 },
  clock:    { name: 'Wall clock', emoji: '🕒', price: 50, charm: 1 },
  shelf:    { name: 'Jar shelf',  emoji: '🫙', price: 80, charm: 1 },
  plates:   { name: 'Plate rack', emoji: '🍽️', price: 70, charm: 1 },
};
export const EXPANSIONS = {
  front: { name: 'Front terrace', desc: 'Two rows of pavement in front of the shop become yours, for tiles, tables and plants.', price: 1200, cells: 18 },
  side:  { name: 'Side terrace',  desc: 'The pavement down the side of the shop, for more outdoor seating.', price: 1000, cells: 14 },
};
export const SELL_BACK = 0.5;
export const CHARM_PER_CUSTOMER = 0.01, CHARM_CAP = 0.3;

// ---------- The grid ----------
// Inside: cx 0..8 (x -4.5..4.5), cz 0..8 (z -4.5..4.5).
// Front terrace: cx 0..8, cz 9..10 (z 4.75..6.75). Side terrace: cx 9..10 (x 4.75..6.75), cz 0..6.
export function cellZone(cx, cz) {
  if (cx >= 0 && cx <= 8 && cz >= 0 && cz <= 8) return 'inside';
  if (cx >= 0 && cx <= 8 && (cz === 9 || cz === 10)) return 'front';
  if ((cx === 9 || cx === 10) && cz >= 0 && cz <= 6) return 'side';
  return null;
}
export function cellCenter(cx, cz) {
  return {
    x: cx <= 8 ? -4.5 + cx + 0.5 : 4.75 + (cx - 9) + 0.5,
    z: cz <= 8 ? -4.5 + cz + 0.5 : 4.75 + (cz - 9) + 0.5,
  };
}
export const cellKey = (cx, cz) => cx + ',' + cz;
export function allCells(zone) {
  const out = [];
  for (let cx = 0; cx <= 10; cx++) for (let cz = 0; cz <= 10; cz++) if (cellZone(cx, cz) === zone) out.push([cx, cz]);
  return out;
}
export function cellOwned(s, cx, cz) {
  const z = cellZone(cx, cz);
  return z === 'inside' || (!!z && !!s.design.expansions[z]);
}
// Squares inside kept clear for the kitchen, the baker, the counter, the queue and the doorway.
const KEEP_CLEAR = new Set();
for (let cz = 0; cz <= 8; cz++) for (let cx = 0; cx <= 8; cx++) {
  const kitchen = (cx <= 1 && cz <= 6) || (cz <= 1 && cx <= 5) || (cx <= 5 && cz <= 4);
  const counter = cz === 5 && cx >= 2;
  const queue = cz >= 6 && cx >= 2 && cx <= 7;
  const door = cx === 8 && cz >= 5;
  if (kitchen || counter || queue || door) KEEP_CLEAR.add(cellKey(cx, cz));
}
export const keptClear = (cx, cz) => KEEP_CLEAR.has(cellKey(cx, cz));

// Wall panels: back wall 'b0'..'b8' (along x), left wall 'l0'..'l8' (along z).
export const PANELS = [...Array(9)].map((_, i) => 'b' + i).concat([...Array(9)].map((_, i) => 'l' + i));
// Art can't go over the window, menu board and sign (b6..b8) or over the door (l7, l8).
export const artAllowed = key => !['b6', 'b7', 'b8', 'l7', 'l8'].includes(key);

export function defaultDesign() {
  return {
    floor: {}, wall: {}, art: {},
    decor: [
      { type: 'plant', cx: 8, cz: 0, rot: 0 },
      { type: 'sacks', cx: 6, cz: 0, rot: 0 },
      { type: 'plant', cx: 8, cz: 4, rot: 0 },
    ],
    expansions: { front: false, side: false },
  };
}
// Older saves don't have a design yet.
export function ensureDesign(s) {
  if (!s.design) s.design = defaultDesign();
  s.design.expansions ||= { front: false, side: false };
  s.design.art ||= {};
  return s;
}

export function floorAt(s, cx, cz) {
  return s.design.floor[cellKey(cx, cz)] || (cellZone(cx, cz) === 'inside' ? 'checker' : 'stone');
}
export function wallAt(s, key) {
  if (s.design.wall[key]) return s.design.wall[key];
  const i = Number(key.slice(1));
  return key[0] === 'b' && i >= 1 && i <= 5 ? 'tiles' : 'plaster'; // the splashback behind the ovens
}
export const decorAt = (s, cx, cz, ignore = -1) => s.design.decor.findIndex((d, i) => i !== ignore && d.cx === cx && d.cz === cz);

// Can a decoration of this type go on this square?
export function canPlace(s, type, cx, cz, ignore = -1) {
  const zone = cellZone(cx, cz);
  if (!zone) return 'Not part of the shop.';
  if (!cellOwned(s, cx, cz)) return `Buy the ${EXPANSIONS[zone].name.toLowerCase()} first.`;
  if (zone === 'inside' && keptClear(cx, cz)) return 'That square has to stay clear for the kitchen, counter or customers.';
  if (cx === 8 && cz === 1 && s.upgrades?.catering) return 'The catering boxes are there.';
  if (decorAt(s, cx, cz, ignore) >= 0) return 'Something is already there.';
  const d = DECOR[type];
  if (d?.outdoor && zone === 'inside') return `${d.name} only goes outside, on a terrace.`;
  if (d?.indoor && zone !== 'inside') return `${d.name} only goes inside.`;
  return null;
}

const round2 = v => Math.round(v * 100) / 100;
function pay(s, cost) {
  if (s.clean < cost) return false;
  s.clean = round2(s.clean - cost);
  if (s.today) s.today.upgradesSpent = round2((s.today.upgradesSpent || 0) + cost);
  return true;
}

// ---------- Actions ----------

export function paintFloor(s, cx, cz, style) {
  const zone = cellZone(cx, cz);
  if (!zone || !FLOORS[style]) return { msg: 'Not part of the shop.' };
  if (!cellOwned(s, cx, cz)) return { msg: `Buy the ${EXPANSIONS[zone].name.toLowerCase()} first.` };
  if (floorAt(s, cx, cz) === style) return { ok: false };
  if (!pay(s, FLOORS[style].price)) return { msg: 'Not enough clean cash.' };
  s.design.floor[cellKey(cx, cz)] = style;
  return { ok: true };
}
export function fillFloorCost(s, style) {
  let n = 0;
  for (const zone of ['inside', 'front', 'side']) for (const [cx, cz] of allCells(zone)) if (cellOwned(s, cx, cz) && floorAt(s, cx, cz) !== style) n++;
  return { n, cost: n * FLOORS[style].price };
}
export function fillFloor(s, style) {
  const { n, cost } = fillFloorCost(s, style);
  if (!n) return { msg: 'The whole floor is already that.' };
  if (!pay(s, cost)) return { msg: `Not enough clean cash (£${cost} for ${n} squares).` };
  for (const zone of ['inside', 'front', 'side']) for (const [cx, cz] of allCells(zone)) if (cellOwned(s, cx, cz)) s.design.floor[cellKey(cx, cz)] = style;
  return { ok: true, msg: `Laid ${n} squares.` };
}

export function paintWall(s, key, style) {
  if (!PANELS.includes(key) || !WALLS[style]) return { msg: 'Not a wall panel.' };
  if (wallAt(s, key) === style) return { ok: false };
  if (!pay(s, WALLS[style].price)) return { msg: 'Not enough clean cash.' };
  s.design.wall[key] = style;
  return { ok: true };
}
export function fillWallCost(s, style) {
  const n = PANELS.filter(k => wallAt(s, k) !== style).length;
  return { n, cost: n * WALLS[style].price };
}
export function fillWalls(s, style) {
  const { n, cost } = fillWallCost(s, style);
  if (!n) return { msg: 'Every panel is already that.' };
  if (!pay(s, cost)) return { msg: `Not enough clean cash (£${cost} for ${n} panels).` };
  for (const k of PANELS) s.design.wall[k] = style;
  return { ok: true, msg: `Papered ${n} panels.` };
}

export function placeDecor(s, type, cx, cz) {
  const d = DECOR[type];
  if (!d) return { msg: 'Pick something to place first.' };
  const why = canPlace(s, type, cx, cz);
  if (why) return { msg: why };
  if (!pay(s, d.price)) return { msg: 'Not enough clean cash.' };
  s.design.decor.push({ type, cx, cz, rot: 0 });
  return { ok: true, msg: `Placed: ${d.name}` };
}
export function moveDecor(s, idx, cx, cz) {
  const it = s.design.decor[idx];
  if (!it) return { msg: 'Nothing selected.' };
  const why = canPlace(s, it.type, cx, cz, idx);
  if (why) return { msg: why };
  it.cx = cx; it.cz = cz;
  return { ok: true };
}
export function rotateDecor(s, idx) {
  const it = s.design.decor[idx];
  if (!it) return { msg: 'Nothing selected.' };
  it.rot = ((it.rot || 0) + 1) % 4;
  return { ok: true };
}
export function sellDecor(s, idx) {
  const it = s.design.decor[idx];
  if (!it) return { msg: 'Nothing selected.' };
  const back = Math.round(DECOR[it.type].price * SELL_BACK);
  s.design.decor.splice(idx, 1);
  s.clean = round2(s.clean + back);
  return { ok: true, msg: `Sold for £${back}.` };
}

export function placeArt(s, key, type) {
  if (!PANELS.includes(key)) return { msg: 'Not a wall panel.' };
  if (!artAllowed(key)) return { msg: 'No room on that panel (window, menu board or door).' };
  const a = ART[type];
  if (!a) return { msg: 'Pick a piece of wall art first.' };
  if (s.design.art[key] === type) return { ok: false };
  if (!pay(s, a.price)) return { msg: 'Not enough clean cash.' };
  s.design.art[key] = type;
  return { ok: true, msg: `Hung: ${a.name}` };
}
export function removeArt(s, key) {
  const type = s.design.art[key];
  if (!type) return { msg: 'Nothing hanging there.' };
  delete s.design.art[key];
  const back = Math.round(ART[type].price * SELL_BACK);
  s.clean = round2(s.clean + back);
  return { ok: true, msg: `Took it down and sold it for £${back}.` };
}

export function buyExpansion(s, id) {
  const e = EXPANSIONS[id];
  if (!e || s.design.expansions[id]) return { msg: 'Already yours.' };
  if (!pay(s, e.price)) return { msg: 'Not enough clean cash.' };
  s.design.expansions[id] = true;
  return { ok: true, msg: `The ${e.name.toLowerCase()} is yours.` };
}

// Charm: decorations, wall art and fancier floors and walls make the place nicer. More charm, more customers.
export function charm(s) {
  const d = s.design;
  if (!d) return 0;
  let c = 0;
  for (const it of d.decor) c += DECOR[it.type]?.charm || 0;
  for (const k in d.art) c += ART[d.art[k]]?.charm || 0;
  for (const k in d.floor) if (!['checker', 'stone'].includes(d.floor[k])) c += 0.1;
  for (const k in d.wall) if (d.wall[k] !== 'plaster') c += 0.3;
  return Math.round(c * 10) / 10;
}
export const charmBonus = s => 1 + Math.min(CHARM_CAP, charm(s) * CHARM_PER_CUSTOMER);
