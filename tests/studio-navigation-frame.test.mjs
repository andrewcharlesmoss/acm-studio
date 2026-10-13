import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { StudioNavigationFrame } = await loadProductionModule(new URL("../app/studio/studio-navigation-frame.tsx", import.meta.url));
const noop = () => {};
const props = {
  width: 290, collapsed: false, onWidthChange: noop, onCollapsedChange: noop,
  selectedSite: "test", onSelectSite: noop, onSelectWorkspace: noop,
  counts: { post: 2, page: 5, templates: 5 }, binCount: 0,
  writable: true, templateWritable: true, onSelectLibraryKind: noop,
  onNewDocument: noop, onNewFromTemplate: noop, onOpenFiles: noop,
  onOpenBackup: noop, onOpenBin: noop, onExportContent: noop,
  children: createElement("p", null, "Selected library contents"),
};

test("Posts, Pages and Templates render the same navigation structure around the selected list", () => {
  const html = ["post", "page", "templates"].map(libraryKind => renderToStaticMarkup(createElement(StudioNavigationFrame, { ...props, libraryKind, studioSection: libraryKind === "templates" ? "templates" : "content" })));
  const structure = value => value
    .replace(/_R_[^"\s]+/g, "GENERATED-ID")
    .replace(/aria-selected="(?:true|false)"/g, 'aria-selected="STATE"')
    .replace(/(?:id|aria-labelledby)="GENERATED-ID-(?:post|page|templates)-(?:tab|panel)"/g, 'data-tab-identity="TAB"')
    .replace(/tabindex="(?:0|-1)"/g, 'tabindex="STATE"');
  const navigation = value => structure(value).split(/<div role="tabpanel"/)[0];
  assert.equal(navigation(html[0]), navigation(html[1]));
  assert.equal(navigation(html[1]), navigation(html[2]));
  for (const value of html) {
    assert.equal((value.match(/class="library-create"/g) ?? []).length, 1);
    assert.equal((value.match(/class="library-tools"/g) ?? []).length, 1);
    assert.equal((value.match(/role="tabpanel"/g) ?? []).length, 3);
    assert.equal((value.match(/Selected library contents/g) ?? []).length, 1);
    assert.match(value, /aria-label="New post"/);
    assert.match(value, /aria-label="New page"/);
    assert.match(value, /aria-label="New from template"/);
    assert.ok(value.indexOf('class="library-create"') < value.indexOf('class="library-tools"'));
    assert.ok(value.indexOf('class="library-tools"') < value.indexOf('class="library-tabs"'));
    assert.ok(value.indexOf('class="library-tabs"') < value.indexOf('role="tabpanel"'));
    assert.ok(value.indexOf('role="tabpanel"') < value.indexOf('class="pane-footer"'));
  }
});

test("shared creation controls retain content and template ownership restrictions", () => {
  const readonly = renderToStaticMarkup(createElement(StudioNavigationFrame, { ...props, libraryKind: "templates", writable: false }));
  assert.match(readonly, /aria-label="New post"[^>]*disabled=""/);
  assert.match(readonly, /aria-label="New page"[^>]*disabled=""/);
  assert.match(readonly, /aria-label="New from template"[^>]*disabled=""/);
  const templateReadonly = renderToStaticMarkup(createElement(StudioNavigationFrame, { ...props, libraryKind: "templates", templateWritable: false }));
  assert.doesNotMatch(templateReadonly, /aria-label="New post"[^>]*disabled=""/);
  assert.match(templateReadonly, /aria-label="New from template"[^>]*disabled=""/);
});
