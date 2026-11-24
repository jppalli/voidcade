// Procedural WebAudio sound for Dominoku: no audio files, same approach as Kittydoku.
//
//   voices -> sfx bus ---+--> dry ---------------+
//   music voices -> music bus --> reverb send -> room -> master -> compressor -> out
//
// Effects are short wooden clacks and soft bell tones. The music is a quiet, slow generative
// loop in C major pentatonic, so any note can sit over any chord. Audio only starts after the
// player's first tap or key press, as browsers require.

export type Sfx = 'tap' | 'rotate' | 'place' | 'invalid' | 'takeback' | 'undo' | 'match' | 'solved';

let sfxOn = true;
let musicOn = true;

let ctx: AudioContext | null = null;
let sfxBus: GainNode;
let musicBus: GainNode;
let master: GainNode;
let room: ConvolverNode;
let noise: AudioBuffer;

/** Apply saved preferences. Call once before the first sound. */
export function initSound(prefs: { sfx: boolean; music: boolean }): void {
  sfxOn = prefs.sfx;
  musicOn = prefs.music;
}

export const sfxEnabled = (): boolean => sfxOn;
export const musicEnabled = (): boolean => musicOn;

function engine(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  const c = ctx;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 4;
  master = c.createGain();
  master.gain.value = 0.7;
  master.connect(comp).connect(c.destination);

  // A small room: decaying noise as the impulse response.
  const len = Math.floor(c.sampleRate * 1.4);
  const impulse = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = impulse.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  room = c.createConvolver();
  room.buffer = impulse;
  const wet = c.createGain();
  wet.gain.value = 0.22;
  room.connect(wet).connect(master);

  sfxBus = c.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);
  sfxBus.connect(room);

  musicBus = c.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(master);
  musicBus.connect(room);

  noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else void ctx.resume();
  });
  return ctx;
}

/** Call on the first pointer or key event. Starts audio and, if it is on, the music. */
export function unlockSound(): void {
  const c = engine();
  if (!c) return;
  void c.resume();
  if (musicOn) startMusic();
}

// ---------------------------------------------------------------- voices
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** A soft plucked tone: triangle plus a quiet octave, fast attack, exponential decay. */
function pluck(freq: number, when: number, dur: number, gain: number, bus: GainNode): void {
  const c = ctx!;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, when);
  out.gain.exponentialRampToValueAtTime(gain, when + 0.012);
  out.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  out.connect(bus);
  for (const [mult, level, type] of [[1, 1, 'triangle'], [2, 0.25, 'sine']] as const) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq * mult;
    const g = c.createGain();
    g.gain.value = level;
    o.connect(g).connect(out);
    o.start(when);
    o.stop(when + dur + 0.05);
  }
}

/** A short burst of filtered noise: the clack of wood on wood. */
function clack(when: number, freq: number, dur: number, gain: number): void {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 1.4;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(when);
  src.stop(when + dur + 0.02);
}

/** A sine that glides between two pitches, for soft "pop" sounds. */
function glide(from: number, to: number, when: number, dur: number, gain: number, type: OscillatorType = 'sine'): void {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, when);
  o.frequency.exponentialRampToValueAtTime(to, when + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g).connect(sfxBus);
  o.start(when);
  o.stop(when + dur + 0.02);
}

export function play(name: Sfx): void {
  if (!sfxOn) return;
  const c = engine();
  if (!c || c.state === 'closed') return;
  if (c.state === 'suspended') void c.resume();
  const t = c.currentTime + 0.005;
  switch (name) {
    case 'tap':
      clack(t, 2600, 0.025, 0.18);
      break;
    case 'rotate':
      clack(t, 2000, 0.03, 0.3);
      glide(520, 420, t, 0.05, 0.08, 'triangle');
      break;
    case 'place':
      clack(t, 900, 0.07, 0.55);
      glide(190, 90, t, 0.11, 0.5);
      break;
    case 'invalid':
      glide(210, 150, t, 0.16, 0.22, 'triangle');
      glide(190, 135, t + 0.09, 0.16, 0.2, 'triangle');
      break;
    case 'takeback':
      glide(380, 620, t, 0.09, 0.2);
      break;
    case 'undo':
      glide(620, 380, t, 0.09, 0.2);
      break;
    case 'match':
      pluck(midi(76), t, 0.5, 0.22, sfxBus);
      pluck(midi(79), t + 0.07, 0.6, 0.2, sfxBus);
      break;
    case 'solved':
      [72, 76, 79, 84, 88].forEach((n, i) => pluck(midi(n), t + 0.12 * i, 1.1, 0.26, sfxBus));
      [60, 67, 76].forEach((n) => pluck(midi(n), t + 0.5, 1.6, 0.12, sfxBus));
      break;
  }
}

// ---------------------------------------------------------------- music
const CHORDS = [
  [48, 55, 59, 64], // C  G  B  E
  [45, 52, 60, 64], // A  E  C  E
  [41, 48, 57, 64], // F  C  A  E
  [43, 50, 59, 62], // G  D  B  D
];
const SCALE = [72, 74, 76, 79, 81, 84, 86]; // C D E G A C D, upper register

let musicTimer: number | null = null;
let nextChordAt = 0;
let nextNoteAt = 0;
let chordIndex = 0;

function pad(notes: number[], when: number, dur: number): void {
  const c = ctx!;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, when);
  out.gain.linearRampToValueAtTime(0.5, when + dur * 0.35);
  out.gain.linearRampToValueAtTime(0.0001, when + dur);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  out.connect(lp).connect(musicBus);
  for (const n of notes) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = midi(n);
    o.detune.value = (Math.random() - 0.5) * 8;
    const g = c.createGain();
    g.gain.value = 0.18;
    o.connect(g).connect(out);
    o.start(when);
    o.stop(when + dur + 0.1);
  }
}

function scheduleMusic(): void {
  const c = ctx;
  if (!c || !musicOn || c.state !== 'running') return;
  const horizon = c.currentTime + 1.5;
  while (nextChordAt < horizon) {
    pad(CHORDS[chordIndex % CHORDS.length], nextChordAt, 8);
    chordIndex++;
    nextChordAt += 6;
  }
  while (nextNoteAt < horizon) {
    if (Math.random() < 0.62) {
      const note = SCALE[Math.floor(Math.random() * SCALE.length)];
      pluck(midi(note), nextNoteAt, 1.8, 0.07 + Math.random() * 0.03, musicBus);
    }
    nextNoteAt += 0.75 + Math.random() * 0.5;
  }
}

function startMusic(): void {
  const c = engine();
  if (!c) return;
  void c.resume();
  musicBus.gain.cancelScheduledValues(c.currentTime);
  musicBus.gain.setTargetAtTime(0.16, c.currentTime, 1.2);
  if (musicTimer !== null) return;
  nextChordAt = nextNoteAt = c.currentTime + 0.2;
  scheduleMusic();
  musicTimer = window.setInterval(scheduleMusic, 400);
}

function stopMusic(): void {
  if (ctx) {
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
  }
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}

export function setSfx(on: boolean): void {
  sfxOn = on;
  if (on) play('tap');
}

export function setMusic(on: boolean): void {
  musicOn = on;
  if (on) startMusic();
  else stopMusic();
}
