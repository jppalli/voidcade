// Latin only: the game is US English, so the other subsets are dead weight.
import '@fontsource/cabin-sketch/latin-700.css';
import '@fontsource/patrick-hand/latin-400.css';

import { createPlatform, type Platform } from './platform/platform';
import { initStorage, resyncStorage, setSignedOut } from './platform/storage';
import { initSound, musicOn, playErase, playHit, playLose, playMiss, playStar, playTap, playWin, playWordDone, resumeSound, setMusic, setSound, soundOn, startMusic, suspendSound } from './audio/sound';
import { levelDone, wordDone } from './ui/celebrate';
import { setDoodles } from './ui/doodles';
import { initStage, isStaged, stageHeight, stageWidth, toStage } from './ui/stage';
import { ENDLESS_POOL, LEVELS, TOTAL_LEVELS, WORDS_PER_LEVEL, WORLDS, levelStars, pickLevelWords, type Entry } from './game/words';
import { MAX_MISSES, Round } from './game/round';
import { bestEndless, loadProgress, nextLevel, recordSolve, saveBestEndless, saveProgress, solvedCount, starCount, type Progress } from './game/progress';
import { freeHintsLeft, useFreeHint } from './game/hints';
import { currentStreak, dailyEntry, dayNumber, finishDaily, loadDaily, msUntilNext, saveDaily, type DailyState } from './game/daily';
import { drawingLost, drawingWon, mountDrawing, resetDrawing, setParts } from './ui/drawing';
import { wipeBusy, wipeTo } from './ui/wipe';

type Screen = 'title' | 'map' | 'game';
type Mode = { kind: 'level'; index: number } | { kind: 'endless' } | { kind: 'daily'; day: number };

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

// Level session: five words on one topic.
let levelWords: Entry[] = [];
let wordIndex = 0;
let levelMisses = 0;
let levelHelped = false;

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
  ['winOverlay', 'loseOverlay', 'dailyOverlay'].forEach((id) => $(id).classList.add('hidden'));
}

function refreshSoundButtons() {
  const any = soundOn() || musicOn();
  $('btnMusic').setAttribute('aria-checked', String(musicOn()));
  $('btnSfx').setAttribute('aria-checked', String(soundOn()));
  document.querySelectorAll<HTMLElement>('[data-sound]').forEach((b) => {
    b.querySelector('use')?.setAttribute('href', any ? '#i-sound-on' : '#i-sound-off');
    b.setAttribute('aria-label', 'Sound settings');
    b.setAttribute('aria-haspopup', 'dialog');
  });
}

// ---------------------------------------------------------------- title

/** Shrink the title stage to fit short embeds (never enlarge it). */
function fitTitle() {
  const screen = $('screen-title');
  const stage = screen.querySelector<HTMLElement>('.titleStage');
  if (!stage || screen.classList.contains('hidden')) return;
  stage.style.setProperty('--fit', '1');
  const fit = Math.min(1, (screen.clientHeight - 2 * 66) / stage.offsetHeight, (screen.clientWidth - 16) / stage.offsetWidth);
  stage.style.setProperty('--fit', fit.toFixed(3));
}

function renderTitle() {
  requestAnimationFrame(fitTitle);
  const done = solvedCount(progress);
  const next = nextLevel(progress);
  const all = done >= TOTAL_LEVELS;
  $('playLabel').textContent = done === 0 ? 'Play' : all ? 'Play again' : `Level ${next + 1}`;
  const best = bestEndless();
  const stars = starCount(progress);
  setRecord('btnLevels', 'levelsRec', 'Levels', stars ? `<svg class="icon" aria-hidden="true"><use href="#i-star"/></svg>${stars}<small>/${TOTAL_LEVELS * 3}</small>` : '', `${stars} of ${TOTAL_LEVELS * 3} stars`);
  setRecord('btnEndless', 'endlessRec', 'Endless', best ? `<small>Best</small>${best.toLocaleString('en-US')}` : '', `best score ${best.toLocaleString('en-US')}`);
  renderDailyTag();
}

/** A mode button's record line (hidden until there is one to show). */
function setRecord(btnId: string, recId: string, name: string, html: string, spoken: string) {
  const rec = $(recId);
  rec.innerHTML = html;
  rec.classList.toggle('hidden', !html);
  $(btnId).setAttribute('aria-label', html ? `${name}, ${spoken}` : name);
}

