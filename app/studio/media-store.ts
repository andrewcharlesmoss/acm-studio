import { studioWriteOwnership, type RestorePermit } from "./write-ownership";
import { assertTemplateMediaCanBeDeleted } from "./template-store";

export type MediaFolder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  colour?: string;
};

export type MediaAsset = {
  id: string;
  name: string;
  folderId: string | null;
  type: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  altText: string;
  caption: string;
  blob: Blob;
};

export type MediaAssetMetadata = Omit<MediaAsset, "blob">;

const DATABASE_NAME = "acm-studio-media";
const DATABASE_VERSION = 1;
const ASSET_STORE = "assets";
const FOLDER_STORE = "folders";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ASSET_STORE)) {
        const assets = database.createObjectStore(ASSET_STORE, { keyPath: "id" });
        assets.createIndex("folderId", "folderId");
        assets.createIndex("createdAt", "createdAt");
      }
      if (!database.objectStoreNames.contains(FOLDER_STORE)) {
        const folders = database.createObjectStore(FOLDER_STORE, { keyPath: "id" });
        folders.createIndex("parentId", "parentId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the media library."));
  });
}

function runTransaction<T>(database: IDBDatabase, stores: string | string[], mode: IDBTransactionMode, operation: (transaction: IDBTransaction) => T) {
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(stores, mode);
    let result: T;
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error ?? new Error("Media library transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Media library transaction was cancelled."));
    try { result = operation(transaction); }
    catch (error) {
      try { transaction.abort(); } catch { /* The transaction may already have ended. */ }
      reject(error);
    }
  });
}

async function withStore<T>(
  storeName: typeof ASSET_STORE | typeof FOLDER_STORE,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase();
  try {
    let result: T;
    await runTransaction(database, storeName, mode, (transaction) => {
      const request = operation(transaction.objectStore(storeName));
      request.onsuccess = () => { result = request.result; };
      // Request errors abort the transaction. Do not prevent their default
      // handling or resolve a write before the transaction has committed.
    });
    return result!;
  } finally { database.close(); }
}

export async function listMediaLibrary() {
  const [assets, folders] = await Promise.all([
    withStore(ASSET_STORE, "readonly", (store) => store.getAll()) as Promise<MediaAsset[]>,
    withStore(FOLDER_STORE, "readonly", (store) => store.getAll()) as Promise<MediaFolder[]>,
  ]);
  return { assets, folders };
}

export async function getMediaAsset(id: string) {
  return withStore(ASSET_STORE, "readonly", (store) => store.get(id)) as Promise<MediaAsset | undefined>;
}

async function requireMediaFolder(folderId: string | null) {
  if (folderId === null) return;
  const folder = await withStore(FOLDER_STORE, "readonly", (store) => store.get(folderId));
  if (!folder) throw new Error("That folder is no longer available. Choose an existing folder first.");
}

export async function addMediaFiles(files: File[], folderId: string | null) {
  return studioWriteOwnership.write(async () => {
    await requireMediaFolder(folderId);
    const database = await openDatabase();
    try {
      return await runTransaction(database, ASSET_STORE, "readwrite", (transaction) => {
        const store = transaction.objectStore(ASSET_STORE);
        const timestamp = new Date().toISOString();
        return files.map((file): MediaAsset => {
          const asset = { id: crypto.randomUUID(), name: file.name, folderId,
            type: file.type || "application/octet-stream", size: file.size,
            createdAt: timestamp, updatedAt: timestamp, altText: "", caption: "", blob: file };
          store.put(asset);
          return asset;
        });
      });
    } finally { database.close(); }
  });
}

export async function createMediaFolder(name: string, parentId: string | null) {
  return studioWriteOwnership.write(async () => {
    await requireMediaFolder(parentId);
    const folder: MediaFolder = {
      id: crypto.randomUUID(),
      name: name.trim(),
      parentId,
      createdAt: new Date().toISOString(),
    };
    await withStore(FOLDER_STORE, "readwrite", (store) => store.put(folder));
    return folder;
  });
}

export async function updateMediaAsset(id: string, update: Partial<Pick<MediaAsset, "name" | "folderId" | "altText" | "caption">>) {
  return studioWriteOwnership.write(async () => {
    if (update.folderId !== undefined) await requireMediaFolder(update.folderId);
    const asset = await getMediaAsset(id);
    if (!asset) throw new Error("The selected file could not be found.");
    const next = { ...asset, ...update, updatedAt: new Date().toISOString() };
    await withStore(ASSET_STORE, "readwrite", (store) => store.put(next));
    return next;
  });
}

