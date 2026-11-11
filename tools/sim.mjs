// Balance check for the real-time game: bots check in a few times a day over many days.
// node "C:\Users\khale\Documents\Claude projects\BakingBad\tools\sim.mjs" [runs] [days]
import * as G from '../www/js/game.js';
import * as D from '../www/js/design.js';
import { ITEMS, CFG, UPGRADES, MACHINES, LAB_MACHINES, PRODUCTS, CREW, PROPERTY, CAMPAIGNS, CORNERS, SHOPS, TIERS, FRONTS } from '../www/js/data.js';
G.onToast(() => {});

const RUNS = Number(process.argv[2]) || 6;
const TRACE = process.env.TRACE; // TRACE=careful: one run of that strategy, day by day
const DAYS = Number(process.argv[3]) || 120;
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;

// When the bot looks at the game (local hours). Everything else happens while it's away.
const CHECKINS = [8, 12.5, 17.5, 21.5];
const STRATS = {
  honest:  { crook: false, declare: 'full' },
  careful: { crook: true, declare: 'most', coolAt: 40, bribeAt: 45, serveHinted: false, launder: 1.0 },
  greedy:  { crook: true, declare: 'half', coolAt: 75, bribeAt: 65, serveHinted: true, launder: 1.3 },
};

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const picks = [];
const profit = (s, id) => ITEMS[id].servings * G.itemPrice(s, id) - G.batchCost(s, id);
// Pick what to cook on a machine so it's ready (and not spoiled) by the next check-in
function chooseRecipe(s, m, t, next) {
  const gap = next - t;
  let best = null, bestScore = -Infinity;
  for (const id of picks[s.cur || 0] || []) {
    const r = ITEMS[id];
    if (r.machine !== m.type) continue;
    // room on its own counters, or a free counter if it has none yet (don't spill one thing over several counters)
    if ((G.countersFor(s, id).length ? G.trayCap(s, id) - (s.display[id] || 0) : G.roomFor(s, id)) < r.servings) continue;
    const cook = G.cookMs(s, id), keep = G.spoilMs(s, id);
    const auto = s.crew.baker; // Priya collects as soon as it's done
    let score;
    if (auto) score = s.crew.chef ? profit(s, id) / cook : profit(s, id) * Math.min(1, gap / cook);
    else if (cook <= gap && gap <= cook + keep) score = profit(s, id);
    else if (cook > gap) score = -1e6 + profit(s, id) / cook; // won't be done; still better than nothing
    else score = -2e6; // would spoil before we're back
    score -= (s.display[id] || 0) * G.itemPrice(s, id) * 0.3;
    if (score > bestScore) { bestScore = score; best = id; }
  }
  return bestScore > -1.5e6 ? best : null;
}

function placeSomeDecor(s) {
  const options = Object.entries(D.DECOR).filter(([, d]) => D.levelOk(s, d) && d.price < s.clean * 0.04 && d.charm > 0).sort((a, b) => b[1].charm / b[1].price - a[1].charm / a[1].price);
  if (!options.length || s.design.decor.length >= D.decorCap(s)) return;
  const cells = ['inside', 'front', 'side'].flatMap(z => D.allCells(z));
  for (const [type] of options) {
    for (const [cx, cz] of cells) {
      if (s.design.decor.length >= D.decorCap(s)) return;
      if (!D.canPlace(s, type, cx, cz)) { D.placeDecor(s, type, cx, cz); break; }
    }
  }
}

