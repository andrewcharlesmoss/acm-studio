import type { Metadata } from "next";
import { StudioPrototype } from "./studio-prototype";

export const metadata: Metadata = {
  title: "Studio block editor",
  description: "The local page and post editor for the Andrew Charles Moss publishing foundation.",
};

export const dynamic = "force-dynamic";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ preview?: string | string[]; documentId?: string | string[]; viewport?: string | string[]; template?: string | string[]; site?: string | string[] }> }) {
  const query = await searchParams;
  const preview = Array.isArray(query.preview) ? query.preview[0] : query.preview;
  const documentId = Array.isArray(query.documentId) ? query.documentId[0] : query.documentId;
  const viewport = Array.isArray(query.viewport) ? query.viewport[0] : query.viewport;
  const template = Array.isArray(query.template) ? query.template[0] : query.template;
  return <StudioPrototype initialView={{
    preview: preview === "1",
    site: query.site === "test" ? "test" : null,
    documentId: documentId ?? null,
    viewport: viewport === "tablet" || viewport === "mobile" ? viewport : "desktop",
    showTemplate: template !== "0",
  }} />;
}
