import { openMediaDatabase } from "./media-database-open";
import { mediaAssetStoreName } from "./media-database-migration";
import { applyImageRenditionRequest } from "./image-rendition-transaction";
import { validateImageRenditions } from "./image-rendition-validation";
import type { ImageRenditions } from "../content/image-resolution";
import { MediaCommandError, validateMediaRequest, MEDIA_REQUEST_LIFETIME_MS, type MediaRequest } from "./media-command";
import { studioWriteOwnership, type StudioWriteOwnership, type RestorePermit } from "./write-ownership";
import { assertTemplateMediaCanBeDeleted } from "./template-store";
import { LOCAL_WORKSPACE_KEY } from "../content/local-storage-keys";
import { contentMediaIds } from "../content/media-references";
import { migrateStudioWorkspace, validateStudioWorkspace } from "./workspace-validation";
import { validateWorkspacePublicationTemplates } from "./template-model";
import type { StudioWorkspace } from "./editor-model";

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
  sourceRevision?: string;
};

export type MediaAssetMetadata = Omit<MediaAsset, "blob">;
type StoredMediaAsset = MediaAsset & { imageRenditions?: ImageRenditions };

const DATABASE_NAME = "acm-studio-media";
const DATABASE_VERSION = 2;
const RECEIPT_STORE = "commandReceipts";
const META_STORE = "metadata";
export const MEDIA_STORE_CHANGED = "studio-media-store-changed";
let mediaWrites: Promise<unknown> = Promise.resolve();

export type IsolatedV3MediaStoreOptions = {
  databaseName: string;
  factory: () => IDBFactory;
  ownership: StudioWriteOwnership;
  onChange?: () => void;
  onBlocked?: () => void;
};

/** Explicit construction only; the live application continues to use the legacy adapter. */
export function createIsolatedV3MediaStore(options: IsolatedV3MediaStoreOptions) {
  const captured = Object.freeze({ databaseName: options?.databaseName, factory: options?.factory, ownership: options?.ownership, onChange: options?.onChange, onBlocked: options?.onBlocked });
  if (typeof captured.databaseName !== "string" || !captured.databaseName.trim() || captured.databaseName === DATABASE_NAME || captured.databaseName.length > 180 || typeof captured.factory !== "function" || !captured.ownership) throw new Error("Use a separate database for the isolated image-size adapter.");
  return createMediaStoreRuntime(captured);
}

