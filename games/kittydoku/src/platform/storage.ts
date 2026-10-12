import type { Platform } from './platform';

/**
 * Small key/value store the game reads synchronously. Everything is loaded
 * once at boot (from the Arkadium SDK's persistence, or the browser when
 * running outside the Arena) and every write goes back out in the background.
 */

const KEYS = ['kittydoku-progress-v1', 'kittydoku-sound', 'kittydoku-hints'] as const;
export type StorageKey = (typeof KEYS)[number];

const cache = new Map<StorageKey, string>();
let backend: Platform | null = null;

export async function initStorage(platform: Platform): Promise<void> {
  backend = platform;
  await Promise.all(
    KEYS.map(async (k) => {
      try {
        const v = await platform.load(k);
        if (v !== null) cache.set(k, v);
      } catch {
        /* unreadable: start fresh for this key */
      }
    })
  );
}

export function getItem(key: StorageKey): string | null {
  return cache.get(key) ?? null;
}

export function setItem(key: StorageKey, value: string): void {
  cache.set(key, value);
  backend?.save(key, value).catch(() => {
    /* storage unavailable: the game still plays, it just won't remember */
  });
}
