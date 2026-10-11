import { savedDocumentRevisions } from "./document-revisions";
import { studioWriteOwnership } from "./write-ownership";
import { LOCAL_WORKSPACE_KEY } from "../content/local-publishing";
import type { StudioWorkspace } from "./editor-model";
import { migrateStudioWorkspace, validateStudioWorkspace } from "./workspace-validation";
import { validateWorkspacePublicationTemplates } from "./template-model";

export interface WorkspaceRepository {
  load(): StudioWorkspace | null;
  save(workspace: StudioWorkspace): void;
}

/** History is saved with the repository transaction, rather than UI Undo snapshots. */
export function withSavedDocumentRevisions(workspace: StudioWorkspace): StudioWorkspace {
  const documentRevisions = browserWorkspaceRepository.load()?.documentRevisions ?? workspace.documentRevisions;
  return documentRevisions ? validateStudioWorkspace({ ...workspace, version: 25, documentRevisions }) : workspace;
}

export const browserWorkspaceRepository: WorkspaceRepository = {
  load() {
    const serialised = window.localStorage.getItem(LOCAL_WORKSPACE_KEY);
    if (serialised === null) return null;
    return validateWorkspacePublicationTemplates(migrateStudioWorkspace(JSON.parse(serialised)));
  },
  save(workspace) {
    studioWriteOwnership.assertWritable();
    const previous = browserWorkspaceRepository.load();
    const documentRevisions = savedDocumentRevisions(previous, workspace);
    const saved = validateWorkspacePublicationTemplates(validateStudioWorkspace({ ...workspace, version: 25, documentRevisions }));
    window.localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(saved));
  },
};
