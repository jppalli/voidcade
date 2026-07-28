// Procedural WebAudio SFX — no external audio files, same approach used
// throughout this arcade (see Pips & Paths' sounds.ts).

const PREFS_KEY = 'wardens_audio_v1';

interface AudioPrefs {
  sfx: boolean;
}

function loadPrefs(): AudioPrefs {
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    /* ignore */
  }
  return { sfx: true };
}

function savePrefs(prefs: AudioPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

let _prefs: AudioPrefs = loadPrefs();

export function getAudioPrefs(): AudioPrefs {
  return { ..._prefs };
}

export function setSfxEnabled(enabled: boolean) {
  _prefs.sfx = enabled;
  savePrefs(_prefs);
}

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq: number, start: number, duration: number, gainPeak: number, type: OscillatorType = 'sine') {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

export function playMark() {
  if (!_prefs.sfx) return;
  try {
    tone(560, 0, 0.08, 0.1, 'triangle');
  } catch {
    /* audio unavailable */
  }
}

export function playPlaceWarden() {
  if (!_prefs.sfx) return;
  try {
    tone(420, 0, 0.1, 0.14, 'sine');
    tone(630, 0.03, 0.12, 0.1, 'sine');
  } catch {
    /* audio unavailable */
  }
}

export function playRemove() {
  if (!_prefs.sfx) return;
  try {
    tone(340, 0, 0.09, 0.1, 'triangle');
  } catch {
    /* audio unavailable */
  }
}

export function playMistake() {
  if (!_prefs.sfx) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
  } catch {
    /* audio unavailable */
  }
}

export function playWin() {
  if (!_prefs.sfx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => tone(freq, i * 0.11, 0.4, 0.15, 'sine'));
  } catch {
    /* audio unavailable */
  }
}

export function playBoonAwarded() {
  if (!_prefs.sfx) return;
  try {
    tone(660, 0, 0.5, 0.13, 'sine');
    tone(990, 0.08, 0.5, 0.09, 'sine');
    tone(1320, 0.16, 0.6, 0.06, 'sine');
  } catch {
    /* audio unavailable */
  }
}

export function playBoonUsed() {
  if (!_prefs.sfx) return;
  try {
    tone(880, 0, 0.18, 0.12, 'triangle');
    tone(1180, 0.06, 0.22, 0.08, 'triangle');
  } catch {
    /* audio unavailable */
  }
}

export function playClick() {
  if (!_prefs.sfx) return;
  try {
    tone(600, 0, 0.06, 0.08, 'triangle');
  } catch {
    /* audio unavailable */
  }
}
