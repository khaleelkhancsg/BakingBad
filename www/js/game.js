// Game rules and state. No DOM in here, so the balance simulator can run it in Node.
import { CFG, ITEMS, VELVET, INGREDIENTS, PRICE_LEVELS, UPGRADES, STAGES, EVENTS,
         LINES, FACES, BUYER_NAMES, START_RECIPES } from './data.js';
import { charmBonus, defaultDesign } from './design.js';

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
export const recipeOf = id => (id === 'velvet' ? VELVET : ITEMS[id]);
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
  (CFG.baseCustomers + s.rep * CFG.repCustomers) * (has(s, 'sign') ? 1.2 : 1) * (s.event?.cust || 1) * charmBonus(s);
export const buyersExpected = s => CFG.buyersBase + Math.min(CFG.buyersGrowMax, s.nightsActive);
export const copChance = s => CFG.copBase + s.heat * CFG.copPerHeat;

export function stationLayout(s, kind) {
  if (kind === 'day') return [
    { stage: 'mix',   n: 1 + (has(s, 'mixer2') ? 1 : 0) },
    { stage: 'proof', n: 2 + (has(s, 'rack2') ? 2 : 0) },
    { stage: 'bake',  n: 2 + (has(s, 'oven2') ? 1 : 0) + (has(s, 'oven3') ? 1 : 0) },
  ];
  return [
    { stage: 'prep', n: 1 },
    { stage: 'cook', n: 1 + (has(s, 'burner2') ? 1 : 0) },
    { stage: 'bag',  n: 1 },
  ];
}

