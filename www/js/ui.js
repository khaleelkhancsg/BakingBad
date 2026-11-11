// Screens, input and the main loop. The game runs on the real clock: the shop is always open, the back door
// opens in the evening, and when you come back the game plays forward the time you were away.
import * as G from './game.js';
import { CFG, ITEMS, INGREDIENTS, PRICE_LEVELS, UPGRADES, CREW, FEATURES, MACHINES, LAB_MACHINES, PRODUCTS, PROPERTY,
         CAPS, capAt, nextCap, CAMPAIGNS, GROUP_TEXT, CUTS, purityMult, TIERS, CORNERS, SHOPS, FAMILIES, TAX, DECLARE, MILESTONES, CRITIC, WASH, FRONTS, VANS, DELIVERY, PRESTIGE, PERKS, SHOP_GROW, SUPPLIERS, INSURANCE, RIVAL, CASE, LOYALTY, GOALS, CHALLENGES } from './data.js';
import { createScene } from './scene.js';
import * as D from './design.js';

const params = new URLSearchParams(location.search);
// ?save=name keeps a separate save slot; ?speed=60 runs the clock 60x faster (both for testing)
const KEY = 'bakingbad.save' + (params.get('save') ? '.' + params.get('save') : '');
const SPEED = Math.max(1, Number(params.get('speed')) || 1);
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const app = document.getElementById('app');
const toastBox = document.getElementById('toasts');
const ui = { modal: null, design: null, tab: null, panel: null, room: 'shop', basket: {}, outside: false };
import * as SFX from './sound.js';
import { SPECIAL, CABINET, CLEAN_RECORD, SEASONS, MASTERY, STORY, COLLECTION, PATROL, TRAITS, MANAGER, TASTES, PERFECT } from './data.js';
const SETTINGS_KEY = 'bakingbad.settings';
const settings = (() => { try { return { sound: true, notify: true, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return { sound: true, notify: true }; } })();
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* blocked */ } };
SFX.setSound(settings.sound);
let s = load() || G.newGame();

const world = createScene(document.getElementById('scene'), document.getElementById('overlay'), {
  onPick: info => {
    if (info.act === 'design') { if (ui.design) designTap(info); return; }
    if (ui.design || ui.modal) return;
    act({ dataset: info });
  },
  // Zooming out to the outside of the building swaps the corner buttons for one Outside button, and back
  onOutside: on => {
    ui.outside = on;
    if (on) ui.panel = null;
    if (!ui.design) render();
  },
});

// If a save can't be loaded, it's never thrown away: a copy is kept beside it (and offered as a backup code), and the
// game says so, instead of quietly starting fresh over the top of it.
let loadFailed = null;
function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    const d = JSON.parse(raw);
    return d && d.v ? D.ensureDesign(G.migrate(d)) : null;
  } catch (e) {
    console.error('Save failed to load', e);
    if (raw) { try { localStorage.setItem(`${KEY}.kept-${Date.now()}`, raw); } catch { /* storage full */ } loadFailed = { raw, why: e.message }; }
    return null;
  }
}
// A backup is the save, as text that survives being copied around
const backupCode = () => { const snap = D.cartSnapshot(); const copy = JSON.parse(JSON.stringify(s)); if (snap) copy.shops[snap.shop].design = snap.design; return btoa(unescape(encodeURIComponent(JSON.stringify(copy)))); };
function save() {
  try {
    const snap = D.cartSnapshot();
    if (!snap) return localStorage.setItem(KEY, JSON.stringify(s));
    const copy = JSON.parse(JSON.stringify(s)); copy.shops[snap.shop].design = snap.design; // unpaid design changes aren't kept
    localStorage.setItem(KEY, JSON.stringify(copy));
  } catch { /* storage full or blocked */ }
}

// ---------- Formatting ----------
const money = v => (v < 0 ? '-£' : '£') + Math.abs(Math.round(v)).toLocaleString('en-GB');
const money2 = v => '£' + Number(v).toFixed(2);
const ingText = r => Object.entries(r.ing).map(([k, q]) => `${q}${INGREDIENTS[k].emoji}`).join(' ');
const mins = m => m < 60 ? `${Math.round(m)}m` : `${Math.floor(m / 60)}h${Math.round(m % 60) ? ` ${Math.round(m % 60)}m` : ''}`;
const secs = sec => sec < 60 ? `${Math.ceil(sec)}s` : mins(Math.ceil(sec / 60));
const hhmm = t => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const dateStr = t => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const away = ms => ms < HOUR ? `${Math.round(ms / MIN)} minutes` : ms < 2 * DAY ? `${Math.floor(ms / HOUR)}h ${Math.round(ms % HOUR / MIN)}m` : `${Math.round(ms / DAY)} days`;
const sumOf = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
const pct = v => `${Math.round(v * 100)}%`;
const nowPrice = id => Math.round(PRODUCTS[id].price * purityMult(s.purity[id] ?? 0.6));

function showToast(text, kind = 'info') {
  if (kind === 'bad') SFX.sfx.bad(); else if (kind === 'good') SFX.sfx.coin();
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  toastBox.appendChild(el);
  while (toastBox.children.length > 3) toastBox.firstChild.remove();
  setTimeout(() => el.classList.add('out'), 2300);
  setTimeout(() => el.remove(), 2700);
}
G.onToast(showToast);

// ---------- The HUD ----------
function period(t) {
  const h = G.localHour(t);
  return h < 6 ? 'Small hours' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
}
const doorTotal = () => s.shops.reduce((a, x) => a + x.door.length, 0);
const doorShop = () => Math.max(0, s.shops.findIndex(x => x.door.length));
const doorOpen = t => s.labUnlocked && G.isNight(t) && !G.sealed(s, t);
const unseenReport = () => s.reports.length && s.reports.at(-1).day > (s.seenReportDay || 0);

function hudHTML() {
  const t = s.clock, d = G.daysToPayment(s);
  const heatCls = s.heat >= 60 ? 'hot' : s.heat >= 35 ? 'warm' : '';
  const showDirty = s.labUnlocked || s.dirty > 0;
  const camp = G.activeCampaigns(s);
  const chip = (html, attrs = '', cls = '') => `<span class="chip2 ${cls}" ${attrs}>${html}</span>`;
  return `<header class="hud compact">
    <div class="hudbar">
      ${chip(`<b>${hhmm(t)}</b> <small>Day ${G.dayIndex(s, t) + 1}${s.shops.length > 1 ? ' · ' + G.shopDef(s).short : ''}${doorOpen(t) ? ' · 🚪' : ''}</small>`, 'data-act="info" data-kind="clock" data-id="clock"', 'clock')}
      ${chip(`💷 ${money(s.clean)}`, 'title="Clean cash"', 'cash')}
      ${showDirty ? chip(`💜 ${money(s.dirty)}`, 'title="Dirty cash"', 'cash dirty') : ''}
      ${chip(`🎖️ ${s.level}<span class="meter xp"><i style="width:${s.level >= CFG.maxLevel ? 100 : Math.min(100, s.xp / G.xpToNext(s.level) * 100)}%"></i></span>`, 'data-act="info" data-kind="level" data-id="xp" title="Level"')}
      ${chip(`⭐ ${Math.round(s.rep)}`, 'data-act="info" data-kind="pop" data-id="pop" title="Popularity"')}
      ${showDirty ? chip(`🚨 ${Math.round(s.heat)}`, 'data-act="info" data-kind="heat" data-id="heat" title="Heat"', heatCls) : ''}
      ${s.labUnlocked && s.case.evidence >= 1 ? chip(`🕵️ ${Math.round(s.case.evidence)}%`, 'data-act="tab" data-id="police" title="The case against you"', s.case.evidence >= 60 ? 'hot' : s.case.evidence >= 30 ? 'warm' : '') : ''}
      ${s.won ? '' : chip(`🏦 ${d}d`, `data-act="tab" data-id="bank" title="${money(G.nextDue(s))} due"`, d <= 2 ? 'warn' : '')}
      ${doorTotal() && !(ui.room === 'back' && s.door.length) ? chip(`🚪 ${doorTotal()}`, `data-act="go-back" data-id="${doorShop()}" title="Buyers at a back door"`, 'night') : ''}
      ${s.decisions.length ? chip(`❗ ${s.decisions.length}`, 'data-act="decide" title="Waiting for you"', 'warn') : ''}
      ${s.event ? chip([...s.event.text][0], 'data-act="info" data-kind="event" data-id="event" title="Today"') : ''}
      ${G.scandal(s, t) ? chip('📰', 'title="Scandal: fewer customers"', 'warn') : ''}
      ${G.sealed(s, t) ? chip('🚧', 'title="Back rooms sealed"', 'warn') : ''}
      ${s.rival.open ? chip(`🥐 −${pct(s.rival.share)}`, 'data-act="tab" data-id="marketing" title="Customers lost to the rival"', 'warn') : ''}
      ${s.arrears > 0 && !s.won ? chip(`🔨 ${money(s.arrears)}`, 'data-act="tab" data-id="bank" title="Behind with the bank"', 'warn') : ''}
      ${s.hmrc > 1 ? chip(`🧾 ${money(s.hmrc)}`, 'data-act="tab" data-id="bank" title="Owed to HMRC"', 'warn') : ''}
      ${camp.length ? chip(`📣${camp.length}`, 'data-act="tab" data-id="marketing" title="Campaigns running"') : ''}
      ${s.review && s.review.until > t ? chip(`📝${s.review.stars}`, 'data-act="info" data-kind="review" data-id="x" title="Latest review"') : ''}
      ${s.orders.length ? chip(`📦 ${s.orders.length}`, 'data-act="tab" data-id="orders" title="Special orders"') : ''}
      ${unseenReport() ? chip('📋', 'data-act="report" title="Daily report"', 'ok') : ''}
    </div>
  </header>`;
}

// ---------- Dock pieces ----------
const ibtn = (kind, id) => `<button class="ibtn" data-act="info" data-kind="${kind}" data-id="${id}" aria-label="More info">i</button>`;
// Mastery stars after a recipe's name, and seasonal ones marked
const GROUPS = { bread: '🍞 bread', pastry: '🥐 pastries', sweet: '🍰 sweets', savory: '🥪 savoury', drink: '☕ drinks', cold: '🍦 cold treats' };
const starTag = id => { const n = G.starsOf(s, id); return (n ? ` <span class="stars">${'★'.repeat(n)}</span>` : '') + (ITEMS[id].season ? ` <span class="seasontag">${SEASONS[ITEMS[id].season].emoji}</span>` : ''); };
const pcard = (inner, info, cls = '', at = '') => `<div class="pcard ${cls}" ${at}>${info || ''}${inner}</div>`;
const lockTag = lvl => `<span class="lock">🔒 Lv ${lvl}</span>`;
const line = (a, b, cls = '') => `<div class="line"><span>${a}</span><span class="${cls}">${b}</span></div>`;

function machineState(m, lab) {
  if (m.broken) return 'broken';
  const v = G.jobView(s, m, s.clock, lab);
  return !v.item ? 'idle' : v.done ? 'ready' : 'busy';
}
// What the "stock up" button would buy: three batches of everything on sale
function stockUpNeeds() {
  const need = {};
  for (const id of G.menuOf(s)) for (const [k, q] of Object.entries(ITEMS[id].ing)) need[k] = (need[k] || 0) + q * 3;
  let cost = 0;
  for (const k in need) { need[k] = Math.max(0, need[k] - s.inv[k]); cost += need[k] * G.ingPrice(s, k); }
  return { need, cost: Math.round(cost * 100) / 100 };
}

const basketTotal = () => Object.entries(ui.basket).reduce((a, [k, n]) => a + n * G.ingPrice(s, k), 0);
function suppliesTab() {
  const { cost } = stockUpNeeds(), total = basketTotal(), items = Object.values(ui.basket).reduce((a, n) => a + n, 0);
  let cards = pcard(`<div class="ptop"><span class="em">🛒</span><div><b>Basket</b><small>${items ? `${items} items · ${money2(total)}` : 'Add ingredients with + and check out here'}</small></div></div>
    <div class="pbtns"><button class="small primary" data-act="checkout" ${items && s.clean >= total ? '' : 'disabled'}>${items && s.clean < total ? 'Not enough cash' : `Checkout${items ? ' · ' + money2(total) : ''}`}</button>
      <button class="small" data-act="basket-clear" ${items ? '' : 'disabled'}>Clear</button></div>`, '', 'wide hired');
  cards += pcard(`<div class="ptop"><span class="em">🧺</span><div><b>Stock up</b><small>3 batches of all ${G.menuOf(s).length} things on sale${cost ? ` · ${money2(cost)}` : ''}</small></div></div>
    <div class="pbtns"><button class="small" data-act="stockup" ${cost ? '' : 'disabled'}>${cost ? 'Add to basket' : 'All stocked'}</button></div>`, ibtn('stockup', 'x'), 'wide');
  for (const [id, c] of Object.entries(SUPPLIERS)) {
    if (c.level > s.level + 10) continue;
    const k = s.contracts[id], open = G.unlocked(s, c.level);
    cards += pcard(`<div class="ptop"><span class="em">${c.emoji}</span><div><b>${c.name}</b><small>${pct(c.disc)} off ${c.ings.map(i => INGREDIENTS[i].emoji).join('')}${k ? `<br>${k.bought}/${c.min} this week` : `<br>min ${c.min}/week or £${c.fine} fine`}</small></div></div>
      ${!open ? lockTag(c.level) : `<div class="pbtns">${k ? `<button class="small" data-act="contract-end" data-id="${id}">End</button>` : `<button class="small primary" data-act="contract" data-id="${id}">Sign</button>`}</div>`}`, '', `wide ${open ? '' : 'locked'} ${k ? 'hired' : ''}`);
  }
  cards += Object.entries(INGREDIENTS).filter(([, ing]) => G.unlocked(s, ing.level) || ing.level <= s.level + 10).map(([k, ing]) => {
    if (!G.unlocked(s, ing.level)) {
      return pcard(`<div class="ptop"><span class="em">${ing.emoji}</span><div><b>${ing.name}</b><small>for new recipes</small></div></div>${lockTag(ing.level)}`, ibtn('ing', k), 'locked');
    }
    const p = G.ingPrice(s, k), m = s.market[k];
    const tag = m >= 1.12 ? '<span class="up">▲</span>' : m <= 0.92 ? '<span class="down">▼</span>' : '';
    return pcard(`<div class="ptop"><span class="em">${ing.emoji}</span><div><b>${ing.name}</b><small>× ${s.inv[k]} · ${money2(p)} ${tag}</small></div></div>
      <div class="pbtns stepper"><button class="small" data-act="basket" data-id="${k}" data-n="-5" ${ui.basket[k] ? '' : 'disabled'}>−</button>
        <b>${ui.basket[k] || 0}</b><button class="small" data-act="basket" data-id="${k}" data-n="5">+</button></div>
      <small>${ui.basket[k] ? money2(ui.basket[k] * p) : '5 at a time'}</small>`, ibtn('ing', k), ui.basket[k] ? 'hired' : '');
  }).join('');
  return { cards, hint: `Today's market (prices change at 6am). ▲ dear, ▼ cheap. Fill the basket, then check out. Cooking buys anything missing for you.` };
}

function kitchenTab() {
  const ready = s.machines.filter(m => machineState(m) === 'ready').length;
  const idle = s.machines.map((m, i) => [m, i]).filter(([m]) => machineState(m) === 'idle' && m.last).length;
  let cards = pcard(`<div class="ptop"><span class="em">⚡</span><div><b>Quick jobs</b><small>${ready} ready · ${idle} idle</small></div></div>
    <div class="pbtns col"><button class="small primary" data-act="collectall" ${ready ? '' : 'disabled'}>Collect all (${ready})</button>
    <button class="small" data-act="restartall" ${idle ? '' : 'disabled'}>🔁 Cook again (${idle})</button></div>`, ibtn('quick', 'x'), 'wide');
  const here = G.shopDef(s).machines;
  cards += here.map(type => [type, MACHINES[type]]).map(([type, M]) => {
    const list = s.machines.map((m, i) => [m, i]).filter(([m]) => m.type === type);
    const n = list.length, block = G.machineBlock(s, type), open = G.unlocked(s, M.level);
    const known = s.recipes.filter(id => ITEMS[id].machine === type).length, total = G.recipesFor(type).length;
    const states = list.map(([m]) => machineState(m));
    const status = n ? [['busy', 'cooking'], ['ready', 'ready'], ['idle', 'idle'], ['broken', 'broken']].map(([k, w]) => { const c = states.filter(x => x === k).length; return c ? `${c} ${w}` : ''; }).filter(Boolean).join(' · ') : '';
    const buy = block
      ? `<div class="lockline">${block.text}</div>`
      : `<button class="small" data-act="buymachine" data-id="${type}" ${s.clean < G.machinePrice(s, type) ? 'disabled' : ''}>+1 · ${money(G.machinePrice(s, type))}</button>`;
    return pcard(`<div class="ptop"><span class="em">${M.emoji}</span><div><b>${M.name}</b><small>${open ? `× ${n} · ${known}/${total} recipes${status ? `<br>${status}` : ''}` : 'not yet'}</small></div></div>
      <div class="pbtns col">${n ? `<button class="small primary" data-act="machine" data-kind="day" data-idx="${list[0][1]}">Open</button>` : ''}${open || block ? buy : ''}</div>`,
      ibtn('machine', type), `wide ${open ? '' : 'locked'}`);
  }).join('');
  cards += elsewhere(false);
  const spots = G.freeSpots(s).length;
  return { cards, hint: `${G.shopDef(s).name}: ${s.machines.length} machines, room for ${spots} more.${s.shops.length < Object.keys(SHOPS).length ? ' Other machines go in other shops (🏪 Shops).' : ''} On sale: ${G.menuOf(s).length} of ${G.menuSlots(s)} (one per counter; tap a bare counter by the till for another).${G.currentSeason() ? ` ${SEASONS[G.currentSeason()].emoji} ${SEASONS[G.currentSeason()].name}: seasonal recipes are on the machines.` : ''} Locals here like ${Object.entries(TASTES[s.shops[s.cur || 0].id].like).filter(([, v]) => v > 1).map(([g]) => GROUPS[g] || g).join(', ')}. Collect a batch yourself within a few minutes of it finishing for a ✨ perfect bake. Tap a machine to cook, choose what's on sale and set prices.` };
}

function shopTab(lab = false) {
  const list = UPGRADES.filter(u => G.upgradeAvailable(s, u) && u.level <= s.level + 12 && !!u.lab === lab);
  list.sort((a, b) => (G.unlocked(s, b.level) - G.unlocked(s, a.level)) || (a.level - b.level));
  const cards = list.map(u => {
    const dirty = u.cash === 'dirty', open = G.unlocked(s, u.level);
    const btn = open
      ? `<div class="pbtns"><button class="small ${dirty ? 'violet' : ''}" data-act="upgrade" data-id="${u.id}" ${s[u.cash] >= u.cost ? '' : 'disabled'}>${dirty ? '💜' : '💷'} ${money(u.cost)}</button></div>`
      : lockTag(u.level);
    return pcard(`<div class="ptop"><span class="em">${u.emoji || '🛠️'}</span><div><b>${u.name}</b><small>${u.desc}</small></div></div>${btn}`, ibtn('upgrade', u.id), `wide ${u.lab ? 'night' : ''} ${open ? '' : 'locked'}`);
  }).join('') || pcard('<b>All bought</b><small>Nothing left in the shop for now.</small>');
  const owned = UPGRADES.filter(u => G.has(s, u.id)).length;
  return { cards, hint: lab ? 'Back-room upgrades: purity, safety, laundering and the people you know. Mostly paid in dirty cash.' : `Permanent bakery upgrades.${owned ? ` You own ${owned}.` : ''}` };
}

function crewTab(night = false) {
  const cards = Object.entries(CREW).filter(([, c]) => (c.shift === 'night') === night && (!c.lab || s.labUnlocked) && c.level <= s.level + 15).map(([role, c]) => {
    const open = G.unlocked(s, role === 'pr' ? 1 : c.level);
    const pay = role === 'dealer' ? `keeps ${CFG.dealerCut * 100}%` : `${c.cash === 'dirty' ? '💜' : '💷'} ${money(c.wage)}/day`;
    const st = s.staff[role];
    const btn = !G.unlocked(s, c.level) ? lockTag(c.level)
      : `<div class="pbtns">${s.crew[role] ? `<button class="small" data-act="bonus" data-id="${role}">Bonus</button><button class="small danger" data-act="fire" data-id="${role}">Let go</button>` : `<button class="small" data-act="hire" data-id="${role}">Hire</button>`}</div>`;
    const loyal = s.crew[role] && st ? `<span class="heat pop ${st.loyalty < LOYALTY.informAt ? 'hot' : st.loyalty < 50 ? 'warm' : ''}"><span class="meter wide"><i style="width:${st.loyalty}%"></i></span></span><small>loyalty ${Math.round(st.loyalty)} · ${TRAITS[st.trait || 'steady'].emoji} ${TRAITS[st.trait || 'steady'].name.toLowerCase()}${st.informant && (s.crew.lawyer || s.crew.copper) ? ' · <b class="bad">🐀 talking to Harrow</b>' : ''}</small>` : '';
    return pcard(`<div class="ptop"><span class="em">${c.emoji}</span><div><b>${c.name}</b><small>${c.role} · ${pay}</small></div></div>${loyal}${btn}`,
      ibtn('crew', role), `${c.shift === 'night' ? 'night' : ''} ${open ? '' : 'locked'} ${s.crew[role] ? 'hired' : ''}`);
  }).join('');
  return { cards, hint: `Loyal crew stay quiet; night crew below ${LOYALTY.informAt} loyalty may talk to ${CASE.detective}. A bonus (a day's pay) helps. Crew work while you're away. Wages come out at 6am: day crew from clean cash, night crew from dirty first. Today: ${money(G.crewWages(s, 'day'))} + 💜 ${money(G.crewWages(s, 'night'))}.` };
}

// ---------- The back room's own sections (they mirror the bakery's) ----------
const labHint = t => s.cur ? `This back room cooks for the stall: what it makes is packed into Rosa's vans and driven to the stall under the bread.`
  : G.sealed(s, t) ? `🚧 Police tape: sealed for another ${mins((s.sealedUntil - t) / MIN)}.`
  : `Cook any time; buyers come to the back door from 6pm to 7am.`;
// 🧪 Lab: the back room's machines (like the Kitchen)
function backTab() {
  const t = s.clock, labHere = G.shopDef(s).lab;
  const ready = s.lab.filter(m => m.job && t >= m.job.start + m.job.dur).length, idle = s.lab.filter(m => !m.job && m.last && !m.broken).length;
  let cards = pcard(`<div class="ptop"><span class="em">⚡</span><div><b>Quick jobs</b><small>${ready} ready · ${idle} idle</small></div></div>
    <div class="pbtns col"><button class="small violet" data-act="collectlab" ${ready ? '' : 'disabled'}>Bag it all (${ready})</button>
    <button class="small" data-act="restartlab" ${idle && !G.sealed(s, t) ? '' : 'disabled'}>🔁 Cook again (${idle})</button></div>`, '', 'wide night');
  if (s.cur) {
    const st = s.stock, n = G.packed(s, s.cur);
    cards += pcard(`<div class="ptop"><span class="em">📦</span><div><b>${n} bags packed</b><small>${Object.entries(st).map(([id, k]) => `${PRODUCTS[id].emoji}${k.n}`).join(' ') || 'nothing yet'}<br>${G.vansFree(s)} of ${s.vans.count} vans free · ${G.shopDef(s).drive}h to the stall</small></div></div>
      <div class="pbtns"><button class="small violet" data-act="van-send" data-id="${s.cur}" ${n && G.vansFree(s) ? '' : 'disabled'}>🚚 Send a van</button></div>`, ibtn('vans', 'x'), 'wide night');
  }
  for (const type of labHere) {
    const M = LAB_MACHINES[type];
    const list = s.lab.map((m, i) => [m, i]).filter(([m]) => m.type === type), block = G.machineBlock(s, type, true);
    const cash = G.machineCash(type, true), price = G.machinePrice(s, type, true);
    cards += pcard(`<div class="ptop"><span class="em">${M.emoji}</span><div><b>${M.name}</b><small>× ${list.length}${list.length ? ` · tier ${list.map(([m]) => m.tier || 0).join('/')}` : ''}</small></div></div>
      <div class="pbtns col">${list.length ? `<button class="small violet" data-act="machine" data-kind="night" data-idx="${list[0][1]}">Open</button>` : ''}
      ${block ? `<div class="lockline">${block.text}</div>` : `<button class="small" data-act="buylab" data-id="${type}" ${s[cash] < price ? 'disabled' : ''}>+1 · ${cash === 'dirty' ? '💜' : '💷'} ${money(price)}</button>`}</div>`,
      ibtn('labmachine', type), `wide night ${G.unlocked(s, M.level) ? '' : 'locked'}`);
  }

  return { cards, hint: `${G.shopDef(s).short}'s back room takes ${labHere.map(k => LAB_MACHINES[k].emoji + ' ' + LAB_MACHINES[k].name.toLowerCase()).join(', ')}. ${labHint(t)}` };
}
// The machines that live in your other shops (or ones you haven't opened yet)
function elsewhere(lab) {
  const mine = G.shopDef(s)[lab ? 'lab' : 'machines'], seen = new Set(mine);
  const rows = [];
  Object.entries(SHOPS).forEach(([id, d], k) => {
    const types = d[lab ? 'lab' : 'machines'].filter(x => !seen.has(x));
    types.forEach(x => seen.add(x));
    if (!types.length) return;
    const owned = s.shops.findIndex(x => x.id === id);
    const T = lab ? LAB_MACHINES : MACHINES;
    rows.push(`<div class="erow ${owned >= 0 ? '' : 'locked'}"><span>${d.emoji} ${d.short}</span><small>${types.map(x => `${T[x].emoji} ${T[x].name}`).join(' · ')}</small>${owned >= 0 ? `<button class="small" data-act="${lab ? 'go-back' : 'map-go'}" data-id="${owned}">Go</button>` : `<span class="lock">${G.unlocked(s, d.level) ? 'Open in Shops' : `🔒 Lv ${d.level}`}</span>`}</div>`);
  });
  return rows.length ? pcard(`<b>${lab ? 'Other back rooms' : 'Other kitchens'}</b><div class="elist">${rows.join('')}</div>`, '', `xwide ${lab ? 'night' : ''}`) : '';
}

