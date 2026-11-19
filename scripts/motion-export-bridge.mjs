import { spawn, execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { isLocalStudioRequest } from "./codex-history-bridge.mjs";
import { motionFileLimit, motionFps, readMotionProject, motionGeometry, motionSvg } from "../app/studio/motion-assets/motion-asset.ts";

const endpoint = "/__studio/motion-export";
const require = createRequire(import.meta.url);
const runFile = promisify(execFile);
const ffmpegMissing = "Install FFmpeg with the ProRes 4444 encoder to export MOV in local Studio.";
// Vite reloads this bridge with its config while Node retains the WASM module.
const rasteriserKey = Symbol.for("acm-studio.motion-rasteriser");

async function renderMov(asset, output, signal) {
  globalThis[rasteriserKey] ??= (async () => {
    const { Resvg, initWasm } = await import("@resvg/resvg-wasm");
    await initWasm(await readFile(require.resolve("@resvg/resvg-wasm/index_bg.wasm")));
    return Resvg;
  })().catch(error => { delete globalThis[rasteriserKey]; throw error; });
  const Resvg = await globalThis[rasteriserKey];
  signal.throwIfAborted();
  const child = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-n", "-f", "image2pipe", "-framerate", String(motionFps),
    "-vcodec", "png", "-i", "pipe:0", "-an", "-c:v", "prores_ks", "-profile:v", "4",
    "-pix_fmt", "yuva444p10le", "-alpha_bits", "16", "-threads", "2", output,
  ], { shell: false, stdio: ["pipe", "ignore", "ignore"], signal, killSignal: "SIGKILL" });
  child.stdin.on("error", () => {});
  child.on("error", () => {});
  const stopped = new Promise(resolve => child.once("close", resolve));
  try {
    const geometry = motionGeometry(asset);
    let png;
    for (let frame = 0; frame < geometry.frameCount; frame++) {
      signal.throwIfAborted();
      if (frame <= asset.drawFrames) {
        const renderer = new Resvg(motionSvg(asset, geometry.pathAt(frame)));
        try {
          const image = renderer.render();
          try { png = Buffer.from(image.asPng()); } finally { image.free(); }
        } finally { renderer.free(); }
      }
      await new Promise((resolve, reject) => child.stdin.write(png, error => error ? reject(error) : resolve()));
    }
    child.stdin.end();
    if (await stopped !== 0) throw new Error("FFmpeg failed.");
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await stopped;
  }
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

export function motionExportBridge({ encode = renderMov, probe = probeEncoder, timeoutMs = 60000 } = {}) {
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
        respond(response, 200, { available, ...(available ? {} : { error: ffmpegMissing }) }); return;
      }
      let asset;
      try { asset = readMotionProject(body); }
      catch (error) { respond(response, 400, { error: error.message }); return; }
      if (busy) { respond(response, 409, { error: "Another MOV export is running. Try again when it finishes." }); return; }
      busy = true;
      let directory;
      const cancellation = new AbortController();
      const onClose = () => { if (!response.writableFinished) cancellation.abort(); };
      response.on("close", onClose);
      if (response.destroyed) onClose();
      const timer = setTimeout(() => cancellation.abort(), timeoutMs);
      try {
        if (!await isAvailable()) { respond(response, 503, { error: ffmpegMissing }); return; }
        cancellation.signal.throwIfAborted();
        directory = await mkdtemp(join(tmpdir(), "studio-motion-"));
        const output = join(directory, "motion.mov");
        await encode(asset, output, cancellation.signal);
        cancellation.signal.throwIfAborted();
        const { size } = await stat(output);
        response.writeHead(200, { "Content-Type": "video/quicktime", "Content-Length": size });
        await pipeline(createReadStream(output), response, { signal: cancellation.signal });
      } catch {
        if (!response.headersSent) {
          respond(response, cancellation.signal.aborted ? 504 : 500, {
            error: cancellation.signal.aborted ? "The MOV export timed out. Try a shorter or smaller animation." : "The MOV export failed. Check FFmpeg and available disk space, then try again.",
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
