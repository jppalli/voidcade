// Latin only: the game is US English, so the other subsets are dead weight.
import '@fontsource/cabin-sketch/latin-700.css';
import '@fontsource/patrick-hand/latin-400.css';

import { createPlatform, type Platform } from './platform/platform';
import { initStorage, resyncStorage, setSignedOut } from './platform/storage';
import { initSound, playErase, playHit, playLose, playMiss, playTap, playWin, resumeSound, setSound, soundOn, suspendSound } from './audio/sound';
import { ENDLESS_POOL, LEVELS, TOTAL_LEVELS, WORLDS, replacementFor, type Entry } from './game/words';
import { MAX_MISSES, Round } from './game/round';
import { bestEndless, loadProgress, nextLevel, recordSolve, saveBestEndless, saveProgress, solvedCount, starCount, type Progress } from './game/progress';
import { freeHintsLeft, useFreeHint } from './game/hints';
import { drawingLost, drawingWon, mountDrawing, resetDrawing, setParts } from './ui/drawing';
import { wipeBusy, wipeTo } from './ui/wipe';

type Screen = 'title' | 'map' | 'game';
type Mode = { kind: 'level'; index: number } | { kind: 'endless' };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

let platform: Platform;
let subscriber = false;
let progress: Progress;
let round: Round | null = null;
let mode: Mode = { kind: 'level', index: 0 };
/** Board input is closed (round over, modal up, ad playing). */
let locked = false;
let adPlaying = false;
/** Answers already shown this session, so a retry never repeats one. */
const seen = new Set<string>();

// Endless run
let score = 0;
let streak = 0;
let solvedInRun = 0;
let runRevived = false;
const usedInRun = new Set<string>();

// ---------------------------------------------------------------- screens

function show(screen: Screen) {
  (['title', 'map', 'game'] as Screen[]).forEach((s) => $(`screen-${s}`).classList.toggle('hidden', s !== screen));
  if (screen === 'title') renderTitle();
  if (screen === 'map') renderMap();
  hideOverlays();
}

/** Every navigation goes through the eraser wipe. */
function go(swap: () => void) { void wipeTo(swap); }

function hideOverlays() {
  ['winOverlay', 'loseOverlay'].forEach((id) => $(id).classList.add('hidden'));
}

function refreshSoundButtons() {
  document.querySelectorAll<HTMLElement>('[data-sound]').forEach((b) => {
    b.querySelector('use')?.setAttribute('href', soundOn() ? '#i-sound-on' : '#i-sound-off');
    b.setAttribute('aria-label', soundOn() ? 'Sound on' : 'Sound off');
    b.setAttribute('aria-pressed', String(soundOn()));
  });
}

// ---------------------------------------------------------------- title

function renderTitle() {
  const done = solvedCount(progress);
  const next = nextLevel(progress);
  const all = done >= TOTAL_LEVELS;
  $('playLabel').textContent = done === 0 ? 'Play' : all ? 'Play again' : `Level ${next + 1}`;
  const best = bestEndless();
  $('bestLine').textContent = best ? `Endless best: ${best.toLocaleString('en-US')}` : '';
}

// ---------------------------------------------------------------- level map

function starsHtml(n: number, size = 14) {
  return [0, 1, 2].map((i) =>
    `<svg class="star${i < n ? ' on' : ''}" width="${size}" height="${size}" aria-hidden="true"><use href="#i-star"/></svg>`).join('');
}

