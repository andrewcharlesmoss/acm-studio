import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const entryFile = directory => path.join(directory, "__test_entry__.ts");

function resolveSource(specifier, importer) {
  const raw = specifier.endsWith("?raw");
  const name = raw ? specifier.slice(0, -4) : specifier;
  const base = path.resolve(path.dirname(importer), name);
  const candidates = path.extname(base) === ".ts" ? [base, `${base}x`]
    : path.extname(base) ? [base] : [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.js`];
  return { filename: candidates.find(existsSync) ?? candidates[0], raw };
}

const rawModule = filename => ({ __esModule: true, default: readFileSync(filename, "utf8") });

/** One cache per harness/tab; mocks, browser globals and source mutations stay with the caller. */
export function createIsolatedModuleLoader({ root: directory = root, globals = {}, overrides = {}, fileOverrides = {}, sourceOverrides = {}, cache = true } = {}) {
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
      const source = readFileSync(sources.get(filename) ?? filename, "utf8");
      const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
      vm.runInNewContext(compiled, { ...globals, module: record, exports: record.exports, require(specifier) {
        if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
        if (specifier.endsWith(".css")) return {};
        if (!specifier.startsWith(".") && !path.isAbsolute(specifier)) return require(specifier);
        const dependency = resolveSource(specifier, filename);
        return load(dependency.filename + (dependency.raw ? "?raw" : ""));
      } }, { filename });
      return record.exports;
    } catch (error) {
      modules.delete(filename);
      throw error;
    }
  }
  return load;
}

// Focused tests load the actual typed modules without another application build.
// Browser behaviour remains a separate acceptance boundary.
const compiledModules = new Map();

export async function compileProductionModule(url) {
  url = pathToFileURL(resolveSource(fileURLToPath(url), entryFile(root)).filename);
  if (compiledModules.has(url.href)) return compiledModules.get(url.href);
  const result = compileModule(url);
  compiledModules.set(url.href, result);
  try { return await result; }
  catch (error) { compiledModules.delete(url.href); throw error; }
}

async function compileModule(url) {
  const source = await readFile(url, "utf8");
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  outputText = outputText.replace(/import ["'][^"']+\.css["'];?/g, "");
  for (const match of [...outputText.matchAll(/from "([^"]+)"/g)]) {
    const specifier = match[1];
    let resolved;
    if (specifier.startsWith(".")) {
      const dependency = resolveSource(specifier, fileURLToPath(url));
      resolved = dependency.raw
        ? `data:text/javascript;base64,${Buffer.from(`export default ${JSON.stringify(rawModule(dependency.filename).default)};`).toString("base64")}`
        : /\.m?js$/.test(dependency.filename) ? pathToFileURL(dependency.filename).href
        : await compileProductionModule(pathToFileURL(dependency.filename));
    } else resolved = /\.tsx$/.test(import.meta.resolve(specifier))
        ? await compileProductionModule(new URL(import.meta.resolve(specifier)))
        : import.meta.resolve(specifier);
    outputText = outputText.replace(match[0], `from "${resolved}"`);
  }
  return `data:text/javascript;base64,${Buffer.from(`${outputText}\n//# sourceURL=${url.pathname}`).toString("base64")}`;
}

export async function loadProductionModule(url) {
  return import(await compileProductionModule(url));
}
