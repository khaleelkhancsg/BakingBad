import { CAPS, capAt, nextCap, SPOTS, LAB_SPOTS, labSpotAt, MACHINES, LAB_MACHINES } from './data.js';

// Designing the bakery: floor tiles per square, wallpaper per wall panel, decorations on free squares,
// wall art on panels, and terrace expansions. No DOM here; actions return { ok, msg }.

export const FLOORS = {
  checker:    { level: 1, name: "Rosa's checker", price: 0,  colors: ['#f2e2c8', '#e2c9a6'] },
  mint:       { level: 1, name: 'Mint tile',      price: 12, colors: ['#bfe8d6', '#9fd4bd'] },
  rose:       { level: 2, name: 'Rose tile',      price: 12, colors: ['#f6c6cf', '#e9a9b6'] },
  lemon:      { level: 3, name: 'Lemon check',    price: 14, colors: ['#fff1a8', '#ffffff'] },
  terracotta: { level: 4, name: 'Terracotta',     price: 16, colors: ['#d9825b', '#bf6a45'] },
  wood:       { level: 5, name: 'Oak planks',     price: 18, colors: ['#c28a55', '#a8723f'] },
  navy:       { level: 7, name: 'Navy mosaic',    price: 22, colors: ['#2f3e66', '#e9e4d8'] },
  herring:    { level: 9, name: 'Herringbone',    price: 25, colors: ['#b98255', '#93603a'] },
  marble:     { level: 11, name: 'Marble',         price: 30, colors: ['#f4f1ec', '#c9c1b8'] },
  cracked:    { level: 1, name: 'Cracked tiles',  price: 0,  colors: ['#d8ccb8', '#6f6456'], hidden: true },
  stone:      { level: 1, name: 'Patio stone',    price: 10, colors: ['#c9c2b6', '#ada595'] },
  monochrome: { level: 14, name: 'Black & white',  price: 35, colors: ['#f4f1ec', '#2b2d36'], pattern: 'checker' },
  parquet:    { level: 18, name: 'Parquet',        price: 40, colors: ['#a8723f', '#7a5230'], pattern: 'herring' },
  terrazzo:   { level: 25, name: 'Terrazzo',       price: 50, colors: ['#ece6dc', '#b9a99a'], pattern: 'marble' },
  slate:      { level: 31, name: 'Slate',          price: 55, colors: ['#5b6270', '#454b57'] },
  goldmosaic: { level: 44, name: 'Gold mosaic',    price: 70, colors: ['#2b2d36', '#d4af37'], pattern: 'navy' },
  cobalt:     { level: 52, name: 'Cobalt tile',    price: 80, colors: ['#2a4fa0', '#e9e4d8'], pattern: 'lemon' },
  rosegold:   { level: 63, name: 'Rose gold',      price: 95, colors: ['#e8b9a6', '#c98d7a'], pattern: 'marble' },
  blackmarble:{ level: 75, name: 'Black marble',   price: 120, colors: ['#1f2026', '#8a8f9a'], pattern: 'marble' },
  goldtile:   { level: 88, name: 'Gold tile',      price: 160, colors: ['#e6c35c', '#b8902a'] },
};
export const WALLS = {
  plaster: { level: 1, name: 'Peach plaster', price: 0,  colors: ['#f6d2b0', '#f0c49d'] },
  tiles:   { level: 1, name: 'White tiles',   price: 20, colors: ['#fbf7f0', '#d9d2c6'] },
  stripes: { level: 2, name: 'Candy stripes', price: 25, colors: ['#ffd6de', '#ffffff'] },
  mintdot: { level: 3, name: 'Mint polka',    price: 25, colors: ['#cdeee0', '#ffffff'] },
  lemon:   { level: 4, name: 'Lemon stripes', price: 25, colors: ['#fff1a8', '#ffe066'] },
  wood:    { level: 6, name: 'Wood panels',   price: 30, colors: ['#a8703f', '#8a5a32'] },
  brick:   { level: 8, name: 'Exposed brick', price: 35, colors: ['#b0604c', '#e8d8c8'] },
  sky:     { level: 10, name: 'Sky & clouds',  price: 35, colors: ['#bfe6ff', '#ffffff'] },
  torn:    { level: 1, name: 'Torn wallpaper', price: 0,  colors: ['#e9d3bd', '#8d8478'], hidden: true },
  damask:  { level: 12, name: 'Plum damask',   price: 40, colors: ['#6b3a5a', '#8e5479'] },
  gingham: { level: 15, name: 'Red gingham',   price: 45, colors: ['#ffffff', '#e85d75'], pattern: 'lemon' },
  teal:    { level: 19, name: 'Deep teal',     price: 50, colors: ['#1f5f62', '#24706f'], pattern: 'plaster' },
  goldstripe: { level: 27, name: 'Gold stripes', price: 60, colors: ['#2b2d36', '#d4af37'], pattern: 'stripes' },
  marblewall: { level: 33, name: 'Marble wall', price: 70, colors: ['#f4f1ec', '#c9c1b8'], pattern: 'plaster' },
  tropical:{ level: 41, name: 'Tropical leaves', price: 80, colors: ['#2f6f4f', '#7bb661'], pattern: 'mintdot' },
  velvetwall: { level: 49, name: 'Velvet flock', price: 95, colors: ['#4a1f3a', '#6b2f55'], pattern: 'damask' },
  mural:   { level: 56, name: 'Hand-painted mural', price: 110, colors: ['#9fd4ff', '#fff4e0'], pattern: 'sky' },
  artdeco: { level: 69, name: 'Art deco',      price: 130, colors: ['#1c1f2b', '#d4af37'], pattern: 'stripes' },
  silk:    { level: 77, name: 'Silk panels',   price: 150, colors: ['#e9d6ef', '#c8a6d6'], pattern: 'damask' },
  golden:  { level: 91, name: 'Gilded walls',  price: 200, colors: ['#e6c35c', '#fff1b8'], pattern: 'tiles' },
};
// outdoor: terrace only. indoor: inside only. Otherwise either.
export const DECOR = {
  plant:     { level: 1, name: 'Potted plant',      emoji: '🪴', price: 40,  charm: 1 },
  flowers:   { level: 1, name: 'Flower stand',      emoji: '💐', price: 60,  charm: 1 },
  rug:       { level: 2, name: 'Round rug',         emoji: '🟣', price: 70,  charm: 1, indoor: true },
  lamp:      { level: 2, name: 'Floor lamp',        emoji: '💡', price: 80,  charm: 1 },
  ficus:     { level: 4, name: 'Tall ficus',        emoji: '🌳', price: 90,  charm: 2 },
  bench:     { level: 3, name: 'Bench',             emoji: '🪑', price: 120, charm: 2 },
  table:     { level: 3, name: 'Café table',        emoji: '☕', price: 150, charm: 3 },
  breadrack: { level: 5, name: 'Bread rack',        emoji: '🥖', price: 160, charm: 2, indoor: true },
  clock:     { level: 6, name: 'Grandfather clock', emoji: '🕰️', price: 180, charm: 2, indoor: true },
  cake:      { level: 7, name: 'Cake stand',        emoji: '🎂', price: 200, charm: 3, indoor: true },
  parasol:   { level: 8, name: 'Parasol table',     emoji: '⛱️', price: 220, charm: 4, outdoor: true },
  cat:       { level: 10, name: 'Shop cat',          emoji: '🐈', price: 300, charm: 4 },
  fountain:  { level: 12, name: 'Fountain',          emoji: '⛲', price: 400, charm: 5, outdoor: true },
  sacks:     { level: 1, name: 'Flour sacks',       emoji: '🌾', price: 20,  charm: 0, indoor: true },
  piano:     { level: 14, name: 'Old piano',         emoji: '🎹', price: 600,  charm: 5, indoor: true },
  jukebox:   { level: 17, name: 'Jukebox',           emoji: '🎵', price: 800,  charm: 6, indoor: true },
  aquarium:  { level: 22, name: 'Aquarium',          emoji: '🐠', price: 1200, charm: 7, indoor: true },
  bookcase:  { level: 26, name: 'Bookcase',          emoji: '📚', price: 1400, charm: 7, indoor: true },
  arcade:    { level: 31, name: 'Arcade machine',    emoji: '🕹️', price: 2000, charm: 8, indoor: true },
  palm:      { level: 36, name: 'Palm tree',         emoji: '🌴', price: 2400, charm: 9, outdoor: true },
  statue:    { level: 42, name: 'Stone statue',      emoji: '🗿', price: 3200, charm: 10, outdoor: true },
  teddy:     { level: 47, name: 'Giant teddy',       emoji: '🧸', price: 3800, charm: 10 },
  neonheart: { level: 52, name: 'Neon heart',        emoji: '💗', price: 4500, charm: 11, indoor: true },
  koi:       { level: 58, name: 'Koi pond',          emoji: '🐟', price: 6000, charm: 12, outdoor: true },
  carousel:  { level: 66, name: 'Mini carousel',     emoji: '🎠', price: 8000, charm: 14, outdoor: true },
  trophy:    { level: 75, name: 'Golden trophy',     emoji: '🏆', price: 11000, charm: 15, indoor: true },
  photobooth:{ level: 82, name: 'Photo booth',       emoji: '📸', price: 14000, charm: 16, indoor: true },
  gazebo:    { level: 90, name: 'Gazebo',            emoji: '⛩️', price: 20000, charm: 18, outdoor: true },
  rosastatue:{ level: 99, name: 'Statue of Aunt Rosa', emoji: '👵', price: 50000, charm: 25, outdoor: true },
};
export const ART = {
  painting: { level: 2, name: 'Painting',   emoji: '🖼️', price: 60, charm: 1 },
  clock:    { level: 3, name: 'Wall clock', emoji: '🕒', price: 50, charm: 1 },
  shelf:    { level: 5, name: 'Jar shelf',  emoji: '🫙', price: 80, charm: 1 },
  plates:   { level: 6, name: 'Plate rack', emoji: '🍽️', price: 70, charm: 1 },
  neon:     { level: 16, name: 'Neon word', emoji: '🔤', price: 400, charm: 3 },
  mirror:   { level: 24, name: 'Gilt mirror', emoji: '🪞', price: 900, charm: 4 },
  records:  { level: 33, name: 'Gold records', emoji: '💿', price: 1500, charm: 5 },
  tapestry: { level: 45, name: 'Tapestry', emoji: '🧶', price: 2500, charm: 6 },
  portrait: { level: 60, name: 'Portrait of Rosa', emoji: '🖼️', price: 5000, charm: 8 },
  goldframe:{ level: 85, name: 'Golden frame', emoji: '🌟', price: 12000, charm: 12 },
};
export const EXPANSIONS = {
  front:   { level: 5,  name: 'Front terrace', desc: 'Two rows of pavement in front of the shop become yours, for tiles, tables and plants.', price: 1200, cells: 18 },
  side:    { level: 9,  name: 'Side terrace',  desc: 'The pavement down the side of the shop, for more outdoor seating.', price: 1000, cells: 14 },
  refit:   { level: 7,  name: 'Kitchen refit', desc: 'Re-plan the kitchen: room for 4 more machines, wherever you put them.', price: 1500, spots: 4 },
  island:  { level: 12, name: 'Kitchen island', desc: 'Space for an island of machines in the middle of the kitchen: room for 2 more.', price: 3000, spots: 2 },
  carts:   { level: 18, name: 'Food carts',    desc: 'Gas, water and power out to the front terrace: room for 5 more machines (on the terrace or anywhere).', price: 6000, spots: 5, needs: 'front' },
  storeroom: { level: 14, name: 'Clear the coal store', desc: 'Clear the old coal store at the end of the basement\'s back wall: room for 1 more machine, and the basement is ready for benches.', price: 5000, labSpots: 1 },
  bench:   { level: 25, name: 'Back-room benches', desc: 'A row of benches across the basement: room for 2 more machines.', price: 8000, labSpots: 2, needs: 'storeroom' },
  island2: { level: 30, name: 'Bigger island', desc: 'The island grows: room for 2 more machines.', price: 9000, spots: 2, needs: 'island' },
  stalls:  { level: 36, name: 'Side stalls',   desc: 'Gas, water and power down the side terrace: room for 5 more machines (on the terrace or anywhere).', price: 12000, spots: 5, needs: 'side' },
  bench2:  { level: 50, name: 'The cellar',    desc: 'A cold store at the end of the bench row: room for 1 more machine.', price: 25000, labSpots: 1, needs: 'bench' },
  bench3:  { level: 32, name: 'More benches',  desc: 'A second row of benches, back to back with the first: room for 2 more machines.', price: 14000, labSpots: 2, needs: 'bench' },
  backdoor: { level: 25, name: 'Open a back door here', desc: 'A branch only: buyers come to this branch\'s own back door after dark, and what its basement makes goes straight into your bags instead of the vans.', price: 20000, back: true, branch: true },
  digfront: { level: 20, name: 'Dig out under the front terrace', desc: 'Extend the basement 2 m out under the front terrace: room for 3 more machines and more space for decor.', price: 15000, labSpots: 3, needs: 'front' },
  digside:  { level: 30, name: 'Dig out under the side terrace', desc: 'Extend the basement 2 m out under the side terrace: room for 3 more machines and more space for decor.', price: 25000, labSpots: 3, needs: 'side' },
  annex:   { level: 44, name: 'The far wall',     desc: 'Line the basement\'s right-hand wall: room for 4 more machines along it.', price: 40000, labSpots: 4, needs: 'bench3' },
};
export const SELL_BACK = 0.5;

