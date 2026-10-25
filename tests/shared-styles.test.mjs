import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Readable } from "node:stream";
import { sharedStylesBridge } from "../scripts/shared-styles-bridge.mjs";
import { resetResponsiveStyleMetric } from "../app/studio/ui/styles/style-preset-values.ts";
import { createSharedStylesStore } from "../scripts/shared-styles-store.mjs";
import { createSharedStylesClient } from "../app/studio/ui/styles/shared-styles-client.mjs";
import { createInterfaceStylePreset, createUniversalStylePreset, styleGuideMarkdown as guide } from "./style-test-presets.mjs";
import { indexStyleGuide, parseStyleGuidePresets, updateStyleGuideTokensFromDraft } from "../app/studio/ui/styles/style-guide-tokens.mjs";

async function fixture(t, options = {}) {
  const projects = await realpath(await mkdtemp(path.join(os.tmpdir(), "acm-shared-styles-")));
  t.after(() => rm(projects, { recursive: true, force: true }));
  const root = path.join(projects, "acm-studio");
  const guidePath = path.join(projects, "workspace-governance/STYLE_GUIDE.md");
  await mkdir(path.dirname(guidePath), { recursive: true });
  await mkdir(path.join(root, "app"), { recursive: true });
  await writeFile(guidePath, guide);
  const store = createSharedStylesStore({ root, provenance: () => ({ revision: "a".repeat(40), committed: guide }), ...options });
  return { store, root, guidePath };
}

test("loads executable values and exact guide lines directly from Markdown", async t => {
  const f = await fixture(t);
  const state = await f.store.load("interface");
  assert.equal(state.preset.fields.radius, 2);
  assert.equal(state.preset.colours.secondaryText, createInterfaceStylePreset().colours.secondaryText);
  assert.equal(state.source.document, guide);
  assert.equal(state.source.mappings["interface.colours.secondaryText"].excerpt, guide.split("\n").find(line => line.startsWith("| interface.colours.secondaryText |")));
  assert.equal(guide.split("\n")[state.source.mappings["interface.colours.secondaryText"].line - 1], state.source.mappings["interface.colours.secondaryText"].excerpt);
  assert.equal(Object.hasOwn(state, "presetSource"), false);
});

