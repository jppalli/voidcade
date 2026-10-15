import { getItem, setItem } from '../platform/storage';

/**
 * Cosy synthesized audio (no files): soft chalk taps, warm bell notes, a
 * gentle wooden "bonk" for a miss, a felt-eraser swish, and a slow lo-fi
 * music loop generated on the fly. Everything runs through a warm low-pass
 * and a small room reverb so nothing sounds sharp.
 *
 * Music and sound effects have separate toggles (saved together).
 */

let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfx = true;
let music = true;

const SFX_VOL = 0.55;
const MUSIC_VOL = 0.16;

export function initSound() {
  const raw = getItem('hangman-sound');
  if (raw === 'off') { sfx = false; music = false; return; }
  try {
    const s = JSON.parse(raw ?? '') as { sfx?: boolean; music?: boolean };
    sfx = s.sfx !== false;
    music = s.music !== false;
  } catch { /* defaults: both on */ }
}

function save() { setItem('hangman-sound', JSON.stringify({ sfx, music })); }

export function soundOn(): boolean { return sfx; }
export function musicOn(): boolean { return music; }
export function setSound(on: boolean) {
  sfx = on; save();
  if (sfxBus && ctx) sfxBus.gain.setTargetAtTime(on ? SFX_VOL : 0, ctx.currentTime, 0.05);
}
export function setMusic(on: boolean) {
  music = on; save();
  if (on) startMusic(); else stopMusic();
}

/** Created on the first tap (browsers block audio before a gesture). */
function audio(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // Warm master: soft low-pass, then a gentle compressor.
    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass'; warm.frequency.value = 5200; warm.Q.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    warm.connect(comp).connect(ctx.destination);
    // Small room: a short, dark, decaying-noise impulse.
    const reverb = ctx.createConvolver();
    reverb.buffer = roomImpulse(ctx, 1.8);
    const wet = ctx.createGain(); wet.gain.value = 0.28;
    reverb.connect(wet).connect(warm);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfx ? SFX_VOL : 0;
    sfxBus.connect(warm); sfxBus.connect(reverb);
    musicBus = ctx.createGain(); musicBus.gain.value = 0;
    musicBus.connect(warm); musicBus.connect(reverb);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function roomImpulse(a: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(a.sampleRate * seconds);
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      lp += ((Math.random() * 2 - 1) - lp) * 0.35; // darken the noise
      d[i] = lp * Math.pow(1 - i / len, 2.6);
    }
  }
  return buf;
}

/** Pause / resume from the host (Arena pause, ads, tab hidden). */
export function suspendSound() { void ctx?.suspend(); }
export function resumeSound() { if (sfx || music) void ctx?.resume(); }

let noiseBuf: AudioBuffer | null = null;
function noise(a: AudioContext): AudioBuffer {
  if (noiseBuf) return noiseBuf;
  noiseBuf = a.createBuffer(1, a.sampleRate * 1.2, a.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

const sfxCtx = () => (sfx ? audio() : null);

interface HushOpts { at?: number; dur: number; freq: number; q?: number; vol: number; attack?: number; type?: BiquadFilterType }

/** Filtered noise with an envelope: chalk strokes, swishes, brushes.
 *  `at` is seconds from now. */
function hush(a: AudioContext, out: AudioNode, o: HushOpts) {
  const t = a.currentTime + Math.max(0, o.at ?? 0);
  const src = a.createBufferSource(); src.buffer = noise(a);
  const f = a.createBiquadFilter(); f.type = o.type ?? 'bandpass'; f.frequency.value = o.freq; f.Q.value = o.q ?? 1;
  const g = a.createGain();
  const atk = o.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.vol, t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.4, o.dur + 0.05);
  return { f, t };
}

/** A soft bell-ish note: sine body plus quiet overtones. `at` is seconds from now. */
function bell(a: AudioContext, out: AudioNode, freq: number, o: { at?: number; dur?: number; vol?: number } = {}) {
  const t = a.currentTime + Math.max(0, o.at ?? 0);
  const dur = o.dur ?? 1.1, vol = o.vol ?? 0.12;
  for (const [mult, amp] of [[1, 1], [2, 0.18], [3, 0.05]] as const) {
    const osc = a.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq * mult;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol * amp, t + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur / mult);
    osc.connect(g).connect(out);
    osc.start(t); osc.stop(t + dur + 0.1);
  }
}

