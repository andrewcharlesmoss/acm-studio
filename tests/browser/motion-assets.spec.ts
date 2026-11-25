import { expect, test, devices, type Locator, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { motionGeometry, motionPreset, motionProject, type MotionEffect } from "../../app/studio/motion-assets/motion-asset";
import { motionCatalogue } from "../../app/studio/motion-assets/motion-catalogue";
import { fireBurst } from "../../app/studio/motion-assets/fire-burst";
import { fireShockwave } from "../../app/studio/motion-assets/fire-shockwave";

const require = createRequire(import.meta.url);
const route = "/studio/ui/motion-assets";

async function save(page: Page, label: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: label, exact: true }).click();
  const download = await pending;
  return { name: download.suggestedFilename(), data: await readFile(await download.path()!) };
}

async function setNumber(page: Page, label: string, value: string) {
  const field = page.getByRole("spinbutton", { name: label, exact: true });
  await field.fill(value);
  await field.press("Enter");
}

async function openLegacyFireProject(page: Page, asset: MotionEffect, version: "0.3.0" | "0.4.0") {
  const motion = page.getByRole("tabpanel", { name: "Motion Assets", exact: true });
  await expect(motion.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  await motion.locator('input[type="file"]').setInputFiles({
    name: `${asset.effect}.acm-motion.json`,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ format: "acm-motion", version, asset })),
  });
  await expect(motion.getByRole("img", { name: `${asset.name} animation preview`, exact: true })).toBeVisible();
}

async function expectPreviewSize(preview: Locator, width: number, height: number) {
  await expect(preview).toHaveAttribute("width", String(width));
  await expect(preview).toHaveAttribute("height", String(height));
}

function playbackBarTop(page: Page) {
  return page.locator(".motion-transport").evaluate(bar => bar.getBoundingClientRect().top + window.scrollY);
}

