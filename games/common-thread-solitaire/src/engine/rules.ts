import type { Card, GameState, Source, Destination, Action, MoveResult, MoveError } from "./types";
var isItem = (t: Card) => t.kind === "word" || t.kind === "pic";
function cloneState(state: GameState) {
  return {
    cols: state.cols.map(e => e.map(s => ({
      id: s.id,
      up: s.up
    }))),
    stock: state.stock.slice(),
    waste: state.waste.slice(),
    found: state.found.map(e => e ? {
      ...e
    } : null),
    cleared: state.cleared.slice(),
    moves: state.moves,
    movesUsed: state.movesUsed
  };
}
function movableStart(state: GameState, cards: Card[], columnIndex: number) {
  let o = state.cols[columnIndex];
  if (o.length === 0) return -1;
  let a = o.length - 1,
    i = o[a];
  if (!i.up) return -1;
  let r = cards[i.id];
  if (r.kind === "wild") return -1;
  if (r.kind === "cat") return a;
  let l = a;
  while (l - 1 >= 0) {
    let c = o[l - 1];
    if (!c.up) break;
    let d = cards[c.id];
    if (!isItem(d) || d.cat !== r.cat) break;
    l--;
  }
  return l;
}
function sourceCards(state: GameState, cards: Card[], source: Source) {
  if (source.z === "waste") {
    let i = state.waste[state.waste.length - 1];
    return i === void 0 ? null : [i];
  }
  let o = state.cols[source.i];
  if (!o) return null;
  let a = movableStart(state, cards, source.i);
  if (a < 0 || source.idx < a || source.idx > o.length - 1) return null;
  return o.slice(source.idx).map(i => i.id);
}
function destinationError(state: GameState, cards: Card[], source: Source, movingIds: number[], destination: Destination): MoveError | null {
  let i = cards[movingIds[0]];
  if (destination.z === "found") {
    let c = state.found[destination.i];
    if (c === void 0) return "notMovable";
    if (!c) return i.kind === "cat" && movingIds.length === 1 ? null : "needCategory";
    if (i.kind === "cat") return "slotBusy";
    if (i.kind === "wild") return "wrongSet";
    return i.cat === c.cat ? null : "wrongSet";
  }
  if (source.z === "col" && source.i === destination.i) return "notMovable";
  let r = state.cols[destination.i];
  if (!r) return "notMovable";
  if (r.length === 0) return null;
  let l = cards[r[r.length - 1].id];
  if (l.kind === "cat") return "onCategory";
  if (!isItem(i)) return "mismatch";
  if (l.kind === "wild") return null;
  return l.cat === i.cat ? null : "mismatch";
}
function validateAction(state: GameState, cards: Card[], action: Action): MoveError | null {
  if (state.moves <= 0) return "noMoves";
  if (action.t === "draw") return state.stock.length > 0 ? null : "notMovable";
  if (action.t === "recycle") return state.stock.length === 0 && state.waste.length > 0 ? null : "notMovable";
  let o = sourceCards(state, cards, action.from);
  if (!o) return "notMovable";
  return destinationError(state, cards, action.from, o, action.to);
}
function applyAction(state: GameState, cards: Card[], action: Action): MoveResult {
  let o = validateAction(state, cards, action);
  if (o) return {
    ok: !1,
    reason: o
  };
  if (state.moves -= 1, state.movesUsed += 1, action.t === "draw") {
    let r = state.stock.pop()!;
    return state.waste.push(r), {
      ok: !0,
      moved: [r]
    };
  }
  if (action.t === "recycle") {
    let r = state.waste.slice();
    return state.stock = state.waste.reverse(), state.waste = [], {
      ok: !0,
      moved: r
    };
  }
  let a = sourceCards(state, cards, action.from)!,
    i: MoveResult = {
      ok: !0,
      moved: a,
      flipped: []
    };
  if (action.from.z === "waste") state.waste.pop();else {
    let r = state.cols[action.from.i];
    r.splice(action.from.idx);
    let l = r[r.length - 1];
    if (l && cards[l.id].kind === "wild") i.dissolvedWild = l.id, r.pop();
    let c = r[r.length - 1];
    if (c && !c.up) c.up = !0, i.flipped!.push(c.id);
  }
  if (action.to.z === "found") {
    let r = state.found[action.to.i];
    if (!r) {
      let l = cards[a[0]];
      state.found[action.to.i] = {
        cat: l.cat,
        catCard: l.id,
        count: 0,
        total: l.total ?? 0
      };
    } else if (r.count += a.length, i.scored = {
      found: action.to.i,
      ids: a
    }, r.count >= r.total) state.cleared.push(r.cat), i.clearedCat = r.cat, i.clearedFound = action.to.i, state.found[action.to.i] = null;
  } else for (let r of a) state.cols[action.to.i].push({
    id: r,
    up: !0
  });
  return i;
}
function sources(state: GameState, cards: Card[]) {
  let s: Source[] = [];
  if (state.waste.length) s.push({
    z: "waste"
  });
  return state.cols.forEach((o, a) => {
    let i = movableStart(state, cards, a);
    if (i >= 0) for (let r = i; r < o.length; r++) s.push({
      z: "col",
      i: a,
      idx: r
    });
  }), s;
}
function destinations(state: GameState) {
  let e: Destination[] = [];
  return state.found.forEach((s, o) => e.push({
    z: "found",
    i: o
  })), state.cols.forEach((s, o) => e.push({
    z: "col",
    i: o
  })), e;
}
function legalActions(state: GameState, cards: Card[], includeDeck: boolean = !0) {
  let o: Action[] = [];
  if (state.moves <= 0) return o;
  for (let a of sources(state, cards)) {
    let i = sourceCards(state, cards, a)!;
    for (let r of destinations(state)) if (!destinationError(state, cards, a, i, r)) o.push({
      t: "move",
      from: a,
      to: r
    });
  }
  if (includeDeck) {
    if (state.stock.length) o.push({
      t: "draw"
    });else if (state.waste.length) o.push({
      t: "recycle"
    });
  }
  return o;
}
function countSets(cards: Card[]) {
  return cards.filter(e => e.kind === "cat").length;
}
function isWon(state: GameState, cards: Card[]) {
  return state.cleared.length >= countSets(cards);
}
function canPlaceCard(state: GameState, cards: Card[], cardId: number) {
  let o = cards[cardId];
  for (let a = 0; a < state.found.length; a++) {
    let i = state.found[a];
    if (!i && o.kind === "cat") return !0;
    if (i && isItem(o) && i.cat === o.cat) return !0;
  }
  for (let a of state.cols) {
    if (a.length === 0) return !0;
    let i = cards[a[a.length - 1].id];
    if (!isItem(o)) continue;
    if (i.kind === "wild") return !0;
    if (isItem(i) && i.cat === o.cat) return !0;
  }
  return !1;
}
function isDeadlocked(state: GameState, cards: Card[]) {
  if (state.moves <= 0) return !1;
  if (legalActions(state, cards, !1).filter(o => {
    if (o.t !== "move") return !0;
    if (o.to.z === "col" && state.cols[o.to.i].length === 0 && o.from.z === "col" && o.from.idx === 0) return !1;
    return !0;
  }).length) return !1;
  for (let o of [...state.stock, ...state.waste]) if (canPlaceCard(state, cards, o)) return !1;
  return !0;
}
export { isItem, cloneState, movableStart, sourceCards, destinationError, validateAction, applyAction, sources, destinations, legalActions, countSets, isWon, canPlaceCard, isDeadlocked };
