// Gentle procedural WebAudio SFX — no audio files. Everything here is kept
// soft and short: this is a calm game, so sounds confirm actions rather than
// celebrate them loudly.

const PREFS_KEY = 'kittydoku-sound';

let enabled = load();

function load(): boolean {
  try {
    return localStorage.getItem(PREFS_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(PREFS_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

let ctx: AudioContext | null = null;

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface ToneOpts {
  freq: number;
  to?: number;
  start?: number;
  dur?: number;
  gain?: number;
  type?: OscillatorType;
}

function tone({ freq, to, start = 0, dur = 0.12, gain = 0.1, type = 'sine' }: ToneOpts) {
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

function guard(fn: () => void) {
  if (!enabled) return;
  try {
    fn();
  } catch {
    /* audio unavailable — silently continue */
  }
}

/** Soft blip for a paw mark. */
export function playPaw() {
  guard(() => tone({ freq: 420, dur: 0.07, gain: 0.05, type: 'triangle' }));
}

/** Placing a cat: a small rising two-note "mrp". */
export function playCat() {
  guard(() => {
    tone({ freq: 520, to: 700, dur: 0.11, gain: 0.075 });
    tone({ freq: 780, start: 0.05, dur: 0.12, gain: 0.045 });
  });
}

/** Lifting a cat or mark back off the board. */
export function playLift() {
  guard(() => tone({ freq: 380, to: 260, dur: 0.09, gain: 0.055, type: 'triangle' }));
}

/** A cat that can't sit there — a soft downward mew, never harsh. */
export function playUnhappy() {
  guard(() => {
    tone({ freq: 340, to: 240, dur: 0.2, gain: 0.07, type: 'sine' });
    tone({ freq: 226, start: 0.09, dur: 0.18, gain: 0.04, type: 'sine' });
  });
}

/** Level complete: a warm little arpeggio. */
export function playWin() {
  guard(() => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, start: i * 0.1, dur: 0.42, gain: 0.085 })
    );
  });
}

export function playTap() {
  guard(() => tone({ freq: 600, dur: 0.05, gain: 0.04, type: 'triangle' }));
}