// ---------- The outside of each shop ----------
export const OUT_PAINT = {
  cream:      { level: 1,  name: 'Cream',          price: 0,     color: '#c98f6b', trim: '#fff0dc' },
  sage:       { level: 4,  name: 'Sage green',     price: 400,   color: '#7f9c7a', trim: '#f4f0e8', charm: 1 },
  navy:       { level: 8,  name: 'Navy',           price: 700,   color: '#2f4a6b', trim: '#e9d8b4', charm: 1 },
  blush:      { level: 12, name: 'Blush pink',     price: 1000,  color: '#e3a6a6', trim: '#ffffff', charm: 2 },
  butter:     { level: 18, name: 'Butter yellow',  price: 1600,  color: '#e9c46a', trim: '#5c3520', charm: 2 },
  terracotta: { level: 26, name: 'Terracotta',     price: 2500,  color: '#b5654a', trim: '#f4efe6', charm: 2 },
  charcoal:   { level: 36, name: 'Charcoal',       price: 4000,  color: '#3a3d44', trim: '#d4af37', charm: 3 },
  royal:      { level: 60, name: 'Royal green & gold', price: 12000, color: '#1f4d3a', trim: '#d4af37', charm: 4 },
};
export const OUT_CANOPY = {
  none:    { level: 1,  name: 'No canopy',      price: 0 },
  red:     { level: 3,  name: 'Red stripes',    price: 500,   a: '#e85d75', b: '#ffffff', charm: 2 },
  green:   { level: 7,  name: 'Green stripes',  price: 800,   a: '#4f8f48', b: '#f4f0e8', charm: 2 },
  navy:    { level: 14, name: 'Navy stripes',   price: 1400,  a: '#2f4a6b', b: '#f4f0e8', charm: 3 },
  plum:    { level: 24, name: 'Plum',           price: 2600,  a: '#6b3a5a', b: '#6b3a5a', charm: 3 },
  gold:    { level: 45, name: 'Gold scalloped', price: 8000,  a: '#d4af37', b: '#fff1b8', charm: 5 },
};
export const OUT_SIGN = {
  none:    { level: 1,  name: 'No sign',        price: 0 },
  wood:    { level: 2,  name: 'Wooden board',   price: 300,  bg: '#8a5a36', fg: '#ffe7c2', charm: 1 },
  painted: { level: 10, name: 'Hand-painted',   price: 1200, bg: '#f4f0e8', fg: '#7a3b33', charm: 2 },
  neon:    { level: 20, name: 'Neon',           price: 3000, bg: '#1d1528', fg: '#ff7eb6', glow: true, charm: 3 },
  gold:    { level: 40, name: 'Gold lettering', price: 9000, bg: '#1f2026', fg: '#d4af37', charm: 4 },
};
export const OUT_FINISH = {
  render:   { level: 1,  name: 'Smooth render',  price: 0 },
  brick:    { level: 5,  name: 'Brick',          price: 800,   charm: 1 },
  cladding: { level: 10, name: 'Timber cladding', price: 1500, charm: 2 },
  stone:    { level: 20, name: 'Stone',          price: 3000,  charm: 2 },
  tiles:    { level: 30, name: 'Glazed tiles',   price: 5000,  charm: 3 },
  marble:   { level: 50, name: 'Marble',         price: 15000, charm: 4 },
};
export const OUT_WINDOW = {
  plain:    { level: 1,  name: 'Plain',          price: 0 },
  georgian: { level: 6,  name: 'Georgian panes', price: 900,   charm: 1 },
  arched:   { level: 14, name: 'Arched',         price: 2000,  charm: 2 },
  stained:  { level: 28, name: 'Stained glass',  price: 5000,  charm: 3 },
  neon:     { level: 40, name: 'Neon frames',    price: 9000,  charm: 3 },
  gold:     { level: 70, name: 'Gold frames',    price: 30000, charm: 5 },
};
export const OUT_DOOR = {
  wood:      { level: 1,  name: 'Wooden door',    price: 0,     color: '#7a4a2e' },
  green:     { level: 4,  name: 'Shop green',     price: 400,   color: '#2f6b4f', charm: 1 },
  red:       { level: 8,  name: 'Pillar-box red', price: 600,   color: '#c8323c', charm: 1 },
  glass:     { level: 16, name: 'Glass door',     price: 2000,  color: '#2b2d36', charm: 2 },
  victorian: { level: 26, name: 'Victorian',      price: 4000,  color: '#1f3a5c', charm: 2 },
  revolving: { level: 45, name: 'Revolving door', price: 12000, color: '#c9ccd3', charm: 3 },
  gold:      { level: 80, name: 'Gilded door',    price: 40000, color: '#d4af37', charm: 5 },
};
export const OUT_ROOF = {
  felt:    { level: 1,  name: 'Flat felt',       price: 0,     color: '#5e5864' },
  gravel:  { level: 5,  name: 'Gravel',          price: 500,   color: '#8d8a84' },
  tiles:   { level: 12, name: 'Terracotta tiles', price: 2500, color: '#b5654a', pitched: true, charm: 2 },
  slate:   { level: 20, name: 'Slate',           price: 4000,  color: '#4a5260', pitched: true, charm: 2 },
  green:   { level: 30, name: 'Green roof',      price: 6000,  color: '#5f8f4a', charm: 3 },
  solar:   { level: 40, name: 'Solar panels',    price: 10000, color: '#5e5864', charm: 2 },
  terrace: { level: 55, name: 'Rooftop terrace', price: 20000, color: '#a8703f', charm: 4 },
};
export const OUT_EXTRAS = {
  boxes:    { level: 2,  name: 'Window boxes',    emoji: '🌺', price: 250,   charm: 1 },
  bay:      { level: 5,  name: 'Potted bay trees', emoji: '🌳', price: 600,  charm: 2 },
  bikes:    { level: 8,  name: 'Bike rack',       emoji: '🚲', price: 400,   charm: 1 },
  benchout: { level: 11, name: 'Bench by the door', emoji: '🪑', price: 900, charm: 2 },
  bunting:  { level: 15, name: 'Bunting',         emoji: '🎏', price: 1200,  charm: 2 },
  lanterns: { level: 22, name: 'Door lanterns',   emoji: '🏮', price: 2000,  charm: 2 },
  lights:   { level: 30, name: 'String lights',   emoji: '💡', price: 3500,  charm: 3 },
};
export function outOf(s) {
  s.design.outside ||= { paint: 'cream', canopy: 'none', sign: 'none', extras: {} };
  const o = s.design.outside; o.finish ||= 'render'; o.window ||= 'plain'; o.door ||= 'wood'; o.roof ||= 'felt';
  return s.design.outside;
}
export function setOutside(s, part, id) {
  const T = { paint: OUT_PAINT, canopy: OUT_CANOPY, sign: OUT_SIGN, finish: OUT_FINISH, window: OUT_WINDOW, door: OUT_DOOR, roof: OUT_ROOF }[part], o = outOf(s), f = T?.[id];
  if (!f) return { msg: '' };
  if (!levelOk(s, f)) return lockMsg(f);
  if (o[part] === id) return { msg: 'You already have that.' };
  if (!pay(s, f.price)) return { msg: 'Not enough clean cash.' };
  o[part] = id; return { ok: true, msg: `${f.name}: done.` };
}
export function toggleExtra(s, id) {
  const f = OUT_EXTRAS[id], o = outOf(s);
  if (!f) return { msg: '' };
  if (o.extras[id]) { delete o.extras[id]; refund(s, Math.round(f.price * SELL_BACK)); return { ok: true, msg: `${f.name} taken down (half back).` }; }
  if (!levelOk(s, f)) return lockMsg(f);
  if (!pay(s, f.price)) return { msg: 'Not enough clean cash.' };
  o.extras[id] = true; return { ok: true, msg: `${f.name} put up.` };
}
export function outsideCharm(s) {
  const o = s.design.outside; if (!o) return 0;
  return (OUT_PAINT[o.paint]?.charm || 0) + (OUT_CANOPY[o.canopy]?.charm || 0) + (OUT_SIGN[o.sign]?.charm || 0)
    + (OUT_FINISH[o.finish]?.charm || 0) + (OUT_WINDOW[o.window]?.charm || 0) + (OUT_DOOR[o.door]?.charm || 0) + (OUT_ROOF[o.roof]?.charm || 0)
    + Object.keys(o.extras || {}).reduce((a, k) => a + (OUT_EXTRAS[k]?.charm || 0), 0);
}

