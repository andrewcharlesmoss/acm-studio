import { blobToBase64, base64ToBlob, validateStudioBackup, type StudioBackupAsset } from "./backup-store";
import { initialStudioWorkspace } from "./editor-model";
import { listMediaLibrary, replaceMediaLibrary } from "./media-store";
import { copyTemplateData, duplicateTemplateSet, templateId, templateMediaIds, visitTemplateNodes, validateTemplateSet, validateTemplateStore, TEMPLATE_STORAGE_KEY, TEMPLATE_VERSION, type TemplateSet } from "./template-model";
import { loadTemplates } from "./template-store";
import { studioWriteOwnership } from "./write-ownership";
import { isRecord } from "./workspace-validation";

export type TemplatePackage = { format: "acm-studio-template-set"; version: typeof TEMPLATE_VERSION; set: TemplateSet; media: StudioBackupAsset[] };
export const TEMPLATE_PACKAGE_LIMIT = 50 * 1024 * 1024;
export function validateTemplatePackage(value: unknown): TemplatePackage {
  if (!isRecord(value) || value.format !== "acm-studio-template-set" || value.version !== TEMPLATE_VERSION || !Array.isArray(value.media)) throw new Error("This is not a supported template package.");
  const set = validateTemplateSet(value.set);
  // Reuse the backup's byte, base64, metadata and duplicate-ID validation.
  validateStudioBackup({ format: "acm-studio-backup", version: 2, exportedAt: "2026-01-01T00:00:00Z", workspace: initialStudioWorkspace, publications: null, media: { folders: [], assets: value.media } });
  const required = templateMediaIds(set);
  const assets = value.media as StudioBackupAsset[];
  if (required.length !== assets.length || required.some(id => !assets.some(a => a.id === id && /^image\/(png|jpeg|webp|gif|avif|svg\+xml|bmp|tiff|x-icon|vnd\.microsoft\.icon)$/.test(a.type)))) throw new Error("The package must include every referenced image and no unrelated files.");
  if (new Blob([JSON.stringify(value)]).size > TEMPLATE_PACKAGE_LIMIT) throw new Error("Choose a template package smaller than 50 MB.");
  return value as TemplatePackage;
}

export async function exportTemplatePackage(set: TemplateSet): Promise<TemplatePackage> {
  validateTemplateSet(set);
  const library = await listMediaLibrary();
  const media: StudioBackupAsset[] = [];
  let bytes = 0;
  for (const id of templateMediaIds(set)) {
    const asset = library.assets.find(a => a.id === id);
    if (!asset) throw new Error("A referenced image is missing. Restore it before exporting this design.");
    bytes += 4 * Math.ceil(asset.size / 3);
    if (bytes > TEMPLATE_PACKAGE_LIMIT) throw new Error("This template package exceeds 50 MB.");
    const { blob, ...metadata } = asset;
    media.push({ ...metadata, folderId: null, dataBase64: await blobToBase64(blob) });
  }
  return validateTemplatePackage({ format: "acm-studio-template-set", version: TEMPLATE_VERSION, set: copyTemplateData(set), media });
}

export function prepareTemplateImport(input: TemplatePackage, name?: string) {
  const source = validateTemplatePackage(input);
  const set = duplicateTemplateSet(source.set, name ?? `${source.set.name} Imported`);
  const ids = new Map(source.media.map(asset => [asset.id, templateId()]));
  if (set.identity.logo?.mediaId) set.identity.logo.mediaId = ids.get(set.identity.logo.mediaId)!;
  for (const item of [...set.templates, ...set.parts]) visitTemplateNodes(item.nodes, node => { if (node.type === "image" && node.mediaId) node.mediaId = ids.get(node.mediaId)!; });
  const assets = source.media.map(({ dataBase64, ...asset }) => ({ ...asset, id: ids.get(asset.id)!, folderId: null, blob: base64ToBlob(dataBase64, asset.type) }));
  return { set: validateTemplateSet(set), assets };
}

/** Exclusive transaction drains media work; success requires a fresh load. */
export async function importTemplatePackage(input: TemplatePackage, name?: string, writerToken?: symbol) {
  studioWriteOwnership.assertWritable(writerToken);
  const prepared = prepareTemplateImport(input, name);
  return studioWriteOwnership.restore(async permit => {
    const previous = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    const store = loadTemplates();
    const library = await listMediaLibrary();
    store.sets.push(prepared.set); validateTemplateStore(store);
    try {
      await replaceMediaLibrary([...library.assets, ...prepared.assets], library.folders, permit);
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      const failures: unknown[] = [];
      try { await replaceMediaLibrary(library.assets, library.folders, permit); } catch (reason) { failures.push(reason); }
      try { if (previous === null) window.localStorage.removeItem(TEMPLATE_STORAGE_KEY); else window.localStorage.setItem(TEMPLATE_STORAGE_KEY, previous); } catch (reason) { failures.push(reason); }
      if (failures.length) throw new AggregateError([error, ...failures], "Import failed and recovery is incomplete. Editing is paused; retain your backup.");
      throw error;
    }
    return prepared.set.id;
  });
}
