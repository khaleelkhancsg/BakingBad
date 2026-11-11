// Checks every crew member and upgrade does what its card says, by running the game with and without it.
// node tools/crewcheck.mjs
import * as G from '../www/js/game.js';
import * as D from '../www/js/design.js';
import { ITEMS, MACHINES, LAB_MACHINES, PRODUCTS, SHOPS, CREW, UPGRADES, SPOTS, CAMPAIGNS } from '../www/js/data.js';
G.onToast(() => {});
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const T0 = new Date('2026-06-10T08:00:00').getTime(); // a weekday morning, out of every season
let pass = 0, fail = 0;
const ok = (cond, what, extra = '') => { if (cond) pass++; else { fail++; console.log(`  ✗ ${what}${extra ? ` (${extra})` : ''}`); } };

// A big game: level 99, money, every recipe, every branch, every machine type each shop takes, 7 counters
function bigGame({ shops = true } = {}) {
  const s = D.ensureDesign(G.newGame(T0));
  s.level = 99; s.clean = 5e7; s.dirty = 5e6; s.labUnlocked = true;
  s.recipes = Object.keys(ITEMS);
  for (const k in s.inv) s.inv[k] = 1e5;
  if (shops) for (const id of Object.keys(SHOPS)) if (id !== 'stall') G.buyShop(s, id);
  G.eachShop(s, () => {
    s.design.counters = 7;
    for (const type of G.shopDef(s).machines) if (!s.machines.some(m => m.type === type)) G.buyMachine(s, type);
    for (const k in s.display) s.display[k] = 0;
    G.settleCounters(s);
  });
  return s;
}
// Start one batch on every kitchen machine in every shop; returns what was started where
function startAll(s, t) {
  const started = [];
  G.eachShop(s, i => s.machines.forEach((m, k) => {
    const id = G.recipesFor(m.type).find(r => G.inSeason(r) && !started.some(x => x.shop === i && x.id === r));
    if (id && G.startJob(s, k, id, t, { quiet: true })) started.push({ shop: i, k, id, type: m.type });
  }));
  return started;
}
const doneBy = (s, started) => Math.max(...started.map(x => { let d = 0; G.eachShop(s, i => { if (i === x.shop) d = s.machines[x.k].job.start + s.machines[x.k].job.dur; }); return d; }));