// 📦 Supplies: kits from Dez, cutting, the auction, selling leftovers to Dez
function stashTab() {
  const t = s.clock;
  let cards = '';
  if (s.auction && s.auction.until > t) {
    const p = PRODUCTS[s.auction.product];
    cards += pcard(`<div class="ptop"><span class="em">🔨</span><div><b>Auction: ${p.emoji} ${p.name}</b><small>${s.auction.kits} rare kits · ${money(Math.round(p.price * purityMult(0.6)))} a bag · closes in ${mins((s.auction.until - t) / MIN)}</small></div></div>
      <div class="pbtns"><button class="small violet" data-act="auction" ${s.dirty >= s.auction.price ? '' : 'disabled'}>💜 ${money(s.auction.price)}</button></div>`, ibtn('product', s.auction.product), 'wide night');
  }
  const left = G.kitsLeftToday(s), kitNx = nextCap(CAPS.kits, s.level);
  const prods = Object.entries(PRODUCTS).filter(([id, p]) => p.rare ? (s.bags[id] || 0) + (s.kits[id] || 0) > 0 : G.unlocked(s, p.level) || (s.bags[id] || 0) > 0);
  prods.sort((a, b) => ((s.bags[b[0]] || 0) > 0) - ((s.bags[a[0]] || 0) > 0) || b[1].level - a[1].level);
  const nextLocked = Object.entries(PRODUCTS).filter(([, p]) => !p.rare && !G.unlocked(s, p.level)).sort((a, b) => a[1].level - b[1].level).slice(0, 3);
  for (const [id, p] of [...prods, ...nextLocked]) {
    const open = G.unlocked(s, p.level), have = s.bags[id] || 0, cut = s.cut[id] || 'none';
    const kitBtns = !left ? `<div class="lockline">${kitNx ? `Dez sells ${kitNx.amount} kits a day from level ${kitNx.level}` : 'No more kits today'}</div>`
      : `<button class="small violet" data-act="kit" data-id="dirty" data-type="${id}" ${s.dirty < G.kitPrice(id, 'dirty', s) ? 'disabled' : ''}>💜 Kit<small>${money(G.kitPrice(id, 'dirty', s))}</small></button>
         <button class="small" data-act="kit" data-id="clean" data-type="${id}" ${s.clean < G.kitPrice(id, 'clean', s) ? 'disabled' : ''}>💷 Kit<small>${money(G.kitPrice(id, 'clean', s))}</small></button>`;
    cards += pcard(`<div class="ptop"><span class="em">${p.emoji}</span><div><b>${p.name}</b><small>${open || have ? `${have} bags${have ? ` · ${pct(s.purity[id] ?? 0.6)} pure` : ''} · ${s.kits[id] || 0} supply kits<br>${money(nowPrice(id))} a bag` : `${FAMILIES[p.family].name} · ${money(p.price)} a bag`}<br><span class="mute">${FAMILIES[p.family].supplies.map(x => x.split(' ')[0]).join('')} ${FAMILIES[p.family].supplies.map(x => x.split(' ').slice(1).join(' ').replace(/ \(.*\)/, '')).join(', ').toLowerCase()}</span></small></div></div>
      ${!open ? lockTag(p.level) : `<div class="seg">${Object.entries(CUTS).map(([k, c]) => `<button class="${cut === k ? 'on' : ''}" data-act="cut" data-id="${id}" data-cut="${k}">${c.label}</button>`).join('')}</div>
      <div class="pbtns">${p.rare ? '<span class="lock">auction only</span>' : kitBtns}<button class="small" data-act="dez" data-id="${id}" ${have ? '' : 'disabled'}>Dez<small>½ price</small></button></div>`}`, ibtn('product', id), `wide night ${open ? '' : 'locked'}`);
  }
  return { cards, hint: `Kits from Dez (${left} more today; he charges half again for clean money), how hard to cut each product, and anything you can't shift sold back to Dez at half price.` };
}
// 🚪 Deals: the back door, Dez's jobs and deliveries (like Orders)
function dealsTab() {
  const t = s.clock;
  let cards = '';
  for (const b of s.shops[0].door) {
    const p = PRODUCTS[b.product], left = Math.max(0, (b.arrive + b.patience - t) / 1000);
    cards += pcard(`<div class="ptop"><span class="em">${b.courier ? '📦' : '👤'}</span><div><b>${b.name}${b.hint ? ' 📷' : ''}</b><small>${p.emoji} ${p.name} ×${b.want} · ${secs(left)}</small></div></div>
      <div class="pbtns"><button class="small violet" data-act="buyer" data-id="${b.id}">Answer</button></div>`, '', `wide night ${b.hint ? 'flagged' : ''}`);
  }
  for (const o of s.orders.filter(o => o.kind === 'dez')) {
    const it = PRODUCTS[o.item], have = G.orderStock(s, o);
    cards += pcard(`<div class="ptop"><span class="em">${it.emoji}</span><div><b>${o.client}</b><small>${o.qty} × ${it.name} · ${mins((o.until - t) / MIN)} left<br>pays 💜 ${money(o.pay)} · ${o.xp} XP</small></div></div>
      <div class="pbtns"><button class="small violet" data-act="order" data-id="${o.id}" ${have >= o.qty ? '' : 'disabled'}>${have >= o.qty ? 'Deliver' : `${have}/${o.qty}`}</button>
      <button class="small" data-act="order-drop" data-id="${o.id}">Turn down</button></div>`, '', 'wide night');
  }
  if (G.deliveryOpen(s)) cards += pcard(`<div class="ptop"><span class="em">🛵</span><div><b>Delivery round ${s.delivery.on ? 'on' : 'off'}</b><small>${s.delivery.riders} riders · ${s.deliveries.length} out on drops</small></div></div>
    <div class="pbtns"><button class="small" data-act="tab" data-id="logistics">Riders</button></div>`, ibtn('delivery', 'x'), 'night');
  if (!cards) cards = pcard(`<div class="ptop"><span class="em">🌙</span><div><b>Quiet right now</b><small>${doorOpen(t) ? 'Nobody at the back door.' : `The back door opens at 6pm (in ${mins((G.nextNightStart(t) - t) / MIN)}).`}</small></div></div>`, '', 'wide night');
  return { cards, hint: s.delivery.on ? 'Buyers phone and riders deliver; anyone left over knocks at the stall\'s back door.' : 'Buyers knock at the stall\'s back door from 6pm to 7am. Read them before you sell. Dez\'s jobs pay well for a big batch by a deadline.' };
}
// 🚨 Heat & police: heat, the sergeant, the case and street rep
const t0 = () => s.clock;
function policeTab() {
  const heatCls = s.heat >= 60 ? 'hot' : s.heat >= 35 ? 'warm' : '', ev = s.case.evidence;
  let cards = pcard(`<div class="ptop"><span class="em">🚨</span><div><b>Heat ${Math.round(s.heat)}</b><small>undercover ≈ ${Math.round(G.copChance(s) * 100)}% · vans ${Math.round(s.areaHeat.vans || 0)} · streets ${Math.round(s.areaHeat.streets || 0)}</small></div></div>
    <span class="heat ${heatCls}"><span class="meter wide"><i style="width:${s.heat}%"></i></span></span>`, ibtn('heat', 'heat'), 'wide night');
  {
    const lv = s.patrol?.lv, now = G.patrolBand(t0());
    cards += pcard(`<div class="ptop"><span class="em">🚓</span><div><b>Tonight's patrols</b><small>${lv ? PATROL.bands.map(([a, b, name], k) => `<span class="${lv[k] === 2 ? 'bad' : lv[k] === 0 ? 'good' : ''}">${k === now ? '▶ ' : ''}${name} (${a}:00–${b}:00): ${PATROL.levels[lv[k]][0]}</span>`).join('<br>') : 'The forecast comes at 6am.'}</small></div></div>`,
      '', 'wide night');
  }
  cards += pcard(`<div class="ptop"><span class="em">🕵️</span><div><b>${CASE.detective}'s case</b><small>${Math.round(ev)}% built · court at 100%</small></div></div>
    <span class="heat ${ev >= 60 ? 'hot' : ev >= 30 ? 'warm' : ''}"><span class="meter wide"><i style="width:${ev}%"></i></span></span>
    <div class="pbtns"><button class="small violet" data-act="case-bribe" ${s.dirty >= G.caseBribeCost(s) && ev > 0 ? '' : 'disabled'}>Bribe<small>${money(G.caseBribeCost(s))}</small></button>
      <button class="small violet" data-act="case-frame" ${s.dirty >= G.caseFrameCost(s) && ev > 0 ? '' : 'disabled'}>Frame rivals<small>${money(G.caseFrameCost(s))}</small></button></div>`, ibtn('case', 'x'), 'wide night');
  cards += pcard(`<div class="ptop"><span class="em">👮</span><div><b>Sergeant</b><small>Heat -${CFG.bribeHeat}, once a day</small></div></div>
    <div class="pbtns"><button class="small violet" data-act="bribe" ${s.dirty < CFG.bribeCost || s.today.bribe ? 'disabled' : ''}>💜 ${money(CFG.bribeCost)}</button></div>`, ibtn('bribe', 'x'), 'night');
  const stCls = s.street < 25 ? 'hot' : s.street < 45 ? 'warm' : '';
  cards += pcard(`<div class="ptop"><span class="em">🗣️</span><div><b>Street rep ${Math.round(s.street)}</b><small>≈ ${Math.round(G.buyersPerHour(s))} buyers an hour after dark</small></div></div>
    <span class="heat pop ${stCls}"><span class="meter wide"><i style="width:${s.street}%"></i></span></span>`, ibtn('street', 'x'), 'night');
  if (G.cashPileHeat(s)) cards += pcard(`<div class="ptop"><span class="em">💰</span><div><b>Cash pile</b><small>+${Math.round(G.cashPileHeat(s))} raid heat · wash or stash it</small></div></div>
    <div class="pbtns"><button class="small violet" data-act="tab" data-id="wash">Wash</button></div>`, '', 'night');
  cards += FEATURES.filter(f => ['haggle', 'courier', 'rivals'].includes(f.id) && !G.unlocked(s, f.level)).map(f => pcard(`<div class="ptop"><span class="em">${{ haggle: '🤝', courier: '🚚', rivals: '👥' }[f.id]}</span><div><b>${f.name}</b><small>coming up</small></div></div>
      ${lockTag(f.level)}`, ibtn('feature', f.id), 'night locked')).join('');
  return { cards, hint: `Raids come at ${CFG.raidAt}+ heat; a case at 100% goes to court. Lying low cools both.` };
}

function turfTab() {
  const t = s.clock;
  let cards = '';
  const stocked = Object.keys(PRODUCTS).filter(id => (s.bags[id] || 0) > 0);
  for (const [id, c] of Object.entries(CORNERS)) {
    if (c.level > s.level + 12 && !s.corners[id]) continue;
    const k = s.corners[id], open = G.unlocked(s, c.level);
    if (!k) {
      cards += pcard(`<div class="ptop"><span class="em">${c.emoji}</span><div><b>${c.name}</b><small>${c.rate} bags/h · ×${c.mult} price</small></div></div>
        ${!open ? lockTag(c.level) : `<div class="pbtns"><button class="small violet" data-act="corner-buy" data-id="${id}" ${s.dirty < c.price ? 'disabled' : ''}>💜 ${money(c.price)}</button></div>`}`,
        ibtn('corner', id), `night ${open ? '' : 'locked'}`);
      continue;
    }
    const p = k.product && PRODUCTS[k.product];
    const choices = [...new Set([...(k.product ? [k.product] : []), ...stocked])];
    const nextP = choices.length ? choices[(choices.indexOf(k.product) + 1) % choices.length] : null;
    cards += pcard(`<div class="ptop"><span class="em">${c.emoji}</span><div><b>${c.name}</b><small>${p ? `${p.emoji} ${p.name} · ${k.stock}/${c.cap}` : 'nothing to sell'}<br>≈ ${G.cornerRate(s, id, t).toFixed(1)}/h · ${k.soldToday} sold today${p ? ` · ${money(G.cornerBagPrice(s, id, k.product))} each` : ''}</small></div></div>
      <div class="pbtns">${nextP && nextP !== k.product ? `<button class="small" data-act="corner-product" data-id="${id}" data-type="${nextP}">${PRODUCTS[nextP].emoji} Switch</button>` : ''}
        <button class="small violet" data-act="corner-stock" data-id="${id}" data-n="10" ${p && (s.bags[k.product] || 0) > 0 && k.stock < c.cap ? '' : 'disabled'}>+10</button>
        <button class="small violet" data-act="corner-stock" data-id="${id}" data-n="999" ${p && (s.bags[k.product] || 0) > 0 && k.stock < c.cap ? '' : 'disabled'}>Fill</button></div>`,
      ibtn('corner', id), 'wide night hired');
  }
  const out = Object.values(s.corners).reduce((a, k) => a + k.stock, 0);
  return { cards, hint: `Corners sell while you're away: faster at night, and faster with a good street rep. ${out} bags out on the street.${s.crew.runner ? ' Kai keeps them stocked.' : ' Kai the runner (Crew) restocks them for you.'}` };
}

function logisticsTab() {
  const t = s.clock, v = s.vans;
  let cards = '';
  const nx = nextCap(VANS.caps, s.level);
  cards += pcard(`<div class="ptop"><span class="em">🚚</span><div><b>${v.count} van${v.count === 1 ? '' : 's'}</b><small>${G.vansFree(s)} free · ${s.shipments.length} on the road${v.impounded.filter(u => u > t).length ? ` · ${v.impounded.filter(u => u > t).length} impounded` : ''}<br>${G.vanCapacity(s)} bags a run</small></div></div>
    <div class="pbtns">${v.count < G.vanCap(s) ? `<button class="small primary" data-act="van-buy" ${s.clean >= VANS.price * (1 + v.count) ? '' : 'disabled'}>+1 · ${money(VANS.price * (1 + v.count))}</button>` : `<div class="lockline">${nx ? `Level ${nx.level}: ${nx.amount} vans` : 'Full fleet'}</div>`}</div>`, ibtn('vans', 'x'), 'wide night');
  const nextCapCost = VANS.capacityCost[v.level + 1], nextHide = VANS.hideCost[v.hide + 1];
  cards += pcard(`<div class="ptop"><span class="em">📐</span><div><b>Bigger vans</b><small>${G.vanCapacity(s)} bags a run${nextCapCost ? ` → ${VANS.capacity[v.level + 1]}` : ''}</small></div></div>
    <div class="pbtns">${nextCapCost ? `<button class="small primary" data-act="van-up" data-id="level" ${s.clean >= nextCapCost ? '' : 'disabled'}>💷 ${money(nextCapCost)}</button>` : '<span class="lock good">Biggest</span>'}</div>`, '', 'night');
  cards += pcard(`<div class="ptop"><span class="em">🧰</span><div><b>Hidden compartments</b><small>level ${v.hide} · a search finds it ${pct(G.findChance(s))} of the time</small></div></div>
    <div class="pbtns">${nextHide ? `<button class="small violet" data-act="van-up" data-id="hide" ${s.dirty >= nextHide ? '' : 'disabled'}>💜 ${money(nextHide)}</button>` : '<span class="lock good">Best</span>'}</div>`, '', 'night');
  cards += pcard(`<div class="ptop"><span class="em">🚓</span><div><b>Stop and search</b><small>≈ ${pct(G.stopChance(s, G.vanCapacity(s) / 2))} a run at this heat · bigger loads get stopped more</small></div></div>`, ibtn('vans', 'x'), 'night');
  for (const sh of s.shipments) cards += pcard(`<div class="ptop"><span class="em">🛣️</span><div><b>From ${SHOPS[s.shops[sh.from].id].short}</b><small>${sh.bags} bags · arrives in ${mins((sh.arrive - t) / MIN)}</small></div></div>`, '', 'night');
  s.shops.forEach((x, i) => {
    if (!i) return;
    const n = G.packed(s, i);
    cards += pcard(`<div class="ptop"><span class="em">${SHOPS[x.id].emoji}</span><div><b>${SHOPS[x.id].short}</b><small>${n} bags packed · ${SHOPS[x.id].drive}h drive</small></div></div>
      <div class="pbtns"><button class="small violet" data-act="van-send" data-id="${i}" ${n && G.vansFree(s) ? '' : 'disabled'}>Send a van</button></div>`, '', 'night');
  });
  // Delivery rounds
  if (!G.deliveryOpen(s)) cards += pcard(`<div class="ptop"><span class="em">🛵</span><div><b>Delivery round</b><small>riders take the product to buyers</small></div></div>${lockTag(DELIVERY.level)}`, ibtn('delivery', 'x'), 'wide night locked');
  else cards += pcard(`<div class="ptop"><span class="em">🛵</span><div><b>Delivery round ${s.delivery.on ? 'on' : 'off'}</b><small>${s.delivery.riders} of ${G.riderCap(s)} riders · 💜 ${money(DELIVERY.riderWage)}/day each${s.delivery.out ? ` · ${s.delivery.out} arrested today` : ''}<br>${s.deliveries.length} out on drops</small></div></div>
    <div class="pbtns"><button class="small ${s.delivery.on ? 'violet' : ''}" data-act="delivery" data-id="${s.delivery.on ? 'off' : 'on'}">${s.delivery.on ? '✓ Delivering' : 'Start'}</button>
      <button class="small" data-act="rider" data-n="-1" ${s.delivery.riders ? '' : 'disabled'}>−</button><button class="small" data-act="rider" data-n="1" ${s.delivery.riders < G.riderCap(s) ? '' : 'disabled'}>+ rider</button></div>`, ibtn('delivery', 'x'), 'wide night');
  return { cards, hint: `Branch back rooms make product; vans bring it to the stall under the bakery's own deliveries.${s.crew.dispatcher ? ' Marnie sends the vans.' : ' Marnie the dispatcher (Crew) sends them for you.'}` };
}

function washTab() {
  const w = s.wash, t = s.clock;
  const amounts = (m, act) => [1000, 10000, 100000].filter(n => n <= Math.max(1000, G.washLeft(s, m)))
    .map(n => `<button class="small violet" data-act="${act}" data-id="${m}" data-n="${n}" ${s.dirty >= Math.min(n, 1000) && G.washLeft(s, m) >= 1 ? '' : 'disabled'}>${money(n)}</button>`).join('')
    + `<button class="small violet" data-act="${act}" data-id="${m}" data-n="max" ${s.dirty >= 1 && G.washLeft(s, m) >= 1 ? '' : 'disabled'}>Max</button>`;
  const head = (m, extra) => `<div class="ptop"><span class="em">${WASH[m].emoji}</span><div><b>${WASH[m].name}</b><small>${extra}</small></div></div>`;
  const locked = m => pcard(`${head(m, `${pct(WASH[m].fee ?? WASH[m].feeMin)} cut`)}${lockTag(WASH[m].level)}`, ibtn('wash', m), 'wide night locked');
  let cards = pcard(`<div class="ptop"><span class="em">💜</span><div><b>${money(s.dirty)} dirty</b><small>${w.offshore ? `${money(w.offshore)} offshore · ` : ''}${w.art.length ? `${w.art.length} painting${w.art.length > 1 ? 's' : ''} for sale · ` : ''}washed today ${money((s.today.washed || 0) + s.today.laundered)}</small></div></div>
    <small>HMRC investigation chance this week: ${pct(G.investigateChance(s))}${G.cashPileHeat(s) ? `<br><span class="bad">Cash pile: +${Math.round(G.cashPileHeat(s))} raid heat</span>` : ''}</small>`, ibtn('launder', 'x'), 'wide night');
  // The tills
  cards += pcard(`${head('till', `${money(G.launderLeft(s))} left today · ${pct(G.launderFee(s))} cut · taxed`)}
    <div class="pbtns"><button class="small violet" data-act="launder-open" ${s.dirty >= 1 ? '' : 'disabled'}>Choose an amount</button></div>`, ibtn('wash', 'till'), 'wide night');
  // Smurfing
  if (!G.washOpen(s, 'smurf')) cards += locked('smurf');
  else {
    const cap = G.washCap(s, 'smurf');
    cards += pcard(`${head('smurf', `${money(w.smurfDaily)} a day of ${money(cap)} · ${pct(WASH.smurf.fee)} cut · untaxed<br>today ${money(w.smurfToday)}`)}
      <div class="seg">${[0, 0.25, 0.5, 1].map(f => `<button class="${Math.round(w.smurfDaily) === Math.round(cap * f) ? 'on' : ''}" data-act="smurf" data-n="${Math.round(cap * f)}">${f ? pct(f) : 'Off'}</button>`).join('')}</div>`, ibtn('wash', 'smurf'), 'wide night');
  }
  // The casino and crypto
  for (const m of ['casino', 'crypto']) {
    if (!G.washOpen(s, m)) { cards += locked(m); continue; }
    cards += pcard(`${head(m, `${money(G.washLeft(s, m))} left today · ${pct(G.washFee(s, m))} cut${m === 'crypto' ? (w.cryptoFee < 0.12 ? ' · <span class="good">cheap right now</span>' : w.cryptoFee > 0.3 ? ' · <span class="bad">dear right now</span>' : '') : ''} · untaxed`)}
      <div class="pbtns">${amounts(m, 'wash')}</div>`, ibtn('wash', m), 'wide night');
  }
  // Offshore
  if (!G.washOpen(s, 'offshore')) cards += locked('offshore');
  else cards += pcard(`${head('offshore', `${money(w.offshore)} stashed (safe from raids) · in ${pct(WASH.offshore.fee)}, out clean ${pct(WASH.offshore.outFee)} (taxed)<br>${money(G.washLeft(s, 'offshore'))} of fees left today`)}
    <div class="pbtns"><button class="small violet" data-act="offshore-in" data-n="10000" ${s.dirty >= 1 ? '' : 'disabled'}>Stash £10k</button><button class="small violet" data-act="offshore-in" data-n="max" ${s.dirty >= 1 ? '' : 'disabled'}>All</button>
      <button class="small" data-act="offshore-clean" ${w.offshore >= 1 && G.washLeft(s, 'offshore') >= 1 ? '' : 'disabled'}>Clean</button><button class="small" data-act="offshore-dirty" ${w.offshore >= 1 ? '' : 'disabled'}>Dirty</button></div>`, ibtn('wash', 'offshore'), 'wide night');
  // Art
  if (!G.washOpen(s, 'art')) cards += locked('art');
  else cards += pcard(`${head('art', `${money(G.washLeft(s, 'art'))} left today · ${pct(WASH.art.fee)} cut · sells in ${WASH.art.days} days${w.art.length ? `<br>next sale ${mins((w.art[0].ready - t) / MIN)}` : ''}`)}
    <div class="pbtns">${amounts('art', 'art')}</div>`, ibtn('wash', 'art'), 'wide night');
  // Fronts
  for (const [id, f] of Object.entries(FRONTS)) {
    if (f.level > s.level + 12 && !w.fronts[id]) continue;
    const k = w.fronts[id], open = G.unlocked(s, f.level);
    cards += pcard(`<div class="ptop"><span class="em">${f.emoji}</span><div><b>${f.name}</b><small>washes ${money(f.cap)} a night · ${pct(f.fee)} cut · taxed${k && k.closedUntil > t ? `<br><span class="bad">closed for ${mins((k.closedUntil - t) / MIN)}</span>` : ''}</small></div></div>
      ${k ? `<div class="pbtns"><button class="small ${k.on ? 'violet' : ''}" data-act="front-toggle" data-id="${id}">${k.on ? '✓ Washing' : 'Paused'}</button></div>`
        : !open ? lockTag(f.level) : `<div class="pbtns"><button class="small primary" data-act="front-buy" data-id="${id}" ${s.clean < f.price ? 'disabled' : ''}>💷 ${money(f.price)}</button></div>`}`,
      ibtn('front', id), `wide night ${open ? '' : 'locked'} ${k ? 'hired' : ''}`);
  }
  return { cards, hint: `Spread the money around: every route has its own daily limit, cut and risk. Taxed routes count as declared income; the more you wash next to your real takings, the more HMRC ask questions.${s.crew.moneyman ? ' Felix spreads the rest every morning.' : ''}` };
}

