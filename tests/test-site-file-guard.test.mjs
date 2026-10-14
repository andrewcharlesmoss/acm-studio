import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import { mkdtemp, mkdir, readFile, writeFile, rm, realpath, symlink, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { acquireTestFileGuard, createTestSiteStore, revisionOf } from "../scripts/test-site-store.mjs";
import { createGlobalTemplateStore } from "../scripts/global-template-store.mjs";

const moduleUrl = new URL("../scripts/test-site-store.mjs", import.meta.url).href;
const childSource = `
  import { acquireTestFileGuard } from ${JSON.stringify(moduleUrl)};
  try {
    const release = await acquireTestFileGuard(process.argv[1]);
    process.on('message', async () => { await release(); process.disconnect(); });
    process.send({ acquired: true, pid: process.pid });
  } catch (error) { process.send({ acquired: false, status: error.status }); process.disconnect(); }
`;
async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "studio-file-guard-")));
  await mkdir(path.join(root, ".studio"));
  const file = path.join(root, ".studio/writer.lock");
  const children = [];
  t.after(async () => {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit"); child.kill("SIGKILL"); await exited;
    }
    await rm(root, { recursive: true, force: true });
  });
  return { root, file, async child() {
    const child = spawn(process.execPath, ["--input-type=module", "-e", childSource, root], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
    children.push(child);
    const [message] = await once(child, "message");
    return { child, message };
  } };
}
async function crash(f) {
  const { child, message } = await f.child();
  assert.equal(message.acquired, true);
  const exited = once(child, "exit"); child.kill("SIGKILL"); await exited;
  assert.throws(() => process.kill(message.pid, 0), { code: "ESRCH" });
  return readFile(f.file, "utf8");
}

test("a SIGKILL guard is recovered automatically, with fresh ownership and normal release", { timeout: 15000 }, async t => {
  const f = await fixture(t); const stale = JSON.parse(await crash(f));
  const release = await acquireTestFileGuard(f.root);
  try {
    const current = JSON.parse(await readFile(f.file, "utf8"));
    assert.equal(current.pid, process.pid); assert.notEqual(current.identity, stale.identity);
    await assert.rejects(acquireTestFileGuard(f.root), error => error.status === 423);
  } finally { await release(); }
  await assert.rejects(readFile(f.file), { code: "ENOENT" });
  await (await acquireTestFileGuard(f.root))();
});

test("simultaneous processes reclaim a dead guard with exactly one winning writer", { timeout: 20000 }, async t => {
  const f = await fixture(t); await crash(f);
  const contenders = await Promise.all(Array.from({ length: 6 }, () => f.child()));
  const winners = contenders.filter(item => item.message.acquired);
  assert.equal(winners.length, 1);
  for (const loser of contenders.filter(item => !item.message.acquired)) assert.equal(loser.message.status, 423);
  assert.equal(JSON.parse(await readFile(f.file, "utf8")).pid, winners[0].message.pid);
  const exited = once(winners[0].child, "exit"); winners[0].child.send("release"); await exited;
  await assert.rejects(readFile(f.file), { code: "ENOENT" });
});

test("legacy live or reused PIDs, uncertain probes and invalid guards are preserved", async t => {
  const f = await fixture(t);
  const valid = JSON.stringify({ pid: process.pid, identity: "a".repeat(48) });
  for (const value of [valid, "{", "{}", JSON.stringify({ pid: 0, identity: "a".repeat(48) }), JSON.stringify({ pid: -1, identity: "a".repeat(48) }), JSON.stringify({ pid: 1.5, identity: "a".repeat(48) }), JSON.stringify({ pid: 2147483648, identity: "a".repeat(48) }), JSON.stringify({ pid: process.pid, identity: "invalid" }), " ".repeat(1025)]) {
    await writeFile(f.file, value);
    await assert.rejects(acquireTestFileGuard(f.root), error => error.status === 423);
    assert.equal(await readFile(f.file, "utf8"), value);
  }
  for (const code of ["EPERM", "EACCES", "EIO"]) {
    await writeFile(f.file, valid);
    await assert.rejects(acquireTestFileGuard(f.root, { probeProcess() { throw Object.assign(new Error("Unknown process"), { code }); } }), error => error.status === 423);
    assert.equal(await readFile(f.file, "utf8"), valid);
  }
  await rm(f.file); await (await acquireTestFileGuard(f.root))();
});

test("an occupied kernel gate preserves the stale file and never chooses another port", { timeout: 15000 }, async t => {
  const f = await fixture(t); const stale = await crash(f);
  const port = 1024 + createHash("sha256").update(`acm-studio-writer-v1\0${f.root}`).digest().readUInt32BE(0) % 48128;
  const blocker = createServer();
  blocker.listen({ host: "127.0.0.1", port, exclusive: true }); await once(blocker, "listening");
  try {
    await assert.rejects(acquireTestFileGuard(f.root), error => error.status === 423);
    assert.equal(await readFile(f.file, "utf8"), stale);
  } finally { await new Promise(resolve => blocker.close(resolve)); }
  await (await acquireTestFileGuard(f.root))();
});

