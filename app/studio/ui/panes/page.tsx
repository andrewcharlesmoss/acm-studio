import type { Metadata } from "next";
import { PaneCatalogue } from "../../panes/pane-catalogue";
import { StudioUiSectionHost } from "../studio-ui-section-host";

export const metadata: Metadata = { title: "Panes · Studio UI Library", description: "Explore reusable ACM Studio pane structures and examples." };

export default function StudioUiPanesPage() { return <StudioUiSectionHost section="panes"><PaneCatalogue /></StudioUiSectionHost>; }
