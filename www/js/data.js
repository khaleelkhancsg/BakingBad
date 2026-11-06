// All tunable numbers and content for the game live here.

export const CFG = {
  // Debt
  debtTotal: 24000,      // what Aunt Rosa owed the bank
  weekly: 2000,          // due every 7 days, taken from clean cash
  missPenalty: 0.10,     // a missed payment is added to the next one, plus 10%
  maxStrikes: 3,         // three missed payments and the bank takes the stall
  firstPaymentDay: 15,   // two weeks' grace, then every 7 days

  // Money and shop
  startClean: 800,
  rent: 40,              // per day, clean
  bakerWage: 45,         // per day, clean

  // Shift lengths in real seconds
  dayLen: 150,           // 08:00 -> 18:00
  nightLen: 100,         // 22:00 -> 04:00
  burnAfter: 12,         // seconds a finished batch can sit in an oven / on a burner

  // Day customers
  baseCustomers: 40,
  repCustomers: 0.6,     // extra customers per reputation point
  staleMult: 0.6,        // day-old goods sell at 60%
  repServed: 0.15, repMissed: -0.3, repMissCap: 6, repPricey: -0.1, repStale: -0.05, repDrift: -1,
  walkIn: 3.2, browse: 1.4, walkOut: 3.2, // seconds a customer spends walking in, at the counter, walking out
  openingQuiet: 12,      // seconds after opening before the first customers turn up

  // Laundering
  launderRatio: 0.8,     // you can put this share of the day's real takings through the till safely
  launderHeat: 20,       // heat for laundering double the safe amount

  // Night operation
  kitCost: 180,          // one kit makes one batch of Velvet
  bagDoor: 35,           // what a buyer at the back door pays per bag
  bagStreet: 30,         // what the dealer gets per bag on the street
  dealerCut: 0.25,       // the dealer keeps this share
  buyersBase: 6,
  buyersGrowMax: 8,      // word gets round: +1 buyer per night you operate, up to this
  buyerPatience: 18,     // seconds a buyer waits at the door

  // Heat (0-100). 100 = arrested.
  copBase: 0.04, copPerHeat: 1 / 400, // chance a buyer is undercover
  copServedHeat: 20,
  heatPerBatch: 1, heatPerBag: 0.1,
  heatDecay: 6, lieLowBonus: 6,
  raidAt: 60, inspectAt: 35, inspectChance: 0.2, inspectFine: 800,
  dealerArrestBase: 0.03, dealerArrestPerHeat: 1 / 400, dealerArrestHeat: 20,
  bribeCost: 600, bribeHeat: 15, bribeBackfire: 0.1, bribeBackfireHeat: 20,
};

// XP and levels. XP needed to go from level n to n+1 is levelBase + levelStep * (n - 1).
Object.assign(CFG, {
  levelBase: 200, levelStep: 120, maxLevel: 20, levelCash: 10,
  xpPerSecond: 0.25,          // a batch is worth its total stage time x this (longer recipes, more XP)
  xpBag: 2, xpGoldBag: 4, xpVelvetBatch: 8, xpGoldBatch: 14, xpCourier: 30, xpDealerBag: 1, xpRival: 20,
  cashierBonus: 0.1, drinkAddOn: 0.35, // share of food customers who also grab a drink
  // Night features
  pushMult: 1.35, pushRefuse: 0.35,                                       // haggling (level 3)
  courierChance: 0.6, courierMin: 8, courierMax: 12, courierPrice: 45, courierHeat: 3, courierPatience: 40, // courier orders (level 5)
  goldKitCost: 420, goldBagDoor: 80, goldShare: 0.25, goldCopExtra: 0.05, // Velvet Gold (level 7)
  rivalChance: 0.25, rivalRob: 0.3, rivalBuyers: 0.7,                     // rival crews (level 9)
  lookoutCatch: 0.7, lookoutFalse: 0.08,
  safeRaidShare: 0.2, vanArrestMult: 0.5,
  // Bank
  loanFee: 0.2, loanEvery: 7,
});

