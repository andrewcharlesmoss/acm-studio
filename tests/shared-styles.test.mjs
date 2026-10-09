import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Readable } from "node:stream";
import { sharedStylesBridge } from "../scripts/shared-styles-bridge.mjs";
import { resetResponsiveStyleMetric } from "../app/studio/ui/styles/style-preset-values.ts";
import { createSharedStylesStore, serializeSharedStylePreset } from "../scripts/shared-styles-store.mjs";
import { createSharedStylesClient } from "../app/studio/ui/styles/shared-styles-client.mjs";
import { createUniversalStylePreset } from "../../acm-styles/src/index.ts";
import { projectStyleGuideTokens, indexStyleGuide } from "../app/studio/ui/styles/style-guide-tokens.mjs";

const guide = await readFile(new URL("../../workspace-governance/STYLE_GUIDE.md", import.meta.url), "utf8");
async function fixture(t, options = {}) {
  const projects = await realpath(await mkdtemp(path.join(os.tmpdir(), "acm-shared-styles-")));
  t.after(() => rm(projects, { recursive: true, force: true }));
  const root = path.join(projects, "acm-studio");
  const presetPath = path.join(projects, "acm-styles/src/universal-style-preset.json");
  const guidePath = path.join(projects, "workspace-governance/STYLE_GUIDE.md");
  const bundlePath = path.join(root, "app/studio/ui/styles/style-guide-source.json");
  for (const file of [presetPath, guidePath, bundlePath]) await mkdir(path.dirname(file), { recursive: true });
  await writeFile(presetPath, JSON.stringify(createUniversalStylePreset()));
  await writeFile(guidePath, guide);
  await writeFile(bundlePath, "{}");
  const store = createSharedStylesStore({ root, provenance: () => ({ revision: "a".repeat(40), committed: guide }), ...options });
  return { store, root, presetPath, guidePath, bundlePath };
}

