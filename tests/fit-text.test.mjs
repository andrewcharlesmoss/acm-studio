import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const source = await readFile(new URL("../app/components/fit-text-paragraph.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
  .replace('from "react"', `from "${import.meta.resolve("react")}"`)
  .replace('from "react/jsx-runtime"', `from "${import.meta.resolve("react/jsx-runtime")}"`);
const { largestFittingFontSize, FitTextParagraph, FitTextHeading } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("fit text bounds measured width and preserves server-rendered content", () => {
  assert.deepEqual(largestFittingFontSize(size => size * 4 <= 200), { size: 49.9, wraps: false });
  assert.deepEqual(largestFittingFontSize(size => size * 20 <= 200), { size: 13, wraps: true });
  assert.deepEqual(largestFittingFontSize(size => size * 0.2 <= 200), { size: 120, wraps: false });
  const html = renderToStaticMarkup(createElement(FitTextParagraph, { className: "has-fit-text", children: "Accessible paragraph" }));
  assert.match(html, /class="has-fit-text"/);
  assert.match(html, />Accessible paragraph<\/p>/);
  const heading = renderToStaticMarkup(createElement(FitTextHeading, { level: 2, className: "has-fit-text", styleSignature: '{"fontFamily":"inter"}', children: "Responsive heading" }));
  assert.match(heading, /<h2 class="has-fit-text">Responsive heading<\/h2>/);
});
