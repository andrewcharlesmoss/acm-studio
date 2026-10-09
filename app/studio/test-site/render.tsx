import { localFixtureName } from "./sites";
import { renderToStaticMarkup } from "react-dom/server";
import { BlockRenderer } from "../../components/blocks/block-renderer";
import { testSiteCollection, testDocumentHref, type TestSiteDocument } from "./contract";
import { resolveTemplate } from "../template-model";
import { resolveDocumentFields, resolveDocumentDisplay } from "../document-fields";
import { TemplateDocument } from "../template-renderer";
import { TestSiteNavigation } from "./navigation";
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
  if (!hash?.startsWith('#') || event.defaultPrevented || event.button !== 0
    || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  event.preventDefault();
  previewHash = hash;
  dispatchEvent(new Event('hashchange'));
  if (!hash.startsWith('#document=')) {
    try { document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView(); } catch {}
  }
});`;
export function renderTestSite(document: TestSiteDocument, revision: string, initialDocumentId?: string) {
  const site = testSiteCollection(document);
  const initialId = initialDocumentId !== undefined && site.documents.some(page => page.id === initialDocumentId) ? initialDocumentId : site.homeDocumentId;
  const siteName = localFixtureName(site.siteId);
  const body = renderToStaticMarkup(<>
    <TestSiteNavigation siteId={site.siteId} documents={site.documents} activeDocumentId={initialId} />
    {site.documents.map(page => {
      const snapshot = resolveTemplate(site.templates, page);
      const template = snapshot?.set.templates.find(item => item.id === snapshot.templateId);
      const fields = resolveDocumentFields(page, snapshot?.set, template?.defaults);
      const resolved = { ...page, ...fields, displayOverrides: resolveDocumentDisplay(page, template) };
      const content = <BlockRenderer blocks={resolved.blocks} document={resolved} documentHref={testDocumentHref(page.id)} variant="studio" />;
      return <section key={page.id} data-test-document={page.id} data-test-home={page.id === site.homeDocumentId ? "true" : "false"} data-test-title={page.title || siteName} data-test-initial={initialDocumentId && page.id === initialId ? "true" : undefined} hidden={page.id !== initialId}>
        {snapshot ? <TemplateDocument snapshot={snapshot} document={resolved} documentHref={testDocumentHref(page.id)} content={content} /> : <div className="test-site-page">{page.id !== site.homeDocumentId ? <h1>{page.title}</h1> : null}{content}</div>}
      </section>;
    })}
  </>);
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="acm-test-revision" content="${revision}"><meta name="theme-color" content="#f2f2f7"><title>${siteName}</title><style>html{font-size:100%}body{margin:0}${contentCss.replace(/@import[^;]+;/g, "")}${studioBlockCss}${groupLayoutCss}${buttonsCss}${featuredImageCss}${templateCss}${testSiteCss}[data-test-document][hidden]{display:none}</style></head><body>${body}<script>${initialDocumentId ? previewRoutingScript + routingScript.replace("const hash=location.hash;", "const hash=previewHash;") : routingScript}</script></body></html>`;
}
