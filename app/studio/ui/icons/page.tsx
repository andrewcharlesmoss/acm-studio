import type { Metadata } from "next";
import { IconsCatalogue } from "../icons-catalogue";

export const metadata: Metadata = { title: "Icons · Studio UI Library", description: "Browse original ACM interface symbols at three scales." };

export default async function StudioUiIconsPage({ searchParams }: { searchParams: Promise<{ icon?: string | string[] }> }) {
  const params = await searchParams;
  return <IconsCatalogue initialIcon={Array.isArray(params.icon) ? params.icon[0] : params.icon} />;
}
