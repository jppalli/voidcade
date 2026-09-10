export class EngineAudio {
  private context: AudioContext | null = null;
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private muted = false;

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.engine = this.context.createOscillator();
      this.engineGain = this.context.createGain();
      this.engine.type = 'sawtooth';
      this.engine.frequency.value = 55;
      this.engineGain.gain.value = 0;
      this.engine.connect(this.engineGain).connect(this.context.destination);
      this.engine.start();
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted && this.engineGain && this.context) {
      this.engineGain.gain.setTargetAtTime(0, this.context.currentTime, 0.03);
    }
  }

  update(speedRatio: number, running: boolean, boosting: boolean): void {
    if (!this.context || !this.engine || !this.engineGain) return;
    const now = this.context.currentTime;
    const frequency = 48 + speedRatio * 105 + (boosting ? 32 : 0);
    const volume = this.muted || !running ? 0 : 0.018 + speedRatio * 0.025;
    this.engine.frequency.setTargetAtTime(frequency, now, 0.045);
    this.engineGain.gain.setTargetAtTime(volume, now, 0.05);
  }

  pickup(): void {
    this.tone(620, 0.08, 'sine', 0.09);
    window.setTimeout(() => this.tone(920, 0.11, 'sine', 0.07), 55);
  }

  collision(): void {
    this.tone(78, 0.22, 'square', 0.08);
  }

  routeChoice(): void {
    this.tone(430, 0.1, 'triangle', 0.07);
    window.setTimeout(() => this.tone(570, 0.14, 'triangle', 0.06), 80);
  }

  finish(success: boolean): void {
    const notes = success ? [523, 659, 784] : [220, 185, 147];
    notes.forEach((frequency, index) => {
      window.setTimeout(() => this.tone(frequency, 0.16, 'triangle', 0.08), index * 110);
    });
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this.context || this.muted) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}
