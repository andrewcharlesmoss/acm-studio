import { createHostModuleEvaluator } from "./production-module.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = (readFileSync(process.env.STUDIO_LOCAL_LINKS_SOURCE ?? new URL("../app/studio/project-local-links.tsx", import.meta.url), "utf8"));
const running = (port = 3012) => ({ available: true, projects: [{ id: "test", status: "running", href: `http://localhost:${port}/` }] });
const unavailable = { available: false, projects: [] };
const settle = () => new Promise(resolve => setImmediate(resolve));
const text = node => typeof node === "string" ? node : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";
const nodes = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];

// Execute the production provider and Visit hook with deterministic React effects,
// deferred transport, and real URL/AbortController behaviour. No discovery policy is mocked.
function harness() {
  let instance;
  const contexts = [], requests = [], tabs = [], intervals = new Map(), listeners = new Map();
  const react = {
    createContext(value) { const context = { current: value, Provider: Symbol("provider") }; contexts.push(context); return context; },
    useContext: context => context.current,
    useState(initial) {
      const owner = instance, slot = owner.cursor++;
      if (!(slot in owner.slots)) owner.slots[slot] = typeof initial === "function" ? initial() : initial;
      return [owner.slots[slot], value => { owner.updates++; owner.slots[slot] = typeof value === "function" ? value(owner.slots[slot]) : value; }];
    },
    useRef(value) { const slot = instance.cursor++; return instance.slots[slot] ??= { current: value }; },
    useEffect(effect, dependencies) {
      const owner = instance, slot = owner.cursor++, previous = owner.slots[slot];
      if (!previous || dependencies.some((value, index) => value !== previous.dependencies[index])) {
        owner.slots[slot] = { dependencies, cleanup: previous?.cleanup, layout: false };
        owner.effects.push(() => { previous?.cleanup?.(); owner.slots[slot].cleanup = effect(); });
      }
    },
    useLayoutEffect(effect, dependencies) {
      const owner = instance, start = owner.effects.length;
      react.useEffect(effect, dependencies);
      owner.layoutEffects.push(...owner.effects.splice(start));
      owner.slots[owner.cursor - 1].layout = true;
    },
  };
  const jsx = (type, props) => typeof type === "function" ? type(props) : ({ type, props });
  const window = {
    location: { hostname: "localhost", host: "localhost:3010" },
    setInterval(callback) { const id = intervals.size + 1; intervals.set(id, callback); return id; }, clearInterval: id => intervals.delete(id),
    addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name),
    open() { const tab = { closed: false, replacements: [], location: { replace(href) { tab.replacements.push(href); } }, close() { this.closed = true; } }; tabs.push(tab); return tab; },
  };
  const fetch = (_url, options) => new Promise((resolve, reject) => requests.push({ options, resolve: value => resolve({ ok: true, json: async () => value }), respond: resolve, reject }));
  const require = id => id === "react" ? react : id === "react/jsx-runtime" ? { jsx, jsxs: jsx }
    : id.endsWith("project-registry") ? { studioProjects: ["test", "test2", "acm-studio"].map(id => ({ id, name: id === "test" ? "Test" : id === "test2" ? "Test2" : "ACM Studio" })) }
    : id.endsWith("test-site/sites") ? { isLocalFixtureSiteId: id => id === "test" || id === "test2", localFixtureHref: id => `/studio?site=${id}` }
    : id.endsWith("studio-icons") ? { StudioIcon: "icon" } : id.endsWith("controls/button") ? { StudioButton: "button" } : id.endsWith("local-project-status-row") ? { LocalProjectStatusRow: props => ({ type: "div", props: { className: "dashboard-local-status-row", children: [
      { type: "small", props: { className: "dashboard-local-status", role: "status", "aria-label": props.address ? `${props.statusLabel} — ${props.address}` : props.statusLabel, children: [{ type: "span", props: { className: "studio-server-status-dot", "data-state": props.serverState, "aria-hidden": "true" } }, props.address] } },
      { type: "button", props: { type: "button", className: "dashboard-local-refresh", disabled: props.refreshing, "aria-busy": props.refreshing || undefined, "aria-label": props.refreshLabel, title: props.refreshLabel, onClick: props.onRefresh, children: { type: "icon", props: { name: "action.refresh" } } } },
    ] } }) } : id === "@acm/icons/react" ? { AcmIcon: "icon" } : {};
  const production = createHostModuleEvaluator(["require", "exports", "fetch", "window", "document", "AbortController", "queueMicrotask", "URL"], `${source}\nreturn {...exports, useProjectLocalVisit};`)(require, {}, fetch, window, { visibilityState: "visible" }, AbortController, queueMicrotask, URL);
  function component(render) {
    const owner = { cursor: 0, slots: [], effects: [], layoutEffects: [], updates: 0, render({ passive = true } = {}) {
      instance = owner; owner.cursor = 0; const result = render();
      for (const context of contexts) if (result?.type === context.Provider) context.current = result.props.value;
      owner.layoutEffects.splice(0).forEach(effect => effect());
      if (passive) owner.effects.splice(0).forEach(effect => effect()); return result;
    }, unmount({ passive = true } = {}) { owner.slots.forEach(slot => { if (passive || slot?.layout) slot?.cleanup?.(); }); } };
    return owner;
  }
  const provider = component(() => production.ProjectLocalLinksProvider({ children: null }));
  provider.render();
  return { requests, tabs, provider, context: () => contexts[0].current, refresh: () => [...intervals.values()][0](),
    async resolve(index, value) { requests[index].resolve(value); await settle(); provider.render(); },
    async reject(index) { requests[index].reject(new Error("transport failed")); await settle(); provider.render(); },
    visit: (target = { id: "test" }) => component(() => production.useProjectLocalVisit(target.id, target.destination)),
    link: () => component(() => production.ProjectLocalLink({ id: "test", name: "Test", showStatus: true })),
    status: (id = "test") => production.ProjectLocalStatus({ id }),
  };
}

