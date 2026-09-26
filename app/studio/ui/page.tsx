import type { Metadata } from "next";
import { WorkspaceCatalogue } from "./workspace-catalogue";

export const metadata: Metadata = { title: "Studio UI Library", description: "Explore the Workspace, Ribbon, Panes, Icons and universal ACM Styles." };

export default function StudioUiLibraryPage() { return <WorkspaceCatalogue />; }
