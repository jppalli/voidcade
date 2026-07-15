/**
 * audio.js — procedural puzzle audio, fully synthesized via the Web Audio
 * API (same methodology as Stackward's audio.js: no sample files, short
 * oscillator-envelope voices for SFX, a scheduled loop for music).
 *
 * The palette is deliberately different from Stackward's neon-arcade tone:
 * warmer bell/marimba-like tones (triangle/sine, softer envelopes) instead
 * of square/sawtooth grit, and a slow ambient pad loop instead of a driving
 * synthwave arp+bass — fitting Panes' calmer, puzzle-focused feel.
 */

const PREFS_KEY = 'panes-audio-v1';
const MUSIC_VOL = 0.22;
const SFX_VOL = 0.9;

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.unlocked = false;

    const prefs = this._loadPrefs();
    this.muted = prefs.muted;
    this.musicEnabled = prefs.musicEnabled;
    this.sfxEnabled = prefs.sfxEnabled;

    // Ambient pad scheduler state
    this._musicOn = false;
    this._nextChordTime = 0;
    this._chordStep = 0;
    this._timer = null;
    this._chordDur = 3.6; // seconds each sustained chord rings for
  }

  /** Create the AudioContext lazily on the first user gesture (autoplay policy). */
  unlock() {
    if (this.unlocked) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxEnabled ? SFX_VOL : 0;
    this.sfxGain.connect(this.master);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicEnabled ? MUSIC_VOL : 0;
    this.musicGain.connect(this.master);

    this.unlocked = true;
  }

  // ---------------------------------------------------------
  // Preferences
  // ---------------------------------------------------------
  _loadPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) throw new Error('no prefs');
      const p = JSON.parse(raw);
      return {
        muted: !!p.muted,
        musicEnabled: p.musicEnabled !== false,
        sfxEnabled: p.sfxEnabled !== false,
      };
    } catch (e) {
      return { muted: false, musicEnabled: true, sfxEnabled: true };
    }
  }

  _savePrefs() {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      muted: this.muted,
      musicEnabled: this.musicEnabled,
      sfxEnabled: this.sfxEnabled,
    }));
  }

  _ramp(node, value) {
    if (!node) return;
    const now = this.ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.linearRampToValueAtTime(value, now + 0.08);
  }

  setMusicEnabled(on) {
    this.musicEnabled = on;
    this._ramp(this.musicGain, on ? MUSIC_VOL : 0);
    this._savePrefs();
  }

  setSfxEnabled(on) {
    this.sfxEnabled = on;
    this._ramp(this.sfxGain, on ? SFX_VOL : 0);
    this._savePrefs();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this._ramp(this.master, muted ? 0 : 0.9);
    this._savePrefs();
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ---------------------------------------------------------
  // Low-level synth voice (identical shape to Stackward's _voice, so both
  // games' audio code reads the same way even though the palette differs)
  // ---------------------------------------------------------
  _voice({ type = 'triangle', freq, dur, attack = 0.006, decay, peak = 0.2, dest, glideTo = null, filterFreq = null }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);

    let node = gain;
    if (filterFreq) {
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = filterFreq;
      osc.connect(filt);
      filt.connect(gain);
    } else {
      osc.connect(gain);
    }

    const d = decay ?? dur;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + d);
    gain.connect(dest || this.sfxGain);

    osc.start(t);
    osc.stop(t + attack + d + 0.02);
  }

  // ---------------------------------------------------------
  // Sound effects — bell/marimba-like, warmer and softer than Stackward's
  // arcade voice. Nothing here is meant to feel punishing, even on a miss.
  // ---------------------------------------------------------

  /** A region is locked in correctly: a clean two-tone marimba "clack". */
  place() {
    this._voice({ type: 'triangle', freq: 480, dur: 0.10, peak: 0.22, filterFreq: 3000 });
    setTimeout(() => this._voice({ type: 'sine', freq: 720, dur: 0.14, peak: 0.14 }), 40);
  }

  /** A locked region is removed (tap to undo): soft descending blip. */
  remove() {
    this._voice({ type: 'triangle', freq: 500, glideTo: 320, dur: 0.12, peak: 0.15 });
  }

  /** An invalid rectangle was dropped: a muted, low thud — noticeable but
   *  never harsh, since Panes doesn't punish misses, just counts them. */
  miss() {
    this._voice({ type: 'sine', freq: 160, glideTo: 110, dur: 0.16, peak: 0.15, filterFreq: 800 });
  }

  /** A hint reveals a region for the player: a small ascending sparkle,
   *  distinct from place() so it reads as "given", not "earned". */
  hint() {
    [660, 880, 1180].forEach((f, i) => {
      setTimeout(() => this._voice({ type: 'triangle', freq: f, dur: 0.14, peak: 0.16, filterFreq: 4200 }), i * 70);
    });
  }

  /** Clear board: a soft filtered whoosh sweeping down. */
  clear() {
    this._voice({ type: 'sawtooth', freq: 700, glideTo: 200, dur: 0.28, peak: 0.10, filterFreq: 1600 });
  }

  /** A level is solved: warm ascending major triad, bell-like. */
  win() {
    [523.25, 659.25, 784.0].forEach((f, i) => {
      setTimeout(() => this._voice({ type: 'triangle', freq: f, dur: 0.3, peak: 0.18, filterFreq: 3800 }), i * 80);
    });
    setTimeout(() => this._voice({ type: 'sine', freq: 1046.5, dur: 0.5, peak: 0.12 }), 260);
  }

  /** All 3 levels of the day are done: a longer, brighter fanfare that
   *  climbs further than win() and settles on a sustained shimmering chord. */
  dayComplete() {
    const notes = [523.25, 659.25, 784.0, 1046.5, 1318.5];
    notes.forEach((f, i) => {
      setTimeout(() => this._voice({ type: 'triangle', freq: f, dur: 0.35, peak: 0.2, filterFreq: 4000 }), i * 90);
    });
    setTimeout(() => {
      [784.0, 1046.5, 1318.5].forEach((f) => this._voice({ type: 'sine', freq: f, dur: 0.9, peak: 0.1 }));
    }, notes.length * 90 + 60);
  }

  // ---------------------------------------------------------
  // Background music — a slow, quiet ambient pad loop. Deliberately the
  // opposite of Stackward's driving arp+bass: long sustained chords, no
  // percussive elements, meant to sit under focused puzzle-solving without
  // demanding attention.
  // ---------------------------------------------------------
  startMusic() {
    if (!this.ctx || this._musicOn) return;
    this._musicOn = true;
    this._chordStep = 0;
    this._nextChordTime = this.ctx.currentTime + 0.2;
    this._timer = setInterval(() => this._scheduler(), 200);
  }

  stopMusic() {
    this._musicOn = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _scheduler() {
    if (!this.ctx) return;
    while (this._nextChordTime < this.ctx.currentTime + 0.3) {
      this._scheduleChord(this._chordStep, this._nextChordTime);
      this._nextChordTime += this._chordDur;
      this._chordStep = (this._chordStep + 1) % 4;
    }
  }

  _scheduleChord(step, time) {
    // Four-chord calm progression (triads, not full jazz voicings, to keep
    // the synthesis simple): Cmaj - Am - Fmaj - G.
    const chords = [
      [261.63, 329.63, 392.00], // C4 E4 G4
      [220.00, 261.63, 329.63], // A3 C4 E4
      [174.61, 220.00, 261.63], // F3 A3 C4
      [196.00, 246.94, 293.66], // G3 B3 D4
    ];
    const chord = chords[step % chords.length];
    chord.forEach((freq, i) => {
      // Slow attack/release sustained tone, quieter on the higher voices.
      this._musicVoice({ type: 'sine', freq, dur: this._chordDur * 0.92, peak: 0.06 - i * 0.012, time });
    });
    // A faint triangle shimmer an octave up on the root, for a touch of
    // brightness without adding rhythmic interest.
    this._musicVoice({ type: 'triangle', freq: chord[0] * 2, dur: this._chordDur * 0.8, peak: 0.02, filterFreq: 2200, time });
  }

  _musicVoice({ type, freq, dur, peak, filterFreq, time }) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    if (filterFreq) {
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = filterFreq;
      osc.connect(filt);
      filt.connect(gain);
    } else {
      osc.connect(gain);
    }
    osc.type = type;
    osc.frequency.value = freq;
    // Long, gentle attack/release so chords fade in and out rather than
    // stepping abruptly - core to the "ambient pad" feel.
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.6);
    gain.gain.linearRampToValueAtTime(0, time + dur);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }
}
