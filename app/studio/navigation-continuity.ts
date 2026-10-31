import type { LocalFixtureSiteId } from "./test-site/sites";

export type NavigationDocumentPreview = {
  id: string;
  kind: "post" | "page";
  title: string;
  slug: string;
  status: string;
  pageOrder?: number;
};

export type NavigationTemplatePreview = { id: string; setId: string; name: string; kind: string };

export type StudioNavigationPreview = {
  documents: NavigationDocumentPreview[];
  templates: NavigationTemplatePreview[];
  libraryKind: "post" | "page" | "templates";
  templateCount: number | null;
  binCount: number;
};

// Route navigation remounts the editor pages. Keep only display data here so
// the shared navigation can stay populated while its new editor session loads.
const previews = new Map<LocalFixtureSiteId, StudioNavigationPreview>();

export function getStudioNavigationPreview(site: LocalFixtureSiteId) {
  return previews.get(site);
}

export function saveStudioNavigationPreview(site: LocalFixtureSiteId, preview: StudioNavigationPreview) {
  previews.set(site, {
    ...preview,
    documents: preview.documents.map(document => ({ ...document })),
    templates: preview.templates.map(template => ({ ...template })),
  });
}
