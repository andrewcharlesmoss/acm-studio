import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import { packageDashboardBridge } from "../scripts/package-dashboard-bridge.mjs";
import { createPackageVersionChanges } from "../scripts/package-version-change.mjs";

const name = "@andrewcharlesmoss/icons";
const oldVersion = "0.35.1";
const newVersion = "0.34.0";
const dist = version => ({ tarball: `https://npm.pkg.github.com/download/${name}/${version}/test`, integrity: "sha512-example" });
const json = data => JSON.stringify(data, null, 2) + "\n";
const reviewRequest = { action: "review", packageId: "icons", version: newVersion };

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "studio-package-change-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git("init", "-q");
  const manifest = { name: "acm-studio", dependencies: { [name]: oldVersion } };
  const lock = { name: "acm-studio", lockfileVersion: 3, packages: { "": manifest,
    [`node_modules/${name}`]: { version: oldVersion, resolved: dist(oldVersion).tarball, integrity: dist(oldVersion).integrity } } };
  const manifestPath = path.join(root, "package.json");
  const lockPath = path.join(root, "package-lock.json");
  await writeFile(manifestPath, json(manifest));
  await writeFile(lockPath, json(lock));
  git("add", "package.json", "package-lock.json");
  git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "commit", "-qm", "Baseline");
  const releases = async () => [oldVersion, newVersion].map(version => [version, { dist: dist(version) }]);
  const resolve = async ({ contents, version }) => {
    const [before, beforeLock] = contents.map(JSON.parse);
    before.dependencies[name] = version;
    beforeLock.packages[""].dependencies[name] = version;
    beforeLock.packages[`node_modules/${name}`] = { version, resolved: dist(version).tarball, integrity: dist(version).integrity };
    return [json(before), json(beforeLock)];
  };
  return { root, git, manifestPath, lockPath, releases, resolve };
}

test("reviews a downgrade without changing the checkout, then applies the exact reviewed files once", async t => {
  const { root, git, manifestPath, lockPath, releases, resolve } = await fixture(t);
  const change = createPackageVersionChanges({ releases, resolve });
  assert.deepEqual(await change(root, "fixture", { action: "versions", packageId: "icons" }), { versions: [oldVersion, newVersion] });
  const read = () => Promise.all([manifestPath, lockPath].map(file => readFile(file, "utf8")));
  const original = await read();
  const review = await change(root, "fixture", reviewRequest);
  assert.equal(review.previous, oldVersion);
  assert.equal(review.version, newVersion);
  assert.match(review.diff, /\+.*@andrewcharlesmoss\/icons.*0\.34\.0/);
  assert.match(review.diff, /\+.*resolved.*0\.34\.0/);
  assert.deepEqual(await read(), original);
  const apply = { action: "apply", reviewId: review.reviewId };
  assert.deepEqual(await change(root, "fixture", apply), { applied: true, version: newVersion });
  assert.deepEqual(await read(), await resolve({ contents: original, version: newVersion }));
  assert.equal(git("diff", "--cached", "--name-only"), "");
  assert.equal(git("diff", "--name-only"), "package-lock.json\npackage.json");
  await assert.rejects(change(root, "fixture", apply), /expired or was already used/);
});

test("preserves dirty dependency files and rejects stale, expired, and unmanaged changes", async t => {
  const { root, git, manifestPath, releases, resolve } = await fixture(t);
  let now = 0;
  const change = createPackageVersionChanges({ releases, resolve, now: () => now });
  const request = { action: "review", packageId: "unknown", version: newVersion };
  await assert.rejects(change(root, "fixture", request), /available Studio package/);
  await assert.rejects(change(root, "fixture", { ...reviewRequest, version: "9.0.0" }), /no longer available/);
  const expired = await change(root, "fixture", reviewRequest);
  now += 600_001;
  await assert.rejects(change(root, "fixture", { action: "apply", reviewId: expired.reviewId }), /expired/);
  const review = await change(root, "fixture", reviewRequest);
  const dirty = (await readFile(manifestPath, "utf8")) + "\n";
  await writeFile(manifestPath, dirty);
  await assert.rejects(change(root, "fixture", reviewRequest), /local changes/);
  await assert.rejects(change(root, "fixture", { action: "apply", reviewId: review.reviewId }), /local changes/);
  assert.equal(await readFile(manifestPath, "utf8"), dirty);
  assert.equal(git("diff", "--name-only"), "package.json");
});

