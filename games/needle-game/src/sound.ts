/**
 * Needle's sound, synthesized with Web Audio (no files to download).
 *
 * Everything runs through a warm chain: master -> low-pass -> compressor,
 * with a small generated "barn" reverb for chimes and birdsong. Hay sounds are
 * filtered noise grains; chimes are soft bells and marimba notes on a C major
 * pentatonic scale, so any combination sounds pleasant together.
 *
 * Nothing plays until unlock() is called from a user gesture.
 */

const MASTER = 0.9;
const PENTA = [0, 2, 4, 7, 9];

let ctx: AudioContext | undefined;
let master: GainNode;
let dry: GainNode;
let wet: GainNode;
let noise: AudioBuffer;
let enabled = true;

const midi = (m: number) => 440 * 2 ** ((m - 69) / 12);
/** Note on the pentatonic scale, `step` degrees above `root` (a MIDI note). */
const penta = (root: number, step: number) => midi(root + 12 * Math.floor(step / 5) + PENTA[step % 5]);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function build(c: AudioContext) {
  master = c.createGain();
  master.gain.value = enabled ? MASTER : 0;
  const warm = c.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 8500;
  warm.Q.value = 0.5;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 12;
  comp.ratio.value = 3;
  comp.attack.value = 0.005;
  comp.release.value = 0.2;
  master.connect(warm).connect(comp).connect(c.destination);

  dry = c.createGain();
  dry.connect(master);

  // Small wooden room: stereo decaying noise, darkened.
  const room = c.createConvolver();
  const len = Math.floor(c.sampleRate * 2);
  const impulse = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = impulse.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      lp += (Math.random() * 2 - 1 - lp) * 0.35;
      d[i] = lp * Math.exp((-3.2 * i) / len);
    }
  }
  room.buffer = impulse;
  wet = c.createGain();
  wet.gain.value = 0.55;
  wet.connect(room).connect(master);

  noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const n = noise.getChannelData(0);
  for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else if (enabled) void ctx.resume();
  });
}

/** The context, only when sound is on and audio has been unlocked. */
function live(): AudioContext | null {
  return enabled && ctx ? ctx : null;
}

/** A panned output that feeds the dry mix and, optionally, the reverb. */
function out(c: AudioContext, pan: number, reverb = 0): AudioNode {
  const p = c.createStereoPanner();
  p.pan.value = clamp(pan, -1, 1);
  p.connect(dry);
  if (reverb > 0) {
    const send = c.createGain();
    send.gain.value = reverb;
    p.connect(send).connect(wet);
  }
  return p;
}

function envelope(g: GainNode, t: number, attack: number, peak: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

interface ToneOpts {
  type?: OscillatorType;
  attack?: number;
  peak: number;
  decay: number;
  pan?: number;
  reverb?: number;
  glideTo?: number;
  glideTime?: number;
}

function tone(c: AudioContext, t: number, freq: number, o: ToneOpts) {
  const osc = c.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t + (o.glideTime ?? 0.05));
  const g = c.createGain();
  const attack = o.attack ?? 0.005;
  envelope(g, t, attack, o.peak, o.decay);
  osc.connect(g).connect(out(c, o.pan ?? 0, o.reverb ?? 0));
  osc.start(t);
  osc.stop(t + attack + o.decay + 0.05);
}

interface GrainOpts {
  dur: number;
  freq: number;
  q?: number;
  filter?: BiquadFilterType;
  peak: number;
  pan?: number;
  reverb?: number;
  sweepTo?: number;
  attack?: number;
}

/** A short burst of filtered noise: the building block of every hay sound. */
function grain(c: AudioContext, t: number, o: GrainOpts) {
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = o.filter ?? 'bandpass';
  f.frequency.setValueAtTime(o.freq, t);
  if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(o.sweepTo, t + o.dur);
  f.Q.value = o.q ?? 1;
  const g = c.createGain();
  const attack = o.attack ?? 0.003;
  envelope(g, t, attack, o.peak, o.dur);
  src.connect(f).connect(g).connect(out(c, o.pan ?? 0, o.reverb ?? 0));
  src.start(t, rand(0, noise.duration - o.dur - 0.1));
  src.stop(t + attack + o.dur + 0.05);
}

