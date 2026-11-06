import { SiteEditorPreview } from "./site-editor-preview";
import { isLocalFixtureSiteId } from "../test-site/sites";
export const metadata = { title: "Site Editor" };
export const dynamic = "force-dynamic";
export default async function SiteEditorPage({ searchParams }: { searchParams: Promise<{ site?: string | string[]; documentId?: string | string[]; library?: string | string[]; section?: string | string[] }> }) {
  const { site, documentId, library, section } = await searchParams;
  const libraryKind = library === "post" || library === "templates" ? library : "page";
  return <SiteEditorPreview initialScope={isLocalFixtureSiteId(site) || site === "global" ? site : "test"} initialDocumentId={typeof documentId === "string" ? documentId : undefined} initialLibraryKind={libraryKind} initialDesignView={section === "design"} initialSection={section === "patterns" ? "Patterns" : section === "templates" ? "Templates" : undefined} />;
}
