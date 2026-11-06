// All tunable numbers and content. The game runs on the real clock: times are in real minutes.

export const CFG = {
  // Debt
  debtTotal: 24000, weekly: 2000, firstPaymentDays: 14, missPenalty: 0.05, keepForStock: 150,
  arrearsInterestDaily: 0.005, hardshipGrant: 150,
  // Money and the day (a "game day" turns over at 06:00 local time)
  startClean: 800, rent: 40, rolloverHour: 6,
  // XP and levels: XP to go from level n to n+1 is xpBase + xpScale * n^xpPow
  maxLevel: 99, xpBase: 60, xpScale: 12, xpPow: 2.5, levelCash: 25,
  // Customers (per real hour, before time of day, popularity, marketing and charm)
  custBase: 20, custPerPop: 0.6, varietyBonus: 0.067, varietyCap: 0.4, // 7 full counters: +40%
  popServed: 0.01, popUnserved: -0.004, popHome: 50, popDriftPerHour: 0.1,
  // Food: what's left done in a machine spoils after max(spoilMin, cook time) more minutes
  spoilMin: 30, trayBatches: 4, // a counter holds 4 batches
  cashierBonus: 0.1, drinkAddOn: 0.35,
  // Laundering
  launderRatio: 0.35, launderHeat: 20, launderFee: 0.25, cashPileFree: 5000, cashPilePer: 5000, cashPileMax: 25, accountantFee: 0.1, cleanKitMult: 1.5, prestigeCust: 0.05, branchBuyers: 0.6,
  // Night trade: buyers come to the back door between nightStart and nightEnd (local hours)
  nightStart: 18, nightEnd: 7, buyersPerHour: 4, buyersGrow: 0.4, buyersMax: 14, buyersMaxPerLevel: 0.6, buyerPatienceMin: 3,
  dealerCut: 0.2, streetMult: 1, stockedPull: 5, swapChance: 0.5,
  copBase: 0.03, copPerHeat: 1 / 500, copServedHeat: 15, copCrewHeat: 5, heatPerBag: 0.045,
  heatDecayPerHour: 0.25, heatCoolPerLevel: 0.02, lieLowPerHour: 0.25, lieLowAfterHours: 12,
  raidAt: 60, inspectAt: 35, inspectChance: 0.2, inspectFine: 800,
  dealerArrestPerNight: 0.03, dealerArrestPerHeat: 1 / 400, dealerArrestHeat: 20,
  bribeCost: 600, bribeHeat: 15, bribeBackfire: 0.1, bribeBackfireHeat: 20,
  pushMult: 1.35, pushRefuse: 0.35,
  streetStart: 40, streetHome: 40, streetDrift: 0.05, streetPerBag: 0.15, streetBust: 15, dezBuyback: 0.5, cornerDayRate: 0.6, cornerNightRate: 1.5, cornerCut: 0.25, cornerHeat: 0.03, cornerSweepHeat: 5, hostCut: 0.1, purityBase: 0.55,
  courierChance: 0.6, courierMin: 8, courierMax: 14, courierPremium: 1.25, courierHeat: 3, courierPatienceMin: 30,
  rivalChance: 0.25, rivalRob: 0.3, rivalPop: 5,
  lookoutCatch: 0.7, lookoutFalse: 0.08, safeRaidShare: 0.2, vanArrestMult: 0.5,
  // Trouble (never game over)
  heaviesBase: 0.35, heaviesPerMiss: 0.1, heaviesMax: 0.6, heaviesCooldownDays: 3, heaviesPop: 5, prHeaviesPop: 2,
  tillTake: 0.15, repairShare: 0.3,
  bustFineClean: 1000, bustFineDirty: 0.3, bustSealHours: 72, bustHeat: 45, bustPop: 30, prBustPop: 12, bustCrewQuit: 0.5,
  scandalHours: 96, scandalMult: 0.7, prScandalMult: 0.85, missPop: 5, prPopPerDay: 1.5,
  campaignMax: 0.8, restructureFee: 0.1, restructureEveryDays: 30, loanFee: 0.2, loanEveryDays: 7,
  // Catch-up: how far back the game will simulate when you return (beyond this, time is skipped)
  maxCatchUpDays: 14,
};

// Tax, inspired by the UK system and squeezed into a week (the game's "tax year" would otherwise take a real year).
// VAT: registered once declared takings pass the threshold; hot food and drinks are standard-rated, cold takeaway
// food and bread are zero-rated. Corporation tax: the small profits rate, the main rate, and marginal relief between.
// Employer National Insurance on day-crew wages above the secondary threshold. Business rates on each shop, with
// small business rates relief for the stall.
export const TAX = {
  vatRate: 0.2, vatThreshold: 90000, vatGroups: ['savory', 'drink'],
  smallRate: 0.19, mainRate: 0.25, smallLimit: 1000, mainLimit: 5000,   // weekly profit bands
  niRate: 0.15, niThreshold: 100,                                       // employer NI on weekly day wages
  ratesShare: 0.4,                                                      // business rates: a share of each branch's rent
  taxDay: 3, latePenalty: 0.05, interestDaily: 0.003, collectShare: 0.5,
  accountantSave: 0.1, investigateBase: 0.03, investigateUnder: 0.7, investigateLaunder: 0.25,
  evasionPenalty: 1, evasionPop: 10,
};
// How much of the profit you tell HMRC about
export const DECLARE = { full: { label: 'All of it', share: 1 }, most: { label: '90%', share: 0.9 }, some: { label: '75%', share: 0.75 }, half: { label: 'Half', share: 0.5 } };

// Ways to wash dirty money. Each has its own daily limit, cut, speed, tax treatment and risk, so spreading money
// across them keeps the heat (and HMRC's questions) down. suspect: how much HMRC notice it next to your real takings.
export const WASH = {
  till:     { name: 'Through the tills', emoji: '🧾', level: 1,  suspect: 1,   taxed: true,
              desc: 'Pass it off as shop takings. Instant, but capped by what your shops really took today.' },
  smurf:    { name: 'Smurfing',          emoji: '🏧', level: 8,  fee: 0.1,  suspect: 0, taxed: false, capBase: 300, capPerLevel: 60, flag: 0.03, flagHeat: 6, flagLose: 0.25,
              desc: 'Runners pay small amounts into dozens of bank accounts, all day long. Cheap and quiet, but slow, and now and then a bank flags a deposit.' },
  casino:   { name: 'The casino',        emoji: '🎰', level: 25, fee: 0.15, suspect: 0.5, taxed: false, capBase: 2000, capPerLevel: 400, report: 0.04, reportHeat: 5,
              desc: 'Buy chips with dirty cash, play a little, cash out a cheque. Gambling winnings aren\'t taxed, but casinos have to report big spenders.' },
  offshore: { name: 'Offshore account',  emoji: '🏝️', level: 35, fee: 0.05, outFee: 0.15, suspect: 1, taxed: true, capBase: 5000, capPerLevel: 1000,
              desc: 'Courier dirty cash to an island bank: out of reach of raids, busts and rivals. It comes back clean as "consultancy fees" (taxed), or dirty whenever you like.' },
  crypto:   { name: 'Crypto',            emoji: '🪙', level: 45, feeMin: 0.05, feeMax: 0.4, suspect: 0, taxed: false, capBase: 50000, capPerLevel: 2000, freeze: 0.04,
              desc: 'Huge limits and no questions, but the cut swings with the market every hour, and exchanges sometimes freeze an account and keep half.' },
  art:      { name: 'The art dealer',    emoji: '🖼️', level: 60, fee: 0.2, suspect: 0.3, taxed: true, capPerLevel: 20000, days: 3,
              desc: 'Buy a painting with dirty cash; three days later a buyer pays clean for it. Slow, safe and very discreet.' },
};
// Cash businesses: bought with clean money, each quietly washes up to its limit every night (as its own takings).
export const FRONTS = {
  launderette: { name: 'Launderette',   emoji: '🧺', level: 12, price: 15000,   cap: 1500,   fee: 0.15 },
  carwash:     { name: 'Hand car wash',  emoji: '🚗', level: 22, price: 40000,   cap: 4000,   fee: 0.13 },
  nailbar:     { name: 'Nail bar',       emoji: '💅', level: 33, price: 90000,   cap: 9000,   fee: 0.12 },
  tanning:     { name: 'Tanning salon',  emoji: '🌞', level: 48, price: 200000,  cap: 20000,  fee: 0.11 },
  dealership:  { name: 'Car dealership', emoji: '🚙', level: 65, price: 600000,  cap: 60000,  fee: 0.1 },
  nightclub:   { name: 'Nightclub',      emoji: '🪩', level: 80, price: 2000000, cap: 200000, fee: 0.08 },
};
export const FRONT_AUDIT = 0.25; // chance an HMRC investigation also closes one of your fronts for a few days

// Logistics: branch back rooms pack what they make into Rosa's vans, which drive it to the stall's back room
// under the bakery's own deliveries. Every run can be stopped and searched.
export const VANS = {
  price: 8000, caps: [[1, 1], [24, 2], [40, 3], [60, 4], [80, 5]],          // how many vans you may run, by level
  capacity: [40, 80, 160, 320, 640], capacityCost: [0, 12000, 45000, 160000, 600000],   // bags a run, by van level
  hideCost: [0, 6000, 30000, 120000], hideCut: 0.22,                        // hidden compartments: each level hides better
  travelHours: [0, 1, 2, 3, 4],                                             // from each shop to the stall
  stop: 0.04, stopPerHeat: 1 / 500, stopPerBag: 0.0003, find: 0.65, impoundDays: 2, seizeHeat: 8,
};
// Delivery rounds: riders take orders by phone and deliver, so nobody queues at the back door
export const DELIVERY = { level: 45, price: 1.1, copMult: 0.4, heatMult: 0.5, raidMult: 0.75, minutes: 45,
  stop: 0.015, stopPerHeat: 1 / 800, stingHeat: 10, stopHeat: 6, riderWage: 80, caps: [[45, 2], [55, 4], [70, 6], [85, 10]] };

// Prestige: hand the business on and start again from nothing, with tokens for your net worth.
// tokens = floor(sqrt(net worth / per)). Every token ever earned adds tokenBonus to all prices, for good.
export const PRESTIGE = { level: 25, per: 10000, tokenBonus: 0.01 };
// Perks bought with tokens: each makes the next fresh start quicker. cost: tokens for the next level = cost * (level + 1)
export const PERKS = {
  savings:  { name: "Rosa's savings",  emoji: '💰', max: 10, cost: 1, desc: 'Start with £2,500 more clean cash a level.' },
  credit:   { name: 'Good credit',     emoji: '🏦', max: 8,  cost: 1, desc: 'The debt you inherit is £2,500 smaller a level.' },
  learner:  { name: 'Quick learner',   emoji: '🎓', max: 10, cost: 2, desc: '+10% XP from everything, a level.' },
  regulars: { name: 'Loyal regulars',  emoji: '🫶', max: 10, cost: 2, desc: '+5% customers at every shop, a level.' },
  recipes:  { name: 'Family recipes',  emoji: '📜', max: 10, cost: 2, desc: 'Start knowing every recipe up to level 5 a level (you still need the machines).' },
  bulk:     { name: 'Trade discount',  emoji: '🏷️', max: 6,  cost: 2, desc: 'Machines cost 5% less a level.' },
  headstart:{ name: 'A head start',    emoji: '🚀', max: 10, cost: 3, desc: 'Start two levels higher a level.' },
  contacts: { name: 'Old contacts',    emoji: '🤝', max: 5,  cost: 3, desc: 'The back room is open from day one, Dez sells you 2 more kits a day and 5% cheaper, a level.' },
  legend:   { name: 'Street legend',   emoji: '🕶️', max: 5,  cost: 3, desc: '+10 starting street rep and +5% on every bag, a level.' },
};

// Supplier contracts: cheaper ingredients for a weekly minimum order (a fine if you fall short)
export const SUPPLIERS = {
  millers: { name: "Millers' co-op",    emoji: '🌾', level: 5,  ings: ['flour', 'sugar'],                     disc: 0.2,  min: 150, fine: 300 },
  dairy:   { name: 'Valley Dairy',      emoji: '🥛', level: 8,  ings: ['butter', 'milk', 'cream', 'eggs'],    disc: 0.2,  min: 150, fine: 400 },
  grocer:  { name: 'Greens & Sons',     emoji: '🍓', level: 16, ings: ['fruit', 'tomato', 'citrus', 'honey'], disc: 0.18, min: 120, fine: 500 },
  butcher: { name: 'Hartley Butchers',  emoji: '🥩', level: 20, ings: ['meat', 'fish'],                       disc: 0.18, min: 100, fine: 800 },
  pantry:  { name: 'The Spice Pantry',  emoji: '🌶️', level: 30, ings: ['cheese', 'nuts', 'spices', 'rice', 'noodles', 'beans', 'leaves', 'chocolate', 'ice'], disc: 0.15, min: 150, fine: 1200 },
  fine:    { name: 'Fine Foods Direct', emoji: '✨', level: 60, ings: ['cocoa', 'vanilla', 'saffron', 'truffle', 'goldleaf'], disc: 0.15, min: 60, fine: 5000 },
};
// Insurance: a daily premium; claims make HMRC look a little harder that week
export const INSURANCE = {
  premises: { name: 'Premises cover', emoji: '🛡️', base: 25, perLevel: 5, desc: 'Pays back anything the heavies or robbers take from the till, and repairs smashed decor.' },
  machines: { name: 'Machine cover',  emoji: '🔧', base: 20, perLevel: 4, desc: 'Repairs to wrecked machines are free.' },
  claimSuspect: 0.02,
};
// A rival bakery opens across the road once you're popular
export const RIVAL = { name: 'Crumbs & Co', level: 12, pop: 65, chance: 0.1, start: 0.12, grow: 0.01, max: 0.35, campaignHit: 0.04, lowPriceHit: 0.015,
  buyoutBase: 40000, buyoutPerLevel: 4000, closedDays: 30 };
// The detective building a case. Evidence comes from seizures, stings, informants and unexplained money; at 100 it goes to court.
export const CASE = { detective: 'DI Harrow', decay: 2.5, decayBusy: 1.2, doorCop: 1, stages: [25, 50, 75],
  sting: 6, seizure: 7, riderStop: 2, sweep: 3, informant: 10, hmrc: 6, raid: 4, bust: 10,
  bribeBase: 2000, bribePerLevel: 300, bribeCut: 30, bribeFail: 0.3, bribeBack: 20,
  frameBase: 5000, framePerLevel: 500, frameCut: 45, frameFail: 0.4, frameBack: 25,
  courtSealDays: 7, courtClean: 0.25, courtCapPerLevel: 5000, courtDirty: 0.5, courtPop: 25, after: 0 };
