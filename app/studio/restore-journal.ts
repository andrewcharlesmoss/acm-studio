import { DESIGN_STORAGE_KEY, LOCAL_PUBLICATIONS_KEY, LOCAL_WORKSPACE_KEY, RESTORE_PENDING_KEY, RESTORE_RECEIPT_KEY, TEMPLATE_STORAGE_KEY } from "../content/local-storage-keys.ts";
import { MEDIA_DATABASE_VERSION, MEDIA_METADATA_STORE } from "./media-database-migration.ts";
import { openMediaDatabase } from "./media-database-open.ts";

export const RESTORE_JOURNAL_KEY = "fullRestore";
export const MEDIA_DATABASE_NAME = "acm-studio-media";
const keys = [LOCAL_WORKSPACE_KEY, LOCAL_PUBLICATIONS_KEY, DESIGN_STORAGE_KEY, TEMPLATE_STORAGE_KEY] as const;
type Authority = { authorised: () => boolean; subscribeOwnership: (listener: () => void) => () => void };
type Journal = { version: 1; phase: "original" | "committed"; id: string; generation: string | null; values: (string | null)[] };
export type RestoreValues = { workspace: string; publications: string | null; designs: string | null; templates: string | null };

function validId(id: unknown): id is string { return typeof id === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(id); }

function validJournal(value: unknown, generation: unknown): value is Journal {
  if (!value || typeof value !== "object") return false;
  const journal = value as Partial<Journal>;
  const values = journal.values;
  return journal.version === 1 && validId(journal.id) && (journal.phase === "original" || journal.phase === "committed") &&
    (journal.generation === null || typeof journal.generation === "string") && journal.generation === (generation ?? null) &&
    Array.isArray(values) && values.length === keys.length && keys.every((_, index) => values[index] === null || typeof values[index] === "string");
}

/** A matching receipt was written after all four localStorage values. Ordinary
 * edits may since have changed any of them, including back to an older value. */
export function restoreAcknowledgement(journal: unknown, generation: unknown) {
  if (journal === undefined) return null;
  if (!validJournal(journal, generation)) throw new Error("The Studio restore records could not be verified.");
  return `${journal.phase}:${journal.id}`;
}

function applyValues(storage: Storage, values: (string | null)[], recoverAll = false) {
  // Release space before installing larger values. A malformed string and an
  // absent key must still be distinguishable when recovering original records.
  const changed = keys.map((key, index) => storage.getItem(key) !== values[index]);
  const failures: unknown[] = [];
  function write(action: () => void) {
    try { action(); } catch (error) { if (!recoverAll) throw error; failures.push(error); }
  }
  for (const [i, key] of keys.entries()) if (changed[i]) write(() => storage.removeItem(key));
  for (const [i, key] of keys.entries()) {
    const value = values[i];
    if (changed[i] && value !== null) write(() => storage.setItem(key, value));
  }
  if (failures.length) throw new AggregateError(failures, "The original Studio values could not be fully recovered.");
}

export function writeRestoreValues(storage: Storage, values: RestoreValues) {
  applyValues(storage, [values.workspace, values.publications, values.designs, values.templates]);
}

export function commitRestoreGeneration(store: IDBObjectStore, id: string, values: RestoreValues, tx: IDBTransaction) {
  const generation = store.get("generation");
  const request = store.get(RESTORE_JOURNAL_KEY);
  request.onsuccess = () => {
    const original = request.result;
    if (!validJournal(original, generation.result) || original.phase !== "original" || original.id !== id) { tx.abort(); return; }
    store.put(id, "generation");
    store.put({ version: 1, phase: "committed", id, generation: id, values: [values.workspace, values.publications, values.designs, values.templates] } satisfies Journal, RESTORE_JOURNAL_KEY);
  };
}

/** Template package replacement also rotates the media generation. Keep an
 * acknowledged full restore recognisable after that ordinary library change. */
export function renewMediaGeneration(store: IDBObjectStore, tx: IDBTransaction, next = crypto.randomUUID()) {
  const generation = store.get("generation");
  const pending = store.get(RESTORE_JOURNAL_KEY);
  pending.onsuccess = () => {
    if (pending.result !== undefined) {
      if (!validJournal(pending.result, generation.result)) { tx.abort(); return; }
      store.put({ ...pending.result, generation: next }, RESTORE_JOURNAL_KEY);
    }
    store.put(next, "generation");
  };
}

function checkOwner(guard: Authority) {
  if (!guard.authorised()) throw new Error("This tab no longer owns restore recovery.");
}

