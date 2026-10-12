import type { Platform } from './platform';

/**
 * Small key/value store the game reads synchronously. Everything is loaded
 * once at boot and every write goes back out in the background.
 *
 * Two copies exist: this device's (always) and the cloud's (signed-in Arena
 * players only). When both exist they are merged per key, so playing as a
 * guest and then signing in never throws away progress, and a second device
 * picks up where the first left off. The merged result is written back to
 * whichever copy was behind.
 */

const KEYS = ['kittydoku-progress-v1', 'kittydoku-sound', 'kittydoku-hints'] as const;
export type StorageKey = (typeof KEYS)[number];

/** Combines this device's value and the cloud's into one. */
type Merge = (local: string, remote: string) => string;
const mergers = new Map<StorageKey, Merge>();

/** Modules that own a key register how to merge it (default: device wins). */
export function registerMerge(key: StorageKey, merge: Merge) {
  mergers.set(key, merge);
}

const cache = new Map<StorageKey, string>();
let backend: Platform | null = null;
let signedIn = false;

async function settle(key: StorageKey, local: string | null, remote: string | null) {
  let value: string | null;
  if (local !== null && remote !== null && local !== remote) {
    try {
      value = (mergers.get(key) ?? ((l) => l))(local, remote);
    } catch {
      value = local;
    }
  } else {
    value = local ?? remote;
  }
  if (value === null) return;
  cache.set(key, value);
  if (value !== local) await backend!.saveLocal(key, value).catch(() => undefined);
  if (signedIn && value !== remote) await backend!.saveRemote(key, value).catch(() => undefined);
}

/** Load (and reconcile) every key. Run at boot and again after signing in. */
async function sync() {
  if (!backend) return;
  const p = backend;
  signedIn = await p.isSignedIn().catch(() => false);
  await Promise.all(
    KEYS.map(async (k) => {
      const [local, remote] = await Promise.all([
        p.loadLocal(k).catch(() => null),
        signedIn ? p.loadRemote(k).catch(() => null) : Promise.resolve(null),
      ]);
      // The cache can hold changes made this session that haven't been read
      // back yet; treat them as the freshest local copy.
      await settle(k, cache.get(k) ?? local, remote);
    })
  );
}

export async function initStorage(platform: Platform): Promise<void> {
  backend = platform;
  await sync();
}

/** After the player signs in mid-session: pull their cloud save, merge it
 *  with what's here and push the result up. Resolves once the cache holds
 *  the merged data, so the caller can redraw. */
export async function resyncStorage(): Promise<void> {
  await sync();
}

export function setSignedOut() {
  signedIn = false;
}

export function getItem(key: StorageKey): string | null {
  return cache.get(key) ?? null;
}

export function setItem(key: StorageKey, value: string): void {
  cache.set(key, value);
  const p = backend;
  if (!p) return;
  // Storage unavailable: the game still plays, it just won't remember.
  p.saveLocal(key, value).catch(() => undefined);
  if (signedIn) p.saveRemote(key, value).catch(() => undefined);
}
