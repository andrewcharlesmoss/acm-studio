import { loadProductionModule } from "./production-module.mjs";
import assert from "node:assert/strict";

import test from "node:test";

const { clearedLinkDestination, equivalentLinkDestination, linkDestinationDraft, sameLinkDestination, updatedLinkDestination } = await loadProductionModule(new URL("../app/content/link-destination.ts", import.meta.url));

test("destination editing normalises supported URLs and rejects invalid destinations", () => {
  const value = { url: "" };
  for (const [url, expected] of [[" example.com/path ", "https://example.com/path"], ["/page", "/page"], ["#part", "#part"], ["mailto:hello@example.com", "mailto:hello@example.com"]]) {
    assert.equal(updatedLinkDestination(value, { url, opensInNewTab: false, nofollow: false }).url, expected);
  }
  for (const url of ["", "javascript:alert(1)", "data:text/html,example", "not a URL"]) assert.equal(updatedLinkDestination(value, { url, opensInNewTab: false, nofollow: false }), null);
});

test("new-tab and nofollow changes retain unrelated rel tokens without duplicate nofollow", () => {
  const value = { url: "/old", opensInNewTab: true, rel: "sponsored ugc NOFOLLOW nofollow sponsored" };
  const before = structuredClone(value);
  assert.equal(linkDestinationDraft(value).nofollow, true);
  assert.deepEqual(updatedLinkDestination(value, { url: "/new", opensInNewTab: true, nofollow: true }), { url: "/new", opensInNewTab: true, rel: "sponsored ugc nofollow" });
  assert.deepEqual(updatedLinkDestination(value, { url: "/new", opensInNewTab: false, nofollow: false }), { url: "/new", opensInNewTab: undefined, rel: "sponsored ugc" });
  assert.deepEqual(value, before);
});

test("unlink clears only destination settings, preserving rich label and appearance", () => {
  const button = { id: "button", type: "button", label: "Continue", labelRuns: [{ text: "Continue", marks: ["bold"] }], url: "/next", opensInNewTab: true, rel: "nofollow sponsored", title: "Continue reading", style: "primary", width: 50 };
  const next = { ...button, ...clearedLinkDestination() };
  assert.equal(next.url, "");
  assert.equal(next.opensInNewTab, undefined);
  assert.equal(next.rel, undefined);
  assert.deepEqual(next.labelRuns, button.labelRuns);
  for (const field of ["id", "label", "title", "style", "width"]) assert.equal(next[field], button[field]);
});

test("freshness and no-op comparisons cover every owned destination field", () => {
  const value = { url: "/next", opensInNewTab: true, rel: "sponsored nofollow" };
  assert.equal(sameLinkDestination(value, { ...value }), true);
  assert.equal(sameLinkDestination(value, updatedLinkDestination(value, linkDestinationDraft(value))), true);
  for (const changed of [{ url: "/other" }, { opensInNewTab: undefined }, { rel: "sponsored" }]) assert.equal(sameLinkDestination(value, { ...value, ...changed }), false);
});

test("unchanged explicit false and empty rel settings do not produce a history mutation", () => {
  for (const value of [{ url: "/next", opensInNewTab: false, rel: "" }, { url: "/next" }, { url: "/next", opensInNewTab: false, rel: "SPONSORED  nofollow sponsored" }]) {
    const next = updatedLinkDestination(value, linkDestinationDraft(value));
    assert.equal(equivalentLinkDestination(value, next), true);
    assert.equal(next.opensInNewTab, value.opensInNewTab);
  }
  const value = { url: "/next", opensInNewTab: false, rel: "" };
  assert.equal(sameLinkDestination(value, { url: "/next" }), false, "freshness still compares the exact captured fields");
  assert.equal(equivalentLinkDestination(value, { url: "/next" }), true);
});
