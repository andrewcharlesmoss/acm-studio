import { TEMPLATE_STORAGE_KEY, emptyTemplateStore, validateTemplateStore, templateMediaIds, validateTemplatePublicationSnapshot, type TemplateStore } from "./template-model";
import { studioWriteOwnership } from "./write-ownership";
import type { LocallyPublishedArticle } from "../content/local-publishing";
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
  validateTemplateStore(store);
  storage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("studio-templates-changed"));
}

export function assertTemplateMediaCanBeDeleted(id: string) {
  if (loadTemplates().sets.some(set => templateMediaIds(set).includes(id))) throw new Error("This image is used by a template or site identity. Replace those references before deleting it.");
  const raw = window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY);
  if (raw === null) return;
  const publications: unknown = JSON.parse(raw); validateTemplatePublicationSnapshot(publications);
  if ((publications as { posts: LocallyPublishedArticle[] }).posts.some(post => post.templateSnapshot && post.mediaIds.includes(id))) throw new Error("This image is used by a published template snapshot. Update or unpublish that post before deleting it.");
}
