import { identityStartupCacheKey, writeIdentityStartupCache } from "./identity-startup-cache";
import { StudioWriteOwnership, studioWriteOwnership } from "../write-ownership";
import { createIdentityPreview, type IdentityValues } from "./identity-preview-state";

export type IdentitySnapshot = { version: 1; revision: number; values: IdentityValues };
export class IdentityStorageError extends Error {
  constructor(readonly reason: "corrupt" | "conflict" | "blocked" | "unavailable" | "storage") { super(reason); }
}
export function validateIdentitySnapshot(value: unknown): IdentitySnapshot {
  const fail = (): never => { throw new IdentityStorageError("corrupt"); };
  if (!value || typeof value !== "object") return fail();
  const record = value as IdentitySnapshot;
  if (record.version !== 1 || !Number.isSafeInteger(record.revision) || record.revision < 1 || !record.values || Object.keys(record.values).sort().join() !== "global,test,test2") return fail();
  for (const scope of ["global", "test", "test2"] as const) {
    const identity = record.values[scope];
    if (!identity || typeof identity !== "object" || Array.isArray(identity) || Object.keys(identity).some(key => !["title", "tagline", "logo", "icon", "hidden"].includes(key))) return fail();
    for (const field of ["title", "tagline"] as const) {
      const text = identity[field];
      if (text !== undefined && text !== null && (typeof text !== "string" || text.length > (field === "title" ? 200 : 500))) return fail();
    }
    for (const field of ["logo", "icon"] as const) {
      const image = identity[field];
      if (image !== undefined && image !== null && (!image || typeof image !== "object" || ![image.id, image.name, image.altText].every(item => typeof item === "string" && item.length <= 10000) || !image.id || !(image.blob instanceof Blob) || image.blob.size > 25 * 1024 * 1024 || !image.blob.type.startsWith("image/"))) return fail();
    }
    if (identity.hidden !== undefined && (!identity.hidden || typeof identity.hidden !== "object" || Array.isArray(identity.hidden) || Object.entries(identity.hidden).some(([key, hidden]) => !["title", "tagline", "logo", "icon"].includes(key) || hidden !== true))) return fail();
  }
  return record;
}
export type IdentityStore = { read(): Promise<IdentitySnapshot | null>; compareAndSet(revision: number, values: IdentityValues): Promise<IdentitySnapshot> };
export function createIdentityStore(indexedDB: IDBFactory): IdentityStore {
  async function open(allowCreate: boolean) {
    return new Promise<IDBDatabase | null>((resolve, reject) => {
      let rejected = false;
      const request = indexedDB.open("acm-studio-identity-v1", 1);
      request.onupgradeneeded = () => { if (allowCreate && !rejected) request.result.createObjectStore("identity"); else request.transaction!.abort(); };
      request.onsuccess = () => { if (rejected) request.result.close(); else resolve(request.result); };
      request.onerror = () => { if (!allowCreate && request.error?.name === "AbortError") resolve(null); else reject(new IdentityStorageError("storage")); };
      request.onblocked = () => { rejected = true; reject(new IdentityStorageError("blocked")); };
    });
  }
  async function transaction(revision?: number, values?: IdentityValues) {
    const db = await open(Boolean(values));
    if (!db) return null;
    try {
      return await new Promise<IdentitySnapshot | null>((resolve, reject) => {
        const tx = db.transaction("identity", values ? "readwrite" : "readonly");
        const store = tx.objectStore("identity");
        let result: IdentitySnapshot | null = null;
        let failure: unknown;
        const request = store.get("current");
        request.onsuccess = () => {
          try {
            result = request.result === undefined ? null : validateIdentitySnapshot(request.result);
            if (values) {
              if ((result?.revision ?? 0) !== revision) throw new IdentityStorageError("conflict");
              result = validateIdentitySnapshot({ version: 1, revision: revision! + 1, values });
              store.put(result, "current");
            }
          } catch (error) { failure = error; tx.abort(); }
        };
        tx.oncomplete = () => resolve(result);
        tx.onabort = tx.onerror = () => reject(failure ?? new IdentityStorageError("storage"));
      });
    } finally { db.close(); }
  }
  return { read: () => transaction(), compareAndSet: async (revision, values) => (await transaction(revision, values))! };
}
export function createIdentityRepository({ store, ownership = studioWriteOwnership, locks = globalThis.navigator?.locks, cache }: { cache?: Pick<Storage, "setItem"> & Partial<Pick<Storage, "removeItem">>; store: IdentityStore; ownership?: StudioWriteOwnership; locks?: Pick<LockManager, "request"> }) {
  let revision: number | undefined;
  let queue = Promise.resolve();
  let failure: unknown;
  let cacheUnavailable = false;
  function cacheSnapshot(snapshot: IdentitySnapshot) {
    if (!cache) return;
    try { writeIdentityStartupCache(cache, snapshot); cacheUnavailable = false; } catch { cacheUnavailable = true; }
  }
  async function owned(operation: () => Promise<void>) {
    if (ownership.canWrite()) { await ownership.write(operation); return; }
    if (!locks) throw new IdentityStorageError("unavailable");
    await locks.request("acm-studio-writer-v1", { mode: "exclusive", ifAvailable: true }, async lock => {
      if (!lock) throw new IdentityStorageError("blocked");
      const temporary = new StudioWriteOwnership();
      let release = () => {};
      try {
        await new Promise<void>((resolve, reject) => {
          release = temporary.acquire(token => {
            temporary.loaded(token, true);
            void temporary.write(operation).then(resolve, reject);
          }, { request: (_name, _options, callback) => callback(lock) } as Pick<LockManager, "request">);
        });
      } finally { release(); temporary.dispose(); }
    });
  }
  async function save(values: IdentityValues) {
    if (failure) throw failure;
    if (revision === undefined) throw new IdentityStorageError("unavailable");
    try {
      await owned(async () => {
        const snapshot = await store.compareAndSet(revision!, values);
        revision = snapshot.revision;
        cacheSnapshot(snapshot);
      });
    } catch (error) { failure = error; throw error; }
  }
  return {
    async load() {
      const snapshot = await store.read();
      revision = snapshot?.revision ?? 0;
      if (cache) {
        try {
          await owned(async () => {
            const latest = await store.read();
            if (latest && latest.revision === snapshot?.revision) cacheSnapshot(latest);
            else if (!latest && !snapshot) cache.removeItem?.(identityStartupCacheKey);
          });
        } catch { cacheUnavailable = true; }
      }
      return snapshot?.values ?? createIdentityPreview().present;
    },
    cacheUnavailable: () => cacheUnavailable,
    save(values: IdentityValues) {
      const result = queue.then(() => save(values));
      queue = result.catch(() => {});
      return result;
    },
  };
}
