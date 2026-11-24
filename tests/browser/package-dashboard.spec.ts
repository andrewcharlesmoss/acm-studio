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
  const projectHeader = table.getByRole("rowheader", { name: "ACM Studio" });
  const initialLeft = (await projectHeader.boundingBox())!.x;
  await scroll.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  await expect.poll(async () => (await projectHeader.boundingBox())!.x).toBeCloseTo(initialLeft, 0);
  const scrollBox = (await scroll.boundingBox())!;
  const projectBox = (await projectHeader.boundingBox())!;
  expect(projectBox.x).toBeGreaterThanOrEqual(scrollBox.x);
  expect(projectBox.x + projectBox.width).toBeLessThan(scrollBox.x + scrollBox.width);
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

test("reviews a published Studio version before applying it from a narrow dashboard", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  let declared = "0.35.1";
  const actions: string[] = [];
  await page.route("**/__studio/packages", route => route.fulfill({ json: {
    available: true,
    projects: [{ id: "acm-studio", packages: [
      { id: "icons", state: "installed", declared, version: "0.35.1", comparison: 0 },
      { id: "panel", state: "installed", declared: "0.1.0", version: "0.1.0", comparison: 0 },
    ] }, { id: "acm-account", packages: [
      { id: "panel", state: "installed", declared: "0.1.0", version: "0.1.0", comparison: 0 },
    ] }],
    releases: [{ id: "icons", version: "0.35.1", source: "registry" }],
  } }));
  await page.route("**/__studio/package-version", route => {
    const input = route.request().postDataJSON();
    actions.push(input.action);
    if (input.action === "versions") {
      if (input.packageId === "panel") return route.fulfill({ json: { versions: ["0.1.0"] } });
      expect(input).toEqual({ action: "versions", packageId: "icons" });
      return route.fulfill({ json: { versions: ["0.35.1", "0.34.0"] } });
    }
    if (input.action === "review") {
      expect(input).toEqual({ action: "review", packageId: "icons", version: "0.34.0" });
      return route.fulfill({ json: { reviewId: "test-review", previous: "0.35.1", version: "0.34.0", diff: "--- package.json\n+ 0.34.0" } });
    }
    expect(input).toEqual({ action: "apply", reviewId: "test-review" });
    declared = "0.34.0";
    return route.fulfill({ json: { applied: true, version: declared } });
  });

  await page.goto("/studio/packages");
  const studio = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "ACM Studio" }) });
  const account = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "ACM Account" }) });
  const opener = studio.getByRole("button", { name: "Change version of Icons" });
  const panelOpener = studio.getByRole("button", { name: "Change version of Panel" });
  await expect(account.getByRole("button")).toHaveCount(0);
  await panelOpener.focus();
  await page.keyboard.press("Enter");
  const panelDialog = page.getByRole("dialog", { name: "Change Panel version" });
  const panelVersion = panelDialog.getByRole("combobox", { name: "Published version" });
  await expect(panelVersion).toHaveValue("0.1.0");
  await expect(panelVersion.locator("option:checked")).toHaveText("v0.1.0 (current)");
  await expect(panelVersion).toBeDisabled();
  await expect(panelDialog.getByRole("button", { name: "Review Change" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(panelDialog).toHaveCount(0);
  await expect(panelOpener).toBeFocused();
  const scroll = page.getByRole("region", { name: "Package versions by project" });
  await scroll.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  await opener.focus();
  const projectHeader = studio.getByRole("rowheader");
  const headerBox = (await projectHeader.boundingBox())!;
  const scrollBox = (await scroll.boundingBox())!;
  await expect.poll(async () => (await opener.boundingBox())!.x).toBeGreaterThan(headerBox.x + headerBox.width);
  const actionBox = (await opener.boundingBox())!;
  expect(actionBox.x + actionBox.width).toBeLessThan(scrollBox.x + scrollBox.width);
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Change Icons version" });
  const versionChoice = dialog.getByRole("combobox", { name: "Published version" });
  await expect(versionChoice.getByRole("option", { name: "v0.35.1 (current)" })).toHaveJSProperty("disabled", true);
  await versionChoice.selectOption("0.34.0");
  await expect(dialog.getByRole("button", { name: "Apply Version Change" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Review Change" }).click();
  await expect(dialog.getByText(/will change from/)).toContainText("v0.35.1 to v0.34.0");
  await expect(dialog.getByText(/will change from/)).toBeFocused();
  await dialog.getByText("Dependency file changes").click();
  await expect(dialog.getByText("--- package.json", { exact: false })).toBeVisible();
  expect(actions).toEqual(["versions", "versions", "review"]);
  const box = (await dialog.boundingBox())!;
  expect(box.width + box.x).toBeLessThanOrEqual(320);
  await dialog.getByRole("button", { name: "Apply Version Change" }).press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page.getByText(/Icons v0.34.0 is saved/)).toBeVisible();
  await expect(page.getByRole("table").getByText("Declared 0.34.0")).toBeVisible();
  expect(actions).toEqual(["versions", "versions", "review", "apply"]);
});
