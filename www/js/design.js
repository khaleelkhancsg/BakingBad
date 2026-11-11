import { CAPS, capAt, nextCap, SPOTS, LAB_SPOTS, labSpotAt } from './data.js';

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
  refit:   { level: 7,  name: 'Kitchen refit', desc: 'Re-plan the kitchen walls: room for 4 more machines between the ones you have.', price: 1500, spots: 4 },
  island:  { level: 12, name: 'Kitchen island', desc: 'An island in the middle of the kitchen: room for 2 more machines.', price: 3000, spots: 2 },
  carts:   { level: 18, name: 'Food carts',    desc: 'Room for 5 machines on carts along the front terrace.', price: 6000, spots: 5, needs: 'front' },
  storeroom: { level: 14, name: 'Clear the coal store', desc: 'Clear the old coal store at the end of the basement\'s back wall: room for 1 more machine, and the basement is ready for benches.', price: 5000, labSpots: 1 },
  bench:   { level: 25, name: 'Back-room benches', desc: 'A row of benches across the basement: room for 2 more machines.', price: 8000, labSpots: 2, needs: 'storeroom' },
  island2: { level: 30, name: 'Bigger island', desc: 'The island grows: room for 2 more machines.', price: 9000, spots: 2, needs: 'island' },
  stalls:  { level: 36, name: 'Side stalls',   desc: 'Room for 5 machines on stalls down the side terrace.', price: 12000, spots: 5, needs: 'side' },
  bench2:  { level: 50, name: 'The cellar',    desc: 'A cold store at the end of the bench row: room for 1 more machine.', price: 25000, labSpots: 1, needs: 'bench' },
  bench3:  { level: 32, name: 'More benches',  desc: 'A second row of benches, back to back with the first: room for 2 more machines.', price: 14000, labSpots: 2, needs: 'bench' },
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
// The stairs come down along the left wall; the bottom step is at the front of the stairs
export const STAIRS = { x0: -4.45, x1: -3.35, z0: 1.4, z1: 4.4, bottom: [-3.9, 0.9] };
// Where buyers stand, and the tables (cash, bags) and kit boxes
export const BUYER_SPOTS_LOCAL = [[-2.1, 2.4], [-1.1, 2.4], [-0.1, 2.4], [-2.1, 3.4], [-1.1, 3.4], [-0.1, 3.4]];
// Tables and kit boxes sit on whole squares: the bag table, the cash table (two squares), the kit boxes
export const BACK_PROPS = { bagTable: [0.9, 3.9], cashTable: [2.4, 3.9], kits: [-3.1, 3.9] };
const BACK_CLUTTER = [[0.9, 3.9], [1.9, 3.9], [2.9, 3.9], [-3.1, 3.9], [-4.1, 1.9], [-4.1, 2.9], [-4.1, 3.9]];
// Squares that stay clear: machine spots, the stairs and the landing at their foot, where buyers stand, the tables
const BACK_BLOCKS = [[-3.9, 0.9, 0.7], ...BUYER_SPOTS_LOCAL.map(([x, z]) => [x, z, 0.6]), ...BACK_CLUTTER.map(([x, z]) => [x, z, 0.6])];
export function backCellBlocked(bx, bz, ex = {}) {
  if (typeof ex !== 'object') ex = {};
  const { cols, rows } = backBounds(ex);
  if (bx < 0 || bz < 0 || bx >= cols || bz >= rows) return true;
  const { x, z } = backCellCenter(bx, bz);
  if (LAB_SPOTS.some(p => Math.abs(p.x - x) < 0.85 && Math.abs(p.z - z) < 0.85)) return true;
  if (x > STAIRS.x0 - 0.3 && x < STAIRS.x1 + 0.3 && z > STAIRS.z0 - 0.5 && z < STAIRS.z1 + 0.3) return true;
  return BACK_BLOCKS.some(([bxp, bzp, r]) => Math.abs(bxp - x) < r && Math.abs(bzp - z) < r);
}
// Walking room in the basement, on its design squares: decor may not cut anyone off from a machine, the stairs, the
// tables or the buyers' spots. A square is walkable unless a machine, a table or a piece of decor stands on it.
const BACK_GOALS = [STAIRS.bottom, ...BUYER_SPOTS_LOCAL, [1.9, 2.9]]; // the stairs, buyers, the tables' front
export const backPathsOk = (s, decor) => backCutOff(s, decor) === 0;
// How many machines, buyer spots and the stairs can't be reached with this decor in place
export function backCutOff(s, decor) {
  const ex = s.design.expansions || {}, { cols, rows } = backBounds(ex);
  const key = (bx, bz) => bz * cols + bx;
  const free = new Uint8Array(cols * rows).fill(1);
  const open = LAB_SPOTS.filter(sp => !sp.need || ex[sp.need]);
  const cellOfXZ = (x, z) => [Math.round((x - BACK_GRID.x0) / BACK_GRID.size), Math.round((z - BACK_GRID.z0) / BACK_GRID.size)];
  for (let bz = 0; bz < rows; bz++) for (let bx = 0; bx < cols; bx++) {
    const { x, z } = backCellCenter(bx, bz);
    const onMachine = open.some(p => { const side = Math.abs(Math.sin(p.ry)) > 0.5, hx = side ? 0.45 : 0.6, hz = side ? 0.6 : 0.45; return Math.abs(p.x - x) < hx && Math.abs(p.z - z) < hz; });
    const onStairs = x > STAIRS.x0 && x < STAIRS.x1 && z > STAIRS.z0 && z < STAIRS.z1;
    if (onMachine || onStairs || BACK_CLUTTER.some(([cx, cz]) => Math.abs(cx - x) < 0.5 && Math.abs(cz - z) < 0.5)) free[key(bx, bz)] = 0;
  }
  for (const d of decor) if (d.bz >= 0 && d.bz < rows && d.bx >= 0 && d.bx < cols) free[key(d.bx, d.bz)] = 0;
  // Everyone comes down the stairs: flood out from their foot
  const [sx, sz] = cellOfXZ(...STAIRS.bottom), seen = new Uint8Array(cols * rows), q = [[sx, sz]];
  seen[key(sx, sz)] = 1;
  while (q.length) {
    const [bx, bz] = q.pop();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = bx + dx, nz = bz + dz;
      if (nx < 0 || nx >= cols || nz < 0 || nz >= rows) continue;
      const k = key(nx, nz);
      if (seen[k] || !free[k]) continue;
      seen[k] = 1; q.push([nx, nz]);
    }
  }
  const reach = (x, z) => { const [bx, bz] = cellOfXZ(x, z); return bz >= 0 && bz < rows && bx >= 0 && bx < cols && !!seen[key(bx, bz)]; };
  // Each machine is worked from the square in front of it
  const fronts = open.map(p => [p.x + Math.sin(p.ry) * 0.95, p.z + Math.cos(p.ry) * 0.95]);
  return [...BACK_GOALS, ...fronts].filter(([x, z]) => !reach(x, z)).length;
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
  if (backCellBlocked(bx, bz, backExt(s))) return { msg: 'That square has to stay clear (machines, doors or buyers).' };
  if (backDecorAt(s, bx, bz) >= 0) return { msg: 'Something is already there.' };
  if (!backPathsOk(s, [...backOf(s).decor, { bx, bz }])) return { msg: 'That would block the way to a machine or a door.' };
  if (!payDirty(s, d.price)) return { msg: 'Not enough dirty cash.' };
  backOf(s).decor.push({ type, bx, bz, rot: 0 });
  return { ok: true, msg: `Placed: ${d.name}` };
}
export function moveBackDecor(s, idx, bx, bz) {
  const it = backOf(s).decor[idx]; if (!it) return { msg: '' };
  if (backCellBlocked(bx, bz, backExt(s)) || backDecorAt(s, bx, bz, idx) >= 0) return { msg: 'You can\u2019t put it there.' };
  if (!backPathsOk(s, backOf(s).decor.map((d, k) => (k === idx ? { bx, bz } : d)))) return { msg: 'That would block the way to a machine or a door.' };
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
// Squares inside kept clear for the kitchen, the baker, the counter, the queue and the doorway.
const KEEP_CLEAR = new Set();
for (let cz = 0; cz <= 8; cz++) for (let cx = 0; cx <= 8; cx++) {
  const kitchen = (cx <= 1 && cz <= 6) || (cz <= 1 && cx <= 6) || (cx <= 5 && cz <= 4); // machines along both walls, and room to work
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

export function defaultDesign(base = {}) {
  return {
    floor: {}, wall: {}, art: {}, base, counters: 2,
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
  // Decorations left on squares the kitchen now needs are moved to a free square (or sold back if there's none)
  s.design.decor.forEach((it, idx) => {
    if (cellZone(it.cx, it.cz) !== 'inside' || !keptClear(it.cx, it.cz)) return;
    const spot = allCells('inside').find(([cx, cz]) => !keptClear(cx, cz) && decorAt(s, cx, cz) < 0);
    if (spot) { it.cx = spot[0]; it.cz = spot[1]; } else it.gone = true;
  });
  s.design.decor = s.design.decor.filter(it => !it.gone);
  // Older saves: rooms already holding machines get the expansions those spots now need, and back-room decor on
  // squares that must now stay clear is taken down with a full refund
  // Older saves: as many counters as the old level-based menu allowed, so nothing comes off sale
  if (s.design.counters == null) s.design.counters = Math.min(7, Math.max(2, capAt(CAPS.menu, s.level || 1)));
  const ex = s.design.expansions;
  if (['bench', 'bench2', 'bench3', 'annex'].some(k => ex[k])) ex.storeroom = true;
  if ((s.machines || []).some(m => SPOTS[m.spot]?.need === 'refit')) ex.refit = true;
  tidyBack(s);
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
  // Then take pieces down, one at a time, until everyone can get everywhere: first whichever one alone fixes it,
  // otherwise the one nearest the middle of the trouble (the newest placed)
  while (b.decor.length && !backPathsOk(s, b.decor)) {
    let k = b.decor.length - 1, best = Infinity;
    b.decor.forEach((_, i) => { const n = backCutOff(s, b.decor.filter((__, j) => j !== i)); if (n < best) { best = n; k = i; } });
    refund(b.decor[k]); b.decor.splice(k, 1);
  }
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
  if (!cellOwned(s, cx, cz)) return `Buy the ${EXPANSIONS[zone].name.toLowerCase()} first.`;
  if (zone === 'inside' && keptClear(cx, cz)) return 'That square has to stay clear for the kitchen, counter or customers.';
  if (cx === 8 && cz === 1 && s.upgrades?.catering) return 'The catering boxes are there.';
  if (decorAt(s, cx, cz, ignore) >= 0) return 'Something is already there.';
  if ((s.machines || []).some(m => SPOTS[m.spot]?.cell && SPOTS[m.spot].cell[0] === cx && SPOTS[m.spot].cell[1] === cz)) return 'A machine stands there.';
  const d = DECOR[type];
  if (d?.outdoor && zone === 'inside') return `${d.name} only goes outside, on a terrace.`;
  if (d?.indoor && zone !== 'inside') return `${d.name} only goes inside.`;
  return null;
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
  s.design = JSON.parse(cart.snap); cart = null;
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
