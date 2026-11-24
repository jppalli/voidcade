import { START_DATE } from './daily';

/** "YYYY-MM-DD" to a local Date, or null if it is not a real calendar date. */
export function parseDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2] - 1, +m[3]];
  const date = new Date(y, mo, d);
  return date.getFullYear() === y && date.getMonth() === mo && date.getDate() === d ? date : null;
}

export function addDaysToKey(key: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)!;
  const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + days));
  const p = (v: number) => String(v).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

const startMs = () => new Date(START_DATE.year, START_DATE.month, START_DATE.day).getTime();
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Puzzles exist from the start date up to and including today. */
export function isPlayableDay(date: Date, today: Date): boolean {
  const t = dayStart(date);
  return t >= startMs() && t <= dayStart(today);
}

/** Day numbers of one month laid out in weeks, Sunday first. Null pads the first and last week. */
export function monthCells(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...new Array<null>(first).fill(null)];
  for (let d = 1; d <= count; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** Whether a month overlaps the playable range, so the archive can stop its arrows. */
export function monthInRange(year: number, month: number, today: Date): boolean {
  const idx = year * 12 + month;
  return idx >= START_DATE.year * 12 + START_DATE.month && idx <= today.getFullYear() * 12 + today.getMonth();
}