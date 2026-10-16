import { createTemplateDependencyGate } from "./template-dependency-gate.mjs";
import { readFile, lstat, realpath } from "node:fs/promises";
import { createGlobalTemplateStore } from "./global-template-store.mjs";
import path from "node:path";
import { runnerImport } from "vite";
import { createTestSiteStore, TestSiteError } from "./test-site-store.mjs";
import { isLocalStudioRequest } from "./codex-history-bridge.mjs";
import { createTestPromptClient } from "./test-site-prompt.mjs";
import { parseSiteImageName, SITE_IMAGE_MAX_BYTES } from "../app/content/site-featured-image.mjs";
import { checkedSavedSiteImage } from "./test-site-featured-images.mjs";

export function createTestPromptGateway({ store, propose, validate }) {
  let busy = false;
  return async (token, input) => {
    if (busy) throw new TestSiteError("A Test prompt is already running.", 423);
    if (typeof input.prompt !== "string" || !input.prompt.trim() || input.prompt.length > 4000) throw new TestSiteError("Enter a prompt of up to 4,000 characters.");
    busy = true;
    try {
      const baseline = await store.assertPrompt(token, input.baseRevision);
      const proposal = await propose(baseline, input.prompt);
      if (proposal.baseRevision !== baseline.revision || !validate(proposal.document)) throw new TestSiteError("The prompt produced unsupported changes. The site was not changed.");
      return proposal;
    } finally { busy = false; }
  };
}

