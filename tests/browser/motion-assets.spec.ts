import { expect, test, devices, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { motionGeometry, motionPreset, motionProject } from "../../app/studio/motion-assets/motion-asset";
import { motionCatalogue } from "../../app/studio/motion-assets/motion-catalogue";

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
  await expect(page.getByRole("img", { name: "Wave animation preview" })).toHaveAttribute("viewBox", "0 0 1600 800");

  await iconsTab.click();
  await expect(page.getByRole("heading", { name: "Motion Assets", level: 1 })).toBeHidden();
  await page.goBack();
  await expect(motionTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("img", { name: "Wave animation preview" })).toHaveAttribute("viewBox", "0 0 1600 800");
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
  await expect(wave).toHaveAttribute("viewBox", "0 0 1200 800");
  await width.fill("1400");
  await page.getByRole("button", { name: "Reset Preview" }).dispatchEvent("click");
  await expect(width).toHaveValue("800");
  await expect(wave).toHaveAttribute("viewBox", "0 0 800 800");
  await expect(play).toBeVisible();
  expect(await page.evaluate(() => window.dispatchEvent(new Event("beforeunload", { cancelable: true })))).toBe(true);
  await page.getByRole("button", { name: "Use Smile", exact: true }).click();
  const drawing = page.getByRole("img", { name: "Smile animation preview" }).locator("path");
  await expect(drawing).toHaveAttribute("d", /M.*M.*M.*M/);
  await expect(slider).toHaveValue("90");
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

test("resize handles preserve proportions, stretch with Shift, and cancel with Escape", async ({ page }) => {
  await page.goto(route);
  const preview = page.getByRole("img", { name: "Wave animation preview" });
  const corner = page.getByRole("button", { name: "Resize sketch from bottom right" });
  const width = page.getByRole("spinbutton", { name: "Width (px)" });
  const height = page.getByRole("spinbutton", { name: "Height (px)" });

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
    const [, , width, height] = (await preview.getAttribute("viewBox"))!.split(" ").map(Number);
    return { width, height };
  }

  await drag(24, 10);
  await expect(preview).not.toHaveAttribute("viewBox", "0 0 800 800");
  const displaying = await displayedDimensions();
  await expect(width).toHaveValue(String(displaying.width));
  await expect(height).toHaveValue(String(displaying.height));
  await expect(page.getByRole("button", { name: "Use Wave", exact: true }).locator("svg"))
    .toHaveAttribute("viewBox", `0 0 ${displaying.width} ${displaying.height}`);
  await page.mouse.up();
  const proportionalWidth = Number(await width.inputValue());
  expect(proportionalWidth).toBeGreaterThan(800);
  await expect(height).toHaveValue(String(proportionalWidth));

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
  expect(moved.y).toBeCloseTo(anchored.y, 1);
  await page.mouse.up();
  const stretchedWidth = Number(await width.inputValue());
  const stretchedHeight = Number(await height.inputValue());
  expect(stretchedWidth).toBeGreaterThan(stretchedHeight);
  expect(stretchedHeight).toBeGreaterThan(proportionalWidth);

  await drag(-18, -16);
  await expect(preview).not.toHaveAttribute("viewBox", `0 0 ${stretchedWidth} ${stretchedHeight}`);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(preview).toHaveAttribute("viewBox", `0 0 ${stretchedWidth} ${stretchedHeight}`);

  await page.getByRole("button", { name: "Resize sketch from right middle" }).press("Shift+ArrowRight");
  await expect(width).toHaveValue(String(stretchedWidth + 10));
  await expect(height).toHaveValue(String(stretchedHeight));
  const exported = await save(page, "Download Project");
  expect(JSON.parse(exported.data.toString()).asset).toMatchObject({ width: stretchedWidth + 10, height: stretchedHeight });
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
  await expect(preview).toHaveAttribute("viewBox", "0 0 500 800");
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
  await expect(image).toHaveAttribute("viewBox", "0 0 1600 800");
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
  await expect(image).toHaveAttribute("viewBox", "0 0 1600 800");
  await setNumber(page, "Width (px)", "1400");
  await page.getByRole("button", { name: "Use Circle" }).click();
  await expect(page.getByRole("dialog", { name: "Replace this project?" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Use Circle" })).toBeFocused();
  await expect(image).toHaveAttribute("viewBox", "0 0 1400 800");
  await page.getByRole("button", { name: "Reset Preview" }).click();
  await expect(image).toHaveAttribute("viewBox", "0 0 1600 800");
  await page.locator('input[type="file"]').setInputFiles({ name: "invalid.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><script/><path d="M1 1 L19 19"/></svg>') });
  await expect(page.getByRole("alert")).toContainText("one untransformed path");
  await expect(image).toHaveAttribute("viewBox", "0 0 1600 800");
  await slider.press("End");
  await page.screenshot({ path: info.outputPath("wide-wave.png") });
});

for (const view of ["desktop", "tablet", "mobile"] as const) {
  test.describe(view, () => {
    if (view === "tablet") test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true });
    if (view === "mobile") {
      const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } = devices["Pixel 7"];
      test.use({ viewport, deviceScaleFactor, isMobile, hasTouch, userAgent, reducedMotion: "reduce" });

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
      });
    }

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
