import assert from "node:assert/strict";
import test from "node:test";
import {
  WEBSITE_LAYOUT_VERSION, captureLegacyWebsiteLayout, resolveWebsiteLayout,
  validateWebsiteLayoutOverrides, validateWebsiteLayoutProfile, validateWebsiteLayoutValues,
} from "../app/studio/website-layout.ts";

const defaults = () => ({ siteWidth: { mode: "full" }, contentWidth: 720, wideWidth: 1200, gutters: { desktop: 24 } });
const profile = (overrides = {}) => ({ format: "acm-website-layout-profile", version: WEBSITE_LAYOUT_VERSION, id: "acm-websites", name: "ACM Websites", overrides });
function freeze(value) {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

test("defaults, shared profile and template resolve independently with accurate origins", () => {
  const result = resolveWebsiteLayout(defaults(), profile({ contentWidth: 800 }), { wideWidth: 1400 });
  assert.deepEqual(result.values, { ...defaults(), contentWidth: 800, wideWidth: 1400, gutters: { desktop: 24, tablet: 24, mobile: 24 } });
  assert.deepEqual(result.origins.siteWidth, { scope: "defaults" });
  assert.deepEqual(result.origins.contentWidth, { scope: "profile", profileId: "acm-websites" });
  assert.deepEqual(result.origins.wideWidth, { scope: "template" });
});

test("explicit equality stays custom; removing an override restores a live inheritance link", () => {
  const template = { contentWidth: 800 };
  assert.equal(resolveWebsiteLayout(defaults(), profile({ contentWidth: 800 }), template).origins.contentWidth.scope, "template");
  assert.equal(resolveWebsiteLayout(defaults(), profile({ contentWidth: 900 }), template).values.contentWidth, 800);
  delete template.contentWidth;
  const result = resolveWebsiteLayout(defaults(), profile({ contentWidth: 900 }), template);
  assert.equal(result.values.contentWidth, 900);
  assert.equal(result.origins.contentWidth.scope, "profile");
  assert.equal(resolveWebsiteLayout({ ...defaults(), contentWidth: 760 }, profile()).values.contentWidth, 760);
});

test("device gutters cascade per property then fall back to effective Desktop, never Tablet", () => {
  const result = resolveWebsiteLayout(defaults(), profile({ gutters: { desktop: 32, tablet: 20 } }), { gutters: { mobile: 0 } });
  assert.deepEqual(result.values.gutters, { desktop: 32, tablet: 20, mobile: 0 });
  assert.deepEqual(result.origins.gutters.tablet, { scope: "profile", profileId: "acm-websites", viewport: "tablet" });
  assert.deepEqual(result.origins.gutters.mobile, { scope: "template", viewport: "mobile" });
  const inherited = resolveWebsiteLayout(defaults(), profile({ gutters: { desktop: 32, tablet: 20 } }));
  assert.equal(inherited.values.gutters.mobile, 32);
  assert.deepEqual(inherited.origins.gutters.mobile, { scope: "profile", profileId: "acm-websites", viewport: "desktop" });
  const parentDevice = resolveWebsiteLayout({ ...defaults(), gutters: { desktop: 24, mobile: 16 } }, profile({ gutters: { desktop: 32 } }));
  assert.equal(parentDevice.values.gutters.mobile, 16, "an explicit parent Mobile value precedes Desktop fallback");
});

test("full width is distinct from a numeric limit and inputs and outputs share no mutable objects", () => {
  const base = freeze(defaults());
  const shared = freeze(profile({ siteWidth: { mode: "max", maxWidth: 1600 } }));
  const template = freeze({ siteWidth: { mode: "full" } });
  const result = resolveWebsiteLayout(base, shared, template);
  assert.deepEqual(result.values.siteWidth, { mode: "full" });
  assert.equal(result.origins.siteWidth.scope, "template");
  result.values.siteWidth.mode = "max";
  result.origins.siteWidth.scope = "defaults";
  assert.deepEqual(template.siteWidth, { mode: "full" });
  assert.equal(resolveWebsiteLayout(base, shared).values.siteWidth.maxWidth, 1600);
});

test("validation rejects malformed, unsafe, unknown, incomplete and unsupported data without coercion", () => {
  for (const value of [null, [], {}, { ...defaults(), other: 1 }, { ...defaults(), gutters: {} },
    { ...defaults(), siteWidth: { mode: "full", maxWidth: 1200 } }, { ...defaults(), siteWidth: { mode: "auto" } }]) {
    assert.throws(() => validateWebsiteLayoutValues(value));
  }
  for (const value of [NaN, Infinity, -1, 0, 8193, "720", "calc(100vw)"]) {
    assert.throws(() => validateWebsiteLayoutOverrides({ contentWidth: value }));
    assert.throws(() => resolveWebsiteLayout(defaults(), profile({ wideWidth: value })));
  }
  for (const value of [{ gutters: { mobile: -1 } }, { gutters: { mobile: 513 } }, { gutters: { phone: 20 } },
    { gutters: null }, { contentWidth: undefined }, { gutters: { desktop: undefined } },
    JSON.parse('{"__proto__":{"contentWidth":20}}'), Object.assign(Object.create({ contentWidth: 30 }), { wideWidth: 1000 })]) {
    assert.throws(() => validateWebsiteLayoutOverrides(value));
  }
  for (const value of [{ ...profile(), version: "0.2.0" }, { ...profile(), id: "../test" },
    { ...profile(), name: " " }, { ...profile(), format: "other" }, { ...profile(), sites: [] }]) {
    assert.throws(() => validateWebsiteLayoutProfile(value));
  }
  assert.deepEqual(validateWebsiteLayoutOverrides({ gutters: { mobile: 0 }, contentWidth: 720.5 }), { gutters: { mobile: 0 }, contentWidth: 720.5 });
  assert.deepEqual(validateWebsiteLayoutValues({ ...defaults(), contentWidth: 8192, wideWidth: 1 }), { ...defaults(), contentWidth: 8192, wideWidth: 1 }, "different limits are not silently reordered");
});

test("legacy capture preserves every existing value explicitly without adopting profile semantics", () => {
  for (const layout of [{ spacing: 0, contentWidth: 320, radius: 0, borderWidth: 0 },
    { spacing: 24, contentWidth: 1040, radius: 8, borderWidth: 1 },
    { spacing: 120, contentWidth: 1800, radius: 80, borderWidth: 12 }]) {
    const original = freeze(layout);
    const captured = captureLegacyWebsiteLayout(original);
    assert.deepEqual(captured, { format: "acm-legacy-website-layout", version: "0.1.0", layout });
    assert.deepEqual(JSON.parse(JSON.stringify(captured)).layout, original);
    assert.notEqual(captured.layout, original);
    assert.throws(() => validateWebsiteLayoutProfile(captured), "legacy values cannot masquerade as a linked profile");
    captured.layout.contentWidth = 999;
    assert.notEqual(original.contentWidth, 999);
  }
  assert.throws(() => captureLegacyWebsiteLayout({ spacing: 24, contentWidth: 2000, radius: 8, borderWidth: 1 }));
});
