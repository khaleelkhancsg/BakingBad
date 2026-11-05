// Screens, input and the main loop.
import * as G from './game.js';
import { CFG, ITEMS, INGREDIENTS, PRICE_LEVELS, UPGRADES, STAGES } from './data.js';
import { createScene } from './scene.js';
import * as D from './design.js';

const params = new URLSearchParams(location.search);
// ?save=name keeps a separate save slot (handy for testing without touching the real game)
const KEY = 'bakingbad.save' + (params.get('save') ? '.' + params.get('save') : '');
const SPEED = Number(params.get('speed')) || 1;
const app = document.getElementById('app');
const toastBox = document.getElementById('toasts');
const ui = { modal: null, paused: false, design: null };
let s = load() || G.newGame();
const world = createScene(document.getElementById('scene'), document.getElementById('overlay'), {
  onPick: info => {
    if (info.act === 'design') { if (ui.design && s.phase === 'plan') designTap(info); return; }
    if (s.shift && !ui.modal) act({ dataset: info });
  },
});

function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); return d && d.v === G.SAVE_VERSION ? D.ensureDesign(d) : null; }
  catch { return null; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage full or blocked */ } }

const money = v => (v < 0 ? '-£' : '£') + Math.abs(Math.round(v)).toLocaleString('en-GB');
const money2 = v => '£' + Number(v).toFixed(2);
const ingText = r => Object.entries(r.ing).map(([k, q]) => `${q}${INGREDIENTS[k].emoji}`).join(' ');
const pathText = r => r.stages.map(st => `${STAGES[st].emoji}${r.times[st]}s`).join(' → ');

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

// ---------- Shared pieces ----------

const PHASE = { plan: 'Morning', day: 'Bakery open', evening: 'Closing up', night: 'Back room', nightEnd: 'Small hours', report: 'Morning' };

const hud = () => '';
function hudHTML() {
  const d = G.daysToPayment(s);
  const due = s.won
    ? `<span class="badge ok">🏦 Debt cleared</span>`
    : `<span class="badge ${d <= 2 ? 'warn' : ''}" title="Next bank payment">🏦 ${money(G.nextDue(s))} · ${d}d</span>`;
  const heatCls = s.heat >= 60 ? 'hot' : s.heat >= 35 ? 'warm' : '';
  const showDirty = s.labUnlocked || s.dirty > 0;
  // Floating badges over a see-through bar, so the bakery shows between them
  return `<header class="hud">
    <div class="hud-row">
      <div class="badge daybadge"><b>Day ${s.day}</b><small>${PHASE[s.phase] || ''}</small></div>
      ${due}
    </div>
    <div class="hud-row stats">
      <span class="badge cash" title="Clean cash">💷 ${money(s.clean)}</span>
      ${showDirty ? `<span class="badge cash dirty" title="Dirty cash">💜 ${money(s.dirty)}</span>` : ''}
      ${showDirty ? `<span class="badge heat ${heatCls}" title="Police heat">🚨 <span class="meter"><i style="width:${s.heat}%"></i></span> ${Math.round(s.heat)}</span>` : ''}
      <span class="badge" title="Reputation">⭐ ${Math.round(s.rep)}</span>
    </div>
  </header>`;
}

const footer = inner => `<footer class="actions"><div class="inner">${inner}</div></footer>`;
const line = (a, b, cls = '') => `<div class="line"><span>${a}</span><span class="${cls}">${b}</span></div>`;

// ---------- Morning planning ----------

// The morning dock: same shape as the design toolbar. Tabs on top, a row of cards you swipe through,
// and the open button. The shop stays visible above it.
const pcard = (inner, cls = '') => `<div class="pcard ${cls}">${inner}</div>`;
const buyBtns = (k, p) => `<div class="pbtns">
  <button class="small" data-act="buy" data-id="${k}" data-n="5" ${s.clean < p * 5 ? 'disabled' : ''}>+5<small>${money(p * 5)}</small></button>
  <button class="small" data-act="buy" data-id="${k}" data-n="20" ${s.clean < p * 20 ? 'disabled' : ''}>+20<small>${money(p * 20)}</small></button></div>`;

function suppliesTab() {
  const cards = Object.entries(INGREDIENTS).map(([k, ing]) => {
    const p = G.ingPrice(s, k), m = s.market[k];
    const tag = m >= 1.12 ? '<span class="up">▲ dear</span>' : m <= 0.92 ? '<span class="down">▼ cheap</span>' : '<span>steady</span>';
    return pcard(`<div class="ptop"><span class="em">${ing.emoji}</span><div><b>${ing.name}</b><small>× ${s.inv[k]} in stock</small></div></div>
      <small>${money2(p)} each · ${tag}</small>${buyBtns(k, p)}`);
  }).join('');
  const makes = s.recipes.map(id => `${ITEMS[id].emoji} ${G.batchesPossible(s, id)}`).join(' · ');
  return { cards, hint: `Today's market. Your stock makes: ${makes} batches.` };
}