test("opens Motion Assets from Icons, preserves the draft across tabs, and redirects old links", async ({ page }) => {
  await page.goto("/studio/ui/icons");
  const iconsTab = page.getByRole("tab", { name: "Icons", exact: true });
  const motionTab = page.getByRole("tab", { name: "Motion Assets" });
  await expect(iconsTab).toHaveAttribute("aria-selected", "true");
  await expect(async () => {
    await iconsTab.press("ArrowRight");
    await expect(motionTab).toBeFocused({ timeout: 250 });
  }).toPass({ timeout: 10_000 });
  await expect(motionTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(route);
  await expect(page.getByRole("heading", { name: "Motion Assets", level: 1 })).toBeVisible();
  await setNumber(page, "Width (px)", "1600");

  await page.getByRole("button", { name: "Choose Stroke colour" }).click();
  await expect(page.getByRole("dialog", { name: /stroke colour palette/i })).toBeVisible();
  await page.goBack();
  await expect(iconsTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("dialog", { name: /stroke colour palette/i })).toHaveCount(0);
  expect(await page.evaluate(() => window.dispatchEvent(new Event("beforeunload", { cancelable: true })))).toBe(false);
  await page.goForward();
  await expectPreviewSize(page.getByRole("img", { name: "Wave animation preview" }), 1600, 800);

  await iconsTab.click();
  await expect(page.getByRole("heading", { name: "Motion Assets", level: 1 })).toBeHidden();
  await page.goBack();
  await expect(motionTab).toHaveAttribute("aria-selected", "true");
  await expectPreviewSize(page.getByRole("img", { name: "Wave animation preview" }), 1600, 800);
  await save(page, "Download Project");

  await page.goto("/studio/motion-assets");
  await expect(page).toHaveURL(route);
  await expect(motionTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Motion Assets", level: 1 })).toBeVisible();
});

test("finds Motion Assets in the Library Catalogue", async ({ page }) => {
  await page.goto("/studio/ui");
  const search = page.getByRole("searchbox", { name: "Search the Studio UI Library" });
  const entry = page.getByRole("link", { name: "Motion Assets", exact: true });
  await expect(async () => {
    await search.fill("draw-on sketch");
    await expect(entry).toBeVisible({ timeout: 250 });
  }).toPass({ timeout: 10_000 });
  await entry.click();
  await expect(page).toHaveURL(route);
  await expect(page.getByRole("tab", { name: "Motion Assets" })).toHaveAttribute("aria-selected", "true");
});

test("browsing presets preserves edits, supports reset and respects autoplay", async ({ page }) => {
  await page.goto(route);
  const autoplay = page.getByRole("checkbox", { name: "Autoplay on selection" });
  const slider = page.getByRole("slider", { name: "Animation position" });
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  const play = page.getByRole("button", { name: "Play", exact: true });
  await expect(play).toHaveText("");
  await expect(play.locator("svg")).toBeVisible();
  await expect(autoplay).toBeChecked();
  const width = page.getByRole("spinbutton", { name: "Width (px)" });
  await width.fill("1200");
  await expect(width).toBeFocused();
  await page.getByRole("button", { name: "Use Plus", exact: true }).dispatchEvent("click");
  await expect(page.getByRole("dialog", { name: "Replace this project?" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Plus animation preview" })).toBeVisible();
  expect(await page.evaluate(() => window.dispatchEvent(new Event("beforeunload", { cancelable: true })))).toBe(false);
  const pause = page.getByRole("button", { name: "Pause", exact: true });
  await expect(pause).toHaveText("");
  await expect(pause.locator("svg")).toBeVisible();
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(slider).toHaveValue("90");

  await autoplay.press("Space");
  await expect(autoplay).not.toBeChecked();
  await page.getByRole("button", { name: "Use Wave", exact: true }).click();
  const wave = page.getByRole("img", { name: "Wave animation preview" });
  await expectPreviewSize(wave, 1200, 800);
  await width.fill("1400");
  await page.getByRole("button", { name: "Reset Preview" }).dispatchEvent("click");
  await expect(width).toHaveValue("800");
  await expectPreviewSize(wave, 800, 800);
  await expect(play).toBeVisible();
  expect(await page.evaluate(() => window.dispatchEvent(new Event("beforeunload", { cancelable: true })))).toBe(true);
  await page.getByRole("button", { name: "Use Smile", exact: true }).click();
  const drawing = page.getByRole("img", { name: "Smile animation preview" }).locator("path");
  await expect(drawing).toHaveAttribute("d", /M.*M.*M.*M/);
  await expect(slider).toHaveValue("90");
});

test("Space toggles playback from the preview and preserves native control shortcuts", async ({ page }) => {
  await page.goto(route);
  const motion = page.getByRole("tabpanel", { name: "Motion Assets", exact: true });
  await expect(motion.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  const preview = page.getByRole("region", { name: "Motion preview" });
  const play = page.getByRole("button", { name: "Play", exact: true });
  const pause = page.getByRole("button", { name: "Pause", exact: true });
  const slider = page.getByRole("slider", { name: "Animation position" });
  const wave = page.getByRole("button", { name: "Use Wave", exact: true });
  await wave.click();
  await expect(preview).toBeFocused();
  await expect(pause).toBeVisible();
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(0);
  await page.keyboard.press("Space");
  await expect(play).toBeVisible();
  const pausedAt = Number(await slider.inputValue());
  expect(pausedAt).toBeLessThan(90);
  await page.keyboard.down("Space");
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await expect(pause).toBeVisible();
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(pausedAt);
  await pause.press("Space");
  await expect(play).toBeVisible();

  const search = page.getByRole("searchbox", { name: "Search motion assets" });
  await search.press("Space");
  await expect(search).toHaveValue(" ");
  await expect(play).toBeVisible();
  await search.fill("");
  const autoplay = page.getByRole("checkbox", { name: "Autoplay on selection" });
  await autoplay.press("Space");
  await expect(autoplay).not.toBeChecked();
  await wave.press("Space");
  await expect(wave).toBeFocused();
  await expect(play).toBeVisible();
});

test("opens a saved Fire Burst project, previews it with the keyboard, and reopens its edits", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  const motion = page.getByRole("tabpanel", { name: "Motion Assets", exact: true });
  const search = page.getByRole("searchbox", { name: "Search motion assets" });
  const slider = page.getByRole("slider", { name: "Animation position" });
  await openLegacyFireProject(page, fireBurst, "0.3.0");
  const preview = page.getByRole("img", { name: "Fire Burst animation preview" });
  await expectPreviewSize(preview, 1920, 1080);
  await expect(slider).toHaveValue("13");
  await expect(preview.locator("path").first()).toBeVisible();
  await slider.press("Home");
  await expect(preview.locator("path")).toHaveCount(0);
  const play = page.getByRole("button", { name: "Play", exact: true });
  await play.press("Space");
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(slider).toHaveValue("60");
  await expect(preview.locator("path")).toHaveCount(0);
  await setNumber(page, "Width (px)", "1280");
  await setNumber(page, "Height (px)", "720");
  await setNumber(page, "Duration (s)", "1.5");
  const project = await save(page, "Download Project");
  expect(project.name).toBe("fire-burst.acm-motion.json");
  await search.fill("wave");
  await page.getByRole("button", { name: "Use Wave" }).click();
  await expect(page.getByRole("button", { name: "Lottie JSON" })).toBeVisible();
  await motion.locator('input[type="file"]').setInputFiles({ name: project.name, mimeType: "application/json", buffer: project.data });
  await expectPreviewSize(preview, 1280, 720);
  await expect(page.getByRole("spinbutton", { name: "Duration (s)" })).toHaveValue("1.5");
  await expect(page.getByRole("button", { name: "Lottie JSON" })).toHaveCount(0);
});

test("opens an existing Fire Shockwave project and saves its edited settings", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  const motion = page.getByRole("tabpanel", { name: "Motion Assets", exact: true });
  await expect(motion.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  const duration = page.getByRole("spinbutton", { name: "Duration (s)" });

  await openLegacyFireProject(page, fireShockwave, "0.4.0");
  const shockwave = page.getByRole("img", { name: "Fire Shockwave animation preview" });
  await expect(shockwave.locator("path").first()).toBeVisible();
  await expect(duration).toHaveValue("2");
  await setNumber(page, "Duration (s)", "1.6");
  const project = await save(page, "Download Project");
  expect(project.name).toBe("fire-shockwave.acm-motion.json");
  expect(JSON.parse(project.data.toString())).toMatchObject({ version: "0.4.0", asset: { effect: "fire-shockwave", durationFrames: 48 } });

  await motion.getByRole("button", { name: "Use Volumetric Fireball", exact: true }).click();
  await expect(duration).toHaveValue("11.6");
  await motion.locator('input[type="file"]').setInputFiles({ name: project.name, mimeType: "application/json", buffer: project.data });
  await expect(page.getByRole("img", { name: "Fire Shockwave animation preview" })).toBeVisible();
  await expect(duration).toHaveValue("1.6");
});

test("Special Effects lists Volumetric Fireball and omits retired effects and the Shutterstock reference", async ({ page, baseURL }) => {
  const referenceRequests: string[] = [];
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/__studio/motion-source/")) referenceRequests.push(path);
  });
  const localStatus = new URL(baseURL!).hostname === "localhost" ? page.waitForResponse(response =>
    new URL(response.url()).pathname === "/__studio/motion-export/status") : undefined;
  await page.goto(route, { waitUntil: "commit" });
  await localStatus;
  expect(referenceRequests).toEqual([]);
  const motion = page.getByRole("tabpanel", { name: "Motion Assets", exact: true });
  await expect(motion.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true", { timeout: 30_000 });
  const effects = motion.getByRole("region", { name: "Special Effects" });
  await expect(effects.getByRole("button")).toHaveText(["Volumetric Fireball"]);
  const search = motion.getByRole("searchbox", { name: "Search motion assets" });
  for (const name of ["Fire Burst", "Shockwave", "Shutterstock"]) {
    await search.fill(name);
    await expect(motion.getByText("No matching motion assets.")).toBeVisible();
    await expect(effects).toHaveCount(0);
  }
  await search.fill("");
  const fireball = effects.getByRole("button", { name: "Use Volumetric Fireball", exact: true });
  for (const width of [820, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(fireball).toBeVisible();
    const bounds = await fireball.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
  }
});

test("Sound Effects plays and downloads the original glass explosion", async ({ page }) => {
  await page.goto(route, { waitUntil: "commit" });
  const motion = page.getByRole("tabpanel", { name: "Motion Assets", exact: true });
  await expect(motion.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true", { timeout: 30_000 });
  const sounds = motion.getByRole("region", { name: "Sound Effects", exact: true });
  const audio = sounds.locator("audio");
  await expect(audio).toHaveAccessibleName("Explosion and Glass preview");
  await setNumber(page, "Width (px)", "1100");

  const search = motion.getByRole("searchbox", { name: "Search motion assets" });
  await search.fill("shatter");
  await expect(motion.getByRole("region", { name: "Special Effects" })).toHaveCount(0);
  await expect(sounds.getByText("Explosion and Glass", { exact: true })).toBeVisible();
  await audio.press("Space");
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(false);
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
  await expect(motion.getByRole("region", { name: "Motion preview" }).getByRole("button", { name: "Play", exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Icons", exact: true }).click();
  await page.getByRole("tab", { name: "Motion Assets", exact: true }).click();
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  expect(await audio.evaluate((element: HTMLAudioElement) => element.ended)).toBe(false);
  await expect(motion.getByRole("spinbutton", { name: "Width (px)" })).toHaveValue("1100");

  const detailsTrigger = sounds.getByRole("button", { name: "File Details for explosion-and-glass.wav" });
  await detailsTrigger.press("Enter");
  const details = page.getByRole("dialog", { name: "File Details", exact: true });
  await expect(details.getByText("48 kHz", { exact: true })).toBeVisible();
  await expect(details.getByText("24 bit", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(detailsTrigger).toBeFocused();

  const downloadPending = page.waitForEvent("download");
  await sounds.getByRole("link", { name: "Download WAV for Explosion and Glass" }).click();
  const download = await downloadPending;
  expect(download.suggestedFilename()).toBe("explosion-and-glass.wav");
  const data = await readFile((await download.path())!);
  expect(data.toString("ascii", 0, 4)).toBe("RIFF");
  expect(data.toString("ascii", 8, 12)).toBe("WAVE");
  expect(data.readUInt16LE(22)).toBe(2);
  expect(data.readUInt32LE(24)).toBe(48_000);
  expect(data.readUInt16LE(34)).toBe(24);
  expect(data.readUInt32LE(40) / (48_000 * 6)).toBe(4.1);
});

test("shows Files audio and video in Motion Assets and downloads the original MOV", async ({ page, context }) => {
  test.setTimeout(60_000);
  await page.goto("/studio?mode=files");
  const files = page.getByRole("region", { name: "File manager", exact: true });
  const upload = files.locator('input[type="file"]');
  const wav = await readFile("public/motion-assets/explosion-and-glass.wav");
  const tags = Buffer.concat([Buffer.from("INFO"), ...[
    ["INAM", "Library impact"],
    ["IART", "ACM Audio"],
    ["ICMT", "Synthetic effect for project previews"],
  ].map(([id, text]) => {
    const value = Buffer.from(text + "\0");
    const chunk = Buffer.alloc(8 + value.length + value.length % 2);
    chunk.write(id);
    chunk.writeUInt32LE(value.length, 4);
    value.copy(chunk, 8);
    return chunk;
  })]);
  const listHeader = Buffer.alloc(8);
  listHeader.write("LIST");
  listHeader.writeUInt32LE(tags.length, 4);
  const audioBytes = Buffer.concat([wav, listHeader, tags]);
  audioBytes.writeUInt32LE(audioBytes.length - 8, 4);
  const audio = { name: "library-explosion.wav", mimeType: "audio/wav", buffer: audioBytes };
  const original = { name: "library-fireball.mov", mimeType: "video/quicktime", buffer: Buffer.from("original MOV bytes") };
  const preview = { name: "library-fireball.mp4", mimeType: "video/mp4", buffer: Buffer.from("replacement preview bytes") };
  async function openNewFolder(name: string) {
    await files.getByRole("button", { name: "Folder", exact: true }).click();
    const field = files.getByRole("textbox", { name: "Name", exact: true });
    await expect(field).toHaveValue("Untitled folder");
    await field.fill(name);
    await field.press("Enter");
    await files.getByRole("button", { name, exact: true }).press("Enter");
    await expect(files.getByRole("navigation", { name: "Folder path" }).getByRole("button", { name, exact: true })).toBeVisible();
    await expect(upload).toBeEnabled();
  }
  async function expectAudioFileDetails(view: Page, trigger: Locator) {
    await trigger.press("Enter");
    const dialog = view.getByRole("dialog", { name: "File Details", exact: true });
    for (const field of ["Library impact", "ACM Audio", "Synthetic effect for project previews", "48 kHz", "Stereo (2)", "4.1 s"]) {
      await expect(dialog.getByText(field, { exact: true })).toBeVisible();
    }
    await view.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }

  await expect(upload).toBeEnabled({ timeout: 30_000 });
  await upload.setInputFiles({ ...audio, name: "unrelated.wav" });
  await expect(files.getByText("unrelated.wav", { exact: true })).toBeVisible();
  await openNewFolder("Motion Assets");
  await upload.setInputFiles([audio, original]);
  await expect(files.getByText(original.name, { exact: true })).toBeVisible();
  await files.getByRole("button", { name: /^library-explosion\.wav/ }).click();
  await expectAudioFileDetails(page, files.getByRole("button", { name: "File Details for library-explosion.wav" }));
  await openNewFolder("Previews");
  await upload.setInputFiles(preview);
  await expect(files.getByText(preview.name, { exact: true })).toBeVisible();

  const libraryPage = await context.newPage();
  await libraryPage.goto(route);
  const effects = libraryPage.getByRole("region", { name: "Special Effects", exact: true });
  const sounds = libraryPage.getByRole("region", { name: "Sound Effects", exact: true });
  const video = effects.locator("video");
  const sound = sounds.locator('audio[aria-label="library-explosion.wav preview"]');
  await expect(video).toHaveAccessibleName("library-fireball.mov preview");
  await expect(sound).toBeVisible();
  await expect(sounds.getByText("unrelated.wav", { exact: true })).toHaveCount(0);
  await expect(effects.getByText(preview.name, { exact: true })).toHaveCount(0);
  const audioDetailsTrigger = sounds.getByRole("button", { name: "File Details for library-explosion.wav" });
  await expectAudioFileDetails(libraryPage, audioDetailsTrigger);
  const desktop = libraryPage.viewportSize()!;
  await audioDetailsTrigger.click();
  const audioDetails = libraryPage.getByRole("dialog", { name: "File Details", exact: true });
  await expect(audioDetails.getByText("Synthetic effect for project previews", { exact: true })).toBeVisible();
  for (const width of [820, 320]) {
    await libraryPage.setViewportSize({ width, height: desktop.height });
    expect(await audioDetails.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  await libraryPage.setViewportSize(desktop);
  await audioDetails.getByRole("button", { name: "Close file details" }).click();
  expect(await video.evaluate(element => fetch((element as HTMLVideoElement).src).then(response => response.text()))).toBe(preview.buffer.toString());
  await effects.getByRole("button", { name: "File Details for library-fireball.mov" }).click();
  const videoDetails = libraryPage.getByRole("dialog", { name: "File Details", exact: true });
  await expect(videoDetails.getByText("video/quicktime", { exact: true })).toBeVisible();
  await expect(videoDetails.getByText(`${original.buffer.length} bytes`, { exact: true })).toBeVisible();
  await expect(videoDetails.getByRole("status")).toHaveText("Media metadata couldn’t be read from this file.");
  await videoDetails.getByRole("button", { name: "Close file details" }).click();
  await sound.press("Space");
  await expect.poll(() => sound.evaluate(element => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0);

  const pending = libraryPage.waitForEvent("download");
  await effects.getByRole("link", { name: "Download MOV for library-fireball.mov" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe(original.name);
  expect(await readFile((await download.path())!)).toEqual(original.buffer);

  await files.getByRole("navigation", { name: "Folder path" }).getByRole("button", { name: "Motion Assets", exact: true }).click();
  await files.getByRole("button", { name: /^library-fireball\.mov/ }).click();
  await files.getByRole("combobox", { name: "Folder", exact: true }).selectOption({ label: "All files" });
  await expect(video).toHaveCount(0);
  await expect(sound).toBeVisible();
});

test("Volumetric Fireball renders live and saves editable name, size, and duration", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const draw = WebGL2RenderingContext.prototype.drawArrays;
    WebGL2RenderingContext.prototype.drawArrays = function(mode, first, count) {
      draw.call(this, mode, first, count);
      if (!(this.canvas instanceof HTMLCanvasElement) || !this.canvas.closest(".motion-fireball-artwork")) return;
      const pixel = new Uint8Array(4);
      this.readPixels(this.drawingBufferWidth >> 1, this.drawingBufferHeight >> 1, 1, 1, this.RGBA, this.UNSIGNED_BYTE, pixel);
      this.canvas.dataset.centreAlpha = String(pixel[3]);
    };
  });
  await page.goto(route, { waitUntil: "commit" });
  const motion = page.getByRole("tabpanel", { name: "Motion Assets", exact: true });
  await expect(motion.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true", { timeout: 30_000 });
  const effects = motion.getByRole("region", { name: "Special Effects" });
  await effects.getByRole("button", { name: "Use Volumetric Fireball", exact: true }).press("Enter");
  const preview = motion.getByRole("img", { name: "Volumetric Fireball animation preview" });
  await expect(preview).toHaveAttribute("data-live-render", "true");
  const canvas = preview.locator("canvas");
  const position = motion.getByRole("slider", { name: "Animation position" });
  await position.press("Home");
  await expect(canvas).toHaveAttribute("data-centre-alpha", "0");
  await position.press("ArrowUp");
  await position.press("PageUp");
  await expect.poll(async () => Number(await canvas.getAttribute("data-centre-alpha"))).toBeGreaterThan(100);
  await expect(motion.getByRole("spinbutton", { name: "Duration (s)" })).toHaveValue("11.6");
  await setNumber(page, "Width (px)", "360");
  await setNumber(page, "Height (px)", "640");
  await setNumber(page, "Duration (s)", "2.5");
  await expect(preview).toHaveAttribute("data-preview-width", "360");
  await expect(preview).toHaveAttribute("data-preview-height", "640");
  await expect(position).toHaveAttribute("max", "75");
  await motion.getByRole("textbox", { name: "Name" }).fill("My fireball");
  const project = await save(page, "Download Project");
  expect(project.name).toBe("my-fireball.acm-motion.json");
  expect(JSON.parse(project.data.toString())).toMatchObject({ version: "0.5.0",
    asset: { effect: "volumetric-fireball", name: "My fireball", width: 360, height: 640, durationFrames: 75 } });
  await motion.getByRole("button", { name: "Reset Preview" }).click();
  await expect(preview).toHaveAttribute("data-preview-width", "1920");
  await motion.locator('input[type="file"]').setInputFiles({ name: project.name, mimeType: "application/json", buffer: project.data });
  await expect(motion.getByRole("img", { name: "My fireball animation preview" })).toHaveAttribute("data-preview-height", "640");
});

test("Volumetric Fireball accepts cancellation and exports edited dimensions and duration with alpha", async ({ page }) => {
  test.skip(process.env.STUDIO_TEST_VOLUMETRIC_MOV !== "1", "Requires local Studio, Metal, Swift, and FFmpeg.");
  test.setTimeout(90_000);
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route, { waitUntil: "commit" });
  await page.getByRole("button", { name: "Use Volumetric Fireball", exact: true }).click();
  const exportButton = page.getByRole("button", { name: "Transparent MOV", exact: true });
  const started = page.waitForRequest(request => new URL(request.url()).pathname === "/__studio/motion-export");
  await exportButton.click();
  await started;
  await page.getByRole("button", { name: "Cancel Export" }).click();
  await expect(page.getByRole("status").filter({ hasText: "MOV export cancelled." })).toBeVisible();
  await setNumber(page, "Width (px)", "320");
  await setNumber(page, "Height (px)", "180");
  await setNumber(page, "Duration (s)", "1.2");
  const pending = page.waitForEvent("download");
  await exportButton.click();
  const download = await pending;
  const path = (await download.path())!;
  expect(download.suggestedFilename()).toBe("volumetric-fireball.mov");
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries",
    "stream=width,height,codec_name,profile,pix_fmt,nb_frames", "-of", "json", path]);
  expect(JSON.parse(stdout).streams).toEqual([{ width: 320, height: 180, codec_name: "prores", profile: "4444",
    pix_fmt: expect.stringMatching(/^yuva/), nb_frames: "36" }]);
  const { stdout: alpha } = await run("ffmpeg", ["-v", "error", "-i", path, "-vf",
    "select=eq(n\\,0)+eq(n\\,6)+eq(n\\,35),alphaextract,format=gray", "-fps_mode", "passthrough", "-f", "rawvideo", "pipe:1"],
    { encoding: "buffer" });
  const pixels = 320 * 180;
  expect(alpha.length).toBe(pixels * 3);
  expect(alpha.subarray(0, pixels).every(pixel => pixel === 0)).toBe(true);
  expect(alpha.subarray(pixels, pixels * 2).some(pixel => pixel > 180)).toBe(true);
  expect(alpha.subarray(pixels * 2).every(pixel => pixel === 0)).toBe(true);
});

test("holding a number stepper repeats until release or the field limit", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  const field = page.getByRole("spinbutton", { name: "Width (px)" });
  const increase = page.getByRole("button", { name: "Increase Width (px)" });
  const decrease = page.getByRole("button", { name: "Decrease Width (px)" });
  await page.clock.install();
  await increase.hover();
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 100);
  await page.mouse.down();
  for (const [elapsed, value] of [[400, "801"], [90, "802"], [90, "803"]] as const) {
    await page.clock.runFor(elapsed);
    await expect(field).toHaveValue(value);
  }
  await page.mouse.up();
  await page.clock.runFor(700);
  await expect(field).toHaveValue("803");
  await increase.click();
  await expect(field).toHaveValue("804");
  await expect(increase).toBeFocused();
  await decrease.hover();
  await page.mouse.down();
  for (const [elapsed, value] of [[400, "803"], [90, "802"], [90, "801"]] as const) {
    await page.clock.runFor(elapsed);
    await expect(field).toHaveValue(value);
  }
  await page.mouse.up();
  await expect(field).toHaveValue("801");

  await setNumber(page, "Width (px)", "130");
  await decrease.hover();
  await page.mouse.down();
  await page.clock.runFor(400);
  await expect(field).toHaveValue("129");
  await page.clock.runFor(90);
  await expect(field).toHaveValue("128");
  await page.clock.runFor(400);
  await expect(field).toHaveValue("128");
  await expect(decrease).toBeDisabled();
  await page.mouse.up();
});

test("large number stepper buttons update the preview immediately and respect field limits", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  const button = (direction: string, field: string) => page.getByRole("button", { name: `${direction} ${field}`, exact: true });
  const size = page.getByRole("img", { name: "Wave animation preview" });
  const thickness = size.locator("path");
  const slider = page.getByRole("slider", { name: "Animation position" });

  const increase = button("Increase", "Width (px)");
  expect((await increase.boundingBox())!.width).toBeGreaterThanOrEqual(32);
  await increase.click();
  await expectPreviewSize(size, 801, 800);
  await button("Decrease", "Height (px)").press("Space");
  await expectPreviewSize(size, 801, 799);
  await button("Increase", "Thickness (px)").click();
  await expect(thickness).toHaveAttribute("stroke-width", "10");
  await button("Increase", "Draw time (s)").click();
  await expect(slider).toHaveAttribute("max", "93");
  await button("Decrease", "Hold time (s)").click();
  await expect(slider).toHaveAttribute("max", "90");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();

  await setNumber(page, "Hold time (s)", "0.1");
  await expect(button("Decrease", "Hold time (s)")).toBeDisabled();
  const width = page.getByRole("spinbutton", { name: "Width (px)" });
  await page.locator(".motion-field label").filter({ hasText: /^Width \(px\)$/ }).click();
  await expect(width).toBeFocused();
  await width.fill("129.3");
  await button("Decrease", "Width (px)").dispatchEvent("click");
  await expectPreviewSize(size, 128, 799);
});

test("editing draw or hold time updates the preview while the field is focused and playback is paused", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  await expect(page.getByRole("checkbox", { name: "Autoplay on selection" })).toBeChecked();
  const slider = page.getByRole("slider", { name: "Animation position" });
  const play = page.getByRole("button", { name: "Play", exact: true });
  const path = page.getByRole("img", { name: "Wave animation preview" }).locator("path");
  await slider.press("Home");
  await slider.press("ArrowRight");
  const originalPath = await path.getAttribute("d");
  const draw = page.getByRole("spinbutton", { name: "Draw time (s)" });
  await draw.fill("2.7");
  await expect(draw).toBeFocused();
  await expect(play).toBeVisible();
  await expect(slider).toHaveAttribute("max", "141");
  await expect(slider).toHaveValue("1");
  await expect(path).not.toHaveAttribute("d", originalPath!);
  await slider.press("End");
  const hold = page.getByRole("spinbutton", { name: "Hold time (s)" });
  await hold.fill("0.2");
  await expect(slider).toHaveAttribute("max", "87");
  await hold.press("ArrowDown");
  await expect(hold).toBeFocused();
  await expect(play).toBeVisible();
  await expect(slider).toHaveAttribute("max", "84");
  await expect(slider).toHaveValue("84");
});

for (const initialSize of [300, 800]) {
  test(`resize handles preserve proportions, stretch with Shift, and cancel with Escape at ${initialSize}px`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
    const preview = page.getByRole("img", { name: "Wave animation preview" });
    const corner = page.getByRole("button", { name: "Resize sketch from bottom right" });
    const width = page.getByRole("spinbutton", { name: "Width (px)" });
    const height = page.getByRole("spinbutton", { name: "Height (px)" });
    await setNumber(page, "Width (px)", String(initialSize));
    await setNumber(page, "Height (px)", String(initialSize));
    await expectPreviewSize(preview, initialSize, initialSize);

    async function drag(dx: number, dy: number) {
      await corner.scrollIntoViewIfNeeded();
      const bounds = (await corner.boundingBox())!;
      const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + dx, y + dy, { steps: 4 });
      return { x: x + dx, y: y + dy };
    }

    async function displayedDimensions() {
      const [width, height] = await preview.evaluate(svg => [Number(svg.getAttribute("width")), Number(svg.getAttribute("height"))]);
      return { width, height };
    }

    await drag(24, 10);
    await expect(preview).not.toHaveAttribute("width", String(initialSize));
    const displaying = await displayedDimensions();
    await expect(width).toHaveValue(String(displaying.width));
    await expect(height).toHaveValue(String(displaying.height));
    await expect(page.getByRole("button", { name: "Use Wave", exact: true }).locator("svg"))
      .toHaveAttribute("viewBox", `0 0 ${displaying.width} ${displaying.height}`);
    await page.mouse.up();
    const proportionalWidth = Number(await width.inputValue());
    expect(proportionalWidth).toBeGreaterThan(initialSize);
    await expect(height).toHaveValue(String(proportionalWidth));

    const initialBarTop = await playbackBarTop(page);
    const point = await drag(6, 3);
    const anchored = (await preview.boundingBox())!;
    await page.keyboard.down("Shift");
    await page.mouse.move(point.x + 26, point.y + 8);
    const free = await displayedDimensions();
    expect(free.width).toBeGreaterThan(free.height);
    await page.keyboard.up("Shift");
    await page.mouse.move(point.x + 34, point.y + 12);
    const relocked = await displayedDimensions();
    expect(relocked.width / relocked.height).toBeCloseTo(free.width / free.height, 2);
    const moved = (await preview.boundingBox())!;
    expect(moved.x).toBeCloseTo(anchored.x, 1);
    if (initialSize === 300) expect(moved.y).toBeCloseTo(anchored.y, 1);
    expect(await playbackBarTop(page)).toBeCloseTo(initialBarTop, 0);
    await page.mouse.up();
    expect(await playbackBarTop(page)).toBeCloseTo(initialBarTop, 0);
    const released = (await preview.boundingBox())!;
    expect(released.x).toBeCloseTo(moved.x, 0);
    expect(released.y).toBeCloseTo(moved.y, 0);
    expect(released.width).toBeCloseTo(moved.width, 0);
    expect(released.height).toBeCloseTo(moved.height, 0);
    const stretchedWidth = Number(await width.inputValue());
    const stretchedHeight = Number(await height.inputValue());
    expect(stretchedWidth).toBeGreaterThan(stretchedHeight);
    expect(stretchedHeight).toBeGreaterThan(proportionalWidth);

    await drag(-18, -16);
    await expect(preview).not.toHaveAttribute("width", String(stretchedWidth));
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expectPreviewSize(preview, stretchedWidth, stretchedHeight);

    await page.getByRole("button", { name: "Resize sketch from right middle" }).press("Shift+ArrowRight");
    await expect(width).toHaveValue(String(stretchedWidth + 10));
    await expect(height).toHaveValue(String(stretchedHeight));
    const exported = await save(page, "Download Project");
    expect(JSON.parse(exported.data.toString()).asset).toMatchObject({ width: stretchedWidth + 10, height: stretchedHeight });
});
}

test("moves the sketch by dragging or keyboard and restores its position on Escape and Reset", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  await setNumber(page, "Width (px)", "350");
  await setNumber(page, "Height (px)", "350");
  const sketch = page.getByRole("group", { name: "Move sketch with the arrow keys" });
  await sketch.scrollIntoViewIfNeeded();
  const start = (await sketch.boundingBox())!;
  const bar = await playbackBarTop(page);
  const x = start.x + start.width / 2;
  const y = start.y + start.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 20, { steps: 4 });
  await page.mouse.up();
  const moved = (await sketch.boundingBox())!;
  expect(moved.x).toBeCloseTo(start.x + 40, 0);
  expect(moved.y).toBeCloseTo(start.y + 20, 0);
  expect(moved.width).toBe(start.width);
  expect(moved.height).toBe(start.height);
  expect(await playbackBarTop(page)).toBeCloseTo(bar, 0);

  await page.mouse.down();
  await page.mouse.move(x + 95, y + 20);
  expect((await sketch.boundingBox())!.x).toBeGreaterThan(moved.x);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect.poll(() => sketch.boundingBox()).toEqual(moved);
  await sketch.press("Shift+ArrowLeft");
  expect((await sketch.boundingBox())!.x).toBeCloseTo(moved.x - 10, 0);

  await page.mouse.move(x + 30, y + 20);
  await page.mouse.down();
  await page.mouse.move(0, y + 20);
  await page.mouse.up();
  const stage = (await page.locator(".motion-stage").boundingBox())!;
  const atEdge = (await sketch.boundingBox())!;
  expect(atEdge.x).toBeCloseTo(stage.x + 10, 0);
  await expect(page.getByRole("button", { name: "Resize sketch from left middle" })).toBeVisible();

  const exported = await save(page, "Download Project");
  expect(JSON.parse(exported.data.toString()).asset).toEqual(motionProject({ ...motionPreset("wave"), width: 350, height: 350 }).asset);
  await page.getByRole("button", { name: "Reset Preview" }).click();
  await expectPreviewSize(page.getByRole("img", { name: "Wave animation preview" }), 800, 800);
  await expect(sketch).not.toHaveAttribute("style");
});

test("the resize box hugs the finished stroke and stays fixed while the padded asset plays", async ({ page }) => {
  await page.setViewportSize({ width: 780, height: 920 });
  await page.goto(route);
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  await page.getByRole("button", { name: "Use Chevron", exact: true }).click();
  await setNumber(page, "Width (px)", "611");
  await setNumber(page, "Height (px)", "155");
  const slider = page.getByRole("slider", { name: "Animation position" });
  await slider.press("End");
  const sketch = page.getByRole("group", { name: "Move sketch with the arrow keys" });
  const path = sketch.locator("path");
  const fullPath = await path.getAttribute("d");
  const frame = (await sketch.boundingBox())!;
  const ink = (await path.boundingBox())!;
  expect(ink.x - frame.x).toBeLessThan(16);
  expect(frame.x + frame.width - (ink.x + ink.width)).toBeLessThan(16);
  expect(ink.y - frame.y).toBeLessThan(16);
  expect(frame.y + frame.height - (ink.y + ink.height)).toBeLessThan(16);
  const handle = page.getByRole("button", { name: "Resize sketch from bottom right" });
  const handleBounds = await handle.boundingBox();
  await slider.press("Home");
  await expect(path).toHaveCount(0);
  expect(await sketch.boundingBox()).toEqual(frame);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(path).toBeVisible();
  await expect(path).not.toHaveAttribute("d", fullPath!);
  expect(await sketch.boundingBox()).toEqual(frame);
  expect(await handle.boundingBox()).toEqual(handleBounds);

  const svg = await save(page, "SVG");
  expect(svg.data.toString()).toContain('viewBox="0 0 611 155"');
  expect(svg.data.toString()).toContain(`d="${fullPath}"`);
  const lottie = await save(page, "Lottie JSON");
  expect(JSON.parse(lottie.data.toString())).toMatchObject({ w: 611, h: 155 });
});

test("a fitted sketch shrinks immediately on a narrow preview without moving its opposite edge", async ({ page }) => {
  await page.setViewportSize({ width: 780, height: 920 });
  await page.goto(route);
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  await setNumber(page, "Height (px)", "155");
  await setNumber(page, "Width (px)", "611");
  const preview = page.getByRole("img", { name: "Wave animation preview" });
  const handle = page.getByRole("button", { name: "Resize sketch from right middle" });
  await handle.scrollIntoViewIfNeeded();

  async function stretch(dx: number) {
    const box = (await handle.boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.keyboard.down("Shift");
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y, { steps: 5 });
    const during = (await preview.boundingBox())!;
    await page.mouse.up();
    await page.keyboard.up("Shift");
    return during;
  }

  await stretch(150);
  const fitted = (await preview.boundingBox())!;
  const grown = Number(await page.getByRole("spinbutton", { name: "Width (px)" }).inputValue());
  expect(grown).toBeGreaterThan(611);
  const during = await stretch(-24);
  const shrunk = (await preview.boundingBox())!;
  expect(shrunk).toEqual(during);
  expect(shrunk.width).toBeLessThan(fitted.width - 20);
  expect(shrunk.x).toBeCloseTo(fitted.x, 0);
  expect(shrunk.y).toBeCloseTo(fitted.y, 0);
});

test("a thin sketch keeps reachable resize handles in a narrow preview", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(route);
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  await page.getByRole("button", { name: "Use Line", exact: true }).click();
  await setNumber(page, "Width (px)", "1920");
  await expect(page.getByRole("button", { name: /^Resize sketch from/ })).toHaveCount(2);
  const right = page.getByRole("button", { name: "Resize sketch from right middle", exact: true });
  await right.press("Shift+ArrowLeft");
  await expect(page.getByRole("spinbutton", { name: "Width (px)" })).toHaveValue("1910");
  await expect(right).toBeFocused();

  await page.getByRole("button", { name: "Use Chevron", exact: true }).click();
  await setNumber(page, "Height (px)", "171");
  await setNumber(page, "Width (px)", "1920");
  await page.getByRole("button", { name: "Resize sketch from bottom right", exact: true }).press("Shift+ArrowUp");
  await expect(page.getByRole("spinbutton", { name: "Height (px)" })).toHaveValue("161");
  await expect(right).toBeFocused();
});

test("settings and spectrum gestures update the preview and active sketch thumbnail live", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  const name = page.getByRole("textbox", { name: "Name", exact: true });
  await name.fill("Edited wave");
  await expect(name).toBeFocused();
  const sketch = page.getByRole("button", { name: "Use Edited wave", exact: true });
  const preview = page.getByRole("img", { name: "Edited wave animation preview" });
  await expect(sketch).toBeVisible();
  await expect(preview).toBeVisible();

  const width = page.getByRole("spinbutton", { name: "Width (px)" });
  await width.fill("500");
  await expect(width).toBeFocused();
  await expectPreviewSize(preview, 500, 800);
  await page.getByRole("spinbutton", { name: "Height (px)" }).fill("494");
  await expect(sketch.locator("svg")).toHaveAttribute("viewBox", "0 0 500 494");
  const thickness = page.getByRole("spinbutton", { name: "Thickness (px)" });
  await thickness.fill("24");
  await expect(thickness).toBeFocused();
  await expect(preview.locator("path")).toHaveAttribute("stroke-width", "24");
  await expect(sketch.locator("path")).toHaveAttribute("stroke-width", "24");

  await page.getByRole("button", { name: "Choose Stroke colour" }).click();
  await page.getByRole("button", { name: /custom stroke colour picker/i }).click();
  const hex = page.getByRole("textbox", { name: "Hex colour" });
  await hex.fill("3030D0");
  await expect(hex).toBeFocused();
  await expect(sketch.locator("path")).toHaveAttribute("stroke", "#3030D0");
  await expect(preview.locator("path")).toHaveAttribute("stroke", "#3030D0");
  const plane = page.getByRole("slider", { name: "Colour saturation and brightness" });
  const bounds = (await plane.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * 0.4, bounds.y + bounds.height * 0.2);
  await page.mouse.down();
  await expect(preview.locator("path")).not.toHaveAttribute("stroke", "#3030D0");
  const initialStroke = (await preview.locator("path").getAttribute("stroke"))!;
  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.5);
  await expect(preview.locator("path")).not.toHaveAttribute("stroke", initialStroke);
  const finalStroke = (await preview.locator("path").getAttribute("stroke"))!;
  await expect(sketch.locator("path")).toHaveAttribute("stroke", finalStroke);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.mouse.up();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Use Circle", exact: true }).click();
  await expect(sketch.locator("path")).toHaveAttribute("stroke", finalStroke);
});

