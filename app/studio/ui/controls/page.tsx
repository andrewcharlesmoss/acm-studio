import type { Metadata } from "next";
import { ControlsCatalogue } from "./controls-catalogue";
import { StudioUiSectionHost } from "../studio-ui-section-host";

export const metadata: Metadata = { title: "Controls · Studio UI Library", description: "Explore shared controls used by the ACM Studio inspector." };

export default function StudioUiControlsPage() { return <StudioUiSectionHost section="controls"><ControlsCatalogue /></StudioUiSectionHost>; }