test("rejects a competing writer and a lockfile resolved outside supported registries", async t => {
  const { root, releases, resolve } = await fixture(t);
  const change = createPackageVersionChanges({ releases, resolve });
  const review = await change(root, "fixture", reviewRequest);
  await mkdir(path.join(root, ".git", "studio-package-version.lock"));
  await assert.rejects(change(root, "fixture", { action: "apply", reviewId: review.reviewId }), /Another package change/);
  const unsafe = createPackageVersionChanges({ releases, resolve: async input => {
    const [manifest, lockText] = await resolve(input);
    const lock = JSON.parse(lockText);
    lock.packages["node_modules/foreign"] = { resolved: "https://example.invalid/foreign.tgz", integrity: "sha512-example" };
    return [manifest, json(lock)];
  } });
  await assert.rejects(unsafe(root, "fixture", reviewRequest), /unsupported package source/);
});

test("restores a partially applied file and retains recovery evidence when another edit intervenes", async t => {
  const { root, git, manifestPath, lockPath, releases, resolve } = await fixture(t);
  const original = await Promise.all([manifestPath, lockPath].map(file => readFile(file, "utf8")));
  const [candidate] = await resolve({ contents: original, version: newVersion });
  const independentEdit = original[1] + "\n";
  let interruptedByEdit = false;
  const change = createPackageVersionChanges({ releases, resolve, apply: async () => {
    await writeFile(manifestPath, candidate);
    if (interruptedByEdit) await writeFile(lockPath, independentEdit);
    throw new Error("Apply stopped after writing the manifest");
  } });
  const apply = async () => {
    const review = await change(root, "fixture", reviewRequest);
    return change(root, "fixture", { action: "apply", reviewId: review.reviewId });
  };
  await assert.rejects(apply(), /Both dependency files match their original contents/);
  assert.equal(git("status", "--porcelain"), "");

  interruptedByEdit = true;
  await assert.rejects(apply(), /saved recovery review/);
  assert.equal(await readFile(manifestPath, "utf8"), original[0]);
  assert.equal(await readFile(lockPath, "utf8"), independentEdit);
  const recovery = JSON.parse(await readFile(path.join(root, ".git", "studio-package-version.lock", "review.json"), "utf8"));
  assert.equal(recovery.head, git("rev-parse", "HEAD"));
  assert.match(recovery.patch, /0\.34\.0/);
});

test("keeps the version endpoint local and rejects malformed or oversized actions before dispatch", async () => {
  let handler;
  const bridge = packageDashboardBridge({ change: async (root, _token, data) => ({ root, action: data.action }) });
  bridge.configureServer({ config: { root: "/studio" }, httpServer: { address: () => ({ port: 3010 }) },
    middlewares: { use(route, middleware) { if (route === "/__studio/package-version") handler = middleware; } } });
  async function request(body, origin = "http://localhost:3010") {
    const req = Object.assign(Readable.from([Buffer.from(body)]), {
      method: "POST", socket: { remoteAddress: "::1" },
      headers: { host: "localhost:3010", origin, "x-studio-client": "package-dashboard", "content-type": "application/json" },
    });
    const response = { statusCode: 200, setHeader() {}, end(body) { this.body = JSON.parse(body); } };
    await handler(req, response);
    return response;
  }
  assert.equal((await request(json(reviewRequest), "http://localhost:3000")).statusCode, 403);
  assert.equal((await request("{")).statusCode, 400);
  assert.equal((await request(" ".repeat(2049))).statusCode, 413);
  assert.deepEqual((await request(json(reviewRequest))).body, { root: "/studio", action: "review" });
});
