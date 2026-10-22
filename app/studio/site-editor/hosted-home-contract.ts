import { isLocalFixtureSiteId, type LocalFixtureSiteId } from "../test-site/sites";
import { testSiteCollection, type TestSiteDocument } from "../test-site/contract";
export const hostedHomeProtocol = "acm-site-editor-home-v1";
export function hostedHomeHref(site: LocalFixtureSiteId) { return `/studio?site=${site}&siteEditorHome=1`; }
export function authoredHome(document: TestSiteDocument, site: LocalFixtureSiteId) {
  const collection = testSiteCollection(document);
  if (collection.siteId !== site) throw new Error("The home page belongs to another site.");
  const home = collection.documents.find(item => item.id === collection.homeDocumentId);
  if (!home || home.kind !== "page") throw new Error("The authored home page is unavailable.");
  return home;
}
export function validHostedHomeMessage(event: Pick<MessageEvent, "source" | "origin" | "data">, source: MessageEventSource | null, origin: string, site: LocalFixtureSiteId) {
  const data = event.data;
  return event.source === source && source !== null && event.origin === origin && data && typeof data === "object" && data.protocol === hostedHomeProtocol && isLocalFixtureSiteId(data.site) && data.site === site;
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
