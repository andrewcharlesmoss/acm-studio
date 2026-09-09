import assert from "node:assert/strict";
import test from "node:test";
import { createSettingsService } from "../scripts/site-settings-service.mjs";

const projectId = "appgprj_6a952fdb444c81918a35bc3fc6271c4a";
function fixture() {
  const calls = [];
  const site = { id: projectId, title: "Example staging", slug: "example", current_live_url: "https://example.chatgpt.site", current_user_role: "owner", available_access_modes: ["public", "custom"], status: "active", updated_at: "one", access_policy: { access_mode: "public", revision: 1 } };
  const environment = { project_id: projectId, revision: 1, entries: [{ key: "SECRET", value: "PRIVATE", is_secret: true }] };
  const domains = { items: [] };
  let time = 1000;
  let rejectWrite = false;
  const provider = { async call(tool, args) {
    calls.push({ tool, args });
    if (tool === "sites.get_site") return structuredClone(site);
    if (tool === "sites.get_environment_variables") return structuredClone(environment);
    if (tool === "sites.list_custom_domains") return structuredClone(domains);
    if (rejectWrite) throw new Error("PRIVATE provider error");
    if (tool === "sites.update_site_metadata") site.title = args.title;
    if (tool === "sites.change_site_slug") site.slug = args.slug;
    if (tool === "sites.update_site_access") site.access_policy = { access_mode: args.access_mode, revision: site.access_policy.revision + 1, allowed_account_user_ids: ["owner"], external_visitor_count: 0, allowed_workspace_group_ids: [], allowed_tenant_group_ids: [] };
    if (tool === "sites.add_custom_domain") domains.items.push({ id: "domain-one", project_id: projectId, hostname: args.hostname, status: "pending", cname_target: "target.example.com", apex_proxy_ipv4_targets: [], validation_records: [] });
    if (tool === "sites.remove_custom_domain") domains.items = domains.items.filter((item) => item.id !== args.custom_domain_id);
    if (tool === "sites.update_environment_variables") {
      environment.entries = environment.entries.filter((item) => !args.remove?.includes(item.key) && !args.set_values.some((next) => next.key === item.key));
      environment.entries.push(...args.set_values); environment.revision++;
    }
    return {};
  } };
  const service = createSettingsService({ provider, now: () => time });
  const session = service.connect().session;
  const read = () => service.handle(session, { action: "read", projectId });
  const prepare = async (change) => service.handle(session, { action: "prepare", projectId, revision: (await read()).revision, change });
  const confirm = (confirmation) => service.handle(session, { action: "confirm", confirmation, confirmed: true });
  return { service, session, calls, site, environment, read, prepare, confirm, advance: (minutes = 31) => { time += minutes * 60 * 1000; }, reject: () => { rejectWrite = true; } };
}

test("live settings omit credentials, existing values and access lists", async (t) => {
  const f = fixture(); t.after(() => f.service.close());
  const result = await f.read();
  assert.equal(JSON.stringify(result).includes("PRIVATE"), false);
  assert.equal(result.settings.variables[0].secret, true);
  assert.equal("access_policy" in result.settings, false);
});

test("name save is reviewed, one-shot, owner-bound and read back", async (t) => {
  const f = fixture(); t.after(() => f.service.close());
  const review = await f.prepare({ kind: "name", value: "Renamed" });
  assert.equal(f.site.title, "Example staging");
  await assert.rejects(f.service.handle("invalid", { action: "confirm", confirmation: review.confirmation, confirmed: true }));
  const result = await f.confirm(review.confirmation);
  assert.equal(result.settings.title, "Renamed");
  await assert.rejects(f.confirm(review.confirmation));
  assert.equal(f.calls.filter((call) => call.tool === "sites.update_site_metadata").length, 1);
});

test("foreign project IDs, non-owners, arbitrary operations and stale revisions fail closed", async (t) => {
  const f = fixture(); t.after(() => f.service.close());
  await assert.rejects(f.service.handle(f.session, { action: "read", projectId: "other" }));
  await assert.rejects(f.prepare({ kind: "deploy", value: "anything" }));
  f.site.current_user_role = "editor";
  await assert.rejects(f.prepare({ kind: "name", value: "Renamed" }), /owner/);
  f.site.current_user_role = "owner";
  const review = await f.prepare({ kind: "name", value: "Renamed" });
  f.site.updated_at = "two";
  await assert.rejects(f.confirm(review.confirmation), /changed/);
  assert.equal(f.site.title, "Example staging");
});

