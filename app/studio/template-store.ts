import { TEMPLATE_STORAGE_KEY, emptyTemplateStore, validateTemplateStore, templateMediaIds, validateTemplatePublicationSnapshot, type TemplateStore } from "./template-model";
import { studioWriteOwnership } from "./write-ownership";
import { LOCAL_PUBLICATIONS_KEY } from "../content/local-storage-keys";

export function loadTemplates(storage: Pick<Storage, "getItem"> = window.localStorage): TemplateStore {
  const raw = storage.getItem(TEMPLATE_STORAGE_KEY);
  if (raw === null) return emptyTemplateStore();
  try { return validateTemplateStore(JSON.parse(raw)); }
  catch { throw new Error("Saved templates could not be read. Original data has been retained. Export the original data or restore a valid backup."); }
}

export function saveTemplates(store: TemplateStore, storage: Pick<Storage, "setItem" | "getItem"> = window.localStorage) {
  studioWriteOwnership.assertWritable();
  // Never overwrite an unreadable snapshot, including one changed outside this UI.
  loadTemplates(storage);
  const canonicalStore = validateTemplateStore(store);
  storage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(canonicalStore));
  window.dispatchEvent(new Event("studio-templates-changed"));
}

export function assertTemplateMediaCanBeDeleted(id: string) {
  const templates = loadTemplates();
  if (templates.sets.some(set => templateMediaIds(set).includes(id))
    || templates.bin.some(item => templateMediaIds(item.kind === "set" ? item.set : item.setSnapshot).includes(id))) throw new Error("This image is used by a template or an item in the Bin. Replace those references or permanently delete the binned item first.");
  const raw = window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY);
  if (raw === null) return;
  const publications = validateTemplatePublicationSnapshot(JSON.parse(raw));
  const publication = publications.posts.find(post => post.mediaIds.includes(id));
  if (publication) throw new Error(publication.templateSnapshot
    ? "This image is used by a published template snapshot. Update or unpublish that post before deleting it."
    : "This image is used by a published copy. Update or unpublish that post before deleting it.");
}
