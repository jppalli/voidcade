// Procedural WebAudio sound for KittyDoku: no audio files.
//
// Signal chain:  voices ─┬─> dry ──────────────┐
//                        └─> reverb send ─> room ┴─> warmth EQ ─> glue compressor ─> out
//
// Every sound is built from a few soft "instruments" (a music-box pluck, a
// glassy FM bell, a felt-tip tap, a warm pad) that share one small room
// reverb, so effects and music sit in the same space and sound like one
// piece. Everything stays in C major pentatonic to keep it gentle.

import { getItem, setItem } from '../platform/storage';

const PREFS_KEY = 'kittydoku-sound';

/** Effects (taps, cats, jingles) and music switch on and off separately. */
let sfxOn = true;
let musicOn = true;

/** Read the saved settings. Call once storage has loaded. Older saves stored
 *  a single 'on'/'off' for everything. */
export function loadSoundPref() {
  const raw = getItem(PREFS_KEY);
  if (raw === 'off') { sfxOn = false; musicOn = false; return; }
  try {
    const p = JSON.parse(raw ?? '') as { sfx?: boolean; music?: boolean };
    sfxOn = p.sfx !== false;
    musicOn = p.music !== false;
  } catch {
    sfxOn = true;
    musicOn = true;
  }
}

function savePrefs() {
  setItem(PREFS_KEY, JSON.stringify({ sfx: sfxOn, music: musicOn }));
}

export const sfxEnabled = () => sfxOn;
export const musicEnabled = () => musicOn;

export function setSfxEnabled(on: boolean) {
  sfxOn = on;
  savePrefs();
}

/** Fades the music in or out. Switching it on counts as a user gesture, so
 *  audio can start right away. */
export function setMusicEnabled(on: boolean) {
  musicOn = on;
  savePrefs();
  if (on) {
    try { audio(); } catch { /* audio unavailable */ }
    startMusic();
  } else {
    stopMusic();
  }
}

/** Call on the player's first tap or key press: starts audio (and the music,
 *  if it's on) even when effects are muted. Never before an interaction. */
export function unlockAudio() {
  if (!sfxOn && !musicOn) return;
  try { audio(); } catch { /* audio unavailable */ }
}

// ---------------------------------------------------------------- engine

let ctx: AudioContext | null = null;
/** Dry input for effects. */
let sfx: GainNode | null = null;
/** Input of the shared room reverb. */
let send: GainNode | null = null;
let musicGain: GainNode | null = null;
let noise: AudioBuffer | null = null;
/** True while we suspended the context because of a hold (see below). */
let suspendedByHide = false;

/** A small, warm room: decaying stereo noise that darkens as it fades. */
function makeRoom(c: AudioContext): AudioBuffer {
  const seconds = 2.2;
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // One-pole lowpass whose cutoff falls over time: bright start, soft tail.
      const k = 0.55 - t * 0.45;
      lp += k * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.pow(1 - t, 2.4) * (i < c.sampleRate * 0.012 ? i / (c.sampleRate * 0.012) : 1);
    }
  }
  return buf;
}

