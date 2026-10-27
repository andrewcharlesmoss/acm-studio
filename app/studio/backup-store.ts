import { collectSiteImages, type SiteImageAttachment } from "./test-site/featured-images";
import { siteImageNames, parseSiteImageName, SITE_IMAGE_MAX_BYTES } from "../content/site-featured-image.mjs";
import { validateGlobalTemplateLibrary, type GlobalTemplateLibrary } from "./global-template-contract";
import { withSavedDocumentRevisions } from "./workspace-repository";
import { studioWriteOwnership } from "./write-ownership";
import { LOCAL_PUBLICATIONS_KEY, LOCAL_WORKSPACE_KEY } from "../content/local-publishing";
import { DESIGN_STORAGE_KEY, validateDesignProject, type DesignProject } from "./design-model";
import { loadDesigns } from "./design-store";
import type { StudioWorkspace } from "./editor-model";
import { listMediaLibrary, replaceMediaLibrary, type MediaAsset, type MediaFolder } from "./media-store";
import { isRecord, migrateStudioWorkspace, validateStudioWorkspace } from "./workspace-validation";
import { TEMPLATE_STORAGE_KEY, validateTemplateStore, templateMediaIds, validateWorkspacePublicationTemplates, validateTemplatePublicationSnapshot as validatePublicationSnapshot, type TemplateStore } from "./template-model";
import { loadTemplates } from "./template-store";
import { blobToBase64, base64ToBlob } from "./media-serialization";
import { captureImageRenditions } from "./image-rendition-validation";
import { captureSerializedImageRenditions, type SerializedImageRenditions } from "./image-rendition-serialization";
import { deserializeRenditionCollection, serializeRenditionCollection } from "./image-rendition-backup";
import type { ImageRenditions } from "../content/image-resolution";
export { blobToBase64, base64ToBlob } from "./media-serialization";

const MAX_BACKUP_BYTES = 100 * 1024 * 1024;

export type StudioBackupAsset = Omit<MediaAsset, "blob"> & {
  dataBase64: string;
  imageRenditions?: SerializedImageRenditions;
};

export type StudioBackup = {
  format: "acm-studio-backup";
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  exportedAt: string;
  workspace: StudioWorkspace;
  designs?: DesignProject[];
  templates?: TemplateStore;
  globalTemplates?: GlobalTemplateLibrary;
  globalDesignImages?: SiteImageAttachment[];
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
  publishedPages: number;
  folders: number;
  files: number;
  fileBytes: number;
  designs: number;
  templateSets: number;
  templates: number;
};

type RenditionMediaAsset = MediaAsset & { sourceRevision?: string; imageRenditions?: ImageRenditions };

