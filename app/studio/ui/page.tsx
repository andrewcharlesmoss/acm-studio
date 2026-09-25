import type { Metadata } from "next";
import { WorkspaceCatalogue } from "./workspace-catalogue";

export const metadata: Metadata = { title: "Studio UI Library", description: "Explore the Ribbon, panes and shared ACM interface icons together." };

export default function StudioUiLibraryPage() { return <WorkspaceCatalogue />; }
