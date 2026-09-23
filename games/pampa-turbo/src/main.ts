import './styles.css';
import { EngineAudio } from './audio/EngineAudio';
import { PampaTurbo, type HudSnapshot, type RaceResult } from './game/PampaTurbo';
import { InputController } from './game/InputController';
import { dictionaryFor, loadLang, localeFor, saveLang, type Lang } from './i18n';

// ─── language bootstrap ─────────────────────────────────────────────────────
let lang: Lang = loadLang();
let dict = dictionaryFor(lang);

function applyLang(): void {
  const d = dict;
  document.documentElement.lang = lang;
  document.title = d.title;

  // Static text nodes wired by id
  setText('eyebrow-text', d.eyebrow);
  setText('tagline-text', d.tagline);
  setText('pilot-name', d.pilotName);
  setText('pilot-sub', d.pilotSub);
  setText('pilot-quote', d.pilotQuote);
  element<HTMLButtonElement>('start-button').textContent = d.startButton;
  setHTML('controls-copy', d.controlsCopy);
  setText('hud-speed-label', d.hudSpeed);
  setText('hud-timer-label', d.hudTimer);
  setText('hud-score-label', d.hudScore);
  setText('hud-mate-label', d.hudMate);
  setText('pause-eyebrow', d.pauseEyebrow);
  setText('pause-title-text', d.pauseTitle);
  element<HTMLButtonElement>('resume-button').textContent = d.resumeButton;
  element<HTMLButtonElement>('retry-button').textContent = d.retryButton;
  element<HTMLButtonElement>('lang-button').textContent = d.langButtonLabel;

  const backBtn = document.querySelector<HTMLAnchorElement>('.back-button');
  if (backBtn) { backBtn.setAttribute('aria-label', d.backToVoidcade); backBtn.setAttribute('title', d.backToVoidcade); }

  const soundBtn = element<HTMLButtonElement>('sound-button');
  soundBtn.setAttribute('aria-label', muted ? d.soundOff : d.soundOn);
  soundBtn.setAttribute('title', muted ? d.soundOff : d.soundOn);

  // Touch controls
  const left = document.querySelector<HTMLButtonElement>('[data-control="left"]');
  const right = document.querySelector<HTMLButtonElement>('[data-control="right"]');
  const boost = document.querySelector<HTMLButtonElement>('[data-control="boost"]');
  const acc = document.querySelector<HTMLButtonElement>('[data-control="accelerate"]');
  if (left) left.setAttribute('aria-label', d.ariaSteerLeft);
  if (right) right.setAttribute('aria-label', d.ariaSteerRight);
  if (boost) boost.setAttribute('aria-label', d.ariaMateBoost);
  if (acc) acc.textContent = lang === 'en' ? 'GAS' : 'ACELERAR';
  if (acc) acc.setAttribute('aria-label', d.ariaAccelerate);
  element<HTMLButtonElement>('pause-button').setAttribute('aria-label', d.ariaPause);
  element<HTMLElement>('hud').setAttribute('aria-label', d.ariaHud);
  element<HTMLElement>('touch-controls').setAttribute('aria-label', d.ariaTouchControls);
}

function toggleLang(): void {
  lang = lang === 'es' ? 'en' : 'es';
  dict = dictionaryFor(lang);
  saveLang(lang);
  applyLang();
  game.setLanguage(dict, lang);
}

