// The only place that touches browser storage. Everything in it is encrypted with the vault key, except the
// protection settings needed to unlock it (meta) and the device key.
const DB_NAME = 'web-rtc-chat';
const STORE = 'kv';

// One write of a batch: `value` undefined deletes the key.
export type KvWrite = { key: string; value?: unknown };

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

// Runs `action` in one transaction, which is all or nothing, and resolves with what it returned once committed.
const run = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => () => T): Promise<T> => {
  const db = await open();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const result = action(tx.objectStore(STORE));

    tx.oncomplete = () => resolve(result());
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Saving was cancelled.'));
  });
};

// Every key that starts with `prefix`.
const range = (prefix: string) => IDBKeyRange.bound(prefix, `${prefix}￿`);

export const kv = {
  get: <T>(key: string): Promise<T | undefined> => run('readonly', (store) => {
    const request = store.get(key);

    return () => request.result as T | undefined;
  }),
  set: (key: string, value: unknown): Promise<void> => run('readwrite', (store) => {
    store.put(value, key);

    return () => undefined;
  }),
  delete: (key: string): Promise<void> => run('readwrite', (store) => {
    store.delete(key);

    return () => undefined;
  }),
  clear: (): Promise<void> => run('readwrite', (store) => {
    store.clear();

    return () => undefined;
  }),
  // Writes and deletes together: either all of them happen or none.
  batch: (writes: KvWrite[]): Promise<void> => run('readwrite', (store) => {
    writes.forEach(({ key, value }) => (value === undefined ? store.delete(key) : store.put(value, key)));

    return () => undefined;
  }),
  // Keys starting with `prefix`, in order.
  keys: (prefix: string): Promise<string[]> => run('readonly', (store) => {
    const request = store.getAllKeys(range(prefix));

    return () => request.result.map(String);
  }),
  // Keys and values starting with `prefix`, in key order.
  entries: <T>(prefix: string): Promise<[string, T][]> => run('readonly', (store) => {
    const keys = store.getAllKeys(range(prefix));
    const values = store.getAll(range(prefix));

    return () => keys.result.map((key, i): [string, T] => [String(key), values.result[i] as T]);
  }),
  deletePrefix: (prefix: string): Promise<void> => run('readwrite', (store) => {
    store.delete(range(prefix));

    return () => undefined;
  }),
};
