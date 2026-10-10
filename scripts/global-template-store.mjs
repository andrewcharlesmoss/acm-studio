import { readFile, writeFile, rename, lstat, mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { acquireTestFileGuard, revisionOf, TestSiteError, TEST_FILE_MAX_BYTES } from "./test-site-store.mjs";

/** One fixed Studio-owned source, serial CAS saves, and recoverable previous revisions. */
export function createGlobalTemplateStore({ root, loadContracts, readSites }) {
  let queue = Promise.resolve();
  let guard;
  let closed = false;
  const source = path.join(root, "work/global-template-library.json");
  async function safeDirectory(relative) {
    if (await realpath(root) !== path.resolve(root)) throw new TestSiteError("Use Studio's canonical project directory.", 503);
    let current = root;
    for (const segment of relative.split("/")) {
      current = path.join(current, segment);
      try { await mkdir(current); } catch (error) { if (error.code !== "EEXIST") throw error; }
      const entry = await lstat(current);
      if (!entry.isDirectory() || entry.isSymbolicLink()) throw new TestSiteError("The global template recovery path is unsafe.", 503);
    }
    return current;
  }
  async function checkedRead(file) {
    const entry = await lstat(file);
    if (!entry.isFile() || entry.isSymbolicLink() || entry.size > TEST_FILE_MAX_BYTES) throw new TestSiteError("The global template source is unsafe or too large.", 503);
    return readFile(file, "utf8");
  }
  async function replace(file, content) {
    try { await checkedRead(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const temporary = `${file}.${randomBytes(12).toString("hex")}.tmp`;
    await writeFile(temporary, content, { flag: "wx", mode: 0o600 });
    try { await checkedRead(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
    await rename(temporary, file);
  }
  async function snapshot(initialise = false, assertWriter) {
    if (initialise) { guard ??= await acquireTestFileGuard(root); await safeDirectory("work"); }
    const contracts = await loadContracts();
    let raw;
    try { raw = await checkedRead(source); } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const initial = contracts.createGlobalTemplateLibrary(await readSites());
      if (!initialise) return { library: initial, revision: revisionOf(initial), initialised: false };
      await assertWriter?.();
      await writeFile(source, JSON.stringify(initial, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      raw = await checkedRead(source);
    }
    let library;
    try { library = contracts.validateGlobalTemplateLibrary(JSON.parse(raw)); }
    catch { throw new TestSiteError("The global template library is invalid. Its source was preserved.", 503); }
    return { library, revision: revisionOf(library), initialised: true };
  }
  function serial(operation) {
    if (closed) return Promise.reject(new TestSiteError("The global template service closed.", 503));
    const next = queue.then(operation); queue = next.catch(() => {}); return next;
  }
  return {
    load: (initialise = false, assertWriter) => serial(() => snapshot(initialise, assertWriter)),
    save: (revision, templates, assertWriter) => serial(async () => {
      const current = await snapshot();
      if (!current.initialised) throw new TestSiteError("The owning Studio tab must initialise global templates before saving.", 423);
      guard ??= await acquireTestFileGuard(root);
      if (current.revision !== revision) throw new TestSiteError("Global templates have newer changes. Your draft was preserved. Reload before saving.", 409);
      const contracts = await loadContracts();
      let library;
      try { library = contracts.validateGlobalTemplateLibrary({ ...current.library, templates }); }
      catch { throw new TestSiteError("The global template change is invalid. Nothing was saved."); }
      // Removal remains unavailable until live and recovery reference removal has a complete contract.
      if (current.library.templates.sets.some(set => !library.templates.sets.some(next => next.id === set.id))) throw new TestSiteError("Global library removal is unavailable while site and recovery references are retained.");
      for (const set of current.library.templates.sets) {
        const next = library.templates.sets.find(item => item.id === set.id);
        if ([...set.templates, ...set.parts].some(entry => ![...next.templates, ...next.parts].some(item => item.id === entry.id))) throw new TestSiteError("Global original removal is unavailable while site and recovery references are retained. Its source was kept.");
      }
      const raw = JSON.stringify(library, null, 2) + "\n";
      if (Buffer.byteLength(raw) > TEST_FILE_MAX_BYTES) throw new TestSiteError("The global template library is too large.", 413);
      const latest = await snapshot();
      if (latest.revision !== current.revision) throw new TestSiteError("Global templates changed during saving. The draft was kept.", 409);
      const history = await safeDirectory(".studio/global-template-history");
      const previous = path.join(history, `${current.revision}.json`);
      try { await writeFile(previous, JSON.stringify(current.library, null, 2) + "\n", { flag: "wx", mode: 0o600 }); } catch (error) { if (error.code !== "EEXIST") throw error; }
      await assertWriter();
      await replace(source, raw);
      return snapshot();
    }),
    close: async () => { closed = true; await queue; if (guard) { await guard(); guard = null; } },
  };
}