// ---------- The back room's own look (paid in dirty cash) ----------
// Whole-room floors and walls, and decorations on a 7 x 9 grid of squares. Decor does something:
// comfort keeps the night crew loyal, cover hides product from raids, security cools the heat.
export const BACK_FLOORS = {
  concrete: { level: 1,  name: 'Bare concrete',   price: 0,     color: '#595b62' },
  rubber:   { level: 6,  name: 'Rubber matting',  price: 600,   color: '#2b2d36' },
  plate:    { level: 12, name: 'Chequer plate',   price: 1500,  color: '#8d939c' },
  tiles:    { level: 18, name: 'White tiles',     price: 2500,  color: '#dfe3ea' },
  epoxy:    { level: 30, name: 'Lab epoxy',       price: 6000,  color: '#c9d6e3' },
  wood:     { level: 40, name: 'Reclaimed boards', price: 9000, color: '#6b4a2e' },
  neon:     { level: 60, name: 'Glow floor',      price: 25000, color: '#3a1d5c' },
};
export const BACK_WALLS = {
  block:    { level: 1,  name: 'Breeze block',    price: 0,     color: '#41464f', lower: '#30343b' },
  brick:    { level: 6,  name: 'Painted brick',   price: 600,   color: '#7a3b33', lower: '#5a2a24' },
  white:    { level: 14, name: 'Clean white',     price: 1800,  color: '#d9dde3', lower: '#aab1bb' },
  black:    { level: 22, name: 'Matte black',     price: 3500,  color: '#1d1f25', lower: '#121318' },
  graffiti: { level: 32, name: 'Graffiti',        price: 7000,  color: '#2e6b5a', lower: '#3a2a55' },
  padded:   { level: 48, name: 'Soundproof foam', price: 15000, color: '#3b3f4a', lower: '#2b2d36' },
  gold:     { level: 75, name: 'Gold leaf',       price: 60000, color: '#b8902a', lower: '#6b5310' },
};
export const BACK_DECOR = {
  crates:    { level: 1,  name: 'Bread crates',     emoji: '📦', price: 150,   cover: 1 },
  poster:    { level: 2,  name: 'Band posters',     emoji: '🎸', price: 200,   comfort: 1 },
  minifridge:{ level: 4,  name: 'Mini fridge',      emoji: '🧊', price: 400,   comfort: 1 },
  dartboard: { level: 6,  name: 'Dartboard',        emoji: '🎯', price: 500,   comfort: 1 },
  sofa:      { level: 8,  name: 'Old sofa',         emoji: '🛋️', price: 900,   comfort: 2 },
  shelving:  { level: 10, name: 'Flour shelving',   emoji: '🗄️', price: 1200,  cover: 2 },
  cctv:      { level: 12, name: 'CCTV monitors',    emoji: '📺', price: 2000,  security: 2 },
  tv:        { level: 15, name: 'Big telly',        emoji: '📺', price: 2500,  comfort: 2 },
  plantb:    { level: 16, name: 'Grow-light plant', emoji: '🪴', price: 1500,  comfort: 1 },
  arcadeb:   { level: 20, name: 'Arcade cabinet',   emoji: '🕹️', price: 4000,  comfort: 3 },
  safe2:     { level: 24, name: 'Wall safe',        emoji: '🔐', price: 5000,  cover: 2, security: 1 },
  pooltable: { level: 28, name: 'Pool table',       emoji: '🎱', price: 8000,  comfort: 4 },
  fakewall:  { level: 34, name: 'False wall',       emoji: '🧱', price: 12000, cover: 4 },
  steeldoor: { level: 40, name: 'Reinforced door',  emoji: '🚪', price: 15000, security: 3 },
  fishtank:  { level: 46, name: 'Fish tank',        emoji: '🐠', price: 18000, comfort: 4 },
  jukeboxb:  { level: 54, name: 'Jukebox',          emoji: '🎵', price: 25000, comfort: 4 },
  panicroom: { level: 64, name: 'Panic room',       emoji: '🛡️', price: 60000, security: 5, cover: 3 },
  goldsofa:  { level: 80, name: 'Gold velvet sofa', emoji: '👑', price: 150000, comfort: 8 },
};
// The basement's design squares (1 m), in its own coordinates; digging out adds two rows at the front and two columns
// at the side
export const BACK_GRID = { cols: 9, rows: 9, x0: -4.1, z0: -4.1, size: 1, dig: 2, extRows: 0 };
export const backExt = s => s.design?.expansions || {};
export const backRowMin = () => 0;
export const backBounds = ex => ({ cols: BACK_GRID.cols + (ex?.digside ? BACK_GRID.dig : 0), rows: BACK_GRID.rows + (ex?.digfront ? BACK_GRID.dig : 0) });
export const backCellCenter = (bx, bz) => ({ x: BACK_GRID.x0 + bx * BACK_GRID.size, z: BACK_GRID.z0 + bz * BACK_GRID.size });
// One flight of stairs runs from the small back room upstairs, under the shop's side wall, and comes into the basement
// through an opening in its left wall; only its last steps are in the basement itself
export const STAIRS = { x0: -4.6, x1: -3.7, z0: 0.55, z1: 1.65, bottom: [-3.1, 1.1] };
// Where buyers stand, and the tables (cash, bags) and kit boxes
export const BUYER_SPOTS_LOCAL = [[-2.1, 2.4], [-1.1, 2.4], [-0.1, 2.4], [-2.1, 3.4], [-1.1, 3.4], [-0.1, 3.4]];
// Tables and kit boxes sit on whole squares: the bag table, the cash table (two squares), the kit boxes
export const BACK_PROPS = { bagTable: [0.9, 3.9], cashTable: [2.4, 3.9], kits: [-3.1, 3.9] };
const BACK_CLUTTER = [[0.9, 3.9], [1.9, 3.9], [2.9, 3.9], [-3.1, 3.9], [-4.1, 0.9]];
// Squares nobody can stand on (the stairs, the tables, the kit boxes) and squares that stay clear to walk on (the
// landing at the foot of the stairs, where buyers stand, the front of the tables)
const nearBack = (bx, bz, pts, r) => { const { x, z } = backCellCenter(bx, bz); return pts.some(([px, pz]) => Math.abs(px - x) < r && Math.abs(pz - z) < r); };
const onStairs = (bx, bz) => { const { x, z } = backCellCenter(bx, bz); return x > STAIRS.x0 - 0.3 && x < STAIRS.x1 + 0.3 && z > STAIRS.z0 - 0.5 && z < STAIRS.z1 + 0.3; };
export const backFixed = (bx, bz) => onStairs(bx, bz) || nearBack(bx, bz, BACK_CLUTTER, 0.5);
export const backReserved = (bx, bz) => nearBack(bx, bz, [[-3.1, 1.1]], 0.7) || nearBack(bx, bz, BUYER_SPOTS_LOCAL, 0.6) || nearBack(bx, bz, [[1.9, 2.9]], 0.5);
export function backCellBlocked(bx, bz, ex = {}) {
  if (typeof ex !== 'object') ex = {};
  const { cols, rows } = backBounds(ex);
  return bx < 0 || bz < 0 || bx >= cols || bz >= rows || backFixed(bx, bz) || backReserved(bx, bz);
}
const BACK_GOALS = [STAIRS.bottom, ...BUYER_SPOTS_LOCAL, [1.9, 2.9]]; // the stairs, buyers, the tables' front
const backCellOfXZ = (x, z) => [Math.round((x - BACK_GRID.x0) / BACK_GRID.size), Math.round((z - BACK_GRID.z0) / BACK_GRID.size)];
// Everything standing on the basement floor (machines and decor), leaving one out if asked
export function backItems(s, ignore = null) {
  const out = [];
  (s.lab || []).forEach((m, i) => { if (!(ignore?.kind === 'machine' && ignore.idx === i)) out.push({ kind: 'machine', idx: i, bx: m.bx, bz: m.bz, rot: m.rot || 0, name: LAB_MACHINES[m.type]?.name || 'machine' }); });
  backOf(s).decor.forEach((d, i) => { if (!(ignore?.kind === 'decor' && ignore.idx === i)) out.push({ kind: 'decor', idx: i, bx: d.bx, bz: d.bz }); });
  return out;
}
// What's wrong with a basement layout: two things on one square, or someone who can't get from the stairs to a machine's
// front, the buyers' spots or the tables. null when it's fine.
export function backLayoutProblem(s, items = backItems(s)) {
  const ex = s.design.expansions || {}, { cols, rows } = backBounds(ex);
  const key = (bx, bz) => bz * cols + bx, taken = new Map();
  for (const it of items) {
    if (it.bx < 0 || it.bz < 0 || it.bx >= cols || it.bz >= rows || backFixed(it.bx, it.bz)) return `${it.name || 'That'} isn't on the floor.`;
    if (taken.has(key(it.bx, it.bz))) return 'Two things on one square.';
    taken.set(key(it.bx, it.bz), it);
  }
  const walk = (bx, bz) => bx >= 0 && bz >= 0 && bx < cols && bz < rows && !backFixed(bx, bz) && !taken.has(key(bx, bz));
  const [sx, sz] = backCellOfXZ(...STAIRS.bottom), seen = new Uint8Array(cols * rows), q = [];
  if (walk(sx, sz)) { seen[key(sx, sz)] = 1; q.push([sx, sz]); }
  while (q.length) {
    const [bx, bz] = q.pop();
    for (const [dx, dz] of DIRS) { const nx = bx + dx, nz = bz + dz; if (walk(nx, nz) && !seen[key(nx, nz)]) { seen[key(nx, nz)] = 1; q.push([nx, nz]); } }
  }
  const reach = (bx, bz) => bx >= 0 && bz >= 0 && bx < cols && bz < rows && !!seen[key(bx, bz)];
  for (const [x, z] of BACK_GOALS) if (!reach(...backCellOfXZ(x, z))) return 'That would block the way to the stairs, the tables or the buyers.';
  for (const it of items) if (it.kind === 'machine') { const [dx, dz] = DIRS[it.rot & 3]; if (!reach(it.bx + dx, it.bz + dz)) return `Nobody could get to the front of the ${it.name.toLowerCase()}.`; }
  return null;
}
export const backPathsOk = (s, decor) => !backLayoutProblem(s, [...backItems(s).filter(it => it.kind !== 'decor'), ...decor.map(d => ({ kind: 'decor', bx: d.bx, bz: d.bz }))]);
// Can this go on that basement square (facing that way)?
export function backPlaceProblem(s, kind, bx, bz, rot = 0, ignore = null, name = '') {
  const ex = backExt(s), { cols, rows } = backBounds(ex);
  if (bx < 0 || bz < 0 || bx >= cols || bz >= rows) return 'Not part of the basement.';
  if (backFixed(bx, bz)) return 'The stairs or the tables are there.';
  if (backReserved(bx, bz)) return 'That square stays clear: the foot of the stairs, the buyers or the tables.';
  const items = backItems(s, ignore);
  if (items.some(it => it.bx === bx && it.bz === bz)) return 'Something is already there.';
  return backLayoutProblem(s, [...items, { kind, bx, bz, rot, name: name || 'machine' }]);
}
export function backOf(s) {
  s.design.back ||= { floor: 'concrete', wall: 'block', decor: [] };
  return s.design.back;
}
export const backDecorAt = (s, bx, bz, ignore = -1) => backOf(s).decor.findIndex((d, i) => i !== ignore && d.bx === bx && d.bz === bz);
export const backDecorCap = s => Math.max(4, Math.floor(decorCap(s) / 2));
function payDirty(s, cost) {
  if (cart) { if (s.dirty - cart.dirty < cost) return false; cart.dirty = round2(cart.dirty + cost); cart.n++; return true; }
  if (s.dirty < cost) return false;
  s.dirty = round2(s.dirty - cost); return true;
}
export function setBackFloor(s, id) {
  const f = BACK_FLOORS[id]; if (!f) return { msg: '' };
  if (!levelOk(s, f)) return lockMsg(f);
  if (backOf(s).floor === id) return { msg: 'Already down.' };
  if (!payDirty(s, f.price)) return { msg: 'Not enough dirty cash.' };
  backOf(s).floor = id; return { ok: true, msg: `${f.name} laid.` };
}
export function setBackWall(s, id) {
  const f = BACK_WALLS[id]; if (!f) return { msg: '' };
  if (!levelOk(s, f)) return lockMsg(f);
  if (backOf(s).wall === id) return { msg: 'Already up.' };
  if (!payDirty(s, f.price)) return { msg: 'Not enough dirty cash.' };
  backOf(s).wall = id; return { ok: true, msg: `${f.name} on the walls.` };
}
export function placeBackDecor(s, type, bx, bz) {
  const d = BACK_DECOR[type]; if (!d) return { msg: 'Pick something to place first.' };
  if (!levelOk(s, d)) return lockMsg(d);
  if (backOf(s).decor.length >= backDecorCap(s)) return { msg: `The back room has room for ${backDecorCap(s)} things at your level.` };
  const why = backPlaceProblem(s, 'decor', bx, bz);
  if (why) return { msg: why };
  if (!payDirty(s, d.price)) return { msg: 'Not enough dirty cash.' };
  backOf(s).decor.push({ type, bx, bz, rot: 0 });
  return { ok: true, msg: `Placed: ${d.name}` };
}
export function moveBackDecor(s, idx, bx, bz) {
  const it = backOf(s).decor[idx]; if (!it) return { msg: '' };
  const why = backPlaceProblem(s, 'decor', bx, bz, 0, { kind: 'decor', idx });
  if (why) return { msg: why };
  it.bx = bx; it.bz = bz; return { ok: true, msg: 'Moved.' };
}
export function rotateBackDecor(s, idx) { const it = backOf(s).decor[idx]; if (it) it.rot = ((it.rot || 0) + 1) % 4; }
export function sellBackDecor(s, idx) {
  const it = backOf(s).decor[idx]; if (!it) return { msg: '' };
  const back = Math.round(BACK_DECOR[it.type].price * SELL_BACK);
  backOf(s).decor.splice(idx, 1);
  if (cart) { cart.dirty = round2(cart.dirty - back); cart.n++; } else s.dirty = round2(s.dirty + back);
  return { ok: true, msg: `Sold for £${back}.` };
}
// What every back room's decor adds up to, across the business
export function backStats(s) {
  const out = { comfort: 0, cover: 0, security: 0 };
  for (const x of s.shops || []) for (const it of x.design?.back?.decor || []) { const d = BACK_DECOR[it.type]; if (!d) continue; out.comfort += d.comfort || 0; out.cover += d.cover || 0; out.security += d.security || 0; }
  return out;
}
export const backHide = s => Math.min(0.4, backStats(s).cover * 0.03);
export const backCool = s => 1 + Math.min(0.5, backStats(s).security * 0.04);
export const backLoyalty = s => Math.min(3, backStats(s).comfort * 0.15);
export const REPAIR_TILE = 8, REPAIR_PANEL = 12; // fixing damage costs at least this, even with a free style
export const decorCap = s => capAt(CAPS.decor, s.level || 1);
export const levelOk = (s, item) => (s.level || 1) >= (item?.level || 1);
const lockMsg = item => ({ msg: `${item.name} unlocks at level ${item.level}.` });
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
// ---------- Layout: machines, counters, the till and decor stand on the floor squares ----------
// Facing: rot 0 faces +z (out from the back wall), 1 faces +x, 2 faces -z, 3 faces -x. A machine is worked from the
// square in front of it; customers stand in front of a counter.
export const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
export const rotY = rot => [0, Math.PI / 2, Math.PI, -Math.PI / 2][rot & 3];
export const TILL_CELL = [7, 5], SHOP_DOOR_CELL = [8, 8], INNER_DOOR_CELL = [0, 7];
const RESERVED = new Set([TILL_CELL, SHOP_DOOR_CELL, INNER_DOOR_CELL].map(c => cellKey(...c)));
export const solidDecor = type => !/rug|mat/.test(type);
// Where the counters stand (one entry per counter you own)
export const DEFAULT_COUNTERS = [[6, 5], [5, 5], [4, 5], [3, 5], [2, 5], [1, 5], [6, 4]];
export const counterCells = s => s.design.counterAt || [];
// Everything standing on the shop floor, leaving one thing out if asked (when it's the one being moved)
export function shopItems(s, ignore = null) {
  const out = [{ kind: 'till', cx: TILL_CELL[0], cz: TILL_CELL[1], rot: 0, name: 'till' }];
  (s.machines || []).forEach((m, i) => { if (!(ignore?.kind === 'machine' && ignore.idx === i)) out.push({ kind: 'machine', idx: i, cx: m.cx, cz: m.cz, rot: m.rot || 0, name: MACHINES[m.type]?.name || 'machine' }); });
  counterCells(s).forEach((c, k) => { if (!(ignore?.kind === 'counter' && ignore.idx === k)) out.push({ kind: 'counter', idx: k, cx: c.cx, cz: c.cz, rot: c.rot || 0, name: 'counter' }); });
  (s.design.decor || []).forEach((d, i) => { if (!(ignore?.kind === 'decor' && ignore.idx === i)) out.push({ kind: 'decor', idx: i, cx: d.cx, cz: d.cz, solid: solidDecor(d.type) }); });
  return out;
}
// Squares on the same side of the shop wall (inside, or out on the terraces) connect; the shop door joins them
const sideOf = (cx, cz) => (cellZone(cx, cz) === 'inside' ? 'in' : 'out');
// What's wrong with a shop layout: two things on one square, the baker unable to reach a machine's front, customers
// unable to reach a counter or the till, or a door blocked. null when it's fine.
export function shopLayoutProblem(s, items = shopItems(s)) {
  const taken = new Map();
  for (const it of items) {
    if (!cellZone(it.cx, it.cz) || !cellOwned(s, it.cx, it.cz)) return `The ${it.name || 'decoration'} isn't on your floor.`;
    if (taken.has(cellKey(it.cx, it.cz))) return 'Two things on one square.';
    taken.set(cellKey(it.cx, it.cz), it);
  }
  const walk = (cx, cz) => { if (!cellZone(cx, cz) || !cellOwned(s, cx, cz)) return false; const o = taken.get(cellKey(cx, cz)); return !o || (o.kind === 'decor' && !o.solid); };
  // Flood in from the shop door, and in from the street along the terraces' outer edges
  const seen = new Set(), q = [];
  const seed = (cx, cz) => { const k = cellKey(cx, cz); if (walk(cx, cz) && !seen.has(k)) { seen.add(k); q.push([cx, cz]); } };
  seed(...SHOP_DOOR_CELL);
  for (const [cx, cz] of [...allCells('front'), ...allCells('side')]) if (cz === 10 || cx === 10) seed(cx, cz);
  while (q.length) { const [cx, cz] = q.pop(); for (const [dx, dz] of DIRS) if (sideOf(cx, cz) === sideOf(cx + dx, cz + dz)) seed(cx + dx, cz + dz); }
  const reach = (cx, cz) => seen.has(cellKey(cx, cz));
  // The square in front of something: inside, it must be an inside square you can reach; out on a terrace it can be the
  // street beyond the terrace
  const frontOk = it => {
    const [dx, dz] = DIRS[it.rot & 3], fx = it.cx + dx, fz = it.cz + dz, z = cellZone(fx, fz);
    if (sideOf(it.cx, it.cz) === 'in') return z === 'inside' && reach(fx, fz);
    if (!z) return true; // facing the street
    return z !== 'inside' && reach(fx, fz);
  };
  if (!reach(...INNER_DOOR_CELL)) return 'That would block the door to the back room.';
  for (const it of items) {
    if (it.kind === 'machine' && !frontOk(it)) return `You couldn't get to the front of the ${it.name.toLowerCase()}.`;
    if (it.kind === 'counter' && !frontOk(it)) return 'Customers couldn\u2019t get to the front of that counter.';
    if (it.kind === 'till' && !frontOk(it)) return 'Customers couldn\u2019t get to the till.';
  }
  return null;
}
// Can this go on that square (facing that way)? ignore: the thing being moved
export function shopPlaceProblem(s, kind, cx, cz, rot = 0, ignore = null, extra = {}) {
  const zone = cellZone(cx, cz);
  if (!zone) return 'Not part of the shop.';
  if (!cellOwned(s, cx, cz)) return `Buy the ${EXPANSIONS[zone].name.toLowerCase()} first.`;
  if (RESERVED.has(cellKey(cx, cz))) return cellKey(cx, cz) === cellKey(...TILL_CELL) ? 'The till is there.' : 'That square is a doorway.';
  const items = shopItems(s, ignore);
  if (items.some(it => it.cx === cx && it.cz === cz)) return 'Something is already there.';
  return shopLayoutProblem(s, [...items, { kind, cx, cz, rot, name: extra.name || kind, solid: extra.solid ?? true }]);
}
// The way something on this square most naturally faces: away from the wall it's against
export function naturalRot(cx, cz) {
  if (cz === 0) return 0; if (cx === 0) return 1; if (cx === 8) return 3; if (cz === 8) return 2;
  if (cz === 9 || cz === 10) return 0; if (cx === 9 || cx === 10) return 1;
  return 0;
}
const NAT_ORDER = rot => [rot, (rot + 1) & 3, (rot + 3) & 3, (rot + 2) & 3];
// A facing that works on this square (the natural one first), or -1
export function bestRot(s, kind, cx, cz, ignore = null, extra = {}) {
  for (const r of NAT_ORDER(kind === 'counter' ? 0 : naturalRot(cx, cz))) if (!shopPlaceProblem(s, kind, cx, cz, r, ignore, extra)) return r;
  return -1;
}
export function backBestRot(s, bx, bz, ignore = null, name = '') {
  const { cols, rows } = backBounds(backExt(s));
  const nat = bz === 0 ? 0 : bx === 0 ? 1 : bx === cols - 1 ? 3 : bz === rows - 1 ? 2 : 0;
  for (const r of NAT_ORDER(nat)) if (!backPlaceProblem(s, 'machine', bx, bz, r, ignore, name)) return r;
  return -1;
}
// Somewhere free for a new machine or counter: along the walls first (machines) or by the till (counters)
export function autoSpot(s, kind, extra = {}) {
  let cells;
  if (kind === 'counter') cells = [...DEFAULT_COUNTERS, ...allCells('inside')];
  else {
    const edge = ([cx, cz]) => Math.min(cx, cz, 8 - cx, 8 - cz);
    cells = allCells('inside').sort((a, b) => edge(a) - edge(b) || a[1] - b[1] || a[0] - b[0]);
    cells.push(...allCells('front'), ...allCells('side'));
  }
  for (const [cx, cz] of cells) { const rot = bestRot(s, kind, cx, cz, null, extra); if (rot >= 0) return { cx, cz, rot }; }
  return null;
}
export function backAutoSpot(s, name = '') {
  const { cols, rows } = backBounds(backExt(s)), cells = [];
  for (let bz = 0; bz < rows; bz++) for (let bx = 0; bx < cols; bx++) cells.push([bx, bz]);
  const edge = ([bx, bz]) => Math.min(bz, bx, cols - 1 - bx, rows - 1 - bz);
  cells.sort((a, b) => edge(a) - edge(b) || a[1] - b[1] || a[0] - b[0]);
  for (const [bx, bz] of cells) { const rot = backBestRot(s, bx, bz, null, name); if (rot >= 0) return { bx, bz, rot }; }
  return null;
}
// Where an old fixed spot was, as a square and a facing (older saves, and the machines a new game starts with)
const ryRot = ry => ((Math.round(ry / (Math.PI / 2)) % 4) + 4) % 4;
export function cellFromSpot(i) {
  const p = SPOTS[i]; if (!p) return null;
  const cx = p.x <= 4.5 ? Math.floor(p.x + 4.5) : 9 + Math.min(1, Math.floor(p.x - 4.75));
  const cz = p.z <= 4.5 ? Math.floor(p.z + 4.5) : 9 + Math.min(1, Math.floor(p.z - 4.75));
  return { cx: Math.max(0, Math.min(10, cx)), cz: Math.max(0, Math.min(10, cz)), rot: ryRot(p.ry) };
}
export function backCellFromSpot(i) {
  const p = LAB_SPOTS[i]; if (!p) return null;
  const [bx, bz] = backCellOfXZ(p.x, p.z);
  return { bx, bz, rot: ryRot(p.ry) };
}
// How many machines a room has space for: the fixed spots its expansions used to open
export const kitchenRoom = s => SPOTS.filter(p => !p.need || s.design.expansions[p.need]).length;
export const labRoom = s => LAB_SPOTS.filter(p => !p.need || s.design.expansions[p.need]).length;
// Make a shop's layout sound: give everything a square, and settle things one at a time (the till, then machines,
// counters and decor in order): each keeps its square if it fits with what's already settled, otherwise it moves to the
// first square that does. Decor that fits nowhere comes down with a refund. Used on load, after cancelling design
// changes, and on older saves (whose machines stood on fixed spots).
export function fixLayout(s) {
  const d = s.design;
  d.counterAt ||= [];
  const n = d.counters ?? 2;
  d.counterAt = d.counterAt.slice(0, n);
  for (const m of s.machines || []) if (m.cx == null) Object.assign(m, cellFromSpot(m.spot) || { cx: -1, cz: -1, rot: 0 });
  for (const m of s.lab || []) if (m.bx == null) Object.assign(m, backCellFromSpot(m.spot) || { bx: -1, bz: -1, rot: 0 });
  for (let k = d.counterAt.length; k < n; k++) { const [cx, cz] = DEFAULT_COUNTERS[k] || [-1, -1]; d.counterAt.push({ cx, cz, rot: 0 }); }
  // The shop
  const settled = [{ kind: 'till', cx: TILL_CELL[0], cz: TILL_CELL[1], rot: 0, name: 'till' }];
  const free = (cx, cz) => cellZone(cx, cz) && cellOwned(s, cx, cz) && !RESERVED.has(cellKey(cx, cz)) && !settled.some(it => it.cx === cx && it.cz === cz);
  const fits = it => free(it.cx, it.cz) && !shopLayoutProblem(s, [...settled, it]);
  const cellsFor = kind => kind === 'counter' ? [...DEFAULT_COUNTERS, ...allCells('inside'), ...allCells('front'), ...allCells('side')]
    : [...allCells('inside').sort((a, b) => Math.min(a[0], a[1], 8 - a[0], 8 - a[1]) - Math.min(b[0], b[1], 8 - b[0], 8 - b[1]) || a[1] - b[1] || a[0] - b[0]), ...allCells('front'), ...allCells('side')];
  const settle = (obj, kind, extra) => {
    const it = { kind, cx: obj.cx, cz: obj.cz, rot: obj.rot || 0, ...extra };
    if (!fits(it)) {
      let found = null;
      for (const [cx, cz] of cellsFor(kind)) {
        if (!free(cx, cz)) continue;
        for (const r of NAT_ORDER(kind === 'counter' ? 0 : naturalRot(cx, cz))) { const c = { ...it, cx, cz, rot: r }; if (!shopLayoutProblem(s, [...settled, c])) { found = c; break; } }
        if (found) break;
      }
      if (!found) return false;
      Object.assign(it, found);
      if (kind !== 'decor') obj.rot = it.rot;
      obj.cx = it.cx; obj.cz = it.cz;
    }
    settled.push(it);
    return true;
  };
  (s.machines || []).forEach(m => { if (!settle(m, 'machine', { name: MACHINES[m.type]?.name || 'machine' })) { m.cx = -1; m.cz = -1; } });
  d.counterAt.forEach(c => { if (!settle(c, 'counter', { name: 'counter' })) { c.cx = -1; c.cz = -1; } });
  d.decor = (d.decor || []).filter(it => {
    if (it.cx === 8 && it.cz === 1 && s.upgrades?.catering) it.cx = -1;
    if (settle(it, 'decor', { solid: solidDecor(it.type) })) return true;
    if (DECOR[it.type] && typeof s.clean === 'number') s.clean += DECOR[it.type].price;
    return false;
  });
  // The basement, the same way, from the foot of the stairs
  if (s.lab?.length) {
    const done = [];
    const ex = backExt(s), { cols, rows } = backBounds(ex);
    const bfree = (bx, bz) => bx >= 0 && bz >= 0 && bx < cols && bz < rows && !backFixed(bx, bz) && !backReserved(bx, bz) && !done.some(it => it.bx === bx && it.bz === bz);
    const cells = []; for (let bz = 0; bz < rows; bz++) for (let bx = 0; bx < cols; bx++) cells.push([bx, bz]);
    const edge = ([bx, bz]) => Math.min(bz, bx, cols - 1 - bx, rows - 1 - bz);
    cells.sort((a, b) => edge(a) - edge(b) || a[1] - b[1] || a[0] - b[0]);
    for (const m of s.lab) {
      const it = { kind: 'machine', bx: m.bx, bz: m.bz, rot: m.rot || 0, name: LAB_MACHINES[m.type]?.name || 'machine' };
      let ok = bfree(it.bx, it.bz) && !backLayoutProblem(s, [...done, it]);
      if (!ok) for (const [bx, bz] of cells) {
        if (!bfree(bx, bz)) continue;
        for (const r of [0, 1, 3, 2]) { const c = { ...it, bx, bz, rot: r }; if (!backLayoutProblem(s, [...done, c])) { Object.assign(it, c); ok = true; break; } }
        if (ok) break;
      }
      if (ok) { done.push(it); m.bx = it.bx; m.bz = it.bz; m.rot = it.rot; } else { m.bx = -1; m.bz = -1; }
    }
  }
  tidyBack(s);
  return s;
}

