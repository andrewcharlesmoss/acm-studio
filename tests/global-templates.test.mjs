import test from "node:test";
import assert from "node:assert/strict";
import { runnerImport } from "vite";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, writeFile, rm, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createGlobalTemplateStore } from "../scripts/global-template-store.mjs";
import { createTestSiteStore, revisionOf } from "../scripts/test-site-store.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const { module: model } = await runnerImport(path.join(root, "app/studio/global-template-contract.ts"), { root, resolve: { dedupe: ["react", "react-dom"] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } } });
const { module: templates } = await runnerImport(path.join(root, "app/studio/template-model.ts"), { root, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } } });
const { module: sync } = await runnerImport(path.join(root, "app/studio/studio-sync.ts"), { root });
const { module: preview } = await runnerImport(path.join(root, "app/studio/global-template-preview.ts"), { root, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } } });
function fixtures() {
  const set = templates.createTemplateSet("Original");
  const store = { ...templates.emptyTemplateStore(), sets: [set] };
  const result = {};
  for (const siteId of ["test", "test2"]) {
    const navigation = { ...structuredClone(set), id: `fixture-${siteId}-navigation`, templates: [], parts: [{ id: `fixture-${siteId}-navigation-part`, name: "Navigation", kind: "header", nodes: [{ id: `fixture-${siteId}-navigation-block`, type: "element", element: "navigation", visualStyle: { backgroundColor: siteId === "test" ? "#34C759" : "#636366" } }] }], navigation: [{ id: `${siteId}-link`, label: siteId, url: "/", visualStyle: { fontSize: "24px" }, children: [{ id: `${siteId}-child`, label: "Child", url: "/child", visualStyle: { appearance: "bold" } }] }], identity: { name: siteId, homeUrl: "/", copyright: "" } };
    result[siteId] = { templates: { ...structuredClone(store), sets: [...structuredClone(store.sets), navigation] }, siteNavigation: { setId: navigation.id, partId: navigation.parts[0].id } };
  }
  return result;
}
test("neutral global previews replace all site content while preserving original design and IDs", () => {
  const library = model.createGlobalTemplateLibrary(fixtures());
  const original = library.templates.sets[1];
  original.identity = { name: "Retained site identity", homeUrl: "/actual", copyright: "Actual copyright" };
  original.navigation = [{ id: "actual", label: "Actual menu", url: "/actual" }];
  const before = JSON.stringify(original);
  const result = preview.neutralGlobalTemplatePreview(original);
  assert.equal(result.set.identity.name, "Your Site");
  assert.deepEqual(result.set.navigation.map(link => link.label), ["Home", "About", "Blog", "Contact"]);
  assert.deepEqual(result.documents.map(document => document.kind), ["page", "post"]);
  assert.equal(result.set.id, original.id);
  assert.strictEqual(result.set.parts, original.parts);
  assert.strictEqual(result.set.styles, original.styles);
  assert.equal(JSON.stringify(original), before, "preview must not change the saved original");
});
test("site global previews supply each fixture's content without leaking site design or mutating sources", () => {
  const sites = fixtures(); const library = model.createGlobalTemplateLibrary(sites);
  const original = library.templates.sets[1];
  for (const siteId of ["test", "test2"]) {
    sites[siteId].templates.sets[1].navigation[0].visualStyle = { fontSize: "large" };
    const document = { id: `${siteId}-home`, kind: "page", title: siteId, slug: "", excerpt: "", status: "draft", updatedAt: "2026-01-01T00:00:00.000Z", blocks: [], tags: [], seoTitle: "", seoDescription: "" };
    const source = { ...sites[siteId], format: "acm-test-site", version: 4, siteId, documents: [document], categories: [], bin: [], activeDocumentId: document.id, homeDocumentId: document.id, browserImportComplete: true };
    const before = JSON.stringify({ source, library });
    const result = preview.siteGlobalTemplatePreview(original, library, source);
    assert.equal(result.set.identity.name, siteId);
    assert.equal(result.set.navigation[0].label, siteId);
    assert.equal(result.set.navigation[0].visualStyle, undefined);
    assert.equal(result.set.navigation[0].children[0].visualStyle, undefined);
    assert.strictEqual(result.set.parts, original.parts);
    assert.strictEqual(result.set.styles, original.styles);
    assert.deepEqual(result.documents, [document]);
    assert.equal(JSON.stringify({ source, library }), before);
  }
});
test("active-site preview ignores conflicting requests and never falls back to foreign or sample documents", () => {
  const sites = fixtures();
  for (const site of Object.values(sites)) site.templates.sets[1].navigation[0].visualStyle = { fontSize: "large" };
  const library = model.createGlobalTemplateLibrary(sites);
  const original = library.templates.sets[1];
  const sources = Object.fromEntries(Object.entries(sites).map(([siteId, site]) => {
    const document = { id: `${siteId}-home`, kind: "page", title: siteId, slug: "", excerpt: "", status: "draft", updatedAt: "2026-01-01T00:00:00.000Z", blocks: [], tags: [], seoTitle: "", seoDescription: "" };
    return [siteId, { document: { ...site, format: "acm-test-site", version: 4, siteId, documents: [document], categories: [], bin: [], activeDocumentId: document.id, homeDocumentId: document.id, browserImportComplete: true }, error: null }];
  }));
  const before = JSON.stringify({ sources, library });
  for (const activeSite of ["test", "test2"]) {
    const other = activeSite === "test" ? "test2" : "test";
    for (const requested of ["neutral", other]) {
      preview.siteGlobalTemplatePreview(original, library, sources[activeSite].document);
      const result = preview.resolveGlobalTemplatePreview(original, requested, library, sources[activeSite], activeSite);
      assert.equal(result.availability, "ready");
      assert.equal(result.set.identity.name, activeSite);
      assert.deepEqual(result.documents.map(doc => doc.id), [`${activeSite}-home`]);
      for (const source of [undefined, { document: null, error: null }, { document: null, error: "Private detail" }, sources[other]]) {
        const unavailable = preview.resolveGlobalTemplatePreview(original, requested, library, source, activeSite);
        assert.equal(unavailable.availability, "fallback");
        assert.deepEqual(unavailable.documents, []);
        assert.equal(unavailable.set.identity.name, "");
        assert.deepEqual(unavailable.set.navigation, []);
        assert.ok(unavailable.unavailableContent);
        assert.ok(!unavailable.status.includes("Showing neutral"));
        assert.ok(!unavailable.status.includes("Private detail"));
      }
    }
  }
  assert.equal(JSON.stringify({ sources, library }), before, "context changes never mutate sources");
});
test("contextual preview distinguishes loading, failed, and ready sources without mutating them", () => {
  const sites = fixtures(); const library = model.createGlobalTemplateLibrary(sites);
  const original = library.templates.sets[1];
  const before = JSON.stringify({ sites, library });
  for (const siteId of ["test", "test2"]) {
    const loading = preview.resolveGlobalTemplatePreview(original, siteId, library, { document: null, error: null });
    assert.equal(loading.availability, "fallback");
    assert.match(loading.status, /Loading/);
    assert.match(loading.unavailableContent, /Loading/);
    assert.equal(loading.set.identity.name, "Your Site");
    const failed = preview.resolveGlobalTemplatePreview(original, siteId, library, { document: null, error: "Private gateway detail" });
    assert.match(failed.status, /unavailable.*neutral content/);
    assert.ok(!failed.status.includes("Private gateway detail"));
    assert.match(failed.unavailableContent, /unavailable/);
  }
  const neutral = preview.resolveGlobalTemplatePreview(original, "neutral", null);
  assert.equal(neutral.availability, "ready");
  assert.equal(neutral.unavailableContent, undefined);
  assert.deepEqual(neutral.documents.map(document => document.title), ["Sample Page", "Sample Post"]);
  assert.equal(JSON.stringify({ sites, library }), before);
});
test("same ancestry and explicit navigation role share global designs while preserving site content", () => {
  const sites = fixtures(); const library = model.createGlobalTemplateLibrary(sites);
  assert.equal(library.templates.sets.length, 2);
  for (const siteId of ["test", "test2"]) {
    const bindings = model.migrateGlobalTemplateBindings(sites[siteId].templates, library, siteId);
    const effective = model.effectiveGlobalTemplates(sites[siteId].templates, library, bindings);
    assert.equal(effective.sets[0].parts[0].nodes[0].visualStyle?.backgroundColor, undefined);
    assert.equal(sites[siteId].templates.sets[1].parts[0].nodes[0].visualStyle.backgroundColor, siteId === "test" ? "#34C759" : "#636366");
    const updated = structuredClone(library);
    updated.templates.sets[0].parts[0].nodes[0].visualStyle = { textColor: "#0088FF", backgroundColor: "#FFFFFF" };
    const materialised = model.effectiveGlobalTemplates(sites[siteId].templates, updated, bindings);
    const result = materialised.sets[0];
    assert.deepEqual(materialised.sets[1].parts, [], "legacy menu owner has no active Navigation design");
    assert.equal(result.parts[0].nodes[0].visualStyle.textColor, "#0088FF");
    assert.equal(result.parts[0].nodes[0].visualStyle.backgroundColor, "#FFFFFF");
    assert.deepEqual(result.identity, sites[siteId].templates.sets[0].identity); assert.equal(materialised.sets[1].identity.name, siteId); assert.equal(result.navigation[0].label, siteId);
    assert.equal(result.navigation[0].visualStyle, undefined);
    assert.equal(result.navigation[0].children[0].visualStyle, undefined);
    const restoredLinks = model.retainLegacyNavigationPresentation(result.navigation, sites[siteId].templates.sets[1].navigation);
    assert.equal(restoredLinks[0].visualStyle.fontSize, "24px");
    assert.equal(restoredLinks[0].children[0].visualStyle.appearance, "bold");
    assert.throws(() => model.retainLegacyNavigationPresentation([{ ...result.navigation[0], visualStyle: { fontSize: "12px" } }], restoredLinks), /presentation is global/);
    const legacy = bindings.map(binding => ({ ...binding, overrides: [{ path: ["parts", `@${sites[siteId].siteNavigation.partId}`, "nodes", `@fixture-${siteId}-navigation-block`, "visualStyle", "backgroundColor"], value: "#FF0000" }] }));
    assert.equal(model.effectiveGlobalTemplates(sites[siteId].templates, updated, legacy).sets[0].parts[0].nodes[0].visualStyle.backgroundColor, "#FFFFFF");
  }
});
test("legacy structural additions remain recoverable but only global children are rendered", () => {
  const sites = fixtures(); const library = model.createGlobalTemplateLibrary(sites);
  const local = sites.test2.templates;
  const legacyPart = { id: "local-only-part", name: "Legacy local part", kind: "header", nodes: [] };
  local.sets[1].parts.push(legacyPart);
  const bindings = model.migrateGlobalTemplateBindings(local, library, "test2");
  bindings[1].overrides = [{ path: ["parts"], order: ["fixture-test2-navigation-part", legacyPart.id], added: [legacyPart], removed: [] }];
  const globalPart = { id: "new-global-part", name: "Global part", kind: "header", nodes: [] };
  library.templates.sets[0].parts.push(globalPart);
  const before = structuredClone(local);
  const result = model.effectiveGlobalTemplates(local, library, bindings);
  assert.deepEqual(result.sets[1].parts, []);
  assert.ok(result.sets[0].parts.some(part => part.id === globalPart.id));
  assert.deepEqual(local, before);
  assert.equal(local.sets[1].parts.at(-1).id, legacyPart.id);
});
test("new global contexts become available for every site and malformed bindings are rejected", () => {
  const sites = fixtures(); const library = model.createGlobalTemplateLibrary(sites);
  const extra = templates.createTemplateSet("Added"); library.templates.sets.push(extra);
  const bindings = model.migrateGlobalTemplateBindings(sites.test2.templates, library, "test2");
  assert.ok(model.effectiveGlobalTemplates(sites.test2.templates, library, bindings).sets.some(set => set.id === extra.id));
  assert.throws(() => model.effectiveGlobalTemplates(sites.test2.templates, library, [...bindings, bindings[0]]), /duplicate/);
  assert.equal(model.validGlobalTemplateBindings([{ ...bindings[0], overrides: [{ path: ["__proto__"], value: {} }] }]), false);
  assert.equal(model.validGlobalTemplateBindings([{ ...bindings[0], overrides: [{ path: [], value: {} }] }]), false);
});
test("global source bootstrap is read-only until owned, CAS rejects stale/invalid/deleted originals, history recovers", async () => {
  const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), "studio-global-")));
  const sites = fixtures();
  const store = createGlobalTemplateStore({ root: directory, loadContracts: async () => model, readSites: async () => sites });
  try {
    const preview = await store.load(); assert.equal(preview.initialised, false);
    await assert.rejects(readFile(path.join(directory, "work/global-template-library.json")), error => error.code === "ENOENT");
    const original = await store.load(true); assert.equal(original.initialised, true);
    const changed = structuredClone(original.library.templates); changed.sets[0].parts[0].nodes[0].gap = 19;
    let ownershipChecks = 0;
    const saved = await store.save(original.revision, changed, async () => { ownershipChecks++; });
    assert.equal(ownershipChecks, 1); assert.notEqual(saved.revision, original.revision);
    await assert.rejects(store.save(original.revision, changed, async () => {}), error => error.status === 409);
    const before = await readFile(path.join(directory, "work/global-template-library.json"), "utf8");
    await assert.rejects(store.save(saved.revision, { ...changed, sets: [] }, async () => {}));
    assert.equal(await readFile(path.join(directory, "work/global-template-library.json"), "utf8"), before);
    assert.deepEqual(JSON.parse(await readFile(path.join(directory, `.studio/global-template-history/${original.revision}.json`), "utf8")), original.library);
    const denied = structuredClone(changed); denied.sets[0].parts[0].nodes[0].gap = 20;
    await assert.rejects(store.save(saved.revision, denied, async () => { throw new Error("lease expired"); }));
    assert.equal(await readFile(path.join(directory, "work/global-template-library.json"), "utf8"), before);
  } finally { await store.close(); await rm(directory, { recursive: true, force: true }); }
});
test("preview refresh preserves site source revision and checks concurrent source edits", async () => {
  const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), "studio-preview-")));
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.join(directory, "content")); await mkdir(path.join(directory, "dist"));
  const document = { siteId: "test", text: "Saved" }; const revision = revisionOf(document);
  let global = "first";
  const render = (value, rev) => `<meta name="acm-test-revision" content="${rev}"><meta name="acm-global-template-revision" content="${global}"><p>${value.text}</p>`;
  await writeFile(path.join(directory, "content/site.json"), JSON.stringify(document)); await writeFile(path.join(directory, "dist/index.html"), render(document, revision));
  const store = createTestSiteStore({ root: directory, validate: value => value.siteId === "test", render });
  try {
    const connected = await store.connect(); global = "second"; await store.refreshPreview();
    const fresh = await store.handle(connected.token, { action: "read", siteId: "test" });
    assert.equal(fresh.revision, connected.revision); assert.deepEqual(fresh.document, document);
    assert.match(await readFile(path.join(directory, "dist/index.html"), "utf8"), /content="second"/);
  } finally { await store.close(); await rm(directory, { recursive: true, force: true }); }
});

