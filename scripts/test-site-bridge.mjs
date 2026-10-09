import path from "node:path";
import { runnerImport } from "vite";
import { createTestSiteStore, TestSiteError } from "./test-site-store.mjs";
import { isLocalStudioRequest } from "./codex-history-bridge.mjs";
import { createTestPromptClient } from "./test-site-prompt.mjs";

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
    const stores = new Map(Object.entries(roots).map(([siteId, root]) => {
      const validate = document => document?.siteId === siteId && validation?.validTestSiteDocument(document) === true;
      const store = createTestSiteStore({ root, siteId, validate, render: async (document, revision) => (await load()).renderTestSite(document, revision) });
      const prompts = createTestPromptClient({ command: process.env.STUDIO_CODEX_BIN });
      const propose = createTestPromptGateway({ store, propose: (baseline, prompt) => prompts.propose(baseline, prompt), validate });
      return [siteId, { store, propose }];
    }));
    let closingStores;
    closeStores = () => {
      closingStores ??= (async () => {
        server.watcher.off("change", invalidateRenderer);
        const results = await Promise.allSettled([...stores.values()].map(({ store }) => store.close()));
        const failures = results.filter(result => result.status === "rejected").map(result => result.reason);
        if (failures.length) throw new AggregateError(failures, "Local fixture lock cleanup failed.");
      })();
      return closingStores;
    };
    server.httpServer?.once("close", () => {
      void closeStores().catch(() => server.config.logger.error("Local fixture lock cleanup failed. Review the writer locks before reconnecting."));
    });
    server.middlewares.use("/__studio/test-site", async (request, response) => {
      response.setHeader("Cache-Control", "no-store"); response.setHeader("Content-Type", "application/json"); response.setHeader("X-Content-Type-Options", "nosniff");
      const address = server.httpServer?.address();
      const origin = typeof address === "object" && address ? `http://localhost:${address.port}` : "";
      if (request.method !== "POST" || !origin || !isLocalStudioRequest(request, origin)) { response.statusCode = 403; response.end(JSON.stringify({ error: "Open Test in the local Studio." })); return; }
      try {
        const chunks = [];
        let byteLength = 0;
        for await (const chunk of request) { const bytes = Buffer.from(chunk); byteLength += bytes.length; if (byteLength > 550000) throw new TestSiteError("Test request is too large.", 413); chunks.push(bytes); }
        const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const fixture = input && stores.get(input.siteId);
        if (!fixture) throw new TestSiteError("Unknown site.");
        const { store, propose } = fixture;
        validation = await load();
        const token = request.headers["x-studio-test-token"];
        let result;
        if (input.action === "connect") result = await store.connect();
        else if (input.action === "prompt") result = await propose(token, input);
        else result = await store.handle(token, input);
        response.end(JSON.stringify(result));
      } catch (error) {
        response.statusCode = error instanceof TestSiteError ? error.status : 503;
        response.end(JSON.stringify({ error: error instanceof TestSiteError ? error.message : "Test's local connection failed. Your draft and site files have been preserved.", ...(error instanceof TestSiteError && error.code ? { code: error.code } : {}) }));
      }
    });
  } };
}