// Wall panels: back wall 'b0'..'b8' (along x), left wall 'l0'..'l8' (along z).
export const PANELS = [...Array(9)].map((_, i) => 'b' + i).concat([...Array(9)].map((_, i) => 'l' + i));
// Art can't go over the window, menu board and sign (b6..b8) or over the door (l7, l8).
export const artAllowed = key => !['b6', 'b7', 'b8', 'l7', 'l8'].includes(key);

export function defaultDesign(base = {}) {
  return {
    floor: {}, wall: {}, art: {}, base, counters: 2, counterAt: [{ cx: 6, cz: 5, rot: 0 }, { cx: 5, cz: 5, rot: 0 }],
    decor: [
      { type: 'plant', cx: 8, cz: 0, rot: 0 },
      { type: 'sacks', cx: 7, cz: 0, rot: 0 },
      { type: 'plant', cx: 8, cz: 4, rot: 0 },
    ],
    expansions: {},
  };
}
// Older saves don't have a design yet.
export function ensureDesign(s) {
  // Every shop has its own design
  if (s.shops) { const keep = s.cur; s.shops.forEach((_, i) => { s.cur = i; ensureOne(s); }); s.cur = keep; return s; }
  return ensureOne(s);
}
function ensureOne(s) {
  if (!s.design) s.design = defaultDesign();
  s.design.expansions ||= {};
  s.design.art ||= {};
  // Older saves: as many counters as the old level-based menu allowed, so nothing comes off sale
  if (s.design.counters == null) s.design.counters = Math.min(7, Math.max(2, capAt(CAPS.menu, s.level || 1)));
  const ex = s.design.expansions;
  if (['bench', 'bench2', 'bench3', 'annex'].some(k => ex[k])) ex.storeroom = true;
  if ((s.machines || []).some(m => m.cx == null && SPOTS[m.spot]?.need === 'refit')) ex.refit = true;
  fixLayout(s);
  return s;
}
// Back-room decor that stands where a machine now goes, or cuts someone off from a machine or a door, is taken
// down with a full refund (it was placed before the room changed around it). Returns how many pieces came down.
export function tidyBack(s) {
  const b = s.design?.back;
  if (!b?.decor?.length) return 0;
  const ext = backExt(s), before = b.decor.length;
  const refund = it => { if (BACK_DECOR[it.type] && typeof s.dirty === 'number') s.dirty += BACK_DECOR[it.type].price; };
  b.decor = b.decor.filter(it => { if (!backCellBlocked(it.bx, it.bz, ext)) return true; refund(it); return false; });
  // Then take pieces down, newest first, until everyone can get everywhere
  while (b.decor.length && backLayoutProblem(s)) { refund(b.decor.at(-1)); b.decor.pop(); }
  return before - b.decor.length;
}

