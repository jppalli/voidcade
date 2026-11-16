/**
 * Which delivered pictures the game uses, and how icons and props are shown.
 *
 * `loadArtManifest()` runs once at start (boot.ts) before the rest of the game is loaded.
 * `pickSvg()` then returns either the game's own SVG or a small SVG that shows the delivered file,
 * so the layout and the CSS that style those pictures do not change.
 */
import { ART_SPEC, artSlots, slotKey, type ArtFormat, type ArtManifest, type ArtSlot } from './artslots';

const SLOTS = new Map<string, ArtSlot>(artSlots().map(s => [slotKey(s), s]));
let files: ArtManifest['files'] = {};
/** The kits whose pictures have all been delivered. */
const complete = new Set<string>();
let showAll = false;
/** The game's own SVG for every icon and prop that went through pickSvg (used by the tools). */
const fallbacks = new Map<string, string>();

/** Fetches the list of delivered pictures. Never throws: with no list, the game uses its own pictures. */
export async function loadArtManifest(): Promise<void> {
  showAll = typeof location !== 'undefined' && /[?&]art=all\b/.test(location.search);
  try {
    const ctl = new AbortController();
    const timer = window.setTimeout(() => ctl.abort(), 3000);
    const res = await fetch(`./${ART_SPEC.folder}/manifest.json`, { cache: 'no-store', signal: ctl.signal });
    window.clearTimeout(timer);
    const data = (await res.json()) as ArtManifest;
    if (data?.version === 2 && data.files && typeof data.files === 'object') files = data.files;
  } catch {
    files = {};
  }
  complete.clear();
  const kits = new Map<string, boolean>();
  for (const s of SLOTS.values()) kits.set(s.kit, (kits.get(s.kit) ?? true) && !!files[slotKey(s)]);
  for (const [kit, done] of kits) if (done) complete.add(kit);
}

/** The delivered file for a slot, if the game should use it. */
function usable(s: ArtSlot): { ext: ArtFormat; v: string } | null {
  const f = files[slotKey(s)];
  if (!f || !s.formats.includes(f.ext) || !/^[a-z0-9]+$/i.test(f.v)) return null;
  if (s.gate && !showAll && !complete.has(s.kit)) return null;
  return f;
}

/** Where a delivered picture is served from. */
export const artUrl = (s: ArtSlot, f: { ext: ArtFormat; v: string }) => `./${ART_SPEC.folder}/${s.folder}/${s.id}.${f.ext}?v=${f.v}`;

/** The URL of the delivered picture of an item or look-alike, or null (the game then draws its own). */
export function itemArtUrl(id: string): string | null {
  const s = SLOTS.get(`items/${id}`);
  const f = s && usable(s);
  return s && f ? artUrl(s, f) : null;
}

/**
 * The SVG to put in the page for an icon or a prop: the delivered picture inside a small SVG with
 * the same coordinate box as the game's own drawing, or `fallback` when nothing was delivered.
 */
export function pickSvg(folder: 'icons' | 'props', id: string, fallback: string): string {
  fallbacks.set(`${folder}/${id}`, fallback);
  const s = SLOTS.get(`${folder}/${id}`);
  const f = s && usable(s);
  if (!s || !f) return fallback;
  const [w, h] = s.box;
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><image href="${artUrl(s, f)}" width="${w}" height="${h}"/></svg>`;
}

/** The game's own SVG of everything registered so far, by slot key. */
export const registeredFallbacks = () => new Map(fallbacks);
/** Registers an SVG that is built by a function, so the tools can see it. */
export const registerFallback = (folder: 'icons' | 'props', id: string, svg: string) => void fallbacks.set(`${folder}/${id}`, svg);
