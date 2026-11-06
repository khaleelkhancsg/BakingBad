// Screens, input and the main loop. The game runs on the real clock: the shop is always open, the back door
// opens in the evening, and when you come back the game plays forward the time you were away.
import * as G from './game.js';
import { CFG, ITEMS, INGREDIENTS, PRICE_LEVELS, UPGRADES, CREW, FEATURES, MACHINES, LAB_MACHINES, PRODUCTS, PROPERTY,
         CAPS, capAt, nextCap, CAMPAIGNS, GROUP_TEXT, CUTS, purityMult, TIERS, CORNERS, BRANCHES, BRANCH_MAX, FAMILIES } from './data.js';
import { createScene } from './scene.js';
import * as D from './design.js';

const params = new URLSearchParams(location.search);
// ?save=name keeps a separate save slot; ?speed=60 runs the clock 60x faster (both for testing)
const KEY = 'bakingbad.save' + (params.get('save') ? '.' + params.get('save') : '');
const SPEED = Math.max(1, Number(params.get('speed')) || 1);
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const app = document.getElementById('app');
const toastBox = document.getElementById('toasts');
const ui = { modal: null, design: null, tab: 'kitchen', room: 'shop', dockMin: false };
let s = load() || G.newGame();

const world = createScene(document.getElementById('scene'), document.getElementById('overlay'), {
  onPick: info => {
    if (info.act === 'design') { if (ui.design) designTap(info); return; }
    if (ui.design || ui.modal) return;
    act({ dataset: info });
  },
});

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    return d && d.v ? D.ensureDesign(G.migrate(d)) : null;
  } catch { return null; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage full or blocked */ } }

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
const doorOpen = t => s.labUnlocked && G.isNight(t) && !G.sealed(s, t);
const unseenReport = () => s.reports.length && s.reports.at(-1).day > (s.seenReportDay || 0);

function hudHTML() {
  const t = s.clock, d = G.daysToPayment(s);
  const due = s.won
    ? `<span class="badge ok">🏦 Debt cleared</span>`
    : `<span class="badge ${d <= 2 ? 'warn' : ''}" data-act="tab" data-id="bank" title="Next bank payment">🏦 ${money(G.nextDue(s))} · ${d}d</span>`;
  const heatCls = s.heat >= 60 ? 'hot' : s.heat >= 35 ? 'warm' : '';
  const showDirty = s.labUnlocked || s.dirty > 0;
  const sub = `${period(t)}${doorOpen(t) ? ' · back door open' : ''}`;
  const camp = G.activeCampaigns(s);
  return `<header class="hud">
    <div class="hud-row">
      <div class="badge daybadge" data-act="info" data-kind="clock" data-id="clock"><b>${hhmm(t)} · Day ${G.dayIndex(s, t) + 1}</b><small>${sub}</small></div>
      <div class="hud-right">${due}
        ${s.labUnlocked ? `<button class="badge roombtn ${ui.room === 'back' ? 'night' : ''}" data-act="room">${ui.room === 'back' ? '☀️ Bakery' : '🌙 Back room'}${s.door.length && ui.room !== 'back' ? ` <b class="dot">${s.door.length}</b>` : ''}</button>` : ''}
      </div>
    </div>
    <div class="hud-row stats">
      <span class="badge cash" title="Clean cash">💷 ${money(s.clean)}</span>
      ${showDirty ? `<span class="badge cash dirty" title="Dirty cash">💜 ${money(s.dirty)}</span>` : ''}
      ${showDirty ? `<span class="badge heat ${heatCls}" data-act="info" data-kind="heat" data-id="heat" title="Police heat">🚨 <span class="meter"><i style="width:${s.heat}%"></i></span> ${Math.round(s.heat)}</span>` : ''}
      <span class="badge" title="Popularity" data-act="info" data-kind="pop" data-id="pop">⭐ ${Math.round(s.rep)}</span>
      <span class="badge lvl" data-act="info" data-kind="level" data-id="xp" title="Level and XP">🎖️ Lv ${s.level}<span class="meter xp"><i style="width:${s.level >= CFG.maxLevel ? 100 : Math.min(100, s.xp / G.xpToNext(s.level) * 100)}%"></i></span></span>
      ${s.event ? `<span class="badge" data-act="info" data-kind="event" data-id="event" title="Today">${[...s.event.text][0]}</span>` : ''}
      ${G.scandal(s, t) ? `<span class="badge warn" title="Scandal: fewer customers">📰 ${mins((s.scandalUntil - t) / MIN)}</span>` : ''}
      ${G.sealed(s, t) ? `<span class="badge warn" title="The back room is sealed">🚧 ${mins((s.sealedUntil - t) / MIN)}</span>` : ''}
      ${s.arrears > 0 && !s.won ? `<span class="badge warn" data-act="tab" data-id="bank" title="Behind with the bank">🔨 ${money(s.arrears)}</span>` : ''}
      ${camp.length ? `<span class="badge" data-act="tab" data-id="marketing" title="Marketing running">📣 ${camp.map(c => CAMPAIGNS[c.id].emoji).join('')}</span>` : ''}
      ${unseenReport() ? `<span class="badge ok" data-act="report" title="Yesterday's report">📋 Report</span>` : ''}
    </div>
  </header>`;
}

// ---------- Dock pieces ----------
const ibtn = (kind, id) => `<button class="ibtn" data-act="info" data-kind="${kind}" data-id="${id}" aria-label="More info">i</button>`;
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