function checkIn(s, st, t, next) {
  if (s.offerPending) G.answerOffer(s, st.crook);
  G.setDeclare(s, st.declare);
  for (const o of [...s.orders]) G.deliverOrder(s, o.id, t, true);
  if (s.hmrc > 1) G.payHmrc(s);
  s.levelUps.length = 0;
  const reserve = G.daysToPayment(s) <= 2 ? G.nextDue(s) + 200 : 300;
  const spare = () => s.clean - reserve;
  // Every shop: collect, repair, set the menu, grow the kitchen
  G.eachShop(s, () => {
  s.machines.forEach((m, i) => { if (m.job && t >= m.job.start + m.job.dur) G.collectJob(s, i, t, { quiet: true }); });
  // Repairs
  s.machines.forEach((m, i) => { if (m.broken && spare() > G.repairCost(m.type)) G.repairMachine(s, i); });
  // Menu: the best-paying things we know, with variety across machines
  const known = s.recipes.filter(id => G.inSeason(id) && s.machines.some(m => m.type === ITEMS[id].machine && !m.broken)); // only what can be cooked today
  known.sort((a, b) => ITEMS[b].price * ITEMS[b].servings - ITEMS[a].price * ITEMS[a].servings);
  const byMachine = {};
  const picked = [];
  for (const id of known) { const k = ITEMS[id].machine; if ((byMachine[k] || 0) < 2) { picked.push(id); byMachine[k] = (byMachine[k] || 0) + 1; } }
  for (const id of known) if (!picked.includes(id)) picked.push(id);
  for (let c = G.nextCounter(s); c && G.unlocked(s, c.level) && c.price < spare() * 0.4; c = G.nextCounter(s)) if (!G.buyCounter(s)) break;
  picks[s.cur || 0] = picked.slice(0, G.menuSlots(s)); // what we'll cook here
  // Growth: machines, recipes, expansions, upgrades, property, crew, marketing, decor
  for (const type of Object.keys(MACHINES)) if (!G.machineBlock(s, type) && G.machinePrice(s, type) < spare() * 0.35) G.buyMachine(s, type);
  for (const [id, e] of Object.entries(D.EXPANSIONS)) if (!s.design.expansions[id] && D.levelOk(s, e) && (!e.needs || s.design.expansions[e.needs]) && e.price < spare() * 0.3 && (e.cells || e.spots || (e.labSpots && st.crook && !s.cur))) D.buyExpansion(s, id);
  for (const id of Object.keys(ITEMS)) { const r = ITEMS[id]; if (!s.recipes.includes(id) && G.unlocked(s, r.level) && G.machineCount(s, r.machine) && r.cost < spare() * 0.25) G.buyRecipe(s, id); }
  });
  for (const u of UPGRADES) if (G.upgradeAvailable(s, u) && G.unlocked(s, u.level) && (u.cash === 'clean' ? u.cost < spare() * 0.3 : st.crook && u.cost < s.dirty * 0.5)) G.buyUpgrade(s, u.id);
  for (const [id, p] of Object.entries(PROPERTY)) if (!s.property[id] && G.unlocked(s, p.level) && p.price < spare() * 0.4) G.buyProperty(s, id);
  const hireIf = (r, ok) => { if (!s.crew[r] && G.unlocked(s, CREW[r].level) && ok) G.hire(s, r); };
  hireIf('baker', spare() > 100);
  hireIf('cashier', spare() > 1500);
  hireIf('pr', s.rep < 40 && spare() > 1500);
  hireIf('cleaner', spare() > 3000);
  hireIf('chef', spare() > 4000);
  hireIf('manager', spare() > 6000);
  for (const [id, c] of Object.entries(CAMPAIGNS)) if (!G.campaignBlock(s, id, t) && c.price < spare() * 0.05) G.startCampaign(s, id, t);
  G.eachShop(s, () => {
    placeSomeDecor(s);
    s.machines.forEach((m, i) => { if ((m.tier || 0) < TIERS.max && G.tierCost(m.type, m.tier || 0) < spare() * 0.15) G.upgradeMachine(s, i); });
  });
  // The next branch, once it's affordable
  for (const id of G.nextShops(s)) if (G.unlocked(s, SHOPS[id].level) && G.shopPrice(s) < spare() * 0.5) G.buyShop(s, id);
  hireIf('souschef', spare() > 8000);
  hireIf('director', spare() > 20000);
  // Pay down the debt with anything well beyond what we need
  if (!s.won && spare() > 6000) G.payBank(s, spare() - 4000);
  if (G.restructureReady(s)) G.restructure(s);
  // Cook
  G.eachShop(s, () => s.machines.forEach((m, i) => { if (!m.job && !m.broken) { const id = chooseRecipe(s, m, t, next); if (id) G.startJob(s, i, id, t, { quiet: true }); } }));

  if (!st.crook || !s.labUnlocked) return;
  // The back room
  G.eachShop(s, () => { s.lab.forEach((m, i) => { if (m.job && t >= m.job.start + m.job.dur) G.collectLab(s, i, t, { quiet: true }); });
  for (const b of [...s.door]) {
    if (b.hint && !st.serveHinted) G.turnAway(s, b.id);
    else if ((s.bags[b.product] || 0) >= (b.courier ? b.want : 1)) G.serveBuyer(s, b.id, false, t);
  } });
  hireIf('dealer', true);
  hireIf('cook', s.dirty > 500);
  hireIf('lookout', s.dirty > 800);
  hireIf('muscle', s.dirty > 1500);
  hireIf('chemist', s.dirty > 4000);
  hireIf('driver', s.dirty > 4000);
  hireIf('lawyer', s.dirty > 8000);
  hireIf('accountant', spare() > 6000);
  hireIf('host', s.dirty > 2000);
  hireIf('runner', s.dirty > 1500 && Object.keys(s.corners).length > 0);
  hireIf('assistant', s.dirty > 3000);
  hireIf('copper', s.dirty > 10000);
  G.eachShop(s, () => s.lab.forEach((m, i) => { if ((m.tier || 0) < TIERS.max && G.tierCost(m.type, m.tier || 0, true) < (G.machineCash(m.type, true) === 'dirty' ? s.dirty * 0.2 : spare() * 0.15)) G.upgradeMachine(s, i, true); }));
  // Corners: buy what we can afford, give each the product we have most of, keep them stocked
  for (const [id, c] of Object.entries(CORNERS)) if (!s.corners[id] && G.unlocked(s, c.level) && c.price < s.dirty * 0.4) G.buyCorner(s, id);
  for (const id of Object.keys(s.corners)) {
    const k = s.corners[id];
    const best = Object.keys(s.bags).filter(p => s.bags[p] > 0).sort((a, b) => PRODUCTS[b].price * s.bags[b] - PRODUCTS[a].price * s.bags[a])[0];
    if (!k.product || (!k.stock && best && best !== k.product)) { if (best) G.setCornerProduct(s, id, best); }
    if (k.product && s.bags[k.product] > 0) G.stockCorner(s, id, Math.floor(s.bags[k.product] / 2));
  }
  G.eachShop(s, () => { for (const type of Object.keys(LAB_MACHINES)) { const cash = G.machineCash(type, true); if (!G.machineBlock(s, type, true) && G.machinePrice(s, type, true) < (cash === 'dirty' ? s.dirty * 0.5 : spare() * 0.3)) G.buyMachine(s, type, true); } });
  if (s.heat >= st.bribeAt && s.dirty > CFG.bribeCost * 2) G.bribe(s);
  if (s.case.evidence > 60 && s.dirty > G.caseBribeCost(s) * 2) G.bribeDetective(s, t);
  const cool = s.heat >= st.coolAt;
  G.eachShop(s, () => s.lab.forEach((m, i) => {
    if (m.job || m.broken || cool) return;
    const options = G.productsFor(m.type).filter(id => G.unlocked(s, PRODUCTS[id].level)).sort((a, b) => PRODUCTS[b].level - PRODUCTS[a].level);
    for (const id of options) if (G.startLab(s, i, id, t, { quiet: true })) break;
  }));
  // Logistics: vans from the branches, and a delivery round once it opens
  hireIf('dispatcher', s.shops.length > 1);
  while (s.vans.count < G.vanCap(s) && s.shops.length > 1 && 8000 * (1 + s.vans.count) < spare() * 0.1) G.buyVan(s);
  for (let i = 1; i < s.shops.length; i++) G.sendVan(s, i, t, true);
  if (G.deliveryOpen(s) && st.declare !== 'half') { G.setDelivery(s, true); while (s.delivery.riders < G.riderCap(s)) G.hireRider(s, 1); }
  const bribeFund = s.case.evidence > 40 ? G.caseBribeCost(s) * 2 : 1500; // keep a bribe fund when the case is building
  // Spread the rest: fronts, smurfs, a money man, the casino; careful players stash some offshore
  for (const id of Object.keys(FRONTS)) if (!s.wash.fronts[id] && G.unlocked(s, FRONTS[id].level) && FRONTS[id].price < spare() * 0.25) G.buyFront(s, id);
  if (G.washOpen(s, 'smurf')) G.setSmurfing(s, G.washCap(s, 'smurf'));
  hireIf('moneyman', s.dirty > 20000);
  if (G.washOpen(s, 'casino') && s.dirty > 5000) G.washVia(s, 'casino', Math.min(s.dirty - Math.max(3000, bribeFund), G.washLeft(s, 'casino')), t, true);
  if (st.declare !== 'half' && G.washOpen(s, 'offshore') && s.dirty > 30000) G.stashOffshore(s, s.dirty - 20000);
  if (G.washOpen(s, 'offshore') && s.wash.offshore > 0) G.bringBack(s, Infinity, true);
  const amount = Math.min(Math.floor(s.dirty - bribeFund), Math.round(G.launderLeft(s) * st.launder));
  if (amount > 0) G.launder(s, amount, true);
}