export const INGREDIENTS = {
  flour:     { name: 'Flour',      emoji: '🌾', base: 1.5 },
  butter:    { name: 'Butter',     emoji: '🧈', base: 2.0 },
  sugar:     { name: 'Sugar',      emoji: '🍬', base: 0.8 },
  eggs:      { name: 'Eggs',       emoji: '🥚', base: 1.2 },
  chocolate: { name: 'Chocolate',  emoji: '🍫', base: 2.5 },
  fruit:     { name: 'Fruit',      emoji: '🍓', base: 2.0 },
  milk:      { name: 'Milk',       emoji: '🥛', base: 1.0 },
  beans:     { name: 'Coffee beans', emoji: '🫘', base: 2.4, level: 4 },
  leaves:    { name: 'Tea leaves', emoji: '🍃', base: 1.4, level: 5 },
  cream:     { name: 'Cream',      emoji: '🫙', base: 2.2, level: 6 },
  meat:      { name: 'Meat & fish', emoji: '🥩', base: 3.2, level: 7 },
  nuts:      { name: 'Nuts',       emoji: '🥜', base: 3.0, level: 11 },
  cheese:    { name: 'Cheese',     emoji: '🧀', base: 2.6, level: 11 },
  ice:       { name: 'Ice',        emoji: '🧊', base: 0.6, level: 12 },
};

// Each machine has its own recipes. caps: [level, how many you may own from that level].
// free: how many you start with. burns/spoil: what happens if a finished batch is left too long.
export const MACHINES = {
  oven:     { name: 'Oven',              plural: 'ovens',              emoji: '🔥', level: 1,  price: 800,  free: 2, caps: [[1, 2], [5, 3], [14, 4]], verb: 'Baking',   burns: true, spoil: 'burnt' },
  mixer:    { name: 'Mixer',             plural: 'mixers',             emoji: '🥣', level: 1,  price: 500,  free: 1, caps: [[1, 1], [8, 2]],          verb: 'Mixing' },
  fryer:    { name: 'Fryer',             plural: 'fryers',             emoji: '🍳', level: 2,  price: 700,  free: 0, caps: [[2, 1]],                  verb: 'Frying',   burns: true, spoil: 'burnt' },
  drinks:   { name: 'Drinks machine',    plural: 'drinks machines',    emoji: '☕', level: 4,  price: 900,  free: 0, caps: [[4, 1]],                  verb: 'Brewing' },
  icecream: { name: 'Ice cream machine', plural: 'ice cream machines', emoji: '🍦', level: 7,  price: 1100, free: 0, caps: [[7, 1]],                  verb: 'Churning', burns: true, spoil: 'melted' },
  grill:    { name: 'Sandwich grill',    plural: 'grills',             emoji: '🥪', level: 11, price: 1000, free: 0, caps: [[11, 1]],                 verb: 'Grilling', burns: true, spoil: 'burnt' },
};
export const MACHINE_PRICE_STEP = 0.35; // each extra machine of a kind costs 35% more than the last
// Where machines stand: five along the back wall, five along the left wall.
export const SPOTS = [
  { x: -2.75, z: -4.0, ry: 0, wall: 'back' }, { x: -1.6, z: -4.0, ry: 0, wall: 'back' }, { x: -0.45, z: -4.0, ry: 0, wall: 'back' },
  { x: 0.7, z: -4.0, ry: 0, wall: 'back' }, { x: 1.85, z: -4.0, ry: 0, wall: 'back' },
  { x: -3.95, z: -3.0, ry: Math.PI / 2, wall: 'left' }, { x: -3.95, z: -1.9, ry: Math.PI / 2, wall: 'left' }, { x: -3.95, z: -0.8, ry: Math.PI / 2, wall: 'left' },
  { x: -3.95, z: 0.3, ry: Math.PI / 2, wall: 'left' }, { x: -3.95, z: 1.4, ry: Math.PI / 2, wall: 'left' },
];
export const MACHINE_WALL = { oven: 'back', fryer: 'back', grill: 'back', mixer: 'left', drinks: 'left', icecream: 'left' };

