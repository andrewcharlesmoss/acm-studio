import assert from "node:assert/strict";
import test from "node:test";
import { projectSettings, siteSettingsBridge } from "../scripts/site-settings-bridge.mjs";

const record = { projectId: "appgprj_6a806eb84b648191b3015d1b6b694c45", title: "Mini Golf Scorecard", url: "https://example.com", status: "active", capturedAt: "2026-09-08T01:12:00Z", sharing: "Public", domains: [], variables: [{ key: "SECRET_KEY", secret: true, value: "never-forward-this" }], environmentRevision: 2, token: "never-forward-this", allowed_users: ["private-user"] };

test("settings projection omits every value and provider-only field", () => {
  const result = projectSettings(record);
  assert.deepEqual(result.variables, [{ key: "SECRET_KEY", secret: true }]);
  assert.equal(JSON.stringify(result).includes("never-forward-this"), false);
  assert.equal(JSON.stringify(result).includes("private-user"), false);
  assert.equal(result.environmentRevision, 2);
});

test("settings projection rejects foreign sites, unsafe URLs and bad dates", () => {
  for (const patch of [{ projectId: "other" }, { url: "javascript:alert(1)" }, { url: "https://user:password@example.com" }, { capturedAt: "bad" }]) {
    assert.throws(() => projectSettings({ ...record, ...patch }));
  }
  assert.equal(projectSettings({ ...record, sharing: "invented" }).sharing, "Unknown");
  assert.equal(projectSettings({ ...record, variables: [] }).variables.length, 0);
});

test("settings middleware is development-only and denies unauthorised reads", async () => {
  const plugin = siteSettingsBridge();
  assert.equal(plugin.apply, "serve");
  let handler;
  plugin.configureServer({ config: { root: "/unavailable-fixture" }, httpServer: { address: () => ({ port: 3010 }) }, middlewares: { use: (_path, callback) => { handler = callback; } } });
  for (const method of ["GET", "PUT", "POST"]) {
    const response = { setHeader() {}, end(value) { this.body = value; } };
    await handler({ method, headers: {}, socket: {} }, response);
    assert.equal(response.statusCode, 403);
  }
  const response = { setHeader() {}, end(value) { this.body = value; } };
  await handler({ method: "POST", headers: { host: "localhost:3010", origin: "http://localhost:3010", "content-type": "application/json", "x-studio-client": "codex-history" }, socket: { remoteAddress: "127.0.0.1" }, resume() {} }, response);
  assert.equal(response.statusCode, 503);
  assert.match(response.body, /No verified settings snapshot/);
  assert.equal(response.body.includes("unavailable-fixture"), false);
});
