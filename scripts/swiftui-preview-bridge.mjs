import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import { isLocalStudioRequest } from "./codex-history-bridge.mjs";

const executable = fileURLToPath(new URL("../native/ACMReorderPreview/.build/ACMReorderPreview.app/Contents/MacOS/ACMReorderPreview", import.meta.url));

// Only the local Studio page may launch the one prebuilt native example.
export function swiftUIPreviewBridge({ launch = spawn, platform = process.platform, canExecute = () => access(executable, constants.X_OK) } = {}) {
  let child = null;
  let starting = false;
  return {
    name: "studio-swiftui-preview", apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split("?")[0] !== "/__studio/swiftui-reorder-preview") return next();
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        const address = server.httpServer?.address();
        const origin = typeof address === "object" && address ? `http://localhost:${address.port}` : null;
        if (!origin || request.method !== "POST" || !isLocalStudioRequest(request, origin)) {
          response.statusCode = 403; response.end(JSON.stringify({ ok: false })); return;
        }
        let size = 0;
        try {
          for await (const chunk of request) {
            size += chunk.length;
            if (size > 64) { response.statusCode = 413; response.end(JSON.stringify({ ok: false })); request.resume(); return; }
          }
        } catch { response.statusCode = 400; response.end(JSON.stringify({ ok: false })); return; }
        if (platform !== "darwin") { response.statusCode = 503; response.end(JSON.stringify({ ok: false })); return; }
        if (child || starting) { response.statusCode = 409; response.end(JSON.stringify({ ok: false, reason: "already-open" })); return; }
        starting = true;
        try {
          await canExecute();
          child = launch(executable, [], { shell: false, stdio: "ignore", env: { PATH: "/usr/bin:/bin:/usr/sbin:/sbin" } });
          const current = child;
          current.once("exit", () => { if (child === current) child = null; });
          await new Promise((resolve, reject) => { current.once("spawn", resolve); current.once("error", reject); });
          response.end(JSON.stringify({ ok: true }));
        } catch {
          child = null; response.statusCode = 503; response.end(JSON.stringify({ ok: false }));
        } finally { starting = false; }
      });
    },
  };
}
