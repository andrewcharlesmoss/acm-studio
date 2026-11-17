import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const packageRoot = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(packageRoot, "src/index.tsx");
const source = readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const runtimePath = path.join(packageRoot, "src/index.test.cjs");
const runtimeModule = new Module(runtimePath);
runtimeModule.filename = runtimePath;
runtimeModule.paths = Module._nodeModulePaths(packageRoot);
runtimeModule._compile(compiled, runtimePath);
const { PanelCard } = runtimeModule.exports;

test("renders a labelled card and consumer supplied slots", () => {
  const html = renderToStaticMarkup(createElement(
    PanelCard,
    {
      eyebrow: "Account record",
      title: "@local_user",
      description: "Local User · local_user@example.test",
      headerActions: createElement("button", { type: "button" }, "Close"),
      footer: createElement("p", null, "Account actions"),
      className: "account-details",
    },
    createElement("dl", null, createElement("dt", null, "Full name"), createElement("dd", null, "Local User")),
  ));

  assert.match(html, /<aside class="acm-panel account-details" aria-labelledby="[^"]+" data-acm-panel="true">/);
  assert.match(html, /<p class="acm-panel-eyebrow">Account record<\/p>/);
  assert.match(html, /<h2 class="acm-panel-title" id="[^"]+">@local_user<\/h2>/);
  assert.match(html, /<div class="acm-panel-header-actions"><button type="button">Close<\/button><\/div>/);
  assert.match(html, /<div class="acm-panel-body"><dl>/);
  assert.match(html, /<footer class="acm-panel-footer"><p>Account actions<\/p><\/footer>/);
});

test("creates unique heading references for sibling panels", () => {
  const html = renderToStaticMarkup(createElement(
    "div",
    null,
    createElement(PanelCard, { title: "First panel" }, "First body"),
    createElement(PanelCard, { title: "Second panel" }, "Second body"),
  ));
  const headings = [...html.matchAll(/<h2 class="acm-panel-title" id="([^"]+)">/g)].map((match) => match[1]);

  assert.equal(headings.length, 2);
  assert.notEqual(headings[0], headings[1]);
  assert.ok(headings.every((id) => html.includes('aria-labelledby="' + id + '"')));
});
