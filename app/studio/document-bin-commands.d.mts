import type { StudioBinnedDocument, StudioWorkspace } from "./editor-model";
import type { TemplateStore } from "./template-model";

export function moveFixtureDocumentsToBin(
  workspace: StudioWorkspace,
  templates: TemplateStore,
  documentIds: string[],
  options?: { protectedDocumentIds?: string[]; createId?: () => string; now?: () => string },
): { workspace: StudioWorkspace; templates: TemplateStore; moved: StudioBinnedDocument[] };

export function restoreFixtureDocumentsFromBin(
  workspace: StudioWorkspace,
  templates: TemplateStore,
  binIds: string[],
): { workspace: StudioWorkspace; templates: TemplateStore; restored: StudioWorkspace["documents"] };
