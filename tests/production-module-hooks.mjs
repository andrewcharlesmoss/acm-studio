import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { TEST_MODULE_QUERY, resolveSource } from "./production-module-resolution.mjs";

function tagged(url, generation, raw = false) {
  const result = new URL(url);
  result.searchParams.set(TEST_MODULE_QUERY, generation);
  if (raw) result.searchParams.set("raw", "");
  return result.href;
}

/** Native ESM owns graph identity and cycles; only explicitly tagged sources are transformed. */
export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("file:") && new URL(specifier).searchParams.has(TEST_MODULE_QUERY)) return { url: specifier, shortCircuit: true };
  const parent = context.parentURL?.startsWith("file:") ? new URL(context.parentURL) : null;
  if (!parent?.searchParams.has(TEST_MODULE_QUERY)) return nextResolve(specifier, context);
  const generation = parent.searchParams.get(TEST_MODULE_QUERY);
  if (specifier.startsWith(".") || path.isAbsolute(specifier)) {
    const { filename, raw } = resolveSource(specifier, fileURLToPath(parent));
    const url = pathToFileURL(filename).href;
    return { url: raw || /\.(?:tsx?|css)$/.test(filename) ? tagged(url, generation, raw) : url, shortCircuit: true };
  }
  const adapt = result => result.url.startsWith("file:") && /\.tsx?$/.test(new URL(result.url).pathname)
    ? { ...result, url: tagged(result.url, generation) } : result;
  // Workspace source packages share Studio's installed dependencies, including
  // the renderer's React singleton, rather than needing sibling node_modules.
  const result = nextResolve(specifier, { ...context, parentURL: new URL("./production-module.mjs", import.meta.url).href });
  return typeof result.then === "function" ? result.then(adapt) : adapt(result);
}

export function load(specifier, context, nextLoad) {
  if (!specifier.startsWith("file:")) return nextLoad(specifier, context);
  const url = new URL(specifier);
  if (!url.searchParams.has(TEST_MODULE_QUERY)) return nextLoad(specifier, context);
  if (url.pathname.endsWith(".css")) return { format: "module", source: "export {};", shortCircuit: true };
  const source = readFileSync(url, "utf8");
  if (url.searchParams.has("raw")) return { format: "module", source: `export default ${JSON.stringify(source)};`, shortCircuit: true };
  return { format: "module", shortCircuit: true, source: ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: fileURLToPath(url),
  }).outputText };
}
