import type { Metadata } from "next";
import { WorkspaceCatalogue } from "./workspace-catalogue";
import { StudioUiSectionHost } from "./studio-ui-section-host";

export const metadata: Metadata = { title: "Studio UI Library", description: "Explore Navigation, Workspace, Ribbon, Panes, Panels, Icons and universal ACM Styles." };

export default function StudioUiLibraryPage() { return <StudioUiSectionHost section="workspace"><WorkspaceCatalogue /></StudioUiSectionHost>; }