// ---------- Day crew ----------
console.log('Baker (Priya): every machine in every shop goes onto the counters');
{
  for (const baker of [true, false]) {
    const s = bigGame(); s.crew.baker = baker;
    const st = startAll(s, T0), done = doneBy(s, st);
    ok(st.length >= 10, 'started a batch on lots of machines', st.length);
    // stop customers buying it all so we can see it on the counters
    G.eachShop(s, () => { s.rep = 0; });
    G.advance(s, done + 5 * MIN);
    let collected = 0, waiting = 0, types = new Set();
    G.eachShop(s, i => s.machines.forEach((m, k) => { const x = st.find(y => y.shop === i && y.k === k); if (!x) return; if (!m.job || m.job.item !== x.id || m.job.left != null) { collected++; types.add(m.type); } else waiting++; }));
    if (baker) {
      ok(waiting === 0, 'baker collected every finished batch', `${waiting} left in machines of ${st.length}`);
      ok(types.size === new Set(st.map(x => x.type)).size, 'from every machine type', [...types].join(','));
      let onCounters = 0; G.eachShop(s, () => { onCounters += G.menuOf(s).length; });
      ok(onCounters >= st.length - 1, 'and it is all out on the counters', `${onCounters} products on counters`);
    } else ok(collected === 0, 'without the baker nothing is collected', collected);
  }
  // More batches than counters: the baker fills what fits, the rest waits, and goes out once a counter frees
  const s = bigGame({ shops: false }); s.crew.baker = true; s.design.counters = 2; G.settleCounters(s);
  const st = startAll(s, T0); G.eachShop(s, () => { s.rep = 0; });
  G.advance(s, doneBy(s, st) + 2 * MIN);
  const waiting = s.machines.filter(m => m.job).length;
  ok(G.counterList(s).every(Boolean), 'two counters: both filled');
  ok(waiting > 0, 'two counters: the rest wait in their machines', waiting);
  const first = G.menuOf(s)[0]; G.throwAway(s, first);
  G.advance(s, s.clock + 2 * MIN);
  ok(s.machines.filter(m => m.job).length < waiting, 'once a counter is free the baker puts the next batch out');
}
console.log('Head chef (Marco): starts the same recipe again');
{
  const s = bigGame({ shops: false }); s.crew.baker = true; s.crew.chef = true;
  const st = startAll(s, T0); G.eachShop(s, () => { s.rep = 0; });
  G.advance(s, doneBy(s, st) + 2 * MIN);
  const again = st.filter(x => s.machines[x.k].job && s.machines[x.k].job.item === x.id && s.machines[x.k].job.start > T0).length;
  ok(again > 0, 'machines restarted their recipe', `${again} of ${st.length}`);
  // with the chef but no baker: the player collects, the chef restarts
  const s2 = bigGame({ shops: false }); s2.crew.chef = true;
  const st2 = startAll(s2, T0); const x = st2[0];
  G.advance(s2, doneBy(s2, st2) + MIN);
  G.collectJob(s2, x.k, s2.clock, { byYou: true });
  ok(s2.machines[x.k].job?.item === x.id && s2.machines[x.k].job.start === s2.clock, 'collecting by hand also restarts it');
}
console.log('Sous chef (Chen): +10% servings');
{ const s = bigGame({ shops: false }); const a = G.servingsFor(s, 'sourdough'); s.crew.souschef = true; ok(G.servingsFor(s, 'sourdough') > a, 'more servings', `${a} -> ${G.servingsFor(s, 'sourdough')}`); }
console.log('Cashier (Tom): +10% on sales, fewer put off by prices');
{ const s = bigGame({ shops: false }); const a = G.itemPrice(s, 'sourdough'); s.crew.cashier = true; ok(Math.abs(G.itemPrice(s, 'sourdough') / a - 1.1) < 0.01, '+10% price', `${a} -> ${G.itemPrice(s, 'sourdough')}`); }
console.log('PR (Mel): popularity creeps up');
{
  const run = pr => { const s = bigGame({ shops: false }); s.crew.pr = pr; s.rep = 40; G.advance(s, T0 + 3 * DAY); return s.rep; };
  const a = run(false), b = run(true); ok(b > a, 'popularity higher after 3 days', `${a.toFixed(1)} vs ${b.toFixed(1)}`);
}
console.log('Cleaner (Dot): fixes cracked tiles and torn panels');
{
  const s = bigGame(); s.crew.cleaner = true;
  G.eachShop(s, () => { s.design.floor['0,0'] = 'cracked'; s.design.wall.b0 = 'torn'; });
  G.advance(s, T0 + DAY);
  let left = 0; G.eachShop(s, () => { left += (s.design.floor['0,0'] === 'cracked') + (s.design.wall.b0 === 'torn'); });
  ok(left === 0, 'all mended in every shop by the next day', `${left} left`);
}
console.log('Manager (Grace): keeps ingredients topped up');
{
  const s = bigGame({ shops: false }); s.crew.manager = true;
  const st = startAll(s, T0); G.advance(s, doneBy(s, st) + MIN); s.machines.forEach((m, k) => G.collectJob(s, k, s.clock));
  for (const k in s.inv) s.inv[k] = 0;
  for (const m of s.machines) if (m.job) m.job = null;
  G.advance(s, T0 + DAY + HOUR);
  const used = new Set(st.flatMap(x => Object.keys(ITEMS[x.id].ing)));
  const missing = [...used].filter(k => !(s.inv[k] > 0));
  ok(!missing.length, 'ingredients for what the shop cooks are bought the next morning', missing.join(','));
}
console.log('Accountant (Viv): cheaper wash, launders every morning');
{
  const s = bigGame({ shops: false }); const fee = G.launderFee(s); s.crew.accountant = true;
  ok(G.launderFee(s) < fee, 'smaller cut', `${fee} -> ${G.launderFee(s)}`);
  s.dirty = 20000; const d0 = s.dirty; G.advance(s, T0 + DAY + HOUR);
  ok(s.dirty < d0, 'dirty cash went through the tills', `${d0} -> ${s.dirty}`);
}
console.log('Marketing director (Imogen): campaigns last 50% longer');
{
  const id = Object.keys(CAMPAIGNS)[0];
  const len = dir => { const s = bigGame({ shops: false }); s.crew.director = dir; G.startCampaign(s, id, T0); const c = (s.campaigns || []).find(x => x.id === id); return c ? c.until - T0 : 0; };
  const a = len(false), b = len(true); ok(a > 0 && Math.abs(b / a - 1.5) < 0.01, '1.5x as long', `${a / HOUR}h -> ${b / HOUR}h`);
}
console.log('Shop managers: collect and restock a shop you are not in');
{
  const s = bigGame(); G.viewShop(s, 0);
  G.eachShop(s, i => { if (i === 1) G.hireManager(s, 2); });
  let mgr = null; G.eachShop(s, i => { if (i === 1) mgr = s.manager; });
  ok(!!mgr, 'hired a manager for the branch');
  G.eachShop(s, () => { s.rep = 0; });
  const st = startAll(s, T0).filter(x => x.shop === 1);
  G.advance(s, doneBy(s, st) + 40 * MIN);
  let cooking = 0, out = 0; G.eachShop(s, i => { if (i === 1) { cooking = s.machines.filter(m => m.job).length; out = G.menuOf(s).length; } });
  ok(out > 0 && cooking > 0, 'branch with a manager has food out and machines going', `${out} out, ${cooking} cooking`);
}

