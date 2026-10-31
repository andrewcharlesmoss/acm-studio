import { studioProjects } from "./project-registry.ts";

export const dashboardSiteIds = studioProjects.map(project => project.id);
export const dashboardToolIds = ["site-editor", "templates", "designs", "ui-library", "content", "files", "backup"];
export const dashboardOrderKeys = {
  sites: "acm-studio-dashboard-sites-order-v1",
  tools: "acm-studio-dashboard-tools-order-v1",
};

/** Broker commands are bounded complete orders with an exact previous baseline. */
export function validDashboardOrder(value, ids) {
  try {
    if (typeof value !== "string" || value.length > 4096) return false;
    const parsed = JSON.parse(value);
    const valid = order => Array.isArray(order) && order.length === ids.length && new Set(order).size === ids.length && order.every(id => ids.includes(id));
    return Boolean(parsed && Object.keys(parsed).sort().join(",") === "baseline,order" && valid(parsed.order) && valid(parsed.baseline));
  } catch { return false; }
}
