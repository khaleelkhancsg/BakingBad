// Little sounds, all made in the browser (no audio files): the till, the oven timer, the shop bell, the back-door
// knock, coins, and a low hum in the back room at night. Quiet by design. Nothing plays until the first tap
// (browsers and phones need one), or when sound is off in Settings.
let ctx = null, master = null, on = true, hum = null;
const now = () => ctx.currentTime;

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
  return true;
}
export function unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); }
export function setSound(enabled) { on = enabled; if (!on) setHum(false); if (master) master.gain.value = on ? 0.5 : 0; }
export const soundOn = () => on;

function tone(freq, { at = 0, dur = 0.25, type = 'sine', vol = 0.15, slide = 0 } = {}) {
  if (!on || !ctx || ctx.state !== 'running') return;
  const t = now() + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, { at = 0, vol = 0.08, freq = 1200 } = {}) {
  if (!on || !ctx || ctx.state !== 'running') return;
  const t = now() + at, n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(master); src.start(t);
}

const last = {};
const throttle = (key, ms) => { const t = performance.now(); if (last[key] && t - last[key] < ms) return false; last[key] = t; return true; };

export const sfx = {
  till: () => throttle('till', 1500) && (tone(1318, { dur: 0.18, type: 'triangle', vol: 0.12 }), tone(1760, { at: 0.08, dur: 0.3, type: 'triangle', vol: 0.1 })),
  timer: () => throttle('timer', 2500) && [0, 0.18, 0.36].forEach(a => tone(1046, { at: a, dur: 0.12, type: 'square', vol: 0.05 })),
  bell: () => throttle('bell', 2000) && (tone(2093, { dur: 0.6, vol: 0.08 }), tone(2637, { at: 0.05, dur: 0.5, vol: 0.05 })),
  knock: () => throttle('knock', 2500) && [0, 0.16, 0.32].forEach(a => noise(0.06, { at: a, vol: 0.25, freq: 180 })),
  coin: () => throttle('coin', 400) && (tone(1568, { dur: 0.08, type: 'square', vol: 0.05 }), tone(2093, { at: 0.07, dur: 0.18, type: 'square', vol: 0.05 })),
  tap: () => throttle('tap', 120) && tone(660, { dur: 0.05, type: 'triangle', vol: 0.04 }),
  bad: () => throttle('bad', 800) && tone(220, { dur: 0.25, type: 'sawtooth', vol: 0.04, slide: 0.7 }),
  level: () => [523, 659, 784, 1046].forEach((f, k) => tone(f, { at: k * 0.1, dur: 0.3, type: 'triangle', vol: 0.09 })),
  siren: () => throttle('siren', 6000) && [0, 0.4].forEach(a => tone(700, { at: a, dur: 0.4, type: 'sawtooth', vol: 0.03, slide: 1.4 })),
};

// The back room at night: a fridge-like hum with a slow wobble
export function setHum(want) {
  if (!ctx || !on || ctx.state !== 'running') want = false;
  if (want && !hum) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 55; o2.type = 'sine'; o2.frequency.value = 110.5;
    g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.03, now() + 1.5);
    lfo.frequency.value = 0.15; lg.gain.value = 0.01; lfo.connect(lg); lg.connect(g.gain);
    o.connect(g); o2.connect(g); g.connect(master); o.start(); o2.start(); lfo.start();
    hum = { o, o2, g, lfo };
  } else if (!want && hum) {
    const h = hum; hum = null;
    h.g.gain.cancelScheduledValues(now()); h.g.gain.setTargetAtTime(0.0001, now(), 0.4);
    setTimeout(() => { for (const x of [h.o, h.o2, h.lfo]) try { x.stop(); } catch { /* already stopped */ } }, 1500);
  }
}