// C major pentatonic, warm middle register.
const NOTE = { C4: 261.6, D4: 293.7, E4: 329.6, G4: 392, A4: 440, C5: 523.3, D5: 587.3, E5: 659.3, G5: 784, A5: 880, C6: 1046.5 };

export function playTap() {
  const a = sfxCtx(); if (!a || !sfxBus) return;
  hush(a, sfxBus, { dur: 0.05, freq: 2200, q: 1.2, vol: 0.12 });
}

/** Found letters: soft bells climbing the pentatonic, one per copy. */
export function playHit(count: number) {
  const a = sfxCtx(); if (!a || !sfxBus) return;
  hush(a, sfxBus, { dur: 0.06, freq: 2400, q: 1.2, vol: 0.1 });
  const notes = [NOTE.E5, NOTE.G5, NOTE.A5, NOTE.C6];
  for (let i = 0; i < Math.min(count, 4); i++) bell(a, sfxBus, notes[i], { at: 0.03 + i * 0.08, dur: 1.0, vol: 0.11 });
}

/** A miss: a gentle wooden bonk that sags a little, and a soft chalk line. */
export function playMiss() {
  const a = sfxCtx(); if (!a || !sfxBus) return;
  const t = a.currentTime;
  const osc = a.createOscillator(); osc.type = 'sine';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(165, t + 0.25);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  osc.connect(g).connect(sfxBus);
  osc.start(t); osc.stop(t + 0.45);
  hush(a, sfxBus, { at: 0.06, dur: 0.28, freq: 1500, q: 0.8, vol: 0.07, attack: 0.05 });
}

/** A word solved: a warm little rising pair with a sparkle on top. */
export function playWordDone() {
  const a = sfxCtx(); if (!a || !sfxBus) return;
  bell(a, sfxBus, NOTE.G4, { dur: 1.2, vol: 0.12 });
  bell(a, sfxBus, NOTE.C5, { at: 0.12, dur: 1.3, vol: 0.13 });
  bell(a, sfxBus, NOTE.E5, { at: 0.24, dur: 1.4, vol: 0.1 });
  bell(a, sfxBus, NOTE.C6, { at: 0.38, dur: 0.9, vol: 0.04 });
}

/** A level solved: an unhurried run that settles on a soft chord. */
export function playWin() {
  const a = sfxCtx(); if (!a || !sfxBus) return;
  const bus = sfxBus;
  [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5].forEach((f, i) => bell(a, bus, f, { at: i * 0.11, dur: 1.2, vol: 0.11 }));
  [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f) => bell(a, bus, f, { at: 0.6, dur: 2.4, vol: 0.06 }));
}

/** One star stamping onto the result card; climbs with each star. */
export function playStar(i: number) {
  const a = sfxCtx(); if (!a || !sfxBus) return;
  hush(a, sfxBus, { dur: 0.09, freq: 1600, q: 0.9, vol: 0.12 });
  bell(a, sfxBus, [NOTE.E5, NOTE.G5, NOTE.C6][i] ?? NOTE.C6, { at: 0.02, dur: 1.1, vol: 0.12 });
}

/** Lost: a soft falling sigh, not a buzzer. */
export function playLose() {
  const a = sfxCtx(); if (!a || !sfxBus) return;
  const bus = sfxBus;
  [NOTE.E4, NOTE.D4, NOTE.C4].forEach((f, i) => bell(a, bus, f, { at: i * 0.2, dur: 1.2, vol: 0.12 }));
}

/** The eraser: one slow, soft felt swish that rises and falls. */
export function playErase() {
  const a = sfxCtx(); if (!a || !sfxBus) return;
  const { f, t } = hush(a, sfxBus, { dur: 1.1, freq: 500, q: 0.6, vol: 0.08, attack: 0.35, type: 'lowpass' });
  f.frequency.setValueAtTime(400, t);
  f.frequency.linearRampToValueAtTime(1000, t + 0.5);
  f.frequency.linearRampToValueAtTime(450, t + 1.1);
}

// ---------------------------------------------------------------- music

