import { containsGeneralTemplatePart } from "./reference-template-parts-contract";
import { containsUnsetWebsiteGradient } from "./site-editor/website-design";
import { containsWebsiteFont } from "../content/website-fonts";
import { containsBoxSideOverrides } from "../content/box-lengths";
import { containsPullquote } from "../content/pullquote-block";
import { collectSiteImages, type SiteImageAttachment } from "./test-site/featured-images";
import { containsCodeRuns, containsCodeMonospaceFont } from "../content/code-runs";
import { containsVideoBlock } from "../content/video-block";
import { containsCoreSocialLink } from "../content/social-services";
import { siteImageNames, parseSiteImageName, SITE_IMAGE_MAX_BYTES } from "../content/site-featured-image.mjs";
import { validateGlobalTemplateLibrary, type GlobalTemplateLibrary } from "./global-template-contract";
import { withSavedDocumentRevisions } from "./workspace-repository";
import { studioWriteOwnership } from "./write-ownership";
import { LOCAL_PUBLICATIONS_KEY, LOCAL_WORKSPACE_KEY } from "../content/local-publishing";
import { containsGroupGridFillAvailableSpace, containsFlexItemSizing, containsScopedFlexItemSizing, containsGroupLayoutExtensions } from "../content/layout";
import { containsGridItemSizing } from "../content/grid-child-sizing";
import { containsExtendedGroupShadow, containsExtraBlackAppearance, containsGroupHeadingStyles } from "../content/quote-presentation";
import { containsAuthoredFeaturedImageOverlay } from "../content/featured-image-overlay";
import { containsDetailsPresentation } from "../content/details-block";
import { containsCoverBlock, containsCoverContentPosition, containsCoverInnerContentWidth, containsCoverVideoBackground, containsNativeCoverVideoSource } from "../content/cover-block";
import { containsAuthorBlockPresentation } from "../content/author-profile-presentation";
import { containsAuthoredAuthorDuotone } from "../content/image-duotone";
import { containsAuthoredCoverCrop, containsAuthoredImageCrop } from "../content/image-edit";
import { containsPostDateTimeOverride } from "../content/document-metadata";
import { containsSiteTitle, containsAutomaticNavigationPageList, containsNavigationSearch, containsNavigationSearchStyle, containsNavigationSearchDisplayWidth, containsNavigationHomeLink, containsNavigationSpacer, containsNavigationPageListBlock } from "./template-model";
import { containsColumnWidthUnit } from "../content/columns";
import { DESIGN_STORAGE_KEY, validateDesignProject, type DesignProject } from "./design-model";
import { loadDesigns } from "./design-store";
import type { StudioWorkspace } from "./editor-model";
import { listMediaLibrary, replaceMediaLibrary, type MediaAsset, type MediaFolder } from "./media-store";
import { containsQueryLoop, isRecord, migrateStudioWorkspace, validateStudioWorkspace } from "./workspace-validation";
import { TEMPLATE_STORAGE_KEY, validateTemplateStore, templateMediaIds, validateWorkspacePublicationTemplates, validateTemplatePublicationSnapshot as validatePublicationSnapshot, type TemplateStore } from "./template-model";
import { loadTemplates } from "./template-store";
import { blobToBase64, base64ToBlob } from "./media-serialization";
import { captureImageRenditions } from "./image-rendition-validation";
import { captureSerializedImageRenditions, type SerializedImageRenditions } from "./image-rendition-serialization";
import { deserializeRenditionCollection, serializeRenditionCollection } from "./image-rendition-backup";
import type { ImageRenditions } from "../content/image-resolution";
import { captureLegacyMediaRecovery, captureStoredMediaRecovery, isMediaSourceRevision } from "./media-backup-recovery";
export { blobToBase64, base64ToBlob } from "./media-serialization";

const MAX_BACKUP_BYTES = 100 * 1024 * 1024;

export type StudioBackupAsset = Omit<MediaAsset, "blob"> & {
  dataBase64: string;
  imageRenditions?: SerializedImageRenditions;
};

