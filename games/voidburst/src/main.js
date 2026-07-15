import { Game } from './Game.js';
import { UI } from './UI.js';
import { AudioManager } from './audio.js';

async function bootstrap() {
  const host = document.getElementById('canvasHost');
  const audio = new AudioManager();
  const ui = new UI(audio);
  const game = new Game(host, ui, audio);
  await game.init();
  ui.attachGame(game);
  game.goToMenu();

  const kick = () => {
    audio.unlock();
    audio.startMusic();
    window.removeEventListener('pointerdown', kick);
    window.removeEventListener('keydown', kick);
  };
  window.addEventListener('pointerdown', kick);
  window.addEventListener('keydown', kick);
}

bootstrap();
