import Phaser from 'phaser';
import './casual.css';
import './content.css';
import './ui.css';
import { levelDef, dailyDef, pilePoint, TOOL_LEVELS, TOTAL_LEVELS, type LevelDef, type Treasure } from './levels';
import { ITEMS, DECOYS, DECOY_NAME, RARITIES, itemName, rarityOf, isRarePlus } from './items';
import { drawItem } from './itemart';
import { rollItems, rollDaily, nextPity } from './drops';
import { activeEvent } from './events';
import { track as quest } from './quests';
import { track as logEvent } from './analytics';
import { platform } from './platform';
import { LOOKS, mulColor, type Slot } from './cosmetics';
import { scoop, brushMult, recordFinds, levelCoins, repeatCoins, detector, fan, vacuum, CELLS, dailyReady, today, claimDailyHay, adsLeft } from './economy';
import { maybeShowDaily } from './daily';
import { openToday, todayPending } from './today';
import { initCollection, showSetComplete } from './collection';
import { initBarn } from './barn-ui';
import { addHay } from './barn';
import { loadConfig } from './config';
import { initAnalytics } from './analytics';
import { bootPlatform } from './platform';
import { HELPER_ART, HELPER_NAME, CELL_ART, SHOP_ART, MAP_ART, CAL_ART, BOOK_ART, BARN_ART } from './art';
import { initShop, updateCoinPill, updateCellsPill, holdCoins, releaseCoins, releaseCells, flyCoins, holdCells, flyCells, centerOf, watchForCell, toast } from './shop';
import { enableTestMode, isSolved, saved, persist, recordWin, playTarget, allSolved, solvedCount, hasSeen, markSeen, resetProgress } from './progress';
import { renderMap, scrollToFrontier } from './worldmap';
import * as sfx from './sound';
const TOOLIDS=['magnet','wind','vacuum'];
import { sceneryHtml, populateScenery, setWorldTheme } from './scenery';

