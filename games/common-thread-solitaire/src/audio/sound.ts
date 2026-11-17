import { loadSave, saveSave } from '../game/storage';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;
  private unlocked = false;

  constructor() {
    this.enabled = loadSave().soundEnabled;
  }

  unlock(): void {
    if (this.unlocked) return;
    
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.enabled ? 0.7 : 0;
    this.masterGain.connect(this.ctx.destination);
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    this.unlocked = true;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    saveSave({ soundEnabled: enabled });
    
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        enabled ? 0.7 : 0,
        this.ctx!.currentTime,
        0.05
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private playTone(
    frequency: number,
    duration: number,
    volume: number = 0.3,
    type: OscillatorType = 'sine'
  ): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  private playNoise(
    duration: number,
    volume: number,
    filterFreq: number,
    filterQ: number = 1
  ): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = filterQ;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
  }

  // Sound effects
  cardPick(): void {
    this.playNoise(0.06, 0.15, 3200, 0.8);
  }

  cardPlace(): void {
    this.playNoise(0.08, 0.18, 1400, 0.8);
    this.playTone(180, 0.09, 0.15);
  }

  cardFlip(): void {
    this.playNoise(0.12, 0.12, 1800, 1);
    this.playTone(340, 0.08, 0.1, 'triangle');
  }

  slotComplete(): void {
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, 0.2, 'triangle');
      }, i * 80);
    });
  }

  levelComplete(): void {
    const melody = [523, 587, 659, 784, 880, 1047]; // C D E G A C
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.6, 0.25, 'sine');
      }, i * 100);
    });
  }

  hint(): void {
    this.playTone(880, 0.3, 0.15);
    setTimeout(() => {
      this.playTone(1047, 0.3, 0.15);
    }, 100);
  }

  buttonClick(): void {
    this.playTone(784, 0.08, 0.12);
  }

  error(): void {
    this.playTone(200, 0.15, 0.2, 'triangle');
    this.playNoise(0.05, 0.1, 900, 0.5);
  }

  undo(): void {
    this.playTone(659, 0.1, 0.12);
    setTimeout(() => {
      this.playTone(523, 0.1, 0.12);
    }, 60);
  }
}

export const audio = new AudioEngine();

// Unlock audio on first user interaction
let unlockAttempted = false;
export function attemptUnlock(): void {
  if (unlockAttempted) return;
  unlockAttempted = true;
  audio.unlock();
}

// Auto-unlock on any user interaction
if (typeof window !== 'undefined') {
  const unlock = () => attemptUnlock();
  ['click', 'touchstart', 'keydown'].forEach(event => {
    document.addEventListener(event, unlock, { once: true, passive: true });
  });
}
