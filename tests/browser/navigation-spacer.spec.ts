import { expect, test } from "@playwright/test";

test("Navigation Spacer is keyboard-insertable, selectable, resizable, duplicable and removable in the production Library specimen", async ({ page }) => {
  await page.goto("/studio/ui/blocks/navigation");
  await expect(page.locator(".ui-block-specimen")).toHaveAttribute("data-ready", "true");
  const navigation = page.locator(".navigation-editor");
  const add = navigation.locator(".navigation-appender > .navigation-add");
  await add.focus();
  await add.press("Enter");
  const picker = page.getByRole("dialog", { name: "Add navigation link", exact: true });
  await expect(picker).toBeVisible();
  const addSpacer = picker.getByRole("button", { name: "Add Spacer", exact: true });
  await addSpacer.focus();
  await addSpacer.press("Enter");

  const canvasSpacer = navigation.locator(":scope > .template-navigation-items > .navigation-edit-spacer");
  await expect(canvasSpacer).toHaveCount(1);
  const selection = canvasSpacer.getByRole("button", { name: "Spacer, 32 pixels wide and 32 pixels high", exact: true });
  await expect(selection).toBeFocused();
  await expect(page.getByRole("heading", { name: "Spacer", exact: true })).toBeVisible();
  const width = page.getByRole("spinbutton", { name: "Width (px)", exact: true });
  const height = page.getByRole("spinbutton", { name: "Height (px)", exact: true });
  await width.fill("120");
  await expect(selection).toHaveAttribute("aria-label", "Spacer, 120 pixels wide and 32 pixels high");
  await height.fill("64");
  await expect(selection).toHaveAttribute("aria-label", "Spacer, 120 pixels wide and 64 pixels high");

  await page.getByRole("button", { name: "Options for Spacer", exact: true }).click();
  await expect(page.getByRole("menu", { name: "Spacer options", exact: true })).toBeVisible();
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await expect(canvasSpacer).toHaveCount(2);
  await page.getByRole("button", { name: "Options for Spacer", exact: true }).last().click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(canvasSpacer).toHaveCount(1);
});
