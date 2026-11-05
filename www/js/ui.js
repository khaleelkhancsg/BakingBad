// Screens, input and the main loop.
import * as G from './game.js';
import { CFG, ITEMS, INGREDIENTS, PRICE_LEVELS, UPGRADES, STAGES } from './data.js';

const KEY = 'bakingbad.save';
const params = new URLSearchParams(location.search);
const SPEED = Number(params.get('speed')) || 1;
const app = document.getElementById('app');
const toastBox = document.getElementById('toasts');
const ui = { modal: null, paused: false };
let s = load() || G.newGame();

function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); return d && d.v === G.SAVE_VERSION ? d : null; }
  catch { return null; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage full or blocked */ } }

const money = v => (v < 0 ? '-£' : '£') + Math.abs(Math.round(v)).toLocaleString('en-GB');
const money2 = v => '£' + Number(v).toFixed(2);
const ingText = r => Object.entries(r.ing).map(([k, q]) => `${q}${INGREDIENTS[k].emoji}`).join(' ');
const pathText = r => r.stages.map(st => `${STAGES[st].emoji}${r.times[st]}s`).join(' → ');

G.onToast((text, kind) => {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  toastBox.appendChild(el);
  while (toastBox.children.length > 3) toastBox.firstChild.remove();
  setTimeout(() => el.classList.add('out'), 2300);
  setTimeout(() => el.remove(), 2700);
});

// ---------- Shared pieces ----------

const PHASE = { plan: 'Morning', day: 'Bakery open', evening: 'Closing up', night: 'Back room', nightEnd: 'Small hours', report: 'Morning' };

function hud() {
  const d = G.daysToPayment(s);
  const due = s.won
    ? `<span class="pill ok">🏦 Debt cleared</span>`
    : `<span class="pill ${d <= 2 ? 'warn' : ''}">🏦 ${money(G.nextDue(s))} due in ${d}d</span>`;
  const heatCls = s.heat >= 60 ? 'hot' : s.heat >= 35 ? 'warm' : '';
  const showDirty = s.labUnlocked || s.dirty > 0;
  return `<header class="hud">
    <div class="row"><b>Day ${s.day} <span class="phase">· ${PHASE[s.phase] || ''}</span></b>${due}</div>
    <div class="row">
      <span class="cash" title="Clean cash">💷 ${money(s.clean)}</span>
      ${showDirty ? `<span class="cash dirty" title="Dirty cash">💜 ${money(s.dirty)}</span>` : ''}
      ${showDirty ? `<span class="heat ${heatCls}" title="Police heat">🚨 <span class="meter"><i style="width:${s.heat}%"></i></span> ${Math.round(s.heat)}</span>` : ''}
      <span title="Reputation">⭐ ${Math.round(s.rep)}</span>
    </div>
  </header>`;
}

const footer = inner => `<footer class="actions"><div class="inner">${inner}</div></footer>`;
const line = (a, b, cls = '') => `<div class="line"><span>${a}</span><span class="${cls}">${b}</span></div>`;

// ---------- Morning planning ----------

function planScreen() {
  const tabs = [['supplies', '🧺 Supplies'], ['menu', '📋 Menu'], ['shop', '🛠️ Shop'], ['crew', '👥 Crew']];
  if (s.labUnlocked) tabs.push(['dez', '💜 Dez']);
  tabs.push(['bank', '🏦 Bank']);
  if (!tabs.some(t => t[0] === s.tab)) s.tab = 'supplies';
  const body = { supplies: suppliesTab, menu: menuTab, shop: shopTab, crew: crewTab, dez: dezTab, bank: bankTab }[s.tab]();
  const intro = s.day === 1 && !s.introSeen ? `<div class="card story">
      <h2>Aunt Rosa's stall</h2>
      <p>Aunt Rosa ran this bakery stall at the night market for thirty years. She left it to you, along with
      <b>${money(CFG.debtTotal)}</b> she owed the bank.</p>
      <p>The bank wants <b>${money(CFG.weekly)}</b> every week, starting in two weeks. Miss ${CFG.maxStrikes} payments and they take the stall.</p>
      <p class="mute">Buy ingredients, open up, and tap each station to move batches along: mixer → proofing → oven. Don't leave anything in the oven too long.</p>
      <button class="small" data-act="intro-ok">Got it</button></div>` : '';
  const ev = s.event ? `<div class="card">${s.event.text}</div>` : '';
  return hud() + intro + ev +
    `<nav class="tabs">${tabs.map(([id, label]) => `<button class="${s.tab === id ? 'on' : ''}" data-act="tab" data-id="${id}">${label}</button>`).join('')}</nav>
    <main>${body}</main>
    <p class="mute" style="text-align:center;margin-top:18px"><button class="small danger" data-act="restart">Start a new game</button></p>` +
    footer(`<button class="primary big" data-act="open">☀️ Open the bakery</button>`);
}

