import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const { DocumentStickyControl } = await loadProductionModule(new URL("../app/studio/blocks/inspectors/document-inspector.tsx", import.meta.url));
for (const siteContext of [false, true]) test(`${siteContext ? "Sites" : "Drafts"} Sticky checkbox uses the actual boolean and shared editorial callback`, () => {
  for (const sticky of [undefined, false, true]) {
    const calls = [];
    const component = DocumentStickyControl({ document: { kind: "post", sticky }, siteContext, onChange: (...values) => calls.push(values) });
    const input = component.props.children.props.children;
    assert.equal(input.props.checked, Boolean(sticky));
    input.props.onChange(true);
    input.props.onChange(false);
    assert.deepEqual(calls, [["sticky", true], ["sticky", false]]);
    const html = renderToStaticMarkup(component);
    assert.match(html, /type="checkbox"/);
    assert.match(html, /for="sticky-post-toggle"/);
    if (siteContext) assert.match(html, /no post archive yet/);
    else assert.match(html, /Writing archive/);
  }
});
test("Pages never expose Sticky and disabled posts cannot submit a change", () => {
  assert.equal(DocumentStickyControl({ document: { kind: "page", sticky: true }, onChange() { throw Error("Unexpected callback"); } }), null);
  const calls = [];
  const component = DocumentStickyControl({ document: { kind: "post", sticky: true }, disabled: true, onChange: (...values) => calls.push(values) });
  const input = component.props.children.props.children;
  assert.equal(input.props.disabled, true);
  input.props.onChange(false);
  assert.deepEqual(calls, []);
  assert.match(renderToStaticMarkup(createElement(DocumentStickyControl, { document: { kind: "post" }, disabled: true, onChange() {} })), /disabled=""/);
});