export function validateStudioBackup(value: unknown): StudioBackup {
  if (!isRecord(value) || value.format !== "acm-studio-backup" || ![1, 2, 3, 4, 5, 6, 7].includes(value.version as number)) {
    throw new Error("This is not a supported ACM Studio backup.");
  }
  if (typeof value.exportedAt !== "string" || !Number.isFinite(Date.parse(value.exportedAt))) {
    throw new Error("The backup does not contain a valid Studio workspace.");
  }
  const workspace = validateWorkspacePublicationTemplates(migrateStudioWorkspace(value.workspace));
  if (value.globalTemplates !== undefined && value.version !== 5 && value.version !== 6 && value.version !== 7) throw new Error("Shared template snapshots require backup v5.");
  const globalTemplates = value.globalTemplates === undefined ? undefined : validateGlobalTemplateLibrary(value.globalTemplates);
  if (siteImageNames(globalTemplates?.websiteDesignDefaults).length && !Array.isArray(value.globalDesignImages)) throw new Error("The global website image backup is incomplete.");
  if (value.globalDesignImages !== undefined) {
    if ((value.version !== 6 && value.version !== 7) || !globalTemplates || !Array.isArray(value.globalDesignImages) || value.globalDesignImages.length > 32) throw new Error("Invalid global website image backup.");
    const names = new Set(siteImageNames(globalTemplates.websiteDesignDefaults));
    const seen = new Set<string>();
    for (const image of value.globalDesignImages) {
      if (!isRecord(image) || Object.keys(image).sort().join() !== "dataBase64,name" || typeof image.name !== "string" || !parseSiteImageName(image.name) || !names.has(image.name) || seen.has(image.name) || typeof image.dataBase64 !== "string" || image.dataBase64.length > SITE_IMAGE_MAX_BYTES * 1.4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.dataBase64)) throw new Error("Invalid global website image backup.");
      seen.add(image.name);
    }
    if (seen.size !== names.size) throw new Error("The global website image backup is incomplete.");
  }
  const templates = value.templates === undefined ? undefined : validateTemplateStore(value.templates, workspace.documents);
  if (value.designs !== undefined) {
    if (!Array.isArray(value.designs)) throw new Error("The design collection is invalid.");
    value.designs.forEach(validateDesignProject);
  }
  if (!isRecord(value.media) || !Array.isArray(value.media.folders) || !Array.isArray(value.media.assets)) {
    throw new Error("The backup does not contain a valid media library.");
  }
  const folders = new Map<string, string | null>();
  for (const folder of value.media.folders) {
    if (!isRecord(folder) || typeof folder.id !== "string" || !folder.id || folders.has(folder.id)
      || typeof folder.name !== "string" || typeof folder.createdAt !== "string" || !Number.isFinite(Date.parse(folder.createdAt))
      || (folder.colour !== undefined && (typeof folder.colour !== "string" || !/^#[0-9a-f]{6}$/i.test(folder.colour)))
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
  const validatedAssets: StudioBackupAsset[] = [];
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
    let imageRenditions: SerializedImageRenditions | undefined;
    if (asset.imageRenditions !== undefined) {
      if (value.version !== 7) throw new Error("Image sizes require backup v7.");
      imageRenditions = captureSerializedImageRenditions(asset.imageRenditions);
      for (const bundle of imageRenditions.bundles) for (const variant of bundle.variants) totalBytes += variant.size;
    }
    if (value.version === 7 && asset.sourceRevision !== undefined && (typeof asset.sourceRevision !== "string" || !asset.sourceRevision || asset.sourceRevision.length > 180)) throw new Error("One or more backed-up files have an invalid source revision.");
    if (totalBytes > MAX_BACKUP_BYTES) throw new Error("This backup is too large to restore in the browser.");
    validatedAssets.push({ ...(asset as unknown as StudioBackupAsset), ...(imageRenditions ? { imageRenditions } : {}) });
  }
  if (value.publications !== null && typeof value.publications !== "string") {
    throw new Error("The published-post snapshot is invalid.");
  }
  let publications = value.publications;
  if (typeof value.publications === "string") {
    try {
      const snapshot = validatePublicationSnapshot(JSON.parse(value.publications));
      for (const post of snapshot.posts) if (post.templateSnapshot && post.mediaIds.some((id: string) => !assetIds.has(id))) throw new Error("A published template image is missing from the backup.");
      publications = JSON.stringify(snapshot);
    } catch {
      throw new Error("The published-post snapshot is invalid.");
    }
  }
  for (const item of workspace.bin) if (item.publication && item.publication.mediaIds.some(id => !assetIds.has(id))) throw new Error("A binned published post is missing one or more media files from the backup.");
  if (templates !== undefined) for (const set of templates.sets) {
    if (templateMediaIds(set).some(id => !assetIds.has(id))) throw new Error("A template image is missing from the backup.");
  }
  if (templates !== undefined) for (const item of templates.bin) {
    const set = item.kind === "set" ? item.set : item.setSnapshot;
    if (templateMediaIds(set).some(id => !assetIds.has(id))) throw new Error("A binned template image is missing from the backup.");
  }
  if (globalTemplates) for (const set of [...globalTemplates.templates.sets, ...globalTemplates.migrations.test.bases, ...globalTemplates.migrations.test2.bases]) {
    if (templateMediaIds(set).some(id => !assetIds.has(id))) throw new Error("A shared template recovery image is missing from the backup.");
  }
  return { ...(value as unknown as StudioBackup), workspace, media: { ...(value.media as StudioBackup["media"]), assets: validatedAssets },
    ...(templates ? { templates } : {}), ...(globalTemplates ? { globalTemplates } : {}), publications: publications as string | null };
}

export function summariseStudioBackup(backup: StudioBackup): StudioBackupSummary {
  let publishedPosts = 0;
  let publishedPages = 0;
  if (backup.publications) {
    try {
      const publicationStore = JSON.parse(backup.publications) as { posts?: { kind?: string }[] };
      publishedPosts = publicationStore.posts?.filter(item => item.kind !== "page").length ?? 0;
      publishedPages = publicationStore.posts?.filter(item => item.kind === "page").length ?? 0;
    } catch {
      publishedPosts = 0;
    }
  }
  return {
    exportedAt: backup.exportedAt,
    pages: backup.workspace.documents.filter((document) => document.kind === "page").length,
    posts: backup.workspace.documents.filter((document) => document.kind === "post").length,
    publishedPosts,
    publishedPages,
    folders: backup.media.folders.length,
    files: backup.media.assets.length,
    fileBytes: backup.media.assets.reduce((total, asset) => total + asset.size, 0),
    designs: backup.designs?.length ?? 0,
    templateSets: backup.templates?.sets.length ?? 0,
    templates: backup.templates?.sets.reduce((count, set) => count + set.templates.length + set.parts.length, 0) ?? 0,
  };
}

export async function createStudioBackup(workspace: StudioWorkspace, globalTemplates?: GlobalTemplateLibrary | null) {
  workspace = structuredClone(withSavedDocumentRevisions(workspace));
  validateStudioWorkspace(workspace);
  const capturedGlobalTemplates = globalTemplates ? structuredClone(validateGlobalTemplateLibrary(globalTemplates)) : undefined;
  const publications = window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY);
  if (publications !== null) validatePublicationSnapshot(JSON.parse(publications));
  const library = await listMediaLibrary();
  const originalBlobs = library.assets.map(asset => asset.blob);
  const folders = structuredClone(library.folders);
  const capturedRenditions = library.assets.map(asset => {
    const rendition = (asset as MediaAsset & { imageRenditions?: ImageRenditions }).imageRenditions;
    return rendition === undefined ? undefined : captureImageRenditions(rendition);
  });
  const assets: StudioBackupAsset[] = library.assets.map((entry, index) => {
    const { blob, imageRenditions: _renditions, ...asset } = entry as MediaAsset & { imageRenditions?: ImageRenditions };
    if (!Number.isSafeInteger(asset.size) || asset.size < 0 || blob.size !== asset.size) {
      throw new Error("A media file has invalid size metadata.");
    }
    const captured = capturedRenditions[index];
    return { ...asset, dataBase64: "", ...(captured ? { imageRenditions: { version: 1 as const, bundles: captured.bundles.map(bundle => ({ ...bundle, variants: bundle.variants.map(({ blob: _blob, ...variant }) => ({ ...variant, dataBase64: "" })) })) } } : {}) };
  });
  const backup: StudioBackup = {
    format: "acm-studio-backup",
    version: capturedRenditions.some(Boolean) ? 7 : capturedGlobalTemplates?.websiteDesignDefaults ? 6 : 5,
    exportedAt: new Date().toISOString(),
    workspace,
    designs: loadDesigns(),
    templates: loadTemplates(),
    ...(capturedGlobalTemplates ? { globalTemplates: capturedGlobalTemplates } : {}),
    ...(capturedGlobalTemplates?.websiteDesignDefaults ? { globalDesignImages: await collectSiteImages(capturedGlobalTemplates.websiteDesignDefaults,"global",true) } : {}),
    publications,
    media: { folders, assets },
  };
  // Account for base64 expansion before reading media into memory. The empty
  // strings already include each JSON field's quotes and surrounding metadata.
  let encodedBytes = new Blob([JSON.stringify(backup)]).size;
  for (const asset of assets) {
    encodedBytes += 4 * Math.ceil(asset.size / 3);
  }
  const renditionBudget = MAX_BACKUP_BYTES - encodedBytes;
  for (const rendition of capturedRenditions) for (const bundle of rendition?.bundles ?? []) for (const variant of bundle.variants) encodedBytes += 4 * Math.ceil(variant.size / 3);
  if (encodedBytes > MAX_BACKUP_BYTES) throw new Error("This backup exceeds the 100 MB browser backup limit.");
  const serialized = await serializeRenditionCollection(capturedRenditions, renditionBudget);
  for (let index = 0; index < assets.length; index++) {
    assets[index].dataBase64 = await blobToBase64(originalBlobs[index]);
    if (serialized[index]) assets[index].imageRenditions = serialized[index];
  }
  return validateStudioBackup(backup);
}

export function downloadStudioBackup(backup: StudioBackup) {
  const canonical = validateStudioBackup(backup);
  const blob = new Blob([JSON.stringify(canonical)], { type: "application/json" });
  if (blob.size > MAX_BACKUP_BYTES) throw new Error("This backup exceeds the 100 MB browser backup limit.");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `acm-studio-backup-${canonical.exportedAt.slice(0, 10)}.json`;
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
  const canonical = validateStudioBackup(parsed);
  // Do not advertise this as restorable while the active library still uses
  // schema v2. The file picker displays this explanation before confirmation.
  if (canonical.version === 7) throw new Error("This backup contains image sizes that this version of Studio cannot restore yet. Keep the backup for a later version.");
  return canonical;
}

/** Prepare a complete restore snapshot before storage ownership or writes. */
export async function prepareStudioBackupRestore(input: StudioBackup): Promise<{ backup: StudioBackup; assets: RenditionMediaAsset[] }> {
  const backup = structuredClone(validateStudioBackup(input));
  if (new Blob([JSON.stringify(backup)]).size > MAX_BACKUP_BYTES) throw new Error("This backup exceeds the 100 MB browser backup limit.");
  const originalBytes = backup.media.assets.reduce((sum, asset) => sum + asset.size, 0);
  const decoded = await deserializeRenditionCollection(backup.media.assets.map(asset => asset.imageRenditions), MAX_BACKUP_BYTES - originalBytes);
  const assets = backup.media.assets.map((entry, index) => {
    const { dataBase64, imageRenditions: _encoded, sourceRevision, ...asset } = entry as StudioBackupAsset & { sourceRevision?: unknown };
    return { ...asset, blob: base64ToBlob(dataBase64, asset.type), ...(backup.version === 7 && typeof sourceRevision === "string" ? { sourceRevision } : {}), ...(decoded[index] ? { imageRenditions: decoded[index] } : {}) };
  });
  return { backup, assets };
}

export async function restoreStudioBackup(backup: StudioBackup) {
  // The live media store is still schema v2. Never put rendition blobs into
  // it: older tabs and exporters cannot preserve them. Remove this gate only
  // with the owned v3 migration and complete restore integration.
  if (backup.version === 7) throw new Error("This backup contains image sizes that this version of Studio cannot restore yet. Keep the backup for a later version.");
  const canonical = validateStudioBackup(backup);
  return studioWriteOwnership.restore(async (permit) => {
    const assets = canonical.media.assets.map(({ dataBase64, ...asset }) => ({ ...asset, blob: base64ToBlob(dataBase64, asset.type) }));
    const previousLibrary = await listMediaLibrary();
    const previousWorkspace = window.localStorage.getItem(LOCAL_WORKSPACE_KEY);
    const previousPublications = window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY);
    const previousDesigns = window.localStorage.getItem(DESIGN_STORAGE_KEY);
    const previousTemplates = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    try {
      await replaceMediaLibrary(assets, canonical.media.folders, permit);
      window.localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(canonical.workspace));
      if (canonical.templates) window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(canonical.templates));
      else window.localStorage.removeItem(TEMPLATE_STORAGE_KEY);
      if (canonical.designs) window.localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(canonical.designs));
      else window.localStorage.removeItem(DESIGN_STORAGE_KEY);
      if (canonical.publications) window.localStorage.setItem(LOCAL_PUBLICATIONS_KEY, canonical.publications);
      else window.localStorage.removeItem(LOCAL_PUBLICATIONS_KEY);
    } catch (error) {
      const rollbackFailures: unknown[] = [];
      try { await replaceMediaLibrary(previousLibrary.assets, previousLibrary.folders, permit); }
      catch (rollbackError) { rollbackFailures.push(rollbackError); }
      for (const [key, previous] of [[LOCAL_WORKSPACE_KEY, previousWorkspace], [LOCAL_PUBLICATIONS_KEY, previousPublications], [DESIGN_STORAGE_KEY, previousDesigns], [TEMPLATE_STORAGE_KEY, previousTemplates]] as const) {
        try {
          if (previous !== null) window.localStorage.setItem(key, previous);
          else window.localStorage.removeItem(key);
        } catch (rollbackError) { rollbackFailures.push(rollbackError); }
      }
      if (rollbackFailures.length) {
        throw new AggregateError([error, ...rollbackFailures], `Restore failed: ${error instanceof Error ? error.message : "storage write failed"}. The original data could not be fully recovered. Keep this page open and retain your backup.`);
      }
      throw error;
    }
  });
}
