import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/content/box-lengths.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { validBoxLengths, expandBoxLengths, compactBoxLengths } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("box lengths preserve CSS shorthand order for axes, sides and corners", () => {
  assert.deepEqual(expandBoxLengths("12px 24px"), ["12px", "24px", "12px", "24px"]);
  assert.deepEqual(expandBoxLengths("1px 2px 3px 4px"), ["1px", "2px", "3px", "4px"]);
  assert.equal(compactBoxLengths(["12px", "24px", "12px", "24px"]), "12px 24px");
  assert.equal(compactBoxLengths(["1px", "2px", "3px", "4px"]), "1px 2px 3px 4px");
});

test("box length validation rejects extra sides and CSS injection", () => {
  assert.equal(validBoxLengths("2px 3em 4rem 5%"), true);
  assert.equal(validBoxLengths("-2px 3em", true), true);
  assert.equal(validBoxLengths("-2px 3em"), false);
  assert.equal(validBoxLengths("1px 2px 3px 4px 5px"), false);
  assert.equal(validBoxLengths("1px; color: red"), false);
});
