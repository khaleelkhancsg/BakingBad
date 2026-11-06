// All tunable numbers and content. The game runs on the real clock: times are in real minutes.

export const CFG = {
  // Debt
  debtTotal: 24000, weekly: 2000, firstPaymentDays: 14, missPenalty: 0.05, keepForStock: 150,
  arrearsInterestDaily: 0.005, hardshipGrant: 150,
  // Money and the day (a "game day" turns over at 06:00 local time)
  startClean: 800, rent: 40, rolloverHour: 6,
  // XP and levels: XP to go from level n to n+1 is xpBase + xpScale * n^xpPow
  maxLevel: 99, xpBase: 60, xpScale: 20, xpPow: 2.2, levelCash: 25,
  // Customers (per real hour, before time of day, popularity, marketing and charm)
  custBase: 20, custPerPop: 0.6, varietyBonus: 0.04, varietyCap: 0.4,
  popServed: 0.01, popUnserved: -0.004, popHome: 50, popDriftPerHour: 0.1,
  // Food: what's left done in a machine spoils after max(spoilMin, cook time) more minutes
  spoilMin: 30, trayBatches: 2,
  cashierBonus: 0.1, drinkAddOn: 0.35,
  // Laundering
  launderRatio: 0.8, launderHeat: 20,
  // Night trade: buyers come to the back door between nightStart and nightEnd (local hours)
  nightStart: 18, nightEnd: 7, buyersPerHour: 4, buyersGrow: 0.2, buyersMax: 12, buyerPatienceMin: 3,
  dealerCut: 0.2, streetMult: 1,
  copBase: 0.03, copPerHeat: 1 / 500, copServedHeat: 15, copCrewHeat: 8, heatPerBag: 0.1,
  heatDecayPerHour: 0.25, lieLowPerHour: 0.25, lieLowAfterHours: 12,
  raidAt: 60, inspectAt: 35, inspectChance: 0.2, inspectFine: 800,
  dealerArrestPerNight: 0.03, dealerArrestPerHeat: 1 / 400, dealerArrestHeat: 20,
  bribeCost: 600, bribeHeat: 15, bribeBackfire: 0.1, bribeBackfireHeat: 20,
  pushMult: 1.35, pushRefuse: 0.35,
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
  oven:       { name: 'Oven',              plural: 'ovens',              emoji: '🔥', level: 1,  price: 800,   free: 2, caps: [[1, 2], [5, 3], [14, 4]], verb: 'Baking',   spoil: 'burnt',  model: 'oven' },
  mixer:      { name: 'Mixer',             plural: 'mixers',             emoji: '🥣', level: 1,  price: 500,   free: 1, caps: [[1, 1], [8, 2]],          verb: 'Mixing',   spoil: 'spoiled', model: 'mixer' },
  fryer:      { name: 'Fryer',             plural: 'fryers',             emoji: '🍳', level: 2,  price: 700,   caps: [[2, 1], [26, 2]],                  verb: 'Frying',   spoil: 'burnt',  model: 'fryer' },
  drinks:     { name: 'Drinks machine',    plural: 'drinks machines',    emoji: '☕', level: 4,  price: 900,   caps: [[4, 1], [30, 2]],                  verb: 'Brewing',  spoil: 'gone cold', model: 'drinks' },
  icecream:   { name: 'Ice cream machine', plural: 'ice cream machines', emoji: '🍦', level: 7,  price: 1100,  caps: [[7, 1]],                           verb: 'Churning', spoil: 'melted', model: 'icecream' },
  grill:      { name: 'Sandwich grill',    plural: 'grills',             emoji: '🥪', level: 11, price: 1000,  caps: [[11, 1]],                          verb: 'Grilling', spoil: 'burnt',  model: 'grill' },
  pizza:      { name: 'Pizza oven',        plural: 'pizza ovens',        emoji: '🍕', level: 16, price: 2200,  caps: [[16, 1]],                          verb: 'Firing',   spoil: 'burnt',  model: 'pizza' },
  griddle:    { name: 'Crêpe griddle',     plural: 'griddles',           emoji: '🫓', level: 21, price: 2600,  caps: [[21, 1]],                          verb: 'Cooking',  spoil: 'burnt',  model: 'grill', tint: '#d9a066' },
  steamer:    { name: 'Dim sum steamer',   plural: 'steamers',           emoji: '🎍', level: 27, price: 3200,  caps: [[27, 1]],                          verb: 'Steaming', spoil: 'gone soggy', model: 'steamer' },
  noodles:    { name: 'Noodle bar',        plural: 'noodle bars',        emoji: '🍜', level: 33, price: 3800,  caps: [[33, 1]],                          verb: 'Simmering', spoil: 'gone soggy', model: 'steamer', tint: '#c8323c' },
  choc:       { name: 'Chocolate station', plural: 'chocolate stations', emoji: '🍫', level: 39, price: 4600,  caps: [[39, 1]],                          verb: 'Tempering', spoil: 'bloomed', model: 'mixer', tint: '#5a3320' },
  bbq:        { name: 'Smoker',            plural: 'smokers',            emoji: '🍖', level: 46, price: 5500,  caps: [[46, 1]],                          verb: 'Smoking',  spoil: 'dried out', model: 'pizza', tint: '#2b2d36' },
  patisserie: { name: 'Patisserie bench',  plural: 'patisserie benches', emoji: '🧁', level: 53, price: 6800,  caps: [[53, 1]],                          verb: 'Assembling', spoil: 'collapsed', model: 'mixer', tint: '#ffd6de' },
  bar:        { name: 'Drinks bar',        plural: 'drinks bars',        emoji: '🍹', level: 61, price: 8200,  caps: [[61, 1]],                          verb: 'Mixing',   spoil: 'gone flat', model: 'drinks', tint: '#3cc6c6' },
  sushi:      { name: 'Sushi counter',     plural: 'sushi counters',     emoji: '🍣', level: 68, price: 9500,  caps: [[68, 1]],                          verb: 'Rolling',  spoil: 'spoiled', model: 'steamer', tint: '#f4f0e8' },
  rotisserie: { name: 'Rotisserie',        plural: 'rotisseries',        emoji: '🍗', level: 76, price: 11000, caps: [[76, 1]],                          verb: 'Roasting', spoil: 'dried out', model: 'pizza', tint: '#c9ccd3' },
  candy:      { name: 'Sweet machine',     plural: 'sweet machines',     emoji: '🍭', level: 84, price: 13000, caps: [[84, 1]],                          verb: 'Spinning', spoil: 'gone sticky', model: 'icecream', tint: '#b58cff' },
  grand:      { name: 'Grand patisserie',  plural: 'grand patisseries',  emoji: '👑', level: 92, price: 16000, caps: [[92, 1]],                          verb: 'Creating', spoil: 'spoiled', model: 'oven', tint: '#d4af37' },
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
};
// Ingredient amounts: about a quarter of what a batch sells for, split across its ingredients.
for (const r of Object.values(ITEMS)) {
  const budget = r.servings * r.price * 0.25 / r.ingList.length;
  r.ing = Object.fromEntries(r.ingList.map(k => [k, Math.max(1, Math.round(budget / INGREDIENTS[k].base))]));
}
// The first recipe of each machine comes free with it.
for (const type of Object.keys(MACHINES)) {
  const first = Object.entries(ITEMS).filter(([, r]) => r.machine === type).sort((a, b) => a[1].level - b[1].level)[0];
  if (first) first[1].cost = 0;
}
export const START_RECIPES = ['sourdough', 'croissant', 'cookies', 'pancakes'];