function makeNoise(c: AudioContext): AudioBuffer {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function audio(): AudioContext {
  if (!ctx) {
    // Created lazily from the first sound, which always follows a user
    // gesture, so nothing plays before the first interaction.
    ctx = new AudioContext();
    const c = ctx;

    const master = c.createGain();
    master.gain.value = 0.85;
    // Warmth: roll off harsh top end, a touch of low-mid body.
    const shelf = c.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = 5200;
    shelf.gain.value = -6;
    const body = c.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 320;
    body.Q.value = 0.8;
    body.gain.value = 1.5;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 14;
    comp.ratio.value = 3;
    comp.attack.value = 0.006;
    comp.release.value = 0.25;
    master.connect(shelf).connect(body).connect(comp).connect(c.destination);

    const room = c.createConvolver();
    room.buffer = makeRoom(c);
    const roomOut = c.createGain();
    roomOut.gain.value = 0.55;
    send = c.createGain();
    send.connect(room).connect(roomOut).connect(master);

    sfx = c.createGain();
    sfx.gain.value = 0.9;
    sfx.connect(master);

    // Music has its own fader (for ducking and the on/off toggle) and sends
    // a little more to the room than the effects do.
    musicGain = c.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(master);
    const musicSend = c.createGain();
    musicSend.gain.value = 0.6;
    musicGain.connect(musicSend).connect(send);

    noise = makeNoise(c);
    startMusic();
  }
  if (ctx.state === 'suspended' && holds.size === 0) {
    suspendedByHide = false;
    void ctx.resume();
  }
  return ctx;
}

// Audio goes quiet while anything "holds" it: the tab is hidden, the window
// lost focus (Arkadium requires muting then), the Arena paused the game, or
// a video ad is playing. It comes back only when every hold is released, and
// only if it was running when we suspended it. The music scheduler pauses
// too, so it never has to catch up on missed notes.
type Hold = 'hidden' | 'blur' | 'paused' | 'ad';
const holds = new Set<Hold>();

function applyHolds() {
  if (!ctx) return;
  if (holds.size > 0) {
    if (ctx.state === 'running') {
      suspendedByHide = true;
      void ctx.suspend();
    }
    pauseMusicScheduler();
  } else {
    if (suspendedByHide) {
      suspendedByHide = false;
      void ctx.resume();
    }
    resumeMusicScheduler();
  }
}

export function setAudioHold(hold: Hold, on: boolean) {
  if (on) holds.add(hold);
  else holds.delete(hold);
  applyHolds();
}

document.addEventListener('visibilitychange', () => setAudioHold('hidden', document.hidden));
window.addEventListener('blur', () => setAudioHold('blur', true));
window.addEventListener('focus', () => setAudioHold('blur', false));

// ---------------------------------------------------------------- instruments

/** C major pentatonic, C5 up to G6: the tune the cats play. */
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];

/** Where a voice goes: effects bus or music bus, plus how much room. */
interface Out { dest: AudioNode; room: number }
const fx = (room = 0.25): Out => ({ dest: sfx!, room });

function connectOut(c: AudioContext, node: AudioNode, out: Out) {
  node.connect(out.dest);
  if (out.room > 0 && out.dest === sfx) {
    const s = c.createGain();
    s.gain.value = out.room;
    node.connect(s).connect(send!);
  }
}

/** Gain envelope: quick attack, exponential fall to silence. */
function env(g: GainNode, t0: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

/**
 * Music-box / kalimba pluck: triangle body plus a quiet sine an octave up,
 * through a lowpass that closes as the note fades. Soft and wooden.
 */
function pluck(freq: number, t0: number, gain: number, decay = 0.9, out: Out = fx(0.3)) {
  const c = ctx!;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.7;
  lp.frequency.setValueAtTime(Math.min(9000, freq * 7), t0);
  lp.frequency.exponentialRampToValueAtTime(Math.max(500, freq * 1.4), t0 + decay * 0.8);
  const g = c.createGain();
  env(g, t0, gain, 0.004, decay);
  lp.connect(g);
  connectOut(c, g, out);

  const a = c.createOscillator();
  a.type = 'triangle';
  a.frequency.value = freq;
  const b = c.createOscillator();
  b.type = 'sine';
  b.frequency.value = freq * 2.005;
  const bg = c.createGain();
  bg.gain.value = 0.22;
  a.connect(lp);
  b.connect(bg).connect(lp);
  [a, b].forEach((o) => { o.start(t0); o.stop(t0 + decay + 0.1); });
}

/** Glassy FM bell: a sine whose brightness (mod index) fades with the note. */
function bell(freq: number, t0: number, gain: number, decay = 1.4, out: Out = fx(0.45)) {
  const c = ctx!;
  const car = c.createOscillator();
  car.frequency.value = freq;
  const mod = c.createOscillator();
  mod.frequency.value = freq * 3.5;
  const idx = c.createGain();
  idx.gain.setValueAtTime(freq * 1.6, t0);
  idx.gain.exponentialRampToValueAtTime(freq * 0.05, t0 + decay * 0.6);
  mod.connect(idx).connect(car.frequency);
  const g = c.createGain();
  env(g, t0, gain, 0.003, decay);
  car.connect(g);
  connectOut(c, g, out);
  [car, mod].forEach((o) => { o.start(t0); o.stop(t0 + decay + 0.1); });
}

/** Felt tap: a breath of filtered noise with a tiny pitched thump under it. */
function felt(t0: number, centre: number, gain: number, thumpHz: number) {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noise;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = centre;
  bp.Q.value = 1.2;
  const g = c.createGain();
  env(g, t0, gain, 0.002, 0.05);
  src.connect(bp).connect(g);
  connectOut(c, g, fx(0.08));
  src.start(t0, Math.random() * 0.4);
  src.stop(t0 + 0.08);

  const o = c.createOscillator();
  o.frequency.setValueAtTime(thumpHz, t0);
  o.frequency.exponentialRampToValueAtTime(thumpHz * 0.7, t0 + 0.07);
  const og = c.createGain();
  env(og, t0, gain * 0.9, 0.003, 0.07);
  o.connect(og);
  connectOut(c, og, fx(0.06));
  o.start(t0);
  o.stop(t0 + 0.1);
}

/** Simple sine/triangle glide, for mews and sighs. */
function glide(f0: number, f1: number, t0: number, dur: number, gain: number, type: OscillatorType = 'triangle', room = 0.2) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + Math.min(0.04, dur * 0.25));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(lp).connect(g);
  connectOut(c, g, fx(room));
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

