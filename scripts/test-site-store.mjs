import { createHash, randomBytes } from "node:crypto";
import { lstat, readFile, mkdir, realpath, rename, writeFile, unlink, readdir } from "node:fs/promises";
import path from "node:path";

export const revisionOf = document => createHash("sha256").update(JSON.stringify(document)).digest("hex");
const hash = value => createHash("sha256").update(value).digest("hex");
export class TestSiteError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export const TEST_FILE_MAX_BYTES = 1024 * 1024;
export function checkedTestOutput(output) {
  if (typeof output !== "string" || Buffer.byteLength(output, "utf8") > TEST_FILE_MAX_BYTES) throw new TestSiteError("Test's generated preview is too large. The site was not changed.", 413);
  return output;
}


export async function acquireTestFileGuard(root) {
  if (await realpath(root) !== path.resolve(root) || !(await lstat(root)).isDirectory()) throw new TestSiteError("Use Test's canonical project directory.", 503);
  const directory = path.join(root, ".studio");
  try { await mkdir(directory); } catch (error) { if (error.code !== "EEXIST") throw error; }
  const entry = await lstat(directory);
  if (!entry.isDirectory() || entry.isSymbolicLink()) throw new TestSiteError("Test contains an unsafe recovery path.", 503);
  const file = path.join(directory, "writer.lock");
  const identity = randomBytes(24).toString("hex");
  try { await writeFile(file, JSON.stringify({ pid: process.pid, identity }), { flag: "wx", mode: 0o600 }); }
  catch (error) { if (error.code === "EEXIST") throw new TestSiteError("Another Studio server holds Test's file lock. Stop that server, then review the lock before reconnecting.", 423); throw error; }
  return async () => {
    try {
      const current = await lstat(file);
      if (!current.isFile() || current.isSymbolicLink()) throw new TestSiteError("Test's process guard changed unexpectedly.", 503);
      const guard = JSON.parse(await readFile(file, "utf8"));
      if (guard.identity === identity) await unlink(file);
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  };
}

// One serial gateway owns both visual saves and accepted prompt proposals.
export function createTestSiteStore({ root, validate, render, clock = () => Date.now() }) {
  let queue = Promise.resolve();
  let closing = false;
  let owner;
  let initialised = false;
  let processGuard = null;
  const sessions = new Map();
  function serial(operation) { if (closing) return Promise.reject(new TestSiteError("The local Test server closed.", 503)); const next = queue.then(operation); queue = next.catch(() => {}); return next; }
  async function safe(relative, { createParent = false } = {}) {
    const canonical = await realpath(root);
    if (canonical !== path.resolve(root)) throw new TestSiteError("The Test project path must not be a symlink.", 503);
    const parts = relative.split("/");
    let current = root;
    for (let index = 0; index < parts.length; index++) {
      current = path.join(current, parts[index]);
      let entry;
      try { entry = await lstat(current); } catch (error) {
        if (error.code !== "ENOENT") throw error;
        if (index < parts.length - 1 && createParent) { await mkdir(current); entry = await lstat(current); }
        else if (index === parts.length - 1) return current;
        else throw error;
      }
      if (entry.isSymbolicLink() || (index < parts.length - 1 ? !entry.isDirectory() : !entry.isFile())) throw new TestSiteError("Test contains an unsafe file path.", 503);
    }
    return current;
  }
  async function read(relative, optional = false) {
    try {
      const file = await safe(relative);
      const entry = await lstat(file);
      if (entry.size > TEST_FILE_MAX_BYTES) throw new TestSiteError("Test's file is too large.", 503);
      return await readFile(file, "utf8");
    } catch (error) { if (optional && error.code === "ENOENT") return null; throw error; }
  }
  async function atomic(relative, value) {
    const file = await safe(relative, { createParent: true });
    const temp = await safe(`${relative}.${randomBytes(12).toString("hex")}.tmp`, { createParent: true });
    await writeFile(temp, value, { flag: "wx", mode: 0o600 });
    // Recheck the destination immediately before the replacement.
    await safe(relative);
    await rename(temp, file);
  }
  function decode(raw) {
    let document;
    try { document = JSON.parse(raw); } catch { throw new TestSiteError("Test's document is invalid. Its files have been preserved.", 503); }
    if (!validate(document)) throw new TestSiteError("Test's document has unsupported content. Its files have been preserved.", 503);
    return document;
  }
  async function acquireProcessGuard() {
    processGuard ??= await acquireTestFileGuard(root);
  }
  async function close() {
    if (!processGuard) return;
    try { await processGuard(); } finally { processGuard = null; }
  }
  async function trimHistory() {
    const directory = path.dirname(await safe(".studio/history/placeholder.json", { createParent: true }));
    const entries = (await readdir(directory)).filter(name => /^[a-f0-9]{64}\.json$/.test(name));
    if (entries.length <= 100) return;
    const dated = await Promise.all(entries.map(async name => ({ name, time: (await lstat(await safe(`.studio/history/${name}`))).mtimeMs })));
    dated.sort((a, b) => b.time - a.time);
    for (const entry of dated.slice(100)) await unlink(await safe(`.studio/history/${entry.name}`));
  }
  async function initialise() {
    if (initialised) return;
    await acquireProcessGuard();
    const document = decode(await read("content/site.json"));
    const revision = revisionOf(document);
    const html = await read("dist/index.html");
    const metadata = await read(".studio/state.json", true);
    if (!metadata) {
      if (!html.includes(`<meta name="acm-test-revision" content="${revision}">`)) throw new TestSiteError("Generate Test's initial preview before opening the editor.", 503);
      await atomic(".studio/state.json", JSON.stringify({ revision, outputHash: hash(html) }));
    } else {
      const state = JSON.parse(metadata);
      if (state.pending && revision === state.pending.revision && hash(html) === state.outputHash) {
        const generated = checkedTestOutput(await render(document, revision));
        if (revisionOf(decode(await read("content/site.json"))) !== revision || hash(await read("dist/index.html")) !== state.outputHash) throw new TestSiteError("Test changed during interrupted-save recovery. The external files were preserved.", 409);
        await atomic("dist/index.html", generated);
        await atomic(".studio/state.json", JSON.stringify({ revision, outputHash: hash(generated) }));
      } else if (state.pending && revision === state.revision && hash(html) === state.outputHash) {
        await atomic(".studio/state.json", JSON.stringify({ revision, outputHash: state.outputHash }));
      } else if (state.pending && revision === state.pending.revision && hash(html) === state.pending.outputHash) {
        await atomic(".studio/state.json", JSON.stringify({ revision, outputHash: hash(html) }));
      } else if (state.revision !== revision || state.outputHash !== hash(html)) {
        throw new TestSiteError("Test was edited outside the shared save service. Export your draft and review the files before reconnecting.", 409);
      }
    }
    initialised = true;
  }
  async function snapshot() {
    await initialise();
    const document = decode(await read("content/site.json"));
    const revision = revisionOf(document);
    const state = JSON.parse(await read(".studio/state.json"));
    const html = await read("dist/index.html");
    if (state.pending || state.revision !== revision || state.outputHash !== hash(html)) {
      initialised = false;
      throw new TestSiteError("Test changed outside this editing session. Your draft is preserved; reconnect after reviewing the files.", 409);
    }
    return { document, revision, previewRevision: revision };
  }
  function session(token) {
    const item = sessions.get(token);
    if (!item || item.expires < clock()) { sessions.delete(token); throw new TestSiteError("The local editing connection expired. Reconnect to continue.", 401); }
    item.expires = Math.max(item.expires, clock() + 120000);
    return item;
  }
  function writable(token) {
    session(token);
    if (!owner || owner.token !== token || owner.expires < clock()) throw new TestSiteError("Another session owns Test editing. Reconnect when it is available.", 423);
    owner.expires = Math.max(owner.expires, clock() + 30000);
  }
  async function save(token, baseRevision, document) {
    writable(token);
    if (!validate(document) || Buffer.byteLength(JSON.stringify(document)) > 500000) throw new TestSiteError("The proposed change contains unsupported content. Nothing was saved.");
    const current = await snapshot();
    if (current.revision !== baseRevision) throw new TestSiteError("Test has newer changes. Your draft has been preserved; export it before reloading.", 409);
    const revision = revisionOf(document);
    if (revision === current.revision) return current;
    const source = JSON.stringify(document, null, 2) + "\n";
    if (Buffer.byteLength(source, "utf8") > TEST_FILE_MAX_BYTES) throw new TestSiteError("Test's document is too large. The site was not changed.", 413);
    const output = checkedTestOutput(await render(document, revision));
    writable(token);
    const checked = await snapshot();
    if (checked.revision !== current.revision) throw new TestSiteError("Test changed while the preview was generated. The update was not saved.", 409);
    const oldOutput = await read("dist/index.html");
    await atomic(`.studio/history/${current.revision}.json`, JSON.stringify(current.document, null, 2));
    await atomic(`.studio/history/${revision}.json`, JSON.stringify(document, null, 2));
    writable(token);
    await atomic(".studio/state.json", JSON.stringify({ revision: current.revision, outputHash: hash(oldOutput), pending: { revision, outputHash: hash(output) } }));
    try {
      await atomic("content/site.json", source);
      await atomic("dist/index.html", output);
      await atomic(".studio/state.json", JSON.stringify({ revision, outputHash: hash(output) }));
    } catch {
      initialised = false;
      throw new TestSiteError("The save was interrupted. Reconnect to recover the saved source and preview; do not retry this update automatically.", 503);
    }
    await trimHistory();
    return { document, revision, previewRevision: revision };
  }
  return {
    close: () => { if (closing) return queue; closing = true; const next = queue.then(close); queue = next.catch(() => {}); return next; },
    connect: () => serial(async () => {
      const value = await snapshot();
      const token = randomBytes(32).toString("hex");
      sessions.set(token, { expires: clock() + 120000 });
      return { ...value, token };
    }),
    handle: (token, input) => serial(async () => {
      session(token);
      if (input.siteId !== "test") throw new TestSiteError("Unknown site.");
      if (input.action === "claim") {
        if (owner && owner.expires >= clock() && owner.token !== token) throw new TestSiteError("Test is already being edited in another session.", 423);
        owner = { token, expires: clock() + 30000 };
        return snapshot();
      }
      if (input.action === "read") {
        if (owner?.token === token) {
          if (owner.expires < clock()) throw new TestSiteError("Test's editing lease expired. Reconnect before editing.", 423);
          owner.expires = Math.max(owner.expires, clock() + 30000);
        }
        return snapshot();
      }
      if (input.action === "release") { if (owner?.token === token) owner = undefined; return { released: true }; }
      if (input.action === "save") return save(token, input.baseRevision, input.document);
      throw new TestSiteError("Unknown Test operation.");
    }),
    assertPrompt: (token, baseRevision) => serial(async () => { writable(token); const current = await snapshot(); if (current.revision !== baseRevision) throw new TestSiteError("Save your changes before submitting a prompt.", 409);
      sessions.get(token).expires = Math.max(sessions.get(token).expires, clock() + 240000);
      owner.expires = Math.max(owner.expires, clock() + 240000);
      return current; }),
  };
}
