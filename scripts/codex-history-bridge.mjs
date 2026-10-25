import { spawn } from "node:child_process";

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
      if (thread.cwd !== projectPath) throw new Error("This task belongs to a different project.");
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
