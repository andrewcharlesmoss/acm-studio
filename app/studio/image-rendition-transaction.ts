import { captureImageRenditions } from "./image-rendition-validation";
import { prepareImageRenditions, RenditionPreparationError, type RenditionSource } from "./image-rendition-preparation";
import { MEDIA_REQUEST_LIFETIME_MS, MediaCommandError, validateMediaRequest, type MediaRequest } from "./media-command";
import { MEDIA_ASSET_STORE, MEDIA_METADATA_STORE, MEDIA_RECEIPT_STORE } from "./media-database-migration";

type Ownership = { captureWriteToken: () => symbol; canWrite: (token: symbol) => boolean; subscribe: (listener: () => void) => () => void };
type Receipt = { id: string; completedAt: number; operationFingerprint?: string };
type StoredAsset = RenditionSource & Record<string, unknown>;
type Snapshot = { asset?: StoredAsset; generation: unknown; receipt?: Receipt };
type Options = {
  ownership: Ownership;
  // The production adapter supplies its existing shared media queue and
  // studioWriteOwnership.write; this module never creates another writer.
  runOwnedMediaWrite: <T>(operation: () => Promise<T>) => Promise<T>;
  openOwnedDatabase: (token: symbol, signal: AbortSignal) => Promise<IDBDatabase>;
};

function requireCurrentRequest(request: MediaRequest, owner: Ownership, token: symbol): void {
  const age = Date.now() - Date.parse(request.submittedAt);
  if (!owner.canWrite(token)) throw new MediaCommandError("Files saving is paused. Try again when it reconnects.", "unavailable");
  if (age > MEDIA_REQUEST_LIFETIME_MS || age < -30_000) throw new MediaCommandError("This Files action expired. Check the current library before trying again.");
}

function renditionFingerprint(value: unknown): string {
  if (value === undefined) return "none";
  const captured = captureImageRenditions(value);
  return JSON.stringify(captured, (key, item) => key === "blob" ? undefined : item);
}

