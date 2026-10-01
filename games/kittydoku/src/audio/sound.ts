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
  // Music follows the same single on/off toggle as the SFX: stop it the
  // moment sound is switched off, and let it fade back in if switched on
  // again (only if the context already exists — otherwise it'll start
  // itself on the next sound-triggering gesture, same as SFX).
  if (on) {
    if (ctx) startMusic();
  } else {
    stopMusic();
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

    // The ambient pad has its own gain feeding into the shared bus, so it
    // gets the same lowpass/compressor glue but can be mixed and ducked
    // independently of the SFX. This is the one and only time it's built,
    // same as the bus above — one AudioContext, one music instance, ever.
    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(bus);
    startMusic();
  }
  if (ctx.state === 'suspended' && !document.hidden) {
    suspendedByHide = false;
    void ctx.resume();
  }
  return ctx;
}

// Pause audio with the tab: suspend when hidden, and resume on return only
// if it was running when we suspended it. The music scheduler's own lookahead
// timer is paused/resumed here too, so it never ticks while hidden and never
// has to catch up on missed chords when the tab comes back.
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) {
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
});

/** C major pentatonic, C5 up to G6: the tune the cats play. Declared up
 *  here (ahead of the other SFX) because the ambient pad below voices the
 *  same scale, just lower. */
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];

// ---------------------------------------------------------------- ambient pad
//
// A generative background loop: every few bars we fade in a soft chord built
// from the same pentatonic family as the cat tune, voiced two octaves lower
// so it sits under the SFX. A lookahead scheduler keeps queuing the next
// chord a little ahead of AudioContext time, so the tempo can't drift the
// way a plain setInterval loop would.

/** The cat tune's scale, voiced two octaves down for the pad. */
const MUSIC_PENTA = PENTA.map((f) => f / 4);
const MUSIC_BASE_GAIN = 0.16; // background, not foreground — well under the SFX
const CHORD_MIN_S = 7; // a couple of bars at ~65 BPM
const CHORD_MAX_S = 13;
const SCHEDULE_AHEAD_S = 2; // keep this much chord-time queued up
const SCHEDULER_TICK_MS = 1000; // how often we check whether to queue more

let musicGain: GainNode | null = null;
/** True once the loop has been started; stays true across duck/pause so a
 *  resume knows to pick back up without creating a second loop. */
let musicRunning = false;
let musicSchedulerTimer: number | null = null;
let nextChordTime = 0;

/** One pad tone: long fade in, hold, long fade out, then the oscillator
 *  stops itself — nothing is left dangling once `release` has elapsed. */
function padVoice(
  freq: number,
  start: number,
  dur: number,
  attack: number,
  release: number,
  gain: number,
  detuneCents = 0
) {
  const c = ctx!;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.detune.value = detuneCents;
  const g = c.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + attack);
  const releaseStart = Math.max(start + attack, start + dur - release);
  g.gain.setValueAtTime(gain, releaseStart);
  g.gain.linearRampToValueAtTime(0, releaseStart + release);
  osc.connect(g);
  g.connect(musicGain!);
  osc.start(start);
  osc.stop(releaseStart + release + 0.05);
}

/** A soft chord: a detuned pair voicing two scale tones, plus a sub an
 *  octave below the root — three oscillators, long attack and release. */
function scheduleChord(time: number, dur: number) {
  const i = Math.floor(Math.random() * MUSIC_PENTA.length);
  const root = MUSIC_PENTA[i];
  const second = MUSIC_PENTA[(i + 2) % MUSIC_PENTA.length];
  const sub = root / 2;
  const attack = 1.4 + Math.random() * 0.6; // 1.4-2s fade in
  const release = Math.min(2.2, dur * 0.3);
  padVoice(root, time, dur, attack, release, 0.045, -5);
  padVoice(second, time, dur, attack, release, 0.035, 5);
  padVoice(sub, time, dur, attack, release, 0.03, 0);
}

/** Lookahead tick: queue any chords due within SCHEDULE_AHEAD_S, then
 *  reschedule itself. Chord timing lives entirely in AudioContext time
 *  (`nextChordTime`), so the setTimeout cadence can jitter freely without
 *  the music drifting. */
function musicTick() {
  musicSchedulerTimer = null;
  if (!musicRunning || !ctx || !musicGain) return;
  if (ctx.state === 'running' && !document.hidden) {
    while (nextChordTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const dur = CHORD_MIN_S + Math.random() * (CHORD_MAX_S - CHORD_MIN_S);
      scheduleChord(nextChordTime, dur);
      nextChordTime += dur;
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
  if (musicRunning && musicSchedulerTimer === null) musicTick();
}

/** Starts (or restarts, after being stopped) the ambient loop and fades it
 *  in gently. A no-op if it's already running. */
function startMusic() {
  if (!ctx || !musicGain || musicRunning) return;
  musicRunning = true;
  const t = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setValueAtTime(musicGain.gain.value, t);
  musicGain.gain.linearRampToValueAtTime(MUSIC_BASE_GAIN, t + 2);
  nextChordTime = t + 0.4;
  pauseMusicScheduler();
  musicTick();
}

/** Stops the loop: no more chords get queued, and whatever's sounding fades
 *  out with the gain rather than cutting off. */
function stopMusic(fadeOutS = 0.4) {
  musicRunning = false;
  pauseMusicScheduler();
  if (ctx && musicGain) {
    const t = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(musicGain.gain.value, t);
    musicGain.gain.linearRampToValueAtTime(0, t + fadeOutS);
  }
}

/** Lowers the music under a short jingle (win fanfare, out-of-lives sigh)
 *  without stopping the loop, then brings it back once `ms` has passed. */
function duckMusicFor(ms: number, factor = 0.3) {
  if (!ctx || !musicGain || !musicRunning) return;
  const t = ctx.currentTime;
  const duckedTo = MUSIC_BASE_GAIN * factor;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setValueAtTime(musicGain.gain.value, t);
  musicGain.gain.linearRampToValueAtTime(duckedTo, t + 0.12);
  musicGain.gain.setValueAtTime(duckedTo, t + 0.12 + ms / 1000);
  musicGain.gain.linearRampToValueAtTime(MUSIC_BASE_GAIN, t + 0.12 + ms / 1000 + 0.6);
}

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

/** Out of hearts: a soft three-note sigh as the fail modal opens. Lasts
 *  about 3 notes * 0.22s + 0.5s tail ≈ 1s — a brief duck is enough to keep
 *  the pad from clashing with it. */
export function playOutOfLives() {
  guard(() => {
    duckMusicFor(900);
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
    const end = start + Math.max(0, count - 1) * step + 0.28;
    // Duck for the whole celebration: the hop wave plus the closing chord's
    // ring-out, roughly the 1.2-1.6s the win sequence takes end to end.
    duckMusicFor((end + 1.1) * 1000);
    for (let i = 0; i < count; i++) bell(PENTA[i % PENTA.length], start + i * step, 0.05, 0.4);
    [523.25, 659.25, 783.99, 1046.5].forEach((f) => bell(f, end, 0.032, 1.1));
  });
}

export function playTap() {
  guard(() => tone({ freq: 600, dur: 0.05, gain: 0.04, type: 'triangle' }));
}
