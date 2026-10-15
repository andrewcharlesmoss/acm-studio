import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { jsx, jsxs } from "react/jsx-runtime";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { DocumentInspector } = await load("../app/studio/blocks/inspectors/document-inspector.tsx");
const { DocumentTemplateControls } = await load("../app/studio/document-template-controls.tsx");
const { TemplateInspector, TemplateTextSetting } = await load("../app/studio/template-inspector.tsx");
const { InspectorSettingRow } = await load("../app/studio/controls/inspector-setting-row.tsx");
const { InspectorContentDisabledProvider } = await load("../app/studio/inspector-accordion.tsx");
const { createTemplateSet, emptyTemplateStore } = await load("../app/studio/template-model.ts");
const noop = () => {};
const accordions = html => [...html.matchAll(/class="inspector-accordion-heading"[^>]*><span>([^<]*)<\/span>/g)].map(match => match[1]);

for (const context of ["drafts", "test", "test2"]) for (const kind of ["page", "post"]) test(`${context} ${kind} exposes properties directly and collapses only taxonomy`, () => {
  const document = { id: "document", kind, title: "Example", slug: "example", author: "Andrew Moss", status: "draft", updatedAt: "2026-10-14T12:00:00Z", excerpt: "", tags: [], blocks: [], seoTitle: "", seoDescription: "" };
  const set = createTemplateSet();
  const template = set.templates.find(item => item.kind === kind);
  const store = { ...emptyTemplateStore(), sets: [set], assignments: [{ documentId: document.id, kind, setId: set.id, templateId: template.id }] };
  const html = renderToStaticMarkup(createElement(DocumentInspector, {
    panel: "document", document, resolvedDocument: document, categories: [], pages: [], tagSuggestions: [], siteContext: context !== "drafts",
    writable: true, canDelete: true, canDuplicate: true, onChange: noop, onUnpublish: noop, onDuplicate: noop, onDelete: noop, onAddCategory: noop, onCategorySelectionChange: noop,
    documentControls: createElement(DocumentTemplateControls, { document, store, writable: true, error: null, onChange: noop, siteId: context === "drafts" ? undefined : context }),
  }));
  assert.deepEqual(accordions(html), kind === "post" ? ["Categories", "Tags"] : []);
  for (const label of ["Status", "Publish", "Slug", "Author", "Template"]) assert.match(html, new RegExp(`>${label}<`));
  assert.equal(html.includes(">Parent<"), kind === "page");
  assert.match(html, /Andrew Moss/);
  assert.match(html, /Document content summary/);
  assert.doesNotMatch(html, /ADD TAG|MOST USED/);
  assert.match(html, /Move to bin/);
  assert.ok(html.indexOf("Move to bin") > html.indexOf(">Template<"));
});

for (const kind of ["page", "post", "header", "footer"]) test(`${kind} template uses the shared property structure`, () => {
  const set = createTemplateSet();
  const target = [...set.templates, ...set.parts].find(item => item.kind === kind);
  const html = renderToStaticMarkup(createElement(TemplateInspector, { set, target, selectedBlock: null, globalOriginal: true, writable: true, users: [], onChange: noop, onBlockChange: noop, onOpenMedia: noop, onEditPart: noop }));
  assert.deepEqual(accordions(html), ["page", "post"].includes(kind) ? ["Categories", "Tags"] : []);
  assert.match(html, /document-settings-pane/);
  assert.match(html, new RegExp(`<strong>${target.name}<`));
});

test("property buttons expose the label and saved value, and respect inherited read-only state", () => {
  const html = renderToStaticMarkup(createElement(InspectorContentDisabledProvider, { disabled: true }, createElement(InspectorSettingRow, { label: "Author", value: "Andrew Moss" }, createElement("input", { "aria-label": "Author" }))));
  const labelledBy = html.match(/aria-labelledby="([^"]+)"/)[1].split(" ");
  assert.equal(labelledBy.length, 2);
  for (const [index, text] of ["Author", "Andrew Moss"].entries()) assert.ok(html.includes(`id="${labelledBy[index]}">${text}</span>`));
  assert.match(html, /<button[^>]*disabled=""/);
  assert.doesNotMatch(html, /role="dialog"/);
});

for (const dismissal of ["close button", "Escape", "focus outside"]) test(`setting ${dismissal} handoff commits template text before closing`, () => {
  const events = [];
  const editor = TemplateTextSetting({ label: "Author", value: "Before", onCommit: value => events.push(value) });
  const input = editor.props.children.props.children[1];
  class ActiveField { blur() { input.props.onBlur({ target: { value: "After" } }); } }
  const active = new ActiveField();
  const listeners = new Map();
  let ref = 0, state = 0;
  const hooks = {
    useCallback: fn => fn, useId: () => "author",
    useRef: () => ({ current: ref++ ? { contains: node => node === active, querySelector: () => null } : { contains: () => false, focus: () => events.push("focus") } }),
    useState: () => state++ ? [{ left: 10, top: 10, width: 320 }, noop] : [true, value => events.push(value ? "open" : "closed")],
    useLayoutEffect: noop, useEffect: fn => fn(),
  };
  const fixtureModule = { exports: {} };
  const source = readFileSync(new URL("../app/studio/controls/inspector-setting-row.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(compiled, { module: fixtureModule, exports: fixtureModule.exports, require: name => {
    if (name === "react") return hooks;
    if (name === "react/jsx-runtime") return { jsx, jsxs };
    if (name === "react-dom") return { createPortal: element => element };
    if (name.endsWith("inspector-accordion")) return { useInspectorContentDisabled: () => false };
    if (name.endsWith("inspector-popover-position")) return { watchInspectorPopover: noop };
    if (name.endsWith("studio-icons")) return { StudioIcon: () => null };
    if (name.endsWith("anchored-popover")) return { StudioAnchoredPopover: () => null };
    if (name.endsWith("popover-heading")) return { PopoverHeading: () => null };
    throw new Error(`Unexpected test dependency: ${name}`);
  }, document: { activeElement: active, body: {}, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: noop }, HTMLElement: ActiveField, Node: ActiveField, requestAnimationFrame: fn => { fn(); return 1; }, cancelAnimationFrame: noop });
  const row = fixtureModule.exports.InspectorSettingRow({ label: "Author", value: "Before", children: editor.props.children });
  if (dismissal === "close button") row.props.children[2].props.children[0].props.onClose();
  else if (dismissal === "Escape") row.props.children[2].props.onClose(true);
  else row.props.children[2].props.onClose(false);
  assert.deepEqual(events, dismissal === "focus outside" ? ["After", "closed"] : ["After", "closed", "focus"]);
});
