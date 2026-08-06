/**
 * Procedural WebAudio SFX — no audio files, same approach as every other
 * game in this arcade.
 */

const PREFS_KEY = 'splitspell-sound';

let enabled = load();

function load() {
  try {
    return localStorage.getItem(PREFS_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function soundEnabled() {
  return enabled;
}

export function setSoundEnabled(on) {
  enabled = on;
  try {
    localStorage.setItem(PREFS_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

let ctx = null;

function audio() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq, to, start = 0, dur = 0.12, gain = 0.09, type = 'sine' }) {
  const c = audio();
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function guard(fn) {
  if (!enabled) return;
  try {
    fn();
  } catch {
    /* audio unavailable */
  }
}

/** Correct swipe: letter lands in the right slot. */
export function playCorrect() {
  guard(() => tone({ freq: 560, to: 760, dur: 0.09, gain: 0.08 }));
}

/** Wrong swipe: costs a life. */
export function playWrong() {
  guard(() => {
    const c = audio();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, c.currentTime + 0.22);
    g.gain.setValueAtTime(0.14, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
    osc.connect(g);
    g.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.24);
  });
}

/** A word completes — rising arpeggio, richer for longer words/bigger combos. */
export function playWordComplete(comboLevel = 0) {
  guard(() => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const n = Math.min(notes.length, 2 + comboLevel);
    for (let i = 0; i < n; i++) tone({ freq: notes[i], start: i * 0.07, dur: 0.3, gain: 0.08 });
  });
}

/** A letter falls unclaimed — soft, no penalty tone, just an ambient miss cue. */
export function playMiss() {
  guard(() => tone({ freq: 300, to: 220, dur: 0.14, gain: 0.045, type: 'triangle' }));
}

export function playGameOver() {
  guard(() => {
    [420, 340, 260].forEach((f, i) => tone({ freq: f, start: i * 0.14, dur: 0.32, gain: 0.09, type: 'triangle' }));
  });
}

export function playTap() {
  guard(() => tone({ freq: 600, dur: 0.05, gain: 0.05, type: 'triangle' }));
}
