// Balance check: bots play full runs with different strategies.
// node "C:\Users\khale\Documents\Claude projects\BakingBad\tools\sim.mjs" [runs]
import * as G from '../www/js/game.js';
import { ITEMS, CFG, UPGRADES, LINES, MACHINES } from '../www/js/data.js';
G.onToast(() => {});

const RUNS = Number(process.argv[2]) || 40;
const MAX_DAYS = 120;

const STRATS = {
  honest:  { crook: false, react: 1.5, upgrades: ['sign'], baker: 8 },
  careful: { crook: true, react: 1.5, launder: 1.0, kits: 3, bribeAt: 35, lieLowAt: 50, dirtyReserve: 900,
             upgrades: ['catering', 'glass', 'sign', 'burner2', 'camera'], baker: 10 },
  greedy:  { crook: true, react: 1.5, launder: 1.6, kits: 4, serveAll: true, bribeAt: 60, dirtyReserve: 600,
             upgrades: ['catering', 'glass', 'burner2', 'sign'], baker: 10 },
};

function inPipeline(s, id) {
  let n = 0;
  for (const st in s.shift.slots) for (const sl of s.shift.slots[st]) if (sl.item === id) n += ITEMS[id].yield;
  return n;
}
function bestRecipe(s, machine) {
  let best = null, bestScore = Infinity;
  for (const id of G.menuOf(s)) {
    if (ITEMS[id].machine !== machine || !G.canMake(s, id)) continue;
    const d = s.display[id];
    const score = (d.fresh + d.stale * 0.5 + inPipeline(s, id)) / (ITEMS[id].group === 'bread' ? 0.8 : 1);
    if (score < bestScore) { bestScore = score; best = id; }
  }
  return best;
}

function plan(s, st) {
  if (s.offerPending) G.answerOffer(s, st.crook);
  s.levelUps.length = 0;
  const reserve = G.daysToPayment(s) <= 3 ? G.nextDue(s) : 300;
  for (const id of st.upgrades) {
    const u = UPGRADES.find(x => x.id === id);
    if (!G.upgradeAvailable(s, u)) continue;
    if (u.cash === 'clean' && s.clean - u.cost < reserve + 200) continue;
    if (u.cash === 'dirty' && s.dirty - u.cost < st.dirtyReserve) continue;
    G.buyUpgrade(s, id);
  }
  // Kitchen: buy machines when the level allows, learn recipes, keep the menu full of the best sellers
  for (const type of ['oven', 'fryer', 'drinks', 'mixer', 'icecream', 'grill']) {
    if (!G.machineBlock(s, type) && s.clean - G.machinePrice(s, type) > reserve + 400) G.buyMachine(s, type);
  }
  for (const id of Object.keys(ITEMS)) {
    const r = ITEMS[id];
    if (!s.recipes.includes(id) && r.cost && G.unlocked(s, r.level) && G.machineCount(s, r.machine) && s.clean - r.cost > reserve + 400) G.buyRecipe(s, id);
  }
  const best = [...s.recipes].sort((a, b) => ITEMS[b].price - ITEMS[a].price); // customers are the limit, so sell what's dearest
  // keep at least one item for every machine, then fill with the best earners
  const pickMenu = [];
  for (const type of Object.keys(MACHINES)) { const id = best.find(x => ITEMS[x].machine === type); if (id && G.machineCount(s, type)) pickMenu.push(id); }
  for (const id of best) if (!pickMenu.includes(id)) pickMenu.push(id);
  s.onMenu = pickMenu.slice(0, G.menuSlots(s));
  if (st.baker && s.day >= st.baker && !s.crew.baker) G.hire(s, 'baker');
  const cust = G.customersExpected(s);
  const need = {};
  const menu = G.menuOf(s);
  for (const id of menu) {
    const batches = Math.ceil(cust * 1.7 / menu.length / ITEMS[id].yield) + 1;
    for (const [k, q] of Object.entries(ITEMS[id].ing)) need[k] = (need[k] || 0) + q * batches;
  }
  for (const k in need) { const d = need[k] - s.inv[k]; if (d > 0) G.buyIngredient(s, k, d); }
  if (s.labUnlocked && st.crook) {
    if (st.bribeAt && s.heat >= st.bribeAt && s.dirty >= CFG.bribeCost) G.bribe(s);
    while (s.kits < st.kits && s.dirty >= CFG.kitCost) G.buyKit(s, 'dirty');
    if (s.kits < 1 && s.clean >= CFG.kitCost + 100) G.buyKit(s, 'clean');
  }
}