function menuTab() {
  const cards = s.recipes.map(id => {
    const r = ITEMS[id], lvl = s.priceLevel[id];
    return pcard(`<div class="ptop"><span class="em">${r.emoji}</span><div><b>${r.name}</b><small>makes ${r.yield} · ${money2(G.itemPrice(s, id))} each</small></div></div>
      <small>${ingText(r)} · ${money2(G.batchCost(s, id))} a batch</small><small>${pathText(r)}</small>
      <div class="seg">${Object.entries(PRICE_LEVELS).map(([k, L]) =>
        `<button class="${lvl === k ? 'on' : ''}" data-act="price" data-id="${id}" data-lvl="${k}">${L.label}<br>${money2(r.price * L.mult)}</button>`).join('')}</div>`, 'wide');
  }).join('');
  const locked = Object.keys(ITEMS).filter(id => !s.recipes.includes(id));
  return { cards, hint: `Mornings want bread, afternoons want sweet things. Higher prices earn more, but more people walk away.${locked.length ? ` More recipes in 🛠️ Shop.` : ''}` };
}

function shopTab() {
  const avail = UPGRADES.filter(u => G.upgradeAvailable(s, u));
  const cards = avail.map(u => {
    const dirty = u.cash === 'dirty';
    return pcard(`<b>${u.name}</b><small>${u.desc}</small>
      <div class="pbtns"><button class="small ${dirty ? 'violet' : ''}" data-act="upgrade" data-id="${u.id}" ${s[u.cash] >= u.cost ? '' : 'disabled'}>${dirty ? '💜' : '💷'} ${money(u.cost)}</button></div>`, dirty ? 'night' : '');
  }).join('') || pcard('<b>All bought</b><small>Nothing left in the shop.</small>');
  const owned = UPGRADES.filter(u => G.has(s, u.id));
  return { cards, hint: owned.length ? `Owned: ${owned.map(u => u.name).join(' · ')}` : 'Equipment and recipes. 💷 clean cash for the bakery, 💜 dirty cash for the back room.' };
}

function crewTab() {
  const hireBtn = role => s.crew[role]
    ? `<button class="small danger" data-act="fire" data-id="${role}">Let go</button>`
    : `<button class="small" data-act="hire" data-id="${role}">Hire</button>`;
  let cards = pcard(`<div class="ptop"><span class="em">👩‍🍳</span><div><b>Priya</b><small>baker · ${money(CFG.bakerWage)} a day</small></div></div>
    <small>Moves finished batches along for you, so nothing burns.</small><div class="pbtns">${hireBtn('baker')}</div>`, 'wide');
  if (s.labUnlocked) cards += pcard(`<div class="ptop"><span class="em">🧢</span><div><b>Jay</b><small>street dealer · keeps ${CFG.dealerCut * 100}%</small></div></div>
    <small>Sells your leftover bags on the street for ${money(CFG.bagStreet)} each. More heat, more chance he's picked up.</small><div class="pbtns">${hireBtn('dealer')}</div>`, 'wide night');
  return { cards, hint: 'Your crew.' };
}

function dezTab() {
  const cop = Math.round(G.copChance(s) * 100);
  const cards = pcard(`<div class="ptop"><span class="em">📦</span><div><b>Kits</b><small>× ${s.kits} · bags × ${s.bags}</small></div></div>
      <small>${money(CFG.kitCost)} a kit. One kit, one batch: ${G.velvetYield(s)} bags.</small>
      <div class="pbtns"><button class="small violet" data-act="kit" data-id="dirty" ${s.dirty < CFG.kitCost ? 'disabled' : ''}>💜 Buy</button>
      <button class="small" data-act="kit" data-id="clean" ${s.clean < CFG.kitCost ? 'disabled' : ''}>💷 Buy</button></div>`, 'night')
    + pcard(`<div class="ptop"><span class="em">🚨</span><div><b>Heat ${Math.round(s.heat)}</b><small>raids from ${CFG.raidAt}</small></div></div>
      <small>About ${cop}% of buyers are undercover. Heat falls ${CFG.heatDecay} a night, ${CFG.heatDecay + CFG.lieLowBonus} if you keep the back room shut.</small>`, 'wide night')
    + pcard(`<div class="ptop"><span class="em">👮</span><div><b>A friendly sergeant</b><small>heat -${CFG.bribeHeat}, once a day</small></div></div>
      <small>Not every officer is for sale.</small>
      <div class="pbtns"><button class="small violet" data-act="bribe" ${s.dirty < CFG.bribeCost || s.today.bribe ? 'disabled' : ''}>💜 ${money(CFG.bribeCost)}</button></div>`, 'night');
  return { cards, hint: `"Cash only, and I'd rather it was the dirty kind."` };
}

