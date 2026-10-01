import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blockLibraryEntryByType } from "../../../blocks/library-catalogue";
import { BlockLibraryCatalogue, type BlockType } from "../block-specimen-catalogue";
import { StudioUiSectionHost } from "../../studio-ui-section-host";

type BlockPageProps = { params: Promise<{ type: string }> };

export async function generateMetadata({ params }: BlockPageProps): Promise<Metadata> {
  const { type } = await params;
  const entry = blockLibraryEntryByType[type as BlockType];
  return entry ? { title: `${entry.label} · Blocks · Studio UI Library`, description: entry.description } : { title: "Block · Studio UI Library" };
}

export default async function StudioUiBlockPage({ params }: BlockPageProps) {
  const { type } = await params;
  if (!(type in blockLibraryEntryByType) || type === "paragraph") notFound();
  return <StudioUiSectionHost section="blocks"><BlockLibraryCatalogue initialType={type as BlockType} /></StudioUiSectionHost>;
}
