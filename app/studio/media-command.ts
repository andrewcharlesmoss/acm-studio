import type { MediaAsset, MediaFolder } from "./media-store";

export const MEDIA_COMMAND_PROTOCOL = "acm-studio-media-v1";
export const MEDIA_REQUEST_LIFETIME_MS = 5 * 60_000;
export const MEDIA_FILE_LIMIT = 100 * 1024 * 1024;
export const MEDIA_BATCH_LIMIT = 512 * 1024 * 1024;
export type MediaAssetPatch = Partial<Pick<MediaAsset, "name" | "folderId" | "altText" | "caption">>;
export type MediaFolderBefore = { name: string; parentId: string | null; colour: string | null };
export type MediaAssetBefore = Omit<MediaAsset, "blob">;
export type MediaCommand =
  | { kind: "upload"; folderId: string | null; createdAt: string; files: Array<{ id: string; name: string; type: string; blob: Blob }> }
  | { kind: "create-folder"; folder: MediaFolder }
  | { kind: "update-asset"; id: string; update: MediaAssetPatch; before: MediaAssetPatch }
  | { kind: "rename-folder"; id: string; name: string; before: string }
  | { kind: "colour-folder"; id: string; colour: string | null; before: string | null }
  | { kind: "move-folder"; id: string; parentId: string | null; before: string | null }
  | { kind: "delete-asset"; id: string; before: MediaAssetBefore }
  | { kind: "delete-folder"; id: string; before: MediaFolderBefore };
export type MediaRequest = { id: string; generation: string; submittedAt: string; command: MediaCommand };
export class MediaCommandError extends Error {
  constructor(message: string, readonly code: "conflict" | "replaced" | "unavailable" | "invalid" = "invalid") { super(message); }
}

export function mediaRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
export function mediaId(value: unknown): value is string { return typeof value === "string" && !!value.length && value.length <= 180; }
const folderId = (value: unknown) => value === null || mediaId(value);
const text = (value: unknown, max = 1024) => typeof value === "string" && value.length <= max;
const name = (value: unknown) => text(value) && !!(value as string).trim();
const date = (value: unknown) => text(value, 40) && Number.isFinite(Date.parse(value as string));
const colour = (value: unknown) => value === null || typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
export function mediaKeys(value: Record<string, unknown>, keys: string[]) { return Object.keys(value).sort().join(",") === keys.sort().join(","); }
function patch(value: unknown) {
  return mediaRecord(value) && Object.keys(value).length > 0 && Object.entries(value).every(([key, item]) => key === "name" ? name(item) : key === "folderId" ? folderId(item) : ["altText", "caption"].includes(key) && text(item, 10_000));
}

export function validateMediaCommand(value: unknown): value is MediaCommand {
  if (!mediaRecord(value)) return false;
  switch (value.kind) {
    case "upload": {
      if (!mediaKeys(value, ["kind", "folderId", "createdAt", "files"]) || !folderId(value.folderId) || !date(value.createdAt) || !Array.isArray(value.files) || !value.files.length || value.files.length > 64) return false;
      let bytes = 0;
      const ids = new Set<string>();
      return value.files.every(file => {
        if (!mediaRecord(file) || !mediaKeys(file, ["id", "name", "type", "blob"]) || !mediaId(file.id) || ids.has(file.id) || !name(file.name) || !text(file.type, 200) || !(file.blob instanceof Blob) || file.blob.size > MEDIA_FILE_LIMIT || file.blob.type && file.blob.type !== file.type) return false;
        ids.add(file.id); bytes += file.blob.size;
        return bytes <= MEDIA_BATCH_LIMIT;
      });
    }
    case "create-folder": return mediaKeys(value, ["kind", "folder"]) && mediaRecord(value.folder) && mediaKeys(value.folder, ["id", "name", "parentId", "createdAt"]) && mediaId(value.folder.id) && name(value.folder.name) && folderId(value.folder.parentId) && date(value.folder.createdAt);
    case "update-asset": return mediaKeys(value, ["kind", "id", "update", "before"]) && mediaId(value.id) && patch(value.update) && patch(value.before) && Object.keys(value.update as object).sort().join() === Object.keys(value.before as object).sort().join();
    case "rename-folder": return mediaKeys(value, ["kind", "id", "name", "before"]) && mediaId(value.id) && name(value.name) && name(value.before);
    case "colour-folder": return mediaKeys(value, ["kind", "id", "colour", "before"]) && mediaId(value.id) && colour(value.colour) && colour(value.before);
    case "move-folder": return mediaKeys(value, ["kind", "id", "parentId", "before"]) && mediaId(value.id) && folderId(value.parentId) && folderId(value.before);
    case "delete-folder": return mediaKeys(value, ["kind", "id", "before"]) && mediaId(value.id) && mediaRecord(value.before) && mediaKeys(value.before, ["name", "parentId", "colour"]) && name(value.before.name) && folderId(value.before.parentId) && colour(value.before.colour);
    case "delete-asset": return mediaKeys(value, ["kind", "id", "before"]) && mediaId(value.id) && mediaRecord(value.before) && mediaKeys(value.before, ["id", "name", "folderId", "type", "size", "createdAt", "updatedAt", "altText", "caption"]) && value.before.id === value.id && name(value.before.name) && folderId(value.before.folderId) && text(value.before.type, 200) && typeof value.before.size === "number" && Number.isSafeInteger(value.before.size) && value.before.size >= 0 && date(value.before.createdAt) && date(value.before.updatedAt) && text(value.before.altText, 10_000) && text(value.before.caption, 10_000);
    default: return false;
  }
}

export function validateMediaRequest(value: unknown): value is MediaRequest {
  return mediaRecord(value) && mediaKeys(value, ["id", "generation", "submittedAt", "command"]) && mediaId(value.id) && mediaId(value.generation) && date(value.submittedAt) && validateMediaCommand(value.command);
}

export function assetBefore(asset: MediaAsset): MediaAssetBefore {
  return { id: asset.id, name: asset.name, folderId: asset.folderId, type: asset.type, size: asset.size, createdAt: asset.createdAt, updatedAt: asset.updatedAt, altText: asset.altText, caption: asset.caption };
}
export function folderBefore(folder: MediaFolder): MediaFolderBefore { return { name: folder.name, parentId: folder.parentId, colour: folder.colour ?? null }; }