test("the Lottie SVG player reveals separate strokes in order", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  await page.getByRole("button", { name: "Use Double line", exact: true }).click();
  const file = await save(page, "Lottie JSON");
  await page.setContent('<div id="example"></div>');
  await page.addScriptTag({ path: require.resolve("lottie-web/build/player/lottie_light.min.js") });
  const lengths = await page.locator("#example").evaluate(async (container, animationData) => {
    const { lottie } = window as unknown as { lottie: typeof import("lottie-web").default };
    const player = lottie.loadAnimation({ container, renderer: "svg", loop: false, autoplay: false, animationData });
    await new Promise<void>(resolve => player.addEventListener("DOMLoaded", () => resolve()));
    const paths = [...container.querySelectorAll<SVGPathElement>('path[stroke-width="9"]')];
    return [10, 20, 30, 89].map(frame => {
      player.goToAndStop(frame, true);
      return paths.map(path => ({ length: path.getTotalLength(), y: path.getBBox().y }));
    });
  }, JSON.parse(file.data.toString()));
  const [first, second, complete, held] = lengths;
  const firstStroke = first.findIndex(path => path.length > 0);
  expect(firstStroke).toBeGreaterThanOrEqual(0);
  const secondStroke = 1 - firstStroke;
  expect(first[secondStroke].length).toBe(0);
  expect(second[firstStroke].length).toBeCloseTo(complete[firstStroke].length);
  expect(second[secondStroke].length).toBeGreaterThan(0);
  expect(complete[firstStroke].y).toBeLessThan(complete[secondStroke].y);
  expect(held).toEqual(complete);
});

