import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { compareVersions, readPackageDashboard } from "../scripts/package-dashboard-source.mjs";
import { packageDashboardBridge } from "../scripts/package-dashboard-bridge.mjs";

const scope = "@andrewcharlesmoss";
const registry = "https://npm.pkg.github.com";
const tarball = (name, version) => `${registry}/download/${name}/${version}/test`;

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "studio-packages-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  async function json(relative, data) {
    const absolute = path.join(root, relative);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, JSON.stringify(data));
  }
  async function consumer(directory, dependencies, versions = {}) {
    await json(`${directory}/package.json`, { dependencies });
    await json(`${directory}/package-lock.json`, {
      packages: Object.fromEntries(Object.entries(versions).map(([name, version]) =>
        [`node_modules/${name}`, { version, resolved: tarball(name, version) }])),
    });
  }
  function install(directory, name, version) {
    return json(`${directory}/node_modules/${name}/package.json`, { name, version });
  }
  return { root, consumer, install, json };
}

function find(snapshot, project, id) {
  return snapshot.projects.find(item => item.id === project).packages.find(item => item.id === id);
}

test("reports matched and outdated versions, and distinguishes locked, missing and unused packages", async t => {
  const { root, consumer, install } = await fixture(t);
  const [icons, panel, ribbon, styles] = ["icons", "panel", "ribbon", "styles"].map(id => `${scope}/${id}`);
  await consumer("acm-studio", { [icons]: "^0.35.0", [panel]: "0.0.9", [ribbon]: "0.2.0", [styles]: "1.3.0" },
    { [icons]: "0.35.1", [panel]: "0.0.9", [ribbon]: "0.2.0" });
  await install("acm-studio", icons, "0.35.1");
  await install("acm-studio", panel, "0.0.9");
  await consumer("acm-account/web", {});
  const snapshot = await readPackageDashboard({ workspace: root });

  const studio = id => find(snapshot, "acm-studio", id);
  assert.equal(studio("icons").comparison, 0);
  assert.equal(studio("icons").declared, "^0.35.0");
  assert.equal(studio("panel").comparison, -1);
  assert.equal(studio("panel").state, "installed");
  assert.equal(studio("ribbon").state, "locked");
  assert.equal(studio("styles").state, "missing");
  assert.equal(find(snapshot, "acm-account", "styles").state, "unused");
  assert.equal(find(snapshot, "project-ports", "styles").state, "unavailable");
  assert.equal(snapshot.releases.every(item => item.source === "verified" && item.checkedAt), true);
});

test("does not infer releases from local links, out-of-workspace sources or mismatched install evidence", async t => {
  const { root, consumer, json, install } = await fixture(t);
  const ribbon = `${scope}/ribbon`;
  const styles = `${scope}/styles`;
  await consumer("acm-studio", {
    "@acm/icons": "file:../local-icons", "@acm/panel": "file:../missing-panel",
    [ribbon]: "file:../../restricted/ribbon", [styles]: "1.3.0",
  }, { [styles]: "1.3.0" });
  await json("local-icons/package.json", { name: "@acm/icons", version: "0.35.1" });
  await install("acm-studio", styles, "1.2.0");
  const snapshot = await readPackageDashboard({ workspace: root });
  const studio = id => find(snapshot, "acm-studio", id);
  assert.deepEqual(studio("icons"), { id: "icons", state: "local", declared: "Local source", version: "0.35.1", comparison: null });
  assert.equal(studio("panel").state, "broken");
  assert.equal(studio("ribbon").state, "unidentified");
  assert.equal(studio("styles").state, "unidentified");
  assert.equal(studio("styles").locked, "1.3.0");
  assert.doesNotMatch(JSON.stringify(snapshot), /restricted|local-icons|missing-panel/);
});

test("flags broken npm links even when the manifest still declares a registry package", async t => {
  const { root, consumer, json } = await fixture(t);
  const dependency = `${scope}/icons`;
  const ribbon = `${scope}/ribbon`;
  await consumer("acm-studio", { [dependency]: "0.35.1", [ribbon]: "file:../ribbon" }, { [dependency]: "0.35.1" });
  const scopeDirectory = path.join(root, "acm-studio/node_modules", scope);
  await mkdir(scopeDirectory, { recursive: true });
  await symlink(path.join(root, "missing-icons"), path.join(scopeDirectory, "icons"));
  await json("ribbon/package.json", { name: "unrelated-package", version: "0.2.0" });

  const snapshot = await readPackageDashboard({ workspace: root });
  assert.equal(find(snapshot, "acm-studio", "icons").state, "broken");
  assert.equal(find(snapshot, "acm-studio", "ribbon").state, "unidentified");
});