// ─── helpers ────────────────────────────────────────────────────────────────
function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id}`);
  return found as T;
}

function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setHTML(id: string, html: string): void {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ─── DOM refs ────────────────────────────────────────────────────────────────
const host = element<HTMLDivElement>('canvas-host');
const startScreen = element<HTMLElement>('start-screen');
const pauseScreen = element<HTMLElement>('pause-screen');
const resultScreen = element<HTMLElement>('result-screen');
const hud = element<HTMLElement>('hud');
const touchControls = element<HTMLElement>('touch-controls');
const pauseButton = element<HTMLButtonElement>('pause-button');
const soundButton = element<HTMLButtonElement>('sound-button');
const speedValue = element<HTMLElement>('speed-value');
const timeValue = element<HTMLElement>('time-value');
const scoreValue = element<HTMLElement>('score-value');
const mateFill = element<HTMLElement>('mate-fill');
const message = element<HTMLElement>('message');

const input = new InputController();
input.attachTouchControls(touchControls);
const audio = new EngineAudio();
let muted = false;
let messageTimer = 0;

// ─── HUD callbacks ───────────────────────────────────────────────────────────
const updateHud = (snapshot: HudSnapshot): void => {
  speedValue.textContent = Math.round(snapshot.speedKph).toString();
  timeValue.textContent = snapshot.timeLeft.toFixed(1);
  timeValue.classList.toggle('danger', snapshot.timeLeft < 12);
  scoreValue.textContent = Math.round(snapshot.score).toLocaleString(localeFor(lang));
  mateFill.style.width = `${snapshot.mate}%`;
  mateFill.classList.toggle('active', snapshot.boosting);
};

const showMessage = (copy: string): void => {
  window.clearTimeout(messageTimer);
  message.textContent = copy;
  message.classList.remove('show');
  void message.offsetWidth;
  message.classList.add('show');
  messageTimer = window.setTimeout(() => message.classList.remove('show'), 1900);
};

const finishRace = (result: RaceResult): void => {
  hud.classList.add('hidden');
  touchControls.classList.add('hidden');
  pauseButton.classList.add('hidden');
  resultScreen.classList.remove('hidden');

  const bestKey = 'pampa-turbo-best';
  const previousBest = Number(localStorage.getItem(bestKey) ?? 0);
  const best = Math.max(previousBest, Math.round(result.score));
  localStorage.setItem(bestKey, best.toString());

  const locale = localeFor(lang);
  element<HTMLElement>('result-eyebrow').textContent = result.success ? result.route : dict.resultFailEyebrow;
  element<HTMLElement>('result-title').textContent = result.success ? dict.resultSuccessTitle : dict.resultFailTitle;
  element<HTMLElement>('result-copy').textContent = result.success
    ? dict.resultCopySuccess(result.timeLeft.toFixed(1))
    : dict.resultCopyFail;
  element<HTMLElement>('result-score-label').textContent = dict.resultScoreLabel;
  element<HTMLElement>('result-best-label').textContent = dict.resultBestLabel;
  element<HTMLElement>('result-score').textContent = Math.round(result.score).toLocaleString(locale);
  element<HTMLElement>('best-score').textContent = best.toLocaleString(locale);
};

// ─── game instance ───────────────────────────────────────────────────────────
const game = new PampaTurbo(host, input, audio, {
  onHud: updateHud,
  onMessage: showMessage,
  onEnd: finishRace,
}, dict, lang);

// ─── screen transitions ───────────────────────────────────────────────────────
const enterRace = (): void => {
  startScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  resultScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  touchControls.classList.remove('hidden');
  pauseButton.classList.remove('hidden');
  void audio.unlock();
  game.start();
};

const pauseRace = (): void => {
  if (!game.isPlaying) return;
  game.pause();
  input.reset();
  pauseScreen.classList.remove('hidden');
  touchControls.classList.add('hidden');
  pauseButton.classList.add('hidden');
};

const resumeRace = (): void => {
  pauseScreen.classList.add('hidden');
  touchControls.classList.remove('hidden');
  pauseButton.classList.remove('hidden');
  void audio.unlock();
  game.resume();
};

// ─── button wiring ────────────────────────────────────────────────────────────
element<HTMLButtonElement>('start-button').addEventListener('click', enterRace);
element<HTMLButtonElement>('retry-button').addEventListener('click', enterRace);
element<HTMLButtonElement>('resume-button').addEventListener('click', resumeRace);
pauseButton.addEventListener('click', pauseRace);
element<HTMLButtonElement>('lang-button').addEventListener('click', toggleLang);

soundButton.addEventListener('click', () => {
  muted = !muted;
  audio.setMuted(muted);
  soundButton.textContent = muted ? '×' : '♪';
  soundButton.setAttribute('aria-label', muted ? dict.soundOff : dict.soundOn);
});

window.addEventListener('keydown', (event) => {
  if ((event.code === 'Escape' || event.code === 'KeyP') && game.isPlaying) pauseRace();
  else if ((event.code === 'Escape' || event.code === 'KeyP') && game.isPaused) resumeRace();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.isPlaying) pauseRace();
});

// ─── boot ─────────────────────────────────────────────────────────────────────
applyLang();
