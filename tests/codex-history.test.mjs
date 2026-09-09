import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { createHistoryClient, isLocalStudioRequest, readableTurns } from "../scripts/codex-history-bridge.mjs";

test("history endpoint requires the exact local origin and custom request header", () => {
  const request = { socket: { remoteAddress: "127.0.0.1" }, headers: { host: "localhost:3010", origin: "http://localhost:3010", "x-studio-client": "codex-history", "content-type": "application/json", "sec-fetch-site": "same-origin" } };
  assert.equal(isLocalStudioRequest(request, "http://localhost:3010"), true);
  for (const [key, value] of [["host", "evil.example:3010"], ["origin", "http://localhost:3000"], ["x-studio-client", ""], ["content-type", "text/plain"], ["sec-fetch-site", "cross-site"]]) {
    assert.equal(isLocalStudioRequest({ ...request, headers: { ...request.headers, [key]: value } }, "http://localhost:3010"), false);
  }
  assert.equal(isLocalStudioRequest({ ...request, socket: { remoteAddress: "192.168.1.3" } }, "http://localhost:3010"), false);
});

test("history client verifies project ownership and never resumes or starts tasks", async () => {
  const calls = [];
  const process = new EventEmitter();
  process.stdout = new EventEmitter();
  process.stdin = new EventEmitter();
  process.kill = () => process.emit("exit");
  process.stdin.write = (line) => {
    const message = JSON.parse(line); calls.push(message);
    if (!message.id) return;
    let result = {};
    if (message.method === "thread/list") result = { data: [{ id: "mine", name: "Mini Golf task", cwd: "/mini-golf" }, { id: "other", cwd: "/other" }], nextCursor: null };
    if (message.method === "thread/read") result = { thread: { id: message.params.threadId, cwd: message.params.threadId === "mine" ? "/mini-golf" : "/other", historyMode: "paginated" } };
    if (message.method === "thread/turns/list") result = { data: [], nextCursor: null };
    queueMicrotask(() => process.stdout.emit("data", `${JSON.stringify({ id: message.id, result })}\n`));
  };
  const client = createHistoryClient({ projectPath: "/mini-golf", spawnProcess: () => process });
  assert.equal((await client.list({})).tasks.length, 1);
  await assert.rejects(client.read({ threadId: "other" }), /does not belong/);
  await client.read({ threadId: "mine" });
  assert.equal(calls.some((call) => /resume|start/.test(call.method)), false);
  assert.equal(calls.find((call) => call.method === "thread/list").params.useStateDbOnly, true);
  client.close();
});

test("history output contains escaped-at-render text fields only, not raw tool data", () => {
  const result = readableTurns([{ id: "turn", items: [{ type: "userMessage", content: [{ type: "text", text: "<script>test</script>" }] }, { type: "agentMessage", text: "Reply" }, { type: "commandExecution", aggregatedOutput: "private tool data" }] }]);
  assert.equal(result[0].items.length, 2);
  assert.equal(result[0].items[0].text, "<script>test</script>");
  assert.equal(JSON.stringify(result).includes("private tool data"), false);
});
