import { MEDIA_DATABASE_VERSION, mediaAssetStoreName, upgradeMediaDatabase } from "./media-database-migration";

type ReadOptions = { mode: "read"; signal?: AbortSignal };
type OwnedOptions = { mode: "owned"; authorised: () => boolean; subscribeOwnership: (listener: () => void) => () => void; onBlocked?: () => void; signal?: AbortSignal };

/** Open a media library without upgrading readers or leaving stale owners active. */
export function openMediaDatabase(factory: IDBFactory, name: string, options: ReadOptions | OwnedOptions): Promise<IDBDatabase> {
  const authorised = () => {
    if (options.mode === "read") return true;
    try { return options.authorised(); }
    catch { return false; }
  };
  if (!authorised()) return Promise.reject(new Error("Media saving is no longer owned by this tab."));
  if (options.signal?.aborted) return Promise.reject(new DOMException("Media opening was cancelled.", "AbortError"));

  return new Promise((resolve, reject) => {
    let settled = false;
    let invalidated: Error | DOMException | null = null;
    let upgradeError: unknown;
    let request: IDBOpenDBRequest | undefined;
    let unsubscribe = () => {};
    const finishError = (error: unknown) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", cancel);
      unsubscribe();
      reject(error);
    };
    const invalidate = (error: Error | DOMException) => {
      if (invalidated) return;
      invalidated = error;
      const transaction = request?.transaction;
      if (transaction) {
        // An active version-change transaction must finish or abort before the
        // caller's pending write releases its Web Lock. If it is already
        // committing, its eventual success/error still drains that write.
        try { transaction.abort(); } catch { /* Await the native result. */ }
        return;
      }
      finishError(error);
    };
    const cancel = () => invalidate(new DOMException("Media opening was cancelled.", "AbortError"));
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.mode === "owned") {
      try {
        const remove = options.subscribeOwnership(() => {
          if (!authorised()) invalidate(new Error("Media saving is no longer owned by this tab."));
        });
        unsubscribe = remove;
        // A synchronous subscription may have invalidated before it returned.
        if (settled) { unsubscribe(); return; }
        if (!authorised()) invalidate(new Error("Media saving is no longer owned by this tab."));
        if (settled) return;
      } catch (error) { finishError(error); return; }
    }
    try { request = factory.open(name, options.mode === "owned" ? MEDIA_DATABASE_VERSION : undefined); }
    catch (error) { finishError(error); return; }
    const opening = request;
    opening.onblocked = () => {
      if (options.mode === "owned" && !invalidated) {
        try { options.onBlocked?.(); }
        catch (error) { invalidate(error instanceof Error ? error : new Error("Media opening failed.")); }
      }
    };
    opening.onupgradeneeded = event => {
      const transaction = opening.transaction;
      if (!transaction) return;
      try {
        if (options.mode !== "owned") throw new Error("The media library is not available for read-only access yet.");
        if (invalidated || !authorised()) throw new Error("Media saving is no longer owned by this tab.");
        upgradeMediaDatabase(opening.result, transaction, event.oldVersion);
        // A blocked request may resume after an owner has left. The pending
        // write retains its Web Lock, while this final request checks its token.
        const guard = transaction.objectStore("metadata").get("generation");
        guard.onsuccess = () => {
          if (invalidated || !authorised()) {
            upgradeError = new Error("Media saving is no longer owned by this tab.");
            transaction.abort();
          }
        };
      } catch (error) {
        upgradeError = error;
        transaction.abort();
      }
    };
    opening.onerror = () => finishError(invalidated ?? upgradeError ?? opening.error ?? new Error("Could not open the media library."));
    opening.onsuccess = () => {
      const database = opening.result;
      if (invalidated || !authorised()) {
        database.close();
        finishError(invalidated ? new Error("Media opening finished after cancellation or ownership changed. Reload before editing.") : new Error("Media saving is no longer owned by this tab."));
        return;
      }
      try { mediaAssetStoreName(database); }
      catch (error) { database.close(); finishError(error); return; }
      database.onversionchange = () => database.close();
      if (settled) { database.close(); return; }
      settled = true;
      options.signal?.removeEventListener("abort", cancel);
      unsubscribe();
      resolve(database);
    };
  });
}