export function floorAt(s, cx, cz) {
  return s.design.floor[cellKey(cx, cz)] || (cellZone(cx, cz) === 'inside' ? (s.design.base?.floor || 'checker') : 'stone');
}
export function wallAt(s, key) {
  if (s.design.wall[key]) return s.design.wall[key];
  if (s.design.base?.wall) return s.design.base.wall;
  const i = Number(key.slice(1));
  return key[0] === 'b' && i >= 1 && i <= 5 ? 'tiles' : 'plaster'; // the splashback behind the ovens
}
export const decorAt = (s, cx, cz, ignore = -1) => s.design.decor.findIndex((d, i) => i !== ignore && d.cx === cx && d.cz === cz);

// Can a decoration of this type go on this square?
export function canPlace(s, type, cx, cz, ignore = -1) {
  const zone = cellZone(cx, cz);
  if (!zone) return 'Not part of the shop.';
  if (cx === 8 && cz === 1 && s.upgrades?.catering) return 'The catering boxes are there.';
  const d = DECOR[type];
  if (d?.outdoor && zone === 'inside') return `${d.name} only goes outside, on a terrace.`;
  if (d?.indoor && zone !== 'inside') return `${d.name} only goes inside.`;
  return shopPlaceProblem(s, 'decor', cx, cz, 0, ignore >= 0 ? { kind: 'decor', idx: ignore } : null, { solid: solidDecor(type) });
}