// Crew loyalty: paid crew warm up over time; disloyal night crew may talk
export const LOYALTY = { start: [55, 80], perDay: 1, informAt: 30, informChance: 0.05, bonusGain: 15, bailBase: 500, bailPerLevel: 60 };
// Weekly black-market auction of rare kits (rare products can't be bought from Dez any other way)
export const AUCTION = { day: 5, hours: 24, kitsMin: 2, kitsMax: 5, priceMin: 1.6, priceMax: 2.6, level: 10 };
// Daily and weekly goals. key: the stat that counts; per: target per level (plus base)
export const GOALS = {
  sales:   { text: n => `Take £${n.toLocaleString('en-GB')} in the shops`, stat: 'totalSales', base: 300, per: 120 },
  served:  { text: n => `Serve ${n} customers`, stat: 'served', base: 60, per: 15 },
  batches: { text: n => `Bake ${n} batches`, stat: 'batches', base: 6, per: 1 },
  orders:  { text: n => `Deliver ${n} special orders`, stat: 'orders', base: 1, per: 0.04 },
  bags:    { text: n => `Sell ${n} bags`, stat: 'totalBags', base: 10, per: 3, night: true },
  washed:  { text: n => `Launder £${n.toLocaleString('en-GB')}`, stat: 'totalLaundered', base: 300, per: 150, night: true },
};
export const GOAL_REWARD = { dailyCash: 40, dailyXp: 3, weeklyMult: 5, weeklyTokens: 1 };
// Risky choices that come up now and then (answered from a pop-up; ignored ones take the safe option)
export const CHOICES = {
  bulk:       { title: 'A bulk deal', night: true, text: 'A buyer from out of town wants a big order, right now, at a discount.', yes: 'Do the deal', no: 'Turn it down' },
  journalist: { title: 'A journalist', text: 'A local reporter wants to do a piece on "the little stall that grew".', yes: 'Give the interview', no: 'No comment' },
  inspector:  { title: 'Health inspector', text: 'A health inspector has found a few things to "improve". There\'s a quick fix, for a fee.', yes: 'Pay for the fix', no: 'Risk it' },
  package:    { title: 'A favour for Dez', night: true, text: 'Dez wants you to keep a package in the back room for a week. He\'ll pay well. Don\'t ask what\'s in it.', yes: 'Keep it', no: 'Say no' },
  charity:    { title: 'A charity appeal', text: 'The children\'s hospital is raising money and has asked local businesses to chip in.', yes: 'Donate', no: 'Not this time' },
};
// Prestige challenges: harder runs for more tokens next time
export const CHALLENGES = {
  none:      { name: 'No challenge', mult: 1, desc: 'A normal fresh start.' },
  nolab:     { name: 'Clean hands',  mult: 1.5, desc: 'No back room this run: Dez never comes by. +50% tokens.' },
  doubletax: { name: 'The taxman cometh', mult: 1.5, desc: 'Every tax bill is doubled. +50% tokens.' },
  bigdebt:   { name: 'Rosa\'s real debts', mult: 1.4, desc: 'The debt you inherit is doubled. +40% tokens.' },
};
// Heat in separate places: vans and the streets have their own, and cool faster than the back room
export const AREA_HEAT = { decayPerHour: 1, mainShare: 0.3 };

// Special orders: a client wants a batch of something by a deadline and pays well for it
export const CLIENTS = ['The Kingsmere Cricket Club', 'A wedding at St Mary\'s', 'An office leaving do', 'The primary school fete', 'A film crew on location',
  'The bowls club', 'A christening', 'The council canteen', 'A charity fun run', 'The rugby club bar', 'A hen party', 'The care home',
  'The tech start-up upstairs', 'A golden wedding anniversary', 'The market traders\' breakfast', 'A wake (Rosa would approve)'];
export const DEZ_CLIENTS = ['A festival crew', 'Some lads from the docks', 'A uni house party', 'A footballer\'s birthday', 'The casino back room',
  'A yacht party', 'A band on tour', 'Somebody\'s cousin from out of town', 'A warehouse rave', 'A very quiet accountant'];
export const ORDERS = { caps: [[3, 1], [10, 2], [25, 3], [50, 4], [75, 5]], everyHours: 3, minHours: 4, maxHours: 20,
  bakeryPay: 1.8, dezPay: 1.6, xpMult: 2, missPop: 2, missStreet: 3, heat: 2 };

// Milestones: one-off rewards (clean cash and XP)
export const MILESTONES = [
  { id: 'firstsale',  emoji: '🥐', name: 'Open for business', stat: 'served', n: 1, cash: 50 },
  { id: 'served1k',   emoji: '🧺', name: 'A thousand customers', stat: 'served', n: 1000, cash: 500 },
  { id: 'served25k',  emoji: '🛒', name: 'A local favourite', stat: 'served', n: 25000, cash: 5000 },
  { id: 'served250k', emoji: '🏙️', name: 'Known all over town', stat: 'served', n: 250000, cash: 50000 },
  { id: 'served2m',   emoji: '🌍', name: 'A national treasure', stat: 'served', n: 2000000, cash: 500000 },
  { id: 'debtfree',   emoji: '🎉', name: 'Debt free', stat: 'won', n: 1, cash: 2000 },
  { id: 'lv10',       emoji: '🔟', name: 'Level 10', stat: 'level', n: 10, cash: 1000 },
  { id: 'lv25',       emoji: '🎖️', name: 'Level 25', stat: 'level', n: 25, cash: 10000 },
  { id: 'lv50',       emoji: '🏅', name: 'Level 50', stat: 'level', n: 50, cash: 100000 },
  { id: 'lv75',       emoji: '🥈', name: 'Level 75', stat: 'level', n: 75, cash: 500000 },
  { id: 'lv99',       emoji: '🥇', name: 'Level 99', stat: 'level', n: 99, cash: 5000000 },
  { id: 'recipes25',  emoji: '📖', name: 'Twenty-five recipes', stat: 'recipes', n: 25, cash: 2000 },
  { id: 'recipes100', emoji: '📚', name: 'A hundred recipes', stat: 'recipes', n: 100, cash: 50000 },
  { id: 'recipes205', emoji: '🧑‍🍳', name: 'Every recipe', stat: 'recipes', n: 205, cash: 2000000 },
  { id: 'shop2',      emoji: '☕', name: 'A second shop', stat: 'shops', n: 2, cash: 5000 },
  { id: 'shop5',      emoji: '👑', name: 'An empire of cake', stat: 'shops', n: 5, cash: 1000000 },
  { id: 'decor10',    emoji: '🪴', name: 'Homely', stat: 'decor', n: 10, cash: 1000 },
  { id: 'orders10',   emoji: '📦', name: 'Reliable', stat: 'orders', n: 10, cash: 3000 },
  { id: 'orders100',  emoji: '🚚', name: 'Never late', stat: 'orders', n: 100, cash: 60000 },
  { id: 'critic5',    emoji: '⭐', name: 'Five stars', stat: 'fivestars', n: 1, cash: 10000 },
  { id: 'bags100',    emoji: '💜', name: 'Side hustle', stat: 'bags', n: 100, cash: 1000 },
  { id: 'bags10k',    emoji: '🕶️', name: 'Kingpin', stat: 'bags', n: 10000, cash: 100000 },
  { id: 'washed100k', emoji: '🧼', name: 'Squeaky clean', stat: 'laundered', n: 100000, cash: 10000 },
  { id: 'corners3',   emoji: '🗺️', name: 'Turf war', stat: 'corners', n: 3, cash: 10000 },
  { id: 'taxpaid',    emoji: '🧾', name: 'Model taxpayer', stat: 'taxPaid', n: 100000, cash: 20000 },
  { id: 'survived',   emoji: '🚔', name: 'Bounced back', stat: 'busts', n: 1, cash: 500 },
];
// A food critic turns up now and then; the review depends on what's in the case, the decor and popularity
export const CRITIC = { chance: 0.12, boostHours: 48, boost: [0.6, 0.85, 1, 1.15, 1.35], pop: [-8, -3, 0, 4, 10],
  names: ['Gillian Crust of The Courier', 'Marcus Fennel (Eat Out)', 'A food blogger with 2M followers', 'The Evening Herald\'s critic', 'Someone from the Guide'] };

// What the day looks like: customers per hour multiplier by local hour (0..23)
export const HOUR_TRADE = [0.12, 0.08, 0.06, 0.06, 0.08, 0.2, 0.6, 1.2, 1.4, 1.1, 1.0, 1.1, 1.4, 1.4, 1.1, 1.0, 1.0, 1.1, 0.9, 0.8, 0.6, 0.45, 0.3, 0.18];
// Who wants what by hour block
export const HOUR_TASTE = [
  { until: 6,  w: { drink: 0.35, savory: 0.3, sweet: 0.15, cold: 0.05, bread: 0.05, pastry: 0.1 } },
  { until: 11, w: { bread: 0.32, pastry: 0.28, drink: 0.25, sweet: 0.07, savory: 0.06, cold: 0.02 } },
  { until: 15, w: { savory: 0.3, bread: 0.15, pastry: 0.2, drink: 0.15, sweet: 0.12, cold: 0.08 } },
  { until: 19, w: { sweet: 0.3, pastry: 0.2, cold: 0.15, drink: 0.15, savory: 0.12, bread: 0.08 } },
  { until: 24, w: { savory: 0.35, drink: 0.25, sweet: 0.2, cold: 0.08, pastry: 0.07, bread: 0.05 } },
];
export const GROUP_TEXT = { bread: 'mornings', pastry: 'all day', sweet: 'afternoons', drink: 'all day, busiest early', savory: 'lunch and late night', cold: 'afternoons and heatwaves' };

export const INGREDIENTS = {
  flour:    { name: 'Flour',      emoji: '🌾', base: 1.5 },
  butter:   { name: 'Butter',     emoji: '🧈', base: 2.0 },
  sugar:    { name: 'Sugar',      emoji: '🍬', base: 0.8 },
  eggs:     { name: 'Eggs',       emoji: '🥚', base: 1.2 },
  chocolate:{ name: 'Chocolate',  emoji: '🍫', base: 2.5 },
  fruit:    { name: 'Fruit',      emoji: '🍓', base: 2.0 },
  milk:     { name: 'Milk',       emoji: '🥛', base: 1.0 },
  beans:    { name: 'Coffee beans', emoji: '🫘', base: 2.4, level: 4 },
  leaves:   { name: 'Tea leaves', emoji: '🍃', base: 1.4, level: 5 },
  cream:    { name: 'Cream',      emoji: '🫙', base: 2.2, level: 6 },
  meat:     { name: 'Meat',       emoji: '🥩', base: 3.2, level: 7 },
  nuts:     { name: 'Nuts',       emoji: '🥜', base: 3.0, level: 11 },
  cheese:   { name: 'Cheese',     emoji: '🧀', base: 2.6, level: 11 },
  ice:      { name: 'Ice',        emoji: '🧊', base: 0.6, level: 12 },
  tomato:   { name: 'Tomatoes',   emoji: '🍅', base: 1.8, level: 16 },
  honey:    { name: 'Honey',      emoji: '🍯', base: 3.0, level: 21 },
  rice:     { name: 'Rice',       emoji: '🍚', base: 1.2, level: 27 },
  noodles:  { name: 'Noodles',    emoji: '🍝', base: 1.6, level: 33 },
  spices:   { name: 'Spices',     emoji: '🌶️', base: 2.8, level: 37 },
  cocoa:    { name: 'Fine cocoa', emoji: '🟤', base: 3.5, level: 39 },
  citrus:   { name: 'Citrus',     emoji: '🍋', base: 1.6, level: 51 },
  vanilla:  { name: 'Vanilla',    emoji: '🌼', base: 5.0, level: 53 },
  fish:     { name: 'Fish',       emoji: '🐟', base: 4.5, level: 59 },
  saffron:  { name: 'Saffron',    emoji: '🌸', base: 9.0, level: 76 },
  truffle:  { name: 'Truffle',    emoji: '🍄', base: 14, level: 80 },
  goldleaf: { name: 'Gold leaf',  emoji: '✨', base: 22, level: 92 },
};

// Kitchen machines. caps: [level, how many you may own from that level]. model: which 3D shape to use.
export const MACHINES = {
  oven:       { name: 'Oven',              plural: 'ovens',              emoji: '🔥', level: 1,  price: 800,   free: 2, caps: [[1, 2], [5, 3]], verb: 'Baking',   spoil: 'burnt',  model: 'oven' },
  mixer:      { name: 'Mixer',             plural: 'mixers',             emoji: '🥣', level: 1,  price: 500,   free: 1, caps: [[1, 1], [9, 2], [21, 3]],          verb: 'Mixing',   spoil: 'spoiled', model: 'mixer' },
  fryer:      { name: 'Fryer',             plural: 'fryers',             emoji: '🍳', level: 2,  price: 700,   caps: [[2, 1], [10, 2], [22, 3]],                  verb: 'Frying',   spoil: 'burnt',  model: 'fryer' },
  drinks:     { name: 'Drinks machine',    plural: 'drinks machines',    emoji: '☕', level: 4,  price: 900,   caps: [[4, 1], [12, 2], [24, 3]],                  verb: 'Brewing',  spoil: 'gone cold', model: 'drinks' },
  icecream:   { name: 'Ice cream machine', plural: 'ice cream machines', emoji: '🍦', level: 7,  price: 1100,  caps: [[7, 1], [15, 2], [27, 3]],                           verb: 'Churning', spoil: 'melted', model: 'icecream' },
  grill:      { name: 'Sandwich grill',    plural: 'grills',             emoji: '🥪', level: 11, price: 1000,  caps: [[11, 1], [19, 2], [31, 3]],                          verb: 'Grilling', spoil: 'burnt',  model: 'grill' },
  pizza:      { name: 'Pizza oven',        plural: 'pizza ovens',        emoji: '🍕', level: 16, price: 2200,  caps: [[16, 1], [24, 2], [36, 3]],                          verb: 'Firing',   spoil: 'burnt',  model: 'pizza' },
  griddle:    { name: 'Crêpe griddle',     plural: 'griddles',           emoji: '🫓', level: 21, price: 2600,  caps: [[21, 1], [29, 2], [41, 3]],                          verb: 'Cooking',  spoil: 'burnt',  model: 'grill', tint: '#d9a066' },
  steamer:    { name: 'Dim sum steamer',   plural: 'steamers',           emoji: '🎍', level: 27, price: 3200,  caps: [[27, 1], [35, 2], [47, 3]],                          verb: 'Steaming', spoil: 'gone soggy', model: 'steamer' },
  noodles:    { name: 'Noodle bar',        plural: 'noodle bars',        emoji: '🍜', level: 33, price: 3800,  caps: [[33, 1], [41, 2], [53, 3]],                          verb: 'Simmering', spoil: 'gone soggy', model: 'steamer', tint: '#c8323c' },
  choc:       { name: 'Chocolate station', plural: 'chocolate stations', emoji: '🍫', level: 39, price: 4600,  caps: [[39, 1], [47, 2], [59, 3]],                          verb: 'Tempering', spoil: 'bloomed', model: 'mixer', tint: '#5a3320' },
  bbq:        { name: 'Smoker',            plural: 'smokers',            emoji: '🍖', level: 46, price: 5500,  caps: [[46, 1], [54, 2], [66, 3]],                          verb: 'Smoking',  spoil: 'dried out', model: 'pizza', tint: '#2b2d36' },
  patisserie: { name: 'Patisserie bench',  plural: 'patisserie benches', emoji: '🧁', level: 53, price: 6800,  caps: [[53, 1], [61, 2], [73, 3]],                          verb: 'Assembling', spoil: 'collapsed', model: 'mixer', tint: '#ffd6de' },
  bar:        { name: 'Drinks bar',        plural: 'drinks bars',        emoji: '🍹', level: 61, price: 8200,  caps: [[61, 1], [69, 2], [81, 3]],                          verb: 'Mixing',   spoil: 'gone flat', model: 'drinks', tint: '#3cc6c6' },
  sushi:      { name: 'Sushi counter',     plural: 'sushi counters',     emoji: '🍣', level: 68, price: 9500,  caps: [[68, 1], [76, 2], [88, 3]],                          verb: 'Rolling',  spoil: 'spoiled', model: 'steamer', tint: '#f4f0e8' },
  rotisserie: { name: 'Rotisserie',        plural: 'rotisseries',        emoji: '🍗', level: 76, price: 11000, caps: [[76, 1], [84, 2], [96, 3]],                          verb: 'Roasting', spoil: 'dried out', model: 'pizza', tint: '#c9ccd3' },
  candy:      { name: 'Sweet machine',     plural: 'sweet machines',     emoji: '🍭', level: 84, price: 13000, caps: [[84, 1], [92, 2], [99, 3]],                          verb: 'Spinning', spoil: 'gone sticky', model: 'icecream', tint: '#b58cff' },
  grand:      { name: 'Grand patisserie',  plural: 'grand patisseries',  emoji: '👑', level: 92, price: 16000, caps: [[92, 1], [97, 2], [99, 3]],                          verb: 'Creating', spoil: 'spoiled', model: 'oven', tint: '#d4af37' },
};
export const MACHINE_PRICE_STEP = 0.35;

