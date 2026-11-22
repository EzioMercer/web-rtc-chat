// The only place that touches browser storage. It holds the encrypted contacts, keys and settings, never messages.
const DB_NAME = 'web-rtc-chat';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

const open = (): Promise<IDBDatabase> => {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

const run = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> => {
  const db = await open();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));

    tx.oncomplete = () => resolve(request.result as T);
    tx.onerror = () => reject(tx.error);
  });
};

export const kv = {
  get: <T>(key: string): Promise<T | undefined> => run<T | undefined>('readonly', store => store.get(key)),
  set: (key: string, value: unknown): Promise<void> => run('readwrite', store => store.put(value, key)),
  delete: (key: string): Promise<void> => run('readwrite', store => store.delete(key)),
  clear: (): Promise<void> => run('readwrite', store => store.clear()),
};