test("round-trips a widened wave, protects imported edits, and rejects invalid SVG", async ({ page }, info) => {
  await page.goto(route);
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  await setNumber(page, "Width (px)", "1600");
  const image = page.getByRole("img", { name: "Wave animation preview" });
  await expectPreviewSize(image, 1600, 800);
  await expect(image.locator("path")).toHaveAttribute("stroke-width", "9");
  const slider = page.getByRole("slider", { name: "Animation position" });
  await slider.press("Home");
  await expect(image.locator("path")).toHaveCount(0);
  await slider.press("ArrowRight");
  await expect(image.locator("path")).toHaveCount(1);
  const project = await save(page, "Download Project");
  expect(project.name).toBe("wave.acm-motion.json");
  await page.getByRole("button", { name: "Use Circle" }).click();
  await expect(page.getByRole("img", { name: "Circle animation preview" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: project.name, mimeType: "application/json", buffer: project.data });
  await expectPreviewSize(image, 1600, 800);
  await setNumber(page, "Width (px)", "1400");
  await page.getByRole("button", { name: "Use Circle" }).click();
  await expect(page.getByRole("dialog", { name: "Replace this project?" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Use Circle" })).toBeFocused();
  await expectPreviewSize(image, 1400, 800);
  await page.getByRole("button", { name: "Reset Preview" }).click();
  await expectPreviewSize(image, 1600, 800);
  await page.locator('input[type="file"]').setInputFiles({ name: "invalid.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><script/><path d="M1 1 L19 19"/></svg>') });
  await expect(page.getByRole("alert")).toContainText("one untransformed path");
  await expectPreviewSize(image, 1600, 800);
  await slider.press("End");
  await page.screenshot({ path: info.outputPath("wide-wave.png") });
  await setNumber(page, "Width (px)", "1400");
  await page.getByRole("button", { name: "Use Circle" }).click();
  await page.getByRole("button", { name: "Replace Project" }).click();
  await expect(page.getByRole("region", { name: "Motion preview" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

for (const view of ["desktop", "tablet", "mobile"] as const) {
  test.describe(view, () => {
    if (view === "tablet") test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true });
    if (view === "mobile") {
      const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } = devices["Pixel 7"];
      test.use({ viewport, deviceScaleFactor, isMobile, hasTouch, userAgent, reducedMotion: "reduce" });

      test("touch-holding a number stepper repeats and stops on release", async ({ page }) => {
        await page.goto(route);
        await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
        const decrease = page.getByRole("button", { name: "Decrease Width (px)" });
        await decrease.scrollIntoViewIfNeeded();
        const box = (await decrease.boundingBox())!;
        const touch = await page.context().newCDPSession(page);
        await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
        const field = page.getByRole("spinbutton", { name: "Width (px)" });
        await expect.poll(async () => Number(await field.inputValue())).toBeLessThanOrEqual(798);
        await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        const released = await field.inputValue();
        await page.clock.install();
        await page.clock.runFor(700);
        await expect(field).toHaveValue(released);
      });

      test("a touch drag resizes proportionally and the size fields allow independent dimensions", async ({ page }) => {
        await page.goto(route);
        const corner = page.getByRole("button", { name: "Resize sketch from bottom right" });
        await corner.scrollIntoViewIfNeeded();
        const bounds = (await corner.boundingBox())!;
        const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
        const touch = await page.context().newCDPSession(page);
        await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 24, y: y - 16 }] });
        await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        const height = page.getByRole("spinbutton", { name: "Height (px)" });
        const width = page.getByRole("spinbutton", { name: "Width (px)" });
        const resized = Number(await width.inputValue());
        expect(resized).toBeLessThan(800);
        await expect(height).toHaveValue(String(resized));
        await setNumber(page, "Width (px)", "900");
        await expect(height).toHaveValue(String(resized));

        const sketch = page.getByRole("group", { name: "Move sketch with the arrow keys" });
        await sketch.scrollIntoViewIfNeeded();
        const beforeMove = (await sketch.boundingBox())!;
        const centre = { x: beforeMove.x + beforeMove.width / 2, y: beforeMove.y + beforeMove.height / 2 };
        await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [centre] });
        await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...centre, y: centre.y + 24 }] });
        await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await expect.poll(async () => (await sketch.boundingBox())!.y).toBeCloseTo(beforeMove.y + 24, 0);
        await expect(width).toHaveValue("900");
      });
    }

    test("keeps the playback bar in place as the sketch is resized", async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
      const drawing = page.getByRole("img", { name: "Wave animation preview" });
      const initialTop = await playbackBarTop(page);
      const drawingHeight = () => drawing.evaluate(element => element.getBoundingClientRect().height);
      const initialHeight = await drawingHeight();
      const height = page.getByRole("spinbutton", { name: "Height (px)" });

      await height.fill("200");
      await expectPreviewSize(drawing, 800, 200);
      await expect.poll(drawingHeight).toBeLessThan(initialHeight);
      expect(await playbackBarTop(page)).toBeCloseTo(initialTop, 0);
      await height.press("Enter");
      expect(await playbackBarTop(page)).toBeCloseTo(initialTop, 0);

      await page.getByRole("button", { name: "Reset Preview" }).click();
      await expectPreviewSize(drawing, 800, 800);
      expect(await playbackBarTop(page)).toBeCloseTo(initialTop, 0);
    });

    test("exports an oval with the same timing and geometry in the Lottie SVG player", async ({ page }, info) => {
      await page.goto(route);
      await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
      await page.getByRole("button", { name: "Use Circle" }).click();
      await setNumber(page, "Width (px)", "1200");
      await setNumber(page, "Height (px)", "480");
      await setNumber(page, "Draw time (s)", "1.5");
      await expect(page.getByRole("button", { name: /^Resize sketch from/ })).toHaveCount(8);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect.poll(() => page.getByRole("tab", { name: "Motion Assets" }).evaluate(tab => {
        const bounds = tab.getBoundingClientRect();
        const strip = tab.parentElement!.getBoundingClientRect();
        return bounds.left >= strip.left - 1 && bounds.right <= strip.right + 1;
      })).toBe(true);
      if (view !== "desktop") await page.screenshot({ fullPage: true, path: info.outputPath(`${view}-oval.png`) });
      const file = await save(page, "Lottie JSON");
      const svg = await save(page, "SVG");
      const animation = JSON.parse(file.data.toString());
      expect(animation).toMatchObject({ w: 1200, h: 480, nm: "Circle", op: 105 });
      await page.setContent('<div id="example" style="width: 100%; aspect-ratio: 2.5"></div>');
      await page.locator("#example").evaluate((container, imageSvg) => {
        const img = document.createElement("img");
        img.alt = "";
        img.src = "data:image/svg+xml," + encodeURIComponent(imageSvg);
        container.append(img);
      }, svg.data.toString());
      await page.addScriptTag({ path: require.resolve("lottie-web/build/player/lottie_light.min.js") });

      const render = () => page.evaluate(async ({ animationData, expectedPath }) => {
        const example = document.querySelector<HTMLElement>("#example")!;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return { poster: !!example.querySelector("img") };
        const holder = document.createElement("div");
        example.replaceChildren(holder);
        const { lottie } = window as unknown as { lottie: typeof import("lottie-web").default };
        const player = lottie.loadAnimation({ container: holder, renderer: "svg", loop: false, autoplay: false, animationData });
        await new Promise<void>(resolve => player.addEventListener("DOMLoaded", () => resolve()));
        player.goToAndStop(22, true);
        const actual = holder.querySelector<SVGPathElement>('path[stroke-width="9"]')!;
        const reference = document.createElementNS("http://www.w3.org/2000/svg", "path");
        reference.setAttribute("d", expectedPath);
        const partialPath = actual.getAttribute("d");
        const actualTip = actual.getPointAtLength(actual.getTotalLength());
        const expectedTip = reference.getPointAtLength(reference.getTotalLength());
        player.goToAndStop(45, true);
        const final = actual.getBBox();
        player.goToAndStop(104, true);
        return { error: Math.hypot(actualTip.x - expectedTip.x, actualTip.y - expectedTip.y),
          width: final.width, height: final.height, held: actual.getBBox().width === final.width, partialPath, expectedPath };
      }, { animationData: animation, expectedPath: motionGeometry({
        ...motionPreset("circle"), width: 1200, height: 480, drawFrames: 45,
      }).pathAt(22) });
      if (view === "mobile") {
        expect(await render()).toEqual({ poster: true });
        await page.emulateMedia({ reducedMotion: "no-preference" });
      }
      const result = await render();
      expect(result.error, JSON.stringify(result)).toBeLessThan(3);
      expect(result.width).toBeGreaterThan(1050);
      expect(result.height).toBeGreaterThan(380);
      expect(result.held).toBe(true);
      await info.attach("lottie-oval", { body: await page.locator("#example").screenshot(), contentType: "image/png" });
    });
  });
}

