import { readPublicationWorkspace } from "../content/publication-recovery";
import { loadTemplates } from "./template-store";
import { assertBrowserWorkspaceGlobalReferences } from "./template-reference-gate";
import { savedDocumentRevisions } from "./document-revisions";
import { studioWriteOwnership } from "./write-ownership";
import { LOCAL_WORKSPACE_KEY } from "../content/local-publishing";
import { WORKSPACE_VERSION, type StudioWorkspace } from "./editor-model";
import { migrateStudioWorkspace, validateStudioWorkspace } from "./workspace-validation";
import { validateWorkspacePublicationTemplates } from "./template-model";

export interface WorkspaceRepository {
  load(): StudioWorkspace | null;
  save(workspace: StudioWorkspace): void;
}

/** History is saved with the repository transaction, rather than UI Undo snapshots. */
export function withSavedDocumentRevisions(workspace: StudioWorkspace): StudioWorkspace {
  const documentRevisions = browserWorkspaceRepository.load()?.documentRevisions ?? workspace.documentRevisions;
  return documentRevisions ? validateStudioWorkspace({ ...workspace, version: WORKSPACE_VERSION, documentRevisions }) : workspace;
}

export const browserWorkspaceRepository: WorkspaceRepository = {
  load() {
    const serialised = readPublicationWorkspace(window.localStorage);
    if (serialised === null) return null;
    return validateWorkspacePublicationTemplates(migrateStudioWorkspace(JSON.parse(serialised)));
  },
  save(workspace) {
    window.localStorage.setItem(LOCAL_WORKSPACE_KEY, serialiseWorkspaceForSave(workspace));
  },
};

export function serialiseWorkspaceForSave(workspace: StudioWorkspace) {
  studioWriteOwnership.assertWritable();
  assertBrowserWorkspaceGlobalReferences(workspace, loadTemplates);
  const previous = browserWorkspaceRepository.load();
  const documentRevisions = savedDocumentRevisions(previous, workspace);
  const saved = validateWorkspacePublicationTemplates(validateStudioWorkspace({ ...workspace, version: WORKSPACE_VERSION, documentRevisions }));
  return JSON.stringify(saved);
}
