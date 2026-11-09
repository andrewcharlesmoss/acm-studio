import test from "node:test";
import assert from "node:assert/strict";
import { loadProductionModule } from "./production-module.mjs";
import { withHtmlDom } from "./html-dom-fixture.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { initialStudioWorkspace } = await load("../app/studio/editor-model.ts");
const { containsGroupLayoutExtensions, flexItemSizingStyle, layoutStyleProperties, validLayoutOptions } = await load("../app/content/layout.ts");
const { validGridItemSizing, gridItemSizingStyle } = await load("../app/content/grid-child-sizing.ts");
const { validContentBlocks, migrateStudioWorkspace, validatePublicationSnapshot } = await load("../app/studio/workspace-validation.ts");
const { createTemplateSet, emptyTemplateStore, validateTemplateStore, validateTemplateSnapshot, templateEditorBlocks, templateNodesFromBlocks } = await load("../app/studio/template-model.ts");
const { validateTemplatePackage } = await load("../app/studio/template-package.ts");
const { BLOCK_CLIPBOARD_VERSION, blockClipboardHtml, readBlockClipboardPayload } = await load("../app/studio/block-clipboard.ts");
const { validateStudioBackup } = await load("../app/studio/backup-store.ts");
const { testSiteCollection, validTestSiteDocument } = await load("../app/studio/test-site/contract.ts");
const { validateGlobalTemplateLibrary } = await load("../app/studio/global-template-contract.ts");
const { referenceSpacing } = await load("../app/content/reference-spacing.ts");
const { blockToHtml, parseHtmlToBlock } = await load("../app/studio/studio-html-editor.ts");

const grid = { id: "expanded-grid", type: "group", layout: "grid", gridMode: "auto", columns: 16, minColumnWidth: 0, minColumnWidthUnit: "rem", children: [{ id: "expanded-child", type: "paragraph", text: "Wide child", style: { gridItemSizing: { columnSpan: 16, rowSpan: 16 } } }] };
const document = { ...initialStudioWorkspace.documents[0], id: "expanded-page", kind: "page", slug: "expanded-page", blocks: [grid] };
const workspace = { ...initialStudioWorkspace, version: 65, documents: [document], activeDocumentId: document.id };
const publication = { localDocumentId: document.id, slug: document.slug, title: "Grid", summary: "", displayDate: "", readingTime: "", publishedAt: "2026-11-09T00:00:00.000Z", section: "", blocks: [grid], mediaIds: [] };
const legacyGrid = { ...grid, columns: 6, minColumnWidth: 80, minColumnWidthUnit: "px", children: [{ ...grid.children[0], style: { gridItemSizing: { columnSpan: 6, rowSpan: 6 } } }] };

test("expanded bounds belong to Group while Section and Columns retain their contracts", () => {
  assert.equal(validContentBlocks([grid]), true);
  assert.equal(validLayoutOptions({ ...grid, layout: "row" }, true), true);
  assert.equal(validContentBlocks([{ ...grid, columns: 17 }]), false);
  assert.equal(validContentBlocks([{ ...grid, minColumnWidth: -1 }]), false);
  assert.equal(validContentBlocks([{ ...grid, minColumnWidth: 601 }]), false);
  assert.equal(validLayoutOptions({ type: "section", columns: 16 }), false);
  assert.equal(validLayoutOptions({ type: "section", minColumnWidth: 0 }), false);
  assert.equal(validLayoutOptions({ type: "section", columns: 6, minColumnWidth: 80 }), true);
  assert.equal(validGridItemSizing({ columnSpan: 16, rowSpan: 16 }), true);
  assert.equal(validGridItemSizing({ columnSpan: 17 }), false);
  assert.equal(validGridItemSizing({ rowSpan: 0 }), false);
  assert.equal(containsGroupLayoutExtensions(grid), true);
  assert.equal(containsGroupLayoutExtensions({ ...grid, layout: "flow" }), true);
  assert.equal(containsGroupLayoutExtensions(legacyGrid), false);
  assert.equal(layoutStyleProperties(grid)["--block-layout-min-column-width"], "0rem");
  assert.match(layoutStyleProperties(grid)["--block-layout-max-column-width"], /16/);
  assert.deepEqual(gridItemSizingStyle(grid.children[0].style.gridItemSizing), { gridColumn: "span 16", gridRow: "span 16" });
});