export type StudioBackup = {
  format: "acm-studio-backup";
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45;
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
  if (!isRecord(value) || value.format !== "acm-studio-backup") {
    throw new Error("This is not a supported ACM Studio backup.");
  }
  const version = value.version;
  if (isRecord(value.media) && Array.isArray(value.media.assets)) for (const asset of value.media.assets) {
    if (isRecord(asset)) captureLegacyMediaRecovery(asset, version as number);
  }
  // Media recovery values are inert JSON, never authored block content.
  const content = { ...value, media: undefined };
  if ((version as number) < 45 && containsGroupLayoutExtensions(content)) throw new Error("Extended Group layout values require backup v45.");
  if ((version as number) < 44 && containsScopedFlexItemSizing(content)) throw new Error("Scoped flex child sizing requires backup v44.");
  if ((version as number) < 42 && containsNavigationPageListBlock(content)) throw new Error("Page List blocks require backup v42.");
  if ((version as number) < 41 && containsQueryLoop(content)) throw new Error("Query Loop template blocks require backup v41.");
  if ((version as number) < 40 && containsGeneralTemplatePart(content)) throw new Error("General template parts require backup v40.");
  if ((version as number) < 39 && containsSiteTitle(content)) throw new Error("Site Title requires backup v39.");
  if ((version as number) < 37 && isRecord(value.globalTemplates) && containsUnsetWebsiteGradient(value.globalTemplates.websiteDesignDefaults)) throw new Error("Unset custom gradients require backup v37.");
  if ((version as number) < 36 && containsWebsiteFont(content)) throw new Error("Website fonts require backup v36.");
  if ((version as number) < 35 && containsBoxSideOverrides(content)) throw new Error("Per-side spacing or border values require backup v35.");
  if ((version as number) < 34 && containsPullquote(content)) throw new Error("Pullquote requires backup v34. Original data has been retained.");
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45].includes(version as number)) throw new Error("This is not a supported ACM Studio backup.");
  if ((version as number) < 42 && containsGroupHeadingStyles(content)) throw new Error("Per-level Group heading styles require backup v42.");
  if ((version as number) < 42 && containsExtendedGroupShadow(content)) throw new Error("Expanded Group shadow presets require backup v42.");
  if ((version as number) < 42 && containsExtraBlackAppearance(content)) throw new Error("Extra Black font appearance requires backup v42.");
  if ((version as number) < 33 && containsNativeCoverVideoSource(content)) throw new Error("Native Cover video sources require backup v33. Original data has been retained.");
  if ((version as number) < 32 && containsVideoBlock(content)) throw new Error("Video blocks require backup v32. Original data has been retained.");
  if ((version as number) < 31 && containsCoverVideoBackground(content)) throw new Error("Cover video backgrounds require backup v31. Original data has been retained.");
  if ((version as number) < 30 && containsAuthoredCoverCrop(content)) throw new Error("Cover crop edits require backup v30. Original data has been retained.");
  if ((version as number) < 29 && containsCoverInnerContentWidth(content)) throw new Error("Cover inner-content width requires backup v29. Original data has been retained.");
  if ((version as number) < 28 && containsCoverContentPosition(content)) throw new Error("Cover content position requires backup v28. Original data has been retained.");
  if ((version as number) < 27 && containsCoreSocialLink(content)) throw new Error("Social Link services require backup v27. Original data has been retained.");
  if ((version as number) < 23 && containsCoverBlock(content)) throw new Error("Cover blocks require backup v23. Original data has been retained.");
  if ((version as number) < 25 && containsAuthorBlockPresentation(content)) throw new Error("Author profile presentation requires backup v25. Original data has been retained.");
  if ((version as number) < 26 && containsAuthoredAuthorDuotone(content)) throw new Error("Author Duotone requires backup v26. Original data has been retained.");
  if ((version as number) < 24 && containsAuthoredImageCrop(content)) throw new Error("Image crop edits require backup v24. Original data has been retained.");
  if ((version as number) < 22 && containsCodeMonospaceFont(content)) throw new Error("Code monospace font requires backup v22.");
  if ((version as number) < 21 && containsCodeRuns(content)) throw new Error("Code inline formatting requires backup v21.");
  if ((version as number) < 20 && containsNavigationSpacer(content)) throw new Error("Navigation spacers require backup v20.");
  if ((version as number) < 19 && containsNavigationHomeLink(content)) throw new Error("Navigation Home Links require backup v19.");
  if ((version as number) < 18 && containsNavigationSearchDisplayWidth(content)) throw new Error("Navigation Search display widths require backup v18.");
  if ((version as number) < 17 && containsGridItemSizing(content)) throw new Error("Grid child spans require backup v17.");
  if ((version as number) < 16 && containsDetailsPresentation(content)) throw new Error("Details blocks require backup v16.");
  if ((version as number) < 15 && containsAuthoredFeaturedImageOverlay(content)) throw new Error("Featured Image overlays require backup v15.");
  if ((version as number) < 14 && containsNavigationSearchStyle(content)) throw new Error("Navigation Search styles require backup v14.");
  if ((version as number) < 13 && containsNavigationSearch(content)) throw new Error("Navigation Search requires backup v13.");
  if ((version as number) < 12 && containsAutomaticNavigationPageList(content)) throw new Error("Automatic Navigation Page Lists require backup v12.");
  if ((version as number) < 11 && containsPostDateTimeOverride(content)) throw new Error("Post Date overrides require backup v11.");
  if ((version as number) < 10 && containsColumnWidthUnit(content)) throw new Error("Column width units require backup v10.");
  if ((version as number) < 9 && containsFlexItemSizing(content)) throw new Error("Flex child sizing requires backup v9.");
  if ((version as number) < 8 && containsGroupGridFillAvailableSpace(content)) throw new Error("Grid Fill available space requires backup v8.");
  if (typeof value.exportedAt !== "string" || !Number.isFinite(Date.parse(value.exportedAt))) {
    throw new Error("The backup does not contain a valid Studio workspace.");
  }
  const workspace = validateWorkspacePublicationTemplates(migrateStudioWorkspace(value.workspace));
  if (value.globalTemplates !== undefined && (version as number) < 5) throw new Error("Shared template snapshots require backup v5.");
  const globalTemplates = value.globalTemplates === undefined ? undefined : validateGlobalTemplateLibrary(value.globalTemplates);
  if (siteImageNames(globalTemplates?.websiteDesignDefaults).length && !Array.isArray(value.globalDesignImages)) throw new Error("The global website image backup is incomplete.");
  if (value.globalDesignImages !== undefined) {
    if (((version as number) < 6) || !globalTemplates || !Array.isArray(value.globalDesignImages) || value.globalDesignImages.length > 32) throw new Error("Invalid global website image backup.");
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
      if ((version as number) < 7) throw new Error("Image sizes require backup v7.");
      imageRenditions = captureSerializedImageRenditions(asset.imageRenditions);
      for (const bundle of imageRenditions.bundles) for (const variant of bundle.variants) totalBytes += variant.size;
    }
    if ((version as number) >= 7 && asset.sourceRevision !== undefined && !isMediaSourceRevision(asset.sourceRevision)) throw new Error("One or more backed-up files have an invalid source revision.");
    if (totalBytes > MAX_BACKUP_BYTES) throw new Error("This backup is too large to restore in the browser.");
    validatedAssets.push({ ...(asset as unknown as StudioBackupAsset), ...(imageRenditions ? { imageRenditions } : {}) });
  }
  if (value.publications !== null && typeof value.publications !== "string") {
    throw new Error("The published-post snapshot is invalid.");
  }
  let publications = value.publications;
  if (typeof value.publications === "string") {
    try {
      const parsedPublications = JSON.parse(value.publications);
      if ((version as number) < 40 && containsGeneralTemplatePart(parsedPublications)) throw new Error("General template parts require backup v40.");
      if ((version as number) < 39 && containsSiteTitle(parsedPublications)) throw new Error("Site Title requires backup v39.");
      if ((version as number) < 36 && containsWebsiteFont(parsedPublications)) throw new Error("Website fonts require backup v36.");
      if ((version as number) < 35 && containsBoxSideOverrides(parsedPublications)) throw new Error("Per-side spacing or border values require backup v35.");
      if ((version as number) < 34 && containsPullquote(parsedPublications)) throw new Error("Pullquote requires backup v34.");
      const snapshot = validatePublicationSnapshot(parsedPublications);
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
  return { ...(value as unknown as StudioBackup), version: version as StudioBackup["version"], workspace, media: { ...(value.media as StudioBackup["media"]), assets: validatedAssets },
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
    const backupRecovery = captureStoredMediaRecovery(asset.backupRecovery);
    return { ...asset, ...(backupRecovery ? { backupRecovery } : {}), dataBase64: "", ...(captured ? { imageRenditions: { version: 1 as const, bundles: captured.bundles.map(bundle => ({ ...bundle, variants: bundle.variants.map(({ blob: _blob, ...variant }) => ({ ...variant, dataBase64: "" })) })) } } : {}) };
  });
  const backup: StudioBackup = {
    format: "acm-studio-backup",
    version: 45,
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
  return canonical;
}

/** Prepare a complete restore snapshot before storage ownership or writes. */
export async function prepareStudioBackupRestore(input: StudioBackup): Promise<{ backup: StudioBackup; assets: RenditionMediaAsset[] }> {
  const backup = structuredClone(validateStudioBackup(input));
  if (new Blob([JSON.stringify(backup)]).size > MAX_BACKUP_BYTES) throw new Error("This backup exceeds the 100 MB browser backup limit.");
  const originalBytes = backup.media.assets.reduce((sum, asset) => sum + asset.size, 0);
  const decoded = await deserializeRenditionCollection(backup.media.assets.map(asset => asset.imageRenditions), MAX_BACKUP_BYTES - originalBytes);
  const assets = backup.media.assets.map((entry, index) => {
    const { dataBase64, imageRenditions: _encoded, ...asset } = entry;
    const backupRecovery = captureLegacyMediaRecovery(asset, backup.version);
    return { ...asset, ...(backupRecovery ? { backupRecovery } : {}),
      ...(backup.version < 7 && asset.sourceRevision !== undefined && !isMediaSourceRevision(asset.sourceRevision) ? { sourceRevision: crypto.randomUUID() } : {}),
      blob: base64ToBlob(dataBase64, asset.type), ...(decoded[index] ? { imageRenditions: decoded[index] } : {}) };
  });
  return { backup, assets };
}

export async function restoreStudioBackup(backup: StudioBackup) {
  const captured = structuredClone(validateStudioBackup(backup));
  return studioWriteOwnership.restore(async (permit) => {
    const { backup: canonical, assets } = await prepareStudioBackupRestore(captured);
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
