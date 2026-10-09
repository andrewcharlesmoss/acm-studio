import { randomBytes } from "node:crypto";
import path from "node:path";
import { isLocalStudioRequest } from "./codex-history-bridge.mjs";
import { createSharedStylesStore, SharedStylesError } from "./shared-styles-store.mjs";

export function sharedStylesBridge({ createStore = createSharedStylesStore } = {}) {
  let sourceFiles = [];
  return { name: "studio-shared-styles", apply: "serve",
    hotUpdate(context) {
      // These files are loaded through the source gateway and explicit Reload.
      // Replacing their imports would remount the editor and lose its draft/history.
      if (sourceFiles.includes(context.file)) return [];
    },
    configureServer(server) {
    sourceFiles = [path.resolve(server.config.root, "../acm-styles/src/universal-style-preset.json"), path.resolve(server.config.root, "../workspace-governance/STYLE_GUIDE.md"), path.join(server.config.root, "app/studio/ui/styles/style-guide-source.json")];
    const store = createStore({ root: server.config.root });
    const sessions = new Map();
    server.middlewares.use("/__studio/shared-styles", async (request, response) => {
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Content-Type", "application/json");
      response.setHeader("X-Content-Type-Options", "nosniff");
      const address = server.httpServer?.address();
      const origin = typeof address === "object" && address ? `http://localhost:${address.port}` : "";
      try {
        if (request.method !== "POST" || !origin || !isLocalStudioRequest(request, origin)) throw new SharedStylesError("Open Styles in the local Studio to save shared values.", 403);
        let raw = "";
        for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw) > 24000) throw new SharedStylesError("The styles request is too large.", 413); }
        const input = JSON.parse(raw);
        if (input?.action === "load" && Object.keys(input).length === 1) {
          for (const [key, expires] of sessions) if (expires < Date.now()) sessions.delete(key);
          const state = await store.load();
          const existing = request.headers["x-studio-styles-token"];
          const token = sessions.has(existing) && sessions.get(existing) >= Date.now() ? existing : randomBytes(32).toString("hex");
          if (!sessions.has(token) && sessions.size >= 100) throw new SharedStylesError("Too many style editing sessions. Restart the local server.", 503);
          sessions.set(token, Date.now() + 30 * 60 * 1000);
          response.end(JSON.stringify({ ...state, token })); return;
        }
        const token = request.headers["x-studio-styles-token"];
        if (!sessions.has(token) || sessions.get(token) < Date.now()) throw new SharedStylesError("The style editing session expired. Reload Source before saving.", 403);
        if (input?.action !== "save" || Object.keys(input).sort().join(",") !== "action,preset,revision") throw new SharedStylesError("Invalid shared styles request.");
        const result = await store.save({ preset: input.preset, revision: input.revision });
        sessions.set(token, Date.now() + 30 * 60 * 1000);
        response.end(JSON.stringify({ ...result, token }));
      } catch (error) {
        response.statusCode = error instanceof SharedStylesError ? error.status : 503;
        response.end(JSON.stringify({ error: error instanceof SharedStylesError ? error.message : "Shared styles could not be loaded or saved. Your draft is preserved." }));
      }
    });
  } };
}
