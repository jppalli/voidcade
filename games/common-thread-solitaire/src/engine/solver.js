import { legalActions, movableStart, sourceCards, cloneState, isWon, applyAction } from "../engine/rules.js";
import { seededRandom } from "../engine/random.js";
var isItemKind = t => t === "word" || t === "pic";
function solverActions(state, cards) {
  return legalActions(state, cards, !0).filter(s => {
    if (s.t !== "move" || s.from.z !== "col") return !0;
    if (s.from.idx !== movableStart(state, cards, s.from.i)) return !1;
    if (s.to.z === "col" && state.cols[s.to.i].length === 0 && s.from.idx === 0) return !1;
    return !0;
  });
}
function exposedCount(state, cards, categoryId) {
  let o = 0;
  for (let i of state.cols) {
    let r = i[i.length - 1];
    if (r && cards[r.id].cat === categoryId && isItemKind(cards[r.id].kind)) o++;
  }
  let a = state.waste[state.waste.length - 1];
  if (a !== void 0 && cards[a].cat === categoryId) o++;
  return o;
}
function scoreAction(state, cards, action) {
  if (action.t === "draw") return 6;
  if (action.t === "recycle") return 2;
  let o = sourceCards(state, cards, action.from),
    a = cards[o[0]],
    i;
  if (action.from.z === "col") i = state.cols[action.from.i][action.from.idx - 1];
  let r = i ? i.up ? 8 : 14 : 0;
  if (action.to.z === "found") {
    let c = state.found[action.to.i];
    if (!c) return 70 + 4 * exposedCount(state, cards, a.cat) + r;
    let d = c.count + o.length >= c.total;
    return 100 + 5 * o.length + (d ? 40 : 0) + r;
  }
  if (state.cols[action.to.i].length === 0) {
    if (action.from.z === "waste") return a.kind === "cat" ? 14 : 8;
    if (!i) return -1000;
    return i.up ? 15 : 45;
  }
  if (action.from.z === "waste") return 40;
  if (!i) return 35;
  return i.up ? 30 : 50;
}
function simulate(state, cards, random, noise = 25, maxSteps = 600) {
  let i = cloneState(state);
  i.moves = 1e5;
  let r = [],
    l = 0;
  for (let c = 0; c < maxSteps; c++) {
    if (isWon(i, cards)) return {
      solved: !0,
      moves: r.length,
      path: r
    };
    let d = solverActions(i, cards);
    if (!d.length) return {
      solved: !1,
      moves: r.length,
      path: r
    };
    let u = null,
      p = -1 / 0;
    for (let x of d) {
      let f = scoreAction(i, cards, x) + random() * noise;
      if (f > p) p = f, u = x;
    }
    if (!u) break;
    if (u.t === "recycle") {
      if (++l > 3) return {
        solved: !1,
        moves: r.length,
        path: r
      };
    } else if (u.t === "move") l = 0;
    applyAction(i, cards, u), r.push(u);
  }
  return {
    solved: isWon(i, cards),
    moves: r.length,
    path: r
  };
}
function solve(state, cards, seed, attempts = 30) {
  let a = seededRandom(seed ^ 2654435769),
    i = null,
    r = 0;
  for (let l = 0; l < attempts; l++) {
    let c = simulate(state, cards, a, l === 0 ? 0 : 25);
    if (c.solved) {
      if (r++, !i || c.moves < i.moves) i = c;
    }
  }
  return {
    solved: !!i,
    par: i ? i.moves : 0,
    successRate: r / attempts,
    bestPath: i ? i.path : []
  };
}
function bestHint(state, cards) {
  let s = solverActions(state, cards),
    o = null,
    a = -1 / 0;
  for (let i of s) {
    let r = scoreAction(state, cards, i);
    if (r > a) a = r, o = i;
  }
  return o;
}
export { isItemKind, solverActions, exposedCount, scoreAction, simulate, solve, bestHint };