// Recipes. Servings, price and ingredient amounts come from the recipe's level and cook time, so later
// recipes always earn more per serving and make more servings per batch. Short recipes suit active play,
// long ones cover the hours you're away.
const GROUP_PRICE = { drink: 0.8, cold: 0.9, bread: 1.0, sweet: 1.0, pastry: 1.1, savory: 1.2 };
function R(machine, name, emoji, group, level, minutes, ing) {
  const servings = Math.round(10 + 0.5 * level + 6 * Math.log2(1 + minutes / 5));
  const price = Math.round((1.8 + 0.09 * level) * GROUP_PRICE[group] * 10) / 10;
  return { machine, name, emoji, group, level, minutes, servings, price, ingList: ing,
    cost: level <= 1 ? 0 : Math.round(150 * Math.pow(level, 1.35) / 10) * 10 };
}
export const ITEMS = {
  // Oven
  sourdough:   R('oven', 'Sourdough', '🍞', 'bread', 1, 120, ['flour']),
  croissant:   R('oven', 'Croissants', '🥐', 'pastry', 1, 30, ['flour', 'butter']),
  cookies:     R('oven', 'Cookies', '🍪', 'sweet', 1, 2, ['flour', 'sugar', 'chocolate']),
  baguette:    R('oven', 'Baguettes', '🥖', 'bread', 2, 5, ['flour']),
  tart:        R('oven', 'Fruit tarts', '🥧', 'pastry', 3, 15, ['flour', 'butter', 'fruit']),
  muffin:      R('oven', 'Muffins', '🧁', 'sweet', 4, 240, ['flour', 'sugar', 'eggs', 'fruit']),
  bun:         R('oven', 'Cinnamon buns', '🥨', 'sweet', 5, 60, ['flour', 'butter', 'sugar']),
  flatbread:   R('oven', 'Flatbreads', '🫓', 'bread', 8, 480, ['flour', 'butter']),
  cheesecake:  R('oven', 'Cheesecake', '🍰', 'pastry', 9, 20, ['cream', 'sugar', 'butter', 'fruit']),
  honeyroll:   R('oven', 'Nut rolls', '🌰', 'sweet', 12, 180, ['flour', 'nuts', 'sugar', 'butter']),
  layercake:   R('oven', 'Layer cake', '🎂', 'pastry', 15, 45, ['flour', 'eggs', 'cream', 'sugar', 'fruit']),
  meatpie:     R('oven', 'Steak pies', '🥧', 'savory', 18, 360, ['flour', 'butter', 'meat']),
  macarons:    R('oven', 'Macarons', '🌈', 'sweet', 26, 90, ['nuts', 'sugar', 'eggs']),
  stollen:     R('oven', 'Stollen', '🎄', 'pastry', 47, 720, ['flour', 'fruit', 'nuts', 'butter', 'spices']),
  truffleloaf: R('oven', 'Truffle loaf', '🍄', 'bread', 84, 600, ['flour', 'truffle', 'cheese']),
  // Mixer
  pancakes:    R('mixer', 'Pancakes', '🥞', 'pastry', 1, 5, ['flour', 'eggs', 'milk']),
  waffles:     R('mixer', 'Waffles', '🧇', 'sweet', 3, 30, ['flour', 'eggs', 'milk', 'sugar']),
  caramel:     R('mixer', 'Crème caramel', '🍮', 'sweet', 6, 120, ['eggs', 'cream', 'sugar']),
  mousse:      R('mixer', 'Chocolate mousse', '🍫', 'sweet', 10, 15, ['chocolate', 'cream', 'eggs']),
  smoothie:    R('mixer', 'Smoothie bowls', '🥣', 'cold', 14, 240, ['fruit', 'milk']),
  tiramisu:    R('mixer', 'Tiramisu', '☁️', 'sweet', 29, 60, ['beans', 'cream', 'eggs', 'chocolate']),
  pavlova:     R('mixer', 'Pavlova', '🍥', 'sweet', 43, 480, ['eggs', 'sugar', 'cream', 'fruit']),
  souffle:     R('mixer', 'Soufflé', '🫕', 'sweet', 57, 20, ['eggs', 'cocoa', 'sugar']),
  // Fryer
  donuts:      R('fryer', 'Donuts', '🍩', 'sweet', 2, 5, ['flour', 'sugar', 'eggs']),
  churros:     R('fryer', 'Churros', '🥢', 'sweet', 5, 30, ['flour', 'sugar', 'chocolate']),
  dumplings:   R('fryer', 'Fried dumplings', '🥟', 'savory', 7, 120, ['flour', 'meat']),
  tempura:     R('fryer', 'Tempura', '🍤', 'savory', 11, 15, ['flour', 'eggs', 'meat']),
  chicken:     R('fryer', 'Fried chicken', '🍗', 'savory', 19, 240, ['meat', 'flour', 'eggs']),
  springroll:  R('fryer', 'Spring rolls', '🌯', 'savory', 31, 60, ['flour', 'meat', 'rice']),
  calamari:    R('fryer', 'Calamari', '🦑', 'savory', 64, 360, ['fish', 'flour', 'citrus']),
  // Drinks machine
  coffee:      R('drinks', 'Coffee', '☕', 'drink', 4, 1, ['beans', 'milk']),
  tea:         R('drinks', 'Tea', '🍵', 'drink', 5, 2, ['leaves']),
  juice:       R('drinks', 'Fresh juice', '🧃', 'drink', 6, 15, ['fruit']),
  bubbletea:   R('drinks', 'Bubble tea', '🧋', 'drink', 9, 60, ['leaves', 'milk', 'sugar']),
  chai:        R('drinks', 'Chai latte', '🫖', 'drink', 13, 5, ['leaves', 'milk', 'sugar']),
  milkshake:   R('drinks', 'Milkshakes', '🥤', 'drink', 17, 120, ['milk', 'ice', 'fruit']),
  icedcoffee:  R('drinks', 'Iced coffee', '🧊', 'drink', 25, 30, ['beans', 'milk', 'ice']),
  matcha:      R('drinks', 'Honey matcha', '🍃', 'drink', 41, 240, ['leaves', 'milk', 'honey']),
  // Ice cream machine
  softserve:   R('icecream', 'Soft serve', '🍦', 'cold', 7, 2, ['milk', 'sugar']),
  sundae:      R('icecream', 'Sundaes', '🍨', 'cold', 8, 15, ['cream', 'sugar', 'chocolate']),
  shavedice:   R('icecream', 'Shaved ice', '🍧', 'cold', 12, 60, ['ice', 'fruit', 'sugar']),
  mochi:       R('icecream', 'Mochi ice cream', '🍡', 'cold', 30, 240, ['rice', 'milk', 'sugar']),
  affogato:    R('icecream', 'Affogato', '🍨', 'cold', 48, 120, ['beans', 'cream', 'sugar']),
  // Sandwich grill
  toastie:     R('grill', 'Toasties', '🥪', 'savory', 11, 5, ['flour', 'cheese']),
  hotdog:      R('grill', 'Hot dogs', '🌭', 'savory', 12, 30, ['flour', 'meat']),
  bagel:       R('grill', 'Bagels', '🥯', 'bread', 13, 120, ['flour', 'cheese']),
  burger:      R('grill', 'Burgers', '🍔', 'savory', 20, 15, ['flour', 'meat', 'cheese']),
  quesadilla:  R('grill', 'Quesadillas', '🫔', 'savory', 34, 240, ['flour', 'cheese', 'tomato']),
  kebab:       R('grill', 'Kebabs', '🥙', 'savory', 50, 60, ['meat', 'flour', 'spices']),
  // Pizza oven
  margherita:  R('pizza', 'Margherita', '🍕', 'savory', 16, 5, ['flour', 'tomato', 'cheese']),
  garlicbread: R('pizza', 'Garlic bread', '🧄', 'bread', 22, 30, ['flour', 'butter', 'cheese']),
  pepperoni:   R('pizza', 'Pepperoni pizza', '🍕', 'savory', 32, 120, ['flour', 'tomato', 'cheese', 'meat']),
  trufflepizza:R('pizza', 'Truffle pizza', '🍄', 'savory', 80, 240, ['flour', 'cheese', 'truffle']),
  // Crêpe griddle
  crepes:      R('griddle', 'Crêpes', '🥞', 'sweet', 21, 5, ['flour', 'eggs', 'milk', 'sugar']),
  galette:     R('griddle', 'Savoury galettes', '🌮', 'savory', 24, 30, ['flour', 'eggs', 'cheese', 'meat']),
  okonomiyaki: R('griddle', 'Okonomiyaki', '🥘', 'savory', 38, 120, ['flour', 'eggs', 'meat', 'spices']),
  dorayaki:    R('griddle', 'Dorayaki', '🥮', 'sweet', 49, 240, ['flour', 'eggs', 'honey']),
  // Dim sum steamer
  bao:         R('steamer', 'Bao buns', '🥟', 'savory', 27, 5, ['flour', 'meat', 'sugar']),
  siumai:      R('steamer', 'Siu mai', '🥟', 'savory', 35, 30, ['flour', 'meat', 'rice']),
  lotusbun:    R('steamer', 'Lotus buns', '🍙', 'sweet', 45, 120, ['flour', 'sugar', 'nuts']),
  hargow:      R('steamer', 'Har gow', '🦐', 'savory', 59, 240, ['rice', 'fish', 'flour']),
  // Noodle bar
  ramen:       R('noodles', 'Ramen', '🍜', 'savory', 33, 5, ['noodles', 'meat', 'eggs']),
  udon:        R('noodles', 'Udon', '🍲', 'savory', 40, 30, ['noodles', 'spices']),
  padthai:     R('noodles', 'Pad thai', '🍝', 'savory', 51, 120, ['noodles', 'nuts', 'eggs', 'citrus']),
  laksa:       R('noodles', 'Laksa', '🍛', 'savory', 62, 360, ['noodles', 'spices', 'fish']),
  // Chocolate station
  truffles:    R('choc', 'Chocolate truffles', '🍫', 'sweet', 39, 5, ['cocoa', 'cream', 'sugar']),
  brownies:    R('choc', 'Brownies', '🟫', 'sweet', 42, 30, ['cocoa', 'flour', 'eggs', 'butter']),
  bonbons:     R('choc', 'Bonbons', '💝', 'sweet', 55, 120, ['cocoa', 'cream', 'nuts']),
  dipped:      R('choc', 'Chocolate strawberries', '🍓', 'sweet', 67, 15, ['cocoa', 'fruit']),
  goldtruffles:R('choc', 'Gold truffles', '✨', 'sweet', 93, 240, ['cocoa', 'cream', 'goldleaf']),
  // Smoker
  ribs:        R('bbq', 'Smoked ribs', '🍖', 'savory', 46, 180, ['meat', 'spices', 'honey']),
  brisket:     R('bbq', 'Brisket', '🥩', 'savory', 54, 480, ['meat', 'spices']),
  wings:       R('bbq', 'Sticky wings', '🍗', 'savory', 60, 60, ['meat', 'spices', 'honey']),
  smokedfish:  R('bbq', 'Smoked fish', '🐟', 'savory', 70, 240, ['fish', 'spices', 'citrus']),
  // Patisserie bench
  eclairs:     R('patisserie', 'Éclairs', '🍰', 'pastry', 53, 5, ['flour', 'eggs', 'cream', 'cocoa']),
  millefeuille:R('patisserie', 'Mille-feuille', '📜', 'pastry', 58, 30, ['flour', 'butter', 'cream', 'vanilla']),
  opera:       R('patisserie', 'Opera cake', '🎭', 'pastry', 63, 120, ['cocoa', 'beans', 'cream', 'nuts']),
  croquembouche:R('patisserie', 'Croquembouche', '🗼', 'pastry', 74, 360, ['flour', 'eggs', 'cream', 'sugar', 'vanilla']),
  // Drinks bar
  lemonade:    R('bar', 'Lemonade', '🍋', 'drink', 61, 2, ['citrus', 'sugar', 'ice']),
  mocktail:    R('bar', 'Mocktails', '🍹', 'drink', 65, 15, ['fruit', 'citrus', 'ice']),
  cocoshake:   R('bar', 'Coconut shakes', '🥥', 'drink', 72, 60, ['milk', 'fruit', 'ice']),
  spritz:      R('bar', 'Elderflower spritz', '🍸', 'drink', 81, 5, ['citrus', 'fruit', 'ice', 'vanilla']),
  // Sushi counter
  maki:        R('sushi', 'Maki rolls', '🍣', 'savory', 68, 5, ['rice', 'fish']),
  bento:       R('sushi', 'Bento boxes', '🍱', 'savory', 73, 30, ['rice', 'fish', 'eggs', 'meat']),
  sashimi:     R('sushi', 'Sashimi', '🐠', 'savory', 82, 120, ['fish', 'citrus']),
  omakase:     R('sushi', 'Omakase box', '🎌', 'savory', 89, 240, ['fish', 'rice', 'truffle']),
  // Rotisserie
  roastchicken:R('rotisserie', 'Roast chicken', '🍗', 'savory', 76, 120, ['meat', 'spices', 'citrus']),
  porchetta:   R('rotisserie', 'Porchetta', '🥓', 'savory', 83, 360, ['meat', 'spices', 'saffron']),
  shawarma:    R('rotisserie', 'Shawarma', '🥙', 'savory', 87, 45, ['meat', 'spices', 'flour']),
  // Sweet machine
  candyfloss:  R('candy', 'Candy floss', '🍭', 'sweet', 84, 2, ['sugar']),
  toffeeapple: R('candy', 'Toffee apples', '🍎', 'sweet', 86, 15, ['fruit', 'sugar', 'honey']),
  rockcandy:   R('candy', 'Rock candy', '💎', 'sweet', 90, 240, ['sugar', 'vanilla']),
  // Grand patisserie
  weddingcake: R('grand', 'Wedding cake', '💒', 'pastry', 92, 480, ['flour', 'eggs', 'cream', 'sugar', 'vanilla', 'goldleaf']),
  saffronbun:  R('grand', 'Saffron buns', '🌸', 'pastry', 94, 90, ['flour', 'saffron', 'butter']),
  goldcroissant:R('grand', 'Golden croissants', '🌟', 'pastry', 97, 240, ['flour', 'butter', 'goldleaf']),
  banquet:     R('grand', 'Royal banquet', '👑', 'savory', 99, 720, ['meat', 'truffle', 'saffron', 'goldleaf']),
  // More real-life favourites
  scones: R('oven', "Scones", '🫓', 'pastry', 6, 20, ['flour', 'butter', 'milk']),
  hashbrowns: R('fryer', "Hash browns", '🥔', 'savory', 9, 15, ['flour', 'butter']),
  meringue: R('mixer', "Meringues", '☁️', 'sweet', 9, 60, ['eggs', 'sugar']),
  hotchoc: R('drinks', "Hot chocolate", '🫖', 'drink', 8, 5, ['milk', 'chocolate']),
  latte: R('drinks', "Lattes", '☕', 'drink', 10, 2, ['beans', 'milk']),
  focaccia: R('oven', "Focaccia", '🫓', 'bread', 11, 90, ['flour', 'butter']),
  gelato: R('icecream', "Gelato", '🍨', 'cold', 14, 30, ['milk', 'cream', 'sugar']),
  onionrings: R('fryer', "Onion rings", '🧅', 'savory', 15, 10, ['flour', 'eggs']),
  cappuccino: R('drinks', "Cappuccinos", '☕', 'drink', 15, 10, ['beans', 'milk']),
  panini: R('grill', "Panini", '🥪', 'savory', 16, 10, ['flour', 'cheese', 'tomato']),
  brioche: R('oven', "Brioche", '🍞', 'bread', 17, 240, ['flour', 'butter', 'eggs']),
  trifle: R('mixer', "Trifle", '🍮', 'sweet', 18, 30, ['cream', 'fruit', 'sugar']),
  grilledcheese: R('grill', "Grilled cheese", '🧀', 'savory', 18, 5, ['flour', 'cheese', 'butter']),
  froyo: R('icecream', "Frozen yoghurt", '🍦', 'cold', 20, 10, ['milk', 'fruit']),
  flatwhite: R('drinks', "Flat whites", '☕', 'drink', 22, 15, ['beans', 'milk']),
  sausageroll: R('oven', "Sausage rolls", '🌭', 'savory', 23, 30, ['flour', 'butter', 'meat']),
  crumpets: R('griddle', "Crumpets", '🥞', 'bread', 23, 60, ['flour', 'milk', 'butter']),
  cookiedough: R('mixer', "Cookie dough", '🍪', 'sweet', 24, 15, ['flour', 'butter', 'sugar', 'chocolate']),
  clubsandwich: R('grill', "Club sandwiches", '🥪', 'savory', 25, 60, ['flour', 'meat', 'cheese']),
  calzone: R('pizza', "Calzone", '🥟', 'savory', 26, 60, ['flour', 'cheese', 'tomato', 'meat']),
  donutholes: R('fryer', "Doughnut holes", '🍩', 'sweet', 27, 5, ['flour', 'sugar']),
  quiche: R('oven', "Quiche", '🥧', 'savory', 28, 60, ['flour', 'eggs', 'cheese', 'cream']),
  mocha: R('drinks', "Mochas", '☕', 'drink', 29, 30, ['beans', 'milk', 'chocolate']),
  blinis: R('griddle', "Blinis", '🥞', 'savory', 30, 240, ['flour', 'eggs', 'cream']),
  icedtea: R('drinks', "Iced tea", '🧋', 'drink', 35, 60, ['leaves', 'ice', 'sugar']),
  baklava: R('oven', "Baklava", '🍯', 'sweet', 36, 180, ['flour', 'butter', 'nuts', 'honey']),
  bananasplit: R('icecream', "Banana splits", '🍌', 'cold', 36, 45, ['cream', 'fruit', 'chocolate']),
  hawaiian: R('pizza', "Hawaiian pizza", '🍍', 'savory', 36, 240, ['flour', 'cheese', 'tomato', 'fruit', 'meat']),
  hummus: R('mixer', "Hummus", '🫘', 'savory', 37, 10, ['nuts', 'spices']),
  pho: R('noodles', "Pho", '🍜', 'savory', 37, 240, ['noodles', 'meat', 'spices']),
  falafel: R('fryer', "Falafel", '🧆', 'savory', 38, 30, ['nuts', 'spices', 'flour']),
  xiaolongbao: R('steamer', "Soup dumplings", '🥟', 'savory', 39, 60, ['flour', 'meat']),
  pretzel: R('oven', "Pretzels", '🥨', 'bread', 40, 15, ['flour', 'butter']),
  steaksandwich: R('grill', "Steak sandwiches", '🥩', 'savory', 41, 120, ['flour', 'meat', 'spices']),
  chocice: R('icecream', "Choc ices", '🍫', 'cold', 42, 60, ['cream', 'chocolate']),
  arepas: R('griddle', "Arepas", '🫓', 'savory', 43, 15, ['flour', 'cheese']),
  samosa: R('fryer', "Samosas", '🥟', 'savory', 44, 60, ['flour', 'spices', 'meat']),
  chowmein: R('noodles', "Chow mein", '🍜', 'savory', 44, 10, ['noodles', 'meat']),
  fourcheese: R('pizza', "Four cheese pizza", '🧀', 'savory', 44, 480, ['flour', 'cheese']),
  chocbomb: R('choc', "Hot chocolate bombs", '💣', 'sweet', 45, 60, ['chocolate', 'milk']),
  pumpkinlatte: R('drinks', "Pumpkin spice lattes", '🎃', 'drink', 46, 45, ['beans', 'milk', 'spices']),
  rockyroad: R('choc', "Rocky road", '🍫', 'sweet', 48, 120, ['chocolate', 'nuts', 'sugar']),
  charsiu: R('steamer', "Char siu bao", '🥟', 'savory', 48, 240, ['flour', 'meat', 'honey']),
  pulledpork: R('bbq', "Pulled pork", '🐖', 'savory', 49, 360, ['meat', 'spices']),
  panettone: R('oven', "Panettone", '🎄', 'sweet', 52, 600, ['flour', 'butter', 'eggs', 'fruit', 'sugar']),
  keylime: R('mixer', "Key lime pie", '🥧', 'sweet', 54, 120, ['citrus', 'cream', 'sugar', 'flour']),
  parisbrest: R('patisserie', "Paris-Brest", '🍩', 'pastry', 56, 240, ['flour', 'cream', 'nuts']),
  sorbet: R('icecream', "Sorbet", '🍧', 'cold', 56, 90, ['fruit', 'sugar', 'ice']),
  dandan: R('noodles', "Dan dan noodles", '🌶️', 'savory', 56, 120, ['noodles', 'meat', 'spices', 'nuts']),
  burntends: R('bbq', "Burnt ends", '🥩', 'savory', 57, 600, ['meat', 'spices', 'honey']),
  halloumi: R('grill', "Halloumi wraps", '🌯', 'savory', 57, 30, ['flour', 'cheese', 'tomato']),
  pizzafritta: R('pizza', "Pizza fritta", '🍕', 'savory', 58, 15, ['flour', 'cheese', 'tomato']),
  fishchips: R('fryer', "Fish and chips", '🐟', 'savory', 60, 30, ['fish', 'flour']),
  goldenlatte: R('drinks', "Golden lattes", '🌟', 'drink', 60, 90, ['milk', 'spices', 'honey']),
  tatin: R('patisserie', "Tarte Tatin", '🍎', 'pastry', 60, 60, ['flour', 'butter', 'fruit', 'sugar']),
  pralines: R('choc', "Pralines", '🍬', 'sweet', 61, 240, ['chocolate', 'nuts', 'cream']),
  dutchbaby: R('griddle', "Dutch baby pancakes", '🥞', 'sweet', 63, 480, ['flour', 'eggs', 'milk']),
  mojito: R('bar', "Virgin mojitos", '🍹', 'drink', 63, 30, ['citrus', 'sugar', 'ice']),
  ricewrap: R('steamer', "Lotus rice parcels", '🍃', 'savory', 64, 480, ['rice', 'meat']),
  pannacotta: R('mixer', "Panna cotta", '🍮', 'sweet', 65, 240, ['cream', 'vanilla', 'sugar']),
  wellington: R('oven', "Beef Wellington", '🥩', 'savory', 66, 300, ['flour', 'butter', 'meat', 'spices']),
  pistachio: R('icecream', "Pistachio gelato", '🍨', 'cold', 66, 120, ['nuts', 'milk', 'cream']),
  sausages: R('bbq', "Smoked sausages", '🌭', 'savory', 66, 30, ['meat']),
  deepdish: R('pizza', "Deep dish pizza", '🍕', 'savory', 67, 360, ['flour', 'cheese', 'tomato', 'meat']),
  icedmatcha: R('bar', "Iced matcha", '🍵', 'drink', 67, 90, ['leaves', 'milk', 'ice']),
  macarontower: R('patisserie', "Macaron tower", '🗼', 'sweet', 68, 480, ['eggs', 'sugar', 'nuts']),
  tonkotsu: R('noodles', "Tonkotsu ramen", '🍥', 'savory', 69, 600, ['noodles', 'meat', 'eggs']),
  cheesesteak: R('grill', "Cheesesteaks", '🥖', 'savory', 69, 180, ['flour', 'meat', 'cheese']),
  fondue: R('mixer', "Chocolate fondue", '🫕', 'sweet', 70, 30, ['chocolate', 'cream', 'fruit']),
  nigiri: R('sushi', "Nigiri", '🍣', 'savory', 70, 60, ['rice', 'fish']),
  float: R('bar', "Ice cream floats", '🥤', 'drink', 70, 120, ['cream', 'sugar', 'ice']),
  custardtart: R('oven', "Custard tarts", '🥧', 'pastry', 71, 30, ['flour', 'eggs', 'cream', 'sugar', 'vanilla']),
  chickenbucket: R('fryer', "Fried chicken buckets", '🍗', 'savory', 72, 120, ['meat', 'flour', 'spices']),
  custardbun: R('steamer', "Custard buns", '🟡', 'sweet', 72, 90, ['flour', 'eggs', 'cream']),
  teppanyaki: R('griddle', "Teppanyaki", '🍳', 'savory', 74, 120, ['meat', 'rice', 'spices']),
  frappe: R('drinks', "Vanilla frappés", '🧋', 'drink', 75, 120, ['beans', 'milk', 'ice', 'vanilla']),
  california: R('sushi', "California rolls", '🍱', 'savory', 75, 240, ['rice', 'fish']),
  frozenlemonade: R('bar', "Frozen lemonade", '🍋', 'drink', 76, 240, ['citrus', 'sugar', 'ice']),
  pizzabianca: R('pizza', "Pizza bianca", '🍕', 'savory', 77, 90, ['flour', 'cheese', 'cream']),
  fountain: R('choc', "Chocolate fountain", '⛲', 'sweet', 77, 480, ['chocolate', 'cocoa', 'cream']),
  ryeloaf: R('oven', "Rye loaves", '🍞', 'bread', 78, 480, ['flour', 'honey']),
  seafoodudon: R('noodles', "Seafood udon", '🦐', 'savory', 78, 90, ['noodles', 'fish']),
  gyros: R('rotisserie', "Gyros", '🥙', 'savory', 78, 60, ['meat', 'flour', 'spices']),
  beignets: R('fryer', "Beignets", '🍩', 'pastry', 79, 20, ['flour', 'sugar', 'eggs']),
  blackforest: R('patisserie', "Black Forest gateau", '🍒', 'sweet', 79, 180, ['flour', 'chocolate', 'cream', 'fruit']),
  poke: R('sushi', "Poke bowls", '🥗', 'savory', 79, 15, ['rice', 'fish', 'fruit']),
  beefribs: R('bbq', "Beef ribs", '🍖', 'savory', 80, 720, ['meat', 'spices']),
  periperi: R('rotisserie', "Peri-peri chicken", '🌶️', 'savory', 81, 240, ['meat', 'spices', 'citrus']),
  etonmess: R('mixer', "Eton mess", '🍓', 'sweet', 83, 60, ['cream', 'fruit', 'sugar', 'eggs']),
  espressotonic: R('bar', "Espresso tonics", '🥃', 'drink', 83, 45, ['beans', 'citrus', 'ice']),
  fudge: R('candy', "Fudge", '🟫', 'sweet', 85, 120, ['sugar', 'butter', 'milk']),
  bakedalaska: R('icecream', "Baked Alaska", '🏔️', 'cold', 85, 180, ['cream', 'eggs', 'sugar']),
  temaki: R('sushi', "Hand rolls", '🍙', 'savory', 85, 480, ['rice', 'fish']),
  lobsterroll: R('grill', "Lobster rolls", '🦞', 'savory', 86, 240, ['flour', 'fish', 'butter']),
  lollipops: R('candy', "Lollipops", '🍭', 'sweet', 87, 30, ['sugar', 'fruit']),
  bananabread: R('oven', "Banana bread", '🍌', 'sweet', 88, 120, ['flour', 'fruit', 'sugar', 'eggs']),
  religieuse: R('patisserie', "Religieuse", '🧁', 'pastry', 88, 90, ['flour', 'cream', 'chocolate']),
  lamb: R('rotisserie', "Rotisserie lamb", '🍖', 'savory', 88, 480, ['meat', 'spices']),
  honeycomb: R('candy', "Honeycomb", '🍯', 'sweet', 89, 90, ['sugar', 'honey']),
  marshmallow: R('candy', "Marshmallows", '☁️', 'sweet', 91, 240, ['sugar', 'eggs']),
  chirashi: R('sushi', "Chirashi bowls", '🍱', 'savory', 91, 90, ['rice', 'fish', 'spices']),
  fruitcake: R('grand', "Royal fruitcake", '🎂', 'sweet', 93, 600, ['flour', 'fruit', 'butter', 'nuts']),
  trufflechicken: R('rotisserie', "Truffle chicken", '🍗', 'savory', 94, 360, ['meat', 'truffle']),
  goldbars: R('choc', "Gold bars", '🥇', 'sweet', 95, 360, ['chocolate', 'cocoa', 'goldleaf']),
  saffroncake: R('grand', "Saffron cake", '🍰', 'pastry', 95, 240, ['flour', 'saffron', 'eggs']),
  goldcocktail: R('bar', "Golden mocktails", '🍸', 'drink', 95, 180, ['citrus', 'honey', 'goldleaf']),
  goldlolly: R('candy', "Gold-leaf lollies", '✨', 'sweet', 96, 480, ['sugar', 'goldleaf']),
  truffletart: R('grand', "Truffle tarts", '🍄', 'savory', 96, 120, ['flour', 'truffle', 'cream']),
  goldcroq: R('grand', "Golden croquembouche", '🏆', 'pastry', 98, 360, ['flour', 'cream', 'goldleaf']),
  // Seasonal: only in their season (SEASONS below), learned free when it starts
  heartcookies: { ...R('oven', "Heart cookies", '💘', 'sweet', 1, 4, ['flour', 'sugar', 'butter']), season: 'valentine' },
  lovelatte: { ...R('drinks', "Rose lattes", '🌹', 'drink', 1, 2, ['beans', 'milk', 'sugar']), season: 'valentine' },
  chochearts: { ...R('mixer', "Chocolate hearts", '💝', 'sweet', 1, 8, ['chocolate', 'cream']), season: 'valentine' },
  hotcross: { ...R('oven', "Hot cross buns", '✝️', 'bread', 1, 10, ['flour', 'fruit', 'spices']), season: 'easter' },
  simnel: { ...R('oven', "Simnel cake", '🐣', 'pastry', 1, 30, ['flour', 'fruit', 'nuts', 'eggs']), season: 'easter' },
  easteregg: { ...R('mixer', "Easter eggs", '🥚', 'sweet', 1, 12, ['chocolate', 'sugar']), season: 'easter' },
  icelolly: { ...R('mixer', "Ice lollies", '🍭', 'cold', 1, 10, ['fruit', 'sugar', 'ice']), season: 'summer' },
  strawcream: { ...R('mixer', "Strawberries and cream", '🍓', 'cold', 1, 5, ['fruit', 'cream', 'sugar']), season: 'summer' },
  summercooler: { ...R('drinks', "Summer coolers", '🧉', 'drink', 1, 3, ['fruit', 'citrus', 'ice']), season: 'summer' },
  pumpkinpie: { ...R('oven', "Pumpkin pie", '🎃', 'pastry', 1, 25, ['flour', 'spices', 'cream']), season: 'halloween' },
  spookycake: { ...R('oven', "Spooky cupcakes", '👻', 'sweet', 1, 12, ['flour', 'sugar', 'cocoa']), season: 'halloween' },
  witchbrew: { ...R('drinks', "Witch's brew", '🧪', 'drink', 1, 3, ['fruit', 'sugar', 'spices']), season: 'halloween' },
  parkin: { ...R('oven', "Parkin", '🔥', 'pastry', 1, 30, ['flour', 'honey', 'spices']), season: 'bonfire' },
  bonfiretoffee: { ...R('mixer', "Bonfire toffee", '🎆', 'sweet', 1, 15, ['sugar', 'butter', 'honey']), season: 'bonfire' },
  hotapple: { ...R('drinks', "Hot spiced apple", '🍏', 'drink', 1, 3, ['fruit', 'spices']), season: 'bonfire' },
  mincepies: { ...R('oven', "Mince pies", '🥧', 'pastry', 1, 20, ['flour', 'fruit', 'butter', 'spices']), season: 'christmas' },
  yulelog: { ...R('oven', "Yule log", '🪵', 'sweet', 1, 40, ['flour', 'chocolate', 'cream']), season: 'christmas' },
  gingerbread: { ...R('oven', "Gingerbread people", '🧑‍🎄', 'sweet', 1, 10, ['flour', 'honey', 'spices']), season: 'christmas' },
  mulled: { ...R('drinks', "Mulled juice", '🍷', 'drink', 1, 4, ['fruit', 'citrus', 'spices']), season: 'christmas' },
  xmaspud: { ...R('mixer', "Christmas pudding", '🎄', 'sweet', 1, 60, ['fruit', 'nuts', 'butter']), season: 'christmas' },
};
for (const r of Object.values(ITEMS)) if (r.season) { r.cost = 0; r.price = Math.round(r.price * 1.25 * 10) / 10; } // seasonal treats sell for a bit more
// Ingredient amounts: about a quarter of what a batch sells for, split across its ingredients.
for (const r of Object.values(ITEMS)) {
  const budget = r.servings * r.price * 0.25 / r.ingList.length;
  r.ing = Object.fromEntries(r.ingList.map(k => [k, Math.max(1, Math.round(budget / INGREDIENTS[k].base))]));
}
// The first recipe of each machine comes free with it.
for (const type of Object.keys(MACHINES)) {
  const first = Object.entries(ITEMS).filter(([, r]) => r.machine === type && !r.season).sort((a, b) => a[1].level - b[1].level)[0];
  if (first) first[1].cost = 0;
}
export const START_RECIPES = ['sourdough', 'croissant', 'cookies', 'pancakes'];

