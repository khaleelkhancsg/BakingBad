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
  xpBag: 2, xpGoldBag: 4, xpVelvetBatch: 8, xpGoldBatch: 14, xpCourier: 30, xpDealerBag: 1, xpRival: 20, xpCoffee: 1,
  menuSlots: 6, caseSlotsExtra: 2,
  coffeeChance: 0.35, coffeePrice: 2.2, cashierBonus: 0.1,
  // Night features
  pushMult: 1.35, pushRefuse: 0.35,                                       // haggling (level 3)
  courierChance: 0.6, courierMin: 8, courierMax: 12, courierPrice: 45, courierHeat: 3, courierPatience: 40, // courier orders (level 5)
  goldKitCost: 420, goldBagDoor: 80, goldShare: 0.25, goldCopExtra: 0.05, // Velvet Gold (level 7)
  rivalChance: 0.25, rivalRob: 0.3, rivalBuyers: 0.7,                     // rival crews (level 9)
  lookoutCatch: 0.7, lookoutFalse: 0.08,
  safeRaidShare: 0.2, vanArrestMult: 0.5,
  // Bank
  loanAmount: 1000, loanFee: 0.2, loanEvery: 7,
});

export const INGREDIENTS = {
  flour:     { name: 'Flour',     emoji: '🌾', base: 1.5 },
  butter:    { name: 'Butter',    emoji: '🧈', base: 2.0 },
  sugar:     { name: 'Sugar',     emoji: '🍬', base: 0.8 },
  eggs:      { name: 'Eggs',      emoji: '🥚', base: 1.2 },
  chocolate: { name: 'Chocolate', emoji: '🍫', base: 2.5 },
  fruit:     { name: 'Fruit',     emoji: '🍓', base: 2.0 },
  cream:     { name: 'Cream',     emoji: '🥛', base: 2.2, level: 6 },
  nuts:      { name: 'Nuts',      emoji: '🥜', base: 3.0, level: 11 },
};