/** "Done" once today's word is finished, otherwise the streak (if any). */
function renderDailyTag() {
  const d = loadDaily();
  const streak = currentStreak(d);
  const tag = $('dailyTag');
  const btn = $('btnDaily');
  btn.classList.toggle('done', !!d.result);
  if (d.result) {
    tag.innerHTML = `<svg class="icon"><use href="#i-check"/></svg>${streak ? `<svg class="icon"><use href="#i-flame"/></svg>${streak}` : 'Done'}`;
  } else if (streak) {
    tag.innerHTML = `<svg class="icon"><use href="#i-flame"/></svg>${streak}`;
  } else {
    tag.innerHTML = 'New';
  }
  tag.classList.remove('hidden');
  btn.setAttribute('aria-label', `Daily Word, ${d.result ? 'done for today' : 'new word today'}${streak ? `, ${streak}-day streak` : ''}`);
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
    sec.innerHTML = `<div class="worldHead"><span class="worldNum">Lesson ${wi + 1}</span><h3>${w.name}</h3><p>${open ? w.blurb : `Finish ${WORLDS[wi - 1]?.name ?? 'the lesson before'} to open this one.`}</p></div>
      <div class="levelGrid"></div>`;
    const grid = sec.querySelector('.levelGrid')!;
    w.levels.forEach((_, li) => {
      const index = first + li;
      const stars = progress.stars[index] ?? 0;
      const unlocked = index <= progress.unlocked;
      const b = document.createElement('button');
      b.className = `levelBtn${stars ? ' done' : ''}${index === next && unlocked ? ' next' : ''}${unlocked ? '' : ' locked'}`;
      b.disabled = !unlocked;
      const name = w.levels[li].name;
      b.setAttribute('aria-label', unlocked ? `Level ${index + 1}, ${name}${stars ? `, ${stars} stars` : ''}` : `Level ${index + 1}, locked`);
      // The topic stays a surprise until the level is open.
      b.innerHTML = unlocked
        ? `<span class="lvNum">${index + 1}</span><span class="lvTopic">${name}</span><span class="lvStars">${starsHtml(stars, 18)}</span>`
        : `<span class="lvNum">${index + 1}</span><svg class="icon"><use href="#i-lock"/></svg>`;
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

function startLevel(index: number) {
  const ref = LEVELS[index];
  if (!ref) return;
  mode = { kind: 'level', index };
  show('game');
  endActiveLevel();
  platform.gameStart();
  activeLevel = index + 1;
  platform.levelStart(activeLevel);
  const w = WORLDS[ref.world];
  levelWords = pickLevelWords(ref.topic, seen);
  wordIndex = 0;
  levelMisses = 0;
  levelHelped = false;
  $('gameTitle').textContent = `Level ${index + 1}`;
  fitGameTitle();
  $('screen-game').style.setProperty('--board', w.board);
  setDoodles($('gameDoodles'), w.id);
  startLevelWord();
  // First word ever: one short line under the word, never a pop-up.
  const firstTime = index === 0 && !progress.stars[0];
  $('coachLine').textContent = 'Tap a letter to guess. Six wrong letters and the drawing is done.';
  $('coachLine').classList.toggle('hidden', !firstTime);
}

/** The current word of the level (the drawing starts fresh for each one). */
function startLevelWord() {
  beginRound(levelWords[wordIndex]);
  renderLevelHeader();
}

/** "Word 2 of 5" with a dot per word: done, current, still to come. */
/** `solvedCurrent`: the word on the board is solved (its dot turns green)
 *  but the next one hasn't appeared yet, so the label stays on this word. */
function renderLevelHeader(solvedCurrent = false) {
  const done = wordIndex + (solvedCurrent ? 1 : 0);
  const complete = done >= WORDS_PER_LEVEL;
  const dots = Array.from({ length: WORDS_PER_LEVEL }, (_, i) =>
    `<i class="wDot${i < done ? ' done' : i === wordIndex ? ' now' : ''}"></i>`).join('');
  $('gameSub').innerHTML = `<span class="wDots" aria-hidden="true">${dots}</span>${complete ? 'All words solved' : `Word ${wordIndex + 1} of ${WORDS_PER_LEVEL}`}`;
}

function startEndless() {
  mode = { kind: 'endless' };
  show('game');
  endActiveLevel();
  platform.gameStart();
  score = 0; streak = 0; solvedInRun = 0; runRevived = false;
  usedInRun.clear();
  $('screen-game').style.setProperty('--board', '#33333d');
  setDoodles($('gameDoodles'), 'endless');
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
  fitGameTitle();
}

/** The title keeps its full size unless a long one (a big Endless score on
 *  a narrow phone) would be cut off; then it steps down just enough. */
function fitGameTitle() {
  const h = $('gameTitle');
  h.style.fontSize = '';
  if (!h.clientWidth) return; // hidden: nothing to measure
  let px = parseFloat(getComputedStyle(h).fontSize);
  while (h.scrollWidth > h.clientWidth && px > 20) {
    px -= 1;
    h.style.fontSize = `${px}px`;
  }
}

// ---------------------------------------------------------------- daily word

let daily: DailyState = loadDaily();

function startDaily() {
  const day = dayNumber();
  daily = loadDaily(day);
  if (daily.result) { show('title'); openDailyResult(false); return; }
  mode = { kind: 'daily', day };
  show('game');
  endActiveLevel();
  platform.gameStart();
  $('screen-game').style.setProperty('--board', '#3a3a52');
  setDoodles($('gameDoodles'), 'daily');
  $('coachLine').classList.add('hidden');
  beginRound(dailyEntry(day));
  // Pick up where the player left off today.
  const r = round!;
  for (const m of daily.moves) {
    if (m === '+') r.revive();
    else if (m[0] === '*') { r.guessed.add(m[1]); r.hinted.add(m[1]); }
    else r.guess(m);
  }
  r.guessed.forEach((ch) => markKey(ch, r.letters.has(ch) ? 'hit' : 'miss'));
  renderPhrase();
  renderStatus();
  refreshDailyHeader();
  if (daily.moves.length && !r.over) toast('Welcome back!');
  if (r.solved) onSolved();
  else if (r.lost) onLost();
}

function refreshDailyHeader() {
  const streak = currentStreak(daily);
  // Short date, so "date · Streak N" stays on one line on phones.
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  $('gameTitle').textContent = `Daily Word #${daily.day}`;
  $('gameSub').textContent = streak ? `${date} · Streak ${streak}` : date;
  fitGameTitle();
}

/** Save a move as it happens, so leaving mid-word can't reset the day. */
function recordMove(m: string) {
  if (mode.kind !== 'daily' || daily.result) return;
  daily = { ...daily, moves: [...daily.moves, m] };
  saveDaily(daily);
}

function finishDailyDay(won: boolean) {
  if (mode.kind !== 'daily' || !round || daily.result) return;
  daily = finishDaily(daily, won, round.misses);
  saveDaily(daily);
  renderDailyTag();
  refreshDailyHeader();
}

/** One chalk mark per move: found, missed, hint, second chance. */
function moveMarks(d: DailyState, entry: Entry): ('hit' | 'miss' | 'hint' | 'life')[] {
  return d.moves.map((m) => (m === '+' ? 'life' : m[0] === '*' ? 'hint' : entry.text.includes(m) ? 'hit' : 'miss'));
}

let dailyFromGame = false;
let countdown: number | null = null;

function openDailyResult(fromGame: boolean) {
  dailyFromGame = fromGame;
  const d = daily = loadDaily();
  const entry = dailyEntry(d.day);
  const won = d.result === 'won';
  const streak = currentStreak(d);
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  $('dailyNum').textContent = `Daily Word #${d.day} · ${date}`;
  $('dailyTitle').textContent = won ? (d.misses === 0 ? 'Flawless!' : 'Solved!') : 'Not this time';
  $('dailyAnswer').textContent = entry.text;
  const marks = moveMarks(d, entry);
  $('dailyMoves').innerHTML = marks.map((k) => `<i class="dm ${k}"></i>`).join('');
  const found = marks.filter((k) => k === 'hit').length;
  $('dailyMoves').setAttribute('aria-label', `${found} letters found, ${d.misses} ${d.misses === 1 ? 'miss' : 'misses'}`);
  $('dsPlayed').textContent = String(d.played);
  $('dsWin').textContent = d.played ? `${Math.round((100 * d.won) / d.played)}%` : '0%';
  $('dsStreak').textContent = String(streak);
  $('dsBest').textContent = String(d.best);
  $('shareFallback').classList.add('hidden');
  fillShareLinks();
  tickCountdown();
  if (countdown !== null) clearInterval(countdown);
  countdown = window.setInterval(tickCountdown, 20_000);
  $('dailyOverlay').classList.remove('hidden');
  $('btnShare').focus();
}

function tickCountdown() {
  if ($('dailyOverlay').classList.contains('hidden') && countdown !== null) { clearInterval(countdown); countdown = null; return; }
  if (dayNumber() !== daily.day) {
    $('dailyNext').textContent = 'A new word is ready!';
    renderDailyTag();
    return;
  }
  const mins = Math.ceil(msUntilNext() / 60_000);
  const h = Math.floor(mins / 60), m = mins % 60;
  $('dailyNext').textContent = `Next word in ${h ? `${h}h ` : ''}${m}m`;
}

function closeDailyResult() {
  playTap();
  $('dailyOverlay').classList.add('hidden');
  if (dailyFromGame) leaveGame('title');
  else renderTitle();
}

/** Spoiler-free result: no letters, just how it went. */
function shareText(): string {
  const d = daily;
  const entry = dailyEntry(d.day);
  const icons = { hit: '🟩', miss: '🟥', hint: '💡', life: '❤️' };
  const row = moveMarks(d, entry).map((k) => icons[k]).join('');
  const streak = currentStreak(d);
  const head = d.result === 'won'
    ? `Hangman Daily #${d.day} ✅ ${d.misses} ${d.misses === 1 ? 'miss' : 'misses'}`
    : `Hangman Daily #${d.day} ❌`;
  const lines = [head, row];
  if (streak > 1) lines.push(`🔥 ${streak}-day streak`);
  // Outside the Arena, link back to the game. In the Arena the page around
  // the game is Arkadium's, so the text stands on its own.
  if (platform.name === 'local' && /^https?:/.test(location.href)) lines.push(location.origin + location.pathname);
  return lines.join('\n');
}

/** The phone share sheet (WhatsApp, Messages, email... whatever is installed). */
const canShareSheet = () => !!navigator.share && matchMedia('(pointer: coarse)').matches;

/** Direct links for the share row. They open in a new tab, so they also
 *  work on desktop and inside the Arena frame. */
function fillShareLinks() {
  const text = shareText();
  const enc = encodeURIComponent;
  $<HTMLAnchorElement>('shWhatsApp').href = `https://wa.me/?text=${enc(text)}`;
  $<HTMLAnchorElement>('shEmail').href = `mailto:?subject=${enc(`Hangman Daily #${daily.day}`)}&body=${enc(text)}`;
  $<HTMLAnchorElement>('shX').href = `https://twitter.com/intent/tweet?text=${enc(text)}`;
  // The big button only when the phone has a share sheet; the row covers the rest.
  $('btnShare').classList.toggle('hidden', !canShareSheet());
}

async function onCopy() {
  playTap();
  const text = shareText();
  if (await copyText(text)) { toast('Copied! Paste it anywhere'); return; }
  const ta = $<HTMLTextAreaElement>('shareText');
  ta.value = text;
  $('shareFallback').classList.remove('hidden');
  ta.focus();
  ta.select();
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { /* blocked in some frames: try the old way */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

async function onShare() {
  playTap();
  const text = shareText();
  // Phones: the system share sheet. It can be blocked inside an embed, in
  // which case copying is the fallback.
  if (canShareSheet()) {
    try { await navigator.share({ text }); return; } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return;
    }
  }
  if (await copyText(text)) { toast('Copied! Paste it anywhere'); return; }
  // Nothing worked: show the text so it can be copied by hand.
  const ta = $<HTMLTextAreaElement>('shareText');
  ta.value = text;
  $('shareFallback').classList.remove('hidden');
  ta.focus();
  ta.select();
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
  let pos = 0;
  for (const word of r.entry.text.split(' ')) {
    const w = document.createElement('span');
    w.className = 'word';
    for (const ch of word) {
      const t = document.createElement('span');
      // A small fixed tilt per square, so the letters look handwritten.
      const tilt = (((pos++ * 7) % 5) - 2) * 1.1;
      if (!/[A-Z]/.test(ch)) {
        t.className = 'tile punct';
        t.textContent = ch;
      } else {
        const shown = r.isRevealed(ch);
        t.className = `tile${shown ? ' shown' : ''}${!shown && revealAll ? ' missed' : ''}${r.hinted.has(ch) ? ' hinted' : ''}`;
        t.dataset.ch = ch;
        if (shown || revealAll) {
          const b = document.createElement('b');
          b.className = 'ch';
          b.style.setProperty('--tilt', `${tilt}deg`);
          b.textContent = ch;
          t.appendChild(b);
        }
      }
      w.appendChild(t);
    }
    host.appendChild(w);
  }
  // After a loss the missing letters write themselves in, one after another.
  if (revealAll) host.querySelectorAll<HTMLElement>('.tile.missed').forEach((t, i) => {
    t.style.setProperty('--wd', `${i * 70}ms`);
    t.classList.add('pop');
  });
  host.setAttribute('aria-label', r.entry.text.split('').map((ch) => (/[A-Z]/.test(ch) && !r.isRevealed(ch) && !revealAll ? 'blank' : ch)).join(' '));
}

/** Tiles shrink to fit the longest word on one line. */
function fitPhrase() {
  const host = $('phrase');
  const words = round!.entry.text.split(' ');
  const room = (host.clientWidth || 320) - 4;
  // Long sayings must not push the keyboard off a phone: allow about a
  // quarter of the frame for the phrase (more on tall screens).
  const maxH = Math.max(110, stageHeight() * 0.24);
  // Largest tile where the words, wrapped like the flex row wraps them, fit
  // both the width and that height. Tile ~1.14 x wide with its gap; word
  // gaps 0.7 x; line height 1.25 x plus a 10px row gap.
  // Phones: bigger tiles on tall screens, but short ones keep room for the drawing.
  let size = isStaged() ? 46 : Math.max(40, Math.min(56, Math.round(stageHeight() * 0.065 / 2) * 2));
  for (; size > 18; size -= 2) {
    const wordW = (w: string) => w.length * size * 1.14;
    if (Math.max(...words.map(wordW)) > room) continue;
    let lines = 1, x = 0;
    for (const w of words) {
      const need = (x ? size * 0.7 : 0) + wordW(w);
      if (x && x + need > room) { lines++; x = wordW(w); } else x += need;
    }
    if (lines * size * 1.25 + (lines - 1) * 10 <= maxH) break;
  }
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
  recordMove(ch);
  $('coachLine').classList.add('hidden');
  if (res === 'hit') {
    const count = [...r.entry.text].filter((c) => c === ch).length;
    markKey(ch, 'hit');
    renderPhrase();
    document.querySelectorAll<HTMLElement>(`.tile[data-ch="${ch}"]`).forEach((t, i) => {
      t.style.setProperty('--wd', `${i * 60}ms`);
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
  recordMove('*' + ch);
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
  wordDone($('phrase'));
  if (mode.kind === 'daily') {
    finishDailyDay(true);
    refreshDailyHeader();
    setTimeout(() => { if (round === r) { levelDone(); playWin(); } }, 450);
    setTimeout(() => { if (round === r && mode.kind === 'daily') openDailyResult(true); }, 1700);
    return;
  }
  const levelOver = mode.kind === 'level' && wordIndex >= WORDS_PER_LEVEL - 1;
  if (levelOver) {
    // The big one: confetti and a fanfare just after the word's own cheer.
    setTimeout(() => { if (round === r) { levelDone(); playWin(); } }, 450);
  } else {
    playWordDone();
  }
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
  levelMisses += r.misses;
  levelHelped ||= r.hinted.size > 0 || r.revived;

  // This word's dot fills in while the solved word is still on the board.
  renderLevelHeader(true);
  if (levelOver) $('gameSub').querySelector('.wDots')?.classList.add('party');

  // More words to go: enjoy the solve, wipe the board, and only then
  // announce the next word, once it's actually there.
  if (wordIndex < WORDS_PER_LEVEL - 1) {
    setTimeout(() => {
      if (round !== r || mode.kind !== 'level') return;
      playErase();
      void wipeTo(() => { wordIndex++; startLevelWord(); }).then(() => {
        if (mode.kind !== 'level' || round?.entry !== levelWords[wordIndex]) return;
        toast(wordIndex === WORDS_PER_LEVEL - 1 ? 'Last word!' : `Word ${wordIndex + 1} of ${WORDS_PER_LEVEL}`);
      });
    }, 1400);
    return;
  }

  const stars = levelStars(levelMisses, levelHelped);
  progress = recordSolve(progress, index, stars);
  saveProgress(progress);
  endActiveLevel();
  setTimeout(() => {
    if (round !== r) return;
    $('winTitle').textContent = stars === 3 ? 'Perfect!' : 'Level complete!';
    // Stars start blank and stamp in one by one once the card is up.
    $('winStars').innerHTML = starsHtml(0, 40);
    $('winStars').querySelectorAll<SVGElement>('.star').forEach((s, i) => {
      if (i >= stars) { s.classList.add('dim'); return; }
      setTimeout(() => {
        if (round !== r) return;
        s.classList.add('on', 'stamp');
        playStar(i);
      }, 380 + i * 300);
    });
    $('winAnswer').textContent = levelWords.map((w) => w.text).join(' · ');
    $('winText').textContent = stars === 3
      ? `All ${WORDS_PER_LEVEL} ${LEVELS[index].topic.name.toLowerCase()} words with barely a line drawn.`
      : levelHelped
        ? 'Solved with a little help. Try it without for 3 stars.'
        : `${levelMisses} misses in total. Two or fewer earns 3 stars.`;
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
    const canRevive = mode.kind === 'endless' ? !runRevived : !r.revived;
    // Daily with no second chance left: straight to the result card.
    if (mode.kind === 'daily' && !canRevive) {
      finishDailyDay(false);
      renderPhrase(true);
      setTimeout(() => { if (round === r) openDailyResult(true); }, 900);
      return;
    }
    // While one more guess is on offer, the answer stays hidden: showing it
    // would make the extra guess a free win.
    if (!canRevive) renderPhrase(true);
    $('btnRevive').classList.toggle('hidden', !canRevive);
    ($('btnRevive') as HTMLButtonElement).disabled = false;
    $('reviveLabel').textContent = subscriber ? 'Keep going (one more guess)' : 'Watch a video for one more guess';
    $('btnRetry').classList.toggle('primary', !canRevive);
    $('loseAnswer').classList.add('hidden');
    if (mode.kind === 'daily') {
      $('loseTitle').textContent = 'Out of guesses!';
      $('loseText').textContent = 'One more guess could still save your streak.';
      $('btnRetry').textContent = 'Show the answer';
      $('btnLoseMenu').textContent = 'Menu';
    } else if (mode.kind === 'level') {
      $('loseTitle').textContent = canRevive ? 'Out of guesses!' : 'So close!';
      $('loseText').textContent = canRevive
        ? 'Get one more guess on this word, or start the level over with new words.'
        : 'Start the level over with new words, or pick another level.';
      $('btnRetry').textContent = 'Start over';
      $('btnLoseMenu').textContent = 'Levels';
    } else {
      const best = bestEndless();
      $('loseTitle').textContent = 'Run over';
      $('loseText').textContent = `Score ${score.toLocaleString('en-US')} · ${solvedInRun} ${solvedInRun === 1 ? 'word' : 'words'} solved${score > best ? ' · New best!' : best ? ` · Best ${best.toLocaleString('en-US')}` : ''}`;
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
  recordMove('+');
  locked = false;
  $('loseOverlay').classList.add('hidden');
  renderPhrase();
  renderStatus();
  playErase();
}

function onRetry() {
  playTap();
  if (mode.kind === 'daily') {
    finishDailyDay(false);
    $('loseOverlay').classList.add('hidden');
    renderPhrase(true);
    setTimeout(() => openDailyResult(true), 700);
    return;
  }
  if (mode.kind === 'endless') {
    finishEndlessRun();
    go(() => { hideOverlays(); startEndless(); });
    return;
  }
  // Start the whole level over. It deals words not seen yet where it can, so
  // a replay is a fresh puzzle rather than a memory test.
  const index = mode.index;
  go(() => { hideOverlays(); startLevel(index); });
}

function leaveGame(to: Screen) {
  // Quitting a run mid-word still keeps what was scored so far.
  if (mode.kind === 'endless') finishEndlessRun();
  if (mode.kind === 'daily' && round?.lost) finishDailyDay(false);
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
  $('btnDaily').addEventListener('click', () => {
    playTap();
    // Already played today: just show the card, no trip to the board.
    if (loadDaily().result) { daily = loadDaily(); openDailyResult(false); return; }
    go(startDaily);
  });
  $('btnHowTo').addEventListener('click', () => { playTap(); openHowTo(); });
  $('btnHowToClose').addEventListener('click', () => {
    playTap();
    $('howToOverlay').classList.add('hidden');
    const then = afterHowTo; afterHowTo = null; then?.();
  });
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((b) =>
    b.addEventListener('click', () => { playTap(); go(() => show(b.dataset.nav as Screen)); }));
  // Speaker buttons open a small panel with Music and Sounds switches.
  const panel = $('soundPanel');
  const closePanel = () => panel.classList.add('hidden');
  document.querySelectorAll<HTMLElement>('[data-sound]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      playTap();
      if (!panel.classList.contains('hidden')) { closePanel(); return; }
      // The panel lives in the (possibly scaled) stage: place it in stage units.
      const r = toStage(b.getBoundingClientRect());
      panel.style.top = `${r.bottom + 10}px`;
      panel.style.right = `${Math.max(8, stageWidth() - r.right)}px`;
      panel.classList.remove('hidden');
      $('btnMusic').focus();
    }));
  $('btnMusic').addEventListener('click', (e) => { e.stopPropagation(); setMusic(!musicOn()); refreshSoundButtons(); });
  $('btnSfx').addEventListener('click', (e) => { e.stopPropagation(); setSound(!soundOn()); refreshSoundButtons(); playTap(); });
  document.addEventListener('click', (e) => { if (!panel.contains(e.target as Node)) closePanel(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });
  // Browsers only allow audio after a tap: the music starts on the first one.
  window.addEventListener('pointerdown', () => startMusic(), { once: true });
  window.addEventListener('keydown', () => startMusic(), { once: true });

  $('btnGameBack').addEventListener('click', () => { playTap(); leaveGame(mode.kind === 'level' ? 'map' : 'title'); });
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
  $('btnLoseMenu').addEventListener('click', () => { playTap(); leaveGame(mode.kind === 'level' ? 'map' : 'title'); });
  $('btnShare').addEventListener('click', () => void onShare());
  $('shCopy').addEventListener('click', () => void onCopy());
  ['shWhatsApp', 'shEmail', 'shX'].forEach((id) => $(id).addEventListener('click', () => playTap()));
  $('btnDailyClose').addEventListener('click', closeDailyResult);

  // Physical keyboard: letters guess, Escape closes How to Play.
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' && !$('howToOverlay').classList.contains('hidden')) { $('btnHowToClose').click(); return; }
    if (!$('dailyOverlay').classList.contains('hidden')) { if (e.key === 'Escape') $('btnDailyClose').click(); return; }
    if ($('screen-game').classList.contains('hidden')) return;
    if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); guess(e.key.toUpperCase()); }
  });
  window.addEventListener('resize', () => { if (round) fitPhrase(); fitTitle(); fitGameTitle(); });
  void document.fonts?.ready.then(fitTitle); // the web fonts change text sizes

  platform.onPause(suspendSound);
  platform.onResume(resumeSound);
  document.addEventListener('visibilitychange', () => (document.hidden ? suspendSound() : resumeSound()));
  platform.onAuthChange((signedIn) => {
    if (!signedIn) { setSignedOut(); return; }
    void (async () => {
      await resyncStorage();
      progress = loadProgress();
      daily = loadDaily();
      subscriber = await platform.isSubscriber();
      refreshSoundButtons();
      if (!$('screen-title').classList.contains('hidden')) renderTitle();
      if (!$('screen-map').classList.contains('hidden')) renderMap();
      if (round) refreshHintBadge();
    })();
  });
}

async function boot() {
  // First, before anything measures itself: fixed design scaled to the frame
  // (desktop / embeds) or the adaptive layout (phones).
  initStage();
  platform = await createPlatform();
  await initStorage(platform);
  initSound();
  progress = loadProgress();
  subscriber = await platform.isSubscriber().catch(() => false);
  mountDrawing($('drawWrap'));
  // The title is lettering only: each letter is its own span so it can
  // bob in a slow wave (see .logoWord in styles.css).
  $('logoWord').innerHTML = [...'Hangman'].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('');
  setDoodles($('titleDoodles'), 'title');
  refreshSoundButtons();
  wire();
  show('title');
  // First open only: "Hangman" writes itself in, then the menu appears.
  $('screen-title').classList.add('intro');
  setTimeout(() => $('screen-title').classList.remove('intro'), 2200);
  platform.ready();
}

void boot();