function ordersTab() {
  const t = s.clock;
  let cards = '';
  for (const [kind, list] of [['Today', s.goals.daily], ['This week', s.goals.weekly]]) for (const g of list) {
    const pg = G.goalProgress(s, g);
    cards += pcard(`<div class="ptop"><span class="em">${g.done ? '✅' : '🎯'}</span><div><b>${kind}</b><small>${GOALS[g.key].text(g.target)}</small></div></div>
      <span class="heat pop"><span class="meter wide"><i style="width:${(pg / g.target * 100).toFixed(0)}%"></i></span></span><small>${g.done ? 'Done' : `${Math.round(pg).toLocaleString('en-GB')} / ${g.target.toLocaleString('en-GB')}`}${kind === 'This week' ? ' · +1 ⭐ token' : ''}</small>`, '', `wide ${g.done ? 'hired' : ''}`);
  }
  for (const o of s.orders.filter(o => o.kind !== 'dez')) {
    const dez = o.kind === 'dez', it = (dez ? PRODUCTS : ITEMS)[o.item], have = G.orderStock(s, o);
    cards += pcard(`<div class="ptop"><span class="em">${it.emoji}</span><div><b>${o.client}</b><small>${o.qty} × ${it.name} · ${mins((o.until - t) / MIN)} left<br>pays ${dez ? '💜' : '💷'} ${money(o.pay)} · ${o.xp} XP</small></div></div>
      <div class="pbtns"><button class="small ${dez ? 'violet' : 'primary'}" data-act="order" data-id="${o.id}" ${have >= o.qty ? '' : 'disabled'}>${have >= o.qty ? 'Deliver' : `${have}/${o.qty}`}</button>
      <button class="small" data-act="order-drop" data-id="${o.id}">Turn down</button></div>`, '', `wide ${dez ? 'night' : ''}`);
  }
  if (!s.orders.length) cards += pcard(`<div class="ptop"><span class="em">📭</span><div><b>No orders right now</b><small>${G.orderCap(s) ? 'New ones come in every few hours.' : 'Orders start at level 3.'}</small></div></div>`, '', 'wide');
  const done = MILESTONES.filter(m => s.milestones[m.id]).length;
  cards += pcard(`<div class="ptop"><span class="em">🏆</span><div><b>Milestones</b><small>${done} of ${MILESTONES.length} reached</small></div></div>
    <div class="pbtns"><button class="small" data-act="milestones">See them</button></div>`, '', 'wide');
  return { cards, hint: `Goals reset every morning and every week. Special orders: deliver from the case (any shop) or the back room before time runs out. Grace delivers bakery orders and Lenny delivers Dez's jobs for you. Up to ${G.orderCap(s)} at once.` };
}

function shopsTab() {
  let cards = '';
  Object.entries(SHOPS).forEach(([id, d]) => {
    const i = s.shops.findIndex(x => x.id === id), open = G.unlocked(s, d.level);
    const what = d.machines.map(t => MACHINES[t].emoji).join('');
    if (i >= 0) {
      const x = s.shops[i], ready = x.machines.filter(m => m.job && s.clock >= m.job.start + m.job.dur).length;
      cards += pcard(`<div class="ptop"><span class="em">${d.emoji}</span><div><b>${d.short}</b><small>${what} · ${x.machines.length} machines${ready ? ` · ${ready} ready` : ''}<br>prices ×${d.priceMult} · rent ${money(d.rent)}/day${d.launder ? ` · fronts ${money(d.launder)}` : ''}</small></div></div>
        <small>👥 ${TASTES[id].who} like ${Object.entries(TASTES[id].like).filter(([, v]) => v > 1).map(([g]) => GROUPS[g] || g).join(', ')}${TASTES[id].price > 1.05 ? ' · watch their money' : TASTES[id].price < 0.95 ? ' · don\'t mind prices' : ''}</small>
        <small>${x.manager ? `🧑‍💼 ${MANAGER.skills[x.manager.skill].name} manager · ${money(MANAGER.skills[x.manager.skill].wage)}/day` : G.unlocked(s, MANAGER.level) ? '🧑‍💼 No manager' : ''}</small>
        <div class="pbtns">${i === (s.cur || 0) ? '<span class="lock good">You\'re here</span>' : `<button class="small primary" data-act="shop-view" data-id="${i}">Go there</button>`}
          ${!G.unlocked(s, MANAGER.level) ? '' : x.manager ? `<button class="small" data-act="manager-fire" data-shop="${i}">Let the manager go</button>` : MANAGER.skills.map((M, k) => `<button class="small" data-act="manager-hire" data-shop="${i}" data-skill="${k}">${M.name} · ${money(M.wage)}/day</button>`).join('')}</div>`,
        ibtn('shop', id), `wide hired`);
    } else {
      cards += pcard(`<div class="ptop"><span class="em">${d.emoji}</span><div><b>${d.name}</b><small>${what} · prices ×${d.priceMult}<br>rent ${money(d.rent)}/day · launders ${money(d.launder)}/day</small></div></div>
        ${!open ? lockTag(d.level) : `<div class="pbtns"><button class="small primary" data-act="shop-buy" data-id="${id}" ${s.clean < G.shopPrice(s) ? 'disabled' : ''}>Open · ${money(G.shopPrice(s))}</button></div>`}`,
        ibtn('shop', id), `wide ${open ? '' : 'locked'}`);
    }
  });
  for (const [id, p] of Object.entries(PROPERTY)) {
    if (p.level > s.level + 20 && !s.property[id]) continue;
    const open = G.unlocked(s, p.level), owned = s.property[id];
    cards += pcard(`<div class="ptop"><span class="em">${p.emoji}</span><div><b>${p.name}</b><small>${p.desc}</small></div></div>
      ${owned ? '<span class="lock good">✓ Yours</span>' : !open ? lockTag(p.level) : `<div class="pbtns"><button class="small primary" data-act="property" data-id="${id}" ${s.clean < p.price ? 'disabled' : ''}>${money(p.price)}</button></div>`}`,
      ibtn('property', id), `wide ${open ? '' : 'locked'} ${owned ? 'hired' : ''}`);
  }
  return { cards, hint: `Each shop runs four machine types (up to three of each) front and back; every branch costs ${SHOP_GROW}× the last, runs its own (more profitable) machines, charges more, and lets you launder more. Each shop you own brings ${pct(CFG.prestigeCust)} more customers to all of them. Rent: ${money(G.shopRent(s))} a day.` };
}

function marketingTab() {
  const popCls = s.rep < 30 ? 'hot' : s.rep < 55 ? 'warm' : '';
  let cards = s.rival.open ? pcard(`<div class="ptop"><span class="em">🥐</span><div><b>${RIVAL.name}</b><small>taking ${pct(s.rival.share)} of your customers<br>campaigns and low prices win them back</small></div></div>
    <div class="pbtns"><button class="small primary" data-act="rival-buy" ${s.clean >= G.rivalBuyout(s) ? '' : 'disabled'}>Buy them out · ${money(G.rivalBuyout(s))}</button></div>`, '', 'wide') : '';
  cards += pcard(`<div class="ptop"><span class="em">⭐</span><div><b>Popularity ${Math.round(s.rep)}</b><small>${G.scandal(s, s.clock) ? `scandal: ${mins((s.scandalUntil - s.clock) / MIN)} more` : `≈ ${Math.round(G.customersPerHour(s, s.clock))} customers this hour`}</small></div></div>
    <span class="heat pop ${popCls}"><span class="meter wide"><i style="width:${s.rep}%"></i></span></span>`, ibtn('pop', 'pop'), 'wide');
  for (const [id, c] of Object.entries(CAMPAIGNS)) {
    if (c.level > s.level + 12) continue;
    const running = G.activeCampaigns(s).find(x => x.id === id), block = G.campaignBlock(s, id), open = G.unlocked(s, c.level);
    const effect = [c.cust ? `+${Math.round(c.cust * 100)}% customers` : '', c.pop ? `+${c.pop} pop/day` : '', c.once ? `+${c.once} pop` : ''].filter(Boolean).join(' · ');
    const btn = running ? `<span class="lock good">Running · ${mins((running.until - s.clock) / MIN)} left</span>`
      : block ? (block.lock && !open ? lockTag(c.level) : `<div class="lockline">${block.text}</div>`)
      : `<div class="pbtns"><button class="small primary" data-act="campaign" data-id="${id}" ${s.clean < c.price ? 'disabled' : ''}>${money(c.price)}</button></div>`;
    cards += pcard(`<div class="ptop"><span class="em">${c.emoji}</span><div><b>${c.name}</b><small>${effect} · ${mins(c.hours * 60)}</small></div></div>${btn}`,
      ibtn('campaign', id), `${open ? '' : 'locked'} ${running ? 'hired' : ''}`);
  }
  const nx = nextCap(CAPS.campaigns, s.level);
  return { cards, hint: `Campaigns running: ${G.activeCampaigns(s).length} of ${G.campaignCap(s)}${nx ? ` (level ${nx.level}: ${nx.amount})` : ''}. Mel the PR manager is in Crew.` };
}

function bankTab() {
  let cards;
  if (s.won) cards = pcard(`<div class="ptop"><span class="em">🎉</span><div><b>Debt cleared</b><small>The stall is yours</small></div></div>`, '', 'wide');
  else cards = pcard(`<div class="ptop"><span class="em">🏦</span><div><b>${money(s.balance)} owed</b><small>${money(G.nextDue(s))} due ${dateStr(G.nextPaymentAt(s))} 6am</small></div></div>
      ${s.arrears > 0 ? `<small class="bad">Behind: ${money(s.arrears)}</small>` : ''}${s.holidayNext ? '<small class="good">Next payment skipped</small>' : ''}`, ibtn('bank', 'debt'), 'wide')
    + pcard(`<b>Pay early</b>
      <div class="pbtns col"><button class="small" data-act="pay" data-id="500" ${s.clean < 500 ? 'disabled' : ''}>£500</button>
      <button class="small" data-act="pay" data-id="2000" ${s.clean < 2000 ? 'disabled' : ''}>£2,000</button>
      <button class="small primary" data-act="pay" data-id="all" ${s.clean < s.balance ? 'disabled' : ''}>All of it</button></div>`, ibtn('bank', 'pay'));
  if (!s.won) {
    const loanOpen = G.feature(s, 'loan');
    cards += pcard(`<div class="ptop"><span class="em">💳</span><div><b>Loan</b><small>${money(G.loanAmount(s) || capAt(CAPS.loan, 4))}</small></div></div>
      ${loanOpen ? `<div class="pbtns"><button class="small" data-act="loan" ${G.loanReady(s) ? '' : 'disabled'}>${G.loanReady(s) ? 'Borrow' : 'Next week'}</button></div>` : lockTag(4)}`, ibtn('bank', 'loan'), loanOpen ? '' : 'locked');
    const holOpen = G.feature(s, 'holiday');
    cards += pcard(`<div class="ptop"><span class="em">🏖️</span><div><b>Payment holiday</b><small>once only</small></div></div>
      ${holOpen ? `<div class="pbtns"><button class="small" data-act="holiday" ${s.holidayUsed ? 'disabled' : ''}>${s.holidayUsed ? 'Used' : 'Skip next'}</button></div>` : lockTag(10)}`, ibtn('bank', 'holiday'), holOpen ? '' : 'locked');
  }
  if (s.arrears > 0 && !s.won) {
    cards += pcard(`<div class="ptop"><span class="em">📑</span><div><b>Restructure</b><small>stop the visits</small></div></div>
      ${G.restructureReady(s) ? `<div class="pbtns"><button class="small" data-act="restructure">Fold in · ${money(s.arrears * CFG.restructureFee)} fee</button></div>`
        : `<div class="lockline">${s.behind < 2 ? 'Available two payments behind' : 'Once a month'}</div>`}`, ibtn('bank', 'restructure'), 'wide');
  }
  for (const [id, I] of Object.entries(INSURANCE)) {
    if (typeof I !== 'object') continue;
    cards += pcard(`<div class="ptop"><span class="em">${I.emoji}</span><div><b>${I.name}</b><small>${money(G.insurancePremium(s, id))}/day · ${I.desc}</small></div></div>
      <div class="pbtns"><button class="small ${s.insurance[id] ? 'primary' : ''}" data-act="insure" data-id="${id}">${s.insurance[id] ? '✓ Covered' : 'Take out'}</button></div>`, '', `wide ${s.insurance[id] ? 'hired' : ''}`);
  }
  const est = G.taxEstimate(s), daysToTax = ((TAX.taxDay - G.dayIndex(s, s.clock)) % 7 + 7) % 7 || 7;
  cards += pcard(`<div class="ptop"><span class="em">🧾</span><div><b>HMRC</b><small>≈ ${money(est.total)} due in ${daysToTax}d${s.vatRegistered ? ' · VAT registered' : ''}${s.hmrc > 1 ? `<br><span class="bad">Owed: ${money(s.hmrc)}</span>` : ''}</small></div></div>
    <div class="seg">${Object.entries(DECLARE).map(([k, d]) => `<button class="${(s.declare || 'full') === k ? 'on' : ''}" data-act="declare" data-id="${k}">${d.label}</button>`).join('')}</div>
    ${s.hmrc > 1 ? `<div class="pbtns"><button class="small danger" data-act="hmrc" ${s.clean >= 1 ? '' : 'disabled'}>Pay HMRC</button></div>` : ''}`, ibtn('tax', 'x'), 'wide');
  const pt = G.prestigeTokens(s), pr = s.prestige;
  cards += pcard(`<div class="ptop"><span class="em">⭐</span><div><b>Prestige</b><small>worth ${money(G.netWorth(s))} → ${pt} token${pt === 1 ? '' : 's'}${pr.tokens ? `<br>${pr.tokens} to spend` : ''}${pr.total ? ` · +${pct(PRESTIGE.tokenBonus * pr.total)} prices` : ''}</small></div></div>
    <div class="pbtns"><button class="small" data-act="perks">Perks</button>${s.level >= PRESTIGE.level ? `<button class="small primary" data-act="prestige-ask" ${pt ? '' : 'disabled'}>Start again</button>` : `<span class="lock">🔒 Lv ${PRESTIGE.level}</span>`}</div>`, ibtn('prestige', 'x'), 'wide hired');
  cards += pcard(`<b>Daily reports</b><small>${s.reports.length ? `Last: ${dateStr(s.reports.at(-1).day)}` : 'The first comes at 6am'}</small>
    <div class="pbtns"><button class="small" data-act="report" ${s.reports.length ? '' : 'disabled'}>📋 Read</button></div>`, '');
  {
    const h = s.honest || { days: 0, best: 0, awards: {} }, next = CLEAN_RECORD.awards.find(([d]) => !h.awards[d]);
    cards += pcard(`<div class="ptop"><span class="em">🕊️</span><div><b>Clean record: ${h.days} day${h.days === 1 ? '' : 's'}</b><small>+${Math.round(G.cleanBonus(s) * 100)}% customers (up to +${CLEAN_RECORD.cap * 100}%)${h.days >= 14 ? ' · critics like you' : ''}${next ? `<br>Next award: ${next[1]} at ${next[0]} days` : '<br>Every award won'}${h.best > h.days ? ` · best ${h.best}` : ''}</small></div></div>`,
      ibtn('clean', 'x'), 'wide');
  }
  return { cards, hint: 'The bank takes its payment at 6am on payment day, automatically.' };
}

// Everything a level opens up, for the level-up card and the level ⓘ.
function unlocksAt(L) {
  const out = [];
  for (const [, i] of Object.entries(INGREDIENTS)) if (i.level === L) out.push(`${i.emoji} ${i.name} in Supplies`);
  for (const u of UPGRADES) if (u.level === L) out.push(`${u.emoji || '🛠️'} ${u.name}${u.lab ? ' (back room)' : ''}`);
  for (const [tbl, where] of [[MACHINES, 'Kitchen'], [LAB_MACHINES, 'back room']]) for (const [, M] of Object.entries(tbl)) {
    if (M.level === L && L > 1) out.push(`${M.emoji} The ${M.name.toLowerCase()} (${where})`);
    else for (const [l, n] of M.caps) if (l === L && l > M.level) out.push(`${M.emoji} Room for ${n} ${M.plural}`);
  }
  for (const [, r] of Object.entries(ITEMS)) if (r.level === L && L > 1) out.push(`${r.emoji} ${r.name} on the ${MACHINES[r.machine].name.toLowerCase()}${r.cost ? ` (learn for ${money(r.cost)})` : ''}`);
  for (const [, p] of Object.entries(PRODUCTS)) if (p.level === L && L > 1) out.push(`${p.emoji} ${p.name}, ${money(p.price)} a bag (back room)`);
  for (const [key, label] of [['menu', 'things on sale at once'], ['kits', 'kits a day from Dez'], ['decor', 'decorations'], ['campaigns', 'campaigns at once']]) {
    for (const [l, n] of CAPS[key]) if (l === L && l > 1) out.push(`➕ ${n} ${label}`);
  }
  for (const [l, n] of CAPS.loan) if (l === L && l > 4) out.push(`💳 Loans up to ${money(n)}`);
  for (const [, c] of Object.entries(CREW)) if (c.level === L && L > 1) out.push(`${c.emoji} ${c.name}, ${c.role.toLowerCase()}`);
  for (const f of FEATURES) if (f.level === L) out.push(`✨ ${f.name}: ${f.desc}`);
  for (const [, c] of Object.entries(CAMPAIGNS)) if (c.level === L && L > 1) out.push(`${c.emoji} ${c.name} (Marketing)`);
  for (const [, p] of Object.entries(PROPERTY)) if (p.level === L) out.push(`${p.emoji} ${p.name} (Shops)`);
  for (const [, c] of Object.entries(CORNERS)) if (c.level === L) out.push(`${c.emoji} ${c.name} (Turf)`);
  for (const [, w] of Object.entries(WASH)) if (w.level === L && L > 1) out.push(`${w.emoji} ${w.name} (Wash)`);
  if (L === DELIVERY.level) out.push('🛵 Delivery rounds (Logistics)');
  for (const [l, n] of VANS.caps) if (l === L && l > 1) out.push(`🚚 Run ${n} vans`);
  for (const [, f] of Object.entries(FRONTS)) if (f.level === L) out.push(`${f.emoji} A ${f.name.toLowerCase()} to buy as a front (Wash)`);
  for (const [, d] of Object.entries(SHOPS)) if (d.level === L && L > 1) out.push(`${d.emoji} ${d.name} can open (Shops)`);
  for (const [tbl, icon] of [[D.FLOORS, '🟫'], [D.WALLS, '🧱'], [D.DECOR, null], [D.ART, null], [D.EXPANSIONS, '➕']]) {
    for (const [, x] of Object.entries(tbl)) if (x.level === L && L > 1) out.push(`${x.emoji || icon} ${x.name} (Design)`);
  }
  return out;
}