// The back room: machines and what they make. All the "chemistry" is game mechanics: kits come from Dez,
// a cook takes time, and purity, cutting and equipment tiers decide what a bag is worth.
export const LAB_MACHINES = {
  tent:       { name: 'Grow tent',     plural: 'grow tents',    emoji: '🌿', level: 1,  price: 1200,  free: 1, caps: [[1, 1], [9, 2], [21, 3]], verb: 'Growing', model: 'tent' },
  burner:     { name: 'Burner',        plural: 'burners',       emoji: '♨️', level: 4,  price: 1800,  caps: [[4, 1], [12, 2], [24, 3]], verb: 'Cooking', model: 'burner' },
  pillpress:  { name: 'Pill press',    plural: 'pill presses',  emoji: '💊', level: 12, price: 4500,  caps: [[12, 1], [20, 2], [32, 3]], verb: 'Pressing', model: 'press', tint: '#e8b9d6' },
  dryer:      { name: 'Drying rack',   plural: 'drying racks',  emoji: '🍄', level: 16, price: 5500,  caps: [[16, 1], [24, 2], [36, 3]], verb: 'Drying', model: 'rack' },
  brickpress: { name: 'Brick press',   plural: 'brick presses', emoji: '🧱', level: 22, price: 9000,  caps: [[22, 1], [30, 2], [42, 3]], verb: 'Pressing', model: 'press' },
  still:      { name: 'Still',         plural: 'stills',        emoji: '⚗️', level: 28, price: 12000, caps: [[28, 1], [36, 2], [48, 3]], verb: 'Brewing', model: 'still' },
  kiln:       { name: 'Curing oven',   plural: 'curing ovens',  emoji: '🏺', level: 30, price: 15000, caps: [[30, 1], [38, 2], [50, 3]], verb: 'Curing', model: 'kiln' },
  edibles:    { name: 'Edibles oven',  plural: 'edibles ovens', emoji: '🧁', level: 34, price: 16000, caps: [[34, 1], [42, 2], [54, 3]], verb: 'Baking', model: 'oven', tint: '#9c7bd6' },
  lab:        { name: 'Lab bench',     plural: 'lab benches',   emoji: '🧪', level: 42, price: 24000, caps: [[42, 1], [50, 2], [62, 3]], verb: 'Dropping', model: 'chamber' },
  vat:        { name: 'Mixing vat',    plural: 'mixing vats',   emoji: '🛢️', level: 50, price: 32000, caps: [[50, 1], [58, 2], [70, 3]], verb: 'Mixing', model: 'still', tint: '#7fb8a0' },
  chamber:    { name: 'Clean room',    plural: 'clean rooms',   emoji: '🔮', level: 68, price: 60000, caps: [[68, 1], [76, 2], [88, 3]], verb: 'Refining', model: 'chamber' },
};
// Parody products (nothing here is a real recipe). share: how often buyers ask for it. heat: per cook.
// cop: extra chance a buyer wanting it is undercover. ing: bakery stock it also uses (edibles).
function P(machine, name, emoji, family, level, minutes, bags, list, extra = {}) {
  const price = Math.round(list * 2); // dirty money comes easier than clean (and costs more to keep)
  return { machine, name, emoji, family, level, minutes, bags, price,
    kit: Math.round(0.3 * bags * price / 10) * 10,
    heat: Math.min(6, Math.round((0.4 + price / 120) * 10) / 10),
    cop: Math.min(0.12, Math.round(price / 9000 * 1000) / 1000),
    share: Math.round(Math.max(0.12, 1.3 - level / 70) * 100) / 100, ...extra };
}
export const FAMILIES = {
  green: { name: 'Green', emoji: '🌿' }, crystal: { name: 'Crystal', emoji: '💎' }, pills: { name: 'Pills', emoji: '💊' },
  shrooms: { name: 'Mushrooms', emoji: '🍄' }, powder: { name: 'Powder', emoji: '❄️' }, syrup: { name: 'Syrup', emoji: '🥤' },
  hash: { name: 'Hash', emoji: '🪨' }, edibles: { name: 'Edibles', emoji: '🧁' }, paper: { name: 'Paper', emoji: '🌈' },
  party: { name: 'Party', emoji: '🎈' }, premium: { name: 'Premium', emoji: '💠' },
};
export const PRODUCTS = {
  homegrown:   P('tent', "Grandad's Green", '🌿', 'green', 1, 120, 12, 20),
  skunk:       P('tent', 'Stinky Skunk', '🦨', 'green', 5, 240, 14, 28),
  kushpuppy:   P('tent', 'Kush Puppy', '🐶', 'green', 10, 360, 14, 40),
  sourdeez:    P('tent', 'Sour Deez', '🍋', 'green', 19, 480, 16, 55),
  northern:    P('tent', 'Northern Fright', '🎃', 'green', 31, 600, 16, 75),
  purplehays:  P('tent', 'Purple Hays', '🪻', 'green', 47, 720, 18, 95),
  crystalblue: P('burner', 'Crystal Blue', '💎', 'crystal', 4, 30, 10, 45),
  glass:       P('burner', 'Glass', '🔷', 'crystal', 14, 60, 10, 75),
  icequeen:    P('burner', 'Ice Queen', '🧊', 'crystal', 26, 120, 12, 110),
  cobalt:      P('burner', 'Cobalt Clear', '🔵', 'crystal', 58, 240, 12, 220),
  smileys:     P('pillpress', 'Smileys', '😊', 'pills', 12, 20, 20, 15),
  mollies:     P('pillpress', 'Mollies', '💗', 'pills', 20, 45, 20, 22),
  hearts:      P('pillpress', 'Loved-Up Hearts', '💖', 'pills', 33, 90, 24, 30),
  raveblues:   P('pillpress', 'Rave Blues', '💙', 'pills', 52, 180, 24, 45),
  mushies:     P('dryer', 'Magic Mushies', '🍄', 'shrooms', 16, 240, 14, 30),
  goldencaps:  P('dryer', 'Golden Caps', '🟡', 'shrooms', 37, 480, 16, 50),
  bricks:      P('brickpress', 'Bricks', '🧱', 'powder', 22, 60, 8, 120),
  snowman:     P('brickpress', 'Snowman', '⛄', 'powder', 36, 120, 8, 180),
  avalanche:   P('brickpress', 'Avalanche', '🏔️', 'powder', 55, 240, 10, 260),
  paradise:    P('brickpress', 'Pure Paradise', '🌴', 'powder', 75, 360, 10, 380),
  purplesip:   P('still', 'Purple Sip', '🥤', 'syrup', 28, 90, 12, 35),
  doublecup:   P('still', 'Double Cup', '🧃', 'syrup', 44, 180, 14, 55),
  hashrock:    P('kiln', 'Rocky Road Hash', '🪨', 'hash', 30, 180, 12, 45),
  moonrock:    P('kiln', 'Moonrock', '🌑', 'hash', 62, 360, 12, 120),
  spacecakes:  P('edibles', 'Space Cakes', '🧁', 'edibles', 34, 60, 16, 25, { ing: { flour: 4, butter: 2, sugar: 2 } }),
  gummies:     P('edibles', 'Giggle Gummies', '🍬', 'edibles', 41, 90, 24, 18, { ing: { sugar: 4, fruit: 2 } }),
  happybrownies: P('edibles', 'Happy Brownies', '🟫', 'edibles', 57, 120, 20, 35, { ing: { flour: 3, chocolate: 3, butter: 2 } }),
  tabs:        P('lab', 'Rainbow Tabs', '🌈', 'paper', 42, 120, 30, 18),
  blotter:     P('lab', 'Blotter Art', '🎨', 'paper', 64, 240, 30, 28),
  donkeydust:  P('vat', 'Donkey Dust', '🫏', 'party', 50, 90, 12, 65),
  balloons:    P('vat', 'Party Balloons', '🎈', 'party', 53, 30, 40, 6),
  diamond:     P('chamber', 'Diamond Dust', '💠', 'premium', 68, 360, 10, 600),
  unicorn:     P('chamber', 'Unicorn Tears', '🦄', 'premium', 80, 420, 10, 850),
  goldstandard: P('chamber', 'The Gold Standard', '🏆', 'premium', 92, 480, 8, 1400),
  // Rare: only from the weekly black-market auction
  bluemoon:    P('burner', 'Blue Moon Crystal', '🌙', 'crystal', 10, 60, 10, 160, { rare: true, share: 1.2 }),
  dragon:      P('tent', "Dragon's Breath", '🐉', 'green', 10, 240, 14, 90, { rare: true, share: 1.2 }),
  goldbrick:   P('brickpress', 'Golden Brick', '🟨', 'powder', 30, 120, 8, 420, { rare: true, share: 1 }),
  stardust:    P('chamber', 'Stardust', '🌠', 'premium', 70, 300, 8, 1800, { rare: true, share: 0.8 }),
};
// Cutting: more bags, lower purity
export const CUTS = {
  none:  { label: 'Pure',  bags: 1,    purity: 1 },
  light: { label: 'Light', bags: 1.25, purity: 0.85 },
  heavy: { label: 'Heavy', bags: 1.6,  purity: 0.65 },
};
// Price multiplier for a bag's purity (0..1): 60% purity sells at the list price
export const purityMult = p => Math.round((0.5 + 0.85 * p) * 100) / 100;
// Equipment tiers (bakery and back-room machines): bought with the machine's own cash
export const TIERS = { max: 5, costMult: 0.8, costGrow: 2, speed: 0.06, servings: 0.12, labSpeed: 0.08, labPurity: 0.06 };

