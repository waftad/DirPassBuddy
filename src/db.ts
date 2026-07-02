// A tiny promise wrapper over IndexedDB used to persist:
//   - the chosen folder handle (so the library is remembered across sessions)
//   - an optional user-supplied SoundFont (so a custom sound set works offline)
//
// FileSystemHandle objects are structured-clonable, so they can be stored
// directly in IndexedDB; on the next visit we re-request permission.

const DB_NAME = "dirpassbuddy";
const STORE = "kv";

let dbPromise: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

export function kvGet<T>(key: string): Promise<T | undefined> {
  return tx<T | undefined>("readonly", (store) => store.get(key));
}

export function kvSet(key: string, value: unknown): Promise<unknown> {
  return tx("readwrite", (store) => store.put(value, key));
}

export function kvDelete(key: string): Promise<unknown> {
  return tx("readwrite", (store) => store.delete(key));
}

// Well-known keys.
export const KEY_DIR_HANDLE = "dirHandle";
export const KEY_SOUNDFONT = "soundfont";
export const KEY_SOUNDFONT_NAME = "soundfontName";