function bankTab() {
  let cards;
  if (s.won) cards = pcard(`<b>🎉 Debt cleared</b><small>Aunt Rosa's stall is yours.</small>`, 'wide');
  else cards = pcard(`<div class="ptop"><span class="em">🏦</span><div><b>${money(s.balance)}</b><small>still owed</small></div></div>
      <small>Next: ${money(G.nextDue(s))} in ${G.daysToPayment(s)} day${G.daysToPayment(s) === 1 ? '' : 's'}</small>
      <small class="${s.strikes ? 'bad' : ''}">Missed payments: ${s.strikes} of ${CFG.maxStrikes}</small>`, 'wide')
    + pcard(`<b>Pay early</b><small>From clean cash, to clear the debt sooner.</small>
      <div class="pbtns col"><button class="small" data-act="pay" data-id="500" ${s.clean < 500 ? 'disabled' : ''}>Pay £500</button>
      <button class="small" data-act="pay" data-id="1000" ${s.clean < 1000 ? 'disabled' : ''}>Pay £1,000</button>
      <button class="small primary" data-act="pay" data-id="all" ${s.clean < s.balance ? 'disabled' : ''}>Pay it all</button></div>`);
  cards += pcard(`<b>Start over</b><small>Begin a new game from day 1. This run is lost.</small>
    <div class="pbtns"><button class="small danger" data-act="restart">New game</button></div>`);
  return { cards, hint: 'Payments come out of clean cash automatically on payment day.' };
}

function planScreen() {
  const tabs = [['supplies', '🧺 Supplies'], ['menu', '📋 Menu'], ['shop', '🛠️ Shop'], ['crew', '👥 Crew']];
  if (s.labUnlocked) tabs.push(['dez', '💜 Dez']);
  tabs.push(['design', '🎨 Design'], ['bank', '🏦 Bank']);
  if (!tabs.some(t => t[0] === s.tab) || s.tab === 'design') s.tab = 'supplies';
  const { cards, hint } = { supplies: suppliesTab, menu: menuTab, shop: shopTab, crew: crewTab, dez: dezTab, bank: bankTab }[s.tab]();
  // Floating above the dock: the day-one story, or today's event
  const float = s.day === 1 && !s.introSeen
    ? `<div class="floatcard">
        <h2>Aunt Rosa's stall</h2>
        <p>Aunt Rosa ran this bakery stall at the night market for thirty years. She left it to you, along with <b>${money(CFG.debtTotal)}</b> she owed the bank.</p>
        <p>The bank wants <b>${money(CFG.weekly)}</b> every week, starting in two weeks. Miss ${CFG.maxStrikes} payments and they take the stall.</p>
        <p class="mute">Buy ingredients, open up, and tap each station to move batches along: mixer → proofing → oven. Don't leave anything in the oven too long.</p>
        <button class="small" data-act="intro-ok">Got it</button></div>`
    : s.event ? `<div class="floatbanner">${s.event.text}</div>` : '';
  return float + `<div class="designbar plandock">
    <div class="drow"><div class="dcats">${tabs.map(([id, label]) => `<button class="small ${s.tab === id ? 'on' : ''}" data-act="tab" data-id="${id}">${label}</button>`).join('')}</div></div>
    <div class="dinfo"><span>${hint}</span></div>
    <div class="catalog cards" data-key="plan-${s.tab}">${cards}</div>
    <button class="primary big" data-act="open">☀️ Open the bakery</button>
  </div>`;
}

// ---------- Shifts: the 3D scene does the work, this is the status bar and dock ----------

function shiftScreen() {
  const sh = s.shift;
  const left = sh.len - sh.t;
  const day = sh.kind === 'day';
  const last = sh.feed.filter(f => sh.t - f.t < 5).slice(-2).reverse();
  const feedLine = `<div class="feedline">${last.map(f => `<span class="${f.kind}">${f.face} ${f.text}</span>`).join('')}</div>`;
  let dock;
  if (day) {
    const cs = s.recipes.map(id => {
      const d = s.display[id], n = d.fresh + d.stale;
      return `<span class="chip ${n ? '' : 'out'}">${ITEMS[id].emoji} ${n}</span>`;
    }).join('');
    const inv = Object.entries(INGREDIENTS).map(([k, ing]) => `<span class="${s.inv[k] < 2 ? 'low' : ''}">${ing.emoji}${s.inv[k]}</span>`).join('');
    dock = `<div class="chips">${cs}</div><div class="strip">${inv}</div>`;
  } else {
    const door = sh.buyers.map(b => `<button class="chip buyerchip ${b.hint ? 'flag' : ''}" data-act="buyer" data-id="${b.id}">👤 ${b.name} ×${b.want}</button>`).join('');
    dock = `<div class="chips"><span class="chip">💜 ${s.bags} bags</span><span class="chip">📦 ${s.kits} kits</span>${door || '<span class="chip out">nobody at the door</span>'}</div>`;
  }
  return `<div class="shiftbar ${day ? '' : 'night'}"><span class="clock">${G.shiftClock(sh)}</span><span class="prog"><i style="width:${sh.t / sh.len * 100}%"></i></span>
      <button class="small" data-act="pause">⏸</button></div>
    ${left < 20 ? `<div class="warn-line">${day ? 'Closing soon. Unfinished batches get thrown out.' : 'Dawn soon. Unfinished cooks are wasted.'}</div>` : ''}
    <div class="dock ${day ? '' : 'night'}">${feedLine}${dock}</div>`;
}

