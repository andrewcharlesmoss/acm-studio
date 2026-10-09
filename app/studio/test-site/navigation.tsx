import type { StudioDocument } from "../editor-model";
import type { StudioPresentation } from "../studio-presentation";
import { testDocumentHref } from "./contract";
import { localFixtureName, type LocalFixtureSiteId } from "./sites";

/** Fixture navigation is site chrome, outside the editable document body. */
export function TestSiteNavigation({ siteId, documents, activeDocumentId, onSelectDocument }: {
  siteId: LocalFixtureSiteId;
  documents: StudioDocument[];
  activeDocumentId: string;
  onSelectDocument?: (document: StudioDocument) => void;
}) {
  if (documents.length < 2) return null;
  return <nav className="test-document-navigation" aria-label={`${localFixtureName(siteId)} content`}>
    {documents.map(document => <a key={document.id} data-test-link={document.id}
      href={onSelectDocument ? `/studio?site=${siteId}&documentId=${encodeURIComponent(document.id)}` : testDocumentHref(document.id)}
      aria-current={document.id === activeDocumentId ? "page" : undefined}
      onClick={onSelectDocument ? event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
        event.preventDefault();
        onSelectDocument(document);
      } : undefined}>{document.title || "Untitled"}</a>)}
  </nav>;
}

export function withTestSiteNavigation(presentation: StudioPresentation, siteId: LocalFixtureSiteId,
  documents: StudioDocument[], onSelectDocument: (document: StudioDocument) => void): StudioPresentation {
  return { ...presentation, renderDocument: (context, content) => <>
    <TestSiteNavigation siteId={siteId} documents={documents} activeDocumentId={context.document.id} onSelectDocument={onSelectDocument} />
    {presentation.renderDocument?.(context, content) ?? content}
  </> };
}
