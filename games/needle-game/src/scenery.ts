/**
 * The countryside behind the game. Each of the five worlds has its own
 * palette (casual.css, body[data-world]) and its own landmark and weather:
 *
 *   0 The Meadow       morning, windmill, daisies, butterflies
 *   1 The Barnyard     golden afternoon, barn, haystack
 *   2 The Orchard      autumn tree, pumpkins, falling leaves
 *   3 The Snowy Farm   cabin with smoke, snowman, falling snow
 *   4 Starry Night     tent and campfire, moon, stars, fireflies
 *
 * Every world's pieces are in the page at all times; the CSS shows the ones
 * for the active world and fades the palette between worlds. Everything is
 * plain SVG and CSS, moved only with transform and opacity so it stays smooth
 * beside the game. The board hides the middle of the screen on wide windows, so
 * the scene is built to read in the strips around the board and below it.
 */
import { worldOf } from './levels';
import * as P from './props';

/** Switches the backdrop to the world a level belongs to. */
export const setWorldTheme = (level: number) => {
  document.body.dataset.world = String(worldOf(level));
};

const CLOUD =
  '<svg viewBox="0 0 190 90"><g><circle cx="55" cy="54" r="26"/><circle cx="92" cy="40" r="32"/><circle cx="136" cy="52" r="28"/><circle cx="166" cy="60" r="18"/><rect x="38" y="56" width="146" height="24" rx="12"/></g></svg>';

const BIRD =
  '<svg viewBox="0 0 24 12"><path d="M1 8 Q6 0 12 7 Q18 0 23 8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const cloud = (x: string, top: string, w: number, t: number, d: number) =>
  `<div class="cloud" style="--x:${x};--top:${top};--w:${w}px;--t:${t}s;--d:${d}s">${CLOUD}</div>`;

