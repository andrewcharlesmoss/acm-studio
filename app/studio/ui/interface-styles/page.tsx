import type { Metadata } from "next";
import { StudioUiSectionHost } from "../studio-ui-section-host";
import { InterfaceStyleSandbox } from "../styles/interface-style-sandbox";

export const metadata: Metadata = { title: "Interface Styles · Studio UI Library", description: "Edit ACM Studio interface styles with shared production control previews." };

export default function StudioUiInterfaceStylesPage() {
  return <StudioUiSectionHost section="interface-styles"><InterfaceStyleSandbox /></StudioUiSectionHost>;
}
