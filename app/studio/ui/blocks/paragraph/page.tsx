import type { Metadata } from "next";
import { BlockLibraryCatalogue } from "../block-specimen-catalogue";
import { StudioUiSectionHost } from "../../studio-ui-section-host";

export const metadata: Metadata = { title: "Paragraph · Studio UI Library", description: "Inspect the Paragraph block profile, production inspector, dependencies and isolated editing example." };

export default function StudioUiParagraphBlockPage() { return <StudioUiSectionHost section="blocks"><BlockLibraryCatalogue initialType="paragraph" /></StudioUiSectionHost>; }
