import { effectiveGlobalTemplates, migrateGlobalTemplateBindings, type GlobalTemplateLibrary } from "../global-template-contract";
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
const routingScript = `(()=>{const pages=Array.from(document.querySelectorAll('[data-test-document]'));const home=pages.find(page=>page.dataset.testHome==='true');const initial=pages.find(page=>page.dataset.testInitial==='true')||home;function show(){const hash=location.hash;let id;try{if(hash.startsWith('#document='))id=decodeURIComponent(hash.slice(10));}catch{}const active=hash.startsWith('#document=')?pages.find(page=>page.dataset.testDocument===id)||home:hash?pages.find(page=>!page.hidden)||initial:initial;for(const page of pages)page.hidden=page!==active;document.title=active?.dataset.testTitle||home?.dataset.testTitle||'';for(const link of document.querySelectorAll('[data-test-link]')){if(link.dataset.testLink===active?.dataset.testDocument)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}}addEventListener('hashchange',show);show();})();`;
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
  const publications = source.version === 6 && initialDocumentId === undefined ? source.publications.filter(item => source.documents.some(document => document.id === item.document.id)) : null;
  const displayedDocuments = publications ? publications.map(item => item.document) : site.documents;
  const displayTemplates = publications ? { ...site.templates, assignments: publications.flatMap(item => item.assignment ? [item.assignment] : []), defaultTemplateIds: {} } : site.templates;
  const initialId = initialDocumentId !== undefined && displayedDocuments.some(page => page.id === initialDocumentId) ? initialDocumentId : site.homeDocumentId;
  const siteName = localFixtureName(site.siteId);
  const body = renderToStaticMarkup(<>
    {displayedDocuments.map(page => {
      const snapshot = resolveTemplate(displayTemplates, page);
      const template = snapshot?.set.templates.find(item => item.id === snapshot.templateId);
      const fields = resolveDocumentFields(page, snapshot?.set, template?.defaults);
      const resolved = { ...page, ...fields, displayOverrides: resolveDocumentDisplay(page, template) };
      const content = <BlockRenderer blocks={resolved.blocks} document={resolved} documentHref={testDocumentHref(page.id)} variant="studio" />;
      return <section key={page.id} data-test-document={page.id} data-test-home={page.id === site.homeDocumentId ? "true" : "false"} data-test-title={page.title || siteName} data-test-initial={initialDocumentId && page.id === initialId ? "true" : undefined} hidden={page.id !== initialId}>
        <TestSiteNavigation site={site} document={resolved} />
        {snapshot ? <TemplateDocument snapshot={snapshot} document={resolved} documentHref={testDocumentHref(page.id)} content={content} /> : <div className="test-site-page">{page.id !== site.homeDocumentId ? <h1>{page.title}</h1> : null}{content}</div>}
      </section>;
    })}
  </>);
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="acm-test-revision" content="${revision}">${globals ? `<meta name="acm-global-template-revision" content="${globalRevision ?? "current-draft"}">` : ""}<meta name="theme-color" content="#f2f2f7"><title>${siteName}</title><style>html{font-size:100%}body{margin:0}${contentCss.replace(/@import[^;]+;/g, "")}${studioBlockCss}${groupLayoutCss}${buttonsCss}${featuredImageCss}${templateCss}${testSiteCss}[data-test-document][hidden]{display:none}</style></head><body>${body}<script>${templateNavigationScript}${initialDocumentId ? previewRoutingScript + routingScript.replace("const hash=location.hash;", "const hash=previewHash;") : routingScript}</script></body></html>`;
}