// Turf: corners around town where your people sell while you're away. rate: bags an hour. mult: price.
// risk: daily chance of a police sweep while it's selling. Paid for with dirty cash.
export const CORNERS = {
  estate:    { name: 'The estate',     emoji: '🏚️', level: 6,  price: 2000,   rate: 3,  mult: 0.9,  risk: 0.06, cap: 40 },
  park:      { name: 'The park',       emoji: '🌳', level: 10, price: 3500,   rate: 3,  mult: 1.0,  risk: 0.05, cap: 40 },
  station:   { name: 'The station',    emoji: '🚉', level: 15, price: 6000,   rate: 4,  mult: 1.0,  risk: 0.06, cap: 60 },
  campus:    { name: 'Uni campus',     emoji: '🎓', level: 20, price: 9000,   rate: 5,  mult: 1.1,  risk: 0.05, cap: 60 },
  clubland:  { name: 'Clubland',       emoji: '🪩', level: 28, price: 15000,  rate: 7,  mult: 1.2,  risk: 0.07, cap: 80 },
  docks:     { name: 'The docks',      emoji: '⚓', level: 38, price: 25000,  rate: 6,  mult: 1.15, risk: 0.05, cap: 80 },
  casino:    { name: 'The casino strip', emoji: '🎰', level: 50, price: 45000, rate: 8,  mult: 1.35, risk: 0.06, cap: 100 },
  suburbs:   { name: 'Leafy suburbs',  emoji: '🏡', level: 62, price: 70000,  rate: 6,  mult: 1.5,  risk: 0.04, cap: 100 },
  marina:    { name: 'The marina',     emoji: '🛥️', level: 75, price: 120000, rate: 8,  mult: 1.7,  risk: 0.05, cap: 120 },
  penthouse: { name: 'Penthouse parties', emoji: '🏙️', level: 88, price: 200000, rate: 10, mult: 2.0, risk: 0.05, cap: 150 },
};
// Rosa's shops. The stall is where it all started; every branch costs far more than the one before, runs
// its own machines (the pricier the branch, the more profitable its kitchen), pays its own rent and charges
// more for the same food. Branches are also fronts: each lets you launder more every day.
// lab: the back-room machines that shop's back room takes (each branch has its own back room and back door)
export const SHOPS = {
  stall:     { name: "Rosa's Bakery",           short: 'The stall',     emoji: '🥖', level: 1,  rent: 40,    priceMult: 1,    cust: 1,    launder: 0,      drive: 0,
               machines: ['oven', 'mixer', 'fryer', 'drinks'],             lab: ['tent', 'burner', 'pillpress', 'dryer'],    floor: 'checker',     wall: 'plaster', sign: "Rosa's Bakery" },
  cafe:      { name: "Rosa's Café, Kingsmere",  short: 'The café',      emoji: '☕', level: 7,  rent: 150,   priceMult: 1.1,  cust: 0.6,  launder: 1500,   drive: 1,
               machines: ['icecream', 'grill', 'pizza', 'griddle'],        lab: ['brickpress', 'still', 'kiln', 'edibles'],   floor: 'wood',        wall: 'brick',   sign: "Rosa's Café" },
  deli:      { name: "Rosa's Deli, Ashford",    short: 'The deli',      emoji: '🧀', level: 27, rent: 600,   priceMult: 1.2,  cust: 0.55, launder: 6000,   drive: 2,
               machines: ['steamer', 'noodles', 'choc', 'bbq'],            lab: ['lab', 'vat', 'chamber', 'burner'],          floor: 'terracotta',  wall: 'teal',    sign: "Rosa's Deli" },
  express:   { name: "Rosa's Express, the Station", short: 'The express', emoji: '🚉', level: 35, rent: 1000, priceMult: 1.25, cust: 0.6,  launder: 10000,  drive: 1,
               machines: ['oven', 'mixer', 'fryer', 'drinks'],             lab: ['tent', 'burner', 'pillpress', 'dryer'],    floor: 'mint',        wall: 'stripes', sign: "Rosa's Express" },
  bistro:    { name: "Rosa's Bistro, Harbourside", short: 'The bistro', emoji: '🍷', level: 53, rent: 4000,  priceMult: 1.45, cust: 0.45, launder: 30000,  drive: 3,
               machines: ['patisserie', 'bar', 'sushi', 'rotisserie'],     lab: ['brickpress', 'still', 'kiln', 'edibles'],   floor: 'navy',        wall: 'damask',  sign: "Rosa's Bistro" },
  gelateria: { name: 'Gelateria Rosa, the Pier', short: 'The gelateria', emoji: '🍨', level: 70, rent: 9000,  priceMult: 1.6,  cust: 0.4,  launder: 60000,  drive: 3,
               machines: ['icecream', 'grill', 'pizza', 'griddle'],        lab: ['lab', 'vat', 'chamber', 'pillpress'],       floor: 'rose',        wall: 'mintdot', sign: 'Gelateria Rosa' },
  maison:    { name: 'Maison Rosa, The Capital', short: 'The maison',   emoji: '👑', level: 84, rent: 20000, priceMult: 1.75, cust: 0.35, launder: 150000, drive: 4,
               machines: ['candy', 'grand', 'patisserie', 'bar'],          lab: ['chamber', 'lab', 'vat', 'brickpress'],      floor: 'blackmarble', wall: 'golden',  sign: 'Maison Rosa' },
};
// Each branch you open costs SHOP_GROW times the one before, whichever it is
export const SHOP_BASE = 20000, SHOP_GROW = 5;