/** Soft bell: a sine with two inharmonic partials. */
function bell(c: AudioContext, t: number, freq: number, peak: number, pan = 0, reverb = 0.5, decay = 1.4) {
  tone(c, t, freq, { peak, decay, pan, reverb, attack: 0.004 });
  tone(c, t, freq * 2.756, { peak: peak * 0.22, decay: decay * 0.4, pan, reverb });
  tone(c, t, freq * 5.404, { peak: peak * 0.07, decay: decay * 0.2, pan, reverb });
}

/** Rounded wooden note. */
function marimba(c: AudioContext, t: number, freq: number, peak: number, pan = 0) {
  tone(c, t, freq, { peak, decay: 0.38, pan, reverb: 0.25, attack: 0.003 });
  tone(c, t, freq * 3.93, { peak: peak * 0.16, decay: 0.07, pan, reverb: 0.1 });
}

/** Little wooden "tock" for buttons. */
function tock(c: AudioContext, freq: number, peak = 0.11) {
  const t = c.currentTime;
  tone(c, t, freq, { peak, decay: 0.07, glideTo: freq * 0.55, glideTime: 0.05, attack: 0.002, reverb: 0.08 });
  grain(c, t, { dur: 0.008, freq: 2600, filter: 'highpass', peak: peak * 0.25 });
}

// ---------------------------------------------------------------- setup

/** Call from every user gesture; the first one creates and starts audio. */
export function unlock() {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
    build(ctx);
  }
  if (enabled && ctx.state === 'suspended') void ctx.resume();
  if (enabled) startAmbience();
}

export function setEnabled(on: boolean) {
  enabled = on;
  if (!ctx) return;
  master.gain.setTargetAtTime(on ? MASTER : 0, ctx.currentTime, 0.06);
  if (on) {
    void ctx.resume();
    startAmbience();
  } else {
    stopAmbience();
  }
}

// ---------------------------------------------------------------- hay

/** One brush tick (every ~65 ms while dragging): a dry rustle that gets
 *  fuller the more straws it moves. `pan` is -1 (left) to 1 (right). */
export function brush(count: number, pan: number) {
  const c = live();
  if (!c) return;
  const t = c.currentTime;
  const amount = clamp(count, 1, 5) / 5;
  // Fewer, lower, broader grains: a narrow high band sounded like a whistle.
  const grains = 1 + Math.round(amount * 2);
  for (let i = 0; i < grains; i++) {
    grain(c, t + i * 0.014 + rand(0, 0.012), {
      dur: rand(0.025, 0.055),
      freq: rand(1300, 3200),
      q: rand(0.5, 0.9),
      peak: 0.017 * (0.55 + amount * 0.5) * rand(0.7, 1),
      pan: pan + rand(-0.12, 0.12),
      reverb: 0.03,
    });
  }
  // A soft, low swish underneath gives the rustle some body.
  grain(c, t, { dur: 0.1, freq: rand(600, 900), q: 0.6, peak: 0.011 * (0.6 + amount), pan, attack: 0.02 });
}

let streak = 0;
let lastPluck = 0;

/** The melody a run of quick plucks walks through: up the scale, then back down, so it never settles on one high note. */
const RUN = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1];

/**
 * Plucking a straw: a soft, low rustle and one warm wooden note that wanders up and down
 * the pentatonic scale. Each pluck is a little different, and plucks that land together
 * skip the note and stay quiet, so repeated clicking stays gentle.
 */
export function pluck(pan: number) {
  const c = live();
  if (!c) return;
  const t = c.currentTime;
  if (t - lastPluck > 1.4) streak = 0;
  const gap = t - lastPluck;
  lastPluck = t;
  grain(c, t, { dur: 0.16, freq: 520, sweepTo: 1100, q: 0.5, peak: 0.032, attack: 0.02, pan, reverb: 0.15 });
  if (gap < 0.09) return;
  const f = penta(60, RUN[streak++ % RUN.length]) * 2 ** (rand(-6, 6) / 1200);
  marimba(c, t + 0.015, f, 0.045, pan);
}

