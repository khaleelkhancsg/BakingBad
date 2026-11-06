// Game rules and state, running on the real clock. No DOM in here, so the balance simulator can run it in Node.
// Everything is driven by advance(s, now): it plays the time since the last call forward, minute by minute,
// whether that was a few milliseconds of live play or the hours you were away.
import { CFG, HOUR_TRADE, HOUR_TASTE, ITEMS, INGREDIENTS, PRICE_LEVELS, UPGRADES, EVENTS, LINES, BUYER_NAMES,
         START_RECIPES, CREW, FEATURES, MACHINES, MACHINE_PRICE_STEP, SPOTS, MACHINE_WALL, LAB_MACHINES, LAB_SPOTS,
         PRODUCTS, CAMPAIGNS, PROPERTY, CAPS, capAt, nextCap, CUTS, purityMult, TIERS, CORNERS, SHOPS, TAX, DECLARE, CLIENTS, DEZ_CLIENTS, ORDERS, MILESTONES, CRITIC, WASH, FRONTS, FRONT_AUDIT, VANS, DELIVERY, PRESTIGE, PERKS, SHOP_BASE, SHOP_GROW, SUPPLIERS, INSURANCE, RIVAL, CASE, LOYALTY, AUCTION, GOALS, GOAL_REWARD, CHOICES, CHALLENGES, AREA_HEAT } from './data.js';
import { charmBonus, defaultDesign, allCells, cellKey, PANELS, EXPANSIONS } from './design.js';

export const SAVE_VERSION = 5;
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

