import { expect, test, devices, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { motionGeometry, motionPreset, motionProject } from "../../app/studio/motion-assets/motion-asset";

const require = createRequire(import.meta.url);
const route = "/studio/motion-assets";

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

test("round-trips a widened wave, protects an edit, and rejects invalid SVG", async ({ page }, info) => {
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
  await page.getByRole("button", { name: "Use Circle" }).click();
  await expect(page.getByRole("dialog", { name: "Replace this project?" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Use Circle" })).toBeFocused();
  const project = await save(page, "Download Project");
  expect(project.name).toBe("wave.acm-motion.json");
  await page.getByRole("button", { name: "Use Circle" }).click();
  await expect(page.getByRole("img", { name: "Circle animation preview" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: project.name, mimeType: "application/json", buffer: project.data });
  await expect(image).toHaveAttribute("viewBox", "0 0 1600 800");
  await page.locator('input[type="file"]').setInputFiles({ name: "invalid.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><script/><path d="M1 1 L19 19"/></svg>') });
  await expect(page.getByRole("alert")).toContainText("one untransformed path");
  await expect(image).toHaveAttribute("viewBox", "0 0 1600 800");
  await slider.press("End");
  await page.screenshot({ path: info.outputPath("wide-wave.png") });
});

for (const view of ["desktop", "mobile"] as const) {
  test.describe(view, () => {
    if (view === "mobile") {
      const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } = devices["Pixel 7"];
      test.use({ viewport, deviceScaleFactor, isMobile, hasTouch, userAgent, reducedMotion: "reduce" });
    }

    test("exports an oval with the same timing and geometry in the Lottie SVG player", async ({ page }, info) => {
      await page.goto(route);
      await expect(page.locator("[data-motion-ready]")).toHaveAttribute("data-motion-ready", "true");
      await page.getByRole("button", { name: "Use Circle" }).click();
      await setNumber(page, "Width (px)", "1200");
      await setNumber(page, "Height (px)", "480");
      await setNumber(page, "Draw time (s)", "1.5");
      if (view === "mobile") {
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.screenshot({ fullPage: true, path: info.outputPath("mobile-oval.png") });
      }
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
  await expect.poll(async () => {
    const retry = await post(motionProject({ ...motionPreset("circle"), width: 128, height: 128, drawFrames: 3, holdFrames: 3 }));
    return retry.status();
  }, { timeout: 10000 }).toBe(200);
});
