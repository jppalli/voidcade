/**
 * Synthesized sound effects via WebAudio — no audio assets needed. The
 * AudioContext is created lazily on first user gesture (browser autoplay
 * policy). Kept deliberately calm and understated per the "satisfying,
 * not excessive" tone the game is going for.
 */

const MUTE_KEY = 'leapline-muted';

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
        this.master.gain.value = 0.45;
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
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(opts.gain ?? 0.2, t0 + 0.007);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // ---- public effects ----

  uiClick(): void {
    this.tone(540, 0.045, { type: 'sine', gain: 0.08 });
  }

  /** A step placed correctly — pitch rises slightly with distance (1/2/3) for a subtle "reach" feel. */
  place(distance: number): void {
    const base = 360 + distance * 40;
    this.tone(base, 0.08, { type: 'sine', gain: 0.22 });
    this.tone(base * 1.5, 0.09, { type: 'sine', gain: 0.09, delay: 0.03 });
  }

  mistake(): void {
    this.tone(210, 0.14, { type: 'triangle', gain: 0.14 });
    this.tone(180, 0.18, { type: 'triangle', gain: 0.1, delay: 0.06 });
  }

  /** A UI-guard rejection (tapping a non-candidate cell) — quieter than a real mistake, no penalty implied. */
  invalid(): void {
    this.tone(260, 0.06, { type: 'square', gain: 0.05 });
  }

  undo(): void {
    this.tone(420, 0.07, { type: 'sine', gain: 0.14, slideTo: 320 });
  }

  hint(): void {
    this.tone(600, 0.09, { type: 'sine', gain: 0.14 });
    this.tone(760, 0.1, { type: 'sine', gain: 0.08, delay: 0.05 });
  }

  win(): void {
    const notes = [493.88, 587.33, 739.99, 987.77]; // B4 D5 F#5 B5 — calm major-ish arpeggio
    notes.forEach((f, i) => {
      this.tone(f, 0.32, { gain: 0.18, delay: i * 0.09 });
      this.tone(f * 2, 0.32, { gain: 0.04, delay: i * 0.09 });
    });
    this.tone(987.77, 0.6, { gain: 0.14, delay: 0.36 });
  }

  streakBonus(): void {
    const notes = [587.33, 739.99, 987.77, 1174.66];
    notes.forEach((f, i) => this.tone(f, 0.28, { gain: 0.16, delay: i * 0.07 }));
  }
}

export const sound = new SoundEngine();