const icons = {
 magnet: '<ellipse cx="8" cy="19" rx="5.5" ry="2.2"/><path d="M10 17 17 6M15 4h6M18 4v5"/>',
 wind: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h6a3 3 0 1 1-3 3"/>',
 sound: '<path d="m11 5-5 4H3v6h3l5 4ZM15 8q5 4 0 8m3-11q8 7 0 14"/>',
 shop: '<path d="M3.5 9 5 4h14l1.500 5"/><path d="M3.500 9a2.800 2.800 0 0 0 5.500 0 2.800 2.800 0 0 0 6 0 2.800 2.800 0 0 0 5.500 0"/><path d="M5 12.500V20h14v-7.500"/><path d="M10 20v-4.500h4V20"/>',
 needle: '<path d="M5 21 17 3q5-2 2 3Z"/><path d="m16 6 2-2"/>',
};
const svg=(name:keyof typeof icons)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const needleArt=(id:string)=>`<svg viewBox="0 0 220 40" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f1e6"/><stop offset=".45" stop-color="#c3c7c0"/><stop offset=".7" stop-color="#7d847b"/><stop offset="1" stop-color="#d9d6c4"/></linearGradient></defs><path d="M6 20 L182 13 C214 11 214 29 182 27 Z" fill="url(#${id})" stroke="#6d6a5c" stroke-width="2"/><ellipse cx="188" cy="20" rx="10" ry="3.2" fill="#5a4a30"/><path d="M40 18 L170 14" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".75"/></svg>`;
// The title screen: the big animated lettering, a floating needle, and two buttons.
const titleHtml=`<section id="screen-title" class="screen" aria-label="Needle in a haystack"><div class="title-hero" aria-hidden="true"><span class="t-rays"></span><span class="t-glow"></span><div class="title-needle">${needleArt('steel-title')}</div><span class="t-spark s1">✦</span><span class="t-spark s2">✦</span><span class="t-spark s3">✦</span><span class="t-spark s4">✦</span></div><h1 class="title-word" aria-label="Needle!">${[...'NEEDLE!'].map((ch,i)=>`<span class="l" aria-hidden="true" style="--i:${i}">${ch}</span>`).join('')}</h1><p class="title-sub">IN A HAYSTACK</p><div class="title-actions"><button id="btn-play" class="primary big"><span id="play-label">Play</span></button><div class="dock"><button id="btn-levels" class="dock-btn"><span class="di">${MAP_ART}</span><span>Levels</span></button><button id="btn-today" class="dock-btn"><span class="di">${CAL_ART}</span><span>Today</span><i class="dot"></i></button><button id="btn-collection" class="dock-btn"><span class="di">${BOOK_ART}</span><span>Collection</span></button><button id="btn-barn" class="dock-btn"><span class="di">${BARN_ART}</span><span>Barn</span></button></div><button id="btn-delete" class="text-button">Delete progress</button></div></section>`;
document.querySelector('#app')!.innerHTML=`
${sceneryHtml()}<header><a class="brand" id="brand" href="./" aria-label="Needle, back to the title screen">${svg('needle')}<span class="word"><span class="letters" aria-hidden="true">${[...'NEEDLE!'].map((ch,i)=>`<span class="l" style="--i:${i}">${ch}</span>`).join('')}</span><small>IN A HAYSTACK</small></span><i class="brand-glint" aria-hidden="true">✦</i></a><div class="header-note">A LITTLE GAME OF LOOKING</div><div class="header-actions"><div class="hdr-left"><button id="btn-back" class="icon-button" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><a id="btn-home" class="icon-button" href="../../" aria-label="Back to Voidcade" title="Back to Voidcade" style="color:inherit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/></svg></a><div id="coin-badge" class="coin-badge" role="status"><i class="coin"></i><b id="coin-count">0</b></div><div id="cells-badge" class="coin-badge cells-badge hidden" role="status" title="Battery cells"><span class="cb-art">${CELL_ART}</span><b id="cells-count">0</b></div></div><div class="hdr-right"><button id="btn-shop" class="icon-button shop-btn" aria-label="Shop" title="Shop">${SHOP_ART}</button><button id="sound" class="icon-button" aria-label="Toggle sound">${svg('sound')}</button><button id="help" class="help-button">How to play <span>?</span></button></div></div></header>
${titleHtml}<section id="screen-map" class="screen off" aria-label="Levels"><div id="mapWrap"><div id="mapRegions"></div><svg id="mapPath" aria-hidden="true"></svg><div id="mapBanners"></div><div id="mapNodes"></div></div></section>
<main id="screen-game" class="screen off"><section class="intro"><div class="eyebrow"><span></span> SMALL DISCOVERIES. SIMPLE JOYS.</div><h1>A little patience.<br>A little <em>discovery.</em></h1><p>One tiny needle. A whole lot of hay.<br>Take a breath, brush around, and look a little closer.</p></section>
<section class="game-shell" aria-label="Needle in a haystack game"><div class="game-top"><div class="level-label"><strong>Level <span id="level">1</span></strong><span class="level-name" id="level-name"></span></div></div>
<div class="play-area"><div id="game" tabindex="0" aria-label="Search the hay. Hold and drag to brush, or tap a straw to pluck it. Click or tap the needle. Zoom with the scroll wheel, pinch, or the plus and minus keys. Helper shortcuts: 1, 2."></div><div id="night" class="night-veil hidden"></div><div class="zoom-ctl" role="group" aria-label="View"><button id="zoom-in" class="zoom-btn" aria-label="Zoom in" title="Zoom in (+)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button><button id="zoom-out" class="zoom-btn" aria-label="Zoom out" title="Zoom out (-)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg></button><button id="zoom-fit" class="zoom-btn" aria-label="See the whole haystack" title="See it all (0)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div><div id="coach" class="coach hidden" aria-hidden="true"><span class="ring"></span><span class="ghost"></span></div><div class="board-tag out" role="status"><span class="live-dot"></span><span id="board-message"></span><div id="power-bar" class="power-bar"></div></div><div id="mission" class="mission"></div><div id="win" class="win hidden" role="dialog" aria-labelledby="win-title"><div class="win-card"><div class="win-hero" aria-hidden="true"><span class="win-rays"></span><span class="win-glow"></span><svg class="win-needle" viewBox="0 0 220 40"><defs><linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f1e6"/><stop offset=".45" stop-color="#c3c7c0"/><stop offset=".7" stop-color="#7d847b"/><stop offset="1" stop-color="#d9d6c4"/></linearGradient></defs><path d="M6 20 L182 13 C214 11 214 29 182 27 Z" fill="url(#steel)" stroke="#6d6a5c" stroke-width="2"/><ellipse cx="188" cy="20" rx="10" ry="3.2" fill="#5a4a30"/><path d="M40 18 L170 14" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".75"/></svg><span class="win-spark s1">✦</span><span class="win-spark s2">✦</span><span class="win-spark s3">✦</span><span class="win-spark s4">✦</span></div><h2 id="win-title">You found it!</h2><div id="win-items" class="win-items"></div><p id="win-copy"></p><p id="win-coins" class="win-coins hidden"></p><button id="next" class="primary"><span id="next-label">Next level</span> <span>→</span></button><button id="win-map" class="text-button">Back to the map</button></div></div></div>
<div class="tool-tray"><div class="tool-caption"><span class="tiny">A LITTLE HELP</span><span>When you need a fresh perspective.</span></div><div class="tools"><button class="tool" id="magnet" title="Detector - shortcut 1"><span class="tool-art">${HELPER_ART[0]}</span><span>Detector<small>Beeps near hidden things</small></span><em class="state"></em><kbd>1</kbd><b class="charge">2</b></button><button class="tool" id="wind" title="Fan - shortcut 2"><span class="tool-art">${HELPER_ART[1]}</span><span>Fan<small>Blows hay away</small></span><em class="state"></em><kbd>2</kbd><b class="charge">2</b></button><button class="tool" id="vacuum" title="Vacuum - shortcut 3"><span class="tool-art">${HELPER_ART[2]}</span><span>Vacuum<small>Draws the top hay in</small></span><em class="state"></em><kbd>3</kbd><b class="charge">2</b></button></div></div>
</section><div class="below-board"><span>↖ <strong>Hold and drag to brush.</strong> Tap a straw to pluck it. Scroll or pinch to zoom.</span><span>MADE FOR A MOMENT OF CALM <span class="flower">✳</span></span></div></main>
<dialog id="instructions"><button class="close" aria-label="Close">×</button><h2>How to play</h2><ul class="howto"><li>Find the needle and tap it.</li><li>Drag to brush hay away.<br>Tap one straw to lift it.</li><li>No timer, no score. Take your time.</li><li>Zoom with the scroll wheel,<br>pinching, or the + and − buttons.</li><li>Stuck? Try a helper below the hay.</li></ul><button class="primary close-help">Let’s play!</button><button id="reset" class="text-button">Delete progress</button></dialog><dialog id="confirm-reset"><h2>Delete progress?</h2><p class="confirm-text">Every level starts again from level 1. This can’t be undone.</p><div class="confirm-actions"><button id="reset-cancel" class="secondary">Keep it</button><button id="reset-yes" class="danger">Yes, delete</button></div></dialog><section id="shop" class="shop-screen hidden" role="dialog" aria-modal="true" aria-labelledby="shop-title"></section><section id="collection" class="shop-screen hidden" role="dialog" aria-modal="true" aria-labelledby="col-title"></section><section id="barn" class="shop-screen hidden" role="dialog" aria-modal="true" aria-labelledby="barn-title"></section>`;
const $=(id:string)=>document.getElementById(id)!;
// Keep HUD messages outside the transformed canvas frame.
document.querySelector('.game-shell')!.append(document.querySelector('.board-tag')!);
// The win card covers the whole screen, so it lives outside the (transformed) board frame.
document.body.append($('win'));
/** Small check mark for found bonus items. */
const TICK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2L18.5 7.8" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
// Bonus items sit in the top row, next to the level. On wide screens the
// helpers form a column beside the board, and the bonus items join the top of that column.
const sideLayout=matchMedia('(min-width:601px) and (min-aspect-ratio:12/7) and (min-height:551px)');
const placeMission=()=>{if(sideLayout.matches)document.querySelector('.tool-tray')!.prepend($('mission'));else document.querySelector('.level-label')!.after($('mission'));};
placeMission();sideLayout.addEventListener('change',placeMission);
// The countryside behind the game; its time of day follows the level.
populateScenery();setWorldTheme(playTarget());
// Audio starts on the first gesture (browsers block it before that) and follows the sound toggle.
sfx.setEnabled(saved.sound);
['pointerdown','keydown','touchend'].forEach(type=>window.addEventListener(type,()=>sfx.unlock(),{capture:true,passive:true}));
/** Stereo position for a board x coordinate (the board is 1200 wide). */
const panAt=(x:number)=>Phaser.Math.Clamp((x/(WORLD_W/2)-1)*.7,-.7,.7);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
/** A small seeded random source (mulberry32). */
const mulberry=(seed:number)=>()=>{seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
/** Today's number for the daily haystack: the same for everyone on the same date. */
const dailySeed=()=>{const s='needle-daily-'+today();let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;};
/** Swaps Math.random for a seeded one until the returned function is called, so a level can be built the same way twice. */
const seedRandom=(seed:number)=>{const original=Math.random;Math.random=mulberry(seed);return()=>{Math.random=original;};};
/** The look in use for hay, frame or needle. */
const lookOf=(slot:Slot)=>LOOKS[slot].find(l=>l.id===saved.cosmetics[slot])??LOOKS[slot][0];
/** Puts the board frame on the page. */
const applyLooks=()=>{document.body.dataset.frame=saved.cosmetics.frame;};
/** Win-screen titles; there's no score, just a warm word. */
const WIN_WORDS=['You found it!','Well done!','Lovely!','There it is!','Nicely found!'];
// Pointer travel (px) before a press counts as a brush stroke rather than a tap.
const STROKE_SLOP=10;
type Item=Phaser.GameObjects.Image;
type Point={x:number;y:number};
/** Points (texture px from the image centre) used to measure how much of an object the hay hides. */
const NEEDLE_SAMPLES:Point[]=Array.from({length:11},(_,i)=>({x:-38+i*7.6,y:0}));
const OBJECT_SAMPLES:Point[]=[{x:0,y:0},...Array.from({length:8},(_,i)=>({x:Math.cos(i*Math.PI/4)*10,y:Math.sin(i*Math.PI/4)*10})),...Array.from({length:6},(_,i)=>({x:Math.cos(i*Math.PI/3+.5)*17,y:Math.sin(i*Math.PI/3+.5)*17}))];
/** Hides the first-time guide (touch circle and ring) over the board. */
const hideCoach=()=>$('coach').classList.add('hidden');
/** A tap picks an object up once at least this share of it is visible. */
const VISIBLE_TO_TAP=.35;
/** The detector starts scanning after the button has been held this long (ms), so a quick tap just picks things up. */
const SCAN_DELAY=150;
/** Every time the detector starts scanning it uses at least this much of its cell (ms), so tapping around is not free. */
const DET_MIN=1000;
/** The detector: how long one charge lasts (ms) and how far from the pointer it can sense something (world units). */

/** A straw's half-width in texture px, for "is this point under hay" checks. */
const STRAW_HALF_WIDTH=3;
// Brush physics: hay slides with the stroke and settles as friction takes over.
/** The deepest zoom in. (The widest is the whole haystack, which depends on the level.) */
const MAX_ZOOM=2.6;
/** The board's width in world units while a level is running; the pan of sound follows it. */
let WORLD_W=1200;
const BRUSH_RADIUS=46, BRUSH_TICK_MS=33, FRICTION=10, MAX_SPEED=1400, MAX_SPIN=7;
/** How strongly a stroke carries each thing it touches, top layer first. */
const CARRY=.8, CARRY_ITEMS=.35;
/** Passing messages (a find, a helper result) fade back after this long. */
const PASSING_MS=2800;

class Haystack extends Phaser.Scene {
 straws:Item[]=[]; needle!:Item; glint!:Phaser.GameObjects.Star; ring!:Phaser.GameObjects.Graphics;
 started=0; elapsed=0; won=false; free=0; downAt=0; lastCells=0; dome=false; active=false; ready=false; pending=false; coach:''|'brush'|'pluck'|'tap'=''; coverStraw:Item|null=null; coachCheck=0; private drift=0; cursor!:Phaser.GameObjects.Arc;
 treasures:{sprite:Item;kind:Treasure;collected:boolean}[]=[]; bonusFound=0; decoys:{sprite:Item;kind:string;found:boolean}[]=[]; mode:'level'|'daily'='level'; nightOn=false; levelStartedAt=0; hayGot=0; detQuest=0; ground!:Item;
 stroking=false; bends:number[]=[];
 selected=-1; aimX=600; aimY=350; effects:Phaser.GameObjects.GameObject[]=[];
 /** The haystack's size in world units (1200 x 700 times the level's size). */
 worldW=1200; worldH=700; size=1;
 /** Zoom and pan: two fingers pinch and pan, the mouse near the board edge scrolls, arrow keys pan. */
 mouseIn=false; panning=false; detMs=10000; vacLeft=0; vacOn=false; vacAcc=0; vacSfxAt=0; detR=140; detLeft=0; detOn=false; detHeld=false; inLevel=false; detPingAt=0; boardDown=false; detBeepAt=0; detScan=0; detPulseAt=-1e9; detPulseMs=700; detClose=0; detTargets:Item[]=[]; detG!:Phaser.GameObjects.Graphics; gesture=false; pinchDist=0; pinchX=0; pinchY=0; lastSX=600; lastSY=350; brushR=BRUSH_RADIUS;
 /** Things currently sliding, with their velocity (px/s) and spin (rad/s). */
 moving=new Map<Item,{vx:number;vy:number;vr:number}>();
 lastBX=0; lastBY=0; lastBrushAt=0; brushedOnce=false; round=0;
 msgTimer=0; msgToken=0; msgTarget='';
 constructor(){super('haystack');}
 create(){
  this.makeTextures(); this.cameras.main.setBackgroundColor('#b09a63');
  this.ground=this.add.image(600,350,'ground');
  this.cursor=this.add.circle(-100,-100,BRUSH_RADIUS,0xffe9ab,.04).setStrokeStyle(1.5,0xffefc7,.3).setDepth(1200);
  this.ring=this.add.graphics().setVisible(false).setDepth(800);this.detG=this.add.graphics().setVisible(false).setDepth(1300);
  this.input.mouse?.disableContextMenu();
  this.cameras.main.setRoundPixels(false);
  // Pointer positions arrive in screen units (1200 x 700); everything on the board lives in world units.
  const world=(p:Phaser.Input.Pointer)=>this.toWorld(p.x,p.y);
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{
   const sx=p.x,sy=p.y,dsx=sx-this.lastSX,dsy=sy-this.lastSY;this.lastSX=sx;this.lastSY=sy;
   if(this.won||!this.active)return;
   // Two fingers: pinch to zoom and drag to pan (this cancels any brush stroke).
   const t1=this.input.pointer1,t2=this.input.pointer2;
   if(t1?.isDown&&t2?.isDown){this.pinch(t1,t2);return;}
   const w=world(p);
   this.aimX=w.x;this.aimY=w.y;this.cursor.setPosition(w.x,w.y);
   if(this.selected>=0){this.showAim();return;}
   // Brushing only happens while the button/finger is held and has moved past the tap slop.
   if(!p.isDown||this.gesture||this.detOn||this.vacOn||(!this.stroking&&p.getDistance()<STROKE_SLOP))return;
   this.stroking=true;
   if(this.time.now-this.lastBrushAt>=BRUSH_TICK_MS)this.brush(w.x,w.y);
  });
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
   this.lastSX=p.x;this.lastSY=p.y;
   if(this.input.pointer1?.isDown&&this.input.pointer2?.isDown){this.gesture=true;this.stroking=false;this.pinchDist=0;return;}
   this.downAt=this.time.now;this.boardDown=true;
  const w=world(p);this.stroking=false;this.lastBX=w.x;this.lastBY=w.y;this.lastBrushAt=this.time.now;if(this.vacOn){this.aimX=w.x;this.aimY=w.y;}
  });
  this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{
   const wasStroke=this.stroking;this.stroking=false;
   // Letting go after scanning switches the detector off. Tap its button to carry on.
   const scanned=this.detOn&&this.boardDown&&!this.gesture&&this.time.now-this.downAt>=SCAN_DELAY;this.boardDown=false;
   if(scanned&&!this.won)this.pauseDetector();
   if(this.gesture){if(!this.input.pointer1?.isDown&&!this.input.pointer2?.isDown){this.gesture=false;this.pinchDist=0;}return;}
   if(this.won||!this.active||p.x<0||p.x>1200||p.y<0||p.y>700)return;
   if(p.button>0)return;
   const w=world(p);this.aimX=w.x;this.aimY=w.y;
   if(this.selected>=0){this.useTool(w.x,w.y);return;}
   if(wasStroke||p.getDistance()>25)return;
   // A long hold with the detector on was scanning, not a tap.
   if(scanned||(this.vacOn&&this.time.now-this.downAt>=SCAN_DELAY))return;
   this.tap(w.x,w.y,p.wasTouch);
  });
  this.input.on('wheel',(p:Phaser.Input.Pointer,_over:unknown,_dx:number,dy:number)=>{if(this.active&&!this.won)this.zoomAt(Math.exp(-dy*.0013),p.x,p.y);});
  this.input.on('gameout',()=>{this.mouseIn=false;this.cursor.setVisible(false);this.ring.setVisible(false);});
  this.input.on('gameover',()=>{this.mouseIn=true;this.cursor.setVisible(this.selected<0&&!this.detOn&&!this.vacOn);if(this.selected>=0)this.showAim();});
  this.input.keyboard?.on('keydown',(e:KeyboardEvent)=>{
   if(($('instructions') as HTMLDialogElement).open)return;
   if(e.key==='+'||e.key==='='){this.zoomBy(1.3);return;}
   if(e.key==='-'||e.key==='_'){this.zoomBy(1/1.3);return;}
   if(e.key==='0'){this.fitView();return;}
   const arrows:Record<string,[number,number]>={ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};
   if(arrows[e.key]&&this.active&&!this.won){this.panBy(arrows[e.key][0]*90,arrows[e.key][1]*90);e.preventDefault();return;}
   if(e.repeat)return;
   if(e.key==='Escape'){if(this.selected>=0||this.detOn||this.vacOn)sfx.cancel();this.pauseDetector(true);this.pauseVacuum();this.cancelTool();}
   if(['1','2','3'].includes(e.key))this.power(Number(e.key)-1);
  });
  // No level starts until the player picks one on the map.
  this.ready=true;if(this.pending){this.pending=false;this.newRound();}
 }
 /** Starts the level in saved.level (the player picked it on the map). */
 begin(){if(!this.ready){this.pending=true;return;}this.newRound();}
 /** The player left the board for the map or title: stop everything. */
 leave(){this.inLevel=false;this.setNight(false);this.active=false;this.pending=false;this.coach='';hideCoach();window.clearTimeout(this.msgTimer);$('win').classList.add('hidden');if(!this.ready)return;this.round++;this.time.removeAllEvents();this.pauseDetector(true);this.pauseVacuum();this.cancelTool();}
 makeTextures(){
  for(const id of [...ITEMS.map(i=>i.id),...DECOYS]){const texture=this.textures.createCanvas('object-'+id,64,64)!;drawItem(id,texture.context);texture.refresh();}
  const ground=this.textures.createCanvas('ground',1200,700)!;const c=ground.context;
  const grad=c.createRadialGradient(530,280,40,600,350,740);grad.addColorStop(0,'#79602f');grad.addColorStop(.7,'#48391e');grad.addColorStop(1,'#251c12');c.fillStyle=grad;c.fillRect(0,0,1200,700);
  const rng=new Phaser.Math.RandomDataGenerator(['needle-textures']);for(let i=0;i<14000;i++){c.fillStyle=`rgba(${rng.pick(['255,230,170','45,34,17'])},${rng.realInRange(.02,.12)})`;c.fillRect(rng.between(0,1200),rng.between(0,700),rng.between(1,3),rng.between(1,3));}ground.refresh();
  for(let n=0;n<18;n++){const t=this.textures.createCanvas('straw'+n,240,60)!,x=t.context;const bend=rng.between(-23,23);this.bends[n]=bend;x.lineCap='round';x.shadowColor='#211708bb';x.shadowBlur=4;x.shadowOffsetY=3;const width=1.8+n%5*.65;x.beginPath();x.moveTo(7,30);x.quadraticCurveTo(100,30+bend,232,28);x.lineWidth=width;x.strokeStyle=['#a4772e','#c89b44','#9e702a','#d9b661','#b78a35','#e3c77d'][n%6];x.stroke();x.shadowColor='transparent';x.beginPath();x.moveTo(9,29);x.quadraticCurveTo(100,29+bend,230,27);x.lineWidth=.55;x.strokeStyle='#ffe9ab99';x.stroke();if(n%4===0){for(let j=0;j<8;j++){const p=162+j*7,yy=28+bend*.2;x.beginPath();x.ellipse(p,yy-3,8,2,-.65,0,Math.PI*2);x.fillStyle=n%2?'#bb8e3e':'#b18a41';x.fill();x.beginPath();x.ellipse(p,yy+3,8,2,.65,0,Math.PI*2);x.fill();}}t.refresh();}
  const t=this.textures.createCanvas('needle',86,20)!,x=t.context; x.shadowColor='#302a25';x.shadowBlur=2;x.shadowOffsetY=1;const g=x.createLinearGradient(0,8,0,12);g.addColorStop(0,'#c7b99a');g.addColorStop(.35,'#abaea4');g.addColorStop(.6,'#656c62');g.addColorStop(1,'#c6c3ac');x.fillStyle=g;x.beginPath();x.moveTo(3,10);x.lineTo(73,8);x.bezierCurveTo(83,7,83,13,73,12);x.closePath();x.fill();x.shadowColor='transparent';x.fillStyle='#544329';x.beginPath();x.ellipse(75,10,3,1,0,0,Math.PI*2);x.fill();t.refresh();
 }
 newRound(){
  // The daily haystack is built from the date, so it is the same layout and items for everyone.
  const restore=this.mode==='daily'?seedRandom(dailySeed()):null;
  try{this.buildRound();}finally{restore?.();}
  this.levelStartedAt=this.time.now;this.hayGot=0;
  logEvent('level_start',{level:this.mode==='daily'?0:saved.level,mode:this.mode,slots:this.treasures.length});
  platform().gameStart();platform().levelStart(this.mode==='daily'?0:saved.level);
 }
 buildRound(){
  this.round++;this.time.removeAllEvents();
  this.treasures.forEach(t=>t.sprite.destroy());this.treasures=[];this.bonusFound=0;this.decoys.forEach(d=>d.sprite.destroy());this.decoys=[];
  this.pauseVacuum();this.cancelTool();this.effects.forEach(e=>e.destroy());this.effects=[];
  this.tweens.killAll();this.moving.clear();this.straws.forEach(s=>s.destroy());this.straws=[];this.needle?.destroy();this.glint?.destroy();
  this.inLevel=true;this.pauseDetector(true);this.ring.setVisible(false);this.gesture=false;this.panning=false;this.pinchDist=0;
  this.won=false;this.started=this.time.now;this.elapsed=0;this.stroking=false;this.brushedOnce=false;this.active=true;this.coach='';this.coverStraw=null;this.coachCheck=0;hideCoach();
  $('win').classList.add('hidden');
  const daily=this.mode==='daily';
  ($('level').parentElement!.firstChild as Text).textContent=daily?'Daily ':'Level ';$('level').textContent=daily?'haystack':String(saved.level);setWorldTheme(daily?TOTAL_LEVELS-12:saved.level);this.updateTools();
  const stage=daily?dailyDef(Math.random):levelDef(saved.level);this.ground.setTint(stage.tint);
  const tint=mulColor(stage.tint,lookOf('hay').color);
  const kinds=daily?rollDaily(Math.random):rollItems(stage.slots,stage.world,Math.random,{pity:saved.pity,easy:stage.n>0&&stage.n<=4,eventSet:activeEvent()?.set});
  // The haystack can be bigger than one screen: the layouts are drawn for 1200 x 700 and stretched to fit.
  this.cameras.main.resetFX();
  this.dome=stage.dome;this.size=stage.size;this.worldW=1200*this.size;this.worldH=700*this.size;WORLD_W=this.worldW;
  this.ground.setPosition(this.worldW/2,this.worldH/2).setScale(this.size);
  this.cameras.main.setBounds(0,0,this.worldW,this.worldH);this.initialView();
  const place=()=>{const p=pilePoint(stage.shape);return{x:p.x*this.size,y:p.y*this.size,angle:p.angle};};
  // 1. The pile.
  for(let i=0;i<stage.count;i++){const p=place(),depth=this.dome?this.domeDepth(p):i/stage.count*690;this.straws.push(this.add.image(p.x,p.y,'straw'+i%18).setRotation(p.angle+Phaser.Math.FloatBetween(-.6,.6)).setScale(Phaser.Math.FloatBetween(.4,1.15),Phaser.Math.FloatBetween(.6,1.1)).setTint(this.shade(tint,depth)).setDepth(depth));}
  // 2. The needle and the bonus items, tucked into the middle layers of the pile.
  const target=place();const occupied:Point[]=[target];
  this.needle=this.add.image(target.x,target.y,'needle').setDepth(690*Phaser.Math.FloatBetween(stage.depth[0],stage.depth[1])).setRotation(Phaser.Math.FloatBetween(-Math.PI,Math.PI)).setScale(stage.needle).setTint(lookOf('needle').color);
  for(const kind of kinds){let p=place();for(let tries=0;tries<100&&occupied.some(o=>Phaser.Math.Distance.Between(p.x,p.y,o.x,o.y)<110*this.size);tries++)p=place();occupied.push(p);
   this.treasures.push({sprite:this.add.image(p.x,p.y,'object-'+kind).setRotation(Phaser.Math.FloatBetween(-1,1)).setScale(.72).setDepth(690*Phaser.Math.FloatBetween(stage.depth[0],stage.depth[1])),kind,collected:false});}
  for(let i=0;i<stage.decoys;i++){let p=place();for(let tries=0;tries<100&&occupied.some(o=>Phaser.Math.Distance.Between(p.x,p.y,o.x,o.y)<110*this.size);tries++)p=place();occupied.push(p);
   const kind=DECOYS[i%DECOYS.length];this.decoys.push({sprite:this.add.image(p.x,p.y,'object-'+kind).setRotation(Phaser.Math.FloatBetween(-Math.PI,Math.PI)).setScale(.95).setDepth(690*Phaser.Math.FloatBetween(stage.depth[0],stage.depth[1])),kind,found:false});}
  // 3. More hay over each one until it's hidden as far as this level asks (level 2 uses one long straw instead).
  if(stage.cover)this.layCover(tint);else this.bury(this.needle,NEEDLE_SAMPLES,tint,true,stage.hidden);
  this.treasures.forEach(t=>this.bury(t.sprite,OBJECT_SAMPLES,tint,false,stage.hidden));
  this.decoys.forEach(d=>this.bury(d.sprite,NEEDLE_SAMPLES,tint,false,stage.hidden));
  this.glint=this.add.star(target.x,target.y,4,.4,3,0xd5c69b).setDepth(702).setAlpha(0);this.drift=0;
  this.updateMission();this.setNight(stage.night);this.say(this.resting(),{instant:true});this.startTeaching(stage);this.introduceTool();
  // The first haystack bigger than the screen: say once how to look around it.
  if(stage.size>1&&!hasSeen('zoom')){markSeen('zoom');this.say('Scroll or pinch to zoom in and out',{passing:true});}
  if(!reduced)this.cameras.main.fadeIn(450,35,27,16);
 }
 /** Level 2: one long straight straw lies right along the needle and nothing else hides it, so
  *  tapping that straw is all it takes. */
 /** How high a straw lies in a haystack: the middle is the tallest, the edge the lowest, with some jumble. */
 domeDepth(p:{x:number;y:number}){const nr=Math.min(1,Math.hypot((p.x/this.size-600)/500,(p.y/this.size-350)/270));return Math.min(689,690*(.3*Math.random()+.7*(1-nr)));}
 /** Straws lower in the stack sit in shade; in a haystack the top is bright and the layers below go darker. */
 shade(tint:number,depth:number){if(!this.dome)return tint;const k=.3+.7*Math.pow(Math.min(1,depth/690),1.3),c=Phaser.Display.Color.IntegerToColor(tint);return Phaser.Display.Color.GetColor(Math.round(c.red*k),Math.round(c.green*k),Math.round(c.blue*k));}
 layCover(tint:number){
  const nd=this.needle,samples=this.samplePoints(nd,NEEDLE_SAMPLES);
  for(const s of this.straws)if(s.depth>nd.depth&&samples.some(p=>this.hitsStraw(s,p.x,p.y,STRAW_HALF_WIDTH+2)))s.setData('gone',true).setAlpha(0);
  let flat=0;this.bends.forEach((b,i)=>{if(Math.abs(b)<Math.abs(this.bends[flat]))flat=i;});
  const off=this.curveAt(flat,0),c=Math.cos(nd.rotation),s=Math.sin(nd.rotation);
  const cover=this.add.image(nd.x+s*off,nd.y-c*off,'straw'+flat).setRotation(nd.rotation).setScale(.62,1).setTint(tint).setDepth(Math.min(689.5,nd.depth+8));
  this.straws.push(cover);this.coverStraw=cover;
 }
 /** First-time guides. Each is shown once, on the level that teaches it:
  *  1 brush then tap the needle, 2 lift a straw, 3 a bonus item. */
 startTeaching(def:LevelDef){
  if(def.teach==='brush'&&!hasSeen('brush'))this.coach='brush';
  else if(def.teach==='pluck'&&!hasSeen('pluck'))this.coach='pluck';
  else if(def.teach==='bonus'&&!hasSeen('bonus')&&this.treasures.length){
   markSeen('bonus');$('mission').classList.add('pulse');window.setTimeout(()=>$('mission').classList.remove('pulse'),6500);
   this.say(`Look for the ${itemName(this.treasures[0].kind).toLowerCase()} too`,{passing:true});
  }
  if(this.coach)this.say(this.resting(),{instant:true});
  this.syncCoach();
 }
 /** Moves the guide (touch circle and ring) to where the current step points. */
 syncCoach(){
  const el=$('coach');
  if(!this.coach||this.won){el.classList.add('hidden');return;}
  this.placeCoach();
  const cls=`coach ${this.coach==='brush'?'drag':'tap'}`;if(el.className!==cls)el.className=cls;
 }
 /** Puts the guide on its target; it follows the view as the player zooms and pans. */
 placeCoach(){
  if(!this.coach)return;
  const el=$('coach'),cam=this.cameras.main,pct=(v:number,max:number)=>`${(v/max*100).toFixed(2)}%`;
  const target=this.coach==='pluck'&&this.coverStraw?this.coverStraw:this.needle;
  const p=this.toScreen(target.x,target.y),reach=120*cam.zoom;
  const x0=this.coach==='brush'?Phaser.Math.Clamp(p.x-reach,60,1140):p.x,x1=Phaser.Math.Clamp(p.x+reach,60,1140);
  el.style.setProperty('--x0',pct(x0,1200));el.style.setProperty('--x1',pct(x1,1200));el.style.setProperty('--y0',pct(p.y,700));
 }
 advanceCoach(next:'tap'){this.coach=next;this.syncCoach();this.say(this.resting());sfx.select();}
 /** Lays extra straws over an object until no more than (1 - hidden) of its sample points can be seen. */
 bury(obj:Item,samples:Point[],tint:number,isNeedle:boolean,hidden:number){
  const near=this.straws.filter(s=>s.depth>obj.depth&&Math.abs(s.x-obj.x)<200&&Math.abs(s.y-obj.y)<200);
  for(let tries=0;tries<80;tries++){
   const open=this.samplePoints(obj,samples).filter(p=>!this.covered(p.x,p.y,obj.depth,near));
   if(open.length<=samples.length*(1-hidden))return;
   const p=Phaser.Utils.Array.GetRandom(open) as Point;
   // Needles hide best under straws lying the same way; round objects under any angle.
   const angle=isNeedle?obj.rotation+Phaser.Math.FloatBetween(-.35,.35):Phaser.Math.FloatBetween(-Math.PI,Math.PI);
   const n=Phaser.Math.Between(0,17),sx=Phaser.Math.FloatBetween(.45,.85),sy=Phaser.Math.FloatBetween(.8,1.1);
   // Place the straw so its drawn curve passes through p.
   const along=Phaser.Math.FloatBetween(-70,70),off=this.curveAt(n,along),c=Math.cos(angle),s=Math.sin(angle);
   const d=Phaser.Math.FloatBetween(obj.depth+1,689),straw=this.add.image(p.x-c*along*sx+s*off*sy,p.y-s*along*sx-c*off*sy,'straw'+n).setRotation(angle).setScale(sx,sy).setTint(this.shade(tint,d)).setDepth(d);
   this.straws.push(straw);near.push(straw);
  }
 }
 /** World positions of an object's sample points. */
 samplePoints(obj:Item,samples:Point[]):Point[]{const c=Math.cos(obj.rotation),s=Math.sin(obj.rotation);return samples.map(p=>({x:obj.x+(p.x*c-p.y*s)*obj.scaleX,y:obj.y+(p.x*s+p.y*c)*obj.scaleY}));}
 /** True if a straw above `depth` lies over (x,y). */
 covered(x:number,y:number,depth:number,straws=this.straws){return straws.some(s=>s.depth>depth&&!s.getData('gone')&&s.alpha>.2&&Math.abs(s.x-x)<140&&Math.abs(s.y-y)<140&&this.hitsStraw(s,x,y,STRAW_HALF_WIDTH));}
 /** Share of an object (0 to 1) that the hay doesn't cover. */
 visibleShare(obj:Item,samples:Point[]){const pts=this.samplePoints(obj,samples);return pts.filter(p=>!this.covered(p.x,p.y,obj.depth)).length/pts.length;}
 onNeedle(x:number,y:number,f=1){const dx=x-this.needle.x,dy=y-this.needle.y,a=-this.needle.rotation;return Math.abs(dx*Math.cos(a)-dy*Math.sin(a))<27*f&&Math.abs(dx*Math.sin(a)+dy*Math.cos(a))<11*f;}
 /** A tap picks up anything you can see enough of; otherwise it lifts the top straw there. */
 tap(x:number,y:number,touch:boolean){
  // Zoomed out, things are small on screen, so the tap gets a little more forgiving.
  const f=Math.max(1,.9/this.cameras.main.zoom);
  const t=this.treasures.find(t=>!t.collected&&Phaser.Math.Distance.Between(x,y,t.sprite.x,t.sprite.y)<26*f);
  if(t&&this.visibleShare(t.sprite,OBJECT_SAMPLES)>=VISIBLE_TO_TAP){this.collect(t);return;}
  const dc=this.decoys.find(d=>!d.found&&Phaser.Math.Distance.Between(x,y,d.sprite.x,d.sprite.y)<30*f);
  if(dc&&this.visibleShare(dc.sprite,NEEDLE_SAMPLES)>=VISIBLE_TO_TAP){this.decoyTap(dc);return;}
  if(this.onNeedle(x,y,f)&&this.visibleShare(this.needle,NEEDLE_SAMPLES)>=VISIBLE_TO_TAP){this.finish();return;}
  this.pluck(x,y,touch);
 }
 // ---------------------------------------------------------------- physics
 /** Steers something toward a velocity (a stroke dragging it along). */
 drag(o:Item,vx:number,vy:number,vr:number,blend=.6){const m=this.moving.get(o)??{vx:0,vy:0,vr:0};m.vx+=(vx-m.vx)*blend;m.vy+=(vy-m.vy)*blend;m.vr+=(vr-m.vr)*blend;this.limit(m);this.moving.set(o,m);}
 /** Adds a sudden push (the hay parting). */
 kick(o:Item,vx:number,vy:number,vr:number){const m=this.moving.get(o)??{vx:0,vy:0,vr:0};m.vx+=vx;m.vy+=vy;m.vr+=vr;this.limit(m);this.moving.set(o,m);}
 limit(m:{vx:number;vy:number;vr:number}){const sp=Math.hypot(m.vx,m.vy);if(sp>MAX_SPEED){m.vx*=MAX_SPEED/sp;m.vy*=MAX_SPEED/sp;}m.vr=Phaser.Math.Clamp(m.vr,-MAX_SPIN,MAX_SPIN);}
 /** Moves everything that's sliding, slows it with friction, and keeps it on the board. */
 step(dt:number){const k=Math.exp(-FRICTION*dt);for(const [o,m] of this.moving){if(!o.active){this.moving.delete(o);continue;}o.x+=m.vx*dt;o.y+=m.vy*dt;o.rotation+=m.vr*dt;if(o.x<0||o.x>this.worldW){o.x=Phaser.Math.Clamp(o.x,0,this.worldW);m.vx*=-.3;}if(o.y<0||o.y>this.worldH){o.y=Phaser.Math.Clamp(o.y,0,this.worldH);m.vy*=-.3;}m.vx*=k;m.vy*=k;m.vr*=k;if(Math.abs(m.vx)+Math.abs(m.vy)<4&&Math.abs(m.vr)<.05)this.moving.delete(o);}}
 /** One brush tick: the hay under the brush slides along with the stroke, top layer
  *  most and deeper layers less, parting slightly and turning when pushed off-centre.
  *  The needle and bonus items lying underneath are carried along a little too. */
 brush(x:number,y:number){
  const R=this.brushR,now=this.time.now,dt=Math.max(.016,(now-this.lastBrushAt)/1000);
  const dx=x-this.lastBX,dy=y-this.lastBY,len=Math.hypot(dx,dy);
  this.lastBX=x;this.lastBY=y;this.lastBrushAt=now;
  if(len<1)return;
  const ux=dx/len,uy=dy/len,speed=Math.min(1800,len/dt);
  const hits:{s:Item;dist:number;cx:number;cy:number}[]=[];
  for(const s of this.straws){
   if(s.getData('gone')||s.alpha<.2)continue;
   const ox=x-s.x,oy=y-s.y;if(Math.abs(ox)>150||Math.abs(oy)>150)continue;
   // Closest point on the straw's length to the brush.
   const c=Math.cos(s.rotation),sn=Math.sin(s.rotation),half=112*s.scaleX,along=Phaser.Math.Clamp(ox*c+oy*sn,-half,half);
   const cx=s.x+c*along,cy=s.y+sn*along,dist=Math.hypot(x-cx,y-cy);
   if(dist<R)hits.push({s,dist,cx,cy});
  }
  hits.sort((a,b)=>b.s.depth-a.s.depth);
  hits.slice(0,18).forEach((h,i)=>{
   const v=speed*CARRY*(1-(h.dist/R)**2)*Math.max(.25,1-i*.08);
   const rx=h.cx-x,ry=h.cy-y,rl=Math.hypot(rx,ry)||1;
   const vx=ux*v+rx/rl*v*.25,vy=uy*v+ry/rl*v*.25;
   const ax=h.cx-h.s.x,ay=h.cy-h.s.y,half=112*h.s.scaleX;
   this.drag(h.s,vx,vy,(ax*vy-ay*vx)/(half*half)*1.5);
  });
  for(const o of [this.needle,...this.treasures.filter(t=>!t.collected).map(t=>t.sprite),...this.decoys.filter(d=>!d.found).map(d=>d.sprite)]){
   const d=Phaser.Math.Distance.Between(x,y,o.x,o.y),reach=R+14;
   if(d<reach){const f=1-d/reach;this.drag(o,ux*speed*CARRY_ITEMS*f,uy*speed*CARRY_ITEMS*f,Phaser.Math.FloatBetween(-.6,.6)*f,.4);}
  }
  if(hits.length){sfx.brush(Math.min(5,Math.ceil(hits.length/3)),panAt(x));if(!this.brushedOnce){this.brushedOnce=true;this.say(this.resting());}}
 }
 /** Lifts the single top straw under the pointer and flicks it off the pile. */
 pluck(x:number,y:number,touch:boolean){const slop=touch?16:8;let top:Item|undefined;for(const s of this.straws){if(s.getData('gone')||s.alpha<.2||!this.hitsStraw(s,x,y,5+slop/s.scaleY))continue;if(!top||s.depth>top.depth)top=s;}const sc=scoop();if(sc.n>1&&this.scoopAt(x,y,sc))return;if(top)this.flick(top);}
  /** The shovel: a tap lifts the top 
 straws that lie within 
 of the tap, starting from the top layer. Items are never touched. */
  scoopAt(x:number,y:number,sc:{n:number;r:number}){
   const r=sc.r*Phaser.Math.Clamp(1/Math.sqrt(this.cameras.main.zoom),.8,1.6),box=r+170;
   const hit=this.straws.filter(s=>!s.getData('gone')&&s.alpha>.2&&Math.abs(s.x-x)<box&&Math.abs(s.y-y)<box&&this.hitsStraw(s,x,y,r/s.scaleY)).sort((a,b)=>b.depth-a.depth).slice(0,sc.n);
   if(!hit.length)return false;
   sfx.scoop(panAt(x),hit.length);hit.forEach((s,i)=>this.flick(s,false,reduced?0:i*16,i%3===0));
   const ring=this.add.circle(x,y,r*.35).setStrokeStyle(3,0xf3dfae,.45).setDepth(1250);this.effects.push(ring);
   this.tweens.add({targets:ring,scale:1/.35,alpha:0,duration:reduced?1:380,ease:'Sine.Out',onComplete:()=>ring.destroy()});
   return true;
  }
 /** Lifts one straw out of the hay: it rises toward you, then sails up and away, spinning and fading, with a ring and a puff of dust. */
 flick(s:Item,sound=true,delay=0,dust=true){this.hayGot++;
  quest('pluck');
  if(sound)sfx.pluck(panAt(s.x));
  s.setData('gone',true);this.moving.delete(s);this.tweens.killTweensOf(s);
  if(reduced){s.setAlpha(0);return;}
  const x0=s.x,y0=s.y,kx=s.scaleX,ky=s.scaleY,a=-Math.PI/2+Phaser.Math.FloatBetween(-.7,.7),d=Phaser.Math.Between(130,190),turn=s.angle+Phaser.Math.Between(-150,150);
  s.setDepth(1400);
  this.tweens.chain({targets:s,tweens:[
   {scaleX:kx*1.25,scaleY:ky*1.25,y:y0-30,angle:s.angle+Phaser.Math.Between(-12,12),delay,duration:150,ease:'Back.Out'},
   {x:x0+Math.cos(a)*d,y:y0-30+Math.sin(a)*d,angle:turn,scaleX:kx*1.45,scaleY:ky*1.45,alpha:0,duration:Phaser.Math.Between(460,600),ease:'Cubic.In'},
  ]});
  if(dust)this.time.delayedCall(delay,()=>this.puff(x0,y0));
 }
 /** A soft ring and a few specks of hay dust drifting out from a spot. */
 puff(x:number,y:number){
  if(reduced)return;
  const ring=this.add.circle(x,y,12).setStrokeStyle(2,0xf3dfae,.4).setDepth(1390);this.effects.push(ring);
  this.tweens.add({targets:ring,scale:2.6,alpha:0,duration:300,ease:'Sine.Out',onComplete:()=>ring.destroy()});
  for(let i=0;i<7;i++){
   const a=Phaser.Math.FloatBetween(0,Math.PI*2),r=Phaser.Math.Between(22,52);
   const p=this.add.circle(x,y,Phaser.Math.Between(2,4),i%2?0xf0dca4:0xd9bd78,.7).setDepth(1390);this.effects.push(p);
   this.tweens.add({targets:p,x:x+Math.cos(a)*r,y:y+Math.sin(a)*r-14,alpha:0,scale:.3,duration:Phaser.Math.Between(380,560),ease:'Sine.Out',onComplete:()=>p.destroy()});
  }
 } /** Offset (texture px) of straw texture `n`'s curve from its centre line, at `lx` along it.
  *  Straw textures are 240x60 with a quadratic curve from (7,30) via (100,30+bend) to (232,28). */
 curveAt(n:number,lx:number){const t=Phaser.Math.Clamp((lx+113)/225,0,1),bend=this.bends[n]??0;return (1-t)*(1-t)*30+2*t*(1-t)*(30+bend)+t*t*28-30;}
 /** True if (x,y) lies within `tol` texture px of the straw's drawn curve. */
 hitsStraw(s:Item,x:number,y:number,tol:number){const dx=x-s.x,dy=y-s.y,c=Math.cos(-s.rotation),sn=Math.sin(-s.rotation);const lx=(dx*c-dy*sn)/s.scaleX,ly=(dx*sn+dy*c)/s.scaleY;if(Math.abs(lx)>118)return false;return Math.abs(ly-this.curveAt(Number(s.texture.key.slice(5)),lx))<tol;}
 // ---------------------------------------------------------------- messages
 /** What the message line says when nothing has just happened. */
 resting(){if(this.won)return 'You found it!';if(this.selected>=0)return 'Now tap the hay';if(this.coach==='brush')return 'Drag across the hay';if(this.coach==='pluck')return 'Tap the straw to lift it';if(this.coach==='tap')return 'Now tap the needle!';return '';}
 /** Shows a message with a soft fade; an empty message hides the line. Passing messages
  *  fade away after a few seconds (back to the resting message, if there is one). */
 say(text:string,opts:{passing?:boolean;instant?:boolean}={}){
  window.clearTimeout(this.msgTimer);
  if(opts.passing)this.msgTimer=window.setTimeout(()=>this.say(this.resting()),PASSING_MS);
  const el=$('board-message'),tag=el.parentElement!;
  if(opts.instant){this.msgToken++;this.msgTarget=text;el.textContent=text;tag.classList.toggle('out',!text);return;}
  if(text===this.msgTarget)return;
  this.msgTarget=text;const token=++this.msgToken;tag.classList.add('out');
  window.setTimeout(()=>{if(token!==this.msgToken)return;el.textContent=text;if(!text)return;tag.classList.remove('out','in');void tag.offsetWidth;tag.classList.add('in');},reduced?0:170);
 }
 /** A big word over the board that pops in, holds, then floats up and fades. */
 pop(x:number,y:number,label:string,color:string){
  // Sized for the screen, whatever the zoom.
  const k=Phaser.Math.Clamp(1/this.cameras.main.zoom,.8,2.2),t=this.add.text(x,Phaser.Math.Clamp(y-60*k,50,this.worldH-50),label,{fontFamily:'Trebuchet MS, sans-serif',fontSize:'46px',fontStyle:'bold',color,stroke:'#5b3a1f',strokeThickness:7}).setOrigin(.5).setDepth(1500).setShadow(0,4,'#3b250f',0,true,true).setScale(.4).setAlpha(0);
  this.effects.push(t);
  this.tweens.chain({targets:t,tweens:[{scale:k,alpha:1,duration:reduced?0:280,ease:'Back.Out'},{y:t.y-36,alpha:0,delay:reduced?400:600,duration:reduced?200:700,ease:'Sine.In',onComplete:()=>t.destroy()}]});
 }
 // Bonus items to find, as big pictures. Hidden on levels without bonus items.
 updateMission(justFound?:Treasure){$('mission').classList.toggle('hidden',!this.treasures.length);$('mission').innerHTML=`<span class="bonus-label">Also find</span>`+this.treasures.map(t=>{const r=rarityOf(t.kind),nm=itemName(t.kind);return `<span class="bonus-object r-${r} ${t.collected?'collected':''} ${t.kind===justFound?'just':''}" title="${nm}${t.collected?' found':''} (${RARITIES[r].label})" role="img" aria-label="${nm}, ${RARITIES[r].label}${t.collected?', found':', not found yet'}"><img alt="" src="${this.objectImage(t.kind)}">${t.collected?`<i class="tick">${TICK}</i>`:''}</span>`;}).join('');}
 /** A bonus item's picture as an image URL, for the page around the board. */
 objectImage(kind:Treasure){return (this.textures.get('object-'+kind).getSourceImage() as HTMLCanvasElement).toDataURL();}
 collect(t:{sprite:Item;kind:Treasure;collected:boolean}){
   t.collected=true;this.bonusFound++;this.moving.delete(t.sprite);
   const r=rarityOf(t.kind),nm=itemName(t.kind),pan=panAt(t.sprite.x);
   saved.pity=nextPity(saved.pity,r);persist();
   quest('find');if(r!=='common')quest('uncommon');
   logEvent('item_found',{item:t.kind,rarity:r,level:this.mode==='daily'?0:saved.level,mode:this.mode});
   if(r==='treasure')sfx.treasure(pan);else if(isRarePlus(r))sfx.rare(pan);else sfx.bonus(pan);
   const label=r==='treasure'?'TREASURE!':r==='rare'?'RARE!':r==='uncommon'?'NICE!':'BONUS!',color=r==='treasure'?'#ffd24a':r==='rare'?'#8fd0ff':r==='uncommon'?'#a8f08c':'#ffdf65';
   this.pop(t.sprite.x,t.sprite.y,label,color);
   if(isRarePlus(r)&&!reduced)this.sparkleBurst(t.sprite.x,t.sprite.y,r==='treasure'?26:14);
   // It lifts out of the hay, then drifts up and fades.
   const s=t.sprite;s.setDepth(1450);this.tweens.killTweensOf(s);
   this.tweens.chain({targets:s,tweens:[{scale:s.scaleX*1.6,y:s.y-18,rotation:0,duration:reduced?0:300,ease:'Back.Out'},{y:s.y-70,alpha:0,delay:reduced?0:350,duration:reduced?0:500,ease:'Sine.In'}]});
   this.updateMission(t.kind);this.say(`You found the ${nm.toLowerCase()}!`,{passing:true});
 }
 /** A pin or a nail: not the needle, and no harm done. It tips over and fades. */
 decoyTap(d:{sprite:Item;kind:string;found:boolean}){
   d.found=true;this.moving.delete(d.sprite);sfx.decoy(panAt(d.sprite.x));
   this.say(`Just ${DECOY_NAME[d.kind]??'something else'}!`,{passing:true});
   logEvent('decoy_tapped',{level:this.mode==='daily'?0:saved.level});
   this.tweens.add({targets:d.sprite,y:d.sprite.y-30,rotation:d.sprite.rotation+.8,alpha:0,duration:reduced?0:600,ease:'Sine.Out'});
 }
 /** A burst of gold specks for a rare find. */
 sparkleBurst(x:number,y:number,n:number){
   for(let i=0;i<n;i++){const a=Phaser.Math.FloatBetween(0,Math.PI*2),r=Phaser.Math.Between(40,110),p=this.add.circle(x,y,Phaser.Math.Between(2,4),i%2?0xffe58a:0xffffff).setDepth(1600);this.effects.push(p);
    this.tweens.add({targets:p,x:x+Math.cos(a)*r,y:y+Math.sin(a)*r-20,alpha:0,scale:.4,duration:Phaser.Math.Between(500,900),ease:'Sine.Out',onComplete:()=>p.destroy()});}
 }
 /** Night levels: the hay shows only in a circle of light around the pointer. */
 setNight(on:boolean){this.nightOn=on;$('night').classList.toggle('hidden',!on);if(on)this.moveVeil(innerWidth/2,innerHeight/2);}
 moveVeil(cx:number,cy:number){const v=$('night'),r=v.parentElement!.getBoundingClientRect();v.style.setProperty('--x',(cx-r.left)+'px');v.style.setProperty('--y',(cy-r.top)+'px');v.style.setProperty('--r',Math.round(r.width*.14)+'px');} introduceTool(){const index=TOOL_LEVELS.findIndex((level,i)=>saved.level===level&&!saved.introduced.includes(i));if(index<0)return;this.active=false;const pauseAt=this.time.now;const modal=document.createElement('dialog');modal.className='tool-intro';modal.innerHTML=`<div class="unlock-icon">${HELPER_ART[index]}</div><h2>New helper:<br>${HELPER_NAME[index]}</h2><p>${['Tap it, then hold down and sweep over the hay.<br>White ping: working. Green: something is near.<br>Let go to switch it off.<br>Here are '+CELLS.starter+' battery cells to start.','Tap it, then tap the hay.<br>The fan blows the hay away.','Tap it, then hold down on the hay.<br>The nozzle draws the top layer in while you hold.<br>Let go to pause.'][index]}</p><button class="primary">Got it!</button>`;document.body.append(modal);let origin={x:innerWidth/2,y:innerHeight/2};
 modal.addEventListener('close',()=>{saved.introduced.push(index);if(index===0){saved.cells+=CELLS.starter;holdCells(CELLS.starter);}persist();updateCellsPill();this.updateTools();if(index===0)flyCells(origin,CELLS.starter);const tool=$(TOOLIDS[index]);tool.classList.add('just-unlocked','guide');window.setTimeout(()=>tool.classList.remove('just-unlocked'),800);this.started+=this.time.now-pauseAt;this.active=true;modal.remove();},{once:true});modal.querySelector('button')!.onclick=e=>{sfx.select();origin=centerOf(e.currentTarget as HTMLElement);modal.close();};modal.showModal();sfx.unlockTool();}
 /** Out of battery cells: offer a short video for one, or the shop. */
 askForCells(){
  if(document.querySelector('dialog[open]'))return;
  const was=this.active;this.active=false;
  const dlg=document.createElement('dialog');dlg.className='cells-out';
  const left=adsLeft();
  dlg.innerHTML=`<div class="unlock-icon">${CELL_ART}</div><h2>Out of cells</h2><p>Battery cells run the helpers. You get some in the daily gift, from quests, and in the shop.</p>${left>0?`<button class="primary video">Watch a video: +1 cell</button><small class="left">${left} left today</small>`:''}<button class="secondary shopgo">Open the shop</button><button class="text-button later">Not now</button>`;
  document.body.append(dlg);
  let back=false;const resume=()=>{if(back)return;back=true;if(was&&screen==='game')this.active=true;};
  dlg.addEventListener('close',()=>{dlg.remove();resume();},{once:true});
  dlg.querySelector('.video')?.addEventListener('click',e=>{const from=centerOf(e.currentTarget as HTMLElement);dlg.close();void watchForCell(from);});
  dlg.querySelector('.shopgo')!.addEventListener('click',()=>{sfx.select();dlg.close();resume();$('btn-shop').click();});
  dlg.querySelector('.later')!.addEventListener('click',()=>{sfx.cancel();dlg.close();});
  dlg.showModal();
 }
 power(index:number){if(this.won||!this.active)return;if(index===0&&this.detOn){sfx.cancel();this.pauseDetector();return;}if(index===2&&this.vacOn){sfx.cancel();this.pauseVacuum();return;}if(index!==2&&this.vacOn)this.pauseVacuum();if(this.selected===index){sfx.cancel();this.cancelTool();return;}if(!saved.cheat&&saved.level<TOOL_LEVELS[index]){sfx.denied();return;}if(index===2){this.cancelTool();this.pauseDetector(true);if(this.vacLeft<=0){if(this.cells()<=0){sfx.denied();this.askForCells();return;}this.spendCell();this.vacLeft=vacuum().ms;}sfx.select();this.armVacuum();return;}if(this.cells()<=0&&!(index===0&&this.detLeft>0)){sfx.denied();this.askForCells();return;}if(index===0){this.cancelTool();this.startDetector();return;}this.pauseDetector(true);this.cancelTool();sfx.select();$(TOOLIDS[index]).classList.remove('guide');this.selected=index;this.cursor.setVisible(false);this.showAim();this.updateTools();this.say(this.resting());}
 cancelTool(){this.selected=-1;this.ring?.setVisible(false);this.cursor?.setVisible(true);this.updateTools();if(this.straws.length)this.say(this.resting());}
 /** Detector: one charge, DET_MS of sweeping. It beeps faster and higher the closer the pointer is to the needle or a bonus item, covered or not. */
 startDetector(){
  const resume=this.detLeft>0;
  if(!resume){this.spendCell();const d=detector();this.detMs=d.ms;this.detR=d.r;this.detLeft=d.ms;}
  this.detOn=true;this.detHeld=false;this.detBeepAt=0;this.detScan=0;this.detClose=0;this.detPingAt=0;this.detTargets=[];
  sfx.select();$('magnet').classList.remove('guide');this.cursor.setVisible(false);this.detG.setVisible(true);$('game').style.cursor='none';this.updateTools();
  this.say(resume?'Hold down to scan again.':'Hold down and sweep. Watch the signal.',{passing:true});
 }
 endDetector(quiet=false){
  if(this.detLeft<=0&&!this.detG?.visible)return;
  this.detLeft=0;this.detOn=false;this.detHeld=false;this.detG?.clear().setVisible(false);this.cursor?.setVisible(true);$('game').style.cursor='';this.updateTools();
  if(!quiet&&this.straws.length)this.say(this.resting());
 }
 /** Switches the detector off but keeps what is left of its cell. Tapping the button again carries on. */
 pauseDetector(quiet=false){
  if(!this.detOn)return;
  this.detOn=false;this.detHeld=false;this.detG?.clear().setVisible(false);this.cursor?.setVisible(true);$('game').style.cursor='';this.updateTools();
  if(!quiet)this.say('Detector off. Tap it to scan again.',{passing:true});
 }
 /** Runs every frame: counts the energy down while scanning, finds what is nearby, beeps and draws the detector. */
 detectorTick(delta:number){
  if(this.detLeft<=0||!this.detOn)return;
  const DET_R=this.detR,DET_MS=this.detMs;
  if(this.won){this.pauseDetector(true);return;}
  if(!this.active)return;
  // It only scans while the button (or a finger) is held down, and only that time uses up the cell.
  const held=this.input.activePointer.isDown&&!this.gesture&&this.time.now-this.downAt>=SCAN_DELAY;
  // Starting a scan always uses a minimum slice of the cell, and the first ping waits a moment.
  if(held&&!this.detHeld){this.detLeft-=DET_MIN;this.detPingAt=this.time.now+900;}
  this.detHeld=held;
  if(held){this.detLeft-=delta;this.detQuest+=delta;if(this.detQuest>=1000){quest('detector',this.detQuest/1000);this.detQuest=0;}}
  // A finished cell hands over to the next one; only when none is left does the detector stop.
  if(this.detLeft<=0){
   if(this.cells()>0){this.spendCell();this.detLeft+=DET_MS;sfx.select();this.updateTools();}
   else{sfx.cancel();this.endDetector(true);this.say('The detector needs a rest.',{passing:true});return;}
  }
  const now=this.time.now,f=Math.max(0,this.detLeft/DET_MS);
  const live=$('cell-live');if(live){live.style.setProperty('--fill',String(f));live.classList.toggle('low',f<.25);live.classList.toggle('scan',held);const s=$('cell-secs'),txt=Math.ceil(this.detLeft/1000)+'s';if(s&&s.textContent!==txt)s.textContent=txt;}
  let close=0;
  if(held){
   // The needle and every bonus item not yet picked up, whether or not they are still under hay.
   if(now>=this.detScan){
    this.detScan=now+450;
    this.detTargets=[this.needle,...this.treasures.filter(t=>!t.collected).map(t=>t.sprite)];
   }
   let best=1,nearest:Item|null=null;
   for(const o of this.detTargets){const d=Phaser.Math.Distance.Between(this.aimX,this.aimY,o.x,o.y)/DET_R;if(d<best){best=d;nearest=o;}}
   close=nearest?1-best:0;const wasClose=this.detClose;this.detClose=close;
   if(close>0&&now>=this.detBeepAt){
    this.detBeepAt=now+Phaser.Math.Linear(850,120,Math.pow(close,.8));this.detPulseAt=now;
    sfx.detect(panAt(this.aimX),close,nearest===this.needle);
   }
   if(close>.55&&wasClose<=.55)this.say('Something is here…',{passing:true});
  }else{this.detClose=0;this.detBeepAt=0;}
  this.drawDetector(held,close,now);
 }
 /** The detector itself, held over the hay: a coil on a soft shadow, a light that goes from grey to green to gold, and signal waves that grow as you near something. */
 drawDetector(held:boolean,close:number,now:number){
   const g=this.detG,R=this.detR,S=Math.max(24,R*.17),t=reduced?0:now/1000;
   // Held down it shows in full; let go and it fades to a faint ghost you can tap straight through.
   g.clear().setPosition(this.aimX,this.aimY).setVisible(true).setAlpha(held?1:.32);
   // The light: grey while waiting, green while scanning, gold near something.
   const warm=Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(255,255,255),new Phaser.Display.Color(86,214,92),100,Math.min(100,close*140));
   const wave=Phaser.Display.Color.GetColor(warm.r,warm.g,warm.b),led=held?wave:0x9aa7ae;
   const pulse=held&&!reduced?.5+.5*Math.sin(t*(6+close*14)):1;
   // The reach: a faint disc with a dashed edge, like the other helpers.
   g.fillStyle(0xdff4ff,held?.1:.06).fillCircle(0,0,R);
   const n=40,spin=held?t*.6:t*.1;
   for(let k=0;k<n;k+=2){const a0=k/n*Math.PI*2+spin;g.lineStyle(held?3.5:2.5,0xf4fdff,held?.8:.5).beginPath().arc(0,0,R,a0,a0+Math.PI*2/n*.9).strokePath();}
   if(held){
    // A slow sweep turning round the head, with a soft tail.
    for(let s=0;s<14;s++){const an=t*2.4-s*.06;g.lineStyle(3,0xf4fdff,.34*(1-s/14)).beginPath().moveTo(Math.cos(an)*S*1.3,Math.sin(an)*S*1.3).lineTo(Math.cos(an)*R,Math.sin(an)*R).strokePath();}
    // Nothing near: a white ring now and then, just to show it is working. Near something: green rings, more of them and brighter.
    if(close<=0&&now>=this.detPingAt){this.detPingAt=now+1100;this.detPulseAt=now;}
    const p=Math.min(1,(now-this.detPulseAt)/this.detPulseMs);
    if(close>0){
     const rings=Math.max(1,Math.ceil(close*3));
     for(let k=0;k<rings;k++){const q=reduced?.5:p-k*.2;if(q<0||q>1)continue;g.lineStyle(4,wave,(.35+.55*close)*(reduced?1:1-q)).strokeCircle(0,0,S+(R-S)*(1-Math.pow(1-q,2)));}
    }else if(p<1){
     g.lineStyle(4,0xffffff,reduced?.6:.75*(1-p)).strokeCircle(0,0,S+(R-S)*(1-Math.pow(1-p,2)));
    }
   }
   // The coil, seen from above: a rim, a steel-blue disc, a pale ring and a light in the middle.
   g.fillStyle(0x2a1a08,.2).fillCircle(0,S*.16,S*1.02);
   g.fillStyle(0x3e6f8c,1).fillCircle(0,0,S);
   g.fillStyle(0x8ec9e6,1).fillCircle(0,0,S*.9);
   g.lineStyle(2.5,0x3e6f8c,1).strokeCircle(0,0,S*.9);
   g.fillStyle(0xc9ecf8,1).fillCircle(0,0,S*.58);
   g.lineStyle(2,0x3e6f8c,.8).strokeCircle(0,0,S*.58);
   g.fillStyle(0x3e6f8c,1).fillCircle(0,0,S*.3);
   if(held)g.fillStyle(led,.3*pulse).fillCircle(0,0,S*(.5+.4*close));
   g.fillStyle(led,1).fillCircle(0,0,S*.17);
  } showAim(){this.ring.setPosition(this.aimX,this.aimY).setVisible(true);this.drawAim();}
 /** The fan, held over the hay while you aim: a calm picture of where the blast reaches. A dashed edge, three slow swirls and the fan head turning gently. */
 drawAim(){
  const i=this.selected;if(i!==1)return;
  const g=this.ring,t=reduced?0:this.time.now/1000,R=fan().r,S=Math.max(30,R*.3);
  g.clear();
  // The reach: a faint disc with a dashed edge that barely turns.
  g.fillStyle(0xeafcff,.07).fillCircle(0,0,R);
  const n=40;
  for(let k=0;k<n;k+=2){const a0=k/n*Math.PI*2+t*.1;g.lineStyle(2.5,0xf4fdff,.55).beginPath().arc(0,0,R,a0,a0+Math.PI*2/n*.9).strokePath();}
  // Three thin swirls that show the air turning outward.
  for(let k=0;k<3;k++){
   g.lineStyle(3,0xf4fdff,.4).beginPath();
   for(let s=0;s<=18;s++){const u=s/18,r=S*1.35+u*(R*.8-S*1.35),a=t*.3+k*Math.PI*2/3+u*1.3;if(s===0)g.moveTo(Math.cos(a)*r,Math.sin(a)*r);else g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
   g.strokePath();
  }
  this.fanHead(g,S,t*1.4);
 } useTool(x:number,y:number){const index=this.selected;if(index<0||this.cells()<=0)return;this.spendCell();this.selected=-1;this.ring.setVisible(false);this.cursor.setVisible(true);this.updateTools();
  if(index===1){quest('fan');logEvent('helper_used',{helper:'fan',level:this.mode==='daily'?0:saved.level});sfx.wind(panAt(x));this.gust(x,y,fan().r);this.pop(x,y,'WHOOSH!','#c4f5ff');this.say('Hay blown away!',{passing:true});}
 }
 /** The fan's head: a soft guard with five curved blades. Used by the aiming picture and the blast. */
 fanHead(g:Phaser.GameObjects.Graphics,S:number,turn:number,alpha=1){
  g.fillStyle(0x2a1a08,.18*alpha).fillEllipse(0,S*.6,S*1.9,S*.8);
  g.fillStyle(0xe3f6fc,.6*alpha).fillCircle(0,0,S);
  for(let k=0;k<5;k++){
   const b=turn+k*Math.PI*2/5,pts:{x:number;y:number}[]=[];
   for(let s=0;s<=8;s++){const u=s/8,r=S*.86*u,w=.34*Math.sin(Math.PI*u)+.02;pts.push({x:Math.cos(b+u*.5+w)*r,y:Math.sin(b+u*.5+w)*r});}
   for(let s=8;s>=0;s--){const u=s/8,r=S*.86*u,w=.34*Math.sin(Math.PI*u)+.02;pts.push({x:Math.cos(b+u*.5-w)*r,y:Math.sin(b+u*.5-w)*r});}
   g.fillStyle(0x6bbbdc,.92*alpha).fillPoints(pts,true);g.lineStyle(1.5,0x3d8cae,.9*alpha).strokePoints(pts,true);
  }
  g.lineStyle(3,0x6b7d88,alpha).strokeCircle(0,0,S);
  g.lineStyle(1.2,0x6b7d88,.5*alpha).strokeCircle(0,0,S*.62);
  g.fillStyle(0xf3cf5a,alpha).fillCircle(0,0,S*.17);g.lineStyle(2,0xb8891b,alpha).strokeCircle(0,0,S*.17);
 }
 /** The blast. The fan head spins up and fades; the top layer of hay in the circle sweeps outward in a spiral, the inner straws first, and settles out of sight. Thin tapered swirls and a few specks turn with it. */
  /** The vacuum, held over the hay: a reach circle, air spiralling in, and a humming nozzle that shudders while it sucks. */
  drawVac(held:boolean){
   const g=this.ring,t=reduced?0:this.time.now/1000,R=vacuum().r;
   g.clear();
   g.fillStyle(0xe9dcff,held?.26:.1).fillCircle(0,0,R);
   const n=36,spin=held?-t*1.6:-t*.2;
   for(let k=0;k<n;k+=2){const a0=k/n*Math.PI*2+spin;g.lineStyle(held?4.5:3,0xf3ecff,held?.95:.6).beginPath().arc(0,0,R,a0,a0+Math.PI*2/n*.9).strokePath();}
   // Three arms of air that curl into the nozzle, turning much faster while held.
   for(let k=0;k<3;k++){
    g.lineStyle(held?6:3,0xf3ecff,held?.8:.35).beginPath();
    for(let s=0;s<=20;s++){const u=s/20,r=R*(1-u*.82),a=k*Math.PI*2/3+u*2.4-t*(held?5:.8);if(s===0)g.moveTo(Math.cos(a)*r,Math.sin(a)*r);else g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
    g.strokePath();
   }
   // Specks of dust drawn inward.
   const specks=held?12:5;
   for(let k=0;k<specks;k++){const ph=(t*(held?1.5:.5)+k/specks)%1,r=R*(1-ph*.9),a=k*2.4+ph*3+t*.3;g.fillStyle(0xf3ecff,.75*Math.sin(ph*Math.PI)).fillCircle(Math.cos(a)*r,Math.sin(a)*r,held?3.5:2.5);}
   // The nozzle: a rounded rim with a dark mouth and little blades turning inside.
   const sh=held&&!reduced?Math.sin(t*60)*1.4:0,N=R*.2*(held?1+.04*Math.sin(t*28):1);
   g.fillStyle(0x2a1a08,.16).fillEllipse(sh,N*.95,N*2.1,N*.7);
   g.fillStyle(0xa790e0,1).fillCircle(sh,0,N);g.lineStyle(4,0x6a53a6,1).strokeCircle(sh,0,N);
   g.lineStyle(2,0xe1d6ff,.9).strokeCircle(sh,0,N*.84);
   g.fillStyle(0x2d2150,.92).fillCircle(sh,0,N*.62);
   if(held)for(let k=0;k<3;k++){const a=t*16+k*Math.PI*2/3;g.lineStyle(3,0xb7a4ee,.95).beginPath().moveTo(sh,0).lineTo(sh+Math.cos(a)*N*.58,Math.sin(a)*N*.58).strokePath();}
  }
  /** Waking the vacuum: it follows the pointer, and sucks only while you hold down. */
  armVacuum(){
   this.vacOn=true;this.vacAcc=0;this.cursor.setVisible(false);this.ring.setPosition(this.aimX,this.aimY).setVisible(true);$('vacuum').classList.remove('guide');
   quest('vacuum');logEvent('helper_used',{helper:'vacuum',level:this.mode==='daily'?0:saved.level});
   this.updateTools();this.say('Hold down on the hay to suck it up.',{passing:true});
  }
  pauseVacuum(){
   if(!this.vacOn)return;
   this.vacOn=false;this.ring?.setVisible(false);this.cursor?.setVisible(true);this.updateTools();
  }
  vacuumTick(delta:number){
   if(!this.vacOn)return;
   if(this.won){this.pauseVacuum();return;}
   if(!this.active)return;
   const v=vacuum(),x=this.aimX,y=this.aimY,held=this.boardDown&&!this.gesture;
   this.ring.setPosition(x,y).setVisible(true);this.drawVac(held);
   if(!held)return;
   this.vacLeft-=delta;
   if(this.vacLeft<=0){
    if(this.cells()>0){this.spendCell();this.vacLeft+=v.ms;sfx.select();this.renderCells();}
    else{this.vacLeft=0;this.pauseVacuum();this.say('The vacuum ran out.',{passing:true});return;}
   }
   const live=document.getElementById('vac-live'),secs=document.getElementById('vac-secs');
   if(live)live.style.setProperty('--fill',String(Math.max(0,this.vacLeft/v.ms)));
   if(secs)secs.textContent=Math.ceil(this.vacLeft/1000)+'s';
   if(this.time.now-this.vacSfxAt>200){this.vacSfxAt=this.time.now;sfx.suck(panAt(x));}
   this.vacAcc+=v.rate*delta/1000;const cnt=Math.floor(this.vacAcc);this.vacAcc-=cnt;
   if(cnt<=0)return;
   const take=this.straws.filter(s=>s.alpha>.2&&!s.getData('gone')&&Phaser.Math.Distance.Between(x,y,s.x,s.y)<v.r).sort((a,b)=>b.depth-a.depth).slice(0,cnt);
   this.hayGot+=take.length;
   take.forEach((s,i)=>{
    s.setData('gone',true);this.moving.delete(s);this.tweens.killTweensOf(s);
    if(reduced){s.setAlpha(0);return;}
    // Each straw curls in toward the nozzle, spinning and shrinking, a little after the one before.
    const dx=s.x-x,dy=s.y-y,r0=Math.hypot(dx,dy),a0=Math.atan2(dy,dx),swirl=Phaser.Math.FloatBetween(1.3,2.2),ang0=s.angle,kx=s.scaleX,ky=s.scaleY;
    s.setDepth(1400);
    this.tweens.addCounter({from:0,to:1,duration:Phaser.Math.Between(340,520),delay:i*14,ease:'Sine.In',onUpdate:tw=>{
     const q=tw.getValue()??0,r=r0*(1-q),a=a0-swirl*q;
     s.setPosition(x+Math.cos(a)*r,y+Math.sin(a)*r).setAngle(ang0+q*520).setScale(kx*(1-.75*q),ky*(1-.75*q)).setAlpha(1-q*q*q);
    },onComplete:()=>s.setAlpha(0)});
   });
  }
  gust(x:number,y:number,R:number){
  // The fan lifts only the top layers of what is in the circle; the hay below stays.
  const inside=this.straws.filter(s=>s.alpha>.2&&!s.getData('gone')&&Phaser.Math.Distance.Between(x,y,s.x,s.y)<R).sort((a,b)=>b.depth-a.depth);
  const caught=inside.slice(0,Math.ceil(inside.length*fan().peel));this.hayGot+=caught.length;
  const dir=Math.random()<.5?-1:1;
  const motion=caught.map(s=>{
   s.setData('gone',true);this.moving.delete(s);this.tweens.killTweensOf(s);
   const dx=s.x-x,dy=s.y-y,r0=Math.hypot(dx,dy);
   return{s,r0,a0:Math.atan2(dy,dx),rEnd:R*1.15+Phaser.Math.Between(40,140),swirl:dir*Phaser.Math.FloatBetween(1.2,2.1),spin:dir*Phaser.Math.Between(200,460),ang:s.angle,delay:Math.min(.4,r0/R*.4)+Phaser.Math.FloatBetween(0,.08)};
  });
  if(reduced)motion.forEach(m=>m.s.setAlpha(0));
  else if(motion.length)this.tweens.addCounter({from:0,to:1,duration:1400,onUpdate:tw=>{
   const P=tw.getValue()??0;
   for(const m of motion){
    const p=Phaser.Math.Clamp((P-m.delay)/.5,0,1);if(p<=0)continue;
    // Quick push away from the fan, then it drifts and slows.
    const e=1-Math.pow(1-p,2.2),r=m.r0+(m.rEnd-m.r0)*e,a=m.a0+m.swirl*e;
    m.s.setPosition(x+Math.cos(a)*r,y+Math.sin(a)*r).setAngle(m.ang+m.spin*e).setAlpha(p<.55?1:1-(p-.55)/.45);
   }
  },onComplete:()=>motion.forEach(m=>m.s.setAlpha(0))});
  // The fan head spins up in the middle and fades.
  const S=Math.max(30,R*.3),head=this.add.graphics().setPosition(x,y).setDepth(1250);this.effects.push(head);
  if(reduced)this.time.delayedCall(150,()=>head.destroy());
  else this.tweens.addCounter({from:0,to:1,duration:600,onUpdate:tw=>{const q=tw.getValue()??0;head.clear();this.fanHead(head,S*(1+.12*q),dir*q*(2-q)*16,1-q*q);},onComplete:()=>head.destroy()});
  // A thin ring leaves the middle.
  const ripple=this.add.graphics().setPosition(x,y).setDepth(1250);ripple.lineStyle(3,0xeafcff,.55).strokeCircle(0,0,R*.3);this.effects.push(ripple);
  this.tweens.add({targets:ripple,scale:3.2,alpha:0,duration:reduced?150:650,ease:'Sine.Out',onComplete:()=>ripple.destroy()});
  // Three tapered swirls of air: thick near the fan, thin at the tip.
  for(let k=0;k<3;k++){
   const arm=this.add.graphics().setPosition(x,y).setDepth(1250);
   const pt=(u:number)=>{const r=u*R*.95,a=dir*u*2.3+k*Math.PI*2/3;return{x:Math.cos(a)*r,y:Math.sin(a)*r};};
   for(let s=0;s<24;s++){const u0=s/24,u1=(s+1)/24,p0=pt(u0),p1=pt(u1);arm.lineStyle(Math.max(1.5,6.5*(1-u0)),0xeafcff,.8*(1-u0*.5)).beginPath().moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).strokePath();}
   arm.setScale(.6).setAlpha(.9);this.effects.push(arm);
   this.tweens.add({targets:arm,scale:1.2,rotation:dir*Math.PI*1.2,alpha:0,delay:reduced?0:k*70,duration:reduced?150:850,ease:'Sine.Out',onComplete:()=>arm.destroy()});
  }
  // A few specks of dust carried round.
  for(let k=0;k<14;k++){
   const a=Phaser.Math.FloatBetween(0,Math.PI*2),r=Phaser.Math.Between(10,Math.floor(R*.5));
   const bit=this.add.circle(x+Math.cos(a)*r,y+Math.sin(a)*r,Phaser.Math.Between(2,3),k%3?0xf2d98a:0xffffff,.7).setDepth(1255);this.effects.push(bit);
   const a2=a+dir*Phaser.Math.FloatBetween(.8,1.6),r2=R*Phaser.Math.FloatBetween(1,1.5);
   this.tweens.add({targets:bit,x:x+Math.cos(a2)*r2,y:y+Math.sin(a2)*r2,alpha:0,delay:reduced?0:Phaser.Math.Between(0,260),duration:reduced?150:Phaser.Math.Between(650,1000),ease:'Sine.Out',onComplete:()=>bit.destroy()});
  } } // ---------------------------------------------------------------- view (zoom and pan)
 /** The widest view: the whole haystack. */
 get minZoom(){return 1/this.size;}
 /** Screen position (1200 x 700) to a point on the board. Computed here, not by Phaser, so it is right even after a zoom in the same frame. */
 toWorld(sx:number,sy:number){const c=this.cameras.main;return{x:(sx-600)/c.zoom+600+c.scrollX,y:(sy-350)/c.zoom+350+c.scrollY};}
 /** A point on the board to its position on screen. */
 toScreen(wx:number,wy:number){const c=this.cameras.main;return{x:(wx-c.scrollX-600)*c.zoom+600,y:(wy-c.scrollY-350)*c.zoom+350};}
 /** Zoom to `z`, with board point (wx,wy) showing at screen position (sx,sy). The camera keeps itself inside the haystack. */
 viewAt(z:number,wx:number,wy:number,sx:number,sy:number){
  const c=this.cameras.main;z=Phaser.Math.Clamp(z,this.minZoom,MAX_ZOOM);
  c.setZoom(z);c.setScroll(wx-600-(sx-600)/z,wy-350-(sy-350)/z);
  this.viewChanged();
 }
 /** Zooms by a factor around a screen point, so what is under the pointer stays under it. */
 zoomAt(factor:number,sx:number,sy:number){const w=this.toWorld(sx,sy);this.viewAt(this.cameras.main.zoom*factor,w.x,w.y,sx,sy);}
 /** Zooms around the middle of the screen (the + and - buttons). */
 zoomBy(factor:number){if(this.active&&!this.won)this.zoomAt(factor,600,350);}
 /** Pans by a drag of (dsx,dsy) screen pixels. */
 panBy(dsx:number,dsy:number){const c=this.cameras.main;c.setScroll(c.scrollX-dsx/c.zoom,c.scrollY-dsy/c.zoom);this.viewChanged();}
 /** Two fingers: the zoom follows how far apart they are, the view follows where they are. */
 pinch(a:Phaser.Input.Pointer,b:Phaser.Input.Pointer){
  const d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
  this.gesture=true;this.stroking=false;this.panning=false;
  if(this.pinchDist>0&&d>0){const w=this.toWorld(this.pinchX,this.pinchY);this.viewAt(this.cameras.main.zoom*d/this.pinchDist,w.x,w.y,mx,my);}
  this.pinchDist=d;this.pinchX=mx;this.pinchY=my;
 }
 /** With a mouse, pushing the pointer against the board edge scrolls the view that way. */
 edgeScroll(delta:number){
  const p=this.input.activePointer;
  if(!this.mouseIn||!this.active||this.won||p.wasTouch||this.gesture||this.cameras.main.zoom<=this.minZoom+.001)return;
  const E=90,M=1200,H=700,ease=(d:number)=>Phaser.Math.Clamp(1-d/E,0,1)**2;
  const dx=ease(p.x)-ease(M-p.x),dy=ease(p.y)-ease(H-p.y);
  if(!dx&&!dy)return;
  const v=700*delta/1000;this.panBy(dx*v,dy*v);
  
 }
 /** Shows the whole haystack. */
 fitView(){if(!this.active||this.won)return;this.viewAt(this.minZoom,this.worldW/2,this.worldH/2,600,350);}
 /** The view a level opens with: the middle of the haystack, close enough to read the hay. */
 initialView(){this.viewAt(this.minZoom,this.worldW/2,this.worldH/2,600,350);}
 /** Everything that depends on the view: the brush size, the cursor, the aim ring, the guide and the zoom buttons. */
 viewChanged(){
  const z=this.cameras.main.zoom;
  // The brush stays a comfortable size on screen: a little larger on the board when zoomed out.
  this.brushR=Phaser.Math.Clamp(BRUSH_RADIUS/Math.sqrt(z),32,76)*brushMult();this.cursor?.setRadius(this.brushR);
  const w=this.toWorld(this.lastSX,this.lastSY);this.aimX=w.x;this.aimY=w.y;this.cursor?.setPosition(w.x,w.y);
  if(this.selected>=0)this.showAim();
  this.placeCoach();
  ($('zoom-in') as HTMLButtonElement).disabled=z>=MAX_ZOOM-.001;($('zoom-out') as HTMLButtonElement).disabled=z<=this.minZoom+.001;($('zoom-fit') as HTMLButtonElement).disabled=this.size<=1&&z<=1.001;
 }
 /** Battery cells left: the free ones this level plus the ones bought in the shop. Any helper runs on them. */
 cells(){return saved.cells;}
 /** Uses a free cell first, then a bought one. */
 spendCell(){if(saved.cells>0){saved.cells--;persist();logEvent('cell_spent');}}
 /** The cell count in the top bar, and the battery bar under the board while a helper is out. */
 renderCells(){
  updateCellsPill();
  this.renderPowerBar();
 } /** Under the board: the detector shows the cell it is draining (10 s each) and the cells waiting to take over; the fan shows the whole cell it will use. */
 renderPowerBar(){
  const bar=$('power-bar'),tag=bar.parentElement!;
  const fanOut=this.selected===1,who=fanOut?'':this.detOn?'det':this.vacOn?'vac':this.detLeft>0?'det':this.vacLeft>0?'vac':'',detOut=who==='det',vacOut=who==='vac',show=!this.won&&(fanOut||detOut||vacOut);
  tag.classList.toggle('power',show);
  if(!show){bar.innerHTML='';return;}
  const waiting=Math.max(0,this.cells()),cap=8,shown=Math.min(waiting,cap);
  const more=waiting>shown?`<span class="cells-more">+${waiting-shown}</span>`:'';
  const bolt='<svg class="bolt" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6Z"/></svg>';
  if(detOut){
   const f=Math.max(0,this.detLeft/this.detMs),secs=Math.ceil(this.detLeft/1000);
   bar.className='power-bar detector'+(this.detOn?'':' paused');
   bar.innerHTML=`<span class="pw-label">Detector</span><span class="pw-cells"><i class="cell live${f<.25?' low':''}${this.detOn?'':' paused'}" id="cell-live" style="--fill:${f}">${bolt}</i>${'<i class="cell"></i>'.repeat(shown)}${more}</span><b class="pw-secs" id="cell-secs">${secs}s</b><span class="pw-hint">${this.detOn?'Hold down and sweep':'Paused. Tap Detector to carry on'}</span>`;
  }else if(vacOut){
   const f=Math.max(0,this.vacLeft/vacuum().ms),secs=Math.ceil(this.vacLeft/1000);
   bar.className='power-bar vacuum'+(this.vacOn?'':' paused');
   bar.innerHTML=`<span class="pw-label">Vacuum</span><span class="pw-cells"><i class="cell live${f<.25?' low':''}${this.vacOn?'':' paused'}" id="vac-live" style="--fill:${f}">${bolt}</i>${'<i class="cell"></i>'.repeat(shown)}${more}</span><b class="pw-secs" id="vac-secs">${secs}s</b><span class="pw-hint">${this.vacOn?'Hold down on the hay':'Paused. Tap Vacuum to carry on'}</span>`;
  }else{
   bar.className='power-bar fan';
   bar.innerHTML=waiting>0
    ?`<span class="pw-label">Fan</span><span class="pw-cells"><i class="cell use">${bolt}</i>${'<i class="cell"></i>'.repeat(Math.max(0,shown-1))}${waiting>shown?more:''}</span><span class="pw-hint"><i class="cell mini"></i>Uses 1 whole cell. Tap the hay.</span>`
    :`<span class="pw-label">Fan</span><span class="pw-hint">No cells left</span>`;
  }
 } updateTools(){this.renderCells();TOOLIDS.forEach((id,i)=>{($(id) as HTMLButtonElement).disabled=this.won;$(id).classList.toggle('empty',this.cells()===0&&!(i===0&&this.detLeft>0)&&!(i===2&&this.vacLeft>0));const on=this.selected===i||(i===0&&this.detOn)||(i===2&&this.vacOn);$(id).classList.toggle('selected',on);$(id).setAttribute('aria-pressed',String(on));const locked=!saved.cheat&&saved.level<TOOL_LEVELS[i];$(id).classList.toggle('locked',locked);$(id).querySelector('.charge')!.textContent=locked?'🔒':'';{const st=$(id).querySelector('.state') as HTMLElement,paused=!on&&((i===0&&this.detLeft>0)||(i===2&&this.vacLeft>0));st.className='state'+(locked?' lock':on?' on':paused?' paused':'');st.innerHTML=locked?'<span class="long">Unlocks at </span>Level '+TOOL_LEVELS[i]:on?(i===1?'Aiming':'On'):paused?'Paused':'';}$(id).title=locked?'Unlocks at level '+TOOL_LEVELS[i]:HELPER_NAME[i]+' - shortcut '+(i+1);});}
 /** The find: the hay parts, the needle rises out of it glowing, then the win card. */
 finish(){
  if(this.won)return;this.cancelTool();this.pauseVacuum();this.won=true;
  const def=levelDef(saved.level);
  // Coins for solving a level the first time; every bonus item found goes into the bag to be sold.
   const daily=this.mode==='daily',chest=daily?claimDailyHay():null,chestCells=chest?chest.cells:0;
   const coins=daily?(chest?chest.coins:0):isSolved(saved.level)?repeatCoins(saved.level):levelCoins(saved.level);if(!daily)saved.coins+=coins;
   const found=this.treasures.filter(t=>t.collected).map(t=>t.kind),rec=recordFinds(found),hay=addHay(this.hayGot);
   holdCoins(coins+rec.coins);if(chestCells+rec.cells>0)holdCells(chestCells+rec.cells);updateCellsPill();
   if(daily)logEvent('daily_haystack_done',{streak:chest?chest.streak:0,found:found.length});
   quest('clear');logEvent('level_end',{level:saved.level,seconds:Math.round((this.time.now-this.levelStartedAt)/1000),found:found.length,slots:this.treasures.length,repeat:isSolved(saved.level)});logEvent('coins_earned',{source:'level',amount:coins});platform().levelEnd(saved.level);
   if(!daily)recordWin(saved.level,this.treasures.length>0&&this.bonusFound===this.treasures.length);updateCoinPill();
  // The first-time guides are done once the level that taught them is won.
  if(def.teach==='brush')markSeen('brush','tap');else if(def.teach==='pluck')markSeen('pluck','tap');
  this.coach='';this.syncCoach();
  sfx.found(panAt(this.needle.x),def.finale);this.updateTools();this.say('You found it!');
  const n=this.needle;this.moving.delete(n);this.tweens.killTweensOf(n);
  // Glide to the needle so the find is seen from close up, wherever it was in the haystack.
  const cam=this.cameras.main;if(!reduced){cam.pan(n.x,n.y,800,'Sine.easeInOut');cam.zoomTo(Phaser.Math.Clamp(Math.max(cam.zoom,1.1),this.minZoom,MAX_ZOOM),800,'Sine.easeInOut');}
  for(const s of this.straws){if(s.getData('gone'))continue;const dx=s.x-n.x,dy=s.y-n.y,d=Math.hypot(dx,dy)||1;if(d<160){const f=(1-d/160)*480;this.kick(s,dx/d*f,dy/d*f,Phaser.Math.FloatBetween(-1.2,1.2));}}
  n.setDepth(1500);
  const glow=this.add.circle(n.x,n.y,42,0xfff3b0,.6).setDepth(1490).setScale(.2);this.effects.push(glow);
  this.tweens.add({targets:glow,scale:2.4,alpha:0,duration:reduced?0:1200,ease:'Sine.Out'});
  // Settle on a gentle diagonal, whichever way round the needle was lying.
  const rest=-.5,turn=rest+Math.PI*2*Math.round((n.rotation-rest)/(Math.PI*2));
  this.tweens.add({targets:n,scale:n.scaleX*3,rotation:turn,y:n.y-12,duration:reduced?0:700,ease:'Back.Out'});
  for(let i=0;i<24;i++){const p=this.add.circle(n.x,n.y,Phaser.Math.Between(2,5),i%2?0xffedb5:0xfaf7e8).setDepth(1600);this.effects.push(p);this.tweens.add({targets:p,x:p.x+Phaser.Math.Between(-170,170),y:p.y+Phaser.Math.Between(-150,100),alpha:0,delay:reduced?0:150,duration:reduced?0:1000,onComplete:()=>p.destroy()});}
  // Let the moment breathe before the card comes up.
  const round=this.round;
  this.time.delayedCall(reduced?300:1500,()=>{
   if(this.round!==round||!this.active){releaseCoins();releaseCells();return;}
   const all=this.treasures.length>0&&this.bonusFound===this.treasures.length;
   $('win').classList.toggle('chapter',def.finale);
   $('win-title').textContent=daily?'Haystack found!':saved.level>=TOTAL_LEVELS?'All done!':def.finale?'World complete!':WIN_WORDS[saved.level%WIN_WORDS.length];
   // The last level of a world sends you to the map, where the next world has opened.
   $('next-label').textContent=daily?'Back to the title':def.finale?'To the map':'Next level';
   $('win-map').classList.toggle('hidden',def.finale||daily);
   // The bonus items, in their own tiles: found ones in gold with a check, missed ones faded.
   $('win-items').innerHTML=this.treasures.map((t,i)=>`<span class="win-item r-${rarityOf(t.kind)} ${t.collected?'found':'missed'}" style="--i:${i}" role="img" aria-label="${itemName(t.kind)}, ${t.collected?'found':'missed'}"><img alt="" src="${this.objectImage(t.kind)}">${t.collected?`<i class="tick">${TICK}</i>`:''}${rec.fresh.includes(t.kind)?'<i class="new">NEW</i>':''}</span>`).join('');
   $('win-items').classList.toggle('hidden',!this.treasures.length);
    $('win-copy').textContent=!this.treasures.length?'':all?'You found everything!':`You found ${this.bonusFound} of ${this.treasures.length}`;
    $('win-copy').classList.toggle('hidden',!this.treasures.length);
    const spare=found.length-rec.fresh.length;
    $('win-coins').innerHTML=[hay>0?`<span>+${hay} hay</span>`:'',coins>0?`<span><i class="coin"></i>+${coins} coins</span>`:'',chestCells>0?`<span><i class="cell mini"></i>+${chestCells} ${chestCells===1?'cell':'cells'}</span>`:'',rec.fresh.length>0?`<span>${rec.fresh.length} new in your collection</span>`:'',spare>0?`<span>${spare} spare in your bag</span>`:''].join('');
    $('win-coins').classList.toggle('hidden',coins===0&&chestCells===0&&!found.length&&hay===0);
   $('win').classList.remove('hidden');$('next').focus();
   window.setTimeout(()=>{const el=$('win-coins').querySelector('.coin'),o=el?centerOf(el):{x:innerWidth/2,y:innerHeight/2};if(coins>0)flyCoins(o,coins);if(chestCells>0)flyCells(o,chestCells);if(rec.done.length)showSetComplete(rec.done,imageOf,rec.coins,rec.cells);},reduced?0:650);
  });
 }
 update(_time:number,delta:number){
  this.detectorTick(delta);this.vacuumTick(delta);
  if(this.active)this.step(Math.min(.05,delta/1000));
  this.edgeScroll(delta);
  if(this.selected>=0&&this.ring.visible)this.drawAim();
  if(!this.active||this.won)return;
  // First-time guides move on when the player has done what they asked.
  if(this.coach&&this.time.now-this.coachCheck>250){
   this.coachCheck=this.time.now;
   if(this.coach==='brush'&&this.visibleShare(this.needle,NEEDLE_SAMPLES)>=VISIBLE_TO_TAP)this.advanceCoach('tap');
   else if(this.coach==='pluck'&&this.coverStraw?.getData('gone'))this.advanceCoach('tap');
   else if(this.coach==='tap')this.syncCoach();
  }
  if(this.coach)this.placeCoach();
  this.drift+=delta;if(this.drift>9500){this.drift=0;this.glint.setPosition(this.needle.x+24*Math.cos(this.needle.rotation),this.needle.y+24*Math.sin(this.needle.rotation));this.tweens.add({targets:this.glint,alpha:.85,duration:450,yoyo:true});sfx.glint(panAt(this.needle.x));}
 }
}
const scene=new Haystack();
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1200,height:700,transparent:false,antialias:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene,render:{roundPixels:false},input:{activePointers:2},audio:{noAudio:true}});
TOOLIDS.forEach((id,i)=>$(id).onclick=()=>scene.power(i));
// Zoom and pan buttons on the board (the mouse wheel, pinch and the + - 0 keys do the same).
$('zoom-in').onclick=()=>{sfx.select();scene.zoomBy(1.4);};
let shopPaused=false;
const pauseHooks={onOpen:()=>{shopPaused=screen==='game'&&scene.active;if(shopPaused)scene.active=false;},onClose:()=>{if(shopPaused&&screen==='game')scene.active=true;shopPaused=false;}};
const imageOf=(k:string)=>{try{return scene.objectImage(k as Treasure);}catch{return null;}};
initShop(imageOf,pauseHooks);
// The coin and cell pills open the shop, like the plus on them says.
for(const id of ['coin-badge','cells-badge']){const el=$(id);el.setAttribute('role','button');el.tabIndex=0;el.onclick=()=>$('btn-shop').click();el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('btn-shop').click();}};}
const collection=initCollection(imageOf,pauseHooks);const barn=initBarn(pauseHooks);
$('zoom-out').onclick=()=>{sfx.select();scene.zoomBy(1/1.4);};
$('zoom-fit').onclick=()=>{sfx.select();scene.fitView();};
// ---------------------------------------------------------------- screens
//  title -> map -> game. The map is where levels are picked; winning a level
//  opens the next one, and a world opens when the one before it is finished.
type Screen='title'|'map'|'game';
let screen:Screen='title';
/** The world that has just opened (after a finale), so its sign can glow on the map. */
let freshWorld=-1;

