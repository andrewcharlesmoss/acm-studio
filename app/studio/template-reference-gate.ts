import { copyTemplateData, type TemplateStore } from "./template-model";
import { assertActiveGlobalReferences, dependencyBindings, ownerTemplateReferences } from "./template-dependencies";
import type { StudioWorkspace } from "./editor-model";
import type { GlobalTemplateLibrary } from "./global-template-contract";

let queue: Promise<unknown> = Promise.resolve();
let originals: GlobalTemplateLibrary | null = null;
/** Serialise browser assignment writes with global removal under the existing writer. */
export function withTemplateReferenceWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.then(operation); queue = next.catch(() => {}); return next;
}
export function installGlobalReferenceLibrary(library: GlobalTemplateLibrary) { originals = copyTemplateData(library); }
export function assertBrowserGlobalReferences(store: TemplateStore) {
  if (originals) {
    const empty = { version: 26, documents: [], categories: [], bin: [], activeDocumentId: "" } as StudioWorkspace;
    assertActiveGlobalReferences(originals, ownerTemplateReferences({ owner: "drafts", templates: store, workspace: empty, bindings: [] }), dependencyBindings("drafts", store, originals));
  }
}

export function assertBrowserWorkspaceGlobalReferences(workspace: StudioWorkspace, templates: () => TemplateStore) {
  if (!originals || !workspace.bin.some(item => item.assignment)) return;
  assertActiveGlobalReferences(originals, workspace.bin.flatMap(item => item.assignment ? [item.assignment] : []), dependencyBindings("drafts", templates(), originals));
}
/** Block stale synchronous Bin writes while a removal waits for server acknowledgement. */
export function protectGlobalReferenceRemoval(next: TemplateStore) {
  if (!originals) return;
  originals = { ...originals, templates: { ...originals.templates, sets: originals.templates.sets.map(set => {
    const active = next.sets.find(item => item.id === set.id);
    return { ...set, templates: set.templates.filter(item => active?.templates.some(entry => entry.id === item.id)), parts: set.parts.filter(item => active?.parts.some(entry => entry.id === item.id)) };
  }) } };
}
