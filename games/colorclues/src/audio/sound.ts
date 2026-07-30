// Small WebAudio synth — no asset files, no network.
import { isMuted, setMuted } from "../game/storage";

let ctx: AudioContext | null = null;
let muted = false;

export function initAudio() {
  muted = isMuted();
  const wake = () => {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  };
  window.addEventListener("pointerdown", wake, { once: false });
  window.addEventListener("keydown", wake, { once: false });
}

export const audioMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  setMuted(muted);
  return muted;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, glide?: number) {
  if (muted || !ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const NOTES = [523.25, 587.33, 659.25, 783.99];

export const sfx = {
  paint(color: number) { tone(NOTES[color] ?? 523, 0.14, "triangle", 0.1); },
  mark() { tone(320, 0.09, "square", 0.045); },
  chord() {
    tone(523, 0.12, "triangle", 0.08);
    tone(784, 0.14, "triangle", 0.07, 0.06);
  },
  mistake() { tone(196, 0.28, "sawtooth", 0.07, 0, 110); },
  undo() { tone(300, 0.1, "sine", 0.06, 0, 220); },
  hint() { tone(880, 0.18, "sine", 0.07, 0, 1320); },
  tap() { tone(660, 0.05, "sine", 0.04); },
  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(f, 0.32, "triangle", 0.09, i * 0.09));
  },
  fail() {
    [392, 330, 262].forEach((f, i) => tone(f, 0.3, "triangle", 0.08, i * 0.12));
  },
};