function suppliesTab() {
  const { cost } = stockUpNeeds();
  let cards = pcard(`<div class="ptop"><span class="em">🧺</span><div><b>Stock up</b><small>3 batches of all ${G.menuOf(s).length} things on sale</small></div></div>
    <div class="pbtns"><button class="small primary" data-act="stockup" ${!cost || s.clean < cost ? 'disabled' : ''}>${cost ? money2(cost) : 'All stocked'}</button></div>`, ibtn('stockup', 'x'), 'wide');
  cards += Object.entries(INGREDIENTS).filter(([, ing]) => G.unlocked(s, ing.level) || ing.level <= s.level + 10).map(([k, ing]) => {
    if (!G.unlocked(s, ing.level)) {
      return pcard(`<div class="ptop"><span class="em">${ing.emoji}</span><div><b>${ing.name}</b><small>for new recipes</small></div></div>${lockTag(ing.level)}`, ibtn('ing', k), 'locked');
    }
    const p = G.ingPrice(s, k), m = s.market[k];
    const tag = m >= 1.12 ? '<span class="up">▲</span>' : m <= 0.92 ? '<span class="down">▼</span>' : '';
    return pcard(`<div class="ptop"><span class="em">${ing.emoji}</span><div><b>${ing.name}</b><small>× ${s.inv[k]} · ${money2(p)} ${tag}</small></div></div>
      <div class="pbtns">${[5, 20, 50].map(n => `<button class="small" data-act="buy" data-id="${k}" data-n="${n}" ${s.clean < p * n ? 'disabled' : ''}>+${n}</button>`).join('')}</div>`, ibtn('ing', k));
  }).join('');
  return { cards, hint: `Today's market (prices change at 6am). ▲ dear, ▼ cheap. Cooking buys what's missing for you.` };
}

function kitchenTab() {
  const ready = s.machines.filter(m => machineState(m) === 'ready').length;
  const idle = s.machines.map((m, i) => [m, i]).filter(([m]) => machineState(m) === 'idle' && m.last).length;
  let cards = pcard(`<div class="ptop"><span class="em">⚡</span><div><b>Quick jobs</b><small>${ready} ready · ${idle} idle</small></div></div>
    <div class="pbtns col"><button class="small primary" data-act="collectall" ${ready ? '' : 'disabled'}>Collect all (${ready})</button>
    <button class="small" data-act="restartall" ${idle ? '' : 'disabled'}>🔁 Cook again (${idle})</button></div>`, ibtn('quick', 'x'), 'wide');
  cards += Object.entries(MACHINES).filter(([, M]) => M.level <= s.level + 8).map(([type, M]) => {
    const list = s.machines.map((m, i) => [m, i]).filter(([m]) => m.type === type);
    const n = list.length, block = G.machineBlock(s, type), open = G.unlocked(s, M.level);
    const known = s.recipes.filter(id => ITEMS[id].machine === type).length, total = G.recipesFor(type).length;
    const states = list.map(([m]) => machineState(m));
    const status = n ? [['busy', 'cooking'], ['ready', 'ready'], ['idle', 'idle'], ['broken', 'broken']].map(([k, w]) => { const c = states.filter(x => x === k).length; return c ? `${c} ${w}` : ''; }).filter(Boolean).join(' · ') : '';
    const buy = block
      ? `<div class="lockline">${block.text}</div>`
      : `<button class="small" data-act="buymachine" data-id="${type}" ${s.clean < G.machinePrice(s, type) ? 'disabled' : ''}>+1 · ${money(G.machinePrice(s, type))}</button>`;
    return pcard(`<div class="ptop"><span class="em">${M.emoji}</span><div><b>${M.name}</b><small>${open ? `× ${n} · ${known}/${total} recipes${status ? `<br>${status}` : ''}` : 'not yet'}</small></div></div>
      <div class="pbtns col">${n ? `<button class="small primary" data-act="machine" data-kind="day" data-idx="${list[0][1]}">Menu</button>` : ''}${open || block ? buy : ''}</div>`,
      ibtn('machine', type), `wide ${open ? '' : 'locked'}`);
  }).join('');
  const spots = G.freeSpots(s).length;
  return { cards, hint: `${s.machines.length} machines, room for ${spots} more. Tap a machine in the shop to cook; tap ✓ to collect.` };
}

function menuTab() {
  const menu = G.menuOf(s), slots = G.menuSlots(s), nx = nextCap(CAPS.menu, s.level);
  const ordered = [...menu, ...s.recipes.filter(id => !menu.includes(id))];
  const cards = ordered.map(id => {
    const r = ITEMS[id], lvl = s.priceLevel[id], on = menu.includes(id);
    return pcard(`<div class="ptop"><span class="em">${r.emoji}</span><div><b>${r.name}</b><small>${money2(G.itemPrice(s, id))} · ${s.display[id] || 0} in the case</small></div></div>
      <button class="small menutoggle ${on ? 'on' : ''}" data-act="menu-toggle" data-id="${id}">${on ? '✓ On sale' : '+ Sell'}</button>
      <div class="seg">${Object.entries(PRICE_LEVELS).map(([k, L]) =>
        `<button class="${lvl === k ? 'on' : ''}" data-act="price" data-id="${id}" data-lvl="${k}">${L.label}</button>`).join('')}</div>`, ibtn('recipe', id), `wide ${on ? '' : 'off'}`);
  }).join('');
  return { cards, hint: `On sale: ${menu.length} of ${slots}${nx ? ` (level ${nx.level}: ${nx.amount})` : ''}. More things on sale bring more customers.` };
}

