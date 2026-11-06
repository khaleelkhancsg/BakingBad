// Game rules and state, running on the real clock. No DOM in here, so the balance simulator can run it in Node.
// Everything is driven by advance(s, now): it plays the time since the last call forward, minute by minute,
// whether that was a few milliseconds of live play or the hours you were away.
import { CFG, HOUR_TRADE, HOUR_TASTE, ITEMS, INGREDIENTS, PRICE_LEVELS, UPGRADES, EVENTS, LINES, BUYER_NAMES,
         START_RECIPES, CREW, FEATURES, MACHINES, MACHINE_PRICE_STEP, SPOTS, MACHINE_WALL, LAB_MACHINES, LAB_SPOTS,
         PRODUCTS, CAMPAIGNS, PROPERTY, CAPS, capAt, nextCap } from './data.js';
import { charmBonus, defaultDesign, allCells, cellKey, PANELS, EXPANSIONS } from './design.js';

export const SAVE_VERSION = 3;
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;

let rand = () => Math.random();
export function setRandom(fn) { rand = fn; }
export const pick = a => a[Math.floor(rand() * a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = v => Math.round(v * 100) / 100;
function weighted(obj) {
  let tot = 0;
  for (const k in obj) tot += obj[k];
  if (tot <= 0) return null;
  let r = rand() * tot;
  for (const k in obj) { r -= obj[k]; if (r <= 0) return k; }
  return Object.keys(obj)[0];
}

let sink = () => {};
export function onToast(fn) { sink = fn; }
let liveMode = false;
function toast(text, kind = 'info') { if (liveMode) sink(text, kind); }
function say(text, kind = 'info') { sink(text, kind); } // player actions always speak

// Visual-only events for the 3D scene (not saved): customers walking in.
export const live = { customers: [], nextId: 1 };

// ---------- Clock helpers (local time) ----------
export const localHour = t => { const d = new Date(t); return d.getHours() + d.getMinutes() / 60; };
export const isNight = t => { const h = localHour(t); return h >= CFG.nightStart || h < CFG.nightEnd; };
export function dayStart(t) { // the most recent 06:00 at or before t
  const d = new Date(t); d.setHours(CFG.rolloverHour, 0, 0, 0);
  if (d.getTime() > t) d.setDate(d.getDate() - 1);
  return d.getTime();
}
export function nextRollover(t) { const d = new Date(dayStart(t)); d.setDate(d.getDate() + 1); return d.getTime(); }
export function nextNightStart(t) {
  const d = new Date(t); d.setHours(CFG.nightStart, 0, 0, 0);
  if (d.getTime() <= t) d.setDate(d.getDate() + 1);
  return d.getTime();
}
export const dayIndex = (s, t) => Math.round((dayStart(t) - s.startDay) / DAY);

// ---------- Small state helpers ----------
export const has = (s, id) => !!s.upgrades[id];
export function eff(s, key) { // the sum of every owned upgrade's and property's effect called key
  let v = 0;
  for (const u of UPGRADES) if (s.upgrades[u.id] && u.eff[key]) v += u.eff[key];
  for (const [id, p] of Object.entries(PROPERTY)) if (s.property?.[id] && p.eff[key]) v += p.eff[key];
  return v;
}
export const unlocked = (s, level) => (s.level || 1) >= (level || 1);
export const feature = (s, id) => unlocked(s, FEATURES.find(f => f.id === id)?.level);
export const recipeOf = id => ITEMS[id] || PRODUCTS[id];
export const ingPrice = (s, ing) => round2(INGREDIENTS[ing].base * (s.market[ing] || 1));
export const itemPrice = (s, id) => round2(ITEMS[id].price * PRICE_LEVELS[s.priceLevel[id] || 'normal'].mult * (1 + eff(s, 'price')) * (s.crew.cashier ? 1 + CFG.cashierBonus : 1));
export const batchCost = (s, id) => round2(Object.entries(ITEMS[id].ing).reduce((a, [k, q]) => a + q * ingPrice(s, k), 0));
export const canMake = (s, id) => Object.entries(ITEMS[id].ing).every(([k, q]) => s.inv[k] >= q);
export const batchesPossible = (s, id) => Math.min(...Object.entries(ITEMS[id].ing).map(([k, q]) => Math.floor(s.inv[k] / q)));
export const missingCost = (s, id) => round2(Object.entries(ITEMS[id].ing).reduce((a, [k, q]) => a + Math.max(0, q - s.inv[k]) * ingPrice(s, k), 0));
export const cookMs = (s, id) => Math.round(ITEMS[id].minutes * MIN * Math.max(0.5, 1 - eff(s, 'speed')));
export const spoilMs = (s, id) => Math.max(CFG.spoilMin, ITEMS[id].minutes) * MIN * (1 + eff(s, 'keep'));
export const trayCap = (s, id) => ITEMS[id].servings * (CFG.trayBatches + eff(s, 'tray'));
export const launderRatio = s => CFG.launderRatio + eff(s, 'launder');
export const sealed = (s, t) => (s.sealedUntil || 0) > t;
export const scandal = (s, t) => (s.scandalUntil || 0) > t;

// ---------- XP and levels ----------
export const xpToNext = level => Math.round(CFG.xpBase + CFG.xpScale * Math.pow(level, CFG.xpPow));
export const batchXp = id => { const r = ITEMS[id]; return Math.round(4 + 0.6 * Math.pow(r.minutes, 0.85) + 0.4 * r.level); };
export const saleXp = id => Math.max(1, Math.round(ITEMS[id].price / 2));
export const labXp = id => { const p = PRODUCTS[id]; return Math.round(6 + p.minutes * 0.3 + p.level * 0.5); };
export const bagXp = id => Math.max(1, Math.round(PRODUCTS[id].price / 20));
export function addXp(s, n) {
  if (!n) return;
  s.xp += n; s.today.xp += n; s.stats.xp += n;
  while (s.level < CFG.maxLevel && s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    s.level++;
    const cash = CFG.levelCash * s.level;
    s.clean = round2(s.clean + cash);
    s.levelUps.push(s.level);
    note(s, `⬆️ Level ${s.level}! +£${cash}`, 'good');
    learnFree(s);
  }
  if (s.level >= CFG.maxLevel) s.xp = Math.min(s.xp, xpToNext(s.level));
}
// A running list of notable things, for the "while you were away" card and the daily report.
function note(s, text, kind = 'info', t = s.clock) {
  s.feed.push({ t, text, kind });
  if (s.feed.length > 80) s.feed.splice(0, s.feed.length - 80);
  if (kind !== 'info') s.today.events.push({ text, kind });
  toast(text, kind);
}

// ---------- Machines (kitchen) and the back room ----------
const kitchenList = (s, lab) => (lab ? s.lab : s.machines);
const TYPES = lab => (lab ? LAB_MACHINES : MACHINES);
export const machinesOf = (s, type, lab = false) => kitchenList(s, lab).filter(m => m.type === type);
export const machineCount = (s, type, lab = false) => machinesOf(s, type, lab).length;
export const machineCap = (s, type, lab = false) => { const M = TYPES(lab)[type]; return unlocked(s, M.level) ? capAt(M.caps, s.level) : 0; };
export const machineNextCap = (s, type, lab = false) => nextCap(TYPES(lab)[type].caps, s.level);
export function machinePrice(s, type, lab = false) {
  const M = TYPES(lab)[type], extra = Math.max(0, machineCount(s, type, lab) - (M.free || 0));
  return Math.round(M.price * (1 + MACHINE_PRICE_STEP * extra) / 10) * 10;
}
const spotOpen = (s, spot) => !spot.need || !!s.design.expansions[spot.need];
export function freeSpots(s, lab = false) {
  const spots = lab ? LAB_SPOTS : SPOTS, used = kitchenList(s, lab);
  return spots.map((_, i) => i).filter(i => spotOpen(s, spots[i]) && !used.some(m => m.spot === i));
}
// The next expansion that would open more room, for the locked message.
function nextRoom(s, lab) {
  const key = lab ? 'labSpots' : 'spots';
  return Object.entries(EXPANSIONS).filter(([id, e]) => e[key] && !s.design.expansions[id]).sort((a, b) => a[1].level - b[1].level)[0];
}
export function machineBlock(s, type, lab = false) {
  const M = TYPES(lab)[type];
  if (!unlocked(s, M.level)) return { lock: true, text: `Reach level ${M.level} to unlock the ${M.name.toLowerCase()}` };
  if (machineCount(s, type, lab) >= machineCap(s, type, lab)) {
    const nx = machineNextCap(s, type, lab);
    return { lock: true, text: nx ? `Reach level ${nx.level} to unlock additional ${M.plural}` : `That's as many ${M.plural} as you can have` };
  }
  if (!freeSpots(s, lab).length) {
    const nr = nextRoom(s, lab);
    return { lock: true, text: nr ? (unlocked(s, nr[1].level) ? `No room: buy the ${nr[1].name.toLowerCase()} in Design → Expand` : `No room: reach level ${nr[1].level} for the ${nr[1].name.toLowerCase()}`) : 'No room left' };
  }
  return null;
}
export const machineCash = (type, lab) => (lab && type !== 'burner' ? 'dirty' : 'clean');
export function buyMachine(s, type, lab = false) {
  const M = TYPES(lab)[type];
  if (!M) return;
  if (lab && !s.labUnlocked) return say('The back room isn\'t yours yet.', 'bad');
  const block = machineBlock(s, type, lab);
  if (block) return say(block.text + '.', 'bad');
  const cost = machinePrice(s, type, lab), cash = machineCash(type, lab);
  if (s[cash] < cost) return say(`Not enough ${cash} cash.`, 'bad');
  s[cash] = round2(s[cash] - cost);
  const free = freeSpots(s, lab);
  const spot = lab ? free[0] : (free.find(i => SPOTS[i].wall === MACHINE_WALL[type]) ?? free[0]);
  kitchenList(s, lab).push({ type, spot, job: null, last: null, broken: false });
  learnFree(s);
  say(`New ${M.name.toLowerCase()} installed.`, 'good');
}
export const recipesFor = type => Object.keys(ITEMS).filter(id => ITEMS[id].machine === type);
export const productsFor = type => Object.keys(PRODUCTS).filter(id => PRODUCTS[id].machine === type);
export function learnFree(s) {
  for (const id in ITEMS) {
    const r = ITEMS[id];
    if (r.cost || s.recipes.includes(id) || !unlocked(s, r.level) || !machineCount(s, r.machine)) continue;
    s.recipes.push(id);
    if (s.onMenu.length < menuSlots(s)) s.onMenu.push(id);
  }
}
export function buyRecipe(s, id) {
  const r = ITEMS[id];
  if (!r || s.recipes.includes(id)) return;
  if (!unlocked(s, r.level)) return say(`${r.name} unlocks at level ${r.level}.`, 'bad');
  if (s.clean < r.cost) return say('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - r.cost);
  s.today.upgradesSpent += r.cost;
  s.recipes.push(id);
  if (s.onMenu.length < menuSlots(s)) { s.onMenu.push(id); say(`Learned ${r.name}. It's on sale.`, 'good'); }
  else say(`Learned ${r.name}. The menu is full: take something off to sell it.`, 'info');
}
// What a machine is doing at time t (for the UI and the 3D scene). Times in seconds.
export function jobView(s, m, t, lab = false) {
  if (!m.job) return { item: null };
  const { item, start, dur } = m.job;
  const doneAt = start + dur;
  const spoilAt = lab ? Infinity : doneAt + spoilMs(s, item);
  return { item, t: Math.min(dur, t - start) / 1000, dur: dur / 1000, done: t >= doneAt, left: Math.max(0, doneAt - t) / 1000,
    over: Math.max(0, t - doneAt) / 1000, spoilIn: Math.max(0, spoilAt - t) / 1000 };
}
export function startJob(s, idx, id, t, { autobuy = true, quiet = false } = {}) {
  const m = s.machines[idx], r = ITEMS[id];
  if (!m || !r || m.job || m.broken || r.machine !== m.type || !s.recipes.includes(id)) return false;
  if (!canMake(s, id)) {
    const cost = missingCost(s, id);
    if (!autobuy || s.clean < cost) { if (!quiet) say(`Not enough ingredients${autobuy ? ` (and £${cost.toFixed(2)} to buy them)` : ''}.`, 'bad'); return false; }
    for (const [k, q] of Object.entries(r.ing)) if (s.inv[k] < q) buyIngredient(s, k, q - s.inv[k], true);
  }
  for (const [k, q] of Object.entries(r.ing)) s.inv[k] -= q;
  m.job = { item: id, start: t, dur: cookMs(s, id) };
  m.last = id;
  return true;
}
export function collectJob(s, idx, t, { quiet = false } = {}) {
  const m = s.machines[idx];
  if (!m?.job || t < m.job.start + m.job.dur) return false;
  const id = m.job.item, r = ITEMS[id];
  if ((s.display[id] || 0) > 0 && (s.display[id] || 0) + r.servings > trayCap(s, id)) {
    if (!quiet) say(`The ${r.name.toLowerCase()} tray is full. Sell some first.`, 'bad');
    return false;
  }
  s.display[id] = (s.display[id] || 0) + r.servings;
  if (!s.onMenu.includes(id) && s.onMenu.length < menuSlots(s)) s.onMenu.push(id);
  m.job = null;
  addXp(s, batchXp(id));
  s.today.batches++;
  if (!quiet && !s.onMenu.includes(id)) say(`${r.name} isn't on sale: put it on the menu to sell it.`, 'info');
  // The head chef starts the same thing again straight away, if there's room for it
  if (s.crew.chef && m.last) chefRestart(s, idx, t);
  return true;
}
// Marco only cooks again what's on sale and will fit in its tray once it's done
function chefRestart(s, idx, t) {
  const m = s.machines[idx], id = m.last;
  if (!id || !menuOf(s).includes(id) || (s.display[id] || 0) + ITEMS[id].servings > trayCap(s, id)) return false;
  return startJob(s, idx, id, t, { quiet: true });
}
export const repairCost = (type, lab = false) => Math.round(Math.max(300, TYPES(lab)[type].price) * CFG.repairShare / 10) * 10;
export function repairMachine(s, idx, lab = false) {
  const m = kitchenList(s, lab)[idx];
  if (!m?.broken) return;
  const cost = repairCost(m.type, lab);
  if (s.clean < cost) return say('Not enough clean cash for the repair.', 'bad');
  s.clean = round2(s.clean - cost);
  m.broken = false;
  say(`${TYPES(lab)[m.type].name} repaired.`, 'good');
}
// Back-room cooks
export function startLab(s, idx, id, t, { quiet = false } = {}) {
  const m = s.lab[idx], p = PRODUCTS[id];
  if (!m || !p || m.job || m.broken || p.machine !== m.type) return false;
  if (!unlocked(s, p.level)) { if (!quiet) say(`${p.name} unlocks at level ${p.level}.`, 'bad'); return false; }
  if (sealed(s, t)) { if (!quiet) say('The back room is sealed by the police.', 'bad'); return false; }
  if (!(s.kits[id] > 0) && !buyKit(s, s.dirty >= p.kit ? 'dirty' : 'clean', id, { quiet: true })) {
    if (!quiet) say(`No ${p.name} kits, and Dez won't sell you one right now.`, 'bad');
    return false;
  }
  s.kits[id]--;
  m.job = { item: id, start: t, dur: p.minutes * MIN };
  m.last = id;
  return true;
}
export function collectLab(s, idx, t, { quiet = false } = {}) {
  const m = s.lab[idx];
  if (!m?.job || t < m.job.start + m.job.dur) return false;
  const id = m.job.item, p = PRODUCTS[id];
  const n = Math.round(p.bags * (1 + eff(s, 'bags')));
  s.bags[id] = (s.bags[id] || 0) + n;
  s.heat = clamp(s.heat + p.heat * (1 - eff(s, 'quiet')), 0, 100);
  s.lastLab = t;
  m.job = null;
  addXp(s, labXp(id));
  s.today.labBatches++;
  if (!quiet) say(`+${n} ${p.name}`, 'good');
  if (s.crew.chemist && m.last) startLab(s, idx, m.last, t, { quiet: true });
  return true;
}

// ---------- Menu, ingredients, prices ----------
export const menuSlots = s => capAt(CAPS.menu, s.level || 1);
export const menuOf = s => s.onMenu.filter(id => s.recipes.includes(id)).slice(0, menuSlots(s));
export function toggleMenu(s, id) {
  if (!s.recipes.includes(id)) return;
  if (s.onMenu.includes(id)) { s.onMenu = s.onMenu.filter(x => x !== id); return; }
  if (s.onMenu.length >= menuSlots(s)) {
    const nx = nextCap(CAPS.menu, s.level);
    return say(`You can sell ${menuSlots(s)} things at once${nx ? ` (reach level ${nx.level} for ${nx.amount})` : ''}. Take something off first.`, 'bad');
  }
  s.onMenu.push(id);
}
export function setPriceLevel(s, id, lvl) { if (PRICE_LEVELS[lvl]) s.priceLevel[id] = lvl; }
export function buyIngredient(s, ing, qty, silent = false) {
  if (!unlocked(s, INGREDIENTS[ing].level)) { if (!silent) say(`${INGREDIENTS[ing].name} unlocks at level ${INGREDIENTS[ing].level}.`, 'bad'); return false; }
  const cost = round2(ingPrice(s, ing) * qty);
  if (s.clean < cost) { if (!silent) say('Not enough clean cash.', 'bad'); return false; }
  s.clean = round2(s.clean - cost);
  s.inv[ing] = (s.inv[ing] || 0) + qty;
  s.today.ingSpent = round2(s.today.ingSpent + cost);
  return true;
}
export const upgradeAvailable = (s, u) => !has(s, u.id) && (!u.lab || s.labUnlocked);
export function buyUpgrade(s, id) {
  const u = UPGRADES.find(x => x.id === id);
  if (!u || !upgradeAvailable(s, u)) return;
  if (!unlocked(s, u.level)) return say(`${u.name} unlocks at level ${u.level}.`, 'bad');
  if (s[u.cash] < u.cost) return say(`Not enough ${u.cash} cash.`, 'bad');
  s[u.cash] = round2(s[u.cash] - u.cost);
  s.upgrades[u.id] = true;
  if (u.cash === 'clean') s.today.upgradesSpent += u.cost;
  say(`Bought: ${u.name}`, 'good');
}
export function buyProperty(s, id) {
  const p = PROPERTY[id];
  if (!p || s.property[id]) return;
  if (!unlocked(s, p.level)) return say(`${p.name} unlocks at level ${p.level}.`, 'bad');
  if (s.clean < p.price) return say('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - p.price);
  s.property[id] = true;
  say(`${p.emoji} ${p.name}: done. It's yours.`, 'good');
}

// ---------- Crew ----------
export function hire(s, role) {
  const c = CREW[role];
  if (!c || (c.lab && !s.labUnlocked)) return;
  if (!unlocked(s, c.level)) return say(`${c.name} is available from level ${c.level}.`, 'bad');
  s.crew[role] = true;
  say(`${c.name} (${c.role.toLowerCase()}) starts now.`, 'good');
}
export function fire(s, role) { s.crew[role] = false; }
export const crewWages = (s, shift) => Object.entries(CREW).filter(([r, c]) => s.crew[r] && c.shift === shift).reduce((a, [, c]) => a + c.wage, 0);

// ---------- Customers ----------
export function customersPerHour(s, t) {
  const h = Math.floor(localHour(t));
  const nightApp = (h >= 22 || h < 6) && eff(s, 'night') ? 1 + eff(s, 'night') : 1;
  const inStock = menuOf(s).filter(id => s.display[id] > 0).length;
  const variety = 1 + Math.min(CFG.varietyCap, CFG.varietyBonus * Math.max(0, inStock - 1));
  return (CFG.custBase + s.rep * CFG.custPerPop) * HOUR_TRADE[h] * nightApp * (1 + eff(s, 'cust')) * (s.event?.cust || 1)
    * charmBonus(s) * (1 + campaignBoost(s, t)) * scandalFactor(s, t) * variety;
}
const tasteAt = t => { const h = localHour(t); return HOUR_TASTE.find(b => h < b.until).w; };
const newLook = () => ({ skin: Math.floor(rand() * 5), shirt: Math.floor(rand() * 10), hair: Math.floor(rand() * 6),
  pants: Math.floor(rand() * 5), h: round2(0.9 + rand() * 0.2), hat: rand() < 0.2 });
function customerVisit(s, t, showIt) {
  const td = s.today;
  const menu = menuOf(s), stock = menu.filter(id => s.display[id] > 0);
  const show = res => showIt && live.customers.push({ id: live.nextId++, look: newLook(), want: res.want, res, at: Date.now() });
  if (!stock.length) {
    td.missed++; s.stats.missed = (s.stats.missed || 0) + 1;
    s.rep = clamp(s.rep + CFG.popUnserved, 0, 100);
    return show({ kind: 'bad', text: 'nothing left', want: pick(menu.length ? menu : START_RECIPES) });
  }
  const w = { ...tasteAt(t) };
  if (s.event?.sweet) { w.sweet *= s.event.sweet; w.cold *= 3; }
  const byItem = {};
  for (const id of stock) byItem[id] = (w[ITEMS[id].group] || 0.05) + 0.02;
  const id = weighted(byItem);
  const lvl = PRICE_LEVELS[s.priceLevel[id] || 'normal'];
  const buy = s.crew.cashier ? lvl.buy + (1 - lvl.buy) / 2 : lvl.buy;
  if (rand() > buy) {
    td.pricedOut++;
    s.rep = clamp(s.rep + CFG.popUnserved / 2, 0, 100);
    return show({ kind: 'meh', text: `${ITEMS[id].emoji} too dear`, want: id });
  }
  const g = ITEMS[id].group;
  let qty = 1 + (rand() < 0.45 ? 1 : 0) + ((g === 'sweet' || g === 'cold') && rand() < 0.3 ? 1 : 0);
  qty = Math.min(qty, s.display[id]);
  s.display[id] -= qty;
  let rev = qty * itemPrice(s, id), xp = qty * saleXp(id);
  // Plenty of people grab a drink with their food
  if (g !== 'drink' && rand() < CFG.drinkAddOn) {
    const drinks = stock.filter(x => ITEMS[x].group === 'drink' && s.display[x] > 0);
    if (drinks.length) { const d = pick(drinks); s.display[d]--; rev += itemPrice(s, d); xp += saleXp(d); td.itemsSold++; }
  }
  rev = round2(rev);
  s.clean = round2(s.clean + rev);
  td.sales = round2(td.sales + rev); td.itemsSold += qty; td.served++; s.stats.served = (s.stats.served || 0) + 1;
  s.stats.totalSales = round2(s.stats.totalSales + rev);
  s.rep = clamp(s.rep + CFG.popServed, 0, 100);
  addXp(s, xp);
  show({ kind: 'good', text: `+£${rev.toFixed(2)}`, want: id });
}

// ---------- Night trade ----------
export const copChance = (s, product = 'velvet') => CFG.copBase + s.heat * CFG.copPerHeat + (PRODUCTS[product]?.cop || 0);
export const buyersPerHour = s => Math.min(CFG.buyersMax, CFG.buyersPerHour + CFG.buyersGrow * s.nightsActive) * (1 + eff(s, 'buyers'));
export const knownProducts = s => Object.keys(PRODUCTS).filter(id => unlocked(s, PRODUCTS[id].level));
function buyerArrives(s, t) {
  const choices = {};
  for (const id of knownProducts(s)) choices[id] = PRODUCTS[id].share * ((s.bags[id] || 0) > 0 ? 2 : 1);
  const product = weighted(choices) || 'velvet';
  const cop = rand() < copChance(s, product);
  const offLine = cop ? rand() < 0.8 : rand() < 0.12;
  const hint = (has(s, 'camera') && (cop ? rand() < 0.5 : rand() < 0.05)) || (s.crew.lookout && (cop ? rand() < CFG.lookoutCatch : rand() < CFG.lookoutFalse));
  const want = PRODUCTS[product].price > 100 ? 1 + (rand() < 0.4 ? 1 : 0) : 1 + Math.floor(rand() * 3);
  s.door.push({ id: s.nextId++, name: pick(BUYER_NAMES), product, cop, hint, want, line: pick(offLine ? LINES.off : LINES.normal),
    arrive: t, patience: CFG.buyerPatienceMin * MIN, look: newLook() });
}
function courierArrives(s, t) {
  const stocked = knownProducts(s).filter(id => (s.bags[id] || 0) > 0);
  const product = stocked.length ? pick(stocked) : 'velvet';
  const want = CFG.courierMin + Math.floor(rand() * (CFG.courierMax - CFG.courierMin + 1));
  s.door.push({ id: s.nextId++, name: "Dez's courier", courier: true, product, cop: false, hint: false, want,
    line: `Dez sent me. ${want} bags of ${PRODUCTS[product].name}, all at once, and I'm gone.`, arrive: t, patience: CFG.courierPatienceMin * MIN, look: newLook() });
  note(s, `📦 Dez's courier is at the back door for ${want} ${PRODUCTS[product].name}.`, 'info', t);
}
export const bagPrice = b => Math.round(PRODUCTS[b.product].price * (b.courier ? CFG.courierPremium : 1));
// You serve a buyer yourself: full price, your own read of them.
export function serveBuyer(s, id, push = false, t = s.clock) {
  const b = s.door.find(x => x.id === id);
  if (!b) return;
  const have = s.bags[b.product] || 0;
  if (b.courier && have < b.want) return say(`The courier wants all ${b.want} at once.`, 'bad');
  const qty = Math.min(b.want, have);
  if (qty < 1) return say(`No ${PRODUCTS[b.product].name} to sell.`, 'bad');
  push = push && !b.courier && feature(s, 'haggle');
  if (push && !b.cop && rand() < CFG.pushRefuse) {
    s.door = s.door.filter(x => x !== b); s.today.pushedAway++;
    return say(`${b.name} won't pay that and leaves.`, 'bad');
  }
  sell(s, b, qty, Math.round(qty * bagPrice(b) * (push ? CFG.pushMult : 1)), t, false);
}
function sell(s, b, qty, cash, t, byCrew) {
  s.door = s.door.filter(x => x !== b);
  s.bags[b.product] -= qty;
  s.dirty += cash;
  s.stats.nightCash = (s.stats.nightCash || 0) + cash;
  const td = s.today;
  td.nightSales += cash; td.bagsSold += qty; if (byCrew) td.crewSales += qty; else td.buyersServed++;
  s.lastLab = t;
  s.stats.totalBags += qty;
  s.heat = clamp(s.heat + CFG.heatPerBag * qty, 0, 100);
  addXp(s, qty * bagXp(b.product) + (b.courier ? 30 : 0));
  if (b.courier) { td.couriers++; s.heat = clamp(s.heat + CFG.courierHeat, 0, 100); note(s, `📦 Courier order done: +£${cash}.`, 'good', t); }
  if (b.cop) {
    td.copsServed++;
    const h = byCrew ? CFG.copCrewHeat : CFG.copServedHeat;
    s.heat = clamp(s.heat + h, 0, 100);
    note(s, `🚨 ${b.name} was undercover${byCrew ? ' (the crew served them)' : ''}. Heat +${h}.`, 'bad', t);
  } else if (!byCrew) say(`${PRODUCTS[b.product].emoji} ${b.name} ×${qty} +£${cash}`, 'good');
}
export function turnAway(s, id) {
  const b = s.door.find(x => x.id === id);
  if (!b) return;
  s.door = s.door.filter(x => x !== b);
  if (b.cop) s.today.copsTurned++; else s.today.buyersTurned++;
}
// Nobody served them in time: crew may step in, otherwise they leave.
function unattended(s, b, t) {
  const have = s.bags[b.product] || 0;
  if (b.courier) {
    if (s.crew.driver && have >= b.want) return sell(s, b, b.want, Math.round(b.want * bagPrice(b)), t, true);
  } else if (s.crew.dealer && have > 0 && !(b.hint && s.crew.lookout)) {
    const qty = Math.min(b.want, have);
    s.today.jayWorked = true;
    return sell(s, b, qty, Math.round(qty * bagPrice(b) * CFG.streetMult * (1 - CFG.dealerCut)), t, true);
  }
  s.door = s.door.filter(x => x !== b);
  s.today.buyersLost++;
}
export const kitsLeftToday = s => Math.max(0, capAt(CAPS.kits, s.level) - s.today.kitsBought);
export function buyKit(s, cash, product = 'velvet', { quiet = false } = {}) {
  const p = PRODUCTS[product];
  if (!s.labUnlocked || !p) return false;
  if (!unlocked(s, p.level)) { if (!quiet) say(`${p.name} unlocks at level ${p.level}.`, 'bad'); return false; }
  if (!kitsLeftToday(s)) {
    const nx = nextCap(CAPS.kits, s.level);
    if (!quiet) say(`Dez won't sell you more than ${capAt(CAPS.kits, s.level)} kits a day${nx ? `. Reach level ${nx.level} for ${nx.amount}` : ''}.`, 'bad');
    return false;
  }
  if (s[cash] < p.kit) { if (!quiet) say(`Not enough ${cash} cash.`, 'bad'); return false; }
  s[cash] = round2(s[cash] - p.kit);
  s.today.kitsBought++;
  s.kits[product] = (s.kits[product] || 0) + 1;
  return true;
}
export function bribe(s) {
  if (s.today.bribe) return say('You already paid someone off today.', 'bad');
  if (s.dirty < CFG.bribeCost) return say('Not enough dirty cash.', 'bad');
  s.dirty -= CFG.bribeCost;
  if (rand() < CFG.bribeBackfire) { s.heat = clamp(s.heat + CFG.bribeBackfireHeat, 0, 100); s.today.bribe = 'backfired'; say(`The sergeant wasn't for sale. Heat +${CFG.bribeBackfireHeat}.`, 'bad'); }
  else { s.heat = clamp(s.heat - CFG.bribeHeat, 0, 100); s.today.bribe = 'paid'; say(`A file goes missing. Heat -${CFG.bribeHeat}.`, 'good'); }
}
export function answerOffer(s, yes) {
  s.offerPending = false;
  if (yes) {
    s.labUnlocked = true;
    s.kits.velvet = (s.kits.velvet || 0) + 1;
    if (!s.lab.length) s.lab.push({ type: 'burner', spot: 0, job: null, last: null, broken: false });
    say('Dez drops off a kit and shows you the back room.', 'good');
  } else s.offerAfter = s.clock + 3 * DAY;
}

// ---------- Laundering (any time; the safe amount is based on today's real takings) ----------
export const launderLeft = s => Math.max(0, Math.round(s.today.sales * launderRatio(s)) - s.today.laundered);
export const launderHeatFor = (s, amount) => {
  const excess = amount - launderLeft(s), base = Math.max(50, Math.round(s.today.sales * launderRatio(s)));
  return excess > 0 ? Math.round(Math.min(40, CFG.launderHeat * excess / base)) : 0;
};
export function launder(s, amount, quiet = false) {
  amount = clamp(Math.round(amount), 0, Math.floor(s.dirty));
  if (!amount) return;
  const h = launderHeatFor(s, amount);
  s.dirty -= amount; s.clean = round2(s.clean + amount);
  s.today.laundered += amount; s.stats.totalLaundered += amount;
  if (h) { s.heat = clamp(s.heat + h, 0, 100); s.today.launderHeat += h; }
  if (!quiet) say(`£${amount.toLocaleString('en-GB')} through the till${h ? ` (that looked off: heat +${h})` : ''}.`, h ? 'bad' : 'good');
}

// ---------- Marketing ----------
export const campaignCap = s => capAt(CAPS.campaigns, s.level);
export const activeCampaigns = (s, t = s.clock) => s.campaigns.filter(c => c.until > t);
// Campaigns overlap: each extra one reaches fewer new people (1 - the product of what each misses), capped
export const campaignBoost = (s, t = s.clock) => Math.min(CFG.campaignMax, 1 - activeCampaigns(s, t).reduce((a, c) => a * (1 - (CAMPAIGNS[c.id]?.cust || 0)), 1));
export const scandalFactor = (s, t = s.clock) => (scandal(s, t) ? (s.crew.pr ? CFG.prScandalMult : CFG.scandalMult) : 1);
export function campaignBlock(s, id, t = s.clock) {
  const c = CAMPAIGNS[id];
  if (!unlocked(s, c.level)) return { lock: true, text: `Reach level ${c.level} to run ${c.name.toLowerCase()}` };
  const running = activeCampaigns(s, t).find(x => x.id === id);
  if (running) return { text: `Running · ${Math.ceil((running.until - t) / HOUR)}h left` };
  if (c.weeklyOnce && t - (s.lastCharity || 0) < 7 * DAY) return { text: `Again in ${Math.ceil((7 * DAY - (t - s.lastCharity)) / DAY)} days` };
  if (activeCampaigns(s, t).length >= campaignCap(s)) {
    const nx = nextCap(CAPS.campaigns, s.level);
    return { lock: true, text: nx ? `Reach level ${nx.level} to run ${nx.amount} campaigns at once` : 'That\'s as many campaigns as you can run' };
  }
  return null;
}
export function startCampaign(s, id, t = s.clock) {
  const c = CAMPAIGNS[id];
  if (!c) return;
  const block = campaignBlock(s, id, t);
  if (block) return say(block.text + '.', 'bad');
  if (s.clean < c.price) return say('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - c.price);
  s.today.upgradesSpent += c.price;
  if (c.once) s.rep = clamp(s.rep + c.once * (s.crew.pr ? 1.25 : 1), 0, 100);
  if (c.heat) s.heat = clamp(s.heat + c.heat, 0, 100);
  if (c.weeklyOnce) s.lastCharity = t;
  s.campaigns = activeCampaigns(s, t).concat([{ id, until: t + c.hours * HOUR }]);
  say(`${c.emoji} ${c.name} is running.`, 'good');
}

// ---------- Bank ----------
export const nextDue = s => Math.min(s.balance, CFG.weekly + s.arrears);
export function nextPaymentAt(s) {
  const first = s.startDay + CFG.firstPaymentDays * DAY;
  if (s.clock < first) return first;
  return first + Math.ceil((s.clock - first + 1) / (7 * DAY)) * 7 * DAY;
}
export const daysToPayment = s => Math.max(0, Math.ceil((nextPaymentAt(s) - s.clock) / DAY));
export function payBank(s, amount) {
  amount = Math.min(Math.round(amount), Math.ceil(s.balance), Math.floor(s.clean));
  if (amount <= 0) return say('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - amount); s.balance = round2(s.balance - amount);
  s.arrears = Math.max(0, round2(s.arrears - amount));
  if (s.arrears <= 0) s.behind = 0;
  s.stats.paid += amount;
  if (s.balance <= 0.5) { s.balance = 0; s.won = true; }
  say(`Paid the bank £${amount.toLocaleString('en-GB')}.`, 'good');
}
export const loanAmount = s => capAt(CAPS.loan, s.level);
export const loanReady = s => feature(s, 'loan') && s.clock - (s.loanAt || 0) >= CFG.loanEveryDays * DAY && !s.won;
export function takeLoan(s) {
  if (!loanReady(s)) return say(feature(s, 'loan') ? 'One loan a week.' : 'Loans unlock at level 4.', 'bad');
  const amount = loanAmount(s);
  s.clean = round2(s.clean + amount); s.balance = round2(s.balance + amount * (1 + CFG.loanFee)); s.loanAt = s.clock;
  say(`Borrowed £${amount.toLocaleString('en-GB')}. The debt goes up £${(amount * (1 + CFG.loanFee)).toLocaleString('en-GB')}.`, 'good');
}
export function useHoliday(s) {
  if (!feature(s, 'holiday') || s.holidayUsed) return say('No payment holiday available.', 'bad');
  s.holidayUsed = true; s.holidayNext = true;
  say('The bank agrees: your next payment is skipped.', 'good');
}
export const restructureReady = s => s.arrears > 0 && s.behind >= 2 && s.clock - (s.restructuredAt || 0) >= CFG.restructureEveryDays * DAY;
export function restructure(s) {
  if (!restructureReady(s)) return say(s.behind < 2 ? 'Only once you are two payments behind.' : 'The bank will only do this once a month.', 'bad');
  const fee = round2(s.arrears * CFG.restructureFee);
  s.balance = round2(s.balance + fee); s.arrears = 0; s.behind = 0; s.restructuredAt = s.clock;
  say(`Restructured: missed payments folded into the loan (fee £${Math.round(fee)}). The collectors are called off.`, 'good');
}

// ---------- New game, saves ----------
function freshLedger(s, t) {
  return { day: dayStart(t), sales: 0, itemsSold: 0, served: 0, missed: 0, pricedOut: 0, batches: 0, labBatches: 0, burnt: 0,
    ingSpent: 0, upgradesSpent: 0, laundered: 0, launderHeat: 0, nightSales: 0, bagsSold: 0, crewSales: 0, buyersServed: 0,
    buyersLost: 0, buyersTurned: 0, copsServed: 0, copsTurned: 0, couriers: 0, pushedAway: 0, kitsBought: 0, xp: 0, interest: 0,
    rent: 0, wages: 0, nightWages: 0, income: 0, peakHeat: s.heat || 0, bribe: null, jayWorked: false, events: [] };
}
function rollMarket(s) {
  s.event = null;
  let r = rand();
  for (const ev of EVENTS) { if (r < ev.p) { s.event = { ...ev }; break; } r -= ev.p; }
  for (const k in INGREDIENTS) s.market[k] = round2(0.85 + rand() * 0.4);
  if (s.event?.flour) s.market.flour = round2(s.market.flour * s.event.flour);
}
export function newGame(t = Date.now()) {
  const s = {
    v: SAVE_VERSION, created: t, clock: t, last: t, startDay: dayStart(t), nextId: 1,
    clean: CFG.startClean, dirty: 0, heat: 0, rep: 50,
    balance: CFG.debtTotal, arrears: 0, strikes: 0, behind: 0, paymentsMade: 0, won: false,
    inv: Object.assign(Object.fromEntries(Object.keys(INGREDIENTS).map(k => [k, 0])), { flour: 30, butter: 12, sugar: 12, eggs: 10, chocolate: 6, milk: 10 }),
    market: {}, event: null,
    level: 1, xp: 0, levelUps: [],
    recipes: [...START_RECIPES], onMenu: [...START_RECIPES], priceLevel: {}, display: {},
    machines: [{ type: 'oven', spot: 0, job: null, last: null }, { type: 'oven', spot: 1, job: null, last: null }, { type: 'mixer', spot: 5, job: null, last: null }],
    lab: [], kits: {}, bags: {}, door: [],
    upgrades: {}, property: {}, crew: Object.fromEntries(Object.keys(CREW).map(r => [r, false])),
    labUnlocked: false, offerAfter: t + 2 * HOUR, offerPending: false, nightsActive: 0, lastLab: 0,
    campaigns: [], lastCharity: 0, scandalUntil: 0, sealedUntil: 0, lastVisit: 0,
    holidayUsed: false, holidayNext: false, night: {},
    design: defaultDesign(), custAcc: 0, buyAcc: 0,
    feed: [], reports: [], today: null,
    stats: { totalBags: 0, totalLaundered: 0, totalSales: 0, paid: 0, busts: 0, visits: 0, xp: 0, served: 0, missed: 0, nightCash: 0 },
  };
  for (const id in ITEMS) { s.priceLevel[id] = 'normal'; s.display[id] = 0; }
  s.display.sourdough = 20; s.display.croissant = 16; // Aunt Rosa's last bake
  rollMarket(s); s.event = null;
  s.today = freshLedger(s, t);
  scheduleNight(s, t);
  return s;
}
// Saves from before the real-time clock keep their progress; the clock starts now.
export function migrate(s, t = Date.now()) {
  if (s.v === SAVE_VERSION) {
    for (const k in INGREDIENTS) { s.inv[k] ??= 0; s.market[k] ??= 1; }
    for (const id in ITEMS) { s.priceLevel[id] ||= 'normal'; s.display[id] ??= 0; }
    for (const r in CREW) s.crew[r] ??= false;
    return s;
  }
  const n = newGame(t);
  for (const k of ['clean', 'dirty', 'heat', 'rep', 'balance', 'arrears', 'strikes', 'behind', 'paymentsMade', 'won', 'level', 'xp',
                   'labUnlocked', 'nightsActive', 'holidayUsed', 'holidayNext']) if (s[k] !== undefined) n[k] = s[k];
  n.level = Math.max(1, Math.min(CFG.maxLevel, n.level || 1));
  n.clean = Math.max(0, n.clean);
  n.recipes = (s.recipes || []).filter(id => ITEMS[id]);
  for (const id of START_RECIPES) if (!n.recipes.includes(id)) n.recipes.push(id);
  n.onMenu = (s.onMenu || n.recipes).filter(id => n.recipes.includes(id));
  for (const id in s.priceLevel || {}) if (ITEMS[id]) n.priceLevel[id] = s.priceLevel[id];
  for (const k in s.inv || {}) if (INGREDIENTS[k]) n.inv[k] = s.inv[k];
  for (const id in s.upgrades || {}) if (UPGRADES.some(u => u.id === id)) n.upgrades[id] = true;
  for (const r in s.crew || {}) if (CREW[r]) n.crew[r] = !!s.crew[r];
  if (Array.isArray(s.machines)) n.machines = s.machines.filter(m => MACHINES[m.type]).map(m => ({ type: m.type, spot: m.spot, job: null, last: null, broken: !!m.broken }));
  if (n.labUnlocked) {
    n.lab = [{ type: 'burner', spot: 0, job: null, last: null }];
    n.kits = { velvet: typeof s.kits === 'number' ? s.kits : 0, gold: s.goldKits || 0 };
    n.bags = { velvet: typeof s.bags === 'number' ? s.bags : 0, gold: s.gold || 0 };
  }
  if (s.design) n.design = s.design;
  n.stats = { ...n.stats, ...(s.stats || {}) };
  n.offerPending = !n.labUnlocked;
  learnFree(n);
  return n;
}

// ---------- The clock ----------
// Play the game forward to time `now`. live: the player is watching (show customers, speak events).
export function advance(s, now, { live: watching = false } = {}) {
  if (!(now > s.last)) return;
  liveMode = watching;
  if (now - s.last > CFG.maxCatchUpDays * DAY) s.last = now - CFG.maxCatchUpDays * DAY;
  let t = s.last;
  while (t < now) {
    const roll = nextRollover(t);
    const t1 = Math.min(now, roll, t + MIN);
    span(s, t, t1, watching && now - t < 2 * MIN);
    t = t1;
    s.clock = t;
    if (t === roll) rollover(s, roll);
  }
  s.last = now; s.clock = now;
  liveMode = false;
}

function span(s, t0, t1, showIt) {
  const mins = (t1 - t0) / MIN;
  s.clock = t1;
  // Kitchen: crew collect, food spoils if left too long
  s.machines.forEach((m, i) => {
    if (!m.job) { if (s.crew.chef && !m.broken && m.last) chefRestart(s, i, t1); return; }
    const doneAt = m.job.start + m.job.dur;
    if (t1 < doneAt) return;
    if (t1 >= doneAt + spoilMs(s, m.job.item)) {
      const n = ++s.today.burnt;
      if (n <= 3) note(s, `${MACHINES[m.type].emoji} ${ITEMS[m.job.item].name} ${MACHINES[m.type].spoil} in the ${MACHINES[m.type].name.toLowerCase()}.`, 'bad', t1);
      else if (n === 4) note(s, '🗑️ More food spoiled in the machines today. The trays were full or nobody collected it.', 'bad', t1);
      m.job = null;
      return;
    }
    if (s.crew.baker) collectJob(s, i, t1, { quiet: true });
    // Marco keeps idle machines going once their trays have room again
    if (!m.job && s.crew.chef) chefRestart(s, i, t1);
  });
  // Back room: the night cook bags finished cooks
  if (s.crew.cook) s.lab.forEach((m, i) => { if (m.job && t1 >= m.job.start + m.job.dur) collectLab(s, i, t1, { quiet: true }); });
  // Customers
  s.custAcc += customersPerHour(s, t0) / 60 * mins;
  while (s.custAcc >= 1) { s.custAcc -= 1; customerVisit(s, t0 + rand() * (t1 - t0), showIt); }
  // Night trade
  if (s.labUnlocked && isNight(t0) && !sealed(s, t0)) {
    s.buyAcc += buyersPerHour(s) / 60 * mins;
    while (s.buyAcc >= 1) { s.buyAcc -= 1; buyerArrives(s, t0 + rand() * (t1 - t0)); }
    if (s.night.courierAt && t1 >= s.night.courierAt) { s.night.courierAt = null; courierArrives(s, t1); }
    if (s.night.rivalAt && t1 >= s.night.rivalAt) { s.night.rivalAt = null; rivalsStrike(s, t1); }
  } else s.buyAcc = 0;
  for (const b of [...s.door]) if (t1 >= b.arrive + b.patience) unattended(s, b, t1);
  // Heat cools; popularity drifts back to the middle; marketing and PR add a little
  const lyingLow = t1 - (s.lastLab || 0) > CFG.lieLowAfterHours * HOUR;
  s.heat = clamp(s.heat - (CFG.heatDecayPerHour * (s.crew.fixer ? 2 : 1) + (lyingLow ? CFG.lieLowPerHour : 0)) * mins / 60, 0, 100);
  s.rep += (s.rep > CFG.popHome ? -1 : 1) * Math.min(Math.abs(s.rep - CFG.popHome), CFG.popDriftPerHour * mins / 60);
  let popDay = s.crew.pr ? CFG.prPopPerDay : 0;
  for (const c of activeCampaigns(s, t0)) popDay += CAMPAIGNS[c.id].pop || 0;
  s.rep = clamp(s.rep + popDay * mins / 1440, 0, 100);
  // Interest on missed payments
  if (s.arrears > 0 && !s.won) {
    const i = s.arrears * CFG.arrearsInterestDaily * mins / 1440;
    s.arrears += i; s.balance += i; s.today.interest += i;
  }
  s.today.peakHeat = Math.max(s.today.peakHeat, s.heat);
  if (s.heat >= 100) bust(s, t1, 'Heat hit the limit and armed police came through the back door.');
  if (!s.labUnlocked && !s.offerPending && t1 >= s.offerAfter) s.offerPending = true;
}

function scheduleNight(s, t) {
  // Tonight's events: maybe a courier, maybe rivals, at some point between 19:00 and 05:00
  const start = nextNightStart(t - HOUR), at = () => start + HOUR + rand() * 10 * HOUR;
  s.night = {
    courierAt: feature(s, 'courier') && rand() < CFG.courierChance ? at() : null,
    rivalAt: feature(s, 'rivals') && rand() < CFG.rivalChance ? at() : null,
  };
}

function rivalsStrike(s, t) {
  if (s.crew.muscle) { addXp(s, 20); return note(s, '💪 A rival crew came round the back. Big Ron saw them off.', 'good', t); }
  let bagsTaken = 0;
  for (const id in s.bags) { const n = Math.floor(s.bags[id] * CFG.rivalRob); s.bags[id] -= n; bagsTaken += n; }
  const cash = Math.round(s.dirty * CFG.rivalRob);
  s.dirty -= cash;
  s.rep = clamp(s.rep - CFG.rivalPop, 0, 100);
  note(s, `👥 A rival crew robbed the back room: £${cash} and ${bagsTaken} bags gone. Muscle would have stopped them.`, 'bad', t);
}

// Busted: a heavy blow, never the end.
function bust(s, t, why) {
  const lawyer = s.crew.lawyer;
  const fineDirty = Math.round(s.dirty * CFG.bustFineDirty * (lawyer ? 0.5 : 1));
  const fineClean = Math.min(Math.max(0, s.clean), CFG.bustFineClean * (lawyer ? 0.5 : 1));
  s.dirty -= fineDirty; s.clean = round2(s.clean - fineClean);
  let bags = 0, kits = 0;
  for (const id in s.bags) { bags += s.bags[id]; s.bags[id] = 0; }
  for (const id in s.kits) { kits += s.kits[id]; s.kits[id] = 0; }
  for (const m of s.lab) m.job = null;
  s.door = [];
  const sealHours = CFG.bustSealHours - (lawyer ? 24 : 0);
  s.sealedUntil = t + sealHours * HOUR;
  s.heat = CFG.bustHeat;
  const pop = s.crew.pr ? CFG.prBustPop : CFG.bustPop;
  s.rep = clamp(s.rep - pop, 0, 100);
  s.scandalUntil = Math.max(s.scandalUntil, t + (CFG.scandalHours - (s.crew.pr ? 48 : 0)) * HOUR);
  const crew = [];
  if (!lawyer) {
    if (s.crew.dealer) { s.crew.dealer = false; crew.push('Jay was charged and is gone'); }
    for (const r of ['lookout', 'cook', 'muscle', 'chemist']) if (s.crew[r] && rand() < CFG.bustCrewQuit) { s.crew[r] = false; crew.push(`${CREW[r].name} quit`); }
  }
  s.stats.busts++;
  note(s, `🚔 Busted. ${why} Fined £${Math.round(fineClean).toLocaleString('en-GB')} plus £${fineDirty.toLocaleString('en-GB')} of dirty cash. ${bags} bags and ${kits} kits seized. `
    + `Police tape on the back room for ${sealHours / 24} days. It's in the papers: popularity -${pop}.${lawyer ? ' Ms Okafor kept the damage down.' : ''}${crew.length ? ' ' + crew.join('; ') + '.' : ''}`, 'bad', t);
}

// Debt collectors' heavies: they break things, take cash, and hurt your name.
function heaviesVisit(s, t) {
  s.stats.visits++;
  if (s.crew.muscle && rand() < 0.5) return note(s, '💪 Grimshaw Recovery sent heavies round in the night. Big Ron sent them packing.', 'good', t);
  const d = s.design, done = [];
  const options = ['decor', 'tiles', 'walls', 'machine', 'till'];
  const n = s.crew.muscle ? 1 : 1 + Math.floor(rand() * 3);
  for (let k = 0; k < n && options.length; k++) {
    const what = options.splice(Math.floor(rand() * options.length), 1)[0];
    if (what === 'decor' && d.decor.length) {
      const c = Math.min(d.decor.length, 1 + Math.floor(rand() * 2));
      for (let j = 0; j < c; j++) d.decor.splice(Math.floor(rand() * d.decor.length), 1);
      done.push(`smashed ${c === 1 ? 'a decoration' : c + ' decorations'}`);
    } else if (what === 'tiles') {
      const cells = allCells('inside');
      for (let j = 0; j < 3 + Math.floor(rand() * 4); j++) { const [cx, cz] = pick(cells); d.floor[cellKey(cx, cz)] = 'cracked'; }
      done.push('cracked floor tiles');
    } else if (what === 'walls') {
      for (let j = 0; j < 1 + Math.floor(rand() * 3); j++) { const key = pick(PANELS); d.wall[key] = 'torn'; delete d.art[key]; }
      done.push('tore down wallpaper');
    } else if (what === 'machine') {
      const working = s.machines.filter(m => !m.broken);
      // They always leave you one machine to work with
      if (working.length > 1) { const m = pick(working); m.broken = true; m.job = null; done.push(`wrecked the ${MACHINES[m.type].name.toLowerCase()}`); }
    } else if (what === 'till' && s.clean > 0) {
      const take = Math.round(s.clean * CFG.tillTake);
      s.clean = round2(s.clean - take);
      done.push(`emptied £${take.toLocaleString('en-GB')} from the till`);
    }
  }
  if (!done.length) done.push('made a mess and a lot of threats');
  const pop = s.crew.pr ? CFG.prHeaviesPop : CFG.heaviesPop;
  s.rep = clamp(s.rep - pop, 0, 100);
  note(s, `🔨 Grimshaw Recovery's heavies came round about the money you owe. They ${done.join(', ')}. Popularity -${pop}.`, 'bad', t);
}

// Every morning at 06:00: bills, payments, police, crew chores, a new day's market.
function rollover(s, t) {
  const td = s.today;
  // The accountant puts the safe amount through before the books close
  if (s.crew.accountant && s.dirty > 0) launder(s, Math.min(s.dirty, launderLeft(s)), true);
  // Bills
  const rent = eff(s, 'noRent') ? 0 : CFG.rent, dayWages = crewWages(s, 'day'), income = eff(s, 'income');
  td.rent = rent; td.wages = dayWages; td.income = income;
  s.clean = round2(s.clean + income);
  const bill = rent + dayWages;
  if (s.clean >= bill) s.clean = round2(s.clean - bill);
  else {
    let left = round2(bill - Math.max(0, s.clean)); s.clean = 0;
    for (const [r, c] of Object.entries(CREW)) if (left > 0 && s.crew[r] && c.shift === 'day') { s.crew[r] = false; left = round2(left - c.wage); note(s, `💸 You couldn't pay ${c.name}, so ${c.name} quit.`, 'bad', t); }
    if (left > 0) { s.arrears = round2(s.arrears + left); s.balance = round2(s.balance + left); s.behind = Math.max(1, s.behind); note(s, `💸 You couldn't cover the rent: £${Math.round(left)} goes on what you owe the bank.`, 'bad', t); }
  }
  const nightWages = s.labUnlocked ? crewWages(s, 'night') : 0;
  if (nightWages) {
    td.nightWages = nightWages;
    const fromDirty = Math.min(nightWages, Math.floor(s.dirty)); s.dirty -= fromDirty;
    const rest = nightWages - fromDirty;
    if (s.clean >= rest) s.clean = round2(s.clean - rest);
    else { s.clean = 0; for (const r of ['fixer', 'lawyer', 'driver', 'chemist', 'muscle', 'lookout', 'cook']) if (s.crew[r]) { s.crew[r] = false; note(s, `💸 You couldn't pay ${CREW[r].name}, so ${CREW[r].name} walked.`, 'bad', t); break; } }
  }
  // Jay's luck on the street
  if (td.jayWorked && s.crew.dealer && rand() < (CFG.dealerArrestPerNight + s.heat * CFG.dealerArrestPerHeat) * (has(s, 'van') ? CFG.vanArrestMult : 1)) {
    s.crew.dealer = false; s.heat = clamp(s.heat + CFG.dealerArrestHeat, 0, 100);
    note(s, `🚔 Jay was picked up on the street. He kept his mouth shut, but he's gone. Heat +${CFG.dealerArrestHeat}.`, 'bad', t);
  }
  if (td.bagsSold || td.labBatches) s.nightsActive++;
  // Police: raids and tax inspections, judged on how hot it got yesterday
  const raid = td.peakHeat >= CFG.raidAt && rand() < (td.peakHeat - 50) / 100 * (1 - eff(s, 'tipoff'));
  const product = Object.values(s.bags).reduce((a, b) => a + b, 0) + Object.values(s.kits).reduce((a, b) => a + b, 0);
  if (raid && product > 0 && rand() < (td.peakHeat - 60) / 60 * (1 - eff(s, 'hide'))) bust(s, t, 'A dawn raid found product in the back room.');
  else if (raid) {
    const lost = Math.round(s.dirty * (has(s, 'safe') ? CFG.safeRaidShare : 0.5));
    for (const id in s.bags) s.bags[id] = 0;
    for (const id in s.kits) s.kits[id] = 0;
    s.dirty -= lost; s.heat = clamp(s.heat - 10, 0, 100);
    note(s, `🚓 Raid! They took every bag and kit and £${lost.toLocaleString('en-GB')} of dirty cash. Not enough to charge you. Yet.`, 'bad', t);
  } else if (td.peakHeat >= CFG.inspectAt && rand() < CFG.inspectChance) {
    if (td.launderHeat > 0) {
      const fine = Math.min(Math.max(0, s.clean), CFG.inspectFine * (s.crew.accountant ? 0.5 : 1));
      s.clean = round2(s.clean - fine); s.heat = clamp(s.heat + 15, 0, 100);
      note(s, `🧾 A tax inspector went through the books. The takings didn't add up: fined £${Math.round(fine)}, heat +15.`, 'bad', t);
    } else { s.heat = clamp(s.heat - 8, 0, 100); note(s, '🧾 A tax inspector went through the books and found nothing. Heat -8.', 'good', t); }
  }
  // The debt collectors, if you're behind
  if (s.arrears > 0 && !s.won) {
    const odds = Math.min(CFG.heaviesMax, CFG.heaviesBase + CFG.heaviesPerMiss * Math.max(0, s.behind - 1));
    if (t - (s.lastVisit || 0) >= CFG.heaviesCooldownDays * DAY && rand() < odds) { s.lastVisit = t; heaviesVisit(s, t); }
  }
  // Payment day
  let payment = null;
  const di = dayIndex(s, t);
  if (!s.won && di >= CFG.firstPaymentDays && (di - CFG.firstPaymentDays) % 7 === 0) {
    const due = nextDue(s);
    if (s.holidayNext) { s.holidayNext = false; payment = { holiday: true, due }; }
    else if (s.clean >= due) {
      s.clean = round2(s.clean - due); s.balance = round2(s.balance - due); s.arrears = 0; s.behind = 0;
      s.paymentsMade++; s.stats.paid += due; payment = { paid: true, due };
      if (s.balance <= 0.5) { s.balance = 0; s.won = true; note(s, '🎉 Debt cleared. Aunt Rosa\'s stall is yours.', 'good', t); }
    } else {
      const part = Math.max(0, Math.floor(s.clean - CFG.keepForStock));
      s.clean = round2(s.clean - part); s.balance = round2(s.balance - part); s.stats.paid += part;
      const short = round2(due - part), penalty = round2(short * CFG.missPenalty);
      s.balance = round2(s.balance + penalty); s.arrears = round2(short + penalty);
      s.strikes++; s.behind++; s.rep = clamp(s.rep - CFG.missPop, 0, 100);
      payment = { paid: false, due, part, penalty };
    }
    note(s, payment.holiday ? '🏖️ Payment holiday: the bank skipped this week.' : payment.paid ? `🏦 Paid the bank £${Math.round(due).toLocaleString('en-GB')}.`
      : `🏦 Couldn't pay the full £${Math.round(due).toLocaleString('en-GB')}: £${payment.part} paid, the rest rolls over with interest.`, payment.paid || payment.holiday ? 'good' : 'bad', t);
  }
  // Crew chores
  if (s.crew.cleaner) {
    let fixed = 0;
    for (const k in s.design.floor) if (fixed < 2 && s.design.floor[k] === 'cracked') { delete s.design.floor[k]; fixed++; }
    for (const k in s.design.wall) if (fixed < 2 && s.design.wall[k] === 'torn') { delete s.design.wall[k]; fixed++; }
  }
  // A new day's market (the manager stocks up after it)
  rollMarket(s);
  if (s.crew.manager) for (const id of menuOf(s)) for (const [k, q] of Object.entries(ITEMS[id].ing)) {
    const want = q * 3; if (s.inv[k] < want && s.clean > 300) buyIngredient(s, k, want - s.inv[k], true);
  }
  // Safety net: broke with nothing to bake
  const canBake = s.recipes.some(id => canMake(s, id) && s.machines.some(m => m.type === ITEMS[id].machine && !m.broken));
  if (s.clean < 30 && !canBake) { s.clean = round2(s.clean + CFG.hardshipGrant); note(s, `🤝 The market traders' association chips in £${CFG.hardshipGrant} so you can buy flour and start again.`, 'good', t); }
  // File yesterday's report and open a new day
  s.reports.push({ day: td.day, ledger: td, payment, level: s.level });
  if (s.reports.length > 10) s.reports.shift();
  s.today = freshLedger(s, t);
  scheduleNight(s, t);
}
