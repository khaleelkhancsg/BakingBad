// Game rules and state. No DOM in here, so the balance simulator can run it in Node.
import { CFG, ITEMS, VELVET, GOLD, INGREDIENTS, PRICE_LEVELS, UPGRADES, STAGES, EVENTS,
         LINES, FACES, BUYER_NAMES, START_RECIPES, CREW, FEATURES, MACHINES, MACHINE_PRICE_STEP, SPOTS, MACHINE_WALL,
         CAPS, capAt, nextCap, CAMPAIGNS } from './data.js';
import { charmBonus, defaultDesign, allCells, cellKey, PANELS } from './design.js';

export const SAVE_VERSION = 2;

const rand = () => Math.random();
export const pick = a => a[Math.floor(rand() * a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const expRand = mean => -Math.log(1 - rand()) * mean;
const round2 = v => Math.round(v * 100) / 100;
function weighted(obj) {
  let tot = 0;
  for (const k in obj) tot += obj[k];
  let r = rand() * tot;
  for (const k in obj) { r -= obj[k]; if (r <= 0) return k; }
  return Object.keys(obj)[0];
}

let sink = () => {};
export function onToast(fn) { sink = fn; }
function toast(text, kind = 'info') { sink(text, kind); }

export const has = (s, id) => !!s.upgrades[id];
export const recipeOf = id => (id === 'velvet' ? VELVET : id === 'gold' ? GOLD : ITEMS[id]);

// ---------- XP and levels ----------
export const xpToNext = level => CFG.levelBase + CFG.levelStep * (level - 1);
export const unlocked = (s, level) => (s.level || 1) >= (level || 1);
export const feature = (s, id) => unlocked(s, FEATURES.find(f => f.id === id)?.level);
// A finished batch is worth its total stage time: longer, harder recipes give more XP.
export const batchXp = id => Math.max(2, Math.round(Object.values(recipeOf(id).times).reduce((a, b) => a + b, 0) * CFG.xpPerSecond));
export const saleXp = id => Math.max(1, Math.round(ITEMS[id].price / 2.5));
export function addXp(s, n) {
  if (!n) return;
  s.xp += n;
  if (s.today) s.today.xp = (s.today.xp || 0) + n;
  while (s.level < CFG.maxLevel && s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    s.level++;
    const cash = CFG.levelCash * s.level;
    s.clean = round2(s.clean + cash);
    s.levelUps.push(s.level);
    toast(`⬆️ Level ${s.level}! +£${cash}`, 'good');
    learnFree(s);
  }
  if (s.level >= CFG.maxLevel) s.xp = Math.min(s.xp, xpToNext(s.level));
}

// ---------- The menu: which recipes are in the display case ----------
export const menuSlots = s => capAt(CAPS.menu, s.level || 1);
export const menuOf = s => (s.onMenu || s.recipes).filter(id => s.recipes.includes(id)).slice(0, menuSlots(s));
export function toggleMenu(s, id) {
  if (!s.recipes.includes(id)) return;
  const on = s.onMenu.includes(id);
  if (on) {
    if (s.onMenu.length <= 1) return toast('Keep at least one thing on the menu.', 'bad');
    s.onMenu = s.onMenu.filter(x => x !== id);
  } else {
    if (s.onMenu.length >= menuSlots(s)) {
      const nx = nextCap(CAPS.menu, s.level);
      return toast(`You can sell ${menuSlots(s)} things at once${nx ? ` (reach level ${nx.level} for ${nx.amount})` : ''}. Take something off first.`, 'bad');
    }
    s.onMenu.push(id);
  }
}

// ---------- Machines: each kind has its own recipes; how many you may own grows with level ----------
export const machineCount = (s, type) => s.machines.filter(m => m.type === type).length;
export const machineCap = (s, type) => (unlocked(s, MACHINES[type].level) ? capAt(MACHINES[type].caps, s.level) : 0);
export const machineNextCap = (s, type) => nextCap(MACHINES[type].caps, s.level);
export function machinePrice(s, type) {
  const M = MACHINES[type], extra = Math.max(0, machineCount(s, type) - (M.free || 0));
  return Math.round(M.price * (1 + MACHINE_PRICE_STEP * extra) / 10) * 10;
}
export const freeSpots = s => SPOTS.map((_, i) => i).filter(i => !s.machines.some(m => m.spot === i));
export const recipesFor = type => Object.keys(ITEMS).filter(id => ITEMS[id].machine === type);
// Why a machine can't be bought right now (or null if it can).
export function machineBlock(s, type) {
  const M = MACHINES[type];
  if (!unlocked(s, M.level)) return { lock: true, text: `Reach level ${M.level} to unlock the ${M.name.toLowerCase()}` };
  if (machineCount(s, type) >= machineCap(s, type)) {
    const nx = machineNextCap(s, type);
    return { lock: true, text: nx ? `Reach level ${nx.level} to unlock additional ${M.plural}` : `That's as many ${M.plural} as the kitchen takes` };
  }
  if (!freeSpots(s).length) return { lock: true, text: 'No room left in the kitchen' };
  return null;
}
export function buyMachine(s, type) {
  const M = MACHINES[type];
  if (!M) return;
  const block = machineBlock(s, type);
  if (block) return toast(block.text + '.', 'bad');
  const cost = machinePrice(s, type);
  if (s.clean < cost) return toast('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - cost);
  if (s.today) s.today.upgradesSpent += cost;
  const free = freeSpots(s);
  const spot = free.find(i => SPOTS[i].wall === MACHINE_WALL[type]) ?? free[0];
  s.machines.push({ type, spot });
  learnFree(s);
  toast(`New ${M.name.toLowerCase()} installed.`, 'good');
}
// Recipes that come with a machine are learned as soon as you own one and reach their level.
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
  if (!unlocked(s, r.level)) return toast(`${r.name} unlocks at level ${r.level}.`, 'bad');
  if (s.clean < r.cost) return toast('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - r.cost);
  if (s.today) s.today.upgradesSpent += r.cost;
  s.recipes.push(id);
  if (s.onMenu.length < menuSlots(s)) { s.onMenu.push(id); toast(`Learned ${r.name}. It's on sale.`, 'good'); }
  else toast(`Learned ${r.name}. The menu is full: take something off to sell it.`, 'info');
}
export const kitsLeftToday = s => Math.max(0, capAt(CAPS.kits, s.level) - (s.today?.kitsBought || 0));
export const loanAmount = s => capAt(CAPS.loan, s.level);

// ---------- Marketing: campaigns and PR win popularity back ----------
export const campaignCap = s => capAt(CAPS.campaigns, s.level);
export const activeCampaigns = s => (s.campaigns || []).filter(c => c.days > 0);
export const campaignBoost = s => activeCampaigns(s).reduce((a, c) => a + (CAMPAIGNS[c.id]?.cust || 0), 0);
export const scandalFactor = s => (s.scandalDays > 0 ? (s.crew.pr ? CFG.prScandalMult : CFG.scandalMult) : 1);
export function campaignBlock(s, id) {
  const c = CAMPAIGNS[id];
  if (!unlocked(s, c.level)) return { lock: true, text: `Reach level ${c.level} to run ${c.name.toLowerCase()}` };
  if (activeCampaigns(s).some(x => x.id === id)) return { text: 'Running now' };
  if (c.weekly && s.day - s.lastCharity < 7) return { text: `Again in ${7 - (s.day - s.lastCharity)} days` };
  if (activeCampaigns(s).length >= campaignCap(s)) {
    const nx = nextCap(CAPS.campaigns, s.level);
    return { lock: true, text: nx ? `Reach level ${nx.level} to run ${nx.amount} campaigns at once` : 'That\'s as many campaigns as you can run' };
  }
  return null;
}
export function startCampaign(s, id) {
  const c = CAMPAIGNS[id];
  if (!c) return;
  const block = campaignBlock(s, id);
  if (block) return toast(block.text + '.', 'bad');
  if (s.clean < c.price) return toast('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - c.price);
  if (s.today) s.today.upgradesSpent += c.price;
  if (c.once) s.rep = clamp(s.rep + c.once * (s.crew.pr ? 1.25 : 1), 0, 100);
  if (c.heat) s.heat = clamp(s.heat + c.heat, 0, 100);
  if (c.weekly) s.lastCharity = s.day;
  if (c.festival) s.sponsorNext = true;
  s.campaigns = activeCampaigns(s).concat([{ id, days: c.days }]);
  toast(`${c.emoji} ${c.name} is running.`, 'good');
}

// ---------- Broken machines (the heavies' handiwork) ----------
export const machinesOf = (s, type) => s.machines.filter(m => m.type === type);
export const isBroken = (s, type, i) => !!machinesOf(s, type)[i]?.broken;
export const repairCost = type => Math.round(MACHINES[type].price * CFG.repairShare / 10) * 10;
export function repairMachine(s, type, i) {
  const m = machinesOf(s, type)[i];
  if (!m?.broken) return;
  const cost = repairCost(type);
  if (s.clean < cost) return toast('Not enough clean cash for the repair.', 'bad');
  s.clean = round2(s.clean - cost);
  m.broken = false;
  toast(`${MACHINES[type].name} repaired.`, 'good');
}

function startMachines() {
  return [{ type: 'oven', spot: 0 }, { type: 'oven', spot: 1 }, { type: 'mixer', spot: 5 }];
}

// Older saves: fill in everything added since.
export function migrate(s) {
  s.level ||= 1; s.xp ||= 0; s.levelUps ||= [];
  if (!s.machines) {
    // Saves from before machines: rebuild the kitchen from the old oven and mixer upgrades
    const m = startMachines();
    const ovens = (s.upgrades?.oven2 ? 1 : 0) + (s.upgrades?.oven3 ? 1 : 0), mixers = s.upgrades?.mixer2 ? 1 : 0;
    const back = [2, 3], left = [6];
    for (let k = 0; k < ovens; k++) m.push({ type: 'oven', spot: back[k] });
    for (let k = 0; k < mixers; k++) m.push({ type: 'mixer', spot: left[k] });
    s.machines = m;
    if (s.shift?.kind === 'day') { s.shift = null; s.phase = 'plan'; } // the old kind of shift can't carry on
  }
  s.recipes = (s.recipes || [...START_RECIPES]).filter(id => ITEMS[id]);
  if (!s.recipes.includes('pancakes')) s.recipes.push('pancakes');
  if (s.onMenu) s.onMenu = s.onMenu.filter(id => ITEMS[id]);
  s.recipes ||= [...START_RECIPES];
  s.onMenu ||= s.recipes.slice(0, menuSlots(s));
  for (const k in INGREDIENTS) { s.inv[k] ??= 0; s.market[k] ??= 1; }
  for (const id in ITEMS) { s.priceLevel[id] ||= 'normal'; s.display[id] ||= { fresh: 0, stale: 0 }; }
  for (const role in CREW) s.crew[role] ??= false;
  s.gold ??= 0; s.goldKits ??= 0; s.loanDay ??= -99; s.holidayUsed ??= false; s.holidayNext ??= false;
  s.campaigns ||= []; s.scandalDays ??= 0; s.sealedNights ??= 0; s.lastCharity ??= -99; s.sponsorNext ??= false;
  s.behind ??= (s.arrears > 0 ? Math.max(1, s.strikes || 1) : 0);
  s.stats.busts ??= 0; s.stats.visits ??= 0;
  // Nothing ends the game any more: a finished run picks up again
  if (s.over) { s.over = null; s.phase = 'report'; }
  learnFree(s);
  return s;
}
export const velvetYield = s => VELVET.yield + (has(s, 'glass') ? 4 : 0);
export const launderRatio = s => CFG.launderRatio + (has(s, 'catering') ? 0.4 : 0);
export const ingPrice = (s, ing) => round2(INGREDIENTS[ing].base * s.market[ing]);
export const daysToPayment = s => s.day < CFG.firstPaymentDay ? CFG.firstPaymentDay - s.day : 7 - ((s.day - CFG.firstPaymentDay) % 7);
export const nextDue = s => Math.min(s.balance, CFG.weekly + s.arrears);
export const itemPrice = (s, id) => round2(ITEMS[id].price * PRICE_LEVELS[s.priceLevel[id]].mult);
export const batchCost = (s, id) => round2(Object.entries(ITEMS[id].ing).reduce((a, [k, q]) => a + q * ingPrice(s, k), 0));
export const canMake = (s, id) => Object.entries(ITEMS[id].ing).every(([k, q]) => s.inv[k] >= q);
export const batchesPossible = (s, id) => Math.min(...Object.entries(ITEMS[id].ing).map(([k, q]) => Math.floor(s.inv[k] / q)));
export const customersExpected = s =>
  (CFG.baseCustomers + s.rep * CFG.repCustomers) * (has(s, 'sign') ? 1.2 : 1) * (s.event?.cust || 1) * charmBonus(s)
  * (1 + campaignBoost(s)) * scandalFactor(s);
export const buyersExpected = s => CFG.buyersBase + Math.min(CFG.buyersGrowMax, s.nightsActive);
export const copChance = s => CFG.copBase + s.heat * CFG.copPerHeat;

export function stationLayout(s, kind) {
  if (kind === 'day') return Object.keys(MACHINES).map(type => ({ stage: type, n: machineCount(s, type) })).filter(x => x.n > 0);
  return [
    { stage: 'prep', n: 1 },
    { stage: 'cook', n: 1 + (has(s, 'burner2') ? 1 : 0) },
    { stage: 'bag',  n: 1 },
  ];
}

export function machineLayout(s) {
  const seen = {};
  return s.machines.map(m => { const i = seen[m.type] = (seen[m.type] ?? -1) + 1; return { type: m.type, i, spot: SPOTS[m.spot] }; });
}

function freshLedger(s) {
  return {
    sales: 0, itemsSold: 0, served: 0, missed: 0, pricedOut: 0, missedBy: {}, repMissLost: 0,
    ingSpent: 0, upgradesSpent: 0, rent: 0, wages: 0, nightWages: 0, lostBatches: 0, burnt: 0, spoiled: 0, coffees: 0, xp: 0,
    nightEvents: [], pushed: 0, pushedAway: 0, couriers: 0, goldSold: 0, kitsBought: 0,
    laundered: null, launderCap: 0, launderHeat: 0,
    nightOpen: false, nightOps: false, batches: 0, bagsMade: 0, nightSales: 0, bagsSold: 0,
    buyersServed: 0, buyersTurned: 0, buyersLost: 0, copsServed: 0, copsTurned: 0, kitsWasted: 0,
    dealer: null, bribe: null,
    start: { clean: s.clean, dirty: s.dirty, heat: s.heat, rep: s.rep },
  };
}

function rollDay(s) {
  s.event = null;
  let r = rand();
  for (const ev of EVENTS) { if (r < ev.p) { s.event = { ...ev }; break; } r -= ev.p; }
  if (s.sponsorNext) { s.sponsorNext = false; s.event = { ...EVENTS.find(e => e.id === 'festival'), text: '🎪 Your street festival! Your name is on every banner and the market is packed.' }; }
  for (const k in INGREDIENTS) s.market[k] = round2(0.85 + rand() * 0.4);
  if (s.event?.flour) s.market.flour = round2(s.market.flour * s.event.flour);
}

export function newGame() {
  const s = {
    v: SAVE_VERSION, day: 1, phase: 'plan', tab: 'supplies',
    clean: CFG.startClean, dirty: 0, heat: 0, rep: 40,
    balance: CFG.debtTotal, arrears: 0, strikes: 0, paymentsMade: 0,
    inv: Object.assign(Object.fromEntries(Object.keys(INGREDIENTS).map(k => [k, 0])), { flour: 15, butter: 8, sugar: 6, eggs: 6, chocolate: 4, milk: 6 }),
    kits: 0, bags: 0, goldKits: 0, gold: 0,
    level: 1, xp: 0, levelUps: [],
    priceLevel: {}, recipes: [...START_RECIPES], onMenu: [...START_RECIPES], upgrades: {}, machines: startMachines(),
    crew: Object.fromEntries(Object.keys(CREW).map(r => [r, false])),
    loanDay: -99, holidayUsed: false, holidayNext: false,
    campaigns: [], scandalDays: 0, sealedNights: 0, lastCharity: -99, sponsorNext: false, behind: 0,
    labUnlocked: false, offerDay: 2, offerPending: false, nightsActive: 0,
    display: {}, market: {}, event: null,
    today: null, report: null, shift: null,
    design: defaultDesign(),
    over: null, won: false, dealerAssign: 0, stats: { totalBags: 0, totalLaundered: 0, totalSales: 0, paid: 0, busts: 0, visits: 0 },
  };
  for (const id in ITEMS) { s.priceLevel[id] = 'normal'; s.display[id] = { fresh: 0, stale: 0 }; }
  s.display.sourdough.fresh = 4; s.display.croissant.fresh = 6; // Aunt Rosa's last bake
  rollDay(s);
  s.event = null; // a calm first day
  s.today = freshLedger(s);
  return s;
}

// ---------- Morning planning ----------

export function buyIngredient(s, ing, qty) {
  if (!unlocked(s, INGREDIENTS[ing].level)) return toast(`${INGREDIENTS[ing].name} unlocks at level ${INGREDIENTS[ing].level}.`, 'bad');
  const cost = round2(ingPrice(s, ing) * qty);
  if (s.clean < cost) return toast('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - cost);
  s.inv[ing] += qty;
  s.today.ingSpent = round2(s.today.ingSpent + cost);
}

export function setPriceLevel(s, id, lvl) { if (PRICE_LEVELS[lvl]) s.priceLevel[id] = lvl; }

export function upgradeAvailable(s, u) {
  if (has(s, u.id)) return false;
  if (u.lab && !s.labUnlocked) return false;
  if (u.requires && !has(s, u.requires)) return false;
  return true;
}

export function buyUpgrade(s, id) {
  const u = UPGRADES.find(x => x.id === id);
  if (!u || !upgradeAvailable(s, u)) return;
  if (!unlocked(s, u.level)) return toast(`${u.name} unlocks at level ${u.level}.`, 'bad');
  if (s[u.cash] < u.cost) return toast(`Not enough ${u.cash} cash.`, 'bad');
  s[u.cash] = round2(s[u.cash] - u.cost);
  s.upgrades[u.id] = true;
  if (u.recipe && !s.recipes.includes(u.recipe)) {
    s.recipes.push(u.recipe);
    if (s.onMenu.length < menuSlots(s)) s.onMenu.push(u.recipe);
    else toast('The case is full: add it to the menu in 📋 Menu.', 'info');
  }
  if (u.cash === 'clean') s.today.upgradesSpent += u.cost;
  toast(`Bought: ${u.name}`, 'good');
}

export function hire(s, role) {
  const c = CREW[role];
  if (!c || (c.lab && !s.labUnlocked)) return;
  if (!unlocked(s, c.level)) return toast(`${c.name} is available from level ${c.level}.`, 'bad');
  s.crew[role] = true;
  toast(`${c.name} (${c.role.toLowerCase()}) starts ${c.shift === 'night' ? 'tonight' : 'today'}.`, 'good');
}
export const crewWages = (s, shift) => Object.entries(CREW).filter(([r, c]) => s.crew[r] && c.shift === shift).reduce((a, [, c]) => a + c.wage, 0);
export function fire(s, role) { s.crew[role] = false; }

export function buyKit(s, cash, type = 'velvet') {
  if (!s.labUnlocked) return;
  const gold = type === 'gold';
  if (gold && !feature(s, 'gold')) return toast('Velvet Gold unlocks at level 7.', 'bad');
  if (!kitsLeftToday(s)) {
    const nx = nextCap(CAPS.kits, s.level);
    return toast(`Dez won't sell you more than ${capAt(CAPS.kits, s.level)} kits a day${nx ? `. Reach level ${nx.level} for ${nx.amount}` : ''}.`, 'bad');
  }
  const cost = gold ? CFG.goldKitCost : CFG.kitCost;
  if (s[cash] < cost) return toast(`Not enough ${cash} cash.`, 'bad');
  s[cash] = round2(s[cash] - cost);
  s.today.kitsBought++;
  if (gold) s.goldKits++; else s.kits++;
}

// ---------- Bank: loans (level 4) and a payment holiday (level 10) ----------
export const loanReady = s => feature(s, 'loan') && s.day - s.loanDay >= CFG.loanEvery && !s.won;
export function takeLoan(s) {
  if (!loanReady(s)) return toast(feature(s, 'loan') ? 'One loan a week.' : 'Loans unlock at level 4.', 'bad');
  const amount = loanAmount(s);
  s.clean = round2(s.clean + amount);
  s.balance = round2(s.balance + amount * (1 + CFG.loanFee));
  s.loanDay = s.day;
  toast(`Borrowed £${amount.toLocaleString('en-GB')}. The debt goes up £${(amount * (1 + CFG.loanFee)).toLocaleString('en-GB')}.`, 'good');
}
// Restructuring: missed payments fold into the loan (plus a fee) and the collectors are called off.
export const restructureReady = s => s.arrears > 0 && s.behind >= 2 && s.day - (s.lastRestructure ?? -99) >= CFG.restructureEvery;
export function restructure(s) {
  if (!restructureReady(s)) return toast(s.behind < 2 ? 'Only once you are two payments behind.' : 'The bank will only do this once a month.', 'bad');
  const fee = round2(s.arrears * CFG.restructureFee);
  s.balance = round2(s.balance + fee);
  s.arrears = 0; s.behind = 0; s.lastRestructure = s.day;
  toast(`Restructured: your missed payments are folded into the loan (fee £${Math.round(fee)}). The collectors are called off.`, 'good');
}
export function useHoliday(s) {
  if (!feature(s, 'holiday') || s.holidayUsed) return toast('No payment holiday available.', 'bad');
  s.holidayUsed = true; s.holidayNext = true;
  toast('The bank agrees: your next payment is skipped.', 'good');
}

export function bribe(s) {
  if (s.today.bribe) return toast('You already paid someone off today.', 'bad');
  if (s.dirty < CFG.bribeCost) return toast('Not enough dirty cash.', 'bad');
  s.dirty -= CFG.bribeCost;
  if (rand() < CFG.bribeBackfire) {
    s.heat = clamp(s.heat + CFG.bribeBackfireHeat, 0, 100);
    s.today.bribe = 'backfired';
    toast(`The sergeant wasn't for sale. Heat +${CFG.bribeBackfireHeat}.`, 'bad');
  } else {
    s.heat = clamp(s.heat - CFG.bribeHeat, 0, 100);
    s.today.bribe = 'paid';
    toast(`A file goes missing. Heat -${CFG.bribeHeat}.`, 'good');
  }
}

export function answerOffer(s, yes) {
  s.offerPending = false;
  if (yes) {
    s.labUnlocked = true;
    s.kits += 1;
    toast('Dez drops off a kit and shows you the back room.', 'good');
  } else {
    s.offerDay = s.day + 3;
  }
}

// ---------- Shifts (day bakery, night lab) ----------

const emptySlot = () => ({ item: null, t: 0, dur: 0, done: false, over: 0 });

export function startShift(s, kind) {
  if (kind === 'night' && s.sealedNights > 0) return toast(`Police tape on the back room for ${s.sealedNights} more night${s.sealedNights === 1 ? '' : 's'}.`, 'bad');
  const sh = { kind, t: 0, len: kind === 'day' ? CFG.dayLen : CFG.nightLen, slots: {}, feed: [], buyers: [], customers: [], nextId: 1, next: 0 };
  for (const { stage, n } of stationLayout(s, kind)) sh.slots[stage] = Array.from({ length: n }, emptySlot);
  const expected = kind === 'day' ? customersExpected(s) : buyersExpected(s);
  sh.gap = sh.len / expected;
  sh.next = kind === 'day' ? CFG.openingQuiet + expRand(sh.gap) : 4 + expRand(sh.gap);
  if (kind === 'day') sh.gap = (sh.len - CFG.openingQuiet) / expected;
  if (kind === 'night') {
    sh.courierAt = feature(s, 'courier') && rand() < CFG.courierChance ? sh.len * (0.25 + rand() * 0.35) : null;
    sh.rival = feature(s, 'rivals') && rand() < CFG.rivalChance;
    sh.rivalAt = sh.len * (0.45 + rand() * 0.25);
    if (sh.rival) { sh.gap /= CFG.rivalBuyers; sh.feed.push({ face: '👥', text: 'Word is a rival crew is about tonight', kind: 'bad', t: 0 }); }
  }
  s.shift = sh;
  s.phase = kind;
  if (kind === 'night') s.today.nightOpen = true;
}

export function shiftClock(sh) {
  const f = clamp(sh.t / sh.len, 0, 1);
  const h = sh.kind === 'day' ? 8 + 10 * f : (22 + 6 * f) % 24;
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function feed(sh, face, text, kind = 'info') {
  sh.feed.push({ face, text, kind, t: sh.t });
  if (sh.feed.length > 12) sh.feed.shift();
}

export function tick(s, dt) {
  const sh = s.shift;
  if (!sh) return;
  sh.t += dt;
  for (const stage in sh.slots) {
    const arr = sh.slots[stage];
    for (let i = 0; i < arr.length; i++) {
      const slot = arr[i];
      if (!slot.item) continue;
      if (!slot.done) {
        slot.t += dt;
        if (slot.t >= slot.dur) { slot.done = true; slot.over = slot.t - slot.dur; slot.t = slot.dur; }
      } else {
        slot.over += dt;
        if (STAGES[stage].burns && slot.over > CFG.burnAfter) {
          const r = recipeOf(slot.item);
          arr[i] = emptySlot();
          if (sh.kind === 'day') { s.today.burnt++; toast(`${STAGES[stage].spoil === 'melted' ? '💧' : '🔥'} ${r.name} ${STAGES[stage].spoil || 'burnt'} in the ${STAGES[stage].name.toLowerCase()}!`, 'bad'); }
          else { s.today.kitsWasted++; toast('🔥 A batch of Velvet scorched on the burner. Kit wasted.', 'bad'); }
          continue;
        }
        if (slot.over > 1 && ((sh.kind === 'day' && s.crew.baker) || (sh.kind === 'night' && s.crew.cook))) advance(s, stage, i, true);
      }
    }
  }
  const lastArrival = sh.len - (sh.kind === 'day' ? CFG.walkIn + 0.5 : 4);
  while (sh.t >= sh.next && sh.next < lastArrival) {
    if (sh.kind === 'day') customerArrives(s); else buyerArrives(s);
    sh.next += expRand(sh.gap);
  }
  if (sh.kind === 'day') {
    const stay = CFG.walkIn + CFG.browse + CFG.walkOut;
    for (const c of sh.customers) if (!c.res && sh.t - c.t0 >= CFG.walkIn) resolveCustomer(s, c);
    sh.customers = sh.customers.filter(c => sh.t - c.t0 < stay);
  }
  if (sh.kind === 'night') {
    if (sh.courierAt != null && !sh.courierDone && sh.t >= sh.courierAt) { sh.courierDone = true; courierArrives(s); }
    if (sh.rival && !sh.rivalDone && sh.t >= sh.rivalAt) { sh.rivalDone = true; rivalsStrike(s); }
    for (const b of [...sh.buyers]) {
      if (sh.t - b.t0 > (b.patience || CFG.buyerPatience)) {
        sh.buyers = sh.buyers.filter(x => x !== b);
        s.today.buyersLost++;
        feed(sh, '🚪', `${b.name} got tired of waiting`, 'meh');
      }
    }
  }
  if (sh.t >= sh.len) endShift(s);
}

export function tapSlot(s, stage, i) {
  const sh = s.shift;
  const slot = sh?.slots[stage]?.[i];
  if (!slot) return null;
  if (!slot.item) {
    if (sh.kind === 'day') {
      if (isBroken(s, stage, i)) { toast(`This ${STAGES[stage].name.toLowerCase()} is broken. Repair it from its menu in the morning.`, 'bad'); return null; }
      return { pick: true, stage };
    }
    if (stage !== 'prep') { toast('Finished batches move here from the previous station.'); return null; }
    if (sh.kind === 'night') {
      if (s.kits > 0 && s.goldKits > 0) return { pickLab: true };
      startVelvet(s, i, s.kits > 0 || !s.goldKits ? 'velvet' : 'gold');
      return null;
    }
    return { pick: true };
  }
  if (!slot.done) { toast(`${STAGES[stage].verb}… ${Math.ceil(slot.dur - slot.t)}s left`); return null; }
  advance(s, stage, i, false);
  return null;
}

function advance(s, stage, i, silent) {
  const sh = s.shift;
  const slot = sh.slots[stage][i];
  const r = recipeOf(slot.item);
  const idx = r.stages.indexOf(stage);
  if (idx === r.stages.length - 1) {
    if (sh.kind === 'day') {
      s.display[slot.item].fresh += r.yield;
      addXp(s, batchXp(slot.item));
      feed(sh, r.emoji, `+${r.yield} ${r.name} · +${batchXp(slot.item)} xp`, 'good');
    } else if (slot.item === 'gold') {
      s.gold += GOLD.yield;
      s.today.batches++; s.today.bagsMade += GOLD.yield; s.today.nightOps = true;
      s.heat = clamp(s.heat + CFG.heatPerBatch * 2, 0, 100);
      addXp(s, CFG.xpGoldBatch);
      feed(sh, '💛', `+${GOLD.yield} bags of Velvet Gold`, 'good');
    } else {
      const n = velvetYield(s);
      addXp(s, CFG.xpVelvetBatch);
      s.bags += n;
      s.today.batches++;
      s.today.bagsMade += n;
      s.today.nightOps = true;
      s.heat = clamp(s.heat + CFG.heatPerBatch, 0, 100);
      feed(sh, '💜', `+${n} bags of Velvet`, 'good');
    }
    sh.slots[stage][i] = emptySlot();
    return true;
  }
  const nextStage = r.stages[idx + 1];
  const j = sh.slots[nextStage].findIndex(x => !x.item);
  if (j < 0) {
    if (!silent) toast(`No free ${STAGES[nextStage].name.toLowerCase()} slot. Wait for one to clear.`, 'bad');
    return false;
  }
  sh.slots[nextStage][j] = { item: slot.item, t: 0, dur: r.times[nextStage], done: false, over: 0 };
  sh.slots[stage][i] = emptySlot();
  return true;
}

export function startRecipe(s, id, stage, i) {
  const sh = s.shift;
  const r = ITEMS[id];
  if (!sh || sh.kind !== 'day' || !r || !s.recipes.includes(id) || r.machine !== stage) return;
  const slot = sh.slots[stage]?.[i];
  if (!slot || slot.item || isBroken(s, stage, i)) return;
  if (!canMake(s, id)) return toast('Not enough ingredients. Buy more in the morning.', 'bad');
  for (const [k, q] of Object.entries(r.ing)) s.inv[k] -= q;
  sh.slots[stage][i] = { item: id, t: 0, dur: r.times[stage], done: false, over: 0 };
}

export function startVelvet(s, i, product = 'velvet') {
  const sh = s.shift;
  if (!sh || sh.kind !== 'night' || sh.slots.prep[i]?.item) return;
  const gold = product === 'gold';
  if (gold ? s.goldKits < 1 : s.kits < 1) return toast('No kits left. Buy them from Dez in the morning.', 'bad');
  if (gold) s.goldKits--; else s.kits--;
  sh.slots.prep[i] = { item: gold ? 'gold' : 'velvet', t: 0, dur: (gold ? GOLD : VELVET).times.prep, done: false, over: 0 };
}

function sellTo(s, id) {
  const d = s.display[id];
  const avail = d.fresh + d.stale;
  if (!avail) return { none: true };
  const lvl = PRICE_LEVELS[s.priceLevel[id]];
  const buy = s.crew.cashier ? lvl.buy + (1 - lvl.buy) / 2 : lvl.buy;
  if (rand() > buy) return { pricey: true };
  let qty = 1 + (rand() < 0.45 ? 1 : 0) + (ITEMS[id].group === 'sweet' && rand() < 0.3 ? 1 : 0);
  qty = Math.min(qty, avail);
  const fresh = Math.min(qty, d.fresh), stale = qty - fresh;
  d.fresh -= fresh; d.stale -= stale;
  const price = itemPrice(s, id) * (s.crew.cashier ? 1 + CFG.cashierBonus : 1);
  let rev = round2(fresh * price + stale * price * CFG.staleMult);
  let xp = qty * saleXp(id);
  addXp(s, xp);
  s.clean = round2(s.clean + rev);
  const t = s.today;
  t.sales = round2(t.sales + rev); t.itemsSold += qty; t.served++;
  s.rep = clamp(s.rep + CFG.repServed + lvl.rep + CFG.repStale * stale, 0, 100);
  return { qty, rev, id };
}

// Looks are stored so a customer keeps the same appearance after a reload.
const newLook = () => ({ skin: Math.floor(rand() * 5), shirt: Math.floor(rand() * 10), hair: Math.floor(rand() * 6),
  pants: Math.floor(rand() * 5), h: round2(0.9 + rand() * 0.2), hat: rand() < 0.2 });

function customerArrives(s) {
  const sh = s.shift;
  const used = new Set(sh.customers.map(c => c.spot));
  const free = [0, 1, 2, 3, 4, 5].filter(i => !used.has(i));
  sh.customers.push({ id: sh.nextId++, t0: sh.t, look: newLook(), spot: free.length ? pick(free) : Math.floor(rand() * 6),
    face: pick(FACES), want: chooseWant(s), res: null });
}

function chooseWant(s) {
  const sh = s.shift;
  const hour = 8 + 10 * sh.t / sh.len;
  const w = hour < 11 ? { bread: 0.38, pastry: 0.3, drink: 0.22, sweet: 0.06, savory: 0.04, cold: 0 }
          : hour < 14 ? { bread: 0.2, pastry: 0.25, drink: 0.15, sweet: 0.12, savory: 0.25, cold: 0.05 }
          : { bread: 0.08, pastry: 0.22, drink: 0.15, sweet: 0.33, savory: 0.07, cold: 0.15 };
  if (s.event?.sweet) { w.sweet *= s.event.sweet; w.cold *= 3; w.bread *= 0.5; }
  const group = weighted(w);
  const menu = menuOf(s);
  let options = menu.filter(id => ITEMS[id].group === group);
  if (!options.length) options = [...menu];
  return pick(options);
}

function resolveCustomer(s, c) {
  const sh = s.shift;
  const want = c.want, face = c.face;
  const options = menuOf(s).filter(id => ITEMS[id].group === ITEMS[want].group);
  let r = sellTo(s, want);
  if (r.none) {
    const subs = options.filter(id => id !== want && s.display[id].fresh + s.display[id].stale > 0);
    if (subs.length && rand() < 0.5) r = sellTo(s, pick(subs));
  }
  const W = ITEMS[want];
  if (r.none) {
    s.today.missed++;
    s.today.missedBy[want] = (s.today.missedBy[want] || 0) + 1;
    if (s.today.repMissLost < CFG.repMissCap) {
      s.today.repMissLost -= CFG.repMissed;
      s.rep = clamp(s.rep + CFG.repMissed, 0, 100);
    }
    feed(sh, face, `wanted ${W.emoji}, none left`, 'bad');
    c.res = { kind: 'bad', text: `no ${W.emoji}` };
  } else if (r.pricey) {
    s.today.pricedOut++;
    s.rep = clamp(s.rep + CFG.repPricey, 0, 100);
    feed(sh, face, `${W.emoji} too pricey`, 'meh');
    c.res = { kind: 'meh', text: `${W.emoji} too dear` };
  } else {
    // Plenty of people grab a drink with their food, if there's one in the case
    if (ITEMS[r.id].group !== 'drink' && rand() < CFG.drinkAddOn) {
      const drinks = menuOf(s).filter(id => ITEMS[id].group === 'drink' && s.display[id].fresh + s.display[id].stale > 0);
      if (drinks.length) {
        const d = pick(drinks);
        const dd = s.display[d], fresh = dd.fresh > 0;
        if (fresh) dd.fresh--; else dd.stale--;
        const p = itemPrice(s, d) * (fresh ? 1 : CFG.staleMult) * (s.crew.cashier ? 1 + CFG.cashierBonus : 1);
        s.clean = round2(s.clean + p); s.today.sales = round2(s.today.sales + p); s.today.itemsSold++; s.today.drinksAdded = (s.today.drinksAdded || 0) + 1;
        r.rev = round2(r.rev + p);
        addXp(s, saleXp(d));
      }
    }
    feed(sh, face, `${ITEMS[r.id].emoji}×${r.qty} +£${r.rev.toFixed(2)}`, 'good');
    c.res = { kind: 'good', text: `+£${r.rev.toFixed(2)}`, item: r.id, qty: r.qty };
  }
}

function buyerArrives(s) {
  const sh = s.shift;
  const product = feature(s, 'gold') && rand() < CFG.goldShare ? 'gold' : 'velvet';
  const cop = rand() < copChance(s) + (product === 'gold' ? CFG.goldCopExtra : 0);
  const offLine = cop ? rand() < 0.8 : rand() < 0.12;
  const hint = (has(s, 'camera') && (cop ? rand() < 0.5 : rand() < 0.05))
    || (s.crew.lookout && (cop ? rand() < CFG.lookoutCatch : rand() < CFG.lookoutFalse));
  const want = product === 'gold' ? Number(weighted({ 1: 0.6, 2: 0.4 })) : Number(weighted({ 1: 0.35, 2: 0.4, 3: 0.25 }));
  const b = { id: sh.nextId++, name: pick(BUYER_NAMES), cop, line: pick(offLine ? LINES.off : LINES.normal), hint, want, product, t0: sh.t, look: newLook() };
  sh.buyers.push(b);
  feed(sh, '🚪', `${b.name} knocks at the back door`, 'info');
}

export const bagPrice = b => (b.courier ? CFG.courierPrice : b.product === 'gold' ? CFG.goldBagDoor : CFG.bagDoor);
export const stockFor = (s, b) => (b.product === 'gold' ? s.gold : s.bags);

export function sellToBuyer(s, id, push = false) {
  const sh = s.shift;
  const b = sh?.buyers.find(x => x.id === id);
  if (!b) return;
  const gold = b.product === 'gold';
  const have = stockFor(s, b);
  if (b.courier && have < b.want) return toast(`The courier wants all ${b.want} bags at once.`, 'bad');
  const qty = Math.min(b.want, have);
  if (qty < 1) return toast(gold ? 'No Velvet Gold to sell.' : 'No bags to sell. Cook some first.', 'bad');
  const t = s.today;
  push = push && !b.courier && feature(s, 'haggle');
  if (push) {
    t.pushed++;
    // Ordinary buyers sometimes walk off at a higher price. Undercover officers never argue.
    if (!b.cop && rand() < CFG.pushRefuse) {
      sh.buyers = sh.buyers.filter(x => x !== b);
      t.pushedAway++;
      feed(sh, '🚪', `${b.name} won't pay that and leaves`, 'meh');
      return toast(`${b.name} won't pay that and leaves.`, 'bad');
    }
  }
  sh.buyers = sh.buyers.filter(x => x !== b);
  if (gold) s.gold -= qty; else s.bags -= qty;
  const cash = Math.round(qty * bagPrice(b) * (push ? CFG.pushMult : 1));
  s.dirty += cash;
  t.nightSales += cash; t.bagsSold += qty; t.buyersServed++; t.nightOps = true;
  if (gold) t.goldSold += qty;
  s.stats.totalBags += qty;
  s.heat = clamp(s.heat + CFG.heatPerBag * qty, 0, 100);
  addXp(s, qty * (gold ? CFG.xpGoldBag : CFG.xpBag) + (b.courier ? CFG.xpCourier : 0));
  if (b.courier) {
    t.couriers++;
    s.heat = clamp(s.heat + CFG.courierHeat, 0, 100);
    feed(sh, '📦', `Courier took ${qty} bags · +£${cash}`, 'good');
    return toast(`📦 Bulk order done: +£${cash}.`, 'good');
  }
  if (b.cop) {
    t.copsServed++;
    s.heat = clamp(s.heat + CFG.copServedHeat, 0, 100);
    toast(`🚨 ${b.name} was undercover. Heat +${CFG.copServedHeat}.`, 'bad');
    feed(sh, '🚨', `${b.name} was a cop`, 'bad');
  } else {
    feed(sh, gold ? '💛' : '💜', `${b.name} ×${qty} +£${cash}${push ? ' (haggled)' : ''}`, 'good');
  }
}

// Dez's courier (level 5): a bulk order, all at once, no undercover risk, a bit more heat.
function courierArrives(s) {
  const sh = s.shift;
  const want = CFG.courierMin + Math.floor(rand() * (CFG.courierMax - CFG.courierMin + 1));
  sh.buyers.push({ id: sh.nextId++, name: "Dez's courier", courier: true, cop: false, product: 'velvet', want, hint: false,
    line: `Dez sent me. ${want} bags, all at once, and I'm gone.`, t0: sh.t, patience: CFG.courierPatience, look: newLook() });
  feed(sh, '📦', `A courier wants ${want} bags`, 'info');
  toast(`📦 Dez's courier is at the back door for ${want} bags.`, 'info');
}

// Rival crews (level 9): they try to rob you unless your muscle is on.
function rivalsStrike(s) {
  const sh = s.shift, t = s.today;
  if (s.crew.muscle) {
    addXp(s, CFG.xpRival);
    feed(sh, '💪', 'Big Ron saw off a rival crew', 'good');
    t.nightEvents.push({ kind: 'good', text: '💪 A rival crew came round the back. Big Ron saw them off.' });
    return toast('💪 Big Ron saw off a rival crew.', 'good');
  }
  const cash = Math.round(s.dirty * CFG.rivalRob), bags = Math.floor(s.bags * CFG.rivalRob);
  s.dirty -= cash; s.bags -= bags;
  s.heat = clamp(s.heat + 3, 0, 100);
  s.rep = clamp(s.rep - CFG.rivalPop, 0, 100);
  feed(sh, '👥', `Rivals took £${cash} and ${bags} bags`, 'bad');
  t.nightEvents.push({ kind: 'bad', text: `👥 A rival crew robbed the back room: £${cash} and ${bags} bags gone. Muscle would have stopped them.` });
  toast(`👥 Robbed! A rival crew took £${cash} and ${bags} bags.`, 'bad');
}

export function turnAway(s, id) {
  const sh = s.shift;
  const b = sh?.buyers.find(x => x.id === id);
  if (!b) return;
  sh.buyers = sh.buyers.filter(x => x !== b);
  if (b.cop) s.today.copsTurned++; else s.today.buyersTurned++;
  feed(sh, '🚪', `You sent ${b.name} away`, 'meh');
}

export function endShift(s) {
  const sh = s.shift;
  if (!sh) return;
  for (const stage in sh.slots) {
    for (let i = 0; i < sh.slots[stage].length; i++) {
      const slot = sh.slots[stage][i];
      if (!slot.item) continue;
      const r = recipeOf(slot.item);
      if (slot.done && r.stages.at(-1) === stage) { advance(s, stage, i, true); continue; }
      if (sh.kind === 'day') s.today.lostBatches++; else s.today.kitsWasted++;
    }
  }
  if (sh.kind === 'day') {
    for (const c of sh.customers) if (!c.res) resolveCustomer(s, c);
    const t = s.today;
    t.rent = CFG.rent;
    t.wages = crewWages(s, 'day');
    const bill = t.rent + t.wages;
    if (s.clean >= bill) s.clean = round2(s.clean - bill);
    else {
      let left = round2(bill - Math.max(0, s.clean));
      s.clean = 0;
      // Day crew who can't be paid walk out; the rent goes on the bank's tab
      for (const [r, c] of Object.entries(CREW)) if (left > 0 && s.crew[r] && c.shift === 'day') { s.crew[r] = false; left = round2(left - c.wage); t.nightEvents.push({ kind: 'bad', text: `💸 You couldn't pay ${c.name} today, so ${c.name} quit.` }); }
      if (left > 0) { s.arrears = round2(s.arrears + left); s.balance = round2(s.balance + left); s.behind = Math.max(1, s.behind); t.nightEvents.push({ kind: 'bad', text: `💸 You couldn't cover the rent. £${Math.round(left)} goes on what you owe the bank.` }); }
    }
    t.launderCap = Math.round(t.sales * launderRatio(s));
    s.stats.totalSales += t.sales;
    s.phase = 'evening';
  } else {
    s.today.buyersLost += sh.buyers.length;
    const w = crewWages(s, 'night');
    if (w) {
      s.today.nightWages = w;
      const fromDirty = Math.min(w, Math.floor(s.dirty));
      s.dirty -= fromDirty;
      const rest = w - fromDirty;
      if (s.clean >= rest) s.clean = round2(s.clean - rest);
      else if (rest > 0) {
        s.clean = 0;
        for (const r of ['muscle', 'lookout', 'cook']) if (s.crew[r]) { s.crew[r] = false; s.today.nightEvents.push({ kind: 'bad', text: `💸 You couldn't pay ${CREW[r].name}, so ${CREW[r].name} walked.` }); break; }
      }
    }
    s.dealerAssign = s.crew.dealer ? s.bags : 0;
    s.phase = 'nightEnd';
  }
  s.shift = null;
}

// ---------- Evening ----------

export function launder(s, amount) {
  const t = s.today;
  if (t.laundered !== null) return;
  amount = clamp(Math.round(amount), 0, Math.floor(s.dirty));
  t.laundered = amount;
  s.dirty -= amount;
  s.clean = round2(s.clean + amount);
  s.stats.totalLaundered += amount;
  const excess = amount - t.launderCap;
  if (excess > 0) {
    t.launderHeat = Math.round(Math.min(40, CFG.launderHeat * excess / Math.max(t.launderCap, 50)));
    s.heat = clamp(s.heat + t.launderHeat, 0, 100);
  }
}

export const launderHeatFor = (s, amount) => {
  const excess = amount - s.today.launderCap;
  return excess > 0 ? Math.round(Math.min(40, CFG.launderHeat * excess / Math.max(s.today.launderCap, 50))) : 0;
};

export function setDealerAssign(s, n) { s.dealerAssign = clamp(Math.round(n), 0, s.bags); }

// ---------- Overnight: dealer, heat, raids, payments, next day ----------

export function goHome(s) {
  const t = s.today;
  const lines = [];
  const heatBefore = s.heat;

  // Dealer on the street
  if (s.crew.dealer && s.dealerAssign > 0) {
    const n = Math.min(s.dealerAssign, s.bags);
    s.bags -= n;
    if (rand() < (CFG.dealerArrestBase + s.heat * CFG.dealerArrestPerHeat) * (has(s, 'van') ? CFG.vanArrestMult : 1)) {
      s.crew.dealer = false;
      s.heat = clamp(s.heat + CFG.dealerArrestHeat, 0, 100);
      t.dealer = { n, arrested: true };
      lines.push({ kind: 'bad', text: `🚔 Jay was picked up with ${n} bags. He kept his mouth shut, but he's gone. Heat +${CFG.dealerArrestHeat}.` });
    } else {
      const cash = Math.round(n * CFG.bagStreet * (1 - CFG.dealerCut));
      s.dirty += cash;
      s.heat = clamp(s.heat + CFG.heatPerBag * n, 0, 100);
      t.dealer = { n, cash };
      s.stats.totalBags += n;
      addXp(s, n * CFG.xpDealerBag);
      lines.push({ kind: 'good', text: `🧢 Jay sold ${n} bags on the street. Your share: £${cash}.` });
    }
  }
  s.dealerAssign = 0;

  // Goods in the case go a day older
  for (const id in s.display) {
    const d = s.display[id];
    t.spoiled += d.stale;
    d.stale = d.fresh;
    d.fresh = 0;
  }

  lines.push(...t.nightEvents);
  if (t.nightOps) s.nightsActive++;
  const heatPeak = s.heat; // the police act on how hot it got, before it cools overnight
  s.heat = clamp(s.heat - CFG.heatDecay - (t.nightOps ? 0 : CFG.lieLowBonus), 0, 100);
  s.rep = clamp(s.rep + (s.rep > CFG.popHome ? CFG.repDrift : -CFG.repDrift), 0, 100); // drifts back towards the middle

  // Marketing, PR and scandals tick over
  for (const c of activeCampaigns(s)) { s.rep = clamp(s.rep + (CAMPAIGNS[c.id].pop || 0), 0, 100); c.days--; }
  s.campaigns = activeCampaigns(s);
  if (s.crew.pr) s.rep = clamp(s.rep + CFG.prPopPerDay, 0, 100);
  if (s.scandalDays > 0) s.scandalDays--;
  if (s.sealedNights > 0) s.sealedNights--;

  // Police
  const raid = heatPeak < 100 && s.heat >= CFG.raidAt && rand() < (s.heat - 50) / 100;
  const found = raid && s.bags + s.kits + s.gold + s.goldKits > 0 && rand() < (s.heat - 60) / 60;
  if (heatPeak >= 100) {
    bust(s, lines, 'Heat hit the limit and armed police came through the back door at dawn.');
  } else if (found) {
    bust(s, lines, 'A dawn raid found product in the back room.');
  } else if (raid) {
    const lostDirty = Math.round(s.dirty * (has(s, 'safe') ? CFG.safeRaidShare : 0.5));
    lines.push({ kind: 'bad', text: `🚓 Raid! They took ${s.bags + s.gold} bags, ${s.kits + s.goldKits} kits and £${lostDirty} of dirty cash${has(s, 'safe') ? ' (the safe kept the rest)' : ''}. Not enough to charge you. Yet.` });
    s.bags = 0; s.kits = 0; s.gold = 0; s.goldKits = 0; s.dirty -= lostDirty;
    s.heat = clamp(s.heat - 10, 0, 100);
  } else if (s.heat >= CFG.inspectAt && rand() < CFG.inspectChance) {
    if (t.launderHeat > 0) {
      s.clean = round2(Math.max(0, s.clean - CFG.inspectFine));
      s.heat = clamp(s.heat + 15, 0, 100);
      lines.push({ kind: 'bad', text: `🧾 A tax inspector went through yesterday's books. The takings didn't add up. Fined £${CFG.inspectFine}, heat +15.` });
    } else {
      s.heat = clamp(s.heat - 8, 0, 100);
      lines.push({ kind: 'good', text: '🧾 A tax inspector went through yesterday\'s books and found nothing. Heat -8.' });
    }
  }

  // Behind with the bank: interest builds every day, and Grimshaw Recovery may send someone round
  if (s.arrears > 0 && !s.won) {
    const interest = round2(s.arrears * CFG.arrearsInterest);
    s.arrears = round2(s.arrears + interest); s.balance = round2(s.balance + interest);
    t.interest = interest;
    lines.push({ kind: 'meh', text: `📈 You're behind with the bank: £${interest.toFixed(2)} interest added. You owe £${Math.round(s.arrears).toLocaleString('en-GB')} in missed payments.` });
    const odds = Math.min(CFG.heaviesMax, CFG.heaviesBase + CFG.heaviesPerMiss * Math.max(0, s.behind - 1));
    if (s.day - (s.lastVisit ?? -99) >= CFG.heaviesCooldown && rand() < odds) { s.lastVisit = s.day; heaviesVisit(s, lines); }
  }

  // Next day
  s.day++;
  let payment = null;
  if (!s.won && s.day >= CFG.firstPaymentDay && (s.day - CFG.firstPaymentDay) % 7 === 0) {
    const due = nextDue(s);
    if (s.holidayNext) {
      s.holidayNext = false;
      payment = { holiday: true, due };
    } else if (s.clean >= due) {
      s.clean = round2(s.clean - due);
      s.balance = round2(s.balance - due);
      s.arrears = 0; s.behind = 0;
      s.paymentsMade++;
      s.stats.paid += due;
      payment = { paid: true, due };
      if (s.balance <= 0.5) { s.balance = 0; s.won = true; }
    } else {
      const part = Math.max(0, Math.floor(s.clean - CFG.keepForStock));
      s.clean = round2(s.clean - part);
      s.balance = round2(s.balance - part);
      s.stats.paid += part;
      const short = round2(due - part), penalty = round2(short * CFG.missPenalty);
      s.balance = round2(s.balance + penalty);
      s.arrears = round2(short + penalty);
      s.strikes++; s.behind++;
      s.rep = clamp(s.rep - CFG.missPop, 0, 100);
      payment = { paid: false, due, part, penalty };
    }
  }
  if (!s.labUnlocked && !s.offerPending && s.day >= s.offerDay) s.offerPending = true;
  const canBake = s.recipes.some(id => canMake(s, id) && machinesOf(s, ITEMS[id].machine).some(m => !m.broken));
  if (s.clean < 30 && !canBake) {
    s.clean = round2(s.clean + CFG.hardshipGrant);
    lines.push({ kind: 'good', text: `🤝 You're broke and the shelves are bare. The market traders' association chips in £${CFG.hardshipGrant} so you can buy flour and start again.` });
  }

  rollDay(s);
  s.report = { day: s.day - 1, ledger: t, lines, payment, xp: t.xp, level: s.level, heatFrom: t.start.heat, heatMid: heatBefore, heatTo: s.heat,
               repFrom: t.start.rep, repTo: s.rep, cleanFrom: t.start.clean, dirtyFrom: t.start.dirty };
  s.today = freshLedger(s);
  s.phase = 'report';
}

export function toPlan(s) { s.phase = 'plan'; }

// Busted: a heavy blow, never the end. Fines, everything seized, the back room sealed, a scandal.
function bust(s, lines, why) {
  const fineDirty = Math.round(s.dirty * CFG.bustFineDirty);
  s.dirty -= fineDirty;
  s.clean = round2(Math.max(0, s.clean - CFG.bustFineClean));
  const bags = s.bags + s.gold, kits = s.kits + s.goldKits;
  s.bags = s.gold = s.kits = s.goldKits = 0;
  s.sealedNights = CFG.bustSealNights;
  s.heat = CFG.bustHeat;
  const pop = s.crew.pr ? CFG.prBustPop : CFG.bustPop;
  s.rep = clamp(s.rep - pop, 0, 100);
  s.scandalDays = Math.max(s.scandalDays, CFG.scandalDays - (s.crew.pr ? 2 : 0));
  const crew = [];
  if (s.crew.dealer) { s.crew.dealer = false; crew.push('Jay was charged and is gone'); }
  for (const r of ['lookout', 'cook', 'muscle']) if (s.crew[r] && rand() < CFG.bustCrewQuit) { s.crew[r] = false; crew.push(`${CREW[r].name} quit`); }
  s.stats.busts++;
  lines.push({ kind: 'bad', big: true, text: `🚔 <b>Busted.</b> ${why} Fined £${CFG.bustFineClean.toLocaleString('en-GB')} plus £${fineDirty.toLocaleString('en-GB')} of dirty cash. `
    + `${bags} bags and ${kits} kits seized. Police tape on the back room for ${CFG.bustSealNights} nights. `
    + `It's in the papers: popularity -${pop}${s.crew.pr ? ' (Mel kept it short)' : ''}, and a scandal keeps customers away for a few days.${crew.length ? ' ' + crew.join('; ') + '.' : ''}` });
}

// Debt collectors' heavies: they break things, take cash, and hurt your name.
function heaviesVisit(s, lines) {
  s.stats.visits++;
  if (s.crew.muscle && rand() < 0.5) {
    lines.push({ kind: 'good', text: '💪 Grimshaw Recovery sent heavies round in the night. Big Ron sent them packing.' });
    return;
  }
  const d = s.design, done = [];
  const options = ['decor', 'tiles', 'walls', 'machine', 'till'];
  const n = s.crew.muscle ? 1 : 1 + Math.floor(rand() * 3);
  for (let k = 0; k < n && options.length; k++) {
    const what = options.splice(Math.floor(rand() * options.length), 1)[0];
    if (what === 'decor' && d.decor.length) {
      const smashed = [];
      for (let j = 0; j < 1 + Math.floor(rand() * 2) && d.decor.length; j++) smashed.push(d.decor.splice(Math.floor(rand() * d.decor.length), 1)[0].type);
      done.push(`smashed ${smashed.length === 1 ? 'a decoration' : smashed.length + ' decorations'}`);
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
      if (working.length > 1) { const m = pick(working); m.broken = true; done.push(`wrecked ${/^[aeiou]/i.test(MACHINES[m.type].name) ? 'an' : 'a'} ${MACHINES[m.type].name.toLowerCase()}`); }
    } else if (what === 'till' && s.clean > 0) {
      const take = Math.round(s.clean * CFG.tillTake);
      s.clean = round2(s.clean - take);
      done.push(`emptied £${take.toLocaleString('en-GB')} from the till`);
    }
  }
  if (!done.length) done.push('made a mess and a lot of threats');
  const pop = s.crew.pr ? CFG.prHeaviesPop : CFG.heaviesPop;
  s.rep = clamp(s.rep - pop, 0, 100);
  lines.push({ kind: 'bad', text: `🔨 Grimshaw Recovery's heavies came round in the night about the money you owe. They ${done.join(', ')}. Word gets round: popularity -${pop}.` });
}

// Pay the bank early from clean cash. Arrears are cleared first.
export function payBank(s, amount) {
  amount = Math.min(Math.round(amount), Math.ceil(s.balance), Math.floor(s.clean));
  if (amount <= 0) return toast('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - amount);
  s.balance = round2(s.balance - amount);
  s.arrears = Math.max(0, round2(s.arrears - amount));
  if (s.arrears <= 0) s.behind = 0;
  s.stats.paid += amount;
  if (s.balance <= 0.5) { s.balance = 0; s.won = true; }
  toast(`Paid the bank £${amount.toLocaleString('en-GB')}.`, 'good');
}
