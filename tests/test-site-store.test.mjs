import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createTestSiteStore, revisionOf } from "../scripts/test-site-store.mjs";
import { confinedConfig, assertConfinedConfig } from "../scripts/test-site-prompt.mjs";
const hash = text => createHash("sha256").update(text).digest("hex");
const render = (document, revision) => `<meta name="acm-test-revision" content="${revision}"><p>${document.text}</p>`;
async function fixture() {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "test-site-store-")));
  const document = { text: "Original" };
  await mkdir(path.join(root, "content")); await mkdir(path.join(root, "dist"));
  await writeFile(path.join(root, "content/site.json"), JSON.stringify(document));
  await writeFile(path.join(root, "dist/index.html"), render(document, revisionOf(document)));
  const options = { root, validate: value => typeof value?.text === "string" && value.text.length < 1000, render };
  const store = createTestSiteStore(options);
  return { root, store, options, async close() { await store.close(); await rm(root, { recursive: true, force: true }); } };
}
test("shared gateway saves visual/prompt changes by revision and retains undo source", async () => {
  const f = await fixture();
  try {
    const session = await f.store.connect(); await f.store.handle(session.token, { siteId: "test", action: "claim" });
    const visual = await f.store.handle(session.token, { siteId: "test", action: "save", baseRevision: session.revision, document: { text: "Visual" } });
    assert.equal((await f.store.assertPrompt(session.token, visual.revision)).document.text, "Visual");
    const prompt = await f.store.handle(session.token, { siteId: "test", action: "save", baseRevision: visual.revision, document: { text: "Prompt" } });
    assert.match(await readFile(path.join(f.root, "dist/index.html"), "utf8"), /Prompt/);
    assert.equal(JSON.parse(await readFile(path.join(f.root, `.studio/history/${session.revision}.json`), "utf8")).text, "Original");
    await assert.rejects(f.store.handle(session.token, { siteId: "test", action: "save", baseRevision: visual.revision, document: { text: "Stale" } }), error => error.status === 409);
    const undo = await f.store.handle(session.token, { siteId: "test", action: "save", baseRevision: prompt.revision, document: { text: "Visual" } });
    assert.equal(undo.document.text, "Visual");
  } finally { await f.close(); }
});
test("invalid/token/unknown-site/second-session updates cannot write", async () => {
  const f = await fixture();
  try {
    const a = await f.store.connect(); const b = await f.store.connect(); await f.store.handle(a.token, { siteId: "test", action: "claim" });
    await assert.rejects(f.store.handle(b.token, { siteId: "test", action: "claim" }), error => error.status === 423);
    await assert.rejects(f.store.handle("bad", { siteId: "test", action: "save" }), error => error.status === 401);
    await assert.rejects(f.store.handle(a.token, { siteId: "other", action: "save" }));
    await assert.rejects(f.store.handle(a.token, { siteId: "test", action: "save", baseRevision: a.revision, document: {} }));
    assert.equal(JSON.parse(await readFile(path.join(f.root, "content/site.json"), "utf8")).text, "Original");
  } finally { await f.close(); }
});
test("external output edits and concurrent source edits during rendering are preserved", async () => {
  const f = await fixture();
  try {
    const a = await f.store.connect(); await f.store.handle(a.token, { siteId: "test", action: "claim" });
    await writeFile(path.join(f.root, "dist/index.html"), "external");
    await assert.rejects(f.store.handle(a.token, { siteId: "test", action: "save", baseRevision: a.revision, document: { text: "Overwrite" } }), error => error.status === 409);
    assert.equal(await readFile(path.join(f.root, "dist/index.html"), "utf8"), "external");
  } finally { await f.close(); }
  const g = await fixture();
  let edit = false;
  const second = createTestSiteStore({ ...g.options, render: async (document, revision) => { if (edit) await writeFile(path.join(g.root, "content/site.json"), JSON.stringify({ text: "External" })); return render(document, revision); } });
  try {
    const a = await second.connect(); await second.handle(a.token, { siteId: "test", action: "claim" }); edit = true;
    await assert.rejects(second.handle(a.token, { siteId: "test", action: "save", baseRevision: a.revision, document: { text: "Overwrite" } }), error => error.status === 409);
    assert.equal(JSON.parse(await readFile(path.join(g.root, "content/site.json"), "utf8")).text, "External");
  } finally { await second.close(); await g.close(); }
});
test("a pending source commit recovers output and a live second server is excluded", async () => {
  const f = await fixture();
  try {
    const a = await f.store.connect();
    const second = createTestSiteStore(f.options);
    await assert.rejects(second.connect(), error => error.status === 423);
    const next = { text: "Committed before interruption" }; const revision = revisionOf(next);
    const oldHtml = await readFile(path.join(f.root, "dist/index.html"), "utf8");
    await writeFile(path.join(f.root, ".studio/state.json"), JSON.stringify({ revision: a.revision, outputHash: hash(oldHtml), pending: { revision, outputHash: hash(render(next, revision)) } }));
    await writeFile(path.join(f.root, "content/site.json"), JSON.stringify(next));
    await f.store.close();
    const recovered = await second.connect();
    assert.equal(recovered.document.text, next.text); assert.match(await readFile(path.join(f.root, "dist/index.html"), "utf8"), /Committed before interruption/);
    await second.close();
  } finally { await f.close(); }
});
test("symlink source and expired credentials fail closed", async () => {
  const f = await fixture();
  try {
    await rm(path.join(f.root, "content/site.json"));
    await symlink(path.join(f.root, "dist/index.html"), path.join(f.root, "content/site.json"));
    await assert.rejects(f.store.connect(), error => error.status === 503);
  } finally { await f.close(); }
  const g = await fixture(); let now = 0;
  const timed = createTestSiteStore({ ...g.options, clock: () => now });
  try { const a = await timed.connect(); now = 120001; await assert.rejects(timed.handle(a.token, { siteId: "test", action: "claim" }), error => error.status === 401); }
  finally { await timed.close(); await g.close(); }
});
test("prompt config disables each inherited transport and rejects effective tools", () => {
  const overrides = confinedConfig({ mcp_servers: { remote: { url: "https://provider.invalid", secret: "do not propagate" }, local: { command: "private" } } });
  assert.match(overrides.at(-1), /remote.*localhost:1\/disabled/); assert.match(overrides.at(-1), /local.*\/usr\/bin\/false/); assert.ok(!overrides.join().includes("do not propagate"));
  assert.throws(() => assertConfinedConfig({ features: { apps: true } }));
});
test("recovery preserves an external edit made while output renders", async () => {
  const f = await fixture();
  let recovery;
  try {
    const session = await f.store.connect();
    const next = { text: "Pending" }; const revision = revisionOf(next);
    const oldOutput = await readFile(path.join(f.root, "dist/index.html"), "utf8");
    await writeFile(path.join(f.root, ".studio/state.json"), JSON.stringify({ revision: session.revision, outputHash: hash(oldOutput), pending: { revision, outputHash: hash(render(next, revision)) } }));
    await writeFile(path.join(f.root, "content/site.json"), JSON.stringify(next));
    await f.store.close();
    recovery = createTestSiteStore({ ...f.options, render: async (document, rev) => { await writeFile(path.join(f.root, "dist/index.html"), "External during recovery"); return render(document, rev); } });
    await assert.rejects(recovery.connect(), error => error.status === 409);
    assert.equal(await readFile(path.join(f.root, "dist/index.html"), "utf8"), "External during recovery");
  } finally { await recovery?.close(); await f.close(); }
});
test("canonical block validator and renderer preserve regions, formatting, colours and escaping", async () => {
  const { runnerImport } = await import("vite");
  const { module } = await runnerImport(path.resolve("app/studio/test-site/render.tsx"), { root: process.cwd(), resolve: { dedupe: ["react", "react-dom"] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } }, esbuild: { jsx: "automatic" } });
    const document = { format: "acm-test-site", version: 1, siteId: "test", regions: Object.fromEntries(["header", "main", "footer"].map(region => [region, { id: `test-${region}`, type: "group", layout: "flow", tagName: region, children: [{ id: `text-${region}`, type: "paragraph", text: "<script>escaped</script>", style: { textColor: "#34C759", padding: "12px" } }] }])) };
    assert.equal(module.validTestSiteDocument(document), true);
    const html = module.renderTestSite(document, revisionOf(document));
    assert.match(html, /<header/); assert.match(html, /<main/); assert.match(html, /<footer/); assert.match(html, /&lt;script&gt;escaped/); assert.match(html, /color:#34C759/); assert.match(html, /padding:12px/); assert.match(html, /--acm-color-success:/);
    const missingRegion = structuredClone(document); missingRegion.regions.header.id = "renamed";
    assert.equal(module.validTestSiteDocument(missingRegion), false);
});
function effectivePromptConfig() {
  return { features: Object.fromEntries(["apps", "plugins", "remote_plugin", "tool_suggest", "shell_tool", "unified_exec", "multi_agent", "hooks", "js_repl", "memories", "code_mode_host"].map(name => [name, false]).concat([["code_mode", { enabled: false }]])), experimental_use_unified_exec_tool: false, web_search: "disabled", mcp_servers: { disabled: { enabled: false } } };
}
async function fakeProposal({ tool = false, connector = false, unsafe = false, network = false, invalidJson = false, wrongRevision = false, disconnect = false, secondPage = false } = {}) {
  const { createTestPromptClient } = await import("../scripts/test-site-prompt.mjs");
  let creations = 0;
  let permissionProfile;
  const proposal = { baseRevision: wrongRevision ? "wrong" : "baseline", documentJson: invalidJson ? "invalid JSON" : JSON.stringify({ text: "Proposed" }), explanation: "Changed the text." };
  const requests = [];
  const client = createTestPromptClient({ command: process.execPath, spawnProcess: (_command, args) => ({ profile: args.find(value => value.startsWith("permissions.studio_proposal_")).split("=")[0].replace("permissions.", "") }), createClient: options => {
    const discovery = ++creations === 1;
    if (!discovery) {
      const spawned = options.spawnProcess("unused", [], {});
      permissionProfile = spawned.profile;
    }
    return { close() {}, async request(method, parameters) {
      requests.push({ method, parameters });
      if (method === "config/read") return { config: discovery ? { mcp_servers: { inherited: { url: "https://example.invalid" } } } : { ...effectivePromptConfig(), permissions: { [permissionProfile]: { filesystem: { ":minimal": "read" }, network: { enabled: false } } } } };
      if (method === "mcpServerStatus/list") return { data: [{ tools: connector || secondPage && parameters.cursor === "page2" ? { unexpected: {} } : {} }], nextCursor: secondPage && !parameters.cursor ? "page2" : null };
      if (method === "thread/start") return { thread: { id: "confined-thread" }, approvalPolicy: "never", sandbox: { type: unsafe ? "workspaceWrite" : "readOnly", networkAccess: network } };
      if (method === "turn/start") { queueMicrotask(() => {
        if (disconnect) { options.onDisconnect(); return; }
        if (tool) options.onMessage({ method: "item/completed", params: { item: { type: "commandExecution" } } });
        options.onMessage({ method: "item/completed", params: { item: { type: "agentMessage", text: JSON.stringify(proposal) } } });
        options.onMessage({ method: "turn/completed", params: { turn: { status: "completed" } } });
      }); return {}; }
      throw new Error("Unexpected RPC");
    } };
  } });
  const result = await client.propose({ revision: "baseline", document: { text: "Original" } }, "Change the text");
  return { result, requests };
}
test("prompt proposals use structured ephemeral permissions and reject tools/connectors/write permissions", async () => {
  const { result, requests } = await fakeProposal();
  assert.equal(result.document.text, "Proposed");
  const started = requests.find(request => request.method === "thread/start").parameters;
  assert.equal(started.ephemeral, true); assert.match(started.permissions, /^studio_proposal_/); assert.equal(started.approvalPolicy, "never");
  const turn = requests.find(request => request.method === "turn/start").parameters;
  assert.ok(turn.outputSchema.required.includes("documentJson"));
  await assert.rejects(fakeProposal({ tool: true }), error => error.status === 503);
  await assert.rejects(fakeProposal({ connector: true }), error => error.status === 503);
  await assert.rejects(fakeProposal({ unsafe: true }), error => error.status === 503);
  await assert.rejects(fakeProposal({ network: true }), error => error.status === 503);
  await assert.rejects(fakeProposal({ invalidJson: true }), error => error.status === 503);
  await assert.rejects(fakeProposal({ wrongRevision: true }), error => error.status === 400);
  await assert.rejects(fakeProposal({ disconnect: true }), error => error.status === 503);
  await assert.rejects(fakeProposal({ secondPage: true }), error => error.status === 503);
});
test("journal-only and completed-output interrupted saves recover without overwriting", async () => {
  for (const phase of ["journal", "output"]) {
    const f = await fixture(); let recovered;
    try {
      const session = await f.store.connect(); const next = { text: "Next" }; const revision = revisionOf(next); const html = render(next, revision);
      const old = await readFile(path.join(f.root, "dist/index.html"), "utf8");
      await writeFile(path.join(f.root, ".studio/state.json"), JSON.stringify({ revision: session.revision, outputHash: hash(old), pending: { revision, outputHash: hash(html) } }));
      if (phase === "output") { await writeFile(path.join(f.root, "content/site.json"), JSON.stringify(next)); await writeFile(path.join(f.root, "dist/index.html"), html); }
      await f.store.close(); recovered = createTestSiteStore(f.options);
      const snapshot = await recovered.connect();
      assert.equal(snapshot.document.text, phase === "journal" ? "Original" : "Next");
      assert.equal(JSON.parse(await readFile(path.join(f.root, ".studio/state.json"), "utf8")).pending, undefined);
    } finally { await recovered?.close(); await f.close(); }
  }
});
test("expired owner cannot commit after slow rendering or renew itself by reading", async () => {
  const f = await fixture(); let now = 0; let slow = false;
  const store = createTestSiteStore({ ...f.options, clock: () => now, render: (document, revision) => { if (slow) now = 40000; return render(document, revision); } });
  try {
    const session = await store.connect(); await store.handle(session.token, { siteId: "test", action: "claim" }); slow = true;
    await assert.rejects(store.handle(session.token, { siteId: "test", action: "save", baseRevision: session.revision, document: { text: "Expired" } }), error => error.status === 423);
    await assert.rejects(store.handle(session.token, { siteId: "test", action: "read" }), error => error.status === 423);
    assert.equal(JSON.parse(await readFile(path.join(f.root, "content/site.json"), "utf8")).text, "Original");
  } finally { await store.close(); await f.close(); }
});
test("prompt reservation excludes concurrent starts before baseline lookup resolves", async () => {
  const { createTestPromptGateway } = await import("../scripts/test-site-bridge.mjs");
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  let proposed = 0;
  const gateway = createTestPromptGateway({ store: { assertPrompt: async () => { await waiting; return { revision: "base" }; } }, propose: async () => { proposed++; return { baseRevision: "base", document: { text: "Next" } }; }, validate: value => typeof value.text === "string" });
  const first = gateway("token", { baseRevision: "base", prompt: "First" });
  await assert.rejects(gateway("token", { baseRevision: "base", prompt: "Second" }), error => error.status === 423);
  release(); await first; assert.equal(proposed, 1);
  const invalid = createTestPromptGateway({ store: { assertPrompt: async () => ({ revision: "base" }) }, propose: async () => ({ baseRevision: "old", document: {} }), validate: () => false });
  await assert.rejects(invalid("token", { prompt: "Invalid" }), error => error.status === 400);
});
test("effective permission profile rejects inherited writes, network, roots and extension", () => {
  const valid = { ...effectivePromptConfig(), permissions: { studio_proposal: { description: null, extends: null, workspace_roots: null, filesystem: { ":minimal": "read", glob_scan_max_depth: null }, network: { enabled: false, domains: null } } } };
  assert.doesNotThrow(() => assertConfinedConfig(valid));
  for (const mutate of [profile => { profile.filesystem["/tmp"] = "write"; }, profile => { profile.network.enabled = true; }, profile => { profile.workspace_roots = ["/private"]; }, profile => { profile.extends = "broader"; }]) {
    const configuration = structuredClone(valid); mutate(configuration.permissions.studio_proposal);
    assert.throws(() => assertConfinedConfig(configuration));
  }
});

