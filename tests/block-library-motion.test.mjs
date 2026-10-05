import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { Pane } = await loadProductionModule(new URL("../app/studio/panes/pane-components.tsx", import.meta.url));
const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
const source = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let dismiss, animation;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "dismissInserter") dismiss = node;
  if (ts.isFunctionDeclaration(node) && node.name?.text === "BlockInserter") {
    function attributes(child) {
      if (ts.isJsxAttribute(child) && child.name.text === "onAnimationEnd") animation = child.initializer.expression;
      ts.forEachChild(child, attributes);
    }
    attributes(node);
  }
  ts.forEachChild(node, visit);
}
visit(tree);
function compile(expression, scope) {
  runInNewContext(ts.transpileModule(`globalThis.actual = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  return scope.actual;
}

for (const closing of [false, true]) test(`reduced-motion cascade overrides the actual ${closing ? "closing" : "open"} Library Pane`, () => {
  const html = renderToStaticMarkup(createElement(Pane, { side: "left", label: "Block Library", className: `block-inserter${closing ? " is-closing" : ""}`, collapsed: false, onCollapsedChange() {}, collapsible: false }, "Blocks"));
  const classes = [...html.matchAll(/class="([^"]*)"/g)].map(match => match[1].split(/\s+/)).find(names => names.includes("pane"));
  assert.ok(classes, "Production Pane supplies the actual pane class");
  const reduced = css.match(/@media \(prefers-reduced-motion: reduce\) \{\s*([^{}]+)\{\s*animation: none;\s*\}\s*\}/);
  assert.ok(reduced, "Reduced motion explicitly suppresses animation");
  const animationSelector = closing ? ".block-inserter.is-closing" : ".block-inserter.pane";
  assert.match(css, new RegExp(`${animationSelector.replaceAll(".", "\\.")} \\{ animation: studio-inserter-${closing ? "exit" : "enter"} 180ms`));
  assert.ok(reduced.index > css.indexOf(`${animationSelector} { animation:`), "Equal-specificity reduced-motion declarations must follow the animation rule");
  const specificity = selector => (selector.match(/\.[\w-]+/g) ?? []).length;
  const matching = reduced[1].split(",").map(selector => selector.trim()).filter(selector => {
    assert.match(selector, /^(?:\.[\w-]+)+$/, "This bounded cascade check covers compound class selectors");
    return selector.slice(1).split(".").every(name => classes.includes(name));
  });
  assert.ok(matching.some(selector => specificity(selector) >= specificity(animationSelector)), "Later reduced-motion override must match the Pane and beat its animation specificity");
});

test("actual Library dismissal is immediate only for reduced motion", () => {
  for (const reduced of [false, true]) {
    const calls = [];
    const scope = { window: { matchMedia(query) { assert.equal(query, "(prefers-reduced-motion: reduce)"); return { matches: reduced }; } }, finishInserterClose: () => calls.push("close"), setInserterClosing: value => calls.push(value) };
    compile(`(${dismiss.getText(tree)})`, scope)();
    assert.deepEqual(calls, [reduced ? "close" : true]);
  }
});

test("actual Library animation completion ignores descendants, entry and cancelled exits", () => {
  class Target { constructor(pane) { this.classList = { contains: name => pane && name === "block-inserter" }; } }
  for (const [closing, pane, name, expected] of [[true, true, "studio-inserter-exit", 1], [true, false, "studio-inserter-exit", 0], [true, true, "studio-inserter-enter", 0], [false, true, "studio-inserter-exit", 0]]) {
    let completed = 0;
    const scope = { closing, HTMLElement: Target, onCloseAnimationEnd: () => completed++ };
    compile(`(${animation.getText(tree)})`, scope)({ target: new Target(pane), animationName: name });
    assert.equal(completed, expected);
  }
});
