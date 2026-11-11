import assert from "node:assert/strict";
import test from "node:test";
import { resolveConfig } from "vite";

test("Studio dev server disables Vinext's permissive localhost CORS policy", async () => {
  const config = await resolveConfig({}, "serve", "development");

  assert.equal(config.server.cors, false);
  assert.ok(config.server.fs.allow.some((root) => root.endsWith("/workspace-governance")));
});
