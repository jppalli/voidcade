/**
 * Seasonal events: for a few weeks each year a second set of items can turn up in the hay,
 * alongside the world's own. The dates repeat every year and can be changed from the config file
 * (see config.ts). Only sets that are built into the game can be scheduled.
 */
export interface EventDef {
  id: string;
  name: string;
  /** The set of items it brings (see items.ts). */
  set: string;
  /** First and last day of the event each year, as "MM-DD". It may run over New Year. */
  from: string;
  to: string;
  blurb: string;
}

export const EVENTS: EventDef[] = [
  { id: 'harvest', name: 'Harvest Festival', set: 'harvest', from: '10-01', to: '11-07', blurb: 'Pumpkins, pies and straw hats are turning up in the hay.' },
  { id: 'festive', name: 'Festive Season', set: 'festive', from: '12-01', to: '01-06', blurb: 'Baubles, gingerbread and holly are hiding in the hay.' },
];

const mmdd = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The event running on a date, if any. */
export function activeEvent(date: Date = new Date()): EventDef | undefined {
  const t = mmdd(date);
  return EVENTS.find(e => (e.from <= e.to ? t >= e.from && t <= e.to : t >= e.from || t <= e.to));
}

/** Whole days until the event ends (0 on its last day). */
export function daysLeft(e: EventDef, date: Date = new Date()): number {
  for (let d = 0; d < 400; d++) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + d + 1);
    if (mmdd(next) === e.to) return d + 1;
  }
  return 0;
}
