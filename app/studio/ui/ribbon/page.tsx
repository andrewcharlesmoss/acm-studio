import type { Metadata } from "next";
import { RibbonCatalogue } from "../../ribbon/ribbon-catalogue";
import { StudioUiSectionHost } from "../studio-ui-section-host";

export const metadata: Metadata = { title: "Ribbon · Studio UI Library", description: "Inspect ACM Ribbon components and product examples." };

export default function StudioUiRibbonPage() { return <StudioUiSectionHost section="ribbon"><RibbonCatalogue /></StudioUiSectionHost>; }