test("workspace and publication formats gate expanded ranges before migrating old content", () => {
  assert.deepEqual(migrateStudioWorkspace(workspace).documents[0].blocks, [grid]);
  assert.throws(() => migrateStudioWorkspace({ ...workspace, version: 64 }), /invalid|unsupported/i);
  const legacy = migrateStudioWorkspace({ ...workspace, version: 64, documents: [{ ...document, blocks: [legacyGrid] }] });
  assert.equal(legacy.version, 65);
  assert.deepEqual(legacy.documents[0].blocks, [legacyGrid]);
  assert.deepEqual(validatePublicationSnapshot({ version: 56, posts: [publication] }).posts[0].blocks, [grid]);
  assert.throws(() => validatePublicationSnapshot({ version: 55, posts: [publication] }), /snapshot v56/);
  assert.deepEqual(validatePublicationSnapshot({ version: 55, posts: [{ ...publication, blocks: [legacyGrid] }] }).posts[0].blocks, [legacyGrid]);
});

test("template stores, snapshots and packages accept new bounds only in v0.77.0", () => {
  const set = createTemplateSet("Expanded Grid");
  set.templates[0].nodes = [grid];
  for (const version of ["0.77.0", "0.76.0"]) {
    const store = { ...emptyTemplateStore(), version, sets: [set] };
    const snapshot = { version, set, templateId: set.templates[0].id };
    const pack = { format: "acm-studio-template-set", version, set, media: [] };
    if (version === "0.77.0") {
      assert.deepEqual(validateTemplateStore(store).sets[0].templates[0].nodes, [grid]);
      assert.deepEqual(validateTemplateSnapshot(snapshot).set.templates[0].nodes, [grid]);
      assert.deepEqual(validateTemplatePackage(pack).set.templates[0].nodes, [grid]);
    } else {
      assert.throws(() => validateTemplateStore(store), /v0\.77\.0/);
      assert.throws(() => validateTemplateSnapshot(snapshot), /v0\.77\.0/);
      assert.throws(() => validateTemplatePackage(pack), /v0\.77\.0/);
    }
  }
  set.templates[0].nodes = [{ ...legacyGrid, children: [{ ...legacyGrid.children[0], style: { flexItemSizing: { mode: "grow" }, flexItemSizingActive: true } }] }];
  assert.equal(validateTemplateStore({ ...emptyTemplateStore(), version: "0.76.0", sets: [set] }).version, "0.78.0");
  assert.equal(validateTemplatePackage({ format: "acm-studio-template-set", version: "0.76.0", set, media: [] }).version, "0.78.0");
});

test("clipboard and backup envelopes cannot relabel expanded content as an older format", () => {
  const html = blockClipboardHtml([grid]);
  const encoded = html.match(/data-acm-studio-blocks="([^"]+)"/)?.[1];
  const json = encoded?.replaceAll("&quot;", '"').replaceAll("&amp;", "&");
  const previousParser = globalThis.DOMParser;
  try {
    const read = version => {
      globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => json.replace(`"version":${BLOCK_CLIPBOARD_VERSION}`, `"version":${version}`) }) }; } };
      return readBlockClipboardPayload(html);
    };
    assert.deepEqual(read(42).blocks, [grid]);
    assert.equal(read(41), null);
  } finally { globalThis.DOMParser = previousParser; }
  const backup = { format: "acm-studio-backup", exportedAt: "2026-11-09T00:00:00.000Z", workspace, publications: null, media: { folders: [], assets: [] } };
  assert.deepEqual(validateStudioBackup({ ...backup, version: 45 }).workspace.documents[0].blocks, [grid]);
  assert.throws(() => validateStudioBackup({ ...backup, version: 44 }), /backup v45/);
  assert.deepEqual(validateStudioBackup({ ...backup, version: 44, workspace: { ...workspace, version: 64, documents: [{ ...document, blocks: [legacyGrid] }] } }).workspace.documents[0].blocks, [legacyGrid]);
});