export async function beginRestore(storage: Storage, guard: Authority) {
  if (storage.getItem(RESTORE_PENDING_KEY) !== null) throw new Error("A previous restore still needs recovery.");
  const id = crypto.randomUUID();
  const values = keys.map(key => storage.getItem(key));
  // Reserve enough room for the receipt before journalling or changing data.
  const preparing = `preparing:${id}                `;
  storage.setItem(RESTORE_PENDING_KEY, preparing);
  try {
    const db = await openMediaDatabase(window.indexedDB, MEDIA_DATABASE_NAME, { mode: "owned", ...guard });
    try {
      checkOwner(guard);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(MEDIA_METADATA_STORE, "readwrite", { durability: "strict" });
        const store = tx.objectStore(MEDIA_METADATA_STORE);
        const current = store.get("generation");
        current.onsuccess = () => {
          if (!guard.authorised()) { tx.abort(); return; }
          store.put({ version: 1, phase: "original", id, generation: current.result ?? null, values } satisfies Journal, RESTORE_JOURNAL_KEY);
        };
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error ?? new Error("Restore preparation was interrupted."));
      });
    } finally { db.close(); }
    checkOwner(guard);
    return id;
  } catch (error) {
    // A lost owner can no longer decide whether the prepared transaction committed.
    if (!guard.authorised()) throw new AggregateError([error], "Restore preparation was interrupted.");
    try { await resumePendingRestore(storage, guard); } catch (failure) { throw new AggregateError([error, failure], "Restore preparation needs recovery."); }
    throw error;
  }
}

function readDecision(factory: IDBFactory): Promise<{ journal?: Journal; receipt: string | null }> {
  // A browser can lose its recent localStorage writes on process termination.
  // Always consult the durable decision. A missing DB must stay uncreated and
  // v1/v2 installations must stay at their original version until a real write.
  return new Promise((resolve, reject) => {
    const request = factory.open(MEDIA_DATABASE_NAME);
    let absent = false;
    request.onupgradeneeded = event => { absent = event.oldVersion === 0; request.transaction!.abort(); };
    request.onerror = () => absent ? resolve({ receipt: null }) : reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      try {
        if (db.version > MEDIA_DATABASE_VERSION) throw new Error("This Files database needs a newer Studio recovery reader.");
        if (db.version <= 2) { db.close(); resolve({ receipt: null }); return; }
        const tx = db.transaction(MEDIA_METADATA_STORE, "readonly");
        const store = tx.objectStore(MEDIA_METADATA_STORE);
        const generation = store.get("generation");
        const journal = store.get(RESTORE_JOURNAL_KEY);
        tx.oncomplete = () => {
          db.close();
          try { resolve({ journal: journal.result, receipt: restoreAcknowledgement(journal.result, generation.result) }); }
          catch (error) { reject(error); }
        };
        tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Restore verification was interrupted.")); };
      } catch (error) { db.close(); reject(error); }
    };
  });
}

/** Standalone Design may browse before it obtains the writer, but cannot
 * initialise an editable canvas from a partially persisted browser profile. */
export async function restoreReadyForBrowsing(storage: Storage = window.localStorage) {
  if (storage.getItem(RESTORE_PENDING_KEY) !== null) return false;
  const { receipt } = await readDecision(window.indexedDB);
  return storage.getItem(RESTORE_PENDING_KEY) === null && receipt === storage.getItem(RESTORE_RECEIPT_KEY);
}

/** Pre-origin/in-memory coordinators have no persistent browser state. Every
 * real browser origin checks IndexedDB even if all localStorage evidence vanished. */
export function checkRestoreBeforeLoad(browser: Window | undefined, guard: Authority) {
  const storage = browser?.localStorage;
  if (!storage) return;
  if (!browser.location?.origin && storage.getItem(RESTORE_PENDING_KEY) == null && storage.getItem(RESTORE_RECEIPT_KEY) == null) return;
  return resumePendingRestore(storage, guard);
}

export async function resumePendingRestore(storage: Storage, guard: Authority): Promise<"original" | "committed" | null> {
  const pending = storage.getItem(RESTORE_PENDING_KEY);
  const pendingId = pending?.trimEnd().replace(/^preparing:/, "");
  if (pending !== null && (!pending.startsWith("preparing:") || !validId(pendingId))) throw new Error("The pending Studio restore could not be identified.");
  const { journal, receipt } = await readDecision(window.indexedDB);
  checkOwner(guard);
  if (receipt !== storage.getItem(RESTORE_RECEIPT_KEY)) {
    if (!journal || !receipt) throw new Error("The stored restore receipt has no matching Files generation.");
    applyValues(storage, journal.values, true);
    if (pending !== null) storage.removeItem(RESTORE_PENDING_KEY);
    storage.setItem(RESTORE_RECEIPT_KEY, receipt);
    return journal.phase;
  }
  // A preparing intent can precede its journal. In that window all originals
  // are untouched. An acknowledged journal already permits later ordinary edits.
  if (pending !== null) storage.removeItem(RESTORE_PENDING_KEY);
  return journal?.phase ?? null;
}