/** A soft tink for each coin that lands in the counter, climbing the scale as more arrive. */
export function coin(step: number) {
  const c = live();
  if (!c) return;
  marimba(c, c.currentTime, penta(72, Math.min(step, 9)), 0.04, 0);
}
/** The shovel: a longer, rounder rustle, with two soft wooden notes. `n` is how many straws it lifted. */
export function scoop(pan: number, n: number) {
  const c = live();
  if (!c) return;
  const t = c.currentTime;
  if (t - lastPluck > 1.4) streak = 0;
  lastPluck = t;
  const k = Math.min(1, n / 12);
  const f = penta(55, RUN[streak++ % RUN.length]);
  grain(c, t, { dur: 0.22 + 0.12 * k, freq: 420, sweepTo: 1000, q: 0.5, peak: 0.04 + 0.02 * k, attack: 0.03, pan, reverb: 0.2 });
  marimba(c, t + 0.03, f, 0.05, pan);
  marimba(c, t + 0.11, f * 1.5, 0.035, pan);
}
// ---------------------------------------------------------------- finds

/** The needle: a metallic "tink", then a warm bell arpeggio over a soft pad.
 *  The end of a chapter adds a second, higher flourish. */
export function found(pan: number, chapter: boolean) {
  const c = live();
  if (!c) return;
  const t = c.currentTime;
  tone(c, t, 2637, { peak: 0.07, decay: 0.55, pan, reverb: 0.4, attack: 0.002 });
  tone(c, t, 3951, { peak: 0.035, decay: 0.3, pan, reverb: 0.4, attack: 0.002 });
  [84, 88, 91, 96].forEach((m, i) => bell(c, t + 0.14 + i * 0.09, midi(m), 0.085, pan * 0.4, 0.55, 1.6));
  [60, 67, 76].forEach((m) => tone(c, t + 0.1, midi(m), { type: 'triangle', peak: 0.022, attack: 0.25, decay: 2.2, reverb: 0.45 }));
  for (let i = 0; i < 6; i++) bell(c, t + 0.5 + i * 0.12 + rand(0, 0.05), penta(96, Math.floor(rand(0, 8))), 0.018, rand(-0.6, 0.6), 0.8, 0.7);
  if (chapter) [96, 100, 103, 108].forEach((m, i) => bell(c, t + 0.75 + i * 0.1, midi(m), 0.05, 0, 0.6, 1.4));
}

/** A bonus object: a happy two-note "plink-plonk" with a sparkle on top. */
export function bonus(pan: number) {
  const c = live();
  if (!c) return;
  const t = c.currentTime;
  marimba(c, t, midi(79), 0.08, pan);
  marimba(c, t + 0.09, midi(84), 0.08, pan);
  bell(c, t + 0.18, midi(96), 0.03, pan, 0.6, 0.8);
}

/** The faint glint near the needle's eye: a tiny, distant ting. */
export function glint(pan: number) {
  const c = live();
  if (!c) return;
  bell(c, c.currentTime, 3136, 0.014, pan * 0.5, 0.75, 0.8);
}

// ---------------------------------------------------------------- tools

/**
 * Detector beep. `close` (0..1) raises the pitch as the sweep nears something hidden;
 * the needle adds a soft second note so it can be told apart from the other items.
 */
export function detect(pan: number, close: number, needle: boolean) {
  const c = live();
  if (!c) return;
  const t = c.currentTime;
  const f = 480 + clamp(close, 0, 1) * 520;
  tone(c, t, f, { peak: 0.07, decay: 0.12, pan, reverb: 0.1, attack: 0.004 });
  tone(c, t, f * 2, { peak: 0.012, decay: 0.06, pan });
  if (needle) tone(c, t + 0.07, f * 1.5, { peak: 0.055, decay: 0.14, pan, reverb: 0.15, attack: 0.004 });
}
/** Wind: a gust that swells and sweeps left to right, with a faint whistle. */
export function wind(pan: number) {
  const c = live();
  if (!c) return;
  const t = c.currentTime;
  const layer = (q: number, freqs: [number, number, number], peak: number) => {
    const src = c.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = q;
    f.frequency.setValueAtTime(freqs[0], t);
    f.frequency.exponentialRampToValueAtTime(freqs[1], t + 0.35);
    f.frequency.exponentialRampToValueAtTime(freqs[2], t + 1.05);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    const p = c.createStereoPanner();
    p.pan.setValueAtTime(clamp(pan - 0.6, -1, 1), t);
    p.pan.linearRampToValueAtTime(clamp(pan + 0.6, -1, 1), t + 1.1);
    src.connect(f).connect(g).connect(p);
    p.connect(dry);
    const send = c.createGain();
    send.gain.value = 0.2;
    p.connect(send).connect(wet);
    src.start(t);
    src.stop(t + 1.2);
  };
  layer(0.7, [350, 1800, 520], 0.11);
  layer(9, [900, 1400, 1000], 0.012);
}

