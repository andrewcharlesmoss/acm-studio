import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const modules = new Map();
async function moduleUrl(url) {
  if (modules.has(url.href)) return modules.get(url.href);
  let source = ts.transpileModule(await readFile(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  for (const match of [...source.matchAll(/from "(\.[^"]+)"/g)]) {
    source = source.replace(match[0], `from ${JSON.stringify(await moduleUrl(new URL(`${match[1]}.ts`, url)))}`);
  }
  const compiled = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  modules.set(url.href, compiled);
  return compiled;
}
const { buttonItemPresentation, buttonsPresentationStyle } = await import(await moduleUrl(new URL("../app/content/buttons-presentation.ts", import.meta.url)));
const group = { id: "group", type: "buttons", children: [], horizontalGap: 24 };
const button = { id: "child", type: "button", label: "Example", url: "", style: "primary" };

test("horizontal percentages subtract their share of the group gap", () => {
  for (const [width, expected] of [[25, "calc(25% - 18px)"], [50, "calc(50% - 12px)"], [75, "calc(75% - 6px)"], [100, "100%"]]) {
    assert.equal(buttonItemPresentation(group, { ...button, width }).style["--button-item-width"], expected);
  }
  assert.equal(buttonItemPresentation({ ...group, horizontalGap: 0 }, { ...button, width: 50 }).style["--button-item-width"], "calc(50% - 0px)");
  assert.equal(buttonItemPresentation({ ...group, horizontalGap: undefined }, { ...button, width: 50 }).style["--button-item-width"], "calc(50% - 4px)");
});

test("vertical widths do not subtract horizontal gaps and automatic width remains automatic", () => {
  assert.equal(buttonItemPresentation({ ...group, orientation: "vertical" }, { ...button, width: 50 }).style["--button-item-width"], "50%");
  assert.equal(buttonItemPresentation(group, button).style["--button-item-width"], undefined);
  assert.equal(buttonItemPresentation(group, button).className, "content-button-item");
});

test("all interaction widths are owned by the same group item and preview uses the same state class", () => {
  const styled = { ...button, width: 50, interactionStyles: { hover: { width: 25 }, focus: { width: 75 }, active: { width: 100 } } };
  const before = structuredClone(styled);
  const result = buttonItemPresentation(group, styled, "hover");
  assert.equal(result.style["--button-item-width"], "calc(50% - 12px)");
  assert.equal(result.style["--button-hover-item-width"], "calc(25% - 18px)");
  assert.equal(result.style["--button-focus-item-width"], "calc(75% - 6px)");
  assert.equal(result.style["--button-active-item-width"], "100%");
  assert.equal(result.style.width, undefined, "an inline width would override the pointer-state stylesheet");
  assert.match(result.className, /has-button-item-width/);
  assert.match(result.className, /is-button-state-preview-hover/);
  assert.deepEqual(styled, before);
});

test("only explicit group text styles enter the child fallback contract", () => {
  const plain = buttonsPresentationStyle(group);
  assert.equal(plain["--button-group-font-size"], undefined);
  const styled = buttonsPresentationStyle({ ...group, visualStyle: { fontSizeCustom: "24px", fontFamily: "arial", appearance: "bold-italic", lineHeight: "1.8", letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "underline", textColor: "#123456", padding: "10px", borderWidth: "3px" } });
  assert.equal(styled["--button-group-font-size"], "24px");
  assert.equal(typeof styled["--button-group-font-family"], "string");
  assert.equal(styled["--button-group-font-style"], "italic");
  assert.equal(styled["--button-group-font-weight"], "700");
  assert.equal(styled["--button-group-line-height"], "1.8");
  assert.equal(styled["--button-group-letter-spacing"], "0.1em");
  assert.equal(styled["--button-group-text-transform"], "uppercase");
  assert.equal(styled["--button-group-text-decoration"], "underline");
  assert.equal(styled["--button-group-color"], "#123456");
  assert.equal(styled.padding, undefined, "box appearance remains owned by the existing generic wrapper");
});