test("missing FFmpeg explains the unavailable MOV export", async ({ page }) => {
  await page.route("**/__studio/motion-export/status", route => route.fulfill({
    json: { available: false, error: "Install FFmpeg with the ProRes 4444 encoder to export MOV in local Studio." },
  }));
  await page.goto(route);
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  await expect(page.getByText("Install FFmpeg", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Transparent MOV" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Lottie JSON" })).toBeEnabled();
});

test("exports a ProRes 4444 MOV with clear, partial, and held frames", async ({ page }, info) => {
  test.skip(process.env.STUDIO_TEST_MOV !== "1", "Requires local Studio and FFmpeg.");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  await page.goto(route);
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  await setNumber(page, "Width (px)", "1600");
  const exportButton = page.getByRole("button", { name: "Transparent MOV" });
  await expect(exportButton).toBeEnabled();
  const pending = page.waitForEvent("download");
  await exportButton.click();
  const file = await pending;
  const path = await file.path();
  expect(file.suggestedFilename()).toBe("wave.mov");
  const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height,codec_name,profile,pix_fmt,nb_frames", "-of", "json", path!]);
  expect(JSON.parse(stdout).streams[0]).toMatchObject({ width: 1600, height: 800,
    codec_name: "prores", profile: "4444", pix_fmt: expect.stringMatching(/^yuva/), nb_frames: "90" });

  const width = 1600, height = 800;
  const { stdout: alpha } = await run("ffmpeg", ["-v", "error", "-i", path!, "-vf",
    "select=eq(n\\,0)+eq(n\\,15)+eq(n\\,30)+eq(n\\,89),alphaextract,format=gray",
    "-fps_mode", "passthrough", "-f", "rawvideo", "pipe:1"], { encoding: "buffer", maxBuffer: 6_000_000 });
  const pixels = width * height;
  expect(alpha.length).toBe(pixels * 4);
  const bounds = (step: number) => {
    const frame = alpha.subarray(step * pixels, (step + 1) * pixels);
    let right = -1, top = height, crest = 0;
    for (let i = 0; i < frame.length; i++) {
      if (frame[i] > 127) {
        right = Math.max(right, i % width);
        if (Math.floor(i / width) < top) { top = Math.floor(i / width); crest = i % width; }
      }
    }
    let thickness = 0;
    for (let y = top; y < height && frame[y * width + crest] > 127; y++) thickness++;
    return { right, thickness };
  };
  expect(bounds(0).right).toBe(-1);
  expect(bounds(1).right).toBeGreaterThan(700);
  expect(bounds(1).right).toBeLessThan(900);
  expect(bounds(2).right).toBeGreaterThan(1500);
  expect(bounds(2).thickness).toBe(9);
  expect(alpha.subarray(pixels * 2, pixels * 3).equals(alpha.subarray(pixels * 3))).toBe(true);
  await info.attach("transparent-wave", { path: path!, contentType: "video/quicktime" });
});

