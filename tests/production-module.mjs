import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as moduleApi from "node:module";
import { TEST_MODULE_QUERY, rawModule, resolveSource } from "./production-module-resolution.mjs";
import * as hooks from "./production-module-hooks.mjs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const entryFile = directory => path.join(directory, "__test_entry__.ts");

/** Execute a complete module while retaining the harness's explicit context and realm. */
const compileCommonSource = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;

export function evaluateProductionModule(source, context, { filename, execution = "isolated" } = {}) {
  const compiled = compileCommonSource(source);
  if (execution === "host") return new Function(...Object.keys(context), compiled)(...Object.values(context));
  if (execution !== "isolated") throw new Error(`Unsupported test execution mode: ${execution}`);
  return vm.runInNewContext(compiled, context, { filename });
}

export function createHostModuleEvaluator(parameters, source) {
  return new Function(...parameters, compileCommonSource(source));
}

/** Vite-specific source-package and deduplication settings remain with the integration fixture. */
export async function loadViteModule(specifier, options) {
  return (await import("vite")).runnerImport(specifier, options);
}

/** One cache per harness/tab; mocks, browser globals and source mutations stay with the caller. */
export function createIsolatedModuleLoader({ root: directory = root, globals = {}, overrides = {}, fileOverrides = {}, sourceOverrides = {}, cache = true, resolveImport, transformSource = source => source } = {}) {
  const directoryPath = directory instanceof URL ? fileURLToPath(directory) : directory;
  const resolveEntry = value => resolveSource(value instanceof URL ? fileURLToPath(value) : value, entryFile(directoryPath));
  const files = new Map(Object.entries(fileOverrides).map(([name, value]) => [resolveEntry(name).filename, value]));
  const sources = new Map(Object.entries(sourceOverrides).map(([name, value]) => [resolveEntry(name).filename, value]));
  const modules = new Map();

  function load(file) {
    const { filename, raw } = resolveEntry(file);
    if (files.has(filename)) return files.get(filename);
    if (raw) return rawModule(filename);
    if (cache && modules.has(filename)) return modules.get(filename).exports;
    const record = { exports: {} };
    if (cache) modules.set(filename, record);
    try {
      const source = transformSource(readFileSync(sources.get(filename) ?? filename, "utf8"), filename);
      evaluateProductionModule(source, { ...globals, module: record, exports: record.exports, require(specifier) {
        if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
        const fallback = ({ native = false } = {}) => {
          if (specifier.endsWith(".css")) return {};
          if (!specifier.startsWith(".") && !path.isAbsolute(specifier)) return require(specifier);
          const dependency = resolveSource(specifier, filename);
          if (native && !dependency.raw) return require(dependency.filename);
          return load(dependency.filename + (dependency.raw ? "?raw" : ""));
        };
        return resolveImport ? resolveImport(specifier, fallback, filename) : fallback();
      } }, { filename });
      return record.exports;
    } catch (error) {
      modules.delete(filename);
      throw error;
    }
  }
  return load;
}

// Native module URLs keep a shared dependency graph instead of embedding it in
// every parent. The isolated VM loader above retains its explicit mock contract.
let hooksRegistered = false;
const failedGenerations = new Map();

export async function compileProductionModule(url) {
  const filename = resolveSource(fileURLToPath(url), entryFile(root)).filename;
  readFileSync(filename, "utf8");
  if (!hooksRegistered) {
    if (typeof moduleApi.registerHooks === "function") moduleApi.registerHooks(hooks);
    else moduleApi.register(new URL("./production-module-hooks.mjs", import.meta.url), import.meta.url);
    hooksRegistered = true;
  }
  const result = pathToFileURL(filename);
  const generation = failedGenerations.get(result.href) ?? 0;
  result.searchParams.set(TEST_MODULE_QUERY, generation ? `${result.href}:${generation}` : "shared");
  return result.href;
}

export async function loadProductionModule(url) {
  try { return await import(await compileProductionModule(url)); }
  catch (error) {
    // Node retains failed module jobs. Retry only this root with a fresh graph,
    // without changing identities in other successfully loaded test modules.
    const key = pathToFileURL(resolveSource(fileURLToPath(url), entryFile(root)).filename).href;
    failedGenerations.set(key, (failedGenerations.get(key) ?? 0) + 1);
    throw error;
  }
}
