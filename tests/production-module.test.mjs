import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { createHostModuleEvaluator, createIsolatedModuleLoader, evaluateProductionModule, loadProductionModule } from "./production-module.mjs";

async function fixture(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "studio module loader "));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, source] of Object.entries(files)) {
    const filename = path.join(root, name);
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, source);
  }
  return root;
}

test("ESM and isolated loaders share raw text, TSX fallback, native modules and style handling", async t => {
  const text = 'A "quoted" guide\nwith `ticks`, ${literal} and an em dash — intact.';
  const root = await fixture(t, {
    "entry.tsx": 'import text from "./guide.md?raw"; import { value } from "./nested"; import { fallback } from "./fallback.ts"; import "./styles.css"; export { text, value, fallback }; export const element = <span>{text}</span>;',
    "guide.md": text,
    "nested.mjs": "export const value = 42;",
    "fallback.tsx": "export const fallback = 'resolved TSX';",
    "styles.css": "span { color: red; }",
  });
  const isolated = createIsolatedModuleLoader({ root: pathToFileURL(root), overrides: { "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) } } });
  for (const result of [isolated("entry.tsx"), await loadProductionModule(pathToFileURL(path.join(root, "entry.tsx")))]) {
    assert.equal(result.text, text);
    assert.equal(result.value, 42);
    assert.equal(result.fallback, "resolved TSX");
    assert.equal(result.element.type, "span");
    assert.equal(result.element.props.children, text);
  }
});

test("isolated loaders cache within one tab and keep another tab's modules and globals separate", async t => {
  const root = await fixture(t, { "entry.ts": "counter.loads++; export const record = { value: counter.value };" });
  const firstCounter = { loads: 0, value: "first" };
  const secondCounter = { loads: 0, value: "second" };
  const first = createIsolatedModuleLoader({ root, globals: { counter: firstCounter } });
  const second = createIsolatedModuleLoader({ root, globals: { counter: secondCounter } });
  const result = first("entry.ts");
  result.record.value = "changed";
  assert.equal(first("entry.ts"), result);
  assert.equal(firstCounter.loads, 1);
  assert.equal(second("entry.ts").record.value, "second");
  assert.equal(secondCounter.loads, 1);
});

test("specifier overrides take precedence while file overrides cover aliases and direct loads", async t => {
  const root = await fixture(t, {
    "entry.ts": 'import { value } from "./owner"; export { value };',
    "owner.ts": 'throw new Error("The production owner must remain isolated.");',
  });
  const owner = { value: "file fake" };
  const load = createIsolatedModuleLoader({ root, fileOverrides: { "owner.ts": owner } });
  assert.equal(load("owner.ts"), owner);
  assert.equal(load("entry.ts").value, "file fake");
  const specific = createIsolatedModuleLoader({ root, fileOverrides: { "owner.ts": owner }, overrides: { "./owner": { value: "specifier fake" } } });
  assert.equal(specific("entry.ts").value, "specifier fake");
});

test("source mutations retain logical import paths without replacing other modules", async t => {
  const root = await fixture(t, {
    "entry.ts": "export const value = 'original';",
    "dependency.ts": "export const value = 'logical dependency';",
    "mutation/entry.ts": 'export { value } from "./dependency";',
    "mutation/dependency.ts": "export const value = 'wrong mutation directory';",
  });
  const load = createIsolatedModuleLoader({ root, sourceOverrides: { "entry.ts": path.join(root, "mutation/entry.ts") } });
  assert.equal(load("entry.ts").value, "logical dependency");
  assert.equal(createIsolatedModuleLoader({ root })("entry.ts").value, "original");
});

test("missing dependencies and failed execution do not poison the isolated module cache", async t => {
  const root = await fixture(t, {
    "entry.ts": 'export { value } from "./later";',
    "retry.ts": 'if (control.fail) throw new Error("retry me"); export const value = "recovered";',
  });
  const control = { fail: true };
  const load = createIsolatedModuleLoader({ root, globals: { control } });
  assert.throws(() => load("entry.ts"), { code: "ENOENT" });
  await writeFile(path.join(root, "later.ts"), "export const value = 9;");
  assert.equal(load("entry.ts").value, 9);
  assert.throws(() => load("retry.ts"), /retry me/);
  control.fail = false;
  assert.equal(load("retry.ts").value, "recovered");
});

test("isolated loading preserves CommonJS cycles and module.exports replacements", async t => {
  const root = await fixture(t, {
    "a.ts": 'exports.value = "a"; exports.fromB = require("./b").value;',
    "b.ts": 'exports.value = "b"; exports.fromA = require("./a").value;',
    "replacement.ts": 'module.exports = { value: "replacement" };',
  });
  const load = createIsolatedModuleLoader({ root });
  assert.equal(load("a.ts").fromB, "b");
  assert.equal(load("b.ts").fromA, "a");
  assert.equal(load("replacement.ts").value, "replacement");
});

test("uncached loading remains available for protocol fixtures", async t => {
  const root = await fixture(t, { "entry.ts": "export const value = ++counter.loads;" });
  const counter = { loads: 0 };
  const load = createIsolatedModuleLoader({ root, cache: false, globals: { counter } });
  assert.equal(load("entry.ts").value, 1);
  assert.equal(load("entry.ts").value, 2);
});

test("a failed ESM import can be retried after its missing source is supplied", async t => {
  const root = await fixture(t, { "entry.ts": 'export { value } from "./later";' });
  const url = pathToFileURL(path.join(root, "entry.ts"));
  await assert.rejects(loadProductionModule(url), { code: "ENOENT" });
  await writeFile(path.join(root, "later.ts"), "export const value = 11;");
  assert.equal((await loadProductionModule(url)).value, 11);
});

test("complete-module evaluators preserve VM contexts and the host realm", () => {
  const vmContext = { exports: {}, marker: { value: "kept" } };
  evaluateProductionModule("export const value = marker.value; globalThis.exposed = marker;", vmContext);
  assert.equal(vmContext.exports.value, "kept");
  assert.equal(vmContext.exposed, vmContext.marker);
  const run = createHostModuleEvaluator(["exports", "value"], "export const result = [value]; return exports;");
  const exports = run({}, "host");
  assert.deepEqual(exports.result, ["host"]);
  assert.equal(Object.getPrototypeOf(exports.result), Array.prototype);
  assert.throws(() => evaluateProductionModule("", {}, { execution: "invalid" }), /Unsupported test execution mode/);
});

test("dynamic mocks delegate imports to shared resolution and preserve explicit override precedence", async t => {
  const root = await fixture(t, {
    "entry.ts": 'import { value } from "./fake"; import text from "./guide.md?raw"; export const result = value + text;',
    "guide.md": " source",
  });
  const visits = [];
  const options = { root, resolveImport(name, fallback, filename) {
    visits.push({ name, filename });
    return name === "./fake" ? { value: "dynamic" } : fallback();
  } };
  assert.equal(createIsolatedModuleLoader(options)("entry.ts").result, "dynamic source");
  assert.equal(visits[0].filename, path.join(root, "entry.ts"));
  assert.equal(createIsolatedModuleLoader({ ...options, overrides: { "./fake": { value: "explicit" } } })("entry.ts").result, "explicit source");
});

test("private export transforms stay scoped to the selected module", async t => {
  const root = await fixture(t, {
    "entry.ts": 'import { value } from "./dependency"; const privateValue = value;',
    "dependency.ts": "export const value = 12;",
  });
  const load = createIsolatedModuleLoader({ root, transformSource(source, filename) {
    return filename === path.join(root, "entry.ts") ? source + "\nexport { privateValue };" : source;
  } });
  assert.equal(load("entry.ts").privateValue, 12);
  assert.equal(load("dependency.ts").privateValue, undefined);
});
