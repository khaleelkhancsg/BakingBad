// Screens, input and the main loop.
import * as G from './game.js';
import { CFG, ITEMS, INGREDIENTS, PRICE_LEVELS, UPGRADES, STAGES, CREW, FEATURES, GOLD } from './data.js';
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
  try { const d = JSON.parse(localStorage.getItem(KEY)); return d && d.v === G.SAVE_VERSION ? D.ensureDesign(G.migrate(d)) : null; }
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
      <span class="badge lvl" data-act="info" data-kind="level" data-id="xp" title="Level and XP">🎖️ Lv ${s.level}<span class="meter xp"><i style="width:${Math.min(100, s.xp / G.xpToNext(s.level) * 100)}%"></i></span></span>
    </div>
  </header>`;
}

const footer = inner => `<footer class="actions"><div class="inner">${inner}</div></footer>`;
const line = (a, b, cls = '') => `<div class="line"><span>${a}</span><span class="${cls}">${b}</span></div>`;

// ---------- Morning planning ----------

// The morning dock: same shape as the design toolbar. Tabs on top, a row of simple cards you swipe through,
// and the open button. Each card has an ⓘ in its corner for the full breakdown.
const ibtn = (kind, id) => `<button class="ibtn" data-act="info" data-kind="${kind}" data-id="${id}" aria-label="More info">i</button>`;
const pcard = (inner, info, cls = '') => `<div class="pcard ${cls}">${info || ''}${inner}</div>`;
const UPGRADE_EMOJI = { mixer2: '🥣', rack2: '⏳', oven2: '🔥', oven3: '🔥', sign: '💡', recipe_tart: '🥧', recipe_bun: '🥨', catering: '📦', burner2: '♨️', glass: '🧪', camera: '📷' };

const lockTag = lvl => `<span class="lock">🔒 Lv ${lvl}</span>`;

function suppliesTab() {
  const cards = Object.entries(INGREDIENTS).map(([k, ing]) => {
    if (!G.unlocked(s, ing.level)) {
      return pcard(`<div class="ptop"><span class="em">${ing.emoji}</span><div><b>${ing.name}</b><small>for new recipes</small></div></div>${lockTag(ing.level)}`, ibtn('ing', k), 'locked');
    }
    const p = G.ingPrice(s, k), m = s.market[k];
    const tag = m >= 1.12 ? '<span class="up">▲</span>' : m <= 0.92 ? '<span class="down">▼</span>' : '';
    return pcard(`<div class="ptop"><span class="em">${ing.emoji}</span><div><b>${ing.name}</b><small>× ${s.inv[k]} · ${money2(p)} ${tag}</small></div></div>
      <div class="pbtns">
        <button class="small" data-act="buy" data-id="${k}" data-n="5" ${s.clean < p * 5 ? 'disabled' : ''}>+5</button>
        <button class="small" data-act="buy" data-id="${k}" data-n="20" ${s.clean < p * 20 ? 'disabled' : ''}>+20</button></div>`, ibtn('ing', k));
  }).join('');
  return { cards, hint: 'Today\'s market. ▲ dear, ▼ cheap.' };
}

function menuTab() {
  const menu = G.menuOf(s), slots = G.menuSlots(s);
  const ordered = [...menu, ...s.recipes.filter(id => !menu.includes(id))];
  const cards = ordered.map(id => {
    const r = ITEMS[id], lvl = s.priceLevel[id], on = menu.includes(id);
    return pcard(`<div class="ptop"><span class="em">${r.emoji}</span><div><b>${r.name}</b><small>${money2(G.itemPrice(s, id))} each</small></div></div>
      <button class="small menutoggle ${on ? 'on' : ''}" data-act="menu-toggle" data-id="${id}">${on ? '✓ On the menu' : '+ Add to menu'}</button>
      <div class="seg">${Object.entries(PRICE_LEVELS).map(([k, L]) =>
        `<button class="${lvl === k ? 'on' : ''}" data-act="price" data-id="${id}" data-lvl="${k}">${L.label}</button>`).join('')}</div>`, ibtn('recipe', id), `wide ${on ? '' : 'off'}`);
  }).join('');
  return { cards, hint: `The case holds ${slots}: ${menu.length} on the menu. New recipes are in 🛠️ Shop.` };
}

function shopTab() {
  const list = UPGRADES.filter(u => G.upgradeAvailable(s, u));
  list.sort((a, b) => (G.unlocked(s, b.level) - G.unlocked(s, a.level)) || (a.level - b.level));
  const cards = list.map(u => {
    const dirty = u.cash === 'dirty', open = G.unlocked(s, u.level);
    const btn = open
      ? `<div class="pbtns"><button class="small ${dirty ? 'violet' : ''}" data-act="upgrade" data-id="${u.id}" ${s[u.cash] >= u.cost ? '' : 'disabled'}>${dirty ? '💜' : '💷'} ${money(u.cost)}</button></div>`
      : lockTag(u.level);
    return pcard(`<div class="ptop"><span class="em">${UPGRADE_EMOJI[u.id] || '🛠️'}</span><div><b>${u.name}</b></div></div>${btn}`, ibtn('upgrade', u.id), `${dirty ? 'night' : ''} ${open ? '' : 'locked'}`);
  }).join('') || pcard('<b>All bought</b><small>Nothing left in the shop.</small>');
  const owned = UPGRADES.filter(u => G.has(s, u.id)).length;
  return { cards, hint: `Equipment and recipes.${owned ? ` You own ${owned}.` : ''}` };
}

function crewTab() {
  const cards = Object.entries(CREW).filter(([, c]) => !c.lab || s.labUnlocked).map(([role, c]) => {
    const open = G.unlocked(s, c.level);
    const pay = role === 'dealer' ? `keeps ${CFG.dealerCut * 100}%` : `${c.cash === 'dirty' ? '💜' : '💷'} ${money(c.wage)}/${c.shift === 'night' ? 'night' : 'day'}`;
    const btn = !open ? lockTag(c.level)
      : `<div class="pbtns">${s.crew[role] ? `<button class="small danger" data-act="fire" data-id="${role}">Let go</button>` : `<button class="small" data-act="hire" data-id="${role}">Hire</button>`}</div>`;
    return pcard(`<div class="ptop"><span class="em">${c.emoji}</span><div><b>${c.name}</b><small>${c.role} · ${pay}</small></div></div>${btn}`,
      ibtn('crew', role), `${c.shift === 'night' ? 'night' : ''} ${open ? '' : 'locked'} ${s.crew[role] ? 'hired' : ''}`);
  }).join('');
  return { cards, hint: 'Day crew are paid in clean cash; the night crew want dirty.' };
}

function dezTab() {
  const heatCls = s.heat >= 60 ? 'hot' : s.heat >= 35 ? 'warm' : '';
  const goldOpen = G.feature(s, 'gold');
  const cards = pcard(`<div class="ptop"><span class="em">📦</span><div><b>Kits × ${s.kits}</b><small>${money(CFG.kitCost)} · ${s.bags} bags</small></div></div>
      <div class="pbtns"><button class="small violet" data-act="kit" data-id="dirty" ${s.dirty < CFG.kitCost ? 'disabled' : ''}>💜 Buy</button>
      <button class="small" data-act="kit" data-id="clean" ${s.clean < CFG.kitCost ? 'disabled' : ''}>💷 Buy</button></div>`, ibtn('dez', 'kits'), 'night')
    + pcard(`<div class="ptop"><span class="em">💛</span><div><b>Gold kits${goldOpen ? ` × ${s.goldKits}` : ''}</b><small>${money(CFG.goldKitCost)}${goldOpen ? ` · ${s.gold} bags` : ''}</small></div></div>
      ${goldOpen ? `<div class="pbtns"><button class="small violet" data-act="kit" data-id="dirty" data-type="gold" ${s.dirty < CFG.goldKitCost ? 'disabled' : ''}>💜 Buy</button>
      <button class="small" data-act="kit" data-id="clean" data-type="gold" ${s.clean < CFG.goldKitCost ? 'disabled' : ''}>💷 Buy</button></div>` : lockTag(7)}`, ibtn('dez', 'gold'), `night ${goldOpen ? '' : 'locked'}`)
    + pcard(`<div class="ptop"><span class="em">🚨</span><div><b>Heat ${Math.round(s.heat)}</b><small>out of 100</small></div></div>
      <span class="heat ${heatCls}"><span class="meter wide"><i style="width:${s.heat}%"></i></span></span>`, ibtn('dez', 'heat'), 'night')
    + pcard(`<div class="ptop"><span class="em">👮</span><div><b>Sergeant</b><small>Heat -${CFG.bribeHeat}</small></div></div>
      <div class="pbtns"><button class="small violet" data-act="bribe" ${s.dirty < CFG.bribeCost || s.today.bribe ? 'disabled' : ''}>💜 ${money(CFG.bribeCost)}</button></div>`, ibtn('dez', 'bribe'), 'night')
    + FEATURES.filter(f => ['haggle', 'courier', 'rivals'].includes(f.id)).map(f => pcard(`<div class="ptop"><span class="em">${{ haggle: '🤝', courier: '🚚', rivals: '👥' }[f.id]}</span><div><b>${f.name}</b><small>${G.unlocked(s, f.level) ? 'active' : 'coming up'}</small></div></div>
      ${G.unlocked(s, f.level) ? '' : lockTag(f.level)}`, ibtn('feature', f.id), `night ${G.unlocked(s, f.level) ? '' : 'locked'}`)).join('');
  return { cards, hint: 'Dez sells kits. The sergeant takes bribes.' };
}

function bankTab() {
  let cards;
  if (s.won) cards = pcard(`<div class="ptop"><span class="em">🎉</span><div><b>Debt cleared</b><small>The stall is yours</small></div></div>`, '', 'wide');
  else cards = pcard(`<div class="ptop"><span class="em">🏦</span><div><b>${money(s.balance)} owed</b><small>${money(G.nextDue(s))} in ${G.daysToPayment(s)}d</small></div></div>
      ${s.strikes ? `<small class="bad">Missed ${s.strikes} of ${CFG.maxStrikes}</small>` : ''}${s.holidayNext ? '<small class="good">Next payment skipped</small>' : ''}`, ibtn('bank', 'debt'), 'wide')
    + pcard(`<b>Pay early</b>
      <div class="pbtns col"><button class="small" data-act="pay" data-id="500" ${s.clean < 500 ? 'disabled' : ''}>£500</button>
      <button class="small" data-act="pay" data-id="1000" ${s.clean < 1000 ? 'disabled' : ''}>£1,000</button>
      <button class="small primary" data-act="pay" data-id="all" ${s.clean < s.balance ? 'disabled' : ''}>All of it</button></div>`, ibtn('bank', 'pay'));
  if (!s.won) {
    const loanOpen = G.feature(s, 'loan');
    cards += pcard(`<div class="ptop"><span class="em">💳</span><div><b>Loan</b><small>${money(CFG.loanAmount)} now</small></div></div>
      ${loanOpen ? `<div class="pbtns"><button class="small" data-act="loan" ${G.loanReady(s) ? '' : 'disabled'}>${G.loanReady(s) ? 'Borrow' : 'Next week'}</button></div>` : lockTag(4)}`, ibtn('bank', 'loan'), loanOpen ? '' : 'locked');
    const holOpen = G.feature(s, 'holiday');
    cards += pcard(`<div class="ptop"><span class="em">🏖️</span><div><b>Payment holiday</b><small>once only</small></div></div>
      ${holOpen ? `<div class="pbtns"><button class="small" data-act="holiday" ${s.holidayUsed ? 'disabled' : ''}>${s.holidayUsed ? 'Used' : 'Skip next'}</button></div>` : lockTag(10)}`, ibtn('bank', 'holiday'), holOpen ? '' : 'locked');
  }
  cards += pcard(`<b>Start over</b><div class="pbtns"><button class="small danger" data-act="restart">New game</button></div>`, ibtn('bank', 'restart'));
  return { cards, hint: 'The bank takes its payment automatically.' };
}

// Everything a level opens up, for the level-up card.
function unlocksAt(L) {
  const out = [];
  for (const [, i] of Object.entries(INGREDIENTS)) if (i.level === L) out.push(`${i.emoji} ${i.name} in Supplies`);
  for (const u of UPGRADES) if (u.level === L) out.push(`${UPGRADE_EMOJI[u.id] || '🛠️'} ${u.name}${u.lab && !s.labUnlocked ? ' (back room)' : ''}`);
  for (const [, c] of Object.entries(CREW)) if (c.level === L && L > 1) out.push(`${c.emoji} ${c.name}, ${c.role.toLowerCase()}`);
  for (const f of FEATURES) if (f.level === L) out.push(`✨ ${f.name}: ${f.desc}`);
  for (const [tbl, icon] of [[D.FLOORS, '🟫'], [D.WALLS, '🧱'], [D.DECOR, null], [D.ART, null], [D.EXPANSIONS, '➕']]) {
    for (const [, x] of Object.entries(tbl)) if (x.level === L) out.push(`${x.emoji || icon} ${x.name} (design)`);
  }
  return out;
}

// ---------- ⓘ breakdowns ----------
const GROUP_TEXT = { bread: 'mornings', pastry: 'all day', sweet: 'afternoons' };
function infoFor(kind, id) {
  const T = (title, html) => ({ title, html });
  if (kind === 'ing') {
    const ing = INGREDIENTS[id], p = G.ingPrice(s, id);
    const uses = Object.keys(ITEMS).filter(r => ITEMS[r].ing[id]).map(r => `${ITEMS[r].emoji} ${ITEMS[r].name} (${ITEMS[r].ing[id]})${s.recipes.includes(r) ? '' : ' 🔒'}`);
    return T(`${ing.emoji} ${ing.name}`, line('In stock', s.inv[id]) + line('Today', money2(p)) + line('Usual price', money2(ing.base))
      + line('5 / 20 cost', `${money2(p * 5)} / ${money2(p * 20)}`)
      + `<p><b>Used in</b><br><small>${uses.join('<br>') || 'Nothing yet'}</small></p>`
      + '<p class="mute">Prices change every morning; stock keeps. Buy plenty when it\'s cheap.</p>');
  }
  if (kind === 'recipe') {
    const r = ITEMS[id], cost = G.batchCost(s, id), d = s.display[id];
    const rows = Object.entries(PRICE_LEVELS).map(([k, L]) => {
      const each = r.price * L.mult, batch = each * r.yield;
      return `<tr class="${s.priceLevel[id] === k ? 'on' : ''}"><td>${L.label}</td><td>${money2(each)}</td><td>${money2(batch - cost)}</td><td>${Math.round(L.buy * 100)}%</td></tr>`;
    }).join('');
    return T(`${r.emoji} ${r.name}`, line('Makes', `${r.yield} per batch`) + line('Ingredients', ingText(r)) + line('Batch cost today', money2(cost))
      + line('Stages', pathText(r)) + line('Popular', GROUP_TEXT[r.group]) + line('In the case', `${d.fresh} fresh${d.stale ? `, ${d.stale} day-old` : ''}`)
      + `<table class="itable"><tr><th>Price</th><th>Each</th><th>Profit/batch</th><th>Buy</th></tr>${rows}</table>`
      + '<p class="mute">"Buy" is the chance a customer who wants it goes ahead at that price. Day-old goods sell at 60%. Leave a batch in the oven too long and it burns.</p>');
  }
  if (kind === 'upgrade') {
    const u = UPGRADES.find(x => x.id === id);
    return T(`${UPGRADE_EMOJI[id] || '🛠️'} ${u.name}`, `<p>${u.desc}</p>` + line('Cost', `${u.cash === 'dirty' ? '💜' : '💷'} ${money(u.cost)}`)
      + line('Paid with', u.cash === 'dirty' ? 'dirty cash' : 'clean cash') + (u.requires ? line('Needs', UPGRADES.find(x => x.id === u.requires).name) : '')
      + `<p class="mute">${u.lab ? 'A back-room upgrade.' : 'A bakery upgrade.'} Upgrades are permanent.</p>`);
  }
  if (kind === 'level') {
    return T(`🎖️ Level ${s.level}`, line('XP', `${Math.round(s.xp)} / ${G.xpToNext(s.level)}`) + line('Next level pays', money(CFG.levelCash * (s.level + 1)))
      + `<p><b>Earning XP</b><br><small>Every item sold (pricier items give more) · every batch out of the oven (longer recipes give more) · `
      + `every cook in the back room (${CFG.xpVelvetBatch}, Gold ${CFG.xpGoldBatch}) · every bag sold (${CFG.xpBag}, Gold ${CFG.xpGoldBag}) · courier orders (+${CFG.xpCourier}) · seeing off rivals (+${CFG.xpRival}).</small></p>`
      + `<p><b>Next level unlocks</b><br><small>${unlocksAt(s.level + 1).join('<br>') || 'More of the same: keep going.'}</small></p>`);
  }
  if (kind === 'crew' && CREW[id] && !['baker', 'dealer'].includes(id)) {
    const c = CREW[id];
    return T(`${c.emoji} ${c.name}, ${c.role.toLowerCase()}`, `<p>${c.desc}</p>` + line('Wage', `${c.cash === 'dirty' ? '💜' : '💷'} ${money(c.wage)} a ${c.shift === 'night' ? 'night (paid when the back room opens)' : 'day'}`)
      + line('Available from', `level ${c.level}`) + line('Hired', s.crew[id] ? 'yes' : 'no'));
  }
  if (kind === 'dez' && id === 'gold') {
    return T('💛 Velvet Gold', `<p>A premium cook with its own kits. Some buyers ask for it by name and pay far more.</p>`
      + line('Kit price', money(CFG.goldKitCost)) + line('One kit makes', `${GOLD.yield} bags`) + line('Door price', `${money(CFG.goldBagDoor)} a bag`)
      + line('Stages', `🧪${GOLD.times.prep}s → ♨️${GOLD.times.cook}s → 🛍️${GOLD.times.bag}s`) + line('Unlocks at', 'level 7')
      + '<p class="mute">Gold buyers are a little more likely to be undercover, and a Gold cook adds twice the heat.</p>');
  }
  if (kind === 'feature') {
    const f = FEATURES.find(x => x.id === id);
    const extra = { haggle: `Push the price up ${Math.round((CFG.pushMult - 1) * 100)}%. About ${CFG.pushRefuse * 100}% of ordinary buyers walk off instead. Undercover officers always say yes.`,
      courier: `On about ${CFG.courierChance * 100}% of nights a courier comes for ${CFG.courierMin}–${CFG.courierMax} bags at ${money(CFG.courierPrice)} each, all at once. Never undercover; +${CFG.courierHeat} heat.`,
      rivals: `On about ${CFG.rivalChance * 100}% of nights a rival crew is about: fewer buyers, and halfway through they rob you (${CFG.rivalRob * 100}% of dirty cash and bags) unless Big Ron is on.` }[id] || '';
    return T(f.name, `<p>${f.desc}</p><p class="mute">${extra}</p>` + line('Level', f.level) + line('Active', G.unlocked(s, f.level) ? 'yes' : 'not yet'));
  }
  if (kind === 'bank' && id === 'loan') {
    return T('💳 Bank loan', line('You get', money(CFG.loanAmount)) + line('Added to the debt', money(CFG.loanAmount * (1 + CFG.loanFee))) + line('How often', 'once a week')
      + line('Unlocks at', 'level 4') + '<p class="mute">Handy before a payment day, but it makes the whole debt bigger.</p>');
  }
  if (kind === 'bank' && id === 'holiday') {
    return T('🏖️ Payment holiday', '<p>The bank skips your next payment with no penalty and no strike. You can only do this once.</p>' + line('Unlocks at', 'level 10') + line('Used', s.holidayUsed ? 'yes' : 'no'));
  }
  if (kind === 'crew' && id === 'baker') {
    return T('👩‍🍳 Priya, baker', '<p>Moves finished batches on to the next station for you, so nothing sits in the oven and burns.</p>'
      + line('Wage', `${money(CFG.bakerWage)} a day, clean`) + line('Hired', s.crew.baker ? 'yes' : 'no')
      + '<p class="mute">You still start each batch yourself.</p>');
  }
  if (kind === 'crew' && id === 'dealer') {
    return T('🧢 Jay, street dealer', '<p>After a night shift, give him the bags you have left and he sells them on the street.</p>'
      + line('Street price', `${money(CFG.bagStreet)} a bag`) + line('His cut', `${CFG.dealerCut * 100}%`)
      + line('Chance he\'s picked up', `about ${Math.round((CFG.dealerArrestBase + s.heat * CFG.dealerArrestPerHeat) * 100)}% a night at this heat`)
      + `<p class="mute">If he's picked up you lose the bags he's carrying, heat goes up ${CFG.dealerArrestHeat}, and he's gone.</p>`);
  }
  if (kind === 'dez' && id === 'kits') {
    return T('📦 Kits', line('You have', `${s.kits} kits, ${s.bags} bags`) + line('Price', money(CFG.kitCost)) + line('One kit makes', `${G.velvetYield(s)} bags`)
      + line('Back door price', `${money(CFG.bagDoor)} a bag`) + '<p class="mute">Buy with dirty cash if you can: it\'s money you can\'t spend anywhere else.</p>');
  }
  if (kind === 'dez' && id === 'heat') {
    return T('🚨 Heat', line('Now', `${Math.round(s.heat)} / 100`) + line('Undercover buyers', `about ${Math.round(G.copChance(s) * 100)}%`)
      + line('Raids from', `${CFG.raidAt} heat`) + line('Tax inspections from', `${CFG.inspectAt} heat`)
      + line('Falls each night', `${CFG.heatDecay}, or ${CFG.heatDecay + CFG.lieLowBonus} lying low`)
      + `<p><b>What raises it</b><br><small>Cooking (+${CFG.heatPerBatch} a batch), selling, laundering too much, serving undercover officers (+${CFG.copServedHeat}), Jay getting caught.</small></p>`
      + '<p class="mute">At 100 you\'re arrested. A raid that finds product can end the run too.</p>');
  }
  if (kind === 'dez' && id === 'bribe') {
    return T('👮 A friendly sergeant', line('Cost', `💜 ${money(CFG.bribeCost)}`) + line('Heat', `-${CFG.bribeHeat}`) + line('How often', 'once a day')
      + line('Chance it backfires', `${CFG.bribeBackfire * 100}% (heat +${CFG.bribeBackfireHeat})`));
  }
  if (kind === 'bank' && id === 'debt') {
    return T('🏦 The bank', line('Still owed', money(s.balance)) + line('Next payment', `${money(G.nextDue(s))} in ${G.daysToPayment(s)} days`)
      + line('Paid so far', money(s.stats.paid)) + line('Missed', `${s.strikes} of ${CFG.maxStrikes}`)
      + `<p class="mute">${money(CFG.weekly)} comes out of clean cash every 7 days. Miss one and it rolls into the next, plus ${CFG.missPenalty * 100}%. Miss ${CFG.maxStrikes} and the bank takes the stall.</p>`);
  }
  if (kind === 'bank' && id === 'pay') return T('Paying early', '<p>Extra payments come off what you owe straight away, clearing any missed payment first. Pay it all to finish the debt.</p>');
  if (kind === 'bank' && id === 'restart') return T('Start over', '<p>Starts a brand-new game on day 1. This run, its money and its design are lost.</p>');
  if (kind === 'floor') {
    const f = D.FLOORS[id], { n, cost } = D.fillFloorCost(s, id);
    return T(`🟫 ${f.name}`, line('Price', `${money(f.price)} a square`) + line('Whole floor', n ? `${money(cost)} for ${n} squares` : 'already laid')
      + line('Charm', ['checker', 'stone'].includes(id) ? 'none (the basic floor)' : '+0.1 a square') + '<p class="mute">Tap squares one at a time, or do them all.</p>');
  }
  if (kind === 'wall') {
    const w = D.WALLS[id], { n, cost } = D.fillWallCost(s, id);
    return T(`🧱 ${w.name}`, line('Price', `${money(w.price)} a panel`) + line('Every panel', n ? `${money(cost)} for ${n} panels` : 'already up')
      + line('Charm', id === 'plaster' ? 'none (the basic wall)' : '+0.3 a panel'));
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
    return T(`➕ ${e.name}`, `<p>${e.desc}</p>` + line('Price', money(e.price)) + line('Squares', e.cells) + line('Yours', s.design.expansions[id] ? 'yes' : 'no')
      + '<p class="mute">The low wall on that side opens up, and you get a raised deck with railings to tile and decorate.</p>');
  }
  return T('Info', '<p>Nothing more to say about this one.</p>');
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
    const door = sh.buyers.map(b => `<button class="chip buyerchip ${b.hint ? 'flag' : ''} ${b.courier ? 'courier' : ''}" data-act="buyer" data-id="${b.id}">${b.courier ? '📦' : b.product === 'gold' ? '💛' : '👤'} ${b.name} ×${b.want}</button>`).join('');
    const gold = G.feature(s, 'gold') ? `<span class="chip">💛 ${s.gold} · ${s.goldKits} kits</span>` : '';
    dock = `<div class="chips"><span class="chip">💜 ${s.bags} bags</span><span class="chip">📦 ${s.kits} kits</span>${gold}${door || '<span class="chip out">nobody at the door</span>'}</div>`;
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
      ${t.wages ? line('Day crew wages', '-' + money(t.wages)) : ''}
      ${t.coffees ? line('Coffees sold', t.coffees, 'good') : ''}
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
      ${t.couriers ? line('Courier orders', t.couriers, 'good') : ''}
      ${t.pushed ? line('Haggled / walked off', `${t.pushed - t.pushedAway} / ${t.pushedAway}`) : ''}
      ${t.nightWages ? line('Night crew wages', '-' + money(t.nightWages)) : ''}
    </div>${t.nightEvents.map(e => `<div class="card ${e.kind === 'bad' ? 'alert' : ''}">${e.text}</div>`).join('')}${dealer}</div>` + footer(`<button class="violet big" data-act="home">Go home</button>`);
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
    ? r.payment.holiday ? `<div class="card win">🏖️ Payment holiday: the bank skipped this week's ${money(r.payment.due)}.</div>`
    : (r.payment.paid
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
      ${r.xp ? line('XP earned', `+${r.xp} · level ${s.level}`, 'good') : ''}
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
  if (m.type === 'info') {
    const { title, html } = infoFor(m.kind, m.id);
    inner = `<h2>${title}</h2><div class="infobody">${html}</div><button class="big" data-act="close" style="margin-top:10px">Close</button>`;
  } else if (m.type === 'pause') {
    inner = `<h2>Paused</h2><p class="mute">The clock stops while you're away.</p><button class="primary big" data-act="resume">Carry on</button>`;
  } else if (m.type === 'recipes') {
    inner = `<h2>Start a batch</h2>` + G.menuOf(s).map(id => {
      const r = ITEMS[id];
      const ok = G.canMake(s, id);
      const d = s.display[id];
      return `<button class="pickrow" data-act="recipe" data-id="${id}" ${ok ? '' : 'disabled'}><span class="em" style="font-size:26px">${r.emoji}</span>
        <span style="flex:1"><b>${r.name}</b> <small>×${r.yield} · in case: ${d.fresh + d.stale}</small><br><small>${ingText(r)} · ${pathText(r)}</small></span></button>`;
    }).join('') + `<button class="big" data-act="close" style="margin-top:10px">Cancel</button>`;
  } else if (m.type === 'buyer') {
    const b = s.shift?.buyers.find(x => x.id === m.id);
    if (!b) { ui.modal = null; return ''; }
    const gold = b.product === 'gold', have = G.stockFor(s, b), price = G.bagPrice(b);
    const qty = b.courier ? (have >= b.want ? b.want : 0) : Math.min(b.want, have);
    const canPush = !b.courier && G.feature(s, 'haggle') && qty;
    const what = gold ? 'Velvet Gold' : 'bag';
    inner = `<h2>${b.courier ? '📦' : '👤'} ${b.name}</h2><div class="quote">"${b.line}"</div>
      ${b.hint ? `<p class="meh">${s.crew.lookout ? '👀 Ash doesn\'t like the look of this one.' : '📷 The camera doesn\'t like the look of this one.'}</p>` : ''}
      ${line('Wants', `${b.want} ${gold ? 'Velvet Gold' : `bag${b.want > 1 ? 's' : ''}`} at ${money(price)}${b.courier ? ', all at once' : ''}`)}
      ${line('You have', `${have} ${gold ? 'Gold' : 'bags'}`, have >= (b.courier ? b.want : 1) ? '' : 'bad')}
      <div class="row2" style="margin-top:10px">
        <button class="violet" data-act="sell" data-id="${b.id}" ${qty ? '' : 'disabled'}>${b.courier && !qty ? `Need ${b.want}` : `Sell ${qty || ''} (${money(qty * price)})`}</button>
        ${canPush ? `<button data-act="sell" data-id="${b.id}" data-push="1">🤝 Push to ${money(Math.round(qty * price * CFG.pushMult))}</button>` : ''}
        <button class="danger" data-act="turn" data-id="${b.id}">Turn away</button>
      </div><button class="big" data-act="close" style="margin-top:8px">Make them wait</button>`;
  } else if (m.type === 'lab') {
    inner = `<h2>What are you cooking?</h2>
      <button class="pickrow" data-act="lab-pick" data-id="velvet" ${s.kits ? '' : 'disabled'}><span class="em" style="font-size:26px">💜</span>
        <span style="flex:1"><b>Velvet</b> <small>${s.kits} kits · ${G.velvetYield(s)} bags at ${money(CFG.bagDoor)}</small></span></button>
      <button class="pickrow" data-act="lab-pick" data-id="gold" ${s.goldKits ? '' : 'disabled'}><span class="em" style="font-size:26px">💛</span>
        <span style="flex:1"><b>Velvet Gold</b> <small>${s.goldKits} kits · ${GOLD.yield} bags at ${money(CFG.goldBagDoor)}</small></span></button>
      <button class="big" data-act="close" style="margin-top:10px">Cancel</button>`;
  } else if (m.type === 'levelup') {
    const L = m.level, list = unlocksAt(L);
    inner = `<div class="lvlup"><div class="lvlnum">${L}</div><h2>Level ${L}!</h2><p class="good">+${money(CFG.levelCash * L)} clean cash</p></div>
      ${list.length ? `<p><b>Unlocked</b></p><div class="infobody"><small>${list.join('<br>')}</small></div>` : '<p class="mute">Nothing new this time. Keep going.</p>'}
      <button class="primary big" data-act="lvl-ok" style="margin-top:10px">Nice</button>`;
  }
  return `<div class="modal-bg" data-act="${m.type === 'pause' || m.type === 'levelup' ? 'noop' : 'close'}"><div class="modal ${s.shift?.kind === 'night' ? 'night' : ''}" data-act="noop">${inner}</div></div>`;
}

