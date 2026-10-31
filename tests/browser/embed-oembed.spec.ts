import { expect, test } from "@playwright/test";

test("Dailymotion Embed uses a valid Player ID in Edit and Preview", async ({ page }) => {
  const sourceUrl = "https://www.dailymotion.com/video/x84sh87?player=x8lr5";
  const playerUrl = "https://geo.dailymotion.com/player/x8lr5.html?video=x84sh87";
  let resolverCalls = 0;
  await page.route("**/api/embed/resolve", async route => {
    resolverCalls++;
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Unsupported" }) });
  });
  await page.goto("/studio/ui/blocks/embed");
  await expect(page.locator(".ui-block-specimen")).toHaveAttribute("data-ready", "true");
  const source = page.locator('[data-studio-block-anchor-id="embed-library-specimen"]').first();
  await page.getByRole("group", { name: "Embed block tools", exact: true })
    .filter({ visible: true }).getByRole("button", { name: "Edit URL", exact: true }).click();
  await source.getByRole("textbox", { name: "Enter URL to embed", exact: true }).fill(sourceUrl);
  await source.getByRole("button", { name: "Embed", exact: true }).click();
  await expect(source.locator(`iframe[src="${playerUrl}"]`)).toHaveAttribute("title", "YouTube example");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator(`iframe[src="${playerUrl}"]`)).toBeVisible();
  expect(resolverCalls).toBe(0);
});

test("Flickr Embed resolves after retry and links the image to its source", async ({ page }) => {
  const sourceUrl = "https://www.flickr.com/photos/bees/2341623661/";
  const imageUrl = "https://live.staticflickr.com/3689/11197949844_1a2b3c4d5e_b.jpg";
  let allowSuccess = false;
  let failuresCompleted = 0;
  const requests: Array<{ method: string; body: unknown }> = [];

  await page.route("**/api/embed/resolve", async route => {
    const request = route.request();
    requests.push({ method: request.method(), body: request.postDataJSON() });
    if (!allowSuccess) {
      await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Unavailable" }) });
      failuresCompleted++;
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        provider: "Flickr", kind: "photo", title: "Bees at work", src: imageUrl, width: 640, height: 480,
      }),
    });
  });
  await page.route("https://live.staticflickr.com/**", route => route.fulfill({
    status: 200,
    contentType: "image/gif",
    body: Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64"),
  }));

  await page.goto("/studio/ui/blocks/embed");
  await expect(page.locator(".ui-block-specimen")).toHaveAttribute("data-ready", "true");
  const source = page.locator('[data-studio-block-anchor-id="embed-library-specimen"]').first();
  const edit = page.getByRole("group", { name: "Embed block tools", exact: true })
    .filter({ visible: true }).getByRole("button", { name: "Edit URL", exact: true });
  await edit.click();
  const input = source.getByRole("textbox", { name: "Enter URL to embed", exact: true });
  await input.fill(sourceUrl);
  await source.getByRole("button", { name: "Embed", exact: true }).click();

  await expect(source.locator(".content-provider-embed")).toContainText("This URL cannot be embedded");
  const retry = source.getByRole("button", { name: "Retry embed", exact: true });
  await expect(retry).toBeVisible();
  await expect.poll(() => failuresCompleted).toBeGreaterThan(0);
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.at(-1)).toEqual({ method: "POST", body: { url: sourceUrl } });

  allowSuccess = true;
  await retry.click();
  const image = source.locator(`a[href="${sourceUrl}"] img[src="${imageUrl}"]`);
  await expect(image).toHaveAttribute("alt", "Bees at work");
  await expect(image.locator("xpath=.."))
    .toHaveAttribute("aria-label", "Open original Flickr photo: Bees at work");
  await expect(source.getByRole("link", { name: "Open original content", exact: true }))
    .toHaveAttribute("href", sourceUrl);
  expect(requests.length).toBeGreaterThan(1);
  expect(requests.at(-1)).toEqual({ method: "POST", body: { url: sourceUrl } });

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("img", { name: "Bees at work", exact: true })).toBeVisible();
  await expect.poll(() => requests.length).toBeGreaterThan(2);
  expect(requests.at(-1)).toEqual({ method: "POST", body: { url: sourceUrl } });
});

test("unsupported Embed URLs do not call the oEmbed resolver", async ({ page }) => {
  let resolverCalls = 0;
  await page.route("**/api/embed/resolve", async route => {
    resolverCalls++;
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Unsupported" }) });
  });

  await page.goto("/studio/ui/blocks/embed");
  await expect(page.locator(".ui-block-specimen")).toHaveAttribute("data-ready", "true");
  const source = page.locator('[data-studio-block-anchor-id="embed-library-specimen"]').first();
  const edit = page.getByRole("group", { name: "Embed block tools", exact: true })
    .filter({ visible: true }).getByRole("button", { name: "Edit URL", exact: true });
  await edit.click();
  await source.getByRole("textbox", { name: "Enter URL to embed", exact: true })
    .fill("https://example.test/reference");
  await source.getByRole("button", { name: "Embed", exact: true }).click();
  await expect(source.locator(".content-provider-embed")).toContainText("This URL cannot be embedded");
  await page.waitForTimeout(300);
  expect(resolverCalls).toBe(0);
});

test("Studio resolves a verified Speaker Deck iframe without injecting provider HTML", async ({ page }) => {
  const sourceUrl = "https://speakerdeck.com/jnunemaker/atom";
  const playerUrl = "https://speakerdeck.com/player/31f86a9069ae0132dede22511952b5a3";
  let resolverCalls = 0;
  await page.route("**/api/embed/resolve", async route => {
    resolverCalls++;
    expect(route.request().postDataJSON()).toEqual({ url: sourceUrl });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        provider: "Speaker Deck", kind: "frame", title: "Atom", src: playerUrl,
      }),
    });
  });

  await page.goto("/studio/ui/blocks/embed");
  await expect(page.locator(".ui-block-specimen")).toHaveAttribute("data-ready", "true");
  const source = page.locator('[data-studio-block-anchor-id="embed-library-specimen"]').first();
  await page.getByRole("group", { name: "Embed block tools", exact: true })
    .filter({ visible: true }).getByRole("button", { name: "Edit URL", exact: true }).click();
  await source.getByRole("textbox", { name: "Enter URL to embed", exact: true }).fill(sourceUrl);
  await source.getByRole("button", { name: "Embed", exact: true }).click();

  await expect(source.locator(`iframe[src="${playerUrl}"]`)).toHaveAttribute("title", "Atom");
  await expect(source.getByRole("link", { name: "Open original content", exact: true })).toHaveAttribute("href", sourceUrl);
  expect(resolverCalls).toBe(1);
  await expect(source.locator("script")).toHaveCount(0);
});