export async function replaceMediaAssetContent(id: string, file: Blob, type = file.type) {
  return studioWriteOwnership.write(async () => {
    const asset = await getMediaAsset(id);
    if (!asset) throw new Error("The selected file could not be found.");
    const next = { ...asset, type: type || asset.type, size: file.size, blob: file, updatedAt: new Date().toISOString() };
    await withStore(ASSET_STORE, "readwrite", (store) => store.put(next));
    return next;
  });
}

export async function renameMediaFolder(id: string, name: string) {
  return studioWriteOwnership.write(async () => {
    const folder = await withStore(FOLDER_STORE, "readonly", (store) => store.get(id)) as MediaFolder | undefined;
    if (!folder) throw new Error("The selected folder could not be found.");
    const next = { ...folder, name: name.trim() };
    await withStore(FOLDER_STORE, "readwrite", (store) => store.put(next));
    return next;
  });
}

export async function colourMediaFolder(id: string, colour: string | null) {
  return studioWriteOwnership.write(async () => {
    if (colour !== null && !/^#[0-9a-f]{6}$/i.test(colour)) throw new Error("Choose a valid folder colour.");
    const folder = await withStore(FOLDER_STORE, "readonly", (store) => store.get(id)) as MediaFolder | undefined;
    if (!folder) throw new Error("The selected folder could not be found.");
    const next = { ...folder };
    if (colour === null) delete next.colour;
    else next.colour = colour;
    await withStore(FOLDER_STORE, "readwrite", (store) => store.put(next));
    return next;
  });
}

export function prepareMediaFolderMove(folders: MediaFolder[], id: string, parentId: string | null): MediaFolder {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const folder = byId.get(id);
  if (!folder) throw new Error("The selected folder could not be found.");
  const visited = new Set<string>();
  let ancestor = parentId;
  while (ancestor !== null) {
    if (ancestor === id) throw new Error("A folder cannot be moved into itself or one of its descendants.");
    if (visited.has(ancestor)) throw new Error("The destination folder hierarchy is invalid.");
    visited.add(ancestor);
    const parent = byId.get(ancestor);
    if (!parent) throw new Error("The destination folder could not be found.");
    ancestor = parent.parentId;
  }
  return { ...folder, parentId };
}

export async function moveMediaFolder(id: string, parentId: string | null) {
  return studioWriteOwnership.write(async () => {
    const database = await openDatabase();
    let next: MediaFolder | undefined;
    let validationError: unknown;
    try {
      // Reading the hierarchy and writing the move share one transaction, so
      // concurrent moves cannot both pass an outdated cycle check.
      await runTransaction(database, FOLDER_STORE, "readwrite", (transaction) => {
        const store = transaction.objectStore(FOLDER_STORE);
        const request = store.getAll();
        request.onsuccess = () => {
          try {
            next = prepareMediaFolderMove(request.result as MediaFolder[], id, parentId);
            store.put(next);
          } catch (error) { validationError = error; transaction.abort(); }
        };
      });
      return next!;
    } catch (error) { throw validationError ?? error; }
    finally { database.close(); }
  });
}

export async function deleteMediaAsset(id: string) {
  return studioWriteOwnership.write(async () => {
    assertTemplateMediaCanBeDeleted(id);
    await withStore(ASSET_STORE, "readwrite", (store) => store.delete(id));
  });
}

export async function deleteMediaFolder(id: string) {
  return studioWriteOwnership.write(async () => {
    const { assets, folders } = await listMediaLibrary();
    if (assets.some((asset) => asset.folderId === id) || folders.some((folder) => folder.parentId === id)) {
      throw new Error("Move or delete everything inside this folder first.");
    }
    await withStore(FOLDER_STORE, "readwrite", (store) => store.delete(id));
  });
}

export async function replaceMediaLibrary(assets: MediaAsset[], folders: MediaFolder[], permit?: RestorePermit) {
  return studioWriteOwnership.write(async () => {
    const database = await openDatabase();
    try {
      await runTransaction(database, [ASSET_STORE, FOLDER_STORE], "readwrite", (transaction) => {
        const assetStore = transaction.objectStore(ASSET_STORE);
        const folderStore = transaction.objectStore(FOLDER_STORE);
        assetStore.clear();
        folderStore.clear();
        folders.forEach((folder) => folderStore.put(folder));
        assets.forEach((asset) => assetStore.put(asset));
      });
    } finally { database.close(); }
  }, permit);
}
