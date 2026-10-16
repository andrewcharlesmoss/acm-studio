import { resolveTemplate, type TemplateStore } from "../template-model";
import { templateContainsHeader } from "../global-template-contract";
import type { StudioDocument } from "../editor-model";
import type { StudioPresentation } from "../studio-presentation";
import { TemplateNodes, TemplateSurface, TemplatePartRegion } from "../template-renderer";
import { safeTextLink } from "../../content/rich-text";
import { navigationLinkRel } from "../navigation-items";
import { testDocumentHref, type TestSiteCollection } from "./contract";

/** A real shared template part owns the menu, independently of document bodies. */
export function TestSiteNavigation({ site, document, editing = false, onEdit, onSelectDocument, headerReference, suppressInherited = false, mediaUrls }: {
  site: Pick<TestSiteCollection, "templates" | "siteNavigation" | "documents">;
  headerReference?: { setId: string; partId: string };
  suppressInherited?: boolean;
  mediaUrls?: Record<string, string>;
  document: StudioDocument;
  editing?: boolean;
  onEdit?: (setId: string, partId: string) => void;
  onSelectDocument?: (document: StudioDocument) => void;
}) {
  if (suppressInherited) {
    const snapshot = resolveTemplate(site.templates, document);
    const template = snapshot?.set.templates.find(item => item.id === snapshot.templateId);
    if (snapshot && template && templateContainsHeader(template.nodes, snapshot.set)) return null;
  }
  const reference = headerReference ?? site.siteNavigation;
  const set = site.templates.sets.find(set => set.id === reference.setId);
  const part = set?.parts.find(part => part.id === reference.partId);
  if (!set || !part || !editing && !part.nodes.some(node => !node.editorial?.hidden)) return null;
  return <div className="test-document-navigation"><TemplateSurface set={set} editing={editing} editorCanvas={editing}>
    <TemplatePartRegion part={part} onEditPart={editing && onEdit ? partId => onEdit(set.id, partId) : undefined}>
      <TemplateNodes mediaUrls={mediaUrls} set={set} nodes={part.nodes} document={document} documentHref={testDocumentHref(document.id)}
        renderNavigationLink={link => {
          const target = site.documents.find(document => testDocumentHref(document.id) === link.url);
          // Dynamic rel adds noopener and noreferrer whenever the link opens in a new tab.
          // Edit deliberately uses a non-interactive HTML placeholder anchor to retain
          // inherited link presentation without exposing a destination or button action.
          // eslint-disable-next-line react/jsx-no-target-blank, jsx-a11y/anchor-is-valid
          return <a key={link.id} href={editing ? undefined : safeTextLink(link.url) ?? undefined} data-test-link={target?.id}
            target={link.opensInNewTab ? "_blank" : undefined} rel={navigationLinkRel(link)} title={link.description || undefined}
            aria-current={target?.id === document.id ? "page" : undefined}
            onClick={editing || onSelectDocument && target ? event => {
              // Inherited links are presentation in Edit; the explicit Edit Navigation
              // control opens menu authoring without changing the selected document.
              if (editing) { event.preventDefault(); return; }
              if (event.defaultPrevented || link.opensInNewTab || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
              event.preventDefault();
              if (target) onSelectDocument?.(target);
            } : undefined}>{link.label}</a>;
        }} />
    </TemplatePartRegion>
  </TemplateSurface></div>;
}

export function withTestSiteNavigation(presentation: StudioPresentation, site: TestSiteCollection,
  onSelectDocument: (document: StudioDocument) => void, onEdit: (setId: string, partId: string) => void, headerReference?: { setId: string; partId: string }, templates?: TemplateStore): StudioPresentation {
  return { ...presentation, renderDocument: (context, content) => <div style={{ display: "contents" }} onClickCapture={event => {
    const link = (event.target as Element).closest<HTMLAnchorElement>(".template-navigation a[href]");
    if (!link || context.mode === "edit" || link.target === "_blank" || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const target = site.documents.find(document => testDocumentHref(document.id) === link.getAttribute("href"));
    if (target) { event.preventDefault(); onSelectDocument(target); }
  }}>
    <TestSiteNavigation site={templates ? { ...site, templates } : site} headerReference={headerReference} suppressInherited={Boolean(headerReference)} document={context.document} editing={context.mode === "edit"} onEdit={onEdit} onSelectDocument={onSelectDocument} />
    {presentation.renderDocument?.(context, content) ?? content}
  </div> };
}