test("website and interface drafts save only to the one Markdown source", async t => {
  const f = await fixture(t);
  const website = await f.store.load("website");
  const interfaceSource = await f.store.load("interface");
  assert.equal(website.revision, interfaceSource.revision);
  const changedInterface = structuredClone(interfaceSource.preset);
  changedInterface.colours.label = "#000000";
  changedInterface.fields.radius = 4;
  await f.store.save({ scope: "interface", revision: interfaceSource.revision, preset: changedInterface });
  const afterInterface = await readFile(f.guidePath, "utf8");
  assert.match(afterInterface, /interface\.colours\.label \| --acm-ui-color-label \| [^|]+ \| #000000/);
  assert.match(afterInterface, /interface\.fields\.radius \| --acm-ui-field-radius \| [^|]+ \| 4px/);
  const changedWebsite = structuredClone(website.preset);
  changedWebsite.palette.accent = "#123456";
  const freshWebsite = await f.store.load("website");
  await f.store.save({ scope: "website", revision: freshWebsite.revision, preset: changedWebsite });
  const final = await f.store.load("interface");
  assert.equal(final.preset.colours.label, "#000000");
  assert.equal(final.preset.fields.radius, 4);
  assert.equal((await f.store.load("website")).preset.palette.accent, "#123456");
  assert.deepEqual((await readFile(f.guidePath, "utf8")).split("\n").filter(line => /^\| (palette|typography|buttons|interactions|layout|interface)\./.test(line)).length,
    guide.split("\n").filter(line => /^\| (palette|typography|buttons|interactions|layout|interface)\./.test(line)).length);
});

test("saving updates token rows, reparses readback, and builds a fresh line index", async t => {
  const f = await fixture(t);
  const state = await f.store.load();
  const changed = structuredClone(state.preset);
  changed.palette.accent = "#abcdef";
  changed.buttons.outline.hoverForeground = "#112233";
  changed.typography.body.family = "helvetica-neue";
  changed.typography.body.size.mobile = { value: 15, unit: "px" };
  changed.layout.contentWidth = 1200;
  const saved = await f.store.save({ revision: state.revision, preset: changed });
  assert.equal(saved.preset.palette.accent, "#ABCDEF");
  assert.equal(saved.revision, (await f.store.load()).revision);
  assert.equal(saved.source.mappings["palette.accent"].excerpt, saved.source.document.split("\n")[saved.source.mappings["palette.accent"].line - 1]);
  assert.match(saved.source.document, /typography\.body \| Helvetica Neue \| 1\.0625rem; mobile: 15px/);
  assert.match(saved.source.document, /layout\.contentWidth \| --acm-layout-content-width \| 1200px/);
  assert.deepEqual(parseStyleGuidePresets(saved.source.document).universalPreset, saved.preset);
  assert.doesNotMatch(saved.source.document, /interface-style-preset\.json|universal-style-preset\.json|style-guide-source\.json/);
  const prose = value => value.split("\n").filter(line => !/^\| (palette|typography|buttons|interactions|layout)\./.test(line));
  assert.deepEqual(prose(saved.source.document), prose(guide));
});

test("Saved Value stays beside Original Default while the parser and writer follow column headings", () => {
  const savedGuide = guide.split("\n");
  const headers = savedGuide.filter(line => line.startsWith("| Preset path |"));
  const reorderedHeaders = headers.filter(line => line.includes("| Role |"));
  assert.equal(reorderedHeaders.length, 3);
  for (const header of reorderedHeaders) {
    assert.ok(header.indexOf("| Role |") < header.indexOf("| Saved Value |"));
    assert.ok(header.indexOf("| Saved Value |") < header.indexOf("| Original Default |"));
    assert.ok(header.trimEnd().endsWith("| Original Default |"));
  }

  const current = parseStyleGuidePresets(guide);
  const changedWebsite = structuredClone(current.universalPreset);
  const changedInterface = structuredClone(current.interfacePreset);
  changedWebsite.palette.accent = "#224466";
  changedWebsite.interactions.selectionColour = "#335577";
  changedInterface.colours.label = "#446688";
  const updated = updateStyleGuideTokensFromDraft(guide, changedWebsite, changedInterface);
  const row = (document, path) => document.split("\n").find(line => line.startsWith(`| ${path} |`)).split("|").slice(1, -1).map(cell => cell.trim());

  for (const [path, expected] of [
    ["palette.accent", "#224466"],
    ["interactions.selectionColour", "#335577"],
    ["interface.colours.label", "#446688"],
  ]) {
    const before = row(guide, path);
    const after = row(updated, path);
    assert.equal(after[2], before[2], `${path} Role remains in place`);
    assert.equal(after[3], expected, `${path} Saved Value is updated`);
    assert.equal(after[4], before[4], `${path} Original Default is unchanged`);
  }
  assert.deepEqual(parseStyleGuidePresets(updated).universalPreset, changedWebsite);
  assert.deepEqual(parseStyleGuidePresets(updated).interfacePreset, changedInterface);

  let roleBeforeSaved = false;
  const legacyGuide = guide.split("\n").map(line => {
    if (!line.startsWith("| ")) { roleBeforeSaved = false; return line; }
    const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
    if (cells[0] === "Preset path") {
      roleBeforeSaved = cells.indexOf("Role") >= 0 && cells.indexOf("Role") < cells.indexOf("Saved Value");
      if (roleBeforeSaved) [cells[2], cells[3]] = [cells[3], cells[2]];
      return roleBeforeSaved ? `| ${cells.join(" | ")} |` : line;
    }
    if (roleBeforeSaved && /^(interface|palette|interactions)\./.test(cells[0])) {
      [cells[2], cells[3]] = [cells[3], cells[2]];
      return `| ${cells.join(" | ")} |`;
    }
    return line;
  }).join("\n");
  assert.deepEqual(parseStyleGuidePresets(legacyGuide), current);
  const legacyUpdated = updateStyleGuideTokensFromDraft(legacyGuide, changedWebsite, changedInterface);
  assert.equal(row(legacyUpdated, "palette.accent")[2], "#224466");
  assert.equal(row(legacyUpdated, "palette.accent")[3], row(legacyGuide, "palette.accent")[3]);
  assert.equal(row(legacyUpdated, "palette.accent")[4], row(legacyGuide, "palette.accent")[4]);
});

test("malformed guide values fail clearly instead of falling back to bundled defaults", async t => {
  const f = await fixture(t);
  const broken = guide.replace(/\| interface\.buttons\.base\.background \|[^\n]+/, "| interface.buttons.base.background | --acm-ui-button-base-background | invalid | Primary action |");
  await writeFile(f.guidePath, broken);
  await assert.rejects(f.store.load("interface"), /STYLE_GUIDE\.md could not be parsed: Style Guide line .*malformed token row/);
  const repaired = await f.store.load("interface").catch(() => null);
  assert.equal(repaired, null);
});

test("invalid drafts, unknown targets, and schema-version changes leave the guide unchanged", async t => {
  const f = await fixture(t);
  const state = await f.store.load();
  for (const value of [
    { ...state.preset, layout: { ...state.preset.layout, contentWidth: 99999 } },
    { ...state.preset, palette: { ...state.preset.palette, accent: "red;url(unsafe)" } },
    { ...state.preset, version: "0.1.0" },
  ]) await assert.rejects(f.store.save({ revision: state.revision, preset: value }));
  await assert.rejects(f.store.save({ revision: state.revision, preset: state.preset, file: "/tmp/arbitrary" }));
  assert.equal((await f.store.load()).revision, state.revision);
});

test("hand edits are picked up by the next load and stale drafts are rejected", async t => {
  const f = await fixture(t);
  const old = await f.store.load();
  const handEdited = guide.replace(/(\| palette\.accent \| --acm-color-accent \| [^|]+ \|) #0088FF/, "$1 #224466");
  await writeFile(f.guidePath, handEdited);
  const fresh = await f.store.load();
  assert.equal(fresh.preset.palette.accent, "#224466");
  assert.notEqual(fresh.revision, old.revision);
  await assert.rejects(f.store.save({ preset: old.preset, revision: old.revision }), /STYLE_GUIDE\.md changed/);
  assert.match(await readFile(f.guidePath, "utf8"), /#224466/);
});

test("competing saves reject stale revisions, and a failed replacement rolls back", async t => {
  let replacements = 0;
  const f = await fixture(t, { replaceFile: async (temp, file) => { if (++replacements === 1) throw new Error("Injected replacement failure"); await rename(temp, file); } });
  const state = await f.store.load();
  const changed = structuredClone(state.preset);
  changed.palette.accent = "#123456";
  await assert.rejects(f.store.save({ preset: changed, revision: state.revision }), /Injected replacement failure/);
  assert.equal((await f.store.load()).revision, state.revision);
  const results = await Promise.allSettled([f.store.save({ preset: changed, revision: state.revision }), f.store.save({ preset: changed, revision: state.revision })]);
  assert.deepEqual(results.map(result => result.status), ["fulfilled", "rejected"]);
});

test("process guards, recovery records, and symlinked Markdown block writes", async t => {
  const f = await fixture(t);
  const state = await f.store.load();
  await mkdir(path.join(f.root, "work"));
  await writeFile(path.join(f.root, "work/shared-styles.lock"), "other server");
  await assert.rejects(f.store.save({ preset: state.preset, revision: state.revision }), /Another local server/);
  await rm(path.join(f.root, "work/shared-styles.lock"));
  await writeFile(path.join(f.root, "work/shared-styles-recovery.json"), "incomplete transaction");
  await assert.rejects(f.store.load(), /recovery/);
  await rm(path.join(f.root, "work/shared-styles-recovery.json"));
  const target = `${f.guidePath}.external`;
  await rename(f.guidePath, target);
  await symlink(target, f.guidePath);
  await assert.rejects(f.store.save({ preset: state.preset, revision: state.revision }), /supported regular file/);
});

test("viewport reset restores saved overrides and removes only unsaved overrides", () => {
  const saved = { desktop: { value: 17, unit: "px" }, mobile: { value: 15, unit: "px" } };
  const draft = { desktop: { value: 20, unit: "px" }, tablet: { value: 18, unit: "px" }, mobile: { value: 16, unit: "px" } };
  assert.deepEqual(resetResponsiveStyleMetric(draft, saved, "mobile"), { ...draft, mobile: saved.mobile });
  assert.deepEqual(resetResponsiveStyleMetric(draft, saved, "tablet"), { desktop: draft.desktop, mobile: draft.mobile });
  assert.deepEqual(resetResponsiveStyleMetric(draft, saved, "desktop"), { ...draft, desktop: saved.desktop });
  assert.equal(draft.mobile.value, 16);
});

test("the dev bridge rejects foreign origins, oversized input and missing sessions before writing", async () => {
  let middleware;
  let saves = 0;
  const state = { preset: createUniversalStylePreset(), revision: "a".repeat(64), source: { document: guide } };
  sharedStylesBridge({ createStore: () => ({ load: async scope => ({ ...state, scope }), save: async () => { saves++; return state; } }) }).configureServer({
    config: { root: "/fixture/acm-studio" }, httpServer: { address: () => ({ port: 3010 }) },
    middlewares: { use: (_url, handler) => { middleware = handler; } },
  });
  async function call(body, headers = {}) {
    const request = Readable.from([typeof body === "string" ? body : JSON.stringify(body)]);
    request.method = "POST"; request.socket = { remoteAddress: "127.0.0.1" };
    request.headers = { host: "localhost:3010", origin: "http://localhost:3010", "content-type": "application/json", "x-studio-client": "codex-history", ...headers };
    const response = { statusCode: 200, setHeader() {}, end(value) { this.body = JSON.parse(value); } };
    await middleware(request, response); return response;
  }
  assert.equal((await call({ action: "load" }, { origin: "https://foreign.example" })).statusCode, 403);
  assert.equal((await call("x".repeat(25000))).statusCode, 413);
  assert.equal((await call({ action: "save", preset: state.preset, revision: state.revision })).statusCode, 403);
  const loaded = await call({ action: "load" });
  assert.match(loaded.body.token, /^[a-f0-9]{64}$/);
  assert.equal((await call({ action: "save", preset: state.preset, revision: state.revision, target: "arbitrary" }, { "x-studio-styles-token": loaded.body.token })).statusCode, 400);
  assert.equal((await call({ action: "save", preset: state.preset, revision: state.revision }, { "x-studio-styles-token": loaded.body.token })).statusCode, 200);
  assert.equal(saves, 1);
});

test("development suppresses only guide HMR so a restart reloads hand edits safely", () => {
  const plugin = sharedStylesBridge({ createStore: () => ({}) });
  const config = { root: "/fixture/acm-studio", configFileDependencies: ["/fixture/workspace-governance/STYLE_GUIDE.md", "/fixture/acm-studio/vite.config.ts"] };
  plugin.configResolved(config);
  assert.deepEqual(config.configFileDependencies, ["/fixture/acm-studio/vite.config.ts"]);
  plugin.configureServer({ config: { root: "/fixture/acm-studio" }, middlewares: { use() {} } });
  assert.deepEqual(plugin.hotUpdate({ file: "/fixture/workspace-governance/STYLE_GUIDE.md" }), []);
  assert.equal(plugin.hotUpdate({ file: "/fixture/acm-studio/app/layout.tsx" }), undefined);
});

test("draft projection changes only the canonical token row and retains the line index", () => {
  const preset = createUniversalStylePreset();
  preset.palette.accent = "#654321";
  const projected = updateStyleGuideTokensFromDraft(guide, preset);
  assert.equal(projected.split("\n").length, guide.split("\n").length);
  const mapping = indexStyleGuide(projected, preset).mappings["palette.accent"];
  assert.match(mapping.excerpt, /#654321/);
  assert.throws(() => parseStyleGuidePresets(guide.replace(/\| palette\.accent[^\n]+\n/, "")), /missing required/);
});

test("browser saving borrows ownership and blocks retries after an uncertain dispatch", async () => {
  const state = { preset: createUniversalStylePreset(), revision: "a".repeat(64), token: "b".repeat(64), source: { document: guide } };
  let dispatched = 0; let owned = false;
  const client = createSharedStylesClient({
    ownership: { canWrite: () => true, write: async operation => { owned = true; try { return await operation(); } finally { owned = false; } } },
    fetcher: async (_url, options) => {
      if (JSON.parse(options.body).action === "save") { assert.equal(owned, true); dispatched++; throw new Error("Lost response"); }
      return { ok: true, json: async () => state };
    },
  });
  await assert.rejects(client.save(state.preset, state), /Lost response/);
  await assert.rejects(client.save(state.preset, state), /previous save/);
  assert.equal(dispatched, 1);
});

test("browser saving refuses an unavailable lock or newer source before dispatch", async () => {
  const state = { preset: createUniversalStylePreset(), revision: "a".repeat(64), token: "b".repeat(64), source: { document: guide } };
  let saves = 0;
  await assert.rejects(createSharedStylesClient({ ownership: { canWrite: () => false }, locks: { request: async (_name, _options, callback) => callback(null) } }).save(state.preset, state), /Another Studio tab/);
  const client = createSharedStylesClient({ ownership: { canWrite: () => true, write: operation => operation() }, fetcher: async (_url, options) => {
    if (JSON.parse(options.body).action === "save") saves++;
    return { ok: true, json: async () => ({ ...state, revision: "c".repeat(64) }) };
  } });
  await assert.rejects(client.save(state.preset, state), /STYLE_GUIDE\.md changed/);
  assert.equal(saves, 0);
});

test("interface browser saves retain explicit scope for fresh reads and writes", async () => {
  const state = { preset: createInterfaceStylePreset(), revision: "a".repeat(64), token: "b".repeat(64), source: { document: guide } };
  const requests = [];
  const client = createSharedStylesClient({ scope: "interface", ownership: { canWrite: () => true, write: operation => operation() }, fetcher: async (_url, options) => {
    const input = JSON.parse(options.body); requests.push(input);
    return { ok: true, json: async () => ({ ...state, preset: input.action === "save" ? input.preset : state.preset }) };
  } });
  const changed = structuredClone(state.preset); changed.colours.label = "#000000";
  await client.save(changed, state);
  assert.deepEqual(requests.map(request => [request.action, request.scope]), [["load", "interface"], ["save", "interface"]]);
});


test("saved customisations never replace original defaults in either scope", async t => {
  const f = await fixture(t);
  const before = parseStyleGuidePresets(guide);
  assert.equal(before.originalInterfacePreset.colours.secondaryText, "#636366");
  assert.equal(before.originalInterfacePreset.colours.blockSelection, "#FF383C");
  assert.equal(before.originalInterfacePreset.typography.control.family, "system-sans");
  const customised = structuredClone(before.interfacePreset);
  customised.colours.secondaryText = "#F2F2F7";
  await writeFile(f.guidePath, updateStyleGuideTokensFromDraft(guide, before.universalPreset, customised));
  for (const scope of ["website", "interface"]) {
    const state = await f.store.load(scope);
    const draft = structuredClone(state.preset);
    if (scope === "website") { draft.palette.accent = "#123456"; draft.typography.body.weight = 500; draft.buttons.base.borderWidth = 3; }
    else { draft.colours.secondaryText = "#123456"; draft.fields.radius = 8; draft.typography.control.weight = 500; draft.buttons.base.background = "#123456"; draft.buttons.base.borderWidth = 3; draft.interactions.buttons.foreground = "#123456"; }
    const saved = await f.store.save({ scope, preset: draft, revision: state.revision });
    const parsed = parseStyleGuidePresets(saved.source.document);
    assert.deepEqual(parsed.originalUniversalPreset, before.originalUniversalPreset);
    assert.deepEqual(parsed.originalInterfacePreset, before.originalInterfacePreset);
    assert.deepEqual(scope === "website" ? parsed.universalPreset : parsed.interfacePreset, draft);
    assert.deepEqual(parseStyleGuidePresets((await f.store.load(scope)).source.document), parsed);
  }
});

test("missing or malformed original defaults fail without a fallback", () => {
  assert.throws(() => parseStyleGuidePresets(guide.replace(/(\| interface\.fields\.radius[^\n]+) 2px \|/, "$1 invalid |")), /Original Default|pixel units/);
  const missing = guide.replace(/(\| interface\.fields\.radius[^\n]+)\| 2px \|/, "$1|");
  assert.throws(() => parseStyleGuidePresets(missing), /Original Default|malformed token row/);
});
