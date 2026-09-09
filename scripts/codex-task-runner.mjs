import path from "node:path";

// Only newly created Studio tasks are writable. Historic desktop conversations
// are never resumed into a second process. The handover is explicit, not an OS lock.
export function createTaskRunner({ client, projectPath }) {
  const tasks = new Map();
  const approvals = new Map();
  let busy = false;
  let active = null;
  const bounded = (value) => String(value ?? "").slice(0, 100000);
  const instructions = "You are working through ACM Studio in the Mini Golf Scorecard local project. This request is LOCAL ONLY: do not commit, tag, push, deploy, publish, or change hosted state, even if project instructions normally prescribe automatic releases. Preserve unrelated work. Do not change other projects. Use the existing checkout and branch; do not switch branches. Ask before destructive work. Keep secrets out of responses. Follow the project's review and verification instructions. Studio owns this new task; never resume another desktop task.";
  function state() {
    return { busy, active, tasks: [...tasks.values()].map((task) => ({ ...task, items: [...task.items.values()] })), approvals: [...approvals.values()] };
  }
  function receive(message) {
    const params = message.params ?? {};
    const task = tasks.get(params.threadId ?? params.thread?.id);
    if (!task) return false;
    if (message.id !== undefined) {
      const supported = ["item/commandExecution/requestApproval", "item/fileChange/requestApproval", "item/tool/requestUserInput"].includes(message.method);
      const withinRoot = !params.grantRoot || path.resolve(params.grantRoot) === projectPath;
      const localCommand = !params.cwd || path.resolve(params.cwd) === projectPath || path.resolve(params.cwd).startsWith(`${projectPath}${path.sep}`);
      if (!supported || !withinRoot || !localCommand || params.additionalPermissions || params.networkApprovalContext) return false;
      approvals.set(String(message.id), { id: String(message.id), rpcId: message.id, threadId: task.id, method: message.method, reason: bounded(params.reason), command: bounded(params.command), questions: params.questions ?? [] });
      task.status = "Awaiting approval";
      return true;
    }
    if (message.method === "turn/started") { task.turnId = params.turn.id; task.status = "Working"; }
    if (message.method === "turn/completed") {
      task.status = params.turn.status === "completed" ? "Complete" : params.turn.status === "interrupted" ? "Stopped" : "Failed";
      task.error = bounded(params.turn.error?.message);
      busy = false; active = null;
      for (const [id, approval] of approvals) if (approval.threadId === task.id) approvals.delete(id);
    }
    if (message.method === "item/started" || message.method === "item/completed") {
      const item = params.item;
      if (item.type === "agentMessage") task.items.set(item.id, { id: item.id, type: "assistant", text: bounded(item.text) });
      if (item.type === "commandExecution") task.items.set(item.id, { id: item.id, type: "command", text: bounded(item.command), output: bounded(item.aggregatedOutput), status: item.status });
      if (item.type === "fileChange") task.items.set(item.id, { id: item.id, type: "changes", text: (item.changes ?? []).map((change) => `${change.path}\n${change.diff ?? ""}`).join("\n").slice(0, 100000), status: item.status });
    }
    if (message.method === "item/agentMessage/delta") {
      const previous = task.items.get(params.itemId);
      task.items.set(params.itemId, { id: params.itemId, type: "assistant", text: bounded((previous?.text ?? "") + params.delta) });
    }
    if (message.method === "serverRequest/resolved") approvals.delete(String(params.requestId));
    return true;
  }
  async function submit({ threadId, prompt, handover }) {
    if (handover !== true) throw new Error("Confirm Mini Golf desktop coding is idle before handing this project to Studio.");
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 20000) throw new Error("Enter a coding request of up to 20,000 characters.");
    if (busy) throw new Error("A Mini Golf task is already running in Studio.");
    if (threadId && !tasks.has(threadId)) throw new Error("Desktop tasks are read-only here. Start a new Studio task.");
    busy = true;
    let task;
    let turnRequested = false;
    try {
      if (!threadId) {
        const result = await client.request("thread/start", { cwd: projectPath, sandbox: "workspaceWrite", approvalPolicy: "untrusted", approvalsReviewer: "user", developerInstructions: instructions, runtimeWorkspaceRoots: [projectPath] });
        threadId = result.thread.id;
        task = { id: threadId, name: prompt.trim().split("\n")[0].slice(0, 80), status: "Starting", items: new Map(), turnId: null, error: "" };
        tasks.set(threadId, task);
      } else task = tasks.get(threadId);
      active = threadId;
      task.status = "Working"; task.error = "";
      const itemId = `user-${Date.now()}`;
      task.items.set(itemId, { id: itemId, type: "user", text: prompt.trim() });
      turnRequested = true;
      const result = await client.request("turn/start", { threadId, cwd: projectPath, input: [{ type: "text", text: prompt.trim() }], approvalPolicy: "untrusted", approvalsReviewer: "user", runtimeWorkspaceRoots: [projectPath], sandboxPolicy: { type: "workspaceWrite", writableRoots: [projectPath], networkAccess: false, excludeSlashTmp: true, excludeTmpdirEnvVar: true } });
      task.turnId = result.turn.id;
      return { threadId };
    } catch (error) {
      // A lost turn/start response is not proof that execution did not begin.
      if (!turnRequested) { busy = false; active = null; }
      if (task) { task.status = turnRequested ? "Needs attention" : "Failed"; task.error = turnRequested ? "Turn delivery is uncertain. Stop the task or check Codex before more coding." : "The coding request could not start."; }
      throw error;
    }
  }
  return {
    state, receive, submit,
    async stop(threadId) {
      const task = tasks.get(threadId);
      if (!task || active !== threadId || !task.turnId) throw new Error("No running Studio turn to stop.");
      await client.request("turn/interrupt", { threadId, turnId: task.turnId });
      return state();
    },
    answer({ approvalId, decision, answers }) {
      const approval = approvals.get(approvalId);
      if (!approval || active !== approval.threadId) throw new Error("This approval is no longer pending.");
      if (approval.method === "item/tool/requestUserInput") {
        const validated = {};
        for (const question of approval.questions) {
          const answer = answers?.[question.id];
          if (typeof answer !== "string" || !answer.trim() || answer.length > 4000) throw new Error("Answer each question before continuing.");
          validated[question.id] = { answers: [answer] };
        }
        client.respond(approval.rpcId, { answers: validated });
      } else {
        if (!["accept", "decline"].includes(decision)) throw new Error("Invalid approval choice.");
        client.respond(approval.rpcId, { decision });
      }
      approvals.delete(approvalId); tasks.get(approval.threadId).status = "Working";
      return state();
    },
    disconnected() {
      if (active && tasks.has(active)) { tasks.get(active).status = "Disconnected"; tasks.get(active).error = "Connection lost. Check the project before starting more work."; }
      // Fail closed: never assume an uncertain turn stopped just because IPC failed.
      approvals.clear();
    },
  };
}
