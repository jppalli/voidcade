/** All sound is synthesized with WebAudio — no audio files. */
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = localStorage.getItem('bs-muted') === '1';
  }

  /** Must be called from a user gesture. */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.45;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    localStorage.setItem('bs-muted', muted ? '1' : '0');
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.45, this.ctx.currentTime, 0.02);
    }
  }

  tone({ freq, freqEnd, type = 'sine', dur = 0.15, when = 0, vol = 0.5, attack = 0.005 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.1, when = 0, vol = 0.3, freq = 2400, q = 1 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  }

  shoot() {
    this.tone({ freq: 320, freqEnd: 720, type: 'triangle', dur: 0.12, vol: 0.35 });
    this.noise({ dur: 0.08, vol: 0.12, freq: 3200 });
  }

  bounce() {
    this.tone({ freq: 240, freqEnd: 180, type: 'square', dur: 0.06, vol: 0.12 });
  }

  attach() {
    this.tone({ freq: 190, freqEnd: 120, type: 'sine', dur: 0.1, vol: 0.4 });
    this.noise({ dur: 0.05, vol: 0.15, freq: 900, q: 2 });
  }

  pop(i, when = 0) {
    const semi = PENTATONIC[Math.min(i, PENTATONIC.length - 1)];
    const freq = 523.25 * Math.pow(2, semi / 12);
    this.tone({ freq, freqEnd: freq * 1.5, type: 'sine', dur: 0.18, when, vol: 0.4 });
    this.noise({ dur: 0.06, when, vol: 0.18, freq: 3000 + i * 250, q: 1.5 });
  }

  fall(i, when = 0) {
    const freq = 700 - i * 40;
    this.tone({ freq: Math.max(freq, 200), freqEnd: 140, type: 'triangle', dur: 0.25, when, vol: 0.14 });
  }

  swap() {
    this.tone({ freq: 500, freqEnd: 700, type: 'sine', dur: 0.07, vol: 0.2 });
    this.tone({ freq: 700, freqEnd: 500, type: 'sine', dur: 0.07, when: 0.05, vol: 0.2 });
  }

  drop() {
    this.tone({ freq: 130, freqEnd: 80, type: 'sawtooth', dur: 0.35, vol: 0.22 });
    this.noise({ dur: 0.3, vol: 0.1, freq: 500, q: 0.8 });
  }

  click() {
    this.tone({ freq: 880, type: 'sine', dur: 0.05, vol: 0.2 });
  }

  /** Charge meter just maxed out — a bright rising chime, distinct from
   *  the fuller levelUp() fanfare that plays once the modal actually opens. */
  chargeReady() {
    this.tone({ freq: 660, freqEnd: 990, type: 'sine', dur: 0.22, vol: 0.3 });
    this.tone({ freq: 880, freqEnd: 1320, type: 'triangle', dur: 0.28, when: 0.08, vol: 0.22 });
  }

  levelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      this.tone({ freq, type: 'triangle', dur: 0.22, when: i * 0.09, vol: 0.32 });
    });
    this.tone({ freq: 1046.5, freqEnd: 1568, type: 'sine', dur: 0.5, when: 0.36, vol: 0.2 });
  }

  gameOver() {
    const notes = [392, 329.63, 261.63, 196];
    notes.forEach((freq, i) => {
      this.tone({ freq, type: 'triangle', dur: 0.4, when: i * 0.18, vol: 0.3 });
    });
  }
}
