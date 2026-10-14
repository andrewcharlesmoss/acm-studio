import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { LibraryDragHandle } = await loadProductionModule(new URL("../app/studio/library-drag-handle.tsx", import.meta.url));

test("library handle renders the shared six-dot artwork without a nested interactive control", () => {
  for (const enabled of [true, false]) {
    const html = renderToStaticMarkup(createElement(LibraryDragHandle, { enabled }));
    assert.match(html, /class="library-drag-handle" aria-hidden="true"/);
    assert.match(html, new RegExp(`data-reorder-enabled="${enabled}"`));
    assert.match(html, /<svg/);
    assert.match(html, new RegExp(`title="${enabled ? "Drag to reorder" : "Reordering unavailable"}"`));
    assert.doesNotMatch(html, /<button|tabindex=/);
  }
});

test("both editors reuse the handle for their document and template row paths", async () => {
  for (const file of ["studio-navigation-pane.tsx", "template-workspace.tsx"]) {
    const source = await readFile(new URL(`../app/studio/${file}`, import.meta.url), "utf8");
    assert.equal((source.match(/<LibraryDragHandle enabled=\{reordering.canReorder\}/g) ?? []).length, 2);
  }
});

test("library rows retain the pointer cursor and reserve the handle column", async () => {
  const css = await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.document-item\[data-library-entry-id\] \{[^}]*cursor: pointer;[^}]*grid-template-columns: 28px minmax\(0, 1fr\) auto 24px;/);
  assert.match(css, /\.library-drag-handle\[data-reorder-enabled="true"\] \{ cursor: grab; opacity: 1;/);
  assert.doesNotMatch(css, /\.document-item\[data-library-entry-id\]\[draggable="true"\] \{ cursor: grab;/);
});