test("fixture source and global templates gate expanded authored and published records", () => {
  const base = testSiteCollection({ format: "acm-test-site", version: 3, siteId: "test", documents: [initialStudioWorkspace.documents[0]], activeDocumentId: initialStudioWorkspace.documents[0].id, homeDocumentId: initialStudioWorkspace.documents[0].id, bin: [], categories: [], templates: emptyTemplateStore(), browserImportComplete: true });
  const source = { ...base, version: 56, documents: [document], activeDocumentId: document.id, homeDocumentId: document.id, publications: [{ document: { ...document, status: "published" } }] };
  assert.equal(validTestSiteDocument(source), true);
  assert.deepEqual(testSiteCollection(source).documents[0].blocks, [grid]);
  assert.equal(validTestSiteDocument({ ...source, version: 55 }), false);
  assert.throws(() => testSiteCollection({ ...source, version: 55 }), /source v56/);
  const prior = { ...source, version: 55, documents: [{ ...document, blocks: [legacyGrid] }], publications: [] };
  assert.equal(validTestSiteDocument(prior), true);
  assert.equal(testSiteCollection(prior).version, 57);
  const set = createTemplateSet("Expanded Grid library");
  set.parts[0].nodes = [{ id: "expanded-navigation", type: "element", element: "navigation" }];
  set.templates[0].nodes = [grid];
  const library = { format: "acm-global-templates", version: 48, templates: { ...emptyTemplateStore(), sets: [set] }, header: { setId: set.id, partId: set.parts[0].id }, migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } };
  assert.equal(validateGlobalTemplateLibrary(library).version, 49);
  assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 47 }), /library v48/);
});

test("unit-aware Group spacing is a coordinated addition, not a reinterpretation of legacy gaps", () => {
  const group = { id: "spacing-group", type: "group", layout: "grid", columns: 4, gapLength: "2rem", children: [] };
  for (const gapLength of ["0px", "2rem", "1em", "5%", "2vw", "3vh"]) assert.equal(validContentBlocks([{ ...group, gapLength }]), true, gapLength);
  for (const gapLength of ["-1px", "2ch", "2", "calc(2rem + 1px)"]) assert.equal(validContentBlocks([{ ...group, gapLength }]), false, gapLength);
  assert.equal(validLayoutOptions({ type: "section", gapLength: "2rem" }), false);
  assert.deepEqual(templateNodesFromBlocks(templateEditorBlocks([group]), [group]), [{ ...group, editorial: undefined }]);
  const css = layoutStyleProperties(group);
  assert.equal(css["--block-layout-column-gap"], "2rem");
  assert.equal(css["--block-layout-row-gap"], "2rem");
  assert.equal(css["--block-layout-max-column-width"], "calc((100% - (2rem * 3)) / 4)");
  const legacy = { ...group, gapLength: undefined, gap: 12, columnGap: 20, rowGap: 8 };
  assert.equal(containsGroupLayoutExtensions(legacy), false);
  assert.equal(layoutStyleProperties(legacy)["--block-layout-column-gap"], "20px");
  assert.equal(layoutStyleProperties(legacy)["--block-layout-row-gap"], "8px");

  const page = { ...document, blocks: [group] };
  const draft = { ...workspace, documents: [page] };
  assert.deepEqual(migrateStudioWorkspace(draft).documents[0].blocks, [group]);
  assert.throws(() => migrateStudioWorkspace({ ...draft, version: 64 }));
  assert.deepEqual(validatePublicationSnapshot({ version: 56, posts: [{ ...publication, blocks: [group] }] }).posts[0].blocks, [group]);
  assert.throws(() => validatePublicationSnapshot({ version: 55, posts: [{ ...publication, blocks: [group] }] }), /v56/);
  const set = createTemplateSet("Spacing"); set.templates[0].nodes = [group];
  const store = { ...emptyTemplateStore(), sets: [set] };
  assert.equal(validateTemplateStore(store).version, "0.78.0");
  assert.throws(() => validateTemplateStore({ ...store, version: "0.76.0" }), /v0\.77\.0/);
  assert.throws(() => validateTemplateSnapshot({ version: "0.76.0", set, templateId: set.templates[0].id }), /v0\.77\.0/);
  assert.throws(() => validateTemplatePackage({ format: "acm-studio-template-set", version: "0.76.0", set, media: [] }), /v0\.77\.0/);
  const backup = { format: "acm-studio-backup", version: 45, exportedAt: "2026-11-09T00:00:00.000Z", workspace: draft, publications: null, media: { folders: [], assets: [] } };
  assert.deepEqual(validateStudioBackup(backup).workspace.documents[0].blocks, [group]);
  assert.throws(() => validateStudioBackup({ ...backup, version: 44 }), /v45/);
  const html = blockClipboardHtml([group]);
  const json = html.match(/data-acm-studio-blocks="([^"]+)"/)[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&");
  const previousParser = globalThis.DOMParser;
  try {
    for (const version of [42, 41]) {
      globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => json.replace('"version":42', `"version":${version}`) }) }; } };
      assert.equal(Boolean(readBlockClipboardPayload(html)), version === 42);
    }
  } finally { globalThis.DOMParser = previousParser; }
  const source = testSiteCollection({ format: "acm-test-site", version: 3, siteId: "test", documents: [initialStudioWorkspace.documents[0]], activeDocumentId: initialStudioWorkspace.documents[0].id, homeDocumentId: initialStudioWorkspace.documents[0].id, bin: [], categories: [], templates: emptyTemplateStore(), browserImportComplete: true });
  const next = { ...source, documents: [page], activeDocumentId: page.id, homeDocumentId: page.id, publications: [] };
  assert.equal(validTestSiteDocument(next), true);
  assert.equal(validTestSiteDocument({ ...next, version: 55 }), false);
  set.parts[0].nodes = [{ id: "spacing-navigation", type: "element", element: "navigation" }];
  const library = { format: "acm-global-templates", version: 48, templates: store, header: { setId: set.id, partId: set.parts[0].id }, migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } };
  assert.equal(validateGlobalTemplateLibrary(library).version, 49);
  assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 47 }), /v48/);
});

