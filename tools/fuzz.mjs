// Plays the game with random actions for many days and checks that its rules always hold.
// node tools/fuzz.mjs [runs] [days]
import * as G from '../www/js/game.js';
import * as D from '../www/js/design.js';
import { ITEMS, MACHINES, LAB_MACHINES, PRODUCTS, SPOTS, LAB_SPOTS, SHOPS } from '../www/js/data.js';
G.onToast(() => {});
const RUNS = Number(process.argv[2]) || 4, DAYS = Number(process.argv[3]) || 60;
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = a => a[Math.floor(rnd() * a.length)];
const problems = new Map();
const flag = (what, s, extra = '') => { if (!problems.has(what)) problems.set(what, `${what} (day ${Math.floor((s.clock - s.created) / DAY)}, level ${s.level}) ${extra}`); };

function check(s) {
  for (const k of ['clean', 'dirty', 'heat', 'rep', 'balance', 'xp', 'level']) if (!Number.isFinite(s[k])) flag(`${k} is not a number`, s, String(s[k]));
  if (s.clean < -0.01) flag('clean cash below zero', s, s.clean);
  if (s.dirty < -0.01) flag('dirty cash below zero', s, s.dirty);
  if (s.heat < 0 || s.heat > 100) flag('heat out of range', s, s.heat);
  G.eachShop(s, i => {
    // every machine, counter and decoration on its own square, and everyone can get where they need to
    const shopWhy = D.shopLayoutProblem(s); if (shopWhy) flag('shop layout broken', s, `shop ${i}: ${shopWhy}`);
    if (s.machines.some(m => !(m.cx >= 0))) flag('a machine with no square', s);
    if (s.machines.length > D.kitchenRoom(s)) flag('more machines than the room allows', s);
    if (D.counterCells(s).length !== G.countersOf(s.design)) flag('counters and their squares differ', s, `${D.counterCells(s).length} vs ${G.countersOf(s.design)}`);
    if (s.lab.length) { const backWhy = D.backLayoutProblem(s); if (backWhy) flag('basement layout broken', s, `shop ${i}: ${backWhy}`); }
    if (s.lab.some(m => !(m.bx >= 0))) flag('a basement machine with no square', s);
    if (s.lab.length > D.labRoom(s)) flag('more basement machines than the room allows', s);
    for (const [id, v] of Object.entries(s.display)) { if (!Number.isFinite(v) || v < 0) flag('display stock negative or NaN', s, `${id}=${v}`); }
    if (G.counterList(s).length !== G.menuSlots(s)) flag('counter list the wrong length', s);
    for (const [id, v] of Object.entries(s.display)) {
      if (v > 0 && !G.countersFor(s, id).length) flag('stock with no counter', s, id);
      if (v > G.trayCap(s, id) + 1e-6) flag('more on display than its counters hold', s, `${id} ${v}/${G.trayCap(s, id)}`);
    }
    const b = s.design.back;
    if (b) for (const d of b.decor) if (D.backCellBlocked(d.bx, d.bz, s.design.expansions)) flag('basement decor on a blocked square', s, `${d.type}@${d.bx},${d.bz}`);
    if (s.design.special && !s.recipes.includes(s.design.special)) flag("today's special isn't a known recipe", s, s.design.special);
  });
  for (const [id, v] of Object.entries(s.bags)) if (!Number.isFinite(v) || v < 0) flag('bags negative or NaN', s, `${id}=${v}`);
  for (const [id, v] of Object.entries(s.kits)) if (!Number.isFinite(v) || v < 0) flag('kits negative or NaN', s, `${id}=${v}`);
  if (s.case && !Number.isFinite(s.case.evidence)) flag('evidence NaN', s);
  if (s.invest != null && (!Number.isFinite(s.invest) || s.invest < 0)) flag('investment fund negative or NaN', s, s.invest);
  if (s.rush && !(s.rush.until > s.rush.from)) flag('rush hour window broken', s);
  if (s.story?.queue?.some(id => s.story.seen.includes(id))) flag('chapter both queued and seen', s);
}

