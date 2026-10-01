import type { Metadata } from "next";
import { StyleGuideSandbox } from "./style-guide-sandbox";
import { StudioUiSectionHost } from "../studio-ui-section-host";

export const metadata: Metadata = { title: "Styles · Studio UI Library", description: "Explore the universal ACM visual style preset in an interactive preview sandbox." };

export default function StudioUiStylesPage() {
  return <StudioUiSectionHost section="styles"><StyleGuideSandbox /></StudioUiSectionHost>;
}
