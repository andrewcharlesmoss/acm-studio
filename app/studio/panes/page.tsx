import type { Metadata } from "next";
import { PaneCatalogue } from "./pane-catalogue";

export const metadata: Metadata = { title: "Pane Library", description: "Explore reusable pane skeletons and isolated ACM Studio examples." };

export default function PaneLibraryPage() { return <PaneCatalogue />; }