function renderMap() {
  $('mapStars').textContent = `${starCount(progress)} / ${TOTAL_LEVELS * 3} stars`;
  const next = nextLevel(progress);
  const host = $('worlds');
  host.innerHTML = '';
  let offset = 0;
  WORLDS.forEach((w, wi) => {
    const sec = document.createElement('section');
    sec.className = 'world';
    sec.style.setProperty('--board', w.board);
    const first = offset;
    const open = progress.unlocked >= first;
    sec.innerHTML = `<div class="worldHead"><span class="worldNum">Lesson ${wi + 1}</span><h3>${w.name}</h3><p>${open ? w.blurb : 'Finish the lesson before to open this one.'}</p></div>
      <div class="levelGrid"></div>`;
    const grid = sec.querySelector('.levelGrid')!;
    w.levels.forEach((_, li) => {
      const index = first + li;
      const stars = progress.stars[index] ?? 0;
      const unlocked = index <= progress.unlocked;
      const b = document.createElement('button');
      b.className = `levelBtn${stars ? ' done' : ''}${index === next && unlocked ? ' next' : ''}${unlocked ? '' : ' locked'}`;
      b.disabled = !unlocked;
      b.setAttribute('aria-label', unlocked ? `Level ${index + 1}${stars ? `, ${stars} stars` : ''}` : `Level ${index + 1}, locked`);
      b.innerHTML = unlocked
        ? `<span class="lvNum">${index + 1}</span><span class="lvStars">${starsHtml(stars, 12)}</span>`
        : `<svg class="icon"><use href="#i-lock"/></svg>`;
      if (unlocked) b.addEventListener('click', () => { playTap(); go(() => startLevel(index)); });
      grid.appendChild(b);
    });
    host.appendChild(sec);
    offset += w.levels.length;
  });
  requestAnimationFrame(() => host.querySelector('.levelBtn.next')?.scrollIntoView({ block: 'center' }));
}

// ---------------------------------------------------------------- rounds

let activeLevel: number | null = null;

function endActiveLevel() {
  if (activeLevel !== null) platform.levelEnd(activeLevel);
  activeLevel = null;
}

function startLevel(index: number, entry?: Entry) {
  const ref = LEVELS[index];
  if (!ref) return;
  mode = { kind: 'level', index };
  show('game');
  endActiveLevel();
  platform.gameStart();
  activeLevel = index + 1;
  platform.levelStart(activeLevel);
  const w = WORLDS[ref.world];
  $('gameTitle').textContent = `Level ${index + 1}`;
  $('gameSub').textContent = w.name;
  $('screen-game').style.setProperty('--board', w.board);
  beginRound(entry ?? ref.entry);
  // First word ever: one short line under the word, never a pop-up.
  const firstTime = index === 0 && !progress.stars[0];
  $('coachLine').textContent = 'Tap a letter to guess. Six wrong letters and the drawing is done.';
  $('coachLine').classList.toggle('hidden', !firstTime);
}

function startEndless() {
  mode = { kind: 'endless' };
  show('game');
  endActiveLevel();
  platform.gameStart();
  score = 0; streak = 0; solvedInRun = 0; runRevived = false;
  usedInRun.clear();
  $('screen-game').style.setProperty('--board', '#33333d');
  $('coachLine').classList.add('hidden');
  nextEndlessWord();
}

/** Words get harder as the run goes: the pick window slides along the
 *  pool (easiest first) over about 40 words. */
function nextEndlessWord() {
  const n = ENDLESS_POOL.length;
  const centre = Math.min(n - 1, Math.floor((solvedInRun / 40) * n));
  const lo = Math.max(0, centre - 20), hi = Math.min(n, centre + 20);
  let options = ENDLESS_POOL.slice(lo, hi).filter((x) => !usedInRun.has(x.text));
  if (!options.length) options = ENDLESS_POOL.filter((x) => !usedInRun.has(x.text));
  if (!options.length) { usedInRun.clear(); options = ENDLESS_POOL; }
  const entry = options[Math.floor(Math.random() * options.length)];
  usedInRun.add(entry.text);
  refreshEndlessHeader();
  beginRound(entry);
}

function refreshEndlessHeader() {
  $('gameTitle').textContent = `Score ${score.toLocaleString('en-US')}`;
  $('gameSub').textContent = `Endless · Word ${solvedInRun + 1}${streak > 1 ? ` · Streak ×${streak}` : ''}`;
}

