# Baking Bad

A day/night management game. You inherit Aunt Rosa's bakery stall at the night market, and £24,000 of her debt.
The bank wants £2,000 a week, starting after two weeks' grace. Dez, one of Rosa's regulars, knows what the back room used to be for.

The game never ends: like Clash of Clans, you just keep building the place up.

It's a 3D game: you look down into the shop at an angle. By day it's a bright bakery: ovens, mixers, fryers and more, and a glass case
that fills with what you make while customers walk in and queue. By night the camera moves next door to the back room, which is
lit purple. Tap a machine (or the bubble above it) to work it. Drag to look around, and pinch or scroll to zoom.

## No game over

Nothing ends a run. Trouble costs you instead:

- **Busted** (heat hits 100, or a raid finds product): fines, every bag and kit seized, police tape on the back room for 3 nights, Jay charged, other night crew may quit, and a scandal in the papers. Popularity drops, and customers stay away for a few days.
- **Behind with the bank**: whatever you can't pay rolls over with 5% on top, then 0.5% a day interest. While you're behind, Grimshaw Recovery's heavies may visit at night. They smash decorations, crack tiles, tear wallpaper, wreck a machine (repair it from the Kitchen) or empty the till. Big Ron helps. Once you're two payments behind you can restructure the debt to call them off.
- **Cash never goes below zero.** If you're broke with nothing to bake, the market traders' association chips in so you can always start again.
- **Clearing the debt** is a milestone, not an ending. Levels go up to 60.

## Popularity and marketing

Popularity (⭐) decides how many customers come. It drifts back towards the middle over time. The 📣 Marketing tab helps you win it back with a PR manager (Mel) and campaigns, from flyers to billboards to sponsoring the street festival. You can run more campaigns at once as you level up.

## The kitchen

Every machine has its own menu. Tap a machine (in the shop, or from the 🍳 Kitchen tab) to open it: in the morning you set prices, choose what's on sale and learn recipes; during the day you pick what to make. Each batch is one timer on one machine. Leave it too long on an oven, fryer, grill or ice cream machine and it's ruined.

| Machine | From level | Recipes |
|---|---|---|
| 🔥 Oven | 1 (2 to start, 3 at 5, 4 at 14) | Sourdough, croissants, cookies, baguettes, tarts, muffins, buns, cheesecake, honey rolls, layer cake |
| 🥣 Mixer | 1 (1 to start, 2 at 8) | Pancakes, waffles, crème caramel, chocolate mousse |
| 🍳 Fryer | 2 | Donuts, dumplings, tempura |
| ☕ Drinks machine | 4 | Coffee, tea, juice, bubble tea (a third of food customers grab a drink too) |
| 🍦 Ice cream machine | 7 | Soft serve, sundaes, shaved ice |
| 🥪 Sandwich grill | 11 | Toasties, hot dogs, bagels |

You can only own as many of each machine as your level allows. At the limit the buy button says "Reach level N to unlock additional ovens". The same goes for how many things you can sell at once, how many kits Dez sells you a day, how many decorations you can place and how much the bank will lend.

## XP and levels

Everything earns XP: each item sold (pricier items give more), each batch out of the oven (longer recipes give more), each cook in the back room, each bag sold (Velvet Gold gives double), courier orders and seeing off rivals. Levels go up to 60. Each one pays a small bonus, and most unlock something:

- **Supplies**: coffee beans (4), tea leaves (5), cream (6), meat & fish (7), nuts and cheese (11), ice (12).
- **Machines and recipes**: see The kitchen above.
- **Shop**: a neon sign (4), and back-room upgrades including a floor safe (6) and a delivery van (10).
- **Crew**: Tom the cashier (5), Ash the lookout (6), Sam the night cook (8), Big Ron the muscle (9).
- **Night**: haggling (3), courier bulk orders (5), Velvet Gold (7), rival crews who rob you unless you have muscle (9).
- **Bank**: loans (4), a one-off payment holiday (10).
- **Design**: floors, wallpapers, decor, wall art and both terraces unlock as you go.

Locked things show 🔒 and their level, and every card's ⓘ explains it.

## Designing the bakery

In the morning, open **🎨 Design**:

- **Floor**: tap single squares to lay tiles (10 styles), or do the whole floor.
- **Walls**: wallpaper each wall panel (9 styles).
- **Decor**: place plants, café tables, a bread rack, a grandfather clock, a shop cat, a fountain and more on the green squares. Tap one to move, turn or sell it (half back).
- **Wall art**: paintings, clocks, jar shelves and plate racks on the wall panels.
- **Expand**: buy the front terrace and the side terrace to get more squares outside.

Decor adds **charm**. Each point of charm brings about 1% more customers, up to +30%.

## How a day works

1. **Morning**: buy ingredients (prices change daily), set prices, buy upgrades, hire crew, buy kits from Dez, pay a bribe.
2. **Day, bakery open**: tap a machine to start something from its menu, and tap again to collect. Customers buy from the case on their own.
   Mornings want bread and drinks, lunchtime wants savoury things, afternoons want sweet and cold things.
3. **Closing up**: put dirty cash through the till. Up to 80% of the day's real takings looks normal. More than that adds heat.
4. **Night, back room**: tap to prep → cook → bag Velvet (a made-up product). Buyers knock at the back door. Read what they say:
   undercover officers usually say something off, and some ordinary buyers do too.
5. **Small hours**: give leftover bags to Jay to sell on the street (if you've hired him).
6. **Next morning**: a report on takings, heat, raids, inspections and the bank.

Heat (0–100) rises with batches, sales, undercover buyers and laundering too much. It falls every night, faster if you keep the back room shut.
At 60+ raids start. A raid that finds product, or reaching 100, gets you busted (see No game over).

## Running it

```
node "C:\Users\khale\Documents\Claude projects\BakingBad\server.mjs"
```

Then open http://localhost:5190. Add `?speed=5` to speed up the clock while testing. The game saves itself in the browser.

## Balance simulator

Bots play 120 days with three strategies (honest, careful, greedy) and report how far the bakery got: debt cleared, level, busts, collector visits and cash.

```
node "C:\Users\khale\Documents\Claude projects\BakingBad\tools\sim.mjs" 25
```

All numbers live in `www/js/data.js`.

## Layout

- `www/` is the whole game (plain HTML/CSS/JS, no build step). It is what gets packaged for Android.
- `www/js/scene.js` is the 3D scene (Three.js, kept in `www/vendor/` so the game works offline). All models are built from simple shapes in code.
- `www/js/design.js` holds the design catalogue and rules (squares, charm, expansions); `www/js/world.js` the neighbourhood.
- `www/js/data.js` holds the numbers and content, `www/js/game.js` the rules (no DOM), and `www/js/ui.js` the screens and input.
- `tools/sim.mjs` is the balance simulator.

## Android

Not packaged yet. The plan is to wrap `www/` with Capacitor into an APK and sideload it.
