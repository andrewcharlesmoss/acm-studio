export type MediaFolder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
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

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Media library request failed."));
  });
}

async function withStore<T>(
  storeName: typeof ASSET_STORE | typeof FOLDER_STORE,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, mode);
    return await requestResult(operation(transaction.objectStore(storeName)));
  } finally {
    database.close();
  }
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

export async function addMediaFiles(files: File[], folderId: string | null) {
  const database = await openDatabase();
  const transaction = database.transaction(ASSET_STORE, "readwrite");
  const store = transaction.objectStore(ASSET_STORE);
  const created: MediaAsset[] = [];
  const timestamp = new Date().toISOString();

  for (const file of files) {
    const asset: MediaAsset = {
      id: crypto.randomUUID(),
      name: file.name,
      folderId,
      type: file.type || "application/octet-stream",
      size: file.size,
      createdAt: timestamp,
      updatedAt: timestamp,
      altText: "",
      caption: "",
      blob: file,
    };
    store.put(asset);
    created.push(asset);
  }

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the selected files."));
    transaction.onabort = () => reject(transaction.error ?? new Error("File upload was cancelled."));
  });
  database.close();
  return created;
}

export async function createMediaFolder(name: string, parentId: string | null) {
  const folder: MediaFolder = {
    id: crypto.randomUUID(),
    name: name.trim(),
    parentId,
    createdAt: new Date().toISOString(),
  };
  await withStore(FOLDER_STORE, "readwrite", (store) => store.put(folder));
  return folder;
}

export async function updateMediaAsset(id: string, update: Partial<Pick<MediaAsset, "name" | "folderId" | "altText" | "caption">>) {
  const asset = await getMediaAsset(id);
  if (!asset) throw new Error("The selected file could not be found.");
  const next = { ...asset, ...update, updatedAt: new Date().toISOString() };
  await withStore(ASSET_STORE, "readwrite", (store) => store.put(next));
  return next;
}

export async function renameMediaFolder(id: string, name: string) {
  const folder = await withStore(FOLDER_STORE, "readonly", (store) => store.get(id)) as MediaFolder | undefined;
  if (!folder) throw new Error("The selected folder could not be found.");
  const next = { ...folder, name: name.trim() };
  await withStore(FOLDER_STORE, "readwrite", (store) => store.put(next));
  return next;
}

export async function deleteMediaAsset(id: string) {
  await withStore(ASSET_STORE, "readwrite", (store) => store.delete(id));
}

export async function deleteMediaFolder(id: string) {
  const { assets, folders } = await listMediaLibrary();
  if (assets.some((asset) => asset.folderId === id) || folders.some((folder) => folder.parentId === id)) {
    throw new Error("Move or delete everything inside this folder first.");
  }
  await withStore(FOLDER_STORE, "readwrite", (store) => store.delete(id));
}

export async function replaceMediaLibrary(assets: MediaAsset[], folders: MediaFolder[]) {
  const database = await openDatabase();
  const transaction = database.transaction([ASSET_STORE, FOLDER_STORE], "readwrite");
  const assetStore = transaction.objectStore(ASSET_STORE);
  const folderStore = transaction.objectStore(FOLDER_STORE);
  assetStore.clear();
  folderStore.clear();
  folders.forEach((folder) => folderStore.put(folder));
  assets.forEach((asset) => assetStore.put(asset));
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not restore the media library."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Media restore was cancelled."));
  });
  database.close();
}
