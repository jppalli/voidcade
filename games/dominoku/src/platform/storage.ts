/** One string slot in local storage, with an in-memory fallback when storage is unavailable. */
export interface Store {
  read(): string | null;
  write(value: string): void;
}

const KEY = 'dominoku:state';

export function createStore(): Store {
  try {
    const probe = '__dominoku_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return {
      read: () => window.localStorage.getItem(KEY),
      write: (v) => {
        try {
          window.localStorage.setItem(KEY, v);
        } catch {
          /* storage full or blocked: keep playing */
        }
      },
    };
  } catch {
    return memoryStore();
  }
}

export function memoryStore(): Store {
  let value: string | null = null;
  return { read: () => value, write: (v) => void (value = v) };
}