test("failed refreshes retain confirmed status visibly; successful stopped and removed snapshots replace it", async () => {
  const h = harness(); await h.resolve(0, running());
  h.refresh(); await h.resolve(1, unavailable);
  assert.deepEqual(h.context().snapshot, running()); assert.equal(h.context().stale, true);
  const status = h.status(); assert.match(nodes(status).find(node => node.props?.className === "dashboard-local-status").props["aria-label"], /refresh failed; showing last confirmed status/);
  assert.equal(nodes(status).find(node => node.props?.className === "studio-server-status-dot").props["data-state"], "stale");
  const visit = h.visit(); assert.equal(visit.render().canVisit, true);
  h.refresh(); await h.reject(2); assert.deepEqual(h.context().snapshot, running());
  h.refresh(); await h.resolve(3, { available: true, projects: [{ id: "test", status: "stopped" }] });
  assert.equal(h.context().stale, false); assert.equal(visit.render().canVisit, false);
  h.refresh(); await h.resolve(4, { available: true, projects: [] });
  assert.deepEqual(h.context().snapshot.projects, []);
});

test("initial unavailable, rejected, and invalid responses never fabricate a running site", async () => {
  for (const value of [unavailable, null, { available: true, projects: [{ id: "test", status: "running", href: "https://example.com/" }] }]) {
    const h = harness(); if (value === null) await h.reject(0); else await h.resolve(0, value);
    assert.equal(h.context().snapshot.available, false); assert.equal(h.context().stale, false);
    assert.equal(h.visit().render().canVisit, false);
    h.refresh(); await h.resolve(1, running(4012)); assert.equal(h.context().snapshot.projects[0].href, "http://localhost:4012/");
  }
});

test("overlapping requests and provider unmount cannot let older failures replace newer success", async () => {
  const h = harness(); h.refresh(); await h.resolve(1, running(4012)); await h.reject(0);
  assert.deepEqual(h.context().snapshot, running(4012)); assert.equal(h.context().stale, false);
  h.refresh(); h.refresh(); await h.resolve(3, running(5012)); await h.resolve(2, unavailable);
  assert.deepEqual(h.context().snapshot, running(5012)); assert.equal(h.context().stale, false);
  h.refresh(); const updates = h.provider.updates; h.provider.unmount({ passive: false }); h.requests[4].resolve(running(6012)); await settle();
  assert.equal(h.provider.updates, updates);
});

test("stale Visit rechecks and closes on failure with accessible feedback, never opening the saved address", async () => {
  const h = harness(); await h.resolve(0, running()); h.refresh(); await h.reject(1);
  const link = h.link(); let tree = link.render();
  const button = nodes(tree).find(node => node.type === "button" && node.props.className.includes("dashboard-local-open"));
  assert.equal(button.props.disabled, false); button.props.onClick();
  await h.reject(2); tree = link.render();
  assert.equal(h.tabs[0].closed, true); assert.deepEqual(h.tabs[0].replacements, []);
  const failure = nodes(tree).find(node => node.props?.role === "alert");
  assert.match(failure.props.children, /could not be checked/);
  assert.equal(failure.props.className, "visually-hidden", "Visit failures remain accessible without adding messages inside the environment tile");
  assert.equal(h.context().stale, true);
  nodes(tree).find(node => node.type === "button" && node.props.className.includes("dashboard-local-open")).props.onClick();
  await h.resolve(3, running(4012)); await settle();
  assert.deepEqual(h.tabs[1].replacements, ["http://localhost:4012/"]);
});

test("Visit never navigates after its own unmount, provider unmount, unavailable read, or newer request", async () => {
  for (const reason of ["link", "provider", "unavailable", "superseded"]) {
    const h = harness(); await h.resolve(0, running()); const visit = h.visit(); const pending = visit.render().openLocal();
    if (reason === "link") visit.unmount({ passive: false });
    if (reason === "provider") h.provider.unmount({ passive: false });
    if (reason === "superseded") { h.refresh(); await h.resolve(2, running(5012)); }
    h.requests[1].resolve(reason === "unavailable" ? unavailable : running(4012)); await pending;
    assert.equal(h.tabs[0].closed, true, reason); assert.deepEqual(h.tabs[0].replacements, [], reason);
  }
});


