import type { Metadata } from "next";
import { RibbonCatalogue } from "../../ribbon/ribbon-catalogue";
import { StudioUiLibrary } from "../studio-ui-library";

export const metadata: Metadata = { title: "Ribbon · Studio UI Library", description: "Inspect ACM Ribbon components and product examples." };

export default function StudioUiRibbonPage() { return <StudioUiLibrary section="ribbon"><RibbonCatalogue /></StudioUiLibrary>; }
