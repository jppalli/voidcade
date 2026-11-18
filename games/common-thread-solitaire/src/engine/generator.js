import { dealCards, createCards } from "../engine/cards.js";
import { solve } from "../engine/solver.js";
import { categories, categoryById } from "../content/categories.js";
import { seededRandom, shuffle, hashSeed } from "../engine/random.js";
function hasAccessibleCategory(cards, seed, boardSize, requireFaceUp = !1) {
  let a = dealCards(cards, boardSize, seed, 1),
    i = a.cols.some(l => cards[l[l.length - 1].id].kind === "cat"),
    r = a.stock.slice(-3).some(l => cards[l].kind === "cat");
  return requireFaceUp ? i : i || r;
}
function generateLevel(options) {
  let e = createCards(options.sets),
    s = options.minSuccess ?? 0.2,
    o = null;
  for (let a = 0; a < (options.maxTries ?? 80); a++) {
    let i = options.seedStart + a * 7919 >>> 0;
    if (!hasAccessibleCategory(e, i, options.board, options.requireCatUp)) continue;
    let r = dealCards(e, options.board, i, 1),
      l = solve(r, e, i, options.attempts ?? 24);
    if (!l.solved) continue;
    let c = {
      key: options.key,
      mode: options.mode,
      title: options.title,
      board: options.board,
      sets: options.sets,
      mu: options.mu,
      seed: i,
      par: l.par,
      budget: Math.round(l.par * options.mu)
    };
    if (l.successRate >= s) return c;
    if (!o) o = c;
  }
  if (o) return o;
  throw Error(`Could not generate solvable level for ${options.key}`);
}
var pictureCategories = categories.filter(t => t.modality === "pic").map(t => t.id),
  wordCategories = categories.filter(t => t.modality === "word").map(t => t.id);
function selectSets(seed, options) {
  let s = seededRandom(seed),
    o = shuffle(wordCategories.filter(r => !(options.avoidHomographs && categoryById[r].tags?.includes("homograph"))), s),
    i = [...shuffle(pictureCategories.slice(), s).slice(0, options.picCount), ...o.slice(0, options.count - options.picCount)];
  return shuffle(i, s).map(r => {
    let l = Math.min(options.maxN, categoryById[r].items.length),
      c = Math.min(options.minN, l);
    return {
      cat: r,
      n: c + Math.floor(s() * (l - c + 1))
    };
  });
}
var difficulties = {
  casual: {
    label: "Casual",
    count: 6,
    picCount: 1,
    minN: 3,
    maxN: 5,
    mu: 1.75,
    avoidHomographs: !0
  },
  standard: {
    label: "Standard",
    count: 9,
    picCount: 1,
    minN: 4,
    maxN: 7,
    mu: 1.5,
    avoidHomographs: !1
  },
  expert: {
    label: "Expert",
    count: 12,
    picCount: 2,
    minN: 5,
    maxN: 8,
    mu: 1.3,
    avoidHomographs: !1
  }
};
function quickLevel(difficulty, seed) {
  let s = difficulties[difficulty],
    o = selectSets(seed, s);
  return generateLevel({
    key: `qp-${difficulty}-${seed}`,
    mode: "quick",
    title: `Quick Play · ${s.label}`,
    board: 4,
    sets: o,
    mu: s.mu,
    seedStart: seed,
    attempts: 16,
    maxTries: 40
  });
}
function dailyLevel(date) {
  let e = hashSeed("common-thread-daily-" + date),
    s = selectSets(e, {
      count: 9,
      picCount: 1,
      minN: 4,
      maxN: 7
    });
  return generateLevel({
    key: `daily-${date}`,
    mode: "daily",
    title: "Daily Puzzle",
    board: 4,
    sets: s,
    mu: 1.45,
    seedStart: e,
    attempts: 16,
    maxTries: 40
  });
}
export { hasAccessibleCategory, generateLevel, pictureCategories, wordCategories, selectSets, difficulties, quickLevel, dailyLevel };
