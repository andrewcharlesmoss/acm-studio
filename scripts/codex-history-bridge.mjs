import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { realpathSync } from "node:fs";
import path from "node:path";
import { createTaskRunner } from "./codex-task-runner.mjs";

// Dev-only adapter. No raw RPC, credentials or transcript files are exposed
// through the public build. Coding requires an explicit local server opt-in.
export function isLocalStudioRequest(request, origin) {
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress)
    && request.headers.host === new URL(origin).host
    && request.headers.origin === origin
    && request.headers["x-studio-client"] === "codex-history"
    && request.headers["content-type"] === "application/json"
    && (!request.headers["sec-fetch-site"] || request.headers["sec-fetch-site"] === "same-origin");
}

export function taskSummary(thread) {
  return { id: thread.id, name: thread.name || "Untitled task", updatedAt: thread.updatedAt };
}

export function readableTurns(turns) {
  return turns.map((turn) => ({ id: turn.id, items: (turn.items ?? []).flatMap((item) => {
    if (item.type === "userMessage") return [{ role: "user", text: (item.content ?? []).filter((part) => part.type === "text").map((part) => part.text).join("\n").slice(0, 50000) }];
    if (item.type === "agentMessage") return [{ role: "assistant", text: (item.text ?? "").slice(0, 50000) }];
    return [];
  }) }));
}

export function createHistoryClient({ command = "codex", projectPath, spawnProcess = spawn, onMessage = () => false, onDisconnect = () => {} }) {
  let child;
  let ready;
  let serial = 0;
  let buffer = "";
  const pending = new Map();
  function fail() {
    onDisconnect();
    ready = undefined;
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error("Local Codex connection closed.")); }
    pending.clear();
    child = undefined;
  }
  function rpc(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++serial;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error("Local Codex request timed out.")); }, 15000);
      pending.set(id, { resolve, reject, timer });
      child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    });
  }
  async function connect() {
    if (!ready) {
      child = spawnProcess(command, ["app-server", "--stdio"], { stdio: ["pipe", "pipe", "ignore"] });
      const connection = child;
      buffer = "";
      const closed = () => { if (child === connection) fail(); };
      child.on("error", closed);
      child.on("exit", closed);
      child.stdin.on("error", closed);
      child.stdout.on("data", (chunk) => {
        if (child !== connection) return;
        buffer += chunk;
        if (buffer.length > 16 * 1024 * 1024) { child.kill(); return; }
        let end;
        while ((end = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
          let message;
          try { message = JSON.parse(line); } catch { continue; }
          const item = pending.get(message.id);
          if (item && !message.method) {
            pending.delete(message.id); clearTimeout(item.timer);
            if (message.error) item.reject(new Error("Codex could not read this task history."));
            else item.resolve(message.result);
          } else if (message.method && !onMessage(message) && message.id !== undefined) {
            child.stdin.write(`${JSON.stringify({ id: message.id, error: { code: -32601, message: "Read-only history connection" } })}\n`);
          }
        }
      });
      ready = rpc("initialize", { clientInfo: { name: "acm_studio_history", version: "0.1.0" }, capabilities: { experimentalApi: true } }).then(() => {
        child.stdin.write(`${JSON.stringify({ method: "initialized" })}\n`);
      }).catch((error) => {
        connection.kill();
        if (child === connection) fail();
        throw error;
      });
    }
    await ready;
  }
  return {
    async request(method, params) { await connect(); return rpc(method, params); },
    respond(id, result) { if (!child) throw new Error("Local Codex is disconnected."); child.stdin.write(`${JSON.stringify({ id, result })}\n`); },
    async list({ cursor = null, archived = false }) {
      await connect();
      const result = await rpc("thread/list", { cwd: projectPath, limit: 30, cursor, archived, sourceKinds: ["appServer", "cli", "vscode", "unknown"], useStateDbOnly: true, sortKey: "updated_at" });
      return { tasks: result.data.filter((thread) => thread.cwd === projectPath).map(taskSummary), nextCursor: result.nextCursor };
    },
    async read({ threadId, cursor = null }) {
      await connect();
      const { thread } = await rpc("thread/read", { threadId, includeTurns: false });
      if (thread.cwd !== projectPath) throw new Error("This task does not belong to Mini Golf.");
      if (thread.historyMode === "paginated") {
        const result = await rpc("thread/turns/list", { threadId, cursor, limit: 10, sortDirection: "desc", itemsView: "full" });
        return { task: taskSummary(thread), turns: readableTurns([...result.data].reverse()), nextCursor: result.nextCursor };
      }
      const result = await rpc("thread/read", { threadId, includeTurns: true });
      return { task: taskSummary(thread), turns: readableTurns(result.thread.turns ?? []), nextCursor: null };
    },
    close() { child?.kill(); },
  };
}

export function codexHistoryBridge() {
  return { name: "studio-local-codex-history", apply: "serve", configureServer(server) {
    const token = randomBytes(32).toString("hex");
    let projectPath;
    try { projectPath = realpathSync(process.env.STUDIO_MINI_GOLF_PATH ?? path.resolve(server.config.root, "../mini-golf-scorecard")); } catch { /* Optional local integration; do not break the editor elsewhere. */ }
    let runner;
    const client = createHistoryClient({ projectPath, command: process.env.STUDIO_CODEX_BIN ?? "codex", onMessage: (message) => runner?.receive(message) ?? false, onDisconnect: () => runner?.disconnected() });
    runner = createTaskRunner({ client, projectPath });
    server.httpServer?.once("close", () => client.close());
    server.middlewares.use("/__studio/codex", async (request, response) => {
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Content-Type", "application/json");
      response.setHeader("X-Content-Type-Options", "nosniff");
      const port = server.httpServer?.address()?.port;
      if (request.method !== "POST" || !isLocalStudioRequest(request, `http://localhost:${port}`)) {
        response.statusCode = 403; response.end(JSON.stringify({ error: "Local Studio requests only." })); return;
      }
      try {
        if (!projectPath) throw new Error("The local Mini Golf project is not configured on this workstation.");
        let raw = "";
        for await (const chunk of request) { raw += chunk; if (raw.length > 40000) throw new Error("Request too large."); }
        const body = JSON.parse(raw);
        // Writing stays unavailable until inherited tools and approval escalation
        // have an independently verified confinement boundary.
        if (body.action === "connect") { response.end(JSON.stringify({ token, writable: false })); return; }
        if (request.headers["x-studio-token"] !== token) { response.statusCode = 403; throw new Error("Reconnect to local Codex."); }
        if (body.cursor != null && (typeof body.cursor !== "string" || body.cursor.length > 2048)) throw new Error("Invalid history cursor.");
        let result;
        if (body.action === "list" && (body.archived === undefined || typeof body.archived === "boolean")) result = await client.list(body);
        else if (body.action === "read" && typeof body.threadId === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(body.threadId)) result = await client.read(body);
        else if (body.action === "state") result = runner.state();
        else if (body.action === "submit") throw new Error("Coding is unavailable while the local execution safety boundary is being verified.");
        else if (body.action === "stop") result = await runner.stop(body.threadId);
        else if (body.action === "answer") result = runner.answer(body);
        else throw new Error("Unsupported history request.");
        response.end(JSON.stringify(result));
      } catch (error) {
        response.statusCode = response.statusCode === 403 ? 403 : 400;
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Local Codex is unavailable." }));
      }
    });
  } };
}