// ---------- Evening / small hours ----------

function eveningScreen() {
  const t = s.today;
  const top = Object.entries(t.missedBy).sort((a, b) => b[1] - a[1])[0];
  let launder = '';
  if (s.dirty > 0 || t.laundered) {
    if (t.laundered === null) {
      const def = Math.min(Math.floor(s.dirty / 10) * 10, Math.floor(t.launderCap / 10) * 10);
      launder = `<div class="card night"><h3>Put dirty cash through the till</h3>
        <p class="mute">Today's real takings were ${money(t.sales)}. You can pass off up to <b>${money(t.launderCap)}</b> extra as sales without it looking odd. More than that and people notice.</p>
        <input type="range" id="launder" min="0" max="${Math.floor(s.dirty)}" step="10" value="${def}">
        <div class="line"><span>Launder <b id="launder-val">${money(def)}</b></span><span id="launder-warn"></span></div>
        <button class="violet big" data-act="launder" style="margin-top:8px">Launder it</button></div>`;
    } else {
      launder = `<div class="card night"><h3>Laundered</h3>${line('Through the till', money(t.laundered))}
        ${t.launderHeat ? line('That looked off', `heat +${t.launderHeat}`, 'bad') : line('Looked normal', 'no extra heat', 'good')}</div>`;
    }
  }
  const actions = s.labUnlocked
    ? `<button class="violet big" data-act="night">🌙 Open the back room</button><button class="big" data-act="home">Lie low tonight & go home</button>`
    : `<button class="primary big" data-act="home">🌙 Close up & go home</button>`;
  return hud() + `<div class="card"><h2>Closing time</h2>
      ${line('Takings', money(t.sales), 'good')}
      ${line('Customers served', t.served)}
      ${line('Walked out empty-handed', t.missed + (top ? ` <small>(mostly ${ITEMS[top[0]].emoji})</small>` : ''), t.missed ? 'bad' : '')}
      ${t.pricedOut ? line('Put off by prices', t.pricedOut, 'meh') : ''}
      ${t.burnt ? line('Batches burnt', t.burnt, 'bad') : ''}
      ${t.lostBatches ? line('Unfinished batches thrown out', t.lostBatches, 'bad') : ''}
      ${line('Rent', '-' + money(t.rent))}
      ${t.wages ? line('Priya\'s wage', '-' + money(t.wages)) : ''}
    </div>${launder}` + footer(actions);
}

function nightEndScreen() {
  const t = s.today;
  const dealer = s.crew.dealer && s.bags > 0
    ? `<div class="card night"><h3>Give Jay bags for the street</h3>
        <p class="mute">${money(CFG.bagStreet)} a bag, he keeps ${CFG.dealerCut * 100}%. If he's picked up you lose what he's carrying.</p>
        <input type="range" id="assign" min="0" max="${s.bags}" step="1" value="${s.dealerAssign}">
        <div class="line"><span>Give him <b id="assign-val">${s.dealerAssign}</b> bags</span><span id="assign-cash" class="mute"></span></div></div>`
    : (s.bags > 0 && !s.crew.dealer ? `<div class="card"><small>${s.bags} bags stay in the back room. Hire Jay in 👥 Crew to sell leftovers on the street. Product left on the premises makes a raid worse.</small></div>` : '');
  return hud() + `<div class="night"><div class="card"><h2>Four in the morning</h2>
      ${line('Batches cooked', t.batches)}
      ${line('Bags sold at the door', t.bagsSold)}
      ${line('Dirty cash made', money(t.nightSales), 'good')}
      ${t.copsServed ? line('Sold to undercover officers', t.copsServed, 'bad') : ''}
      ${t.buyersLost ? line('Buyers who gave up waiting', t.buyersLost, 'meh') : ''}
      ${t.kitsWasted ? line('Kits wasted', t.kitsWasted, 'bad') : ''}
    </div>${dealer}</div>` + footer(`<button class="violet big" data-act="home">Go home</button>`);
}

// ---------- Morning report ----------