test("secret preparations are redacted, preserve unrelated keys and cannot downgrade secrets", async (t) => {
  const f = fixture(); t.after(() => f.service.close());
  await assert.rejects(f.prepare({ kind: "variable", key: "SECRET", value: "replacement", secret: false }));
  const review = await f.prepare({ kind: "variable", key: "NEW_KEY", value: "new-private-value", secret: true });
  assert.equal(JSON.stringify(review).includes("new-private-value"), false);
  const result = await f.confirm(review.confirmation);
  assert.equal(result.settings.environmentRevision, 2);
  assert.equal(f.environment.entries.find((item) => item.key === "SECRET").value, "PRIVATE");
  assert.equal(JSON.stringify(result).includes("new-private-value"), false);
});

test("expiry, cancellation and missing acknowledgement prevent writes", async (t) => {
  const f = fixture(); t.after(() => f.service.close());
  let review = await f.prepare({ kind: "name", value: "New name" });
  await assert.rejects(f.service.handle(f.session, { action: "confirm", confirmation: review.confirmation }), /Confirm/);
  await f.service.handle(f.session, { action: "cancel" });
  await assert.rejects(f.confirm(review.confirmation));
  review = await f.prepare({ kind: "name", value: "New name" });
  f.advance();
  await assert.rejects(f.confirm(review.confirmation));
  assert.equal(f.site.title, "Example staging");
});

test("uncertain writes are not replayed and provider errors never echo values", async (t) => {
  const f = fixture(); t.after(() => f.service.close());
  const review = await f.prepare({ kind: "name", value: "New name" });
  f.reject();
  await assert.rejects(f.confirm(review.confirmation), (error) => /uncertain/.test(error.message) && !error.message.includes("PRIVATE"));
  await assert.rejects(f.confirm(review.confirmation));
  await assert.rejects(f.prepare({ kind: "name", value: "Another name" }), /uncertain/);
  assert.equal(f.calls.filter((call) => call.tool === "sites.update_site_metadata").length, 1);
});

test("simultaneous confirmations dispatch one write only", async (t) => {
  const f = fixture(); t.after(() => f.service.close());
  const review = await f.prepare({ kind: "name", value: "New name" });
  const results = await Promise.allSettled([f.confirm(review.confirmation), f.confirm(review.confirmation)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(f.calls.filter((call) => call.tool === "sites.update_site_metadata").length, 1);
});

test("restricted sharing and invalid removal targets cannot erase unknown grants", async (t) => {
  const f = fixture(); t.after(() => f.service.close());
  f.site.access_policy.access_mode = "custom";
  await assert.rejects(f.prepare({ kind: "sharing", value: "private" }), /detailed access/);
  await assert.rejects(f.prepare({ kind: "remove-domain", id: "foreign-domain" }));
  await assert.rejects(f.prepare({ kind: "remove-variable", key: "MISSING" }));
  await assert.rejects(f.prepare({ kind: "slug", value: "../invalid" }));
});

test("sharing, domains, URL and variable removal use exact tools and verify results", async (t) => {
  const f = fixture(); t.after(() => f.service.close());
  for (const change of [{ kind: "sharing", value: "private" }, { kind: "sharing", value: "public" }, { kind: "add-domain", value: "golf.example.com" }, { kind: "remove-domain", id: "domain-one" }, { kind: "slug", value: "new-slug" }, { kind: "remove-variable", key: "SECRET" }]) {
    const review = await f.prepare(change);
    const result = await f.confirm(review.confirmation);
    assert.match(result.message, /Saved/);
  }
  assert.equal(f.environment.entries.length, 0);
  assert.equal(f.site.slug, "new-slug");
  assert.equal(f.calls.some((call) => /deploy|delete_site/.test(call.tool)), false);
  assert.equal(f.calls.every((call) => call.args.project_id === projectId), true);
});

test("pending confirmations expire before sessions and are bound to their session", async (t) => {
  const f = fixture(); t.after(() => f.service.close());
  const review = await f.prepare({ kind: "name", value: "New name" });
  const other = f.service.connect().session;
  await assert.rejects(f.service.handle(other, { action: "confirm", confirmation: review.confirmation, confirmed: true }));
  f.advance(6);
  await assert.rejects(f.confirm(review.confirmation), /expired/);
  assert.equal((await f.read()).settings.title, "Example staging");
});