function renderTitle(){
  $('btn-today').classList.toggle('ready',todayPending());
  $('play-label').textContent=allSolved()?'Play again':solvedCount()===0?'Play':`Level ${playTarget()}`;
}

function show(next:Screen){
  screen=next;document.body.dataset.screen=next;
  $('screen-title').classList.toggle('off',next!=='title');
  $('screen-map').classList.toggle('off',next!=='map');
  $('screen-game').classList.toggle('off',next!=='game');
  if(next!=='game')scene.leave();
  const back=$('btn-back'),label=next==='game'?'Back to the levels':'Back to the title';
  back.setAttribute('aria-label',label);back.title=label;
  if(next==='title'){setWorldTheme(allSolved()?TOTAL_LEVELS:playTarget());renderTitle();}
  if(next==='map'){renderMap(startLevel,freshWorld);freshWorld=-1;requestAnimationFrame(scrollToFrontier);}
}

/** Starts today's haystack. */
function startDaily(){sfx.select();scene.mode='daily';show('game');scene.begin();}
/** Starts a level the player has reached. */
function startLevel(n:number){
  if(n<1||n>Math.min(TOTAL_LEVELS,saved.unlocked))return;
  sfx.select();scene.mode='level';saved.level=n;persist();setWorldTheme(n);show('game');scene.begin();
}