function runShift(s, st) {
  const dt = 0.25;
  while (s.shift) {
    const sh = s.shift;
    for (const stage of Object.keys(sh.slots).reverse())
      sh.slots[stage].forEach((sl, i) => { if (sl.item && sl.done && sl.over >= st.react) G.tapSlot(s, stage, i); });
    if (sh.kind === 'day') {
      for (const stage of Object.keys(sh.slots)) sh.slots[stage].forEach((sl, i) => {
        if (!sl.item && sh.t < sh.len - 22) { const id = bestRecipe(s, stage); if (id) G.startRecipe(s, id, stage, i); }
      });
    } else {
      sh.slots.prep.forEach((sl, i) => { if (!sl.item && s.kits > 0 && sh.t < sh.len - 36) G.tapSlot(s, 'prep', i); });
      for (const b of [...sh.buyers]) {
        if (sh.t - b.t0 < st.react || s.bags < 1) continue;
        const sus = LINES.off.includes(b.line) || b.hint;
        if (st.serveAll || !sus) G.sellToBuyer(s, b.id); else G.turnAway(s, b.id);
      }
    }
    G.tick(s, dt);
  }
}

let name0 = "";
function playOne(st) {
  const s = G.newGame();
  const weekly = [];
  while (!s.over && !s.won && s.day <= MAX_DAYS) {
    plan(s, st);
    G.startShift(s, 'day'); runShift(s, st);
    if (s.dirty > 0) G.launder(s, Math.min(s.dirty, s.today.launderCap * (st.launder || 1)));
    else G.launder(s, 0);
    if (s.labUnlocked && st.crook && (s.kits > 0 || s.bags > 0) && !(st.lieLowAt && s.heat >= st.lieLowAt)) {
      G.startShift(s, 'night'); runShift(s, st);
    }
    G.goHome(s);
    if (process.env.TRACE === name0) { const t = s.report.ledger; console.log(`d${s.report.day} sales ${Math.round(t.sales)} served ${t.served} missed ${t.missed} pricey ${t.pricedOut} ing ${Math.round(t.ingSpent)} upg ${t.upgradesSpent} | launder ${t.laundered}/${t.launderCap} | bags ${t.bagsMade}/${t.bagsSold} night £${t.nightSales} cops ${t.copsServed}/${t.copsTurned} lost ${t.buyersLost} | clean ${Math.round(s.clean)} dirty ${Math.round(s.dirty)} kits ${s.kits} heat ${Math.round(s.heat)} rep ${Math.round(s.rep)} ${s.report.payment ? (s.report.payment.paid ? "PAID" : "MISSED") : ""}`); }
    if ((s.day - 1) % 7 === 0) weekly.push({ day: s.day, clean: Math.round(s.clean), dirty: Math.round(s.dirty), heat: Math.round(s.heat), rep: Math.round(s.rep), sales: Math.round(s.report.ledger.sales), paid: s.report.payment?.paid });
    G.toPlan(s);
  }
  return { s, weekly };
}

for (const [name, st] of Object.entries(STRATS)) {
  name0 = name;
  const res = { won: 0, arrested: 0, bank: 0, timeout: 0, days: [], paid: [] };
  let example = null;
  for (let r = 0; r < RUNS; r++) {
    const { s, weekly } = playOne(st);
    if (s.won) { res.won++; res.days.push(s.day); }
    else if (s.over?.reason === 'arrested') res.arrested++;
    else if (s.over?.reason === 'bank') res.bank++;
    else res.timeout++;
    res.paid.push(s.paymentsMade);
    if (!example) example = weekly;
  }
  const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-';
  console.log(`\n== ${name}: won ${res.won}/${RUNS} (avg day ${avg(res.days)}), arrested ${res.arrested}, bank ${res.bank}, timeout ${res.timeout}, avg payments ${avg(res.paid)}`);
  console.log('   first run by week:', example.map(w => `d${w.day} £${w.clean}c/£${w.dirty}d h${w.heat} r${w.rep} s${w.sales}${w.paid === false ? ' MISSED' : ''}`).join(' | '));
}