function reportScreen() {
  const r = s.report;
  if (!r) { s.phase = 'plan'; queueMicrotask(render); return ''; }
  const t = r.ledger;
  if (s.over) {
    return hud() + `<div class="card alert"><h2>${s.over.reason === 'arrested' ? '🚔 Arrested' : '🏦 The bank takes the stall'}</h2>
      <p>${s.over.text}</p>
      ${line('Days you lasted', s.day - 1)}
      ${line('Paid to the bank', money(s.stats.paid))}
      ${line('Bags sold', s.stats.totalBags)}
      ${line('Money laundered', money(s.stats.totalLaundered))}
    </div>` + footer(`<button class="primary big" data-act="new">Start again</button>`);
  }
  const night = t.nightOpen ? `<div class="card night"><h3>Last night</h3>
      ${line('Bags sold', t.bagsSold + (t.dealer && !t.dealer.arrested ? ` + ${t.dealer.n} by Jay` : ''))}
      ${line('Dirty cash', money(t.nightSales + (t.dealer?.cash || 0)), 'good')}
      ${t.copsServed ? line('You sold to undercover officers', t.copsServed, 'bad') : ''}
      ${t.copsTurned ? line('You turned away undercover officers', t.copsTurned, 'good') : ''}
      ${t.buyersTurned ? line('Genuine buyers you turned away', t.buyersTurned, 'meh') : ''}
    </div>` : '';
  const pay = r.payment
    ? (r.payment.paid
      ? `<div class="card win">🏦 Paid the bank <b>${money(r.payment.due)}</b>. ${s.won ? '' : `${money(s.balance)} still to go.`}</div>`
      : `<div class="card alert">🏦 <b>Missed the payment of ${money(r.payment.due)}.</b> A ${money(r.payment.penalty)} penalty goes on top, so next week you owe ${money(G.nextDue(s))}. Strike ${s.strikes} of ${CFG.maxStrikes}.</div>`)
    : '';
  const offer = s.offerPending ? `<div class="card story night"><h2>A quiet word</h2>
      <p>Dez, one of Aunt Rosa's regulars, was waiting by the bins when you locked up.</p>
      <p class="quote">"Rosa never told you how she really kept this place going, did she? Bread doesn't pay a bank. The back room's still set up. I bring kits, you cook, people come to the back door. I'll throw in the first kit."</p>
      <div class="row2"><button class="violet" data-act="offer" data-id="yes">Hear him out</button><button data-act="offer" data-id="no">Not interested</button></div></div>` : '';
  const won = s.won && !s.wonSeen ? `<div class="card win"><h2>🎉 Debt cleared</h2>
      <p>Aunt Rosa's stall is yours, free and clear. How clean it stays is up to you. You can keep running the place for as long as you like.</p>
      <button class="small" data-act="won-ok">Keep going</button></div>` : '';
  const heatDelta = Math.round(r.heatTo - r.heatFrom);
  return hud() + `${won}${pay}${offer}
    <div class="card"><h2>☀️ Morning, day ${s.day}</h2>
      ${line('Yesterday\'s takings', money(t.sales), 'good')}
      ${line('Customers served / missed', `${t.served} / ${t.missed}`)}
      ${t.spoiled ? line('Day-old goods thrown out', t.spoiled, 'meh') : ''}
      ${t.laundered ? line('Laundered', money(t.laundered)) : ''}
      ${s.labUnlocked ? line('Heat', `${Math.round(r.heatFrom)} → ${Math.round(r.heatTo)} (${heatDelta >= 0 ? '+' : ''}${heatDelta})`, heatDelta > 0 ? 'bad' : 'good') : ''}
      ${line('Reputation', `${Math.round(r.repFrom)} → ${Math.round(r.repTo)}`)}
    </div>
    ${night}
    ${r.lines.map(l => `<div class="card ${l.kind === 'bad' ? 'alert' : ''}">${l.text}</div>`).join('')}
    ${s.event ? `<div class="card">Today: ${s.event.text}</div>` : ''}` +
    footer(`<button class="primary big" data-act="plan" ${s.offerPending ? 'disabled' : ''}>${s.offerPending ? 'Answer Dez first' : 'Plan the day'}</button>`);
}

// ---------- Modals ----------

function modalHTML() {
  const m = ui.modal;
  if (!m) return '';
  let inner = '';
  if (m.type === 'pause') {
    inner = `<h2>Paused</h2><p class="mute">The clock stops while you're away.</p><button class="primary big" data-act="resume">Carry on</button>`;
  } else if (m.type === 'recipes') {
    inner = `<h2>Start a batch</h2>` + s.recipes.map(id => {
      const r = ITEMS[id];
      const ok = G.canMake(s, id);
      const d = s.display[id];
      return `<button class="pickrow" data-act="recipe" data-id="${id}" ${ok ? '' : 'disabled'}><span class="em" style="font-size:26px">${r.emoji}</span>
        <span style="flex:1"><b>${r.name}</b> <small>×${r.yield} · in case: ${d.fresh + d.stale}</small><br><small>${ingText(r)} · ${pathText(r)}</small></span></button>`;
    }).join('') + `<button class="big" data-act="close" style="margin-top:10px">Cancel</button>`;
  } else if (m.type === 'buyer') {
    const b = s.shift?.buyers.find(x => x.id === m.id);
    if (!b) { ui.modal = null; return ''; }
    const qty = Math.min(b.want, s.bags);
    inner = `<h2>👤 ${b.name}</h2><div class="quote">"${b.line}"</div>
      ${b.hint ? '<p class="meh">📷 The camera doesn\'t like the look of this one.</p>' : ''}
      ${line('Wants', `${b.want} bag${b.want > 1 ? 's' : ''} at ${money(CFG.bagDoor)}`)}
      ${line('You have', `${s.bags} bags`, s.bags ? '' : 'bad')}
      <div class="row2" style="margin-top:10px">
        <button class="violet" data-act="sell" data-id="${b.id}" ${qty ? '' : 'disabled'}>Sell ${qty || ''} (${money(qty * CFG.bagDoor)})</button>
        <button class="danger" data-act="turn" data-id="${b.id}">Turn away</button>
      </div><button class="big" data-act="close" style="margin-top:8px">Make them wait</button>`;
  }
  return `<div class="modal-bg" data-act="${m.type === 'pause' ? 'noop' : 'close'}"><div class="modal ${s.shift?.kind === 'night' ? 'night' : ''}" data-act="noop">${inner}</div></div>`;
}