test("exports Fire Burst as a widescreen MOV with genuinely transparent frames and edges", async ({ page }, info) => {
  test.skip(process.env.STUDIO_TEST_MOV !== "1", "Requires local Studio and FFmpeg.");
  test.setTimeout(80_000);
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  await page.goto(route);
  await openLegacyFireProject(page, fireBurst, "0.3.0");
  const exportButton = page.getByRole("button", { name: "Transparent MOV" });
  await expect(exportButton).toBeEnabled();
  const pending = page.waitForEvent("download");
  await exportButton.click();
  const file = await pending;
  const path = (await file.path())!;
  expect(file.suggestedFilename()).toBe("fire-burst.mov");
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries",
    "stream=width,height,codec_name,profile,pix_fmt,nb_frames,r_frame_rate", "-of", "json", path]);
  expect(JSON.parse(stdout).streams).toEqual([{
    width: 1920, height: 1080, codec_name: "prores", profile: "4444", pix_fmt: expect.stringMatching(/^yuva/),
    nb_frames: "60", r_frame_rate: "30/1",
  }]);
  const width = 160, height = 90;
  const { stdout: alpha } = await run("ffmpeg", ["-v", "error", "-i", path, "-vf",
    `select=eq(n\\,0)+eq(n\\,13)+eq(n\\,42)+eq(n\\,59),alphaextract,scale=${width}:${height},format=gray`,
    "-fps_mode", "passthrough", "-f", "rawvideo", "pipe:1"], { encoding: "buffer" });
  const pixels = width * height;
  expect(alpha.length).toBe(pixels * 4);
  const [first, peak, smoke, last] = [0, 1, 2, 3].map(index => alpha.subarray(pixels * index, pixels * (index + 1)));
  expect(first.every(pixel => pixel === 0)).toBe(true);
  expect(last.every(pixel => pixel === 0)).toBe(true);
  expect(peak.some(pixel => pixel > 230)).toBe(true);
  expect(smoke.some(pixel => pixel > 32 && pixel < 160)).toBe(true);
  for (const frame of [peak, smoke]) {
    for (const corner of [0, width - 1, pixels - width, pixels - 1]) expect(frame[corner]).toBe(0);
  }
  await info.attach("transparent-fire-burst", { path, contentType: "video/quicktime" });
});

