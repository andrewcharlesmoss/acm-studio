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
  return { name: "studio-test-site", apply: "serve", configureServer(server) {
    const root = path.resolve(process.env.STUDIO_TEST_PATH ?? path.resolve(server.config.root, "../test"));
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
    server.httpServer?.once("close", () => { server.watcher.off("change", invalidateRenderer); void store.close(); });
    const store = createTestSiteStore({ root, validate: document => validation?.validTestSiteDocument(document) === true, render: async (document, revision) => (await load()).renderTestSite(document, revision) });
    let validation;
    const prompts = createTestPromptClient({ command: process.env.STUDIO_CODEX_BIN });
    const propose = createTestPromptGateway({ store, propose: (baseline, prompt) => prompts.propose(baseline, prompt), validate: document => validation?.validTestSiteDocument(document) === true });
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
        if (!input || input.siteId !== "test") throw new TestSiteError("Unknown site.");
        validation = await load();
        const token = request.headers["x-studio-test-token"];
        let result;
        if (input.action === "connect") result = await store.connect();
        else if (input.action === "prompt") result = await propose(token, input);
        else result = await store.handle(token, input);
        response.end(JSON.stringify(result));
      } catch (error) {
        response.statusCode = error instanceof TestSiteError ? error.status : 503;
        response.end(JSON.stringify({ error: error instanceof TestSiteError ? error.message : "Test's local connection failed. Your draft and site files have been preserved." }));
      }
    });
  } };
}