// ---------- Night crew ----------
console.log('Night cook (Sam) and chemist (Doc): bag up and start again, in every shop');
{
  for (const chemist of [false, true]) {
    const s = bigGame(); s.crew.cook = true; s.crew.chemist = chemist;
    for (const id in PRODUCTS) s.kits[id] = 50;
    const started = [];
    G.eachShop(s, i => { for (const type of G.shopDef(s).lab) G.buyMachine(s, type, true); s.lab.forEach((m, k) => { const id = Object.keys(PRODUCTS).find(p => PRODUCTS[p].machine === m.type && G.unlocked(s, PRODUCTS[p].level)); if (id && G.startLab(s, k, id, T0, { quiet: true })) started.push({ shop: i, k, id }); }); });
    ok(started.length > 0, 'cooks started', started.length);
    let done = 0; G.eachShop(s, i => s.lab.forEach(m => { if (m.job) done = Math.max(done, m.job.start + m.job.dur); }));
    G.advance(s, done + 2 * MIN);
    let left = 0, again = 0; G.eachShop(s, i => s.lab.forEach((m, k) => { const x = started.find(y => y.shop === i && y.k === k); if (!x || !m.job) return; if (m.job.start === T0) left++; else again++; }));
    ok(left === 0, `${chemist ? 'with Doc: ' : ''}every finished cook bagged in every shop`, `${left} left`);
    if (chemist) ok(again > 0, 'Doc started them again', again); else ok(again === 0, 'without Doc nothing restarts', again);
  }
}
console.log('Lab assistant (Pip), chemist: purer cooks');
{ const s = bigGame({ shops: false }); const m = { tier: 0 }; const a = G.labPurity(s, m); s.crew.assistant = true; const b = G.labPurity(s, m); s.crew.chemist = true; ok(b > a && G.labPurity(s, m) > b, 'purity rises', `${a} ${b} ${G.labPurity(s, m)}`); }
console.log('Fixer (Nina): heat falls twice as fast');
{
  const run = f => { const s = bigGame({ shops: false }); s.crew.fixer = f; s.heat = 80; s.lastLab = 0; G.advance(s, T0 + 6 * HOUR); return 80 - s.heat; };
  const a = run(false), b = run(true); ok(b > a * 1.8, 'twice the cooling', `${a.toFixed(2)} vs ${b.toFixed(2)}`);
}
console.log('Bent copper (DS Hale): fewer van stops');
{ const s = bigGame({ shops: false }); const a = G.stopChance(s, 10); s.crew.copper = true; ok(G.stopChance(s, 10) < a, 'lower stop chance'); }
console.log('Dealer (Jay) and host (Lena): serve buyers at the back door when you are not there');
{
  for (const role of ['dealer', 'host']) {
    const s = bigGame({ shops: false }); s.crew[role] = true; s.heat = 0;
    for (const id in PRODUCTS) s.bags[id] = 200;
    const t = new Date('2026-06-10T23:00:00').getTime();
    G.advance(s, T0 + 15 * HOUR); const d0 = s.dirty; G.advance(s, t + 3 * HOUR);
    ok(s.dirty > d0, `${role} took money at the back door`, `${d0} -> ${s.dirty}`);
  }
}
console.log('Runner (Kai): keeps corners stocked');
{
  const s = bigGame({ shops: false }); s.crew.runner = true; for (const id in PRODUCTS) s.bags[id] = 500;
  const corners = await import('../www/js/data.js').then(m => m.CORNERS);
  const id = Object.keys(corners)[0]; G.buyCorner(s, id); if (s.corners[id]) G.setCornerProduct(s, id, Object.keys(PRODUCTS)[0]);
  const k = s.corners[id];
  if (!k) ok(false, 'could not open a corner to test');
  else { k.stock = 0; G.advance(s, T0 + 3 * HOUR); ok(s.corners[id].stock > 0, 'corner restocked', s.corners[id].stock); }
}

