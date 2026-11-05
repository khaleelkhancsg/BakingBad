# Baking Bad

A day/night management game. You inherit Aunt Rosa's bakery stall at the night market, and £24,000 of her debt.
The bank wants £2,000 a week, starting after two weeks' grace. Miss three payments and they take the stall.

Bread alone won't cover it. Dez, one of Rosa's regulars, knows what the back room used to be for.

## How a day works

1. **Morning**: buy ingredients (prices change daily), set prices, buy upgrades, hire crew, buy kits from Dez, pay a bribe.
2. **Day, bakery open**: tap a station to move each batch along: mixer → proofing → oven. Customers buy from the case on their own.
   Mornings want bread, afternoons want sweet things. Finished batches burn if left in the oven.
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

All numbers live in `www/js/data.js`. At the time of writing: honest 0%, careful about 60%, greedy about 30% (mostly arrested).

## Layout

- `www/` is the whole game (plain HTML/CSS/JS, no build step). It is what gets packaged for Android.
- `www/js/data.js` holds the numbers and content, `www/js/game.js` the rules (no DOM), and `www/js/ui.js` the screens and input.
- `tools/sim.mjs` is the balance simulator.

## Android

Not packaged yet. The plan is to wrap `www/` with Capacitor into an APK and sideload it.