// ---------- ⓘ breakdowns ----------
function infoFor(kind, id) {
  const T = (title, html) => ({ title, html });
  const t = s.clock;
  if (kind === 'clock') {
    return T(`🕰️ ${hhmm(t)}, ${dateStr(t)}`, `<p>Baking Bad runs on the real clock. The bakery never closes: cook, buy and decorate whenever you like.</p>`
      + line('Customers this hour', `≈ ${Math.round(G.customersPerHour(s, t))}`) + line('Busiest', '7–9am and noon–2pm')
      + line('Back door', s.labUnlocked ? (doorOpen(t) ? 'open now, until 7am' : `opens at 6pm`) : 'not yours yet')
      + line('New day (bills, bank, market)', 'every morning at 6am')
      + `<p class="mute">When you're away the game plays the time forward: customers buy from the case, food left in a machine spoils, interest builds, crew do their jobs and buyers come and go. Up to ${CFG.maxCatchUpDays} days are played; anything longer is skipped.</p>`);
  }
  if (kind === 'event') return T('Today', `<p>${s.event?.text || 'An ordinary day.'}</p><p class="mute">A new day's market and weather come at 6am.</p>`);
  if (kind === 'stockup') return T('🧺 Stock up', '<p>Buys what\'s missing for three batches of everything on sale, at today\'s prices. You don\'t have to: starting a batch buys any missing ingredients itself.</p><p class="mute">Grace the manager does this every morning once you hire her.</p>');
  if (kind === 'quick') return T('⚡ Quick jobs', '<p><b>Collect all</b> moves every finished batch into the case. <b>Cook again</b> starts the last recipe again on every idle machine.</p><p class="mute">Priya the baker collects for you, and Marco the head chef cooks again for you, even while you\'re away.</p>');
  if (kind === 'ing') {
    const ing = INGREDIENTS[id], p = G.ingPrice(s, id);
    const uses = Object.keys(ITEMS).filter(r => ITEMS[r].ing[id]).map(r => `${ITEMS[r].emoji} ${ITEMS[r].name} (${ITEMS[r].ing[id]})${s.recipes.includes(r) ? '' : ' 🔒'}`);
    return T(`${ing.emoji} ${ing.name}`, line('In stock', s.inv[id]) + line('Today', money2(p)) + line('Usual price', money2(ing.base))
      + (ing.level ? line('Unlocks at', `level ${ing.level}`) : '')
      + `<p><b>Used in</b><br><small>${uses.join('<br>') || 'Nothing yet'}</small></p>`
      + '<p class="mute">Prices change every morning; stock keeps forever. Buy plenty when it\'s cheap.</p>');
  }
  if (kind === 'recipe') {
    const r = ITEMS[id], cost = G.batchCost(s, id), cook = G.cookMs(s, id) / MIN, keep = G.spoilMs(s, id) / MIN;
    const base = G.itemPrice(s, id) / PRICE_LEVELS[s.priceLevel[id] || 'normal'].mult;
    const rows = Object.entries(PRICE_LEVELS).map(([k, L]) => {
      const each = base * L.mult, profit = each * r.servings - cost;
      return `<tr class="${s.priceLevel[id] === k ? 'on' : ''}"><td>${L.label}</td><td>${money2(each)}</td><td>${money(profit)}</td><td>${money(profit / (cook / 60))}</td><td>${Math.round(L.buy * 100)}%</td></tr>`;
    }).join('');
    return T(`${r.emoji} ${r.name}`, line('Makes', `${r.servings} servings`) + line('Cooks in', mins(cook)) + line('Spoils if left', `${mins(keep)} after it's done`)
      + line('Ingredients', ingText(r)) + line('Batch cost today', money2(cost))
      + line('Made on', `${MACHINES[r.machine].emoji} ${MACHINES[r.machine].name}`) + line('Popular', GROUP_TEXT[r.group])
      + line('XP', `${G.batchXp(id)} a batch + ${G.saleXp(id)} a sale`) + line('In the case', `${s.display[id] || 0} / ${G.trayCap(s, id)}`)
      + (s.recipes.includes(id) ? '' : line('Learn it', r.cost ? `${money(r.cost)} from level ${r.level}` : `comes with the machine at level ${r.level}`))
      + `<table class="itable"><tr><th>Price</th><th>Each</th><th>Profit</th><th>/hour</th><th>Buy</th></tr>${rows}</table>`
      + '<p class="mute">"Buy" is the chance a customer who wants it goes ahead at that price. Long recipes earn less per hour of cooking but make more per batch: good to start before you go out or to bed.</p>');
  }
  if (kind === 'upgrade') {
    const u = UPGRADES.find(x => x.id === id);
    return T(`${u.emoji || '🛠️'} ${u.name}`, `<p>${u.desc}</p>` + line('Cost', `${u.cash === 'dirty' ? '💜' : '💷'} ${money(u.cost)}`)
      + line('Unlocks at', `level ${u.level}`) + `<p class="mute">${u.lab ? 'A back-room upgrade.' : 'A bakery upgrade.'} Upgrades are permanent.</p>`);
  }
  if (kind === 'property') {
    const p = PROPERTY[id];
    return T(`${p.emoji} ${p.name}`, `<p>${p.desc}</p>` + line('Price', money(p.price)) + line('Unlocks at', `level ${p.level}`) + line('Yours', s.property[id] ? 'yes' : 'no')
      + '<p class="mute">Property is permanent. Income is paid every morning at 6am.</p>');
  }
  if (kind === 'pop') {
    return T(`⭐ Popularity ${Math.round(s.rep)}`, line('Customers this hour', `≈ ${Math.round(G.customersPerHour(s, t))}`)
      + line('Scandal', G.scandal(s, t) ? `${mins((s.scandalUntil - t) / MIN)} more (fewer customers)` : 'none', G.scandal(s, t) ? 'bad' : 'good')
      + line('Marketing boost', `+${Math.round(G.campaignBoost(s) * 100)}% customers`) + line('Charm', `+${Math.round((D.charmBonus(s) - 1) * 100)}% customers`)
      + line('PR manager', s.crew.pr ? `yes (+${CFG.prPopPerDay}/day)` : 'no')
      + `<p><b>Goes up</b><br><small>Happy customers, campaigns, a PR manager, the charity bake sale.</small></p>`
      + `<p><b>Goes down</b><br><small>Customers who find the case empty or prices too high; getting busted (-${CFG.bustPop}); the debt collectors' visits (-${CFG.heaviesPop}); missed bank payments (-${CFG.missPop}); being robbed (-${CFG.rivalPop}). It drifts back towards ${CFG.popHome} over time.</small></p>`);
  }
  if (kind === 'campaign') {
    const c = CAMPAIGNS[id];
    return T(`${c.emoji} ${c.name}`, `<p>${c.desc}</p>` + line('Cost', money(c.price)) + line('Lasts', mins(c.hours * 60))
      + (c.cust ? line('Customers', `+${Math.round(c.cust * 100)}%`) : '') + (c.pop ? line('Popularity', `+${c.pop} a day`) : '')
      + (c.once ? line('Popularity now', `+${c.once}${s.crew.pr ? ' (+25% with Mel)' : ''}`) : '') + (c.heat ? line('Heat', `${c.heat}`) : '')
      + line('Unlocks at', `level ${c.level}`) + `<p class="mute">You can run ${G.campaignCap(s)} at once at your level.</p>`);
  }
  if (kind === 'machine') {
    const M = MACHINES[id], nx = G.machineNextCap(s, id);
    const list = G.recipesFor(id).sort((a, b) => ITEMS[a].level - ITEMS[b].level).map(r => `${ITEMS[r].emoji} ${ITEMS[r].name} · lv ${ITEMS[r].level} · ${mins(ITEMS[r].minutes)}${s.recipes.includes(r) ? ' ✓' : ''}`).join('<br>');
    return T(`${M.emoji} ${M.name}`, line('You have', G.machineCount(s, id)) + line('Allowed now', G.machineCap(s, id))
      + (nx ? line('More from', `level ${nx.level} (${nx.amount})`) : '') + line('Next one costs', money(G.machinePrice(s, id)))
      + line('Unlocks at', `level ${M.level}`) + line('Left too long', `food gets ${M.spoil}`, 'bad') + line('Repair', money(G.repairCost(id)))
      + `<p><b>Recipes</b><br><small>${list}</small></p>`);
  }
  if (kind === 'labmachine') {
    const M = LAB_MACHINES[id], nx = G.machineNextCap(s, id, true);
    const list = G.productsFor(id).map(p => `${PRODUCTS[p].emoji} ${PRODUCTS[p].name} · lv ${PRODUCTS[p].level}`).join('<br>');
    return T(`${M.emoji} ${M.name}`, line('You have', G.machineCount(s, id, true)) + line('Allowed now', G.machineCap(s, id, true))
      + (nx ? line('More from', `level ${nx.level} (${nx.amount})`) : '') + line('Next one costs', `${G.machineCash(id, true) === 'dirty' ? '💜' : '💷'} ${money(G.machinePrice(s, id, true))}`)
      + line('Unlocks at', `level ${M.level}`) + `<p><b>Makes</b><br><small>${list}</small></p><p class="mute">Back-room cooks never spoil: bag them whenever you like.</p>`);
  }
  if (kind === 'product') {
    const p = PRODUCTS[id], bags = Math.round(p.bags * (1 + G.eff(s, 'bags')));
    const rows = Object.entries(CUTS).map(([k, c]) => { const pur = Math.min(0.99, G.labPurity(s, null) * c.purity), n = Math.round(bags * c.bags), each = Math.round(p.price * purityMult(pur));
      return `<tr class="${(s.cut[id] || 'none') === k ? 'on' : ''}"><td>${c.label}</td><td>${n}</td><td>${pct(pur)}</td><td>${money(each)}</td><td>${money(n * each - p.kit)}</td></tr>`; }).join('');
    return T(`${p.emoji} ${p.name}`, line('Family', `${FAMILIES[p.family].emoji} ${FAMILIES[p.family].name}`) + line('Supply kit', `💜 ${money(G.kitPrice(id, 'dirty', s))} · 💷 ${money(G.kitPrice(id, 'clean', s))}`) + `<p class="mute" style="margin:4px 0">Each kit: ${FAMILIES[p.family].supplies.join(' · ')}${p.ing ? ' (plus bakery stock)' : ''}.<br>Usually ${FAMILIES[p.family].cut}.</p>` + line('Cooks in', mins(p.minutes))
      + line('List price', `${money(p.price)} a bag at 60% purity`) + (s.bags[id] ? line('Yours', `${s.bags[id]} bags at ${pct(s.purity[id] ?? 0.6)}: ${money(nowPrice(id))} each`) : '')
      + `<table class="itable"><tr><th>Cut</th><th>Bags</th><th>Purity</th><th>Each</th><th>Profit</th></tr>${rows}</table>`
      + (p.ing ? line('Also uses', Object.entries(p.ing).map(([k, q]) => `${q} ${INGREDIENTS[k].name.toLowerCase()}`).join(', ')) : '')
      + line('Heat a cook', `+${p.heat}`) + line('Undercover buyers', `≈ ${Math.round(G.copChance(s, id) * 100)}% now`)
      + line('Made on', `${LAB_MACHINES[p.machine].emoji} ${LAB_MACHINES[p.machine].name}`) + line('Unlocks at', `level ${p.level}`)
      + line('You have', `${s.bags[id] || 0} bags, ${s.kits[id] || 0} kits`)
      + '<p class="mute">Purity comes from the machine\'s tier, back-room upgrades, Doc and Pip. Cutting makes more bags but each is worth less, and buyers notice: weak product hurts your street rep. Pricier products have fewer buyers and draw more attention.</p>');
  }
  if (kind === 'vans') {
    return T('🚚 Rosa\'s vans', '<p>Branch back rooms don\'t sell anything. What they make is packed under bread trays and driven to the stall\'s back room with the bakery\'s own deliveries.</p>'
      + line('Fleet', `${s.vans.count} of ${G.vanCap(s)} vans`) + line('A run carries', `${G.vanCapacity(s)} bags`) + line('Drive times', '1h from the café up to 4h from the maison')
      + line('Stopped', `≈ ${pct(G.stopChance(s, G.vanCapacity(s) / 2))} of runs at this heat (more for bigger loads)`) + line('Found if searched', pct(G.findChance(s)))
      + `<p class="mute">If the load is found it's seized, the van is impounded for ${VANS.impoundDays} days, the driver arrested and heat +${VANS.seizeHeat}. Hidden compartments and DS Hale help; so does keeping the heat down.</p>`);
  }
  if (kind === 'delivery') {
    return T('🛵 Delivery round', `<p>Instead of buyers coming to the stall's back door, they phone and a rider takes it to them. Most undercover officers never get past the phone call, there's less heat around the stall and fewer raids, and buyers pay ${pct(DELIVERY.price - 1)} more.</p>`
      + line('Riders', `${s.delivery.riders} of ${G.riderCap(s)}, 💜 ${money(DELIVERY.riderWage)} a day each`) + line('A drop takes', `${DELIVERY.minutes} minutes`)
      + line('Risk per drop', `≈ ${pct(DELIVERY.stop + s.heat * DELIVERY.stopPerHeat)} stop and search, plus the odd sting`) + line('Unlocks at', `level ${DELIVERY.level}`)
      + '<p class="mute">A rider who\'s stopped or stung is arrested and the bags are lost; arrested riders are replaced by morning. When every rider is busy, buyers come to the door as before.</p>');
  }
  if (kind === 'wash') {
    const w = WASH[id], open = G.washOpen(s, id);
    return T(`${w.emoji} ${w.name}`, `<p>${w.desc}</p>` + (open ? line('Left today', money(G.washLeft(s, id))) : line('Opens at', `level ${w.level}`))
      + line('Cut', id === 'crypto' ? `${pct(w.feeMin)}–${pct(w.feeMax)} (now ${pct(s.wash.cryptoFee)})` : pct(G.washFee(s, id)))
      + line('Tax', w.taxed ? 'counts as declared income' : 'not taxed') + line('HMRC notice it', w.suspect >= 1 ? 'fully' : w.suspect > 0 ? 'a little' : 'not at all')
      + (id === 'smurf' ? line('Risk', 'a bank may flag a deposit: some of the day\'s money frozen and heat +6') : '')
      + (id === 'casino' ? line('Risk', 'big spenders get reported (heat +5)') : '')
      + (id === 'crypto' ? line('Risk', `${pct(w.freeze)} chance an exchange freezes the account and keeps half`) : '')
      + (id === 'offshore' ? line('Safe from', 'raids, busts and rival crews') : ''));
  }
  if (kind === 'front') {
    const f = FRONTS[id];
    return T(`${f.emoji} ${f.name}`, '<p>A cash business. Every morning it puts up to its limit of your dirty cash through its own books, so it doesn\'t use up your shops\' takings.</p>'
      + line('Washes', `${money(f.cap)} a night`) + line('Cut', pct(f.fee)) + line('Price', money(f.price)) + line('Unlocks at', `level ${f.level}`)
      + '<p class="mute">It\'s taxed like any business, and HMRC notice it half as much as money through your tills. An investigation (or a bust) can close it for a few days.</p>');
  }
  if (kind === 'tax') {
    const e = G.taxEstimate(s), w = s.taxWeek;
    return T('🧾 Tax this week', `<p>Settled every week at 6am. Declaring less pays less, until HMRC looks.</p>`
      + line('Takings so far', money(w.sales + s.today.sales)) + line('Laundered (counts as takings)', money(w.laundered + s.today.laundered))
      + line('You declare', `${DECLARE[s.declare || 'full'].label}${e.hidden ? ` (hiding ${money(e.hidden)})` : ''}`, e.hidden ? 'bad' : '')
      + line('VAT', s.vatRegistered ? `${money(e.vat)} (20% on hot food and drinks)` : `not registered until ${money(TAX.vatThreshold)} declared (${money(s.stats.declared || 0)} so far)`)
      + line('Corporation tax', `${money(e.corp)} on ${money(e.profit)} profit`) + line('Employer NI', `${money(e.ni)} on day-crew wages`)
      + (e.saved ? line('Viv saves you', money(e.saved), 'good') : '') + line('Estimated bill', money(e.total), 'bad')
      + line('Investigation chance', pct(G.investigateChance(s)), G.investigateChance(s) > 0.2 ? 'bad' : '')
      + line('Business rates', `${money(G.businessRates(s))} a day on your branches (the stall gets small business rates relief)`)
      + `<p class="mute">Corporation tax is ${pct(TAX.smallRate)} on profits up to ${money(TAX.smallLimit)} a week and ${pct(TAX.mainRate)} above ${money(TAX.mainLimit)}, with marginal relief between. Cold takeaway food and bread are zero-rated for VAT. Unpaid tax gets a ${pct(TAX.latePenalty)} penalty and interest, and HMRC collect what they can each morning. If an investigation finds undeclared income you pay it back twice over and it makes the papers. Laundering a lot compared with your real takings draws questions too.</p>`);
  }
  if (kind === 'prestige') {
    const pr = s.prestige;
    return T('⭐ Prestige', `<p>Hand the business on and start again from nothing: no shops, no machines, no cash, a fresh debt. In return you get prestige tokens for what the business was worth, to spend on perks that make every new start quicker.</p>`
      + line('Net worth now', money(G.netWorth(s))) + line('Tokens if you prestige now', G.prestigeTokens(s), 'good')
      + line('Tokens to spend', pr.tokens) + line('Tokens ever earned', `${pr.total} (+${pct(PRESTIGE.tokenBonus * pr.total)} on every sale and bag)`) + line('Times', pr.resets)
      + `<p class="mute">Tokens grow with the square root of net worth (shops, machines, property, fronts, vans and cash, less debt): £1M is worth 10, £100M is worth 100. Prestige opens at level ${PRESTIGE.level}. Perks and token bonuses are kept for ever; everything else starts again, including milestones.</p>`);
  }
  if (kind === 'backstats') {
    const st = D.backStats(s);
    return T('💜 The back rooms\' decor', '<p>What you put in your back rooms (all of them, added together) does more than look good.</p>'
      + line('😌 Comfort', `${st.comfort}: night crew gain +${D.backLoyalty(s).toFixed(1)} loyalty a day`) + line('🫥 Cover', `${st.cover}: raids find product ${pct(D.backHide(s))} less often`)
      + line('🛡️ Security', `${st.security}: heat cools ${pct(D.backCool(s) - 1)} faster`) + '<p class="mute">Bought with dirty cash. Each back room has its own floor, walls and decor.</p>');
  }
  if (kind === 'bdecor') {
    const d = D.BACK_DECOR[id];
    return T(`${d.emoji} ${d.name}`, line('Price', `💜 ${money(d.price)}`) + (d.comfort ? line('Comfort', `+${d.comfort} (crew loyalty)`) : '') + (d.cover ? line('Cover', `+${d.cover} (hides product from raids)`) : '')
      + (d.security ? line('Security', `+${d.security} (heat cools faster)`) : '') + line('Sells back for', `💜 ${money(Math.round(d.price * D.SELL_BACK))}`) + line('Unlocks at', `level ${d.level}`));
  }
  if (kind === 'case') {
    return T(`🕵️ ${CASE.detective}'s case`, `<p>A detective is building a case against you. When it reaches 100% it goes to court: big fines, everything seized, the back rooms sealed for ${CASE.courtSealDays} days and most of the night crew sent down.</p>`
      + line('Evidence', `${Math.round(s.case.evidence)}%`) + line('Builds from', 'stings, seized vans and deliveries, corner sweeps, raids, informants, HMRC finds')
      + line('Falls', `${CASE.decay}% a day lying low (${CASE.decayBusy}% while cooking)`)
      + line('Bribe', `💜 ${money(G.caseBribeCost(s))}: −${CASE.bribeCut}%, ${pct(CASE.bribeFail)} chance it backfires (+${CASE.bribeBack}%)`)
      + line('Frame a rival crew', `💜 ${money(G.caseFrameCost(s))}: −${CASE.frameCut}%, ${pct(CASE.frameFail)} chance it falls apart (+${CASE.frameBack}%)`)
      + '<p class="mute">Ms Okafor the lawyer halves what a trial costs you. Loyal crew don\'t talk.</p>');
  }
  if (kind === 'review') {
    const r = s.review;
    return T(`📝 ${'⭐'.repeat(r.stars)}`, `<p>${r.by} came by.</p>` + line('Customers', `×${CRITIC.boost[r.stars - 1]} for ${mins((r.until - s.clock) / MIN)} more`)
      + '<p class="mute">Critics turn up without warning. A full case, plenty of charm and good popularity win stars.</p>');
  }
  if (kind === 'street') {
    return T(`🗣️ Street rep ${Math.round(s.street)}`, line('Buyers after dark', `≈ ${Math.round(G.buyersPerHour(s))} an hour`) + line('Corners sell', `×${(0.5 + s.street / 100).toFixed(2)}`)
      + `<p><b>Goes up</b><br><small>Selling pure product (above 65%).</small></p><p><b>Goes down</b><br><small>Selling cut or weak product, and getting busted (-${CFG.streetBust}). It drifts back to ${CFG.streetHome}.</small></p>`);
  }
  if (kind === 'corner') {
    const c = CORNERS[id], k = s.corners[id];
    return T(`${c.emoji} ${c.name}`, line('Price', `💜 ${money(c.price)}`) + line('Sells', `${c.rate} bags an hour (×${CFG.cornerNightRate} at night, ×${CFG.cornerDayRate} by day), more with a good street rep`)
      + line('Price per bag', `×${c.mult} the door price, less ${pct(CFG.cornerCut)} for the people working it`) + line('Holds', `${c.cap} bags`) + line('Police sweeps', `about ${pct(c.risk)} a day while it's selling, more when heat is high`)
      + line('Unlocks at', `level ${c.level}`) + (k ? line('Stock', `${k.stock}${k.product ? ' ' + PRODUCTS[k.product].name : ''}`) : '')
      + '<p class="mute">A sweep seizes what\'s on the corner. Rival crews can run your people off it unless Big Ron is about. DS Hale halves the sweeps.</p>');
  }
  if (kind === 'shop') {
    const d = SHOPS[id], owned = s.shops.some(x => x.id === id);
    return T(`${d.emoji} ${d.name}`, line('Machines', d.machines.map(t => `${MACHINES[t].emoji} ${MACHINES[t].name}`).join(', ')) + line('Prices', `×${d.priceMult} the stall's`)
      + line('Customers', `×${d.cust} the stall's (before marketing and charm)`) + line('Rent', `${money(d.rent)} a day`) + line('Launders', d.launder ? `${money(d.launder)} a day on top of its takings` : 'its takings only')
      + (owned ? '' : line('Opening costs', `${money(G.shopPrice(s))} (each branch costs ${SHOP_GROW}× the last)`)) + line('Unlocks at', `level ${d.level}`)
      + line('Back room', d.lab.map(k => `${LAB_MACHINES[k].emoji} ${LAB_MACHINES[k].name}`).join(', '))
      + '<p class="mute">Each shop has its own machines, case, menu and design, and its own back room and back door, and they all trade at once. Your crew work every shop; bags and kits are shared.</p>');
  }
  if (kind === 'level') {
    const next = unlocksAt(s.level + 1);
    return T(`🎖️ Level ${s.level}${s.level >= CFG.maxLevel ? ' (the top)' : ''}`, (s.level < CFG.maxLevel ? line('XP', `${Math.round(s.xp)} / ${G.xpToNext(s.level)}`) + line('Next level pays', money(CFG.levelCash * (s.level + 1))) : '')
      + `<p><b>Earning XP</b><br><small>Every batch out of a machine (longer and higher-level recipes give more) · every item sold (pricier items give more) · every back-room cook and every bag sold · courier orders · seeing off rivals.</small></p>`
      + (s.level < CFG.maxLevel ? `<p><b>Level ${s.level + 1} unlocks</b><br><small>${next.join('<br>') || 'More of the same: keep going.'}</small></p>` : ''));
  }
  if (kind === 'crew') {
    const c = CREW[id];
    return T(`${c.emoji} ${c.name}, ${c.role.toLowerCase()}`, `<p>${c.desc}</p>` + line('Wage', id === 'dealer' ? `keeps ${CFG.dealerCut * 100}% of what he sells` : `${c.cash === 'dirty' ? '💜' : '💷'} ${money(c.wage)} a day`)
      + line('Available from', `level ${c.level}`) + line('Hired', s.crew[id] ? 'yes' : 'no')
      + (id === 'dealer' ? line('Chance he\'s picked up', `≈ ${Math.round((CFG.dealerArrestPerNight + s.heat * CFG.dealerArrestPerHeat) * (G.has(s, 'van') ? CFG.vanArrestMult : 1) * 100)}% a night he works`) : ''));
  }
  if (kind === 'feature') {
    const f = FEATURES.find(x => x.id === id);
    return T(f.name, `<p>${f.desc}</p>` + line('Level', f.level) + line('Active', G.unlocked(s, f.level) ? 'yes' : 'not yet'));
  }
  if (kind === 'heat') {
    return T('🚨 Heat', line('Back room', `${Math.round(s.heat)} / 100`) + line('Vans', `${Math.round(s.areaHeat.vans || 0)} (stop and search)`) + line('The streets', `${Math.round(s.areaHeat.streets || 0)} (corners and riders)`) + line('Undercover buyers', `≈ ${Math.round(G.copChance(s) * 100)}%`)
      + line('Raids from', `${CFG.raidAt} heat`) + line('Cash pile', G.cashPileHeat(s) ? `+${Math.round(G.cashPileHeat(s))} heat when police weigh up a raid (wash or stash it)` : 'nothing worth noticing', G.cashPileHeat(s) ? 'bad' : 'good') + line('Tax inspections from', `${CFG.inspectAt} heat`)
      + line('Cools', `${CFG.heatDecayPerHour * (s.crew.fixer ? 2 : 1)} an hour, more after ${CFG.lieLowAfterHours}h without trade`)
      + `<p><b>What raises it</b><br><small>Each cook, each bag sold, laundering too much, serving undercover officers (+${CFG.copServedHeat}), Jay getting caught.</small></p>`
      + `<p class="mute">Police check at 6am, going by how hot it got the day before. At 100, or if a raid finds product, you're <b>busted</b>: fined, everything seized, the back room sealed for ${CFG.bustSealHours / 24} days, crew lost, and a scandal in the papers.</p>`);
  }
  if (kind === 'bribe') return T('👮 A friendly sergeant', line('Cost', `💜 ${money(CFG.bribeCost)}`) + line('Heat', `-${CFG.bribeHeat}`) + line('How often', 'once a day')
    + line('Chance it backfires', `${CFG.bribeBackfire * 100}% (heat +${CFG.bribeBackfireHeat})`));
  if (kind === 'launder') {
    return T('🧾 Laundering', `<p>Pass dirty cash off as takings. Up to ${pct(G.launderRatio(s))} of today's real takings across your shops looks normal, plus what each branch can front. More than that adds heat, and every wash costs a cut.</p>`
      + line("Today's takings", money(s.today.sales)) + line('Branches front', money(s.shops.reduce((a, x) => a + SHOPS[x.id].launder, 0))) + line('Laundered today', money(s.today.laundered))
      + line('Still safe today', money(G.launderLeft(s)), 'good') + line('The wash takes', pct(G.launderFee(s)), 'bad')
      + '<p class="mute">Dirty cash is easier to make, but it buys less: only the back room, the night crew, bribes and Dez (who charges half as much again for clean money). Raids, rivals and busts take a share of whatever dirty cash you hold. The day resets at 6am. Viv the accountant launders the safe amount every morning and takes a smaller cut; creative accounting and a shell company help too.</p>');
  }
  if (kind === 'bank' && id === 'loan') {
    const amt = G.loanAmount(s) || capAt(CAPS.loan, 4), lnx = nextCap(CAPS.loan, s.level);
    return T('💳 Bank loan', line('You get', money(amt)) + line('Added to the debt', money(amt * (1 + CFG.loanFee))) + line('How often', 'once a week')
      + (lnx ? line('Bigger loans', `${money(lnx.amount)} from level ${lnx.level}`) : '') + line('Unlocks at', 'level 4'));
  }
  if (kind === 'bank' && id === 'holiday') return T('🏖️ Payment holiday', '<p>The bank skips your next payment with no penalty. Once only.</p>' + line('Unlocks at', 'level 10') + line('Used', s.holidayUsed ? 'yes' : 'no'));
  if (kind === 'bank' && id === 'debt') {
    return T('🏦 The bank', line('Still owed', money(s.balance)) + line('Next payment', `${money(G.nextDue(s))}, ${dateStr(G.nextPaymentAt(s))} at 6am`)
      + line('Paid so far', money(s.stats.paid)) + line('Behind by', s.arrears > 0 ? money(s.arrears) : 'nothing', s.arrears > 0 ? 'bad' : 'good') + line('Payments missed (ever)', s.strikes)
      + `<p class="mute">${money(CFG.weekly)} comes out of clean cash every 7 days. Miss one and it rolls into the next, plus ${CFG.missPenalty * 100}%, then ${CFG.arrearsInterestDaily * 100}% interest a day (worked out by the minute, even while you're away). While you're behind, Grimshaw Recovery's heavies may visit: smashed decorations, cracked tiles, torn wallpaper, wrecked machines, an emptied till. Big Ron helps.</p>`);
  }
  if (kind === 'bank' && id === 'restructure') return T('📑 Restructure the debt', `<p>When you're two or more payments behind, the bank will fold what you've missed into the loan for a ${CFG.restructureFee * 100}% fee. The interest stops and Grimshaw Recovery is called off. Once a month.</p>`);
  if (kind === 'bank' && id === 'pay') return T('Paying early', '<p>Extra payments come off what you owe straight away, clearing any missed payment first. Pay it all to finish the debt.</p>');
  if (kind === 'floor') {
    const f = D.FLOORS[id], { n, cost } = D.fillFloorCost(s, id);
    return T(`🟫 ${f.name}`, line('Price', `${money(f.price)} a square`) + line('Whole floor', n ? `${money(cost)} for ${n} squares` : 'already laid')
      + line('Unlocks at', `level ${f.level || 1}`) + '<p class="mute">Tap squares one at a time, or do them all. Fancier floors add charm.</p>');
  }
  if (kind === 'wall') {
    const w = D.WALLS[id], { n, cost } = D.fillWallCost(s, id);
    return T(`🧱 ${w.name}`, line('Price', `${money(w.price)} a panel`) + line('Every panel', n ? `${money(cost)} for ${n} panels` : 'already up') + line('Unlocks at', `level ${w.level || 1}`));
  }
  if (kind === 'decor') {
    const d = D.DECOR[id], owned = s.design.decor.filter(x => x.type === id).length;
    return T(`${d.emoji} ${d.name}`, line('Price', money(d.price)) + line('Charm', `+${d.charm}`) + line('Goes', d.outdoor ? 'outside, on a terrace' : d.indoor ? 'inside only' : 'inside or out')
      + line('Sells back for', money(Math.round(d.price * D.SELL_BACK))) + line('You have', owned)
      + `<p class="mute">Each point of charm brings about ${D.CHARM_PER_CUSTOMER * 100}% more customers, up to +${D.CHARM_CAP * 100}%.</p>`);
  }
  if (kind === 'art') {
    const a = D.ART[id];
    return T(`${a.emoji} ${a.name}`, line('Price', money(a.price)) + line('Charm', `+${a.charm}`) + line('Sells back for', money(Math.round(a.price * D.SELL_BACK)))
      + '<p class="mute">One piece per wall panel. Not over the window, menu board or door.</p>');
  }
  if (kind === 'chapter') { const c = STORY.find(x => x.id === id); return T(`📜 ${c.title}`, `<p class="story">${c.text}</p>`); }
  if (kind === 'clean') {
    const h = s.honest || { days: 0, awards: {} };
    return T('🕊️ A clean record', `<p>Every day with nothing cooked, sold or washed after dark adds a day. Any night trade starts it again from zero.</p>`
      + line('Days', h.days) + line('Customers', `+${CLEAN_RECORD.step * 100}% every ${CLEAN_RECORD.perDays} days, up to +${CLEAN_RECORD.cap * 100}%`)
      + line('Critics', 'look on you kindly after 14 days')
      + CLEAN_RECORD.awards.map(([d, name, cash]) => line(`${h.awards[d] ? '🏅' : '⬜'} ${name}`, `${d} days · ${money(Math.round(cash * (1 + s.level / 20)))}`)).join(''));
  }
  if (kind === 'tray') {
    const k = Number(id), menu = G.menuOf(s), item = menu[k], nc = G.nextCounter(s);
    const more = nc ? line('Another counter', G.unlocked(s, nc.level) ? money(nc.price) : `level ${nc.level}`) + '<p class="mute">Tap a bare counter by the till to buy it.</p>' : '<p class="mute">All 7 counters are yours.</p>';
    if (!item) return T(`🧺 Counter ${k + 1}: empty`, `<p>Nothing on this counter. Put something on sale from a machine (tap it, then the ✓ on a recipe).</p>`
      + line('Counters', `${G.countersOf(s.design)} of 7 (one thing each)`) + more);
    const it = ITEMS[item], have = Math.floor(s.display[item] || 0), cap = G.trayCap(s, item);
    const pctFull = Math.round(100 * have / Math.max(1, cap));
    const nx = G.nextStarAt(s, item), stars = G.starsOf(s, item);
    return T(`${it.emoji} ${stars >= MASTERY.stars.length ? 'Signature ' : ''}${it.name}${starTag(item)}`, `<div class="bar"><i style="width:${pctFull}%"></i></div>`
      + line('Mastery', `${G.masteryOf(s, item)} batches${nx ? ` · next ★ at ${nx}` : ' · signature dish'}`)
      + line('Servings left', `${have} of ${cap}`, have ? '' : 'bad') + line('Price', money2(G.itemPrice(s, item)))
      + line('Made in', MACHINES[it.machine].name.toLowerCase()) + line('A batch makes', `${G.servingsFor(s, item, G.maxTier(s, it.machine))} servings`)
      + `<p class="mute">The counter holds ${cap} servings (${CFG.trayBatches} batches); a full counter means finished food waits in the machine.</p>`
      + line('Counters', `${G.countersOf(s.design)} of 7`)
      + `<div class="pbtns col" style="margin-top:8px">
        <button class="small primary" data-act="restock" data-id="${item}">🔁 Restock (${MACHINES[it.machine].name.toLowerCase()})</button>
        <button class="small ${s.design.special === item ? 'on' : ''}" data-act="special" data-id="${item}">${s.design.special === item ? '⭐ Today\'s special (tap to stop)' : `⭐ Make it today's special (+${Math.round(SPECIAL.price * 100)}% price, more asks)`}</button>
        <div class="row2"><button class="small" data-act="throw" data-id="${item}" ${have ? '' : 'disabled'}>🗑️ Throw away ${have}</button><button class="small danger" data-act="throwfree" data-id="${item}">🗑️ Throw away and free the counter</button></div>
        ${G.cabinetOn(s, k) ? '<small class="good">🧊 Bigger cabinet fitted</small>' : G.unlocked(s, CABINET.level) ? `<button class="small" data-act="cabinet" data-id="${k}" ${s.clean < CABINET.price ? 'disabled' : ''}>🧊 Bigger cabinet: +${CABINET.batches} batches · ${money(CABINET.price)}</button>` : `<small class="mute">Bigger cabinets at level ${CABINET.level}</small>`}
      </div>` + more);
  }
  if (kind === 'exp') {
    const e = D.EXPANSIONS[id];
    const what = e.cells ? `${e.cells} squares to decorate` : e.spots ? `room for ${e.spots} more machines` : `room for ${e.labSpots} more back-room machines`;
    return T(`➕ ${e.name}`, `<p>${e.desc}</p>` + line('Price', money(e.price)) + line('Gives', what) + line('Unlocks at', `level ${e.level}`)
      + (e.needs ? line('Needs', D.EXPANSIONS[e.needs].name) : '') + line('Yours', s.design.expansions[id] ? 'yes' : 'no'));
  }
  return T('Info', '<p>Nothing more to say about this one.</p>');
}

// ---------- The dock ----------
// Sections, grouped for the menu
const TABS = {
  kitchen: { label: 'Kitchen', emoji: '🍳', fn: () => kitchenTab() }, supplies: { label: 'Supplies', emoji: '🧺', fn: () => suppliesTab() },
  shop: { label: 'Upgrades', emoji: '🛠️', fn: () => shopTab() }, crew: { label: 'Crew', emoji: '👥', fn: () => crewTab() },
  orders: { label: 'Orders', emoji: '📦', fn: () => ordersTab() }, marketing: { label: 'Marketing', emoji: '📣', fn: () => marketingTab() },
  shops: { label: 'Shops & property', emoji: '🏪', fn: () => shopsTab() }, bank: { label: 'Bank & tax', emoji: '🏦', fn: () => bankTab() },
  back: { label: 'Lab', emoji: '🧪', fn: () => backTab(), night: true }, stash: { label: 'Supplies', emoji: '📦', fn: () => stashTab(), night: true },
  nightshop: { label: 'Upgrades', emoji: '🛠️', fn: () => shopTab(true), night: true }, nightcrew: { label: 'Crew', emoji: '🧢', fn: () => crewTab(true), night: true },
  deals: { label: 'Deals', emoji: '🚪', fn: () => dealsTab(), night: true }, police: { label: 'Heat & police', emoji: '🚨', fn: () => policeTab(), night: true },
  turf: { label: 'Turf', emoji: '🗺️', fn: () => turfTab(), night: true },
  wash: { label: 'Wash', emoji: '🧼', fn: () => washTab(), night: true },
  logistics: { label: 'Logistics', emoji: '🚚', fn: () => logisticsTab(), night: true },
  settings: { label: 'Settings', emoji: '⚙️', fn: () => settingsTab() },
  collection: { label: 'Collection', emoji: '📖', fn: () => collectionTab() },
};
const NATIVE = !!window.Capacitor?.isNativePlatform?.();
const CAT = { baked: ['🍞', 'Recipes baked', () => Object.keys(ITEMS).length], master: ['⭐', 'Signature dishes (5★)', () => Object.keys(ITEMS).length],
  perfect: ['✨', 'Perfect bakes', null], seasonal: ['🎄', 'Seasonal treats', () => Object.values(ITEMS).filter(r => r.season).length],
  products: ['💜', 'Products made', () => Object.keys(PRODUCTS).length], story: ['📜', 'Chapters', () => STORY.length], awards: ['🏅', 'Bakery awards', () => CLEAN_RECORD.awards.length] };
function collectionTab() {
  let cards = '';
  for (const [cat, [emoji, name, total]] of Object.entries(CAT)) {
    if (cat === 'products' && !s.labUnlocked) continue;
    const have = G.collectionCount(s, cat), sets = COLLECTION.filter(c => c.cat === cat);
    const btns = sets.map(c => { const done = s.collect?.claimed?.[c.id], ready = have >= c.n;
      return `<button class="small ${ready && !done ? 'primary' : ''}" data-act="claim" data-id="${c.id}" ${ready && !done ? '' : 'disabled'}>${done ? '✓' : `${c.n}`} · ${c.name}${done ? '' : ` · ${money(Math.round(c.reward * (1 + s.level / 25)))}`}</button>`; }).join('');
    cards += pcard(`<div class="ptop"><span class="em">${emoji}</span><div><b>${name}</b><small>${have}${total ? ` of ${total()}` : ''}</small></div></div><div class="pbtns col">${btns}</div>`, '', 'wide');
  }
  const read = STORY.filter(c => s.story?.seen?.includes(c.id));
  cards += pcard(`<div class="ptop"><span class="em">📜</span><div><b>The story so far</b><small>${read.length ? 'Tap a chapter to read it again' : 'Nothing yet'}</small></div></div>
    <div class="pbtns col">${read.map(c => `<button class="small" data-act="info" data-kind="chapter" data-id="${c.id}">${c.title}</button>`).join('')}</div>`, '', 'wide');
  return { cards, hint: 'Complete a set to claim its reward. Prizes grow with your level.' };
}
function settingsTab() {
  const tog = (key, label, sub) => pcard(`<div class="ptop"><span class="em">${key === 'sound' ? (settings.sound ? '🔊' : '🔇') : (settings.notify ? '🔔' : '🔕')}</span><div><b>${label}</b><small>${sub}</small></div></div>
    <div class="pbtns"><button class="small ${settings[key] ? 'primary' : ''}" data-act="setting" data-id="${key}">${settings[key] ? 'On' : 'Off'}</button></div>`);
  let cards = tog('sound', 'Sound', 'The till, the oven timer, the shop bell, the back door, and a hum in the back room at night.')
    + tog('notify', 'Notifications', NATIVE ? 'When the app is closed: food ready, food about to spoil, the back door opening, a bank payment due.' : 'Only in the phone app.');
  cards += pcard(`<div class="ptop"><span class="em">💾</span><div><b>Save backup</b><small>Copy your whole game as a code (or a file) and load it back later, on this phone or another.</small></div></div>
    <div class="pbtns"><button class="small primary" data-act="backup-out">Back up</button><button class="small" data-act="backup-in">Load a backup</button></div>`, '', 'wide');
  cards += pcard(`<div class="ptop"><span class="em">🧭</span><div><b>First-day guide</b><small>${s.guide?.step < GUIDE.length ? `On step ${s.guide.step + 1} of ${GUIDE.length}` : 'Done'}</small></div></div>
    <div class="pbtns"><button class="small" data-act="guide-restart">Show it again</button></div>`);
  cards += pcard(`<div class="ptop"><span class="em">🆕</span><div><b>New game</b><small>Start over from the stall. This bakery is lost (back it up first).</small></div></div>
    <div class="pbtns"><button class="small danger" data-act="restart">Start over</button></div>`);
  return { cards, hint: 'Settings stay the same through new games and prestige.' };
}

// ---- First-day guide: a short card above the corner buttons, one step at a time; each moves on by itself once done
const GUIDE = [
  { text: '👋 Welcome to Rosa\'s! Tap an <b>oven</b> and pick something to bake.', done: s => s.machines.some(m => m.job) },
  { text: '⏲️ Baking runs on the real clock. When the timer\'s done, tap the machine: the food goes on a <b>counter</b> by the till.', done: s => (s.stats.batches || 0) > 0 },
  { text: '🧺 Customers buy from the counters. Tap a <b>counter</b> to see how many servings are left.', done: s => s.guide.seen?.tray },
  { text: '🛒 Ingredients run out. Open <b>☰ Menu → Supplies</b> to stock up.', done: s => s.guide.seen?.supplies },
  { text: '➕ One counter = one thing on sale. Tap a <b>bare counter</b> (green card) to buy another once you reach level 2.', done: s => G.countersOf(s.design) >= 3 },
  { text: '🎨 Make it yours: <b>Design</b> has floors, decor and expansions that bring more customers.', done: s => s.guide.seen?.design },
  { text: '🏦 The stall came with a debt. <b>☰ Menu → Bank & tax</b> shows what\'s due and when.', done: s => s.guide.seen?.bank },
  { text: '🌙 That\'s the basics. At level 3 a door at the back opens up... the rest you can find out yourself.', done: () => false, last: true },
];
const guideSeen = key => { s.guide ||= { step: 99 }; (s.guide.seen ||= {})[key] = true; };
function guideHTML() {
  const g = s.guide;
  if (!g || g.step >= GUIDE.length || !s.introSeen || ui.design || ui.modal || ui.tab || ui.panel || ui.outside) return '';
  // A step moves on by itself when you do it after it's shown (not because it was already true); Next always goes
  // to the very next step
  if (g.shown !== g.step) { g.shown = g.step; g.was = !!GUIDE[g.step]?.done(s); }
  if (g.step < GUIDE.length && !g.was && GUIDE[g.step].done(s)) { g.step++; g.shown = g.step; g.was = !!GUIDE[g.step]?.done(s); }
  if (g.step >= GUIDE.length) return '';
  const st = GUIDE[g.step];
  return `<div class="guide"><span>${st.text}</span><div class="gbtns"><small class="mute">${g.step + 1}/${GUIDE.length}</small>
    ${st.last ? '<button class="small primary" data-act="guide-next">Got it</button>' : '<button class="small" data-act="guide-skip">Skip guide</button><button class="small" data-act="guide-next">Next</button>'}</div></div>`;
}
function menuGroups() {
  if (ui.room === 'back' && s.labUnlocked) return [['The back room', ['back', 'stash', 'nightshop', 'nightcrew', 'deals']],
    ['The operation', ['police', ...(s.level >= 6 ? ['turf'] : []), 'wash', ...(s.shops.length > 1 || G.deliveryOpen(s) ? ['logistics'] : []), 'settings']]];
  return [['The bakery', ['kitchen', 'supplies', 'shop', 'crew', 'orders']], ['Business', ['marketing', 'shops', 'bank', 'collection', 'settings']]];
}
const tabBadge = id => (id === 'orders' && s.orders.filter(o => o.kind !== 'dez').length ? s.orders.filter(o => o.kind !== 'dez').length : id === 'deals' && (doorTotal() + s.orders.filter(o => o.kind === 'dez').length) ? doorTotal() + s.orders.filter(o => o.kind === 'dez').length : id === 'police' && s.case.evidence >= 60 ? '!' : id === 'bank' && s.hmrc > 1 ? '!' : '');
function openTab(id) {
  ui.tab = id; ui.panel = null;
  if (id === 'supplies' || id === 'bank') guideSeen(id);
  if (TABS[id].night) ui.room = 'back'; else if (ui.room === 'back') ui.room = 'shop';
}

// The three corner buttons, the menu and map panels, and the section dock
function fabsHTML() {
  const alert = s.orders.length || doorTotal() || s.hmrc > 1;
  if (ui.outside) return `<div class="fabs">
    <button class="fab" data-act="tab" data-id="outside"><span>🏠</span><small>Outside</small></button>
  </div>`;
  return `<div class="fabs">
    <button class="fab ${ui.panel === 'map' ? 'on' : ''}" data-act="panel" data-id="map"><span>🗺️</span><small>Map</small></button>
    <button class="fab" data-act="tab" data-id="design"><span>🎨</span><small>Design</small></button>
    <button class="fab ${ui.panel === 'menu' || ui.tab ? 'on' : ''}" data-act="panel" data-id="menu"><span>☰</span><small>Menu</small>${alert ? '<i class="fabdot"></i>' : ''}</button>
  </div>`;
}
function menuPanel() {
  const door = s.labUnlocked ? `<button class="ptile doorTile ${ui.room === 'back' ? '' : 'night'}" data-act="room"><span>${ui.room === 'back' ? '☀️' : '🪜'}</span><small>${ui.room === 'back' ? 'Upstairs' : 'Basement'}</small>${ui.room !== 'back' && doorTotal() ? `<i>${doorTotal()}</i>` : ''}</button>` : '';
  return `<div class="panel menupanel">${door ? `<div class="pgroup"><div class="pgrid">${door}</div></div>` : ''}${menuGroups().map(([title, ids]) => `<div class="pgroup ${title === 'After dark' ? 'night' : ''}"><h4>${title}</h4>
    <div class="pgrid">${ids.map(id => `<button class="ptile ${ui.tab === id ? 'on' : ''}" data-act="tab" data-id="${id}"><span>${TABS[id].emoji}</span><small>${TABS[id].label}</small>${tabBadge(id) ? `<i>${tabBadge(id)}</i>` : ''}</button>`).join('')}</div></div>`).join('')}</div>`;
}
function mapPanel() {
  const cur = s.cur || 0, back = ui.room === 'back';
  const places = [];
  s.shops.forEach((x, i) => {
    const d = SHOPS[x.id], ready = x.machines.filter(m => m.job && s.clock >= m.job.start + m.job.dur).length;
    const labReady = x.lab.filter(m => m.job && s.clock >= m.job.start + m.job.dur).length;
    places.push(`<button class="place ${cur === i && !back ? 'on' : ''}" data-act="map-go" data-id="${i}"><span>${d.emoji}</span><b>${d.short}</b><small>${x.machines.length} machines${ready ? ` · ${ready} ready` : ''}</small></button>`);
    if (s.labUnlocked) places.push(`<button class="place night ${cur === i && back ? 'on' : ''}" data-act="go-back" data-id="${i}"><span>💜</span><b>Back room</b><small>${x.lab.length} machines${labReady ? ` · ${labReady} ready` : ''}${i ? (G.packed(s, i) ? ` · ${G.packed(s, i)} packed` : '') : x.door.length ? ` · ${x.door.length} at the door` : ''}</small></button>`);
  });
  const next = G.nextShops(s)[0];
  if (next) {
    const d = SHOPS[next], open = G.unlocked(s, d.level);
    places.push(`<button class="place new ${open ? '' : 'locked'}" data-act="tab" data-id="shops"><span>${d.emoji}</span><b>${d.short}</b><small>${open ? `open for ${money(G.shopPrice(s))}` : `🔒 level ${d.level}`}</small></button>`);
  }
  return `<div class="panel mappanel"><h4>Where to?</h4><div class="places">${places.join('')}</div></div>`;
}
function dockHTML() {
  if (ui.tab && (!TABS[ui.tab] || (TABS[ui.tab].night && !s.labUnlocked))) ui.tab = null;
  const intro = !s.introSeen ? `<div class="floatcard">
      <h2>Aunt Rosa's stall</h2>
      <p>Aunt Rosa ran this bakery stall for thirty years. She left it to you, along with <b>${money(CFG.debtTotal)}</b> she owed the bank, at <b>${money(CFG.weekly)}</b> a week from two weeks today.</p>
      <p>The game runs on the real clock and never closes. Tap a machine to start a batch, come back when it's done to put it on a counter by the till, and customers buy from the counters all day, even while you're away. Long recipes are for when you go out; don't leave food sitting in a machine or it spoils.</p>
      <p class="mute">☰ Menu has everything else; 🗺️ Map takes you between your shops.</p>
      <button class="small" data-act="intro-ok">Got it</button></div>`
    : s.event && ui.tab === 'supplies' ? `<div class="floatbanner">${s.event.text}</div>` : '';
  let dock = '';
  if (ui.tab) {
    const T = TABS[ui.tab], { cards, hint } = T.fn();
    dock = `<div class="designbar plandock ${T.night ? 'night' : ''}">
      <div class="drow dhead"><button class="small" data-act="panel" data-id="menu" aria-label="Back to the menu">‹</button>
        <b>${T.emoji} ${T.label}</b><button class="small" data-act="dock-close" aria-label="Close">✕</button></div>
      <div class="dinfo"><span>${hint}</span></div>
      <div class="catalog cards" data-key="dock-${ui.tab}">${cards}</div>
    </div>`;
  }
  const panel = ui.panel === 'menu' ? menuPanel() : ui.panel === 'map' ? mapPanel() : '';
  return intro + dock + panel + fabsHTML();
}

// ---------- Modals ----------
function machineModal(m) {
  const lab = m.kind === 'night', list = lab ? s.lab : s.machines, mc = list[m.idx];
  if (!mc) { ui.modal = null; return ''; }
  const M = (lab ? LAB_MACHINES : MACHINES)[mc.type];
  const nth = list.filter((x, i) => x.type === mc.type && i <= m.idx).length, many = list.filter(x => x.type === mc.type).length > 1;
  const v = G.jobView(s, mc, s.clock, lab), busy = !!v.item;
  let status;
  if (mc.broken) status = `<div class="card alert">🔧 Wrecked by the debt collectors. It can't cook until it's fixed.
      <button class="small danger" data-act="repair" data-kind="${m.kind}" data-idx="${m.idx}" ${s.clean < G.repairCost(mc.type, lab) ? 'disabled' : ''}>Repair ${money(G.repairCost(mc.type, lab))}</button></div>`;
  else if (busy && !v.done) status = `<div class="card">${M.verb}: ${G.recipeOf(v.item).emoji} <b>${G.recipeOf(v.item).name}</b>, ${secs(v.left)} left (done at ${hhmm(mc.job.start + mc.job.dur)})
      <span class="prog"><i style="width:${(v.t / v.dur * 100).toFixed(1)}%"></i></span></div>`;
  else if (busy) status = `<div class="card win">${G.recipeOf(v.item).emoji} <b>${G.recipeOf(v.item).name}</b> is ready.${lab ? '' : ` It ${M.spoil === 'burnt' ? 'burns' : 'spoils'} in ${secs(v.spoilIn)}.`}
      <button class="small primary" data-act="collect" data-kind="${m.kind}" data-idx="${m.idx}">Collect</button></div>`;
  else if (lab && G.sealed(s, s.clock)) status = `<div class="card alert">🚧 Police tape. Sealed for ${mins((s.sealedUntil - s.clock) / MIN)}.</div>`;
  else status = lab ? `<p class="mute">Pick something to make.</p>` : `<p class="mute">Pick something to make. On sale: ${G.menuOf(s).length} of ${G.menuSlots(s)}.</p>`;
  const tier = mc.tier || 0, tcost = G.tierCost(mc.type, tier, lab), tcash = G.machineCash(mc.type, lab);
  const tierRow = `<div class="mrow tierrow"><span class="em">⬆️</span><div class="grow"><b>Tier ${tier}/${TIERS.max}</b>
      <small>${lab ? `-${pct(TIERS.labSpeed * tier)} time, +${pct(TIERS.labPurity * tier)} purity` : `-${pct(TIERS.speed * tier)} time, +${pct(TIERS.servings * tier)} servings`}</small></div>
    <div class="mright">${tier >= TIERS.max ? '<span class="lock good">Maxed</span>' : `<button class="small ${tcash === 'dirty' ? 'violet' : 'primary'}" data-act="tier" data-kind="${m.kind}" data-idx="${m.idx}" ${s[tcash] < tcost ? 'disabled' : ''}>${tcash === 'dirty' ? '💜' : '💷'} ${money(tcost)}</button>`}</div></div>`;
  let rows;
  if (!lab) {
    const menu = G.menuOf(s);
    rows = G.recipesFor(mc.type).sort((a, b) => ITEMS[a].level - ITEMS[b].level).filter(id => ITEMS[id].level <= s.level + 10).map(id => {
      const r = ITEMS[id], known = s.recipes.includes(id), open = G.unlocked(s, r.level), on = menu.includes(id);
      const batches = known ? G.batchesPossible(s, id) : 0, miss = known && !batches ? G.missingCost(s, id) : 0;
      let right;
      if (!open) right = `<span class="lock">🔒 Lv ${r.level}</span>`;
      else if (!known) right = `<button class="small" data-act="learn" data-id="${id}" ${s.clean < r.cost ? 'disabled' : ''}>Learn ${money(r.cost)}</button>`;
      else right = `<button class="small primary" data-act="cook" data-id="${id}" ${busy || mc.broken || (miss && s.clean < miss) ? 'disabled' : ''}>${miss ? `Cook +${money2(miss)}` : 'Cook'}</button>
        <button class="small menutoggle ${on ? 'on' : ''}" data-act="menu-toggle" data-id="${id}">${on ? '✓ On sale' : '+ Sell'}</button>`;
      const priceRow = known ? `<div class="seg">${Object.entries(PRICE_LEVELS).map(([k, L]) =>
        `<button class="${s.priceLevel[id] === k ? 'on' : ''}" data-act="price" data-id="${id}" data-lvl="${k}">${L.label}</button>`).join('')}</div>` : '';
      return `<div class="mrow ${known ? '' : 'unknown'} ${open ? '' : 'locked'}">${ibtn('recipe', id)}
        <span class="em">${r.emoji}</span>
        <div class="grow"><b>${r.name}${starTag(id)}</b><small>×${G.servingsFor(s, id, mc.tier || 0)} · ${mins(G.cookMs(s, id, mc.tier || 0) / MIN)} · ${money2(G.itemPrice(s, id))} each</small>
          <small>${ingText(r)}${known ? ` · stock for ${batches} · case ${s.display[id] || 0}/${G.trayCap(s, id)}` : ''}</small>${priceRow}</div>
        <div class="mright">${right}</div></div>`;
    }).join('');
  } else {
    rows = G.productsFor(mc.type).filter(id => PRODUCTS[id].level <= s.level + 10).map(id => {
      const p = PRODUCTS[id], open = G.unlocked(s, p.level), kits = s.kits[id] || 0;
      const right = !open ? `<span class="lock">🔒 Lv ${p.level}</span>`
        : `<button class="small violet" data-act="labcook" data-id="${id}" ${busy || mc.broken || G.sealed(s, s.clock) || (!kits && (!G.kitsLeftToday(s) || (s.dirty < G.kitPrice(id, 'dirty', s) && s.clean < G.kitPrice(id, 'clean', s)))) ? 'disabled' : ''}>${kits ? 'Cook' : `Cook (kit ${s.dirty >= G.kitPrice(id, 'dirty', s) ? '💜 ' + money(G.kitPrice(id, 'dirty', s)) : '💷 ' + money(G.kitPrice(id, 'clean', s))})`}</button>`;
      const cut = CUTS[s.cut[id] || 'none'], pur = Math.min(0.99, G.labPurity(s, mc) * cut.purity);
      return `<div class="mrow ${open ? '' : 'locked'}">${ibtn('product', id)}<span class="em">${p.emoji}</span>
        <div class="grow"><b>${p.name}</b><small>${Math.round(p.bags * (1 + G.eff(s, 'bags')) * cut.bags)} bags · ≈${pct(pur)} pure · ${money(Math.round(p.price * purityMult(pur)))} a bag · ${mins(p.minutes * (1 - TIERS.labSpeed * (mc.tier || 0)))}</small>
          <small>${kits} kits · ${s.bags[id] || 0} bags${p.ing ? ` · uses ${Object.entries(p.ing).map(([k, q]) => q + INGREDIENTS[k].emoji).join(' ')}` : ''}</small>
          ${open ? `<div class="seg">${Object.entries(CUTS).map(([k, c]) => `<button class="${(s.cut[id] || 'none') === k ? 'on' : ''}" data-act="cut" data-id="${id}" data-cut="${k}">${c.label}</button>`).join('')}</div>` : ''}</div><div class="mright">${right}</div></div>`;
    }).join('');
  }
  return `<h2>${M.emoji} ${M.name}${many ? ` ${nth}` : ''}</h2>${status}<div class="mlist">${tierRow}${rows}</div>
    <button class="big" data-act="close" style="margin-top:10px">Close</button>`;
}

function buyerModal(m) {
  const b = s.door.find(x => x.id === m.id);
  if (!b) { ui.modal = null; return ''; }
  const p = PRODUCTS[b.product], have = s.bags[b.product] || 0, price = G.bagPrice(s, b);
  const qty = b.courier ? (have >= b.want ? b.want : 0) : Math.min(b.want, have);
  const canPush = !b.courier && G.feature(s, 'haggle') && qty;
  const left = Math.max(0, (b.arrive + b.patience - s.clock) / 1000);
  return `<h2>${b.courier ? '📦' : '👤'} ${b.name}</h2><div class="quote">"${b.line}"</div>
    ${b.hint ? `<p class="meh">${s.crew.lookout ? '👀 Ash doesn\'t like the look of this one.' : G.has(s, 'camera') ? '📷 The camera doesn\'t like the look of this one.' : '🤔 Something about this one feels off.'}</p>` : ''}
    ${line('Wants', `${b.want} × ${p.emoji} ${p.name} at ${money(price)}${b.courier ? ', all at once' : ''}`)}
    ${line('You have', `${have} bags${have ? `, ${pct(s.purity[b.product] ?? 0.6)} pure` : ''}`, have >= (b.courier ? b.want : 1) ? '' : 'bad')}
    ${line('Waits', `${secs(left)} more${!b.courier && s.crew.host ? ', then Lena serves them' : !b.courier && s.crew.dealer ? ', then Jay serves them' : ''}`)}
    <div class="row2" style="margin-top:10px">
      <button class="violet" data-act="sell" data-id="${b.id}" ${qty ? '' : 'disabled'}>${b.courier && !qty ? `Need ${b.want}` : `Sell ${qty || ''} (${money(qty * price)})`}</button>
      ${canPush ? `<button data-act="sell" data-id="${b.id}" data-push="1">🤝 Push to ${money(Math.round(qty * price * CFG.pushMult))}</button>` : ''}
      <button class="danger" data-act="turn" data-id="${b.id}">Turn away</button>
    </div><button class="big" data-act="close" style="margin-top:8px">Make them wait</button>`;
}

function reportModal(m) {
  const r = s.reports[m.i];
  if (!r) { ui.modal = null; return ''; }
  const t = r.ledger;
  const night = t.labBatches || t.bagsSold ? `<div class="card night"><h3>The back room</h3>
      ${line('Cooks', t.labBatches)}${line('Bags sold', `${t.bagsSold}${t.crewSales ? ` (${t.crewSales} by the crew)` : ''}`)}
      ${line('Dirty cash', money(t.nightSales), 'good')}
      ${t.copsServed ? line('Sold to undercover officers', t.copsServed, 'bad') : ''}${t.copsTurned ? line('Officers turned away', t.copsTurned, 'good') : ''}
      ${t.buyersLost ? line('Buyers who gave up waiting', t.buyersLost, 'meh') : ''}${t.couriers ? line('Courier orders', t.couriers, 'good') : ''}
      ${t.kitsBought ? line('Kits bought', t.kitsBought) : ''}${line('Peak heat', Math.round(t.peakHeat))}</div>` : '';
  const pay = r.payment ? `<div class="card ${r.payment.paid || r.payment.holiday ? 'win' : 'alert'}">${r.payment.holiday ? '🏖️ Payment holiday: skipped.' : r.payment.paid ? `🏦 Paid the bank ${money(r.payment.due)}.` : `🏦 Couldn't pay ${money(r.payment.due)}: ${money(r.payment.part)} paid, ${money(r.payment.penalty)} penalty.`}</div>` : '';
  return `<h2>📋 ${dateStr(r.day)}</h2>${pay}
    <div class="card">${line('Takings', money(t.sales), 'good')}${line('Customers served / missed', `${t.served} / ${t.missed}`)}
      ${t.pricedOut ? line('Put off by prices', t.pricedOut, 'meh') : ''}${line('Batches', t.batches)}${t.burnt ? line('Spoiled in a machine', t.burnt, 'bad') : ''}
      ${line('Ingredients bought', '-' + money(t.ingSpent))}${t.upgradesSpent ? line('Spent on the business', '-' + money(t.upgradesSpent)) : ''}
      ${line('Rent, rates and wages', '-' + money(t.rent + t.wages))}${t.nightWages ? line('Night crew', '-' + money(t.nightWages)) : ''}
      ${t.income ? line('Property income', money(t.income), 'good') : ''}${t.laundered || t.washed ? line('Laundered', money(t.laundered + (t.washed || 0))) : ''}
      ${t.interest ? line('Interest on arrears', '-' + money(t.interest), 'bad') : ''}${line('XP earned', `+${Math.round(t.xp)}`, 'good')}</div>
    ${night}${t.events.slice(-12).map(e => `<div class="card ${e.kind === 'bad' ? 'alert' : ''}">${e.text}</div>`).join('')}
    ${r.tax?.grades ? `<div class="card grades"><h3>📊 Weekly report card</h3><div class="gradeRow">${[['Bakery', r.tax.grades.bakery], ['Back room', r.tax.grades.back], ['Books', r.tax.grades.books]].map(([k, v]) => `<div><b class="g${v}">${v}</b><small>${k}</small></div>`).join('')}</div></div>` : ''}
    ${r.tax ? `<div class="card"><h3>🧾 HMRC</h3>${line('VAT', money(r.tax.vat))}${line('Corporation tax', money(r.tax.corp))}${line('Employer NI', money(r.tax.ni))}${line('Total', money(r.tax.total), 'bad')}</div>` : ''}
    ${t.ordersDone || t.ordersMissed ? `<div class="card">${line('Orders delivered', t.ordersDone || 0, 'good')}${t.ordersMissed ? line('Orders missed', t.ordersMissed, 'meh') : ''}</div>` : ''}
    <div class="row2" style="margin-top:8px"><button data-act="report-nav" data-id="-1" ${m.i > 0 ? '' : 'disabled'}>‹ Earlier</button>
      <button data-act="report-nav" data-id="1" ${m.i < s.reports.length - 1 ? '' : 'disabled'}>Later ›</button></div>
    <button class="big" data-act="close" style="margin-top:8px">Close</button>`;
}

function awayModal(m) {
  const a = m.data;
  const evs = s.feed.filter(f => f.t > a.from && f.kind !== 'info').slice(-14).reverse();
  const d = (k, f = money) => { const v = a.after[k] - a.before[k]; return (v >= 0 ? '+' : '-') + f(Math.abs(v)); };
  return `<h2>While you were away</h2><p class="mute">${away(a.to - a.from)}, from ${hhmm(a.from)}${a.to - a.from > DAY ? ` on ${dateStr(a.from)}` : ''}.${a.skipped ? ` (Only the last ${CFG.maxCatchUpDays} days were played.)` : ''}</p>
    <div class="card">${line('Customers served', (a.after.served - a.before.served).toLocaleString('en-GB'), 'good')}
      ${a.after.missed - a.before.missed ? line('Found the case empty', (a.after.missed - a.before.missed).toLocaleString('en-GB'), 'meh') : ''}
      ${line('Bakery takings', '+' + money(a.after.sales - a.before.sales), 'good')}
      ${line('Clean cash', `${money(a.after.clean)} (${d('clean')})`)}
      ${s.labUnlocked ? line('Bags sold', (a.after.bags - a.before.bags).toLocaleString('en-GB')) + line('Dirty cash', `${money(a.after.dirty)} (${d('dirty')})`) + line('Heat', `${Math.round(a.before.heat)} → ${Math.round(a.after.heat)}`) : ''}
      ${a.after.washed > a.before.washed ? line('Laundered', money(a.after.washed - a.before.washed)) : ''}
      ${a.after.orders > a.before.orders ? line('Orders delivered', a.after.orders - a.before.orders, 'good') : ''}
      ${a.after.tax > a.before.tax ? line('Paid to HMRC', money(a.after.tax - a.before.tax), 'bad') : ''}
      ${line('Popularity', `${Math.round(a.before.rep)} → ${Math.round(a.after.rep)}`)}
      ${a.after.level > a.before.level ? line('Level', `${a.before.level} → ${a.after.level}`, 'good') : ''}
      ${a.after.balance > a.before.balance + 1 ? line('Debt', `${money(a.before.balance)} → ${money(a.after.balance)}`, 'bad') : ''}</div>
    ${evs.map(e => `<div class="card ${e.kind === 'bad' ? 'alert' : ''}"><small class="mute">${hhmm(e.t)}</small> ${e.text}</div>`).join('')}
    ${unseenReport() ? '<button class="big" data-act="report" style="margin-top:8px">📋 Read the daily report</button>' : ''}
    <button class="primary big" data-act="close" style="margin-top:8px">Back to work</button>`;
}

function modalHTML() {
  const m = ui.modal;
  if (!m) return '';
  let inner = '';
  if (m.type === 'info') { const { title, html } = infoFor(m.kind, m.id); inner = `<h2>${title}</h2><div class="infobody">${html}</div><button class="big" data-act="close" style="margin-top:10px">Close</button>`; }
  else if (m.type === 'story') {
    const c = STORY.find(x => x.id === m.id), n = STORY.findIndex(x => x.id === m.id) + 1;
    inner = c ? `<h2>📜 ${c.title}</h2><p class="story">${c.text}</p><p class="mute">Chapter ${n} of ${STORY.length} · kept in 📖 Collection</p><button class="big primary" data-act="story-read">Carry on</button>` : '';
    if (!c) ui.modal = null;
  }
  else if (m.type === 'loadfail') inner = `<h2>⚠️ Your save couldn't be loaded</h2><p>Something in it didn't load (${loadFailed?.why || 'unknown'}), so the game has started fresh. Your old save hasn't been lost: a copy is kept on this device, and here it is as a backup code. Copy it somewhere safe; once the game is fixed, Settings → Load a backup brings it back.</p>
    <textarea id="backup-code" class="code" readonly>${loadFailed ? btoa(unescape(encodeURIComponent(loadFailed.raw))) : ''}</textarea>
    <div class="pbtns"><button class="small primary" data-act="backup-copy">Copy</button><button class="small" data-act="close">Close</button></div>`;
  else if (m.type === 'backup') inner = `<h2>💾 Your backup</h2><p class="mute">This code is your whole game. Copy it somewhere safe; Settings → Load a backup puts it back.</p>
    <textarea id="backup-code" class="code" readonly>${backupCode()}</textarea>
    <div class="pbtns"><button class="small primary" data-act="backup-copy">Copy</button>${NATIVE ? '' : '<button class="small" data-act="backup-file">Save as a file</button>'}<button class="small" data-act="close">Close</button></div>`;
  else if (m.type === 'restore') inner = `<h2>📥 Load a backup</h2><p class="mute">Paste a backup code. It replaces the game you have now.</p>
    <textarea id="restore-code" class="code" placeholder="Paste the code here"></textarea>
    <div class="pbtns"><button class="small primary" data-act="backup-load">Load it</button><button class="small" data-act="close">Cancel</button></div>`;
  else if (m.type === 'machine') inner = machineModal(m);
  else if (m.type === 'buyer') inner = buyerModal(m);
  else if (m.type === 'report') inner = reportModal(m);
  else if (m.type === 'away') inner = awayModal(m);
  else if (m.type === 'decision') {
    const d = s.decisions.find(x => x.id === m.id);
    if (!d) { ui.modal = null; return ''; }
    inner = `<h2>${d.title}</h2><p>${d.text}</p><p class="mute">Decide within ${mins((d.until - s.clock) / MIN)}, or the safe option is taken.</p>
      <div class="row2" style="margin-top:10px"><button class="primary" data-act="decision" data-id="${d.id}" data-yes="1">${d.yes}</button><button data-act="decision" data-id="${d.id}" data-yes="0">${d.no}</button></div>`;
  }
  else if (m.type === 'confirm') {
    inner = `<h2>Are you sure?</h2><p>${ui.confirm?.text || ''}</p>
      <div class="row2" style="margin-top:10px"><button class="primary" data-act="confirm-yes">Yes, buy it</button><button data-act="confirm-no">No</button></div>`;
  }
  else if (m.type === 'perks') {
    const pr = s.prestige;
    inner = `<h2>⭐ Prestige perks</h2><p class="mute">${pr.tokens} token${pr.tokens === 1 ? '' : 's'} to spend. Perks shape every fresh start and are kept for ever.</p><div class="mlist">${Object.entries(PERKS).map(([id, P]) => {
      const lvl = G.perk(s, id), cost = G.perkCost(s, id);
      return `<div class="mrow"><span class="em">${P.emoji}</span><div class="grow"><b>${P.name} ${lvl}/${P.max}</b><small>${P.desc}</small></div>
        <div class="mright">${lvl >= P.max ? '<span class="lock good">Max</span>' : `<button class="small primary" data-act="perk" data-id="${id}" ${pr.tokens >= cost ? '' : 'disabled'}>${cost} ⭐</button>`}</div></div>`; }).join('')}</div>
      <button class="big" data-act="close" style="margin-top:10px">Close</button>`;
  } else if (m.type === 'prestige') {
    const pt = G.prestigeTokens(s);
    inner = `<h2>⭐ Start again?</h2><p>You hand the whole business on: every shop, machine, back room, front, van, decoration, crew member and penny. You start again at Aunt Rosa's stall with a fresh debt.</p>
      <div class="card">${line('Net worth', money(G.netWorth(s)))}${line('Prestige tokens', `+${pt}`, 'good')}${line('Prices after', `+${pct(PRESTIGE.tokenBonus * (s.prestige.total + pt))} on everything`, 'good')}</div>
      <p><b>Challenge for the next run</b></p><div class="seg">${Object.entries(CHALLENGES).map(([k, c]) => `<button class="${(ui.challenge || 'none') === k ? 'on' : ''}" data-act="challenge" data-id="${k}">${c.name}${c.mult > 1 ? ` ×${c.mult}` : ''}</button>`).join('')}</div>
      <p class="mute">${CHALLENGES[ui.challenge || 'none'].desc} Your perks and tokens carry over. Spend the tokens in Bank & tax → Perks once you've started again.</p>
      <div class="row2" style="margin-top:10px"><button class="primary" data-act="prestige-go">Start again</button><button data-act="close">Not yet</button></div>`;
  } else if (m.type === 'milestones') {
    inner = `<h2>🏆 Milestones</h2><div class="mlist">${MILESTONES.map(x => { const done = s.milestones[x.id], p = G.milestoneProgress(s, x);
      return `<div class="mrow ${done ? '' : 'unknown'}"><span class="em">${x.emoji}</span><div class="grow"><b>${x.name}</b><small>${done ? `Reached ${dateStr(done)}` : `${pct(p)} of the way`} · +${money(x.cash)}</small>
        ${done ? '' : `<span class="prog"><i style="width:${(p * 100).toFixed(1)}%"></i></span>`}</div><div class="mright">${done ? '<span class="lock good">✓</span>' : ''}</div></div>`; }).join('')}</div>
      <button class="big" data-act="close" style="margin-top:10px">Close</button>`;
  }
  else if (m.type === 'launder') {
    const max = Math.floor(s.dirty), v = Math.min(max, m.amount ?? Math.min(max, G.launderLeft(s)));
    const h = G.launderHeatFor(s, v);
    inner = `<h2>🧾 Put dirty cash through the till</h2>
      <p class="mute">Today's takings across your shops are ${money(s.today.sales)}${s.shops.length > 1 ? `, and your branches can front ${money(s.shops.reduce((a, x) => a + SHOPS[x.id].launder, 0))} more` : ''}. Another <b>${money(G.launderLeft(s))}</b> can go through today without it looking odd. The wash takes ${pct(G.launderFee(s))}.</p>
      <input type="range" id="launder" min="0" max="${max}" step="1" value="${v}">
      <div class="line"><span>Launder <b id="launder-val">${money(v)}</b> → <b id="launder-got">${money(v * (1 - G.launderFee(s)))}</b> clean</span><span id="launder-warn" class="${h ? 'bad' : 'good'}">${h ? `looks off: heat +${h}` : 'looks normal'}</span></div>
      <div class="row2" style="margin-top:10px"><button class="violet" data-act="launder" ${v ? '' : 'disabled'}>Launder it</button><button data-act="close">Cancel</button></div>`;
  } else if (m.type === 'levelup') {
    const L = m.level, list = unlocksAt(L);
    inner = `<div class="lvlup"><div class="lvlnum">${L}</div><h2>Level ${L}!</h2><p class="good">+${money(CFG.levelCash * L)} clean cash</p></div>
      ${list.length ? `<p><b>Unlocked</b></p><div class="infobody"><small>${list.join('<br>')}</small></div>` : '<p class="mute">Nothing new this time. Keep going.</p>'}
      <button class="primary big" data-act="lvl-ok" style="margin-top:10px">Nice</button>`;
  } else if (m.type === 'offer') {
    inner = `<h2>A quiet word</h2>
      <p>Dez, one of Aunt Rosa's regulars, is waiting by the bins out the back.</p>
      <p class="quote">"Rosa never told you how she really kept this place going, did she? Bread doesn't pay a bank. The back room's still set up. I bring kits, you cook, and people come to the back door after dark. I'll throw in the first kit."</p>
      <div class="row2"><button class="violet" data-act="offer" data-id="yes">Hear him out</button><button data-act="offer" data-id="no">Not interested</button></div>`;
  }
  const night = m.type === 'buyer' || m.type === 'launder' || m.type === 'offer' || (m.type === 'machine' && m.kind === 'night');
  const sticky = m.type === 'levelup' || m.type === 'offer' || m.type === 'confirm' || m.type === 'decision' || m.type === 'story';
  return `<div class="modal-bg" data-act="${sticky ? 'noop' : 'close'}"><div class="modal ${night ? 'night' : ''}" data-act="noop">${inner}</div></div>`;
}

// ---------- Design mode ----------
const DESIGN_DEFAULT = { floor: 'mint', wall: 'stripes', decor: null, art: 'painting', expand: null };
const openDesign = () => { guideSeen('design'); ui.design = ui.room === 'back' ? { cat: 'bdecor', item: 'crates', sel: null, moving: null, back: true } : { cat: 'floor', item: DESIGN_DEFAULT.floor, sel: null, moving: null }; };

function swatch(id, f, on, kind) {
  const [a, b] = f.colors, open = D.levelOk(s, f);
  return `<div class="ditem ${on ? 'on' : ''} ${open ? '' : 'locked'}" data-act="d-item" data-id="${id}" data-level="${f.level || 1}" role="button">${ibtn(kind, id)}
    <span class="sw" style="background:linear-gradient(135deg, ${a} 0 50%, ${b} 50% 100%)"></span>
    <small>${f.name}</small><small class="price">${open ? (f.price ? money(f.price) : 'free') : `🔒 Lv ${f.level}`}</small></div>`;
}
function emojiItem(id, d, on, kind) {
  const open = D.levelOk(s, d);
  return `<div class="ditem ${on ? 'on' : ''} ${open ? '' : 'locked'}" data-act="d-item" data-id="${id}" data-level="${d.level || 1}" role="button">${ibtn(kind, id)}
    <span class="em">${d.emoji}</span><small>${d.name}</small><small class="price">${open ? money(d.price) : `🔒 Lv ${d.level}`}</small></div>`;
}

function designScreen() {
  const dv = ui.design;
  if (dv.back) return backDesignScreen();
  // Zoomed out, the Outside button opens the outside on its own, one part per tab
  const cats = dv.cat === 'outside' ? OUT_PARTS.map(([id, label]) => [id, label, 'o-part'])
    : [['floor', '🟫 Floor'], ['wall', '🧱 Walls'], ['decor', '🪴 Decor'], ['art', '🖼️ Wall art'], ['expand', '➕ Expand']];
  const bonus = Math.round((D.charmBonus(s) - 1) * 100);
  let items = '', hint = '', extra = '', sel = '';
  if (dv.cat === 'floor') {
    items = Object.entries(D.FLOORS).filter(([, f]) => !f.hidden).map(([id, f]) => swatch(id, f, dv.item === id, 'floor')).join('');
    const { n, cost } = D.fillFloorCost(s, dv.item);
    hint = `Tap squares to lay <b>${D.FLOORS[dv.item].name}</b> (${money(D.FLOORS[dv.item].price)} a square).`;
    if (D.damage(s).tiles) hint += ` <span class="bad">🔨 ${D.damage(s).tiles} cracked to fix (min ${money(D.REPAIR_TILE)} each).</span>`;
    if (n) extra = `<button class="small" data-act="d-fill">Do all ${n} squares · ${money(cost)}</button>`;
  } else if (dv.cat === 'wall') {
    items = Object.entries(D.WALLS).filter(([, f]) => !f.hidden).map(([id, f]) => swatch(id, f, dv.item === id, 'wall')).join('');
    const { n, cost } = D.fillWallCost(s, dv.item);
    hint = `Tap a wall panel to hang <b>${D.WALLS[dv.item].name}</b> (${money(D.WALLS[dv.item].price)} a panel).`;
    if (D.damage(s).panels) hint += ` <span class="bad">🔨 ${D.damage(s).panels} torn to fix (min ${money(D.REPAIR_PANEL)} each).</span>`;
    if (n) extra = `<button class="small" data-act="d-fill">Do all ${n} panels · ${money(cost)}</button>`;
  } else if (dv.cat === 'decor') {
    items = Object.entries(D.DECOR).map(([id, d]) => emojiItem(id, d, dv.item === id, 'decor')).join('');
    const it = dv.sel != null ? s.design.decor[dv.sel] : null;
    if (dv.moving != null) hint = 'Tap a green square to move it there.';
    else if (it) hint = 'Move it, turn it, or sell it back for half price.';
    else if (dv.item) hint = `Tap a green square to place a <b>${D.DECOR[dv.item].name}</b>${D.DECOR[dv.item].outdoor ? ' (terraces only)' : D.DECOR[dv.item].indoor ? ' (inside only)' : ''}.`;
    else hint = 'Pick something to place, or tap a decoration in the shop to move, turn or sell it.';
    const dnx = nextCap(CAPS.decor, s.level);
    hint += ` <span class="mute">(${s.design.decor.length}/${D.decorCap(s)} placed${s.design.decor.length >= D.decorCap(s) && dnx ? `, reach level ${dnx.level} for more` : ''})</span>`;
    if (it) {
      const d = D.DECOR[it.type];
      sel = `<div class="dsel">${d.emoji} <b>${d.name}</b>
        <button class="small" data-act="d-move">${dv.moving != null ? 'Moving…' : 'Move'}</button>
        <button class="small" data-act="d-rotate">Turn</button>
        <button class="small danger" data-act="d-sell">Sell ${money(Math.round(d.price * D.SELL_BACK))}</button>
        <button class="small" data-act="d-deselect">✕</button></div>`;
    }
  } else if (dv.cat === 'art') {
    items = Object.entries(D.ART).map(([id, d]) => emojiItem(id, d, dv.item === id, 'art')).join('')
      + `<div class="ditem ${dv.item === 'remove' ? 'on' : ''}" data-act="d-item" data-id="remove" role="button"><span class="em">🗑️</span><small>Take down</small><small class="price">half back</small></div>`;
    hint = dv.item === 'remove' ? 'Tap a panel to take its art down.' : `Tap a green wall panel to hang a <b>${D.ART[dv.item].name}</b>.`;
  } else if (dv.cat === 'outside') {
    const o = D.outOf(s);
    const sw = (part, id, f) => { const open = D.levelOk(s, f), on = o[part] === id;
      const a = f.color || f.a || f.bg || SWATCH[part]?.[id]?.[0] || '#3a3046', b = f.trim || f.b || f.fg || SWATCH[part]?.[id]?.[1] || a;
      return `<div class="ditem ${on ? 'on' : ''} ${open ? '' : 'locked'}" data-act="o-set" data-part="${part}" data-id="${id}" data-level="${f.level}" role="button">
        <span class="sw" style="background:linear-gradient(135deg, ${a} 0 50%, ${b} 50% 100%)"></span><small>${f.name}</small><small class="price">${open ? (f.price ? money(f.price) : 'free') : `🔒 Lv ${f.level}`}</small></div>`; };
    const part = dv.part || 'paint';
    const T = { paint: D.OUT_PAINT, finish: D.OUT_FINISH, window: D.OUT_WINDOW, door: D.OUT_DOOR, roof: D.OUT_ROOF, canopy: D.OUT_CANOPY, sign: D.OUT_SIGN }[part];
    items = T ? Object.entries(T).map(([id, f]) => sw(part, id, f)).join('')
      : Object.entries(D.OUT_EXTRAS).map(([id, f]) => { const open = D.levelOk(s, f), on = o.extras[id];
        return `<div class="ditem ${on ? 'on' : ''} ${open ? '' : 'locked'}" data-act="o-extra" data-id="${id}" data-level="${f.level}" role="button"><span class="em">${f.emoji}</span><small>${f.name}</small><small class="price">${!open ? `🔒 Lv ${f.level}` : on ? '✓ up · tap to remove' : money(f.price)}</small></div>`; }).join('');
    hint = { paint: 'The colour of the shop, its trim and its plinth.', finish: 'What the walls are made of.', window: 'Frames and glass for every window, upstairs too.',
      door: 'The side door your customers come in by.', roof: 'Flat, pitched, planted, solar, or a terrace up top.', canopy: 'The awning over the windows; its stripes also dress the carts and stalls.',
      sign: 'The board above the windows, with a hanging sign on the corner.', extras: 'Little touches. Tap one again to take it down for half back.' }[part]
      + ` <span class="mute">(the outside adds ✨ ${D.outsideCharm(s)} charm)</span>`;
  } else if (dv.cat === 'expand') {
    hint = dv.back ? `More benches and rooms for ${G.shopDef(s).short}'s back room: room for more back-room machines.` : 'Expansions add squares to decorate and room for more machines.';
    items = Object.entries(D.EXPANSIONS).filter(([, e]) => dv.back ? e.labSpots : !e.labSpots).map(([id, e]) => {
      const owned = s.design.expansions[id];
      const what = e.cells ? `${e.cells} squares` : e.spots ? `${e.spots} machine spots` : `${e.labSpots} back-room spots`;
      const btn = owned ? '<span class="good">✓ Yours</span>' : !D.levelOk(s, e) ? `<span class="lock">🔒 Lv ${e.level}</span>`
        : e.needs && !s.design.expansions[e.needs] ? `<span class="lock">needs ${D.EXPANSIONS[e.needs].name.toLowerCase()}</span>`
        : `<button class="small primary" data-act="d-buyexp" data-id="${id}" ${s.clean < e.price ? 'disabled' : ''}>${money(e.price)}</button>`;
      return `<div class="dexp ${owned ? 'owned' : ''}">${ibtn('exp', id)}<b>${e.name}</b><small>${what}</small>${btn}</div>`;
    }).join('');
  }
  return `<div class="designbar">
    <div class="drow"><div class="dcats">${cats.map(([id, label, act]) => `<button class="small ${(act ? (dv.part || 'paint') : dv.cat) === id ? 'on' : ''}" data-act="${act || 'd-cat'}" data-id="${id}">${label}</button>`).join('')}</div>
      ${D.cartInfo()?.n ? `<button class="small" data-act="d-cancel">Cancel</button><button class="primary small" data-act="d-checkout" ${s.clean >= D.cartInfo().cost ? '' : 'disabled'}>${D.cartInfo().cost >= 0 ? `Checkout · ${money(D.cartInfo().cost)}` : `Done · +${money(-D.cartInfo().cost)}`}</button>` : '<button class="primary small" data-act="d-done">Done</button>'}</div>
    <div class="dinfo"><span>${hint}${D.cartInfo()?.n ? ` <b>· ${D.cartInfo().n} change${D.cartInfo().n === 1 ? '' : 's'} in the basket</b>` : ''}</span><span class="charm">✨ Charm ${D.charm(s)} · +${bonus}% customers</span></div>
    ${sel}
    <div class="catalog ${dv.cat === 'expand' ? 'exp' : ''}" data-key="design-${dv.cat}">${items}</div>
    ${extra ? `<div class="dextra">${extra}</div>` : ''}
  </div>`;
}

// The back room's design: whole-room floor and walls, decor on its grid, and its layout expansions
function backDesignScreen() {
  const dv = ui.design, b = D.backOf(s), st = D.backStats(s);
  const cats = [['bdecor', '🛋️ Decor'], ['bfloor', '🟫 Floor'], ['bwall', '🧱 Walls'], ['expand', '➕ Layout']];
  let items = '', hint = '', sel = '';
  const priceTag = p => (p ? `💜 ${money(p)}` : 'free');
  if (dv.cat === 'bfloor' || dv.cat === 'bwall') {
    const T = dv.cat === 'bfloor' ? D.BACK_FLOORS : D.BACK_WALLS, cur = dv.cat === 'bfloor' ? b.floor : b.wall;
    items = Object.entries(T).map(([id, f]) => { const open = D.levelOk(s, f);
      return `<div class="ditem ${cur === id ? 'on' : ''} ${open ? '' : 'locked'}" data-act="${dv.cat === 'bfloor' ? 'b-floor' : 'b-wall'}" data-id="${id}" data-level="${f.level}" role="button">
        <span class="sw" style="background:linear-gradient(135deg, ${f.color} 0 50%, ${f.lower || f.color} 50% 100%)"></span><small>${f.name}</small><small class="price">${open ? priceTag(f.price) : `🔒 Lv ${f.level}`}</small></div>`; }).join('');
    hint = `Tap a style to do the whole back room. Paid in dirty cash.`;
  } else if (dv.cat === 'bdecor') {
    items = Object.entries(D.BACK_DECOR).map(([id, d]) => { const open = D.levelOk(s, d), fx = [d.comfort ? `😌${d.comfort}` : '', d.cover ? `🫥${d.cover}` : '', d.security ? `🛡️${d.security}` : ''].filter(Boolean).join(' ');
      return `<div class="ditem ${dv.item === id ? 'on' : ''} ${open ? '' : 'locked'}" data-act="d-item" data-id="${id}" data-level="${d.level}" role="button">${ibtn('bdecor', id)}
        <span class="em">${d.emoji}</span><small>${d.name}</small><small class="price">${open ? `${priceTag(d.price)} · ${fx}` : `🔒 Lv ${d.level}`}</small></div>`; }).join('');
    const it = dv.sel != null ? b.decor[dv.sel] : null;
    hint = dv.moving != null ? 'Tap a green square to move it there.' : it ? 'Move it, turn it, or sell it back for half.' : dv.item ? `Tap a green square to place the ${D.BACK_DECOR[dv.item].name.toLowerCase()}.` : 'Pick something, or tap a piece in the room to move it.';
    hint += ` <span class="mute">(${b.decor.length}/${D.backDecorCap(s)} placed)</span>`;
    if (it) { const d = D.BACK_DECOR[it.type]; sel = `<div class="dsel">${d.emoji} <b>${d.name}</b>
      <button class="small" data-act="b-move">${dv.moving != null ? 'Moving…' : 'Move'}</button><button class="small" data-act="b-rotate">Turn</button>
      <button class="small danger" data-act="b-sell">Sell 💜 ${money(Math.round(d.price * D.SELL_BACK))}</button><button class="small" data-act="d-deselect">✕</button></div>`; }
  } else {
    hint = `More benches and rooms for ${G.shopDef(s).short}'s back room: room for more machines.`;
    items = Object.entries(D.EXPANSIONS).filter(([, e]) => e.labSpots).map(([id, e]) => {
      const owned = s.design.expansions[id];
      const btn = owned ? '<span class="good">✓ Yours</span>' : !D.levelOk(s, e) ? `<span class="lock">🔒 Lv ${e.level}</span>`
        : e.needs && !s.design.expansions[e.needs] ? `<span class="lock">needs ${D.EXPANSIONS[e.needs].name.toLowerCase()}</span>`
        : `<button class="small primary" data-act="d-buyexp" data-id="${id}" ${s.clean < e.price ? 'disabled' : ''}>${money(e.price)}</button>`;
      return `<div class="dexp ${owned ? 'owned' : ''}">${ibtn('exp', id)}<b>${e.name}</b><small>${e.labSpots} back-room spots</small>${btn}</div>`;
    }).join('');
  }
  const c = D.cartInfo();
  const pay = c?.n ? `<button class="small" data-act="d-cancel">Cancel</button><button class="primary small" data-act="d-checkout" ${s.clean >= c.cost && s.dirty >= (c.dirty || 0) ? '' : 'disabled'}>Checkout${c.dirty ? ` · 💜 ${money(c.dirty)}` : ''}${c.cost ? ` · ${money(c.cost)}` : ''}</button>` : '<button class="primary small" data-act="d-done">Done</button>';
  return `<div class="designbar night">
    <div class="drow"><div class="dcats">${cats.map(([id, label]) => `<button class="small ${dv.cat === id ? 'on' : ''}" data-act="d-cat" data-id="${id}">${label}</button>`).join('')}</div>${pay}</div>
    <div class="dinfo"><span>${hint}${c?.n ? ` <b>· ${c.n} change${c.n === 1 ? '' : 's'} in the basket</b>` : ''}</span><span class="charm" data-act="info" data-kind="backstats" data-id="x">😌 ${st.comfort} · 🫥 ${st.cover} · 🛡️ ${st.security}</span></div>
    ${sel}
    <div class="catalog ${dv.cat === 'expand' ? 'exp' : ''}" data-key="bdesign-${dv.cat}">${items}</div>
  </div>`;
}

const OUT_PARTS = [['paint', '🎨 Paint'], ['finish', '🧱 Walls'], ['window', '🪟 Windows'], ['door', '🚪 Door'], ['roof', '🏠 Roof'], ['canopy', '⛱️ Awning'], ['sign', '🪧 Sign'], ['extras', '🌺 Extras']];
// Swatch colours for outside options that don't carry a colour of their own
const SWATCH = {
  finish: { render: ['#e9d8c4', '#d9c4aa'], brick: ['#a5523d', '#e6d8c4'], cladding: ['#c9a46a', '#8a6a3a'], stone: ['#b8ad9a', '#8c8475'], tiles: ['#4f9de8', '#f4f0e8'], marble: ['#ece8e2', '#9a9aa6'] },
  window: { plain: ['#bfe6ff', '#fff0dc'], georgian: ['#bfe6ff', '#ffffff'], arched: ['#bfe6ff', '#c9a46a'], stained: ['#e85d75', '#4f9de8'], neon: ['#1d1528', '#ff4fa3'], gold: ['#bfe6ff', '#d4af37'] },
  roof: { solar: ['#1d2a4a', '#8aa6d6'], terrace: ['#a8703f', '#3f7a3a'] },
};
function designTap(info) {
  const dv = ui.design;
  let r = null;
  D.startCart(s);
  if (dv.back) {
    if (info.kind === 'bdecor') { dv.sel = info.idx; dv.item = null; dv.cat = 'bdecor'; }
    else if (info.kind === 'bcell' && dv.cat === 'bdecor') {
      if (dv.moving != null) { r = D.moveBackDecor(s, dv.moving, info.bx, info.bz); if (r.ok) dv.moving = null; }
      else if (dv.item) r = D.placeBackDecor(s, dv.item, info.bx, info.bz);
      else { const i = D.backDecorAt(s, info.bx, info.bz); dv.sel = i >= 0 ? i : null; }
    }
    if (r?.msg) showToast(r.msg, r.ok ? 'good' : 'bad');
    save(); render();
    return;
  }
  if (info.kind === 'panel') {
    if (dv.cat === 'wall') r = D.paintWall(s, info.key, dv.item);
    else if (dv.cat === 'art') r = dv.item === 'remove' ? D.removeArt(s, info.key) : D.placeArt(s, info.key, dv.item);
  } else if (dv.cat === 'floor') {
    r = D.paintFloor(s, info.cx, info.cz, dv.item);
  } else if (dv.cat === 'decor') {
    if (dv.moving != null) {
      r = D.moveDecor(s, dv.moving, info.cx, info.cz);
      if (r.ok) dv.moving = null;
    } else if (info.kind === 'decor') { dv.sel = info.idx; dv.item = null; }
    else if (dv.item) r = D.placeDecor(s, dv.item, info.cx, info.cz);
    else { const i = D.decorAt(s, info.cx, info.cz); dv.sel = i >= 0 ? i : null; }
  } else if (dv.cat === 'expand') {
    const z = D.cellZone(info.cx, info.cz);
    if (z && z !== 'inside' && !s.design.expansions[z]) showToast(`That's the ${D.EXPANSIONS[z].name.toLowerCase()}. Buy it here to use it.`);
  }
  if (r?.msg) showToast(r.msg, r.ok ? 'good' : 'bad');
  save(); render();
}

// ---------- Render ----------
let lastHTML = '';
function render(force = false) {
  // Modals that come up on their own, one at a time
  if (!ui.modal && !ui.design) {
    if (s.levelUps?.length) ui.modal = { type: 'levelup', level: s.levelUps[0] };
    else if (s.offerPending) ui.modal = { type: 'offer' };
    else if (s.decisions.length) ui.modal = { type: 'decision', id: s.decisions[0].id };
    else if (s.story?.queue?.length && s.introSeen) ui.modal = { type: 'story', id: s.story.queue[0] };
  }
  const html = hudHTML() + (ui.design ? designScreen() : dockHTML()) + guideHTML() + modalHTML();
  if (!force && html === lastHTML) return;
  lastHTML = html;
  const oldCat = app.querySelector('.catalog');
  const catKey = oldCat?.dataset.key, catLeft = oldCat?.scrollLeft || 0;
  const oldModal = app.querySelector('.modal'), modalTop = oldModal?.scrollTop || 0;
  app.innerHTML = html;
  const newCat = app.querySelector('.catalog');
  if (newCat && newCat.dataset.key === catKey) newCat.scrollLeft = catLeft;
  const newModal = app.querySelector('.modal');
  if (newModal && oldModal) newModal.scrollTop = modalTop;
  layoutScene();
}

function layoutScene() {
  const H = window.innerHeight;
  const top = app.querySelector('.hud')?.getBoundingClientRect().bottom || 0;
  document.documentElement.style.setProperty('--hud-h', `${Math.round(top)}px`);
  const lower = app.querySelector('.designbar') || app.querySelector('.fabs');
  const bottom = lower ? H - lower.getBoundingClientRect().top : 0;
  world.setView({ zone: ui.room === 'back' ? 'back' : 'shop', top: top + 34, bottom: bottom + 8, design: ui.design ? { ...ui.design } : null });
}
window.addEventListener('resize', () => layoutScene());

// ---------- Actions ----------
function tapMachine(kind, idx) {
  const lab = kind === 'night', mc = (lab ? s.lab : s.machines)[idx];
  if (!mc) return;
  const v = G.jobView(s, mc, s.clock, lab);
  if (v.item && v.done && !mc.broken) {
    const ok = lab ? G.collectLab(s, idx, s.clock) : G.collectJob(s, idx, s.clock, { byYou: true });
    if (ok) { world.poke(s, kind, idx, v.item); return; }
  }
  world.poke(s, kind, idx, null);
  ui.modal = { type: 'machine', kind, idx };
}

// Big purchases ask first
function confirmText(a, d) {
  const id = d.id;
  if (a === 'buymachine') return `Buy another ${MACHINES[id].name.toLowerCase()} for ${money(G.machinePrice(s, id))}?`;
  if (a === 'buylab') return `Buy a ${LAB_MACHINES[id].name.toLowerCase()} for 💜 ${money(G.machinePrice(s, id, true))}?`;
  if (a === 'throw') return `Throw away ${Math.floor(s.display[id] || 0)} ${ITEMS[id].name.toLowerCase()}? It stays on its counter, empty.`;
  if (a === 'throwfree') return `Throw away the ${ITEMS[id].name.toLowerCase()} and take it off its counter, so something else can go there?`;
  if (a === 'manager-hire') return `Hire a ${MANAGER.skills[Number(d.skill)].name.toLowerCase()} manager for ${money(MANAGER.skills[Number(d.skill)].wage)} a day?`;
  if (a === 'counter-buy') { const c = G.nextCounter(s); return c ? (G.unlocked(s, c.level) ? `Buy another display counter for ${money(c.price)}? It holds one more thing on sale.` : null) : null; }
  if (a === 'd-buyexp') return `Buy the ${D.EXPANSIONS[id].name.toLowerCase()} for ${money(D.EXPANSIONS[id].price)}?`;
  if (a === 'shop-buy') return `Open ${SHOPS[id].name} for ${money(G.shopPrice(s))}? Its rent is ${money(SHOPS[id].rent)} a day.`;
  if (a === 'front-buy') return `Buy the ${FRONTS[id].name.toLowerCase()} for ${money(FRONTS[id].price)}?`;
  if (a === 'van-buy') return `Buy another van for ${money(VANS.price * (1 + s.vans.count))}?`;
  if (a === 'van-up') return id === 'level' ? `Bigger vans for ${money(VANS.capacityCost[s.vans.level + 1])}?` : `Better hidden compartments for 💜 ${money(VANS.hideCost[s.vans.hide + 1])}?`;
  if (a === 'property') return `Buy ${PROPERTY[id].name.toLowerCase()} for ${money(PROPERTY[id].price)}?`;
  if (a === 'upgrade') { const u = UPGRADES.find(x => x.id === id); return `Buy ${u.name.toLowerCase()} for ${u.cash === 'dirty' ? '💜 ' : ''}${money(u.cost)}?`; }
  if (a === 'corner-buy') return `Take over ${CORNERS[id].name.toLowerCase()} for 💜 ${money(CORNERS[id].price)}?`;
  if (a === 'rival-buy') return `Buy out ${RIVAL.name} for ${money(G.rivalBuyout(s))}?`;
  if (a === 'auction') return `Buy ${s.auction?.kits} kits of ${PRODUCTS[s.auction?.product]?.name} for 💜 ${money(s.auction?.price || 0)}?`;
  if (a === 'case-bribe') return `Offer ${CASE.detective} 💜 ${money(G.caseBribeCost(s))}? There's a ${pct(CASE.bribeFail)} chance it backfires.`;
  if (a === 'case-frame') return `Pay 💜 ${money(G.caseFrameCost(s))} to pin it on a rival crew? There's a ${pct(CASE.frameFail)} chance it falls apart.`;
  if (a === 'learn') return `Learn ${ITEMS[id].name} for ${money(ITEMS[id].cost)}?`;
  if (a === 'tier') { const lab = d.kind === 'night', m = (lab ? s.lab : s.machines)[Number(d.idx)]; return m ? `Upgrade to tier ${(m.tier || 0) + 1} for ${G.machineCash(m.type, lab) === 'dirty' ? '💜 ' : ''}${money(G.tierCost(m.type, m.tier || 0, lab))}?` : null; }
  return null;
}
function act(el) {
  const a = el.dataset.act, id = el.dataset.id, t = s.clock;
  if (!el.dataset.confirmed) {
    const text = confirmText(a, el.dataset);
    if (text) { ui.confirm = { text, data: { ...el.dataset }, back: ui.modal }; ui.modal = { type: 'confirm' }; render(true); return; }
  }
  switch (a) {
    case 'noop': return;
    case 'info': ui.modal = { type: 'info', kind: el.dataset.kind, id }; break;
    case 'counter': {
      const k = Number(id);
      if (k < G.countersOf(s.design)) { ui.modal = { type: 'info', kind: 'tray', id: String(k) }; guideSeen('tray'); }
      else act({ dataset: { act: 'counter-buy' } });
      return render(true);
    }
    case 'counter-buy': G.buyCounter(s); break;
    case 'restock': {
      const type = ITEMS[id].machine;
      let i = s.machines.findIndex(m => m.type === type && !m.job && !m.broken);
      if (i < 0) { showToast(`Every ${MACHINES[type].name.toLowerCase()} is busy (or broken).`, 'bad'); break; }
      if (G.startJob(s, i, id, t)) showToast(`${ITEMS[id].emoji} ${ITEMS[id].name} on the go.`, 'good');
      ui.modal = null; break;
    }
    case 'special': G.setSpecial(s, id); break;
    case 'throw': G.throwAway(s, id, false); break;
    case 'throwfree': G.throwAway(s, id, true); ui.modal = null; break;
    case 'story-read': G.readChapter(s); ui.modal = null; break;
    case 'claim': G.claimSet(s, id); break;
    case 'manager-hire': case 'manager-fire': { const keep = s.cur; s.cur = Number(el.dataset.shop); if (a === 'manager-hire') G.hireManager(s, Number(el.dataset.skill)); else G.fireManager(s); s.cur = keep; break; }
    case 'cabinet': G.buyCabinet(s, Number(id)); break;
    case 'setting': settings[id] = !settings[id]; saveSettings(); if (id === 'sound') { SFX.setSound(settings.sound); SFX.unlock(); } if (id === 'notify' && settings.notify) askNotify(); break;
    case 'guide-next': s.guide.step++; break;
    case 'guide-skip': s.guide.step = 99; break;
    case 'guide-restart': s.guide = { step: 0, seen: {} }; ui.tab = null; break;
    case 'backup-out': ui.modal = { type: 'backup' }; break;
    case 'backup-in': ui.modal = { type: 'restore' }; break;
    case 'backup-copy': {
      const ta = document.getElementById('backup-code'); ta.select();
      (navigator.clipboard?.writeText(ta.value) || Promise.reject()).then(() => showToast('Copied. Keep it somewhere safe (a note, an email to yourself).', 'good'))
        .catch(() => { try { document.execCommand('copy'); showToast('Copied.', 'good'); } catch { showToast('Select the code and copy it by hand.', 'info'); } });
      return;
    }
    case 'backup-file': {
      const blob = new Blob([backupCode()], { type: 'text/plain' }), a2 = document.createElement('a');
      a2.href = URL.createObjectURL(blob); a2.download = `baking-bad-${new Date().toISOString().slice(0, 10)}.txt`; a2.click();
      setTimeout(() => URL.revokeObjectURL(a2.href), 2000); return;
    }
    case 'backup-load': {
      const code = (document.getElementById('restore-code')?.value || '').trim();
      try {
        const d = JSON.parse(decodeURIComponent(escape(atob(code.replace(/\s+/g, '')))));
        if (!d?.v) throw new Error('no save');
        if (!confirm('Load this backup? The game you have now will be replaced.')) return;
        s = D.ensureDesign(G.migrate(d)); vt = Math.max(Date.now(), s.last || 0); save();
        ui.modal = null; ui.tab = null; ui.panel = null; ui.design = null; ui.room = 'shop';
        showToast('Backup loaded.', 'good'); catchUp(vt);
      } catch { showToast('That code isn\'t a Baking Bad backup (check it was copied whole).', 'bad'); }
      return;
    }
    case 'tab':
      if (id === 'design') { openDesign(); ui.tab = null; ui.panel = null; }
      else if (id === 'outside') { ui.design = { cat: 'outside', part: 'paint', item: null, sel: null, moving: null }; ui.tab = null; ui.panel = null; }
      else openTab(id);
      break;
    case 'panel': ui.panel = ui.panel === id ? null : id; if (id === 'menu' && ui.panel) ui.tab = null; break;
    case 'dock-close': ui.tab = null; break;
    case 'map-go': G.viewShop(s, Number(id)); ui.room = 'shop'; ui.panel = null; if (ui.tab && TABS[ui.tab].night) ui.tab = null; break;
    case 'go-back': if (id !== undefined) G.viewShop(s, Number(id)); ui.room = 'back'; ui.panel = null; ui.tab = doorTotal() ? 'deals' : 'back'; break;
    case 'room':
      if (!s.labUnlocked) break;
      ui.room = ui.room === 'back' ? 'shop' : 'back';
      if (ui.tab && (ui.room === 'back') !== !!TABS[ui.tab]?.night) ui.tab = null;
      ui.panel = null;
      break;
    case 'intro-ok': s.introSeen = true; break;
    // Kitchen
    case 'machine': {
      const kind = el.dataset.kind || 'day', idx = Number(el.dataset.idx);
      if (el.closest?.('.bub') || !el.closest) tapMachine(kind, idx); // a bubble or the 3D machine: collect if it's done
      else ui.modal = { type: 'machine', kind, idx };
      if (kind === 'night' && ui.room !== 'back') ui.room = 'back';
      break;
    }
    case 'cook': if (ui.modal?.type === 'machine') { if (G.startJob(s, ui.modal.idx, id, t)) { world.poke(s, 'day', ui.modal.idx, null); ui.modal = null; } } break;
    case 'labcook': if (ui.modal?.type === 'machine') { if (G.startLab(s, ui.modal.idx, id, t)) { world.poke(s, 'night', ui.modal.idx, null); ui.modal = null; } } break;
    case 'collect': {
      const kind = el.dataset.kind, idx = Number(el.dataset.idx), lab = kind === 'night';
      const item = (lab ? s.lab : s.machines)[idx]?.job?.item;
      if (lab ? G.collectLab(s, idx, t) : G.collectJob(s, idx, t, { byYou: true })) world.poke(s, kind, idx, item);
      break;
    }
    case 'collectall': {
      let n = 0;
      s.machines.forEach((m, i) => { const item = m.job?.item; if (machineState(m) === 'ready' && G.collectJob(s, i, t, { quiet: true, byYou: true })) { n++; world.poke(s, 'day', i, item); } });
      showToast(n ? `Collected ${n} batch${n === 1 ? '' : 'es'}.` : 'Nothing collected: the trays are full.', n ? 'good' : 'bad');
      break;
    }
    case 'restartall': {
      let n = 0;
      s.machines.forEach((m, i) => { if (machineState(m) === 'idle' && m.last && G.startJob(s, i, m.last, t, { quiet: true })) n++; });
      showToast(n ? `Started ${n} batch${n === 1 ? '' : 'es'}.` : 'Couldn\'t start anything: check ingredients and cash.', n ? 'good' : 'bad');
      break;
    }
    case 'learn': G.buyRecipe(s, id); break;
    case 'collectlab': { let n = 0; s.lab.forEach((m, i) => { const item = m.job?.item; if (m.job && t >= m.job.start + m.job.dur && G.collectLab(s, i, t, { quiet: true })) { n++; world.poke(s, 'night', i, item); } }); showToast(n ? `Bagged ${n} cook${n === 1 ? '' : 's'}.` : 'Nothing ready.', n ? 'good' : 'bad'); break; }
    case 'restartlab': { let n = 0; s.lab.forEach((m, i) => { if (!m.job && m.last && !m.broken && G.startLab(s, i, m.last, t, { quiet: true })) n++; }); showToast(n ? `Started ${n} cook${n === 1 ? '' : 's'}.` : 'Couldn\'t start anything: check kits.', n ? 'good' : 'bad'); break; }
    case 'buymachine': G.buyMachine(s, id); break;
    case 'buylab': G.buyMachine(s, id, true); break;
    case 'repair': G.repairMachine(s, Number(el.dataset.idx), el.dataset.kind === 'night'); break;
    case 'menu-toggle': G.toggleMenu(s, id); break;
    case 'price': G.setPriceLevel(s, id, el.dataset.lvl); break;
    case 'basket': { const n = Math.max(0, (ui.basket[id] || 0) + Number(el.dataset.n)); if (n) ui.basket[id] = n; else delete ui.basket[id]; break; }
    case 'basket-clear': ui.basket = {}; break;
    case 'stockup': { const { need } = stockUpNeeds(); for (const [k, q] of Object.entries(need)) if (q > 0) ui.basket[k] = Math.max(ui.basket[k] || 0, q); break; }
    case 'checkout': {
      const total = basketTotal();
      if (s.clean < total) { showToast('Not enough clean cash.', 'bad'); break; }
      for (const [k, n] of Object.entries(ui.basket)) G.buyIngredient(s, k, n, true);
      showToast(`Bought ${Object.values(ui.basket).reduce((a, n) => a + n, 0)} ingredients for ${money2(total)}.`, 'good');
      ui.basket = {};
      break;
    }
    // Business
    case 'upgrade': G.buyUpgrade(s, id); break;
    case 'property': G.buyProperty(s, id); break;
    case 'hire': G.hire(s, id); break;
    case 'fire': G.fire(s, id); break;
    case 'campaign': G.startCampaign(s, id, t); break;
    case 'pay': G.payBank(s, id === 'all' ? s.balance : Number(id)); break;
    case 'loan': G.takeLoan(s); break;
    case 'holiday': G.useHoliday(s); break;
    case 'restructure': G.restructure(s); break;
    case 'report': ui.modal = { type: 'report', i: s.reports.length - 1 }; s.seenReportDay = s.reports.at(-1)?.day || 0; break;
    case 'report-nav': if (ui.modal?.type === 'report') ui.modal.i = Math.max(0, Math.min(s.reports.length - 1, ui.modal.i + Number(id))); break;
    // The back room
    case 'kit': if (G.buyKit(s, id, el.dataset.type)) showToast(`+1 ${PRODUCTS[el.dataset.type].name} kit`, 'good'); break;
    case 'bribe': G.bribe(s); break;
    case 'cut': G.setCut(s, id, el.dataset.cut); break;
    case 'declare': G.setDeclare(s, id); break;
    case 'bonus': G.payBonus(s, id); break;
    case 'contract': G.signContract(s, id); break;
    case 'contract-end': G.endContract(s, id); break;
    case 'insure': G.toggleInsurance(s, id); break;
    case 'rival-buy': G.buyOutRival(s); break;
    case 'case-bribe': G.bribeDetective(s); break;
    case 'case-frame': G.frameRival(s); break;
    case 'auction': G.buyAuction(s); break;
    case 'decide': if (s.decisions[0]) ui.modal = { type: 'decision', id: s.decisions[0].id }; break;
    case 'decision': G.answerDecision(s, Number(id), el.dataset.yes === '1'); ui.modal = null; break;
    case 'van-send': G.sendVan(s, Number(id)); break;
    case 'van-buy': G.buyVan(s); break;
    case 'van-up': G.upgradeVans(s, id); break;
    case 'delivery': G.setDelivery(s, id === 'on'); break;
    case 'rider': G.hireRider(s, Number(el.dataset.n)); break;
    case 'wash': G.washVia(s, id, el.dataset.n === 'max' ? Infinity : Number(el.dataset.n)); break;
    case 'art': G.buyArt(s, el.dataset.n === 'max' ? Infinity : Number(el.dataset.n)); break;
    case 'smurf': G.setSmurfing(s, Number(el.dataset.n)); break;
    case 'offshore-in': G.stashOffshore(s, el.dataset.n === 'max' ? s.dirty : Number(el.dataset.n)); break;
    case 'offshore-clean': G.bringBack(s, Infinity, true); break;
    case 'offshore-dirty': G.bringBack(s, s.wash.offshore, false); break;
    case 'front-buy': G.buyFront(s, id); break;
    case 'front-toggle': G.toggleFront(s, id); break;
    case 'hmrc': G.payHmrc(s); break;
    case 'order': G.deliverOrder(s, Number(id)); break;
    case 'order-drop': G.dropOrder(s, Number(id)); break;
    case 'milestones': ui.modal = { type: 'milestones' }; break;
    case 'perks': ui.modal = { type: 'perks' }; break;
    case 'perk': G.buyPerk(s, id); break;
    case 'prestige-ask': ui.modal = { type: 'prestige' }; break;
    case 'challenge': ui.challenge = id; break;
    case 'prestige-go': s = G.prestigeReset(s, Date.now(), ui.challenge || 'none'); ui.challenge = null; vt = Date.now(); ui.modal = { type: 'perks' }; ui.design = null; ui.room = 'shop'; ui.tab = null; ui.panel = null; break;
    case 'dez': G.sellToDez(s, id, s.bags[id] || 0); break;
    case 'tier': G.upgradeMachine(s, Number(el.dataset.idx), el.dataset.kind === 'night'); break;
    case 'corner-buy': G.buyCorner(s, id); break;
    case 'corner-product': G.setCornerProduct(s, id, el.dataset.type); break;
    case 'corner-stock': G.stockCorner(s, id, Number(el.dataset.n)); break;
    case 'shop-buy': { const n = s.shops.length; G.buyShop(s, id); if (s.shops.length > n) { G.viewShop(s, n); ui.room = 'shop'; ui.tab = 'kitchen'; } break; }
    case 'shop-view': G.viewShop(s, Number(id)); ui.room = 'shop'; ui.tab = null; break;
    case 'shop-next': G.viewShop(s, ((s.cur || 0) + 1) % s.shops.length); ui.room = 'shop'; if (ui.tab === 'back' || ui.tab === 'turf') ui.tab = 'kitchen'; break;
    case 'launder-open': ui.modal = { type: 'launder' }; break;
    case 'launder': G.launder(s, ui.modal?.amount ?? Math.min(Math.floor(s.dirty), G.launderLeft(s))); ui.modal = null; break;
    case 'buyer': ui.modal = { type: 'buyer', id: Number(id) }; if (ui.room !== 'back') ui.room = 'back'; break;
    case 'sell': {
      const before = s.dirty;
      G.serveBuyer(s, Number(id), el.dataset.push === '1', t);
      if (s.dirty > before) world.sold(Number(id));
      if (!s.door.find(x => x.id === Number(id))) ui.modal = null;
      break;
    }
    case 'turn': G.turnAway(s, Number(id)); ui.modal = null; break;
    case 'offer': G.answerOffer(s, id === 'yes'); ui.modal = null; if (id === 'yes') { G.viewShop(s, 0); ui.room = 'back'; ui.tab = 'back'; } break;
    case 'lvl-ok': s.levelUps.shift(); ui.modal = null; break;
    case 'close': ui.modal = null; break;
    case 'confirm-yes': { const c = ui.confirm; ui.confirm = null; ui.modal = c?.back || null; if (c) act({ dataset: { ...c.data, confirmed: '1' } }); return; }
    case 'confirm-no': ui.modal = ui.confirm?.back || null; ui.confirm = null; break;
    // Design
    case 'o-part': ui.design.part = id; break;
    case 'd-cat': Object.assign(ui.design, { cat: id, item: DESIGN_DEFAULT[id], sel: null, moving: null }); break;
    case 'd-item':
      if (Number(el.dataset.level || 1) > s.level) { showToast(`Unlocks at level ${el.dataset.level}.`, 'bad'); return; }
      Object.assign(ui.design, { item: id, sel: null, moving: null }); break;
    case 'd-fill': { D.startCart(s); const r = ui.design.cat === 'floor' ? D.fillFloor(s, ui.design.item) : D.fillWalls(s, ui.design.item); if (r.msg) showToast(r.msg, r.ok ? 'good' : 'bad'); break; }
    case 'd-move': if (ui.design.sel != null) ui.design.moving = ui.design.sel; break;
    case 'd-rotate': if (ui.design.sel != null) { D.startCart(s); D.rotateDecor(s, ui.design.sel); } break;
    case 'd-sell': if (ui.design.sel != null) { D.startCart(s); const r = D.sellDecor(s, ui.design.sel); if (r.msg) showToast(r.msg, 'good'); ui.design.sel = null; ui.design.moving = null; } break;
    case 'd-deselect': ui.design.sel = null; ui.design.moving = null; break;
    case 'd-buyexp': { const r = D.buyExpansionNow(s, id); if (r.msg) showToast(r.msg, r.ok ? 'good' : 'bad'); break; }
    case 'd-done': D.checkoutCart(s); ui.design = null; break;
    case 'o-set': case 'o-extra': {
      if (Number(el.dataset.level || 1) > s.level) { showToast(`Unlocks at level ${el.dataset.level}.`, 'bad'); return; }
      D.startCart(s); const r = a === 'o-set' ? D.setOutside(s, el.dataset.part, id) : D.toggleExtra(s, id); if (r.msg) showToast(r.msg, r.ok ? 'good' : 'bad'); break;
    }
    case 'b-floor': case 'b-wall': {
      if (Number(el.dataset.level || 1) > s.level) { showToast(`Unlocks at level ${el.dataset.level}.`, 'bad'); return; }
      D.startCart(s); const r = a === 'b-floor' ? D.setBackFloor(s, id) : D.setBackWall(s, id); if (r.msg) showToast(r.msg, r.ok ? 'good' : 'bad'); break;
    }
    case 'b-move': if (ui.design.sel != null) ui.design.moving = ui.design.sel; break;
    case 'b-rotate': if (ui.design.sel != null) { D.startCart(s); D.rotateBackDecor(s, ui.design.sel); } break;
    case 'b-sell': if (ui.design.sel != null) { D.startCart(s); const r = D.sellBackDecor(s, ui.design.sel); if (r.msg) showToast(r.msg, 'good'); ui.design.sel = null; ui.design.moving = null; } break;
    case 'd-checkout': { const r = D.checkoutCart(s); if (r.msg) showToast(r.msg, 'good'); ui.design = null; break; }
    case 'd-cancel': D.cancelCart(s); showToast('Changes undone.', 'info'); ui.design = null; break;
    case 'restart':
      if (!confirm('Start a new game? This bakery will be lost.')) return;
      s = G.newGame(Date.now()); vt = Date.now(); ui.modal = null; ui.design = null; ui.room = 'shop'; ui.tab = null; ui.panel = null;
      break;
  }
  save();
  render(true);
}

// Bubbles over the 3D scene move every frame, so they react on pointerdown.
document.getElementById('overlay').addEventListener('pointerdown', e => {
  const el = e.target.closest('[data-act]');
  if (!el || ui.modal || ui.design) return;
  e.preventDefault();
  act(el);
});
let pointerDown = false, lastPointer = 0, touching = false;
// The browser cancels a touch once it starts scrolling, so touches and scrolling are tracked separately
app.addEventListener('touchstart', () => { touching = true; lastPointer = performance.now(); }, { passive: true });
window.addEventListener('touchend', () => { touching = false; lastPointer = performance.now(); }, { passive: true });
window.addEventListener('touchcancel', () => { touching = false; lastPointer = performance.now(); }, { passive: true });
app.addEventListener('scroll', () => { lastPointer = performance.now(); }, { capture: true, passive: true });
let rowDrag = null, dragJustEnded = false;
app.addEventListener('pointerdown', e => {
  pointerDown = true; lastPointer = performance.now();
  if (e.pointerType === 'touch' || e.button !== 0) return;
  const row = e.target.closest('.catalog, .dcats');
  if (row && row.scrollWidth > row.clientWidth) { rowDrag = { row, x: e.clientX, left: row.scrollLeft, moved: false }; return; }
  // Mouse: drag a menu up and down like a finger would
  const box = e.target.closest('.modal');
  if (box && box.scrollHeight > box.clientHeight && e.target.type !== 'range') rowDrag = { row: box, y: e.clientY, top: box.scrollTop, moved: false, v: true };
});
window.addEventListener('pointermove', e => {
  if (!rowDrag) return;
  const d = rowDrag.v ? e.clientY - rowDrag.y : e.clientX - rowDrag.x;
  if (!rowDrag.moved && Math.abs(d) > 6) { rowDrag.moved = true; rowDrag.row.classList.add('dragging'); }
  if (rowDrag.moved) { if (rowDrag.v) rowDrag.row.scrollTop = rowDrag.top - d; else rowDrag.row.scrollLeft = rowDrag.left - d; }
});
const pointerEnd = () => {
  pointerDown = false; lastPointer = performance.now();
  if (rowDrag?.moved) { dragJustEnded = true; rowDrag.row.classList.remove('dragging'); setTimeout(() => { dragJustEnded = false; }, 60); }
  rowDrag = null;
};
window.addEventListener('pointerup', pointerEnd);
window.addEventListener('pointercancel', pointerEnd);
app.addEventListener('click', e => {
  if (dragJustEnded) return;
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  act(el);
});
app.addEventListener('input', e => {
  // Only the label changes while dragging, so the slider isn't redrawn under your finger
  if (e.target.id === 'launder' && ui.modal?.type === 'launder') {
    const v = ui.modal.amount = Number(e.target.value), h = G.launderHeatFor(s, v);
    document.getElementById('launder-val').textContent = money(v);
    document.getElementById('launder-got').textContent = money(v * (1 - G.launderFee(s)));
    const w = document.getElementById('launder-warn');
    w.textContent = h ? `looks off: heat +${h}` : 'looks normal'; w.className = h ? 'bad' : 'good';
    lastPointer = performance.now();
  }
});
app.addEventListener('wheel', e => {
  const row = e.target.closest('.catalog, .dcats');
  if (row && Math.abs(e.deltaY) > Math.abs(e.deltaX) && row.scrollWidth > row.clientWidth) { row.scrollLeft += e.deltaY; e.preventDefault(); }
}, { passive: false });

// ---------- The clock ----------
// vt is the game's "now": the real time, or faster with ?speed. Big jumps (the app was closed or hidden)
// are played forward quietly and summed up in "While you were away".
let vt = Math.max(Date.now(), s.last || 0);
const snapshot = () => ({ clean: s.clean, dirty: s.dirty, heat: s.heat, rep: s.rep, level: s.level, balance: s.balance,
  sales: s.stats.totalSales, bags: s.stats.totalBags, served: s.stats.served || 0, missed: s.stats.missed || 0,
  washed: s.stats.totalLaundered || 0, tax: s.stats.taxPaid || 0, orders: s.stats.orders || 0 });
function catchUp(to) {
  const from = s.last, before = snapshot();
  G.advance(s, to);
  if (to - from >= 10 * MIN) {
    if (ui.modal && !['levelup', 'offer'].includes(ui.modal.type)) ui.modal = null;
    const data = { from, to, before, after: snapshot(), skipped: to - from > CFG.maxCatchUpDays * DAY };
    if (!ui.modal) ui.modal = { type: 'away', data };
  }
  save();
  render(true);
}

let lastFrame = performance.now(), uiAcc = 0, saveAcc = 0;
let heard = null;
function soundTick() {
  const done = s.machines.filter(m => m.job && s.clock >= m.job.start + m.job.dur).length;
  const now2 = { served: s.today.served, door: s.door.length, done, level: s.level, heat: s.heat, orders: s.orders.length };
  if (heard) {
    if (now2.served > heard.served) SFX.sfx.till();
    if (now2.done > heard.done) SFX.sfx.timer();
    if (now2.door > heard.door) SFX.sfx.knock();
    if (now2.orders > heard.orders) SFX.sfx.bell();
    if (now2.level > heard.level) SFX.sfx.level();
    if (now2.heat >= 60 && heard.heat < 60) SFX.sfx.siren();
  }
  heard = now2;
  SFX.setHum(ui.room === 'back' && G.isNight(s.clock) && !document.hidden);
}
document.addEventListener('pointerdown', () => SFX.unlock(), { passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) SFX.setHum(false); });
function frame(now) {
  const real = Math.min(1, (now - lastFrame) / 1000);
  lastFrame = now;
  vt = Math.max(vt + real * SPEED * 1000, Date.now());
  if (vt - s.last > 2 * MIN * SPEED) catchUp(vt);
  else G.advance(s, vt, { live: true });
  uiAcc += real; saveAcc += real;
  // Redraw the screens once a second (not while a finger is down, so taps never land on a redrawn button)
  if (uiAcc >= 1) soundTick();
  if (uiAcc >= 1 && !pointerDown && !touching && !rowDrag && now - lastPointer > 700) { uiAcc = 0; render(); }
  if (saveAcc >= 5) { saveAcc = 0; save(); }
  world.frame(s);
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);

