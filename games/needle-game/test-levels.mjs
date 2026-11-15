import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { fileURLToPath } from 'node:url';

// Bundle the game's pure modules (levels, items, drops, events, economy, quests) so the tests use the real code.
const built = buildSync({
  stdin: {
    contents: [
      "export * from './levels.ts';",
      "export * from './items.ts';",
      "export * from './drops.ts';",
      "export * from './events.ts';",
      "export * from './economy.ts';",
      "export * from './quests.ts';",
      "export * from './progress.ts';",
      "export * from './cosmetics.ts';",
      "export * from './barn.ts';",
    ].join('\n'),
    resolveDir: fileURLToPath(new URL('./src/', import.meta.url)),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'neutral',
  logLevel: 'silent',
});
const G = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const { levelDef, dailyDef, pilePoint, GRAND_FINALE, TOOL_LEVELS, WORLD_SIZE, TOTAL_LEVELS, WORLDS, LEVELS_PER_WORLD, worldOf } = G;
const { ITEMS, SETS, ITEM_BY_ID, RARITIES, itemsOfSet, DECOYS } = G;
const { rollItems, rollDaily, DROP, nextPity } = G;
const { activeEvent, EVENTS } = G;
const all = Array.from({ length: TOTAL_LEVELS }, (_, i) => levelDef(i + 1));

// ---------------------------------------------------------------- levels
// Shape of the game: 5 worlds of 8 levels.
assert.equal(WORLDS.length, 5);
assert.equal(LEVELS_PER_WORLD, 8);
assert.equal(TOTAL_LEVELS, 40);
assert.deepEqual(all.map(l => l.world), Array.from({ length: 40 }, (_, i) => Math.floor(i / 8)));
assert.deepEqual(all.map(l => l.n), Array.from({ length: 40 }, (_, i) => i + 1));
assert.equal(levelDef(0).n, 1);
assert.equal(levelDef(999).n, 40);
assert.equal(worldOf(9), 1);

// Helpers: none before level 5, then one per world on a world's first level (after the first world).
assert.deepEqual([...TOOL_LEVELS], [5, 9, 17]);
assert.equal(TOOL_LEVELS.filter(n => n < 5).length, 0);
assert.ok(TOOL_LEVELS.slice(1).every(n => (n - 1) % LEVELS_PER_WORLD === 0), "later helpers arrive on a world's first level");
assert.equal(new Set(TOOL_LEVELS.map(worldOf)).size, 3, 'one helper per world');

// First-time-player ramp: levels 1-4 are easier; from 5 the needle starts 90% hidden.
assert.deepEqual(all.slice(0, 3).map(l => l.teach), ['brush', 'pluck', 'bonus']);
assert.ok(all.slice(3).every(l => !l.teach));
assert.ok(levelDef(1).hidden <= 0.7 && levelDef(1).slots === 0);
assert.ok(levelDef(2).cover && all.filter(l => l.cover).length === 1);
assert.ok(levelDef(1).hidden < levelDef(3).hidden && levelDef(3).hidden < levelDef(4).hidden && levelDef(4).hidden < levelDef(5).hidden);
assert.ok(all.slice(4).every(l => l.hidden >= 0.85 && l.hidden <= 0.9));
assert.ok(all.slice(4).filter(l => l.inWorld !== 1).every(l => l.hidden === 0.9));
assert.ok(levelDef(1).depth[0] > levelDef(5).depth[1], 'level 1 keeps the needle near the top of the pile');

// A new idea never shares a level with another: bonus items start on 3, the detector on 5.
assert.equal(all.findIndex(l => l.slots > 0) + 1, 3);

// Finales: the last level of each world is the biggest pile in it and has three bonus items.
for (let w = 0; w < 5; w++) {
  const world = all.filter(l => l.world === w);
  const finale = world[7];
  assert.ok(finale.finale && world.filter(l => l.finale).length === 1);
  assert.equal(finale.slots, 3);
  assert.equal(finale.shape, w === 4 ? 'stack' : 'spiral');
  assert.ok(finale.count >= Math.max(...world.map(l => l.count)));
}

// Difficulty knobs only ever grow: more hay, smaller needle, never past their limits.
for (let i = 1; i < all.length; i++) {
  assert.ok(all[i].count >= all[i - 1].count);
  assert.ok(all[i].needle <= all[i - 1].needle + 1e-9);
  if (i !== 1) assert.notEqual(all[i].shape, all[i - 1].shape, `level ${i + 1} repeats the layout`);
}
for (let w = 0; w < 5; w++) assert.notEqual(all[w * 8 + 6].shape, 'spiral', 'the level before a finale is not a spiral');
assert.ok(all.every(l => l.needle >= 0.53 && l.needle <= 0.82));
// Every level holds at most 10,000 straws, except the last one: the grand finale.
assert.ok(all.slice(0, -1).every(l => l.count <= 10000));
assert.equal(all.at(-1).count, GRAND_FINALE.count);
assert.equal(all.at(-1).size, GRAND_FINALE.size);
assert.ok(GRAND_FINALE.size <= 3.5 && GRAND_FINALE.count <= 35000, 'the grand finale stays within what was measured to play');
assert.ok(GRAND_FINALE.size > WORLD_SIZE[4] && GRAND_FINALE.count > 10000);
// The haystack grows with the world: the first world fits one screen, later ones need zooming and panning.
assert.ok(all.filter(l => l.world === 0).every(l => l.size === 1));
assert.ok(all.every((l, i) => i === 0 || l.size >= all[i - 1].size));
assert.ok(WORLD_SIZE[4] >= 1.8 && WORLD_SIZE[4] <= 3);
assert.ok(all.slice(0, -1).every(l => l.size === WORLD_SIZE[l.world]));
// Denser too: straws per unit of area never fall from one world's finale to the next world's first level.
for (let w = 0; w < 4; w++) {
  const a = all[w * 8 + 7],
    b = all[w * 8 + 8];
  assert.ok(a.count / a.size ** 2 <= (b.count / b.size ** 2) * 1.35, 'density should not collapse between worlds');
}
assert.ok(all.every(l => l.slots >= 0 && l.slots <= 3));
assert.ok(all.every(l => l.depth[0] <= l.depth[1] && l.depth[1] <= 0.95));

// Night levels and decoys: only in the later worlds, never on the first levels.
assert.ok(all.filter(l => l.night).every(l => l.world >= 3 && !l.finale) && all.filter(l => l.night).length >= 3);
assert.ok(all.filter(l => l.decoys > 0).every(l => l.world >= 2) && all.filter(l => l.decoys > 0).length >= 6);
assert.ok(all.every(l => l.decoys <= 2));

// Every world uses several layouts, and every layout lands inside the playable margins.
for (let w = 0; w < 5; w++) assert.ok(new Set(all.filter(l => l.world === w).map(l => l.shape)).size >= 4, `world ${w + 1} needs layout variety`);
let seed = 12345;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const shapes = [...new Set(all.map(l => l.shape))];
assert.equal(shapes.length, 7);
assert.ok(all.at(-1).dome && all.slice(0, -1).every(l => !l.dome));
for (const shape of shapes)
  for (let i = 0; i < 3000; i++) {
    const p = pilePoint(shape, random);
    assert.ok(p.x >= 90 && p.x <= 1110 && p.y >= 75 && p.y <= 625, `${shape}: target outside playable margins`);
    if (shape === 'ring') assert.ok(((p.x - 600) / 440) ** 2 + ((p.y - 350) / 235) ** 2 >= 0.58 ** 2 - 1e-8);
    if (shape === 'rows') assert.ok([200, 600, 1000].some(x => Math.abs(p.x - x) <= 75));
  }

// The daily haystack is a real level definition, the same for the same seed.
const d1 = dailyDef(() => 0.5),
  d2 = dailyDef(() => 0.5);
assert.deepEqual(d1, d2);
assert.ok(d1.slots === 3 && d1.count <= 10000 && d1.world >= 2 && d1.n === 0);
for (let i = 0; i < 200; i++) {
  const d = dailyDef(random);
  assert.ok(d.world >= 2 && d.world <= 4 && shapes.includes(d.shape) && d.size === WORLD_SIZE[d.world]);
}

// ---------------------------------------------------------------- items
assert.equal(new Set(ITEMS.map(i => i.id)).size, ITEMS.length, 'item ids are unique');
assert.ok(ITEMS.every(i => ITEM_BY_ID[i.id] === i && SETS.some(s => s.id === i.set) && RARITIES[i.rarity]));
const RANGE = { common: [3, 6], uncommon: [8, 14], rare: [25, 45], treasure: [100, 250] };
for (const i of ITEMS) assert.ok(i.value >= RANGE[i.rarity][0] && i.value <= RANGE[i.rarity][1], `${i.id} is worth ${i.value}, outside the ${i.rarity} range`);
// One set per world: three common, two uncommon, one rare, one treasure. Seasonal sets are small.
for (let w = 0; w < 5; w++) {
  const s = SETS.find(x => x.world === w);
  assert.ok(s, `world ${w + 1} has a set`);
  const items = itemsOfSet(s.id);
  const count = r => items.filter(i => i.rarity === r).length;
  assert.deepEqual([count('common'), count('uncommon'), count('rare'), count('treasure')], [3, 2, 1, 1], `${s.id} has the wrong mix`);
}
assert.ok(SETS.filter(s => s.world < 0).every(s => s.event && itemsOfSet(s.id).length >= 4 && itemsOfSet(s.id).every(i => i.rarity !== 'treasure')));
assert.ok(SETS.every(s => s.reward.coins > 0 && s.reward.cells >= 0));
// Treasures get more valuable with the world.
const treasures = ITEMS.filter(i => i.rarity === 'treasure').map(i => i.value);
assert.deepEqual([...treasures], [...treasures].sort((a, b) => a - b));
assert.deepEqual([...DECOYS], ['pin', 'nail']);

// ---------------------------------------------------------------- drops
{
  let s = 99;
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const tally = { common: 0, uncommon: 0, rare: 0, treasure: 0 };
  let pity = 0,
    slots = 0;
  const longestDry = { n: 0 };
  let dry = 0;
  for (let i = 0; i < 20000; i++) {
    const world = i % 5;
    const ids = rollItems(2, world, rng, { pity });
    assert.equal(new Set(ids).size, ids.length, 'no item twice in a level');
    for (const id of ids) {
      const it = ITEM_BY_ID[id];
      assert.equal(it.set, SETS.find(x => x.world === world).id, 'a world only drops its own set');
      tally[it.rarity]++;
      slots++;
      pity = nextPity(pity, it.rarity);
      dry = it.rarity === 'rare' || it.rarity === 'treasure' ? 0 : dry + 1;
      longestDry.n = Math.max(longestDry.n, dry);
    }
  }
  // Rolling uses the counter going in; with finds counted one at a time it can run a little past the pity value, never far.
  assert.ok(longestDry.n <= DROP.pity + 2, `pity should stop long dry spells (longest ${longestDry.n})`);
  const share = r => tally[r] / slots;
  assert.ok(share('common') > 0.5 && share('common') < 0.66, `common share ${share('common')}`);
  assert.ok(share('uncommon') > 0.24 && share('uncommon') < 0.34, `uncommon share ${share('uncommon')}`);
  assert.ok(share('rare') > 0.08 && share('rare') < 0.17, `rare share ${share('rare')}`);
  assert.ok(share('treasure') > 0.01 && share('treasure') < 0.05, `treasure share ${share('treasure')}`);
  // With the counter at its limit the next find is always rare or better.
  for (let i = 0; i < 300; i++) assert.ok(['rare', 'treasure'].includes(ITEM_BY_ID[rollItems(1, i % 5, rng, { pity: DROP.pity })[0]].rarity));
  // The first levels only drop common items.
  for (let i = 0; i < 300; i++) assert.ok(rollItems(1, 0, rng, { pity: 0, easy: true }).every(id => ITEM_BY_ID[id].rarity === 'common'));
  // An event brings its own set into the mix, and only while it is on.
  let fromEvent = 0,
    total = 0;
  for (let i = 0; i < 3000; i++)
    for (const id of rollItems(2, 1, rng, { pity: 0, eventSet: 'harvest' })) {
      total++;
      if (ITEM_BY_ID[id].set === 'harvest') fromEvent++;
    }
  assert.ok(fromEvent / total > 0.15 && fromEvent / total < 0.4, `event share ${fromEvent / total}`);
  assert.equal(rollItems(3, 0, rng, { pity: 0 }).filter(id => ITEM_BY_ID[id].set !== 'sewing').length, 0);
  // The daily haystack: three different items, at least one uncommon or better, from the main sets only.
  for (let i = 0; i < 500; i++) {
    const ids = rollDaily(rng);
    assert.equal(ids.length, 3);
    assert.equal(new Set(ids).size, 3);
    assert.ok(ids.some(id => ITEM_BY_ID[id].rarity !== 'common'));
    assert.ok(ids.every(id => SETS.find(x => x.id === ITEM_BY_ID[id].set).world >= 0));
  }
}

// ---------------------------------------------------------------- events
const at = (m, d) => new Date(2026, m - 1, d);
assert.equal(activeEvent(at(10, 15))?.id, 'harvest');
assert.equal(activeEvent(at(12, 31))?.id, 'festive');
assert.equal(activeEvent(at(1, 3))?.id, 'festive');
assert.equal(activeEvent(at(2, 20)), undefined);
assert.equal(activeEvent(at(7, 4)), undefined);
assert.ok(EVENTS.every(e => SETS.some(s => s.id === e.set && s.event === e.id)));

// ---------------------------------------------------------------- economy rules
const { levelCoins, repeatCoins, itemValue, recordFinds, saved, collectionProgress, dailyPlan, claimDaily, DAILY, claimDailyHay, dailyHayReward, TUNING } = G;
assert.deepEqual([1, 9, 17, 25, 33].map(levelCoins), [15, 20, 25, 30, 35]);
assert.ok(repeatCoins(1) < levelCoins(1) && repeatCoins(1) >= 1);
assert.ok(itemValue('goldneedle') > itemValue('button'));
// First copy goes to the collection, copies after that to the bag; finishing a set pays its reward once.
saved.coins = 0;
saved.cells = 0;
let r = recordFinds(['button', 'button', 'spool']);
assert.deepEqual(r.fresh, ['button', 'spool']);
assert.equal(saved.bag.button, 1);
assert.equal(saved.collection.button, 2);
r = recordFinds(['thimble', 'scissors', 'pincushion', 'brooch', 'goldneedle']);
assert.equal(r.done.length, 1);
assert.equal(r.done[0].id, 'sewing');
assert.equal(saved.coins, r.coins);
assert.equal(recordFinds(['button']).done.length, 0, 'a set pays only once');
assert.equal(collectionProgress().have, 7);
// Daily gift: advances through the week, never twice in a day.
saved.daily = { last: '', day: 0 };
saved.introduced = [];
assert.equal(dailyPlan().cells, 0, 'no cells in the gift before a helper is unlocked');
saved.introduced = [0];
assert.equal(dailyPlan().cells, DAILY[0].cells);
const before = saved.coins;
claimDaily();
assert.equal(saved.coins, before + DAILY[0].coins);
assert.equal(saved.daily.day, 1);
assert.equal(G.dailyReady(), false);
// Daily haystack chest grows with the streak.
saved.dailyHay = { last: '', streak: 0 };
const first = dailyHayReward();
assert.equal(first.streak, 1);
assert.ok(claimDailyHay());
assert.equal(claimDailyHay(), null);
// Quests: three a day, tracked and claimed once.
saved.quests = { date: '', list: [] };
const views = G.questViews();
assert.equal(views.length, 3);
assert.equal(new Set(views.map(v => v.text)).size, 3);
G.track('clear', 99);
G.track('find', 99);
G.track('pluck', 999);
G.track('uncommon', 99);
G.track('fan', 99);
G.track('detector', 999);
G.track('vacuum', 999);
const done = G.questViews().filter(v => v.done);
assert.ok(done.length >= 2);
assert.ok(G.claimQuest(done[0].index));
assert.equal(G.claimQuest(done[0].index), null);
// Cosmetics: the defaults are free and the colours multiply.
assert.ok(['hay', 'frame', 'needle'].every(s => G.LOOKS[s][0].cost === 0));
assert.equal(G.mulColor(0xffffff, 0x804020), 0x804020);
// The barn: hay is capped per level, 100 hay makes a bale, one bale sells per day, improvements unlock looks.
saved.barn = { hay: 0, bales: 0, built: [], sold: '' };
saved.cosmetics = { owned: [], hay: 'plain', frame: 'wood', needle: 'steel' };
assert.equal(G.addHay(5000), G.BARN.perLevel);
assert.equal(G.addHay(-4), 0);
assert.equal(saved.barn.hay, G.BARN.perLevel);
assert.equal(G.makeBales(), 3);
assert.equal(saved.barn.hay, G.BARN.perLevel - 3 * G.BARN.perBale);
const coinsBefore = saved.coins;
assert.equal(G.sellBale(), G.BARN.saleCoins);
assert.equal(G.sellBale(), 0);
assert.equal(saved.coins, coinsBefore + G.BARN.saleCoins);
assert.equal(saved.barn.bales, 2);
assert.equal(G.build('vane'), false);
saved.barn.bales = 50;
assert.equal(G.build('vane'), true);
assert.equal(G.build('vane'), false);
assert.equal(G.ownsLook('hay', 'wheat'), true);
assert.equal(G.ownsLook('frame', 'barn'), false);
assert.equal(G.buyLook('frame', 'barn'), false);
for (const imp of G.IMPROVEMENTS) if (imp.grants) assert.equal(G.LOOKS[imp.grants.slot].find(l => l.id === imp.grants.id)?.barn, imp.id);
assert.equal(TUNING.repeatPct > 0 && TUNING.repeatPct < 1, true);

console.log('Passed: 40 levels in 5 worlds, helpers, finales, difficulty limits, night levels and decoys, 7 layouts and 21,000 placement samples, the daily haystack, ' + ITEMS.length + ' items in ' + SETS.length + ' sets, drop rates and pity over 20,000 rolls, events, economy rules, daily gift, quests and the barn.');