// ---------- Upgrades ----------
console.log('Upgrades: each one changes what it says');
{
  const base = bigGame({ shops: false }); for (const u of UPGRADES) base.upgrades[u.id] = false;
  const measure = s => ({
    cust: G.customersPerHour(s, T0 + 4 * HOUR), tray: G.trayCap(s, 'sourdough'), speed: -G.cookMs(s, 'sourdough'), keep: G.spoilMs(s, 'sourdough'),
    price: G.itemPrice(s, 'sourdough'), purity: G.labPurity(s, { tier: 0 }), launder: G.launderLeft?.(s) ?? 0, washFee: -G.launderFee(s),
    night: G.customersPerHour(s, new Date('2026-06-10T23:30:00').getTime()), buyers: G.buyersPerHour?.(s) ?? 0,
    tipoff: G.eff(s, 'tipoff'), audit: G.eff(s, 'audit'), smurf: G.eff(s, 'smurf'), hide: G.eff(s, 'hide'), quiet: G.eff(s, 'quiet'), bags: G.eff(s, 'bags'), income: G.eff(s, 'income'),
  });
  for (const u of UPGRADES) {
    const s = bigGame({ shops: false }); for (const v of UPGRADES) s.upgrades[v.id] = false;
    const before = measure(s); s.upgrades[u.id] = true; const after = measure(s);
    for (const key of Object.keys(u.eff)) {
      if (['camera', 'safe', 'van'].includes(key)) { ok(G.has(s, u.id), `${u.name}: owned`); continue; }
      if (!(key in before)) { ok(false, `${u.name}: no way to check ${key}`); continue; }
      ok(after[key] > before[key], `${u.name}: ${key} goes up`, `${before[key]} -> ${after[key]}`);
    }
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