function beginRound(entry: Entry) {
  round = new Round(entry);
  seen.add(entry.text);
  locked = false;
  hideOverlays();
  $('category').textContent = entry.category;
  resetDrawing();
  renderPhrase();
  renderKeyboard();
  renderStatus();
  fitPhrase();
}

// ---------------------------------------------------------------- rendering

function renderPhrase(revealAll = false) {
  const r = round!;
  const host = $('phrase');
  host.innerHTML = '';
  for (const word of r.entry.text.split(' ')) {
    const w = document.createElement('span');
    w.className = 'word';
    for (const ch of word) {
      const t = document.createElement('span');
      if (!/[A-Z]/.test(ch)) {
        t.className = 'tile punct';
        t.textContent = ch;
      } else {
        const shown = r.isRevealed(ch);
        t.className = `tile${shown ? ' shown' : ''}${!shown && revealAll ? ' missed' : ''}${r.hinted.has(ch) ? ' hinted' : ''}`;
        t.dataset.ch = ch;
        t.textContent = shown || revealAll ? ch : '';
      }
      w.appendChild(t);
    }
    host.appendChild(w);
  }
  host.setAttribute('aria-label', r.entry.text.split('').map((ch) => (/[A-Z]/.test(ch) && !r.isRevealed(ch) && !revealAll ? 'blank' : ch)).join(' '));
}

/** Tiles shrink to fit the longest word on one line. */
function fitPhrase() {
  const host = $('phrase');
  const words = round!.entry.text.split(' ');
  const longest = Math.max(...words.map((w) => w.length));
  const room = (host.clientWidth || 320) - 4;
  // A tile is about 1.14 x --tile wide (with its gap); word gaps are 0.7 x.
  const perWord = Math.floor(room / (longest * 1.14));
  const total = words.reduce((n, w) => n + w.length, 0);
  const oneLine = Math.floor(room / (total * 1.14 + (words.length - 1) * 0.7));
  // Keep the whole phrase on one line if it still reads well, else one word per line.
  const size = Math.max(20, Math.min(46, oneLine >= 30 ? oneLine : perWord));
  host.style.setProperty('--tile', `${size}px`);
}

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function renderKeyboard() {
  const host = $('keyboard');
  host.innerHTML = ROWS.map((row) => `<div class="kRow">${[...row].map((k) =>
    `<button class="key" data-k="${k}" aria-label="${k}">${k}</button>`).join('')}</div>`).join('');
}

function markKey(ch: string, state: 'hit' | 'miss') {
  const k = document.querySelector<HTMLButtonElement>(`.key[data-k="${ch}"]`);
  if (!k) return;
  k.classList.add(state);
  k.disabled = true;
  k.setAttribute('aria-label', `${ch}, ${state === 'hit' ? 'in the word' : 'not in the word'}`);
}

function renderStatus() {
  const r = round!;
  // Lines shown = misses, minus any rubbed out by a second chance.
  setParts(MAX_MISSES - r.missesLeft);
  $('misses').innerHTML = Array.from({ length: MAX_MISSES }, (_, i) =>
    `<i class="tally${i < r.missesLeft ? ' left' : ''}"></i>`).join('');
  const label = `${r.missesLeft} ${r.missesLeft === 1 ? 'miss' : 'misses'} left`;
  $('misses').setAttribute('aria-label', label);
  $('misses').title = label;
  refreshHintBadge();
}

function refreshHintBadge() {
  const free = freeHintsLeft();
  const badge = $('hintBadge');
  if (subscriber) { badge.textContent = ''; badge.classList.add('hidden'); return; }
  badge.classList.remove('hidden');
  badge.innerHTML = free > 0 ? String(free) : '<svg class="icon"><use href="#i-video"/></svg>';
  $('btnHint').setAttribute('aria-label', free > 0 ? `Hint, ${free} free today` : 'Hint, watch a video');
}

// ---------------------------------------------------------------- guessing

