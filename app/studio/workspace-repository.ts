import { studioWriteOwnership } from "./write-ownership";
import { LOCAL_WORKSPACE_KEY } from "../content/local-publishing";
import type { StudioWorkspace } from "./editor-model";
import { validateStudioWorkspace } from "./workspace-validation";

export interface WorkspaceRepository {
  load(): StudioWorkspace | null;
  save(workspace: StudioWorkspace): void;
}

export const browserWorkspaceRepository: WorkspaceRepository = {
  load() {
    const serialised = window.localStorage.getItem(LOCAL_WORKSPACE_KEY);
    if (serialised === null) return null;
    return validateStudioWorkspace(JSON.parse(serialised));
  },
  save(workspace) {
    studioWriteOwnership.assertWritable();
    window.localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(validateStudioWorkspace(workspace)));
  },
};
