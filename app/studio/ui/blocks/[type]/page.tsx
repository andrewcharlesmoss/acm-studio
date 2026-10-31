import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { blockContextEntryByType as blockLibraryEntryByType } from "../block-contexts";
import { BlockLibraryCatalogue, type BlockType } from "../block-specimen-catalogue";
import { StudioUiSectionHost } from "../../studio-ui-section-host";

type BlockPageProps = { params: Promise<{ type: string }> };
const legacyBlockRouteTypes = {
  divider: "separator",
  "reading-time": "time-to-read",
  content: "template-content",
  "document-title": "title",
  "post-author": "author-name",
  "document-subtitle": "subtitle",
  "social-linkedin": "social-icons",
  "social-tiktok": "social-icons",
} as const;

function canonicalBlockType(type: string): string {
  return legacyBlockRouteTypes[type as keyof typeof legacyBlockRouteTypes] ?? type;
}

export async function generateMetadata({ params }: BlockPageProps): Promise<Metadata> {
  const { type } = await params;
  const entry = blockLibraryEntryByType[canonicalBlockType(type) as BlockType];
  return entry ? { title: `${entry.label} · Blocks · Studio UI Library`, description: entry.description } : { title: "Block · Studio UI Library" };
}

export default async function StudioUiBlockPage({ params }: BlockPageProps) {
  const { type } = await params;
  const canonicalType = canonicalBlockType(type);
  if (!(canonicalType in blockLibraryEntryByType) || canonicalType === "paragraph") notFound();
  if (canonicalType !== type) redirect(`/studio/ui/blocks/${canonicalType}`);
  return <StudioUiSectionHost section="blocks"><BlockLibraryCatalogue initialType={canonicalType as BlockType} /></StudioUiSectionHost>;
}