export const PRICE_LEVELS = {
  low:    { label: 'Low',    mult: 0.8,  buy: 0.97 },
  normal: { label: 'Normal', mult: 1.0,  buy: 0.9 },
  high:   { label: 'High',   mult: 1.25, buy: 0.7 },
};

// Permanent upgrades. eff: what they change (read by the rules). lab: back-room only.
export const UPGRADES = [
  { id: 'sign',      name: 'Neon sign',            emoji: '💡', level: 4,  cost: 900,    cash: 'clean', eff: { cust: 0.2 },        desc: '+20% customers.' },
  { id: 'trays',     name: 'Bigger trays',         emoji: '🧺', level: 10, cost: 2500,   cash: 'clean', eff: { tray: 1 },          desc: 'Each tray holds another batch.' },
  { id: 'loyalty',   name: 'Loyalty cards',        emoji: '💳', level: 13, cost: 3000,   cash: 'clean', eff: { cust: 0.1 },        desc: '+10% customers.' },
  { id: 'express',   name: 'Express timers',       emoji: '⏱️', level: 19, cost: 6000,   cash: 'clean', eff: { speed: 0.1 },       desc: 'Everything cooks 10% faster.' },
  { id: 'fridge',    name: 'Walk-in fridge',       emoji: '❄️', level: 23, cost: 5000,   cash: 'clean', eff: { keep: 1 },          desc: 'Finished food keeps twice as long before it spoils.' },
  { id: 'trays2',    name: 'Tiered display',       emoji: '🗄️', level: 34, cost: 9000,   cash: 'clean', eff: { tray: 1 },          desc: 'Each tray holds another batch.' },
  { id: 'app',       name: 'Delivery app',         emoji: '📲', level: 38, cost: 10000,  cash: 'clean', eff: { cust: 0.15, night: 0.5 }, desc: '+15% customers, and late-night orders keep coming.' },
  { id: 'express2',  name: 'Turbo timers',         emoji: '🌀', level: 47, cost: 15000,  cash: 'clean', eff: { speed: 0.1 },       desc: 'Everything cooks another 10% faster.' },
  { id: 'shopfront', name: 'Animated shopfront',   emoji: '🎆', level: 52, cost: 18000,  cash: 'clean', eff: { cust: 0.15 },       desc: '+15% customers.' },
  { id: 'packaging', name: 'Fancy packaging',      emoji: '🎁', level: 63, cost: 25000,  cash: 'clean', eff: { price: 0.08 },      desc: '+8% on every sale.' },
  { id: 'trays3',    name: 'Glass towers',         emoji: '🏙️', level: 71, cost: 30000,  cash: 'clean', eff: { tray: 1 },          desc: 'Each tray holds another batch.' },
  { id: 'express3',  name: 'Chef\'s tricks',       emoji: '🪄', level: 79, cost: 40000,  cash: 'clean', eff: { speed: 0.1 },       desc: 'Everything cooks another 10% faster.' },
  { id: 'brand',     name: 'Rosa\'s brand',        emoji: '🏷️', level: 86, cost: 60000,  cash: 'clean', eff: { price: 0.2 },       desc: '+20% on every sale.' },
  { id: 'michelin',  name: 'A star from the guide', emoji: '⭐', level: 96, cost: 150000, cash: 'clean', eff: { cust: 0.25, price: 0.1 }, desc: '+25% customers and +10% on every sale.' },
  // Back room
  { id: 'awning',    name: 'Heated awning',        emoji: '⛱️', level: 36, cost: 11000,  cash: 'clean', eff: { cust: 0.05, night: 0.3 }, desc: '+5% customers, and more of them late at night.' },
  { id: 'loyalty2',  name: 'Loyalty app',          emoji: '📱', level: 56, cost: 20000,  cash: 'clean', eff: { cust: 0.1 },        desc: '+10% customers.' },
  { id: 'chiller',   name: 'Blast chiller',        emoji: '🧊', level: 69, cost: 28000,  cash: 'clean', eff: { keep: 1 },          desc: 'Finished food keeps even longer before it spoils.' },
  { id: 'robot',     name: 'Prep robot',           emoji: '🤖', level: 77, cost: 45000,  cash: 'clean', eff: { speed: 0.1 },       desc: 'Everything cooks another 10% faster.' },
  { id: 'franchise', name: 'Franchise fees',       emoji: '🏪', level: 91, cost: 120000, cash: 'clean', eff: { income: 1500 },     desc: 'Stalls in her name open in other towns: +£1,500 a day.' },
  { id: 'warrant',   name: 'A royal warrant',      emoji: '👑', level: 98, cost: 250000, cash: 'clean', eff: { cust: 0.1, price: 0.1 }, desc: 'By appointment. +10% customers and +10% on every sale.' },
  { id: 'scales',    name: 'Digital scales',       emoji: '⚖️', level: 8,  cost: 1200,   cash: 'dirty', lab: true, eff: { purity: 0.05 }, desc: 'Every cook comes out 5% purer.' },
  { id: 'fumehood',  name: 'Extractor hood',       emoji: '🌀', level: 25, cost: 7000,   cash: 'dirty', lab: true, eff: { purity: 0.05, quiet: 0.1 }, desc: '5% purer, and the smell draws 10% less heat.' },
  { id: 'filters',   name: 'Lab filters',          emoji: '🧫', level: 48, cost: 20000,  cash: 'dirty', lab: true, eff: { purity: 0.07 }, desc: 'Every cook comes out 7% purer.' },
  { id: 'tester',    name: 'Purity tester',        emoji: '🔬', level: 70, cost: 45000,  cash: 'dirty', lab: true, eff: { purity: 0.08 }, desc: 'Every cook comes out 8% purer.' },
  { id: 'papertrail', name: 'A neat paper trail',  emoji: '🗂️', level: 20, cost: 6000,   cash: 'clean', lab: true, eff: { audit: 0.3 }, desc: 'Receipts for everything (some of them real): HMRC investigations are 30% less likely.' },
  { id: 'bankman',   name: 'A friendly bank manager', emoji: '🏦', level: 40, cost: 30000, cash: 'dirty', lab: true, eff: { smurf: 1 }, desc: 'Smurfing limits double, and flagged deposits happen half as often.' },
  { id: 'phones',    name: 'Burner phones',        emoji: '📵', level: 85, cost: 50000,  cash: 'dirty', lab: true, eff: { tipoff: 0.2 }, desc: 'Nobody can listen in: raids are another 20% less likely.' },
  { id: 'catering',  name: '"Catering" contracts', emoji: '📦', level: 2,  cost: 800,    cash: 'clean', lab: true, eff: { launder: 0.15 }, desc: 'Invoices for parties nobody threw. Launder another 15% of each day\'s takings safely.' },
  { id: 'camera',    name: 'Back-door camera',     emoji: '📷', level: 4,  cost: 800,    cash: 'dirty', lab: true, eff: { camera: 1 },    desc: 'Sometimes flags a buyer who feels off. Not always right.' },
  { id: 'glass',     name: 'Better glassware',     emoji: '🧪', level: 3,  cost: 1000,   cash: 'dirty', lab: true, eff: { bags: 0.2 },    desc: 'Every cook makes 20% more bags.' },
  { id: 'safe',      name: 'Floor safe',           emoji: '🔐', level: 6,  cost: 700,    cash: 'dirty', lab: true, eff: { safe: 1 },      desc: 'A raid only finds a fifth of your dirty cash instead of half.' },
  { id: 'van',       name: 'Delivery van',         emoji: '🚐', level: 10, cost: 1500,   cash: 'dirty', lab: true, eff: { van: 1 },       desc: 'Jay works from a van: half the chance he\'s picked up.' },
  { id: 'soundproof',name: 'Soundproofing',        emoji: '🔇', level: 22, cost: 5000,   cash: 'dirty', lab: true, eff: { quiet: 0.25 },  desc: 'Cooking draws 25% less heat.' },
  { id: 'books',     name: 'Creative accounting',  emoji: '📒', level: 31, cost: 8000,   cash: 'clean', lab: true, eff: { launder: 0.15, washFee: 0.05 }, desc: 'Launder another 15% of each day\'s takings safely, and lose 5% less to the wash.' },
  { id: 'tunnel',    name: 'Escape tunnel',        emoji: '🕳️', level: 44, cost: 15000,  cash: 'dirty', lab: true, eff: { hide: 0.5 },    desc: 'Raids find product half as often.' },
  { id: 'insider',   name: 'Someone inside',       emoji: '🕵️', level: 58, cost: 25000,  cash: 'dirty', lab: true, eff: { tipoff: 0.3 },  desc: 'A tip-off before most raids: raids are 30% less likely.' },
  { id: 'shell',     name: 'Shell company',        emoji: '🐚', level: 73, cost: 40000,  cash: 'clean', lab: true, eff: { launder: 0.25, washFee: 0.05 }, desc: 'Launder another 25% of each day\'s takings safely, and lose 5% less to the wash.' },
  { id: 'network',   name: 'The network',          emoji: '🕸️', level: 83, cost: 60000,  cash: 'dirty', lab: true, eff: { buyers: 0.3 },  desc: '30% more buyers at night.' },
];

