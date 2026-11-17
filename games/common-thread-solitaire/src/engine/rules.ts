import type { Action, ActionResult, Card, ColumnCard, FoundationSlot, RejectReason, SetSpec, Source, TableState, Target } from './types';
import { CATEGORY_BY_ID, PIC_LABELS } from '../data/categories';
import { seededRng, shuffle } from './rng';

export function buildCards(t: SetSpec[]): Card[] {
  let e: Card[] = [];
  for (let s of t) {
    let o = CATEGORY_BY_ID[s.cat];
    if (!o) throw Error(`Unknown category ${s.cat}`);
    let a = Math.min(s.n, o.items.length);
    e.push({
      id: e.length,
      kind: "cat",
      cat: o.id,
      label: o.title,
      total: a,
      icon: o.modality === "pic" ? o.items[0] : undefined
    });
    for (let i of o.items.slice(0, a)) if (o.modality === "pic") e.push({
      id: e.length,
      kind: "pic",
      cat: o.id,
      label: PIC_LABELS[i] ?? i,
      icon: i
    });else e.push({
      id: e.length,
      kind: "word",
      cat: o.id,
      label: i
    });
  }
  return e;
}
function boardShape(t: number) {
  return t === 3 ? {
    F: 3,
    C: 3,
    R: 3
  } : {
    F: 4,
    C: 4,
    R: 4
  };
}
export function deal(t: Card[], e: number, s: number, o: number): TableState {
  let {
      F: a,
      C: i,
      R: r
    } = boardShape(e),
    l = shuffle(t.map(p => p.id), seededRng(s)),
    c: ColumnCard[][] = [],
    d = 0;
  for (let p = 0; p < i; p++) {
    let x: ColumnCard[] = [];
    for (let f = 0; f < r; f++) x.push({
      id: l[d++],
      up: f === r - 1
    });
    c.push(x);
  }
  let u = l.slice(d);
  return {
    cols: c,
    stock: u,
    waste: [],
    found: Array.from({
      length: a
    }, () => null as FoundationSlot | null),
    cleared: [],
    moves: o,
    movesUsed: 0
  };
}
export const isPlayable = (t: Card) => t.kind === "word" || t.kind === "pic";
export function cloneState(t: TableState): TableState {
  return {
    cols: t.cols.map(e => e.map(s => ({
      id: s.id,
      up: s.up
    }))),
    stock: t.stock.slice(),
    waste: t.waste.slice(),
    found: t.found.map(e => e ? {
      ...e
    } : null),
    cleared: t.cleared.slice(),
    moves: t.moves,
    movesUsed: t.movesUsed
  };
}
export function movableStart(t: TableState, e: Card[], s: number): number {
  let o = t.cols[s];
  if (o.length === 0) return -1;
  let a = o.length - 1,
    i = o[a];
  if (!i.up) return -1;
  let r = e[i.id];
  if (r.kind === "wild") return -1;
  if (r.kind === "cat") return a;
  let l = a;
  while (l - 1 >= 0) {
    let c = o[l - 1];
    if (!c.up) break;
    let d = e[c.id];
    if (!isPlayable(d) || d.cat !== r.cat) break;
    l--;
  }
  return l;
}
export function movableCards(t: TableState, e: Card[], s: Source): number[] | null {
  if (s.z === "waste") {
    let i = t.waste[t.waste.length - 1];
    return i === undefined ? null : [i];
  }
  let o = t.cols[s.i];
  if (!o) return null;
  let a = movableStart(t, e, s.i);
  if (a < 0 || s.idx < a || s.idx > o.length - 1) return null;
  return o.slice(s.idx).map(i => i.id);
}
export function dropError(t: TableState, e: Card[], s: Source, o: number[], a: Target): RejectReason | null {
  let i = e[o[0]];
  if (a.z === "found") {
    let c = t.found[a.i];
    if (c === undefined) return "notMovable";
    if (!c) return i.kind === "cat" && o.length === 1 ? null : "needCategory";
    if (i.kind === "cat") return "slotBusy";
    if (i.kind === "wild") return "wrongSet";
    return i.cat === c.cat ? null : "wrongSet";
  }
  if (s.z === "col" && s.i === a.i) return "notMovable";
  let r = t.cols[a.i];
  if (!r) return "notMovable";
  if (r.length === 0) return null;
  let l = e[r[r.length - 1].id];
  if (l.kind === "cat") return "onCategory";
  if (!isPlayable(i)) return "mismatch";
  if (l.kind === "wild") return null;
  return l.cat === i.cat ? null : "mismatch";
}
function actionError(t: TableState, e: Card[], s: Action): RejectReason | null {
  if (t.moves <= 0) return "noMoves";
  if (s.t === "draw") return t.stock.length > 0 ? null : "notMovable";
  if (s.t === "recycle") return t.stock.length === 0 && t.waste.length > 0 ? null : "notMovable";
  let o = movableCards(t, e, s.from);
  if (!o) return "notMovable";
  return dropError(t, e, s.from, o, s.to);
}
export function applyAction(state: TableState, cards: Card[], action: Action): ActionResult {
  const reason = actionError(state, cards, action);
  if (reason) return { ok: false, reason };

  state.moves -= 1;
  state.movesUsed += 1;

  if (action.t === 'draw') {
    const drawn = state.stock.pop()!;
    state.waste.push(drawn);
    return { ok: true, moved: [drawn] };
  }
  if (action.t === 'recycle') {
    const moved = state.waste.slice();
    state.stock = state.waste.reverse();
    state.waste = [];
    return { ok: true, moved };
  }

  const moved = movableCards(state, cards, action.from)!;
  const result: ActionResult = { ok: true, moved, flipped: [] };

  // Lift the cards off their source.
  if (action.from.z === 'waste') {
    state.waste.pop();
  } else {
    const column = state.cols[action.from.i];
    column.splice(action.from.idx);
    const top = column[column.length - 1];
    // A Wild Thread dissolves once the cards it carried leave.
    if (top && cards[top.id].kind === 'wild') {
      result.dissolvedWild = top.id;
      column.pop();
    }
    const exposed = column[column.length - 1];
    if (exposed && !exposed.up) {
      exposed.up = true;
      result.flipped!.push(exposed.id);
    }
  }

  // Put them down on the target.
  if (action.to.z === 'found') {
    const slot = state.found[action.to.i];
    if (!slot) {
      const tag = cards[moved[0]];
      state.found[action.to.i] = { cat: tag.cat, catCard: tag.id, count: 0, total: tag.total ?? 0 };
    } else {
      slot.count += moved.length;
      result.scored = { found: action.to.i, ids: moved };
      if (slot.count >= slot.total) {
        state.cleared.push(slot.cat);
        result.clearedCat = slot.cat;
        result.clearedFound = action.to.i;
        state.found[action.to.i] = null;
      }
    }
  } else {
    for (const id of moved) state.cols[action.to.i].push({ id, up: true });
  }
  return result;
}
function movableSources(t: TableState, e: Card[]): Source[] {
  let s: Source[] = [];
  if (t.waste.length) s.push({
    z: "waste"
  });
  t.cols.forEach((o, a) => {
    let i = movableStart(t, e, a);
    if (i >= 0) for (let r = i; r < o.length; r++) s.push({
      z: "col",
      i: a,
      idx: r
    });
  });
  return s;
}
function dropTargets(t: TableState): Target[] {
  let e: Target[] = [];
  t.found.forEach((s, o) => e.push({
    z: "found",
    i: o
  }));
  t.cols.forEach((s, o) => e.push({
    z: "col",
    i: o
  }));
  return e;
}
export function legalActions(t: TableState, e: Card[], s = true): Action[] {
  let o: Action[] = [];
  if (t.moves <= 0) return o;
  for (let a of movableSources(t, e)) {
    let i = movableCards(t, e, a)!;
    for (let r of dropTargets(t)) if (!dropError(t, e, a, i, r)) o.push({
      t: "move",
      from: a,
      to: r
    });
  }
  if (s) {
    if (t.stock.length) o.push({
      t: "draw"
    });else if (t.waste.length) o.push({
      t: "recycle"
    });
  }
  return o;
}
function countCategoryCards(t: Card[]) {
  return t.filter(e => e.kind === "cat").length;
}
export function isSolved(t: TableState, e: Card[]): boolean {
  return t.cleared.length >= countCategoryCards(e);
}
function cardHasHome(t: TableState, e: Card[], s: number): boolean {
  let o = e[s];
  for (let a = 0; a < t.found.length; a++) {
    let i = t.found[a];
    if (!i && o.kind === "cat") return true;
    if (i && isPlayable(o) && i.cat === o.cat) return true;
  }
  for (let a of t.cols) {
    if (a.length === 0) return true;
    let i = e[a[a.length - 1].id];
    if (!isPlayable(o)) continue;
    if (i.kind === "wild") return true;
    if (isPlayable(i) && i.cat === o.cat) return true;
  }
  return false;
}
export function isDeadlocked(t: TableState, e: Card[]): boolean {
  if (t.moves <= 0) return false;
  if (legalActions(t, e, false).filter(o => {
    if (o.t !== "move") return true;
    if (o.to.z === "col" && t.cols[o.to.i].length === 0 && o.from.z === "col" && o.from.idx === 0) return false;
    return true;
  }).length) return false;
  for (let o of [...t.stock, ...t.waste]) if (cardHasHome(t, e, o)) return false;
  return true;
}



