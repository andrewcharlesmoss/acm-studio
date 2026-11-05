import { compileSavedWebsiteCss } from "../site-editor/additional-css";
import { WebsiteDesignSurface } from "../site-editor/website-design-surface";
import { fixtureWebsiteDesign } from "../site-editor/website-design";
import type { HostedSitePreview } from "../site-editor/hosted-home-contract";
import type { GlobalTemplateLibrary } from "../global-template-contract";
import { isNavigationSpacer, resolveTemplate, type TemplateStore } from "../template-model";
import { templateContainsHeader } from "../global-template-contract";
import type { StudioDocument } from "../editor-model";
import type { StudioPresentation } from "../studio-presentation";
import { TemplateNodes, TemplateSurface, TemplatePartRegion } from "../template-renderer";
import { safeTextLink } from "../../content/rich-text";
import { navigationLinkRel } from "../navigation-items";
import { navigationPageListLinks } from "../navigation-page-list";
import { fixtureNavigationSearchEntries } from "../navigation-search";
import { testDocumentHref, type SiteNavigationAssignment, type SiteNavigationMenu, type TestSiteCollection } from "./contract";

/** A real shared template part owns the menu, independently of document bodies. */
export function TestSiteNavigation({ site, document, editing = false, onEdit, onSelectDocument, onSelectPart, headerReference, suppressInherited = false, mediaUrls, pageListDocuments }: {
  site: Pick<TestSiteCollection, "templates" | "siteNavigation" | "documents"> & { homeDocumentId?: string; navigationMenus?: SiteNavigationMenu[]; defaultNavigationMenuId?: string; navigationAssignments?: SiteNavigationAssignment[] };
  headerReference?: { setId: string; partId: string };
  suppressInherited?: boolean;
  mediaUrls?: Record<string, string>;
  pageListDocuments?: StudioDocument[];
  document: StudioDocument;
  editing?: boolean;
  onEdit?: (setId: string, partId: string) => void;
  onSelectPart?: () => void;
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
  const navigationMenuLinks = (node: import("../template-model").NavigationTemplateNode) => {
    const assignedId = site.navigationAssignments?.find(item => item.navigationId === node.id)?.menuId ?? site.defaultNavigationMenuId;
    return site.navigationMenus?.find(item => item.id === assignedId)?.links ?? set.navigation;
  };
  return <div className="test-document-navigation"><TemplateSurface set={set} editing={editing} editorCanvas={editing}>
    <TemplatePartRegion part={part} onEditPart={editing && onEdit ? partId => onEdit(set.id, partId) : undefined} onSelectPart={editing ? onSelectPart : undefined}>
      <TemplateNodes mediaUrls={mediaUrls} set={set} nodes={part.nodes} document={document} documentHref={testDocumentHref(document.id)} navigationMenuLinks={navigationMenuLinks} navigationPageListLinks={() => navigationPageListLinks(pageListDocuments ?? site.documents, page => testDocumentHref(page.id))} navigationSearchEntries={() => fixtureNavigationSearchEntries(site.documents, page => testDocumentHref(page.id), { includeDrafts: editing })}
        renderNavigationLink={link => {
          if (isNavigationSpacer(link)) return null;
          const target = link.homeLink ? site.documents.find(document => document.id === site.homeDocumentId) : site.documents.find(document => testDocumentHref(document.id) === link.url);
          const href = link.homeLink ? testDocumentHref(site.homeDocumentId ?? site.documents[0]?.id ?? "") : link.url;
          // Dynamic rel adds noopener and noreferrer whenever the link opens in a new tab.
          // Edit deliberately uses a non-interactive HTML placeholder anchor to retain
          // inherited link presentation without exposing a destination or button action.
          // eslint-disable-next-line react/jsx-no-target-blank, jsx-a11y/anchor-is-valid
          return <a key={link.id} href={editing ? undefined : safeTextLink(href) ?? undefined} data-test-link={target?.id}
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
  onSelectDocument: (document: StudioDocument) => void, onEdit: (setId: string, partId: string) => void, headerReference?: { setId: string; partId: string }, templates?: TemplateStore, globals?: GlobalTemplateLibrary | null, hostedPreview?: HostedSitePreview | null): StudioPresentation {
  const design = hostedPreview?.design ?? fixtureWebsiteDesign(site,globals?.websiteDesignDefaults);
  const previewSite = hostedPreview ? { ...site, navigationMenus: hostedPreview.navigation.menus, defaultNavigationMenuId: hostedPreview.navigation.defaultMenuId, navigationAssignments: hostedPreview.navigation.assignments } : site;
  const imageUrl = (src: string) => src.startsWith("blob:") ? src : `/__studio/site-media/${site.siteId}/${src.slice(7)}`;
  const wrap = (content: React.ReactNode) => design ? <WebsiteDesignSurface design={design} legacy={design.legacy} referenceDefaults imageUrl={imageUrl} compiledCss={compileSavedWebsiteCss(design.styles.additionalCss ?? "").css}>{content}</WebsiteDesignSurface> : content;
  return { ...presentation, ...(design ? { websiteDesignContext: { design, imageUrl } } : {}), renderDocument: (context, content) => wrap(<div style={{ display: "contents" }} onClickCapture={event => {
    const link = (event.target as Element).closest<HTMLAnchorElement>(".template-navigation a[href]");
    if (!link || context.mode === "edit" || link.target === "_blank" || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const target = site.documents.find(document => testDocumentHref(document.id) === link.getAttribute("href"));
    if (target) { event.preventDefault(); onSelectDocument(target); }
  }}>
    <TestSiteNavigation site={templates ? { ...previewSite, templates } : previewSite} headerReference={headerReference} suppressInherited={Boolean(headerReference)} document={context.document} editing={context.mode === "edit"} onEdit={onEdit} onSelectPart={context.onClearBlockSelection} onSelectDocument={onSelectDocument} />
    {presentation.renderDocument?.(context, content) ?? content}
  </div>) };
}
