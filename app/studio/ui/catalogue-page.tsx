import type { Metadata } from "next";
import { GlobalCatalogue } from "./global-catalogue";
import { StudioUiSectionHost } from "./studio-ui-section-host";

export const metadata: Metadata = { title: "Catalogue · Studio UI Library", description: "Search and preview shared components and specimens across the complete ACM Studio UI Library." };

export default function StudioUiCataloguePage() {
  return <StudioUiSectionHost section="catalogue"><GlobalCatalogue /></StudioUiSectionHost>;
}
