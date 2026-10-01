import type { Metadata } from "next";
import { PanelCatalogue } from "./panel-catalogue";
import { StudioUiSectionHost } from "../studio-ui-section-host";

export const metadata: Metadata = {
  title: "Panels · Studio UI Library",
  description: "Explore the shared ACM card panel and its content slots.",
};

export default function StudioUiPanelsPage() {
  return <StudioUiSectionHost section="panels"><PanelCatalogue /></StudioUiSectionHost>;
}
