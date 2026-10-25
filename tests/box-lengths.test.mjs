import { loadProductionModule } from "./production-module.mjs";
import assert from "node:assert/strict";

import test from "node:test";

const { validBoxLengths, expandBoxLengths, compactBoxLengths } = await loadProductionModule(new URL("../app/content/box-lengths.ts", import.meta.url));

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


test("reference calc shorthand retains both axes while authored validation stays bounded", () => {
  const parts = expandBoxLengths('calc(1rem - 1px) calc(2.25rem - 1px)');
  assert.deepEqual(parts,['calc(1rem - 1px)','calc(2.25rem - 1px)','calc(1rem - 1px)','calc(2.25rem - 1px)']);
  assert.equal(compactBoxLengths(['20px',parts[1],'20px',parts[3]]),'20px calc(2.25rem - 1px)');
  assert.equal(validBoxLengths('calc(1rem - 1px)'),false,'saved editor values retain their existing contract');
});