// Recipes. machine: which machine makes it. time: seconds on that machine. cost: price to learn it (0 = comes with the machine).
// group decides who wants it and when: bread (mornings), pastry (all day), sweet (afternoons),
// drink (all day, busiest early), savory (lunchtime), cold (afternoons, heatwaves).
const R = (machine, name, emoji, group, price, yieldN, time, ing, level = 1, cost = 0) =>
  ({ machine, name, emoji, group, price, yield: yieldN, ing, level, cost, stages: [machine], times: { [machine]: time } });
export const ITEMS = {
  sourdough:  R('oven', 'Sourdough', '🍞', 'bread', 7, 4, 20, { flour: 3 }),
  croissant:  R('oven', 'Croissants', '🥐', 'pastry', 3.5, 6, 16, { flour: 1, butter: 2 }),
  cookies:    R('oven', 'Cookies', '🍪', 'sweet', 2.5, 8, 9, { flour: 1, sugar: 1, chocolate: 1 }),
  baguette:   R('oven', 'Baguettes', '🥖', 'bread', 3, 6, 12, { flour: 2 }, 2, 150),
  tart:       R('oven', 'Fruit tarts', '🥧', 'pastry', 5.5, 4, 14, { flour: 1, butter: 1, fruit: 2 }, 3, 250),
  muffin:     R('oven', 'Muffins', '🧁', 'sweet', 2.8, 8, 11, { flour: 1, sugar: 1, eggs: 1, fruit: 1 }, 4, 300),
  bun:        R('oven', 'Cinnamon buns', '🥨', 'sweet', 3.5, 6, 14, { flour: 1, butter: 1, sugar: 1 }, 5, 250),
  cheesecake: R('oven', 'Cheesecake', '🍰', 'pastry', 6, 6, 18, { cream: 2, sugar: 1, butter: 1, fruit: 1 }, 9, 700),
  honeyroll:  R('oven', 'Honey nut rolls', '🍯', 'sweet', 4, 6, 16, { flour: 1, nuts: 1, sugar: 1, butter: 1 }, 12, 900),
  layercake:  R('oven', 'Layer cake', '🎂', 'pastry', 12, 3, 26, { flour: 2, eggs: 2, cream: 2, sugar: 2, fruit: 1 }, 15, 1500),
  pancakes:   R('mixer', 'Pancakes', '🥞', 'pastry', 3, 6, 8, { flour: 1, eggs: 1, milk: 1 }),
  waffles:    R('mixer', 'Waffles', '🧇', 'sweet', 3.5, 6, 10, { flour: 1, eggs: 1, milk: 1, sugar: 1 }, 3, 250),
  caramel:    R('mixer', 'Crème caramel', '🍮', 'sweet', 4.5, 6, 14, { eggs: 2, cream: 1, sugar: 1 }, 6, 500),
  mousse:     R('mixer', 'Chocolate mousse', '🍫', 'sweet', 5, 6, 12, { chocolate: 2, cream: 1, eggs: 1 }, 10, 800),
  donuts:     R('fryer', 'Donuts', '🍩', 'sweet', 2.5, 8, 8, { flour: 1, sugar: 1, eggs: 1 }, 2),
  dumplings:  R('fryer', 'Dumplings', '🥟', 'savory', 4.5, 8, 12, { flour: 1, meat: 1 }, 7, 600),
  tempura:    R('fryer', 'Tempura', '🍤', 'savory', 6, 6, 10, { flour: 1, eggs: 1, meat: 1 }, 11, 900),
  coffee:     R('drinks', 'Coffee', '☕', 'drink', 2.2, 10, 4, { beans: 1, milk: 1 }, 4),
  tea:        R('drinks', 'Tea', '🍵', 'drink', 1.8, 10, 4, { leaves: 1 }, 5, 150),
  juice:      R('drinks', 'Fresh juice', '🧃', 'drink', 2.5, 8, 6, { fruit: 2 }, 6, 250),
  bubbletea:  R('drinks', 'Bubble tea', '🧋', 'drink', 4, 8, 9, { leaves: 1, milk: 1, sugar: 1 }, 9, 600),
  softserve:  R('icecream', 'Soft serve', '🍦', 'cold', 3, 8, 6, { milk: 2, sugar: 1 }, 7),
  sundae:     R('icecream', 'Sundaes', '🍨', 'cold', 4.5, 6, 9, { cream: 1, sugar: 1, chocolate: 1 }, 8, 400),
  shavedice:  R('icecream', 'Shaved ice', '🍧', 'cold', 3.5, 8, 7, { ice: 2, fruit: 1, sugar: 1 }, 12, 600),
  toastie:    R('grill', 'Toasties', '🥪', 'savory', 4.5, 6, 8, { flour: 1, cheese: 1 }, 11),
  hotdog:     R('grill', 'Hot dogs', '🌭', 'savory', 4, 8, 10, { flour: 1, meat: 1 }, 12, 400),
  bagel:      R('grill', 'Bagels', '🥯', 'bread', 3, 6, 12, { flour: 2, cheese: 1 }, 13, 500),
};
export const START_RECIPES = ['sourdough', 'croissant', 'cookies', 'pancakes'];

