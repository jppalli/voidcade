/** What the current teaching step waits for before it moves on. */
export type TeachNeed =
  | { paint: number[] }
  | { chord: number }
  | { tool: "fill" | "mark" }
  | { filled: number }
  | { focus: true }
  | { done: true };

export interface TeachStep {
  /** Coach text. A little inline <b>/<i> is allowed; nothing else. */
  say: string;
  /** Cells to ring while this step is up. */
  spot?: number[];
  /** Nudge a tool button, so the player can see where to go. */
  tool?: "fill" | "mark";
  /** Nudge a color swatch. */
  color?: number;
  /** Omit for a step the player just reads and dismisses. */
  need?: TeachNeed;
}

export interface Level {
  id: string;
  index: number;
  w: number;
  h: number;
  /** Colors of every cell, "012..." row by row. */
  sol: string;
  /** Cells that start painted and locked. */
  given: number[];
  /** Givens that also show their neighbour count. A subset of `given`. */
  nums: number[];
  tier: number;
  stars: number;
  /** Tutorial boards: no hearts are lost, and the coach walks the player through. */
  gentle?: boolean;
  teach?: TeachStep[];
  /** A closing line for the win screen. */
  outro?: string;
  /** Daily Challenge board — bigger, tier 4, and outside the chapter unlock chain. */
  daily?: boolean;
  /** Overrides the standard three hearts. */
  hearts?: number;
}

export interface Chapter {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  levels: Level[];
}

export interface LevelData {
  seed: number;
  chapters: Chapter[];
}
