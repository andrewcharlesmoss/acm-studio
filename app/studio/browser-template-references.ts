import { loadTemplates } from "./template-store";
import { browserWorkspaceRepository } from "./workspace-repository";
import { ownerTemplateReferences, type TemplateReference } from "./template-dependencies";

export function currentBrowserTemplateReferences(): TemplateReference[] {
  const store = loadTemplates();
  const workspace = browserWorkspaceRepository.load();
  return ownerTemplateReferences({ owner: "drafts", workspace: workspace ?? { version: 26, documents: [], categories: [], bin: [], activeDocumentId: "" }, templates: store, bindings: [] });
}
