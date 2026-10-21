import type { Platform } from './platform';

/**
 * Small key/value store the game reads synchronously. Everything is loaded
 * once at boot (and again when the player signs in or out); every write goes
 * back out in the background.
 *
 * Progress belongs to a player, not to the device:
 *  - a guest's progress lives in this device's storage;
 *  - a signed-in player's progress lives only in their cloud save, so
 *    another account on the same device never sees it, and signing out
 *    leaves the guest with a fresh game.
 * Signing in carries what the guest had played into the account (merged per
 * key, never lowering anything), then clears the guest copy, so it isn't
 * shown again after signing out.
 *
 * Progress here means levels and stars, the Endless best, the Daily Word
 * streak and today's free hints.
 *
 * Device settings (sound) stay with the device whoever is playing.
 */

const KEYS = ['hangman-progress', 'hangman-sound', 'hangman-hints', 'hangman-endless', 'hangman-daily'] as const;
export type StorageKey = (typeof KEYS)[number];

/** Saved per player (guest or account). Everything else is per device. */
const PER_PLAYER: readonly StorageKey[] = ['hangman-progress', 'hangman-hints', 'hangman-endless', 'hangman-daily'];
const perPlayer = (k: StorageKey) => PER_PLAYER.includes(k);

/** Combines two copies of a key into one. */
type Merge = (a: string, b: string) => string;
const mergers = new Map<StorageKey, Merge>();

/** Modules that own a key register how to merge it (default: the first wins). */
export function registerMerge(key: StorageKey, merge: Merge) {
  mergers.set(key, merge);
}

const cache = new Map<StorageKey, string>();
let backend: Platform | null = null;
let signedIn = false;
/** Keys whose cloud save couldn't be read: never written this session, so a
 *  network hiccup can't overwrite real progress with an empty game. */
const remoteUnreadable = new Set<StorageKey>();

const present = (v: string | null | undefined): v is string => v !== null && v !== undefined && v !== '';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function merge(key: StorageKey, a: string | null, b: string | null): string | null {
  if (!present(a)) return present(b) ? b : null;
  if (!present(b) || a === b) return a;
  try { return (mergers.get(key) ?? ((x) => x))(a, b); } catch { return a; }
}

function put(key: StorageKey, value: string | null) {
  if (present(value)) cache.set(key, value);
  else cache.delete(key);
}

/** The cloud copy, retried once. Throws if it really can't be read. */
async function readRemote(p: Platform, key: StorageKey): Promise<string | null> {
  try { return await p.loadRemote(key); } catch {
    await wait(800);
    return p.loadRemote(key);
  }
}

/** Load every key for whoever is playing now. `wasSignedIn`: someone was
 *  signed in before this call (then the cache holds their data, which must
 *  never be handed to the next player). */
async function sync(wasSignedIn: boolean) {
  if (!backend) return;
  const p = backend;
  signedIn = await p.isSignedIn().catch(() => false);
  remoteUnreadable.clear();
  await Promise.all(KEYS.map(async (k) => {
    const local = await p.loadLocal(k).catch(() => null);
    if (!perPlayer(k)) { if (!cache.has(k)) put(k, local); return; }

    if (!signedIn) { put(k, local); return; }

    // The guest's copy: what's on the device, or (signing in mid-session as a
    // guest) what's in memory and may not have reached storage yet.
    const guest = wasSignedIn ? local : (cache.get(k) ?? local);
    let remote: string | null;
    try {
      remote = await readRemote(p, k);
    } catch {
      remoteUnreadable.add(k);
      put(k, null);
      console.warn(`[hangman] cloud save unreadable for ${k}; not saving it this session`);
      return;
    }
    const value = merge(k, remote, guest);
    put(k, value);
    if (present(value) && value !== remote) await p.saveRemote(k, value).catch(() => undefined);
    // The guest's progress now lives in the account.
    if (present(local)) await p.saveLocal(k, '').catch(() => undefined);
  }));
}

export async function initStorage(platform: Platform): Promise<void> {
  backend = platform;
  await sync(false);
}

/** Signed in, signed out or switched account mid-session: reload everything
 *  for the new player. Resolves once the cache holds their data. */
export async function resyncStorage(): Promise<void> {
  await sync(signedIn);
}

export function getItem(key: StorageKey): string | null {
  return cache.get(key) ?? null;
}

export function setItem(key: StorageKey, value: string): void {
  cache.set(key, value);
  const p = backend;
  if (!p) return;
  // Storage unavailable: the game still plays, it just won't remember.
  if (perPlayer(key) && signedIn) {
    if (!remoteUnreadable.has(key)) p.saveRemote(key, value).catch(() => undefined);
  } else {
    p.saveLocal(key, value).catch(() => undefined);
  }
}