function shopTab() {
  const list = UPGRADES.filter(u => G.upgradeAvailable(s, u) && u.level <= s.level + 12);
  list.sort((a, b) => (G.unlocked(s, b.level) - G.unlocked(s, a.level)) || (a.level - b.level));
  const cards = list.map(u => {
    const dirty = u.cash === 'dirty', open = G.unlocked(s, u.level);
    const btn = open
      ? `<div class="pbtns"><button class="small ${dirty ? 'violet' : ''}" data-act="upgrade" data-id="${u.id}" ${s[u.cash] >= u.cost ? '' : 'disabled'}>${dirty ? '💜' : '💷'} ${money(u.cost)}</button></div>`
      : lockTag(u.level);
    return pcard(`<div class="ptop"><span class="em">${u.emoji || '🛠️'}</span><div><b>${u.name}</b><small>${u.desc}</small></div></div>${btn}`, ibtn('upgrade', u.id), `wide ${u.lab ? 'night' : ''} ${open ? '' : 'locked'}`);
  }).join('') || pcard('<b>All bought</b><small>Nothing left in the shop for now.</small>');
  const owned = UPGRADES.filter(u => G.has(s, u.id)).length;
  return { cards, hint: `Permanent upgrades.${owned ? ` You own ${owned}.` : ''}` };
}

function crewTab() {
  const cards = Object.entries(CREW).filter(([, c]) => (!c.lab || s.labUnlocked) && c.level <= s.level + 15).map(([role, c]) => {
    const open = G.unlocked(s, role === 'pr' ? 1 : c.level);
    const pay = role === 'dealer' ? `keeps ${CFG.dealerCut * 100}%` : `${c.cash === 'dirty' ? '💜' : '💷'} ${money(c.wage)}/day`;
    const btn = !G.unlocked(s, c.level) ? lockTag(c.level)
      : `<div class="pbtns">${s.crew[role] ? `<button class="small danger" data-act="fire" data-id="${role}">Let go</button>` : `<button class="small" data-act="hire" data-id="${role}">Hire</button>`}</div>`;
    return pcard(`<div class="ptop"><span class="em">${c.emoji}</span><div><b>${c.name}</b><small>${c.role} · ${pay}</small></div></div>${btn}`,
      ibtn('crew', role), `${c.shift === 'night' ? 'night' : ''} ${open ? '' : 'locked'} ${s.crew[role] ? 'hired' : ''}`);
  }).join('');
  return { cards, hint: `Crew work while you're away. Wages come out at 6am: day crew from clean cash, night crew from dirty first. Today: ${money(G.crewWages(s, 'day'))} + 💜 ${money(G.crewWages(s, 'night'))}.` };
}

