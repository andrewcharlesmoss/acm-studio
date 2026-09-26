import type { Metadata } from "next";
import { NavigationCatalogue } from "./navigation-catalogue";

export const metadata: Metadata = { title: "Navigation · Studio UI Library", description: "Explore the reusable top-level application section navigation component." };

export default function StudioUiNavigationPage() { return <NavigationCatalogue />; }
