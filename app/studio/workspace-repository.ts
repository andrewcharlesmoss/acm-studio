import { LOCAL_WORKSPACE_KEY } from "../content/local-publishing";
import type { StudioWorkspace } from "./editor-model";

export interface WorkspaceRepository {
  load(): StudioWorkspace | null;
  save(workspace: StudioWorkspace): void;
}

export const browserWorkspaceRepository: WorkspaceRepository = {
  load() {
    const serialised = window.localStorage.getItem(LOCAL_WORKSPACE_KEY);
    if (!serialised) return null;
    const parsed = JSON.parse(serialised) as StudioWorkspace;
    return parsed?.version === 2 && Array.isArray(parsed.documents) && parsed.documents.length ? parsed : null;
  },
  save(workspace) {
    window.localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(workspace));
  },
};
