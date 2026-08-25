export type Player = 'X' | 'O';
export type Cell = Player | null;

/** 'pvp' = local hotseat 2-player, 'ai' = human (X) vs computer (O). */
export type GameMode = 'pvp' | 'ai';

/** Index 0..8, row-major: 0 1 2 / 3 4 5 / 6 7 8 */
export type Board = Cell[];

/**
 * A single hint grid: 3 row categories crossed with 3 column traits.
 * `answers[r][c]` holds the curated (lowercase) accepted words for the
 * cell at that row/column intersection — e.g. row "Wild Animal" x column
 * "Can Fly" -> ["bat", "eagle", "owl", ...].
 */
export interface GridDef {
  id: string;
  name: string;
  rows: [string, string, string];
  cols: [string, string, string];
  answers: [
    [string[], string[], string[]],
    [string[], string[], string[]],
    [string[], string[], string[]],
  ];
}

export interface WinInfo {
  player: Player;
  line: [number, number, number];
}
