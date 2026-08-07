/**
 * Procedural WebAudio SFX — no audio files, same approach as every other
 * game in this arcade.
 */

const PREFS_KEY = 'wordbloom-sound';

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

/** A tile is added to the current trace — a soft, pitched-by-length tick. */
export function playPick(traceLength) {
  guard(() => tone({ freq: 480 + traceLength * 22, dur: 0.06, gain: 0.05, type: 'triangle' }));
}

/** Trace cleared / backed out. */
export function playRelease() {
  guard(() => tone({ freq: 340, to: 260, dur: 0.08, gain: 0.04, type: 'triangle' }));
}

/** A required word is found. */
export function playRequiredFound() {
  guard(() => {
    [523.25, 659.25, 783.99].forEach((f, i) => tone({ freq: f, start: i * 0.06, dur: 0.22, gain: 0.08 }));
  });
}

/** A bonus word is found — a lighter, single-note sparkle. */
export function playBonusFound() {
  guard(() => tone({ freq: 900, to: 1200, dur: 0.14, gain: 0.06 }));
}

/** Word already found, or not a real word. */
export function playInvalid() {
  guard(() => {
    const c = audio();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, c.currentTime + 0.16);
    g.gain.setValueAtTime(0.09, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.16);
    osc.connect(g);
    g.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.18);
  });
}

/** All required words found — level complete. */
export function playLevelComplete() {
  guard(() => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, start: i * 0.09, dur: 0.32, gain: 0.09 }));
  });
}

export function playTap() {
  guard(() => tone({ freq: 600, dur: 0.05, gain: 0.05, type: 'triangle' }));
}