function guess(ch: string) {
  if (!round || locked || adPlaying || wipeBusy()) return;
  const r = round;
  const res = r.guess(ch);
  if (res === 'repeat') return;
  $('coachLine').classList.add('hidden');
  if (res === 'hit') {
    const count = [...r.entry.text].filter((c) => c === ch).length;
    markKey(ch, 'hit');
    renderPhrase();
    document.querySelectorAll<HTMLElement>(`.tile[data-ch="${ch}"]`).forEach((t, i) => {
      t.style.animationDelay = `${i * 60}ms`;
      t.classList.add('pop');
    });
    playHit(count);
  } else {
    markKey(ch, 'miss');
    playMiss();
    $('phrase').classList.remove('shake');
    void $('phrase').offsetWidth;
    $('phrase').classList.add('shake');
  }
  renderStatus();
  if (r.solved) onSolved();
  else if (r.lost) onLost();
}

async function onHint() {
  if (!round || locked || adPlaying || round.over) return;
  playTap();
  if (!subscriber && !useFreeHint()) {
    const ok = await earnReward();
    if (!ok || !round || round.over) return;
  }
  const ch = round.hint();
  if (!ch) return;
  markKey(ch, 'hit');
  renderPhrase();
  document.querySelectorAll<HTMLElement>(`.tile[data-ch="${ch}"]`).forEach((t) => t.classList.add('pop'));
  playHit(1);
  renderStatus();
  if (round.solved) onSolved();
}

// ---------------------------------------------------------------- round end

function onSolved() {
  const r = round!;
  locked = true;
  drawingWon();
  setTimeout(playWin, 180);
  if (mode.kind === 'endless') {
    const clean = r.misses <= 1 && !r.hinted.size;
    streak = clean ? streak + 1 : 0;
    const mult = 1 + 0.25 * Math.min(Math.max(streak - 1, 0), 8);
    const pts = Math.round((50 + 10 * r.letters.size + 20 * r.missesLeft) * mult);
    score += pts;
    solvedInRun++;
    platform.score(score);
    refreshEndlessHeader();
    toast(`+${pts}${mult > 1 ? `  (streak ×${mult.toFixed(2).replace(/\.?0+$/, '')})` : ''}`);
    setTimeout(() => {
      if (mode.kind !== 'endless' || round !== r) return;
      void maybeInterstitial().then(() => {
        if (mode.kind !== 'endless' || round !== r) return;
        playErase();
        go(() => nextEndlessWord());
      });
    }, 1600);
    return;
  }
  const index = mode.index;
  const stars = r.stars;
  progress = recordSolve(progress, index, stars);
  saveProgress(progress);
  endActiveLevel();
  setTimeout(() => {
    if (round !== r) return;
    $('winTitle').textContent = stars === 3 ? 'Perfect!' : 'Solved!';
    $('winStars').innerHTML = starsHtml(stars, 40);
    $('winAnswer').textContent = r.entry.text;
    $('winText').textContent = stars === 3
      ? 'Not a single line wasted. Nicely done.'
      : r.hinted.size || r.revived
        ? 'Solved with a little help. Try it clean for 3 stars.'
        : `${r.misses} ${r.misses === 1 ? 'miss' : 'misses'}. Solve with one miss or fewer for 3 stars.`;
    const last = index >= TOTAL_LEVELS - 1;
    $('btnWinNext').textContent = last ? 'Play Endless' : 'Next level';
    $('winOverlay').classList.remove('hidden');
  }, 1300);
}

