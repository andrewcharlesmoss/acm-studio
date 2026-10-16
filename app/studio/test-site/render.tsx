import { responsiveBlockCss } from "../../content/responsive-styles";
import { localPublicationScript } from "./publication-runtime";
import { StudioIcon } from "../studio-icons";
import { ExistingSiteBody } from "./existing-presentation";
import { effectiveGlobalTemplates, migrateGlobalTemplateBindings, sharedHeaderReference, templateContainsHeader, type GlobalTemplateLibrary } from "../global-template-contract";
export { assertGlobalTemplateRemoval } from "../global-template-deletion";
export { assertActiveGlobalReferences, ownerTemplateReferences } from "../template-dependencies";
export { fixtureTemplateDependencySnapshot } from "./template-dependencies";
export { createGlobalTemplateLibrary, validateGlobalTemplateLibrary } from "../global-template-contract";
export { testSiteCollection } from "./contract";
import { localFixtureName } from "./sites";
import { renderToStaticMarkup } from "react-dom/server";
import { BlockRenderer } from "../../components/blocks/block-renderer";
import { testSiteCollection, testDocumentHref, type TestSiteDocument } from "./contract";
import { resolveTemplate } from "../template-model";
import { resolveDocumentFields, resolveDocumentDisplay } from "../document-fields";
import { TemplateDocument } from "../template-renderer";
import { TestSiteNavigation } from "./navigation";
import { templateNavigationScript } from "../navigation-runtime";
export { validTestSiteDocument } from "./contract";

import { testSiteCss } from "./style";
import studioBlockCss from "../studio.css?raw";
import contentCss from "../../globals.css?raw";
import groupLayoutCss from "../../content/group-layout.css?raw";
import buttonsCss from "../../content/buttons.css?raw";
import featuredImageCss from "../../content/featured-image.css?raw";
import templateCss from "../templates.css?raw";

