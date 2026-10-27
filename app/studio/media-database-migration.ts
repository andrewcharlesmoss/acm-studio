/** Names are versioned so older clients cannot export incomplete media records. */
export const LEGACY_MEDIA_ASSET_STORE = "assets";
export const MEDIA_ASSET_STORE = "assets-v3";
export const MEDIA_DATABASE_VERSION = 3;
export const MEDIA_METADATA_STORE = "metadata";
export const MEDIA_RECEIPT_STORE = "commandReceipts";

/** Run only in an owned IndexedDB version-change transaction. */
export function upgradeMediaDatabase(database: IDBDatabase, transaction: IDBTransaction, previousVersion: number, onFailure?: (error: Error) => void): void {
  if (database.version !== MEDIA_DATABASE_VERSION || ![0, 1, 2].includes(previousVersion)) throw new Error("This media library version is not supported.");
  const oldAssets = database.objectStoreNames.contains(LEGACY_MEDIA_ASSET_STORE);
  const newAssets = database.objectStoreNames.contains(MEDIA_ASSET_STORE);
  if (previousVersion === 0 ? oldAssets || newAssets : !oldAssets || newAssets) throw new Error("The media library's asset stores are invalid.");

  if (oldAssets) {
    // A native version-change rename preserves all original records, keys and
    // indexes without copying image bytes. An aborted upgrade restores the old
    // name and data as one transaction.
    transaction.objectStore(LEGACY_MEDIA_ASSET_STORE).name = MEDIA_ASSET_STORE;
    // Older versions did not own rendition data. Do not treat an unknown
    // legacy field as a verified bundle or discard it during migration.
    const cursor = transaction.objectStore(MEDIA_ASSET_STORE).openCursor();
    cursor.onsuccess = () => {
      const item = cursor.result;
      if (!item) return;
      const asset = item.value as Record<string, unknown> | null;
      const revision = asset?.sourceRevision;
      if (asset && typeof asset === "object" && (asset.imageRenditions !== undefined || revision !== undefined && (typeof revision !== "string" || !revision || revision.length > 180))) {
        const error = new Error("The existing media library contains unrecognised image-size data. The library was kept unchanged; retain a backup before recovery.");
        onFailure?.(error);
        transaction.abort();
        return;
      }
      item.continue();
    };
  } else if (!newAssets) {
    const assets = database.createObjectStore(MEDIA_ASSET_STORE, { keyPath: "id" });
    assets.createIndex("folderId", "folderId");
    assets.createIndex("createdAt", "createdAt");
  }
  if (!database.objectStoreNames.contains(MEDIA_RECEIPT_STORE)) database.createObjectStore(MEDIA_RECEIPT_STORE, { keyPath: "id" });
  if (!database.objectStoreNames.contains(MEDIA_METADATA_STORE)) database.createObjectStore(MEDIA_METADATA_STORE);
  if (!database.objectStoreNames.contains("folders")) {
    const folders = database.createObjectStore("folders", { keyPath: "id" });
    folders.createIndex("parentId", "parentId");
  }
}

/** Read old libraries without upgrading; a new-format library never falls back. */
export function mediaAssetStoreName(database: IDBDatabase): string {
  const oldAssets = database.objectStoreNames.contains(LEGACY_MEDIA_ASSET_STORE);
  const newAssets = database.objectStoreNames.contains(MEDIA_ASSET_STORE);
  if (database.version === MEDIA_DATABASE_VERSION) {
    if (!newAssets || oldAssets) throw new Error("The media library's asset store is invalid.");
    return MEDIA_ASSET_STORE;
  }
  if (![1, 2].includes(database.version) || !oldAssets || newAssets) throw new Error("The media library's asset store is invalid.");
  return LEGACY_MEDIA_ASSET_STORE;
}