test("legacy site Navigation aliases resolve to the global original", () => {
  const library = model.createGlobalTemplateLibrary(fixtures());
  const binding = library.migrations.test2.bindings.find(item => item.globalSetId === "studio-global-navigation");
  assert.deepEqual(model.globalTemplateScopeTarget(binding, "fixture-test2-navigation", "fixture-test2-navigation-part", "global"), { setId: "studio-global-navigation", targetId: "studio-global-navigation-part", scope: "global" });
});

test("global hook installs merged acknowledgements and restarts its broker after a fresh source revision", async () => {
  const { default: ts } = await import("typescript");
  const { default: vm } = await import("node:vm");
  const source = await readFile(path.join(root, "app/studio/use-global-templates.ts"), "utf8");
  const slots = []; let cursor = 0; const effects = []; const sessions = [];
  let failSave = false; let authoritative = model.createGlobalTemplateLibrary(fixtures()); let hash = "a".repeat(64);
  const react = {
    useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
    useState(value) { const index = cursor++; if (!(index in slots)) slots[index] = typeof value === "function" ? value() : value; return [slots[index], next => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }]; },
    useEffect(effect, deps) { const index = cursor++; const old = slots[index]; if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) { slots[index] = { deps }; effects.push(() => { old?.cleanup?.(); slots[index].cleanup = effect(); }); } },
  };
  const intervals = []; const exports = {};
  let deferredRead; let deferRead = false;
  const request = async () => { if (deferRead) { deferRead = false; return new Promise(resolve => { deferredRead = resolve; }); } return ({ library: structuredClone(authoritative), revision: hash, initialised: true }); };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Error, Boolean, JSON, window: { addEventListener() {}, removeEventListener() {}, confirm: () => true }, setInterval: callback => { intervals.push(callback); return intervals.length; }, clearInterval() {}, require(name) {
    if (name === "react") return react;
    if (name === "./browser-template-references") return { currentBrowserTemplateReferences: () => [] };
    if (name === "./template-reference-gate") return { withTemplateReferenceWrite: fn => fn(), installGlobalReferenceLibrary() {}, protectGlobalReferenceRemoval() {} };
    if (name === "./template-model") return templates;
    if (name === "./global-template-contract") return model;
    if (name === "./write-ownership") return { studioWriteOwnership: { write: callback => callback() } };
    if (name === "./studio-sync") return { createStudioTransaction: sync.createStudioTransaction, createStudioSync(options) {
      const session = { options, closed: false, isPrimary: () => false, getStatus: () => "synced", retryConnection() {}, close() { this.closed = true; }, async submit(next) {
        if (failSave) throw new Error("CAS conflict");
        // Another peer has committed a different property before this operation.
        const merged = structuredClone(next); merged.sets[0].name = "Other peer original";
        options.onCommittedSnapshot(merged, { source: "commit" }); options.onSnapshot(merged, "commit");
      } }; sessions.push(session); options.onStatus("synced"); return session;
    } };
    throw new Error(`Unexpected import ${name}`);
  } });
  const site = { siteId: "test2", requestGlobalTemplates: request, canSaveGlobalTemplates: false };
  function render(readOnly = false) { cursor = 0; const result = exports.useGlobalTemplates(site, true, false, readOnly); while (effects.length) effects.shift()(); return result; }
  async function settle() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
  render(); await settle(); render(); render();
  let hook = render(); assert.equal(hook.session.writable, true);
  assert.equal(hook.session.commit(store => { store.sets[1].name = "This peer original"; return store; }), true);
  await settle(); hook = render();
  assert.equal(hook.session.store.sets[0].name, "Other peer original");
  assert.equal(hook.session.store.sets[1].name, "This peer original");
  assert.equal(hook.session.canUndo, false, "a merged acknowledgement cannot retain a whole-store Undo that would revert another peer");
  authoritative.templates = structuredClone(hook.session.store);
  authoritative.templates.sets[0].name = "Polled source"; hash = "b".repeat(64);
  intervals[0](); await settle(); render(); hook = render();
  assert.equal(sessions[0].closed, true);
  assert.equal(sessions.at(-1).options.initialSnapshot.sets[0].name, "Polled source");
  assert.equal(hook.session.commit(store => { store.sets[1].name = "After poll"; return store; }), true);
  await settle(); hook = render(); assert.equal(hook.session.store.sets[1].name, "After poll");
  deferRead = true; intervals[0](); await settle();
  assert.equal(hook.session.commit(store => { store.sets[1].name = "Newer saved draft"; return store; }), true);
  await settle(); render();
  deferredRead({ library: model.createGlobalTemplateLibrary(fixtures()), revision: "c".repeat(64), initialised: true });
  await settle(); hook = render();
  assert.equal(hook.session.store.sets[1].name, "Newer saved draft");
  failSave = true;
  assert.equal(hook.session.commit(store => { store.sets[1].name = "Preserved failed draft"; return store; }), true);
  await settle(); hook = render();
  assert.match(hook.session.error, /CAS conflict/);
  const draftExport = model.validateGlobalTemplateLibrary({ ...hook.library, templates: hook.session.store });
  assert.equal(draftExport.templates.sets[1].name, "Preserved failed draft");
  const count = sessions.length;
  render(true); await settle(); hook = render(true);
  assert.equal(hook.session.writable, false);
  assert.equal(sessions.length, count);
  assert.equal(hook.library.templates.sets[0].name, "Other peer original");
  const exported = model.validateGlobalTemplateLibrary({ ...hook.library, templates: hook.session.store });
  assert.equal(exported.templates.sets[1].name, "Preserved failed draft");
  slots.forEach(slot => slot?.cleanup?.());
});
