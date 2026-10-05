import { readFile } from "node:fs/promises";
import ts from "typescript";

// Focused tests load the actual typed modules without another application build.
// Browser behaviour remains a separate acceptance boundary.
const compiledModules = new Map();

export async function compileProductionModule(url) {
  if (compiledModules.has(url.href)) return compiledModules.get(url.href);
  const result = compileModule(url);
  compiledModules.set(url.href, result);
  try { return await result; }
  catch (error) { compiledModules.delete(url.href); throw error; }
}

async function compileModule(url) {
  const source = await readFile(url, "utf8").catch(error => {
    if (error.code !== "ENOENT" || !url.pathname.endsWith(".ts")) throw error;
    url = new URL(`${url.href}x`);
    return readFile(url, "utf8");
  });
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  outputText = outputText.replace(/import ["'][^"']+\.css["'];?/g, "");
  for (const match of [...outputText.matchAll(/from "([^"]+)"/g)]) {
    const specifier = match[1];
    const resolved = specifier.startsWith(".")
      ? specifier.endsWith(".mjs")
        ? new URL(specifier, url).href
        : await compileProductionModule(new URL(/\.tsx?$/.test(specifier) ? specifier : `${specifier}.ts`, url))
      : import.meta.resolve(specifier);
    outputText = outputText.replace(match[0], `from "${resolved}"`);
  }
  return `data:text/javascript;base64,${Buffer.from(`${outputText}\n//# sourceURL=${url.pathname}`).toString("base64")}`;
}

export async function loadProductionModule(url) {
  return import(await compileProductionModule(url));
}