const round2 = v => Math.round(v * 100) / 100;
// The design basket: changes show in the shop straight away but are only paid for at checkout (or undone)
let cart = null;
export const cartInfo = () => cart && { cost: cart.cost, dirty: cart.dirty, n: cart.n };
export function startCart(s) { if (!cart) cart = { cost: 0, dirty: 0, n: 0, snap: JSON.stringify(s.design), shop: s.cur || 0 }; }
export const cartSnapshot = () => cart && { shop: cart.shop, design: JSON.parse(cart.snap) };
export function checkoutCart(s) {
  if (!cart) return { msg: '' };
  const c = cart; cart = null;
  s.clean = round2(s.clean - c.cost); s.dirty = round2(s.dirty - (c.dirty || 0));
  if (s.today && c.cost > 0) s.today.upgradesSpent = round2((s.today.upgradesSpent || 0) + c.cost);
  const parts = [];
  if (c.cost) parts.push(c.cost > 0 ? `£${Math.round(c.cost).toLocaleString('en-GB')}` : `got £${Math.round(-c.cost).toLocaleString('en-GB')} back`);
  if (c.dirty) parts.push(c.dirty > 0 ? `💜 £${Math.round(c.dirty).toLocaleString('en-GB')}` : `got 💜 £${Math.round(-c.dirty).toLocaleString('en-GB')} back`);
  return { ok: true, msg: `${c.n} change${c.n === 1 ? '' : 's'}: ${parts.join(', ') || 'free'}.` };
}
export function cancelCart(s) {
  if (!cart) return;
  const keep = { counters: s.design.counters, counterAt: s.design.counterAt, cabinets: s.design.cabinets };
  s.design = { ...JSON.parse(cart.snap), ...keep }; cart = null;
  fixLayout(s);
}
function pay(s, cost) {
  if (cart) {
    if (s.clean - cart.cost < cost) return false;
    cart.cost = round2(cart.cost + cost); cart.n++;
    return true;
  }
  if (s.clean < cost) return false;
  s.clean = round2(s.clean - cost);
  if (s.today) s.today.upgradesSpent = round2((s.today.upgradesSpent || 0) + cost);
  return true;
}
function refund(s, back) {
  if (cart) { cart.cost = round2(cart.cost - back); cart.n++; } else s.clean = round2(s.clean + back);
}