function suppliesTab() {
  const rows = Object.entries(INGREDIENTS).map(([k, ing]) => {
    const p = G.ingPrice(s, k);
    const m = s.market[k];
    const tag = m >= 1.12 ? '<span class="up">▲ dear</span>' : m <= 0.92 ? '<span class="down">▼ cheap</span>' : '';
    return `<div class="item"><span class="em">${ing.emoji}</span>
      <div class="grow"><b>${ing.name}</b> <small>× ${s.inv[k]}</small><br><small>${money2(p)} each</small> ${tag}</div>
      <div class="btns">
        <button class="small" data-act="buy" data-id="${k}" data-n="5" ${s.clean < p * 5 ? 'disabled' : ''}>+5<br><small>${money(p * 5)}</small></button>
        <button class="small" data-act="buy" data-id="${k}" data-n="20" ${s.clean < p * 20 ? 'disabled' : ''}>+20<br><small>${money(p * 20)}</small></button>
      </div></div>`;
  }).join('');
  const makes = s.recipes.map(id => `${ITEMS[id].emoji} ${G.batchesPossible(s, id)}`).join(' &nbsp; ');
  return `<div class="card"><h3>Today's market</h3><div class="list">${rows}</div></div>
    <div class="card"><small>Batches your stock can make:</small><div style="margin-top:4px">${makes}</div></div>`;
}

function menuTab() {
  const rows = s.recipes.map(id => {
    const r = ITEMS[id];
    const lvl = s.priceLevel[id];
    return `<div class="item"><span class="em">${r.emoji}</span><div class="grow">
      <b>${r.name}</b> <small>makes ${r.yield} · ${money2(G.itemPrice(s, id))} each</small><br>
      <small>${ingText(r)} (${money2(G.batchCost(s, id))}/batch) · ${pathText(r)}</small>
      <div class="seg">${Object.entries(PRICE_LEVELS).map(([k, L]) =>
        `<button class="${lvl === k ? 'on' : ''}" data-act="price" data-id="${id}" data-lvl="${k}">${L.label} ${money2(r.price * L.mult)}</button>`).join('')}</div>
    </div></div>`;
  }).join('');
  const locked = Object.keys(ITEMS).filter(id => !s.recipes.includes(id));
  return `<div class="card"><h3>What you sell</h3>
    <p class="mute">Mornings want bread, afternoons want sweet things. High prices earn more per sale, but more people walk away.</p>
    <div class="list">${rows}</div>
    ${locked.length ? `<p class="mute">More recipes in the 🛠️ Shop: ${locked.map(id => ITEMS[id].emoji + ' ' + ITEMS[id].name).join(', ')}</p>` : ''}</div>`;
}

function upgradeRow(u) {
  const cash = u.cash === 'dirty' ? '💜' : '💷';
  const afford = s[u.cash] >= u.cost;
  return `<div class="item"><div class="grow"><b>${u.name}</b><br><small>${u.desc}</small></div>
    <div class="btns"><button class="small ${u.cash === 'dirty' ? 'violet' : ''}" data-act="upgrade" data-id="${u.id}" ${afford ? '' : 'disabled'}>${cash} ${money(u.cost)}</button></div></div>`;
}

