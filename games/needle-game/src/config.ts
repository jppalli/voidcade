/**
 * Remote tuning: an optional file, needle-config.json, next to the game that can change the
 * economy and the drop rates without a new build. Anything missing or invalid is ignored and the
 * built-in numbers stay. Only numbers that already exist in the game can be changed; nothing in
 * the file is ever run as code.
 *
 *   {
 *     "tuning": { "repeatPct": 0.4, "valueMult": 1.1, "adsPerDay": 3, "levelBase": 15, "levelPerWorld": 5 },
 *     "drops":  { "pity": 11, "eventShare": 0.3, "weights": { "common": 60, "uncommon": 28, "rare": 10, "treasure": 2 } },
 *     "cells":  { "pack": 3, "cost": 30 },
 *     "daily":  [ { "coins": 15, "cells": 1 }, ... seven entries ... ],
 *     "events": { "harvest": { "from": "10-01", "to": "11-07" } }
 *   }
 */
import { TUNING, CELLS, DAILY } from './economy';
import { DROP } from './drops';
import { EVENTS } from './events';

const num = (v: unknown, min: number, max: number): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
const mmdd = (v: unknown) => (typeof v === 'string' && /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v) ? v : undefined);

export function applyConfig(raw: unknown) {
  if (!raw || typeof raw !== 'object') return;
  const c = raw as Record<string, any>;
  const t = c.tuning ?? {};
  for (const [k, lo, hi] of [['levelBase', 1, 500], ['levelPerWorld', 0, 200], ['repeatPct', 0, 1], ['valueMult', 0.1, 10], ['adsPerDay', 0, 20]] as [keyof typeof TUNING, number, number][]) {
    const v = num(t[k], lo, hi);
    if (v !== undefined) TUNING[k] = v;
  }
  const d = c.drops ?? {};
  const pity = num(d.pity, 1, 100);
  if (pity !== undefined) DROP.pity = Math.round(pity);
  const es = num(d.eventShare, 0, 1);
  if (es !== undefined) DROP.eventShare = es;
  for (const r of Object.keys(DROP.weights) as (keyof typeof DROP.weights)[]) {
    const v = num(d.weights?.[r], 0, 1000);
    if (v !== undefined) DROP.weights[r] = v;
  }
  const pack = num(c.cells?.pack, 1, 50);
  if (pack !== undefined) CELLS.pack = Math.round(pack);
  const cost = num(c.cells?.cost, 1, 5000);
  if (cost !== undefined) CELLS.cost = Math.round(cost);
  if (Array.isArray(c.daily) && c.daily.length === DAILY.length) {
    const next = c.daily.map((e: any) => ({ coins: num(e?.coins, 0, 5000), cells: num(e?.cells, 0, 20) }));
    if (next.every((e: any) => e.coins !== undefined && e.cells !== undefined)) next.forEach((e: any, i: number) => (DAILY[i] = { coins: Math.round(e.coins), cells: Math.round(e.cells) }));
  }
  for (const ev of EVENTS) {
    const o = c.events?.[ev.id];
    if (mmdd(o?.from)) ev.from = o.from;
    if (mmdd(o?.to)) ev.to = o.to;
  }
}

/** Fetches the file (no caching, short timeout) and applies it. Never throws. */
export async function loadConfig() {
  try {
    const ctl = new AbortController();
    const timer = window.setTimeout(() => ctl.abort(), 2500);
    const res = await fetch('./needle-config.json', { cache: 'no-store', signal: ctl.signal });
    window.clearTimeout(timer);
    if (res.ok) applyConfig(await res.json());
  } catch {
    /* no file, or offline: the built-in numbers stay */
  }
}
