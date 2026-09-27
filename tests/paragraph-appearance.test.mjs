import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/content/paragraph-styles.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { paragraphStyleToCss, paragraphStyleClassName } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("paragraph typography settings render as CSS without changing the text", () => {
  const style = { textIndent: "24px", textColumns: 2, dropCap: true };
  assert.deepEqual(paragraphStyleToCss(style), { textIndent: "24px", columnCount: "2", columnGap: "1.5em" });
  assert.equal(paragraphStyleClassName(style), "has-drop-cap");
  assert.equal(paragraphStyleClassName({ ...style, className: "custom-paragraph" }), "has-drop-cap custom-paragraph");
  assert.deepEqual(paragraphStyleToCss(), {});
  assert.equal(paragraphStyleClassName({ fitText: true }), "has-fit-text");
  assert.equal(paragraphStyleToCss({ fitText: true, fontSize: "xx-large" }).fontSize, undefined);
});