// ---------- Shops ----------
// Each shop has its own machines, case, menu and design. s.cur says which one the rules (and the screen) are
// looking at; s.machines, s.display, s.onMenu, s.design and s.custAcc always mean that shop's.
const SHOP_FIELDS = ['machines', 'display', 'onMenu', 'design', 'custAcc', 'lab', 'door', 'buyAcc', 'stock'];
export function bindShops(s) {
  for (const f of SHOP_FIELDS) Object.defineProperty(s, f, { configurable: true, enumerable: false,
    get() { return this.shops[this.cur || 0][f]; }, set(v) { this.shops[this.cur || 0][f] = v; } });
  return s;
}
export const shopDef = (s, i = s.cur || 0) => SHOPS[s.shops[i].id];
export function eachShop(s, fn) {
  const keep = s.cur || 0;
  for (let i = 0; i < s.shops.length; i++) { s.cur = i; fn(i); }
  s.cur = keep;
}
function makeShop(id) {
  const d = SHOPS[id];
  const display = {}; for (const k in ITEMS) display[k] = 0;
  return { id, machines: [], display, onMenu: [], design: defaultDesign({ floor: d.floor, wall: d.wall }), custAcc: 0, lab: [], door: [], buyAcc: 0, stock: {} };
}
export const ownsShop = (s, id) => s.shops.some(x => x.id === id);
export const shopWith = (s, type) => s.shops.findIndex(x => SHOPS[x.id].machines.includes(type));
export const nextShops = s => Object.keys(SHOPS).filter(id => !ownsShop(s, id));
// The nth shop always costs more than the one before it
export const shopPrice = s => Math.round(SHOP_BASE * Math.pow(SHOP_GROW, s.shops.length - 1));
export function buyShop(s, id) {
  const d = SHOPS[id];
  if (!d || ownsShop(s, id)) return;
  if (!unlocked(s, d.level)) return say(`${d.name} opens up at level ${d.level}.`, 'bad');
  const price = shopPrice(s);
  if (s.clean < price) return say('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - price); s.today.upgradesSpent += price;
  s.shops.push({ ...makeShop(id), paid: price });
  if (s.labUnlocked && !s.vans.count) { s.vans.count = 1; note(s, '🚚 Rosa\'s first delivery van comes with the branch: it can run what the branch back room makes to the stall.', 'info'); }
  say(`${d.emoji} ${d.name} is open. Fit it out with its machines.`, 'good');
}
export function viewShop(s, i) { if (s.shops[i]) s.cur = i; }
export const shopRent = s => s.shops.reduce((a, x, i) => a + (i === 0 && eff(s, 'noRent') ? 0 : SHOPS[x.id].rent), 0);
export const businessRates = s => Math.round(s.shops.reduce((a, x, i) => a + (i === 0 ? 0 : SHOPS[x.id].rent * TAX.ratesShare), 0));

// ---------- Prestige ----------
export const perk = (s, id) => s.prestige?.perks?.[id] || 0;
export const tokenBonus = s => 1 + PRESTIGE.tokenBonus * (s.prestige?.total || 0);
// What the whole business is worth: cash anywhere, shops, machines, property, fronts and vans, less what you owe
export function netWorth(s) {
  let v = s.clean + s.dirty + (s.wash?.offshore || 0) + (s.wash?.art || []).reduce((a, x) => a + x.amount, 0);
  for (const x of s.shops) {
    v += x.paid || 0;
    for (const m of x.machines) v += MACHINES[m.type].price * (1 + 0.5 * (m.tier || 0));
    for (const m of x.lab) v += LAB_MACHINES[m.type].price * (1 + 0.5 * (m.tier || 0));
  }
  for (const id in s.property || {}) if (s.property[id]) v += PROPERTY[id].price;
  for (const id in s.wash?.fronts || {}) v += FRONTS[id].price;
  v += (s.vans?.count || 0) * VANS.price;
  return Math.max(0, Math.round(v - s.balance - (s.hmrc || 0)));
}
export const prestigeTokens = s => Math.floor(Math.sqrt(netWorth(s) / PRESTIGE.per));
export const prestigeReady = s => s.level >= PRESTIGE.level && prestigeTokens(s) > 0;
export const perkCost = (s, id) => PERKS[id].cost * (perk(s, id) + 1);
export function buyPerk(s, id) {
  const P = PERKS[id];
  if (!P) return;
  if (perk(s, id) >= P.max) return say(`${P.name} is maxed out.`, 'bad');
  const cost = perkCost(s, id);
  if (s.prestige.tokens < cost) return say(`You need ${cost} prestige tokens.`, 'bad');
  s.prestige.tokens -= cost; s.prestige.perks[id] = perk(s, id) + 1;
  say(`${P.emoji} ${P.name} is now level ${s.prestige.perks[id]}.`, 'good');
}
// Hand it all on and start again: a brand-new game, plus the tokens and every perk you've bought
export function prestigeReset(s, t = Date.now(), next = 'none') {
  if (!prestigeReady(s)) { say(`Prestige opens at level ${PRESTIGE.level}, once the business is worth something.`, 'bad'); return s; }
  const earned = Math.floor(prestigeTokens(s) * challenge(s).mult);
  const pr = { ...(s.prestige || { tokens: 0, total: 0, resets: 0, perks: {} }) };
  pr.perks = { ...(pr.perks || {}) };
  pr.tokens = (pr.tokens || 0) + earned; pr.total = (pr.total || 0) + earned; pr.resets = (pr.resets || 0) + 1;
  pr.best = Math.max(pr.best || 0, netWorth(s));
  const n = newGame(t, pr);
  n.challenge = CHALLENGES[next] ? next : 'none';
  if (n.challenge === 'bigdebt') n.balance *= 2;
  if (n.challenge === 'nolab') { n.labUnlocked = false; n.offerPending = false; n.offerAfter = Infinity; for (const x of n.shops) x.lab = []; }
  n.feed.push({ t, text: `⭐ A fresh start. ${earned} prestige tokens earned (${pr.tokens} to spend in Bank & tax).`, kind: 'good' });
  return n;
}
// The perks you own shape the fresh start
function applyPerks(s) {
  s.clean += 2500 * perk(s, 'savings');
  s.balance = Math.max(0, CFG.debtTotal - 2500 * perk(s, 'credit'));
  if (s.balance <= 0) s.won = true;
  s.level = Math.min(CFG.maxLevel, 1 + 2 * perk(s, 'headstart'));
  const known = 5 * perk(s, 'recipes');
  for (const id in ITEMS) if (ITEMS[id].level <= known && !s.recipes.includes(id)) s.recipes.push(id);
  if (perk(s, 'contacts')) {
    s.labUnlocked = true; s.offerPending = false;
    s.shops[0].lab.push({ type: 'tent', spot: 0, job: null, last: null, broken: false, tier: 0 });
    s.kits.homegrown = 2;
  }
  s.street = Math.min(100, s.street + 10 * perk(s, 'legend'));
}

// ---------- Crew loyalty, decisions and the detective ----------
export function newStaff() { return { loyalty: Math.round(LOYALTY.start[0] + rand() * (LOYALTY.start[1] - LOYALTY.start[0])), greed: round2(0.9 + rand() * 0.3) }; }
export const staffOf = (s, role) => (s.staff[role] ||= newStaff());
export function payBonus(s, role) {
  const c = CREW[role], st = staffOf(s, role), cost = Math.round(c.wage * st.greed) || 100, cash = c.cash;
  if (s[cash] < cost) return say(`Not enough ${cash} cash.`, 'bad');
  s[cash] = round2(s[cash] - cost); st.loyalty = Math.min(100, st.loyalty + LOYALTY.bonusGain);
  say(`${c.name} appreciates it. Loyalty ${Math.round(st.loyalty)}.`, 'good');
}
// Choices that wait for you (a pop-up); if you don't answer in time the safe option is taken
export function pushDecision(s, d, t = s.clock) { d.id = s.nextId++; d.until ??= t + 12 * HOUR; s.decisions.push(d); }
export function answerDecision(s, id, yes, t = s.clock) {
  const d = s.decisions.find(x => x.id === id);
  if (!d) return;
  s.decisions = s.decisions.filter(x => x !== d);
  resolveDecision(s, d, yes, t, false);
}
function resolveDecision(s, d, yes, t, auto) {
  const nightCrew = Object.keys(CREW).filter(r => CREW[r].shift === 'night' && s.crew[r]);
  if (d.kind === 'bail') {
    if (yes && s.dirty >= d.cost) {
      s.dirty -= d.cost; if (d.role) s.crew[d.role] = true;
      for (const r of nightCrew) staffOf(s, r).loyalty = Math.min(100, staffOf(s, r).loyalty + 5);
      return note(s, `⚖️ You paid ${d.who}'s bail (£${d.cost.toLocaleString('en-GB')}). The crew notice you look after your own.`, 'good', t);
    }
    s.heat = clamp(s.heat - 5, 0, 100);
    for (const r of nightCrew) staffOf(s, r).loyalty = Math.max(0, staffOf(s, r).loyalty - 10);
    return note(s, `⚖️ You cut ${d.who} loose${auto ? ' (no answer in time)' : ''}. Heat -5, but the crew don't like it.`, 'meh', t);
  }
  const c = d.kind;
  if (c === 'bulk') {
    if (yes) {
      const have = s.bags[d.product] || 0, n = Math.min(have, d.qty);
      if (n < 1) return note(s, '📦 You had nothing to sell the bulk buyer.', 'meh', t);
      const cash = Math.round(n * bagPrice(s, { product: d.product }) * 0.7);
      s.bags[d.product] -= n; s.dirty += cash; s.heat = clamp(s.heat + 6, 0, 100); addXp(s, n * bagXp(d.product));
      if (rand() < 0.15) addEvidence(s, CASE.sting, t, 'The bulk buyer was wearing a wire.');
      return note(s, `📦 Bulk deal: ${n} ${PRODUCTS[d.product].name} for £${cash.toLocaleString('en-GB')}. Heat +6.`, 'good', t);
    }
    return;
  }
  if (c === 'journalist') {
    if (!yes) return;
    s.rep = clamp(s.rep + 8, 0, 100);
    if (s.labUnlocked && rand() < 0.3) { addEvidence(s, 5, t, 'The journalist asked about the back door.'); return note(s, '📰 The piece was lovely, but the journalist asked a lot about the back door. Popularity +8.', 'meh', t); }
    return note(s, '📰 A glowing piece in the paper. Popularity +8.', 'good', t);
  }
  if (c === 'inspector') {
    if (yes && s.clean >= d.cost) { s.clean = round2(s.clean - d.cost); return note(s, `🧽 Fixed it for £${d.cost}. The inspector left happy.`, 'good', t); }
    if (rand() < 0.4) { s.scandalUntil = Math.max(s.scandalUntil, t + 24 * HOUR); s.rep = clamp(s.rep - 6, 0, 100); return note(s, '🧽 The inspector came back and gave you a poor hygiene rating. Popularity -6.', 'bad', t); }
    return note(s, '🧽 The inspector never came back. Lucky.', 'info', t);
  }
  if (c === 'package') {
    if (!yes) return;
    s.dirty += d.cost; s.packageUntil = t + 7 * DAY;
    return note(s, `📦 Dez's package is in the back room. £${d.cost.toLocaleString('en-GB')} for your trouble. A raid this week would go badly.`, 'meh', t);
  }
  if (c === 'charity') {
    if (yes && s.clean >= d.cost) { s.clean = round2(s.clean - d.cost); s.rep = clamp(s.rep + 6, 0, 100); s.heat = clamp(s.heat - 3, 0, 100); return note(s, `❤️ You gave £${d.cost.toLocaleString('en-GB')}. Popularity +6.`, 'good', t); }
  }
}
function randomChoice(s, t) {
  const pool = Object.keys(CHOICES).filter(k => !CHOICES[k].night || s.labUnlocked);
  const kind = pick(pool), C = CHOICES[kind], d = { kind, title: C.title, text: C.text, yes: C.yes, no: C.no };
  if (kind === 'bulk') {
    const stocked = Object.keys(s.bags).filter(k => s.bags[k] > 5);
    if (!stocked.length) return;
    d.product = pick(stocked); d.qty = Math.round(s.bags[d.product] * 0.8);
    d.text += ` ${d.qty} ${PRODUCTS[d.product].name} at 70% of the price.`;
  }
  if (kind === 'inspector') { d.cost = 200 + 40 * s.level; d.text += ` £${d.cost.toLocaleString('en-GB')}.`; }
  if (kind === 'package') { d.cost = 1000 + 150 * s.level; d.text += ` £${d.cost.toLocaleString('en-GB')} dirty.`; }
  if (kind === 'charity') { d.cost = 150 + 50 * s.level; d.text += ` They're asking for £${d.cost.toLocaleString('en-GB')}.`; }
  pushDecision(s, d, t);
}
function runDecisions(s, t) {
  for (const d of [...s.decisions]) if (t >= d.until) { s.decisions = s.decisions.filter(x => x !== d); resolveDecision(s, d, false, t, true); }
  if (s.nextChoiceAt && t >= s.nextChoiceAt) { s.nextChoiceAt = null; if (s.level >= 3) randomChoice(s, t); }
}
// Evidence for the detective's case
export function addEvidence(s, n, t = s.clock, why = '') {
  if (!s.labUnlocked) return;
  const before = s.case.evidence;
  s.case.evidence = clamp(before + n, 0, 100);
  for (const st of CASE.stages) if (before < st && s.case.evidence >= st)
    note(s, `🕵️ ${CASE.detective}'s case against you is ${st}% built.${why ? ' ' + why : ''}`, 'bad', t);
  if (s.case.evidence >= 100) courtCase(s, t);
}
function courtCase(s, t) {
  const lawyer = s.crew.lawyer, half = lawyer ? 0.5 : 1;
  const fineClean = Math.round(Math.min(Math.max(0, s.clean) * CASE.courtClean, CASE.courtCapPerLevel * s.level) * half), fineDirty = Math.round(s.dirty * CASE.courtDirty * half);
  s.clean = round2(s.clean - fineClean); s.dirty -= fineDirty;
  for (const id in s.bags) s.bags[id] = 0;
  for (const id in s.kits) s.kits[id] = 0;
  for (const x of s.shops) { for (const m of x.lab) m.job = null; x.door = []; x.stock = {}; }
  s.sealedUntil = Math.max(s.sealedUntil, t + CASE.courtSealDays * (lawyer ? 0.5 : 1) * DAY);
  s.rep = clamp(s.rep - CASE.courtPop * half, 0, 100);
  s.scandalUntil = Math.max(s.scandalUntil, t + 7 * DAY);
  const gone = [];
  if (!lawyer) for (const r of Object.keys(CREW)) if (CREW[r].shift === 'night' && s.crew[r] && rand() < 0.6) { s.crew[r] = false; gone.push(CREW[r].name); }
  s.case.evidence = CASE.after; s.case.trials = (s.case.trials || 0) + 1; s.stats.busts++;
  note(s, `⚖️ ${CASE.detective}'s case went to court. Fined £${fineClean.toLocaleString('en-GB')} plus £${fineDirty.toLocaleString('en-GB')} dirty, every bag and kit seized, the back rooms sealed for ${CASE.courtSealDays * (lawyer ? 0.5 : 1)} days.${gone.length ? ' ' + gone.join(', ') + ' went down.' : ''}${lawyer ? ' Ms Okafor kept the worst of it away.' : ''}`, 'bad', t);
}
export const caseBribeCost = s => CASE.bribeBase + CASE.bribePerLevel * s.level;
export const caseFrameCost = s => CASE.frameBase + CASE.framePerLevel * s.level;
export function bribeDetective(s, t = s.clock) {
  const cost = caseBribeCost(s);
  if (s.dirty < cost) return say('Not enough dirty cash.', 'bad');
  s.dirty -= cost;
  if (rand() < CASE.bribeFail) { s.heat = clamp(s.heat + 10, 0, 100); addEvidence(s, CASE.bribeBack, t, 'And now attempted bribery too.'); return say(`${CASE.detective} wasn't for sale. Evidence +${CASE.bribeBack}.`, 'bad'); }
  s.case.evidence = Math.max(0, s.case.evidence - CASE.bribeCut);
  say(`Some evidence went missing. The case is down to ${Math.round(s.case.evidence)}%.`, 'good');
}
export function frameRival(s, t = s.clock) {
  const cost = caseFrameCost(s);
  if (!feature(s, 'rivals')) return say('There is no rival crew to pin it on yet.', 'bad');
  if (s.dirty < cost) return say('Not enough dirty cash.', 'bad');
  s.dirty -= cost;
  if (rand() < CASE.frameFail) { addEvidence(s, CASE.frameBack, t, 'The frame-up fell apart.'); return say(`It fell apart. Evidence +${CASE.frameBack}.`, 'bad'); }
  s.case.evidence = Math.max(0, s.case.evidence - CASE.frameCut);
  say(`The rival crew take the fall. The case is down to ${Math.round(s.case.evidence)}%.`, 'good');
}

// ---------- Suppliers, insurance and the rival bakery ----------
export const supplierFor = (s, ing) => Object.keys(s.contracts).find(id => SUPPLIERS[id].ings.includes(ing));
export function signContract(s, id) {
  const c = SUPPLIERS[id];
  if (!c || s.contracts[id]) return;
  if (!unlocked(s, c.level)) return say(`${c.name} deals with you from level ${c.level}.`, 'bad');
  s.contracts[id] = { bought: 0 };
  say(`${c.emoji} Signed with ${c.name}: ${Math.round(c.disc * 100)}% off, at least ${c.min} a week.`, 'good');
}
export function endContract(s, id) { delete s.contracts[id]; }
export const insurancePremium = (s, id) => Math.round(INSURANCE[id].base + INSURANCE[id].perLevel * s.level);
export function toggleInsurance(s, id) { if (INSURANCE[id]) s.insurance[id] = !s.insurance[id]; }
function claim(s, amount, what, t) {
  if (amount <= 0) return;
  s.clean = round2(s.clean + amount); s.taxWeek.claims = (s.taxWeek.claims || 0) + 1;
  note(s, `🛡️ The insurers paid out £${Math.round(amount).toLocaleString('en-GB')} for ${what}.`, 'good', t);
}
export const rivalShare = s => (s.rival?.open ? s.rival.share : 0);
export const rivalBuyout = s => RIVAL.buyoutBase + RIVAL.buyoutPerLevel * s.level;
export function buyOutRival(s, t = s.clock) {
  if (!s.rival.open) return;
  const cost = rivalBuyout(s);
  if (s.clean < cost) return say('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - cost); s.today.upgradesSpent += cost;
  s.rival = { open: false, share: 0, closedUntil: t + RIVAL.closedDays * DAY };
  say(`🏳️ You bought out ${RIVAL.name}. Their customers are yours again.`, 'good');
}
// Customers come in types: commuters at the station, lunch at the café, tourists in summer, weekends at the maison
function shopRush(s, t) {
  const d = new Date(t), h = d.getHours(), m = d.getMonth(), wd = d.getDay(), id = s.shops[s.cur || 0].id;
  let k = (m >= 5 && m <= 7) ? 1.1 : 1; // summer tourists everywhere
  if (id === 'express' && ((h >= 7 && h < 9) || (h >= 17 && h < 19))) k *= 1.5;
  if (id === 'cafe' && h >= 12 && h < 14) k *= 1.3;
  if (id === 'gelateria') k *= (m >= 5 && m <= 7) ? 1.4 : (m <= 1 || m === 11) ? 0.8 : 1;
  if (id === 'maison' && (wd === 0 || wd === 6)) k *= 1.3;
  return k;
}

// ---------- Auctions, goals, area heat and prestige challenges ----------
export const rareProducts = () => Object.keys(PRODUCTS).filter(id => PRODUCTS[id].rare);
function startAuction(s, t) {
  const options = rareProducts().filter(id => s.level + 10 >= PRODUCTS[id].level);
  if (!options.length || !s.labUnlocked || s.level < AUCTION.level) return;
  const id = pick(options), p = PRODUCTS[id];
  const kits = AUCTION.kitsMin + Math.floor(rand() * (AUCTION.kitsMax - AUCTION.kitsMin + 1));
  s.auction = { product: id, kits, price: Math.round(kits * p.kit * (AUCTION.priceMin + rand() * (AUCTION.priceMax - AUCTION.priceMin)) / 10) * 10, until: t + AUCTION.hours * HOUR };
  note(s, `🔨 Dez has a lot at auction: ${kits} kits of ${p.name}. Bids close in a day.`, 'info', t);
}
export function buyAuction(s, t = s.clock) {
  const a = s.auction;
  if (!a || t > a.until) return say('Nothing at auction right now.', 'bad');
  if (s.dirty < a.price) return say('Not enough dirty cash.', 'bad');
  s.dirty -= a.price; s.kits[a.product] = (s.kits[a.product] || 0) + a.kits; s.auction = null;
  say(`🔨 Yours: ${a.kits} kits of ${PRODUCTS[a.product].name}.`, 'good');
}
function makeGoals(s, kind) {
  const keys = Object.keys(GOALS).filter(k => !GOALS[k].night || s.labUnlocked);
  const picked = [];
  while (picked.length < (kind === 'daily' ? 3 : 2) && keys.length) picked.push(keys.splice(Math.floor(rand() * keys.length), 1)[0]);
  return picked.map(k => {
    const g = GOALS[k], mult = kind === 'daily' ? 1 : 6;
    const n = Math.max(1, Math.round((g.base + g.per * s.level * (k === 'sales' || k === 'washed' ? s.level / 10 + 1 : 1)) * mult));
    return { key: k, target: n, base: s.stats[g.stat] || 0, done: false };
  });
}
export const goalProgress = (s, g) => Math.min(g.target, (s.stats[GOALS[g.key].stat] || 0) - g.base);
function checkGoals(s, t) {
  for (const kind of ['daily', 'weekly']) for (const g of s.goals[kind]) {
    if (g.done || goalProgress(s, g) < g.target) continue;
    g.done = true;
    const cash = GOAL_REWARD.dailyCash * s.level * (kind === 'weekly' ? GOAL_REWARD.weeklyMult : 1);
    s.clean = round2(s.clean + cash);
    addXp(s, GOAL_REWARD.dailyXp * s.level * (kind === 'weekly' ? GOAL_REWARD.weeklyMult : 1));
    if (kind === 'weekly') s.prestige.tokens += GOAL_REWARD.weeklyTokens; // spendable on perks; not part of the price bonus
    note(s, `🎯 ${kind === 'weekly' ? 'Weekly goal' : 'Goal'} done: ${GOALS[g.key].text(g.target)}. +£${cash.toLocaleString('en-GB')}${kind === 'weekly' ? ` and ${GOAL_REWARD.weeklyTokens} prestige token` : ''}.`, 'good', t);
  }
}
function areaHeat(s, area, n) { s.areaHeat[area] = clamp((s.areaHeat[area] || 0) + n, 0, 100); s.heat = clamp(s.heat + n * AREA_HEAT.mainShare, 0, 100); }
export const challenge = s => CHALLENGES[s.challenge || 'none'];
// Weekly report card
const grade = v => (v >= 0.9 ? 'A' : v >= 0.75 ? 'B' : v >= 0.55 ? 'C' : v >= 0.35 ? 'D' : 'F');
function reportCard(s, est) {
  const w = s.taxWeek;
  const bakery = grade((w.served || 0) / Math.max(1, (w.served || 0) + (w.missed || 0)));
  const back = !s.labUnlocked ? '—' : (w.busts ? 'F' : w.seizures >= 3 ? 'D' : w.seizures ? 'C' : (w.bags || 0) > 50 ? 'A' : 'B');
  const books = w.caught ? 'F' : s.hmrc > 1 ? 'D' : est.hidden > 0 ? 'C' : (w.laundered + (w.washSuspect || 0)) > w.sales * 0.5 ? 'B' : 'A';
  return { bakery, back, books };
}

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
export const ingPrice = (s, ing) => { const c = s.contracts && supplierFor(s, ing); return round2(INGREDIENTS[ing].base * (s.market[ing] || 1) * (c ? 1 - SUPPLIERS[c].disc : 1)); };
export const itemPrice = (s, id) => round2(ITEMS[id].price * shopDef(s).priceMult * tokenBonus(s) * PRICE_LEVELS[s.priceLevel[id] || 'normal'].mult * (1 + eff(s, 'price')) * (s.crew.cashier ? 1 + CFG.cashierBonus : 1));
export const batchCost = (s, id) => round2(Object.entries(ITEMS[id].ing).reduce((a, [k, q]) => a + q * ingPrice(s, k), 0));
export const canMake = (s, id) => Object.entries(ITEMS[id].ing).every(([k, q]) => s.inv[k] >= q);
export const batchesPossible = (s, id) => Math.min(...Object.entries(ITEMS[id].ing).map(([k, q]) => Math.floor(s.inv[k] / q)));
export const missingCost = (s, id) => round2(Object.entries(ITEMS[id].ing).reduce((a, [k, q]) => a + Math.max(0, q - s.inv[k]) * ingPrice(s, k), 0));
export const cookMs = (s, id, tier = 0) => Math.round(ITEMS[id].minutes * MIN * Math.max(0.5, 1 - eff(s, 'speed')) * (1 - TIERS.speed * tier));
// How many servings a batch makes on a machine (its tier and the sous chef add more)
export const servingsFor = (s, id, tier = 0) => Math.round(ITEMS[id].servings * (1 + TIERS.servings * tier) * (s.crew?.souschef ? 1.1 : 1));
const maxTier = (s, type) => Math.max(0, ...(s.machines || []).filter(m => m.type === type).map(m => m.tier || 0));
export const spoilMs = (s, id) => Math.max(CFG.spoilMin, ITEMS[id].minutes) * MIN * (1 + eff(s, 'keep'));
export const trayCap = (s, id) => Math.round(servingsFor(s, id, maxTier(s, ITEMS[id].machine)) * (CFG.trayBatches + eff(s, 'tray')));
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
  n *= 1 + 0.1 * perk(s, 'learner');
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
  return Math.round(M.price * (1 + MACHINE_PRICE_STEP * extra) * (1 - 0.05 * perk(s, 'bulk')) / 10) * 10;
}
const designFor = s => s.design; // each shop's own expansions open its own spots, front and back
const spotOpen = (s, spot, lab) => !spot.need || !!designFor(s, lab).expansions[spot.need];
export function freeSpots(s, lab = false) {
  const spots = lab ? LAB_SPOTS : SPOTS, used = kitchenList(s, lab);
  return spots.map((_, i) => i).filter(i => spotOpen(s, spots[i], lab) && !used.some(m => m.spot === i));
}
// The next expansion that would open more room, for the locked message.
function nextRoom(s, lab) {
  const key = lab ? 'labSpots' : 'spots';
  return Object.entries(EXPANSIONS).filter(([id, e]) => e[key] && !designFor(s, lab).expansions[id]).sort((a, b) => a[1].level - b[1].level)[0];
}
export function machineBlock(s, type, lab = false) {
  const M = TYPES(lab)[type];
  if (!unlocked(s, M.level)) return { lock: true, text: `Reach level ${M.level} to unlock the ${M.name.toLowerCase()}` };
  if (!(lab ? shopDef(s).lab : shopDef(s).machines).includes(type)) {
    const home = Object.values(SHOPS).find(d => (lab ? d.lab : d.machines).includes(type));
    return { lock: true, text: `Goes in ${lab ? 'the back room of ' : ''}${home.name}${ownsShop(s, Object.keys(SHOPS).find(k => SHOPS[k] === home)) ? '' : ' (open it in Shops)'}` };
  }
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
// The back room runs on dirty cash; the shops on clean
export const machineCash = (type, lab) => (lab ? 'dirty' : 'clean');
export function buyMachine(s, type, lab = false) {
  const M = TYPES(lab)[type];
  if (!M) return;
  if (lab && !s.labUnlocked) return say('The back room isn\'t yours yet.', 'bad');
  const block = machineBlock(s, type, lab);
  if (block) return say(block.text + '.', 'bad');
  const cost = machinePrice(s, type, lab), cash = machineCash(type, lab);
  if (s[cash] < cost) return say(`Not enough ${cash} cash.`, 'bad');
  s[cash] = round2(s[cash] - cost);
  if (cash === 'clean') s.today.capex += cost;
  const free = freeSpots(s, lab);
  const spot = lab ? free[0] : (free.find(i => SPOTS[i].wall === MACHINE_WALL[type]) ?? free[0]);
  kitchenList(s, lab).push({ type, spot, job: null, last: null, broken: false });
  learnFree(s);
  say(`New ${M.name.toLowerCase()} installed.`, 'good');
}
export const recipesFor = type => Object.keys(ITEMS).filter(id => ITEMS[id].machine === type);
export const productsFor = type => Object.keys(PRODUCTS).filter(id => PRODUCTS[id].machine === type);
const ownedAnywhere = (s, type) => s.shops.some(x => x.machines.some(m => m.type === type));
function addToMenus(s, id) {
  for (const x of s.shops) if (SHOPS[x.id].machines.includes(ITEMS[id].machine) && x.machines.some(m => m.type === ITEMS[id].machine)
    && !x.onMenu.includes(id) && x.onMenu.filter(k => s.recipes.includes(k)).length < menuSlots(s)) x.onMenu.push(id);
}
export function learnFree(s) {
  for (const id in ITEMS) {
    const r = ITEMS[id];
    if (r.cost || s.recipes.includes(id) || !unlocked(s, r.level) || !ownedAnywhere(s, r.machine)) continue;
    s.recipes.push(id);
    addToMenus(s, id);
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
  const before = s.shops.reduce((a, x) => a + x.onMenu.length, 0);
  addToMenus(s, id);
  if (s.shops.reduce((a, x) => a + x.onMenu.length, 0) > before) say(`Learned ${r.name}. It's on sale.`, 'good');
  else say(`Learned ${r.name}. Put it on sale from its machine's menu.`, 'info');
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
  m.job = { item: id, start: t, dur: cookMs(s, id, m.tier || 0) };
  m.last = id;
  return true;
}
export function collectJob(s, idx, t, { quiet = false } = {}) {
  const m = s.machines[idx];
  if (!m?.job || t < m.job.start + m.job.dur) return false;
  const id = m.job.item, r = ITEMS[id], n = servingsFor(s, id, m.tier || 0);
  if ((s.display[id] || 0) > 0 && (s.display[id] || 0) + n > trayCap(s, id)) {
    if (!quiet) say(`The ${r.name.toLowerCase()} tray is full. Sell some first.`, 'bad');
    return false;
  }
  s.display[id] = (s.display[id] || 0) + n;
  if (!s.onMenu.includes(id) && menuOf(s).length < menuSlots(s)) s.onMenu.push(id);
  m.job = null;
  addXp(s, batchXp(id));
  s.today.batches++; s.stats.batches = (s.stats.batches || 0) + 1;
  if (!quiet && !s.onMenu.includes(id)) say(`${r.name} isn't on sale: put it on the menu to sell it.`, 'info');
  // The head chef starts the same thing again straight away, if there's room for it
  if (s.crew.chef && m.last) chefRestart(s, idx, t);
  return true;
}
// Marco only cooks again what's on sale and will fit in its tray once it's done
function chefRestart(s, idx, t) {
  const m = s.machines[idx], id = m.last;
  if (!id || !menuOf(s).includes(id) || (s.display[id] || 0) + servingsFor(s, id, m.tier || 0) > trayCap(s, id)) return false;
  return startJob(s, idx, id, t, { quiet: true });
}
export const tierCost = (type, tier, lab = false) => Math.round(TYPES(lab)[type].price * TIERS.costMult * Math.pow(TIERS.costGrow, tier) / 10) * 10;
export function upgradeMachine(s, idx, lab = false) {
  const m = kitchenList(s, lab)[idx];
  if (!m) return;
  const tier = m.tier || 0;
  if (tier >= TIERS.max) return say('That machine is fully upgraded.', 'bad');
  const cost = tierCost(m.type, tier, lab), cash = machineCash(m.type, lab);
  if (s[cash] < cost) return say(`Not enough ${cash} cash.`, 'bad');
  s[cash] = round2(s[cash] - cost);
  if (cash === 'clean') s.today.capex += cost;
  m.tier = tier + 1;
  say(`${TYPES(lab)[m.type].name} upgraded to tier ${m.tier}.`, 'good');
}
export const repairCost = (type, lab = false) => Math.round(Math.max(300, TYPES(lab)[type].price) * CFG.repairShare / 10) * 10;
export function repairMachine(s, idx, lab = false) {
  const m = kitchenList(s, lab)[idx];
  if (!m?.broken) return;
  const cost = s.insurance?.machines ? 0 : repairCost(m.type, lab);
  if (s.clean < cost) return say('Not enough clean cash for the repair.', 'bad');
  s.clean = round2(s.clean - cost);
  if (!cost) s.taxWeek.claims = (s.taxWeek.claims || 0) + 1;
  m.broken = false;
  say(`${TYPES(lab)[m.type].name} repaired.`, 'good');
}
// Back-room cooks
export function startLab(s, idx, id, t, { quiet = false } = {}) {
  const m = s.lab[idx], p = PRODUCTS[id];
  if (!m || !p || m.job || m.broken || p.machine !== m.type) return false;
  if (!unlocked(s, p.level)) { if (!quiet) say(`${p.name} unlocks at level ${p.level}.`, 'bad'); return false; }
  if (sealed(s, t)) { if (!quiet) say('The back room is sealed by the police.', 'bad'); return false; }
  // Edibles also use bakery stock
  if (p.ing) {
    const short = Object.entries(p.ing).filter(([k, q]) => s.inv[k] < q);
    const cost = round2(short.reduce((a, [k, q]) => a + (q - s.inv[k]) * ingPrice(s, k), 0));
    if (short.length && s.clean < cost) { if (!quiet) say(`Not enough bakery stock for ${p.name}.`, 'bad'); return false; }
  }
  if (!(s.kits[id] > 0) && !buyKit(s, s.dirty >= kitPrice(id, 'dirty', s) ? 'dirty' : 'clean', id, { quiet: true })) {
    if (!quiet) say(`No ${p.name} kits, and Dez won't sell you one right now.`, 'bad');
    return false;
  }
  if (p.ing) for (const [k, q] of Object.entries(p.ing)) { if (s.inv[k] < q) buyIngredient(s, k, q - s.inv[k], true); s.inv[k] -= q; }
  s.kits[id]--;
  m.job = { item: id, start: t, dur: Math.round(p.minutes * MIN * (1 - TIERS.labSpeed * (m.tier || 0))) };
  m.last = id;
  return true;
}
export function collectLab(s, idx, t, { quiet = false } = {}) {
  const m = s.lab[idx];
  if (!m?.job || t < m.job.start + m.job.dur) return false;
  const id = m.job.item, p = PRODUCTS[id], cut = CUTS[s.cut[id] || 'none'];
  const n = Math.round(p.bags * (1 + eff(s, 'bags')) * cut.bags);
  const pur = clamp(labPurity(s, m) * cut.purity * (0.96 + rand() * 0.08), 0.2, 0.99);
  if (s.cur) {
    const k = s.stock[id] ||= { n: 0, pur };
    k.pur = round2((k.pur * k.n + pur * n) / (k.n + n)); k.n += n;
  } else {
    const have = s.bags[id] || 0;
    s.purity[id] = round2(((s.purity[id] ?? pur) * have + pur * n) / (have + n));
    s.bags[id] = have + n;
  }
  s.heat = clamp(s.heat + p.heat * (1 - eff(s, 'quiet')), 0, 100);
  s.lastLab = t;
  m.job = null;
  addXp(s, labXp(id));
  s.today.labBatches++;
  if (!quiet) say(`+${n} ${p.name} (${Math.round(pur * 100)}% pure)${s.cur ? ', packed for the stall' : ''}`, 'good');
  if (s.crew.chemist && m.last) startLab(s, idx, m.last, t, { quiet: true });
  return true;
}

// How pure a cook on this machine comes out, before cutting
export const labPurity = (s, m) => clamp(CFG.purityBase + TIERS.labPurity * (m?.tier || 0) + eff(s, 'purity') + (s.crew.assistant ? 0.05 : 0) + (s.crew.chemist ? 0.05 : 0), 0.3, 0.99);
export function setCut(s, id, cut) { if (CUTS[cut] && PRODUCTS[id]) s.cut[id] = cut; }
// Dez buys anything you can't shift, at half what it's worth. No heat, no buyers.
export function sellToDez(s, id, n) {
  n = Math.min(n, s.bags[id] || 0);
  if (n < 1) return say('Nothing to sell.', 'bad');
  const cash = Math.round(n * PRODUCTS[id].price * purityMult(s.purity[id] ?? 0.6) * CFG.dezBuyback);
  s.bags[id] -= n; s.dirty += cash; s.stats.nightCash = (s.stats.nightCash || 0) + cash;
  addXp(s, Math.ceil(n * bagXp(id) / 2));
  say(`Dez takes ${n} ${PRODUCTS[id].name} for £${cash.toLocaleString('en-GB')}.`, 'good');
}

// ---------- Turf: corners that sell while you're away ----------
export const cornerOwned = (s, id) => !!s.corners[id];
export function buyCorner(s, id) {
  const c = CORNERS[id];
  if (!c || s.corners[id] || !s.labUnlocked) return;
  if (!unlocked(s, c.level)) return say(`${c.name} opens up at level ${c.level}.`, 'bad');
  if (s.dirty < c.price) return say('Not enough dirty cash.', 'bad');
  s.dirty -= c.price;
  s.corners[id] = { product: null, stock: 0, acc: 0, soldToday: 0 };
  say(`${c.emoji} ${c.name} is yours. Give it something to sell.`, 'good');
}
export function setCornerProduct(s, id, product) {
  const k = s.corners[id];
  if (!k || !PRODUCTS[product]) return;
  if (k.product && k.product !== product && k.stock) { s.bags[k.product] = (s.bags[k.product] || 0) + k.stock; k.stock = 0; }
  k.product = product;
}
export function stockCorner(s, id, n) {
  const k = s.corners[id];
  if (!k?.product) return say('Pick a product for that corner first.', 'bad');
  n = Math.min(n, s.bags[k.product] || 0, CORNERS[id].cap - k.stock);
  if (n < 1) return say((s.bags[k.product] || 0) < 1 ? `No ${PRODUCTS[k.product].name} to send.` : 'That corner is full.', 'bad');
  s.bags[k.product] -= n; k.stock += n;
}
export function cornerRate(s, id, t) {
  const c = CORNERS[id];
  return c.rate * (isNight(t) ? CFG.cornerNightRate : CFG.cornerDayRate) * (0.5 + s.street / 100);
}
export const cornerBagPrice = (s, id, product) => Math.round(PRODUCTS[product].price * purityMult(s.purity[product] ?? 0.6) * CORNERS[id].mult * (1 - CFG.cornerCut));
function runCorners(s, t0, t1, mins) {
  for (const [id, k] of Object.entries(s.corners)) {
    if (!k.product) continue;
    // Kai keeps them topped up from the back room
    if (s.crew.runner && k.stock < CORNERS[id].cap / 2 && (s.bags[k.product] || 0) > 0) {
      const n = Math.min(s.bags[k.product], CORNERS[id].cap - k.stock); s.bags[k.product] -= n; k.stock += n;
    }
    if (k.stock <= 0) continue;
    k.acc += cornerRate(s, id, t0) * mins / 60;
    const n = Math.min(k.stock, Math.floor(k.acc));
    if (n < 1) continue;
    k.acc -= n; k.stock -= n; k.soldToday += n;
    const cash = n * cornerBagPrice(s, id, k.product);
    s.dirty += cash; s.stats.nightCash = (s.stats.nightCash || 0) + cash; s.stats.totalBags += n;
    s.today.cornerSales += n; s.today.cornerCash += cash; s.today.nightSales += cash;
    areaHeat(s, 'streets', CFG.cornerHeat * n);
    s.street = clamp(s.street + n * CFG.streetPerBag * ((s.purity[k.product] ?? 0.6) - 0.65) * 0.5, 0, 100);
    addXp(s, Math.ceil(n * bagXp(k.product) / 2));
  }
}

// ---------- Menu, ingredients, prices ----------
export const menuSlots = s => capAt(CAPS.menu, s.level || 1);
export const menuOf = s => s.onMenu.filter(id => s.recipes.includes(id) && shopDef(s).machines.includes(ITEMS[id].machine)).slice(0, menuSlots(s));
export function toggleMenu(s, id) {
  if (!s.recipes.includes(id)) return;
  if (s.onMenu.includes(id)) { s.onMenu = s.onMenu.filter(x => x !== id); return; }
  if (menuOf(s).length >= menuSlots(s)) {
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
  const sup = supplierFor(s, ing); if (sup) s.contracts[sup].bought += qty;
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
  if (!s.staff[role]) s.staff[role] = newStaff();
  say(`${c.name} (${c.role.toLowerCase()}) starts now.`, 'good');
}
export function fire(s, role) { s.crew[role] = false; }
export const crewWages = (s, shift) => Object.entries(CREW).filter(([r, c]) => s.crew[r] && c.shift === shift).reduce((a, [r, c]) => a + Math.round(c.wage * (s.staff?.[r]?.greed || 1)), 0);

// ---------- Customers ----------
export function customersPerHour(s, t) {
  const h = Math.floor(localHour(t));
  const nightApp = (h >= 22 || h < 6) && eff(s, 'night') ? 1 + eff(s, 'night') : 1;
  const inStock = menuOf(s).filter(id => s.display[id] > 0).length;
  const variety = 1 + Math.min(CFG.varietyCap, CFG.varietyBonus * Math.max(0, inStock - 1));
  return (CFG.custBase + s.rep * CFG.custPerPop) * HOUR_TRADE[h] * nightApp * (1 + eff(s, 'cust')) * (s.event?.cust || 1)
    * charmBonus(s) * (1 + campaignBoost(s, t)) * scandalFactor(s, t) * variety * shopDef(s).cust * (1 + CFG.prestigeCust * (s.shops.length - 1)) * (1 + 0.05 * perk(s, 'regulars')) * reviewBoost(s, t) * (1 - rivalShare(s)) * shopRush(s, t);
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
  let rev = qty * itemPrice(s, id), xp = qty * saleXp(id), combo = false;
  if (TAX.vatGroups.includes(g)) td.vatSales += rev;
  // Plenty of people grab a drink with their food
  if (g !== 'drink' && rand() < CFG.drinkAddOn) {
    const drinks = stock.filter(x => ITEMS[x].group === 'drink' && s.display[x] > 0);
    if (drinks.length) { const d = pick(drinks), dp = itemPrice(s, d) * 1.1; s.display[d]--; rev += dp; td.vatSales += dp; xp += saleXp(d); td.itemsSold++; combo = true; }
  }
  const regular = rand() < 0.2;
  if (regular) rev *= 1.1;
  rev = round2(rev);
  s.clean = round2(s.clean + rev);
  if (regular) s.rep = clamp(s.rep + 0.01, 0, 100);
  td.sales = round2(td.sales + rev); td.itemsSold += qty; td.served++; s.stats.served = (s.stats.served || 0) + 1;
  s.stats.totalSales = round2(s.stats.totalSales + rev);
  s.rep = clamp(s.rep + CFG.popServed, 0, 100);
  addXp(s, xp);
  show({ kind: 'good', text: `+£${rev.toFixed(2)}${combo ? ' combo' : ''}${regular ? ' 🫶' : ''}`, want: id });
}

// ---------- Night trade ----------
export const copChance = (s, product = 'homegrown') => CFG.copBase + s.heat * CFG.copPerHeat + (PRODUCTS[product]?.cop || 0);
export const buyersPerHour = s => Math.min(CFG.buyersMax + CFG.buyersMaxPerLevel * (s.level || 1), CFG.buyersPerHour + CFG.buyersGrow * s.nightsActive) * (1 + eff(s, 'buyers')) * (0.5 + (s.street ?? CFG.streetStart) / 100);
export const knownProducts = s => Object.keys(PRODUCTS).filter(id => unlocked(s, PRODUCTS[id].level) && (!PRODUCTS[id].rare || (s.bags[id] || 0) > 0));
function buyerArrives(s, t) {
  const choices = {};
  for (const id of knownProducts(s)) choices[id] = PRODUCTS[id].share * ((s.bags[id] || 0) > 0 ? 2 : 1);
  const product = weighted(choices) || 'homegrown';
  const cop = rand() < copChance(s, product);
  const offLine = cop ? rand() < 0.8 : rand() < 0.12;
  const hint = (has(s, 'camera') && (cop ? rand() < 0.5 : rand() < 0.05)) || (s.crew.lookout && (cop ? rand() < CFG.lookoutCatch : rand() < CFG.lookoutFalse));
  const pr = PRODUCTS[product].price;
  const want = pr <= 20 ? 2 + Math.floor(rand() * 5) : pr <= 60 ? 1 + Math.floor(rand() * 3) : pr <= 250 ? 1 + (rand() < 0.4 ? 1 : 0) : 1;
  if (s.delivery.on && ridersFree(s) > 0) {
    const vetted = cop && rand() > DELIVERY.copMult; // most officers don't get past a phone call
    if (vetted) { s.today.copsTurned++; return; }
    s.deliveries.push({ id: s.nextId++, name: pick(BUYER_NAMES), product, cop, want, done: t + DELIVERY.minutes * MIN });
    return;
  }
  s.door.push({ id: s.nextId++, name: pick(BUYER_NAMES), product, cop, hint, want, line: pick(offLine ? LINES.off : LINES.normal),
    arrive: t, patience: CFG.buyerPatienceMin * MIN, look: newLook() });
}
function courierArrives(s, t) {
  const stocked = knownProducts(s).filter(id => (s.bags[id] || 0) > 0);
  const product = stocked.length ? pick(stocked) : knownProducts(s)[0];
  const want = CFG.courierMin + Math.floor(rand() * (CFG.courierMax - CFG.courierMin + 1));
  s.door.push({ id: s.nextId++, name: "Dez's courier", courier: true, product, cop: false, hint: false, want,
    line: `Dez sent me. ${want} bags of ${PRODUCTS[product].name}, all at once, and I'm gone.`, arrive: t, patience: CFG.courierPatienceMin * MIN, look: newLook() });
  note(s, `📦 Dez's courier is at the back door for ${want} ${PRODUCTS[product].name}.`, 'info', t);
}
export const bagPrice = (s, b) => Math.round(PRODUCTS[b.product].price * purityMult(s.purity[b.product] ?? 0.6) * (b.courier ? CFG.courierPremium : 1) * tokenBonus(s) * (1 + 0.05 * perk(s, 'legend')));
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
  sell(s, b, qty, Math.round(qty * bagPrice(s, b) * (push ? CFG.pushMult : 1)), t, false);
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
  s.street = clamp(s.street + qty * CFG.streetPerBag * ((s.purity[b.product] ?? 0.6) - 0.65), 0, 100);
  addXp(s, qty * bagXp(b.product) + (b.courier ? 30 : 0));
  if (b.courier) { td.couriers++; s.heat = clamp(s.heat + CFG.courierHeat, 0, 100); note(s, `📦 Courier order done: +£${cash}.`, 'good', t); }
  if (b.cop) {
    td.copsServed++;
    const h = byCrew ? CFG.copCrewHeat : CFG.copServedHeat;
    addEvidence(s, CASE.doorCop, t);
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
    if (s.crew.driver && have >= b.want) return sell(s, b, b.want, Math.round(b.want * bagPrice(s, b)), t, true);
  } else if (s.crew.host && have > 0 && !b.hint) {
    // Lena reads people well and keeps less
    const qty = Math.min(b.want, have);
    return sell(s, b, qty, Math.round(qty * bagPrice(s, b) * (1 - CFG.hostCut)), t, true);
  } else if (s.crew.dealer && have > 0 && !(b.hint && s.crew.lookout)) {
    const qty = Math.min(b.want, have);
    s.today.jayWorked = true;
    return sell(s, b, qty, Math.round(qty * bagPrice(s, b) * CFG.streetMult * (1 - CFG.dealerCut)), t, true);
  }
  s.door = s.door.filter(x => x !== b);
  s.today.buyersLost++;
}
export const kitPrice = (product, cash, s = null) => Math.round(PRODUCTS[product].kit * (cash === 'clean' ? CFG.cleanKitMult : 1) * (1 - 0.05 * (s ? perk(s, 'contacts') : 0)) / 10) * 10;
export const kitsLeftToday = s => Math.max(0, capAt(CAPS.kits, s.level) + 2 * perk(s, 'contacts') - s.today.kitsBought);
export function buyKit(s, cash, product = 'homegrown', { quiet = false } = {}) {
  const p = PRODUCTS[product];
  if (!s.labUnlocked || !p) return false;
  if (p.rare) { if (!quiet) say(`${p.name} only comes up at Dez's auctions.`, 'bad'); return false; }
  if (!unlocked(s, p.level)) { if (!quiet) say(`${p.name} unlocks at level ${p.level}.`, 'bad'); return false; }
  if (!kitsLeftToday(s)) {
    const nx = nextCap(CAPS.kits, s.level);
    if (!quiet) say(`Dez won't sell you more than ${capAt(CAPS.kits, s.level)} kits a day${nx ? `. Reach level ${nx.level} for ${nx.amount}` : ''}.`, 'bad');
    return false;
  }
  const price = kitPrice(product, cash, s);
  if (s[cash] < price) { if (!quiet) say(`Not enough ${cash} cash.`, 'bad'); return false; }
  s[cash] = round2(s[cash] - price);
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
    s.kits.homegrown = (s.kits.homegrown || 0) + 1;
    if (!s.shops[0].lab.length) s.shops[0].lab.push({ type: 'tent', spot: 0, job: null, last: null, broken: false, tier: 0 });
    say('Dez drops off a kit and shows you the back room.', 'good');
  } else s.offerAfter = s.clock + 3 * DAY;
}

// ---------- Laundering ----------
// Each day only so much can pass as takings: a share of today's real sales across every shop, plus what each
// branch can quietly put through as a front. Every wash also costs a cut.
export const launderCap = s => Math.round(s.today.sales * launderRatio(s)) + s.shops.reduce((a, x) => a + SHOPS[x.id].launder, 0);
export const launderLeft = s => Math.max(0, launderCap(s) - s.today.laundered);
export const launderFee = s => Math.max(0.05, CFG.launderFee - (s.crew.accountant ? CFG.accountantFee : 0) - eff(s, 'washFee'));
export const launderHeatFor = (s, amount) => {
  const excess = amount - launderLeft(s), base = Math.max(50, launderCap(s));
  return excess > 0 ? Math.round(Math.min(40, CFG.launderHeat * excess / base)) : 0;
};
export function launder(s, amount, quiet = false) {
  amount = clamp(Math.round(amount), 0, Math.floor(s.dirty));
  if (!amount) return;
  const h = launderHeatFor(s, amount), got = Math.round(amount * (1 - launderFee(s)));
  s.dirty -= amount; s.clean = round2(s.clean + got);
  s.today.laundered += amount; s.stats.totalLaundered += amount;
  if (h) { s.heat = clamp(s.heat + h, 0, 100); s.today.launderHeat += h; }
  if (!quiet) say(`£${amount.toLocaleString('en-GB')} through the tills: £${got.toLocaleString('en-GB')} comes out clean${h ? ` (that looked off: heat +${h})` : ''}.`, h ? 'bad' : 'good');
}

// A pile of unwashed cash in the back room draws attention: it counts as extra heat when police decide whether to raid
export const cashPileHeat = s => Math.min(CFG.cashPileMax, Math.max(0, s.dirty - CFG.cashPileFree) / CFG.cashPilePer);

// ---------- Logistics: vans from the branches to the stall ----------
export const vanCap = s => capAt(VANS.caps, s.level);
export const vanCapacity = s => VANS.capacity[s.vans.level];
export const vansOut = (s, t = s.clock) => s.shipments.length + s.vans.impounded.filter(u => u > t).length;
export const vansFree = (s, t = s.clock) => Math.max(0, s.vans.count - vansOut(s, t));
export const packed = (s, i) => Object.values(s.shops[i].stock || {}).reduce((a, k) => a + k.n, 0);
export function buyVan(s) {
  if (s.vans.count >= vanCap(s)) { const nx = nextCap(VANS.caps, s.level); return say(nx ? `Reach level ${nx.level} to run ${nx.amount} vans.` : 'That\'s the whole fleet.', 'bad'); }
  const cost = VANS.price * (1 + s.vans.count);
  if (s.clean < cost) return say('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - cost); s.today.capex += cost; s.vans.count++;
  say(`🚚 A new van in Rosa's colours (${s.vans.count} in the fleet).`, 'good');
}
export function upgradeVans(s, what) {
  const lvl = s.vans[what], costs = what === 'level' ? VANS.capacityCost : VANS.hideCost;
  if (lvl + 1 >= costs.length) return say('Already the best there is.', 'bad');
  const cost = costs[lvl + 1], cash = what === 'level' ? 'clean' : 'dirty';
  if (s[cash] < cost) return say(`Not enough ${cash} cash.`, 'bad');
  s[cash] = round2(s[cash] - cost); if (cash === 'clean') s.today.capex += cost;
  s.vans[what] = lvl + 1;
  say(what === 'level' ? `Bigger vans: ${vanCapacity(s)} bags a run.` : `Better hidden compartments (level ${s.vans.hide}).`, 'good');
}
export const stopChance = (s, bags) => Math.min(0.6, (VANS.stop + (s.heat * 0.4 + (s.areaHeat?.vans || 0)) * VANS.stopPerHeat + bags * VANS.stopPerBag) * (s.crew.copper ? 0.6 : 1));
export const findChance = s => VANS.find * (1 - VANS.hideCut * s.vans.hide);
export function sendVan(s, i, t = s.clock, quiet = false) {
  const x = s.shops[i];
  if (!x || !i) return false;
  if (!vansFree(s, t)) { if (!quiet) say('No van free right now.', 'bad'); return false; }
  let room = vanCapacity(s); const cargo = {};
  for (const [id, k] of Object.entries(x.stock).sort((a, b) => PRODUCTS[b[0]].price - PRODUCTS[a[0]].price)) {
    const n = Math.min(k.n, room); if (n < 1) continue;
    cargo[id] = { n, pur: k.pur }; k.n -= n; room -= n;
    if (k.n <= 0) delete x.stock[id];
  }
  const total = Object.values(cargo).reduce((a, c) => a + c.n, 0);
  if (!total) { if (!quiet) say('Nothing packed to send.', 'bad'); return false; }
  s.shipments.push({ id: s.nextId++, from: i, cargo, bags: total, arrive: t + SHOPS[x.id].drive * HOUR });
  if (!quiet) say(`🚚 A van leaves ${SHOPS[x.id].short} with ${total} bags under the bread trays.`, 'good');
  return true;
}
function runLogistics(s, t) {
  for (const sh of [...s.shipments]) {
    if (t < sh.arrive) continue;
    s.shipments = s.shipments.filter(x => x !== sh);
    const from = SHOPS[s.shops[sh.from].id].short;
    if (rand() < stopChance(s, sh.bags)) {
      if (rand() < findChance(s)) {
        s.vans.impounded.push(t + VANS.impoundDays * DAY);
        areaHeat(s, 'vans', VANS.seizeHeat * 2); s.stats.seized = (s.stats.seized || 0) + sh.bags; s.taxWeek.seizures = (s.taxWeek.seizures || 0) + 1;
        addEvidence(s, CASE.seizure, t, 'The van driver is talking.');
        if (s.crew.dispatcher || true) pushDecision(s, { kind: 'bail', who: 'the van driver', cost: LOYALTY.bailBase + LOYALTY.bailPerLevel * s.level, title: 'Bail for the driver', text: `Your van driver is in a cell. Pay £${(LOYALTY.bailBase + LOYALTY.bailPerLevel * s.level).toLocaleString('en-GB')} dirty bail, or leave them to it?`, yes: 'Pay bail', no: 'Cut them loose' }, t);
        note(s, `🚓 Police stopped the van from ${from} and found ${sh.bags} bags under the bread. Seized, the van impounded for ${VANS.impoundDays} days and the driver arrested. Heat +${VANS.seizeHeat}.`, 'bad', t);
        continue;
      }
      note(s, `🚓 Police pulled over the van from ${from}, had a look at the bread and waved it on.`, 'info', t);
    }
    for (const [id, c] of Object.entries(sh.cargo)) {
      const have = s.bags[id] || 0;
      s.purity[id] = round2(((s.purity[id] ?? c.pur) * have + c.pur * c.n) / (have + c.n));
      s.bags[id] = have + c.n;
    }
  }
  // Marnie sends a van from any branch with a worthwhile load
  if (s.crew.dispatcher) for (let i = 1; i < s.shops.length && vansFree(s, t); i++) {
    if (packed(s, i) >= Math.min(vanCapacity(s) / 2, 8)) sendVan(s, i, t, true);
  }
}

// ---------- Delivery rounds: riders take the product to buyers ----------
export const deliveryOpen = s => s.labUnlocked && unlocked(s, DELIVERY.level);
export const riderCap = s => capAt(DELIVERY.caps, s.level);
export const ridersFree = s => Math.max(0, s.delivery.riders - s.delivery.out - s.deliveries.length);
export function setDelivery(s, on) { if (deliveryOpen(s)) s.delivery.on = !!on; }
export function hireRider(s, n) {
  const r = clamp(s.delivery.riders + n, 0, riderCap(s));
  if (r === s.delivery.riders && n > 0) return say(`You can run ${riderCap(s)} riders at your level.`, 'bad');
  s.delivery.riders = r;
}
function deliveryDone(s, d, t) {
  const have = s.bags[d.product] || 0, p = PRODUCTS[d.product];
  if (have < 1) { s.today.buyersLost++; return; }
  const qty = Math.min(d.want, have);
  if (d.cop) {
    s.bags[d.product] -= qty; s.delivery.out++; areaHeat(s, 'streets', DELIVERY.stingHeat); s.stats.seized = (s.stats.seized || 0) + qty; s.taxWeek.seizures = (s.taxWeek.seizures || 0) + 1; addEvidence(s, CASE.sting, t, 'A rider was caught in a sting.');
    return note(s, `🚨 A delivery was a police sting: the rider was arrested with ${qty} ${p.name}. Heat +${DELIVERY.stingHeat}.`, 'bad', t);
  }
  if (rand() < DELIVERY.stop + s.heat * DELIVERY.stopPerHeat) {
    s.bags[d.product] -= qty; s.delivery.out++; areaHeat(s, 'streets', DELIVERY.stopHeat); s.stats.seized = (s.stats.seized || 0) + qty; s.taxWeek.seizures = (s.taxWeek.seizures || 0) + 1; addEvidence(s, CASE.riderStop, t);
    return note(s, `🚔 A rider was stopped and searched on the way to a drop: ${qty} ${p.name} seized, rider arrested. Heat +${DELIVERY.stopHeat}.`, 'bad', t);
  }
  const b = { product: d.product, want: qty, courier: false, cop: false, name: d.name };
  const before = s.heat;
  sell(s, b, qty, Math.round(qty * bagPrice(s, b) * DELIVERY.price), t, true);
  s.heat = clamp(before + (s.heat - before) * DELIVERY.heatMult, 0, 100);
}
function runDeliveries(s, t) {
  for (const d of [...s.deliveries]) if (t >= d.done) { s.deliveries = s.deliveries.filter(x => x !== d); deliveryDone(s, d, t); }
}

// ---------- Other ways to wash money ----------
const freshWash = () => ({ smurfDaily: 0, smurfToday: 0, casinoToday: 0, cryptoToday: 0, consultToday: 0, artToday: 0,
  cryptoFee: 0.2, offshore: 0, art: [], fronts: {}, frozen: 0 });
export const washOpen = (s, m) => s.labUnlocked && unlocked(s, WASH[m].level);
export function washCap(s, m) {
  const w = WASH[m], L = s.level;
  if (m === 'till') return launderCap(s);
  if (m === 'smurf') return Math.round((w.capBase + w.capPerLevel * L) * (eff(s, 'smurf') ? 2 : 1));
  if (m === 'art') return w.capPerLevel * Math.max(1, L - 50);
  return w.capBase + w.capPerLevel * L;
}
const usedKey = { smurf: 'smurfToday', casino: 'casinoToday', crypto: 'cryptoToday', offshore: 'consultToday', art: 'artToday' };
export const washLeft = (s, m) => (m === 'till' ? launderLeft(s) : Math.max(0, washCap(s, m) - (s.wash[usedKey[m]] || 0)));
export const washFee = (s, m) => (m === 'till' ? launderFee(s) : m === 'crypto' ? s.wash.cryptoFee : m === 'offshore' ? WASH.offshore.outFee : WASH[m].fee);
// Money that came through a route, for tax and for HMRC's questions
function booked(s, m, amount) {
  const w = s.taxWeek;
  if (WASH[m].taxed) w.washTaxed = (w.washTaxed || 0) + amount;
  w.washSuspect = (w.washSuspect || 0) + amount * WASH[m].suspect;
  s.today.washed = (s.today.washed || 0) + amount;
  s.stats.totalLaundered += amount;
}
// The instant routes: the casino and crypto
export function washVia(s, m, amount, t = s.clock, quiet = false) {
  if (!washOpen(s, m)) return say(`${WASH[m].name} opens at level ${WASH[m].level}.`, 'bad');
  amount = Math.min(Math.round(amount), Math.floor(s.dirty), washLeft(s, m));
  if (amount < 1) { if (!quiet) say(washLeft(s, m) < 1 ? `That's as much as ${WASH[m].name.toLowerCase()} will take today.` : 'Not enough dirty cash.', 'bad'); return 0; }
  s.dirty -= amount; s.wash[usedKey[m]] += amount;
  if (m === 'crypto' && rand() < WASH.crypto.freeze) {
    const kept = Math.round(amount / 2); s.clean = round2(s.clean + kept * (1 - s.wash.cryptoFee));
    note(s, `🪙 The exchange froze your account and kept half: £${(amount - kept).toLocaleString('en-GB')} gone.`, 'bad', t);
    booked(s, m, kept); return kept;
  }
  const got = Math.round(amount * (1 - washFee(s, m)));
  s.clean = round2(s.clean + got);
  booked(s, m, amount);
  if (!quiet) say(`${WASH[m].emoji} £${amount.toLocaleString('en-GB')} in, £${got.toLocaleString('en-GB')} out clean.`, 'good');
  return amount;
}
export function setSmurfing(s, perDay) { if (washOpen(s, 'smurf')) s.wash.smurfDaily = clamp(Math.round(perDay), 0, washCap(s, 'smurf')); }
export function buyArt(s, amount, t = s.clock, quiet = false) {
  if (!washOpen(s, 'art')) return say(`The art dealer deals with you from level ${WASH.art.level}.`, 'bad');
  amount = Math.min(Math.round(amount), Math.floor(s.dirty), washLeft(s, 'art'));
  if (amount < 1000) { if (!quiet) say('The dealer doesn\'t bother with less than £1,000.', 'bad'); return 0; }
  s.dirty -= amount; s.wash.artToday += amount;
  s.wash.art.push({ amount, ready: t + WASH.art.days * DAY });
  if (!quiet) say(`🖼️ You bought a "masterpiece" for £${amount.toLocaleString('en-GB')}. It sells in ${WASH.art.days} days.`, 'good');
  return amount;
}
export function stashOffshore(s, amount) {
  if (!washOpen(s, 'offshore')) return say(`Offshore banking opens at level ${WASH.offshore.level}.`, 'bad');
  amount = Math.min(Math.round(amount), Math.floor(s.dirty));
  if (amount < 1) return say('Not enough dirty cash.', 'bad');
  s.dirty -= amount; s.wash.offshore += Math.round(amount * (1 - WASH.offshore.fee));
  say(`🏝️ £${amount.toLocaleString('en-GB')} couriered offshore (the courier took ${Math.round(WASH.offshore.fee * 100)}%).`, 'good');
}
export function bringBack(s, amount, clean) {
  amount = Math.min(Math.round(amount), Math.floor(s.wash.offshore), clean ? washLeft(s, 'offshore') : Infinity);
  if (amount < 1) return say(clean ? 'That\'s all the consultancy fees that would look normal today.' : 'Nothing offshore.', 'bad');
  s.wash.offshore -= amount;
  if (clean) { const got = Math.round(amount * (1 - WASH.offshore.outFee)); s.clean = round2(s.clean + got); s.wash.consultToday += amount; booked(s, 'offshore', amount); say(`🏝️ £${got.toLocaleString('en-GB')} arrives as consultancy fees.`, 'good'); }
  else { s.dirty += amount; say(`🏝️ £${amount.toLocaleString('en-GB')} back in dirty cash.`, 'good'); }
}
export function buyFront(s, id) {
  const f = FRONTS[id];
  if (!f || s.wash.fronts[id]) return;
  if (!s.labUnlocked) return;
  if (!unlocked(s, f.level)) return say(`A ${f.name.toLowerCase()} comes up for sale at level ${f.level}.`, 'bad');
  if (s.clean < f.price) return say('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - f.price); s.today.capex += f.price;
  s.wash.fronts[id] = { on: true, closedUntil: 0 };
  say(`${f.emoji} The ${f.name.toLowerCase()} is yours. It'll wash up to £${f.cap.toLocaleString('en-GB')} a night.`, 'good');
}
export function toggleFront(s, id) { const k = s.wash.fronts[id]; if (k) k.on = !k.on; }
export const frontCap = s => Object.entries(s.wash.fronts).reduce((a, [id, k]) => a + (k.on ? FRONTS[id].cap : 0), 0);
// Every minute: smurfs trickle money in, and art that's sold pays out
function runWash(s, t, mins) {
  const w = s.wash;
  if (w.smurfDaily > 0 && s.dirty > 0) {
    const n = Math.min(s.dirty, w.smurfDaily * mins / 1440, washLeft(s, 'smurf'));
    if (n > 0) { s.dirty -= n; w.smurfToday += n; s.clean = round2(s.clean + n * (1 - WASH.smurf.fee)); booked(s, 'smurf', n); }
  }
  if (w.art.length && w.art[0].ready <= t) for (const a of w.art.filter(x => x.ready <= t)) {
    const got = Math.round(a.amount * (1 - WASH.art.fee)); s.clean = round2(s.clean + got); booked(s, 'art', a.amount);
    note(s, `🖼️ A collector paid £${got.toLocaleString('en-GB')} for your painting.`, 'good', t);
  }
  w.art = w.art.filter(x => x.ready > t);
  // The crypto cut wanders with the market
  w.cryptoFee = clamp(w.cryptoFee + (rand() - 0.5) * 0.02 * Math.sqrt(mins), WASH.crypto.feeMin, WASH.crypto.feeMax);
}
// Every morning: fronts wash their share, banks may flag the smurfs, Felix spreads the rest, limits reset
function washMorning(s, t) {
  const w = s.wash;
  for (const [id, k] of Object.entries(w.fronts)) {
    if (!k.on || k.closedUntil > t || s.dirty < 1) continue;
    const f = FRONTS[id], n = Math.min(Math.floor(s.dirty), f.cap);
    s.dirty -= n; s.clean = round2(s.clean + n * (1 - f.fee));
    s.taxWeek.washTaxed = (s.taxWeek.washTaxed || 0) + n; s.taxWeek.washSuspect = (s.taxWeek.washSuspect || 0) + n * 0.5;
    s.today.washed = (s.today.washed || 0) + n; s.stats.totalLaundered += n;
  }
  if (w.smurfToday > 0 && rand() < WASH.smurf.flag * (eff(s, 'smurf') ? 0.5 : 1) * (0.5 + w.smurfToday / Math.max(1, washCap(s, 'smurf')))) {
    const lost = Math.round(w.smurfToday * WASH.smurf.flagLose);
    s.clean = round2(Math.max(0, s.clean - lost)); s.heat = clamp(s.heat + WASH.smurf.flagHeat, 0, 100);
    note(s, `🏧 A bank flagged one of your runners' deposits: £${lost.toLocaleString('en-GB')} frozen. Heat +${WASH.smurf.flagHeat}.`, 'bad', t);
  }
  if (w.casinoToday > 0 && rand() < WASH.casino.report * (1 + 2 * w.casinoToday / Math.max(1, washCap(s, 'casino')))) {
    s.heat = clamp(s.heat + WASH.casino.reportHeat, 0, 100);
    note(s, `🎰 The casino filed a report on a big spender. Heat +${WASH.casino.reportHeat}.`, 'bad', t);
  }
  w.smurfToday = w.casinoToday = w.cryptoToday = w.consultToday = w.artToday = 0;
  if (s.crew.moneyman && s.dirty > 3000) {
    const float = 3000;
    if (washOpen(s, 'casino')) washVia(s, 'casino', Math.min(s.dirty - float, washLeft(s, 'casino')), t, true);
    if (washOpen(s, 'crypto') && w.cryptoFee < 0.15 && s.dirty > float) washVia(s, 'crypto', s.dirty - float, t, true);
    if (washOpen(s, 'art') && s.dirty - float >= 1000) buyArt(s, s.dirty - float, t, true);
  }
}

// ---------- Tax (UK-style, settled weekly) ----------
// What you've told HMRC about this tax week so far, and the bill it adds up to
export const declareShare = s => DECLARE[s.declare || 'full'].share;
export function corpTax(profit) {
  if (profit <= 0) return 0;
  if (profit <= TAX.smallLimit) return profit * TAX.smallRate;
  if (profit >= TAX.mainLimit) return profit * TAX.mainRate;
  // Marginal relief: the effective rate climbs smoothly from the small rate to the main rate
  const f = (profit - TAX.smallLimit) / (TAX.mainLimit - TAX.smallLimit);
  return profit * (TAX.smallRate + f * (TAX.mainRate - TAX.smallRate));
}
export function taxEstimate(s, extraDay = true) {
  const w = { ...s.taxWeek };
  if (extraDay) addDayToTaxWeek(w, s.today, s);
  const share = declareShare(s);
  const declared = w.sales + w.laundered + (w.washTaxed || 0), vatable = (w.vatSales + w.laundered) * share;
  const vat = s.vatRegistered || s.stats.declared + declared * share >= TAX.vatThreshold ? vatable * TAX.vatRate / (1 + TAX.vatRate) : 0;
  const profit = Math.max(0, declared * share - vat + w.income - w.costs);
  const corp = corpTax(profit);
  const ni = Math.max(0, w.wages - TAX.niThreshold) * TAX.niRate;
  const save = s.crew.accountant ? TAX.accountantSave : 0;
  const total = Math.round((vat + corp + ni) * (1 - save) * (s.challenge === 'doubletax' ? 2 : 1));
  return { vat: Math.round(vat), corp: Math.round(corp), ni: Math.round(ni), profit: Math.round(profit), declared: Math.round(declared * share), hidden: Math.round(declared * (1 - share)), total, saved: Math.round((vat + corp + ni) * save) };
}
function addDayToTaxWeek(w, td) {
  w.served = (w.served || 0) + td.served; w.missed = (w.missed || 0) + td.missed; w.bags = (w.bags || 0) + td.bagsSold;
  w.sales += td.sales; w.vatSales += td.vatSales; w.laundered += td.laundered; w.income += td.income;
  w.costs += td.ingSpent + td.upgradesSpent + td.capex + td.rent + td.wages; w.wages += td.wages;
}
const freshTaxWeek = () => ({ sales: 0, vatSales: 0, laundered: 0, income: 0, costs: 0, wages: 0, washTaxed: 0, washSuspect: 0 });
export function setDeclare(s, k) { if (DECLARE[k]) s.declare = k; }
export const investigateChance = s => Math.min(0.9, (TAX.investigateBase + TAX.investigateUnder * (1 - declareShare(s))
  + TAX.investigateLaunder * Math.min(1, (s.taxWeek.laundered + (s.taxWeek.washSuspect || 0)) / Math.max(1, s.taxWeek.sales + s.taxWeek.laundered + (s.taxWeek.washSuspect || 0))) + s.heat / 500
  + INSURANCE.claimSuspect * (s.taxWeek.claims || 0)) * (s.crew.accountant ? 0.5 : 1) * (1 - eff(s, 'audit')));
function settleTax(s, t) {
  const est = taxEstimate(s, false), w = s.taxWeek;
  s.stats.declared = (s.stats.declared || 0) + est.declared;
  if (!s.vatRegistered && s.stats.declared >= TAX.vatThreshold) { s.vatRegistered = true; note(s, `🧾 Your takings passed £${TAX.vatThreshold.toLocaleString('en-GB')}: you're registered for VAT. Hot food and drinks now carry 20%.`, 'info', t); }
  let line = `🧾 HMRC: £${est.total.toLocaleString('en-GB')} this week (VAT £${est.vat.toLocaleString('en-GB')}, corporation tax £${est.corp.toLocaleString('en-GB')}, NI £${est.ni.toLocaleString('en-GB')}).`;
  const paid = Math.min(est.total, Math.max(0, Math.floor(s.clean)));
  s.clean = round2(s.clean - paid); s.stats.taxPaid = (s.stats.taxPaid || 0) + paid;
  if (paid < est.total) {
    const owed = Math.round((est.total - paid) * (1 + TAX.latePenalty));
    s.hmrc = (s.hmrc || 0) + owed;
    line += ` Couldn't pay it all: £${owed.toLocaleString('en-GB')} owed, with a penalty and interest.`;
  }
  // An investigation looks at what you didn't declare, and at money that came from nowhere
  if (rand() < investigateChance(s)) {
    if (est.hidden > 0) {
      const back = Math.round(corpTax(est.hidden) + est.hidden * TAX.vatRate / (1 + TAX.vatRate));
      const bill = Math.round(back * (1 + TAX.evasionPenalty));
      s.hmrc = (s.hmrc || 0) + bill;
      s.rep = clamp(s.rep - TAX.evasionPop, 0, 100);
      s.scandalUntil = Math.max(s.scandalUntil, t + 48 * HOUR);
      s.heat = clamp(s.heat + 10, 0, 100);
      w.caught = true; addEvidence(s, CASE.hmrc, t);
      note(s, `🕵️ HMRC investigated your books and found £${est.hidden.toLocaleString('en-GB')} you didn't declare: £${bill.toLocaleString('en-GB')} in back tax and penalties. It made the papers.`, 'bad', t);
    }
    // They may shut a front while they look into it
    const open = Object.keys(s.wash.fronts).filter(id => s.wash.fronts[id].closedUntil <= t);
    if (open.length && rand() < FRONT_AUDIT) { const id = pick(open); s.wash.fronts[id].closedUntil = t + 3 * DAY; note(s, `🕵️ HMRC closed your ${FRONTS[id].name.toLowerCase()} for three days while they go through its books.`, 'bad', t); }
    if (est.hidden > 0) {
      // (reported above)
    } else if (w.laundered + (w.washSuspect || 0) > w.sales * 0.5) {
      s.heat = clamp(s.heat + 8, 0, 100);
      note(s, '🕵️ HMRC went through the books. Everything was declared, but they asked a lot of questions about where the money came from. Heat +8.', 'bad', t);
    } else note(s, '🕵️ HMRC went through the books and found everything in order.', 'good', t);
  }
  est.grades = reportCard(s, est);
  note(s, line, paid < est.total ? 'bad' : 'info', t);
  for (const [id, k] of Object.entries(s.contracts)) {
    const c = SUPPLIERS[id];
    if (k.bought < c.min) { s.clean = round2(s.clean - c.fine); note(s, `${c.emoji} You bought ${k.bought} of ${c.min} from ${c.name} this week: £${c.fine} fine.`, 'bad', t); }
    k.bought = 0;
  }
  s.taxWeek = freshTaxWeek();
  return est;
}
export function payHmrc(s) {
  const n = Math.min(Math.round(s.hmrc || 0), Math.floor(s.clean));
  if (n <= 0) return say('Not enough clean cash.', 'bad');
  s.clean = round2(s.clean - n); s.hmrc -= n; s.stats.taxPaid = (s.stats.taxPaid || 0) + n;
  say(`Paid HMRC £${n.toLocaleString('en-GB')}.`, 'good');
}

// ---------- Special orders ----------
export const orderCap = s => capAt(ORDERS.caps, s.level);
function bakeryOrder(s, t) {
  const sellable = s.recipes.filter(id => s.shops.some(x => SHOPS[x.id].machines.includes(ITEMS[id].machine) && x.machines.some(m => m.type === ITEMS[id].machine)));
  if (!sellable.length) return null;
  const id = pick(sellable), r = ITEMS[id];
  const qty = Math.round(r.servings * (1 + rand() * 2));
  const hours = ORDERS.minHours + Math.floor(rand() * (ORDERS.maxHours - ORDERS.minHours));
  return { id: s.nextId++, kind: 'bakery', item: id, qty, client: pick(CLIENTS), until: t + hours * HOUR,
    pay: Math.round(qty * r.price * ORDERS.bakeryPay), xp: Math.round(qty * saleXp(id) * ORDERS.xpMult) };
}
function dezOrder(s, t) {
  const known = knownProducts(s);
  if (!known.length) return null;
  const id = pick(known), p = PRODUCTS[id];
  const qty = Math.max(4, Math.round(p.bags * (0.8 + rand() * 1.5)));
  const hours = ORDERS.minHours + Math.floor(rand() * (ORDERS.maxHours - ORDERS.minHours));
  return { id: s.nextId++, kind: 'dez', item: id, qty, client: pick(DEZ_CLIENTS), until: t + hours * HOUR,
    pay: Math.round(qty * p.price * ORDERS.dezPay), xp: Math.round(qty * bagXp(id) * ORDERS.xpMult) };
}
function newOrders(s, t) {
  while (s.orders.length < orderCap(s)) {
    const o = s.labUnlocked && rand() < 0.4 ? dezOrder(s, t) : bakeryOrder(s, t);
    if (!o) break;
    s.orders.push(o);
  }
}
export const orderStock = (s, o) => (o.kind === 'dez' ? s.bags[o.item] || 0 : s.shops.reduce((a, x) => a + (x.display[o.item] || 0), 0));
export function deliverOrder(s, oid, t = s.clock, quiet = false) {
  const o = s.orders.find(x => x.id === oid);
  if (!o) return false;
  if (orderStock(s, o) < o.qty) { if (!quiet) say(`You need ${o.qty} ${(o.kind === 'dez' ? PRODUCTS : ITEMS)[o.item].name} (you have ${orderStock(s, o)}).`, 'bad'); return false; }
  if (o.kind === 'dez') {
    s.bags[o.item] -= o.qty; s.dirty += o.pay; s.stats.nightCash = (s.stats.nightCash || 0) + o.pay;
    s.heat = clamp(s.heat + ORDERS.heat, 0, 100); s.street = clamp(s.street + 2, 0, 100);
  } else {
    let left = o.qty;
    for (const x of s.shops) { const n = Math.min(left, x.display[o.item] || 0); x.display[o.item] -= n; left -= n; }
    s.clean = round2(s.clean + o.pay); s.today.sales = round2(s.today.sales + o.pay); s.stats.totalSales = round2(s.stats.totalSales + o.pay);
    if (TAX.vatGroups.includes(ITEMS[o.item].group)) s.today.vatSales += o.pay;
    s.rep = clamp(s.rep + 1, 0, 100);
  }
  s.orders = s.orders.filter(x => x !== o);
  s.today.ordersDone++; s.stats.orders = (s.stats.orders || 0) + 1;
  addXp(s, o.xp);
  const msg = `📦 ${o.client}: ${o.qty} ${(o.kind === 'dez' ? PRODUCTS : ITEMS)[o.item].name} delivered. +£${o.pay.toLocaleString('en-GB')}${o.kind === 'dez' ? ' dirty' : ''}.`;
  if (quiet) note(s, msg, 'good', t); else say(msg, 'good');
  return true;
}
export function dropOrder(s, oid) { s.orders = s.orders.filter(x => x.id !== oid); }
function runOrders(s, t) {
  for (const o of [...s.orders]) {
    // Grace (bakery) and Lenny (back room) deliver anything that's ready
    if ((o.kind === 'bakery' && s.crew.manager) || (o.kind === 'dez' && s.crew.driver)) if (orderStock(s, o) >= o.qty) { deliverOrder(s, o.id, t, true); continue; }
    if (t >= o.until) {
      s.orders = s.orders.filter(x => x !== o); s.today.ordersMissed++;
      if (o.kind === 'dez') s.street = clamp(s.street - ORDERS.missStreet, 0, 100); else s.rep = clamp(s.rep - ORDERS.missPop, 0, 100);
      note(s, `⌛ ${o.client} gave up on their order.`, 'info', t);
    }
  }
  if (t - (s.lastOrderAt || 0) >= ORDERS.everyHours * HOUR) { s.lastOrderAt = t; newOrders(s, t); }
}

// ---------- Milestones ----------
const statOf = (s, k) => ({ served: s.stats.served || 0, won: s.won ? 1 : 0, level: s.level, recipes: s.recipes.length, shops: s.shops.length,
  decor: s.shops.reduce((a, x) => a + x.design.decor.length, 0), orders: s.stats.orders || 0, fivestars: s.stats.fiveStars || 0,
  bags: s.stats.totalBags || 0, laundered: s.stats.totalLaundered || 0, corners: Object.keys(s.corners).length, taxPaid: s.stats.taxPaid || 0, busts: s.stats.busts || 0 })[k];
export const milestoneProgress = (s, m) => Math.min(1, statOf(s, m.stat) / m.n);
function checkMilestones(s, t) {
  for (const m of MILESTONES) {
    if (s.milestones[m.id] || statOf(s, m.stat) < m.n) continue;
    s.milestones[m.id] = t;
    s.clean = round2(s.clean + m.cash);
    addXp(s, Math.round(m.cash / 10));
    note(s, `${m.emoji} Milestone: ${m.name}! +£${m.cash.toLocaleString('en-GB')}`, 'good', t);
  }
}

// ---------- The food critic ----------
export const reviewBoost = (s, t = s.clock) => ((s.review && s.review.until > t) ? CRITIC.boost[s.review.stars - 1] : 1);
function criticVisits(s, t) {
  const stocked = menuOf(s).filter(id => s.display[id] > 0).length, slots = menuSlots(s);
  const score = 0.4 * (stocked / Math.max(1, slots)) + 0.3 * Math.min(1, (charmBonus(s) - 1) / 0.3) + 0.3 * (s.rep / 100) + (rand() - 0.5) * 0.2;
  const stars = clamp(Math.round(score * 5 + 0.5), 1, 5);
  s.review = { stars, until: t + CRITIC.boostHours * HOUR, by: pick(CRITIC.names) };
  s.rep = clamp(s.rep + CRITIC.pop[stars - 1], 0, 100);
  if (stars === 5) s.stats.fiveStars = (s.stats.fiveStars || 0) + 1;
  note(s, `📝 ${s.review.by} reviewed ${shopDef(s).name}: ${'⭐'.repeat(stars)}${stars <= 2 ? ' The case was half empty.' : stars >= 4 ? ' Queues out of the door for days.' : ''}`, stars >= 4 ? 'good' : stars <= 2 ? 'bad' : 'info', t);
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
  if (s.rival?.open) s.rival.share = Math.max(0, s.rival.share - RIVAL.campaignHit);
  s.campaigns = activeCampaigns(s, t).concat([{ id, until: t + c.hours * HOUR * (s.crew.director ? 1.5 : 1) }]);
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
    rent: 0, wages: 0, nightWages: 0, income: 0, peakHeat: s.heat || 0, bribe: null, jayWorked: false, cornerSales: 0, cornerCash: 0,
    vatSales: 0, capex: 0, ordersDone: 0, ordersMissed: 0, events: [] };
}
function rollMarket(s) {
  s.event = null;
  let r = rand();
  for (const ev of EVENTS) { if (r < ev.p) { s.event = { ...ev }; break; } r -= ev.p; }
  for (const k in INGREDIENTS) s.market[k] = round2(0.85 + rand() * 0.4);
  if (s.event?.flour) s.market.flour = round2(s.market.flour * s.event.flour);
}
export function newGame(t = Date.now(), prestige = null) {
  const s = {
    v: SAVE_VERSION, created: t, clock: t, last: t, startDay: dayStart(t), nextId: 1,
    clean: CFG.startClean, dirty: 0, heat: 0, rep: 50,
    balance: CFG.debtTotal, arrears: 0, strikes: 0, behind: 0, paymentsMade: 0, won: false,
    inv: Object.assign(Object.fromEntries(Object.keys(INGREDIENTS).map(k => [k, 0])), { flour: 30, butter: 12, sugar: 12, eggs: 10, chocolate: 6, milk: 10 }),
    market: {}, event: null,
    level: 1, xp: 0, levelUps: [],
    recipes: [...START_RECIPES], priceLevel: {}, shops: [makeShop('stall')], cur: 0,
    kits: {}, bags: {}, purity: {}, cut: {}, street: CFG.streetStart, corners: {},
    taxWeek: freshTaxWeek(), wash: freshWash(), staff: {}, decisions: [], nextChoiceAt: null, case: { evidence: 0 }, contracts: {}, insurance: {}, rival: { open: false, share: 0 }, auction: null, goals: { daily: [], weekly: [], dayStart: 0 }, areaHeat: { vans: 0, streets: 0 }, challenge: 'none', packageUntil: 0, vans: { count: 0, level: 0, hide: 0, impounded: [] }, shipments: [], delivery: { on: false, riders: 0, out: 0 }, deliveries: [], declare: 'full', vatRegistered: false, hmrc: 0, orders: [], lastOrderAt: t, milestones: {}, review: null, criticAt: null,
    upgrades: {}, property: {}, crew: Object.fromEntries(Object.keys(CREW).map(r => [r, false])),
    labUnlocked: false, offerAfter: t + 2 * HOUR, offerPending: false, nightsActive: 0, lastLab: 0,
    campaigns: [], lastCharity: 0, scandalUntil: 0, sealedUntil: 0, lastVisit: 0,
    holidayUsed: false, holidayNext: false, night: {},
    feed: [], reports: [], today: null,
    stats: { totalBags: 0, totalLaundered: 0, totalSales: 0, paid: 0, busts: 0, visits: 0, xp: 0, served: 0, missed: 0, nightCash: 0 },
  };
  bindShops(s);
  s.machines = [{ type: 'oven', spot: 0, job: null, last: null }, { type: 'oven', spot: 1, job: null, last: null }, { type: 'mixer', spot: 5, job: null, last: null }];
  s.onMenu = [...START_RECIPES];
  for (const id in ITEMS) s.priceLevel[id] = 'normal';
  s.display.sourdough = 20; s.display.croissant = 16; // Aunt Rosa's last bake
  rollMarket(s); s.event = null;
  s.prestige = prestige || { tokens: 0, total: 0, resets: 0, perks: {}, best: 0 };
  if (prestige) { applyPerks(s); learnFree(s); }
  s.today = freshLedger(s, t);
  scheduleNight(s, t);
  return s;
}
// Saves from before the real-time clock keep their progress; the clock starts now.
export function migrate(s, t = Date.now()) {
  if (s.v === 3) {
    // One shop becomes a list of shops
    s.shops = [{ id: 'stall', machines: s.machines, display: s.display, onMenu: s.onMenu, design: s.design, custAcc: s.custAcc || 0 }];
    for (const f of SHOP_FIELDS) delete s[f];
    delete s.branches;
    s.cur = 0; s.v = SAVE_VERSION;
  }
  if (s.v === 4) {
    s.shops[0].lab = s.lab || []; s.shops[0].door = s.door || []; s.shops[0].buyAcc = s.buyAcc || 0;
    for (const x of s.shops.slice(1)) { x.lab = []; x.door = []; x.buyAcc = 0; }
    delete s.lab; delete s.door; delete s.buyAcc;
    s.v = SAVE_VERSION;
  }
  if (s.v === SAVE_VERSION) {
    bindShops(s);
    s.cur = Math.min(s.cur || 0, s.shops.length - 1);
    s.purity ??= {}; s.cut ??= {}; s.street ??= CFG.streetStart; s.corners ??= {};
    s.prestige ??= { tokens: 0, total: 0, resets: 0, perks: {}, best: 0 };
    s.staff ??= {}; s.decisions ??= []; s.case ??= { evidence: 0 }; s.contracts ??= {}; s.insurance ??= {}; s.rival ??= { open: false, share: 0 }; s.auction ??= null;
    s.goals ??= { daily: [], weekly: [], dayStart: 0 }; s.areaHeat ??= { vans: 0, streets: 0 }; s.challenge ??= 'none'; s.packageUntil ??= 0;
    s.taxWeek ??= freshTaxWeek(); s.wash ??= freshWash(); s.vans ??= { count: 0, level: 0, hide: 0, impounded: [] }; s.shipments ??= []; s.delivery ??= { on: false, riders: 0, out: 0 }; s.deliveries ??= []; s.taxWeek.washTaxed ??= 0; s.taxWeek.washSuspect ??= 0; s.declare ??= 'full'; s.vatRegistered ??= false; s.hmrc ??= 0; s.orders ??= []; s.lastOrderAt ??= t; s.milestones ??= {}; s.review ??= null; s.criticAt ??= null;
    if (s.today) { s.today.vatSales ??= 0; s.today.capex ??= 0; s.today.ordersDone ??= 0; s.today.ordersMissed ??= 0; }
    for (const x of s.shops) { for (const id in ITEMS) x.display[id] ??= 0; x.custAcc ||= 0; x.design.base ??= { floor: SHOPS[x.id].floor, wall: SHOPS[x.id].wall }; }
    for (const x of s.shops) { x.lab ??= []; x.door ??= []; x.buyAcc ??= 0; x.stock ??= {}; for (const m of x.lab) m.tier ??= 0; }
    for (const o of [s.kits, s.bags]) for (const id in o) if (!PRODUCTS[id]) delete o[id];
    for (const x of s.shops) {
      x.lab = x.lab.filter(m => LAB_MACHINES[m.type]); x.door = x.door.filter(b => PRODUCTS[b.product]);
      for (const m of x.lab) if (m.job && !PRODUCTS[m.job.item]) m.job = null;
    }
    if (s.today) { s.today.cornerSales ??= 0; s.today.cornerCash ??= 0; }
    for (const k in INGREDIENTS) { s.inv[k] ??= 0; s.market[k] ??= 1; }
    for (const id in ITEMS) s.priceLevel[id] ||= 'normal';
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
    n.shops[0].lab = [{ type: 'tent', spot: 0, job: null, last: null, tier: 0 }];
    n.kits = { homegrown: 2 };
  }
  if (s.design) n.design = { ...s.design, base: n.design.base };
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
  checkMilestones(s, now);
  checkGoals(s, now);
  liveMode = false;
}

function span(s, t0, t1, showIt) {
  const mins = (t1 - t0) / MIN;
  s.clock = t1;
  const watching = s.cur || 0;
  eachShop(s, i => shopSpan(s, t0, t1, mins, showIt && i === watching));
  shared(s, t0, t1, mins);
  if (s.labUnlocked) { runLogistics(s, t1); runDeliveries(s, t1); }
  runOrders(s, t1);
  runDecisions(s, t1);
  for (const a in s.areaHeat) s.areaHeat[a] = Math.max(0, s.areaHeat[a] - AREA_HEAT.decayPerHour * mins / 60);
  if (s.auction && t1 > s.auction.until) s.auction = null;
  if (s.criticAt && t1 >= s.criticAt) { s.criticAt = null; const keep = s.cur; s.cur = Math.floor(rand() * s.shops.length); criticVisits(s, t1); s.cur = keep; }
  // HMRC interest on unpaid tax
  if (s.hmrc > 0) s.hmrc += s.hmrc * TAX.interestDaily * mins / 1440;
}
function shopSpan(s, t0, t1, mins, showIt) {
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
  // Customers
  s.custAcc += customersPerHour(s, t0) / 60 * mins;
  while (s.custAcc >= 1) { s.custAcc -= 1; customerVisit(s, t0 + rand() * (t1 - t0), showIt); }
  // This shop's back room: the night cook bags finished cooks; buyers come to its back door after dark
  if (s.crew.cook) s.lab.forEach((m, i) => { if (m.job && t1 >= m.job.start + m.job.dur) collectLab(s, i, t1, { quiet: true }); });
  if (s.labUnlocked && !s.cur && isNight(t0) && !sealed(s, t0)) {
    s.buyAcc += buyersPerHour(s) / 60 * mins;
    while (s.buyAcc >= 1) { s.buyAcc -= 1; buyerArrives(s, t0 + rand() * (t1 - t0)); }
  } else s.buyAcc = 0;
  for (const b of [...s.door]) if (t1 >= b.arrive + b.patience) unattended(s, b, t1);
}
function shared(s, t0, t1, mins) {
  // Couriers and rival crews come to the stall's back door
  if (s.labUnlocked && isNight(t0) && !sealed(s, t0)) {
    const keep = s.cur; s.cur = 0;
    if (s.night.courierAt && t1 >= s.night.courierAt) { s.night.courierAt = null; courierArrives(s, t1); }
    if (s.night.rivalAt && t1 >= s.night.rivalAt) { s.night.rivalAt = null; rivalsStrike(s, t1); }
    s.cur = keep;
  }
  if (s.labUnlocked && !sealed(s, t0)) runCorners(s, t0, t1, mins);
  if (s.labUnlocked) runWash(s, t1, mins);
  // Street reputation drifts back to the middle
  s.street += (s.street > CFG.streetHome ? -1 : 1) * Math.min(Math.abs(s.street - CFG.streetHome), CFG.streetDrift * mins / 60);
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
  if (!s.labUnlocked && !s.offerPending && t1 >= s.offerAfter && s.challenge !== 'nolab') s.offerPending = true;
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
  s.taxWeek.busts = (s.taxWeek.busts || 0) + 1; addEvidence(s, CASE.bust, t);
  const lawyer = s.crew.lawyer;
  const fineDirty = Math.round(s.dirty * CFG.bustFineDirty * (lawyer ? 0.5 : 1));
  const fineClean = Math.min(Math.max(0, s.clean), CFG.bustFineClean * (lawyer ? 0.5 : 1));
  s.dirty -= fineDirty; s.clean = round2(s.clean - fineClean);
  let bags = 0, kits = 0;
  for (const id in s.bags) { bags += s.bags[id]; s.bags[id] = 0; }
  for (const id in s.kits) { kits += s.kits[id]; s.kits[id] = 0; }
  for (const x of s.shops) { for (const m of x.lab) m.job = null; x.door = []; }
  s.deliveries = [];
  for (const k of Object.values(s.wash.fronts)) k.closedUntil = Math.max(k.closedUntil, t + 3 * DAY);
  s.wash.smurfDaily = 0;
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
  s.street = clamp(s.street - CFG.streetBust, 0, 100);
  for (const k of Object.values(s.corners)) k.stock = 0;
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
      if (s.insurance?.premises) claim(s, take, 'the till', t);
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
  // The accountant puts the safe amount through before the books close; then the fronts and Felix do their bit
  if (s.crew.accountant && s.dirty > 0) launder(s, Math.min(s.dirty, launderLeft(s)), true);
  if (s.labUnlocked) washMorning(s, t);
  // Bills
  const rent = shopRent(s) + businessRates(s), dayWages = crewWages(s, 'day'), income = eff(s, 'income');
  td.rent = rent; td.wages = dayWages; td.income = income;
  s.clean = round2(s.clean + income);
  const bill = rent + dayWages;
  if (s.clean >= bill) s.clean = round2(s.clean - bill);
  else {
    let left = round2(bill - Math.max(0, s.clean)); s.clean = 0;
    for (const [r, c] of Object.entries(CREW)) if (left > 0 && s.crew[r] && c.shift === 'day') { s.crew[r] = false; left = round2(left - c.wage); note(s, `💸 You couldn't pay ${c.name}, so ${c.name} quit.`, 'bad', t); }
    if (left > 0) { s.arrears = round2(s.arrears + left); s.balance = round2(s.balance + left); s.behind = Math.max(1, s.behind); note(s, `💸 You couldn't cover the rent: £${Math.round(left)} goes on what you owe the bank.`, 'bad', t); }
  }
  const nightWages = s.labUnlocked ? crewWages(s, 'night') + s.delivery.riders * DELIVERY.riderWage : 0;
  s.delivery.out = 0;
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
    note(s, `🚔 Jay was picked up on the street. Heat +${CFG.dealerArrestHeat}.`, 'bad', t);
    const bail = LOYALTY.bailBase + LOYALTY.bailPerLevel * s.level;
    pushDecision(s, { kind: 'bail', who: 'Jay', role: 'dealer', cost: bail, title: 'Bail for Jay', text: `Jay's in a cell and hasn't said a word, yet. Pay £${bail.toLocaleString('en-GB')} dirty bail and he's back on the street tonight.`, yes: 'Pay bail', no: 'Cut him loose' }, t);
  }
  if (td.bagsSold || td.labBatches) s.nightsActive++;
  // Police: raids and tax inspections, judged on how hot it got yesterday
  const hot = td.peakHeat + cashPileHeat(s);
  const raid = hot >= CFG.raidAt && rand() < (hot - 50) / 100 * (1 - eff(s, 'tipoff')) * (s.crew.copper ? 0.6 : 1) * (s.delivery.on ? DELIVERY.raidMult : 1);
  const product = Object.values(s.bags).reduce((a, b) => a + b, 0) + Object.values(s.kits).reduce((a, b) => a + b, 0);
  if (raid && (product > 0 || (s.packageUntil || 0) > t) && rand() < (hot - 60) / 60 * (1 - eff(s, 'hide')) * ((s.packageUntil || 0) > t ? 1.6 : 1)) bust(s, t, (s.packageUntil || 0) > t ? 'A dawn raid found Dez\'s package in the back room.' : 'A dawn raid found product in the back room.');
  else if (raid) {
    const lost = Math.round(s.dirty * (has(s, 'safe') ? CFG.safeRaidShare : 0.5));
    for (const id in s.bags) s.bags[id] = 0;
    for (const id in s.kits) s.kits[id] = 0;
    s.dirty -= lost; s.heat = clamp(s.heat - 10, 0, 100); addEvidence(s, CASE.raid, t);
    note(s, `🚓 Raid! They took every bag and kit and £${lost.toLocaleString('en-GB')} of dirty cash. Not enough to charge you. Yet.`, 'bad', t);
  } else if (td.peakHeat >= CFG.inspectAt && rand() < CFG.inspectChance) {
    if (td.launderHeat > 0) {
      const fine = Math.min(Math.max(0, s.clean), CFG.inspectFine * (s.crew.accountant ? 0.5 : 1));
      s.clean = round2(s.clean - fine); s.heat = clamp(s.heat + 15, 0, 100);
      note(s, `🧾 A tax inspector went through the books. The takings didn't add up: fined £${Math.round(fine)}, heat +15.`, 'bad', t);
    } else { s.heat = clamp(s.heat - 8, 0, 100); note(s, '🧾 A tax inspector went through the books and found nothing. Heat -8.', 'good', t); }
  }
  // Corners: police sweeps and rival crews
  for (const [id, k] of Object.entries(s.corners)) {
    const c = CORNERS[id], sold = k.soldToday; k.soldToday = 0;
    if (!sold) continue;
    if (rand() < c.risk * (0.5 + (s.areaHeat?.streets || 0) / 60 + s.heat / 300) * (s.crew.copper ? 0.5 : 1)) {
      const lost = k.stock; k.stock = 0; areaHeat(s, 'streets', CFG.cornerSweepHeat); addEvidence(s, CASE.sweep, t); s.taxWeek.seizures = (s.taxWeek.seizures || 0) + 1;
      note(s, `🚓 Police swept ${c.name.toLowerCase()}: ${lost} bags seized. Heat +${CFG.cornerSweepHeat}.`, 'bad', t);
    } else if (feature(s, 'rivals') && !s.crew.muscle && rand() < 0.03) {
      const lost = k.stock; k.stock = 0;
      note(s, `👥 A rival crew ran your people off ${c.name.toLowerCase()} and took ${lost} bags. Muscle would have helped.`, 'bad', t);
    }
  }
  // The debt collectors, if you're behind
  if (s.arrears > 0 && !s.won) {
    const odds = Math.min(CFG.heaviesMax, CFG.heaviesBase + CFG.heaviesPerMiss * Math.max(0, s.behind - 1));
    if (t - (s.lastVisit || 0) >= CFG.heaviesCooldownDays * DAY && rand() < odds) { s.lastVisit = t; const keep = s.cur; s.cur = 0; heaviesVisit(s, t); s.cur = keep; }
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
  if (s.crew.cleaner) eachShop(s, () => {
    let fixed = 0;
    for (const k in s.design.floor) if (fixed < 2 && s.design.floor[k] === 'cracked') { delete s.design.floor[k]; fixed++; }
    for (const k in s.design.wall) if (fixed < 2 && s.design.wall[k] === 'torn') { delete s.design.wall[k]; fixed++; }
  });
  // A new day's market (the manager stocks up after it)
  rollMarket(s);
  if (s.crew.manager) eachShop(s, () => { for (const id of menuOf(s)) for (const [k, q] of Object.entries(ITEMS[id].ing)) {
    const want = q * 3; if (s.inv[k] < want && s.clean > 300) buyIngredient(s, k, want - s.inv[k], true);
  } });
  // Safety net: broke with nothing to bake
  const canBake = s.recipes.some(id => canMake(s, id) && s.shops.some(x => x.machines.some(m => m.type === ITEMS[id].machine && !m.broken)));
  if (s.clean < 30 && !canBake) { s.clean = round2(s.clean + CFG.hardshipGrant); note(s, `🤝 The market traders' association chips in £${CFG.hardshipGrant} so you can buy flour and start again.`, 'good', t); }
  // Tax: the day goes on the books; once a week HMRC settles up
  addDayToTaxWeek(s.taxWeek, td);
  let tax = null;
  if (di > 0 && di % 7 === TAX.taxDay) tax = settleTax(s, t);
  if (s.hmrc > 1) {
    const take = Math.min(Math.round(s.hmrc), Math.floor(Math.max(0, s.clean) * TAX.collectShare));
    if (take > 0) { s.clean = round2(s.clean - take); s.hmrc -= take; s.stats.taxPaid = (s.stats.taxPaid || 0) + take; note(s, `🧾 HMRC collected £${take.toLocaleString('en-GB')} of what you owe them.`, 'bad', t); }
  }
  if (!s.criticAt && rand() < CRITIC.chance) s.criticAt = t + (2 + rand() * 14) * HOUR;
  // Insurance premiums, crew loyalty, the case, the rival, auctions, goals, the next surprise
  const premium = Object.keys(INSURANCE).filter(k => s.insurance[k]).reduce((a, k) => a + insurancePremium(s, k), 0);
  if (premium) { s.clean = round2(Math.max(0, s.clean - premium)); td.rent += premium; }
  for (const r of Object.keys(CREW)) if (s.crew[r]) {
    const st = staffOf(s, r); st.loyalty = Math.min(100, st.loyalty + LOYALTY.perDay);
    if (CREW[r].shift === 'night' && st.loyalty < LOYALTY.informAt && rand() < LOYALTY.informChance) {
      addEvidence(s, CASE.informant, t); note(s, `🐀 ${CREW[r].name} has been talking to ${CASE.detective}. Evidence +${CASE.informant}. A bonus might buy some loyalty back.`, 'bad', t);
    }
  }
  if (s.labUnlocked) s.case.evidence = Math.max(0, s.case.evidence - (td.labBatches ? CASE.decayBusy : CASE.decay));
  if (s.rival.open) {
    const low = menuOf(s).filter(id => s.priceLevel[id] === 'low').length > menuOf(s).length / 2;
    s.rival.share = clamp(s.rival.share + RIVAL.grow - (low ? RIVAL.lowPriceHit * 2 : 0), 0, RIVAL.max);
    if (s.rival.share <= 0.02) { s.rival = { open: false, share: 0, closedUntil: t + RIVAL.closedDays * DAY }; note(s, `🏳️ ${RIVAL.name} closed down. Their regulars are back.`, 'good', t); }
  } else if (s.level >= RIVAL.level && s.rep >= RIVAL.pop && t > (s.rival.closedUntil || 0) && rand() < RIVAL.chance) {
    s.rival = { open: true, share: RIVAL.start }; note(s, `🥐 ${RIVAL.name} opened across the road, and some of your customers are trying it.`, 'bad', t);
  }
  if (di % 7 === AUCTION.day) startAuction(s, t);
  if (s.goals.dayStart !== dayStart(t)) { s.goals.daily = makeGoals(s, 'daily'); s.goals.dayStart = dayStart(t); }
  if (!s.goals.weekly.length || di % 7 === TAX.taxDay) s.goals.weekly = makeGoals(s, 'weekly');
  if (rand() < 0.5) s.nextChoiceAt = t + (2 + rand() * 18) * HOUR;
  // File yesterday's report and open a new day
  s.reports.push({ day: td.day, ledger: td, payment, tax, level: s.level, areaHeat: { ...s.areaHeat }, evidence: Math.round(s.case.evidence) });
  if (s.reports.length > 10) s.reports.shift();
  s.today = freshLedger(s, t);
  scheduleNight(s, t);
}