/** ±3% random detune so repeated sounds don't feel mechanical. */
const humanize = () => 1 + (Math.random() * 2 - 1) * 0.03;

function guard(fn: (c: AudioContext, now: number) => void) {
  if (!sfxOn) return;
  try {
    const c = audio();
    fn(c, c.currentTime + 0.005);
  } catch {
    /* audio unavailable: silently continue */
  }
}

// ---------------------------------------------------------------- music
//
// A slow generative lullaby at ~66 BPM: a warm filtered pad walking through
// a four-chord progression, a soft bass note, and a music box that picks a
// few chord tones each bar. A lookahead scheduler queues notes in
// AudioContext time, so timing never drifts.

const BEAT = 60 / 66;
const BAR = BEAT * 4;
/** Chords as semitones above C3 (130.81 Hz); each lasts two bars. */
const PROGRESSION: { bass: number; pad: number[]; melody: number[] }[] = [
  { bass: 0, pad: [12, 16, 19, 26], melody: [24, 26, 28, 31, 33] }, // Cadd9
  { bass: 9, pad: [12, 16, 21, 24], melody: [24, 28, 31, 33, 36] }, // Am7
  { bass: 5, pad: [9, 12, 16, 21], melody: [21, 24, 28, 31, 33] },  // Fmaj7
  { bass: 7, pad: [11, 14, 19, 24], melody: [26, 28, 31, 33, 35] }, // G6/9
];
const C3 = 130.81;
const hz = (semi: number) => C3 * Math.pow(2, semi / 12);

const MUSIC_BASE_GAIN = 0.8;
const SCHEDULE_AHEAD_S = 1.5;
const SCHEDULER_TICK_MS = 400;

let musicRunning = false;
let musicSchedulerTimer: number | null = null;
let nextBarTime = 0;
let barIndex = 0;

function padChord(t0: number, dur: number, semis: number[]) {
  const c = ctx!;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.5;
  // Filter breathes open and closed across the chord.
  lp.frequency.setValueAtTime(520, t0);
  lp.frequency.linearRampToValueAtTime(1100, t0 + dur * 0.5);
  lp.frequency.linearRampToValueAtTime(600, t0 + dur);
  const g = c.createGain();
  const att = 1.6;
  const rel = 2.0;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.028, t0 + att);
  g.gain.setValueAtTime(0.028, t0 + dur - 0.2);
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur + rel);
  lp.connect(g).connect(musicGain!);
  semis.forEach((s, i) => {
    [-6, 6].forEach((cents) => {
      const o = c.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = hz(s);
      o.detune.value = cents + (Math.random() * 4 - 2);
      const og = c.createGain();
      og.gain.value = o.type === 'sawtooth' ? 0.35 : 0.6;
      o.connect(og).connect(lp);
      o.start(t0);
      o.stop(t0 + dur + rel + 0.1);
    });
  });
}

