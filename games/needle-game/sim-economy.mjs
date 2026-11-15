// Rough coin income against what the shop sells. Run: node sim-economy.mjs
import { buildSync } from 'esbuild';
import { fileURLToPath } from 'node:url';
const built = buildSync({
  stdin: { contents: ["export * from './levels.ts';", "export * from './economy.ts';", "export * from './drops.ts';", "export * from './cosmetics.ts';"].join('\n'), resolveDir: fileURLToPath(new URL('./src/', import.meta.url)), loader: 'ts' },
  bundle: true, format: 'esm', write: false, platform: 'neutral', logLevel: 'silent',
});
const G = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const { levelDef, levelCoins, repeatCoins, expectedValue, TOTAL_LEVELS, LEVELS_PER_WORLD, TRACKS, DAILY_HAY, LOOKS } = G;
let first = 0, finds = 0, running = 0;
const rows = [];
for (let l = 1; l <= TOTAL_LEVELS; l++) {
  const def = levelDef(l), world = Math.floor((l - 1) / LEVELS_PER_WORLD);
  const slots = def.slots ?? 0;
  const ev = slots * (l <= 4 ? 4.5 : expectedValue(world));
  first += levelCoins(l); finds += ev; running += levelCoins(l) + ev;
  if (l % LEVELS_PER_WORLD === 0) rows.push(`world ${world + 1}: ${Math.round(running)} coins so far (level pay ${first}, finds if all sold ${Math.round(finds)})`);
}
console.log(rows.join('\n'));
const upgrades = Object.entries(TRACKS).map(([k, t]) => [k, t.tiers.reduce((a, x) => a + x.cost, 0)]);
console.log('\nUpgrade totals:', upgrades.map(([k, v]) => `${k} ${v}`).join(', '), '=> all', upgrades.reduce((a, [, v]) => a + v, 0));
const looks = Object.values(LOOKS).flat().reduce((a, l) => a + l.cost, 0);
console.log('All cosmetics:', looks);
console.log('Repeat clear of level 40 pays', repeatCoins(40), 'plus finds', Math.round(levelDef(40).slots * expectedValue(4)));
console.log('Daily haystack chest at a 7-day streak:', DAILY_HAY.coins + DAILY_HAY.perStreakDay * DAILY_HAY.maxStreak, 'coins; daily gift cycle: 225 coins / 7 days');