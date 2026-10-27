import { checkedSiteImages, checkedSavedSiteImage } from "./test-site-featured-images.mjs";
import { readFile, writeFile, rename, lstat, mkdir, realpath, link, unlink } from "node:fs/promises";
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
    if (initialise && JSON.parse(raw).version !== library.version) {
      const history = await safeDirectory(".studio/global-template-history");
      const previous = path.join(history, `${revisionOf(JSON.parse(raw))}.json`);
      try { await writeFile(previous, raw, { flag: "wx", mode: 0o600 }); } catch (error) { if (error.code !== "EEXIST") throw error; }
      await assertWriter?.();
      if (await checkedRead(source) !== raw) throw new TestSiteError("Global templates changed during migration. Reload before continuing.", 409);
      await replace(source, JSON.stringify(library, null, 2) + "\n");
      const readback = contracts.validateGlobalTemplateLibrary(JSON.parse(await checkedRead(source)));
      if (revisionOf(readback) !== revisionOf(library)) throw new TestSiteError("Global template migration readback failed. Reload originals.", 503);
    }
    return { library, revision: revisionOf(library), initialised: initialise || JSON.parse(raw).version === library.version, migrated: initialise && JSON.parse(raw).version !== library.version };
  }
  function serial(operation) {
    if (closed) return Promise.reject(new TestSiteError("The global template service closed.", 503));
    const next = queue.then(operation); queue = next.catch(() => {}); return next;
  }
  return {
    load: (initialise = false, assertWriter) => serial(() => snapshot(initialise, assertWriter)),
    save: (revision, templates, assertWriter, browserReferences, websiteDesignDefaults, designImages) => serial(async () => {
      const current = await snapshot();
      if (!current.initialised) throw new TestSiteError("The owning Studio tab must initialise global templates before saving.", 423);
      guard ??= await acquireTestFileGuard(root);
      if (current.revision !== revision) throw new TestSiteError("Global templates have newer changes. Your draft was preserved. Reload before saving.", 409);
      const contracts = await loadContracts();
      let library;
      try { library = contracts.validateGlobalTemplateLibrary({ ...current.library, version: 5, templates, ...(websiteDesignDefaults === undefined ? {} : { websiteDesignDefaults }) }); }
      catch { throw new TestSiteError("The global template change is invalid. Nothing was saved."); }
      try {
        const removed = current.library.templates.sets.some(set => !library.templates.sets.find(next => next.id === set.id) || [...set.templates, ...set.parts].some(entry => ![...library.templates.sets.find(next => next.id === set.id).templates, ...library.templates.sets.find(next => next.id === set.id).parts].some(item => item.id === entry.id)));
        if (contracts.assertGlobalTemplateRemoval) contracts.assertGlobalTemplateRemoval(current.library, library.templates, removed ? await readSites() : {}, browserReferences);
        else if (removed) throw new Error("Global removal requires current dependency validation.");
      } catch (error) { throw new TestSiteError(error.message); }
      const transfer = checkedSiteImages(library.websiteDesignDefaults, designImages);
      const media = await safeDirectory("work/global-design-media");
      for (const name of transfer.referenced) {
        const file = path.join(media, name);
        let bytes;
        try { const entry = await lstat(file); if (!entry.isFile() || entry.isSymbolicLink() || entry.size > 2 * 1024 * 1024) throw new Error("Unsafe design image."); bytes = await readFile(file); }
        catch (error) { if (error.code !== "ENOENT") throw error; bytes = transfer.images.get(name); }
        if (!bytes || !checkedSavedSiteImage(name, bytes)) throw new TestSiteError("A global design image is missing or invalid. Your settings were kept.");
        await assertWriter();
        const temporary = `${file}.${randomBytes(12).toString("hex")}.tmp`;
        try { await writeFile(temporary, bytes, { flag: "wx", mode: 0o644 }); try { await link(temporary, file); } catch(error) { if (error.code !== "EEXIST") throw error; } }
        finally { await unlink(temporary).catch(error => { if (error.code !== "ENOENT") throw error; }); }
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
    identityValues: () => serial(async () => {
      const current = await snapshot(); const sites = await readSites();
      const values = { global: current.library.websiteDesignDefaults?.identity ?? {title:"Site Title",tagline:"A short description of your site."} };
      for (const siteId of ["test","test2"]) {
        const site = sites[siteId];
        values[siteId] = site.websiteDesign?.identity ?? { title: site.templates.sets.find(set=>set.id === site.siteNavigation.setId)?.identity.name ?? siteId, tagline: "" };
      }
      return Object.fromEntries(Object.entries(values).map(([scope,identity])=>[scope,Object.fromEntries(Object.entries(identity).filter(([key])=>["title","tagline","hidden"].includes(key)))]));
    }),
    images: design => serial(async () => {
      const transfer = checkedSiteImages(design, []);
      await safeDirectory("work/global-design-media");
      const attachments = [];
      for (const name of transfer.referenced) {
        const file = path.join(root, "work/global-design-media", name);
        const entry = await lstat(file);
        if (!entry.isFile() || entry.isSymbolicLink() || entry.size > 2 * 1024 * 1024) throw new TestSiteError("Unsafe global design image.");
        const bytes = await readFile(file);
        if (!checkedSavedSiteImage(name, bytes)) throw new TestSiteError("Invalid global design image.");
        attachments.push({ name, dataBase64: bytes.toString("base64") });
      }
      return attachments;
    }),
    close: async () => { closed = true; await queue; if (guard) { await guard(); guard = null; } },
  };
}