function run(st, seed) {
  G.setRandom(mulberry32(seed));
  const start = new Date(2026, 0, 5, 7, 0).getTime();
  const s = G.newGame(start);
  s.introSeen = true;
  const marks = {};
  let clearedDay = null;
  for (let d = 0; d < DAYS; d++) {
    for (let k = 0; k < CHECKINS.length; k++) {
      const h = CHECKINS[k];
      const t = start + d * DAY + (h - 7) * HOUR;
      const next = k + 1 < CHECKINS.length ? start + d * DAY + (CHECKINS[k + 1] - 7) * HOUR : start + (d + 1) * DAY + (CHECKINS[0] - 7) * HOUR;
      G.advance(s, t);
      checkIn(s, st, t, next);
    }
    if (s.won && clearedDay == null) clearedDay = d + 1;
    if (TRACE) { const r = s.reports.at(-1)?.ledger; if (r) console.log(`d${d + 1} Lv${s.level} £${Math.round(s.clean)} 💜${Math.round(s.dirty)} heat ${Math.round(s.heat)} pop ${Math.round(s.rep)} | sales £${Math.round(r.sales)} served ${r.served} missed ${r.missed} batches ${r.batches} burnt ${r.burnt} | night £${Math.round(r.nightSales)} kits ${r.kitsBought} stock ${Object.values(s.bags).reduce((a, b) => a + b, 0)} heat-cool ${G.heatCool ? G.heatCool(s).toFixed(2) : ''} lab ${r.labBatches} bags ${r.bagsSold} (crew ${r.crewSales}) cops ${r.copsServed} lost ${r.buyersLost} xp ${Math.round(r.xp)}${r.events.length ? ' | ' + r.events.map(e => e.text.slice(0, 40)).join(' / ') : ''}`); }
    if ([7, 30, 60, 90, 120, 180, 365].includes(d + 1)) marks[d + 1] = s.level;
  }
  return { level: s.level, clearedDay, busts: s.stats.busts, visits: s.stats.visits, clean: s.clean, dirty: s.dirty, rep: s.rep,
    bags: s.stats.totalBags, sales: s.stats.totalSales, machines: s.shops.reduce((a, x) => a + x.machines.length, 0), shops: s.shops.length, laundered: s.stats.totalLaundered, lab: s.shops.reduce((a, x) => a + x.lab.length, 0), recipes: s.recipes.length, marks,
    served: s.stats.served, missed: s.stats.missed, strikes: s.strikes, tax: s.stats.taxPaid || 0, orders: s.stats.orders || 0, miles: Object.keys(s.milestones).length };
}