function shopTab() {
  const avail = UPGRADES.filter(u => G.upgradeAvailable(s, u));
  const front = avail.filter(u => u.cash === 'clean');
  const back = avail.filter(u => u.cash === 'dirty');
  const owned = UPGRADES.filter(u => G.has(s, u.id));
  return `<div class="card"><h3>Bakery <small>(clean cash)</small></h3><div class="list">${front.map(upgradeRow).join('') || '<p class="mute">All bought.</p>'}</div></div>
    ${s.labUnlocked ? `<div class="card night"><h3>Back room <small>(dirty cash)</small></h3><div class="list">${back.map(upgradeRow).join('') || '<p class="mute">All bought.</p>'}</div></div>` : ''}
    ${owned.length ? `<div class="card"><small>Owned: ${owned.map(u => u.name).join(' · ')}</small></div>` : ''}`;
}

function crewTab() {
  const baker = `<div class="item"><span class="em">👩‍🍳</span><div class="grow"><b>Priya, baker</b><br>
      <small>Moves finished batches along for you, so nothing burns. ${money(CFG.bakerWage)} a day, clean.</small></div>
      <div class="btns">${s.crew.baker ? '<button class="small danger" data-act="fire" data-id="baker">Let go</button>' : '<button class="small" data-act="hire" data-id="baker">Hire</button>'}</div></div>`;
  const dealer = s.labUnlocked ? `<div class="item"><span class="em">🧢</span><div class="grow"><b>Jay, street dealer</b><br>
      <small>Takes bags you have left after a night and sells them on the street for ${money(CFG.bagStreet)} each. Keeps ${CFG.dealerCut * 100}%.
      Can get picked up; the more heat, the likelier.</small></div>
      <div class="btns">${s.crew.dealer ? '<button class="small danger" data-act="fire" data-id="dealer">Let go</button>' : '<button class="small" data-act="hire" data-id="dealer">Hire</button>'}</div></div>` : '';
  return `<div class="card"><h3>Crew</h3><div class="list">${baker}${dealer}</div></div>`;
}

function dezTab() {
  const cop = Math.round(G.copChance(s) * 100);
  return `<div class="card night"><h3>Dez</h3>
    <p class="mute">"Kits are ${money(CFG.kitCost)}. One kit, one batch: ${G.velvetYield(s)} bags. Cash only, and I'd rather it was the dirty kind."</p>
    <div class="list"><div class="item"><span class="em">📦</span><div class="grow"><b>Kits</b> <small>× ${s.kits}</small> &nbsp; <b>Bags</b> <small>× ${s.bags}</small></div>
      <div class="btns">
        <button class="small violet" data-act="kit" data-id="dirty" ${s.dirty < CFG.kitCost ? 'disabled' : ''}>💜 Buy</button>
        <button class="small" data-act="kit" data-id="clean" ${s.clean < CFG.kitCost ? 'disabled' : ''}>💷 Buy</button>
      </div></div></div></div>
    <div class="card night"><h3>Heat</h3>
      ${line('Police heat', `${Math.round(s.heat)} / 100`, s.heat >= 60 ? 'bad' : '')}
      ${line('Buyers who are undercover', `about ${cop}%`)}
      ${line('Raids start at', `${CFG.raidAt} heat`)}
      <p class="mute">Heat falls ${CFG.heatDecay} a night, or ${CFG.heatDecay + CFG.lieLowBonus} if you keep the back room shut.</p>
      <div class="item"><div class="grow"><b>A friendly sergeant</b><br><small>Heat -${CFG.bribeHeat}. Once a day. Not every officer is for sale.</small></div>
      <div class="btns"><button class="small violet" data-act="bribe" ${s.dirty < CFG.bribeCost || s.today.bribe ? 'disabled' : ''}>💜 ${money(CFG.bribeCost)}</button></div></div>
    </div>`;
}

function bankTab() {
  if (s.won) return `<div class="card win"><h3>The bank</h3><p>Aunt Rosa's debt is paid. The stall is yours.</p></div>`;
  return `<div class="card"><h3>The bank</h3>
    ${line('Still owed', money(s.balance))}
    ${line('Next payment', `${money(G.nextDue(s))} in ${G.daysToPayment(s)} day${G.daysToPayment(s) === 1 ? '' : 's'}`)}
    ${line('Missed payments', `${s.strikes} of ${CFG.maxStrikes}`, s.strikes ? 'bad' : '')}
    <p class="mute">Payments come out of clean cash automatically. You can pay extra any morning to clear the debt early.</p>
    <div class="row2">
      <button data-act="pay" data-id="500" ${s.clean < 500 ? 'disabled' : ''}>Pay £500</button>
      <button data-act="pay" data-id="1000" ${s.clean < 1000 ? 'disabled' : ''}>Pay £1,000</button>
      <button class="primary" data-act="pay" data-id="all" ${s.clean < s.balance ? 'disabled' : ''}>Pay it all</button>
    </div></div>`;
}