function freshLedger(s) {
  return {
    sales: 0, itemsSold: 0, served: 0, missed: 0, pricedOut: 0, missedBy: {}, repMissLost: 0,
    ingSpent: 0, upgradesSpent: 0, rent: 0, wages: 0, lostBatches: 0, burnt: 0, spoiled: 0,
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
  for (const k in INGREDIENTS) s.market[k] = round2(0.85 + rand() * 0.4);
  if (s.event?.flour) s.market.flour = round2(s.market.flour * s.event.flour);
}

export function newGame() {
  const s = {
    v: SAVE_VERSION, day: 1, phase: 'plan', tab: 'supplies',
    clean: CFG.startClean, dirty: 0, heat: 0, rep: 40,
    balance: CFG.debtTotal, arrears: 0, strikes: 0, paymentsMade: 0,
    inv: { flour: 15, butter: 8, sugar: 6, eggs: 6, chocolate: 4, fruit: 0 },
    kits: 0, bags: 0,
    priceLevel: {}, recipes: [...START_RECIPES], upgrades: {},
    crew: { baker: false, dealer: false },
    labUnlocked: false, offerDay: 2, offerPending: false, nightsActive: 0,
    display: {}, market: {}, event: null,
    today: null, report: null, shift: null,
    design: defaultDesign(),
    over: null, won: false, dealerAssign: 0, stats: { totalBags: 0, totalLaundered: 0, totalSales: 0, paid: 0 },
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
  if (s[u.cash] < u.cost) return toast(`Not enough ${u.cash} cash.`, 'bad');
  s[u.cash] = round2(s[u.cash] - u.cost);
  s.upgrades[u.id] = true;
  if (u.recipe && !s.recipes.includes(u.recipe)) s.recipes.push(u.recipe);
  if (u.cash === 'clean') s.today.upgradesSpent += u.cost;
  toast(`Bought: ${u.name}`, 'good');
}

export function hire(s, role) {
  if (role === 'dealer' && !s.labUnlocked) return;
  s.crew[role] = true;
  toast(role === 'baker' ? 'Priya starts today.' : 'Jay\'s in. He keeps a quarter of what he sells.', 'good');
}
export function fire(s, role) { s.crew[role] = false; }

export function buyKit(s, cash) {
  if (!s.labUnlocked) return;
  if (s[cash] < CFG.kitCost) return toast(`Not enough ${cash} cash.`, 'bad');
  s[cash] = round2(s[cash] - CFG.kitCost);
  s.kits++;
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
  const sh = { kind, t: 0, len: kind === 'day' ? CFG.dayLen : CFG.nightLen, slots: {}, feed: [], buyers: [], customers: [], nextId: 1, next: 0 };
  for (const { stage, n } of stationLayout(s, kind)) sh.slots[stage] = Array.from({ length: n }, emptySlot);
  const expected = kind === 'day' ? customersExpected(s) : buyersExpected(s);
  sh.gap = sh.len / expected;
  sh.next = kind === 'day' ? CFG.openingQuiet + expRand(sh.gap) : 4 + expRand(sh.gap);
  if (kind === 'day') sh.gap = (sh.len - CFG.openingQuiet) / expected;
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
          if (sh.kind === 'day') { s.today.burnt++; toast(`🔥 ${r.name} burnt in the oven!`, 'bad'); }
          else { s.today.kitsWasted++; toast('🔥 A batch of Velvet scorched on the burner. Kit wasted.', 'bad'); }
          continue;
        }
        if (sh.kind === 'day' && s.crew.baker && slot.over > 1) advance(s, stage, i, true);
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
    for (const b of [...sh.buyers]) {
      if (sh.t - b.t0 > CFG.buyerPatience) {
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
    const first = sh.kind === 'day' ? 'mix' : 'prep';
    if (stage !== first) { toast(`Finished batches move here from the ${sh.kind === 'day' ? 'mixer' : 'previous station'}.`); return null; }
    if (sh.kind === 'night') { startVelvet(s, i); return null; }
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
      feed(sh, r.emoji, `+${r.yield} ${r.name} in the case`, 'good');
    } else {
      const n = velvetYield(s);
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

export function startRecipe(s, id, i) {
  const sh = s.shift;
  if (!sh || sh.kind !== 'day' || !s.recipes.includes(id)) return;
  const slot = sh.slots.mix[i];
  if (!slot || slot.item) return;
  if (!canMake(s, id)) return toast('Not enough ingredients. Buy more in the morning.', 'bad');
  const r = ITEMS[id];
  for (const [k, q] of Object.entries(r.ing)) s.inv[k] -= q;
  sh.slots.mix[i] = { item: id, t: 0, dur: r.times.mix, done: false, over: 0 };
}

function startVelvet(s, i) {
  const sh = s.shift;
  if (s.kits < 1) return toast('No kits left. Buy them from Dez in the morning.', 'bad');
  s.kits--;
  sh.slots.prep[i] = { item: 'velvet', t: 0, dur: VELVET.times.prep, done: false, over: 0 };
}

function sellTo(s, id) {
  const d = s.display[id];
  const avail = d.fresh + d.stale;
  if (!avail) return { none: true };
  const lvl = PRICE_LEVELS[s.priceLevel[id]];
  if (rand() > lvl.buy) return { pricey: true };
  let qty = 1 + (rand() < 0.45 ? 1 : 0) + (ITEMS[id].group === 'sweet' && rand() < 0.3 ? 1 : 0);
  qty = Math.min(qty, avail);
  const fresh = Math.min(qty, d.fresh), stale = qty - fresh;
  d.fresh -= fresh; d.stale -= stale;
  const price = itemPrice(s, id);
  const rev = round2(fresh * price + stale * price * CFG.staleMult);
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
  const w = hour < 11 ? { bread: 0.5, pastry: 0.4, sweet: 0.1 }
          : hour < 14 ? { bread: 0.35, pastry: 0.4, sweet: 0.25 }
          : { bread: 0.15, pastry: 0.3, sweet: 0.55 };
  if (s.event?.sweet) { w.sweet *= s.event.sweet; w.bread *= 0.5; }
  const group = weighted(w);
  let options = s.recipes.filter(id => ITEMS[id].group === group);
  if (!options.length) options = [...s.recipes];
  return pick(options);
}

function resolveCustomer(s, c) {
  const sh = s.shift;
  const want = c.want, face = c.face;
  const options = s.recipes.filter(id => ITEMS[id].group === ITEMS[want].group);
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
    feed(sh, face, `${ITEMS[r.id].emoji}×${r.qty} +£${r.rev.toFixed(2)}`, 'good');
    c.res = { kind: 'good', text: `+£${r.rev.toFixed(2)}`, item: r.id, qty: r.qty };
  }
}

function buyerArrives(s) {
  const sh = s.shift;
  const cop = rand() < copChance(s);
  const offLine = cop ? rand() < 0.8 : rand() < 0.12;
  const hint = has(s, 'camera') && (cop ? rand() < 0.5 : rand() < 0.05);
  const want = Number(weighted({ 1: 0.35, 2: 0.4, 3: 0.25 }));
  const b = { id: sh.nextId++, name: pick(BUYER_NAMES), cop, line: pick(offLine ? LINES.off : LINES.normal), hint, want, t0: sh.t, look: newLook() };
  sh.buyers.push(b);
  feed(sh, '🚪', `${b.name} knocks at the back door`, 'info');
}

export function sellToBuyer(s, id) {
  const sh = s.shift;
  const b = sh?.buyers.find(x => x.id === id);
  if (!b) return;
  const qty = Math.min(b.want, s.bags);
  if (qty < 1) return toast('No bags to sell. Cook some first.', 'bad');
  sh.buyers = sh.buyers.filter(x => x !== b);
  s.bags -= qty;
  const cash = qty * CFG.bagDoor;
  s.dirty += cash;
  const t = s.today;
  t.nightSales += cash; t.bagsSold += qty; t.buyersServed++; t.nightOps = true;
  s.stats.totalBags += qty;
  s.heat = clamp(s.heat + CFG.heatPerBag * qty, 0, 100);
  if (b.cop) {
    t.copsServed++;
    s.heat = clamp(s.heat + CFG.copServedHeat, 0, 100);
    toast(`🚨 ${b.name} was undercover. Heat +${CFG.copServedHeat}.`, 'bad');
    feed(sh, '🚨', `${b.name} was a cop`, 'bad');
  } else {
    feed(sh, '💜', `${b.name} ×${qty} +£${cash}`, 'good');
  }
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
    t.wages = s.crew.baker ? CFG.bakerWage : 0;
    s.clean = round2(s.clean - t.rent - t.wages);
    t.launderCap = Math.round(t.sales * launderRatio(s));
    s.stats.totalSales += t.sales;
    s.phase = 'evening';
  } else {
    s.today.buyersLost += sh.buyers.length;
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
    if (rand() < CFG.dealerArrestBase + s.heat * CFG.dealerArrestPerHeat) {
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

  if (t.nightOps) s.nightsActive++;
  s.heat = clamp(s.heat - CFG.heatDecay - (t.nightOps ? 0 : CFG.lieLowBonus), 0, 100);
  s.rep = clamp(s.rep + CFG.repDrift, 0, 100);

  // Police
  if (s.heat >= 100) {
    s.over = { reason: 'arrested', text: 'Armed police come through the back door at dawn. They find the lab, the cash and the bags. It\'s over.' };
  } else if (s.heat >= CFG.raidAt && rand() < (s.heat - 50) / 100) {
    const lostDirty = Math.round(s.dirty / 2);
    if (s.bags + s.kits > 0 && rand() < (s.heat - 60) / 60) {
      s.over = { reason: 'arrested', text: `A dawn raid. This time they find ${s.bags ? s.bags + ' bags' : s.kits + ' kits'} in the back room. You're arrested.` };
    }
    lines.push({ kind: 'bad', text: `🚓 Raid! They took ${s.bags} bags, ${s.kits} kits and £${lostDirty} of dirty cash. Not enough to charge you. Yet.` });
    s.bags = 0; s.kits = 0; s.dirty -= lostDirty;
    s.heat = clamp(s.heat - 10, 0, 100);
  } else if (s.heat >= CFG.inspectAt && rand() < CFG.inspectChance) {
    if (t.launderHeat > 0) {
      s.clean = round2(s.clean - CFG.inspectFine);
      s.heat = clamp(s.heat + 15, 0, 100);
      lines.push({ kind: 'bad', text: `🧾 A tax inspector went through yesterday's books. The takings didn't add up. Fined £${CFG.inspectFine}, heat +15.` });
    } else {
      s.heat = clamp(s.heat - 8, 0, 100);
      lines.push({ kind: 'good', text: '🧾 A tax inspector went through yesterday\'s books and found nothing. Heat -8.' });
    }
  }

  // Next day
  s.day++;
  let payment = null;
  if (!s.over && !s.won && s.day >= CFG.firstPaymentDay && (s.day - CFG.firstPaymentDay) % 7 === 0) {
    const due = nextDue(s);
    if (s.clean >= due) {
      s.clean = round2(s.clean - due);
      s.balance = round2(s.balance - due);
      s.arrears = 0;
      s.paymentsMade++;
      s.stats.paid += due;
      payment = { paid: true, due };
      if (s.balance <= 0.5) { s.balance = 0; s.won = true; }
    } else {
      const penalty = round2(due * CFG.missPenalty);
      s.balance = round2(s.balance + penalty);
      s.arrears = round2(due + penalty);
      s.strikes++;
      payment = { paid: false, due, penalty };
      if (s.strikes >= CFG.maxStrikes) {
        s.over = { reason: 'bank', text: 'Third missed payment. The bank changes the locks on Aunt Rosa\'s stall.' };
      }
    }
  }
  if (!s.labUnlocked && !s.offerPending && s.day >= s.offerDay) s.offerPending = true;

  rollDay(s);
  s.report = { day: s.day - 1, ledger: t, lines, payment, heatFrom: t.start.heat, heatMid: heatBefore, heatTo: s.heat,
               repFrom: t.start.rep, repTo: s.rep, cleanFrom: t.start.clean, dirtyFrom: t.start.dirty };
  s.today = freshLedger(s);
  s.phase = 'report';
}

export function toPlan(s) { if (!s.over) s.phase = 'plan'; }

// Pay the bank early from clean cash. Arrears are cleared first.
export function payBank(s, amount) {
  amount = Math.min(Math.round(amount), Math.ceil(s.balance), Math.floor(s.clean));
  if (amount <= 0) return toast('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - amount);
  s.balance = round2(s.balance - amount);
  s.arrears = Math.max(0, round2(s.arrears - amount));
  s.stats.paid += amount;
  if (s.balance <= 0.5) { s.balance = 0; s.won = true; }
  toast(`Paid the bank £${amount.toLocaleString('en-GB')}.`, 'good');
}