// ---------- Design mode: tile, paper, decorate and expand the bakery ----------

const DESIGN_DEFAULT = { floor: 'mint', wall: 'stripes', decor: null, art: 'painting', expand: null };
const openDesign = () => { ui.design = { cat: 'floor', item: DESIGN_DEFAULT.floor, sel: null, moving: null }; };

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
    items = Object.entries(D.FLOORS).map(([id, f]) => swatch(id, f, dv.item === id, 'floor')).join('');
    const { n, cost } = D.fillFloorCost(s, dv.item);
    hint = `Tap squares to lay <b>${D.FLOORS[dv.item].name}</b> (${money(D.FLOORS[dv.item].price)} a square).`;
    if (n) extra = `<button class="small" data-act="d-fill">Do all ${n} squares · ${money(cost)}</button>`;
  } else if (dv.cat === 'wall') {
    items = Object.entries(D.WALLS).map(([id, f]) => swatch(id, f, dv.item === id, 'wall')).join('');
    const { n, cost } = D.fillWallCost(s, dv.item);
    hint = `Tap a wall panel to hang <b>${D.WALLS[dv.item].name}</b> (${money(D.WALLS[dv.item].price)} a panel).`;
    if (n) extra = `<button class="small" data-act="d-fill">Do all ${n} panels · ${money(cost)}</button>`;
  } else if (dv.cat === 'decor') {
    items = Object.entries(D.DECOR).map(([id, d]) => emojiItem(id, d, dv.item === id, 'decor')).join('');
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
    items = Object.entries(D.ART).map(([id, d]) => emojiItem(id, d, dv.item === id, 'art')).join('')
      + `<div class="ditem ${dv.item === 'remove' ? 'on' : ''}" data-act="d-item" data-id="remove" role="button"><span class="em">🗑️</span><small>Take down</small><small class="price">half back</small></div>`;
    hint = dv.item === 'remove' ? 'Tap a panel to take its art down.' : `Tap a green wall panel to hang a <b>${D.ART[dv.item].name}</b>.`;
  } else if (dv.cat === 'expand') {
    hint = 'Expansions add squares you can tile and decorate.';
    items = Object.entries(D.EXPANSIONS).map(([id, e]) => {
      const owned = s.design.expansions[id];
      return `<div class="dexp ${owned ? 'owned' : ''}">${ibtn('exp', id)}<b>${e.name}</b><small>${e.cells} squares</small>
        ${owned ? '<span class="good">✓ Yours</span>' : !D.levelOk(s, e) ? `<span class="lock">🔒 Lv ${e.level}</span>` : `<button class="small primary" data-act="d-buyexp" data-id="${id}" ${s.clean < e.price ? 'disabled' : ''}>${money(e.price)}</button>`}</div>`;
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
  if (!s.shift && !ui.modal && s.levelUps?.length) ui.modal = { type: 'levelup', level: s.levelUps[0] };
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
    case 'info': ui.modal = { type: 'info', kind: el.dataset.kind, id }; break;
    case 'tab': if (id === 'design') openDesign(); else s.tab = id; break;
    case 'd-cat': Object.assign(ui.design, { cat: id, item: DESIGN_DEFAULT[id], sel: null, moving: null }); break;
    case 'd-item':
      if (Number(el.dataset.level || 1) > s.level) { showToast(`Unlocks at level ${el.dataset.level}.`, 'bad'); return; }
      Object.assign(ui.design, { item: id, sel: null, moving: null }); break;
    case 'menu-toggle': G.toggleMenu(s, id); break;
    case 'loan': G.takeLoan(s); break;
    case 'holiday': G.useHoliday(s); break;
    case 'lab-pick': if (ui.modal?.type === 'lab') G.startVelvet(s, ui.modal.i, id); ui.modal = null; break;
    case 'lvl-ok': s.levelUps.shift(); ui.modal = null; break;
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
    case 'kit': G.buyKit(s, id, el.dataset.type || 'velvet'); break;
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
      if (r?.pickLab) ui.modal = { type: 'lab', i };
      break;
    }
    case 'recipe':
      if (ui.modal?.type === 'recipes') { G.startRecipe(s, id, ui.modal.i); world.poke(s, 'mix', ui.modal.i, null); }
      ui.modal = null;
      break;
    case 'close': ui.modal = null; break;
    case 'buyer': ui.modal = { type: 'buyer', id: Number(id) }; break;
    case 'sell':
      {
        const before = s.dirty;
        G.sellToBuyer(s, Number(id), el.dataset.push === '1');
        if (s.dirty > before) world.sold(Number(id));
        if (!s.shift?.buyers.find(x => x.id === Number(id))) ui.modal = null;
      }
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
let rowDrag = null, dragJustEnded = false;
app.addEventListener('pointerdown', e => {
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
window.addEventListener('pointerup', () => {
  if (rowDrag?.moved) { dragJustEnded = true; rowDrag.row.classList.remove('dragging'); setTimeout(() => { dragJustEnded = false; }, 60); }
  rowDrag = null;
});
app.addEventListener('click', e => {
  if (dragJustEnded) return;
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
