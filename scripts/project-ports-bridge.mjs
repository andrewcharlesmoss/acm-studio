import net from "node:net";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isLocalStudioRequest } from "./codex-history-bridge.mjs";

const projectIDs = new Set(["acm-account", "acm-studio", "andrew-moss", "habit-tracker", "lid-angle", "loquafy", "loquage", "mini-golf-scorecard"]);

export function localServiceURL(template, port) {
  if (typeof template !== "string" || !Number.isInteger(port) || port < 1024 || port > 65535) return null;
  try {
    const url = new URL(template.replaceAll("{port}", String(port)));
    if (!["http:", "https:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      || url.username || url.password || url.search || url.hash || Number(url.port) !== port) return null;
    url.hostname = "localhost";
    return url.href;
  } catch { return null; }
}

// Project Ports owns discovery and lifecycle. Only approved website addresses
// leave this adapter; commands, environment, logs and filesystem paths stay private.
export function projectLocalLinks(snapshot) {
  if (!Array.isArray(snapshot?.projects)) throw new Error("Invalid snapshot");
  return snapshot.projects.filter(entry => projectIDs.has(entry?.project?.id)).map(entry => {
    const services = Array.isArray(entry.project.services) ? entry.project.services : [];
    const runtimes = Array.isArray(entry.services) ? entry.services : [];
    const urls = [...new Set(services.flatMap(service => {
      const runtime = runtimes.find(item => item.serviceID === service.id);
      if (!["Running", "Externally running"].includes(runtime?.state)) return [];
      const url = localServiceURL(service.urlTemplate, runtime.actualPort);
      return url ? [url] : [];
    }))];
    // Read the agent's state rather than guessing from a saved URL template.
    const statuses = [
      ["Starting", "starting"], ["Stopping", "stopping"], ["Failed", "failed"],
      ["Port conflict", "conflict"], ["Needs review", "review"], ["Stopped", "stopped"],
    ];
    const webRuntimes = services.filter(service => typeof service.urlTemplate === "string")
      .map(service => runtimes.find(item => item.serviceID === service.id));
    const inactiveStatus = statuses.find(([state]) => webRuntimes.some(runtime => runtime?.state === state))?.[1];
    const status = urls.length === 1 ? "running" : urls.length > 1 ? "multiple"
      : webRuntimes.some(runtime => ["Running", "Externally running"].includes(runtime?.state)) ? "unavailable"
        : inactiveStatus ?? "unconfigured";
    return { id: entry.project.id, status, ...(urls.length === 1 ? { href: urls[0] } : {}) };
  });
}

export function readProjectPorts({ socketPath = path.join(os.homedir(), "Library/Application Support/Project Ports/agent.sock"), timeout = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const socket = net.createConnection(socketPath);
    const chunks = [];
    let bytes = 0;
    const timer = setTimeout(() => finish(new Error("Agent unavailable")), timeout);
    function finish(error, value) {
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error); else resolve(value);
    }
    socket.on("connect", () => socket.write(`${JSON.stringify({ id, action: "snapshot", confirmed: false })}\n`));
    socket.on("error", () => finish(new Error("Agent unavailable")));
    socket.on("end", () => finish(new Error("Incomplete snapshot")));
    socket.on("data", chunk => {
      bytes += chunk.length;
      if (bytes > 2 * 1024 * 1024) return finish(new Error("Snapshot too large"));
      chunks.push(chunk);
      if (!chunk.includes(10)) return;
      try {
        const response = JSON.parse(Buffer.concat(chunks).toString("utf8").split("\n")[0]);
        if (response.requestID?.toLowerCase() !== id || response.success !== true) throw new Error("Invalid response");
        finish(null, projectLocalLinks(response.snapshot));
      } catch { finish(new Error("Invalid snapshot")); }
    });
  });
}

export function projectPortsBridge() {
  return {
    name: "studio-project-ports", apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split("?")[0] !== "/__studio/local-projects") return next();
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        const address = server.httpServer?.address();
        const origin = typeof address === "object" && address ? `http://localhost:${address.port}` : null;
        if (!origin || request.method !== "POST" || !isLocalStudioRequest(request, origin)) {
          response.statusCode = 403; response.end(JSON.stringify({ available: false })); return;
        }
        request.resume();
        try { response.end(JSON.stringify({ available: true, projects: await readProjectPorts() })); }
        catch { response.end(JSON.stringify({ available: false, projects: [] })); }
      });
    },
  };
}