function bassNote(t0: number, dur: number, semi: number) {
  const c = ctx!;
  const o = c.createOscillator();
  o.frequency.value = hz(semi) / 2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.05, t0 + 0.3);
  g.gain.exponentialRampToValueAtTime(0.012, t0 + dur * 0.8);
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.6);
  o.connect(g).connect(musicGain!);
  o.start(t0);
  o.stop(t0 + dur + 0.7);
}

/** A few music-box notes per bar, on the beat or the off-beat, sometimes none. */
function musicBoxBar(t0: number, notes: number[]) {
  const out: Out = { dest: musicGain!, room: 0 };
  const count = Math.random() < 0.25 ? 0 : 2 + Math.floor(Math.random() * 3);
  const slots = [0, 1, 1.5, 2, 2.5, 3, 3.5].sort(() => Math.random() - 0.5).slice(0, count).sort((a, b) => a - b);
  slots.forEach((beat, i) => {
    const note = notes[Math.floor(Math.random() * notes.length)];
    const vel = 0.022 + Math.random() * 0.012 - (i % 2) * 0.006;
    pluck(hz(note + 12), t0 + beat * BEAT + Math.random() * 0.015, vel, 1.6, out);
  });
}

function musicTick() {
  musicSchedulerTimer = null;
  if (!musicRunning || !ctx || !musicGain) return;
  if (ctx.state === 'running' && !document.hidden) {
    while (nextBarTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const chord = PROGRESSION[Math.floor(barIndex / 2) % PROGRESSION.length];
      if (barIndex % 2 === 0) {
        padChord(nextBarTime, BAR * 2, chord.pad);
        bassNote(nextBarTime, BAR * 2, chord.bass);
      }
      musicBoxBar(nextBarTime, chord.melody);
      nextBarTime += BAR;
      barIndex++;
    }
  }
  musicSchedulerTimer = window.setTimeout(musicTick, SCHEDULER_TICK_MS);
}

function pauseMusicScheduler() {
  if (musicSchedulerTimer !== null) {
    clearTimeout(musicSchedulerTimer);
    musicSchedulerTimer = null;
  }
}

function resumeMusicScheduler() {
  if (!musicRunning || musicSchedulerTimer !== null || !ctx) return;
  // Don't try to replay bars that were missed while paused.
  if (nextBarTime < ctx.currentTime) nextBarTime = ctx.currentTime + 0.2;
  musicTick();
}

function startMusic() {
  if (!ctx || !musicGain || musicRunning || !musicOn) return;
  musicRunning = true;
  const t = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setValueAtTime(musicGain.gain.value, t);
  musicGain.gain.linearRampToValueAtTime(MUSIC_BASE_GAIN, t + 3);
  nextBarTime = t + 0.3;
  barIndex = 0;
  pauseMusicScheduler();
  musicTick();
}

function stopMusic(fadeOutS = 0.5) {
  musicRunning = false;
  pauseMusicScheduler();
  if (ctx && musicGain) {
    const t = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(musicGain.gain.value, t);
    musicGain.gain.linearRampToValueAtTime(0, t + fadeOutS);
  }
}

/** Lower the music under a jingle, then bring it back after `ms`. */
function duckMusicFor(ms: number, factor = 0.35) {
  if (!ctx || !musicGain || !musicRunning) return;
  const t = ctx.currentTime;
  const to = MUSIC_BASE_GAIN * factor;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setValueAtTime(musicGain.gain.value, t);
  musicGain.gain.linearRampToValueAtTime(to, t + 0.15);
  musicGain.gain.setValueAtTime(to, t + 0.15 + ms / 1000);
  musicGain.gain.linearRampToValueAtTime(MUSIC_BASE_GAIN, t + 0.15 + ms / 1000 + 0.8);
}

// ---------------------------------------------------------------- effects

/** Pentatonic ratios a drag stroke climbs through, one per painted cell. */
const PAW_STEPS = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2];
const PAW_THROTTLE_MS = 35;
let lastPawAt = -Infinity;