// shift: when they work. cash: what pays their wage (per real day). lab: needs the back room.
export const CREW = {
  baker:   { name: 'Priya',   role: 'Baker',         emoji: '👩‍🍳', level: 1,  wage: 45,  cash: 'clean', shift: 'day',
             desc: 'Moves finished food from the machines into the case for you (when there\'s room), so nothing spoils.' },
  pr:      { name: 'Mel',     role: 'PR manager',    emoji: '📣', level: 3,  wage: 60,  cash: 'clean', shift: 'day',
             desc: 'Popularity creeps up every day, scandals hurt less and blow over sooner.' },
  cashier: { name: 'Tom',     role: 'Cashier',       emoji: '🧑‍💼', level: 5,  wage: 40,  cash: 'clean', shift: 'day',
             desc: '+10% on every sale, and half as many customers put off by prices.' },
  cleaner: { name: 'Dot',     role: 'Cleaner',       emoji: '🧹', level: 14, wage: 35,  cash: 'clean', shift: 'day',
             desc: 'Fixes two cracked tiles or torn panels a day, for free.' },
  chef:    { name: 'Marco',   role: 'Head chef',     emoji: '👨‍🍳', level: 22, wage: 120, cash: 'clean', shift: 'day',
             desc: 'When a machine is emptied, starts the same recipe again (buying ingredients if he must). Works while you\'re away.' },
  manager: { name: 'Grace',   role: 'Manager',       emoji: '📋', level: 32, wage: 90,  cash: 'clean', shift: 'day',
             desc: 'Keeps the ingredients for everything on sale topped up every morning.' },
  accountant: { name: 'Viv',  role: 'Accountant',    emoji: '🧮', level: 42, wage: 100, cash: 'clean', shift: 'day',
             desc: 'Puts the safe amount of dirty cash through the tills every morning, takes a smaller cut for the wash, and tax inspectors fine you less.' },
  dealer:  { name: 'Jay',     role: 'Street dealer', emoji: '🧢', level: 1,  wage: 0,   cash: 'dirty', shift: 'night', lab: true,
             desc: 'Serves buyers at the back door when you\'re not there. Keeps a fifth of what he takes.' },
  lookout: { name: 'Ash',     role: 'Lookout',       emoji: '👀', level: 6,  wage: 60,  cash: 'dirty', shift: 'night', lab: true,
             desc: 'Flags most undercover buyers before they reach the door. Jay won\'t serve the ones Ash flags.' },
  cook:    { name: 'Sam',     role: 'Night cook',    emoji: '🥽', level: 8,  wage: 50,  cash: 'dirty', shift: 'night', lab: true,
             desc: 'Bags up finished cooks in the back room as soon as they\'re done.' },
  muscle:  { name: 'Big Ron', role: 'Muscle',        emoji: '💪', level: 9,  wage: 80,  cash: 'dirty', shift: 'night', lab: true,
             desc: 'Sees off rival crews, and usually the debt collectors\' heavies too.' },
  chemist: { name: 'Doc',     role: 'Chemist',       emoji: '🧑‍🔬', level: 30, wage: 150, cash: 'dirty', shift: 'night', lab: true,
             desc: 'When a back-room cook is bagged, starts another if there are kits.' },
  driver:  { name: 'Lenny',   role: 'Driver',        emoji: '🚗', level: 55, wage: 120, cash: 'dirty', shift: 'night', lab: true,
             desc: 'Handles couriers\' bulk orders himself if you\'re not there.' },
  lawyer:  { name: 'Ms Okafor', role: 'Lawyer',      emoji: '⚖️', level: 66, wage: 200, cash: 'dirty', shift: 'night', lab: true,
             desc: 'If you\'re busted: half the fines, a shorter seal on the back room, and the crew stay.' },
  fixer:   { name: 'Nina',    role: 'Fixer',         emoji: '🎩', level: 80, wage: 300, cash: 'dirty', shift: 'night', lab: true,
             desc: 'Knows people. Heat falls twice as fast.' },
  runner:  { name: 'Kai',     role: 'Runner',        emoji: '🛴', level: 12, wage: 60,  cash: 'dirty', shift: 'night', lab: true,
             desc: 'Keeps your corners stocked from the back room every hour, so they never run dry while you\'re away.' },
  host:    { name: 'Lena',    role: 'Back-door host', emoji: '🚪', level: 18, wage: 120, cash: 'dirty', shift: 'night', lab: true,
             desc: 'Serves buyers you don\'t get to, at the full price, keeping only 10%. She never serves anyone flagged as off.' },
  assistant: { name: 'Pip',   role: 'Lab assistant', emoji: '🥼', level: 24, wage: 90,  cash: 'dirty', shift: 'night', lab: true,
             desc: 'Careful hands: every cook comes out 5% purer.' },
  copper:  { name: 'DS Hale', role: 'Bent copper',   emoji: '🕴️', level: 35, wage: 250, cash: 'dirty', shift: 'night', lab: true,
             desc: 'Tips you off: raids are 40% less likely and police sweeps on your corners happen half as often.' },
  moneyman: { name: 'Felix',  role: 'Money man',     emoji: '💼', level: 28, wage: 200, cash: 'dirty', shift: 'night', lab: true,
             desc: 'Every morning he spreads your dirty cash across the casino, crypto (when the cut is low) and the art dealer, keeping a float for kits.' },
  dispatcher: { name: 'Marnie', role: 'Dispatcher', emoji: '🗒️', level: 18, wage: 90, cash: 'dirty', shift: 'night', lab: true,
             desc: 'Sends a van from any branch whose back room has packed enough to be worth the trip, and books it in as bakery stock.' },
  souschef: { name: 'Chen',   role: 'Sous chef',     emoji: '🧑‍🍳', level: 45, wage: 150, cash: 'clean', shift: 'day',
             desc: 'Every batch makes 10% more servings.' },
  director: { name: 'Imogen', role: 'Marketing director', emoji: '💼', level: 60, wage: 200, cash: 'clean', shift: 'day',
             desc: 'Every campaign runs 50% longer.' },
};

// Features that switch on at a level (announced on level-up).
export const FEATURES = [
  { id: 'haggle',  level: 3,  name: 'Haggling', desc: 'Push a buyer\'s price up at the back door. Some walk off; officers never argue.' },
  { id: 'loan',    level: 4,  name: 'Bank loans', desc: 'Borrow once a week; bigger loans at higher levels. Adds the loan plus 20% to the debt.' },
  { id: 'courier', level: 5,  name: 'Courier orders', desc: 'Dez sends a courier for a bulk order on some nights, at a premium.' },
  { id: 'rivals',  level: 9,  name: 'Rival crews', desc: 'Some nights a rival crew tries to rob you. Hire muscle.' },
  { id: 'holiday', level: 10, name: 'Payment holiday', desc: 'Skip one bank payment, once, with no penalty.' },
];

// Marketing campaigns. hours: how long they run. pop: popularity per day. cust: extra customers. once: popularity at once.
export const CAMPAIGNS = {
  flyers:     { name: 'Flyers',              emoji: '📄', level: 1,  price: 80,     hours: 72,  pop: 2,   cust: 0,    desc: 'Hand them out round the market.' },
  paper:      { name: 'Newspaper ad',        emoji: '📰', level: 3,  price: 250,    hours: 96,  pop: 0.5, cust: 0.10, desc: 'A quarter page in the local paper.' },
  charity:    { name: 'Charity bake sale',   emoji: '❤️', level: 5,  price: 300,    hours: 24,  pop: 0,   cust: 0, once: 12, heat: -5, weeklyOnce: true, desc: 'Good press and the police think a little better of you. Once a week.' },
  radio:      { name: 'Radio spot',          emoji: '📻', level: 6,  price: 600,    hours: 120, pop: 1,   cust: 0.20, desc: 'A jingle on local radio all week.' },
  influencer: { name: 'Influencer visit',    emoji: '📱', level: 9,  price: 900,    hours: 72,  pop: 0,   cust: 0.15, once: 8, desc: 'Someone with a lot of followers posts about your buns.' },
  billboard:  { name: 'Billboard',           emoji: '🪧', level: 12, price: 1500,   hours: 168, pop: 0.5, cust: 0.25, desc: 'Your face, six metres wide, by the ring road.' },
  festival:   { name: 'Sponsor the festival', emoji: '🎪', level: 15, price: 2000,  hours: 24,  pop: 0,   cust: 0.4, once: 10, desc: 'For a day the street festival is yours: packed market, your name on every banner.' },
  tv:         { name: 'TV advert',           emoji: '📺', level: 24, price: 4000,   hours: 120, pop: 1,   cust: 0.35, desc: 'Thirty seconds during the evening soaps.' },
  foodfair:   { name: 'Food fair stall',     emoji: '🎡', level: 34, price: 6000,   hours: 72,  pop: 2,   cust: 0.3, desc: 'A stall at the big food fair. Everyone tries your food.' },
  celebrity:  { name: 'Celebrity chef visit', emoji: '🌟', level: 44, price: 9000,  hours: 72,  pop: 0,   cust: 0.3, once: 20, desc: 'A famous chef drops in, on camera.' },
  magazine:   { name: 'Magazine feature',    emoji: '📖', level: 57, price: 12000,  hours: 168, pop: 1,   cust: 0.35, desc: 'Six glossy pages on the little stall that grew.' },
  awards:     { name: 'Food awards entry',   emoji: '🏆', level: 72, price: 20000,  hours: 168, pop: 1,   cust: 0.4, once: 15, desc: 'You enter, you win something, everyone hears.' },
  documentary:{ name: 'Documentary',         emoji: '🎬', level: 88, price: 40000,  hours: 240, pop: 2,   cust: 0.5, desc: 'A film crew follows you for a fortnight. (They never see the back room.)' },
};

// Property: big long-term purchases. eff: noRent, income (clean per real day), cust.
export const PROPERTY = {
  pitch:   { name: 'Buy the stall\'s pitch',   emoji: '📜', level: 20, price: 30000,   eff: { noRent: 1 },   desc: 'Own the ground the stall stands on. No more rent.' },
  flat:    { name: 'Buy the flat upstairs',     emoji: '🏠', level: 35, price: 60000,   eff: { income: 200 }, desc: 'Let it out: +£200 a day.' },
  cafe:    { name: 'Buy the café next door',    emoji: '🏪', level: 50, price: 120000,  eff: { cust: 0.2 },   desc: 'Knock through: +20% customers.' },
  corner:  { name: 'Buy the street corner',     emoji: '🏘️', level: 70, price: 250000,  eff: { income: 800 }, desc: 'Three shops and four flats: +£800 a day.' },
  market:  { name: 'Buy the whole market',      emoji: '🏛️', level: 95, price: 1000000, eff: { cust: 0.5, income: 2000 }, desc: 'Everyone pays rent to you now. +50% customers and +£2,000 a day.' },
};

// Things that grow with your level instead of being bought one by one: [level, amount from that level].
export const CAPS = {
  menu:      [[1, 4], [3, 5], [5, 6], [8, 7], [12, 8], [20, 9], [30, 10], [45, 11], [60, 12], [80, 13], [95, 14]],
  kits:      [[1, 4], [5, 8], [9, 12], [13, 16], [25, 24], [40, 32], [60, 44], [80, 60]],
  loan:      [[4, 1000], [8, 2000], [12, 3000], [25, 6000], [40, 10000], [60, 20000], [80, 40000]],
  decor:     [[1, 6], [3, 10], [5, 14], [7, 18], [9, 22], [12, 28], [15, 34], [18, 40], [24, 48], [30, 56], [40, 64], [55, 72], [75, 80], [90, 90]],
  campaigns: [[1, 1], [5, 2], [10, 3], [15, 4], [40, 5], [70, 6]],
};
export function capAt(table, level) { let n = 0; for (const [l, v] of table) if (level >= l) n = v; return n; }
export function nextCap(table, level) { for (const [l, v] of table) if (l > level) return { level: l, amount: v }; return null; }

// Kitchen spots (bakery) and lab spots (back room). need: an expansion that opens the spot.
// cell: the design square a terrace machine stands on (kept clear of decorations).
export const SPOTS = [
  // The back wall (spots 1 and 3 come with the kitchen refit, so the first few machines have elbow room)
  { x: -2.75, z: -4.0, ry: 0, wall: 'back' }, { x: -1.6, z: -4.0, ry: 0, wall: 'back', need: 'refit' }, { x: -0.45, z: -4.0, ry: 0, wall: 'back' },
  { x: 0.7, z: -4.0, ry: 0, wall: 'back', need: 'refit' }, { x: 1.85, z: -4.0, ry: 0, wall: 'back' },
  // The left wall (6 and 8 with the refit)
  { x: -3.95, z: -3.0, ry: Math.PI / 2, wall: 'left' }, { x: -3.95, z: -1.9, ry: Math.PI / 2, wall: 'left', need: 'refit' }, { x: -3.95, z: -0.8, ry: Math.PI / 2, wall: 'left' },
  { x: -3.95, z: 0.3, ry: Math.PI / 2, wall: 'left', need: 'refit' }, { x: -3.95, z: 1.4, ry: Math.PI / 2, wall: 'left' },
  // The island: two rows back to back, each with a clear aisle in front (to the counter, and to the back wall)
  { x: -2.1, z: -1.15, ry: 0, wall: 'island', need: 'island' }, { x: -0.9, z: -1.15, ry: 0, wall: 'island', need: 'island' },
  { x: -2.1, z: -2.0, ry: Math.PI, wall: 'island', need: 'island2' }, { x: -0.9, z: -2.0, ry: Math.PI, wall: 'island', need: 'island2' },
  { x: -3.6, z: 6.05, ry: Math.PI, wall: 'cart', need: 'carts', cell: [0, 10] }, { x: -1.8, z: 6.05, ry: Math.PI, wall: 'cart', need: 'carts', cell: [2, 10] },
  { x: 0, z: 6.05, ry: Math.PI, wall: 'cart', need: 'carts', cell: [4, 10] }, { x: 1.8, z: 6.05, ry: Math.PI, wall: 'cart', need: 'carts', cell: [6, 10] },
  { x: 3.6, z: 6.05, ry: Math.PI, wall: 'cart', need: 'carts', cell: [8, 10] },
  { x: 6.05, z: -4.0, ry: -Math.PI / 2, wall: 'stall', need: 'stalls', cell: [10, 0] }, { x: 6.05, z: -2.5, ry: -Math.PI / 2, wall: 'stall', need: 'stalls', cell: [10, 2] },
  { x: 6.05, z: -1.0, ry: -Math.PI / 2, wall: 'stall', need: 'stalls', cell: [10, 3] }, { x: 6.05, z: 0.5, ry: -Math.PI / 2, wall: 'stall', need: 'stalls', cell: [10, 5] },
  { x: 6.05, z: 2.0, ry: -Math.PI / 2, wall: 'stall', need: 'stalls', cell: [10, 6] },
];
export const MACHINE_WALL = { oven: 'back', fryer: 'back', grill: 'back', pizza: 'back', bbq: 'back', rotisserie: 'back', grand: 'back',
  mixer: 'left', drinks: 'left', icecream: 'left', griddle: 'island', steamer: 'island', noodles: 'island', choc: 'left',
  patisserie: 'left', bar: 'cart', sushi: 'island', candy: 'cart' };
