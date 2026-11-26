import { spawn, execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isLocalStudioRequest } from "./codex-history-bridge.mjs";
import { MotionEffectArtwork } from "../app/studio/motion-assets/motion-effects.ts";
import { isVolumetricEffect, motionFileLimit, motionFps, softFadeDefaults, readMotionProject, motionGeometry, motionSvg, volumetricExportRequirement } from "../app/studio/motion-assets/motion-asset.ts";

const endpoint = "/__studio/motion-export";
const require = createRequire(import.meta.url);
const runFile = promisify(execFile);
const ffmpegMissing = "Install FFmpeg with the ProRes 4444 encoder to export MOV in local Studio.";
// Vite reloads this bridge with its config while Node retains the WASM module.
const rasteriserKey = Symbol.for("acm-studio.motion-rasteriser");

function framesFor(asset) {
  if ("effect" in asset) {
    const { width, height, durationFrames } = asset;
    return {
      count: durationFrames,
      lastChangingFrame: durationFrames - 1,
      svgAt: frame => renderToStaticMarkup(createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg", width, height, viewBox: `0 0 ${width} ${height}`,
      }, createElement(MotionEffectArtwork, { asset, frame }))),
    };
  }
  const geometry = motionGeometry(asset);
  return {
    count: geometry.frameCount,
    lastChangingFrame: asset.drawFrames,
    svgAt: frame => motionSvg(asset, geometry.pathAt(frame)),
  };
}

function straightRgba(image) {
  // Resvg returns premultiplied RGBA. MOV expects straight alpha for clean compositing.
  const pixels = Buffer.from(image.pixels);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const alpha = pixels[offset + 3];
    if (alpha === 0 || alpha === 255) continue;
    const scale = 255 / alpha;
    pixels[offset] = Math.round(pixels[offset] * scale);
    pixels[offset + 1] = Math.round(pixels[offset + 1] * scale);
    pixels[offset + 2] = Math.round(pixels[offset + 2] * scale);
  }
  return pixels;
}

const rawInput = ({ width, height }) => ["-f", "rawvideo", "-pixel_format", "rgba", "-video_size", `${width}x${height}`];
const processOptions = signal => ({ shell: false, signal, killSignal: "SIGKILL" });

function startEncoder(input, output, signal, native = false) {
  const colour = native ? ["-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuva444p10le",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-movflags", "+faststart"] : [];
  const process = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-n", ...input, "-framerate", String(motionFps),
    "-i", "pipe:0", "-an", "-c:v", "prores_ks", "-profile:v", "4", ...colour,
    "-pix_fmt", "yuva444p10le", "-alpha_bits", native ? "8" : "16", "-threads", native ? "4" : "2", output,
  ], { ...processOptions(signal), stdio: ["pipe", "ignore", "ignore"] });
  process.stdin.on("error", () => {});
  return process;
}

function stopped(process) {
  process.on("error", () => {});
  return new Promise(resolve => process.once("close", resolve));
}

function stopProcess(process) {
  if (process.exitCode === null && process.signalCode === null) process.kill("SIGKILL");
}

async function renderMov(asset, output, signal) {
  globalThis[rasteriserKey] ??= (async () => {
    const { Resvg, initWasm } = await import("@resvg/resvg-wasm");
    await initWasm(await readFile(require.resolve("@resvg/resvg-wasm/index_bg.wasm")));
    return Resvg;
  })().catch(error => { delete globalThis[rasteriserKey]; throw error; });
  const Resvg = await globalThis[rasteriserKey];
  signal.throwIfAborted();
  // Effects change on every frame. Pipe raw pixels to avoid a PNG encode/decode cycle.
  const effect = "effect" in asset;
  const input = effect ? rawInput(asset) : ["-f", "image2pipe", "-vcodec", "png"];
  const child = startEncoder(input, output, signal);
  const encoded = stopped(child);
  try {
    const frames = framesFor(asset);
    let pixels;
    for (let frame = 0; frame < frames.count; frame++) {
      signal.throwIfAborted();
      if (frame <= frames.lastChangingFrame) {
        const renderer = new Resvg(frames.svgAt(frame));
        try {
          const image = renderer.render();
          try { pixels = effect ? straightRgba(image) : Buffer.from(image.asPng()); } finally { image.free(); }
        } finally { renderer.free(); }
      }
      await new Promise((resolve, reject) => child.stdin.write(pixels, error => error ? reject(error) : resolve()));
    }
    child.stdin.end();
    if (await encoded !== 0) throw new Error("FFmpeg failed.");
  } finally {
    stopProcess(child);
    await encoded;
  }
}