function onLost() {
  const r = round!;
  locked = true;
  drawingLost();
  setTimeout(playLose, 200);
  setTimeout(() => {
    if (round !== r) return;
    renderPhrase(true);
    const canRevive = mode.kind === 'level' ? !r.revived : !runRevived;
    $('btnRevive').classList.toggle('hidden', !canRevive);
    ($('btnRevive') as HTMLButtonElement).disabled = false;
    $('reviveLabel').textContent = subscriber ? 'Keep going (one more guess)' : 'Watch a video for one more guess';
    $('btnRetry').classList.toggle('primary', !canRevive);
    if (mode.kind === 'level') {
      $('loseTitle').textContent = 'So close!';
      $('loseText').textContent = canRevive
        ? 'Get one more guess on this word, or try a new word of the same level.'
        : 'Try a new word of the same level.';
      $('loseAnswer').textContent = '';
      $('loseAnswer').classList.add('hidden');
      $('btnRetry').textContent = 'Try another word';
      $('btnLoseMenu').textContent = 'Levels';
    } else {
      const best = bestEndless();
      $('loseTitle').textContent = 'Run over';
      $('loseText').textContent = `Score ${score.toLocaleString('en-US')} · ${solvedInRun} ${solvedInRun === 1 ? 'word' : 'words'} solved${score > best ? ' · New best!' : best ? ` · Best ${best.toLocaleString('en-US')}` : ''}`;
      $('loseAnswer').classList.add('hidden');
      $('btnRetry').textContent = 'Play again';
      $('btnLoseMenu').textContent = 'Menu';
      // The score can only grow from here (a second chance), so save it now.
      finishEndlessRun();
    }
    $('loseOverlay').classList.remove('hidden');
  }, 1100);
}

/** The run is really over (no second chance left, or the player moves on). */
function finishEndlessRun() {
  if (saveBestEndless(score)) renderTitle();
}

async function onRevive() {
  const r = round;
  if (!r || adPlaying) return;
  const btn = $('btnRevive') as HTMLButtonElement;
  btn.disabled = true;
  const ok = await earnReward();
  btn.disabled = false;
  if (!ok || round !== r) {
    $('loseText').textContent = 'The video didn’t finish, so no extra guess this time.';
    return;
  }
  if (mode.kind === 'endless') runRevived = true;
  r.revive();
  locked = false;
  $('loseOverlay').classList.add('hidden');
  renderPhrase();
  renderStatus();
  playErase();
}

function onRetry() {
  playTap();
  if (mode.kind === 'endless') {
    finishEndlessRun();
    go(() => { hideOverlays(); startEndless(); });
    return;
  }
  const index = mode.index;
  const fresh = replacementFor(LEVELS[index].entry, seen);
  go(() => { hideOverlays(); startLevel(index, fresh); });
}

function leaveGame(to: Screen) {
  // Quitting a run mid-word still keeps what was scored so far.
  if (mode.kind === 'endless') finishEndlessRun();
  endActiveLevel();
  round = null;
  go(() => show(to));
}

// ---------------------------------------------------------------- ads

const INTERSTITIAL_GAP_MS = 5 * 60_000;
let lastAdAt = Date.now();

async function earnReward(): Promise<boolean> {
  if (subscriber) return true;
  adPlaying = true;
  suspendSound();
  try {
    const ok = await platform.showRewardAd();
    if (ok) lastAdAt = Date.now();
    return ok;
  } finally {
    adPlaying = false;
    resumeSound();
  }
}

async function maybeInterstitial() {
  if (subscriber || Date.now() - lastAdAt < INTERSTITIAL_GAP_MS) return;
  adPlaying = true;
  suspendSound();
  try {
    await platform.showInterstitialAd();
    lastAdAt = Date.now();
  } finally {
    adPlaying = false;
    resumeSound();
  }
}

// ---------------------------------------------------------------- bits

let toastTimer: number | null = null;
function toast(text: string) {
  const t = $('toast');
  t.textContent = text;
  t.classList.remove('hidden', 'show');
  void t.offsetWidth;
  t.classList.add('show');
  if (toastTimer !== null) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.add('hidden'), 1500);
}

let afterHowTo: (() => void) | null = null;
function openHowTo(then?: () => void) {
  afterHowTo = then ?? null;
  $('howToOverlay').classList.remove('hidden');
  $('btnHowToClose').focus();
}

function play() {
  playTap();
  const start = () => go(() => startLevel(nextLevel(progress)));
  if (!progress.seenHowTo) {
    progress = { ...progress, seenHowTo: true };
    saveProgress(progress);
    openHowTo(start);
  } else start();
}

