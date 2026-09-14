/// <reference types="vite/client" />
import type { InferenceSession as Session } from "onnxruntime-web/wasm";
import { normalisePortraitPixels, normaliseSubjectPixels, normaliseSubjectMask, portraitInputSize, portraitMaskPixels } from "./background-removal-matte";
import { backgroundRemovalModels, type BackgroundRemovalMode } from "./background-removal-models";
import type { BackgroundRemovalMessage, BackgroundRemovalProgress } from "./background-removal";

// Pin both the model revision and its bytes; never execute downloaded model code.
const send = (message: BackgroundRemovalMessage) => self.postMessage(message);
const progress = (message: string, percent?: number) => send({ type: "progress", progress: { message, percent } satisfies BackgroundRemovalProgress });

async function loadModel(mode: BackgroundRemovalMode) {
  const model = backgroundRemovalModels[mode];
  progress("Downloading background removal model…", 0);
  const response = await fetch(model.url, { credentials: "omit", referrerPolicy: "no-referrer" });
  if (!response.ok || !response.body) throw new Error("The background removal model could not be downloaded. Check your connection and try again.");
  const reader = response.body.getReader();
  const bytes = new Uint8Array(model.bytes);
  let received = 0;
  let lastPercent = -1;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (received + value.length > model.bytes) { await reader.cancel(); throw new Error("The background removal model download was invalid. Please try again."); }
    bytes.set(value, received);
    received += value.length;
    const percent = Math.floor(received / model.bytes * 100);
    if (percent !== lastPercent) { progress("Downloading background removal model…", percent); lastPercent = percent; }
  }
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (received !== model.bytes || digest !== model.sha256) throw new Error("The background removal model download was incomplete or invalid. Please try again.");
  return bytes;
}

self.onmessage = async (event: MessageEvent<{ dataUrl: string; mode: BackgroundRemovalMode; edgeCleanup: number }>) => {
  let image: ImageBitmap | undefined;
  let session: Session | undefined;
  let stage = "image";
  try {
    const { dataUrl, mode, edgeCleanup } = event.data;
    if (mode !== "general" && mode !== "people") throw new Error("Choose a supported background removal mode.");
    if (!Number.isFinite(edgeCleanup) || edgeCleanup < 0 || edgeCleanup > .4) throw new Error("Choose an edge cleanup value between 0 and 40%.");
    if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(dataUrl)) throw new Error("Choose a PNG, JPEG, WebP or GIF image.");
    progress("Preparing image…");
    image = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const portraitSize = portraitInputSize(image.width, image.height);
    const size = mode === "people" ? portraitSize : { width: 320, height: 320 };
    const inputCanvas = new OffscreenCanvas(size.width, size.height);
    const inputContext = inputCanvas.getContext("2d", { willReadFrequently: true });
    if (!inputContext) throw new Error("The browser could not prepare the portrait.");
    inputContext.drawImage(image, 0, 0, size.width, size.height);
    const rgba = inputContext.getImageData(0, 0, size.width, size.height).data;
    const pixels = mode === "people" ? normalisePortraitPixels(rgba) : normaliseSubjectPixels(rgba);
    stage = "download";
    const model = await loadModel(mode);
    stage = "inference";
    progress("Finding the subject and refining edges…");
    const runtimeBase = new URL("/background-removal-runtime/v1.30.0/", self.location.origin).href;
    const { env, InferenceSession, Tensor } = await import(/* @vite-ignore */ `${runtimeBase}ort.wasm.min.mjs`) as typeof import("onnxruntime-web/wasm");
    // Single-thread WASM works without cross-origin isolation or a GPU. The
    // dedicated worker keeps the editor responsive and makes Cancel immediate.
    env.wasm.numThreads = 1;
    env.wasm.wasmPaths = runtimeBase;
    session = await InferenceSession.create(model, { executionProviders: ["wasm"] });
    const input = new Tensor("float32", pixels, [1, 3, size.height, size.width]);
    const outputs = await session.run({ [session.inputNames[0]]: input });
    const output = outputs[session.outputNames[0]];
    if (output.type !== "float32" || output.dims.length !== 4 || output.dims[0] !== 1 || output.dims[1] !== 1) throw new Error("The portrait model returned an invalid mask.");
    const maskHeight = output.dims[2];
    const maskWidth = output.dims[3];
    const matte = mode === "general" ? normaliseSubjectMask(output.data as Float32Array) : output.data as Float32Array;
    const maskPixels = portraitMaskPixels(matte, maskWidth * maskHeight, edgeCleanup);
    progress("Creating transparent image…");
    const maskCanvas = new OffscreenCanvas(maskWidth, maskHeight);
    maskCanvas.getContext("2d")!.putImageData(new ImageData(maskPixels, maskWidth, maskHeight), 0, 0);
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The browser could not create the transparent image.");
    context.drawImage(image, 0, 0);
    context.globalCompositeOperation = "destination-in";
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    // Multiplication retains existing transparency and dimensions, using a
    // soft alpha matte. Canvas premultiplication can round translucent RGB.
    context.drawImage(maskCanvas, 0, 0, image.width, image.height);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    send({ type: "result", result: { blob, width: image.width, height: image.height } });
  } catch (error) {
    const fallback = stage === "download" ? "The background removal model could not be downloaded. Check your connection and try again." : stage === "image" ? "This image could not be decoded. Choose a readable image up to 16 megapixels." : "Local background removal failed. Try a smaller image or reload the browser.";
    // Keep native runtime/provider internals out of user-facing errors.
    const message = error instanceof Error && /^(Background removal supports|No (person|distinct subject) was detected|The (portrait|background removal) model|Choose a|The browser could not)/.test(error.message) ? error.message : fallback;
    send({ type: "error", message });
  } finally {
    image?.close();
    await session?.release();
  }
};