test("flattened recovery patches cannot bypass extension gates or relabel older fixture data", () => {
  const set = createTemplateSet("Recovery");
  set.templates[0].nodes = [{ ...legacyGrid, minColumnWidth: 12, minColumnWidthUnit: "rem" }];
  const path = ["templates", `@${set.templates[0].id}`, "nodes", "@expanded-grid"];
  const binding = overrides => ({ setId: set.id, globalSetId: set.id, ids: {}, overrides });
  const base = testSiteCollection({ format: "acm-test-site", version: 3, siteId: "test", documents: [initialStudioWorkspace.documents[0]], activeDocumentId: initialStudioWorkspace.documents[0].id, homeDocumentId: initialStudioWorkspace.documents[0].id, bin: [], categories: [], templates: emptyTemplateStore(), browserImportComplete: true });
  const source = patches => ({ ...base, version: 55, templates: { ...emptyTemplateStore(), sets: [...base.templates.sets, set] }, globalTemplates: [binding(patches)] });
  const extensions = [
    { path: [...path, "columns"], value: 16 },
    { path: [...path, "minColumnWidth"], value: 0 },
    { path: [...path, "gapLength"], value: "2rem" },
    { path: [...path, "visualStyle", "gridItemSizing", "columnSpan"], value: 16 },
    { path: [...path, "visualStyle", "gridItemSizing"], value: { rowSpan: 16 } },
    { path: [...path, "minColumnWidthUnit"], value: "px" },
    { path: [...path, "visualStyle", "flexItemSizing", "size"], value: "0px" },
    { path: [...path, "visualStyle", "flexItemSizing"], value: { mode: "fixed", size: "0px" } },
    { path: [...path, "visualStyle"], value: { padding: "clamp(30px,5cqw,50px)" } },
    { path: [...path, "visualStyle", "responsive"], value: { mobile: { margin: "clamp(30px,5cqw,50px)" } } },
  ];
  for (const patch of extensions) {
    const input = source([patch]); const before = structuredClone(input);
    assert.equal(containsGroupLayoutExtensions(input), true, JSON.stringify(patch));
    assert.equal(validTestSiteDocument(input), false);
    assert.throws(() => testSiteCollection(input), /v56/);
    assert.deepEqual(input, before, "Failed imports must preserve recovery data");
    const migration = { migrations: { test: { bases: [set], bindings: [binding([patch])] } } };
    assert.equal(containsGroupLayoutExtensions(migration), true);
    const library = { format: "acm-global-templates", version: 47, templates: emptyTemplateStore(), migrations: { test: migration.migrations.test, test2: { bases: [], bindings: [] } } };
    assert.throws(() => validateGlobalTemplateLibrary(library), /v48/);
    const backup = { format: "acm-studio-backup", version: 44, exportedAt: "2026-11-09T00:00:00.000Z", workspace: { ...workspace, documents: [{ ...document, blocks: [legacyGrid] }] }, globalTemplates: library, publications: null, media: { folders: [], assets: [] } };
    assert.throws(() => validateStudioBackup(backup), /v45/);
  }
  const relative = source([{ path: [...path, "minColumnWidth"], value: 2 }]);
  assert.equal(containsGroupLayoutExtensions(relative), false);
  assert.equal(validTestSiteDocument(relative), true);
  assert.deepEqual(testSiteCollection(relative).globalTemplates, relative.globalTemplates);
  const patchedRelative = source([{ path: [...path, "minColumnWidthUnit"], value: "em" }, { path: [...path, "minColumnWidth"], value: 1 }]);
  assert.equal(containsGroupLayoutExtensions(patchedRelative), false);
  const unknown = { bindings: [binding([{ path: [...path, "minColumnWidth"], value: 20 }])] };
  assert.equal(containsGroupLayoutExtensions(unknown), true);
  const removed = source([{ path: [...path, "gapLength"], remove: true }]);
  assert.equal(containsGroupLayoutExtensions(removed), false);
});

