# Baking Bad

A day/night management game. You inherit Aunt Rosa's bakery stall at the night market, and £24,000 of her debt.
The bank wants £2,000 a week, starting after two weeks' grace. Miss three payments and they take the stall.

Bread alone won't cover it. Dez, one of Rosa's regulars, knows what the back room used to be for.

It's a 3D game: you look down into the shop at an angle. By day it's a bright bakery: ovens, mixers, proofing racks, and a glass case
that fills with what you bake while customers walk in and queue. By night the camera moves next door to the back room, which is
lit purple. Tap a station (or the bubble above it) to work it. Drag to look around, and pinch or scroll to zoom.

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

Everything earns XP: each item sold (pricier items give more), each batch out of the oven (longer recipes give more), each cook in the back room, each bag sold (Velvet Gold gives double), courier orders and seeing off rivals. There are 20 levels, and each one pays a small bonus and unlocks things:

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
At 60+ raids start, and a raid that finds product can end the run. At 100 you're arrested.

## Running it

```
node "C:\Users\khale\Documents\Claude projects\BakingBad\server.mjs"
```

Then open http://localhost:5190. Add `?speed=5` to speed up the clock while testing. The game saves itself in the browser.

## Balance simulator

Bots play full runs with three strategies (honest, careful, greedy):

```
node "C:\Users\khale\Documents\Claude projects\BakingBad\tools\sim.mjs" 60
```

All numbers live in `www/js/data.js`. At the time of writing: honest 0%, careful about 60%, greedy 10–30% (mostly arrested).

## Layout

- `www/` is the whole game (plain HTML/CSS/JS, no build step). It is what gets packaged for Android.
- `www/js/scene.js` is the 3D scene (Three.js, kept in `www/vendor/` so the game works offline). All models are built from simple shapes in code.
- `www/js/design.js` holds the design catalogue and rules (squares, charm, expansions); `www/js/world.js` the neighbourhood.
- `www/js/data.js` holds the numbers and content, `www/js/game.js` the rules (no DOM), and `www/js/ui.js` the screens and input.
- `tools/sim.mjs` is the balance simulator.

## Android

Not packaged yet. The plan is to wrap `www/` with Capacitor into an APK and sideload it.