const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const med = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const t0 = Date.now();
for (const [name, st] of Object.entries(STRATS)) {
  if (TRACE && TRACE !== name) continue;
  const res = [...Array(TRACE ? 1 : RUNS)].map((_, i) => run(st, 1000 + i * 7));
  const cleared = res.filter(r => r.clearedDay != null).map(r => r.clearedDay);
  const marks = Object.keys(res[0].marks).map(d => `d${d}: Lv ${avg(res.map(r => r.marks[d])).toFixed(1)}`).join(' · ');
  console.log(`\n${name.toUpperCase()} (${RUNS} runs, ${DAYS} days)`);
  console.log(`  level ${avg(res.map(r => r.level)).toFixed(1)} (${Math.min(...res.map(r => r.level))}–${Math.max(...res.map(r => r.level))})   ${marks}`);
  console.log(`  debt cleared ${cleared.length}/${RUNS}${cleared.length ? `, median day ${med(cleared)}` : ''} · missed payments ${avg(res.map(r => r.strikes)).toFixed(1)} · heavies ${avg(res.map(r => r.visits)).toFixed(1)} · busts ${avg(res.map(r => r.busts)).toFixed(1)}`);
  console.log(`  clean £${Math.round(avg(res.map(r => r.clean))).toLocaleString('en-GB')} · dirty £${Math.round(avg(res.map(r => r.dirty))).toLocaleString('en-GB')} · popularity ${avg(res.map(r => r.rep)).toFixed(0)} · takings £${Math.round(avg(res.map(r => r.sales))).toLocaleString('en-GB')} · bags ${Math.round(avg(res.map(r => r.bags)))}`);
  console.log(`  tax paid £${Math.round(avg(res.map(r => r.tax))).toLocaleString('en-GB')} · orders ${Math.round(avg(res.map(r => r.orders)))} · milestones ${avg(res.map(r => r.miles)).toFixed(0)}`);
  console.log(`  served ${Math.round(avg(res.map(r => r.served)))} / missed ${Math.round(avg(res.map(r => r.missed)))} · shops ${avg(res.map(r => r.shops)).toFixed(1)} · laundered £${Math.round(avg(res.map(r => r.laundered))).toLocaleString('en-GB')} · machines ${avg(res.map(r => r.machines)).toFixed(1)} + lab ${avg(res.map(r => r.lab)).toFixed(1)} · recipes ${avg(res.map(r => r.recipes)).toFixed(0)}`);
}
console.log(`\n(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