// ---------- Shifts ----------

function slotHTML(stage, i, slot) {
  const st = STAGES[stage];
  const at = `data-act="slot" data-stage="${stage}" data-i="${i}"`;
  if (!slot.item) {
    const first = stage === 'mix' || stage === 'prep';
    return `<button class="slot empty ${first ? 'startable' : ''}" ${at}>${first
      ? `<span class="plus">＋</span><small>${stage === 'mix' ? 'Start a batch' : 'Start a cook'}</small>`
      : '<small>empty</small>'}</button>`;
  }
  const r = G.recipeOf(slot.item);
  if (!slot.done) {
    const pct = Math.min(100, slot.t / slot.dur * 100);
    return `<button class="slot running" ${at}><span class="em">${r.emoji}</span><small>${st.verb}</small>
      <div class="bar"><i style="width:${pct}%"></i></div><small>${Math.ceil(slot.dur - slot.t)}s</small></button>`;
  }
  const last = r.stages.at(-1) === stage;
  const burnIn = Math.max(0, Math.ceil(CFG.burnAfter - slot.over));
  return `<button class="slot done ${st.burns && burnIn <= 5 ? 'burning' : ''}" ${at}><span class="em">${r.emoji}</span>
    <small>${last ? 'Collect' : 'Move on'} ✓</small>${st.burns ? `<small class="burn">🔥 ${burnIn}s</small>` : ''}</button>`;
}

function stationsHTML(sh) {
  return G.stationLayout(s, sh.kind).map(({ stage }) => {
    const st = STAGES[stage];
    return `<div class="station"><div class="st-title">${st.emoji} ${st.name}</div>
      <div class="slots">${sh.slots[stage].map((sl, i) => slotHTML(stage, i, sl)).join('')}</div></div>`;
  }).join('<div class="arrow">↓</div>');
}

function feedHTML(sh) {
  const recent = sh.feed.filter(f => sh.t - f.t < 6).slice(-4).reverse();
  return `<div class="card"><div class="feed">${recent.map(f => `<div class="${f.kind}">${f.face} ${f.text}</div>`).join('') || '<small>…</small>'}</div></div>`;
}