test("rejects project manifest symlinks that escape the workspace", async t => {
  const target = await fixture(t);
  const alias = await fixture(t);
  await target.consumer("acm-studio", { [`${scope}/icons`]: "1.0.0" });
  await symlink(path.join(target.root, "acm-studio"), path.join(alias.root, "acm-studio"));
  const snapshot = await readPackageDashboard({ workspace: alias.root });
  assert.equal(find(snapshot, "acm-studio", "icons").state, "unavailable");
});

test("reads the running Studio worktree separately from the sibling consumer workspace", async t => {
  const workspace = await fixture(t);
  const worktree = await fixture(t);
  const icons = `${scope}/icons`;
  await workspace.consumer("acm-studio", { [icons]: "0.33.0" }, { [icons]: "0.33.0" });
  await worktree.consumer(".", { [icons]: "0.35.1" }, { [icons]: "0.35.1" });
  await worktree.install(".", icons, "0.35.1");
  const snapshot = await readPackageDashboard({ workspace: workspace.root, studio: worktree.root });

  const dependency = find(snapshot, "acm-studio", "icons");
  assert.equal(dependency.state, "installed");
  assert.equal(dependency.version, "0.35.1");
  assert.equal(dependency.comparison, 0);
});

test("uses authenticated registry latest separately from checked fallback and rejects redirected or forged metadata", async t => {
  const { root } = await fixture(t);
  const icons = `${scope}/icons`;
  const snapshot = await readPackageDashboard({
    workspace: root,
    token: "test-token",
    fetchRelease: async (href, request) => {
      const name = decodeURIComponent(new URL(href).pathname.slice(1));
      assert.equal(new URL(href).origin, registry);
      assert.equal(request.headers.authorization, "Bearer test-token");
      assert.equal(request.redirect, "error");
      if (name.endsWith("/panel")) throw new Error("Offline");
      if (name.endsWith("/ribbon")) return new Response(null, { status: 403 });
      const version = "2.0.0";
      return Response.json({ "dist-tags": { latest: version }, versions: {
        [version]: { dist: { tarball: name === icons ? tarball(icons, version) : "https://example.test/package" } },
      } });
    },
  });
  assert.deepEqual(snapshot.releases.map(({ id, source }) => [id, source]),
    [["icons", "registry"], ["panel", "verified"], ["ribbon", "verified"], ["styles", "verified"]]);
  assert.equal(snapshot.releases[0].version, "2.0.0");
  assert.doesNotMatch(JSON.stringify(snapshot), /test-token/);
});

test("compares numeric versions and SemVer prereleases without comparing local source labels", () => {
  assert.equal(compareVersions("1.10.0", "1.9.9"), 1);
  assert.equal(compareVersions("1.0.0-rc.2", "1.0.0-rc.10"), -1);
  assert.equal(compareVersions("1.0.0-rc", "1.0.0"), -1);
  assert.equal(compareVersions("1.0.0+build", "1.0.0"), 0);
  assert.equal(compareVersions("1.0.0-01", "1.0.0"), null);
  assert.equal(compareVersions("Local source", "1.0.0"), null);
});

test("serves read-only data only through the exact localhost POST boundary", async () => {
  let handler;
  let calls = 0;
  const bridge = packageDashboardBridge({ read: async () => ({ available: true, calls: ++calls }) });
  assert.equal(bridge.apply, "serve");
  bridge.configureServer({
    config: { root: "/workspace/acm-studio" }, httpServer: { address: () => ({ port: 3010 }) },
    middlewares: { use(route, middleware) { if (route === "/__studio/packages") handler = middleware; } },
  });
  const valid = {
    method: "POST", socket: { remoteAddress: "::1" }, resume() {},
    headers: { host: "localhost:3010", origin: "http://localhost:3010", "x-studio-client": "package-dashboard", "content-type": "application/json" },
  };
  async function request(args) {
    const response = { statusCode: 200, setHeader() {}, end(body) { this.body = JSON.parse(body); } };
    await handler(args, response);
    return [response.statusCode, response.body];
  }
  assert.deepEqual(await request({ ...valid, method: "GET" }), [403, { available: false }]);
  assert.deepEqual(await request({ ...valid, headers: { ...valid.headers, origin: "http://localhost:3000" } }), [403, { available: false }]);
  assert.deepEqual(await request({ ...valid, socket: { remoteAddress: "192.0.2.5" } }), [403, { available: false }]);
  assert.deepEqual(await request(valid), [200, { available: true, calls: 1 }]);
});
