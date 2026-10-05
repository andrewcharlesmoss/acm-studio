import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { BlockRenderer } = await load("../app/components/content.tsx");
const { BlockField } = await load("../app/studio/studio-canvas.tsx");
const { socialIconsColourStyle } = await load("../app/components/social-icons.tsx");
const { TemplateNodes } = await load("../app/studio/template-renderer.tsx");
const { createTemplateSet } = await load("../app/studio/template-model.ts");

const block = {
  id: "social-frame", type: "social-icons", showLabels: true, openInNewTab: true,
  orientation: "vertical", allowWrap: false, justification: "right", iconSize: "large",
  horizontalGap: 13, verticalGap: 21,
  visualStyle: {
    anchor: "social-frame-anchor", className: "authored-social-frame", textColor: "#abcdef",
    backgroundColor: "#123456", backgroundGradient: "ocean", margin: "5px 11px 7px 17px",
    padding: "3px", borderStyle: "solid", borderWidth: "2px", borderColor: "#765432",
    borderRadius: "9px", shadow: "soft",
  },
  children: [
    { id: "linkedin", type: "social-linkedin", url: "https://linkedin.com/in/example", label: "My profile", rel: "nofollow" },
    { id: "tiktok", type: "social-tiktok", url: "https://tiktok.com/@example", label: "My videos" },
  ],
};

function renderers(value) {
  const document = { id: "social-document", kind: "post", title: "Social example", slug: "social-example", blocks: [value] };
  const set = createTemplateSet("Social test");
  return [
    ["Edit", renderToStaticMarkup(createElement(BlockField, { block: value, onChange() {}, onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {} }))],
    ["Studio Preview", renderToStaticMarkup(createElement(BlockRenderer, { blocks: [value], variant: "studio" }))],
    ["Article", renderToStaticMarkup(createElement(BlockRenderer, { blocks: [value] }))],
    ["Template", renderToStaticMarkup(createElement(TemplateNodes, { set, nodes: [value], document }))],
  ];
}

function navigationTag(html) {
  return html.match(/<nav\b[^>]*class="social-icons-block[^>]*>/)?.[0];
}

for (const socialStyle of ["default", "logos-only", "pill-shape"]) {
  test(`${socialStyle} keeps authored frame styles on one owner in every renderer`, () => {
    const value = { ...block, socialStyle };
    const snapshot = JSON.stringify(value);
    for (const [context, html] of renderers(value)) {
      for (const property of ["margin:", "padding:", "border-style:", "border-width:", "border-color:", "border-radius:", "box-shadow:"]) {
        assert.equal(html.split(property).length - 1, 1, `${context} ${property}`);
      }
      assert.equal(html.split('id="social-frame-anchor"').length - 1, 1, context);
      assert.match(html, /class="[^"]*authored-social-frame/);
      const nav = navigationTag(html);
      assert.ok(nav, context);
      assert.doesNotMatch(nav, /(?:margin|padding|border|box-shadow):/);
      assert.match(nav, /--social-icon-background:#123456/);
      assert.match(nav, /--social-icon-background-image:linear-gradient/);
      assert.match(nav, /--social-icon-colour:#abcdef/);
      assert.match(nav, /is-vertical is-no-wrap justify-right size-large/);
      assert.match(html, /column-gap:13px;row-gap:21px/);
      assert.equal((html.match(/class="social-icon-label"/g) ?? []).length, 2, context);
      if (context !== "Edit") assert.match(html, /target="_blank" rel="nofollow noopener noreferrer"/);
    }
    assert.equal(JSON.stringify(value), snapshot);
  });
}

test("navigation colour projection excludes frame and additional CSS properties", () => {
  const style = socialIconsColourStyle({ ...block, visualStyle: { ...block.visualStyle, additionalCss: "margin: 100px; border-width: 8px;" } });
  assert.deepEqual(Object.keys(style).sort(), ["--social-icon-background", "--social-icon-background-image", "--social-icon-colour"]);
  assert.equal(style["--social-icon-colour"], "#abcdef");
  assert.match(style["--social-icon-background-image"], /linear-gradient/);
  assert.deepEqual(socialIconsColourStyle({ ...block, visualStyle: undefined }), {
    "--social-icon-background": undefined, "--social-icon-background-image": undefined, "--social-icon-colour": undefined,
  });
});

test("child-owned frames remain separate from the parent frame", () => {
  const value = { ...block, children: [{ ...block.children[0], visualStyle: { margin: "19px", borderStyle: "dashed", borderWidth: "4px", borderColor: "#fedcba", borderRadius: "6px" } }] };
  for (const [context, html] of renderers(value)) {
    assert.equal(html.split("border-width:2px").length - 1, 1, context);
    assert.equal(html.split("border-width:4px").length - 1, 1, context);
    assert.equal(html.split("margin:19px").length - 1, 1, context);
    assert.doesNotMatch(navigationTag(html), /border-width|margin:/);
  }
});

test("hidden and unsafe children retain their Preview filtering", () => {
  const value = { ...block, children: [block.children[0], { ...block.children[1], editorial: { hidden: true } }, { id: "unsafe", type: "social-tiktok", url: "javascript:alert(1)" }] };
  for (const [context, html] of renderers(value).filter(([context]) => context !== "Edit")) {
    assert.match(html, /My profile/, context);
    assert.doesNotMatch(html, /My videos|javascript:|@example/);
    assert.equal(html.split("border-width:2px").length - 1, 1, context);
  }
});

test("empty Social Icons retain the intentional editor appender and no Preview navigation", () => {
  for (const [context, html] of renderers({ ...block, children: [] })) {
    if (context === "Edit") assert.match(html, /Add social icon/);
    else assert.equal(navigationTag(html), undefined, context);
  }
});

test("ordinary link rules exclude social links in normal and hover states", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.prose a:not\(\.content-button, \.social-icon-item\) \{ color:/);
  assert.match(css, /\.prose a:not\(\.content-button, \.social-icon-item\):hover \{ color:/);
  assert.match(css, /\.block-visual-style a:where\(:not\(\.social-icon-item\)\) \{ color:/);
  assert.match(css, /\.block-visual-style a:where\(:not\(\.social-icon-item\)\):hover \{ color:/);
  assert.match(css, /\.social-icon-item \{[^}]*color: var\(--social-icon-colour, #fff\)/);
  assert.doesNotMatch(css, /\.block-visual-style a(?::hover)? \{|\.prose a:not\(\.content-button\)(?::hover)? \{/);
});