function backTab() {
  const t = s.clock;
  let cards = '';
  // The door
  for (const b of s.door) {
    const p = PRODUCTS[b.product], left = Math.max(0, (b.arrive + b.patience - t) / 1000);
    cards += pcard(`<div class="ptop"><span class="em">${b.courier ? '📦' : '👤'}</span><div><b>${b.name}${b.hint ? ' 📷' : ''}</b><small>${p.emoji} ${p.name} ×${b.want} · ${secs(left)}</small></div></div>
      <div class="pbtns"><button class="small violet" data-act="buyer" data-id="${b.id}">Answer</button></div>`, '', `night ${b.hint ? 'flagged' : ''}`);
  }
  // Street reputation
  const stCls = s.street < 25 ? 'hot' : s.street < 45 ? 'warm' : '';
  cards += pcard(`<div class="ptop"><span class="em">🗣️</span><div><b>Street rep ${Math.round(s.street)}</b><small>≈ ${Math.round(G.buyersPerHour(s))} buyers an hour after dark</small></div></div>
    <span class="heat pop ${stCls}"><span class="meter wide"><i style="width:${s.street}%"></i></span></span>`, ibtn('street', 'x'), 'night');
  // Products and kits (what you can make, plus the next few)
  const left = G.kitsLeftToday(s), kitNx = nextCap(CAPS.kits, s.level);
  const prods = Object.entries(PRODUCTS).filter(([id, p]) => G.unlocked(s, p.level) || (s.bags[id] || 0) > 0);
  prods.sort((a, b) => ((s.bags[b[0]] || 0) > 0) - ((s.bags[a[0]] || 0) > 0) || b[1].level - a[1].level);
  const nextLocked = Object.entries(PRODUCTS).filter(([, p]) => !G.unlocked(s, p.level)).sort((a, b) => a[1].level - b[1].level).slice(0, 3);
  for (const [id, p] of [...prods, ...nextLocked]) {
    const open = G.unlocked(s, p.level), have = s.bags[id] || 0, cut = s.cut[id] || 'none';
    const kitBtns = !left ? `<div class="lockline">${kitNx ? `Dez sells ${kitNx.amount} kits a day from level ${kitNx.level}` : 'No more kits today'}</div>`
      : `<button class="small violet" data-act="kit" data-id="dirty" data-type="${id}" ${s.dirty < p.kit ? 'disabled' : ''}>💜 Kit<small>${money(p.kit)}</small></button>
         <button class="small" data-act="kit" data-id="clean" data-type="${id}" ${s.clean < p.kit ? 'disabled' : ''}>💷 Kit<small>${money(p.kit)}</small></button>`;
    cards += pcard(`<div class="ptop"><span class="em">${p.emoji}</span><div><b>${p.name}</b><small>${open || have ? `${have} bags${have ? ` · ${pct(s.purity[id] ?? 0.6)} pure` : ''} · ${s.kits[id] || 0} kits<br>${money(nowPrice(id))} a bag` : `${FAMILIES[p.family].name} · ${money(p.price)} a bag`}</small></div></div>
      ${!open ? lockTag(p.level) : `<div class="seg">${Object.entries(CUTS).map(([k, c]) => `<button class="${cut === k ? 'on' : ''}" data-act="cut" data-id="${id}" data-cut="${k}">${c.label}</button>`).join('')}</div>
      <div class="pbtns">${kitBtns}<button class="small" data-act="dez" data-id="${id}" ${have ? '' : 'disabled'}>Dez<small>½ price</small></button></div>`}`, ibtn('product', id), `wide night ${open ? '' : 'locked'}`);
  }
  // Back-room machines
  for (const [type, M] of Object.entries(LAB_MACHINES)) {
    if (M.level > s.level + 10) continue;
    const list = s.lab.map((m, i) => [m, i]).filter(([m]) => m.type === type), block = G.machineBlock(s, type, true);
    const cash = G.machineCash(type, true), price = G.machinePrice(s, type, true);
    cards += pcard(`<div class="ptop"><span class="em">${M.emoji}</span><div><b>${M.name}</b><small>× ${list.length}${list.length ? ` · tier ${list.map(([m]) => m.tier || 0).join('/')}` : ''}</small></div></div>
      <div class="pbtns col">${list.length ? `<button class="small violet" data-act="machine" data-kind="night" data-idx="${list[0][1]}">Use</button>` : ''}
      ${block ? `<div class="lockline">${block.text}</div>` : `<button class="small" data-act="buylab" data-id="${type}" ${s[cash] < price ? 'disabled' : ''}>+1 · ${cash === 'dirty' ? '💜' : '💷'} ${money(price)}</button>`}</div>`,
      ibtn('labmachine', type), `night ${G.unlocked(s, M.level) ? '' : 'locked'}`);
  }
  // Cash and heat
  const safe = G.launderLeft(s);
  cards += pcard(`<div class="ptop"><span class="em">🧾</span><div><b>Launder</b><small>${money(safe)} looks normal today</small></div></div>
    <div class="pbtns"><button class="small violet" data-act="launder-open" ${s.dirty >= 1 ? '' : 'disabled'}>Through the till</button></div>`, ibtn('launder', 'x'), 'night');
  const heatCls = s.heat >= 60 ? 'hot' : s.heat >= 35 ? 'warm' : '';
  cards += pcard(`<div class="ptop"><span class="em">🚨</span><div><b>Heat ${Math.round(s.heat)}</b><small>undercover ≈ ${Math.round(G.copChance(s) * 100)}%</small></div></div>
    <span class="heat ${heatCls}"><span class="meter wide"><i style="width:${s.heat}%"></i></span></span>`, ibtn('heat', 'heat'), 'night');
  cards += pcard(`<div class="ptop"><span class="em">👮</span><div><b>Sergeant</b><small>Heat -${CFG.bribeHeat}, once a day</small></div></div>
    <div class="pbtns"><button class="small violet" data-act="bribe" ${s.dirty < CFG.bribeCost || s.today.bribe ? 'disabled' : ''}>💜 ${money(CFG.bribeCost)}</button></div>`, ibtn('bribe', 'x'), 'night');
  if (Object.keys(s.corners).length) cards += pcard(`<div class="ptop"><span class="em">🗺️</span><div><b>Turf</b><small>${Object.keys(s.corners).length} corners · ${Object.values(s.corners).reduce((a, k) => a + k.stock, 0)} bags out</small></div></div>
    <div class="pbtns"><button class="small violet" data-act="tab" data-id="turf">Corners</button></div>`, '', 'night');
  cards += FEATURES.filter(f => ['haggle', 'courier', 'rivals'].includes(f.id) && !G.unlocked(s, f.level)).map(f => pcard(`<div class="ptop"><span class="em">${{ haggle: '🤝', courier: '🚚', rivals: '👥' }[f.id]}</span><div><b>${f.name}</b><small>coming up</small></div></div>
      ${lockTag(f.level)}`, ibtn('feature', f.id), 'night locked')).join('');
  const hint = G.sealed(s, t) ? `🚧 Police tape: sealed for another ${mins((s.sealedUntil - t) / MIN)}.`
    : doorOpen(t) ? `The back door is open until 7am. ${s.door.length ? `${s.door.length} waiting.` : 'Nobody at the door right now.'}`
    : `Cook any time. Buyers come to the back door from 6pm to 7am (opens in ${mins((G.nextNightStart(t) - t) / MIN)}).`;
  return { cards, hint };
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

function empireTab() {
  let cards = '';
  for (const [id, b] of Object.entries(BRANCHES)) {
    if (b.level > s.level + 15 && !s.branches[id]) continue;
    const lvl = G.branchLevel(s, id), open = G.unlocked(s, b.level), cost = G.branchCost(id, lvl);
    cards += pcard(`<div class="ptop"><span class="em">${b.emoji}</span><div><b>${b.name}</b><small>${lvl ? `Level ${lvl}/${BRANCH_MAX} · ${money(b.income * lvl)} a day` : `${money(b.income)} a day per level`}</small></div></div>
      ${!open ? lockTag(b.level) : lvl >= BRANCH_MAX ? '<span class="lock good">✓ Biggest it gets</span>'
        : `<div class="pbtns"><button class="small primary" data-act="branch" data-id="${id}" ${s.clean < cost ? 'disabled' : ''}>${lvl ? 'Grow' : 'Open'} · ${money(cost)}</button></div>`}`,
      ibtn('branch', id), `wide ${open ? '' : 'locked'} ${lvl ? 'hired' : ''}`);
  }
  for (const [id, p] of Object.entries(PROPERTY)) {
    if (p.level > s.level + 20 && !s.property[id]) continue;
    const open = G.unlocked(s, p.level), owned = s.property[id];
    cards += pcard(`<div class="ptop"><span class="em">${p.emoji}</span><div><b>${p.name}</b><small>${p.desc}</small></div></div>
      ${owned ? '<span class="lock good">✓ Yours</span>' : !open ? lockTag(p.level) : `<div class="pbtns"><button class="small primary" data-act="property" data-id="${id}" ${s.clean < p.price ? 'disabled' : ''}>${money(p.price)}</button></div>`}`,
      ibtn('property', id), `wide ${open ? '' : 'locked'} ${owned ? 'hired' : ''}`);
  }
  return { cards, hint: `Branches and property pay every morning at 6am. Now: ${money(G.branchIncome(s) + G.eff(s, 'income'))} a day.` };
}

function marketingTab() {
  const popCls = s.rep < 30 ? 'hot' : s.rep < 55 ? 'warm' : '';
  let cards = pcard(`<div class="ptop"><span class="em">⭐</span><div><b>Popularity ${Math.round(s.rep)}</b><small>${G.scandal(s, s.clock) ? `scandal: ${mins((s.scandalUntil - s.clock) / MIN)} more` : `≈ ${Math.round(G.customersPerHour(s, s.clock))} customers this hour`}</small></div></div>
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
  cards += pcard(`<b>Daily reports</b><small>${s.reports.length ? `Last: ${dateStr(s.reports.at(-1).day)}` : 'The first comes at 6am'}</small>
    <div class="pbtns"><button class="small" data-act="report" ${s.reports.length ? '' : 'disabled'}>📋 Read</button></div>`, '');
  cards += pcard(`<b>Start over</b><div class="pbtns"><button class="small danger" data-act="restart">New game</button></div>`, ibtn('bank', 'restart'));
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
  for (const [, p] of Object.entries(PROPERTY)) if (p.level === L) out.push(`${p.emoji} ${p.name} (Empire)`);
  for (const [, c] of Object.entries(CORNERS)) if (c.level === L) out.push(`${c.emoji} ${c.name} (Turf)`);
  for (const [, b] of Object.entries(BRANCHES)) if (b.level === L) out.push(`${b.emoji} A branch in ${b.name} (Empire)`);
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
    return T(`${p.emoji} ${p.name}`, line('Family', `${FAMILIES[p.family].emoji} ${FAMILIES[p.family].name}`) + line('Kit', money(p.kit)) + line('Cooks in', mins(p.minutes))
      + line('List price', `${money(p.price)} a bag at 60% purity`) + (s.bags[id] ? line('Yours', `${s.bags[id]} bags at ${pct(s.purity[id] ?? 0.6)}: ${money(nowPrice(id))} each`) : '')
      + `<table class="itable"><tr><th>Cut</th><th>Bags</th><th>Purity</th><th>Each</th><th>Profit</th></tr>${rows}</table>`
      + (p.ing ? line('Also uses', Object.entries(p.ing).map(([k, q]) => `${q} ${INGREDIENTS[k].name.toLowerCase()}`).join(', ')) : '')
      + line('Heat a cook', `+${p.heat}`) + line('Undercover buyers', `≈ ${Math.round(G.copChance(s, id) * 100)}% now`)
      + line('Made on', `${LAB_MACHINES[p.machine].emoji} ${LAB_MACHINES[p.machine].name}`) + line('Unlocks at', `level ${p.level}`)
      + line('You have', `${s.bags[id] || 0} bags, ${s.kits[id] || 0} kits`)
      + '<p class="mute">Purity comes from the machine\'s tier, back-room upgrades, Doc and Pip. Cutting makes more bags but each is worth less, and buyers notice: weak product hurts your street rep. Pricier products have fewer buyers and draw more attention.</p>');
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
  if (kind === 'branch') {
    const b = BRANCHES[id], lvl = G.branchLevel(s, id);
    return T(`${b.emoji} Rosa's, ${b.name}`, line('Pays', `${money(b.income)} a day per level`) + line('Level', `${lvl} / ${BRANCH_MAX}`)
      + (lvl < BRANCH_MAX ? line(lvl ? 'Next level costs' : 'Opening costs', money(G.branchCost(id, lvl))) : '') + line('Unlocks at', `level ${b.level}`)
      + '<p class="mute">Branches run themselves and pay clean cash every morning at 6am.</p>');
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
    return T('🚨 Heat', line('Now', `${Math.round(s.heat)} / 100`) + line('Undercover buyers', `≈ ${Math.round(G.copChance(s) * 100)}%`)
      + line('Raids from', `${CFG.raidAt} heat`) + line('Tax inspections from', `${CFG.inspectAt} heat`)
      + line('Cools', `${CFG.heatDecayPerHour * (s.crew.fixer ? 2 : 1)} an hour, more after ${CFG.lieLowAfterHours}h without trade`)
      + `<p><b>What raises it</b><br><small>Each cook, each bag sold, laundering too much, serving undercover officers (+${CFG.copServedHeat}), Jay getting caught.</small></p>`
      + `<p class="mute">Police check at 6am, going by how hot it got the day before. At 100, or if a raid finds product, you're <b>busted</b>: fined, everything seized, the back room sealed for ${CFG.bustSealHours / 24} days, crew lost, and a scandal in the papers.</p>`);
  }
  if (kind === 'bribe') return T('👮 A friendly sergeant', line('Cost', `💜 ${money(CFG.bribeCost)}`) + line('Heat', `-${CFG.bribeHeat}`) + line('How often', 'once a day')
    + line('Chance it backfires', `${CFG.bribeBackfire * 100}% (heat +${CFG.bribeBackfireHeat})`));
  if (kind === 'launder') {
    return T('🧾 Laundering', `<p>Pass dirty cash off as bakery takings. Up to ${Math.round(G.launderRatio(s) * 100)}% of today's real takings looks normal; more than that adds heat.</p>`
      + line("Today's takings", money(s.today.sales)) + line('Laundered today', money(s.today.laundered)) + line('Still safe today', money(G.launderLeft(s)), 'good')
      + '<p class="mute">The day resets at 6am. Viv the accountant launders the safe amount for you every morning.</p>');
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
  if (kind === 'bank' && id === 'restart') return T('Start over', '<p>Starts a brand-new game. This bakery, its money and its design are lost.</p>');
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
  if (kind === 'exp') {
    const e = D.EXPANSIONS[id];
    const what = e.cells ? `${e.cells} squares to decorate` : e.spots ? `room for ${e.spots} more machines` : `room for ${e.labSpots} more back-room machines`;
    return T(`➕ ${e.name}`, `<p>${e.desc}</p>` + line('Price', money(e.price)) + line('Gives', what) + line('Unlocks at', `level ${e.level}`)
      + (e.needs ? line('Needs', D.EXPANSIONS[e.needs].name) : '') + line('Yours', s.design.expansions[id] ? 'yes' : 'no'));
  }
  return T('Info', '<p>Nothing more to say about this one.</p>');
}

// ---------- The dock ----------
function tabsList() {
  const tabs = [['kitchen', '🍳 Kitchen'], ['menu', '📋 Menu'], ['supplies', '🧺 Supplies'], ['shop', '🛠️ Shop'], ['crew', '👥 Crew']];
  if (s.labUnlocked) tabs.push(['back', `💜 Back room${s.door.length ? ` (${s.door.length})` : ''}`]);
  if (s.labUnlocked && s.level >= 6) tabs.push(['turf', '🗺️ Turf']);
  tabs.push(['marketing', '📣 Marketing'], ['design', '🎨 Design']);
  if (s.level >= 15) tabs.push(['empire', '🏙️ Empire']);
  tabs.push(['bank', '🏦 Bank']);
  return tabs;
}
function dockHTML() {
  const tabs = tabsList();
  if (!tabs.some(t => t[0] === ui.tab)) ui.tab = 'kitchen';
  const { cards, hint } = { supplies: suppliesTab, kitchen: kitchenTab, menu: menuTab, shop: shopTab, crew: crewTab, back: backTab, turf: turfTab, empire: empireTab, marketing: marketingTab, bank: bankTab }[ui.tab]();
  const intro = !s.introSeen ? `<div class="floatcard">
      <h2>Aunt Rosa's stall</h2>
      <p>Aunt Rosa ran this bakery stall for thirty years. She left it to you, along with <b>${money(CFG.debtTotal)}</b> she owed the bank, at <b>${money(CFG.weekly)}</b> a week from two weeks today.</p>
      <p>The game runs on the real clock and never closes. Tap a machine to start a batch, come back when it's done to put it in the case, and customers buy from the case all day, even while you're away. Long recipes are for when you go out; don't leave food sitting in a machine or it spoils.</p>
      <button class="small" data-act="intro-ok">Got it</button></div>`
    : s.event && ui.tab === 'supplies' ? `<div class="floatbanner">${s.event.text}</div>` : '';
  return intro + `<div class="designbar plandock ${ui.room === 'back' ? 'night' : ''} ${ui.dockMin ? 'min' : ''}">
    <div class="drow"><div class="dcats">${tabs.map(([id, label]) => `<button class="small ${ui.tab === id ? 'on' : ''}" data-act="tab" data-id="${id}">${label}</button>`).join('')}</div>
      <button class="small" data-act="dockmin" aria-label="Hide or show the dock">${ui.dockMin ? '▴' : '▾'}</button></div>
    ${ui.dockMin ? '' : `<div class="dinfo"><span>${hint}</span></div>
    <div class="catalog cards" data-key="dock-${ui.tab}">${cards}</div>`}
  </div>`;
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
  else status = `<p class="mute">Pick something to make.</p>`;
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
        <div class="grow"><b>${r.name}</b><small>×${G.servingsFor(s, id, mc.tier || 0)} · ${mins(G.cookMs(s, id, mc.tier || 0) / MIN)} · ${money2(G.itemPrice(s, id))} each</small>
          <small>${ingText(r)}${known ? ` · stock for ${batches} · case ${s.display[id] || 0}/${G.trayCap(s, id)}` : ''}</small>${priceRow}</div>
        <div class="mright">${right}</div></div>`;
    }).join('');
  } else {
    rows = G.productsFor(mc.type).filter(id => PRODUCTS[id].level <= s.level + 10).map(id => {
      const p = PRODUCTS[id], open = G.unlocked(s, p.level), kits = s.kits[id] || 0;
      const right = !open ? `<span class="lock">🔒 Lv ${p.level}</span>`
        : `<button class="small violet" data-act="labcook" data-id="${id}" ${busy || mc.broken || G.sealed(s, s.clock) || (!kits && (!G.kitsLeftToday(s) || (s.dirty < p.kit && s.clean < p.kit))) ? 'disabled' : ''}>${kits ? 'Cook' : `Cook (kit ${money(p.kit)})`}</button>`;
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
      ${line('Rent and wages', '-' + money(t.rent + t.wages))}${t.nightWages ? line('Night crew', '-' + money(t.nightWages)) : ''}
      ${t.income ? line('Property income', money(t.income), 'good') : ''}${t.laundered ? line('Laundered', money(t.laundered)) : ''}
      ${t.interest ? line('Interest on arrears', '-' + money(t.interest), 'bad') : ''}${line('XP earned', `+${Math.round(t.xp)}`, 'good')}</div>
    ${night}${t.events.slice(-12).map(e => `<div class="card ${e.kind === 'bad' ? 'alert' : ''}">${e.text}</div>`).join('')}
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
  else if (m.type === 'machine') inner = machineModal(m);
  else if (m.type === 'buyer') inner = buyerModal(m);
  else if (m.type === 'report') inner = reportModal(m);
  else if (m.type === 'away') inner = awayModal(m);
  else if (m.type === 'launder') {
    const max = Math.floor(s.dirty), v = Math.min(max, m.amount ?? Math.min(max, G.launderLeft(s)));
    const h = G.launderHeatFor(s, v);
    inner = `<h2>🧾 Put dirty cash through the till</h2>
      <p class="mute">Today's real takings are ${money(s.today.sales)}. Another <b>${money(G.launderLeft(s))}</b> can go through today without it looking odd. More than that and people notice.</p>
      <input type="range" id="launder" min="0" max="${max}" step="1" value="${v}">
      <div class="line"><span>Launder <b id="launder-val">${money(v)}</b></span><span id="launder-warn" class="${h ? 'bad' : 'good'}">${h ? `looks off: heat +${h}` : 'looks normal'}</span></div>
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
  const sticky = m.type === 'levelup' || m.type === 'offer';
  return `<div class="modal-bg" data-act="${sticky ? 'noop' : 'close'}"><div class="modal ${night ? 'night' : ''}" data-act="noop">${inner}</div></div>`;
}

// ---------- Design mode ----------
const DESIGN_DEFAULT = { floor: 'mint', wall: 'stripes', decor: null, art: 'painting', expand: null };
const openDesign = () => { ui.design = { cat: 'floor', item: DESIGN_DEFAULT.floor, sel: null, moving: null }; ui.room = 'shop'; };

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
  const cats = [['floor', '🟫 Floor'], ['wall', '🧱 Walls'], ['decor', '🪴 Decor'], ['art', '🖼️ Wall art'], ['expand', '➕ Expand']];
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
  } else if (dv.cat === 'expand') {
    hint = 'Expansions add squares to decorate and room for more machines.';
    items = Object.entries(D.EXPANSIONS).map(([id, e]) => {
      const owned = s.design.expansions[id];
      const what = e.cells ? `${e.cells} squares` : e.spots ? `${e.spots} machine spots` : `${e.labSpots} back-room spots`;
      const btn = owned ? '<span class="good">✓ Yours</span>' : !D.levelOk(s, e) ? `<span class="lock">🔒 Lv ${e.level}</span>`
        : e.needs && !s.design.expansions[e.needs] ? `<span class="lock">needs ${D.EXPANSIONS[e.needs].name.toLowerCase()}</span>`
        : `<button class="small primary" data-act="d-buyexp" data-id="${id}" ${s.clean < e.price ? 'disabled' : ''}>${money(e.price)}</button>`;
      return `<div class="dexp ${owned ? 'owned' : ''}">${ibtn('exp', id)}<b>${e.name}</b><small>${what}</small>${btn}</div>`;
    }).join('');
  }
  return `<div class="designbar">
    <div class="drow"><div class="dcats">${cats.map(([id, label]) => `<button class="small ${dv.cat === id ? 'on' : ''}" data-act="d-cat" data-id="${id}">${label}</button>`).join('')}</div>
      <button class="primary small" data-act="d-done">Done</button></div>
    <div class="dinfo"><span>${hint}</span><span class="charm">✨ Charm ${D.charm(s)} · +${bonus}% customers</span></div>
    ${sel}
    <div class="catalog ${dv.cat === 'expand' ? 'exp' : ''}" data-key="design-${dv.cat}">${items}</div>
    ${extra ? `<div class="dextra">${extra}</div>` : ''}
  </div>`;
}