catchUp(vt);
if (loadFailed) { ui.modal = { type: 'loadfail' }; render(true); }
render(true);
requestAnimationFrame(frame);

// ---------- On Android (the Capacitor app) ----------
// The back button closes whatever is open, one layer at a time, then goes back to the shop from the back room,
// and only then sends the app to the background (it keeps running; the game catches up when you return).
// Leaving or backgrounding the app saves first.
const NativeApp = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.App : null;
const Notes = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.LocalNotifications : null;
// Phone notifications, set when the app goes to the background and cleared when it comes back: the kitchen done,
// food about to spoil, the back room's cooks done, the back door opening, a bank payment due.
function askNotify() { Notes?.requestPermissions?.().catch(() => {}); }
async function scheduleNotes() {
  if (!Notes || !settings.notify) return;
  try {
    const perm = await Notes.checkPermissions(); if (perm.display !== 'granted') return;
    const now = Date.now(), soon = now + 60 * 1000, list = [];
    const at = (id, when, title, body) => { if (when > soon && when < now + 3 * DAY) list.push({ id, title, body, schedule: { at: new Date(when), allowWhileIdle: true } }); };
    // The kitchen, in every shop
    let lastDone = 0, firstSpoil = Infinity, n = 0;
    G.eachShop(s, () => s.machines.forEach(m => { if (!m.job) return; n++; const done = m.job.start + m.job.dur; lastDone = Math.max(lastDone, done); if (!s.crew.baker) firstSpoil = Math.min(firstSpoil, done + G.spoilMs(s, m.job.item) - 10 * MIN); }));
    if (n) at(1, lastDone, '🍞 The kitchen is done', `${n} batch${n === 1 ? ' is' : 'es are'} ready to go on the counters.`);
    if (firstSpoil < Infinity) at(2, firstSpoil, '⚠️ Food is about to spoil', 'Something has been sitting done in a machine. Collect it in the next 10 minutes.');
    if (s.labUnlocked) {
      let labDone = 0; G.eachShop(s, () => s.lab.forEach(m => { if (m.job) labDone = Math.max(labDone, m.job.start + m.job.dur); }));
      if (labDone && !s.crew.cook) at(3, labDone, '🧪 The back room is done', 'The cooks are finished. Bag them up before the door opens.');
      const d = new Date(now); d.setHours(CFG.nightStart, 0, 0, 0); if (d.getTime() <= now) d.setDate(d.getDate() + 1);
      if (Object.values(s.bags).some(v => v > 0) || !s.crew.dealer) at(4, d.getTime(), '🚪 The back door opens', 'Buyers start coming round the back.');
    }
    if (s.balance > 0) at(5, G.nextPaymentAt(s) - 12 * HOUR, '🏦 A payment is due', `${money(G.nextDue(s))} goes to the bank at 6am.`);
    const pending = await Notes.getPending(); if (pending.notifications?.length) await Notes.cancel({ notifications: pending.notifications.map(x => ({ id: x.id })) });
    if (list.length) await Notes.schedule({ notifications: list });
  } catch { /* notifications unavailable */ }
}
async function clearNotes() { try { const p = await Notes?.getPending(); if (p?.notifications?.length) await Notes.cancel({ notifications: p.notifications.map(x => ({ id: x.id })) }); } catch { /* ignore */ } }
if (NativeApp) {
  document.documentElement.classList.add('native');
  NativeApp.addListener('backButton', () => {
    if (ui.confirm) return act({ dataset: { act: 'confirm-no' } });
    if (ui.modal) return act({ dataset: { act: 'close' } });
    if (ui.design) return act({ dataset: { act: D.cartInfo()?.n ? 'd-cancel' : 'd-done' } });
    if (ui.tab) return act({ dataset: { act: 'dock-close' } });
    if (ui.panel) return act({ dataset: { act: 'panel', id: ui.panel } });
    if (ui.room === 'back') return act({ dataset: { act: 'room' } });
    save(); NativeApp.minimizeApp();
  });
  NativeApp.addListener('pause', () => { save(); scheduleNotes(); });
  NativeApp.addListener('resume', () => { vt = Math.max(vt, Date.now()); clearNotes(); });
  if (settings.notify) setTimeout(askNotify, 4000); // ask once, a moment after the game opens
}

// Debug hooks for testing in the browser console: __game.skip(3) plays three hours forward.
window.__game = { get s() { return s; }, G, render, save, world, ui, skip(hours) { vt += hours * HOUR; } };
