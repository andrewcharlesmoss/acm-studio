import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import { sourceExtractionFixtures } from "./source-extraction-fixtures.mjs";

// These execute extracted JavaScript function bodies or generated browser scripts,
// without resolving or importing production modules. A local draft may be absent.
const scriptExecutionFixtures = new Set([
  "departure-link.test.mjs", "reconnect-feedback.test.mjs",
  "site-publication-runtime.test.mjs", "test-site-collection.test.mjs",
]);

function inspect(name, source) {
  const tree = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const failures = [];
  const executionNames = new Set(["runInNewContext", "runInContext"]);
  const permitsExecution = sourceExtractionFixtures.has(name) || scriptExecutionFixtures.has(name);
  let hasExtraction = false;
  const report = (node, reason) => failures.push(`${name}:${tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1} ${reason}`);
  for (const statement of tree.statements) {
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier.text === "node:vm" && statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
      for (const item of statement.importClause.namedBindings.elements) if (executionNames.has(item.propertyName?.text ?? item.name.text)) executionNames.add(item.name.text);
    }
  }
  function visit(node) {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const callee = node.expression;
      const directExecution = ts.isIdentifier(callee) && (callee.text === "Function" || executionNames.has(callee.text))
        || ts.isPropertyAccessExpression(callee) && executionNames.has(callee.name.text);
      if (directExecution && !permitsExecution) report(node, "Use the shared complete-module evaluator instead of a private Function or VM loader.");
      if (ts.isCallExpression(node)) {
        if (ts.isPropertyAccessExpression(callee) && callee.name.text === "transpileModule") {
          if (sourceExtractionFixtures.has(name)) hasExtraction = true;
          else report(node, "Use production-module.mjs for complete-module compilation.");
        }
        if (callee.kind === ts.SyntaxKind.ImportKeyword || callee.getText(tree) === "require") {
          const target = node.arguments[0];
          if (target && ts.isStringLiteral(target) && target.text === "vite") report(node, "Use loadViteModule for Vite integration fixtures.");
          if (target && (ts.isTemplateExpression(target) || ts.isStringLiteralLike(target))) {
            const prefix = ts.isTemplateExpression(target) ? target.head.text : target.text;
            if (prefix.startsWith("data:text/javascript") && !sourceExtractionFixtures.has(name)) report(node, "Use the shared ESM loader instead of a private data module.");
          }
        }
      }
    }
    if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === "vite") report(node, "Use loadViteModule for Vite integration fixtures.");
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return { failures, hasExtraction };
}

test("canonical tests share module compilation, execution and Vite loading", () => {
  const root = fileURLToPath(new URL("./", import.meta.url));
  const seenExtractions = new Set();
  const failures = [];
  for (const name of readdirSync(root, { recursive: true })) {
    if (!name.endsWith(".mjs") || / [23]\.mjs$/.test(name) || name === "production-module.mjs") continue;
    const result = inspect(name, readFileSync(path.join(root, name), "utf8"));
    failures.push(...result.failures);
    if (result.hasExtraction) seenExtractions.add(name);
  }
  assert.deepEqual(failures, []);
  assert.deepEqual([...sourceExtractionFixtures].sort(), [...seenExtractions].sort(), "Keep source-extraction exceptions current and explicit.");
});

test("the loader guard rejects private compilers, host/VM evaluators, data modules and Vite bypasses", () => {
  for (const source of [
    'ts.transpileModule(source);',
    'new Function("exports", source);',
    'Function("exports", source);',
    'vm.runInNewContext(source, context);',
    'vm.runInContext(source, context);',
    'import { runInNewContext as execute } from "node:vm"; execute(source, context);',
    'import("data:text/javascript;base64,source");',
    'import { runnerImport } from "vite";',
    'import("vite");',
  ]) assert.ok(inspect("private-loader.test.mjs", source).failures.length > 0, source);
  assert.deepEqual(inspect("list-boundary.test.mjs", 'vm.runInNewContext(extractedCallback, context);').failures, []);
  assert.deepEqual(inspect("site-publication-runtime.test.mjs", 'vm.runInContext(generatedBrowserScript, context);').failures, []);
});