// Hidden test switch: ten quick taps on the needle (its picture area) on the title screen.
let needleTaps=0,needleLast=0;
document.querySelector('.title-hero')!.addEventListener('click',()=>{
 const now=performance.now();needleTaps=now-needleLast<1500?needleTaps+1:1;needleLast=now;
 if(needleTaps<10)return;needleTaps=0;
  enableTestMode();sfx.found(0,true);updateCoinPill();updateCellsPill();renderTitle();toast('Test mode: 999 coins, 99 cells, 9999 hay, every level open');
});
$('btn-play').onclick=()=>{startLevel(allSolved()?1:playTarget());};
$('btn-levels').onclick=()=>{sfx.select();show('map');};
$('btn-today').onclick=()=>{sfx.select();openToday({onPlayDaily:startDaily,onClose:renderTitle});};
$('btn-collection').onclick=()=>collection.open();$('btn-barn').onclick=()=>barn.open();
$('btn-back').onclick=()=>{sfx.select();show(screen==='game'&&scene.mode==='level'?'map':'title');};
$('brand').addEventListener('click',e=>{e.preventDefault();if(screen!=='title'){sfx.select();show('title');}});
$('win-map').onclick=()=>{sfx.select();show('map');};
$('next').onclick=()=>{
  sfx.select();
  if(scene.mode==='daily'){show('title');return;}
  const n=saved.level,def=levelDef(n);
  if(def.finale||n>=TOTAL_LEVELS){freshWorld=n<TOTAL_LEVELS?def.world+1:-1;show('map');}
  else startLevel(n+1);
};
// The map is laid out for the screen's width, so redraw it if the window changes.
let resizeFrame=0;
window.addEventListener('resize',()=>{if(screen!=='map')return;cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>renderMap(startLevel));});
function soundUI(){$('sound').classList.toggle('muted',!saved.sound);$('sound').setAttribute('aria-pressed',String(saved.sound));$('sound').setAttribute('aria-label',saved.sound?'Mute sound':'Enable sound');}soundUI();
$('sound').onclick=()=>{saved.sound=!saved.sound;persist();soundUI();sfx.setEnabled(saved.sound);sfx.select();};
// The How to play card pauses a level that is in progress and resumes it (with the lens timer) when closed.
const dialog=$('instructions') as HTMLDialogElement;let helpPaused=false;
$('help').onclick=()=>{sfx.select();helpPaused=scene.active;scene.active=false;dialog.showModal();};
dialog.addEventListener('close',()=>{if(helpPaused&&screen==='game')scene.active=true;helpPaused=false;});
dialog.querySelectorAll('button').forEach(b=>b.onclick=()=>{sfx.select();dialog.close();});
// "Start over" lives in the How to play card, away from the board, so it can't be hit by accident.
const confirmDlg=$('confirm-reset') as HTMLDialogElement;
$('reset').onclick=()=>{sfx.select();confirmDlg.showModal();};
$('btn-delete').onclick=()=>{sfx.select();confirmDlg.showModal();};
$('reset-cancel').onclick=()=>{sfx.select();confirmDlg.close();};
$('reset-yes').onclick=()=>{sfx.select();resetProgress();updateCoinPill();updateCellsPill();helpPaused=false;confirmDlg.close();dialog.close();show('title');};
show('title');
// Once a day the title screen offers a gift.
window.setTimeout(()=>{if(screen==='title')maybeShowDaily(renderTitle);},900);
window.addEventListener('pointermove',e=>{if(scene.nightOn)scene.moveVeil(e.clientX,e.clientY);},{passive:true});
window.addEventListener('pointerdown',e=>{if(scene.nightOn)scene.moveVeil(e.clientX,e.clientY);},{passive:true});
applyLooks();
// Only in the dev server (`npm run dev`), never in a build: lets the browser tests reach the scene.
if(import.meta.env.DEV)(window as unknown as {__scene:Haystack}).__scene=scene;
// Optional extras: tuning from the config file, analytics, and the Arkadium platform (rewarded videos, pause/resume).
void loadConfig().then(()=>{renderTitle();updateCoinPill();updateCellsPill();});
void initAnalytics();
void bootPlatform().then(p=>{
  p.ready();
  let resumeTo=false;
  p.onPause(()=>{resumeTo=scene.active;scene.active=false;sfx.setEnabled(false);});
  p.onResume(()=>{if(resumeTo&&screen==='game')scene.active=true;resumeTo=false;sfx.setEnabled(saved.sound);});
});