// The back room is 7 x 9 until you knock into the storeroom behind it (3 m deeper). Its back-wall machines then move
// to the new back wall (ext), and the benches go in the new space: rows back to back, an aisle in front of every machine.
export const BACK_DEPTH = 3;
export const LAB_SPOTS = [
  { x: -10.25, z: -3.95, ry: 0, ext: { x: -10.85, z: -6.95 } }, { x: -8.95, z: -3.95, ry: 0, ext: { x: -9.6, z: -6.95 } },
  { x: -7.7, z: -3.95, ry: 0, ext: { x: -8.35, z: -6.95 } }, { x: -6.45, z: -3.95, ry: 0, ext: { x: -7.1, z: -6.95 } },
  { x: -9.9, z: -4.9, ry: Math.PI, need: 'bench' }, { x: -8.65, z: -4.9, ry: Math.PI, need: 'bench' }, { x: -7.4, z: -4.9, ry: Math.PI, need: 'bench2' },
  { x: -9.9, z: -3.85, ry: 0, need: 'bench3' }, { x: -8.65, z: -3.85, ry: 0, need: 'bench3' },
  { x: -5.35, z: -3.6, ry: -Math.PI / 2, need: 'annex' }, { x: -5.35, z: -2.45, ry: -Math.PI / 2, need: 'annex' },
  { x: -11.0, z: -0.25, ry: Math.PI / 2, need: 'annex' }, { x: -11.0, z: 0.9, ry: Math.PI / 2, need: 'annex' },
  { x: -5.85, z: -6.95, ry: 0, need: 'storeroom' },
];
// Where a back-room spot is, with or without the storeroom knocked through
export const labSpotAt = (spot, ext) => (ext && spot.ext ? { ...spot, ...spot.ext } : spot);

// Display counters by the till: each one holds one product, and what's on sale is whatever fits on your counters.
// Every branch starts with 2 and can have up to 7. The first sit nearest the till.
export const COUNTERS = [
  { level: 1, price: 0 }, { level: 1, price: 0 },
  { level: 2, price: 250 }, { level: 4, price: 800 }, { level: 8, price: 2000 }, { level: 14, price: 5000 }, { level: 22, price: 12000 },
];
export const PER_COUNTER = 1;

// ---------- Seasons on the real calendar (month 1-12, day): demand shifts, limited recipes, decorations ----------
export const SEASONS = {
  valentine: { name: "Valentine's", emoji: '💘', from: [2, 1], to: [2, 14], want: { sweet: 1.35, drink: 1.1 }, decor: 'hearts' },
  easter:    { name: 'Easter', emoji: '🐣', from: [3, 20], to: [4, 20], want: { bread: 1.2, sweet: 1.25 }, decor: 'eggs' },
  summer:    { name: 'Summer', emoji: '☀️', from: [6, 15], to: [8, 31], want: { cold: 1.5, drink: 1.25, bread: 0.9 }, decor: 'summer' },
  halloween: { name: 'Halloween', emoji: '🎃', from: [10, 15], to: [10, 31], want: { sweet: 1.3, pastry: 1.15 }, decor: 'pumpkins' },
  bonfire:   { name: 'Bonfire Night', emoji: '🎆', from: [11, 1], to: [11, 7], want: { drink: 1.3, sweet: 1.2 }, decor: 'bonfire' },
  christmas: { name: 'Christmas', emoji: '🎄', from: [12, 1], to: [12, 26], want: { pastry: 1.3, sweet: 1.3, drink: 1.2, cold: 0.7 }, decor: 'christmas' },
};

// ---------- Perfect bakes and recipe mastery ----------
// Collect a batch yourself soon after it's done and it's perfect: more servings and more XP
export const PERFECT = { windowShare: 0.15, minMin: 2, maxMin: 10, servings: 0.2, xp: 0.5 };
// Every batch of a recipe counts; stars bring more servings and a better price; five stars make it a signature dish
export const MASTERY = { stars: [15, 50, 120, 250, 500], servings: 0.03, price: 0.02 };

// ---------- The story: chapters that turn up as you go ----------
export const STORY = [
  { id: 'letter1', level: 2, title: 'A letter in the till', text: 'Under the cash tray there is an envelope in Rosa\'s handwriting. "If you are reading this, the stall is yours. The ovens run hot on the left. Never trust a man called Dez. Love, R." You wonder how she knew.' },
  { id: 'dez1', level: 3, lab: true, title: 'A knock at the back', text: 'Dez turns up at the back door as if he has done it a hundred times. "Your aunt and me had an arrangement," he says. "The room back there pays better than bread." He leaves a number on a napkin.' },
  { id: 'letter2', level: 8, title: 'The recipe box', text: 'Behind the flour sacks: a tin box of Rosa\'s recipe cards, sticky with butter. Half of them have notes in the margins. One just says "for the bad winter, 1987". It is a recipe for soup.' },
  { id: 'harrow1', evidence: 25, title: 'A quiet man in a raincoat', text: 'A man buys a coffee every morning and never drinks it. He watches the back door. On Thursday he leaves a card on the counter: Detective Inspector Harrow. "Lovely bakery," he says. "Be a shame."' },
  { id: 'letter3', level: 15, title: 'Photographs', text: 'A shoebox of photographs in the flat upstairs: Rosa at twenty, flour to the elbows, laughing at someone off camera. On the back of one: "Opening day. Dez said it would never last."' },
  { id: 'dez2', level: 20, lab: true, title: 'What Dez owed her', text: 'Dez, three drinks in, tells you Rosa lent him money when nobody else would. He never paid it back. "So I look out for the stall," he says. "That\'s what this is." You are not sure he believes it either.' },
  { id: 'harrow2', evidence: 50, title: 'The file', text: 'Harrow is in the shop again, reading a thick file over his coffee. He lets you see the first page: your name, your shop, and a list of dates. "It all adds up," he says, "eventually."' },
  { id: 'letter4', level: 30, title: 'The last card', text: 'The last recipe card in Rosa\'s tin is blank on the front. On the back: "The bakery was always the point. Do not let the back room eat the front." You put it by the till.' },
  { id: 'dez3', level: 40, lab: true, title: 'An old face', text: 'A man comes asking for Dez by his real name, which you have never heard. Dez does not come round for a week. When he does, he has a new phone and an old bruise, and he does not want to talk about it.' },
  { id: 'harrow3', evidence: 75, title: 'Close', text: 'Harrow sits on your bench outside and eats a sausage roll. "I knew your aunt," he says. "She was the only honest one on this street." He folds the paper bag very neatly and leaves.' },
  { id: 'letter5', level: 50, title: 'Rosa\'s other book', text: 'In the cellar, wrapped in a tea towel: a ledger in Rosa\'s writing, with dates going back forty years. It is not a recipe book. So that is how the stall survived the bad winter.' },
  { id: 'dez4', level: 60, lab: true, title: 'Dez wants out', text: '"I\'m getting old," Dez says, watching your vans load. "You\'re bigger than I ever was. Bigger than Rosa." He does not sound proud. He sounds tired.' },
  { id: 'empire', level: 75, title: 'The Rosa name', text: 'Somebody at a dinner party calls it "Rosa\'s, the chain". You think of the stall, the left oven running hot, and a woman laughing at someone off camera.' },
  { id: 'end', level: 99, title: 'Still open', text: 'You find yourself at the stall at six in the morning, the first oven on, nobody else awake. The street smells of bread. Whatever else you have built, this part still feels like hers.' },
];

// ---------- The collection book: sets with a reward when complete ----------
export const COLLECTION = [
  { id: 'bake10', cat: 'baked', n: 10, name: 'A proper menu', reward: 500 }, { id: 'bake30', cat: 'baked', n: 30, name: 'The regulars\' favourites', reward: 2500 },
  { id: 'bake75', cat: 'baked', n: 75, name: 'A cookbook\'s worth', reward: 12000 }, { id: 'bake150', cat: 'baked', n: 150, name: 'Everything Rosa knew', reward: 60000 },
  { id: 'bake205', cat: 'baked', n: 205, name: 'Every recipe in the land', reward: 250000 },
  { id: 'star5', cat: 'master', n: 1, name: 'A signature dish', reward: 2000 }, { id: 'star10', cat: 'master', n: 10, name: 'Ten signatures', reward: 40000 },
  { id: 'perfect25', cat: 'perfect', n: 25, name: 'Twenty-five perfect bakes', reward: 1500 }, { id: 'perfect250', cat: 'perfect', n: 250, name: 'Two hundred and fifty perfect bakes', reward: 25000 },
  { id: 'season3', cat: 'seasonal', n: 3, name: 'Seasonal baker', reward: 1500 }, { id: 'season10', cat: 'seasonal', n: 10, name: 'All year round', reward: 15000 },
  { id: 'season20', cat: 'seasonal', n: 20, name: 'Every season tasted', reward: 50000 },
  { id: 'prod5', cat: 'products', n: 5, name: 'Branching out', reward: 1000, night: true }, { id: 'prod15', cat: 'products', n: 15, name: 'A wide catalogue', reward: 15000, night: true },
  { id: 'prod33', cat: 'products', n: 33, name: 'Everything Dez ever sold', reward: 150000, night: true },
  { id: 'story5', cat: 'story', n: 5, name: 'Family history', reward: 3000 }, { id: 'story14', cat: 'story', n: 14, name: 'The whole story', reward: 50000 },
  { id: 'award4', cat: 'awards', n: 4, name: 'Every bakery award', reward: 30000 },
];

// ---------- The night: police patrols, forecast each evening for three parts of the night ----------
export const PATROL = { bands: [[18, 22, 'evening'], [22, 2, 'late'], [2, 7, 'early hours']], levels: [['quiet', 0.6], ['normal', 1], ['heavy', 1.6]] };

// ---------- Crew personalities ----------
export const TRAITS = {
  steady:  { name: 'Steady', emoji: '🙂', desc: 'Nothing fazes them. Loyalty grows a little faster.' },
  loyal:   { name: 'Loyal', emoji: '🤝', desc: 'Never talks to the police, and loyalty never falls below 50.' },
  greedy:  { name: 'Greedy', emoji: '💸', desc: 'Wants 20% more pay, and loyalty grows half as fast.' },
  nervous: { name: 'Nervous', emoji: '😬', desc: 'Night crew: more likely to be picked up or spooked.' },
  chatty:  { name: 'Chatty', emoji: '💬', desc: 'Customers love them (day crew: +5% customers), but they talk: they turn informant more easily.' },
  sharp:   { name: 'Sharp', emoji: '🦊', desc: 'Day crew collect batches perfectly half the time; night crew get 10% better prices.' },
};
export const INFORMANT = { at: 30, chattyAt: 45, chance: 0.08, perDay: 4, clearAt: 60 };

// ---------- Crumbs & Co fights back ----------
export const RIVAL_MOVES = { chance: 0.25, priceWarDays: 2, priceWarHit: 0.25, poachRaise: 0.15, leanCost: 3000, leanShare: 0.08, leanHeat: 8, leanEvidence: 5 };

// ---------- Branch managers: run a shop when you're not there ----------
export const MANAGER = { level: 10, skills: [{ name: 'Junior', wage: 150, every: 30 }, { name: 'Experienced', wage: 400, every: 15 }, { name: 'Star', wage: 1000, every: 5 }] };

// ---------- What the locals like, shop by shop (multiplies what customers ask for; price: how much prices put them off) ----------
export const TASTES = {
  stall:     { who: 'Market shoppers', like: { bread: 1.3, pastry: 1.15 }, price: 1 },
  cafe:      { who: 'Students', like: { drink: 1.3, cold: 1.35, savory: 1.1 }, price: 1.4 },
  deli:      { who: 'Office workers', like: { savory: 1.4, drink: 1.1 }, price: 0.9 },
  express:   { who: 'Commuters', like: { drink: 1.5, bread: 1.2, sweet: 0.85 }, price: 1.1 },
  bistro:    { who: 'Tourists', like: { pastry: 1.3, savory: 1.2, drink: 1.1 }, price: 0.8 },
  gelateria: { who: 'Day-trippers', like: { cold: 1.6, sweet: 1.2, savory: 0.8 }, price: 1 },
  maison:    { who: 'The rich', like: { pastry: 1.4, sweet: 1.3, bread: 0.8 }, price: 0.6 },
};
// Counter extras: today's special sells for more and draws more customers to it; a bigger cabinet holds more batches
export const SPECIAL = { price: 0.2, pull: 2 };
export const CABINET = { level: 10, price: 1500, batches: 2 };
// A clean record: days in a row with no night trade at all. Customers trust a straight bakery a little more each few
// days, and bakery awards come at milestones.
export const CLEAN_RECORD = { perDays: 3, step: 0.01, cap: 0.2, awards: [[7, 'Local favourite', 500], [30, 'Best bakery in town', 3000], [90, 'Regional baker of the year', 15000], [180, 'National treasure', 60000]] };

export const EVENTS = [
  { id: 'rain',      p: 0.15, text: '🌧️ Rain today. Fewer people out.',                  cust: 0.7 },
  { id: 'festival',  p: 0.08, text: '🎉 Street festival today. The market is packed.',     cust: 1.4 },
  { id: 'shortage',  p: 0.07, text: '🌾 Flour shortage. Flour costs a lot more today.',    flour: 1.8 },
  { id: 'heatwave',  p: 0.06, text: '☀️ Heatwave. Cold and sweet things fly.',            sweet: 2 },
];

export const FACES = ['🧑', '👩', '👨', '🧔', '👵', '👴', '👱', '🧕', '👷', '🧑‍💼', '👩‍🎓', '🧑‍🔧', '👩‍⚕️', '🧑‍🍳'];
export const BUYER_NAMES = ['Kev', 'Shaz', 'Gaz', 'Tash', 'Kerry', 'Dani', 'Rich', 'Femi', 'Becks', 'Olly', 'Nadia', 'Craig', 'Paddy', 'Sol', 'Jojo', 'Tiny', 'Marcus', 'Leanne'];

// What buyers say at the back door. Undercover officers usually say something off.
// Ordinary buyers sometimes do too, so it is a read, not a rule.
export const LINES = {
  normal: [
    'Same as last time.',
    'Quick, I\'m parked on a double yellow.',
    'Mate\'s birthday. Don\'t judge.',
    'Don\'t tell my mum I was here.',
    'You\'re the bakery one, right? Love the buns.',
    'Exact cash. Let\'s not make it weird.',
    'Long shift. I need this.',
    'Dez said you\'re alright.',
    'Can I get a croissant too? No? Fair.',
    'Quiet tonight, innit.',
    'Is it as good as last week\'s?',
    'I\'ll be quick, my taxi\'s waiting.',
  ],
  off: [
    'So this is where I buy the... product? The illegal product?',
    'Big order. Price doesn\'t matter. Who\'s your supplier?',
    'Nice set-up. Who else works here? First names are fine.',
    'Could you say out loud what\'s in the bag? Just for clarity.',
    'I\'m not a cop, by the way.',
    'How long have you been doing this? Roughly. Dates help.',
    'My friend sent me. A guy. A normal guy.',
    'Do you do receipts? I\'ll need a receipt.',
    'Lovely. And where do you cook it, exactly?',
  ],
};