function createMediaStoreRuntime(options?: IsolatedV3MediaStoreOptions) {
  const ownership = options?.ownership ?? studioWriteOwnership;
  let activeAuthority: { authorised: () => boolean } | undefined;
  let v3Ready = false;
  const assetStoreFor = (database: IDBDatabase) => options ? mediaAssetStoreName(database) : "assets";
  function writeMedia<T>(operation: () => Promise<T>, permit?: RestorePermit) {
    let authority: { authorised: () => boolean } | undefined;
    if (options) {
      try {
        const token = permit ? ownership.captureRestoreToken(permit) : ownership.captureWriteToken();
        authority = { authorised: () => permit ? ownership.canRestore(permit, token) : ownership.canWrite(token) };
      } catch (error) { return Promise.reject(error); }
    }
    return ownership.write(() => {
      const write = mediaWrites.then(async () => {
        if (authority && !authority.authorised()) throw new Error("Media saving is no longer owned by this tab.");
        activeAuthority = authority;
        try { return await operation(); } finally { activeAuthority = undefined; }
      });
      mediaWrites = write.catch(() => undefined);
      return write.then(result => { (options?.onChange ?? (() => window.dispatchEvent(new Event(MEDIA_STORE_CHANGED))))(); return result; });
    }, permit);
  }
  const ASSET_STORE = "assets";
  const FOLDER_STORE = "folders";

  function openDatabase(allowUpgrade = false): Promise<IDBDatabase> {
    if (options) {
      if (!allowUpgrade) return openMediaDatabase(options.factory(), options.databaseName, { mode: "read" });
      const authority = activeAuthority;
      if (!authority) return Promise.reject(new Error("Media saving requires an owned operation."));
      return openMediaDatabase(options.factory(), options.databaseName, { mode: "owned", authorised: authority.authorised, subscribeOwnership: ownership.subscribe, onBlocked: options.onBlocked });
    }
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME, allowUpgrade ? DATABASE_VERSION : undefined);
      request.onupgradeneeded = () => {
        if (!allowUpgrade) { request.transaction?.abort(); return; }
        const database = request.result;
        if (!database.objectStoreNames.contains(RECEIPT_STORE)) database.createObjectStore(RECEIPT_STORE, { keyPath: "id" });
        if (!database.objectStoreNames.contains(META_STORE)) database.createObjectStore(META_STORE);
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
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
      request.onerror = () => reject(request.error ?? new Error("Could not open the media library."));
    });
  }

  function runTransaction<T>(database: IDBDatabase, stores: string | string[], mode: IDBTransactionMode, operation: (transaction: IDBTransaction) => T) {
    const authority = mode === "readwrite" ? activeAuthority : undefined;
    if (authority && !authority.authorised()) return Promise.reject(new Error("Media saving is no longer owned by this tab."));
    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(stores, mode);
      let result: T;
      let failure: unknown;
      let unsubscribe = () => { };
      const finish = (error?: unknown) => {
        unsubscribe();
        if (error) reject(error); else resolve(result);
      };
      transaction.oncomplete = () => finish(authority && !authority.authorised() ? new Error("The media save could not be confirmed. Reload before editing.") : undefined);
      transaction.onerror = () => {
        failure ??= transaction.error ?? new Error("Media library transaction failed.");
        if (!options) { finish(failure); return; }
        try { transaction.abort(); } catch { /* Await the native result before releasing ownership. */ }
      };
      transaction.onabort = event => { if (!options || event?.target === transaction) finish(failure ?? transaction.error ?? new Error("Media library transaction was cancelled.")); };
      if (authority) unsubscribe = ownership.subscribe(() => {
        if (!authority.authorised()) {
          failure = new Error("Media saving is no longer owned by this tab.");
          try { transaction.abort(); } catch { /* Await completion or abortion. */ }
        }
      });
      try { result = operation(transaction); }
      catch (error) {
        failure = error;
        try { transaction.abort(); } catch { /* The native completion still drains this write. */ }
        if (!options) finish(error);
      }
    });
  }

  async function withStore<T>(
    storeName: typeof ASSET_STORE | typeof FOLDER_STORE,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ) {
    const database = await openDatabase(mode === "readwrite");
    const actualStore = storeName === ASSET_STORE ? assetStoreFor(database) : storeName;
    try {
      let result: T;
      await runTransaction(database, actualStore, mode, (transaction) => {
        const request = operation(transaction.objectStore(actualStore));
        request.onsuccess = () => { result = request.result; };
        // Request errors abort the transaction. Do not prevent their default
        // handling or resolve a write before the transaction has committed.
      });
      return result!;
    } finally { database.close(); }
  }

  async function listMediaLibrary() {
    const database = await openDatabase();
    const library: { assets: StoredMediaAsset[]; folders: MediaFolder[] } = { assets: [], folders: [] };
    try {
      await runTransaction(database, [assetStoreFor(database), FOLDER_STORE], "readonly", transaction => {
        const assets = transaction.objectStore(assetStoreFor(database)).getAll();
        const folders = transaction.objectStore(FOLDER_STORE).getAll();
        assets.onsuccess = () => { library.assets = assets.result; };
        folders.onsuccess = () => { library.folders = folders.result; };
      });
      return library;
    } finally { database.close(); }
  }

  async function getMediaAsset(id: string) {
    return withStore(ASSET_STORE, "readonly", (store) => store.get(id)) as Promise<StoredMediaAsset | undefined>;
  }

  async function requireMediaFolder(folderId: string | null) {
    if (folderId === null) return;
    const folder = await withStore(FOLDER_STORE, "readonly", (store) => store.get(folderId));
    if (!folder) throw new Error("That folder is no longer available. Choose an existing folder first.");
  }

  async function addMediaFiles(files: File[], folderId: string | null) {
    return writeMedia(async () => {
      await requireMediaFolder(folderId);
      const database = await openDatabase(true);
      try {
        return await runTransaction(database, assetStoreFor(database), "readwrite", (transaction) => {
          const store = transaction.objectStore(assetStoreFor(database));
          const timestamp = new Date().toISOString();
          return files.map((file): MediaAsset => {
            const asset = {
              id: crypto.randomUUID(), name: file.name, folderId,
              type: file.type || "application/octet-stream", size: file.size,
              createdAt: timestamp, updatedAt: timestamp, altText: "", caption: "", blob: file
            };
            store.put(asset);
            return asset;
          });
        });
      } finally { database.close(); }
    });
  }

  async function createMediaFolder(name: string, parentId: string | null) {
    return writeMedia(async () => {
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

  async function updateMediaAsset(id: string, update: Partial<Pick<MediaAsset, "name" | "folderId" | "altText" | "caption">>) {
    return writeMedia(async () => {
      if (update.folderId !== undefined) await requireMediaFolder(update.folderId);
      const asset = await getMediaAsset(id);
      if (!asset) throw new Error("The selected file could not be found.");
      const next = { ...asset, ...update, updatedAt: new Date().toISOString() };
      await withStore(ASSET_STORE, "readwrite", (store) => store.put(next));
      return next;
    });
  }

  async function replaceMediaAssetContent(id: string, file: Blob, type = file.type) {
    return writeMedia(async () => {
      const asset = await getMediaAsset(id);
      if (!asset) throw new Error("The selected file could not be found.");
      const next = { ...asset, type: type || asset.type, size: file.size, blob: file, sourceRevision: crypto.randomUUID(), updatedAt: new Date().toISOString() };
      await withStore(ASSET_STORE, "readwrite", (store) => store.put(next));
      return next;
    });
  }

  async function renameMediaFolder(id: string, name: string) {
    return writeMedia(async () => {
      const folder = await withStore(FOLDER_STORE, "readonly", (store) => store.get(id)) as MediaFolder | undefined;
      if (!folder) throw new Error("The selected folder could not be found.");
      const next = { ...folder, name: name.trim() };
      await withStore(FOLDER_STORE, "readwrite", (store) => store.put(next));
      return next;
    });
  }

  async function colourMediaFolder(id: string, colour: string | null) {
    return writeMedia(async () => {
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


  async function moveMediaFolder(id: string, parentId: string | null) {
    return writeMedia(async () => {
      const database = await openDatabase(true);
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

  function assertMediaAssetCanBeDeleted(id: string) {
    assertTemplateMediaCanBeDeleted(id);
    const rawWorkspace = window.localStorage.getItem(LOCAL_WORKSPACE_KEY);
    if (rawWorkspace !== null) {
      let workspace: StudioWorkspace;
      try { workspace = validateWorkspacePublicationTemplates(validateStudioWorkspace(migrateStudioWorkspace(JSON.parse(rawWorkspace)))); }
      catch { throw new Error("The saved workspace could not be checked. Restore a valid backup before deleting files."); }
      const documents = [...workspace.documents, ...workspace.bin.map(item => item.document), ...(workspace.documentRevisions ?? []).map(item => item.document)];
      if (documents.some(document => document.coverImage?.mediaId === id || contentMediaIds(document.blocks).includes(id))) {
        throw new Error("This file is used by a page, post, saved revision or item in the Bin. Replace those references or permanently delete the binned item first.");
      }
      if (workspace.bin.some(item => item.publication?.mediaIds.includes(id))) {
        throw new Error("This file is used by a published copy in the Bin. Permanently delete the binned post first.");
      }
    }
  }

  async function deleteMediaAsset(id: string) {
    return writeMedia(async () => {
      assertMediaAssetCanBeDeleted(id);
      await withStore(ASSET_STORE, "readwrite", (store) => store.delete(id));
    });
  }

  async function deleteMediaFolder(id: string) {
    return writeMedia(async () => {
      const { assets, folders } = await listMediaLibrary();
      if (assets.some((asset) => asset.folderId === id) || folders.some((folder) => folder.parentId === id)) {
        throw new Error("Move or delete everything inside this folder first.");
      }
      await withStore(FOLDER_STORE, "readwrite", (store) => store.delete(id));
    });
  }

  async function replaceMediaLibrary(assets: MediaAsset[], folders: MediaFolder[], permit?: RestorePermit) {
    const capturedAssets = options ? structuredClone(assets) : assets;
    const capturedFolders = options ? structuredClone(folders) : folders;
    return writeMedia(async () => {
      if (options) for (const asset of capturedAssets) {
        if (!asset || !(asset.blob instanceof Blob) || asset.sourceRevision !== undefined && (typeof asset.sourceRevision !== "string" || !asset.sourceRevision || asset.sourceRevision.length > 180)) throw new Error("Invalid media restore record.");
        const sizes = (asset as MediaAsset & { imageRenditions?: ImageRenditions }).imageRenditions;
        if (sizes !== undefined) await validateImageRenditions(sizes);
      }
      if (activeAuthority && !activeAuthority.authorised()) throw new Error("The restore is no longer authorised.");
      const database = await openDatabase(true);
      try {
        await runTransaction(database, [assetStoreFor(database), FOLDER_STORE, RECEIPT_STORE, META_STORE], "readwrite", (transaction) => {
          const assetStore = transaction.objectStore(assetStoreFor(database));
          const folderStore = transaction.objectStore(FOLDER_STORE);
          transaction.objectStore(RECEIPT_STORE).clear();
          transaction.objectStore(META_STORE).put(crypto.randomUUID(), "generation");
          assetStore.clear();
          folderStore.clear();
          capturedFolders.forEach((folder) => folderStore.put(folder));
          capturedAssets.forEach((asset) => assetStore.put(asset));
        });
      } finally { database.close(); }
    }, permit);
  }

  /** The operational generation is separate from exported media content. */
  async function ensureMediaGeneration(): Promise<string> {
    return writeMedia(async () => {
      const database = await openDatabase(true);
      let generation = "";
      try {
        await runTransaction(database, META_STORE, "readwrite", transaction => {
          const store = transaction.objectStore(META_STORE);
          const request = store.get("generation");
          request.onsuccess = () => {
            generation = typeof request.result === "string" ? request.result : crypto.randomUUID();
            store.put(generation, "generation");
          };
        });
        if (options) v3Ready = true;
        return generation;
      } finally { database.close(); }
    });
  }

  /** One owned IDB transaction commits the mutation and its replay receipt. */
  async function applyMediaRequest(request: MediaRequest): Promise<void> {
    if (!validateMediaRequest(request)) throw new MediaCommandError("The Files action is invalid.");
    if (options) request = structuredClone(request);
    // Generation is enabled only after the versioned media store and backup
    // paths are ready. Never acknowledge an unsupported command as a no-op.
    if (request.command.kind === "generate-image-renditions") {
      if (!options || !v3Ready) throw new MediaCommandError("Image sizes are not available in this Files owner yet.", "unavailable");
      await applyImageRenditionRequest(request, { ownership, runOwnedMediaWrite: operation => writeMedia(operation), openOwnedDatabase: (token, signal) => openMediaDatabase(options.factory(), options.databaseName, { mode: "owned", authorised: () => ownership.canWrite(token), subscribeOwnership: ownership.subscribe, signal, onBlocked: options.onBlocked }) });
      return;
    }
    return writeMedia(async () => {
      const age = Date.now() - Date.parse(request.submittedAt);
      if (age > MEDIA_REQUEST_LIFETIME_MS || age < -30_000) throw new MediaCommandError("This Files action expired. Check the current library before trying again.");
      const database = await openDatabase(true);
      let failure: unknown;
      try {
        await runTransaction(database, [assetStoreFor(database), FOLDER_STORE, META_STORE, RECEIPT_STORE], "readwrite", transaction => {
          const assetStore = transaction.objectStore(assetStoreFor(database));
          const folderStore = transaction.objectStore(FOLDER_STORE);
          const receiptStore = transaction.objectStore(RECEIPT_STORE);
          const reads = [assetStore.getAll(), folderStore.getAll(), transaction.objectStore(META_STORE).get("generation"), receiptStore.getAll()];
          let remaining = reads.length;
          const complete = () => {
            if (--remaining) return;
            try {
              const [assets, folders, generation, receipts] = reads.map(read => read.result) as [MediaAsset[], MediaFolder[], string, Array<{ id: string; completedAt: number }>];
              if (generation !== request.generation) throw new MediaCommandError("The library was restored or replaced. Your action was kept for review.", "replaced");
              if (receipts.some(receipt => receipt.id === request.id)) return;
              const retained = receipts.filter(receipt => receipt.completedAt > Date.now() - 24 * 60 * 60_000);
              if (retained.length >= 10_000) throw new MediaCommandError("Files has reached its daily action limit. Try again later.");
              const command = request.command;
              if (command.kind === "generate-image-renditions") throw new MediaCommandError("Image sizes are not available in this Files owner yet.", "unavailable");
              const requireFolder = (id: string | null) => {
                if (id !== null && !folders.some(folder => folder.id === id)) throw new MediaCommandError("The destination folder is no longer available.", "conflict");
              };
              const expect = (current: unknown, before: unknown, after?: unknown) => {
                if (JSON.stringify(current) !== JSON.stringify(before) && (after === undefined || JSON.stringify(current) !== JSON.stringify(after))) throw new MediaCommandError("Another tab changed this item. Your action is preserved; review the latest values before applying it.", "conflict");
              };
              if (command.kind === "create-folder") {
                requireFolder(command.folder.parentId);
                if (folders.some(folder => folder.id === command.folder.id)) throw new MediaCommandError("This folder ID already exists.", "conflict");
                folderStore.put(command.folder);
              } else if (command.kind === "upload") {
                requireFolder(command.folderId);
                if (command.files.some(file => assets.some(asset => asset.id === file.id))) throw new MediaCommandError("A file ID already exists.", "conflict");
                command.files.forEach(file => assetStore.put({ id: file.id, name: file.name, folderId: command.folderId, type: file.type, size: file.blob.size, createdAt: command.createdAt, updatedAt: command.createdAt, altText: "", caption: "", blob: file.blob } satisfies MediaAsset));
              } else if (command.kind === "update-asset" || command.kind === "delete-asset") {
                const asset = assets.find(item => item.id === command.id);
                if (!asset) throw new MediaCommandError("The selected file was removed in another tab.", "conflict");
                if (command.kind === "update-asset") {
                  for (const property of Object.keys(command.update) as Array<keyof typeof command.update>) expect(asset[property], command.before[property], command.update[property]);
                  if (command.update.folderId !== undefined) requireFolder(command.update.folderId);
                  assetStore.put({ ...asset, ...command.update, updatedAt: new Date().toISOString() });
                } else {
                  for (const property of Object.keys(command.before) as Array<keyof typeof command.before>) expect(asset[property], command.before[property]);
                  assertMediaAssetCanBeDeleted(asset.id);
                  assetStore.delete(asset.id);
                }
              } else {
                const folder = folders.find(item => item.id === command.id);
                if (!folder) throw new MediaCommandError("The selected folder was removed in another tab.", "conflict");
                if (command.kind === "rename-folder") { expect(folder.name, command.before, command.name); folderStore.put({ ...folder, name: command.name.trim() }); }
                if (command.kind === "colour-folder") {
                  expect(folder.colour ?? null, command.before, command.colour);
                  const next = { ...folder };
                  if (command.colour === null) delete next.colour; else next.colour = command.colour;
                  folderStore.put(next);
                }
                if (command.kind === "move-folder") { expect(folder.parentId, command.before, command.parentId); folderStore.put(prepareMediaFolderMove(folders, folder.id, command.parentId)); }
                if (command.kind === "delete-folder") {
                  expect(folder.name, command.before.name); expect(folder.parentId, command.before.parentId); expect(folder.colour ?? null, command.before.colour);
                  if (assets.some(asset => asset.folderId === folder.id) || folders.some(item => item.parentId === folder.id)) throw new MediaCommandError("Move or delete everything inside this folder first.", "conflict");
                  folderStore.delete(folder.id);
                }
              }
              for (const receipt of receipts) if (receipt.completedAt <= Date.now() - 24 * 60 * 60_000) receiptStore.delete(receipt.id);
              receiptStore.put({ id: request.id, completedAt: Date.now() });
            } catch (error) { failure = error; transaction.abort(); }
          };
          reads.forEach(read => { read.onsuccess = complete; });
        });
      } catch (error) { throw failure ?? error; }
      finally { database.close(); }
    });
  }

  return { listMediaLibrary, getMediaAsset, addMediaFiles, createMediaFolder, updateMediaAsset, replaceMediaAssetContent, renameMediaFolder, colourMediaFolder, moveMediaFolder, deleteMediaAsset, deleteMediaFolder, replaceMediaLibrary, ensureMediaGeneration, applyMediaRequest, supportsImageRenditions: () => Boolean(options && v3Ready && ownership.canWrite()) };
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


const legacyMediaStore = createMediaStoreRuntime();
export const listMediaLibrary: () => Promise<{ assets: MediaAsset[]; folders: MediaFolder[] }> = legacyMediaStore.listMediaLibrary;
export const getMediaAsset: (id: string) => Promise<MediaAsset | undefined> = legacyMediaStore.getMediaAsset;
export const { addMediaFiles, createMediaFolder, updateMediaAsset, replaceMediaAssetContent, renameMediaFolder, colourMediaFolder, moveMediaFolder, deleteMediaAsset, deleteMediaFolder, replaceMediaLibrary, ensureMediaGeneration, applyMediaRequest } = legacyMediaStore;
