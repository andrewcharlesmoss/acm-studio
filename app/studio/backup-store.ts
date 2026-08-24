import { LOCAL_PUBLICATIONS_KEY, LOCAL_WORKSPACE_KEY } from "../content/local-publishing";
import type { StudioWorkspace } from "./editor-model";
import { listMediaLibrary, replaceMediaLibrary, type MediaAsset, type MediaFolder } from "./media-store";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateStudioBackup(value: unknown): StudioBackup {
  if (!isRecord(value) || value.format !== "acm-studio-backup" || value.version !== 1) {
    throw new Error("This is not a supported ACM Studio backup.");
  }
  if (typeof value.exportedAt !== "string" || !isRecord(value.workspace) || value.workspace.version !== 2 || !Array.isArray(value.workspace.documents)) {
    throw new Error("The backup does not contain a valid Studio workspace.");
  }
  if (!isRecord(value.media) || !Array.isArray(value.media.folders) || !Array.isArray(value.media.assets)) {
    throw new Error("The backup does not contain a valid media library.");
  }
  for (const asset of value.media.assets) {
    if (!isRecord(asset) || typeof asset.id !== "string" || typeof asset.name !== "string" || typeof asset.type !== "string" || typeof asset.size !== "number" || typeof asset.dataBase64 !== "string") {
      throw new Error("One or more backed-up files are invalid.");
    }
  }
  if (value.publications !== null && typeof value.publications !== "string") {
    throw new Error("The published-post snapshot is invalid.");
  }
  if (typeof value.publications === "string") {
    try {
      const publications = JSON.parse(value.publications) as { version?: unknown; posts?: unknown };
      if (publications.version !== 1 || !Array.isArray(publications.posts)) throw new Error();
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
  const library = await listMediaLibrary();
  const assets = await Promise.all(library.assets.map(async ({ blob, ...asset }) => ({ ...asset, dataBase64: await blobToBase64(blob) })));
  const backup: StudioBackup = {
    format: "acm-studio-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace,
    publications: window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY),
    media: { folders: library.folders, assets },
  };
  return backup;
}

export function downloadStudioBackup(backup: StudioBackup) {
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `acm-studio-backup-${backup.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readStudioBackup(file: File) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  return validateStudioBackup(parsed);
}

export async function restoreStudioBackup(backup: StudioBackup) {
  const assets = backup.media.assets.map(({ dataBase64, ...asset }) => ({ ...asset, blob: base64ToBlob(dataBase64, asset.type) }));
  const previousLibrary = await listMediaLibrary();
  const previousWorkspace = window.localStorage.getItem(LOCAL_WORKSPACE_KEY);
  const previousPublications = window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY);
  try {
    await replaceMediaLibrary(assets, backup.media.folders);
    window.localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(backup.workspace));
    if (backup.publications) window.localStorage.setItem(LOCAL_PUBLICATIONS_KEY, backup.publications);
    else window.localStorage.removeItem(LOCAL_PUBLICATIONS_KEY);
  } catch (error) {
    await replaceMediaLibrary(previousLibrary.assets, previousLibrary.folders);
    if (previousWorkspace) window.localStorage.setItem(LOCAL_WORKSPACE_KEY, previousWorkspace);
    else window.localStorage.removeItem(LOCAL_WORKSPACE_KEY);
    if (previousPublications) window.localStorage.setItem(LOCAL_PUBLICATIONS_KEY, previousPublications);
    else window.localStorage.removeItem(LOCAL_PUBLICATIONS_KEY);
    throw error;
  }
}
