import { testSiteVersion } from "./test-site-fixture.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { loadViteModule } from "./production-module.mjs";

// The gateway imports these exports from the renderer, so exercise that entry point.
const { module: gateway } = await loadViteModule(path.resolve("app/studio/test-site/render.tsx"), {
  root: process.cwd(), resolve: { dedupe: ["react", "react-dom"] },
  environments: { inline: { resolve: { noExternal: [/^@acm\//] } } },
  esbuild: { jsx: "automatic" },
});

const page = () => ({ id: "test-site", kind: "page", title: "Home", slug: "", excerpt: "",
  status: "published", publishedAt: "2026-10-25T00:00:00.000Z", updatedAt: "2026-10-25T00:00:00.000Z",
  tags: [], seoTitle: "", seoDescription: "", blocks: [] });
const legacyDocument = () => ({ format: "acm-test-site", version: 2, siteId: "test", document: page() });

function collection(version, siteId) {
  const source = gateway.testSiteCollection(legacyDocument());
  source.version = version;
  source.siteId = siteId;
  if (version === 3) delete source.siteNavigation;
  if (version >= 5) source.globalTemplates = [];
  if (version >= 6) source.publications = [{ document: page() }];
  return testSiteVersion(source,version);
}

test("gateway retains Test's v1 and v2 readers without admitting those envelopes for Test2", () => {
  const regions = Object.fromEntries(["header", "main", "footer"].map(region => [region,
    { id: `test-${region}`, type: "group", layout: "flow", tagName: region, children: [] }]));
  for (const source of [{ format: "acm-test-site", version: 1, siteId: "test", regions }, legacyDocument()]) {
    assert.equal(gateway.validTestSiteDocument(source), true, `Test v${source.version}`);
    assert.equal(gateway.validTestSiteDocument({ ...source, siteId: "test2" }), false);
  }
});

for (const siteId of ["test", "test2"]) {
  for (let version = 3; version <= 9; version++) {
    test(`gateway reads ${siteId} collection v${version} without changing its saved version`, () => {
      const source = collection(version, siteId);
      const original = structuredClone(source);
      assert.equal(gateway.validTestSiteDocument(source), true);
      assert.equal(gateway.testSiteCollection(source).siteId, siteId);
      assert.deepEqual(source, original);
    });
  }
}

test("gateway keeps unsupported versions and site identities rejected", () => {
  const source = collection(9, "test2");
  for (const version of [0, 999, "9", null]) assert.equal(gateway.validTestSiteDocument({ ...source, version }), false);
  assert.equal(gateway.validTestSiteDocument({ ...source, siteId: "other" }), false);
});
