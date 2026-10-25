import test from "node:test";
import assert from "node:assert/strict";
import { quoteCitationIsVisible, toggleQuoteCitation } from "../app/content/quote-citation.mjs";

test("an empty Quote starts without a citation and Add citation reveals and focuses its field", () => {
  const block = { id: "quote", type: "quote", attribution: undefined };

  assert.equal(quoteCitationIsVisible(block), false);
  assert.deepEqual(toggleQuoteCitation(block), { visible: true, focus: true, block });
});

test("Remove citation clears its saved text and hides the field", () => {
  const block = { id: "quote", type: "quote", attribution: "A sample quotation", attributionRuns: [{ text: "A sample quotation" }] };
  const result = toggleQuoteCitation(block);

  assert.equal(quoteCitationIsVisible(block), true);
  assert.equal(result.visible, false);
  assert.equal(result.focus, false);
  assert.equal(result.block.attribution, undefined);
  assert.equal(result.block.attributionRuns, undefined);
});

test("a newly added empty citation remains visible until explicitly removed", () => {
  const block = { id: "quote", type: "quote" };
  const added = toggleQuoteCitation(block);

  assert.equal(quoteCitationIsVisible(block, added.visible), true);
  assert.equal(toggleQuoteCitation(block, added.visible).visible, false);
});
