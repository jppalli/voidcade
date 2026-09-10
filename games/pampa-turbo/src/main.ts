import './styles.css';
import { EngineAudio } from './audio/EngineAudio';
import { PampaTurbo, type HudSnapshot, type RaceResult } from './game/PampaTurbo';
import { InputController } from './game/InputController';

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id}`);
  return found as T;
}

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

const updateHud = (snapshot: HudSnapshot): void => {
  speedValue.textContent = Math.round(snapshot.speedKph).toString();
  timeValue.textContent = snapshot.timeLeft.toFixed(1);
  timeValue.classList.toggle('danger', snapshot.timeLeft < 12);
  scoreValue.textContent = Math.round(snapshot.score).toLocaleString('es-AR');
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

  element<HTMLElement>('result-eyebrow').textContent = result.success ? `Ruta ${result.route}` : 'La provoleta no perdona';
  element<HTMLElement>('result-title').textContent = result.success ? '¡LLEGASTE!' : '¡SE ENFRIÓ!';
  element<HTMLElement>('result-copy').textContent = result.success
    ? `Franquito llegó con ${result.timeLeft.toFixed(1)} segundos de sobra. El aplauso fue casi tan fuerte como el escape.`
    : 'El asado sigue ahí, pero tu dignidad quedó unos kilómetros atrás. Otra vuelta lo arregla.';
  element<HTMLElement>('result-score').textContent = Math.round(result.score).toLocaleString('es-AR');
  element<HTMLElement>('best-score').textContent = best.toLocaleString('es-AR');
};

const game = new PampaTurbo(host, input, audio, {
  onHud: updateHud,
  onMessage: showMessage,
  onEnd: finishRace,
});

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

element<HTMLButtonElement>('start-button').addEventListener('click', enterRace);
element<HTMLButtonElement>('retry-button').addEventListener('click', enterRace);
element<HTMLButtonElement>('resume-button').addEventListener('click', resumeRace);
pauseButton.addEventListener('click', pauseRace);
soundButton.addEventListener('click', () => {
  muted = !muted;
  audio.setMuted(muted);
  soundButton.textContent = muted ? '×' : '♪';
  soundButton.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar sonido');
});

window.addEventListener('keydown', (event) => {
  if ((event.code === 'Escape' || event.code === 'KeyP') && game.isPlaying) pauseRace();
  else if ((event.code === 'Escape' || event.code === 'KeyP') && game.isPaused) resumeRace();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.isPlaying) pauseRace();
});
