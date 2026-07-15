// Voidburst procedural audio — same AudioManager architecture as Stackward.
// Distinct bubble-pop sonic palette: softer, rounder tones vs Stackward's
// hard arcade square waves, but the same synthwave background music pattern.

const PREFS_KEY = 'voidburst_audio_v1';
const MUSIC_VOL = 0.28;
const SFX_VOL = 0.85;

export class AudioManager {
  constructor() {
    this.ctx = null; this.master = null;
    this.sfxGain = null; this.musicGain = null;
    this.unlocked = false;
    const prefs = this._loadPrefs();
    this.muted = prefs.muted;
    this.musicEnabled = prefs.musicEnabled;
    this.sfxEnabled = prefs.sfxEnabled;
    this._musicOn = false; this._nextNoteTime = 0;
    this._step = 0; this._timer = null; this._bpm = 118;
  }

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

  _loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY));
      return { muted: !!p.muted, musicEnabled: p.musicEnabled !== false, sfxEnabled: p.sfxEnabled !== false };
    } catch { return { muted: false, musicEnabled: true, sfxEnabled: true }; }
  }

  _savePrefs() {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ muted: this.muted, musicEnabled: this.musicEnabled, sfxEnabled: this.sfxEnabled }));
  }

  _ramp(node, value) {
    if (!node) return;
    const now = this.ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.linearRampToValueAtTime(value, now + 0.08);
  }

  setMusicEnabled(on) { this.musicEnabled = on; this._ramp(this.musicGain, on ? MUSIC_VOL : 0); this._savePrefs(); }
  setSfxEnabled(on)   { this.sfxEnabled = on;   this._ramp(this.sfxGain,  on ? SFX_VOL  : 0); this._savePrefs(); }
  setMuted(muted)     { this.muted = muted; if (this.master) this._ramp(this.master, muted ? 0 : 0.9); this._savePrefs(); }
  toggleMute()        { this.setMuted(!this.muted); return this.muted; }

  _voice({ type = 'sine', freq, dur, attack = 0.006, decay, peak = 0.25, glideTo = null, filterFreq = null }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    let node = gain;
    if (filterFreq) {
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = filterFreq;
      osc.connect(filt); filt.connect(gain);
    } else { osc.connect(gain); }
    const d = decay ?? dur;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + d);
    gain.connect(this.sfxGain);
    osc.start(t); osc.stop(t + attack + d + 0.02);
  }

  // --- SFX: bubble-specific tones ---

  /** Ball fires from cannon */
  shoot() {
    this._voice({ type: 'sine', freq: 440, glideTo: 600, dur: 0.08, peak: 0.2 });
  }

  /** Ball lands on grid without popping */
  land() {
    this._voice({ type: 'triangle', freq: 280, glideTo: 200, dur: 0.1, peak: 0.18, filterFreq: 1800 });
  }

  /** Small pop — 1 to 2 bubbles cleared */
  popSmall() {
    this._voice({ type: 'sine', freq: 660, glideTo: 900, dur: 0.1, peak: 0.22 });
  }

  /** Big pop cascade — 3+ bubbles */
  popLarge(count) {
    const base = 500 + Math.min(count, 12) * 30;
    this._voice({ type: 'sine', freq: base, glideTo: base * 1.6, dur: 0.12, peak: 0.28 });
    setTimeout(() => this._voice({ type: 'triangle', freq: base * 1.5, dur: 0.18, peak: 0.2, filterFreq: 3000 }), 60);
  }

  /** Bubble falls off grid after losing support */
  drop() {
    this._voice({ type: 'sine', freq: 400, glideTo: 120, dur: 0.2, peak: 0.15, filterFreq: 1200 });
  }

  coinLand(index = 0) {
    const freq = 1100 + index * 80;
    this._voice({ type: 'square', freq, dur: 0.06, peak: 0.1, filterFreq: 4500 });
  }

  powerupOpen() {
    this._voice({ type: 'triangle', freq: 480, glideTo: 720, dur: 0.35, peak: 0.18 });
    setTimeout(() => this._voice({ type: 'triangle', freq: 720, glideTo: 1080, dur: 0.35, peak: 0.15 }), 110);
  }

  powerupPick() {
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this._voice({ type: 'sine', freq: f, dur: 0.28, peak: 0.18 }), i * 50);
    });
  }

  gameOver() {
    const notes = [440, 349, 261, 174];
    notes.forEach((f, i) => setTimeout(() => this._voice({ type: 'sawtooth', freq: f, dur: 0.28, peak: 0.2, filterFreq: 1600 }), i * 140));
  }

  waveClear() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this._voice({ type: 'triangle', freq: f, dur: 0.3, peak: 0.18 }), i * 80);
    });
  }

  // --- Background music (same pattern as Stackward) ---
  startMusic() {
    if (!this.ctx || this._musicOn) return;
    this._musicOn = true; this._step = 0;
    this._nextNoteTime = this.ctx.currentTime + 0.1;
    this._timer = setInterval(() => this._scheduler(), 25);
  }

  stopMusic() {
    this._musicOn = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  _scheduler() {
    if (!this.ctx) return;
    const spStep = (60 / this._bpm) / 4;
    while (this._nextNoteTime < this.ctx.currentTime + 0.12) {
      this._scheduleStep(this._step, this._nextNoteTime);
      this._nextNoteTime += spStep;
      this._step = (this._step + 1) % 32;
    }
  }

  _scheduleStep(step, time) {
    // Minor-key synthwave: Am-F-C-G (same vibe as Stackward but slightly
    // slower tempo gives the bubble shooter a more thoughtful feel)
    const roots = [220.0, 174.61, 261.63, 196.0];
    const root = roots[Math.floor(step / 8) % 4];
    if (step % 8 === 0 || step % 8 === 4) {
      this._musicVoice({ type: 'sawtooth', freq: root / 2, dur: 0.4, peak: 0.22, filterFreq: 600, time });
    }
    const arp = [1, 1.2, 1.5, 2, 1.5, 1.2];
    if (step % 2 === 0) {
      this._musicVoice({ type: 'square', freq: root * arp[(step / 2) % arp.length], dur: 0.14, peak: 0.10, filterFreq: 3000, time });
    }
    if (step % 8 === 0) {
      this._musicVoice({ type: 'triangle', freq: root * 2, dur: 0.9, peak: 0.04, filterFreq: 1800, time });
    }
  }

  _musicVoice({ type, freq, dur, peak, filterFreq, time }) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = filterFreq;
    osc.type = type; osc.frequency.value = freq;
    osc.connect(filt); filt.connect(gain);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    gain.connect(this.musicGain);
    osc.start(time); osc.stop(time + dur + 0.05);
  }
}
