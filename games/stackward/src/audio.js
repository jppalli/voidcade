// Procedural neon-arcade audio, fully synthesized via the Web Audio API.
// No sample files: SFX are short oscillator envelopes, and the music is a
// looping synthwave arpeggio + bassline scheduled with a lookahead clock.

const PREFS_KEY = 'stackward_audio_v1';
const MUSIC_VOL = 0.32;
const SFX_VOL = 0.9;

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.unlocked = false;

    // Load persisted preferences (default: everything on).
    const prefs = this._loadPrefs();
    this.muted = prefs.muted;
    this.musicEnabled = prefs.musicEnabled;
    this.sfxEnabled = prefs.sfxEnabled;

    // Music scheduler state
    this._musicOn = false;
    this._nextNoteTime = 0;
    this._step = 0;
    this._timer = null;
    this._bpm = 122;
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
  // Low-level synth voice
  // ---------------------------------------------------------
  _voice({ type = 'square', freq, dur, attack = 0.005, decay, peak = 0.3, dest, glideTo = null, filterFreq = null }) {
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
  // Sound effects
  // ---------------------------------------------------------
  drop() {
    // soft blip for a normal placement
    this._voice({ type: 'triangle', freq: 320, glideTo: 180, dur: 0.12, peak: 0.22 });
  }

  perfect(combo = 1) {
    // rising two-note chime, pitch climbs with the combo streak
    const base = 520 + Math.min(combo, 12) * 40;
    this._voice({ type: 'square', freq: base, dur: 0.12, peak: 0.22, filterFreq: 3500 });
    setTimeout(() => this._voice({ type: 'square', freq: base * 1.5, dur: 0.16, peak: 0.2, filterFreq: 4000 }), 70);
  }

  close() {
    // dull thud, slightly detuned
    this._voice({ type: 'sawtooth', freq: 200, glideTo: 130, dur: 0.14, peak: 0.18, filterFreq: 1200 });
  }

  coin() {
    // bright arcade coin ping
    this._voice({ type: 'square', freq: 880, dur: 0.05, peak: 0.14 });
    setTimeout(() => this._voice({ type: 'square', freq: 1320, dur: 0.09, peak: 0.14 }), 55);
  }

  shield() {
    // shimmering protective sweep
    this._voice({ type: 'sawtooth', freq: 300, glideTo: 900, dur: 0.3, peak: 0.2, filterFreq: 2200 });
  }

  powerupOpen() {
    // suspenseful shimmer when the choice appears
    this._voice({ type: 'triangle', freq: 440, glideTo: 660, dur: 0.4, peak: 0.18 });
    setTimeout(() => this._voice({ type: 'triangle', freq: 660, glideTo: 990, dur: 0.4, peak: 0.16 }), 120);
  }

  powerupPick() {
    // confirming power chord
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this._voice({ type: 'square', freq: f, dur: 0.25, peak: 0.18, filterFreq: 4000 }), i * 45);
    });
  }

  gameOver() {
    // descending arcade fail run
    const notes = [440, 349, 261, 174];
    notes.forEach((f, i) => {
      setTimeout(() => this._voice({ type: 'sawtooth', freq: f, dur: 0.28, peak: 0.22, filterFreq: 1800 }), i * 130);
    });
  }

  // ---------------------------------------------------------
  // Background music - looping synthwave arp + bass
  // ---------------------------------------------------------
  startMusic() {
    if (!this.ctx || this._musicOn) return;
    this._musicOn = true;
    this._step = 0;
    this._nextNoteTime = this.ctx.currentTime + 0.1;
    this._timer = setInterval(() => this._scheduler(), 25);
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
    const secondsPerStep = (60 / this._bpm) / 4; // 16th notes
    while (this._nextNoteTime < this.ctx.currentTime + 0.12) {
      this._scheduleStep(this._step, this._nextNoteTime);
      this._nextNoteTime += secondsPerStep;
      this._step = (this._step + 1) % 32;
    }
  }

  _scheduleStep(step, time) {
    // Two-bar loop (32 x 16th notes). Minor-key synthwave: Am - F - C - G,
    // one chord per half-bar (8 steps).
    const chordRoots = [220.0, 174.61, 261.63, 196.0]; // A3, F3, C4, G3
    const chordIdx = Math.floor(step / 8) % 4;
    const root = chordRoots[chordIdx];

    // Bassline: root on the downbeat of each half-bar and its "and".
    if (step % 8 === 0 || step % 8 === 4) {
      this._musicVoice({ type: 'sawtooth', freq: root / 2, dur: 0.42, peak: 0.28, filterFreq: 700, time });
    }

    // Arpeggio: bright pluck running through root / minor third / fifth / octave.
    const arp = [1, 1.2, 1.5, 2, 1.5, 1.2];
    if (step % 2 === 0) {
      const note = root * arp[(step / 2) % arp.length];
      this._musicVoice({ type: 'square', freq: note, dur: 0.16, peak: 0.12, filterFreq: 3200, time });
    }

    // Soft shimmer pad every half-bar for atmosphere.
    if (step % 8 === 0) {
      this._musicVoice({ type: 'triangle', freq: root * 2, dur: 1.0, peak: 0.05, filterFreq: 2000, time });
    }
  }

  _musicVoice({ type, freq, dur, peak, filterFreq, time }) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq;
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(filt);
    filt.connect(gain);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }
}