/** Magnifying lens: a glassy shimmer that rises into place. */
export function magnify() {
  const c = live();
  if (!c) return;
  const t = c.currentTime;
  bell(c, t, 2093, 0.045, 0, 0.6, 1);
  [0, 1, 2, 3].forEach((i) => {
    const f = penta(84, i * 2);
    tone(c, t + i * 0.06, f, { peak: 0.022, attack: 0.05, decay: 0.9, reverb: 0.6, glideTo: f * 1.03, glideTime: 0.5, pan: (i - 1.5) * 0.3 });
  });
}

/** The lens runs out: two soft falling notes. */
export function lensEnd() {
  const c = live();
  if (!c) return;
  const t = c.currentTime;
  marimba(c, t, midi(79), 0.04);
  marimba(c, t + 0.1, midi(74), 0.035);
}

/** A new tool unlocked: a bright little fanfare. */
export function unlockTool() {
  const c = live();
  if (!c) return;
  const t = c.currentTime;
  [79, 84, 88, 91].forEach((m, i) => bell(c, t + i * 0.08, midi(m), 0.07, 0, 0.5, 1.3));
  [60, 67].forEach((m) => tone(c, t, midi(m), { type: 'triangle', peak: 0.02, attack: 0.2, decay: 1.6, reverb: 0.4 }));
}

// ---------------------------------------------------------------- UI

export const select = () => { const c = live(); if (c) tock(c, 720); };
export const cancel = () => { const c = live(); if (c) tock(c, 430); };
/** Tool not available (locked or out of charges). */
export const denied = () => { const c = live(); if (c) tock(c, 300, 0.07); };

// ---------------------------------------------------------------- ambience

let ambience: { src: AudioBufferSourceNode; lfo: OscillatorNode; gain: GainNode } | null = null;
let birdTimer: number | undefined;

/** A quiet country breeze with the odd bird in the distance. */
function startAmbience() {
  const c = ctx;
  if (!c || ambience) return;
  const len = c.sampleRate * 6;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 420;
  f.Q.value = 0.4;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.06;
  const sway = c.createGain();
  sway.gain.value = 160;
  lfo.connect(sway).connect(f.frequency);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.018, c.currentTime + 2.5);
  src.connect(f).connect(gain).connect(master);
  src.start();
  lfo.start();
  ambience = { src, lfo, gain };
  scheduleBird();
}

function stopAmbience() {
  clearTimeout(birdTimer);
  birdTimer = undefined;
  const a = ambience;
  ambience = null;
  if (!a || !ctx) return;
  const t = ctx.currentTime;
  a.gain.gain.setTargetAtTime(0.0001, t, 0.2);
  a.src.stop(t + 1);
  a.lfo.stop(t + 1);
}

function scheduleBird() {
  clearTimeout(birdTimer);
  birdTimer = window.setTimeout(() => {
    bird();
    if (ambience) scheduleBird();
  }, rand(9000, 25000));
}

function bird() {
  const c = live();
  if (!c || document.hidden) return;
  const t = c.currentTime;
  const base = rand(2600, 3600);
  const pan = rand(-0.8, 0.8);
  const chirps = 2 + Math.floor(rand(0, 3));
  for (let i = 0; i < chirps; i++) {
    tone(c, t + i * rand(0.11, 0.16), base * rand(0.95, 1.05), {
      peak: 0.011,
      attack: 0.006,
      decay: 0.09,
      glideTo: base * rand(1.25, 1.45),
      glideTime: 0.06,
      pan,
      reverb: 0.55,
    });
  }
}
