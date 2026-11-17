export function seededRng(t: number): () => number {
  let e = t >>> 0;
  return () => {
    e = e + 1831565813 >>> 0;
    let s = e;
    s = Math.imul(s ^ s >>> 15, s | 1);
    s ^= s + Math.imul(s ^ s >>> 7, s | 61);
    return ((s ^ s >>> 14) >>> 0) / 4294967296;
  };
}
export function hashString(t: string): number {
  let e = 2166136261;
  for (let s = 0; s < t.length; s++) {
    e ^= t.charCodeAt(s);
    e = Math.imul(e, 16777619) >>> 0;
  }
  return e >>> 0;
}
export function shuffle<T>(t: T[], e: () => number): T[] {
  for (let s = t.length - 1; s > 0; s--) {
    let o = Math.floor(e() * (s + 1)),
      a = t[s];
    t[s] = t[o];
    t[o] = a;
  }
  return t;
}

