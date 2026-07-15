// Sound effects and ambient background music using the Web Audio API
// No external files needed — everything is procedurally generated

const PREFS_KEY = 'pips_paths_audio';

interface AudioPrefs {
  sfx: boolean;
  music: boolean;
}

function loadPrefs(): AudioPrefs {
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { sfx: true, music: true };
}

function savePrefs(prefs: AudioPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

let _prefs: AudioPrefs = loadPrefs();

export function getAudioPrefs(): AudioPrefs {
  return { ..._prefs };
}

export function setSfxEnabled(enabled: boolean) {
  _prefs.sfx = enabled;
  savePrefs(_prefs);
}

export function setMusicEnabled(enabled: boolean) {
  _prefs.music = enabled;
  savePrefs(_prefs);
  if (enabled) {
    startMusic();
  } else {
    stopMusic();
  }
}

// --- Audio Context ---

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// --- Sound Effects ---

export function playMoveSound() {
  if (!_prefs.sfx) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch { /* audio not available */ }
}

export function playUndoSound() {
  if (!_prefs.sfx) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch { /* audio not available */ }
}

export function playWinSound() {
  if (!_prefs.sfx) return;
  try {
    const ctx = getAudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);

      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.4);
    });
  } catch { /* audio not available */ }
}

export function playClickSound() {
  if (!_prefs.sfx) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  } catch { /* audio not available */ }
}

export function playThudSound() {
  if (!_prefs.sfx) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch { /* audio not available */ }
}

// --- Ambient Background Music ---
// A gentle, looping ambient pad with slow-moving chords
// Think: calm puzzle game atmosphere

let musicGainNode: GainNode | null = null;
let musicOscillators: OscillatorNode[] = [];
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicRunning = false;

// Pentatonic-ish chord progressions — peaceful and non-distracting
const CHORDS = [
  [261.63, 329.63, 392.00],  // C  E  G
  [293.66, 369.99, 440.00],  // D  F# A
  [246.94, 311.13, 369.99],  // B  Eb F#
  [220.00, 277.18, 329.63],  // A  C# E
  [261.63, 311.13, 392.00],  // C  Eb G
  [293.66, 349.23, 440.00],  // D  F  A
];

function playChord(ctx: AudioContext, masterGain: GainNode, notes: number[]) {
  // Clean up previous oscillators
  musicOscillators.forEach((osc) => {
    try { osc.stop(); } catch {}
  });
  musicOscillators = [];

  notes.forEach((freq) => {
    // Main tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    // Very gentle detune for warmth
    osc.detune.setValueAtTime(Math.random() * 6 - 3, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 1.5);
    gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 3);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 5.5);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 6);
    musicOscillators.push(osc);

    // Octave-up shimmer (very quiet)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);
    osc2.detune.setValueAtTime(Math.random() * 10 - 5, ctx.currentTime);

    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.linearRampToValueAtTime(0.008, ctx.currentTime + 2);
    gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 5);

    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 5.5);
    musicOscillators.push(osc2);
  });
}

export function startMusic() {
  if (musicRunning || !_prefs.music) return;

  try {
    const ctx = getAudioCtx();
    musicGainNode = ctx.createGain();
    musicGainNode.gain.setValueAtTime(0.6, ctx.currentTime);
    musicGainNode.connect(ctx.destination);

    let chordIdx = 0;
    musicRunning = true;

    // Play first chord immediately
    playChord(ctx, musicGainNode, CHORDS[chordIdx]);
    chordIdx = (chordIdx + 1) % CHORDS.length;

    // Cycle through chords every 5 seconds
    musicInterval = setInterval(() => {
      if (!musicRunning || !musicGainNode) return;
      try {
        playChord(ctx, musicGainNode, CHORDS[chordIdx]);
        chordIdx = (chordIdx + 1) % CHORDS.length;
      } catch {}
    }, 5000);
  } catch { /* audio not available */ }
}

export function stopMusic() {
  musicRunning = false;
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
  musicOscillators.forEach((osc) => {
    try { osc.stop(); } catch {}
  });
  musicOscillators = [];
  if (musicGainNode) {
    try {
      musicGainNode.gain.linearRampToValueAtTime(0, (audioCtx?.currentTime ?? 0) + 0.5);
    } catch {}
    musicGainNode = null;
  }
}
