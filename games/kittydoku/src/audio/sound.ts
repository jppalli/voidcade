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
/** Input of the master bus: gain -> gentle lowpass -> compressor -> out. */
let bus: GainNode | null = null;
/** True while we suspended the context because the tab was hidden. */
let suspendedByHide = false;

function audio(): AudioContext {
  if (!ctx) {
    // Created lazily from the first sound, which always follows a user
    // gesture, so nothing plays before the first interaction.
    ctx = new AudioContext();
    bus = ctx.createGain();
    bus.gain.value = 0.8;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3200;
    lowpass.Q.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    bus.connect(lowpass);
    lowpass.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended' && !document.hidden) {
    suspendedByHide = false;
    void ctx.resume();
  }
  return ctx;
}

// Pause audio with the tab: suspend when hidden, and resume on return only
// if it was running when we suspended it.
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) {
    if (ctx.state === 'running') {
      suspendedByHide = true;
      void ctx.suspend();
    }
  } else if (suspendedByHide) {
    suspendedByHide = false;
    void ctx.resume();
  }
});

interface ToneOpts {
  freq: number;
  to?: number;
  start?: number;
  dur?: number;
  gain?: number;
  type?: OscillatorType;
  attack?: number;
}

function tone({ freq, to, start = 0, dur = 0.12, gain = 0.1, type = 'sine', attack = 0.012 }: ToneOpts) {
  const c = audio();
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  osc.connect(g);
  g.connect(bus!);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Soft bell: a sine plus a quiet inharmonic partial that dies faster. */
function bell(freq: number, start = 0, gain = 0.07, dur = 0.45) {
  tone({ freq, start, dur, gain, attack: 0.006 });
  tone({ freq: freq * 2.76, start, dur: dur * 0.5, gain: gain * 0.16, attack: 0.004 });
}

/** C major pentatonic, C5 up to G6: the tune the cats play. */
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];

/** ±4% random detune so repeated sounds don't feel mechanical. */
const detune = () => 1 + (Math.random() * 2 - 1) * 0.04;

function guard(fn: () => void) {
  if (!enabled) return;
  try {
    fn();
  } catch {
    /* audio unavailable — silently continue */
  }
}

/** Pentatonic ratios a drag stroke climbs through, one per painted cell. */
const PAW_STEPS = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2];
const PAW_THROTTLE_MS = 35;
let lastPawAt = -Infinity;

/** Soft "pat" for a paw mark. `step` is the cell's index within a drag
 *  stroke (0 for a tap); it steps the pitch up, capped at the top note.
 *  Throttled so fast swipes don't machine-gun. */
export function playPaw(step = 0) {
  const now = performance.now();
  if (now - lastPawAt < PAW_THROTTLE_MS) return;
  lastPawAt = now;
  guard(() => {
    const f = 330 * PAW_STEPS[Math.min(step, PAW_STEPS.length - 1)] * detune();
    tone({ freq: f, to: f * 0.92, dur: 0.075, gain: 0.05, attack: 0.005 });
  });
}

/** Placing a correct cat: the next note of the board's tune. `placed` is
 *  how many cats are correctly placed now (1 = first note, C5). */
export function playCat(placed: number) {
  guard(() => bell(PENTA[Math.max(0, Math.min(placed, PENTA.length) - 1)], 0, 0.075));
}

/** Hint: a quiet high sparkle, so it's distinct from a cat you placed. */
export function playHint() {
  guard(() => {
    [1600, 2100, 2600].forEach((f, i) =>
      tone({ freq: f, start: i * 0.055, dur: 0.16, gain: 0.022, attack: 0.004 })
    );
  });
}

/** A heart slipping away: a soft falling minor third. Starts a beat after
 *  the unhappy mew so the two read as one gentle moment. */
export function playHeartLost() {
  guard(() => {
    tone({ freq: 659.25, start: 0.16, dur: 0.22, gain: 0.04 });
    tone({ freq: 554.37, start: 0.28, dur: 0.32, gain: 0.038 });
  });
}

/** Out of hearts: a soft three-note sigh as the fail modal opens. */
export function playOutOfLives() {
  guard(() => {
    [[523.25, 493.88], [440, 415.3], [349.23, 329.63]].forEach(([f, to], i) =>
      tone({ freq: f, to, start: i * 0.22, dur: 0.5, gain: 0.045, attack: 0.03 })
    );
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

/** Level complete, timed to the board's cat-hop wave: each hop replays a
 *  note of the tune (starting at `start` s, one every `step` s, `count`
 *  hops), then a soft C major chord settles it. */
export function playWin(start = 0, step = 0.1, count = 4) {
  guard(() => {
    for (let i = 0; i < count; i++) bell(PENTA[i % PENTA.length], start + i * step, 0.05, 0.4);
    const end = start + Math.max(0, count - 1) * step + 0.28;
    [523.25, 659.25, 783.99, 1046.5].forEach((f) => bell(f, end, 0.032, 1.1));
  });
}

export function playTap() {
  guard(() => tone({ freq: 600, dur: 0.05, gain: 0.04, type: 'triangle' }));
}