// The back room: machines and what they make (all made up). Kits are bought from Dez.
export const LAB_MACHINES = {
  burner:  { name: 'Burner',  plural: 'burners',  emoji: '♨️', level: 1,  price: 1500,  free: 1, caps: [[1, 1], [6, 2], [30, 3]], verb: 'Cooking', model: 'burner' },
  press:   { name: 'Press',   plural: 'presses',  emoji: '🗜️', level: 20, price: 9000,  caps: [[20, 1], [55, 2]], verb: 'Pressing', model: 'press' },
  kiln:    { name: 'Kiln',    plural: 'kilns',    emoji: '🏺', level: 40, price: 22000, caps: [[40, 1]], verb: 'Firing', model: 'kiln' },
  chamber: { name: 'Chamber', plural: 'chambers', emoji: '🔮', level: 65, price: 50000, caps: [[65, 1]], verb: 'Curing', model: 'chamber' },
};
// share: how often buyers ask for it. cop: extra chance a buyer wanting it is undercover. heat: per batch.
export const PRODUCTS = {
  velvet:     { name: 'Velvet',      emoji: '💜', machine: 'burner',  level: 1,  kit: 160,  minutes: 20,  bags: 10, price: 40,   heat: 1, share: 1.0,  cop: 0 },
  gold:       { name: 'Velvet Gold', emoji: '💛', machine: 'burner',  level: 7,  kit: 290,  minutes: 45,  bags: 8,  price: 90,   heat: 2, share: 0.5,  cop: 0.05 },
  static:     { name: 'Static',      emoji: '⚡', machine: 'press',   level: 20, kit: 360,  minutes: 60,  bags: 12, price: 75,   heat: 2, share: 0.6,  cop: 0.03 },
  halo:       { name: 'Halo',        emoji: '😇', machine: 'press',   level: 28, kit: 560, minutes: 90,  bags: 10, price: 140,  heat: 3, share: 0.45, cop: 0.05 },
  nightshade: { name: 'Nightshade',  emoji: '🌑', machine: 'kiln',    level: 40, kit: 910, minutes: 150, bags: 12, price: 190,  heat: 3, share: 0.4,  cop: 0.06 },
  ember:      { name: 'Ember',       emoji: '🔆', machine: 'kiln',    level: 48, kit: 1280, minutes: 200, bags: 10, price: 320,  heat: 4, share: 0.3,  cop: 0.08 },
  aurora:     { name: 'Aurora',      emoji: '🌌', machine: 'chamber', level: 65, kit: 2000, minutes: 300, bags: 12, price: 420,  heat: 4, share: 0.28, cop: 0.08 },
  eclipse:    { name: 'Eclipse',     emoji: '🌘', machine: 'chamber', level: 78, kit: 2900, minutes: 360, bags: 10, price: 720,  heat: 5, share: 0.2,  cop: 0.1 },
  paragon:    { name: 'Paragon',     emoji: '💠', machine: 'chamber', level: 90, kit: 4300, minutes: 480, bags: 8,  price: 1350, heat: 6, share: 0.15, cop: 0.12 },
};

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
  { id: 'phones',    name: 'Burner phones',        emoji: '📵', level: 85, cost: 50000,  cash: 'dirty', lab: true, eff: { tipoff: 0.2 }, desc: 'Nobody can listen in: raids are another 20% less likely.' },
  { id: 'catering',  name: '"Catering" contracts', emoji: '📦', level: 2,  cost: 800,    cash: 'clean', lab: true, eff: { launder: 0.4 }, desc: 'Invoices for parties nobody threw. Launder 40% more of each day\'s takings safely.' },
  { id: 'camera',    name: 'Back-door camera',     emoji: '📷', level: 4,  cost: 800,    cash: 'dirty', lab: true, eff: { camera: 1 },    desc: 'Sometimes flags a buyer who feels off. Not always right.' },
  { id: 'glass',     name: 'Better glassware',     emoji: '🧪', level: 5,  cost: 1000,   cash: 'dirty', lab: true, eff: { bags: 0.2 },    desc: 'Every cook makes 20% more bags.' },
  { id: 'safe',      name: 'Floor safe',           emoji: '🔐', level: 6,  cost: 700,    cash: 'dirty', lab: true, eff: { safe: 1 },      desc: 'A raid only finds a fifth of your dirty cash instead of half.' },
  { id: 'van',       name: 'Delivery van',         emoji: '🚐', level: 10, cost: 1500,   cash: 'dirty', lab: true, eff: { van: 1 },       desc: 'Jay works from a van: half the chance he\'s picked up.' },
  { id: 'soundproof',name: 'Soundproofing',        emoji: '🔇', level: 22, cost: 5000,   cash: 'dirty', lab: true, eff: { quiet: 0.25 },  desc: 'Cooking draws 25% less heat.' },
  { id: 'books',     name: 'Creative accounting',  emoji: '📒', level: 31, cost: 8000,   cash: 'clean', lab: true, eff: { launder: 0.4 }, desc: 'Launder another 40% of each day\'s takings safely.' },
  { id: 'tunnel',    name: 'Escape tunnel',        emoji: '🕳️', level: 44, cost: 15000,  cash: 'dirty', lab: true, eff: { hide: 0.5 },    desc: 'Raids find product half as often.' },
  { id: 'insider',   name: 'Someone inside',       emoji: '🕵️', level: 58, cost: 25000,  cash: 'dirty', lab: true, eff: { tipoff: 0.3 },  desc: 'A tip-off before most raids: raids are 30% less likely.' },
  { id: 'shell',     name: 'Shell company',        emoji: '🐚', level: 73, cost: 40000,  cash: 'clean', lab: true, eff: { launder: 0.6 }, desc: 'Launder another 60% of each day\'s takings safely.' },
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
             desc: 'Puts the safe amount of dirty cash through the till every morning, and tax inspectors fine you less.' },
  dealer:  { name: 'Jay',     role: 'Street dealer', emoji: '🧢', level: 1,  wage: 0,   cash: 'dirty', shift: 'night', lab: true,
             desc: 'Serves buyers at the back door when you\'re not there, at street prices. Keeps a quarter.' },
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
  kits:      [[1, 4], [5, 6], [9, 8], [13, 10], [25, 14], [40, 18], [60, 24], [80, 30]],
  loan:      [[4, 1000], [8, 2000], [12, 3000], [25, 6000], [40, 10000], [60, 20000], [80, 40000]],
  decor:     [[1, 6], [3, 10], [5, 14], [7, 18], [9, 22], [12, 28], [15, 34], [18, 40], [24, 48], [30, 56], [40, 64], [55, 72], [75, 80], [90, 90]],
  campaigns: [[1, 1], [5, 2], [10, 3], [15, 4], [40, 5], [70, 6]],
};
export function capAt(table, level) { let n = 0; for (const [l, v] of table) if (level >= l) n = v; return n; }
export function nextCap(table, level) { for (const [l, v] of table) if (l > level) return { level: l, amount: v }; return null; }

