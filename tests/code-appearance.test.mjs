import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readStudioSource("app/studio/studio-canvas.tsx");
const syntax = ts.createSourceFile("studio-canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const editor = syntax.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "CodeEditor");
const effects = [];
function inspect(node) {
  if (ts.isCallExpression(node) && node.expression.getText(syntax) === "useLayoutEffect") effects.push(node);
  ts.forEachChild(node, inspect);
}
inspect(editor);
assert.equal(effects.length, 1);

function mountedSizingFixture() {
  let contentHeight = 147;
  let observer;
  let nextFrame = 1;
  let scrollSyncs = 0;
  const frames = new Map();
  const textarea = { style: { height: "147px" }, clientWidth: 649, parentElement: {}, get scrollHeight() { return contentHeight; } };
  const scope = {
    textareaRef: { current: textarea },
    syncScroll() { scrollSyncs++; },
    requestAnimationFrame(callback) { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    ResizeObserver: class {
      constructor(callback) {
        observer = {
          callback,
          observe(element) { this.element = element; },
          disconnect() { this.disconnected = true; },
        };
        return observer;
      }
    },
  };
  const effect = runInNewContext(ts.transpileModule(`(${effects[0].arguments[0].getText(syntax)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  return {
    textarea,
    render: effect,
    contentHeight(value) { contentHeight = value; },
    observer() { return observer; },
    pending() { return frames.size; },
    syncs() { return scrollSyncs; },
    flush() { for (const [id, callback] of frames) { frames.delete(id); callback(); } },
  };
}

test("Code height is measured after every render, including inherited typography and reset", () => {
  assert.equal(effects[0].arguments.length, 1, "value/language dependencies cannot detect inherited style changes");
  const fixture = mountedSizingFixture();
  let cleanup = fixture.render();
  fixture.flush();
  assert.equal(fixture.textarea.style.height, "147px");
  for (const height of [429, 198, 147]) {
    cleanup();
    fixture.contentHeight(height);
    cleanup = fixture.render();
    fixture.flush();
    assert.equal(fixture.textarea.style.height, `${height}px`, "growing, shrinking and resetting typography fit the content");
  }
  assert.equal(fixture.syncs(), 4);
  cleanup();
});

test("Code width changes resize once without reacting to self-induced height changes", () => {
  const fixture = mountedSizingFixture();
  const cleanup = fixture.render();
  fixture.flush();
  fixture.observer().callback();
  assert.equal(fixture.pending(), 0);
  fixture.textarea.clientWidth = 320;
  fixture.contentHeight(300);
  fixture.observer().callback();
  fixture.flush();
  assert.equal(fixture.textarea.style.height, "300px");
  fixture.observer().callback();
  assert.equal(fixture.pending(), 0);
  fixture.textarea.clientWidth = 400;
  fixture.observer().callback();
  assert.equal(fixture.pending(), 1);
  cleanup();
  assert.equal(fixture.pending(), 0);
  assert.equal(fixture.observer().disconnected, true);
});

test("Code editing and preview surfaces expose the same authored background", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const transparent = css.match(/\.block-visual-style\.has-custom-background\s+:is\(([^)]+)\)\s*\{\s*background:\s*transparent;\s*\}/);
  assert.ok(transparent);
  for (const surface of [".code-editor-shell", ".code-highlight", ".studio-code-preview"]) assert.ok(transparent[1].split(/,\s*/).includes(surface), surface);
});