// ---------- Actions ----------

export function paintFloor(s, cx, cz, style) {
  const zone = cellZone(cx, cz);
  if (!zone || !FLOORS[style]) return { msg: 'Not part of the shop.' };
  if (!levelOk(s, FLOORS[style])) return lockMsg(FLOORS[style]);
  if (!cellOwned(s, cx, cz)) return { msg: `Buy the ${EXPANSIONS[zone].name.toLowerCase()} first.` };
  if (floorAt(s, cx, cz) === style) return { ok: false };
  if (!pay(s, tileCost(s, cx, cz, style))) return { msg: 'Not enough clean cash.' };
  s.design.floor[cellKey(cx, cz)] = style;
  return { ok: true };
}
export const tileCost = (s, cx, cz, style) => Math.max(FLOORS[style].price, floorAt(s, cx, cz) === 'cracked' ? REPAIR_TILE : 0);
export const panelCost = (s, key, style) => Math.max(WALLS[style].price, wallAt(s, key) === 'torn' ? REPAIR_PANEL : 0);
export function fillFloorCost(s, style) {
  let n = 0, cost = 0;
  for (const zone of ['inside', 'front', 'side']) for (const [cx, cz] of allCells(zone)) if (cellOwned(s, cx, cz) && floorAt(s, cx, cz) !== style) { n++; cost += tileCost(s, cx, cz, style); }
  return { n, cost };
}
export function fillFloor(s, style) {
  if (!levelOk(s, FLOORS[style])) return lockMsg(FLOORS[style]);
  const { n, cost } = fillFloorCost(s, style);
  if (!n) return { msg: 'The whole floor is already that.' };
  if (!pay(s, cost)) return { msg: `Not enough clean cash (£${cost} for ${n} squares).` };
  for (const zone of ['inside', 'front', 'side']) for (const [cx, cz] of allCells(zone)) if (cellOwned(s, cx, cz)) s.design.floor[cellKey(cx, cz)] = style;
  return { ok: true, msg: `Laid ${n} squares.` };
}

