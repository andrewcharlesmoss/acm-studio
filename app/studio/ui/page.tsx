import type { Metadata } from "next";
import { WorkspaceCatalogue } from "./workspace-catalogue";

export const metadata: Metadata = { title: "Studio UI Library", description: "Explore Navigation, Workspace, Ribbon, Panes, Icons and universal ACM Styles." };

export default function StudioUiLibraryPage() { return <WorkspaceCatalogue />; }
