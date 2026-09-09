import { createHash, randomBytes } from "node:crypto";

export const settingsProjectIds = new Set(["appgprj_6a806eb84b648191b3015d1b6b694c45", "appgprj_6a952fdb444c81918a35bc3fc6271c4a"]);
const token = () => randomBytes(24).toString("hex");
const validText = (value, max) => typeof value === "string" && value.length > 0 && value.length <= max && [...value].every((character) => character.charCodeAt(0) >= 32);

function view(site, environment, domains) {
  const policy = site.access_policy;
  const ownerOnly = site.current_user_role === "owner" && policy?.access_mode === "custom" && policy.allowed_account_user_ids?.length === 1 && policy.external_visitor_count === 0 && policy.allowed_workspace_group_ids?.length === 0 && policy.allowed_tenant_group_ids?.length === 0;
  const url = new URL(site.current_live_url ?? site.expected_url);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid Sites address.");
  return {
    projectId: site.id, title: site.title, slug: site.slug, url: url.href, status: site.status,
    capturedAt: new Date().toISOString(), writable: site.current_user_role === "owner",
    sharing: ownerOnly ? "Only visible to you" : policy?.access_mode === "public" ? "Public" : "Restricted access",
    accessMode: ownerOnly ? "private" : policy?.access_mode === "public" ? "public" : "restricted",
    availableAccessModes: site.available_access_modes ?? [],
    variables: environment.entries.map((item) => ({ key: item.key, secret: item.is_secret === true })),
    environmentRevision: environment.revision,
    domains: domains.items.map((item) => ({ id: item.id, hostname: item.hostname, status: item.status, cname: item.cname_target, addresses: item.apex_proxy_ipv4_targets, records: item.validation_records.map((record) => ({ type: record.record_type, name: record.name, value: record.value })) })),
  };
}

function operation(input, current) {
  const args = { project_id: current.projectId };
  if (input.kind === "name" && typeof input.value === "string" && validText(input.value.trim(), 120)) {
    return { tool: "sites.update_site_metadata", args: { ...args, title: input.value.trim() }, summary: `Change name from “${current.title}” to “${input.value.trim()}”.` };
  }
  if (input.kind === "slug" && typeof input.value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.value) && input.value.length <= 63) {
    return { tool: "sites.change_site_slug", args: { ...args, slug: input.value }, summary: `Change the URL label from “${current.slug}” to “${input.value}”. Existing links and sign-in redirects may stop working. Update linked services separately.` };
  }
  if (input.kind === "sharing" && ["public", "private"].includes(input.value)) {
    if (current.accessMode === "restricted") throw new Error("Manage this site's detailed access list in Sites to preserve existing grants.");
    const access_mode = input.value === "public" ? "public" : "custom";
    if (!current.availableAccessModes.includes(access_mode)) throw new Error("This sharing option is not available for this site.");
    return { tool: "sites.update_site_access", args: { ...args, access_mode, ...(input.value === "private" ? { allowed_user_emails: [], allowed_workspace_group_ids: [], allowed_tenant_group_ids: [] } : {}) }, summary: input.value === "public" ? "Make this site public. Anyone with its URL will be able to view it." : "Make this site visible only to you. Remove all other viewers and groups." };
  }
  if (["variable", "remove-variable"].includes(input.kind) && typeof input.key === "string" && /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(input.key)) {
    const existing = current.variables.find((item) => item.key === input.key);
    if (input.kind === "remove-variable") {
      if (!existing) throw new Error("This variable no longer exists.");
      return { tool: "sites.update_environment_variables", args: { ...args, set_values: [], remove: [input.key] }, summary: `Remove ${input.key}. Its old value cannot be recovered from Studio. A separate deployment is required to apply this change.` };
    }
    if (typeof input.value !== "string" || input.value.length > 16000 || typeof input.secret !== "boolean") throw new Error("Invalid variable value.");
    if (existing?.secret && !input.secret) throw new Error("Existing secrets cannot be converted to public values here.");
    return { tool: "sites.update_environment_variables", args: { ...args, set_values: [{ key: input.key, value: input.value, is_secret: input.secret }] }, summary: `${existing ? "Replace" : "Add"} ${input.key} as ${input.secret ? "a secret" : "a non-secret variable"}. ${existing ? "The old value cannot be recovered from Studio. " : ""}A separate deployment is required to apply this change.` };
  }
  if (input.kind === "add-domain" && typeof input.value === "string" && input.value.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(input.value)) {
    return { tool: "sites.add_custom_domain", args: { ...args, hostname: input.value }, summary: `Add ${input.value}. You must configure its DNS separately before it can serve this site.` };
  }
  if (input.kind === "remove-domain") {
    const domain = current.domains.find((item) => item.id === input.id);
    if (!domain) throw new Error("This domain no longer belongs to the selected site.");
    return { tool: "sites.remove_custom_domain", args: { ...args, custom_domain_id: domain.id }, summary: `Disconnect ${domain.hostname}. Visitors using that domain will lose access. DNS records are not removed.` };
  }
  throw new Error("Check the settings you entered.");
}

