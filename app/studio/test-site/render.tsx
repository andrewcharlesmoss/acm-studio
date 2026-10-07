import { renderToStaticMarkup } from "react-dom/server";
import { BlockRenderer } from "../../components/blocks/block-renderer";
import { testDocumentToEditor, type TestSiteDocument } from "./contract";
export { validTestSiteDocument } from "./contract";

import { testSiteCss } from "./style";
import studioBlockCss from "../studio.css?raw";
import contentCss from "../../globals.css?raw";
import groupLayoutCss from "../../content/group-layout.css?raw";
import buttonsCss from "../../content/buttons.css?raw";
import featuredImageCss from "../../content/featured-image.css?raw";
export function renderTestSite(document: TestSiteDocument, revision: string) {
  const page = testDocumentToEditor(document);
  const body = renderToStaticMarkup(<BlockRenderer blocks={page.blocks} document={page} variant="studio" />);
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="acm-test-revision" content="${revision}"><meta name="theme-color" content="#f2f2f7"><title>Test</title><style>html{font-size:100%}body{margin:0}${contentCss.replace(/@import[^;]+;/g, "")}${studioBlockCss}${groupLayoutCss}${buttonsCss}${featuredImageCss}${testSiteCss}</style></head><body class="test-site-page">${body}</body></html>`;
}
