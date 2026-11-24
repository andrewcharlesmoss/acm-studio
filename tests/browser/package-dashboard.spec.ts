import { expect, test } from "@playwright/test";

test("shows verified version comparisons and keyboard access from the Control Centre", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let reads = 0;
  await page.route("**/__studio/packages", async route => {
    expect(route.request().method()).toBe("POST");
    reads++;
    await route.fulfill({ json: {
      available: true,
      releases: [
        { id: "icons", version: "0.35.1", source: "registry" },
        { id: "panel", version: "0.1.0", source: "verified", checkedAt: "2026-11-23" },
      ],
      projects: [
        { id: "acm-studio", packages: [
          { id: "icons", state: "installed", version: "0.35.1", declared: "0.35.1", comparison: 0 },
          { id: "panel", state: "installed", version: "0.0.9", declared: "^0.0.9", comparison: -1 },
          { id: "ribbon", state: "broken", declared: "Local source", comparison: null },
          { id: "styles", state: "unidentified", comparison: null },
        ] },
        { id: "acm-account", packages: [{ id: "icons", state: "unused", comparison: null }] },
        { id: "project-ports", packages: [{ id: "icons", state: "locked", version: "0.35.1", comparison: 0 }] },
      ],
    } });
  });
  await page.goto("/");
  const link = page.getByRole("link", { name: "Packages", exact: true });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/studio\/packages$/);
  await expect(page.getByRole("heading", { name: "Packages", exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Live registry unavailable");
  const table = page.getByRole("table");
  await expect(table.getByRole("columnheader")).toHaveCount(5);
  await expect(table.getByRole("columnheader", { name: /Panel/ })).toContainText("Latest release v0.1.0");
  await expect(table.getByRole("columnheader", { name: /Panel/ })).toContainText("Verified 23 Nov 2026");
  const studio = table.getByRole("row", { name: /^ACM Studio / });
  await expect(studio.getByRole("cell").nth(0)).toContainText("v0.35.1 (latest)");
  await expect(studio.getByRole("cell").nth(1)).toContainText("Latest verified v0.1.0");
  await expect(studio.getByRole("cell").nth(2)).toContainText("Broken local link");
  await expect(studio.getByRole("cell").nth(3)).toContainText("Unidentifiable source");
  await expect(table.getByRole("row", { name: /^ACM Account / }).getByRole("cell").nth(0)).toContainText("Not used");
  await expect(table.getByRole("row", { name: /^Project Ports / }).getByRole("cell").nth(0)).toContainText("Locked · install missing");
  await expect(page.getByText("Hosted versions")).toContainText("Unknown");

  const scroll = page.getByRole("region", { name: "Package versions by project" });
  await scroll.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => scroll.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const refresh = page.getByRole("button", { name: "Refresh" });
  await refresh.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => reads).toBe(2);
});

test("marks package evidence unavailable when the local bridge is missing", async ({ page }) => {
  await page.route("**/__studio/packages", route => route.fulfill({ status: 503 }));
  await page.goto("/studio/packages");
  await expect(page.getByRole("status")).toContainText("Local package data unavailable");
  await expect(page.getByRole("table").getByText("(latest)", { exact: false })).toHaveCount(0);
});
