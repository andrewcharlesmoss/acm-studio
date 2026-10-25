import { isLocalFixtureSiteId, type LocalFixtureSiteId } from "../test-site/sites";
import { testSiteCollection, type TestSiteDocument } from "../test-site/contract";
import type { GlobalTemplateLibrary } from "../global-template-contract";
export const hostedHomeProtocol = "acm-site-editor-home-v1";
export function hostedHomeHref(site: LocalFixtureSiteId) { return `/studio?site=${site}&siteEditorHome=1`; }
export function hostedPageHref(site: LocalFixtureSiteId, documentId: string) {
  if (!documentId || documentId.length > 200) throw new Error("The selected page is unavailable.");
  return `/studio?site=${site}&siteEditorPage=1&documentId=${encodeURIComponent(documentId)}`;
}
/** Resolve a rendered fixture template target back to its editable shared original. */
export function hostedHomeTemplateTarget(library: GlobalTemplateLibrary | null | undefined, site: LocalFixtureSiteId, setId: string, targetId: string) {
  if (!library) return null;
  const binding = library.migrations[site]?.bindings.find(item => item.setId === setId);
  const canonicalSetId = binding?.globalSetId ?? setId;
  const canonicalTargetId = binding
    ? Object.entries(binding.ids).find(([, fixtureId]) => fixtureId === targetId)?.[0] ?? targetId
    : targetId;
  const set = library.templates.sets.find(item => item.id === canonicalSetId);
  const targetExists = set && [...set.templates, ...set.parts].some(entry => entry.id === canonicalTargetId);
  return targetExists ? { setId: canonicalSetId, targetId: canonicalTargetId, scope: "global" as const } : null;
}
export function authoredHome(document: TestSiteDocument, site: LocalFixtureSiteId) {
  const collection = testSiteCollection(document);
  if (collection.siteId !== site) throw new Error("The home page belongs to another site.");
  const home = collection.documents.find(item => item.id === collection.homeDocumentId);
  if (!home || home.kind !== "page") throw new Error("The authored home page is unavailable.");
  return home;
}
export function authoredPage(document: TestSiteDocument, site: LocalFixtureSiteId, documentId: string) {
  const collection = testSiteCollection(document);
  if (collection.siteId !== site) throw new Error("The page belongs to another site.");
  const page = collection.documents.find(item => item.id === documentId);
  if (!page || page.kind !== "page") throw new Error("The selected page is unavailable.");
  return page;
}
export function validHostedHomeMessage(event: Pick<MessageEvent, "source" | "origin" | "data">, source: MessageEventSource | null, origin: string, site: LocalFixtureSiteId, targetId?: string) {
  const data = event.data;
  return event.source === source && source !== null && event.origin === origin && data && typeof data === "object" && data.protocol === hostedHomeProtocol && isLocalFixtureSiteId(data.site) && data.site === site
    && (targetId === undefined ? data.documentId === undefined : data.documentId === targetId);
}
export async function flushHostedHome(adapter: { discardCode(): boolean; prepareNavigation(): Promise<boolean>; flush(): Promise<void>; failed(): boolean; pause?(paused: boolean): void }) {
  let accepted = false;
  try {
    if (!adapter.discardCode() || !await adapter.prepareNavigation()) return false;
    adapter.pause?.(true);
    await adapter.flush(); accepted = !adapter.failed(); return accepted;
  } catch { return false; }
  finally { if (!accepted) adapter.pause?.(false); }
}

export function hostedHomeCanMutate(hosted: boolean, editing: boolean, busy: boolean, prepared: boolean) { return !hosted || editing && !busy && !prepared; }

/** Presentation-only status; recovery still runs in the embedded document owner. */
export type HostedSaveStatus = { label: string; warning: string | null; reconnecting: boolean };
export function validHostedSaveStatus(value: unknown): value is HostedSaveStatus {
  if (!value || typeof value !== "object") return false;
  const status = value as Record<string, unknown>;
  return typeof status.label === "string" && status.label.length > 0 && status.label.length <= 200
    && (status.warning === null || typeof status.warning === "string" && status.warning.length > 0 && status.warning.length <= 2000)
    && typeof status.reconnecting === "boolean";
}

export function boundedHostedSaveStatus(status: HostedSaveStatus): HostedSaveStatus {
  const bound = (text: string, limit: number) => text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
  return { label: bound(status.label || "Saving status unavailable", 200), warning: status.warning ? bound(status.warning, 2000) : null, reconnecting: status.reconnecting };
}