function designTap(info) {
  const dv = ui.design;
  let r = null;
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
  }
  const html = hudHTML() + (ui.design ? designScreen() : dockHTML()) + modalHTML();
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
  const lower = app.querySelector('.designbar');
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
    const ok = lab ? G.collectLab(s, idx, s.clock) : G.collectJob(s, idx, s.clock);
    if (ok) { world.poke(s, kind, idx, v.item); return; }
  }
  world.poke(s, kind, idx, null);
  ui.modal = { type: 'machine', kind, idx };
}

function act(el) {
  const a = el.dataset.act, id = el.dataset.id, t = s.clock;
  switch (a) {
    case 'noop': return;
    case 'info': ui.modal = { type: 'info', kind: el.dataset.kind, id }; break;
    case 'tab':
      if (id === 'design') openDesign();
      else { ui.tab = id; ui.dockMin = false; if (id === 'back' || id === 'turf') ui.room = 'back'; }
      break;
    case 'dockmin': ui.dockMin = !ui.dockMin; break;
    case 'room': ui.room = ui.room === 'back' ? 'shop' : 'back'; if (ui.room === 'back') ui.tab = 'back'; else if (ui.tab === 'back') ui.tab = 'kitchen'; break;
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
      if (lab ? G.collectLab(s, idx, t) : G.collectJob(s, idx, t)) world.poke(s, kind, idx, item);
      break;
    }
    case 'collectall': {
      let n = 0;
      s.machines.forEach((m, i) => { const item = m.job?.item; if (machineState(m) === 'ready' && G.collectJob(s, i, t, { quiet: true })) { n++; world.poke(s, 'day', i, item); } });
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
    case 'buymachine': G.buyMachine(s, id); break;
    case 'buylab': G.buyMachine(s, id, true); break;
    case 'repair': G.repairMachine(s, Number(el.dataset.idx), el.dataset.kind === 'night'); break;
    case 'menu-toggle': G.toggleMenu(s, id); break;
    case 'price': G.setPriceLevel(s, id, el.dataset.lvl); break;
    case 'buy': G.buyIngredient(s, id, Number(el.dataset.n)); break;
    case 'stockup': {
      const { need } = stockUpNeeds();
      for (const [k, q] of Object.entries(need)) if (q > 0) G.buyIngredient(s, k, q, true);
      showToast('Stocked up.', 'good');
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
    case 'dez': G.sellToDez(s, id, s.bags[id] || 0); break;
    case 'tier': G.upgradeMachine(s, Number(el.dataset.idx), el.dataset.kind === 'night'); break;
    case 'corner-buy': G.buyCorner(s, id); break;
    case 'corner-product': G.setCornerProduct(s, id, el.dataset.type); break;
    case 'corner-stock': G.stockCorner(s, id, Number(el.dataset.n)); break;
    case 'branch': G.growBranch(s, id); break;
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
    case 'offer': G.answerOffer(s, id === 'yes'); ui.modal = null; if (id === 'yes') { ui.room = 'back'; ui.tab = 'back'; } break;
    case 'lvl-ok': s.levelUps.shift(); ui.modal = null; break;
    case 'close': ui.modal = null; break;
    // Design
    case 'd-cat': Object.assign(ui.design, { cat: id, item: DESIGN_DEFAULT[id], sel: null, moving: null }); break;
    case 'd-item':
      if (Number(el.dataset.level || 1) > s.level) { showToast(`Unlocks at level ${el.dataset.level}.`, 'bad'); return; }
      Object.assign(ui.design, { item: id, sel: null, moving: null }); break;
    case 'd-fill': { const r = ui.design.cat === 'floor' ? D.fillFloor(s, ui.design.item) : D.fillWalls(s, ui.design.item); if (r.msg) showToast(r.msg, r.ok ? 'good' : 'bad'); break; }
    case 'd-move': if (ui.design.sel != null) ui.design.moving = ui.design.sel; break;
    case 'd-rotate': if (ui.design.sel != null) D.rotateDecor(s, ui.design.sel); break;
    case 'd-sell': if (ui.design.sel != null) { const r = D.sellDecor(s, ui.design.sel); if (r.msg) showToast(r.msg, 'good'); ui.design.sel = null; ui.design.moving = null; } break;
    case 'd-deselect': ui.design.sel = null; ui.design.moving = null; break;
    case 'd-buyexp': { const r = D.buyExpansion(s, id); if (r.msg) showToast(r.msg, r.ok ? 'good' : 'bad'); break; }
    case 'd-done': ui.design = null; break;
    case 'restart':
      if (!confirm('Start a new game? This bakery will be lost.')) return;
      s = G.newGame(Date.now()); vt = Date.now(); ui.modal = null; ui.design = null; ui.room = 'shop'; ui.tab = 'kitchen';
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
let pointerDown = false, lastPointer = 0;
let rowDrag = null, dragJustEnded = false;
app.addEventListener('pointerdown', e => {
  pointerDown = true; lastPointer = performance.now();
  if (e.pointerType === 'touch' || e.button !== 0) return;
  const row = e.target.closest('.catalog, .dcats');
  if (row && row.scrollWidth > row.clientWidth) rowDrag = { row, x: e.clientX, left: row.scrollLeft, moved: false };
});
window.addEventListener('pointermove', e => {
  if (!rowDrag) return;
  const dx = e.clientX - rowDrag.x;
  if (!rowDrag.moved && Math.abs(dx) > 6) { rowDrag.moved = true; rowDrag.row.classList.add('dragging'); }
  if (rowDrag.moved) rowDrag.row.scrollLeft = rowDrag.left - dx;
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
  sales: s.stats.totalSales, bags: s.stats.totalBags, served: s.stats.served || 0, missed: s.stats.missed || 0 });
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
function frame(now) {
  const real = Math.min(1, (now - lastFrame) / 1000);
  lastFrame = now;
  vt = Math.max(vt + real * SPEED * 1000, Date.now());
  if (vt - s.last > 2 * MIN * SPEED) catchUp(vt);
  else G.advance(s, vt, { live: true });
  uiAcc += real; saveAcc += real;
  // Redraw the screens once a second (not while a finger is down, so taps never land on a redrawn button)
  if (uiAcc >= 1 && !pointerDown && now - lastPointer > 350) { uiAcc = 0; render(); }
  if (saveAcc >= 5) { saveAcc = 0; save(); }
  world.frame(s);
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);

catchUp(vt);
render(true);
requestAnimationFrame(frame);

// Debug hooks for testing in the browser console: __game.skip(3) plays three hours forward.
window.__game = { get s() { return s; }, G, render, save, world, ui, skip(hours) { vt += hours * HOUR; } };