export function createSettingsService({ provider, now = Date.now }) {
  const sessions = new Map();
  const pending = new Map();
  let busy = false;
  let uncertain = false;
  const expire = () => {
    for (const [id, item] of pending) if (item.expires <= now()) pending.delete(id);
    for (const [id, expiry] of sessions) if (expiry <= now()) sessions.delete(id);
  };
  const timer = setInterval(expire, 10000); timer.unref?.();
  function authenticate(session) {
    expire();
    if (!sessions.has(session)) throw new Error("Reconnect to Sites before continuing.");
    sessions.set(session, now() + 30 * 60 * 1000);
  }
  async function read(projectId) {
    if (!settingsProjectIds.has(projectId)) throw new Error("Unknown site.");
    const args = { project_id: projectId };
    const site = await provider.call("sites.get_site", args);
    const environment = await provider.call("sites.get_environment_variables", args);
    const domains = await provider.call("sites.list_custom_domains", args);
    if (site.id !== projectId || environment.project_id !== projectId || domains.items.some((item) => item.project_id !== projectId)) throw new Error("Sites returned a different project.");
    const settings = view(site, environment, domains);
    const revision = createHash("sha256").update(JSON.stringify({ updatedAt: site.updated_at, slug: site.slug, title: site.title, policy: site.access_policy, environment: environment.revision, domains: domains.items })).digest("hex");
    return { settings, revision };
  }
  return {
    connect() { expire(); if (sessions.size >= 100) throw new Error("Too many connections. Try again later."); const session = token(); sessions.set(session, now() + 30 * 60 * 1000); return { session }; },
    async handle(session, input) {
      authenticate(session);
      if (input.action === "cancel") { for (const [id, item] of pending) if (item.session === session) pending.delete(id); return {}; }
      if (input.action === "read") return read(input.projectId);
      if (input.action === "prepare") {
        if (uncertain) throw new Error("A previous save has an uncertain outcome. Check Sites and restart the local Studio server before further changes.");
        if (busy) throw new Error("Another settings change is still running.");
        const { settings, revision } = await read(input.projectId);
        if (!settings.writable) throw new Error("Only the site owner can change these settings.");
        if (input.revision !== revision) throw new Error("Settings have changed. Refresh before editing again.");
        const change = operation(input.change ?? {}, settings);
        for (const [id, item] of pending) if (item.session === session) pending.delete(id);
        const confirmation = token();
        pending.set(confirmation, { session, projectId: input.projectId, revision, change, expires: now() + 5 * 60 * 1000 });
        return { confirmation, title: settings.title, summary: change.summary };
      }
      if (input.action === "confirm") {
        if (uncertain) throw new Error("A previous save has an uncertain outcome. Check Sites and restart the local Studio server before further changes.");
        if (input.confirmed !== true) throw new Error("Confirm that this changes the hosted site.");
        const item = pending.get(input.confirmation);
        if (!item || item.session !== session) throw new Error("This confirmation has expired or was already used.");
        if (busy) throw new Error("Another settings change is still running.");
        pending.delete(input.confirmation); busy = true;
        let dispatched = false;
        try {
          const fresh = await read(item.projectId);
          if (!fresh.settings.writable || fresh.revision !== item.revision) throw new Error("Settings changed before saving. Refresh and review again.");
          dispatched = true;
          await provider.call(item.change.tool, item.change.args);
          const result = await read(item.projectId);
          const saved = result.settings;
          const args = item.change.args;
          const verified = item.change.tool === "sites.update_site_metadata" ? saved.title === args.title
            : item.change.tool === "sites.change_site_slug" ? saved.slug === args.slug
            : item.change.tool === "sites.update_site_access" ? saved.accessMode === (args.access_mode === "public" ? "public" : "private")
            : item.change.tool === "sites.add_custom_domain" ? saved.domains.some((domain) => domain.hostname === args.hostname)
            : item.change.tool === "sites.remove_custom_domain" ? !saved.domains.some((domain) => domain.id === args.custom_domain_id)
            : saved.environmentRevision > fresh.settings.environmentRevision
              && (args.remove ?? []).every((key) => !saved.variables.some((variable) => variable.key === key))
              && args.set_values.every((entry) => saved.variables.some((variable) => variable.key === entry.key && variable.secret === entry.is_secret));
          if (!verified) throw new Error("Readback did not confirm the change.");
          return { ...result, message: item.change.tool === "sites.update_environment_variables" ? "Saved in Sites. A separate deployment is required to apply the variable changes." : "Saved in Sites and refreshed." };
        } catch (error) {
          if (dispatched) { uncertain = true; throw new Error("Save outcome is uncertain. Further saves are blocked. Check Sites and restart the local Studio server before more changes. Nothing will be retried automatically."); }
          throw error;
        } finally { busy = false; }
      }
      throw new Error("Unsupported settings action.");
    },
    close() { clearInterval(timer); pending.clear(); sessions.clear(); provider.close?.(); },
  };
}