// ---------------------------------------------------------------- boot

function wire() {
  $('btnPlay').addEventListener('click', play);
  $('btnLevels').addEventListener('click', () => { playTap(); go(() => show('map')); });
  $('btnEndless').addEventListener('click', () => { playTap(); go(startEndless); });
  $('btnHowTo').addEventListener('click', () => { playTap(); openHowTo(); });
  $('btnHowToClose').addEventListener('click', () => {
    playTap();
    $('howToOverlay').classList.add('hidden');
    const then = afterHowTo; afterHowTo = null; then?.();
  });
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((b) =>
    b.addEventListener('click', () => { playTap(); go(() => show(b.dataset.nav as Screen)); }));
  document.querySelectorAll<HTMLElement>('[data-sound]').forEach((b) =>
    b.addEventListener('click', () => { setSound(!soundOn()); refreshSoundButtons(); playTap(); }));

  $('btnGameBack').addEventListener('click', () => { playTap(); leaveGame(mode.kind === 'endless' ? 'title' : 'map'); });
  $('keyboard').addEventListener('click', (e) => {
    const k = (e.target as HTMLElement).closest<HTMLButtonElement>('.key');
    if (k?.dataset.k) guess(k.dataset.k);
  });
  $('btnHint').addEventListener('click', () => void onHint());

  $('btnWinNext').addEventListener('click', async () => {
    if (adPlaying || mode.kind !== 'level') return;
    playTap();
    $('winOverlay').classList.add('hidden');
    await maybeInterstitial();
    const next = mode.index + 1;
    go(() => { if (next < TOTAL_LEVELS) startLevel(next); else startEndless(); });
  });
  $('btnWinLevels').addEventListener('click', async () => {
    if (adPlaying) return;
    playTap();
    $('winOverlay').classList.add('hidden');
    await maybeInterstitial();
    leaveGame('map');
  });
  $('btnRevive').addEventListener('click', () => { playTap(); void onRevive(); });
  $('btnRetry').addEventListener('click', onRetry);
  $('btnLoseMenu').addEventListener('click', () => { playTap(); leaveGame(mode.kind === 'endless' ? 'title' : 'map'); });

  // Physical keyboard: letters guess, Escape closes How to Play.
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' && !$('howToOverlay').classList.contains('hidden')) { $('btnHowToClose').click(); return; }
    if ($('screen-game').classList.contains('hidden')) return;
    if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); guess(e.key.toUpperCase()); }
  });
  window.addEventListener('resize', () => { if (round) fitPhrase(); });

  platform.onPause(suspendSound);
  platform.onResume(resumeSound);
  document.addEventListener('visibilitychange', () => (document.hidden ? suspendSound() : resumeSound()));
  platform.onAuthChange((signedIn) => {
    if (!signedIn) { setSignedOut(); return; }
    void (async () => {
      await resyncStorage();
      progress = loadProgress();
      subscriber = await platform.isSubscriber();
      refreshSoundButtons();
      if (!$('screen-title').classList.contains('hidden')) renderTitle();
      if (!$('screen-map').classList.contains('hidden')) renderMap();
      if (round) refreshHintBadge();
    })();
  });
}

async function boot() {
  platform = await createPlatform();
  await initStorage(platform);
  initSound();
  progress = loadProgress();
  subscriber = await platform.isSubscriber().catch(() => false);
  mountDrawing($('drawWrap'));
  // A small free stick figure decorates the title.
  $('titleArt').innerHTML = `<svg viewBox="0 0 120 120" aria-hidden="true"><g filter="url(#chalk)" fill="none" stroke="#f4f1e8" stroke-width="4.5" stroke-linecap="round">
    <circle cx="60" cy="26" r="13"/><path d="M53 27 Q60 33 67 27"/><path d="M60 39v38M60 52l-20-18M60 52l20-18M60 77l-14 32M60 77l14 32"/></g></svg>`;
  refreshSoundButtons();
  wire();
  show('title');
  platform.ready();
}

void boot();
