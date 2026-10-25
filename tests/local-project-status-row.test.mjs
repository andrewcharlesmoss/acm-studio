import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIsolatedModuleLoader } from "./production-module.mjs";

const load = createIsolatedModuleLoader({ overrides: {
  "./button": { StudioButton: props => React.createElement("button", props, props.children) }, // eslint-disable-line react/prop-types -- isolated renderer stub
  "@acm/icons/react": { AcmIcon: () => null },
} });
const { LocalProjectStatusRow } = load(new URL("../app/studio/controls/local-project-status-row.tsx", import.meta.url));

test("local status row shows the address and dot without a status tooltip", () => {
  const html = renderToStaticMarkup(React.createElement(LocalProjectStatusRow, {
    address: "localhost:3005", statusLabel: "Local server running", serverState: "running",
    refreshLabel: "Refresh local status for Test", onRefresh() {},
  }));
  assert.match(html, /aria-label="Local server running — localhost:3005"/);
  assert.match(html, /data-state="running"/);
  assert.match(html, />localhost:3005<\/small>/);
  assert.doesNotMatch(html, /class="dashboard-local-status"[^>]*title=|Project Ports unavailable/);
});

test("an unknown address leaves the coloured dot and accessible status without fabricating a URL", () => {
  const html = renderToStaticMarkup(React.createElement(LocalProjectStatusRow, {
    statusLabel: "Local website address unavailable", serverState: "unavailable",
    refreshLabel: "Refresh local status for Test", onRefresh() {},
  }));
  assert.match(html, /aria-label="Local website address unavailable"/);
  assert.match(html, /data-state="unavailable"/);
  assert.doesNotMatch(html, /localhost|Project Ports unavailable|class="dashboard-local-status"[^>]*title=/);
});
