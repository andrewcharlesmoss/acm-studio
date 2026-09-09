import { studioWriteOwnership } from "./write-ownership";
import { LOCAL_PUBLICATIONS_KEY, LOCAL_WORKSPACE_KEY } from "../content/local-publishing";
import type { StudioWorkspace } from "./editor-model";
import { listMediaLibrary, replaceMediaLibrary, type MediaAsset, type MediaFolder } from "./media-store";
import { isRecord, validatePublicationSnapshot, validateStudioWorkspace } from "./workspace-validation";

const MAX_BACKUP_BYTES = 100 * 1024 * 1024;

export type StudioBackupAsset = Omit<MediaAsset, "blob"> & {
  dataBase64: string;
};

export type StudioBackup = {
  format: "acm-studio-backup";
  version: 1;
  exportedAt: string;
  workspace: StudioWorkspace;
  publications: string | null;
  media: {
    folders: MediaFolder[];
    assets: StudioBackupAsset[];
  };
};

export type StudioBackupSummary = {
  exportedAt: string;
  pages: number;
  posts: number;
  publishedPosts: number;
  folders: number;
  files: number;
  fileBytes: number;
};

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("A media file could not be read."));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(dataBase64: string, type: string) {
  const binary = window.atob(dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

export function validateStudioBackup(value: unknown): StudioBackup {
  if (!isRecord(value) || value.format !== "acm-studio-backup" || value.version !== 1) {
    throw new Error("This is not a supported ACM Studio backup.");
  }
  if (typeof value.exportedAt !== "string" || !Number.isFinite(Date.parse(value.exportedAt))) {
    throw new Error("The backup does not contain a valid Studio workspace.");
  }
  validateStudioWorkspace(value.workspace);
  if (!isRecord(value.media) || !Array.isArray(value.media.folders) || !Array.isArray(value.media.assets)) {
    throw new Error("The backup does not contain a valid media library.");
  }
  const folders = new Map<string, string | null>();
  for (const folder of value.media.folders) {
    if (!isRecord(folder) || typeof folder.id !== "string" || !folder.id || folders.has(folder.id)
      || typeof folder.name !== "string" || typeof folder.createdAt !== "string" || !Number.isFinite(Date.parse(folder.createdAt))
      || (folder.parentId !== null && typeof folder.parentId !== "string")) throw new Error("One or more backed-up folders are invalid.");
    folders.set(folder.id, folder.parentId as string | null);
  }
  const checked = new Set<string>();
  for (const id of folders.keys()) {
    const ancestors = new Set<string>();
    let current: string | null = id;
    while (current !== null && !checked.has(current)) {
      if (ancestors.has(current) || !folders.has(current)) throw new Error("The backed-up folder hierarchy is invalid.");
      ancestors.add(current);
      current = folders.get(current)!;
    }
    ancestors.forEach((ancestor) => checked.add(ancestor));
  }
  const assetIds = new Set<string>();
  let totalBytes = 0;
  for (const asset of value.media.assets) {
    if (!isRecord(asset) || typeof asset.id !== "string" || !asset.id || assetIds.has(asset.id)
      || !["name", "type", "altText", "caption"].every((field) => typeof asset[field] === "string")
      || ![asset.createdAt, asset.updatedAt].every((date) => typeof date === "string" && Number.isFinite(Date.parse(date)))
      || (asset.folderId !== null && (typeof asset.folderId !== "string" || !folders.has(asset.folderId)))
      || typeof asset.size !== "number" || !Number.isSafeInteger(asset.size) || asset.size < 0
      || typeof asset.dataBase64 !== "string" || asset.dataBase64.length > MAX_BACKUP_BYTES
      || asset.dataBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(asset.dataBase64)
      || asset.dataBase64.length / 4 * 3 - (asset.dataBase64.endsWith("==") ? 2 : asset.dataBase64.endsWith("=") ? 1 : 0) !== asset.size) {
      throw new Error("One or more backed-up files are invalid.");
    }
    assetIds.add(asset.id);
    totalBytes += asset.size;
    if (totalBytes > MAX_BACKUP_BYTES) throw new Error("This backup is too large to restore in the browser.");
  }
  if (value.publications !== null && typeof value.publications !== "string") {
    throw new Error("The published-post snapshot is invalid.");
  }
  if (typeof value.publications === "string") {
    try {
      validatePublicationSnapshot(JSON.parse(value.publications));
    } catch {
      throw new Error("The published-post snapshot is invalid.");
    }
  }
  return value as StudioBackup;
}

export function summariseStudioBackup(backup: StudioBackup): StudioBackupSummary {
  let publishedPosts = 0;
  if (backup.publications) {
    try {
      const publicationStore = JSON.parse(backup.publications) as { posts?: unknown[] };
      publishedPosts = Array.isArray(publicationStore.posts) ? publicationStore.posts.length : 0;
    } catch {
      publishedPosts = 0;
    }
  }
  return {
    exportedAt: backup.exportedAt,
    pages: backup.workspace.documents.filter((document) => document.kind === "page").length,
    posts: backup.workspace.documents.filter((document) => document.kind === "post").length,
    publishedPosts,
    folders: backup.media.folders.length,
    files: backup.media.assets.length,
    fileBytes: backup.media.assets.reduce((total, asset) => total + asset.size, 0),
  };
}

export async function createStudioBackup(workspace: StudioWorkspace) {
  validateStudioWorkspace(workspace);
  const publications = window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY);
  if (publications !== null) validatePublicationSnapshot(JSON.parse(publications));
  const library = await listMediaLibrary();
  const assets = library.assets.map(({ blob, ...asset }) => {
    if (!Number.isSafeInteger(asset.size) || asset.size < 0 || blob.size !== asset.size) {
      throw new Error("A media file has invalid size metadata.");
    }
    return { ...asset, dataBase64: "" };
  });
  const backup: StudioBackup = {
    format: "acm-studio-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace,
    publications,
    media: { folders: library.folders, assets },
  };
  // Account for base64 expansion before reading media into memory. The empty
  // strings already include each JSON field's quotes and surrounding metadata.
  let encodedBytes = new Blob([JSON.stringify(backup)]).size;
  for (const asset of library.assets) {
    encodedBytes += 4 * Math.ceil(asset.size / 3);
  }
  if (encodedBytes > MAX_BACKUP_BYTES) throw new Error("This backup exceeds the 100 MB browser backup limit.");
  for (let index = 0; index < assets.length; index++) {
    assets[index].dataBase64 = await blobToBase64(library.assets[index].blob);
  }
  return validateStudioBackup(backup);
}

export function downloadStudioBackup(backup: StudioBackup) {
  validateStudioBackup(backup);
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  if (blob.size > MAX_BACKUP_BYTES) throw new Error("This backup exceeds the 100 MB browser backup limit.");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `acm-studio-backup-${backup.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readStudioBackup(file: File) {
  if (file.size > MAX_BACKUP_BYTES) throw new Error("Choose a backup smaller than 100 MB.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  return validateStudioBackup(parsed);
}

export async function restoreStudioBackup(backup: StudioBackup) {
  validateStudioBackup(backup);
  return studioWriteOwnership.restore(async (permit) => {
    const assets = backup.media.assets.map(({ dataBase64, ...asset }) => ({ ...asset, blob: base64ToBlob(dataBase64, asset.type) }));
    const previousLibrary = await listMediaLibrary();
    const previousWorkspace = window.localStorage.getItem(LOCAL_WORKSPACE_KEY);
    const previousPublications = window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY);
    try {
      await replaceMediaLibrary(assets, backup.media.folders, permit);
      window.localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(backup.workspace));
      if (backup.publications) window.localStorage.setItem(LOCAL_PUBLICATIONS_KEY, backup.publications);
      else window.localStorage.removeItem(LOCAL_PUBLICATIONS_KEY);
    } catch (error) {
      const rollbackFailures: unknown[] = [];
      try { await replaceMediaLibrary(previousLibrary.assets, previousLibrary.folders, permit); }
      catch (rollbackError) { rollbackFailures.push(rollbackError); }
      for (const [key, previous] of [[LOCAL_WORKSPACE_KEY, previousWorkspace], [LOCAL_PUBLICATIONS_KEY, previousPublications]] as const) {
        try {
          if (previous !== null) window.localStorage.setItem(key, previous);
          else window.localStorage.removeItem(key);
        } catch (rollbackError) { rollbackFailures.push(rollbackError); }
      }
      if (rollbackFailures.length) {
        throw new AggregateError([error, ...rollbackFailures], "Restore failed and the original data could not be fully recovered. Keep this page open and retain your backup.");
      }
      throw error;
    }
  });
}