/** Run in the existing per-document media queue and commit bytes with one replay receipt. */
export async function applyImageRenditionRequest(input: MediaRequest, options: Options): Promise<"prepared" | "existing" | "replayed"> {
  if (!validateMediaRequest(input) || input.command.kind !== "generate-image-renditions") throw new MediaCommandError("The image size request is invalid.");
  const request = structuredClone(input);
  if (!validateMediaRequest(request) || request.command.kind !== "generate-image-renditions") throw new MediaCommandError("The image size request is invalid.");
  const token = options.ownership.captureWriteToken();
  return options.runOwnedMediaWrite(async () => {
    let database: IDBDatabase | undefined;
    let active: IDBTransaction | undefined;
    let invalidated = false;
    const cancellation = new AbortController();
    const unsubscribe = options.ownership.subscribe(() => {
      if (!options.ownership.canWrite(token)) {
        invalidated = true;
        cancellation.abort();
        try { active?.abort(); } catch { /* The transaction may already be finishing. */ }
      }
    });
    const check = () => {
      if (invalidated) throw new MediaCommandError("Files saving is paused. Try again when it reconnects.", "unavailable");
      requireCurrentRequest(request, options.ownership, token);
    };
    try {
      check();
      database = await options.openOwnedDatabase(token, cancellation.signal);
      check();
      const command = request.command;
      if (command.kind !== "generate-image-renditions") throw new MediaCommandError("The image size request is invalid.");
      const fingerprint = JSON.stringify([command.kind, command.id, command.sourceDigest]);
      const requireMatchingReceipt = (receipt: Receipt) => {
        if (receipt.operationFingerprint !== fingerprint) throw new MediaCommandError("This Files action ID belongs to a different request. Review the current image before retrying.", "conflict");
      };
      let snapshot: Snapshot = { generation: undefined };
      await new Promise<void>((resolve, reject) => {
        const transaction = database!.transaction([MEDIA_ASSET_STORE, MEDIA_METADATA_STORE, MEDIA_RECEIPT_STORE], "readonly"); active = transaction;
        let readFailure: unknown;
        const asset = transaction.objectStore(MEDIA_ASSET_STORE).get(command.id);
        const generation = transaction.objectStore(MEDIA_METADATA_STORE).get("generation");
        const receipt = transaction.objectStore(MEDIA_RECEIPT_STORE).get(request.id);
        transaction.oncomplete = () => { active = undefined; snapshot = { asset: asset.result as StoredAsset | undefined, generation: generation.result, receipt: receipt.result as Receipt | undefined }; resolve(); };
        transaction.onerror = () => { readFailure ??= transaction.error ?? new Error("Could not read the media library."); try { transaction.abort(); } catch { /* Already aborting. */ } };
        transaction.onabort = event => { if (event.target === transaction) reject(readFailure ?? transaction.error ?? new Error("The media read was cancelled.")); };
      });
      check();
      if (snapshot.generation !== request.generation) throw new MediaCommandError("The library was restored or replaced. Your action was kept for review.", "replaced");
      if (snapshot.receipt) { requireMatchingReceipt(snapshot.receipt); return "replayed"; }
      if (!snapshot.asset) throw new MediaCommandError("The selected file was removed in another tab.", "conflict");
      if (!(snapshot.asset.blob instanceof Blob)) throw new MediaCommandError("The selected image could not be read. Keep the original file and review the library.", "invalid");
      const originalFingerprint = renditionFingerprint(snapshot.asset.imageRenditions);
      const originalSize = snapshot.asset.blob.size;
      const originalType = snapshot.asset.blob.type;
      let prepared;
      try { prepared = await prepareImageRenditions(snapshot.asset, command.sourceDigest); }
      catch (error) {
        if (error instanceof RenditionPreparationError) throw new MediaCommandError(error.message, error.code);
        throw error;
      }
      check();
      if (prepared.status === "original-only") throw new MediaCommandError("Image sizes are unavailable for this file. The original is still available.", "unavailable");
      let failure: unknown;
      let result: "prepared" | "existing" | "replayed" = prepared.status;
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database!.transaction([MEDIA_ASSET_STORE, MEDIA_METADATA_STORE, MEDIA_RECEIPT_STORE], "readwrite"); active = transaction;
          const assets = transaction.objectStore(MEDIA_ASSET_STORE);
          const receipts = transaction.objectStore(MEDIA_RECEIPT_STORE);
          const reads = [assets.get(command.id), transaction.objectStore(MEDIA_METADATA_STORE).get("generation"), receipts.getAll()];
          let remaining = reads.length;
          const complete = () => {
            if (--remaining) return;
            try {
              check();
              const [asset, generation, storedReceipts] = reads.map(read => read.result) as [StoredAsset | undefined, string, Receipt[]];
              if (generation !== request.generation) throw new MediaCommandError("The library was restored or replaced. Your action was kept for review.", "replaced");
              const priorReceipt = storedReceipts.find(receipt => receipt.id === request.id);
              if (priorReceipt) { requireMatchingReceipt(priorReceipt); result = "replayed"; return; }
              const retained = storedReceipts.filter(receipt => receipt.completedAt > Date.now() - 24 * 60 * 60_000);
              if (retained.length >= 10_000) throw new MediaCommandError("Files has reached its daily action limit. Try again later.");
              if (!asset || !(asset.blob instanceof Blob) || asset.sourceRevision !== prepared.sourceRevision || asset.blob.size !== originalSize || asset.blob.type !== originalType || renditionFingerprint(asset.imageRenditions) !== originalFingerprint) throw new MediaCommandError("The image file changed. Choose it again before generating sizes.", "conflict");
              if (prepared.status === "prepared") assets.put({ ...asset, sourceRevision: asset.sourceRevision ?? crypto.randomUUID(), imageRenditions: prepared.imageRenditions });
              for (const receipt of storedReceipts) if (receipt.completedAt <= Date.now() - 24 * 60 * 60_000) receipts.delete(receipt.id);
              receipts.put({ id: request.id, completedAt: Date.now(), operationFingerprint: fingerprint });
            } catch (error) { failure = error; transaction.abort(); }
          };
          reads.forEach(read => { read.onsuccess = complete; });
          transaction.oncomplete = () => { active = undefined; resolve(); };
          transaction.onerror = () => { failure ??= transaction.error ?? new Error("Could not save image sizes."); try { transaction.abort(); } catch { /* Already aborting. */ } };
          transaction.onabort = event => { if (event.target === transaction) reject(failure ?? transaction.error ?? new Error("The image size save was cancelled.")); };
        });
      } catch (error) { throw failure ?? error; }
      // A transaction may have committed just as ownership was withdrawn.
      // Never report a confirmed save in that case; the receipt permits a
      // safe retry after the new owner checks the current library.
      if (invalidated || !options.ownership.canWrite(token)) throw new MediaCommandError("The image size save could not be confirmed. Check the current image before trying again.", "unavailable");
      return result;
    } finally {
      unsubscribe();
      database?.close();
    }
  });
}
