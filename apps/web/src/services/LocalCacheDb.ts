const DB_NAME = 'oomfy_local_db';
const STORE_NAME = 'cache_entries';
const DB_VERSION = 1;

const memoryFallback = new Map<string, unknown>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const idb = typeof window !== 'undefined' ? window.indexedDB : globalThis.indexedDB;
      if (!idb) { resolve(null); return; }
      const req = idb.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      req.onerror = () => { dbPromise = null; resolve(null); };
      req.onblocked = () => resolve(null);
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });
  return dbPromise;
}

export async function listCacheKeys(): Promise<string[]> {
  const db = await openDatabase();
  if (!db) return Array.from(memoryFallback.keys());
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAllKeys();
      req.onsuccess = () => resolve((req.result || []).map(String));
      req.onerror = () => resolve(Array.from(memoryFallback.keys()));
    } catch {
      resolve(Array.from(memoryFallback.keys()));
    }
  });
}

export async function deleteCacheEntry(key: string): Promise<void> {
  memoryFallback.delete(key);
  const db = await openDatabase();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function pruneOtherScopes(keepPrefixes: string[]): Promise<void> {
  const keys = await listCacheKeys();
  const toDelete = keys.filter((k) => !keepPrefixes.some((prefix) => k === prefix || k.startsWith(prefix)));
  await Promise.all(toDelete.map((k) => deleteCacheEntry(k)));
}

async function tryWriteIdb<T>(db: IDBDatabase, key: string, value: T): Promise<'ok' | 'quota' | 'err'> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve('ok');
      tx.onerror = () => {
        const name = tx.error?.name || '';
        resolve(name === 'QuotaExceededError' ? 'quota' : 'err');
      };
      tx.onabort = () => {
        const name = tx.error?.name || '';
        resolve(name === 'QuotaExceededError' ? 'quota' : 'err');
      };
    } catch (err: any) {
      resolve(err?.name === 'QuotaExceededError' ? 'quota' : 'err');
    }
  });
}

export async function getCacheEntry<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return (memoryFallback.get(key) as T) ?? null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve((memoryFallback.get(key) as T) ?? null);
    } catch {
      resolve((memoryFallback.get(key) as T) ?? null);
    }
  });
}

export async function setCacheEntry<T>(key: string, value: T, activeScope?: string): Promise<void> {
  memoryFallback.set(key, value);
  const db = await openDatabase();
  if (!db) return;
  const status = await tryWriteIdb(db, key, value);
  if (status === 'quota') {
    const keepPrefixes = activeScope
      ? [`oomfy_queries_${activeScope}`, `oomfy_entities_${activeScope}`]
      : [key];
    await pruneOtherScopes(keepPrefixes).catch(() => {});
    await tryWriteIdb(db, key, value);
  }
}

export async function clearLocalCacheDb(): Promise<void> {
  memoryFallback.clear();
  const db = await openDatabase();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
