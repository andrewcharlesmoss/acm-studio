import type { Metadata } from "next";
import { IconsCatalogue } from "../icons-catalogue";

export const metadata: Metadata = { title: "Icons and Symbols · Studio UI Library", description: "Browse original ACM icons and UK keyboard assets for websites and videos." };

export default async function StudioUiIconsPage({ searchParams }: { searchParams: Promise<{ icon?: string | string[]; collection?: string | string[] }> }) {
  const params = await searchParams;
  return <IconsCatalogue initialIcon={Array.isArray(params.icon) ? params.icon[0] : params.icon} collection={params.collection === "keyboard" ? "keyboard" : "icons"} />;
}