export function paintWall(s, key, style) {
  if (!PANELS.includes(key) || !WALLS[style]) return { msg: 'Not a wall panel.' };
  if (!levelOk(s, WALLS[style])) return lockMsg(WALLS[style]);
  if (wallAt(s, key) === style) return { ok: false };
  if (!pay(s, panelCost(s, key, style))) return { msg: 'Not enough clean cash.' };
  s.design.wall[key] = style;
  return { ok: true };
}
export function fillWallCost(s, style) {
  const keys = PANELS.filter(k => wallAt(s, k) !== style);
  return { n: keys.length, cost: keys.reduce((a, k) => a + panelCost(s, k, style), 0) };
}
export function fillWalls(s, style) {
  if (!levelOk(s, WALLS[style])) return lockMsg(WALLS[style]);
  const { n, cost } = fillWallCost(s, style);
  if (!n) return { msg: 'Every panel is already that.' };
  if (!pay(s, cost)) return { msg: `Not enough clean cash (£${cost} for ${n} panels).` };
  for (const k of PANELS) s.design.wall[k] = style;
  return { ok: true, msg: `Papered ${n} panels.` };
}

export function placeDecor(s, type, cx, cz) {
  const d = DECOR[type];
  if (!d) return { msg: 'Pick something to place first.' };
  if (!levelOk(s, d)) return lockMsg(d);
  if (s.design.decor.length >= decorCap(s)) {
    const nx = nextCap(CAPS.decor, s.level || 1);
    return { msg: nx ? `Reach level ${nx.level} to place more decorations (${nx.amount}).` : 'The shop has no room for more decorations.' };
  }
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
  refund(s, back);
  return { ok: true, msg: `Sold for £${back}.` };
}

export function placeArt(s, key, type) {
  if (!PANELS.includes(key)) return { msg: 'Not a wall panel.' };
  if (!artAllowed(key)) return { msg: 'No room on that panel (window, menu board or door).' };
  const a = ART[type];
  if (!a) return { msg: 'Pick a piece of wall art first.' };
  if (!levelOk(s, a)) return lockMsg(a);
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
  refund(s, back);
  return { ok: true, msg: `Took it down and sold it for £${back}.` };
}

export function buyExpansionNow(s, id) {
  const keep = cart; cart = null;
  const r = buyExpansion(s, id);
  cart = keep;
  if (cart && r.ok) { const snap = JSON.parse(cart.snap); snap.expansions = { ...s.design.expansions }; cart.snap = JSON.stringify(snap); }
  return r;
}
export function buyExpansion(s, id) {
  const e = EXPANSIONS[id];
  if (!e || s.design.expansions[id]) return { msg: 'Already yours.' };
  if (!levelOk(s, e)) return lockMsg(e);
  if (e.needs && !s.design.expansions[e.needs]) return { msg: `Buy the ${EXPANSIONS[e.needs].name.toLowerCase()} first.` };
  if (!pay(s, e.price)) return { msg: 'Not enough clean cash.' };
  s.design.expansions[id] = true;
  const moved = e.labSpots ? tidyBack(s) : 0;
  return { ok: true, msg: `The ${e.name.toLowerCase()} is yours.${moved ? ` ${moved} piece${moved === 1 ? '' : 's'} of back-room decor in the way came down (full refund).` : ''}` };
}

// Charm: decorations, wall art and fancier floors and walls make the place nicer. More charm, more customers.
export function charm(s) {
  const d = s.design;
  if (!d) return 0;
  let c = 0;
  for (const it of d.decor) c += DECOR[it.type]?.charm || 0;
  for (const k in d.art) c += ART[d.art[k]]?.charm || 0;
  for (const k in d.floor) c += d.floor[k] === 'cracked' ? -0.2 : ['checker', 'stone'].includes(d.floor[k]) ? 0 : 0.1;
  for (const k in d.wall) c += d.wall[k] === 'torn' ? -0.5 : d.wall[k] === 'plaster' ? 0 : 0.3;
  c += outsideCharm(s);
  c = Math.max(0, c);
  return Math.round(c * 10) / 10;
}
export const charmBonus = s => 1 + Math.min(CHARM_CAP, charm(s) * CHARM_PER_CUSTOMER);

// Damage left by the debt collectors, for the design screen and reports.
export const damage = s => ({
  tiles: Object.values(s.design.floor).filter(v => v === 'cracked').length,
  panels: Object.values(s.design.wall).filter(v => v === 'torn').length,
});