test("zero Fixed and Max child dimensions render and use the coordinated extension gate", () => {
  for (const mode of ["fixed", "max"]) {
    const child = { id: "zero-size", type: "paragraph", text: "Zero", style: { flexItemSizing: { mode, size: "0px" }, flexItemSizingActive: true } };
    assert.equal(validContentBlocks([child]), true);
    assert.equal(flexItemSizingStyle(child.style.flexItemSizing).flexBasis, "0px");
    assert.equal(containsGroupLayoutExtensions(child), true);
    const draft = { ...workspace, documents: [{ ...document, blocks: [child] }] };
    assert.deepEqual(migrateStudioWorkspace(draft).documents[0].blocks, [child]);
    assert.throws(() => migrateStudioWorkspace({ ...draft, version: 64 }));
    assert.throws(() => validatePublicationSnapshot({ version: 55, posts: [{ ...publication, blocks: [child] }] }), /v56/);
  }
});

test("theme fluid spacing stays scoped to Group and does not relabel existing website Styles", () => {
  const fluid = referenceSpacing.find(preset => preset.label === "Regular").value;
  const group = { id: "fluid-group", type: "group", layout: "flow", children: [], visualStyle: { padding: `${fluid} 10px`, marginSides: { top: fluid }, responsive: { mobile: { padding: fluid } } } };
  assert.equal(validContentBlocks([group]), true);
  assert.equal(validContentBlocks([{ ...group, type: "section" }]), false);
  assert.equal(validContentBlocks([{ ...group, visualStyle: { padding: "clamp(1px,2vw,3px)" } }]), false);
  assert.equal(containsGroupLayoutExtensions(group), true);
  assert.equal(containsGroupLayoutExtensions({ styles: { blockStyles: { group: { padding: fluid } } } }), false, "Existing website spacing has its own earlier contract");
  const draft = { ...workspace, documents: [{ ...document, blocks: [group] }] };
  assert.deepEqual(migrateStudioWorkspace(draft).documents[0].blocks, [group]);
  assert.throws(() => migrateStudioWorkspace({ ...draft, version: 64 }));
  const set = createTemplateSet("Fluid spacing"); set.templates[0].nodes = [group];
  assert.deepEqual(validateTemplateStore({ ...emptyTemplateStore(), sets: [set] }).sets[0].templates[0].nodes, [group]);
  assert.throws(() => validateTemplateStore({ ...emptyTemplateStore(), version: "0.76.0", sets: [set] }), /v0\.77\.0/);
  const backup = { format: "acm-studio-backup", version: 45, exportedAt: "2026-11-09T00:00:00.000Z", workspace: draft, publications: null, media: { folders: [], assets: [] } };
  assert.deepEqual(validateStudioBackup(backup).workspace.documents[0].blocks, [group]);
  assert.throws(() => validateStudioBackup({ ...backup, version: 44 }), /v45/);
  assert.equal(validLayoutOptions({ type: "group", gapLength: fluid }), true);
  assert.equal(layoutStyleProperties({ type: "group", gapLength: fluid })["--block-layout-gap"], fluid);
});

test("Group spacing survives the owned HTML editor without losing sparse or responsive fields", () => {
  const fluid = "clamp(30px,5cqw,50px)";
  for (const gapLength of ["2rem", fluid]) withHtmlDom(() => {
    const group = { id: "html-spacing", type: "group", layout: "grid", gapLength, children: [], visualStyle: { padding: `${fluid} 10px`, marginSides: { top: fluid }, responsive: { mobile: { padding: fluid } } } };
    const parsed = parseHtmlToBlock(blockToHtml(group), group);
    assert.equal("error" in parsed, false, parsed.error);
    assert.equal(parsed.block.gapLength, gapLength);
    assert.deepEqual(parsed.block.visualStyle, group.visualStyle);
  });
});