// Kitchen spots (bakery) and lab spots (back room). need: an expansion that opens the spot.
// cell: the design square a terrace machine stands on (kept clear of decorations).
export const SPOTS = [
  { x: -2.75, z: -4.0, ry: 0, wall: 'back' }, { x: -1.6, z: -4.0, ry: 0, wall: 'back' }, { x: -0.45, z: -4.0, ry: 0, wall: 'back' },
  { x: 0.7, z: -4.0, ry: 0, wall: 'back' }, { x: 1.85, z: -4.0, ry: 0, wall: 'back' },
  { x: -3.95, z: -3.0, ry: Math.PI / 2, wall: 'left' }, { x: -3.95, z: -1.9, ry: Math.PI / 2, wall: 'left' }, { x: -3.95, z: -0.8, ry: Math.PI / 2, wall: 'left' },
  { x: -3.95, z: 0.3, ry: Math.PI / 2, wall: 'left' }, { x: -3.95, z: 1.4, ry: Math.PI / 2, wall: 'left' },
  { x: -2.1, z: -2.15, ry: 0, wall: 'island', need: 'island' }, { x: -0.9, z: -2.15, ry: 0, wall: 'island', need: 'island' },
  { x: -2.1, z: -1.1, ry: Math.PI, wall: 'island', need: 'island2' }, { x: -0.9, z: -1.1, ry: Math.PI, wall: 'island', need: 'island2' },
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
export const LAB_SPOTS = [
  { x: -10.25, z: -3.95, ry: 0 }, { x: -8.95, z: -3.95, ry: 0 }, { x: -7.7, z: -3.95, ry: 0 }, { x: -6.45, z: -3.95, ry: 0 },
  { x: -9.6, z: -1.2, ry: 0, need: 'bench' }, { x: -8.3, z: -1.2, ry: 0, need: 'bench' }, { x: -7.0, z: -1.2, ry: 0, need: 'bench2' },
];

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