function shiftScreen() {
  const sh = s.shift;
  const left = sh.len - sh.t;
  const day = sh.kind === 'day';
  let bottom;
  if (day) {
    const cs = s.recipes.map(id => {
      const d = s.display[id];
      const n = d.fresh + d.stale;
      return `<div class="ci ${n ? '' : 'out'}"><div class="em">${ITEMS[id].emoji}</div><b>${d.fresh}</b>${d.stale ? `<s>+${d.stale} old</s>` : ''}</div>`;
    }).join('');
    const inv = Object.entries(INGREDIENTS).map(([k, ing]) => `<span class="${s.inv[k] < 2 ? 'low' : ''}">${ing.emoji} ${s.inv[k]}</span>`).join('');
    bottom = `<div class="card"><h3>In the case</h3><div class="case">${cs}</div></div>
      ${feedHTML(sh)}
      <div class="card"><div class="strip">${inv}</div></div>`;
  } else {
    const door = sh.buyers.map(b => {
      const pct = Math.max(0, 100 - (sh.t - b.t0) / CFG.buyerPatience * 100);
      return `<button class="buyer ${b.hint ? 'flag' : ''}" data-act="buyer" data-id="${b.id}"><span class="em">👤</span>
        <span class="grow"><b>${b.name}</b> wants ${b.want} ${b.hint ? '<small class="meh">📷 feels off</small>' : ''}</span>
        <span class="bar"><i style="width:${pct}%"></i></span></button>`;
    }).join('');
    bottom = `<div class="bigstat" style="margin-bottom:10px"><div><small>Bags</small><b>💜 ${s.bags}</b></div><div><small>Kits</small><b>📦 ${s.kits}</b></div></div>
      <div class="card"><h3>Back door</h3><div class="door">${door || '<small>Nobody yet.</small>'}</div></div>
      ${feedHTML(sh)}`;
  }
  return hud() + `<div class="${day ? '' : 'night'}">
    <div class="shiftbar"><span class="clock">${G.shiftClock(sh)}</span><span class="prog"><i style="width:${sh.t / sh.len * 100}%"></i></span>
      <button class="small" data-act="pause">⏸</button></div>
    ${left < 20 ? `<div class="warn-line">${day ? 'Closing soon. Unfinished batches get thrown out.' : 'Dawn soon. Unfinished cooks are wasted.'}</div>` : ''}
    ${stationsHTML(sh)}
    <div style="height:10px"></div>
    ${bottom}
  </div>`;
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
  if (!r) { s.phase = 'plan'; return planScreen(); }
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

// ---------- Render and input ----------

function render() {
  let html;
  switch (s.phase) {
    case 'plan': html = planScreen(); break;
    case 'day': case 'night': html = s.shift ? shiftScreen() : planScreen(); break;
    case 'evening': html = eveningScreen(); break;
    case 'nightEnd': html = nightEndScreen(); break;
    case 'report': html = reportScreen(); break;
    default: html = planScreen();
  }
  app.innerHTML = html + modalHTML();
  syncSliders();
}

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
    case 'tab': s.tab = id; break;
    case 'intro-ok': s.introSeen = true; break;
    case 'buy': G.buyIngredient(s, id, Number(el.dataset.n)); break;
    case 'price': G.setPriceLevel(s, id, el.dataset.lvl); break;
    case 'upgrade': G.buyUpgrade(s, id); break;
    case 'hire': G.hire(s, id); break;
    case 'fire': G.fire(s, id); break;
    case 'kit': G.buyKit(s, id); break;
    case 'bribe': G.bribe(s); break;
    case 'pay': G.payBank(s, id === 'all' ? s.balance : Number(id)); break;
    case 'open': s.introSeen = true; G.startShift(s, 'day'); break;
    case 'slot': {
      const r = G.tapSlot(s, el.dataset.stage, Number(el.dataset.i));
      if (r?.pick) ui.modal = { type: 'recipes', i: Number(el.dataset.i) };
      break;
    }
    case 'recipe': if (ui.modal?.type === 'recipes') G.startRecipe(s, id, ui.modal.i); ui.modal = null; break;
    case 'close': ui.modal = null; break;
    case 'buyer': ui.modal = { type: 'buyer', id: Number(id) }; break;
    case 'sell': G.sellToBuyer(s, Number(id)); ui.modal = null; break;
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
    case 'new': s = G.newGame(); ui.modal = null; ui.paused = false; break;
  }
  save();
  render();
  if (s.phase !== phaseBefore) window.scrollTo(0, 0);
}

// Shifts react on pointerdown so taps never get lost to the screen redrawing.
let lastPointerAct = 0;
app.addEventListener('pointerdown', e => {
  if (!s.shift) return;
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

document.addEventListener('visibilitychange', () => {
  if (document.hidden && s.shift) { ui.paused = true; ui.modal = { type: 'pause' }; save(); render(); }
});

let last = performance.now(), acc = 0, saveAcc = 0;
function frame(now) {
  const real = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (s.shift && !ui.paused) {
    G.tick(s, real * SPEED);
    if (!s.shift) { ui.modal = null; save(); render(); window.scrollTo(0, 0); }
    else {
      acc += real; saveAcc += real;
      if (acc >= 0.1) { acc = 0; render(); }
      if (saveAcc >= 3) { saveAcc = 0; save(); }
    }
  }
  requestAnimationFrame(frame);
}

// A shift that was running when the app closed resumes paused.
if (s.shift) { ui.paused = true; ui.modal = { type: 'pause' }; }
render();
requestAnimationFrame(frame);

// Debug hooks for testing in the browser console.
window.__game = { get s() { return s; }, G, render, save };
