/**
 * Daily quests: three small tasks a day, a nudge toward things the player has not tried.
 * No penalties and nothing is lost by ignoring them. They are picked from the date, so they
 * are the same on every device, and they reset at midnight.
 */
import { saved, persist } from './progress';
import { today, helpersUnlocked } from './economy';

export type QuestEvent = 'clear' | 'find' | 'uncommon' | 'fan' | 'detector' | 'vacuum' | 'pluck';

interface Template {
  id: string;
  event: QuestEvent;
  /** The task, e.g. "Clear 2 levels". */
  text: (n: number) => string;
  goals: [number, number];
  /** Coins = base + per * goal. */
  coins: [number, number];
  cells?: number;
  /** Needs this helper to have been handed over (0 detector, 1 fan, 2 vacuum). */
  helper?: number;
}

const TEMPLATES: Template[] = [
  { id: 'clear', event: 'clear', text: n => `Clear ${n} ${n === 1 ? 'level' : 'levels'}`, goals: [1, 3], coins: [6, 6] },
  { id: 'find', event: 'find', text: n => `Find ${n} bonus items`, goals: [3, 6], coins: [4, 3] },
  { id: 'pluck', event: 'pluck', text: n => `Lift ${n} straws`, goals: [40, 90], coins: [6, 0.12] },
  { id: 'uncommon', event: 'uncommon', text: n => `Find ${n} uncommon or better ${n === 1 ? 'item' : 'items'}`, goals: [1, 2], coins: [10, 8] },
  { id: 'fan', event: 'fan', text: n => `Use the fan ${n === 1 ? 'once' : `${n} times`}`, goals: [1, 2], coins: [8, 6], helper: 1 },
  { id: 'detector', event: 'detector', text: n => `Scan with the detector for ${n} seconds`, goals: [8, 20], coins: [8, 0.5], helper: 0 },
  { id: 'vacuum', event: 'vacuum', text: n => `Vacuum up ${n} straws`, goals: [60, 150], coins: [8, 0.08], helper: 2, cells: 1 },
];
const byId = (id: string) => TEMPLATES.find(t => t.id === id);

/** A small seeded random source, so the day's quests are the same everywhere. */
function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Makes today's quests if the date has changed. */
export function ensureQuests() {
  if (saved.quests.date === today()) return;
  const rng = seeded('needle-quests-' + today());
  const open = (t: Template) => t.helper === undefined || saved.cheat || saved.introduced.includes(t.helper);
  const pickFrom = (ids: string[], not: string[]) => {
    const pool = TEMPLATES.filter(t => ids.includes(t.id) && open(t) && !not.includes(t.id));
    return pool[Math.floor(rng() * pool.length)];
  };
  const a = pickFrom(['clear', 'find', 'pluck'], []);
  const b = pickFrom(helpersUnlocked() ? ['fan', 'detector', 'vacuum', 'uncommon'] : ['uncommon'], [a.id]);
  const c = pickFrom(['clear', 'find', 'pluck', 'uncommon'], [a.id, b.id]);
  const list = [a, b, c].map(t => ({ id: t.id, goal: Math.round(t.goals[0] + rng() * (t.goals[1] - t.goals[0])), n: 0, claimed: false }));
  saved.quests = { date: today(), list };
  persist();
}

export interface QuestView {
  index: number;
  text: string;
  goal: number;
  n: number;
  done: boolean;
  claimed: boolean;
  reward: { coins: number; cells: number };
}
export function questReward(id: string, goal: number) {
  const t = byId(id)!;
  return { coins: Math.round(t.coins[0] + t.coins[1] * goal), cells: helpersUnlocked() ? (t.cells ?? 0) : 0 };
}
export function questViews(): QuestView[] {
  ensureQuests();
  return saved.quests.list
    .map((q, index) => ({ q, index, t: byId(q.id) }))
    .filter(e => e.t)
    .map(({ q, index, t }) => ({
      index,
      text: t!.text(q.goal),
      goal: q.goal,
      n: Math.min(q.n, q.goal),
      done: q.n >= q.goal,
      claimed: q.claimed,
      reward: questReward(q.id, q.goal),
    }));
}
/** Counts progress. `amount` can be fractional (seconds of detector use). */
export function track(event: QuestEvent, amount = 1) {
  ensureQuests();
  let changed = false;
  for (const q of saved.quests.list) {
    const t = byId(q.id);
    if (!t || t.event !== event || q.n >= q.goal) continue;
    q.n = Math.min(q.goal, q.n + amount);
    changed = true;
  }
  if (changed) saveSoon();
}
let timer = 0;
/** Progress arrives in small bursts (a stroke lifts dozens of straws), so it is written a moment later. */
function saveSoon() {
  if (typeof window === 'undefined') return persist();
  if (timer) return;
  timer = window.setTimeout(() => {
    timer = 0;
    persist();
  }, 400);
}
/** Pays a finished quest into the purse, once, and returns what it paid (or null). The caller shows it arriving. */
export function claimQuest(index: number) {
  const q = saved.quests.list[index];
  if (!q || q.claimed || q.n < q.goal) return null;
  q.claimed = true;
  const r = questReward(q.id, q.goal);
  saved.coins = saved.coins + r.coins;
  saved.cells = Math.min(999, saved.cells + r.cells);
  persist();
  return r;
}
/** Quests finished and not yet claimed. */
export const questsToClaim = () => (ensureQuests(), saved.quests.list.filter(q => q.n >= q.goal && !q.claimed).length);