test("symlinks and a guard changed during the process probe cannot be reclaimed", async t => {
  const f = await fixture(t); const target = path.join(f.root, "untouched");
  const valid = JSON.stringify({ pid: process.pid, identity: "a".repeat(48) });
  await writeFile(target, valid); await symlink(target, f.file);
  await assert.rejects(acquireTestFileGuard(f.root), error => error.status === 423);
  assert.equal(await readFile(target, "utf8"), valid); await rm(f.file);
  await writeFile(f.file, valid);
  const replacement = JSON.stringify({ pid: process.pid, identity: "b".repeat(48) });
  const { writeFileSync } = await import("node:fs");
  await assert.rejects(acquireTestFileGuard(f.root, { probeProcess() {
    writeFileSync(f.file, replacement); throw Object.assign(new Error("Gone"), { code: "ESRCH" });
  } }), error => error.status === 423);
  assert.equal(await readFile(f.file, "utf8"), replacement);
});

test("non-regular guards are preserved without blocking acquisition", { timeout: 5000 }, async t => {
  const f = await fixture(t);
  await mkdir(f.file);
  await assert.rejects(acquireTestFileGuard(f.root), error => error.status === 423);
  await rm(f.file, { recursive: true });
  if (process.platform !== "win32") {
    const result = spawnSync("mkfifo", [f.file]); assert.equal(result.status, 0);
    await assert.rejects(acquireTestFileGuard(f.root), error => error.status === 423);
  }
});

test("releasing ownership preserves a replacement guard", async t => {
  const f = await fixture(t); const release = await acquireTestFileGuard(f.root);
  const replacement = JSON.stringify({ pid: process.pid, identity: "c".repeat(48) });
  await writeFile(f.file, replacement); await release();
  assert.equal(await readFile(f.file, "utf8"), replacement);
});

for (const siteId of ["test", "test2"]) test(`${siteId} reconnects and saves after a server crash, preserving the previous source and history`, { timeout: 15000 }, async t => {
  const f = await fixture(t); await mkdir(path.join(f.root, "content")); await mkdir(path.join(f.root, "dist"));
  const initial = { siteId, text: "Saved before crash" };
  const render = (document, revision) => `<meta name="acm-test-revision" content="${revision}"><p>${document.text}</p>`;
  const source = JSON.stringify(initial); const output = render(initial, revisionOf(initial));
  await writeFile(path.join(f.root, "content/site.json"), source); await writeFile(path.join(f.root, "dist/index.html"), output);
  await crash(f);
  const store = createTestSiteStore({ root: f.root, siteId, validate: value => value.siteId === siteId && typeof value.text === "string", render });
  try {
    const connected = await store.connect(); assert.deepEqual(connected.document, initial);
    assert.equal(await readFile(path.join(f.root, "content/site.json"), "utf8"), source);
    assert.equal(await readFile(path.join(f.root, "dist/index.html"), "utf8"), output);
    await store.handle(connected.token, { siteId, action: "claim" });
    const saved = await store.handle(connected.token, { siteId, action: "save", baseRevision: connected.revision, document: { siteId, text: "Saved after recovery" } });
    assert.equal(saved.document.text, "Saved after recovery");
    assert.match(await readFile(path.join(f.root, "dist/index.html"), "utf8"), /Saved after recovery/);
    assert.deepEqual(JSON.parse(await readFile(path.join(f.root, `.studio/history/${connected.revision}.json`), "utf8")), initial);
  } finally { await store.close(); }
});

test("global templates recover the shared guard and save with retained source history", { timeout: 15000 }, async t => {
  const f = await fixture(t); await crash(f);
  const initial = { templates: { sets: [{ id: "original", templates: [], parts: [] }] } };
  const store = createGlobalTemplateStore({ root: f.root, loadContracts: async () => ({ createGlobalTemplateLibrary: () => structuredClone(initial), validateGlobalTemplateLibrary: value => structuredClone(value) }), readSites: async () => ({}) });
  try {
    const connected = await store.load(true, async () => {});
    const changed = structuredClone(connected.library.templates); changed.sets[0].name = "Changed after recovery";
    const saved = await store.save(connected.revision, changed, async () => {});
    assert.equal(saved.library.templates.sets[0].name, "Changed after recovery");
    assert.deepEqual(JSON.parse(await readFile(path.join(f.root, `.studio/global-template-history/${connected.revision}.json`), "utf8")), initial);
    assert.deepEqual((await readdir(path.join(f.root, ".studio"))).sort(), ["global-template-history", "writer.lock"]);
  } finally { await store.close(); }
});