// group decides who wants it: bread (mornings), pastry (all day), sweet (afternoons)
export const ITEMS = {
  sourdough: { name: 'Sourdough',     emoji: '🍞', group: 'bread',  price: 7,   yield: 4, ing: { flour: 3 },
               stages: ['mix', 'proof', 'bake'], times: { mix: 6, proof: 14, bake: 12 } },
  croissant: { name: 'Croissants',    emoji: '🥐', group: 'pastry', price: 3.5, yield: 6, ing: { flour: 1, butter: 2 },
               stages: ['mix', 'proof', 'bake'], times: { mix: 8, proof: 12, bake: 9 } },
  cookies:   { name: 'Cookies',       emoji: '🍪', group: 'sweet',  price: 2.5, yield: 8, ing: { flour: 1, sugar: 1, chocolate: 1 },
               stages: ['mix', 'bake'],          times: { mix: 4, bake: 7 } },
  donuts:    { name: 'Donuts',        emoji: '🍩', group: 'sweet',  price: 2.5, yield: 8, ing: { flour: 1, sugar: 1, eggs: 1 },
               stages: ['mix', 'proof', 'bake'], times: { mix: 5, proof: 8, bake: 5 } },
  tart:      { name: 'Fruit tarts',   emoji: '🥧', group: 'pastry', price: 5.5, yield: 4, ing: { flour: 1, butter: 1, fruit: 2 },
               stages: ['mix', 'bake'],          times: { mix: 7, bake: 14 } },
  bun:       { name: 'Cinnamon buns', emoji: '🥨', group: 'sweet',  price: 3.5, yield: 6, ing: { flour: 1, butter: 1, sugar: 1 },
               stages: ['mix', 'proof', 'bake'], times: { mix: 6, proof: 10, bake: 8 } },
  baguette:  { name: 'Baguettes',     emoji: '🥖', group: 'bread',  price: 3.0, yield: 6, ing: { flour: 2 },
               stages: ['mix', 'proof', 'bake'], times: { mix: 5, proof: 10, bake: 8 } },
  muffin:    { name: 'Muffins',       emoji: '🧁', group: 'sweet',  price: 2.8, yield: 8, ing: { flour: 1, sugar: 1, eggs: 1, fruit: 1 },
               stages: ['mix', 'bake'],          times: { mix: 5, bake: 9 } },
  caramel:   { name: 'Crème caramel', emoji: '🍮', group: 'sweet',  price: 4.5, yield: 6, ing: { eggs: 2, cream: 1, sugar: 1 },
               stages: ['mix', 'bake'],          times: { mix: 6, bake: 12 } },
  cheesecake:{ name: 'Cheesecake',    emoji: '🍰', group: 'pastry', price: 6.0, yield: 6, ing: { cream: 2, sugar: 1, butter: 1, fruit: 1 },
               stages: ['mix', 'bake'],          times: { mix: 7, bake: 16 } },
  honeyroll: { name: 'Honey nut rolls', emoji: '🍯', group: 'sweet', price: 4.0, yield: 6, ing: { flour: 1, nuts: 1, sugar: 1, butter: 1 },
               stages: ['mix', 'proof', 'bake'], times: { mix: 6, proof: 10, bake: 9 } },
  layercake: { name: 'Layer cake',    emoji: '🎂', group: 'pastry', price: 12,  yield: 3, ing: { flour: 2, eggs: 2, cream: 2, sugar: 2, fruit: 1 },
               stages: ['mix', 'bake'],          times: { mix: 9, bake: 22 } },
};
export const START_RECIPES = ['sourdough', 'croissant', 'cookies', 'donuts'];

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
  mix:   { name: 'Mixer',      emoji: '🥣', verb: 'Mixing' },
  proof: { name: 'Proofing',   emoji: '⏳', verb: 'Proofing' },
  bake:  { name: 'Oven',       emoji: '🔥', verb: 'Baking', burns: true },
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
  { id: 'rack2',    name: 'Extra proofing rack',   desc: '+2 proofing slots.',                              cost: 350,  cash: 'clean', level: 1 },
  { id: 'mixer2',   name: 'Second mixer',          desc: 'Mix two batches at once.',                        cost: 500,  cash: 'clean', level: 2 },
  { id: 'recipe_baguette', name: 'Recipe: Baguettes', desc: 'Quick bread for the morning rush.',             cost: 150,  cash: 'clean', recipe: 'baguette', level: 2 },
  { id: 'oven2',    name: 'Third oven',            desc: 'Bake three batches at once.',                     cost: 800,  cash: 'clean', level: 3 },
  { id: 'recipe_tart', name: 'Recipe: Fruit tarts',   desc: 'Pricey pastry. Needs fruit.',                   cost: 250,  cash: 'clean', recipe: 'tart', level: 3 },
  { id: 'sign',     name: 'Neon sign',             desc: '+20% customers.',                                 cost: 900,  cash: 'clean', level: 4 },
  { id: 'recipe_muffin', name: 'Recipe: Muffins',  desc: 'Fruit muffins. Afternoon crowd-pleaser.',          cost: 300,  cash: 'clean', recipe: 'muffin', level: 4 },
  { id: 'recipe_bun',  name: 'Recipe: Cinnamon buns', desc: 'An afternoon favourite.',                       cost: 250,  cash: 'clean', recipe: 'bun', level: 5 },
  { id: 'case2',    name: 'Bigger display case',   desc: '+2 menu slots: sell 8 different things.',         cost: 900,  cash: 'clean', level: 6 },
  { id: 'recipe_caramel', name: 'Recipe: Crème caramel', desc: 'Silky and sweet. Needs cream.',              cost: 500,  cash: 'clean', recipe: 'caramel', level: 7 },
  { id: 'coffee',   name: 'Coffee machine',        desc: `About a third of customers add a coffee (£2.20).`, cost: 1100, cash: 'clean', level: 8 },
  { id: 'oven3',    name: 'Fourth oven',           desc: 'Bake four batches at once.',                      cost: 1500, cash: 'clean', requires: 'oven2', level: 8 },
  { id: 'recipe_cheesecake', name: 'Recipe: Cheesecake', desc: 'A top-shelf pastry. Needs cream.',           cost: 700,  cash: 'clean', recipe: 'cheesecake', level: 9 },
  { id: 'recipe_honeyroll', name: 'Recipe: Honey nut rolls', desc: 'Sticky, nutty, popular. Needs nuts.',    cost: 900,  cash: 'clean', recipe: 'honeyroll', level: 12 },
  { id: 'recipe_layercake', name: 'Recipe: Layer cake', desc: 'The showpiece. Slow to bake, sells high.',    cost: 1500, cash: 'clean', recipe: 'layercake', level: 15 },
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
  { id: 'loan',    level: 4,  name: 'Bank loans', desc: 'Borrow £1,000 once a week. It adds £1,200 to the debt.' },
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