test("a committed target change invalidates an opening before passive effects run", async () => {
  const h = harness(); await h.resolve(0, running());
  const target = { id: "test", destination: "/first" }, visit = h.visit(target);
  const pending = visit.render().openLocal();
  target.destination = "/second"; visit.render({ passive: false });
  h.requests[1].resolve(running(4012)); await pending;
  assert.equal(h.tabs[0].closed, true); assert.deepEqual(h.tabs[0].replacements, []);
});


test("HTTP failures preserve a confirmed address but cannot satisfy a Visit recheck", async () => {
  const h = harness(); await h.resolve(0, running());
  h.refresh(); h.requests[1].respond({ ok: false }); await settle(); h.provider.render();
  assert.equal(h.context().stale, true); assert.deepEqual(h.context().snapshot, running());
  const visit = h.visit(); const pending = visit.render().openLocal();
  h.requests[2].respond({ ok: false }); await pending;
  assert.equal(h.tabs[0].closed, true); assert.deepEqual(h.tabs[0].replacements, []);
});


test("manual refresh is shared, named per site, and deduplicated while pending", async () => {
  const h = harness(); await settle(); h.provider.render();
  const initial = nodes(h.status()).find(node => node.type === "button");
  assert.equal(initial.props.disabled, true, "the initial discovery read already owns the shared check");
  initial.props.onClick(); assert.equal(h.requests.length, 1);
  await h.resolve(0, running());
  const refresh = nodes(h.status()).find(node => node.type === "button");
  assert.equal(refresh.props["aria-label"], "Refresh local status for Test");
  assert.equal(refresh.props.disabled, false);
  assert.equal(nodes(refresh).find(node => node.type === "icon").props.name, "action.refresh");
  refresh.props.onClick(); refresh.props.onClick();
  assert.equal(h.requests.length, 2, "repeated activation submits one shared check");
  await settle(); h.provider.render();
  const pending = nodes(h.status()).find(node => node.type === "button");
  assert.equal(pending.props.disabled, true); assert.equal(pending.props["aria-busy"], true);
  assert.equal(pending.props["aria-label"], "Refreshing local status for Test");
  assert.match(nodes(h.status()).find(node => node.props?.className === "dashboard-local-status").props["aria-label"], /Refreshing local server status/);
  nodes(h.status("test2")).find(node => node.type === "button").props.onClick();
  assert.equal(h.requests.length, 2, "other site buttons share the same pending check");
  await h.resolve(1, { available: true, projects: [...running(4012).projects, { id: "test2", status: "running", href: "http://localhost:4013/" }] });
  assert.equal(h.context().snapshot.projects.length, 2);
  assert.equal(nodes(h.status()).find(node => node.type === "button").props.disabled, false);
  assert.match(text(nodes(h.status("test2")).find(node => node.props?.className === "dashboard-local-status")), /4013/);
});

test("manual refresh recovers stale status and retains last-good state on another failure", async () => {
  const h = harness(); await h.resolve(0, running()); h.refresh(); await h.reject(1);
  nodes(h.status()).find(node => node.type === "button").props.onClick(); await h.reject(2);
  assert.equal(h.context().stale, true); assert.deepEqual(h.context().snapshot, running());
  assert.equal(nodes(h.status()).find(node => node.type === "button").props.disabled, false);
  nodes(h.status()).find(node => node.type === "button").props.onClick(); await h.resolve(3, running(5012));
  assert.equal(h.context().stale, false); assert.deepEqual(h.context().snapshot, running(5012));
});


test("automatic polling and Visit checks do not announce manual refresh progress", async () => {
  const h = harness(); await h.resolve(0, running());
  const status = () => text(nodes(h.status()).find(node => node.props?.className === "dashboard-local-status"));
  const confirmed = status(); h.refresh(); await settle(); h.provider.render();
  assert.equal(status(), confirmed);
  assert.equal(nodes(h.status()).find(node => node.type === "button").props.disabled, true);
  await h.resolve(1, running());
  const visit = h.visit(); const pending = visit.render().openLocal(); await settle(); h.provider.render();
  assert.equal(status(), confirmed); await h.resolve(2, running()); await pending;
});

test("address presentation keeps the port unbroken with a deliberate host boundary", async () => {
  const h = harness(); await h.resolve(0, running());
  const status = h.status();
  const label = nodes(status).find(node => node.props?.className === "dashboard-local-status");
  assert.equal(text(label), "localhost:3012");
  assert.equal(label.props["aria-label"], "Local server running — localhost:3012");
  assert.equal(nodes(status).find(node => node.props?.className === "studio-server-status-dot").props["data-state"], "running");
});

test("unavailable discovery shows no invented address and leaves status to the coloured dot", async () => {
  const h = harness(); await h.resolve(0, unavailable);
  const status = h.status();
  const label = nodes(status).find(node => node.props?.className === "dashboard-local-status");
  assert.equal(text(label), "");
  assert.equal(label.props["aria-label"], "Local website address unavailable");
  assert.equal(nodes(status).find(node => node.props?.className === "studio-server-status-dot").props["data-state"], "unavailable");
});