/** The scene's fixed parts. Randomly placed bits come from populateScenery(). */
export function sceneryHtml(): string {
  return `<div class="scenery" aria-hidden="true">
    <div class="sun-glow"></div><div class="sun-rays"></div>
    <div class="moon">${P.MOON}</div>
    ${cloud('8vw', '3vh', 230, 150, -40)}${cloud('62vw', '12vh', 170, 210, -120)}${cloud('30vw', '22vh', 290, 270, -190)}${cloud('80vw', '33vh', 200, 190, -30)}
    <div class="bird" style="--top:8vh;--t:80s;--d:-14s;--s:1">${BIRD}</div>
    <div class="bird" style="--top:16vh;--t:115s;--d:-75s;--s:.78">${BIRD}</div>
    <div class="hills hills-far"><svg viewBox="0 0 1440 220" preserveAspectRatio="none"><path d="M0 130 C110 64 250 40 410 92 S700 124 860 72 S1180 18 1310 72 L1440 104 V220 H0 Z"/></svg></div>
    <div class="landmark lm0" style="--w:clamp(64px,10vmin,130px)">${P.WINDMILL}</div>
    <div class="landmark lm1" style="--w:clamp(96px,15vmin,190px)">${P.BARN}</div>
    <div class="landmark lm2" style="--w:clamp(90px,15vmin,190px)">${P.AUTUMN_TREE}</div>
    <div class="landmark lm3" style="--w:clamp(100px,16vmin,200px)">${P.CABIN}</div>
    <div class="landmark lm4" style="--w:clamp(120px,20vmin,250px)">${P.TENT_FIRE}</div>
    <div class="hills hills-mid"><svg viewBox="0 0 1440 200" preserveAspectRatio="none"><path d="M0 70 C170 22 330 36 520 84 S880 120 1060 66 S1310 30 1440 78 V200 H0 Z"/></svg></div>
    <div class="hills meadow"><svg viewBox="0 0 1440 300" preserveAspectRatio="none"><defs><linearGradient id="needle-meadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--meadowA)"/><stop offset="1" style="stop-color:var(--meadowB)"/></linearGradient></defs><path d="M0 64 C240 14 470 26 720 56 S1200 96 1440 36 V300 H0 Z" fill="url(#needle-meadow)"/></svg></div>
    <div class="sprop sp0">${P.DAISIES}</div>
    <div class="sprop sp1">${P.HAYSTACK}</div>
    <div class="sprop sp2">${P.PUMPKIN}</div>
    <div class="sprop sp3">${P.SNOWMAN}</div>
    <div class="sprop sp4">${P.MUSHROOMS}</div>
    <div class="bfly" style="--b:20vh;--sz:30px;--t:70s;--d:-20s">${P.BUTTERFLY('#ffd75e', '#fff3b0')}</div>
    <div class="bfly" style="--b:11vh;--sz:24px;--t:95s;--d:-70s">${P.BUTTERFLY('#a9c2ff', '#e6edff')}</div>
  </div>`;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const FLOWERS = ['#ff8fb1', '#ffd34d', '#ffffff', '#c7a6ff'];
const LEAVES = ['#d9531f', '#e8892f', '#f0a53c', '#c9302a', '#b9791f'];

const tuft = (flower: string | null) =>
  `<svg viewBox="0 0 24 32"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 32 C12 22 9 14 5 6"/><path d="M12 32 C12 20 12 12 12 2"/><path d="M12 32 C12 22 15 14 19 6"/></g>${
    flower ? `<circle cx="12" cy="3.5" r="3.6" fill="${flower}"/><circle cx="12" cy="3.5" r="1.4" fill="#fff6c9"/>` : ''
  }</svg>`;

/** Adds the randomly placed grass tufts and flowers, floating motes, stars, falling leaves and snow. */
export function populateScenery() {
  const root = document.querySelector('.scenery');
  if (!root || root.querySelector('.tuft')) return;
  const bits: string[] = [];
  const tufts = 24;
  for (let i = 0; i < tufts; i++) {
    const x = ((i + rnd(0.1, 0.9)) / tufts) * 100;
    const flower = Math.random() < 0.42 ? FLOWERS[Math.floor(rnd(0, FLOWERS.length))] : null;
    bits.push(`<i class="tuft" style="left:${x.toFixed(1)}%;bottom:${rnd(1, 13).toFixed(1)}vh;width:${rnd(16, 30).toFixed(0)}px;--t:${rnd(3.2, 5.4).toFixed(1)}s;--d:${(-rnd(0, 5)).toFixed(1)}s">${tuft(flower)}</i>`);
  }
  for (let i = 0; i < 16; i++) {
    bits.push(`<i class="mote" style="left:${rnd(0, 100).toFixed(1)}%;top:${rnd(52, 96).toFixed(1)}%;--s:${rnd(3, 6).toFixed(1)}px;--t:${rnd(8, 15).toFixed(1)}s;--d:${(-rnd(0, 12)).toFixed(1)}s"></i>`);
  }
  for (let i = 0; i < 22; i++) {
    bits.push(`<i class="star" style="left:${rnd(0, 100).toFixed(1)}%;top:${rnd(1, 34).toFixed(1)}%;--s:${rnd(2, 3.6).toFixed(1)}px;--t:${rnd(2.4, 5).toFixed(1)}s;--d:${(-rnd(0, 5)).toFixed(1)}s"></i>`);
  }
  for (let i = 0; i < 16; i++) {
    bits.push(`<i class="leaf" style="left:${rnd(0, 100).toFixed(1)}%;--s:${rnd(12, 22).toFixed(0)}px;--c:${LEAVES[i % LEAVES.length]};--t:${rnd(11, 19).toFixed(1)}s;--d:${(-rnd(0, 18)).toFixed(1)}s"></i>`);
  }
  for (let i = 0; i < 44; i++) {
    bits.push(`<i class="flake" style="left:${rnd(0, 100).toFixed(1)}%;--s:${rnd(4, 9).toFixed(1)}px;--o:${rnd(0.55, 1).toFixed(2)};--t:${rnd(9, 18).toFixed(1)}s;--d:${(-rnd(0, 18)).toFixed(1)}s"></i>`);
  }
  root.insertAdjacentHTML('beforeend', bits.join(''));
}
