/**
 * Offline level generator. For every level in levels.spec.ts it tries seeds
 * until it finds a board whose logic grade matches the level's `target`, then
 * writes all 100 boards to src/game/levels.data.json.
 *
 *   npm run generate-levels            regenerate everything
 *   npm run generate-levels -- <id>    regenerate one level (e.g. garden-fence-3)
 *
 * Output is deterministic: the same spec always produces the same boards.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { generatePuzzle, gradePuzzle, seedFromString, type PuzzleBoard } from '@arcade/queens-core';
import { CHAPTERS, levelId, type LevelDef } from '../src/game/levels.spec.ts';
import type { LevelData, LevelsFile } from '../src/game/levels.data.types.ts';

const OUT = 'src/game/levels.data.json';
const MAX_ATTEMPTS = 2500;

const only = process.argv[2];

function encode(board: PuzzleBoard): Pick<LevelData, 'regions' | 'solution'> {
  return {
    regions: board.regions.map((row) => row.join('')),
    solution: board.solution.map((p) => p.col),
  };
}

const singlesIn = (b: PuzzleBoard) => {
  const counts = new Array(b.size).fill(0);
  b.regions.forEach((row) => row.forEach((v) => counts[v]++));
  return counts.filter((n) => n === 1).length;
};

function search(id: string, def: LevelDef, taken: Set<string>): { data: LevelData; off: number } {
  const wantTier = Math.floor(def.target);
  let best: { data: LevelData; off: number } | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const seed = seedFromString(`${id}#${attempt}`);
    const board = generatePuzzle({
      size: def.size,
      seed,
      singletonRegions: def.singletons,
      minRegionSize: def.singletons > 0 ? 1 : 2,
    });
    const key = board.regions.map((r) => r.join('')).join('/');
    if (taken.has(key)) continue;
    if (def.singletons === 0 && singlesIn(board) > 0) continue;
    if (def.singletons > 0 && singlesIn(board) < def.singletons) continue;

    const g = gradePuzzle(board.regions, def.size);
    if (!g.solvable) continue;

    // Right tier is a must; within it, get as close to the target as we can.
    // Tolerance widens slowly so rare targets still finish.
    const off = (g.maxTier === wantTier ? 0 : 10) + Math.abs(g.score - def.target);
    const data: LevelData = {
      id,
      size: def.size,
      ...encode(board),
      grade: { maxTier: g.maxTier, score: g.score },
      attempt,
    };
    if (!best || off < best.off) best = { data, off };
    const tolerance = 0.15 + Math.floor(attempt / 300) * 0.1;
    if (off <= tolerance) break;
  }
  if (!best) throw new Error(`no solvable board found for ${id}`);
  return best;
}

let existing: LevelsFile | null = null;
if (only) {
  try {
    existing = JSON.parse(readFileSync(OUT, 'utf8')) as LevelsFile;
  } catch {
    existing = null;
  }
}

const levels: LevelData[] = [];
const taken = new Set<string>();
let warnings = 0;
const started = Date.now();

for (const ch of CHAPTERS) {
  ch.levels.forEach((def, i) => {
    const id = levelId(ch.id, i);
    const keep = existing && only && id !== only ? existing.levels.find((l) => l.id === id) : undefined;
    if (keep) {
      levels.push(keep);
      taken.add(keep.regions.join('/'));
      return;
    }
    const t0 = Date.now();
    const { data, off } = search(id, def, taken);
    taken.add(data.regions.join('/'));
    levels.push(data);
    const warn = off > 0.5;
    if (warn) warnings++;
    console.log(
      `${warn ? 'WARN' : 'ok  '} ${id.padEnd(22)} ${def.size}x${def.size} s=${def.singletons} ` +
        `target=${def.target.toFixed(1)} got=${data.grade.score.toFixed(2)} (tier ${data.grade.maxTier}) ` +
        `attempt=${data.attempt} ${Date.now() - t0}ms`
    );
  });
}

const file: LevelsFile = { version: 1, levels };
writeFileSync(OUT, JSON.stringify(file, null, 0).replace(/\},\{/g, '},\n{') + '\n');
console.log(`\nwrote ${levels.length} levels to ${OUT} · warnings=${warnings} · ${Math.round((Date.now() - started) / 1000)}s`);