async function renderVolumetricMov(asset, output, signal, root) {
  const directory = dirname(output);
  const renderer = join(directory, "render-fireball");
  const softFade = asset.effect === "volumetric-fireball-soft-fade";
  const shader = join(root, "app/studio/motion-assets", (softFade ? "volumetric-fireball" : asset.effect) + ".glsl");
  await runFile("swiftc", ["-O", "-module-cache-path", join(directory, "module-cache"),
    join(root, "scripts/volumetric-fireball/render.swift"), "-o", renderer], { signal, timeout: 30_000 });
  signal.throwIfAborted();
  const encoder = startEncoder(rawInput(asset), output, signal, true);
  const encoded = stopped(encoder);
  try {
    const args = [shader, String(asset.width), String(asset.height), String(asset.durationFrames)];
    if (softFade) {
      const { fadeIn, fadeOut, flameMotion, coverage } = asset.softFade ?? softFadeDefaults;
      args.push("--soft-fade", ...[fadeIn, fadeOut, flameMotion, coverage].map(String));
    }
    const source = spawn(renderer, args,
      { ...processOptions(signal), stdio: ["ignore", "pipe", "ignore"] });
    const rendered = stopped(source);
    try {
      await pipeline(source.stdout, encoder.stdin, { signal });
      if ((await Promise.all([rendered, encoded])).some(code => code !== 0)) throw new Error("Volumetric render failed.");
    } finally {
      stopProcess(source);
      await rendered;
    }
  } finally {
    stopProcess(encoder);
    await encoded;
  }
}

async function probeVolumetric() {
  if (process.platform !== "darwin") return false;
  try {
    await runFile("xcrun", ["--find", "swiftc"], { timeout: 3000 });
    return true;
  } catch { return false; }
}

async function probeEncoder() {
  try {
    const { stdout } = await runFile("ffmpeg", ["-hide_banner", "-h", "encoder=prores_ks"], { timeout: 3000 });
    return /yuva444p10le/.test(stdout) && /alpha_bits/.test(stdout);
  } catch { return false; }
}

function respond(response, status, data) {
  if (response.destroyed) return;
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(data));
}

async function readRequest(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > motionFileLimit) return undefined;
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function motionExportBridge({ encode = renderMov, probe = probeEncoder, timeoutMs = 60000, volumetricTimeoutMs = 180000 } = {}) {
  let busy = false;
  let probing;
  const isAvailable = () => probing ??= Promise.resolve().then(probe)
    .catch(() => false).finally(() => { probing = undefined; });

  return { name: "studio-motion-export", apply: "serve", configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const route = request.url;
      if (route !== endpoint && route !== endpoint + "/status") return next();
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("X-Content-Type-Options", "nosniff");
      const address = server.httpServer?.address();
      const origin = typeof address === "object" && address ? `http://localhost:${address.port}` : "";
      if (request.method !== "POST" || !origin || !isLocalStudioRequest(request, origin, "motion-assets")) {
        respond(response, 403, { error: "Open Motion Assets in local Studio to export MOV." }); return;
      }
      const bodyDeadline = setTimeout(() => request.destroy(), 5000);
      let body;
      try { body = await readRequest(request); }
      catch { respond(response, 400, { error: "The export request is invalid." }); return; }
      finally { clearTimeout(bodyDeadline); }
      if (body === undefined) {
        respond(response, 413, { error: "The motion project is too large." }); request.resume(); return;
      }
      if (route.endsWith("/status")) {
        const available = await isAvailable();
        respond(response, 200, { available, volumetricAvailable: available && await probeVolumetric(),
          ...(available ? {} : { error: ffmpegMissing }) }); return;
      }
      let asset;
      try { asset = readMotionProject(body); }
      catch (error) { respond(response, 400, { error: error.message }); return; }
      if (busy) { respond(response, 409, { error: "Another MOV export is running. Try again when it finishes." }); return; }
      const volumetric = isVolumetricEffect(asset.effect);
      busy = true;
      let directory;
      const cancellation = new AbortController();
      const onClose = () => { if (!response.writableFinished) cancellation.abort(); };
      response.on("close", onClose);
      if (response.destroyed) onClose();
      const timer = setTimeout(() => cancellation.abort(), volumetric ? volumetricTimeoutMs : timeoutMs);
      try {
        if (!await isAvailable()) { respond(response, 503, { error: ffmpegMissing }); return; }
        if (volumetric && !await probeVolumetric()) { respond(response, 503, { error: volumetricExportRequirement }); return; }
        cancellation.signal.throwIfAborted();
        directory = await mkdtemp(join(tmpdir(), "studio-motion-"));
        const output = join(directory, "motion.mov");
        if (volumetric) await renderVolumetricMov(asset, output, cancellation.signal, server.config.root);
        else await encode(asset, output, cancellation.signal);
        cancellation.signal.throwIfAborted();
        const { size } = await stat(output);
        response.writeHead(200, { "Content-Type": "video/quicktime", "Content-Length": size });
        await pipeline(createReadStream(output), response, { signal: cancellation.signal });
      } catch {
        if (!response.headersSent) {
          respond(response, cancellation.signal.aborted ? 504 : 500, {
            error: cancellation.signal.aborted ? "The MOV export timed out. Try a shorter or smaller animation."
              : volumetric ? "The fireball couldn’t render. Check that Metal, Swift, and FFmpeg are available, then try again."
                : "The MOV export failed. Check FFmpeg and available disk space, then try again.",
          });
        } else if (!response.destroyed) response.destroy();
      } finally {
        clearTimeout(timer);
        response.removeListener("close", onClose);
        try { if (directory) await rm(directory, { recursive: true, force: true }); }
        catch { console.error("Studio could not remove temporary motion export files."); }
        finally { busy = false; }
      }
    });
  } };
}
