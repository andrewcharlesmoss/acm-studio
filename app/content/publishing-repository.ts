import { prepareLocalPublication, prepareLocalWithdrawal, publishDocumentLocally, unpublishDocumentLocally } from "./local-publishing";
import { commitLocalPublication } from "./publication-recovery";
import type { StudioDocument, StudioWorkspace } from "../studio/editor-model";
import { serialiseWorkspaceForSave } from "../studio/workspace-repository";
import { studioWriteOwnership } from "../studio/write-ownership";
import { loadTemplates } from "../studio/template-store";
import { resolveTemplate, type PublicationPresentation } from "../studio/template-model";

/** False means both records committed, but recovery-record cleanup needs retry. */
export interface PublishingRepository {
  publish(document: StudioDocument, presentation?: PublicationPresentation, workspace?: StudioWorkspace): boolean | void;
  unpublish(documentId: string, workspace?: StudioWorkspace): boolean | void;
}

function commit(workspace: StudioWorkspace, publication: object) {
  const token = studioWriteOwnership.captureWriteToken();
  const serialised = serialiseWorkspaceForSave(workspace);
  try {
    return commitLocalPublication(window.localStorage, serialised, publication, () => studioWriteOwnership.canWrite(token));
  } catch (error) {
    if (error instanceof AggregateError) studioWriteOwnership.blockForRecovery();
    throw error;
  }
}

export const browserPublishingRepository: PublishingRepository = {
  publish(document, presentation, workspace) {
    const template = presentation ? presentation.templateSnapshot : () => resolveTemplate(loadTemplates(), document);
    if (!workspace) { publishDocumentLocally(document, template, presentation?.fallbackHeader); return; }
    return commit(workspace, prepareLocalPublication(document, template, presentation?.fallbackHeader));
  },
  unpublish(documentId, workspace) {
    if (!workspace) { unpublishDocumentLocally(documentId); return; }
    return commit(workspace, prepareLocalWithdrawal(documentId));
  },
};