test("exports a Fire Shockwave that reaches all four corners and reveals the centre as it recedes", async ({ page }, info) => {
  test.skip(process.env.STUDIO_TEST_MOV !== "1", "Requires local Studio and FFmpeg.");
  test.setTimeout(80_000);
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  await page.goto(route);
  await openLegacyFireProject(page, fireShockwave, "0.4.0");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Transparent MOV" }).click();
  const file = await pending;
  const path = (await file.path())!;
  expect(file.suggestedFilename()).toBe("fire-shockwave.mov");
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries",
    "stream=width,height,codec_name,profile,pix_fmt,nb_frames,r_frame_rate", "-of", "json", path]);
  expect(JSON.parse(stdout).streams).toEqual([{
    width: 1920, height: 1080, codec_name: "prores", profile: "4444", pix_fmt: expect.stringMatching(/^yuva/),
    nb_frames: "60", r_frame_rate: "30/1",
  }]);
  const width = 160, height = 90, pixels = width * height;
  const { stdout: alpha } = await run("ffmpeg", ["-v", "error", "-i", path, "-vf",
    `select=eq(n\\,0)+eq(n\\,11)+eq(n\\,20)+eq(n\\,59),alphaextract,scale=${width}:${height},format=gray`,
    "-fps_mode", "passthrough", "-f", "rawvideo", "pipe:1"], { encoding: "buffer" });
  expect(alpha.length).toBe(pixels * 4);
  const [first, peak, receding, last] = [0, 1, 2, 3].map(index => alpha.subarray(pixels * index, pixels * (index + 1)));
  expect(first.every(pixel => pixel === 0)).toBe(true);
  expect(last.every(pixel => pixel === 0)).toBe(true);
  for (const corner of [0, width - 1, pixels - width, pixels - 1]) expect(peak[corner]).toBeGreaterThan(75);
  const centre = Math.floor(height / 2) * width + width / 2;
  expect(peak[centre]).toBeGreaterThan(128);
  expect(receding[centre]).toBeLessThan(10);
  expect(receding.some(pixel => pixel > 100)).toBe(true);
  await info.attach("transparent-fire-shockwave", { path, contentType: "video/quicktime" });
});