// Static, data-free routing: untrusted hashes are compared with DOM attributes,
// never interpolated into selectors, HTML or script source.
const routingScript = `(()=>{const pages=Array.from(document.querySelectorAll('[data-test-document]'));const fallback=document.querySelector?.('[data-test-home-unavailable]');function eligibleHome(){return pages.find(page=>page.dataset.testHome==='true'&&page.dataset.testAvailable!=='false')||fallback;}const initial=pages.find(page=>page.dataset.testInitial==='true')||eligibleHome();function show(){const home=eligibleHome();const hash=location.hash;let id;try{if(hash.startsWith('#document='))id=decodeURIComponent(hash.slice(10));}catch{}const active=hash.startsWith('#document=')?pages.find(page=>page.dataset.testDocument===id&&page.dataset.testAvailable!=='false')||home:hash?pages.find(page=>!page.hidden)||home:initial===fallback?home:initial;for(const page of pages)page.hidden=page!==active;if(fallback)fallback.hidden=active!==fallback;document.title=active?.dataset.testTitle||home?.dataset.testTitle||'';for(const link of document.querySelectorAll('[data-test-link]')){if(link.dataset.testLink===active?.dataset.testDocument)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}}addEventListener('hashchange',show);show();})();`;
// srcdoc inherits Studio's base URL. Keep fixture links inside this isolated
// document rather than loading the Studio homepage into the preview frame.
const previewRoutingScript = `let previewHash = '';
document.addEventListener('click', event => {
  const link = event.target instanceof Element ? event.target.closest('a') : null;
  const href = link?.getAttribute('href');
  const hash = href === '/' ? '#document=' + document.querySelector('[data-test-home=true]')?.dataset.testDocument
    : href?.startsWith('/#') ? href.slice(1) : href;
  if (!hash?.startsWith('#') || link?.target === '_blank' || event.defaultPrevented || event.button !== 0
    || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  event.preventDefault();
  previewHash = hash;
  dispatchEvent(new Event('hashchange'));
  if (!hash.startsWith('#document=')) {
    try { document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView(); } catch {}
  }
});`;
export function renderTestSite(document: TestSiteDocument, revision: string, initialDocumentId?: string, globals?: GlobalTemplateLibrary, globalRevision?: string) {
  const source = testSiteCollection(document);
  const site = globals ? { ...source, templates: effectiveGlobalTemplates(source.templates, globals, source.globalTemplates ?? migrateGlobalTemplateBindings(source.templates, globals, source.siteId)) } : source;
  // Explicit editor preview remains a draft preview; the generated site uses publications.
  const publications = (source.version === 6 || (source.version === 7 || source.version === 8)) && initialDocumentId === undefined ? source.publications.filter(item => source.documents.some(document => document.id === item.document.id) && (source.version === 6 || item.document.status === "published" || item.document.status === "scheduled")) : null;
  const displayedDocuments = publications ? publications.map(item => item.document) : site.documents;
  const displayTemplates = publications ? { ...site.templates, assignments: publications.flatMap(item => item.assignment ? [item.assignment] : []), defaultTemplateIds: {} } : site.templates;
  const initialId = initialDocumentId !== undefined && displayedDocuments.some(page => page.id === initialDocumentId) ? initialDocumentId : site.homeDocumentId;
  const headerReference = globals ? sharedHeaderReference(site.templates, globals, source.globalTemplates ?? migrateGlobalTemplateBindings(source.templates, globals, source.siteId)) : undefined;
  const siteName = localFixtureName(site.siteId);
  const body = renderToStaticMarkup(<>
    {publications ? <main data-test-home-unavailable data-test-title={siteName} className="test-site-page" hidden><h1>No published home page</h1><p>The home page is not currently available in this local preview.</p><TestSiteNavigation site={site} headerReference={headerReference} document={site.documents.find(page => page.id === site.homeDocumentId)!} /></main> : null}
    {displayedDocuments.map(page => {
      const snapshot = resolveTemplate(displayTemplates, page);
      const template = snapshot?.set.templates.find(item => item.id === snapshot.templateId);
      const fields = resolveDocumentFields(page, snapshot?.set, template?.defaults);
      const resolved = { ...page, ...fields, displayOverrides: resolveDocumentDisplay(page, template) };
      const content = <BlockRenderer blocks={resolved.blocks} document={resolved} documentHref={testDocumentHref(page.id)} variant="studio" />;
      const protectedPreview = publications && page.passwordProtection;
      const scheduledPreview = publications && page.status === "scheduled" ? page.publishAt ?? page.publishedAt : undefined;
      const renderedBody = <>{!snapshot || !template || !templateContainsHeader(template.nodes, snapshot.set) ? <TestSiteNavigation site={site} headerReference={headerReference} document={resolved} /> : null}
        {snapshot ? <TemplateDocument snapshot={snapshot} document={resolved} documentHref={testDocumentHref(page.id)} content={content} /> : <div className="test-site-page">{page.id !== site.homeDocumentId ? <h1 tabIndex={-1} data-test-publication-heading>{page.title}</h1> : null}<ExistingSiteBody document={resolved} /></div>}</>;
      return <section key={page.id} tabIndex={-1} data-test-available={scheduledPreview ? String(Date.parse(scheduledPreview) <= Date.now()) : "true"} data-test-scheduled-at={scheduledPreview} data-test-locked={protectedPreview ? "true" : undefined} data-test-password-salt={protectedPreview?.salt} data-test-password-hash={protectedPreview?.hash} data-test-document={page.id} data-test-home={page.id === site.homeDocumentId ? "true" : "false"} data-test-title={page.title || siteName} data-test-initial={initialDocumentId && page.id === initialId ? "true" : undefined} hidden={page.id !== initialId}>
        {scheduledPreview ? <div data-test-schedule-notice className="test-site-page"><h1>{page.title}</h1><p>This local preview is scheduled for <time dateTime={scheduledPreview}>{scheduledPreview}</time>.</p></div> : null}
        {protectedPreview ? <div data-test-password-gate className="local-password-gate" hidden={Boolean(scheduledPreview && Date.parse(scheduledPreview) > Date.now())}><h1>{page.title}</h1><p>Enter the password to view this local {page.kind} preview.</p><form data-test-password-form><label htmlFor={`password-${page.id}`}>Password</label><div className="local-password-input"><input id={`password-${page.id}`} type="password" autoComplete="current-password" maxLength={256} required /><button type="button" data-test-password-toggle aria-label="Show password" title="Show password" aria-pressed="false"><span data-test-password-show><StudioIcon name="seen" size={18} /></span><span data-test-password-hide hidden><StudioIcon name="seen-off" size={18} /></span></button></div><p role="alert" /><button type="submit">View {page.kind}</button><small>This password gate applies only to the local preview. It does not secure a hosted page.</small></form></div> : null}
        {protectedPreview || scheduledPreview ? <template data-test-publication-body>{renderedBody}</template> : renderedBody}
      </section>;
    })}
  </>);
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="acm-test-revision" content="${revision}">${globals ? `<meta name="acm-global-template-revision" content="${globalRevision ?? "current-draft"}">` : ""}<meta name="theme-color" content="#f2f2f7"><title>${siteName}</title><style>html{font-size:100%}body{margin:0}${contentCss.replace(/@import[^;]+;/g, "")}${studioBlockCss}${groupLayoutCss}${buttonsCss}${featuredImageCss}${templateCss}${testSiteCss}${responsiveBlockCss}body [hidden]{display:none!important}</style></head><body>${body}<script>${publications ? localPublicationScript() : ""}${templateNavigationScript}${initialDocumentId ? previewRoutingScript + routingScript.replace("const hash=location.hash;", "const hash=previewHash;") : routingScript}</script></body></html>`;
}