/**
 * Lo-fi loop at ~70 BPM: Fmaj7 - Em7 - Dm7 - Cmaj7 on a soft electric
 * piano, a round sine bass, a few music-box notes and a whisper of brushes.
 * Each bar is scheduled a little ahead of time so it never stutters.
 */
const BPM = 70;
const BEAT = 60 / BPM;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const CHORDS = [
  { root: 41, notes: [53, 57, 60, 64] }, // Fmaj7
  { root: 40, notes: [52, 55, 59, 62] }, // Em7
  { root: 38, notes: [50, 53, 57, 60] }, // Dm7
  { root: 36, notes: [48, 52, 55, 59] }, // Cmaj7
];
const MELODY = [72, 74, 76, 79, 81, 84]; // C major pentatonic, high and sparse

let timer: number | null = null;
let nextBar = 0;
let bar = 0;
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** Soft electric piano: sine body, faint triangle octave, mellow filter. */
function ep(a: AudioContext, out: AudioNode, freq: number, t: number, dur: number, vol: number) {
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.03);
  g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.9);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1700;
  for (const [type, mult, amp] of [['sine', 1, 1], ['triangle', 2, 0.12]] as const) {
    const o = a.createOscillator(); o.type = type; o.frequency.value = freq * mult;
    o.detune.value = (rnd() - 0.5) * 8; // a touch of tape wobble
    const og = a.createGain(); og.gain.value = amp;
    o.connect(og).connect(f);
    o.start(t); o.stop(t + dur + 0.1);
  }
  f.connect(g).connect(out);
}

function scheduleBar(a: AudioContext, out: AudioNode, t: number) {
  const c = CHORDS[bar % CHORDS.length];
  const rel = (abs: number) => abs - a.currentTime;
  // Chord: gently rolled on beat 1, a softer touch on the "and" of 3.
  c.notes.forEach((n, i) => ep(a, out, midi(n), t + i * 0.025, BEAT * 4, 0.07));
  c.notes.slice(1).forEach((n, i) => ep(a, out, midi(n), t + BEAT * 2.5 + i * 0.02, BEAT * 1.6, 0.035));
  // Bass on 1 and 3 (root, then fifth).
  for (const beat of [0, 2]) {
    const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = midi(c.root + (beat ? 7 : 0));
    const g = a.createGain(); const s = t + beat * BEAT;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.linearRampToValueAtTime(0.16, s + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, s + BEAT * 1.8);
    o.connect(g).connect(out); o.start(s); o.stop(s + BEAT * 2);
  }
  // Music box: zero to two notes a bar, on off-beats.
  const count = rnd() < 0.35 ? 0 : rnd() < 0.7 ? 1 : 2;
  for (let i = 0; i < count; i++) {
    const at = t + BEAT * (0.5 + Math.floor(rnd() * 7) * 0.5);
    bell(a, out, midi(MELODY[Math.floor(rnd() * MELODY.length)]), { at: rel(at), dur: 1.6, vol: 0.05 });
  }
  // Brushes: a whisper on every off-beat.
  for (let i = 0; i < 4; i++) {
    hush(a, out, { at: rel(t + BEAT * (i + 0.5)), dur: 0.12, freq: 6000, q: 0.7, vol: i % 2 ? 0.025 : 0.016 });
  }
  bar++;
}

/** Starts the loop if music is on (call after any user tap). */
export function startMusic() {
  if (!music || timer !== null) return;
  const a = audio(); if (!a || !musicBus) return;
  musicBus.gain.cancelScheduledValues(a.currentTime);
  musicBus.gain.setTargetAtTime(MUSIC_VOL, a.currentTime, 1.2); // slow fade in
  nextBar = Math.max(nextBar, a.currentTime + 0.1);
  timer = window.setInterval(() => {
    if (!ctx || !musicBus || ctx.state !== 'running') return;
    // After a pause the clock has moved on: don't try to catch up old bars.
    if (nextBar < ctx.currentTime) nextBar = ctx.currentTime + 0.05;
    while (nextBar < ctx.currentTime + 0.6) { scheduleBar(ctx, musicBus, nextBar); nextBar += BEAT * 4; }
  }, 120);
}

function stopMusic() {
  if (timer !== null) clearInterval(timer);
  timer = null;
  if (ctx && musicBus) musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
}
