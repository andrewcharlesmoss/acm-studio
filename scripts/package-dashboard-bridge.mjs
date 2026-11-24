import path from "node:path";
import { isLocalStudioRequest } from "./codex-history-bridge.mjs";
import { readPackageDashboard } from "./package-dashboard-source.mjs";
import { createPackageVersionChanges, PackageChangeError } from "./package-version-change.mjs";

async function readChangeRequest(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size <= 2048) chunks.push(chunk);
    else throw new PackageChangeError(413, "The package request is too large.");
  }
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { /* Invalid JSON. */ }
  if (data?.action === "versions" && typeof data.packageId === "string") return data;
  if (data?.action === "review" && typeof data.packageId === "string" && typeof data.version === "string") return data;
  if (data?.action === "apply" && typeof data.reviewId === "string") return data;
  throw new PackageChangeError(400, "Choose a valid package version action.");
}

export function packageDashboardBridge({ read = readPackageDashboard, change = createPackageVersionChanges() } = {}) {
  return {
    name: "studio-package-dashboard",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__studio/package-version", async (request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        const address = server.httpServer?.address();
        const origin = typeof address === "object" && address ? `http://localhost:${address.port}` : null;
        if (!origin || request.method !== "POST" || !isLocalStudioRequest(request, origin, "package-dashboard")) {
          response.statusCode = 403;
          response.end(JSON.stringify({ error: "Open the Packages dashboard in local Studio." }));
          return;
        }
        try {
          const data = await readChangeRequest(request);
          const result = await change(server.config.root, process.env.STUDIO_PACKAGES_READ_TOKEN, data);
          response.end(JSON.stringify(result));
        } catch (error) {
          response.statusCode = error instanceof PackageChangeError ? error.status : 503;
          response.end(JSON.stringify({ error: error instanceof PackageChangeError ? error.message : "Studio couldn’t complete the package request. Try again." }));
        }
      });
      server.middlewares.use("/__studio/packages", async (request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        const address = server.httpServer?.address();
        const origin = typeof address === "object" && address ? `http://localhost:${address.port}` : null;
        if (!origin || request.method !== "POST" || !isLocalStudioRequest(request, origin, "package-dashboard")) {
          response.statusCode = 403;
          response.end(JSON.stringify({ available: false }));
          return;
        }

        request.resume();
        try {
          const snapshot = await read({
            workspace: process.env.STUDIO_PACKAGES_WORKSPACE || path.dirname(server.config.root),
            studio: server.config.root,
            token: process.env.STUDIO_PACKAGES_READ_TOKEN,
          });
          response.end(JSON.stringify(snapshot));
        } catch {
          response.statusCode = 503;
          response.end(JSON.stringify({ available: false }));
        }
      });
    },
  };
}
