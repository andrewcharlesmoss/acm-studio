import { expect, test, type Page } from "@playwright/test";
import { loadProductionModule } from "../production-module.mjs";

function document(id: string, title: string) {
  return {
    id, kind: "page", title, subtitle: "", slug: id, excerpt: "", status: "draft",
    updatedAt: "2026-11-01T12:00:00.000Z", documentShellVersion: 1,
    tags: [], seoTitle: "", seoDescription: "", blocks: [],
  };
}

async function seedBin(page: Page, test2Available = true) {
  const { emptyTemplateStore, createTemplateSet } = await loadProductionModule(new URL("../../app/studio/template-model.ts", import.meta.url));
  const { testSiteCollection } = await loadProductionModule(new URL("../../app/studio/test-site/contract.ts", import.meta.url));
  const { createGlobalTemplateLibrary } = await loadProductionModule(new URL("../../app/studio/global-template-contract.ts", import.meta.url));
  const original = createTemplateSet("Original");
  function fixture(siteId: "test" | "test2", name: string, deletedAt: string) {
    const home = document("home", "Home");
    return testSiteCollection({
      format: "acm-test-site", version: 3, siteId,
      documents: [home], categories: [], activeDocumentId: home.id, homeDocumentId: home.id,
      bin: [{ id: "shared-bin-id", document: document("fixture-page", name), deletedAt }],
      templates: { ...emptyTemplateStore(), sets: [structuredClone(original)] },
      browserImportComplete: true,
    });
  }
  const sites = {
    test: fixture("test", "Deleted Test1 page", "2026-11-03T12:00:00.000Z"),
    test2: fixture("test2", "Deleted Test2 page", "2026-11-02T12:00:00.000Z"),
  };
  const library = createGlobalTemplateLibrary(sites);
  const revision = "a".repeat(64);
  const gatewayWrites: string[] = [];
  await page.route("**/__studio/test-site", async route => {
    const { action, siteId } = route.request().postDataJSON();
    if (action === "global-read") return route.fulfill({ json: { library, revision, initialised: true } });
    if (action === "release") return route.fulfill({ json: {} });
    if (action === "connect" || action === "read") {
      if (!test2Available && siteId === "test2") return route.fulfill({ status: 503, json: { error: "The local fixture is offline." } });
      const source = sites[siteId === "test2" ? "test2" : "test"];
      return route.fulfill({ json: { token: "b".repeat(64), revision, previewRevision: revision, document: source } });
    }
    gatewayWrites.push(action);
    return route.fulfill({ status: 409, json: { error: "This test does not write to site fixtures." } });
  });
  const home = document("browser-home", "Local draft");
  await page.addInitScript(workspace => {
    localStorage.setItem("acm-studio-workspace-v2", JSON.stringify(workspace));
  }, {
    version: 68, activeDocumentId: home.id, documents: [home], categories: [],
    bin: [{ id: "shared-bin-id", document: document("browser-page", "Deleted drafts page"), deletedAt: "2026-11-01T12:00:00.000Z" }],
  });
  return gatewayWrites;
}

test("All items shows each Bin source and changing recovery context preserves the filters", async ({ page }) => {
  const gatewayWrites = await seedBin(page);
  await page.goto("/studio?mode=bin");
  const bin = page.getByRole("region", { name: "Bin", exact: true });
  const type = bin.getByRole("combobox", { name: "Type", exact: true });
  const location = bin.getByRole("combobox", { name: "Original Location", exact: true });
  const rows = bin.getByRole("listitem");
  await expect(type).toHaveValue("all");
  await expect(location).toHaveValue("");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Deleted Test1 page");
  await expect(rows.nth(1)).toContainText("Deleted Test2 page");
  await expect(rows.nth(2)).toContainText("Deleted drafts page");

  await type.selectOption("pages");
  await location.selectOption("Test2");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Page · Test2");
  await rows.first().getByRole("link", { name: "Open Test2 to restore", exact: true }).click();
  await expect(bin.getByRole("navigation", { name: "Recovery context" }).getByRole("link", { name: "Test2", exact: true }))
    .toHaveAttribute("aria-current", "page");
  await expect(type).toHaveValue("pages");
  await expect(location).toHaveValue("Test2");
  await expect(rows).toHaveCount(1);
  await expect(rows.first().getByRole("button", { name: "Restore", exact: true })).toBeVisible();

  await location.selectOption("");
  await type.selectOption("all");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(2).getByRole("link", { name: "Open Studio Drafts to restore", exact: true })).toBeVisible();
  expect(gatewayWrites).toEqual([]);
});

test("an offline source leaves loaded Bin items visible with a source-specific warning", async ({ page }) => {
  await seedBin(page, false);
  await page.goto("/studio?mode=bin&site=test2");
  const bin = page.getByRole("region", { name: "Bin", exact: true });
  await expect(bin.getByRole("alert")).toContainText("Test2 items may be incomplete. The local fixture is offline.");
  await expect(bin.getByRole("listitem")).toHaveCount(2);
  await bin.getByRole("link", { name: "Open Studio Drafts to restore", exact: true }).click();
  await expect(bin.getByRole("navigation", { name: "Recovery context" }).getByRole("link", { name: "Studio Drafts", exact: true }))
    .toHaveAttribute("aria-current", "page");
  await bin.getByRole("combobox", { name: "Original Location", exact: true }).selectOption("Test2");
  await expect(bin.getByText("No deleted items could be shown for these filters.", { exact: true })).toBeVisible();
});