test("renderer failure preserves canonical source, output and journal before commit", async () => {
  const f = await fixture();
  const rejecting = createTestSiteStore({ ...f.options, render: async () => { throw new Error("Fixture renderer failed"); } });
  try {
    const session = await rejecting.connect(); await rejecting.handle(session.token, { siteId: "test", action: "claim" });
    const names = ["content/site.json", "dist/index.html", ".studio/state.json"];
    const before = await Promise.all(names.map(name => readFile(path.join(f.root, name), "utf8")));
    await assert.rejects(rejecting.handle(session.token, { siteId: "test", action: "save", baseRevision: session.revision, document: { text: "Rejected rendering" } }), /Fixture renderer failed/);
    assert.deepEqual(await Promise.all(names.map(name => readFile(path.join(f.root, name), "utf8"))), before);
    assert.equal((await rejecting.handle(session.token, { siteId: "test", action: "read" })).revision, session.revision);
  } finally { await rejecting.close(); await f.close(); }
});
test("client stale or failed prompt preserves exportable draft and proposal", async () => {
  const { runnerImport } = await import("vite");
  const { module: { canApplyTestProposal, testDraftRecoveryEnvelope } } = await runnerImport(path.resolve("app/studio/test-site/draft-recovery.ts"));
  const original = { text: "Original" }; const draft = { text: "Unsaved visual edit" };
  const baseline = { revision: "old", document: original };
  assert.equal(canApplyTestProposal(baseline, { snapshot: { revision: "old" }, draft: original, failure: null }), true);
  for (const current of [{ snapshot: { revision: "new" }, draft: original, failure: null }, { snapshot: { revision: "old" }, draft, failure: null }, { snapshot: { revision: "old" }, draft: original, failure: "Disconnected" }]) assert.equal(canApplyTestProposal(baseline, current), false);
  const proposal = { document: { text: "Stale prompt" }, baseRevision: "old" };
  const exported = JSON.parse(JSON.stringify(testDraftRecoveryEnvelope(draft, "old", proposal)));
  assert.deepEqual(exported, { draft, baseRevision: "old", preservedProposal: proposal });
  assert.deepEqual(draft, { text: "Unsaved visual edit" });
});