test("a saved preset updates all canonical values, guide cells and source mappings", async t => {
  const f = await fixture(t);
  const state = await f.store.load();
  const changed = structuredClone(state.preset);
  changed.palette.accent = "#123456";
  changed.buttons.outline.hoverForeground = "#112233";
  changed.typography.body.family = "helvetica-neue";
  changed.typography.body.size.mobile = { value: 15, unit: "px" };
  changed.layout.contentWidth = 1200;
  const saved = await f.store.save({ revision: state.revision, preset: changed });
  assert.deepEqual(saved.preset, changed);
  assert.notEqual(saved.revision, state.revision);
  assert.equal((await f.store.load()).revision, saved.revision);
  assert.deepEqual(JSON.parse(await readFile(f.presetPath, "utf8")), changed);
  const written = await readFile(f.guidePath, "utf8");
  assert.match(written, /palette.accent \| --acm-color-accent \| #123456/);
  assert.match(written, /typography.body \| Helvetica Neue \| 1.0625rem; mobile: 15px/);
  assert.match(written, /layout.contentWidth \| --acm-layout-content-width \| 1200px/);
  const bundle = JSON.parse(await readFile(f.bundlePath, "utf8"));
  assert.equal(bundle.document, written);
  assert.equal(bundle.sourceWorkingTree, true);
  assert.equal(bundle.mappings["palette.accent"].excerpt, written.split("\n")[bundle.mappings["palette.accent"].line - 1]);
  // Everything outside the bounded token rows is retained byte for byte.
  const prose = value => value.split("\n").filter(line => !/^\| (palette|typography|buttons|layout)\./.test(line));
  assert.deepEqual(prose(written), prose(guide));
});

test("invalid values, unknown targets and schema changes leave files unchanged", async t => {
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

test("external source changes and competing saves reject stale drafts", async t => {
  const f = await fixture(t);
  const state = await f.store.load();
  const changed = { ...state.preset, layout: { ...state.preset.layout, spacing: 30 } };
  const results = await Promise.allSettled([f.store.save({ preset: changed, revision: state.revision }), f.store.save({ preset: changed, revision: state.revision })]);
  assert.deepEqual(results.map(result => result.status), ["fulfilled", "rejected"]);
  const latest = await f.store.load();
  await writeFile(f.guidePath, `${latest.source.document}\nExternal policy edit\n`);
  await assert.rejects(f.store.save({ preset: changed, revision: latest.revision }), /source files changed/);
  assert.match(await readFile(f.guidePath, "utf8"), /External policy edit/);
});

test("an external preset-only edit can synchronise tables without inventing a draft edit", async t => {
  const f = await fixture(t);
  let state = await f.store.load();
  state = await f.store.save({ preset: state.preset, revision: state.revision });
  assert.equal(state.needsSynchronisation, false);
  const preset = { ...state.preset, palette: { ...state.preset.palette, accent: "#224466" } };
  await writeFile(f.presetPath, JSON.stringify(preset));
  state = await f.store.load();
  assert.equal(state.needsSynchronisation, true);
  assert.equal(state.preset.palette.accent, "#224466");
  const synced = await f.store.save({ preset: state.preset, revision: state.revision });
  assert.equal(synced.needsSynchronisation, false);
  assert.match(await readFile(f.guidePath, "utf8"), /palette.accent \| --acm-color-accent \| #224466/);
});

test("saving native lower-case colour input normalises source hex without expanding metrics", async t => {
  const f = await fixture(t);
  const state = await f.store.load();
  const preset = { ...state.preset, palette: { ...state.preset.palette, accent: "#abcdef" } };
  preset.typography.body.size.mobile = { value: 15, unit: "px" };
  const saved = await f.store.save({ preset, revision: state.revision });
  assert.equal(saved.preset.palette.accent, "#ABCDEF");
  const raw = await readFile(f.presetPath, "utf8");
  assert.match(raw, /"size": \{ "desktop": \{ "value": 1.0625, "unit": "rem" \}, "mobile": \{ "value": 15, "unit": "px" \} \}/);
  assert.deepEqual(JSON.parse(raw), saved.preset);
  const baseline = await readFile(new URL("../../acm-styles/src/universal-style-preset.json", import.meta.url), "utf8");
  assert.equal(serializeSharedStylePreset(JSON.parse(baseline)), baseline);
});

test("a replacement failure rolls all written files back before another save", async t => {
  let count = 0;
  const f = await fixture(t, { replaceFile: async (temp, file) => { if (++count === 2) throw new Error("Injected replacement failure"); await rename(temp, file); } });
  const state = await f.store.load();
  const preset = { ...state.preset, palette: { ...state.preset.palette, accent: "#123456" } };
  await assert.rejects(f.store.save({ preset, revision: state.revision }), /Injected/);
  assert.equal((await f.store.load()).revision, state.revision);
  assert.equal((await f.store.save({ preset, revision: state.revision })).preset.palette.accent, "#123456");
});

test("uncertain recovery, process guards and symlink targets block writes", async t => {
  const f = await fixture(t);
  const state = await f.store.load();
  await mkdir(path.join(f.root, "work"));
  await writeFile(path.join(f.root, "work/shared-styles.lock"), "other server");
  await assert.rejects(f.store.save({ preset: state.preset, revision: state.revision }), /Another local server/);
  await rm(path.join(f.root, "work/shared-styles.lock"));
  await writeFile(path.join(f.root, "work/shared-styles-recovery.json"), "incomplete transaction");
  await assert.rejects(f.store.load(), /recovery/);
  await rm(path.join(f.root, "work/shared-styles-recovery.json"));
  const target = `${f.presetPath}.external`;
  await rename(f.presetPath, target);
  await symlink(target, f.presetPath);
  await assert.rejects(f.store.save({ preset: state.preset, revision: state.revision }), /unsupported file/);
});

test("an external edit during a failed transaction survives and retains recovery evidence", async t => {
  let count = 0;
  const f = await fixture(t, { replaceFile: async (temp, file) => {
    if (++count === 2) { await writeFile(file, `${guide}\nConcurrent external edit\n`); throw new Error("Injected conflict"); }
    await rename(temp, file);
  } });
  const state = await f.store.load();
  const preset = { ...state.preset, palette: { ...state.preset.palette, accent: "#112244" } };
  await assert.rejects(f.store.save({ preset, revision: state.revision }), /needs recovery/);
  assert.match(await readFile(f.guidePath, "utf8"), /Concurrent external edit/);
  const recovery = JSON.parse(await readFile(path.join(f.root, "work/shared-styles-recovery.json"), "utf8"));
  assert.equal(recovery.files[0].before, JSON.stringify(state.preset));
  await assert.rejects(f.store.load(), /recovery/);
});

test("viewport reset restores a saved override and removes only unsaved overrides", () => {
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
  sharedStylesBridge({ createStore: () => ({ load: async () => state, save: async () => { saves++; return state; } }) }).configureServer({
    config: { root: "/fixture/acm-studio" }, httpServer: { address: () => ({ port: 3010 }) },
    middlewares: { use: (_url, handler) => { middleware = handler; } },
  });
  async function call(body, headers = {}) {
    const request = Readable.from([typeof body === "string" ? body : JSON.stringify(body)]);
    request.method = "POST";
    request.socket = { remoteAddress: "127.0.0.1" };
    request.headers = { host: "localhost:3010", origin: "http://localhost:3010", "content-type": "application/json", "x-studio-client": "codex-history", ...headers };
    const response = { statusCode: 200, setHeader() {}, end(value) { this.body = JSON.parse(value); } };
    await middleware(request, response);
    return response;
  }
  assert.equal((await call({ action: "load" }, { origin: "https://foreign.example" })).statusCode, 403);
  assert.equal((await call({ action: "load" }, { host: "foreign.example" })).statusCode, 403);
  assert.equal((await call("x".repeat(25000))).statusCode, 413);
  assert.equal((await call({ action: "save", preset: state.preset, revision: state.revision })).statusCode, 403);
  const loaded = await call({ action: "load" });
  assert.match(loaded.body.token, /^[a-f0-9]{64}$/);
  assert.equal((await call({ action: "save", preset: state.preset, revision: state.revision, target: "arbitrary" }, { "x-studio-styles-token": loaded.body.token })).statusCode, 400);
  assert.equal(saves, 0);
  assert.equal((await call({ action: "save", preset: state.preset, revision: state.revision }, { "x-studio-styles-token": loaded.body.token })).statusCode, 200);
  assert.equal(saves, 1);
});

test("source HMR suppression preserves the Styles editor and leaves unrelated modules live", () => {
  const plugin = sharedStylesBridge({ createStore: () => ({}) });
  plugin.configureServer({ config: { root: "/fixture/acm-studio" }, middlewares: { use() {} } });
  for (const file of ["/fixture/acm-styles/src/universal-style-preset.json", "/fixture/workspace-governance/STYLE_GUIDE.md", "/fixture/acm-studio/app/studio/ui/styles/style-guide-source.json"]) assert.deepEqual(plugin.hotUpdate({ file }), []);
  assert.equal(plugin.hotUpdate({ file: "/fixture/acm-styles/src/styles.css" }), undefined);
  assert.equal(plugin.hotUpdate({ file: "/fixture/acm-styles/src/index.ts" }), undefined);
});

test("the live guide projects draft values without changing policy or line positions", () => {
  const preset = createUniversalStylePreset();
  preset.palette.accent = "#654321";
  const projected = projectStyleGuideTokens(guide, preset);
  assert.equal(projected.split("\n").length, guide.split("\n").length);
  const mapping = indexStyleGuide(projected, preset).mappings["palette.accent"];
  assert.match(mapping.excerpt, /#654321/);
  assert.throws(() => projectStyleGuideTokens(guide.replace(/\| palette.accent[^\n]+\n/, ""), preset), /missing/);
  assert.throws(() => projectStyleGuideTokens(`${guide}\n${mapping.excerpt}`, preset), /Duplicate/);
});

test("browser saving borrows ownership and blocks retry after an uncertain dispatch", async () => {
  const state = { preset: createUniversalStylePreset(), revision: "a".repeat(64), token: "b".repeat(64), source: { document: guide } };
  let dispatched = 0;
  let owned = false;
  const client = createSharedStylesClient({
    ownership: { canWrite: () => true, write: async operation => { owned = true; try { return await operation(); } finally { owned = false; } } },
    fetcher: async (_url, options) => {
      const action = JSON.parse(options.body).action;
      if (action === "save") { assert.equal(owned, true); dispatched++; throw new Error("Lost response"); }
      return { ok: true, json: async () => state };
    },
  });
  await assert.rejects(client.save(state.preset, state), /Lost response/);
  await assert.rejects(client.save(state.preset, state), /previous save/);
  assert.equal(dispatched, 1);
  await client.load();
  await assert.rejects(client.save(state.preset, state), /Lost response/);
  assert.equal(dispatched, 2);
});

test("browser saving refuses a missing lock or newer file revision before dispatch", async () => {
  const state = { preset: createUniversalStylePreset(), revision: "a".repeat(64), token: "b".repeat(64), source: { document: guide } };
  let saves = 0;
  const options = { ownership: { canWrite: () => false }, locks: { request: async (_name, _options, callback) => callback(null) } };
  await assert.rejects(createSharedStylesClient(options).save(state.preset, state), /Another Studio tab/);
  const client = createSharedStylesClient({ ownership: { canWrite: () => true, write: operation => operation() }, fetcher: async (_url, options) => {
    if (JSON.parse(options.body).action === "save") saves++;
    return { ok: true, json: async () => ({ ...state, revision: "c".repeat(64) }) };
  } });
  await assert.rejects(client.save(state.preset, state), /source files changed/);
  assert.equal(saves, 0);
});
