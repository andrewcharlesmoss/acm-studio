import { readFile } from "node:fs/promises";
import path from "node:path";
import { isLocalStudioRequest } from "./codex-history-bridge.mjs";
import { createSitesSettingsClient } from "./sites-settings-client.mjs";
import { createSettingsService } from "./site-settings-service.mjs";

const projectIds = new Set([
  "appgprj_6a806eb84b648191b3015d1b6b694c45",
  "appgprj_6a952fdb444c81918a35bc3fc6271c4a",
]);

// Explicit projection: never forward provider responses, values or access lists.
export function projectSettings(record) {
  if (!record || !projectIds.has(record.projectId)) throw new Error("Unknown site.");
  const url = new URL(record.url);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid site URL.");
  if (!Number.isFinite(Date.parse(record.capturedAt))) throw new Error("Invalid snapshot date.");
  const text = (value) => typeof value === "string" ? value.slice(0, 240) : "Unknown";
  return {
    projectId: record.projectId, title: text(record.title), url: url.href,
    status: text(record.status), capturedAt: record.capturedAt,
    sharing: ["Public", "Only visible to you", "Restricted access"].includes(record.sharing) ? record.sharing : "Unknown",
    domains: (record.domains ?? []).slice(0, 100).map((domain) => ({ hostname: text(domain.hostname), status: text(domain.status) })),
    variables: (record.variables ?? []).slice(0, 200).map((variable) => ({ key: text(variable.key), secret: variable.secret === true })),
    environmentRevision: Number.isSafeInteger(record.environmentRevision) ? record.environmentRevision : null,
  };
}

export function siteSettingsBridge() {
  return { name: "studio-site-settings", apply: "serve", configureServer(server) {
    const snapshotPath = path.join(server.config.root, "work/site-settings.json");
    const service = createSettingsService({ provider: createSitesSettingsClient({ cwd: server.config.root, command: process.env.STUDIO_CODEX_BIN ?? "codex" }) });
    server.httpServer?.once?.("close", () => service.close());
    server.middlewares.use("/__studio/site-settings", async (request, response) => {
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Content-Type", "application/json");
      response.setHeader("X-Content-Type-Options", "nosniff");
      const address = server.httpServer?.address();
      const origin = typeof address === "object" && address ? `http://localhost:${address.port}` : "";
      if (request.method !== "POST" || !origin || !isLocalStudioRequest(request, origin)) {
        response.statusCode = 403; response.end(JSON.stringify({ error: "Open Site Settings in the local Studio." })); return;
      }
      if (request.headers["content-length"] !== "0" && request[Symbol.asyncIterator]) {
        try {
          let raw = "";
          for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw) > 24000) throw new Error("Settings request is too large."); }
          if (raw) {
            const input = JSON.parse(raw);
            if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid settings request.");
            const result = input.action === "connect" ? service.connect() : await service.handle(request.headers["x-studio-settings-token"], input);
            response.end(JSON.stringify(result)); return;
          }
        } catch (error) {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: error instanceof SyntaxError ? "Invalid settings request." : error instanceof Error ? error.message : "Settings could not be changed." })); return;
        }
      } else request.resume();
      try {
        const contents = await readFile(snapshotPath, "utf8");
        if (contents.length > 100000) throw new Error("Oversized snapshot.");
        const records = JSON.parse(contents);
        if (!Array.isArray(records) || records.length !== 2) throw new Error("Invalid snapshot.");
        const sites = records.map(projectSettings);
        if (new Set(sites.map((site) => site.projectId)).size !== 2) throw new Error("Duplicate site.");
        response.end(JSON.stringify({ sites }));
      } catch {
        response.statusCode = 503;
        response.end(JSON.stringify({ error: "No verified settings snapshot is available. Ask Codex to refresh the Sites details." }));
      }
    });
  } };
}
