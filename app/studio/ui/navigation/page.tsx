import type { Metadata } from "next";
import { NavigationCatalogue } from "./navigation-catalogue";
import { StudioUiSectionHost } from "../studio-ui-section-host";

export const metadata: Metadata = { title: "Navigation · Studio UI Library", description: "Explore the reusable top-level application section navigation component." };

export default function StudioUiNavigationPage() { return <StudioUiSectionHost section="navigation"><NavigationCatalogue /></StudioUiSectionHost>; }