// ---------- Design mode: tile, paper, decorate and expand the bakery ----------

const DESIGN_DEFAULT = { floor: 'mint', wall: 'stripes', decor: null, art: 'painting', expand: null };
const openDesign = () => { ui.design = { cat: 'floor', item: DESIGN_DEFAULT.floor, sel: null, moving: null }; };

function swatch(id, f, on) {
  const [a, b] = f.colors;
  return `<button class="ditem ${on ? 'on' : ''}" data-act="d-item" data-id="${id}">
    <span class="sw" style="background:linear-gradient(135deg, ${a} 0 50%, ${b} 50% 100%)"></span>
    <small>${f.name}</small><small class="price">${f.price ? money(f.price) : 'free'}</small></button>`;
}
function emojiItem(id, d, on) {
  return `<button class="ditem ${on ? 'on' : ''}" data-act="d-item" data-id="${id}">
    <span class="em">${d.emoji}</span><small>${d.name}</small><small class="price">${money(d.price)} · ✨${d.charm}</small></button>`;
}

function designScreen() {
  const dv = ui.design;
  const cats = [['floor', '🟫 Floor'], ['wall', '🧱 Walls'], ['decor', '🪴 Decor'], ['art', '🖼️ Wall art'], ['expand', '➕ Expand']];
  const bonus = Math.round((D.charmBonus(s) - 1) * 100);
  let items = '', hint = '', extra = '', sel = '';
  if (dv.cat === 'floor') {
    items = Object.entries(D.FLOORS).map(([id, f]) => swatch(id, f, dv.item === id)).join('');
    const { n, cost } = D.fillFloorCost(s, dv.item);
    hint = `Tap squares to lay <b>${D.FLOORS[dv.item].name}</b> (${money(D.FLOORS[dv.item].price)} a square).`;
    if (n) extra = `<button class="small" data-act="d-fill">Do all ${n} squares · ${money(cost)}</button>`;
  } else if (dv.cat === 'wall') {
    items = Object.entries(D.WALLS).map(([id, f]) => swatch(id, f, dv.item === id)).join('');
    const { n, cost } = D.fillWallCost(s, dv.item);
    hint = `Tap a wall panel to hang <b>${D.WALLS[dv.item].name}</b> (${money(D.WALLS[dv.item].price)} a panel).`;
    if (n) extra = `<button class="small" data-act="d-fill">Do all ${n} panels · ${money(cost)}</button>`;
  } else if (dv.cat === 'decor') {
    items = Object.entries(D.DECOR).map(([id, d]) => emojiItem(id, d, dv.item === id)).join('');
    const it = dv.sel != null ? s.design.decor[dv.sel] : null;
    if (dv.moving != null) hint = 'Tap a green square to move it there.';
    else if (it) hint = 'Move it, turn it, or sell it back for half price.';
    else if (dv.item) hint = `Tap a green square to place a <b>${D.DECOR[dv.item].name}</b>${D.DECOR[dv.item].outdoor ? ' (terraces only)' : D.DECOR[dv.item].indoor ? ' (inside only)' : ''}.`;
    else hint = 'Pick something to place, or tap a decoration in the shop to move, turn or sell it.';
    if (it) {
      const d = D.DECOR[it.type];
      sel = `<div class="dsel">${d.emoji} <b>${d.name}</b>
        <button class="small" data-act="d-move">${dv.moving != null ? 'Moving…' : 'Move'}</button>
        <button class="small" data-act="d-rotate">Turn</button>
        <button class="small danger" data-act="d-sell">Sell ${money(Math.round(d.price * D.SELL_BACK))}</button>
        <button class="small" data-act="d-deselect">✕</button></div>`;
    }
  } else if (dv.cat === 'art') {
    items = Object.entries(D.ART).map(([id, d]) => emojiItem(id, d, dv.item === id)).join('')
      + `<button class="ditem ${dv.item === 'remove' ? 'on' : ''}" data-act="d-item" data-id="remove"><span class="em">🗑️</span><small>Take down</small><small class="price">half back</small></button>`;
    hint = dv.item === 'remove' ? 'Tap a panel to take its art down.' : `Tap a green wall panel to hang a <b>${D.ART[dv.item].name}</b>.`;
  } else if (dv.cat === 'expand') {
    hint = 'Expansions add squares you can tile and decorate.';
    items = Object.entries(D.EXPANSIONS).map(([id, e]) => {
      const owned = s.design.expansions[id];
      return `<div class="dexp ${owned ? 'owned' : ''}"><b>${e.name}</b><small>${e.desc}</small><small>${e.cells} squares</small>
        ${owned ? '<span class="good">✓ Yours</span>' : `<button class="small primary" data-act="d-buyexp" data-id="${id}" ${s.clean < e.price ? 'disabled' : ''}>${money(e.price)}</button>`}</div>`;
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

// ---------- Render and input ----------

function render() {
  let body, sheet = true;
  switch (s.phase) {
    case 'plan': body = ui.design ? designScreen() : planScreen(); sheet = false; break;
    case 'day': case 'night': body = s.shift ? shiftScreen() : planScreen(); sheet = false; break;
    case 'evening': body = eveningScreen(); break;
    case 'nightEnd': body = nightEndScreen(); break;
    case 'report': body = reportScreen(); break;
    default: body = planScreen(); sheet = false;
  }
  const oldCat = app.querySelector('.catalog');
  const catKey = oldCat?.dataset.key, catLeft = oldCat?.scrollLeft || 0;
  const oldSheet = app.querySelector('.sheet');
  const keep = oldSheet && oldSheet.dataset.phase === s.phase + s.tab ? oldSheet.scrollTop : 0;
  app.innerHTML = hudHTML() + (sheet ? `<div class="sheet" data-phase="${s.phase + s.tab}">${body}</div>` : body) + modalHTML();
  const newSheet = app.querySelector('.sheet');
  if (newSheet) newSheet.scrollTop = keep;
  const newCat = app.querySelector('.catalog');
  if (newCat && newCat.dataset.key === catKey) newCat.scrollLeft = catLeft;
  syncSliders();
  layoutScene();
}

function layoutScene() {
  const H = window.innerHeight;
  const top = app.querySelector('.hud')?.getBoundingClientRect().bottom || 0;
  document.documentElement.style.setProperty('--hud-h', `${Math.round(top)}px`);
  const lower = app.querySelector('.sheet') || app.querySelector('.dock') || app.querySelector('.designbar');
  const shiftTop = app.querySelector('.shiftbar')?.getBoundingClientRect().bottom;
  const bottom = lower ? H - lower.getBoundingClientRect().top : 0;
  const night = s.phase === 'night' || s.phase === 'nightEnd';
  world.setView({
    zone: night ? 'back' : 'shop',
    light: night ? 'night' : s.phase === 'evening' ? 'evening' : 'day',
    top: (shiftTop || top) + 34, bottom: bottom + 8,
    design: s.phase === 'plan' && ui.design ? { ...ui.design } : null,
  });
}
window.addEventListener('resize', () => layoutScene());

function syncSliders() {
  const l = document.getElementById('launder');
  if (l) {
    const v = Number(l.value);
    const h = G.launderHeatFor(s, v);
    document.getElementById('launder-val').textContent = money(v);
    const w = document.getElementById('launder-warn');
    w.textContent = h ? `looks off: heat +${h}` : 'looks normal';
    w.className = h ? 'bad' : 'good';
  }
  const a = document.getElementById('assign');
  if (a) {
    const v = Number(a.value);
    document.getElementById('assign-val').textContent = v;
    document.getElementById('assign-cash').textContent = `≈ ${money(v * CFG.bagStreet * (1 - CFG.dealerCut))} for you`;
  }
}

function act(el) {
  const a = el.dataset.act, id = el.dataset.id;
  const phaseBefore = s.phase;
  switch (a) {
    case 'noop': return;
    case 'tab': if (id === 'design') openDesign(); else s.tab = id; break;
    case 'd-cat': Object.assign(ui.design, { cat: id, item: DESIGN_DEFAULT[id], sel: null, moving: null }); break;
    case 'd-item': Object.assign(ui.design, { item: id, sel: null, moving: null }); break;
    case 'd-fill': { const r = ui.design.cat === 'floor' ? D.fillFloor(s, ui.design.item) : D.fillWalls(s, ui.design.item); if (r.msg) showToast(r.msg, r.ok ? 'good' : 'bad'); break; }
    case 'd-move': if (ui.design.sel != null) ui.design.moving = ui.design.sel; break;
    case 'd-rotate': if (ui.design.sel != null) D.rotateDecor(s, ui.design.sel); break;
    case 'd-sell': if (ui.design.sel != null) { const r = D.sellDecor(s, ui.design.sel); if (r.msg) showToast(r.msg, 'good'); ui.design.sel = null; ui.design.moving = null; } break;
    case 'd-deselect': ui.design.sel = null; ui.design.moving = null; break;
    case 'd-buyexp': { const r = D.buyExpansion(s, id); if (r.msg) showToast(r.msg, r.ok ? 'good' : 'bad'); break; }
    case 'd-done': ui.design = null; break;
    case 'intro-ok': s.introSeen = true; break;
    case 'buy': G.buyIngredient(s, id, Number(el.dataset.n)); break;
    case 'price': G.setPriceLevel(s, id, el.dataset.lvl); break;
    case 'upgrade': G.buyUpgrade(s, id); break;
    case 'hire': G.hire(s, id); break;
    case 'fire': G.fire(s, id); break;
    case 'kit': G.buyKit(s, id); break;
    case 'bribe': G.bribe(s); break;
    case 'pay': G.payBank(s, id === 'all' ? s.balance : Number(id)); break;
    case 'open': s.introSeen = true; ui.design = null; G.startShift(s, 'day'); break;
    case 'slot': {
      const stage = el.dataset.stage, i = Number(el.dataset.i);
      const slot = s.shift?.slots[stage]?.[i];
      const before = slot ? { ...slot } : null;
      const r = G.tapSlot(s, stage, i);
      if (s.shift) world.poke(s, stage, i, before);
      if (r?.pick) ui.modal = { type: 'recipes', i };
      break;
    }
    case 'recipe':
      if (ui.modal?.type === 'recipes') { G.startRecipe(s, id, ui.modal.i); world.poke(s, 'mix', ui.modal.i, null); }
      ui.modal = null;
      break;
    case 'close': ui.modal = null; break;
    case 'buyer': ui.modal = { type: 'buyer', id: Number(id) }; break;
    case 'sell':
      if (s.bags > 0) world.sold(Number(id));
      G.sellToBuyer(s, Number(id)); ui.modal = null;
      break;
    case 'turn': G.turnAway(s, Number(id)); ui.modal = null; break;
    case 'pause': ui.paused = true; ui.modal = { type: 'pause' }; break;
    case 'resume': ui.paused = false; ui.modal = null; break;
    case 'launder': G.launder(s, Number(document.getElementById('launder')?.value || 0)); break;
    case 'night': G.startShift(s, 'night'); break;
    case 'home':
      if (s.phase === 'nightEnd' && s.crew.dealer) G.setDealerAssign(s, Number(document.getElementById('assign')?.value || 0));
      G.goHome(s);
      break;
    case 'plan': G.toPlan(s); break;
    case 'offer': G.answerOffer(s, id === 'yes'); break;
    case 'won-ok': s.wonSeen = true; break;
    case 'restart':
      if (!confirm('Start a new game? This run will be lost.')) return;
      s = G.newGame(); ui.modal = null; ui.paused = false;
      break;
    case 'new': s = G.newGame(); ui.modal = null; ui.paused = false; ui.design = null; break;
  }
  save();
  render();
  if (s.phase !== phaseBefore) window.scrollTo(0, 0);
}

// Shifts react on pointerdown so taps never get lost to the screen redrawing.
let lastPointerAct = 0;
document.addEventListener('pointerdown', e => {
  if (!s.shift || e.target.id === 'scene') return;
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  e.preventDefault();
  lastPointerAct = performance.now();
  act(el);
});
app.addEventListener('click', e => {
  if (s.shift || performance.now() - lastPointerAct < 500) return;
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  act(el);
});
app.addEventListener('input', syncSliders);
app.addEventListener('wheel', e => {
  const row = e.target.closest('.catalog, .dcats');
  if (row && Math.abs(e.deltaY) > Math.abs(e.deltaX) && row.scrollWidth > row.clientWidth) { row.scrollLeft += e.deltaY; e.preventDefault(); }
}, { passive: false });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && s.shift) { ui.paused = true; ui.modal = { type: 'pause' }; save(); render(); }
});

let last = performance.now(), acc = 0, saveAcc = 0;
function frame(now) {
  const real = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (s.shift && !ui.paused) {
    G.tick(s, real * SPEED);
    if (!s.shift && ui.modal?.type === 'recipes') ui.modal = null;
    if (!s.shift) { ui.modal = null; save(); render(); window.scrollTo(0, 0); }
    else {
      acc += real; saveAcc += real;
      if (acc >= 0.1) { acc = 0; render(); }
      if (saveAcc >= 3) { saveAcc = 0; save(); }
    }
  }
  world.frame(s);
  requestAnimationFrame(frame);
}

// A shift that was running when the app closed resumes paused.
if (s.shift) { ui.paused = true; ui.modal = { type: 'pause' }; }
render();
requestAnimationFrame(frame);

// Debug hooks for testing in the browser console.
window.__game = { get s() { return s; }, G, render, save, world, step(sec, dt = 0.1) { for (let t = 0; t < sec; t += dt) { if (s.shift) G.tick(s, dt); world.frame(s, dt); } render(); world.frame(s, 0.001); } };
