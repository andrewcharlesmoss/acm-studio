import { createHistoryClient } from "./codex-history-bridge.mjs";

const allowedTools = new Set([
  "sites.get_site", "sites.get_environment_variables", "sites.list_custom_domains",
  "sites.update_site_metadata", "sites.change_site_slug", "sites.update_site_access",
  "sites.update_environment_variables", "sites.add_custom_domain", "sites.remove_custom_domain",
]);

// This connection never starts a model turn. No shell, deployment or arbitrary
// tool calls are accepted. Account credentials remain owned by Codex.
export function createSitesSettingsClient({ cwd, command = "codex" }) {
  const client = createHistoryClient({ projectPath: cwd, command });
  let connection;
  return {
    async call(tool, args) {
      if (!allowedTools.has(tool)) throw new Error("Unsupported Sites operation.");
      connection ??= client.request("thread/start", { cwd, ephemeral: true, sandbox: "read-only", approvalPolicy: "never" });
      try {
        const { thread } = await connection;
        const result = await client.request("mcpServer/tool/call", { threadId: thread.id, server: "codex_apps", tool, arguments: args });
        if (result.isError) throw new Error("Sites rejected the request.");
        // Provider errors and raw text can contain submitted values. Never echo them.
        const data = result.structuredContent;
        if (!data || typeof data !== "object") throw new Error("Sites returned an unsupported response.");
        return data;
      } catch {
        // The caller never retries this operation. A later explicit read may
        // create a fresh ephemeral connection after startup or IPC failure.
        connection = undefined;
        throw new Error("Sites could not complete the request. Check the connection and current settings before retrying.");
      }
    },
    close() { client.close(); },
  };
}
