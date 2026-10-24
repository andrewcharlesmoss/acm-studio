import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

function navigationHarness(hash = "") {
  const entries = [{ id: "first", title: "First", group: "Foundation" }, { id: "second", title: "Second", group: "Foundation" }, { id: "third", title: "Third", group: "Colour" }];
  const tops = { first: 16, second: 240, third: 480 };
  const listeners = new Map();
  const frames = new Map();
  let nextFrame = 0;
  let active;
  let effect;
  const window = {
    innerHeight: 1000, location: { hash },
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); },
    requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
    getComputedStyle: element => ({ scrollMarginTop: "16px", overflowY: element.overflowY ?? "auto" }),
  };
  const document = { documentElement: {}, getElementById: id => id in tops ? { getBoundingClientRect: () => ({ top: tops[id] }) } : null };
  const react = { useState: initial => { active = initial; return [active, update => { active = typeof update === "function" ? update(active) : update; }]; }, useRef: initial => ({ current: initial }), useEffect: fn => { effect = fn; } };
  const jsx = (type, props) => ({ type, props });
  const source = ts.transpileModule(readFileSync(new URL("../app/studio/ui/controls/controls-navigation.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const fixtureModule = { exports: {} };
  runInNewContext(source, { module: fixtureModule, exports: fixtureModule.exports, window, document, requestAnimationFrame: window.requestAnimationFrame, require: name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : { studioControlEntries: entries, studioControlGroups: ["Foundation", "Colour"], controlGroupId: group => `group-${group.toLowerCase()}` } });
  const controller = fixtureModule.exports.ControlsNavigation();
  const tree = controller.type(controller.props);
  const links = tree.props.groups.flatMap(group => [
    ...(group.headingHref ? [{ props: { href: group.headingHref, onClick: group.onHeadingClick } }] : []),
    ...group.items.filter(item => item.href).map(item => ({ props: { href: item.href, onClick: item.onClick } })),
  ]);
  const cleanup = effect();
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); };
  return { tops, window, document, active: () => active, frames, listeners, cleanup, flush, emit: (name, event = {}) => { listeners.get(name)?.(event); flush(); }, click: (id, event = {}) => links.find(link => link.props.href === `#${id}`).props.onClick?.({ button: 0, ...event }), hash: value => { window.location.hash = value; listeners.get("hashchange")?.(); flush(); } };
}

test("clicked short specimen remains selected through smooth anchor scrolling", () => {
  const h = navigationHarness();
  h.click("first");
  h.hash("#first");
  h.emit("scroll");
  assert.equal(h.active(), "first", "The viewport midpoint must not select the following specimen");
  h.emit("resize");
  assert.equal(h.active(), "first");
});

test("manual scrolling follows specimen tops, including gaps", () => {
  const h = navigationHarness("#first");
  h.emit("wheel", { target: { closest: () => null } });
  Object.assign(h.tops, { first: -300, second: 60, third: 300 });
  h.emit("scroll");
  assert.equal(h.active(), "first");
  h.tops.second = 16;
  h.emit("scroll");
  assert.equal(h.active(), "second");
});

test("deep links, group links and history select their requested specimen", () => {
  const h = navigationHarness("#third");
  assert.equal(h.active(), "third");
  h.hash("#group-foundation");
  assert.equal(h.active(), "first");
  h.hash("#second");
  h.emit("scroll");
  assert.equal(h.active(), "second");
  h.hash("#unknown");
  assert.equal(h.active(), "first");
});

test("scrolling the menu itself leaves the requested selection in place", () => {
  const h = navigationHarness("#third");
  const menuTarget = { closest: selector => selector === ".ui-catalogue-navigation" ? { scrollHeight: 200, clientHeight: 100 } : null };
  h.emit("wheel", { target: menuTarget });
  h.emit("scroll");
  assert.equal(h.active(), "third");
  h.emit("keydown", { key: "PageDown", target: menuTarget });
  h.emit("scroll");
  assert.equal(h.active(), "third");
});

test("scroll input over the horizontal mobile menu resumes page tracking", () => {
  const h = navigationHarness("#third");
  const target = { closest: selector => selector === ".ui-catalogue-navigation" ? { scrollHeight: 100, clientHeight: 100, overflowY: "visible" } : null };
  for (const [event, details] of [["wheel", {}], ["touchmove", {}], ["keydown", { key: "PageDown" }]]) {
    h.hash("#third");
    h.emit(event, { target, ...details });
    h.emit("scroll");
    assert.equal(h.active(), "first", event);
  }
});

test("demo clicks retain the requested anchor but the page scrollbar resumes tracking", () => {
  const h = navigationHarness("#third");
  h.emit("pointerdown", { target: {} });
  h.emit("resize");
  assert.equal(h.active(), "third");
  h.emit("pointerdown", { target: h.document.documentElement });
  h.emit("scroll");
  assert.equal(h.active(), "first");
});

test("page scroll keys and touch scrolling resume tracking but form arrows do not", () => {
  const h = navigationHarness("#third");
  h.emit("keydown", { key: "ArrowDown", target: { closest: selector => selector.includes("input") ? {} : null } });
  h.emit("scroll");
  assert.equal(h.active(), "third");
  h.emit("keydown", { key: "PageDown", target: { closest: () => null } });
  h.emit("scroll");
  assert.equal(h.active(), "first");
  h.hash("#third");
  h.emit("touchmove", { target: { closest: () => null } });
  h.emit("scroll");
  assert.equal(h.active(), "first");
});

test("modified link clicks preserve the current page selection", () => {
  const h = navigationHarness("#first");
  h.click("third", { metaKey: true });
  assert.equal(h.active(), "first");
});

test("unmount removes listeners and any scheduled update", () => {
  const h = navigationHarness();
  h.listeners.get("scroll")();
  h.cleanup();
  assert.equal(h.listeners.size, 0);
  assert.equal(h.frames.size, 0);
});
