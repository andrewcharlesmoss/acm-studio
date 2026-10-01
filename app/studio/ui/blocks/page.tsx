import type { Metadata } from "next";
import { BlockLibraryCatalogue } from "./block-specimen-catalogue";
import { StudioUiSectionHost } from "../studio-ui-section-host";

export const metadata: Metadata = { title: "Blocks · Studio UI Library", description: "Browse documented ACM Studio block definitions and interactive specimens." };

export default function StudioUiBlocksPage() {
  return <StudioUiSectionHost section="blocks"><BlockLibraryCatalogue initialType={null} /></StudioUiSectionHost>;
}
