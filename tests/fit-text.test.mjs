import { loadProductionModule } from "./production-module.mjs";
import assert from "node:assert/strict";

import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { largestFittingFontSize, FitTextParagraph, FitTextHeading } = await loadProductionModule(new URL("../app/components/fit-text-paragraph.tsx", import.meta.url));

test("fit text bounds measured width and preserves server-rendered content", () => {
  assert.deepEqual(largestFittingFontSize(size => size * 4 <= 200), { size: 49.9, wraps: false });
  assert.deepEqual(largestFittingFontSize(size => size * 20 <= 200), { size: 13, wraps: true });
  assert.deepEqual(largestFittingFontSize(size => size * 0.2 <= 200), { size: 120, wraps: false });
  const html = renderToStaticMarkup(createElement(FitTextParagraph, { className: "has-fit-text" }, "Accessible paragraph"));
  assert.match(html, /class="has-fit-text"/);
  assert.match(html, />Accessible paragraph<\/p>/);
  const heading = renderToStaticMarkup(createElement(FitTextHeading, { level: 2, className: "has-fit-text", styleSignature: '{"fontFamily":"inter"}' }, "Responsive heading"));
  assert.match(heading, /<h2 class="has-fit-text">Responsive heading<\/h2>/);
});