test("the local bridge rejects foreign and invalid requests and recovers after cancellation", async ({ page, request, baseURL }) => {
  test.skip(process.env.STUDIO_TEST_MOV !== "1", "Requires local Studio and FFmpeg.");
  const endpoint = "/__studio/motion-export";
  const headers = { origin: new URL(baseURL!).origin, "Content-Type": "application/json", "X-Studio-Client": "motion-assets" };
  const project = motionProject(motionPreset("wave"));
  const post = (data: unknown, origin = headers.origin) => request.post(endpoint, { headers: { ...headers, origin, Connection: "close" }, data });
  expect((await post(project, "http://example.test")).status()).toBe(403);
  expect((await post({ ...project, asset: { ...project.asset, width: 9999 } })).status()).toBe(400);
  expect((await post({ path: "M0 0 " + "L1 1 ".repeat(5000) })).status()).toBe(413);

  await page.goto(route);
  await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
  await setNumber(page, "Width (px)", "1920");
  await setNumber(page, "Height (px)", "1080");
  await setNumber(page, "Draw time (s)", "8");
  const started = page.waitForRequest(req => new URL(req.url()).pathname === endpoint);
  await page.getByRole("button", { name: "Transparent MOV" }).click();
  await started;
  await page.getByRole("button", { name: "Cancel Export" }).click();
  await expect(page.getByRole("status").filter({ hasText: "MOV export cancelled." })).toBeVisible();
  // The browser may be ready for another export while the bridge is still stopping FFmpeg.
  const sketch = motionCatalogue.find(asset => asset.name === "Double line")!;
  await expect.poll(async () => {
    return (await post(motionProject({ ...sketch, width: 128, height: 128, drawFrames: 12, holdFrames: 3 }))).status();
  }, { timeout: 10000 }).toBe(200);
});
