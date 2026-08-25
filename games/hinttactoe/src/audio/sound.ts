/**
 * Synthesized sound effects via WebAudio — no audio assets needed.
 * The AudioContext is created lazily on first user gesture (browser policy).
 */

const MUTE_KEY = 'hinttactoe-muted';

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

  // ---- public effects ----

  uiClick(): void {
    this.tone(660, 0.05, { type: 'square', gain: 0.06 });
  }

  /** Correct answer, mark placed on the board. */
  place(player: 'X' | 'O'): void {
    if (player === 'X') {
      this.tone(420, 0.09, { type: 'sine', gain: 0.28 });
      this.tone(630, 0.1, { type: 'sine', gain: 0.14, delay: 0.05 });
    } else {
      this.tone(330, 0.1, { type: 'sine', gain: 0.28 });
      this.tone(494, 0.11, { type: 'sine', gain: 0.14, delay: 0.05 });
    }
  }

  /** Wrong / unrecognized answer — turn passes. */
  wrong(): void {
    this.tone(220, 0.16, { type: 'sawtooth', gain: 0.14 });
    this.tone(160, 0.2, { type: 'sawtooth', gain: 0.12, delay: 0.08 });
  }

  win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((f, i) => {
      this.tone(f, 0.35, { gain: 0.22, delay: i * 0.1 });
      this.tone(f * 2, 0.35, { gain: 0.05, delay: i * 0.1 });
    });
    this.tone(1046.5, 0.7, { gain: 0.18, delay: 0.42 });
  }

  draw(): void {
    this.tone(392, 0.25, { type: 'triangle', gain: 0.16 });
    this.tone(392 * 0.8, 0.3, { type: 'triangle', gain: 0.12, delay: 0.12 });
  }
}

export const sound = new SoundEngine();
