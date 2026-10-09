import type { StudioDocument } from "../editor-model";
import type { StudioPresentation } from "../studio-presentation";
import { TemplateNodes, TemplateSurface, TemplatePartRegion } from "../template-renderer";
import { safeTextLink } from "../../content/rich-text";
import { navigationLinkRel } from "../navigation-items";
import { testDocumentHref, type TestSiteCollection } from "./contract";

/** A real shared template part owns the menu, independently of document bodies. */
export function TestSiteNavigation({ site, document, editing = false, onEdit, onSelectDocument }: {
  site: TestSiteCollection;
  document: StudioDocument;
  editing?: boolean;
  onEdit?: (setId: string, partId: string) => void;
  onSelectDocument?: (document: StudioDocument) => void;
}) {
  const set = site.templates.sets.find(set => set.id === site.siteNavigation.setId);
  const part = set?.parts.find(part => part.id === site.siteNavigation.partId);
  if (!set || !part || !editing && !part.nodes.some(node => !node.editorial?.hidden)) return null;
  return <div className="test-document-navigation"><TemplateSurface set={set} editing={editing} editorCanvas={editing}>
    <TemplatePartRegion part={part} onEditPart={editing && onEdit ? partId => onEdit(set.id, partId) : undefined}>
      <TemplateNodes set={set} nodes={part.nodes} document={document} documentHref={testDocumentHref(document.id)}
        renderNavigationLink={link => {
          const target = site.documents.find(document => testDocumentHref(document.id) === link.url);
          // Dynamic rel adds noopener and noreferrer whenever the link opens in a new tab.
          // eslint-disable-next-line react/jsx-no-target-blank
          return <a key={link.id} href={safeTextLink(link.url) ?? undefined} data-test-link={target?.id}
            target={link.opensInNewTab ? "_blank" : undefined} rel={navigationLinkRel(link)} title={link.description || undefined}
            aria-current={target?.id === document.id ? "page" : undefined}
            onClick={editing && onEdit || onSelectDocument && target ? event => {
              if (event.defaultPrevented || link.opensInNewTab || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
              event.preventDefault();
              if (editing) onEdit?.(set.id, part.id); else if (target) onSelectDocument?.(target);
            } : undefined}>{link.label}</a>;
        }} />
    </TemplatePartRegion>
  </TemplateSurface></div>;
}

export function withTestSiteNavigation(presentation: StudioPresentation, site: TestSiteCollection,
  onSelectDocument: (document: StudioDocument) => void, onEdit: (setId: string, partId: string) => void): StudioPresentation {
  return { ...presentation, renderDocument: (context, content) => <>
    <TestSiteNavigation site={site} document={context.document} editing={context.mode === "edit"} onEdit={onEdit} onSelectDocument={onSelectDocument} />
    {presentation.renderDocument?.(context, content) ?? content}
  </> };
}