export function testSiteBridge() {
  let closeStores = async () => {};
  return { name: "studio-test-site", apply: "serve", async closeBundle() {
    // Vite awaits this hook on restart and shutdown. An HTTP close event alone
    // cannot keep the process alive until queued saves and guard cleanup finish.
    await closeStores();
  }, configureServer(server) {
    const roots = {
      test: path.resolve(process.env.STUDIO_TEST_PATH ?? path.resolve(server.config.root, "../test")),
      test2: path.resolve(process.env.STUDIO_TEST2_PATH ?? path.resolve(server.config.root, "../test2")),
    };
    if (roots.test === roots.test2) throw new Error("Local fixtures require distinct project roots.");
    let loaded;
    let rendererDependencies = new Set();
    const load = async () => {
      loaded ??= runnerImport(path.join(server.config.root, "app/studio/test-site/render.tsx"), { root: server.config.root, resolve: { dedupe: ["react", "react-dom"] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } }, esbuild: { jsx: "automatic" } }).then(result => {
        rendererDependencies = new Set([path.join(server.config.root, "app/studio/test-site/render.tsx"), ...result.dependencies]);
        server.watcher.add([...rendererDependencies]);
        return result.module;
      });
      return loaded;
    };
    const invalidateRenderer = file => { if (rendererDependencies.has(file)) loaded = undefined; };
    server.watcher.on("change", invalidateRenderer);
    let validation;
    let refreshedGlobalRevision;
    const dependencyGate = createTemplateDependencyGate();
    const globalTemplates = createGlobalTemplateStore({ root: server.config.root, loadContracts: load, readSites: async () => {
      const contracts = await load();
      const sites = {};
      for (const [siteId, root] of Object.entries(roots)) {
        if (await realpath(root) !== root) throw new TestSiteError("Use the fixture's canonical project path.", 503);
        const directory = await lstat(path.join(root, "content"));
        const file = path.join(root, "content/site.json");
        const entry = await lstat(file);
        if (!directory.isDirectory() || directory.isSymbolicLink() || !entry.isFile() || entry.isSymbolicLink() || entry.size > 1024 * 1024) throw new TestSiteError("Unsafe fixture template source.", 503);
        const value = JSON.parse(await readFile(file, "utf8"));
        if (!contracts.validTestSiteDocument(value) || value.siteId !== siteId) throw new TestSiteError("The fixture template source is invalid.", 503);
        sites[siteId] = contracts.testSiteCollection(value);
      }
      return sites;
    } });
    const stores = new Map(Object.entries(roots).map(([siteId, root]) => {
      const validate = document => document?.siteId === siteId && validation?.validTestSiteDocument(document) === true;
      const store = createTestSiteStore({ root, siteId, validate, documentsOf: document => validation.testSiteCollection(document).documents, render: async (document, revision) => {
        const global = await globalTemplates.load();
        return (await load()).renderTestSite(document, revision, undefined, global.library, global.revision);
      } });
      const prompts = createTestPromptClient({ command: process.env.STUDIO_CODEX_BIN });
      const propose = createTestPromptGateway({ store, propose: (baseline, prompt) => prompts.propose(baseline, prompt), validate });
      return [siteId, { store, propose }];
    }));
    let closingStores;
    closeStores = () => {
      closingStores ??= (async () => {
        server.watcher.off("change", invalidateRenderer);
        const results = await Promise.allSettled([...stores.values()].map(({ store }) => store.close()));
        await globalTemplates.close();
        const failures = results.filter(result => result.status === "rejected").map(result => result.reason);
        if (failures.length) throw new AggregateError(failures, "Local fixture lock cleanup failed.");
      })();
      return closingStores;
    };
    server.httpServer?.once("close", () => {
      void closeStores().catch(() => server.config.logger.error("Local fixture lock cleanup failed. Review the writer locks before reconnecting."));
    });
    server.middlewares.use("/__studio/site-media", async (request, response) => {
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("Cache-Control", "no-store");
      const address = server.httpServer?.address();
      const origin = typeof address === "object" && address ? `http://localhost:${address.port}` : "";
      const match = request.url?.match(/^\/(test|test2)\/([^/?]+)$/);
      const parsed = match && parseSiteImageName(match[2]);
      let refererOrigin;
      try { refererOrigin = new URL(request.headers.referer).origin; } catch { /* Reject absent or malformed origins. */ }
      if (request.method !== "GET" || !origin || request.headers.host !== new URL(origin).host || request.headers["sec-fetch-site"] !== "same-origin" || refererOrigin !== origin || !parsed) { response.statusCode = 403; response.end(); return; }
      try {
        const root = roots[match[1]];
        if (await realpath(root) !== root) throw new Error("Unsafe fixture path.");
        for (const relative of ["content", "content/media", `content/media/${parsed.name}`]) {
          const entry = await lstat(path.join(root, relative));
          if (entry.isSymbolicLink() || (relative === `content/media/${parsed.name}` ? !entry.isFile() || entry.size > SITE_IMAGE_MAX_BYTES : !entry.isDirectory())) throw new Error("Unsafe featured image path.");
        }
        const bytes = await readFile(path.join(root, "content/media", parsed.name));
        if (!checkedSavedSiteImage(parsed.name, bytes)) throw new Error("Invalid featured image.");
        response.setHeader("Content-Type", parsed.type); response.setHeader("Content-Length", bytes.length); response.end(bytes);
      } catch (error) { response.statusCode = error.code === "ENOENT" ? 404 : 503; response.end(); }
    });
    server.middlewares.use("/__studio/test-site", async (request, response) => {
      response.setHeader("Cache-Control", "no-store"); response.setHeader("Content-Type", "application/json"); response.setHeader("X-Content-Type-Options", "nosniff");
      const address = server.httpServer?.address();
      const origin = typeof address === "object" && address ? `http://localhost:${address.port}` : "";
      if (request.method !== "POST" || !origin || !isLocalStudioRequest(request, origin)) { response.statusCode = 403; response.end(JSON.stringify({ error: "Open Test in the local Studio." })); return; }
      try {
        const chunks = [];
        let byteLength = 0;
        for await (const chunk of request) { const bytes = Buffer.from(chunk); byteLength += bytes.length; if (byteLength > 8 * 1024 * 1024) throw new TestSiteError("Test request is too large.", 413); chunks.push(bytes); }
        const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const fixture = input && stores.get(input.siteId);
        if (!fixture) throw new TestSiteError("Unknown site.");
        const { store, propose } = fixture;
        validation = await load();
        const token = request.headers["x-studio-test-token"];
        const execute = async () => {
          let result;
          if (input.action === "global-read") {
            if (input.initialise === true) await store.assertWriter(token);
            const previous = await globalTemplates.load();
            result = input.initialise === true ? await globalTemplates.load(true, () => store.assertWriter(token)) : previous;
            if (input.initialise === true && result.initialised && (result.migrated || refreshedGlobalRevision !== result.revision)) {
              const refreshed = await Promise.allSettled([...stores.values()].map(item => item.store.refreshPreview()));
              result = { ...result, previewErrors: refreshed.map((item, index) => item.status === "rejected" ? [...stores.keys()][index] : null).filter(Boolean) };
              if (!result.previewErrors.length) refreshedGlobalRevision = result.revision;
            }
          }
          else if (input.action === "global-save") {
            await store.assertWriter(token);
            const before = await globalTemplates.load();
            const removed = before.library.templates.sets.some(set => [...set.templates, ...set.parts].some(entry => !input.templates?.sets?.find(next => next.id === set.id)?.[entry.kind === "page" || entry.kind === "post" ? "templates" : "parts"]?.some(item => item.id === entry.id)));
            // Hold both process guards before validating removal. Another Studio
            // process cannot save a fixture against a disappearing original.
            if (removed) for (const fixture of stores.values()) await fixture.store.readGuardedSnapshot();
            result = await globalTemplates.save(input.revision, input.templates, () => store.assertWriter(token), input.browserReferences);
            const refreshed = await Promise.allSettled([...stores.values()].map(item => item.store.refreshPreview()));
            result = { ...result, previewErrors: refreshed.map((item, index) => item.status === "rejected" ? [...stores.keys()][index] : null).filter(Boolean) };
            if (!result.previewErrors.length) refreshedGlobalRevision = result.revision;
          }
          else if (input.action === "connect") result = await store.connect();
          else if (input.action === "prompt") result = await propose(token, input);
          else {
            if (input.action === "save") {
              if (!validation.validTestSiteDocument(input.document) || input.document.siteId !== input.siteId) throw new TestSiteError("Invalid site content.");
              const global = await globalTemplates.load();
              const snapshot = validation.fixtureTemplateDependencySnapshot(input.document, global.library);
              validation.assertActiveGlobalReferences(global.library, validation.ownerTemplateReferences(snapshot), snapshot.bindings);
            }
            result = await store.handle(token, input);
          }
          return result;
        };
        const result = input.action === "save" || input.action === "global-save" || input.action === "global-read" && input.initialise === true ? await dependencyGate.run(execute) : await execute();
        response.end(JSON.stringify(result));
      } catch (error) {
        response.statusCode = error instanceof TestSiteError ? error.status : 503;
        response.end(JSON.stringify({ error: error instanceof TestSiteError ? error.message : "Test's local connection failed. Your draft and site files have been preserved.", ...(error instanceof TestSiteError && error.code ? { code: error.code } : {}) }));
      }
    });
  } };
}