// Things that grow with your level instead of being bought one by one.
// Each is [level, amount from that level].
export const CAPS = {
  menu:  [[1, 4], [3, 5], [5, 6], [8, 7], [12, 8]],       // different things on sale at once (the case has 8 trays)
  kits:  [[1, 4], [5, 6], [9, 8], [13, 10]],              // kits Dez will sell you a day
  loan:  [[4, 1000], [8, 2000], [12, 3000]],              // biggest loan the bank will give
  decor: [[1, 6], [3, 10], [5, 14], [7, 18], [9, 22], [12, 28], [15, 34], [18, 40]], // decorations placed
};
// What a cap table allows at a level, and when it next goes up.
export function capAt(table, level) { let n = 0; for (const [l, v] of table) if (level >= l) n = v; return n; }
export function nextCap(table, level) { for (const [l, v] of table) if (l > level) return { level: l, amount: v }; return null; }


export const VELVET = {
  id: 'velvet', name: 'Velvet', emoji: '💜', yield: 10,
  stages: ['prep', 'cook', 'bag'], times: { prep: 8, cook: 20, bag: 6 },
};
// A premium batch (level 7): its own kits, fewer bags, much higher price.
export const GOLD = {
  id: 'gold', name: 'Velvet Gold', emoji: '💛', yield: 6,
  stages: ['prep', 'cook', 'bag'], times: { prep: 10, cook: 28, bag: 8 },
};

export const STAGES = {
  oven:     { name: 'Oven',              emoji: '🔥', verb: 'Baking',   burns: true, spoil: 'burnt' },
  mixer:    { name: 'Mixer',             emoji: '🥣', verb: 'Mixing' },
  fryer:    { name: 'Fryer',             emoji: '🍳', verb: 'Frying',   burns: true, spoil: 'burnt' },
  drinks:   { name: 'Drinks machine',    emoji: '☕', verb: 'Brewing' },
  icecream: { name: 'Ice cream machine', emoji: '🍦', verb: 'Churning', burns: true, spoil: 'melted' },
  grill:    { name: 'Sandwich grill',    emoji: '🥪', verb: 'Grilling', burns: true, spoil: 'burnt' },
  prep:  { name: 'Prep table', emoji: '🧪', verb: 'Prepping' },
  cook:  { name: 'Burner',     emoji: '♨️', verb: 'Cooking', burns: true },
  bag:   { name: 'Bagging',    emoji: '🛍️', verb: 'Bagging' },
};

export const PRICE_LEVELS = {
  low:    { label: 'Low',    mult: 0.8,  buy: 0.97, rep: 0.1 },
  normal: { label: 'Normal', mult: 1.0,  buy: 0.9,  rep: 0 },
  high:   { label: 'High',   mult: 1.25, buy: 0.7,  rep: -0.05 },
};