function randomActions(s, t) {
  const acts = [
    () => { const i = Math.floor(rnd() * s.machines.length); const m = s.machines[i]; if (m && !m.job) { const ids = G.recipesFor(m.type).filter(id => s.recipes.includes(id)); if (ids.length) G.startJob(s, i, pick(ids), t); } },
    () => s.machines.forEach((m, i) => G.collectJob(s, i, t, { byYou: rnd() < 0.5 })),
    () => { const t2 = pick(Object.keys(MACHINES)); G.buyMachine(s, t2); },
    () => { if (s.labUnlocked) G.buyMachine(s, pick(Object.keys(LAB_MACHINES)), true); },
    () => G.buyCounter(s),
    // moving and turning things, by hand, to random squares (most get refused; the ones that go through must keep the rules)
    () => { if (s.machines.length) { const i = Math.floor(rnd() * s.machines.length); G.moveMachine(s, i, false, { cx: Math.floor(rnd() * 11), cz: Math.floor(rnd() * 11), rot: Math.floor(rnd() * 4) }); } },
    () => { if (s.machines.length) G.turnMachine(s, Math.floor(rnd() * s.machines.length), false); },
    () => { const n = D.counterCells(s).length; if (n) G.moveCounter(s, Math.floor(rnd() * n), { cx: Math.floor(rnd() * 9), cz: Math.floor(rnd() * 9), rot: Math.floor(rnd() * 4) }); },
    () => { const n = D.counterCells(s).length; if (n) G.turnCounter(s, Math.floor(rnd() * n)); },
    () => { if (s.lab.length) G.moveMachine(s, Math.floor(rnd() * s.lab.length), true, { bx: Math.floor(rnd() * 11), bz: Math.floor(rnd() * 11), rot: Math.floor(rnd() * 4) }); },
    () => { const t2 = pick(Object.keys(MACHINES)); G.buyMachine(s, t2, false, { cx: Math.floor(rnd() * 11), cz: Math.floor(rnd() * 11), rot: Math.floor(rnd() * 4) }); },
    () => { D.startCart(s); D.placeDecor(s, pick(Object.keys(D.DECOR)), Math.floor(rnd() * 11), Math.floor(rnd() * 11)); if (rnd() < 0.3) D.cancelCart(s); else D.checkoutCart(s); },
    () => { const m = G.menuOf(s); if (m.length) G.setSpecial(s, pick(m)); },
    () => { const m = G.menuOf(s); if (m.length) G.throwAway(s, pick(m)); },
    () => G.buyCabinet(s, Math.floor(rnd() * 7)),
    () => { if (rnd() < 0.3) { if (s.manager) G.fireManager(s); else G.hireManager(s, Math.floor(rnd() * 3)); } },
    () => { const e = pick(Object.keys(D.EXPANSIONS)); D.buyExpansion(s, e); },
    () => { const id = pick(Object.keys(ITEMS)); if (!s.recipes.includes(id) && G.unlocked(s, ITEMS[id].level)) G.buyRecipe?.(s, id); },

    () => { if (s.decisions.length) G.answerDecision(s, s.decisions[0].id, rnd() < 0.5, t); },
    () => { if (s.labUnlocked) { const p = pick(Object.keys(PRODUCTS)); G.buyKit(s, 'dirty', p, { quiet: true }); } },
    () => { if (s.labUnlocked) s.lab.forEach((m, i) => { if (!m.job) { const ps = G.productsFor(m.type).filter(id => G.unlocked(s, PRODUCTS[id].level)); if (ps.length) G.startLab(s, i, pick(ps), t, { quiet: true }); } else G.collectLab(s, i, t, { quiet: true }); }); },
    () => { const b = D.backOf(s), types = Object.keys(D.BACK_DECOR); D.startCart(s); D.placeBackDecor(s, pick(types), Math.floor(rnd() * 11), Math.floor(rnd() * 11)); D.checkoutCart(s); },
    () => { const b = D.backOf(s); if (b.decor.length) { D.startCart(s); D.moveBackDecor(s, Math.floor(rnd() * b.decor.length), Math.floor(rnd() * 11), Math.floor(rnd() * 11)); D.checkoutCart(s); } },
    () => { if (s.story?.queue?.length) G.readChapter(s); },
    () => { const c = pick(['bake10', 'bake30', 'perfect25', 'season3', 'story5']); G.claimSet(s, c); },
    () => { if (rnd() < 0.1) { const shopIds = Object.keys(SHOPS).filter(id => !G.ownsShop(s, id)); if (shopIds.length && G.buyShop) G.buyShop(s, pick(shopIds)); } },
    () => { if (s.shops.length > 1 && G.viewShop) G.viewShop(s, Math.floor(rnd() * s.shops.length)); },
    () => G.buyLandmark(s, pick(['school', 'flagship', 'brand', 'tv', 'foundation', 'tower'])),
    () => { if (rnd() < 0.5) G.invest(s, s.clean * rnd() * 0.5); else G.withdraw(s); },
    () => { if (s.cur) D.buyExpansion(s, 'backdoor'); },
  ];
  for (let k = 0; k < 6; k++) { try { pick(acts)(); } catch (e) { flag(`an action threw: ${e.message}`, s, e.stack.split('\n')[1]?.trim()); } }
}

for (let run = 0; run < RUNS; run++) {
  seed = 1000 + run * 77;
  const t0 = Date.UTC(2026, run * 3 % 12, 1 + run, 7);
  let s = D.ensureDesign(G.newGame(t0));
  // give it room to try everything
  s.clean = 2e5; s.level = 1;
  let t = t0;
  for (let d = 0; d < DAYS; d++) {
    for (const h of [8, 12, 17, 21]) {
      t = t0 + d * DAY + (h - 7) * HOUR;
      try { G.advance(s, t); } catch (e) { flag(`advance threw: ${e.message}`, s, e.stack.split('\n')[1]?.trim()); }
      // once time has moved on, no counter is held by a product with nothing left on it
      G.eachShop(s, () => G.counterList(s).forEach((id, k) => { if (id && !(G.counterStock(s, k).have > 0)) flag('a counter held by a product with nothing on it', s, id); }));
      if (d === 3) { s.labUnlocked = true; }
      if (d % 5 === 0) { s.level = Math.min(99, s.level + 3); s.clean += 5e4; s.dirty += 2e4; }
      randomActions(s, t);
      check(s);
    }
    // round-trip through a save now and then
    if (d % 10 === 9) { try { s = D.ensureDesign(G.migrate(JSON.parse(JSON.stringify(s)))); } catch (e) { flag(`save/load threw: ${e.message}`, s); } }
  }
}
console.log(problems.size ? [...problems.values()].join('\n') : 'no problems found');
