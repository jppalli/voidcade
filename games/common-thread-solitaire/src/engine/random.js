function seededRandom(seed) {
  let e = seed >>> 0;
  return () => {
    e = e + 1831565813 >>> 0;
    let s = e;
    return s = Math.imul(s ^ s >>> 15, s | 1), s ^= s + Math.imul(s ^ s >>> 7, s | 61), ((s ^ s >>> 14) >>> 0) / 4294967296;
  };
}
function hashSeed(text) {
  let e = 2166136261;
  for (let s = 0; s < text.length; s++) e ^= text.charCodeAt(s), e = Math.imul(e, 16777619) >>> 0;
  return e >>> 0;
}
function shuffle(items, random) {
  for (let s = items.length - 1; s > 0; s--) {
    let o = Math.floor(random() * (s + 1)),
      a = items[s];
    items[s] = items[o], items[o] = a;
  }
  return items;
}
export { seededRandom, hashSeed, shuffle };