// cash: which money pays for it. lab: only shown once the back room is running.
export const UPGRADES = [
  { id: 'sign',     name: 'Neon sign',             desc: '+20% customers.',                                 cost: 900,  cash: 'clean', level: 4 },
  { id: 'catering', name: '"Catering" contracts',  desc: 'Invoices for parties nobody threw. Launder +40% more of each day\'s takings safely.', cost: 800, cash: 'clean', lab: true, level: 2 },
  { id: 'camera',   name: 'Back-door camera',      desc: 'Sometimes flags a buyer who feels off. Not always right.', cost: 800, cash: 'dirty', lab: true, level: 4 },
  { id: 'glass',    name: 'Better glassware',      desc: 'Each batch makes 14 bags instead of 10.',         cost: 1000, cash: 'dirty', lab: true, level: 5 },
  { id: 'burner2',  name: 'Second burner',         desc: 'Cook two batches at once.',                       cost: 1500, cash: 'dirty', lab: true, level: 6 },
  { id: 'safe',     name: 'Floor safe',            desc: 'A raid only finds a fifth of your dirty cash instead of half.', cost: 700, cash: 'dirty', lab: true, level: 6 },
  { id: 'van',      name: 'Delivery van',          desc: 'Jay works from a van: half the chance he\'s picked up.', cost: 1500, cash: 'dirty', lab: true, level: 10 },
];

// shift: when they work. cash: what pays their wage. lab: needs the back room.
export const CREW = {
  baker:   { name: 'Priya',   role: 'Baker',         emoji: '👩‍🍳', level: 1, wage: 45, cash: 'clean', shift: 'day',
             desc: 'Moves finished batches on to the next station for you, so nothing sits in the oven and burns.' },
  cashier: { name: 'Tom',     role: 'Cashier',       emoji: '🧑‍💼', level: 5, wage: 40, cash: 'clean', shift: 'day',
             desc: 'Talks people into a little extra: +10% on every sale, and half as many customers put off by prices.' },
  dealer:  { name: 'Jay',     role: 'Street dealer', emoji: '🧢', level: 1, wage: 0, cash: 'dirty', shift: 'night', lab: true,
             desc: 'After a night shift, takes your leftover bags and sells them on the street. Keeps a quarter.' },
  lookout: { name: 'Ash',     role: 'Lookout',       emoji: '👀', level: 6, wage: 60, cash: 'dirty', shift: 'night', lab: true,
             desc: 'Watches the alley and flags most undercover buyers before they reach the door. Not all of them.' },
  cook:    { name: 'Sam',     role: 'Night cook',    emoji: '🥽', level: 8, wage: 50, cash: 'dirty', shift: 'night', lab: true,
             desc: 'Moves finished cooks on to the next station, so nothing scorches on the burner.' },
  muscle:  { name: 'Big Ron', role: 'Muscle',        emoji: '💪', level: 9, wage: 80, cash: 'dirty', shift: 'night', lab: true,
             desc: 'Stands at the back door. When a rival crew turns up, he sees them off instead of them robbing you.' },
};

// Features that switch on at a level (announced on level-up).
export const FEATURES = [
  { id: 'haggle',  level: 3,  name: 'Haggling', desc: 'Push a buyer\'s price up at the back door. Some walk off; officers never argue.' },
  { id: 'loan',    level: 4,  name: 'Bank loans', desc: 'Borrow once a week (£1,000 at first, more at higher levels). Adds the loan plus 20% to the debt.' },
  { id: 'courier', level: 5,  name: 'Courier orders', desc: 'Dez sends a courier for a bulk order on some nights. Big money, a bit more heat.' },
  { id: 'gold',    level: 7,  name: 'Velvet Gold', desc: 'A premium cook with its own kits. Fewer bags, far higher price.' },
  { id: 'rivals',  level: 9,  name: 'Rival crews', desc: 'Word gets round. Some nights a rival crew tries to rob you. Hire muscle.' },
  { id: 'holiday', level: 10, name: 'Payment holiday', desc: 'Skip one bank payment, once, with no penalty.' },
];

export const EVENTS = [
  { id: 'rain',      p: 0.15, text: '🌧️ Rain all day. Fewer people out.',                  cust: 0.7 },
  { id: 'festival',  p: 0.10, text: '🎉 Street festival. The market is packed.',           cust: 1.4 },
  { id: 'shortage',  p: 0.07, text: '🌾 Flour shortage. Flour costs a lot more today.',     flour: 1.8 },
  { id: 'heatwave',  p: 0.06, text: '☀️ Heatwave. Sweet things fly, bread doesn\'t.',       sweet: 2 },
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
    'So this is where I buy the... drugs? The Velvet drugs?',
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
