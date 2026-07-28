/**
 * Synthesized sound effects via WebAudio — no audio assets needed.
 * The AudioContext is created lazily on first user gesture (browser policy).
 */

const MUTE_KEY = 'chessdoku-muted';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch { /* ignore */ }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch { /* ignore */ }
    return this.muted;
  }

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Simple enveloped oscillator tone. */
  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {},
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = opts.type ?? 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(opts.gain ?? 0.25, t0 + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Filtered noise burst — the "wood" in the piece-placement knock. */
  private knock(dur: number, filterFreq: number, gain: number, delay = 0): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const env = ctx.createGain();
    env.gain.value = gain;
    src.connect(filter).connect(env).connect(this.master);
    src.start(t0);
  }

  // ---- public effects ----

  uiClick(): void {
    this.tone(660, 0.05, { type: 'square', gain: 0.06 });
  }

  place(): void {
    this.knock(0.07, 1400, 0.5);
    this.tone(180, 0.09, { type: 'sine', gain: 0.3 });
  }

  pickup(): void {
    this.knock(0.05, 2200, 0.25);
    this.tone(320, 0.07, { type: 'sine', gain: 0.15, slideTo: 480 });
  }

  select(): void {
    this.tone(520, 0.06, { type: 'triangle', gain: 0.12 });
  }

  conflict(): void {
    this.tone(140, 0.22, { type: 'sawtooth', gain: 0.12 });
    this.tone(134, 0.22, { type: 'sawtooth', gain: 0.12 });
  }

  illegal(): void {
    this.tone(110, 0.15, { type: 'square', gain: 0.1 });
  }

  win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((f, i) => {
      this.tone(f, 0.35, { gain: 0.22, delay: i * 0.1 });
      this.tone(f * 2, 0.35, { gain: 0.05, delay: i * 0.1 });
    });
    this.tone(1046.5, 0.7, { gain: 0.18, delay: 0.42 });
  }

  chapterFanfare(): void {
    const notes = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => this.tone(f, 0.4, { gain: 0.2, delay: i * 0.09 }));
    this.tone(1568, 0.9, { gain: 0.15, delay: 0.6 });
  }
}

export const sound = new SoundEngine();
