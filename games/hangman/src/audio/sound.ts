import { getItem, setItem } from '../platform/storage';

/**
 * Small synthesized sound set (no audio files): chalk taps, a soft bell for a
 * found letter, a dull knock for a miss, and short win / lose phrases.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

export function initSound() {
  enabled = getItem('hangman-sound') !== 'off';
}
export function soundOn(): boolean { return enabled; }
export function setSound(on: boolean) {
  enabled = on;
  setItem('hangman-sound', on ? 'on' : 'off');
  if (master) master.gain.value = on ? 0.6 : 0;
}

/** Created on the first tap (browsers block audio before a gesture). */
function audio(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Pause / resume from the host (Arena pause, tab hidden). */
export function suspendSound() { void ctx?.suspend(); }
export function resumeSound() { if (enabled) void ctx?.resume(); }

let noiseBuf: AudioBuffer | null = null;
function noise(a: AudioContext): AudioBuffer {
  if (noiseBuf) return noiseBuf;
  noiseBuf = a.createBuffer(1, a.sampleRate * 0.4, a.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

/** A scratchy chalk stroke: filtered noise with a quick envelope. */
function chalk(dur = 0.07, freq = 2600, vol = 0.35, delay = 0) {
  const a = audio(); if (!a || !master) return;
  const t = a.currentTime + delay;
  const src = a.createBufferSource(); src.buffer = noise(a);
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.4;
  const g = a.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t, Math.random() * 0.2, dur + 0.02);
}

function tone(freq: number, dur: number, vol = 0.2, delay = 0, type: OscillatorType = 'sine') {
  const a = audio(); if (!a || !master) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

export const playTap = () => chalk(0.05, 3200, 0.22);

/** Found letters: one bell per copy revealed, climbing a little. */
export function playHit(count: number) {
  chalk(0.06, 2800, 0.25);
  const notes = [659.3, 784, 880, 1046.5];
  for (let i = 0; i < Math.min(count, 4); i++) tone(notes[i], 0.5, 0.14, 0.04 + i * 0.07);
}

/** A miss: a dull knock and a longer chalk stroke (the drawing grows). */
export function playMiss() {
  tone(130, 0.22, 0.25, 0, 'triangle');
  chalk(0.22, 1800, 0.3, 0.05);
}

/** A word solved: a bright little two-step and a sparkle on top. */
export function playWordDone() {
  tone(784, 0.4, 0.16, 0);
  tone(1046.5, 0.55, 0.16, 0.1);
  tone(1568, 0.35, 0.07, 0.22);
  chalk(0.05, 4200, 0.12, 0.2);
  chalk(0.05, 4600, 0.1, 0.3);
}

/** A level solved: a rising run that lands on a held chord. */
export function playWin() {
  [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => tone(f, 0.55, 0.15, i * 0.09));
  [1046.5, 1318.5, 1568].forEach((f) => tone(f, 1.4, 0.07, 0.5));
  for (let i = 0; i < 5; i++) chalk(0.04, 4000 + i * 300, 0.08, 0.55 + i * 0.12);
}

/** One star stamping onto the result card; climbs with each star. */
export function playStar(i: number) {
  chalk(0.08, 2200, 0.3);
  tone([880, 1108.7, 1318.5][i] ?? 1318.5, 0.5, 0.15, 0.02);
}

export function playLose() {
  [392, 349.2, 311.1].forEach((f, i) => tone(f, 0.45, 0.16, i * 0.16, 'triangle'));
}

/** Eraser swipe between words. */
export function playErase() {
  for (let i = 0; i < 3; i++) chalk(0.16, 900 + i * 300, 0.18, i * 0.09);
}