/** Soft felt "pat" for a paw mark; a drag stroke climbs gently in pitch. */
export function playPaw(step = 0) {
  const now = performance.now();
  if (now - lastPawAt < PAW_THROTTLE_MS) return;
  lastPawAt = now;
  guard((_, t) => {
    const r = PAW_STEPS[Math.min(step, PAW_STEPS.length - 1)] * humanize();
    felt(t, 1500 * r, 0.06, 240 * r);
  });
}

/** Correct cat: the next note of the board's tune on the music box, with a
 *  faint bell an octave up for sparkle. `placed` = cats placed so far. */
export function playCat(placed: number) {
  guard((_, t) => {
    const f = PENTA[Math.max(0, Math.min(placed, PENTA.length) - 1)];
    pluck(f, t, 0.085, 1.1);
    bell(f * 2, t + 0.01, 0.014, 0.9);
  });
}

/** Hint: four quick ascending glass bells, high and airy. */
export function playHint() {
  guard((_, t) => {
    [1046.5, 1318.51, 1567.98, 2093].forEach((f, i) => bell(f, t + i * 0.06, 0.022, 0.9, fx(0.6)));
  });
}

/** A heart slipping away: a soft falling third on the music box. */
export function playHeartLost() {
  guard((_, t) => {
    pluck(659.25, t + 0.16, 0.05, 0.6);
    pluck(523.25, t + 0.3, 0.045, 0.9);
  });
}

/** Out of hearts: a slow, gentle three-note sigh as the fail modal opens. */
export function playOutOfLives() {
  guard((_, t) => {
    duckMusicFor(1200);
    [783.99, 659.25, 523.25].forEach((f, i) => pluck(f, t + i * 0.26, 0.055, 1.3));
    bell(261.63, t + 0.78, 0.02, 1.8);
  });
}

/** Lifting a mark back off the board: a quiet airy tap, a little lower. */
export function playLift() {
  guard((_, t) => felt(t, 900, 0.045, 170));
}

/** A cat that can't sit there: a tiny, sleepy "mrrp" (up, then down). */
export function playUnhappy() {
  guard((c, t) => {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(380, t);
    o.frequency.linearRampToValueAtTime(470, t + 0.07);
    o.frequency.exponentialRampToValueAtTime(260, t + 0.26);
    const formant = c.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(1300, t);
    formant.frequency.linearRampToValueAtTime(800, t + 0.26);
    formant.Q.value = 1.4;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(formant).connect(g);
    connectOut(c, g, fx(0.2));
    o.start(t);
    o.stop(t + 0.35);
    glide(190, 150, t + 0.02, 0.22, 0.03, 'sine', 0.1);
  });
}

/** Level complete, timed to the board's cat-hop wave: one music-box note per
 *  hop rising up the scale, then a soft Cmaj9 bell chord with a shimmer. */
export function playWin(start = 0, step = 0.1, count = 4) {
  guard((_, t) => {
    const end = start + Math.max(0, count - 1) * step + 0.3;
    duckMusicFor((end + 1.6) * 1000);
    for (let i = 0; i < count; i++) pluck(PENTA[i % PENTA.length], t + start + i * step, 0.055, 0.9);
    [261.63, 329.63, 392, 493.88, 587.33].forEach((f, i) => bell(f * 2, t + end + i * 0.025, 0.02, 2.2));
    pluck(130.81, t + end, 0.05, 2.0);
    [2093, 2637, 3136].forEach((f, i) => bell(f, t + end + 0.15 + i * 0.07, 0.008, 1.2, fx(0.8)));
  });
}

const TYPE_THROTTLE_MS = 45;
let lastTypeAt = -Infinity;

/** Typewriter blip for tips: a tiny, muted music-box note from the scale,
 *  so a sentence "speaks" in the same key as the music. */
export function playTypeBlip() {
  const now = performance.now();
  if (now - lastTypeAt < TYPE_THROTTLE_MS) return;
  lastTypeAt = now;
  guard((_, t) => {
    const f = PENTA[Math.floor(Math.random() * 5)] * humanize();
    pluck(f, t, 0.02, 0.12, fx(0.1));
  });
}

/** UI button: a soft rounded tap. */
export function playTap() {
  guard((_, t) => felt(t, 2200, 0.035, 420));
}
