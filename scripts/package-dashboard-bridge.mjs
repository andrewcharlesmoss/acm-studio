import path from "node:path";
import { isLocalStudioRequest } from "./codex-history-bridge.mjs";
import { readPackageDashboard } from "./package-dashboard-source.mjs";

export function packageDashboardBridge({ read = readPackageDashboard } = {}) {
  return {
    name: "studio-package-dashboard",
    apply: "serve",
    configureServer(server) {
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
