import type { Metadata } from "next";
import { PaneCatalogue } from "../../panes/pane-catalogue";
import { StudioUiLibrary } from "../studio-ui-library";

export const metadata: Metadata = { title: "Panes · Studio UI Library", description: "Explore reusable ACM Studio pane structures and examples." };

export default function StudioUiPanesPage() { return <StudioUiLibrary section="panes"><PaneCatalogue /></StudioUiLibrary>; }
