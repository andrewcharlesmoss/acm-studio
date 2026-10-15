import type { Metadata } from "next";
import { StudioUiSectionHost } from "../studio-ui-section-host";
import { WorkspaceCatalogue } from "../workspace-catalogue";

export const metadata: Metadata = { title: "Workspace · Studio UI Library", description: "Explore the shared Studio workspace composition specimen." };

export default function StudioUiWorkspacePage() {
  return <StudioUiSectionHost section="workspace"><WorkspaceCatalogue /></StudioUiSectionHost>;
}
