import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/studio/design-text.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { layoutDesignText } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const measure = (value) => value.length * 10;

test("text layout preserves explicit newlines and blank paragraph lines", () => {
  assert.deepEqual(layoutDesignText({ text: "Top\n\nBottom", width: 200, height: 100, fontFamily: "Arial", fontSize: 20, fontWeight: 400, measure }), [
    { text: "Top", y: 20 }, { text: "", y: 44 }, { text: "Bottom", y: 68 },
  ]);
});

test("text layout wraps with the selected font measurement and clips to height", () => {
  const lines = layoutDesignText({ text: "Wide words wrap here", width: 100, height: 48, fontFamily: "Georgia", fontSize: 20, fontWeight: 700, measure });
  assert.deepEqual(lines, [{ text: "Wide words", y: 20 }, { text: "wrap here", y: 44 }]);
});

test("text layout splits an oversized first word to stay inside a narrow box", () => {
  const lines = layoutDesignText({ text: "abcdefgh", width: 25, height: 100, fontFamily: "Arial", fontSize: 20, fontWeight: 400, measure });
  assert.deepEqual(lines, [
    { text: "ab", y: 20 }, { text: "cd", y: 44 }, { text: "ef", y: 68 }, { text: "gh", y: 92 },
  ]);
});

test("word wrap can be disabled without losing explicit line breaks", () => {
  assert.deepEqual(layoutDesignText({ text: "A very long line\nSecond line", width: 25, height: 100, fontFamily: "Arial", fontSize: 20, fontWeight: 400, wordWrap: false, measure }), [
    { text: "A very long line", y: 20 }, { text: "Second line", y: 44 },
  ]);
});

test("text layout keeps alignment independent of wrapping", () => {
  const lines = layoutDesignText({ text: "Left\nCentre\nRight", width: 240, height: 100, fontFamily: "Inter", fontSize: 16, fontWeight: 600, measure });
  assert.equal(lines.map((line) => line.text).join("\n"), "Left\nCentre\nRight");
  assert.deepEqual(lines.map((line) => line.y), [16, 35.2, 54.4]);
});
