import type { Metadata } from "next";
import { StudioUiSectionHost } from "../studio-ui-section-host";
import { WorkspaceCatalogue } from "../workspace-catalogue";

export const metadata: Metadata = { title: "Workspace · Studio UI Library", description: "Explore shared Studio workspace compositions and the block editor playground." };

export default function StudioUiWorkspacePage() {
  return <StudioUiSectionHost section="workspace"><WorkspaceCatalogue /></StudioUiSectionHost>;
}
