import type { Card, GameState, Source, Destination, Action, MoveResult, MoveError } from "./types";
import { categoryById, pictureLabels } from "../content/categories.js";
import { shuffle, seededRandom } from "../engine/random.js";
function createCards(sets: {
  cat: string;
  n: number;
}[]) {
  let e: Card[] = [];
  for (let s of sets) {
    let o = categoryById[s.cat];
    if (!o) throw Error(`Unknown category ${s.cat}`);
    let a = Math.min(s.n, o.items.length);
    e.push({
      id: e.length,
      kind: "cat",
      cat: o.id,
      label: o.title,
      total: a,
      icon: o.modality === "pic" ? o.items[0] : void 0
    });
    for (let i of o.items.slice(0, a)) if (o.modality === "pic") e.push({
      id: e.length,
      kind: "pic",
      cat: o.id,
      label: (pictureLabels as Record<string, string>)[i] ?? i,
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
function boardDimensions(boardSize: number) {
  return boardSize === 3 ? {
    F: 3,
    C: 3,
    R: 3
  } : {
    F: 4,
    C: 4,
    R: 4
  };
}
function dealCards(cards: Card[], boardSize: number, seed: number, moveBudget: number): GameState {
  let {
      F: a,
      C: i,
      R: r
    } = boardDimensions(boardSize),
    l = shuffle(cards.map(p => p.id), seededRandom(seed)),
    c = [],
    d = 0;
  for (let p = 0; p < i; p++) {
    let x = [];
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
    }, () => null),
    cleared: [],
    moves: moveBudget,
    movesUsed: 0
  };
}
export { createCards, boardDimensions, dealCards };
